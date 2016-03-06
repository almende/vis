var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var rename = require("gulp-rename");
var webpack = require('webpack');
var uglify = require('uglify-js');
var rimraf = require('rimraf');
var merge = require('merge-stream');
var argv = require('yargs').argv;

var ENTRY             = './index.js';
var HEADER            = './lib/header.js';
var DIST              = './dist';
var VIS_JS            = 'vis.js';
var VIS_MAP           = 'vis.map';
var VIS_MIN_JS        = 'vis.min.js';
var VIS_CSS           = 'vis.css';
var VIS_MIN_CSS       = 'vis.min.css';

// generate banner with today's date and correct version
function createBanner() {
  var today = gutil.date(new Date(), 'yyyy-mm-dd'); // today, formatted as yyyy-mm-dd
  var version = require('./package.json').version;

  return String(fs.readFileSync(HEADER))
      .replace('@@date', today)
      .replace('@@version', version);
}

var bannerPlugin = new webpack.BannerPlugin(createBanner(), {
  entryOnly: true,
  raw: true
});

var webpackConfig = {
  entry: ENTRY,
  output: {
    library: 'vis',
    libraryTarget: 'umd',
    path: DIST,
    filename: VIS_JS,
    sourcePrefix: '  '
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
    ],

    // exclude requires of moment.js language files
    wrappedContextRegExp: /$^/
  },
  plugins: [ bannerPlugin ],
  cache: true
  //debug: true,
  //bail: true
};

var uglifyConfig = {
  outSourceMap: VIS_MAP,
  output: {
    comments: /@license/
  }
};

// create a single instance of the compiler to allow caching
var compiler = webpack(webpackConfig);

// clean the dist/img directory
gulp.task('clean', function (cb) {
  rimraf(DIST + '/img', cb);
});

gulp.task('bundle-js', ['clean'], function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  compiler.run(function (err, stats) {
    if (err) {
      gutil.log(err.toString());
    }

    if (stats && stats.compilation && stats.compilation.errors) {
      // output soft errors
      stats.compilation.errors.forEach(function (err) {
        gutil.log(err.toString());
      });

      if (err || stats.compilation.errors.length > 0) {
        gutil.beep(); // TODO: this does not work on my system
      }
    }
    cb();
  });
});

// bundle and minify css
gulp.task('bundle-css', ['clean'], function () {
  var files = [
    './lib/shared/activator.css',
    './lib/shared/bootstrap.css',
    './lib/shared/configuration.css',

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
    './lib/network/css/network-tooltip.css',
    './lib/network/css/network-navigation.css',
    './lib/network/css/network-colorpicker.css'
  ];

  return gulp.src(files)
      .pipe(concat(VIS_CSS))
      .pipe(gulp.dest(DIST))

    // TODO: nicer to put minifying css in a separate task?
      .pipe(minifyCSS())
      .pipe(rename(VIS_MIN_CSS))
      .pipe(gulp.dest(DIST));
});

gulp.task('copy', ['clean'], function () {
    var network = gulp.src('./lib/network/img/**/*')
      .pipe(gulp.dest(DIST + '/img/network'));

    var timeline = gulp.src('./lib/timeline/img/**/*')
      .pipe(gulp.dest(DIST + '/img/timeline'));

    return merge(network, timeline);
});

gulp.task('minify', ['bundle-js'], function (cb) {
  var result = uglify.minify([DIST + '/' + VIS_JS], uglifyConfig);

  // note: we add a newline '\n' to the end of the minified file to prevent
  //       any issues when concatenating the file downstream (the file ends
  //       with a comment).
  fs.writeFileSync(DIST + '/' + VIS_MIN_JS, result.code + '\n');
  fs.writeFileSync(DIST + '/' + VIS_MAP, result.map.replace(/"\.\/dist\//g, '"'));

  cb();
});

gulp.task('bundle', ['bundle-js', 'bundle-css', 'copy']);

// read command line arguments --bundle and --minify
var bundle = 'bundle' in argv;
var minify = 'minify' in argv;
var watchTasks = [];
if (bundle || minify) {
  // do bundling and/or minifying only when specified on the command line
  watchTasks = [];
  if (bundle) watchTasks.push('bundle');
  if (minify) watchTasks.push('minify');
}
else {
  // by default, do both bundling and minifying
  watchTasks = ['bundle', 'minify'];
}

// The watch task (to automatically rebuild when the source code changes)
gulp.task('watch', watchTasks, function () {
  gulp.watch(['index.js', 'lib/**/*'], watchTasks);
});

// The default task (called when you run `gulp`)
gulp.task('default', ['clean', 'bundle', 'minify']);
