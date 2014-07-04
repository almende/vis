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
      './src/timeline/component/css/timeline.css',
      './src/timeline/component/css/panel.css',
      './src/timeline/component/css/labelset.css',
      './src/timeline/component/css/itemset.css',
      './src/timeline/component/css/item.css',
      './src/timeline/component/css/timeaxis.css',
      './src/timeline/component/css/currenttime.css',
      './src/timeline/component/css/customtime.css',
      './src/timeline/component/css/animation.css',

      './src/timeline/component/css/dataaxis.css',
      './src/timeline/component/css/pathStyles.css',

      './src/network/css/network-manipulation.css',
      './src/network/css/network-navigation.css'
    ],
    dest: VIS_CSS,
    separator: '\n'
  });
  console.log('created ' + VIS_CSS);

  // concatenate the script files
  concat({
    dest: VIS_TMP,
    src: [
      './src/module/imports.js',

      './src/shim.js',
      './src/util.js',
      './src/DOMutil.js',
      './src/DataSet.js',
      './src/DataView.js',

      './src/timeline/component/GraphGroup.js',
      './src/timeline/component/Legend.js',
      './src/timeline/component/DataAxis.js',
      './src/timeline/component/Linegraph.js',
      './src/timeline/DataStep.js',

      './src/timeline/Stack.js',
      './src/timeline/TimeStep.js',
      './src/timeline/Range.js',
      './src/timeline/component/Component.js',
      './src/timeline/component/TimeAxis.js',
      './src/timeline/component/CurrentTime.js',
      './src/timeline/component/CustomTime.js',
      './src/timeline/component/ItemSet.js',
      './src/timeline/component/item/*.js',
      './src/timeline/component/Group.js',
      './src/timeline/Timeline.js',
      './src/timeline/Graph2d.js',

      './src/network/dotparser.js',
      './src/network/shapes.js',
      './src/network/Node.js',
      './src/network/Edge.js',
      './src/network/Popup.js',
      './src/network/Groups.js',
      './src/network/Images.js',
      './src/network/networkMixins/physics/PhysicsMixin.js',
      './src/network/networkMixins/physics/HierarchialRepulsion.js',
      './src/network/networkMixins/physics/BarnesHut.js',
      './src/network/networkMixins/physics/Repulsion.js',
      './src/network/networkMixins/HierarchicalLayoutMixin.js',
      './src/network/networkMixins/ManipulationMixin.js',
      './src/network/networkMixins/SectorsMixin.js',
      './src/network/networkMixins/ClusterMixin.js',
      './src/network/networkMixins/SelectionMixin.js',
      './src/network/networkMixins/NavigationMixin.js',
      './src/network/networkMixins/MixinLoader.js',
      './src/network/Network.js',

      './src/graph3d/Graph3d.js',

      './src/module/exports.js'
    ],

    separator: '\n'
  });

  // copy images
  wrench.copyDirSyncRecursive('./src/network/img', DIST + '/img/network', {
    forceDelete: true
  });
  wrench.copyDirSyncRecursive('./src/timeline/img', DIST + '/img/timeline', {
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
    var lib = read('./src/module/header.js') + code;

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
    header: read('./src/module/header.js')
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
