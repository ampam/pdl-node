var fs = require( 'fs-extra' );
var path = require( 'path' );

/**
 *
 * @constructor {FileTimes}
 * @param {string} filename
 */
var FileTimes = function( filename ) {

    var modifiedFileTimes = {};

    /**
     *
     * @param file
     * @return {boolean}
     */
    this.isFileModified = function( file ) {

        var currentTime = fs.statSync( file ).mtime.getTime();

        var result = currentTime !== getModifiedTimeWhenCompiled( file );

        return result;
    };

    /**
     *
     * @param file
     */
    var getModifiedTimeWhenCompiled = function( file ) {

        var result = modifiedFileTimes.hasOwnProperty( file )
            ? modifiedFileTimes[ file ]
            : 0;

        return result;
    };

    /**
     *
     */
    this.read = function() {
        if ( fs.existsSync( filename ) )
        {
            try
            {
                modifiedFileTimes = JSON.parse( fs.readFileSync( filename, 'utf8' ) );
            }
            catch( Error )
            {
                console.log("Error reading filetime: " + filename );
            }
        }
    };

    /**
     *
     * @param file
     */
    this.addFile = function( file ) {
        modifiedFileTimes[ file ] = fs.statSync( file ).mtime.getTime();
    };

    /**
     *
     */
    this.write = function() {
        var parts = path.parse( filename );
        fs.ensureDirSync( parts.dir );
        fs.writeFileSync( filename, JSON.stringify( modifiedFileTimes ) );
    };

};

module.exports = {

    createFileTimes:
        /**
         *
         * @param filename
         * @return {FileTimes}
         */
        function( filename ) {
            var result = new FileTimes( filename );
            return result;
        }
};