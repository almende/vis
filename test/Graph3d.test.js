var assert = require('assert');
var Graph3d = require('../lib/graph3d/Graph3d');
var jsdom_global = require('jsdom-global');
var canvasMockify = require('./canvas-mock');
var stdout = require('test-console').stdout;
var Validator = require("./../lib/shared/Validator").default;
//var {printStyle} = require('./../lib/shared/Validator');
var {allOptions, configureOptions} = require('./../lib/graph3d/options.js');

var now = new Date();

describe('Graph3d', function () {
  before(function() {
    this.jsdom_global = canvasMockify("<div id='mygraph'></div>");
    this.container = document.getElementById('mygraph');
  });


  after(function() {
    this.jsdom_global();
  });


  it('should pass validation for the default options', function () {
    assert(Graph3d.DEFAULTS !== undefined);

    let errorFound;
    let output;
    output = stdout.inspectSync(function() {
      errorFound = Validator.validate(Graph3d.DEFAULTS, allOptions);
    });

    // Useful during debugging:
    //if (errorFound === true) {
    //  console.log(JSON.stringify(output, null, 2));
    //}
    assert(!errorFound, 'DEFAULTS options object does not pass validation');
  });


  it('accepts new option values on defined instance', function () {
    assert(this.container !== null, 'Container div not found');

    var BAR_STYLE = 0;  // from var STYLE in Settings.js
    var DOT_STYLE = 3;  // idem

    var data = [
      {x:0, y:0, z: 10},
      {x:0, y:1, z: 20},
      {x:1, y:0, z: 30},
      {x:1, y:1, z: 40},
    ];

    var options = {
      style: 'dot'
    };

    var graph = new Graph3d(this.container, data, options);
    assert.equal(graph.style, DOT_STYLE, "Style not set to expected 'dot'");

    graph.setOptions({ style: 'bar'});  // Call should just work, no exception thrown
    assert.equal(graph.style, BAR_STYLE, "Style not set to expected 'bar'");
  });
});
