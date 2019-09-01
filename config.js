"use strict";

/**
 *
 * @constructor {Profile}
 */
function Profile() {

    this.configFile = '';

    /**
     *
     * @type {string[]}
     */
    this.src = [];

    this.outputDir = 'output';

    this.templates = {
        dir: 'default',
        name: 'classTemplate1'
    };

}

/**
 *
 * @constructor {Section}
 */
function Section() {

    this.name = 'My Section';

    this.outputDir = '';

    /**
     *
     * @type {String[]}
     */
    this.src = null;

    /**
     *
     * @type {Object.<String,String[]>}
     */
    this.files = {};
}

/**
 *
 * @constructor {PdlConfig}
 */
function PdlConfig() {

    this.companyName = '';
    this.project = 'My Project';
    this.version = '1.0.0';
    this.js = new JsConfig;
    this.compilerPath = '';
    this.rebuild = false;
    this.verbose = false;

    /**
     *
     * @type {Object.<String,Profile>}
     */
    this.profiles = {};

    /**
     *
     * @type {Section[]}
     */
    this.sections = [];

    /**
     *
     * @type {string[]}
     */
    this.src = [];

    this.outputDir = '';
    this.tempDir = 'temp';

    this.templates = {
        dir: '',
        name: 'classTemplate1'
    };



}

/**
 *
 * @constructor {MySql}
 */
function MySql() {
    //TODO
}

/**
 *
 * @constructor {JsConfig}
 */
function JsConfig() {

    this.index = {
        enabled: true,
        filename: 'index.js',
        template: 'index'
    };

    this.globalIndex = {
        enabled: true,
        filename: 'index.js',
        template: 'global-index',
        outputDir: 'output/js',
        namespaces: {
            depth: 0
        }
    };

    this.templatesDir = 'templates.dir';

    this.dirs = [];

    this.namespaces = {
        enabled: true,
        filename: "[root].namespaces.js",
        outputDir: 'output/js',
        'template': 'namespace'
    };

    /**
     *
     * @type {TsConfig}
     */
    this.typescript = new TsConfig();
}

/**
 *
 * @constructor {TsConfig}
 */
function TsConfig() {
    this.generate = true;
    this.generateIndex = true;
    this.indexFilename = 'index.ts';
    this.barrelFilename = 'barrel.ts';
    this.classTemplate = 'singleClass';
    this.indexTemplate = 'index';
    this.barrelTemplate = 'barrel';


    this.outputDir = 'output/js2ts'
}

module.exports = {
    PdlConfig: PdlConfig,
    Profile:Profile,
    Section:Section,
    JsConfig: JsConfig,
    TsConfig: TsConfig,
    MySql: MySql
};