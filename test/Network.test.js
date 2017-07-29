var assert = require('assert');
var vis = require('../dist/vis');
var Network = vis.network;
var jsdom_global = require('jsdom-global');
var stdout = require('test-console').stdout;
var Validator = require("./../lib/shared/Validator").default;
//var {printStyle} = require('./../lib/shared/Validator');

var now = new Date();

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


  it('should be running on node.js', function () {
    assert(this.container !== null, 'Container div not found');

    // The following should now just plain succeed
    var network = createSampleNetwork();

    console.log(Object.keys(network.body.nodes).length);
    //console.log(Object.keys(network.body.edges).length);
    assert(Object.keys(network.body.edges).length === 6);

    console.log(Object.keys(network.body.nodes));
    // console.log(network.body.edges);
  });
});
