var fs = require('fs');
var assert = require('assert');
var vis = require('../dist/vis');
var Network = vis.network;
var jsdom_global = require('jsdom-global');
var stdout = require('test-console').stdout;
var Validator = require("./../lib/shared/Validator").default;
//var {printStyle} = require('./../lib/shared/Validator');

// Useful during debugging:
//  console.log(JSON.stringify(output, null, 2));


/**
 * Load legacy-style (i.e. not module) javascript files into the given context.
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


/**
 * Defined network consists of two sub-networks:
 *
 * - 1-2-3-4
 * - 11-12-13-14
 *
 * For reference, this is the sample network of issue #1218
 */
function createSampleNetwork() {
  var NumInitialNodes = 8;
  var NumInitialEdges = 6;

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

  assertNumNodes(network, NumInitialNodes);
  assertNumEdges(network, NumInitialEdges);

  return [network, data, NumInitialNodes, NumInitialEdges];
};


/**
 * Create a cluster for the dynamic data change cases.
 *
 * Works on the network created by createSampleNetwork().
 *
 * This is actually a pathological case; there are two separate sub-networks and 
 * a cluster is made of two nodes, each from one of the sub-networks.
 */
function createCluster(network) {
  //console.log("clustering 1 and 11")
  var clusterOptionsByData = {
    joinCondition: function(node) {
      if (node.id == 1 || node.id == 11) return true;
      return false;
    },
    clusterNodeProperties: {id:"c1", label:'c1'}
  }
  network.cluster(clusterOptionsByData);
}


/**
 * Display node/edge state, useful during debugging
 */
function log(network) {
  console.log(Object.keys(network.body.nodes));
  console.log(network.body.nodeIndices);
  console.log(Object.keys(network.body.edges));
  console.log(network.body.edgeIndices);
};


/**
 * Note that only the node and edges counts are asserted.
 * This might be done more thoroughly by explicitly checking the id's
 */
function assertNumNodes(network, expectedPresent, expectedVisible) {
  if (expectedVisible === undefined) expectedVisible = expectedPresent;

  assert.equal(Object.keys(network.body.nodes).length, expectedPresent);
  assert.equal(network.body.nodeIndices.length, expectedVisible);
};


/**
 * Comment at assertNumNodes() also applies.
 */
function assertNumEdges(network, expectedPresent, expectedVisible) {
  if (expectedVisible === undefined) expectedVisible = expectedPresent;

  assert.equal(Object.keys(network.body.edges).length, expectedPresent);
  assert.equal(network.body.edgeIndices.length, expectedVisible);
};


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


  /**
   * Check on fix for #1218
   */
  it('connects a new edge to a clustering node instead of the clustered node', function () {
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    createCluster(network);
    numNodes += 1;                                    // A clustering node is now hiding two nodes
    assertNumNodes(network, numNodes, numNodes - 2);
    numEdges += 2;                                    // Two clustering edges now hide two edges
    assertNumEdges(network, numEdges, numEdges - 2);

    //console.log("Creating node 21")
    data.nodes.update([{id: 21, label: '21'}]);
    numNodes += 1;                                    // New unconnected node added
    assertNumNodes(network, numNodes, numNodes - 2);
    assertNumEdges(network, numEdges, numEdges - 2);  // edges unchanged

    //console.log("Creating edge 21 pointing to 1");
    // '1' is part of the cluster so should
    // connect to cluster instead
	  data.edges.update([{from: 21, to: 1}]);
    assertNumNodes(network, numNodes, numNodes - 2);  // nodes unchanged
    numEdges += 2;                                    // A new clustering edge is hiding a new edge
    assertNumEdges(network, numEdges, numEdges - 3);
  });


  /**
   * Check on fix for #1315
   */
  it('can uncluster a clustered node when a node is removed that has an edge to that cluster', function () {
    // NOTE: this block is same as previous test
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    createCluster(network);
    numNodes += 1;                                    // A clustering node is now hiding two nodes
    assertNumNodes(network, numNodes, numNodes - 2);
    numEdges += 2;                                    // Two clustering edges now hide two edges
    assertNumEdges(network, numEdges, numEdges - 2);
    // End block same as previous test

    //console.log("removing 12");
    data.nodes.remove(12);

    // NOTE:
    // At this particular point, there are still the two edges for node 12 in the edges DataSet.
    // If you want to do the delete correctly, these should also be deleted explictly from
    // the edges DataSet. In the Network instance, however, this.body.nodes and this.body.edges
    // should be correct, with the edges of 12 all cleared out.

    // 12 was connected to 11, which is clustered
    numNodes -= 1;                                    // 12 removed, one less node
    assertNumNodes(network, numNodes, numNodes - 2);
    numEdges -= 3;                                    // clustering edge c1-12 and 2 edges of 12 gone
    assertNumEdges(network, numEdges, numEdges - 1);

		//console.log("Unclustering c1");
    network.openCluster("c1");
    numNodes -= 1;                                    // cluster node removed, one less node
    assertNumNodes(network, numNodes, numNodes);      // all are visible again
    numEdges -= 1;                                    // clustering edge gone, regular edge visible
    assertNumEdges(network, numEdges, numEdges);      // all are visible again

  });


  /**
   * Check on fix for #1291
   */
  it('can remove a node inside a cluster and then open that cluster', function () {
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    var clusterOptionsByData = {
      joinCondition: function(node) {
        if (node.id == 1 || node.id == 2 || node.id == 3) return true;
        return false;
      },
      clusterNodeProperties: {id:"c1", label:'c1'}
    }

    network.cluster(clusterOptionsByData);
    numNodes += 1;                                    // new cluster node
    assertNumNodes(network, numNodes, numNodes - 3);  // 3 clustered nodes
    numEdges += 1;                                    // 1 cluster edge expected
    assertNumEdges(network, numEdges, numEdges - 3);  // 3 edges hidden

		//console.log("removing node 2, which is inside the cluster");
    data.nodes.remove(2);
    numNodes -= 1;                                    // clustered node removed
    assertNumNodes(network, numNodes, numNodes - 2);  // view doesn't change
    numEdges -= 2;                                    // edges removed hidden in cluster
    assertNumEdges(network, numEdges, numEdges - 1);  // view doesn't change

		//console.log("Unclustering c1");
    network.openCluster("c1")
    numNodes -= 1;                                    // cluster node gone
    assertNumNodes(network, numNodes, numNodes);      // all visible
    numEdges -= 1;                                    // cluster edge gone
    assertNumEdges(network, numEdges, numEdges);      // all visible

		//log(network);
  });


describe('on node.js', function () {
  it('should be running', function () {
    assert(this.container !== null, 'Container div not found');

    // The following should now just plain succeed
    var [network, data] = createSampleNetwork();

    assert.equal(Object.keys(network.body.nodes).length, 8);
    assert.equal(Object.keys(network.body.edges).length, 6);
  });


describe('runs example ', function () {

  function loadExample(path, noPhysics) {
    include(path, this);
    var container = document.getElementById('mynetwork');

    // create a network
    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };

    if (noPhysics) {
      // Avoid excessive processor time due to load.
      // We're just interested that the load itself is good
      options.physics = false;
    }

    var network = new vis.Network(container, data, options);
    return network;
  };


  it('basicUsage', function () {
    var network = loadExample('./test/network/basicUsage.js');
    //console.log(Object.keys(network.body.edges));

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length, 10);
    assert.equal(Object.keys(network.body.edges).length, 5);
  });


  it('WorlCup2014', function () {
    // This is a huge example (which is why it's tested here!), so it takes a long time to load.
    this.timeout(10000);

    var network = loadExample('./examples/network/datasources/WorldCup2014.js', true);

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length, 9964);
    assert.equal(Object.keys(network.body.edges).length, 9228);
  });


  // This actually failed to load, added for this reason
  it('disassemblerExample', function () {
    var network = loadExample('./examples/network/exampleApplications/disassemblerExample.js');
    // console.log(Object.keys(network.body.nodes));
    // console.log(Object.keys(network.body.edges));

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length,  9);
    assert.equal(Object.keys(network.body.edges).length, 14 - 3);  // NB 3 edges in data not displayed
  });

});  // runs example
});  // on node.js
});  // Network
