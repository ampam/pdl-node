var path = require( 'path' );
var fs = require( 'fs-extra' );
var handlebars = require( 'handlebars' );
var extend = require( 'extend' );

handlebars.registerHelper( 'brace-wrap', function( arg ) {
    return '{' + arg + '}';
} );

/**
 * @constructor {TemplateUtil}
 *
 * @param {PdlConfig} pdlConfig
 * @param dir
 * @param subDir
 */
function TemplateUtils( pdlConfig, dir, subDir ) {

    var cache = {};

    /**
     *
     * @param templatePath
     * @return {*}
     */
    this.getTemplate = function( templatePath ) {
        if ( !cache.hasOwnProperty( templatePath ) )
        {
            var templateSource = fs.readFileSync(
                path.join( dir, subDir, templatePath + '.hbs' ) ).toString();

            cache[ templatePath ] = handlebars.compile( templateSource );
        }

        var result = cache[ templatePath ];
        return result;
    };

    /**
     *
     * @param templatePath
     * @param data
     */
    this.render = function( templatePath, data ) {

        var templateData = extend( {
            companyName: pdlConfig.companyName,
            project: pdlConfig.project,
            version: pdlConfig.version
        }, data );

        var template = this.getTemplate( templatePath );

        var result = template( templateData );

        return result;
    }

}

module.exports = {
    TemplateUtils: TemplateUtils
};