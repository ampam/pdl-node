"use strict";

var fs = require( 'fs-extra' );
var path = require( 'path' );
var pdlUtils = require('./utils');
var templates = require('./templates');
var verboseLog = pdlUtils.verboseLog;
var configs = new require('./config');
var jsdocParser = require('./jsdocParser');

require('colors');

var fileTimes = require('./fileTimes');

/** @type {FileTimes} */
var jsFileTimes = null;

/**
 *
 * @type {TemplateUtils}
 */
var templateUtils = null;

/**
 *
 * @type {PdlConfig}
 */
var pdlConfig = new configs.PdlConfig();

var tsFilesCreated = 0;
var totalTsFilesCreated = 0;

var jsConfig = {

    index: {
        enabled: true,
        filename: 'index.js',
        template: 'index'
    },

    globalIndex: {
        enabled: true,
        filename: 'index.js',
        template:'global-index'
    },

    templatesDir: 'templates.dir',
    dirs: []
};

var tsConfig = {
    generate: true,
    generateIndex: true,
    indexFilename: 'index.ts',
    barrelFilename: 'barrel.ts',
    //templatesDir: 'temp',
    classTemplate: 'singleClass',
    indexTemplate: 'index',
    barrelTemplate: 'barrel'
};

/** @type {Object.<string,ClassData>} */
var classes = {};
var classCount = 0;


/** @type {string} */
var currentNamespace = '';

/**
 *
 * @param {ClassData} classData
 */
function enterClassNamespace( classData ) {
    if ( currentNamespace === '' )
    {
        currentNamespace = classData.classNode.namespace;
    }
    else if ( currentNamespace !== classData.classNode.namespace )
    {
        pdlUtils.outputError( 'Error. Classes in different namespaces not allowed' );
    }

}


/**
 *
 * @param {string} sourceCode
 * @param {string} subDir
 * @param {string} filename
 */
function outputCode( sourceCode, subDir, filename ) {

    var dir = path.join( tsConfig.outputDir, subDir );

    fs.ensureDirSync( dir );

    var outputFilename = path.join( dir, filename );

    if ( fs.existsSync( outputFilename ) )
    {
        fs.unlinkSync( outputFilename );
    }
    fs.writeFileSync( outputFilename, sourceCode );
    verboseLog( outputFilename + ' generated.' );

}

/**
 *
 * @param {ClassData} classData
 */
function addClass( classData ) {
    classCount++;
    classes[ classData.jsFullFilename ] = classData;
}

/**
 *
 * @param {ClassData} classData
 */
function createTsFile( classData ) {

    var sourceCode = templateUtils.render( tsConfig.classTemplate, classData );
    var namespaceDir = classData.classNode.namespace.replace( /\./g, path.sep );
    var filenameParts = path.parse( classData.jsFullFilename );
    var filename = filenameParts.name + '.ts';
    outputCode( sourceCode, namespaceDir, filename );
}


/**
 *
 * @param jsFullFilename
 */
function generateTs( jsFullFilename ) {
    /**
     *
     * @type {ClassData}
     */
    var classData = jsdocParser.parseClass( jsFullFilename );

    if ( classData.isValidClass() )
    {
        enterClassNamespace( classData );
        addClass( classData );

        if ( jsFileTimes.isFileModified( jsFullFilename ) )
        {
            createTsFile( classData );
            jsFileTimes.addFile( jsFullFilename );
            tsFilesCreated++;
            totalTsFilesCreated++;
        }


    }
}

/**
 * @param {string} dir
 */
function generateBarrelFile( dir ) {

    var barrelSource = templateUtils.render( tsConfig.barrelTemplate, {
        classes: classes
    } );

    outputCode( barrelSource, dir, tsConfig.barrelFilename )
}

/**
 *
 * @param jsDir
 */
function generateIndex( jsDir ) {

    generateBarrelFile( jsDir );

    var innerNamespace = jsDir.split( path.sep ).pop();
    var indexSource = templateUtils.render( tsConfig.indexTemplate, {
        innerNamespace: innerNamespace,
        barrelFilename: path.parse( tsConfig.barrelFilename ).name
    } );

    outputCode( indexSource, jsDir, tsConfig.indexFilename );

}


/**
 *
 */
function initNamespace() {
    classes = {};
    classCount = 0;
    currentNamespace = '';
    tsFilesCreated = 0;
}

/**
 *
 * @param jsDir
 * @param filenames
 */
function generate( jsDir, filenames ) {

    if ( filenames.length > 0 )
    {
        initNamespace();
        filenames.forEach( function( filename ) {
            var fullFilename = path.join( jsDir, filename );
            if ( filename !== 'index.js' )
            {
                generateTs( fullFilename );
            }
        } );

        if ( tsFilesCreated > 0 && tsConfig.generateIndex )
        {
            generateIndex( pdlUtils.namespace2dir( currentNamespace ) );
        }
    }
}

/**
 * @params {PdlConfig} config
 */
function init( config ) {
    pdlConfig = config;
    jsConfig = pdlConfig.js;
    tsConfig = pdlConfig.js.typescript;
    jsFileTimes = fileTimes.createFileTimes( path.join( pdlConfig.tempDir, "jsFileTimes.json" ) );

    templateUtils = new templates.TemplateUtils(
        pdlConfig,
        pdlUtils.getTemplatesDir( tsConfig.templatesDir, jsConfig.templatesDir ),
        'ts');

    jsFileTimes.read();
}

/**
 *
 */
function end() {
    console.log('Ts Files: ' + totalTsFilesCreated.toString().green );
    jsFileTimes.write();
}

module.exports = {
    init: init,
    end: end,
    generate: generate
};