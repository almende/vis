/**
 * Jake build script
 */
var jake = require('jake'),
    browserify = require('browserify'),
    wrench = require('wrench'),
    CleanCSS = require('clean-css'),
    fs = require('fs');

require('jake-utils');

// constants
var DIST = './dist';
var VIS = DIST + '/vis.js';
var VIS_CSS = DIST + '/vis.css';
var VIS_TMP = DIST + '/vis.js.tmp';
var VIS_MIN = DIST + '/vis.min.js';
var VIS_MIN_CSS = DIST + '/vis.min.css';

/**
 * default task
 */
desc('Default task: build all libraries');
task('default', ['build', 'minify'], function () {
  console.log('done');
});

/**
 * build the visualization library vis.js
 */
desc('Build the visualization library vis.js');
task('build', {async: true}, function () {
  jake.mkdirP(DIST);
  jake.mkdirP(DIST + '/img');

  // concatenate and stringify the css files
  concat({
    src: [
      './lib/timeline/component/css/timeline.css',
      './lib/timeline/component/css/panel.css',
      './lib/timeline/component/css/labelset.css',
      './lib/timeline/component/css/itemset.css',
      './lib/timeline/component/css/item.css',
      './lib/timeline/component/css/timeaxis.css',
      './lib/timeline/component/css/currenttime.css',
      './lib/timeline/component/css/customtime.css',
      './lib/timeline/component/css/animation.css',

      './lib/timeline/component/css/dataaxis.css',
      './lib/timeline/component/css/pathStyles.css',

      './lib/network/css/network-manipulation.css',
      './lib/network/css/network-navigation.css'
    ],
    dest: VIS_CSS,
    separator: '\n'
  });
  console.log('created ' + VIS_CSS);

  // concatenate the script files
  concat({
    dest: VIS_TMP,
    src: [
      './lib/module/imports.js',

      './lib/shim.js',
      './lib/util.js',
      './lib/DOMutil.js',
      './lib/DataSet.js',
      './lib/DataView.js',

      './lib/timeline/component/GraphGroup.js',
      './lib/timeline/component/Legend.js',
      './lib/timeline/component/DataAxis.js',
      './lib/timeline/component/LineGraph.js',
      './lib/timeline/DataStep.js',

      './lib/timeline/Stack.js',
      './lib/timeline/TimeStep.js',
      './lib/timeline/Range.js',
      './lib/timeline/component/Component.js',
      './lib/timeline/component/TimeAxis.js',
      './lib/timeline/component/CurrentTime.js',
      './lib/timeline/component/CustomTime.js',
      './lib/timeline/component/ItemSet.js',
      './lib/timeline/component/item/*.js',
      './lib/timeline/component/Group.js',
      './lib/timeline/Timeline.js',
      './lib/timeline/Graph2d.js',

      './lib/network/dotparser.js',
      './lib/network/shapes.js',
      './lib/network/Node.js',
      './lib/network/Edge.js',
      './lib/network/Popup.js',
      './lib/network/Groups.js',
      './lib/network/Images.js',
      './lib/network/networkMixins/physics/PhysicsMixin.js',
      './lib/network/networkMixins/physics/HierarchialRepulsion.js',
      './lib/network/networkMixins/physics/BarnesHut.js',
      './lib/network/networkMixins/physics/Repulsion.js',
      './lib/network/networkMixins/HierarchicalLayoutMixin.js',
      './lib/network/networkMixins/ManipulationMixin.js',
      './lib/network/networkMixins/SectorsMixin.js',
      './lib/network/networkMixins/ClusterMixin.js',
      './lib/network/networkMixins/SelectionMixin.js',
      './lib/network/networkMixins/NavigationMixin.js',
      './lib/network/networkMixins/MixinLoader.js',
      './lib/network/Network.js',

      './lib/graph3d/Graph3d.js',

      './lib/module/exports.js'
    ],

    separator: '\n'
  });

  // copy images
  wrench.copyDirSyncRecursive('./lib/network/img', DIST + '/img/network', {
    forceDelete: true
  });
  wrench.copyDirSyncRecursive('./lib/timeline/img', DIST + '/img/timeline', {
    forceDelete: true
  });

  var timeStart = Date.now();
  // bundle the concatenated script and dependencies into one file
  var b = browserify();
  b.add(VIS_TMP);
  b.bundle({
    standalone: 'vis'
  }, function (err, code) {
    if(err) {
      throw err;
    }
    console.log("browserify",Date.now() - timeStart); timeStart = Date.now();
    // add header and footer
    var lib = read('./lib/module/header.js') + code;

    // write bundled file
    write(VIS, lib);
    console.log('created js' + VIS);

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
task('minify', {async: true}, function () {
  // minify javascript
  minify({
    src: VIS,
    dest: VIS_MIN,
    header: read('./lib/module/header.js')
  });

  // update version number and stuff in the javascript files
  replacePlaceholders(VIS_MIN);

  console.log('created minified ' + VIS_MIN);

  var minified = new CleanCSS().minify(read(VIS_CSS));
  write(VIS_MIN_CSS, minified);
  console.log('created minified ' + VIS_MIN_CSS);
});

/**
 * test task
 */
desc('Test the library');
task('test', function () {
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
