/**
 * Jake build script
 */
var jake = require('jake'),
    browserify = require('browserify'),
    path = require('path'),
    fs = require('fs');

require('jake-utils');

// constants
var VIS = './vis.js';
var VIS_TMP = './vis.js.tmp';
var VIS_MIN = './vis.min.js';

/**
 * default task
 */
desc('Execute all tasks: build all libraries');
task('default', ['build', 'minify', 'test'], function () {
  console.log('done');
});

/**
 * build the visualization library vis.js
 */
desc('Build the visualization library vis.js');
task('build', {async: true}, function () {
  // concatenate and stringify the css files
  var result = concat({
    src: [
      './src/timeline/component/css/timeline.css',
      './src/timeline/component/css/panel.css',
      './src/timeline/component/css/groupset.css',
      './src/timeline/component/css/itemset.css',
      './src/timeline/component/css/item.css',
      './src/timeline/component/css/timeaxis.css',
      './src/timeline/component/css/currenttime.css',
      './src/timeline/component/css/customtime.css'
    ],
    header: '/* vis.js stylesheet */',
    separator: '\n'
  });
  var cssText = JSON.stringify(result.code);

  // concatenate the script files
  concat({
    dest: VIS_TMP,
    src: [
      './src/module/imports.js',

      './src/shim.js',
      './src/util.js',
      './src/events.js',
      './src/EventBus.js',
      './src/DataSet.js',
      './src/DataView.js',

      './src/timeline/TimeStep.js',
      './src/timeline/Stack.js',
      './src/timeline/Range.js',
      './src/timeline/Controller.js',
      './src/timeline/component/Component.js',
      './src/timeline/component/Panel.js',
      './src/timeline/component/RootPanel.js',
      './src/timeline/component/TimeAxis.js',
      './src/timeline/component/CurrentTime.js',
      './src/timeline/component/CustomTime.js',
      './src/timeline/component/ItemSet.js',
      './src/timeline/component/item/*.js',
      './src/timeline/component/Group.js',
      './src/timeline/component/GroupSet.js',
      './src/timeline/Timeline.js',

      './src/graph/dotparser.js',
      './src/graph/shapes.js',
      './src/graph/Node.js',
      './src/graph/Edge.js',
      './src/graph/Popup.js',
      './src/graph/Groups.js',
      './src/graph/Images.js',
      './src/graph/Cluster.js',
      './src/graph/Graph.js',


      './src/module/exports.js'
    ],

    separator: '\n',

    // Note: we insert the css as a string in the javascript code here
    //       the css will be injected on load of the javascript library
    footer: '// inject css\n' +
        'util.loadCss(' + cssText + ');\n'
  });

  // bundle the concatenated script and dependencies into one file
  var b = browserify();
  b.add(VIS_TMP);
  b.bundle({
    standalone: 'vis'
  }, function (err, code) {
    if(err) {
      throw err;
    }

    // add header and footer
    var lib = read('./src/module/header.js') + code;

    // write bundled file
    write(VIS, lib);
    console.log('created ' + VIS);

    // remove temporary file
    fs.unlinkSync(VIS_TMP);

    // update version number and stuff in the javascript files
    replacePlaceholders(VIS);

    complete();
  });
});

/**
 * minify the visualization library vis.js
 */
desc('Minify the visualization library vis.js');
task('minify', function () {
  // minify javascript
  minify({
    src: VIS,
    dest: VIS_MIN,
    header: read('./src/module/header.js')
  });

  // update version number and stuff in the javascript files
  replacePlaceholders(VIS_MIN);

  console.log('created ' + VIS_MIN);
});

/**
 * test task
 */
desc('Test the library');
task('test', ['build'], function () {
  // TODO: use a testing suite for testing: nodeunit, mocha, tap, ...
  var filelist = new jake.FileList();
  filelist.include([
    './test/**/*.js'
  ]);

  var files = filelist.toArray();
  files.forEach(function (file) {
    require('./' + file);
  });

  console.log('Executed ' + files.length + ' test files successfully');
});

/**
 * replace version, date, and name placeholders in the provided file
 * @param {String} filename
 */
var replacePlaceholders = function (filename) {
  replace({
    replacements: [
      {pattern: '@@date',    replacement: today()},
      {pattern: '@@version', replacement: version()}
    ],
    src: filename
  });
};
