"use strict";

var jsTypes = require( './jsTypes' );
var fs = require( 'fs-extra' );
var path = require( 'path' );
var util = require( 'util' );

var context = [];

/** @type {ClassData} */
var currentClass = null;

/**
 *
 * @constructor
 */
function ClassNode() {
    /** @type {string} */
    this.fullName = '';

    /** @type {string} */
    this.name = '';

    /** @type {string} */
    this.namespace = '';

    /** @type {string} */
    this.path = '';

    /** @type {boolean} */
    this.isClass = true;

    /** @type {boolean} */
    this.isFloatingClass = false;

    /** @type {boolean} */
    this.isIntrinsic = false;

    /** @type {boolean} */
    this.isArray = false;

    // noinspection JSUnusedGlobalSymbols
    /** @type {boolean} */
    this.isImported = false;

    /** @type {string} */
    this.usageName = '';

    /** @type {ParsedPath} */
    this.fileInfo = null;

}

/**
 *
 * @constructor
 */
function ImportNode() {
    this.elements = '';
    this.target = '';

    /**
     *
     * @return {string}
     */
    this.toImportStatement = function() {
        var result = util.format( " import %s from '%s';",
            this.elements,
            this.target );

        return result;
    };
}

/**
 *
 * @constructor
 */
function PropertyNode() {
    this.name = '';
    this.classNode = new ClassNode();
}


/**
 *
 * @param {ClassData} classData
 */
function enterClass( classData ) {
    currentClass = classData;
    context.unshift( currentClass );
}

/**
 *
 */
function exitClass() {
    context.unshift();
    currentClass = context.length > 0
        ? context[ 0 ]
        : null;
}

/**
 *
 * @constructor
 */
function ClassData() {

    /** @type {string} */
    this.jsFullFilename = '';

    /** @type {ClassNode} */
    this.classNode = new ClassNode();

    // noinspection JSUnusedGlobalSymbols
    /** @type {ClassNode} */
    this.parentClassNode = new ClassNode();

    /** @type {PropertyNode[]} */
    this.properties = [];

    /** @type {string[]} */
    this.imports = [];


    /**
     *
     * @return {boolean}
     */
    this.isValidClass = function() {
        var result = this.classNode.name !== '' && this.classNode.namespace !== '';
        return result;
    }
}


/**
 *
 * @param {string} jsType
 */
function isIntrinsicType( jsType ) {
    var result = jsTypes.TypeScript.hasOwnProperty( jsType.toLocaleLowerCase() );
    return result;
}

/**
 *
 * @param {string} jsType
 */
function jsType2TsType( jsType ) {

    var result = isIntrinsicType( jsType )
        ? jsTypes.TypeScript[ jsType.toLocaleLowerCase() ]
        : jsType;

    return result;
}

/**
 *
 * @param {string} fullClassname
 * @return {ClassNode}
 */
function parseClassname( fullClassname ) {

    /**
     *
     * @type {ClassNode}
     */
    var result = new ClassNode();

    var classParts = fullClassname.split( '.' );
    result.path = classParts.join( path.posix.sep );

    // noinspection JSValidateTypes
    result.fileInfo = path.parse( result.path );


    var nameParts = classParts.pop().split('[');
    result.name = nameParts[ 0 ];
    result.isArray = nameParts.length > 1;

    result.isIntrinsic = isIntrinsicType( result.name );

    result.namespace = classParts.join( '.' );
    result.fullName = fullClassname;

    result.isClass = result.namespace !== '' || !result.isIntrinsic;
    result.isFloatingClass = result.isClass && result.namespace === '';

    result.usageName = result.name;

    if ( result.isArray )
    {
        result.usageName += '[]';
    }

    return result;

}

/**
 *
 * @param {ClassNode} classNode
 * @returns {boolean}
 */
function isCurrentClass( classNode ) {
    var result = classNode.fullName === currentClass.classNode.fullName;
    return result;
}

/**
 *
 * @param {ClassNode} classNode
 * @returns {boolean}
 */
function isInCurrentClassNamespace( classNode ) {
    var result = classNode.namespace === currentClass.classNode.namespace;
    return result;
}

/**
 *
 * @param {ClassNode} classNode
 */
function addToImport( classNode ) {

    if ( classNode.isClass && !classNode.isFloatingClass && !isCurrentClass( classNode ) )
    {
        /**
         *
         * @type {ImportNode}
         */
        var importNode = null;
        classNode.isImported = true;
        if ( isInCurrentClassNamespace( classNode ) )
        {
            importNode = new ImportNode();
            importNode.elements = '{' + classNode.name + '}';
            importNode.target = './' + classNode.name;
        }
        else
        {
            var innerNamespace = classNode.namespace.split('.').pop();
            classNode.usageName =  innerNamespace + '.' + classNode.usageName;

            importNode = new ImportNode();
            importNode.elements = '{' + innerNamespace + '}';

            var target = path.relative( currentClass.classNode.fileInfo.dir, classNode.fileInfo.dir )
                .split( path.sep )
                .join( path.posix.sep );

            if ( target[ 0 ] !== '.' && target[ 0 ] !== path.sep )
            {
                target = './' + target;
            }

            importNode.target = target;

        }

        var statement = importNode.toImportStatement();

        if ( currentClass.imports.indexOf( statement ) < 0 )
        {
            currentClass.imports.push( statement );
        }

    }
}

/**
 *
 * @param {string} line
 */
function parseProperty( line ) {
    var typeAndName = line.split( '@property' ).pop().trim();
    var propertyParts = typeAndName.split( ' ' );
    var jsType = propertyParts.shift().trim().split( '{' ).pop().split( '}' ).shift().trim();
    var tsType = jsType2TsType( jsType );

    /**
     *
     * @type {PropertyNode}
     */
    var result = new PropertyNode();
    result.name = propertyParts.pop().trim();
    result.classNode = parseClassname( tsType );

    addToImport( result.classNode );

    return result;

}

/**
 *
 * @param {string} line
 * @return {ClassNode}
 */
function parseClassDeclaration( line ) {
    var fullClassname = line.split( '{' ).pop().trim().slice( 0, -1 );
    var result = parseClassname( fullClassname );

    return result;
}

/**
 *
 * @param {string} line
 * @return {ClassNode}
 */
function parseParentClass( line ) {
    var fullParentClass = line.split( '{' ).pop().trim().slice( 0, -1 );
    var result = parseClassname( fullParentClass );

    addToImport( result );

    return result;
}

/**
 *
 * @param {string} jsFullFilename
 * @return {ClassData}
 */
function parseClass( jsFullFilename ) {

    /**
     *
     * @type {ClassData}
     */
    var result = new ClassData();

    enterClass( result );

    result.jsFullFilename = jsFullFilename;

    var lines = fs.readFileSync( jsFullFilename ).toString( 'utf-8' ).split( '\n' );

    lines.forEach( function( line ) {

        if ( line.indexOf( '@class' ) > 0 )
        {
            result.classNode = parseClassDeclaration( line );
//            enterClassNamespace( result );
        }
        else if ( line.indexOf( '@extend' ) > 0 )
        {
            result.parentClassNode = parseParentClass( line );
        }
        else if ( line.indexOf( '@property' ) > 0 )
        {
            var property = parseProperty( line );
            result.properties.push( property );
        }

    } );

    exitClass();

    return result;
}


module.exports = {
    parseClass: parseClass
};