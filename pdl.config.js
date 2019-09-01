var path = require( 'path' );
var glob = require('glob');

var developmentRoot = process.env.PAM_DEV || path.join( process.env.HOME, 'development' );

module.exports = {

    companyName: 'PlusAMedia',
    project: 'Pdl Project',
    version: '1.0.0',

    /**
     * Leave empty for default.
     * Use it when the compiler path is not in the PATH ENV variable
     */
    compilerPath: path.join( developmentRoot, 'pdl/bin' ),

    rebuild: false,
    verbose: false,
    src: [
        '.',
        'src'
    ],

    outputDir: 'output',
    tempDir: 'temp',

    templates: {
        dir: '',
        name: 'classTemplate1'
    },

    js: {
        index: {
            enabled: true,
            filename: 'index.js',
            template: 'index'
        },

        globalIndex: {
            enabled: true,
            filename: 'pamPdl.js',
            template:'global-index',
            outputDir: 'output/js',
            namespaces: {
                depth: 2
            }
        },

        namespaces: {
            enabled: true,
            filename: "[root].namespace.js",
            outputDir: 'output/js',
            template: 'namespace'
        },

        templatesDir: 'default',

        dirs: [
            'output/js'
        ],

        typescript: {
            generate: true,
            generateIndex: true,
            indexFilename: 'index.ts',
            barrelFilename: 'barrel.ts',
            classTemplate: 'singleClass',
            indexTemplate: 'index',
            barrelTemplate: 'barrel',
            outputDir: 'output/js2ts'
        }

    },

    profiles: {
        dbFiles: {
            configFile: 'config/pdl.config.db.json',

            /** overrides global - optional */
            src: [],

            /** overrides global - optional */
            outputDir: 'output',

            /** overrides global - optional */
            templates: {
                dir: 'pdl-templates/db'
            }
        },
        specialDbFiles: {
            configFile: 'config/pdl.config.db.json',
            templates: {
                dir: 'pdl-templates/db/as3Dynamic'
            }
        },
        phpAndJs: {
            configFile: 'config/pdl.php.and.js.json',
            templates: {
                dir: 'pdl-templates'
            }
        },
        default: {
            configFile: 'config/pdl.config.default.json',
            templates: {
                dir: 'pdl-templates'
            }
        }
    },

    sections: [
        {
            name: 'Db Files',

            /** overrides profile - optional */
            //outputDir: '',

            /** overrides profile - optional */
            // src: [
            //     ''
            // ],

            files: {
                dbFiles: [
                    'com/mh/ds/domain/data/*.pdl'

                ],
                dbFilesExclude: [
                    'DsWaitingListRow.pdl'
                ]
            }
        },
        {
            name: 'Special Db Files',
            files: {
                specialDbFiles: [
                    'com/mh/ds/domain/data/DsWaitingListRow.pdl'
                ]
            }
        },
        {
            name: 'Main',
            files: {
                default: [
                    'com/mh/ds/application/admin/demographics/*.pdl',
                    'com/mh/ds/domain/heartbeat/*.pdl',
                    'com/mh/ds/application/items/*.pdl',
                    'com/mh/ds/application/items/editors/*.pdl',
                    'com/mh/ds/application/networkadmin/*.pdl',
                    'com/mh/ds/application/networkadmin/player/*.pdl',
                    'com/mh/ds/application/myaccount/*.pdl',
                    'com/mh/ds/application/templates/website/*.pdl',
                    'com/mh/ds/application/utils/filepicker/*.pdl',
                    'com/mh/ds/application/utils/filepicker/customergallery/*.pdl',
                    'com/mh/ds/application/utils/filepicker/fotolia/*.pdl',
                    'com/mh/ds/application/locations/*.pdl',
                    'com/mh/ds/application/locations/selector/*.pdl',
                    'com/mh/ds/application/responses/controlpanel/network/locations/SelectorModelResponse.pdl',
                    'com/mh/ds/domain/presentation/*.pdl',
                    'com/mh/ds/application/requests/items/*.pdl',
                    'com/mh/ds/infrastructure/net/BaseResponse.pdl',
                    'com/mh/ds/application/responses/player/*.pdl',
                    'com/mh/ds/application/responses/editor/*.pdl',
                    'com/mh/ds/application/responses/editor/objects/*.pdl',
                    'com/mh/ds/application/responses/weather/*.pdl',
                    'com/mh/ds/application/responses/waitinglist/*.pdl',
                    'com/mh/ds/domain/templates/model/*.pdl',
                    'com/mh/ds/domain/waitinglist/WaitingListModel.pdl',
                    'pam/components/external/calendar/google/GoogleCalendarProperties.pdl',
                    'pam/components/external/calendar/google/events/Parameters.pdl',
                    'pam/components/external/video/ExternalVideoProperties.pdl',
                    'pam/components/external/tv/TvProperties.pdl',
                    'pam/components/external/webbrowser/WebBrowserProperties.pdl',
                    'pam/components/countdown/*.pdl',
                    'com/mh/ds/domain/schedule/*.pdl',
                    'pam/components/external/rtsp/*.pdl',
                    'com/mh/ds/domain/demographics/model/*.pdl',
                    'com/mh/ds/domain/customers/*.pdl',
                    'com/mh/ds/application/responses/controlpanel/presentation/items/*.pdl',
                    'com/mh/ds/infrastructure/net/*.pdl'
                ]
            }

        }
        ,
        {
            name: 'Php And Js',
            files: {
                phpAndJs:[
                    'com/mh/ds/infrastructure/ioc/*.pdl'
                ].concat( glob.sync('src/com/mh/ds/views/**/*.pdl') )
            }

        }
    ],

    mySql: {
        enabled: true,
        verbose: false,
        connection: {
            host: "localhost",
            port: 3306,
            user: 'root',
            password: undefined,
            database: 'my_db'
        },

        outputDir: 'db/output',
        templatesDir: 'default',
        ts: {
            emit: true,
            outputFile: 'DbTypes'
        },
        cs: {
            emit: true
        },
        php: {
            emitHelpers: true,
            attributes: {
                dbId: "[ 'IsDbId' => [] ]",
                columnName: "[ 'ColumnName' => [ 'default1' => '{$column_name}' ] ]"
            }
        },
        pdl: {
            attributes: {
                dbId: '[com.mh.ds.infrastructure.data.attributes.IsDbId]',
                columnName: '[com.mh.ds.infrastructure.data.attributes.ColumnName("{$column_name}")]'
            }
        },
        excludedTables: [
            'braintree_countries',
            'locations',
            'tasks',
            'table_times',
            'rental_factors',
            'price_sheets',
            'vendors',
            'ds_player_commands',
            'items',
            'item_subitems',
            'user_log',
            'website_contacts'
        ],
        excludedColumns: [
            'date_added',
            'date_modified'
        ]
    }
};
