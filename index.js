//var fs = require( 'fs' );
var fs = require( 'fs-extra' );
var path = require( 'path' );
var extend = require( 'extend' );
var child_process = require( 'child_process' );
var glob = require( 'glob' );
require('colors');

var pdlUtils = require( './utils' );
var verboseLog = pdlUtils.verboseLog;

var fileTimes = require('./fileTimes');
var configs = require('./config');

/**
 *
 * @type {FileTimes}
 */
var pdlFileTimes = null;

require( 'colors' );

var cwd = process.cwd();
var childInstances = 0;
var compiler = "pdlc2.exe";
var rebuild = false;

/**
 *
 * @type {PdlConfig}
 */
var pdlConfig = new configs.PdlConfig();

var configFile = path.join( cwd, 'pdl.config.js' );

var globalExitCode = 0;


processCommandLine();
run();


/**
 *
 */
function run() {

    pdlConfig = require( configFile );

    processConfig();


    if ( rebuild )
    {
        cleanTemporal();
        cleanOutput();
    }

    pdlFileTimes = fileTimes.createFileTimes( path.join( pdlConfig.tempDir, "pdlFileTimes.json" ) );
    pdlFileTimes.read();

    console.log('>>>>Begin PDL compilation and generation');
    compileSections();
    pdlFileTimes.write();

    console.log( 'pdl files compiled: ' + childInstances.toString().green.bold + ' file(s)' );
    console.log('<<<<End PDL compilation and generation');
    console.log('');

    if ( globalExitCode === 0 )
    {
        console.log( '>>>>Begin JS Processing' );
        var jsProcessor = require( './jsProcessor' );
        jsProcessor.run( pdlConfig );
        console.log( '<<<<END JS Processing' );
    }

    process.exit( globalExitCode );
}

/**
 *
 */
function processConfig() {
    pdlUtils.setVerbose( pdlConfig.verbose );

    if ( pdlConfig.compilerPath )
    {
        compiler = path.join( pdlConfig.compilerPath, compiler );
    }

    if ( !rebuild )
    {
        rebuild = pdlConfig.rebuild;
    }
}

/**
 *
 */
function cleanTemporal() {
    console.log( 'Cleaning temporal...' );
    pdlUtils.cleanDir( pdlConfig.tempDir );
}

/**
 *
 */
function processCommandLine() {
    for ( var i = 2; i < process.argv.length; i++ )
    {
        var argument = process.argv[ i ];
        var parts = argument.split( '=' );

        var option = parts[ 0 ].trim();

        var value = parts.length > 1
            ? parts[ 1 ].trim()
            : '';

        switch ( option )
        {
            case '--config':
                configFile = value;
                break;

            case '--rebuild':
                rebuild = true;
                break;
        }
    }
}

/**
 *
 */
function cleanOutput() {
    console.log( 'Cleaning output...' );
    pdlUtils.cleanDir( pdlConfig.outputDir );
}

/**
 *
 * @param exclusionList
 * @param file
 * @returns {boolean}
 */
function isInExclusionList( exclusionList, file ) {
    var result = false;
    for ( var i = 0; i < exclusionList.length && !result; i++ )
    {
        result = file.indexOf( exclusionList[ i ] ) >= 0;
    }
    return result;
}

/**
 *
 * @param section
 * @param profileName
 * @param fileOrPattern
 * @returns {Array}
 */
function unwind( section, profileName, fileOrPattern ) {
    var result = [];

    var profile = pdlConfig.profiles[ profileName ];
    var sourcePaths = (section.src || []).concat( profile.src || [] ).concat( pdlConfig.src || [] );

    var exclusionList = section.files[ profileName + 'Exclude' ] || [];

    for ( var i = 0; i < sourcePaths.length && result.length <= 0; i++ )
    {
        var files = glob.sync( path.join( sourcePaths[ i ], fileOrPattern ) );
        files.forEach( function( file ) {
            if ( !isInExclusionList( exclusionList, file ) )
            {
                result.push( file );
            }
        } );
    }

    return result;
}




/**
 *
 * @param value
 */
function errorLog( value ) {
    console.log( value.red.bold );
}


/**
 *
 * @param file
 * @param commandArguments
 */
function processFile( file, commandArguments ) {
    if ( fs.existsSync( file ) )
    {
        if ( pdlFileTimes.isFileModified( file ) )
        {
            var exitCode = compileFile( file, commandArguments );
            if ( exitCode === 0 )
            {
                pdlFileTimes.addFile( file )
            }
            else
            {
                globalExitCode = exitCode;
            }
        }
        else
        {
            verboseLog( file + ' not modified' )
        }
    }
    else
    {
        errorLog( 'File not found:' + file.red.bold + '\n' );
    }
}

/**
 *
 * @param profileName
 * @param section
 */
function compileSectionProfile( profileName, section ) {

    var profile = pdlConfig.profiles[ profileName ];
    var files = section.files[ profileName ];

    var templates = extend( true,
        {
            dir: '',
            name: ''
        },
        pdlConfig.templates || {},
        profile.templates || {} );

    var commandArguments = [
        templates.dir,
        templates.name,
        section.outputDir || profile.outputDir || pdlConfig.outputDir,
        profile.configFile
    ];

    files.forEach( function( fileOrPattern ) {

        var singleFiles = unwind( section, profileName, fileOrPattern );

        singleFiles.forEach( function( file ) {
            processFile( file, commandArguments );
        } );

    } );

}

/**
 *
 */
function compileSections() {

    pdlConfig.sections.forEach( function( section ) {
        console.log( ("Compiling " + section.name + "...").cyan.bold );

        for ( var profileName in section.files )
        {
            if ( section.files.hasOwnProperty( profileName ) )
            {
                if ( !profileName.endsWith( 'Exclude' ) )
                {
                    if ( pdlConfig.profiles.hasOwnProperty( profileName ) )
                    {
                        compileSectionProfile( profileName, section );
                    }
                    else
                    {
                        console.error( "Invalid profile: " + profileName );
                    }
                }
            }
        }

    } );
}

/**
 *
 * @param file
 * @param {Array} commandArguments
 * @return {int}
 */
function compileFile( file, commandArguments ) {

    var name = path.parse( file );

    var expandedArguments = commandArguments.map( function( argument ) {
        // noinspection UnnecessaryLocalVariableJS
        var result = argument.replace( "[inputFile]", name );
        return result;
    } );
    expandedArguments.unshift( file );

    childInstances++;

    verboseLog( compiler + " " + expandedArguments.join(' ') );

    var spawnResult = child_process.spawnSync( compiler, expandedArguments,
        {
            cwd: cwd
        } );

    process.stdout.write( spawnResult.stdout.toString() );
    process.stderr.write( spawnResult.stderr.toString() );

    if ( spawnResult.status !== 0 )
    {
        errorLog( 'Compiler Error: code ' + spawnResult.status.toString() + ", file: " + file );
    }

    return spawnResult.status;

}
