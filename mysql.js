var fs = require( 'fs-extra' );
var path = require( 'path' );
var mysql = require( 'mysql2' );
var changeCase = require( 'change-case' );
var pluralize = require( 'pluralize' );
//var handlebars = require( 'handlebars' );
var numeral = require( 'numeral' );
var templates = require( './templates' );
require( 'colors' );

var pdlUtils = require( './utils' );
var verboseLog = pdlUtils.verboseLog;

var mySqlTypes = require( './mysqlTypes' );

/**
 *
 * @type {TemplateUtils}
 */
var templateUtils = null;

var cwd = process.cwd();
var connection = null;
var tsBlocks = [];

var exitWhenDone = false;
var totalTables = 0;

var totalFiles = 0;
var totalLines = 0;
var totalSize = 0;

var configFile = path.join( cwd, 'pdl.config.js' );
var mySqlConfig = null;
var templatesDir = 'default';

var doRun = false;
processCommandLine();

if ( doRun )
{
    run();
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
            case '--run':
                doRun = true;
                break;
            case '--config':
                configFile = value;
                break;

            case '--exit':
                exitWhenDone = true;
                break;
        }
    }
}

/**
 *
 * @param exitCode
 * @param message
 */
function exit( exitCode, message ) {

    if ( message )
    {
        console.log( message )
    }
    process.exit( exitCode );
}

/**
 *
 */
function cleanOutput() {
    console.log( 'Cleaning output...' );
    pdlUtils.cleanDir( mySqlConfig.outputDir );
}

/**
 *
 * @param {String} mySqlType
 */
function clearSqlType( mySqlType ) {

    var result = mySqlType.split( '(' ).shift();
    return result;
}

/**
 *
 * @param language
 * @param cleanSqlType
 * @return {string}
 */
function mySql2LanguageType( language, cleanSqlType ) {

    var result = mySqlTypes[ language ].hasOwnProperty( cleanSqlType )
        ? mySqlTypes[ language ][ cleanSqlType ]
        : 'string';

    return result;
}

/**
 *
 * @param fieldName
 * @return {boolean}
 */
function cantConvertBackAndForth( fieldName ) {
    var matches = fieldName.match( /\d+/g );

    var result = matches !== null;
    return result;
}

/**
 *
 * @param fieldInfo
 * @param attribute
 */
function addPhpFieldAttribute( fieldInfo, attribute ) {
    fieldInfo.phpAttributes = fieldInfo.phpAttributes || [];
    fieldInfo.phpAttributes.push( generateAttribute( fieldInfo, mySqlConfig.php.attributes[ attribute ] ) );
}

/**
 *
 * @param attribute
 * @param fieldInfo
 */
function generateAttribute( fieldInfo, attribute ) {

    var result = attribute
        .replace( '{$columnName}', fieldInfo.camelCase )
        .replace( '{$column_name}', fieldInfo.snakeCase );

    return result;
}

/**
 *
 * @param fieldInfo
 * @param attribute
 */
function addPdlFieldAttribute( fieldInfo, attribute ) {
    fieldInfo.pdlAttributes = fieldInfo.pdlAttributes || [];
    fieldInfo.pdlAttributes.push( generateAttribute( fieldInfo, mySqlConfig.pdl.attributes[ attribute ] ) );
}

/**
 *
 * @param fieldName
 */
function isExcluded( fieldName ) {

    var result = mySqlConfig.excludedColumns.indexOf( fieldName ) >= 0;
    return result;
}

/**
 *
 * @param {TextRow} textRow
 * @param tableData
 */
function generateFieldInfo( textRow, tableData ) {

    // noinspection JSUnresolvedVariable
    var snakeCase = textRow.Field;
    var camelCase = changeCase.camelCase( snakeCase, '', true );
    var pascalCase = changeCase.pascalCase( camelCase, '', true );
    // noinspection JSUnresolvedVariable
    var cleanSqlType = clearSqlType( textRow.Type );

    var result = {
        fieldName: camelCase,
        camelCase: camelCase,
        original: snakeCase,
        snakeCase: snakeCase,
        pascalCase: pascalCase,
        tsType: mySql2LanguageType( 'TypeScript', cleanSqlType ),
        dbType: cleanSqlType,
        phpType: mySql2LanguageType( 'Php', cleanSqlType ),
        pdlType: mySql2LanguageType( 'Pdl', cleanSqlType )
    };

    // noinspection JSUnresolvedVariable
    if ( textRow.Key === 'PRI' )
    {
        tableData.primaryKeyPascalCase = pascalCase;
        tableData.primaryKeyCamelCase = camelCase;
        addPdlFieldAttribute( result, 'dbId' );
        addPhpFieldAttribute( result, 'dbId' );
    }

    if ( cantConvertBackAndForth( snakeCase ) )
    {
        addPdlFieldAttribute( result, 'columnName' );
        addPhpFieldAttribute( result, 'columnName' );
    }

    if ( result.hasOwnProperty( 'phpAttributes' ) )
    {
        result.phpAttributes = result.phpAttributes.join( '\n' );
        result.pdlAttributes = result.pdlAttributes.join( '\n' );
    }

    return result;

}

/**
 *
 * @param tableName
 * @param results
 */
function generateTableData( tableName, results ) {
    var name = pluralize.singular( changeCase.pascalCase( tableName ) );
    var rowClass = name + "Row";

    var result = {
        name: name,
        tableName: tableName,
        dbName: mySqlConfig.connection.database,
        pdlRowClass: rowClass,
        rowClass: rowClass,
        rowSetClass: rowClass + 'Set',
        columnsDefinitionClass: name + 'Columns',
        whereClass: name + 'Where',
        orderByClass: name + 'OrderBy',
        fieldListClass: name + 'FieldList',
        columnsListTraits: name + 'ColumnsTraits',
        csharpRowSetClass: rowClass + 'Set'
    };

    var fieldsInfo = [];

    results.forEach(
        /**
         * @param {TextRow} textRow
         */
        function( textRow ) {
            // noinspection JSUnresolvedVariable
            if ( !isExcluded( textRow.Field ) )
            {
                fieldsInfo.push( generateFieldInfo( textRow, result ) );
            }

        } );


    fieldsInfo.sort( function( left, right ) {
        var result = left.original.localeCompare( right.original );
        return result;
    });

    result.fieldsInfo = fieldsInfo;
    return result;

}

/**
 *
 * @param {string} sourceCode
 * @param {string} filename
 * @param {string} type
 */
function outputCode( sourceCode, filename, type ) {

    var dir = type
        ? path.join( mySqlConfig.outputDir, type )
        : mySqlConfig.outputDir;

    filename = type
        ? filename + '.' + type
        : filename;

    fs.ensureDirSync( dir );

    var outputFileName = path.join( dir, filename );

    if ( fs.existsSync( outputFileName ) )
    {
        fs.unlinkSync( outputFileName );
    }
    fs.writeFileSync( outputFileName, sourceCode );

    verboseLog( outputFileName + ' generated.' );

    totalFiles++;
    totalSize += fs.statSync( outputFileName ).size;
    totalLines += sourceCode.match( /\n/g ).length;
}

/**
 *
 * @param tableData
 * @param type
 * @param templateName
 */
function generateFile( tableData, type, templateName ) {
    var sourceCode = templateUtils.render( path.join( type, templateName ), tableData );
    outputCode( sourceCode, tableData[ templateName ], type );
}

/**
 *
 * @param tableData
 */
function generateClasses( tableData ) {

    generateFile( tableData, 'pdl', 'pdlRowClass' );

    if ( mySqlConfig.php.emitHelpers )
    {
        generateFile( tableData, 'php', 'rowClass' );
        generateFile( tableData, 'php', 'columnsDefinitionClass' );
        generateFile( tableData, 'php', 'whereClass' );
        generateFile( tableData, 'php', 'orderByClass' );
        generateFile( tableData, 'php', 'columnsListTraits' );
        generateFile( tableData, 'php', 'fieldListClass' );
    }

    if ( mySqlConfig.ts.emit )
    {
        tsBlocks.push( templateUtils.render( path.join( 'ts', 'dbBlock' ), tableData ) );
    }

    if ( mySqlConfig.cs.emit )
    {
        generateFile( tableData, 'cs', 'csharpRowSetClass' );
    }
}

/**
 *
 */
function finish() {

    if ( mySqlConfig.ts.emit )
    {
        var tsSourceCode = templateUtils.render(
            path.join( 'ts', 'dbModule' ), {
                source: tsBlocks.join( '\n' )
            }
        );
        outputCode( tsSourceCode, mySqlConfig.ts.outputFile, 'ts' );
    }

    console.log( 'Stats: '.bold + numeral( totalFiles ).format( '0,0' ).green.bold +
        ' files generated, ' + numeral( totalLines ).format( '0,0' ).green.bold +
        ' lines generated, ' + numeral( totalSize ).format( '0.0b' ).green.bold );

    if ( exitWhenDone )
    {
        process.exit();
    }
}

/**
 *
 * @param tableName
 */
function processTable( tableName ) {
    connection.query( "SHOW COLUMNS FROM " + tableName, function( error, results/*, fields*/ ) {
        if ( !error )
        {
            var tableData = generateTableData( tableName, results );
            generateClasses( tableData );
            decrementTablesCount();
        }
        else
        {
            exit( 1, error );
        }
    } );
}

/**
 *
 */
function decrementTablesCount() {
    --totalTables;
    if ( totalTables <= 0 )
    {
        finish();
    }

}

/**
 *
 * @param results
 * @param columnName
 */
function processTableList( results, columnName ) {

    totalTables = results.length;

    results.forEach(
        /**
         * @param {TextRow} textRow
         */
        function( textRow ) {
            var tableName = textRow[ columnName ];
            if ( mySqlConfig.excludedTables.indexOf( tableName ) < 0 )
            {
                processTable( tableName );
            }
            else
            {
                decrementTablesCount();
            }
        } );

}

/**
 *
 */
function generate() {
    cleanOutput();

    connection = new mysql.createConnection( mySqlConfig.connection );

    connection.query( "SHOW TABLES FROM " + mySqlConfig.connection.database,
        function( error, results, fields ) {
            if ( !error )
            {
                processTableList( results, fields[ 0 ].name );
            }
            else
            {
                exit( 1, error );
            }
        } );
}

/**
 *
 */
function processConfig() {
    var pdlConfig = require( path.join( cwd, 'pdl.config.js' ) );
    mySqlConfig = pdlConfig.mySql;
    pdlUtils.setVerbose( pdlConfig.verbose || mySqlConfig.verbose || false );
    templatesDir = pdlUtils.getTemplatesDir( mySqlConfig.templatesDir );

    templateUtils = new templates.TemplateUtils(
        pdlConfig,
        pdlUtils.getTemplatesDir( mySqlConfig.templatesDir ),
        '' );
}

/**
 *
 */
function run() {

    processConfig();
    if ( mySqlConfig.enabled )
    {
        generate();
    }
}

module.exports = {
    run: run,
    runAndExit: function() {
        exitWhenDone = true;
        run();
    }
};