/**
 * Watch for changes in the sourcecode, and rebuild vis.js on change
 *
 * Usage:
 *     cd vis
 *     node tools/watch.js
 */

var watch = require('node-watch'),
    child_process = require('child_process');

// constants
var WATCH_FOLDER = './src';
var BUILD_COMMAND = 'jake build';

// rebuilt vis.js on change of code
function rebuild() {
    var start = +new Date();
    child_process.exec(BUILD_COMMAND, function () {
        var end = +new Date();
        console.log('rebuilt in ' + (end - start) + ' ms');
    });
}

// watch for changes in the code, rebuilt vis.js automatically
watch(WATCH_FOLDER, function(filename) {
    console.log(filename + ' changed');
    rebuild();
});

rebuild();

console.log('watching for changes in the source code...');
