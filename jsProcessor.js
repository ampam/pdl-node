var fs = require( 'fs-extra' );
var path = require( 'path' );
var js2ts = require( './js2ts' );
var jsdocParser = require( './jsdocParser' );
var pdlUtils = require( './utils' );

var configs = require( './config' );
var templates = require( './templates' );
var stringUtils = require( 'string' );
var util = require( 'util' );
var stringifyObject = require( 'stringify-object' );

/**
 *
 * @type {PdlConfig}
 */
var pdlConfig = new configs.PdlConfig();

/**
 *
 * @type {JsConfig}
 */
var jsConfig = new configs.JsConfig();

var globalIndexClasses = [];
var usedInnerNamespaces = {};
var namespaceTree = {};
var namespaceFiles = {};

/**
 *
 * @type {TemplateUtils}
 */
var templateUtils = null;

/**
 *
 */
function generateGlobalIndexFile() {

    var indexSource = templateUtils.render( jsConfig.globalIndex.template, {
        namespaceFiles: namespaceFiles,
        globalIndexClasses: globalIndexClasses
    } );

    outputSourceCode( jsConfig.globalIndex.outputDir, indexSource, jsConfig.globalIndex.filename );

}

/**
 *
 * @param dir
 * @param sourceCode
 * @param filename
 */
function outputSourceCode( dir, sourceCode, filename ) {
    var file = path.join( dir, filename );
    if ( fs.existsSync( file ) )
    {
        fs.unlinkSync( file );
    }

    fs.appendFileSync( file, sourceCode );
}

/**
 *
 * @param {string} dir
 * @param {ClassData[]} classes
 */
function generateIndexFile( dir, classes ) {

    var indexSource = templateUtils.render( jsConfig.index.template, {
        classes: classes
    } );

    outputSourceCode( dir, indexSource, jsConfig.index.filename );

}

/**
 *
 * @param {string} dir
 * @param {string[]} filenames
 *
 * @returns {ClassData[]}
 */
function generateDirClasses( dir, filenames ) {
    var result = [];
    filenames.forEach( function( filename ) {
        var classData = jsdocParser.parseClass( path.join( dir, filename ) );
        if ( classData.isValidClass() )
        {
            result.push( classData );
        }
    } );

    return result;

}

/**
 *
 * @param {string} dir
 * @returns {ClassData[]}
 */
function processDir( dir ) {
    var filesOrDirs = fs.readdirSync( dir );
    var dirs = [];
    var files = [];
    var result = [];

    filesOrDirs.forEach( function( fileOrDir ) {
        if ( fs.statSync( path.join( dir, fileOrDir ) ).isDirectory() )
        {
            if ( fileOrDir !== '.' && fileOrDir !== '..' )
            {
                dirs.push( path.join( dir, fileOrDir ) );
            }
        }
        else
        {
            files.push( fileOrDir );
        }
    } );

    if ( files.length > 0 )
    {
        /**
         *
         * @type {ClassData[]}
         */
        result = generateDirClasses( dir, files );

        if ( result.length > 0 )
        {
            result[ result.length - 1 ].last = true;
            if ( jsConfig.index.enabled )
            {
                generateIndexFile( dir, result );
            }
        }

        if ( jsConfig.typescript.generate )
        {
            js2ts.generate( dir, files );
        }
    }

    if ( dirs.length )
    {
        processDirs( dirs );
    }

    return result;

}

/**
 *
 * @param {String }namespace
 *
 * back namespaces backwards until it has never been used
 * if it is all used then count
 *
 */
function getGlobalIndexNamespace( namespace ) {

    var namespaceParts = namespace.split( '.' );

    var index = jsConfig.globalIndex.namespaces.depth || namespaceParts.length;
    index = Math.min( namespaceParts.length, index );

    var result = '';

    do
    {
        --index;
        result = stringUtils( namespaceParts.pop() ).capitalize() + result;
    }
    while ( index > 0 );

    if ( usedInnerNamespaces.hasOwnProperty( result ) )
    {
        var count = 0;
        var globalIndexNamespace = result;
        while ( usedInnerNamespaces.hasOwnProperty( result ) )
        {
            ++count;
            result = globalIndexNamespace + count.toString();
        }

    }

    usedInnerNamespaces[ result ] = true;

    return result;
}

/**
 *
 * @param {string} dir
 * @param {ClassData[]} classes
 */
function addToGlobalIndex( dir, classes ) {

    var relativeDir = path.relative( jsConfig.globalIndex.outputDir, dir )
        .split( path.sep )
        .join( path.posix.sep );

    if ( relativeDir )
    {
        globalIndexClasses.push( {
            namespace: getGlobalIndexNamespace( classes[ 0 ].classNode.namespace ),
            path: relativeDir,
            classes: classes
        } );
    }

}

/**
 *
 * @param {string} fullNamespace
 */
function addToNamespaces( fullNamespace ) {
    var parts = fullNamespace.split( '.' );
    var root = namespaceTree;
    parts.forEach( function( namespace ) {
        if ( !root.hasOwnProperty( namespace ) )
        {
            root[ namespace ] = {};
        }
        root = root[ namespace ];
    } );
}

/**
 *
 * @param dirs
 */
function processDirs( dirs ) {
    dirs.forEach( function( dir ) {
        if ( fs.existsSync( dir ) )
        {
            var classes = processDir( dir );

            if ( classes.length > 0 )
            {
                if ( jsConfig.namespaces.enabled )
                {
                    addToNamespaces( classes[ 0 ].classNode.namespace );
                }

                if ( generateGlobalIndexEnabled() )
                {
                    addToGlobalIndex( dir, classes );
                }
            }
        }
    } );
}

/**
 *
 * @returns {boolean}
 */
function generateGlobalIndexEnabled() {
    var result = jsConfig.index.enabled && jsConfig.globalIndex.enabled;
    return result;
}

/**
 *
 * @param root
 */
function getNamespaceFilename( root ) {
    var filename = jsConfig.namespaces.filename.replace( "[root]", root );

    var result = path.join( jsConfig.namespaces.outputDir, filename );

    return result;
}

/**
 *
 * @param root
 * @param {string} source
 */
function outputNamespaceFile( root, source ) {
    var filename = getNamespaceFilename( root );
    fs.appendFileSync( filename, source );
}

/**
 *
 */
function generateNamespaceFiles() {
    namespaceFiles = [];
    var root;

    for ( root in namespaceTree )
    {
        var filename = getNamespaceFilename( root );

        namespaceFiles.push( {
            root: root,
            filename: path.parse( filename ).name
        } );

        if ( fs.existsSync( filename ) )
        {
            fs.unlinkSync( filename );
        }
    }

    for ( root in namespaceTree )
    {
        if ( namespaceTree.hasOwnProperty( root ) )
        {

            var source = templateUtils.render( jsConfig.namespaces.template, {
                root: root,
                tree: stringifyObject( namespaceTree[ root ], {
                    indent: '    '
                } )
            } );


            outputNamespaceFile( root, source );
        }
    }
}

/**
 *
 * @param config
 */
function init( config ) {
    pdlConfig = config;
    jsConfig = pdlConfig.js;

    templateUtils = new templates.TemplateUtils( pdlConfig,
        pdlUtils.getTemplatesDir( jsConfig.templatesDir ), 'js' );

    js2ts.init( config );
}

/**
 * @params {PdlConfig} config
 */
function run( config ) {

    init( config );

    processDirs( jsConfig.dirs );

    if ( jsConfig.namespaces.enabled )
    {
        generateNamespaceFiles();
    }

    if ( generateGlobalIndexEnabled() )
    {
        generateGlobalIndexFile();
    }

    js2ts.end();

}

module.exports = {
    run: run
};