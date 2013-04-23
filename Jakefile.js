/**
 * Jake build script
 */
var jake = require('jake'),
    fs = require('fs'),
    path = require('path');

require('jake-utils');

/**
 * default task
 */
desc('Execute all tasks: build all libraries');
task('default', ['vis'], function () {
    console.log('done');
});

/**
 * build the visualization library vis.js
 */
desc('Build the visualization library vis.js');
task('vis', function () {
    var VIS = './vis.js';
    var VIS_MIN = './vis.min.js';

    // concatenate and stringify css files
    var result = concat({
        src: [
            './src/component/css/panel.css',
            './src/component/css/item.css',
            './src/component/css/timeaxis.css'
        ],
        header: '/* vis.js stylesheet */',
        separator: '\n'
    });
    var cssText = JSON.stringify(result.code);

    // concatenate the script files
    concat({
        dest: VIS,
        src: [
            './src/module.js',

            './src/util.js',
            './src/events.js',
            './src/timestep.js',
            './src/dataset.js',
            './src/stack.js',
            './src/range.js',
            './src/controller.js',

            './src/component/component.js',
            './src/component/panel.js',
            './src/component/rootpanel.js',
            './src/component/timeaxis.js',
            './src/component/itemset.js',
            './src/component/item/*.js',

            './src/visualization/timeline.js',

            './lib/moment.js'
        ],

        header: read('./src/header.js') + '\n' +
            '(function () { ', // start of closure

        separator: '\n',

        // Note: we insert the css as a string in the javascript code here
        //       the css will be injected on load of the javascript library
        footer: 'loadCss(' + cssText + ');\n' +
            '})();' // end of closure
    });

    // minify javascript
    minify({
        src: VIS,
        dest: VIS_MIN,
        header: read('./src/header.js')
    });

    // update version number and stuff in the javascript files
    [VIS, VIS_MIN].forEach(function (file) {
        replace({
            replacements: [
                {pattern: '@@name',    replacement: 'vis.js'},
                {pattern: '@@date',    replacement: today()},
                {pattern: '@@version', replacement: version()}
            ],
            src: file
        });
    });

    console.log('created vis.js library');
});

/**
 * Recursively remove a directory and its files
 * https://gist.github.com/tkihira/2367067
 * @param {String} dir
 */
var rmdir = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if(filename == "." || filename == "..") {
            // pass these files
        } else if(stat.isDirectory()) {
            // rmdir recursively
            rmdir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};
