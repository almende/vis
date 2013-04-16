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
task('default', ['timeline'], function () {
    console.log('done');
});

/**
 * timeline
 */
desc('Build the timeline visualization');
task('timeline', function () {
    var TIMELINE = './bin/timeline/timeline.js';
    var TIMELINE_MIN = './bin/timeline/timeline.min.js';
    var DIR = './bin/timeline';
    jake.rmRf(DIR);
    jake.mkdirP(DIR);

    // concatenate the script files
    concat({
        dest: TIMELINE,
        src: [
            './src/header.js',
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

            './src/visualization/timeline/timeline.js',

            './lib/moment.js'
        ],
        separator: '\n'
    });

    // concatenate the css files
    concat({
        dest: './bin/timeline/timeline.css',
        src: [
            './src/component/css/panel.css',
            './src/component/css/item.css',
            './src/component/css/timeaxis.css'
        ],
        separator: '\n'
    });

    // minify javascript
    minify({
        src: TIMELINE,
        dest: TIMELINE_MIN,
        header: read('./src/header.js')
    });

    // update version number and stuff in the javascript files
    [TIMELINE, TIMELINE_MIN].forEach(function (file) {
        replace({
            replacements: [
                {pattern: '@@name',    replacement: 'timeline'},
                {pattern: '@@date',    replacement: today()},
                {pattern: '@@version', replacement: version()}
            ],
            src: file
        });
    });

    // copy examples
    jake.cpR('./src/visualization/timeline/examples', './bin/timeline/examples/');

    console.log('created timeline library');
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
