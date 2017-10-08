/**
 *
 * Useful during debugging
 * =======================
 *
 * console.log(JSON.stringify(output, null, 2));
 *
 *   for (let i in network.body.edges) {
 *     let edge = network.body.edges[i];
 *     console.log("" + i + ": from: " + edge.fromId + ", to: " + edge.toId);
 *   }
 */
var fs = require('fs');
var assert = require('assert');
var vis = require('../dist/vis');
var Network = vis.network;
var jsdom_global = require('jsdom-global');
var stdout = require('test-console').stdout;
var Validator = require("./../lib/shared/Validator").default;
var {allOptions, configureOptions} = require('./../lib/network/options.js');
//var {printStyle} = require('./../lib/shared/Validator');


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

  assert.equal(Object.keys(network.body.nodes).length, expectedPresent, "Total number of nodes does not match");
  assert.equal(network.body.nodeIndices.length, expectedVisible, "Number of visible nodes does not match");
};


/**
 * Comment at assertNumNodes() also applies.
 */
function assertNumEdges(network, expectedPresent, expectedVisible) {
  if (expectedVisible === undefined) expectedVisible = expectedPresent;

  assert.equal(Object.keys(network.body.edges).length, expectedPresent, "Total number of edges does not match");
  assert.equal(network.body.edgeIndices.length, expectedVisible, "Number of visible edges does not match");
};


/**
 * Check if the font options haven't changed.
 *
 * This is to guard against future code changes; a lot of the code deals with particular properties of
 * the font options.
 * If any assertion fails here, all code in Network handling fonts should be checked.
 */
function checkFontProperties(fontItem, checkStrict = true) {
  var knownProperties = [
    'color',
    'size',
    'face',
    'background',
    'strokeWidth',
    'strokeColor',
    'align',
    'multi',
    'vadjust',
    'bold',
    'boldital',
    'ital',
    'mono',
  ];

  // All properties in fontItem should be known
  for (var prop in fontItem) {
    if (prop === '__type__') continue;  // Skip special field in options definition
    if (!fontItem.hasOwnProperty(prop)) continue;
    assert(knownProperties.indexOf(prop) !== -1, "Unknown font option '" + prop + "'");
  }

  if (!checkStrict) return;

  // All known properties should be present
  var keys = Object.keys(fontItem);
  for (var n in knownProperties) {
    var prop = knownProperties[n];
    assert(keys.indexOf(prop) !== -1, "Missing known font option '" + prop + "'");
  }
}



describe('Network', function () {

  before(function() {
    this.jsdom_global = jsdom_global(
      "<div id='mynetwork'></div>",
      { skipWindowCheck: true}
    );
    this.container = document.getElementById('mynetwork');
  });


  after(function() {
    try {
      this.jsdom_global();
    } catch(e) {
      if (e.message() === 'window is undefined') {
        console.warning("'" + e.message() + "' happened again");
      } else {
        throw e;
      }
    }
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


/////////////////////////////////////////////////////
// End Local helper methods for Edge and Node testing
/////////////////////////////////////////////////////


  /**
   * Helper function for clustering
   */
  function clusterTo(network, clusterId, nodeList, allowSingle) {  
    var options = {
      joinCondition: function(node) {
        return nodeList.indexOf(node.id) !== -1;
      },
      clusterNodeProperties: {
        id: clusterId,
        label: clusterId
      }
    }

    if (allowSingle === true) {
      options.clusterNodeProperties.allowSingleNodeCluster = true
    }

    network.cluster(options);
  }


  /**
   * At time of writing, this test detected 22 out of 33 'illegal' loops.
   * The real deterrent is eslint rule 'guard-for-in`.
   */
  it('can deal with added fields in Array.prototype', function (done) {
    Array.prototype.foo = 1;  // Just add anything to the prototype
    Object.prototype.bar = 2; // Let's screw up hashes as well

    // The network should just run without throwing errors
    try {
      var [network, data, numNodes, numEdges] = createSampleNetwork({});

      // Do some stuff to trigger more errors
      clusterTo(network, 'c1', [1,2,3]);
      data.nodes.remove(1);
      network.openCluster('c1');
		  clusterTo(network, 'c1', [4], true);	
		  clusterTo(network, 'c2', ['c1'], true);	
		  clusterTo(network, 'c3', ['c2'], true);	
      data.nodes.remove(4);
      
    } catch(e) {
      delete Array.prototype.foo;  // Remove it again so as not to confuse other tests.
      delete Object.prototype.bar;
      assert(false, "Got exception:\n" + e.stack);
    }

    delete Array.prototype.foo; // Remove it again so as not to confuse other tests.
    delete Object.prototype.bar;
    done();
  });


describe('Node', function () {

  it('has known font options', function () {
    var network = createNetwork({});
    checkFontProperties(network.nodesHandler.defaultOptions.font);
    checkFontProperties(allOptions.nodes.font);
    checkFontProperties(configureOptions.nodes.font, false);
  });


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

  it('has known font options', function () {
    var network = createNetwork({});
    checkFontProperties(network.edgesHandler.defaultOptions.font);
    checkFontProperties(allOptions.edges.font);
    checkFontProperties(configureOptions.edges.font, false);
  });


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

  /**
   * Unit test for fix of #3500
   * Checking to make sure edges that become unconnected due to node removal get reconnected
  */  
  it('has reconnected edges', function () {
    var node1 = {id:1, label:"test1"};
    var node2 = {id:2, label:"test2"};
    var nodes = new vis.DataSet([node1, node2]);
  
    var edge = {id:1, from: 1, to:2};
    var edges = new vis.DataSet([edge]);

    var data = {
        nodes: nodes,
        edges: edges
    };    

    var container = document.getElementById('mynetwork');
    var network = new vis.Network(container, data);

    //remove node causing edge to become disconnected
    nodes.remove(node2.id);
    
    var foundEdge = network.body.edges[edge.id];

    assert.ok(foundEdge===undefined, "edge is still in state cache");

    //add node back reconnecting edge
    nodes.add(node2);
    
    foundEdge = network.body.edges[edge.id];
    
    assert.ok(foundEdge!==undefined, "edge is missing from state cache");
  });
});  // Edge


describe('Clustering', function () {


  it('properly handles options allowSingleNodeCluster', function() {
    var [network, data, numNodes, numEdges] = createSampleNetwork();
		data.edges.update({from: 1, to: 11,});
    numEdges += 1;
    assertNumNodes(network, numNodes);
    assertNumEdges(network, numEdges);

    clusterTo(network, 'c1', [3,4]);  
    numNodes += 1;                                    // A clustering node is now hiding two nodes
    numEdges += 1;                                    // One clustering edges now hiding two edges
    assertNumNodes(network, numNodes, numNodes - 2);
    assertNumEdges(network, numEdges, numEdges - 2);

    // Cluster of single node should fail, because by default allowSingleNodeCluster == false
    clusterTo(network, 'c2', [14]);  
    assertNumNodes(network, numNodes, numNodes - 2);  // Nothing changed
    assertNumEdges(network, numEdges, numEdges - 2);
    assert(network.body.nodes['c2'] === undefined);  // Cluster not created

    // Redo with allowSingleNodeCluster == true
    clusterTo(network, 'c2', [14], true);  
    numNodes += 1;
    numEdges += 1;
    assertNumNodes(network, numNodes, numNodes - 3);
    assertNumEdges(network, numEdges, numEdges - 3);
    assert(network.body.nodes['c2'] !== undefined);  // Cluster created


    // allowSingleNodeCluster: true with two nodes
    // removing one clustered node should retain cluster
    clusterTo(network, 'c3', [11, 12], true);  
    numNodes += 1;                                   // Added cluster
    numEdges += 2;
    assertNumNodes(network, numNodes, 6);
    assertNumEdges(network, numEdges, 5);

    data.nodes.remove(12);
    assert(network.body.nodes['c3'] !== undefined);  // Cluster should still be present
    numNodes -= 1;                                   // removed node 
    numEdges -= 3;                                   // cluster edge C3-13 should be removed
    assertNumNodes(network, numNodes, 6);
    assertNumEdges(network, numEdges, 4);
  });


  it('removes nested clusters with allowSingleNodeCluster === true', function() {
    var [network, data, numNodes, numEdges] = createSampleNetwork();
    // Create a chain of nested clusters, three deep
		clusterTo(network, 'c1', [4], true);	
		clusterTo(network, 'c2', ['c1'], true);	
		clusterTo(network, 'c3', ['c2'], true);	
    numNodes += 3;
    numEdges += 3;
    assertNumNodes(network, numNodes, numNodes - 3);
    assertNumEdges(network, numEdges, numEdges - 3);
    assert(network.body.nodes['c1'] !== undefined);
    assert(network.body.nodes['c2'] !== undefined);
    assert(network.body.nodes['c3'] !== undefined);

    // The whole chain should be removed when the bottom-most node is deleted
    data.nodes.remove(4);
    numNodes -= 4;
    numEdges -= 4;
    assertNumNodes(network, numNodes);
    assertNumEdges(network, numEdges);
    assert(network.body.nodes['c1'] === undefined);
    assert(network.body.nodes['c2'] === undefined);
    assert(network.body.nodes['c3'] === undefined);
  });


  /**
   * Check on fix for #1218
   */
  it('connects a new edge to a clustering node instead of the clustered node', function () {
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    createCluster(network);
    numNodes += 1;                                    // A clustering node is now hiding two nodes
    numEdges += 2;                                    // Two clustering edges now hide two edges
    assertNumNodes(network, numNodes, numNodes - 2);
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
    numEdges += 2;                                    // A new clustering edge is hiding a new edge
    assertNumNodes(network, numNodes, numNodes - 2);  // nodes unchanged
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
    numEdges += 2;                                    // Two clustering edges now hide two edges
    assertNumNodes(network, numNodes, numNodes - 2);
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
    numEdges -= 3;                                    // clustering edge c1-12 and 2 edges of 12 gone
    assertNumNodes(network, numNodes, numNodes - 2);
    assertNumEdges(network, numEdges, numEdges - 1);

    //console.log("Unclustering c1");
    network.openCluster("c1");
    numNodes -= 1;                                    // cluster node removed, one less node
    numEdges -= 1;                                    // clustering edge gone, regular edge visible
    assertNumNodes(network, numNodes, numNodes);      // all are visible again
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
    numEdges += 1;                                    // 1 cluster edge expected
    assertNumNodes(network, numNodes, numNodes - 3);  // 3 clustered nodes
    assertNumEdges(network, numEdges, numEdges - 3);  // 3 edges hidden

    //console.log("removing node 2, which is inside the cluster");
    data.nodes.remove(2);
    numNodes -= 1;                                    // clustered node removed
    numEdges -= 2;                                    // edges removed hidden in cluster
    assertNumNodes(network, numNodes, numNodes - 2);  // view doesn't change
    assertNumEdges(network, numEdges, numEdges - 1);  // view doesn't change

    //console.log("Unclustering c1");
    network.openCluster("c1")
    numNodes -= 1;                                    // cluster node gone
    numEdges -= 1;                                    // cluster edge gone
    assertNumNodes(network, numNodes, numNodes);      // all visible
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


  ///////////////////////////////////////////////////////////////
  // Automatic opening of clusters due to dynamic data change
  ///////////////////////////////////////////////////////////////

  /**
   * Helper function, created nested clusters, three deep
   */
  function createNetwork1() {
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    clusterTo(network, 'c1', [3,4]);  
    numNodes += 1;                                    // new cluster node
    numEdges += 1;                                    // 1 cluster edge expected
    assertNumNodes(network, numNodes, numNodes - 2);  // 2 clustered nodes
    assertNumEdges(network, numEdges, numEdges - 2);  // 2 edges hidden

    clusterTo(network, 'c2', [2,'c1']);  
    numNodes += 1;                                    // new cluster node
    numEdges += 1;                                    // 2 cluster edges expected
    assertNumNodes(network, numNodes, numNodes - 4);  // 4 clustered nodes, including c1
    assertNumEdges(network, numEdges, numEdges - 4);  // 4 edges hidden, including edge for c1

    clusterTo(network, 'c3', [1,'c2']);  
    // Attempt at visualization: parentheses belong to the cluster one level above
    //                   c3
    //             (       -c2    )
    //                 (     -c1 )
    // 14-13-12-11   1  -2 (-3-4)
    numNodes += 1;                                    // new cluster node
    numEdges += 0;                                    // No new cluster edge expected
    assertNumNodes(network, numNodes, numNodes - 6);  // 6 clustered nodes, including c1 and c2
    assertNumEdges(network, numEdges, numEdges - 5);  // 5 edges hidden, including edges for c1 and c2

    return [network, data, numNodes, numEdges];
  }


  it('opens clusters automatically when nodes deleted', function () {
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    // Simple case: cluster of two nodes, delete one node
    clusterTo(network, 'c1', [3,4]);  
    numNodes += 1;                                    // new cluster node
    numEdges += 1;                                    // 1 cluster edge expected
    assertNumNodes(network, numNodes, numNodes - 2);  // 2 clustered nodes
    assertNumEdges(network, numEdges, numEdges - 2);  // 2 edges hidden

    data.nodes.remove(4);
    numNodes -= 2;                                    // deleting clustered node also removes cluster node
    numEdges -= 2;                                    // cluster edge should also be removed
    assertNumNodes(network, numNodes, numNodes);
    assertNumEdges(network, numEdges, numEdges);


    // Extended case: nested nodes, three deep
    [network, data, numNodes, numEdges] = createNetwork1();

    data.nodes.remove(4);
    //                   c3
    //             (       -c2 )
    // 14-13-12-11   1  (-2 -3)
    numNodes -= 2;                                    // node removed, c1 also gone
    numEdges -= 2;
    assertNumNodes(network, numNodes, numNodes - 4);
    assertNumEdges(network, numEdges, numEdges - 3);

    data.nodes.remove(1);
    //               c2
    // 14-13-12-11 (2 -3)
    numNodes -= 2;                                    // node removed, c3 also gone
    numEdges -= 2;
    assertNumNodes(network, numNodes, numNodes - 2);
    assertNumEdges(network, numEdges, numEdges - 1);

    data.nodes.remove(2);
    // 14-13-12-11 3
    numNodes -= 2;                                    // node removed, c2 also gone
    numEdges -= 1;
    assertNumNodes(network, numNodes);                // All visible again
    assertNumEdges(network, numEdges);

    // Same as previous step, but remove all the given nodes in one go
    // The result should be the same.
    [network, data, numNodes, numEdges] = createNetwork1();  // nested nodes, three deep
    data.nodes.remove([1,2,4]);
    // 14-13-12-11 3
    assertNumNodes(network, 5);
    assertNumEdges(network, 3);
  });


  ///////////////////////////////////////////////////////////////
  // Opening of clusters at various clustering depths
  ///////////////////////////////////////////////////////////////

  /**
   * Check correct opening of a single cluster.
   * This is the 'simple' case.
   */
  it('properly opens 1-level clusters', function () {
    var [network, data, numNodes, numEdges] = createSampleNetwork();

    // Pedantic: make a cluster of everything
    clusterTo(network, 'c1', [1,2,3,4,11, 12, 13, 14]);
    // c1(14-13-12-11 1-2-3-4)
    numNodes += 1;
    assertNumNodes(network, numNodes, 1); // Just the clustering node visible
    assertNumEdges(network, numEdges, 0); // No extra edges!

    network.clustering.openCluster('c1', {});
    numNodes -= 1;
    assertNumNodes(network, numNodes, numNodes); // Expecting same as original
    assertNumEdges(network, numEdges, numEdges);

    // One external connection
    [network, data, numNodes, numEdges] = createSampleNetwork();
    // 14-13-12-11 1-2-3-4
    clusterTo(network, 'c1', [3,4]);  
    network.clustering.openCluster('c1', {});
    assertNumNodes(network, numNodes, numNodes); // Expecting same as original
    assertNumEdges(network, numEdges, numEdges);

    // Two external connections
    clusterTo(network, 'c1', [2,3]);  
    network.clustering.openCluster('c1', {});
    assertNumNodes(network, numNodes, numNodes); // Expecting same as original
    assertNumEdges(network, numEdges, numEdges);

    // One external connection to cluster
    clusterTo(network, 'c1', [1,2]);  
    clusterTo(network, 'c2', [3,4]);  
    // 14-13-12-11 c1(1-2-)-c2(-3-4)
    network.clustering.openCluster('c1', {});
    // 14-13-12-11 1-2-c2(-3-4)
    numNodes += 1;
    numEdges += 1;
    assertNumNodes(network, numNodes, numNodes - 2);
    assertNumEdges(network, numEdges, numEdges - 2);

    // two external connections to clusters
    [network, data, numNodes, numEdges] = createSampleNetwork();
    data.edges.update({
      from: 1,
      to: 11,
    });
    numEdges += 1;
    assertNumNodes(network, numNodes, numNodes);
    assertNumEdges(network, numEdges, numEdges);

    clusterTo(network, 'c1', [1,2]);  
    // 14-13-12-11-c1(-1-2-)-3-4
    numNodes += 1;
    numEdges += 2;
    clusterTo(network, 'c2', [3,4]);  
    // 14-13-12-11-c1(-1-2-)-c2(-3-4)
    // NOTE: clustering edges are hidden by clustering here!
    numNodes += 1;
    numEdges += 1;
    clusterTo(network, 'c3', [11,12]);  
    // 14-13-c3(-12-11-)-c1(-1-2-)-c2(-3-4)
    numNodes += 1;
    numEdges += 2;
    assertNumNodes(network, numNodes, numNodes - 6);
    assertNumEdges(network, numEdges, numEdges - 8); // 6 regular edges hidden; also 2 clustering!!!!!

    network.clustering.openCluster('c1', {});
    numNodes -= 1;
    numEdges -= 2;
    // 14-13-c3(-12-11-)-1-2-c2(-3-4)
    assertNumNodes(network, numNodes, numNodes - 4);
    assertNumEdges(network, numEdges, numEdges - 5);
  });


  /**
   * Check correct opening of nested clusters.
   * The test uses clustering three levels deep and opens the middle one.
   */
  it('properly opens clustered clusters', function () {
    var [network, data, numNodes, numEdges] = createSampleNetwork();
		data.edges.update({from: 1, to: 11,});
    numEdges += 1;
		clusterTo(network, 'c1', [3,4]);	
		clusterTo(network, 'c2', [2,'c1']);	
		clusterTo(network, 'c3', [1,'c2']);
    // Attempt at visualization: parentheses belong to the cluster one level above
    //                  -c3
    //             (       -c2    )
    //                 (     -c1 )
    // 14-13-12-11  -1  -2 (-3-4)
    numNodes += 3;
    numEdges += 3;
    //console.log("numNodes: " + numNodes + "; numEdges: " + numEdges);
    assertNumNodes(network, numNodes, numNodes - 6);
    assertNumEdges(network, numEdges, numEdges - 6);

    // Open the middle cluster
    network.clustering.openCluster('c2', {});
    //                  -c3
    //             (         -c1 )
    // 14-13-12-11  -1  -2 (-3-4)
    numNodes -= 1;
    numEdges -= 1;
    assertNumNodes(network, numNodes, numNodes - 5);
    assertNumEdges(network, numEdges, numEdges - 5);

    //
    // Same, with one external connection to cluster
    //
    var [network, data, numNodes, numEdges] = createSampleNetwork();
		data.edges.update({from: 1, to: 11,});
		data.edges.update({from: 2, to: 12,});
    numEdges += 2;
    // 14-13-12-11-1-2-3-4
    //        |------|
    assertNumNodes(network, numNodes);
    assertNumEdges(network, numEdges);


		clusterTo(network, 'c0', [11,12]);	
		clusterTo(network, 'c1', [3,4]);	
		clusterTo(network, 'c2', [2,'c1']);	
		clusterTo(network, 'c3', [1,'c2']);
    //                 +----------------+
    //                 |     c3         |
    //                 |   +----------+ |
    //                 |   |   c2     | |
    //       +-------+ |   |   +----+ | |
    //       |   c0  | |   |   | c1 | | |
    // 14-13-|-12-11-|-|-1-|-2-|-3-4| | |
    //       |  |    | |   | | +----+ | |
    //       +-------+ |   | |        | |
    //          |      |   +----------+ |
    //          |      |     |          |
    //          |      +----------------+
    //          |------------|
    //              (I)
    numNodes += 4;
    numEdges = 15;
    assertNumNodes(network, numNodes, 4);
    assertNumEdges(network, numEdges, 3);  // (I) link 2-12 is combined into cluster edge for 11-1

    // Open the middle cluster
    network.clustering.openCluster('c2', {});
    //                 +--------------+
    //                 |    c3        |
    //                 |              |
    //       +-------+ |      +----+  |
    //       |   c0  | |      | c1 |  |
    // 14-13-|-12-11-|-|-1--2-|-3-4|  |
    //       |  |    | |    | +----+  |
    //       +-------+ |    |         |
    //          |      |    |         |
    //          |      +--------------+
    //          |-----------|
    //              (I)
    numNodes -= 1;
    numEdges -= 2;
    assertNumNodes(network, numNodes, 4);  // visibility doesn't change, cluster opened within cluster
    assertNumEdges(network, numEdges, 3);  // (I)

    // Open the top cluster
    network.clustering.openCluster('c3', {});
    //                             
    //       +-------+     +----+
    //       |   c0  |     | c1 |
    // 14-13-|-12-11-|-1-2-|-3-4|
    //       |  |    |   | +----+
    //       +-------+   |       
    //          |        |       
    //          |--------|
    //              (II)
    numNodes -= 1;
    numEdges  = 12;
    assertNumNodes(network, numNodes, 6);  // visibility doesn't change, cluster opened within cluster
    assertNumEdges(network, numEdges, 6);  // (II) link 2-12 visible again
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


  it('WorlCup2014', function (done) {
    // This is a huge example (which is why it's tested here!), so it takes a long time to load.
    this.timeout(15000);

    var network = loadExample('./examples/network/datasources/WorldCup2014.js', true);

    // Count in following also contains the helper nodes for dynamic edges
    assert.equal(Object.keys(network.body.nodes).length, 9964);
    assert.equal(Object.keys(network.body.edges).length, 9228);
    done();
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
