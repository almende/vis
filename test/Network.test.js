var fs = require('fs');
var assert = require('assert');
var vis = require('../dist/vis');
var Network = vis.network;
var jsdom_global = require('jsdom-global');
var stdout = require('test-console').stdout;
var Validator = require("./../lib/shared/Validator").default;
//var {printStyle} = require('./../lib/shared/Validator');

/**
 * Load legacy-style (i.e. not module) javascript files into context.
 */
function include(list, context) {
  if (!(list instanceof Array)) {
    list = [list];
  }

	for (var n in list) {
  	var path = list[n];
  	var arr = [fs.readFileSync(path) + ''];
  	eval.apply(context, arr);
	}
}


// Useful during debugging:
//if (errorFound === true) {
//  console.log(JSON.stringify(output, null, 2));
//}

describe('Network', function () {
  before(function() {
    this.jsdom_global = jsdom_global(
      "<div id='mynetwork'></div>",
      { skipWindowCheck: true}
    );
    this.container = document.getElementById('mynetwork');
  });


  after(function() {
    this.jsdom_global();
  });


  function createSampleNetwork() {
    // create an array with nodes
    var nodes = new vis.DataSet([
        {id: 1, label: '1'},
        {id: 2, label: '2'},
        {id: 3, label: '3'},
        {id: 4, label: '4'},
        {id: 11, label: '11'},
        {id: 12, label: '12'},
        {id: 13, label: '13'},
        {id: 14, label: '14'},
    ]);
    var edges = new vis.DataSet([
        {from: 1, to: 2},
        {from: 2, to: 3},
        {from: 3, to: 4},
        {from: 11, to: 12},
        {from: 12, to: 13},
        {from: 13, to: 14},
    ]);    

    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: nodes,
        edges: edges
    };

    var options = {
      layout: {
        randomSeed: 8
      },
      edges: {
        smooth: {
          type: 'continuous'  // avoid dynamic here, it adds extra hidden nodes
        }
      }
    };
    var network = new vis.Network(container, data, options);

    return network;
  }


describe('on node.js', function () {
  it('should be running', function () {
    assert(this.container !== null, 'Container div not found');

    // The following should now just plain succeed
    var network = createSampleNetwork();

    assert.equal(Object.keys(network.body.nodes).length, 8);
    assert.equal(Object.keys(network.body.edges).length, 6);
  });


describe('runs example ', function () {
  function loadExample(path) {
    include(path, this);
    var container = document.getElementById('mynetwork');

    // create a network
    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };

    var network = new vis.Network(container, data, options);
    return network;
  };

  it('basicUsage', function () {
    var network = loadExample('./test/network/basicUsage.js', this);
    //console.log(Object.keys(network.body.edges));

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length, 10);
    assert.equal(Object.keys(network.body.edges).length, 5);
  });

/*
  it('WorlCup2014', function () {
    // This is a huge example (which is why it's tested here!), so it takes a long time to load.
    this.timeout(10000);

    var network = loadExample('./examples/network/datasources/WorldCup2014.js', this);
    // console.log(Object.keys(network.body.nodes).length);
    // console.log(Object.keys(network.body.edges).length);

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length, 9964);
    assert.equal(Object.keys(network.body.edges).length, 9228);
  });
*/

  // This actually failed to load, added for this reason
  it('disassemblerExample', function () {
    var network = loadExample('./examples/network/exampleApplications/disassemblerExample.js', this);
    console.log(Object.keys(network.body.nodes).length);
    console.log(Object.keys(network.body.edges).length);

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length, 9964);
    assert.equal(Object.keys(network.body.edges).length, 9228);
  });
});

});

});
