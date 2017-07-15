var assert = require('assert');
var jsdom_global = require('jsdom-global');
var vis = require('../dist/vis');
var Graph3d = vis.Graph3d;


describe('Graph3d', function () {

  before(function() {
    console.log('before!');
    this.jsdom_global = jsdom_global(
      "<div id='mynetwork'></div>",
      { skipWindowCheck: true}
    );
    this.container = document.getElementById('mynetwork');
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

    var graph = new vis.Graph3d(this.container, data, options);
    assert.equal(graph.style, DOT_STYLE, "Style not set to expected 'dot'");

    graph.setOptions({ style: 'bar'});  // Call fails without PR #3255
    assert.equal(graph.style, BAR_STYLE, "Style not set to expected 'bar'");
  });


  after(function() {
    console.log('after!');
    this.jsdom_global();
  });
});
