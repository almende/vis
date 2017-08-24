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
 * Merge all options of object b into object b
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 *
 * Adapted merge() in dotparser.js
 */
function merge (a, b) {
  if (!a) {
    a = {};
  }

  if (b) {
    for (var name in b) {
      if (b.hasOwnProperty(name)) {
        if (typeof b[name] === 'object') {
          a[name] = merge(a[name], b[name]);
        } else {
          a[name] = b[name];
        }
      }
    }
  }
  return a;
}


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
function createSampleNetwork(options) {
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

  var defaultOptions = {
    layout: {
      randomSeed: 8
    },
    edges: {
      smooth: {
        type: 'continuous'  // avoid dynamic here, it adds extra hidden nodes
      }
    }
  };

  options = merge(defaultOptions, options);

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


/////////////////////////////////////////////////////
// Local helper methods for Edge and Node testing
/////////////////////////////////////////////////////

  /**
   * Simplify network creation for local tests
   */
  function createNetwork(options) {
    var [network, data, numNodes, numEdges] = createSampleNetwork(options);

    return network;
  }


  function firstNode(network) {
    for (var id in network.body.nodes) {
      return network.body.nodes[id];
    }

    return undefined;
  }

  function firstEdge(network) {
    for (var id in network.body.edges) {
      return network.body.edges[id];
    }

    return undefined;
  }


  function checkChooserValues(item, chooser, labelChooser) {
    if (chooser === 'function') {
      assert.equal(typeof item.chooser, 'function');
    } else {
      assert.equal(item.chooser, chooser);
    }

    if (labelChooser === 'function') {
      assert.equal(typeof item.labelModule.fontOptions.chooser, 'function');
    } else {
      assert.equal(item.labelModule.fontOptions.chooser, labelChooser);
    }
  }


describe('Node', function () {

  /**
   * NOTE: choosify tests of Node and Edge are parallel
   * TODO: consolidate this is necessary
   */
  it('properly handles choosify input', function () {
    // check defaults
    var options = {};
    var network = createNetwork(options);
    checkChooserValues(firstNode(network), true, true);

    // There's no point in checking invalid values here; these are detected by the options parser
    // and subsequently handled as missing input, thus assigned defaults

    // check various combinations of valid input

    options = {nodes: {chosen: false}};
    network = createNetwork(options);
    checkChooserValues(firstNode(network), false, false);

    options = {nodes: {chosen: { node:true, label:false}}};
    network = createNetwork(options);
    checkChooserValues(firstNode(network), true, false);

    options = {nodes: {chosen: {
      node:true,
      label: function(value, id, selected, hovering) {}
    }}};
    network = createNetwork(options);
    checkChooserValues(firstNode(network), true, 'function');

    options = {nodes: {chosen: {
      node: function(value, id, selected, hovering) {},
      label:false,
    }}};
    network = createNetwork(options);
    checkChooserValues(firstNode(network), 'function', false);
  });
});  // Node


describe('Edge', function () {

  /**
   * NOTE: choosify tests of Node and Edge are parallel
   * TODO: consolidate this is necessary
   */
  it('properly handles choosify input', function () {
    // check defaults
    var options = {};
    var network = createNetwork(options);
    checkChooserValues(firstEdge(network), true, true);

    // There's no point in checking invalid values here; these are detected by the options parser
    // and subsequently handled as missing input, thus assigned defaults

    // check various combinations of valid input

    options = {edges: {chosen: false}};
    network = createNetwork(options);
    checkChooserValues(firstEdge(network), false, false);

    options = {edges: {chosen: { edge:true, label:false}}};
    network = createNetwork(options);
    checkChooserValues(firstEdge(network), true, false);

    options = {edges: {chosen: {
      edge:true,
      label: function(value, id, selected, hovering) {}
    }}};
    network = createNetwork(options);
    checkChooserValues(firstEdge(network), true, 'function');

    options = {edges: {chosen: {
      edge: function(value, id, selected, hovering) {},
      label:false,
    }}};
    network = createNetwork(options);
    checkChooserValues(firstEdge(network), 'function', false);
  });


  /**
   * Support routine for next unit test
   */
  function createDataforColorChange() {
    var nodes = new vis.DataSet([
      {id: 1, label: 'Node 1' }, // group:'Group1'},
      {id: 2, label: 'Node 2', group:'Group2'},
      {id: 3, label: 'Node 3'},
    ]);

    // create an array with edges
    var edges = new vis.DataSet([
      {id: 1, from: 1, to: 2},
      {id: 2, from: 1, to: 3, color: { inherit: 'to'}},
      {id: 3, from: 3, to: 3, color: { color: '#00FF00'}},
      {id: 4, from: 2, to: 3, color: { inherit: 'from'}},
    ]);


    var data = {
      nodes: nodes,
      edges: edges
    };

    return data;
  }


  /**
   * Unit test for fix of #3350
   *
   * The issue is that changing color options is not registered in the nodes.
   * We test the updates the color options in the general edges options here.
   */
  it('sets inherit color option for edges on call to Network.setOptions()', function () {
    var container = document.getElementById('mynetwork');
    var data =  createDataforColorChange();

    var options = {
      "edges" : { "color" : { "inherit" : "to" } },
    };

    // Test passing options on init.
    var network = new vis.Network(container, data, options);
    var edges = network.body.edges;
    assert.equal(edges[1].options.color.inherit, 'to');   // new default
    assert.equal(edges[2].options.color.inherit, 'to');   // set in edge
    assert.equal(edges[3].options.color.inherit, false);  // has explicit color
    assert.equal(edges[4].options.color.inherit, 'from'); // set in edge

    // Sanity check: colors should still be defaults
    assert.equal(edges[1].options.color.color, network.edgesHandler.options.color.color);

    // Override the color value - inherit returns to default
    network.setOptions({ edges:{color: {}}});
    assert.equal(edges[1].options.color.inherit, 'from');  // default
    assert.equal(edges[2].options.color.inherit, 'to');    // set in edge
    assert.equal(edges[3].options.color.inherit, false);   // has explicit color
    assert.equal(edges[4].options.color.inherit, 'from');  // set in edge

    // Check no options
    network = new vis.Network(container, data, {});
    edges = network.body.edges;
    assert.equal(edges[1].options.color.inherit, 'from');  // default
    assert.equal(edges[2].options.color.inherit, 'to');    // set in edge
    assert.equal(edges[3].options.color.inherit, false);   // has explicit color
    assert.equal(edges[4].options.color.inherit, 'from');  // set in edge

    // Set new value
    network.setOptions(options);
    assert.equal(edges[1].options.color.inherit, 'to');
    assert.equal(edges[2].options.color.inherit, 'to');    // set in edge
    assert.equal(edges[3].options.color.inherit, false);   // has explicit color
    assert.equal(edges[4].options.color.inherit, 'from');  // set in edge

/*
    // Useful for debugging
    console.log('===================================');
    console.log(edges[1].options.color);
    console.log(edges[1].options.color.__proto__);
    console.log(edges[1].options);
    console.log(edges[1].options.__proto__);
    console.log(edges[1].edgeOptions);
*/
  });


  it('sets inherit color option for specific edge', function () {
    var container = document.getElementById('mynetwork');
    var data =  createDataforColorChange();

    // Check no options
    var network = new vis.Network(container, data, {});
    var edges = network.body.edges;
    assert.equal(edges[1].options.color.inherit, 'from');  // default
    assert.equal(edges[2].options.color.inherit, 'to');    // set in edge
    assert.equal(edges[3].options.color.inherit, false);   // has explicit color
    assert.equal(edges[4].options.color.inherit, 'from');  // set in edge

    // Set new value
    data.edges.update({id: 1, color: { inherit: 'to'}});
    assert.equal(edges[1].options.color.inherit, 'to');  // Only this changed
    assert.equal(edges[2].options.color.inherit, 'to');
    assert.equal(edges[3].options.color.inherit, false);   // has explicit color
    assert.equal(edges[4].options.color.inherit, 'from');
  });


  /**
   * Perhaps TODO: add unit test for passing string value for color option
   */
  it('sets color value for edges on call to Network.setOptions()', function () {
    var container = document.getElementById('mynetwork');
    var data =  createDataforColorChange();

    var defaultColor = '#848484';  // From defaults
    var color = '#FF0000';

    var options = {
      "edges" : { "color" : { "color" : color } },
    };

    // Test passing options on init.
    var network = new vis.Network(container, data, options);
    var edges = network.body.edges;
    assert.equal(edges[1].options.color.color, color);
    assert.equal(edges[1].options.color.inherit, false);  // Explicit color, so no inherit
    assert.equal(edges[2].options.color.color, color);
    assert.equal(edges[2].options.color.inherit, 'to');   // Local value overrides! (bug according to docs)
    assert.notEqual(edges[3].options.color.color, color); // Has own value
    assert.equal(edges[3].options.color.inherit, false);  // Explicit color, so no inherit
    assert.equal(edges[4].options.color.color, color);

    // Override the color value - all should return to default
    network.setOptions({ edges:{color: {}}});
    assert.equal(edges[1].options.color.color, defaultColor);
    assert.equal(edges[1].options.color.inherit, 'from');
    assert.equal(edges[2].options.color.color, defaultColor);
    assert.notEqual(edges[3].options.color.color, color); // Has own value
    assert.equal(edges[4].options.color.color, defaultColor);

    // Check no options
    network = new vis.Network(container, data, {});
    edges = network.body.edges;
    // At this point, color has not changed yet
    assert.equal(edges[1].options.color.color, defaultColor);
    assert.equal(edges[1].options.color.highlight, defaultColor);
    assert.equal(edges[1].options.color.inherit, 'from');
    assert.notEqual(edges[3].options.color.color, color); // Has own value

    // Set new Value
    network.setOptions(options);
    assert.equal(edges[1].options.color.color, color);
    assert.equal(edges[1].options.color.highlight, defaultColor); // Should not be changed
    assert.equal(edges[1].options.color.inherit, false); // Explicit color, so no inherit
    assert.equal(edges[2].options.color.color, color);
    assert.notEqual(edges[3].options.color.color, color); // Has own value
    assert.equal(edges[4].options.color.color, color);
  });
});  // Edge


describe('Clustering', function () {

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
  /**
   * Helper function for setting up a graph for testing clusterByEdgeCount()
   */
  function createOutlierGraph() {
    // create an array with nodes
    var nodes = new vis.DataSet([
      {id: 1, label: '1', group:'Group1'},
      {id: 2, label: '2', group:'Group2'},
      {id: 3, label: '3', group:'Group3'},
      {id: 4, label: '4', group:'Group4'},
      {id: 5, label: '5', group:'Group4'}
    ]);

    // create an array with edges
    var edges = new vis.DataSet([
      {from: 1, to: 3},
      {from: 1, to: 2},
      {from: 2, to: 4},
      {from: 2, to: 5}
    ]);

    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {
      "groups" : {
        "Group1" : { level:1 },
        "Group2" : { level:2 },
        "Group3" : { level:3 },
        "Group4" : { level:4 }
      }
    };

    var network = new vis.Network (container, data, options);

    return network;
  }


  /**
   * Check on fix for #3367
   */
  it('correctly handles edge cases of clusterByEdgeCount()', function () {
    /**
     * Collect clustered id's
     *
     * All node id's in clustering nodes are collected into an array;
     * The results for all clusters are returned as an array.
     *
     * Ordering of output depends on the order in which they are defined
     * within nodes.clustering; strictly, speaking, the array and its items
     * are collections, so order should not matter. 
     */
    var collectClusters = function(network) {
      var clusters = [];
      for(var n in network.body.nodes) {
        var node = network.body.nodes[n];
        if (node.containedNodes === undefined) continue; // clusters only

        // Collect id's of nodes in the cluster
        var nodes = [];
        for(var m in node.containedNodes) {
          nodes.push(m);
        }
        clusters.push(nodes);
      }

      return clusters;
    }


    /**
     * Compare cluster data
     *
     * params are arrays of arrays of id's, e.g:
     *
     *  [[1,3],[2,4]]
     *
     * Item arrays are the id's of nodes in a given cluster
     *
     * This comparison depends on the ordering; better
     * would be to treat the items and values as collections.
     */
    var compareClusterInfo = function(recieved, expected) {
      if (recieved.length !== expected.length) return false;

      for (var n = 0; n < recieved.length; ++n) {
        var itema = recieved[n];
        var itemb = expected[n];
        if (itema.length !== itemb.length) return false;

        for (var m = 0; m < itema.length; ++m) {
          if (itema[m] != itemb[m]) return false;  // != because values can be string or number
        }
      }

      return true;
    }


    var assertJoinCondition = function(joinCondition, expected) {
      var network = createOutlierGraph();
      network.clusterOutliers({joinCondition: joinCondition});
      var recieved = collectClusters(network);
      //console.log(recieved);

      assert(compareClusterInfo(recieved, expected),
        'recieved:' + JSON.stringify(recieved) + '; '
      + 'expected: ' + JSON.stringify(expected));
    };


    // Should cluster 3,4,5:
    var joinAll_   = function(n) { return true ; }

    // Should cluster none:
    var joinNone_  = function(n) { return false ; }

    // Should cluster 4 & 5:
    var joinLevel_ = function(n) { return n.level > 3 ; }

    assertJoinCondition(undefined  , [[1,3],[2,4,5]]);
    assertJoinCondition(null       , [[1,3],[2,4,5]]);
    assertJoinCondition(joinNone_  , []);
    assertJoinCondition(joinLevel_ , [[2,4,5]]);
  });

});  // Clustering


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
