/**
 * Created by Alex on 24-Feb-15.
 */

var util = require("../../util");
import Cluster from './components/nodes/Cluster'

class ClusterEngine {
  constructor(body) {
    this.body = body;
    this.clusteredNodes = {};

    this.options = {};
    this.defaultOptions = {};
    util.extend(this.options, this.defaultOptions);
  }

  setOptions(options) {
    if (options !== undefined) {

    }
  }

  /**
  *
  * @param hubsize
  * @param options
  */
  clusterByConnectionCount(hubsize, options) {
    if (hubsize === undefined) {
      hubsize = this._getHubSize();
    }
    else if (tyepof(hubsize) === "object") {
      options = this._checkOptions(hubsize);
      hubsize = this._getHubSize();
    }

    var nodesToCluster = [];
    for (var i = 0; i < this.body.nodeIndices.length; i++) {
      var node = this.body.nodes[this.body.nodeIndices[i]];
      if (node.edges.length >= hubsize) {
        nodesToCluster.push(node.id);
      }
    }

    for (var i = 0; i < nodesToCluster.length; i++) {
      var node = this.body.nodes[nodesToCluster[i]];
      this.clusterByConnection(node,options,{},{},false);
    }
    this.body.emitter.emit('_dataChanged');
  }


  /**
  * loop over all nodes, check if they adhere to the condition and cluster if needed.
  * @param options
  * @param refreshData
  */
  clusterByNodeData(options = {}, refreshData = true) {
    if (options.joinCondition === undefined) {throw new Error("Cannot call clusterByNodeData without a joinCondition function in the options.");}

    // check if the options object is fine, append if needed
    options = this._checkOptions(options);

    var childNodesObj = {};
    var childEdgesObj = {}

    // collect the nodes that will be in the cluster
    for (var i = 0; i < this.body.nodeIndices.length; i++) {
      var nodeId = this.body.nodeIndices[i];
      var clonedOptions = this._cloneOptions(nodeId);
      if (options.joinCondition(clonedOptions) === true) {
        childNodesObj[nodeId] = this.body.nodes[nodeId];
      }
    }

    this._cluster(childNodesObj, childEdgesObj, options, refreshData);
  }


  /**
  * Cluster all nodes in the network that have only 1 edge
  * @param options
  * @param refreshData
  */
  clusterOutliers(options, refreshData = true) {
    options = this._checkOptions(options);
    var clusters = [];

    // collect the nodes that will be in the cluster
    for (var i = 0; i < this.body.nodeIndices.length; i++) {
      var childNodesObj = {};
      var childEdgesObj = {};
      var nodeId = this.body.nodeIndices[i];
      if (this.body.nodes[nodeId].edges.length === 1) {
        var edge = this.body.nodes[nodeId].edges[0];
        var childNodeId = this._getConnectedId(edge, nodeId);
        if (childNodeId != nodeId) {
          if (options.joinCondition === undefined) {
            childNodesObj[nodeId] = this.body.nodes[nodeId];
            childNodesObj[childNodeId] = this.body.nodes[childNodeId];
          }
          else {
            var clonedOptions = this._cloneOptions(nodeId);
            if (options.joinCondition(clonedOptions) === true) {
              childNodesObj[nodeId] = this.body.nodes[nodeId];
            }
            clonedOptions = this._cloneOptions(childNodeId);
            if (options.joinCondition(clonedOptions) === true) {
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
            }
          }
          clusters.push({nodes:childNodesObj, edges:childEdgesObj})
        }
      }
    }

    for (var i = 0; i < clusters.length; i++) {
      this._cluster(clusters[i].nodes, clusters[i].edges, options, false)
    }

    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }

  /**
  *
  * @param nodeId
  * @param options
  * @param refreshData
  */
  clusterByConnection(nodeId, options, refreshData = true) {
    // kill conditions
    if (nodeId === undefined)             {throw new Error("No nodeId supplied to clusterByConnection!");}
    if (this.body.nodes[nodeId] === undefined) {throw new Error("The nodeId given to clusterByConnection does not exist!");}

    var node = this.body.nodes[nodeId];
    options = this._checkOptions(options, node);
    if (options.clusterNodeProperties.x === undefined) {options.clusterNodeProperties.x = node.x;}
    if (options.clusterNodeProperties.y === undefined) {options.clusterNodeProperties.y = node.y;}
    if (options.clusterNodeProperties.fixed === undefined) {
      options.clusterNodeProperties.fixed = {};
      options.clusterNodeProperties.fixed.x = node.options.fixed.x;
      options.clusterNodeProperties.fixed.y = node.options.fixed.y;
    }


    var childNodesObj = {};
    var childEdgesObj = {}
    var parentNodeId = node.id;
    var parentClonedOptions = this._cloneOptions(parentNodeId);
    childNodesObj[parentNodeId] = node;

    // collect the nodes that will be in the cluster
    for (var i = 0; i < node.edges.length; i++) {
      var edge = node.edges[i];
      var childNodeId = this._getConnectedId(edge, parentNodeId);

      if (childNodeId !== parentNodeId) {
        if (options.joinCondition === undefined) {
          childEdgesObj[edge.id] = edge;
          childNodesObj[childNodeId] = this.body.nodes[childNodeId];
        }
        else {
          // clone the options and insert some additional parameters that could be interesting.
          var childClonedOptions = this._cloneOptions(childNodeId);
          if (options.joinCondition(parentClonedOptions, childClonedOptions) === true) {
            childEdgesObj[edge.id] = edge;
            childNodesObj[childNodeId] = this.body.nodes[childNodeId];
          }
        }
      }
      else {
        childEdgesObj[edge.id] = edge;
      }
    }

    this._cluster(childNodesObj, childEdgesObj, options, refreshData);
  }


  /**
  * This returns a clone of the options or options of the edge or node to be used for construction of new edges or check functions for new nodes.
  * @param objId
  * @param type
  * @returns {{}}
  * @private
  */
  _cloneOptions(objId, type) {
    var clonedOptions = {};
    if (type === undefined || type === 'node') {
      util.deepExtend(clonedOptions, this.body.nodes[objId].options, true);
      util.deepExtend(clonedOptions, this.body.nodes[objId].properties, true);
      clonedOptions.amountOfConnections = this.body.nodes[objId].edges.length;
    }
    else {
      util.deepExtend(clonedOptions, this.body.edges[objId].properties, true);
    }
    return clonedOptions;
  }


  /**
  * This function creates the edges that will be attached to the cluster.
  *
  * @param childNodesObj
  * @param childEdgesObj
  * @param newEdges
  * @param options
  * @private
  */
  _createClusterEdges (childNodesObj, childEdgesObj, newEdges, options) {
    var edge, childNodeId, childNode;

    var childKeys = Object.keys(childNodesObj);
    for (var i = 0; i < childKeys.length; i++) {
      childNodeId = childKeys[i];
      childNode = childNodesObj[childNodeId];

      // mark all edges for removal from global and construct new edges from the cluster to others
      for (var j = 0; j < childNode.edges.length; j++) {
        edge = childNode.edges[j];
        childEdgesObj[edge.id] = edge;

        var otherNodeId = edge.toId;
        var otherOnTo = true;
        if (edge.toId != childNodeId) {
          otherNodeId = edge.toId;
          otherOnTo = true;
        }
        else if (edge.fromId != childNodeId) {
          otherNodeId = edge.fromId;
          otherOnTo = false;
        }

        if (childNodesObj[otherNodeId] === undefined) {
          var clonedOptions = this._cloneOptions(edge.id, 'edge');
          util.deepExtend(clonedOptions, options.clusterEdgeProperties);
          if (otherOnTo === true) {
            clonedOptions.from = options.clusterNodeProperties.id;
            clonedOptions.to = otherNodeId;
          }
          else {
            clonedOptions.from = otherNodeId;
            clonedOptions.to = options.clusterNodeProperties.id;
          }
          clonedOptions.id = 'clusterEdge:' + util.randomUUID();
          newEdges.push(this.body.functions.createEdge(clonedOptions))
        }
      }
    }
  }


  /**
  * This function checks the options that can be supplied to the different cluster functions
  * for certain fields and inserts defaults if needed
  * @param options
  * @returns {*}
  * @private
  */
  _checkOptions(options = {}) {
    if (options.clusterEdgeProperties === undefined)    {options.clusterEdgeProperties = {};}
    if (options.clusterNodeProperties === undefined)    {options.clusterNodeProperties = {};}

    return options;
  }

  /**
  *
  * @param {Object}    childNodesObj         | object with node objects, id as keys, same as childNodes except it also contains a source node
  * @param {Object}    childEdgesObj         | object with edge objects, id as keys
  * @param {Array}     options               | object with {clusterNodeProperties, clusterEdgeProperties, processProperties}
  * @param {Boolean}   refreshData | when true, do not wrap up
  * @private
  */
  _cluster(childNodesObj, childEdgesObj, options, refreshData = true) {
    // kill condition: no children so cant cluster
    if (Object.keys(childNodesObj).length === 0) {return;}

    // check if we have an unique id;
    if (options.clusterNodeProperties.id === undefined) {options.clusterNodeProperties.id = 'cluster:' + util.randomUUID();}
    var clusterId = options.clusterNodeProperties.id;

    // create the new edges that will connect to the cluster
    var newEdges = [];
    this._createClusterEdges(childNodesObj, childEdgesObj, newEdges, options);

    // construct the clusterNodeProperties
    var clusterNodeProperties = options.clusterNodeProperties;
    if (options.processProperties !== undefined) {
      // get the childNode options
      var childNodesOptions = [];
      for (var nodeId in childNodesObj) {
        var clonedOptions = this._cloneOptions(nodeId);
        childNodesOptions.push(clonedOptions);
      }

      // get clusterproperties based on childNodes
      var childEdgesOptions = [];
      for (var edgeId in childEdgesObj) {
        var clonedOptions = this._cloneOptions(edgeId, 'edge');
        childEdgesOptions.push(clonedOptions);
      }

      clusterNodeProperties = options.processProperties(clusterNodeProperties, childNodesOptions, childEdgesOptions);
      if (!clusterNodeProperties) {
        throw new Error("The processClusterProperties function does not return properties!");
      }
    }
    if (clusterNodeProperties.label === undefined) {
      clusterNodeProperties.label = 'cluster';
    }


    // give the clusterNode a postion if it does not have one.
    var pos = undefined;
    if (clusterNodeProperties.x === undefined) {
      pos = this._getClusterPosition(childNodesObj);
      clusterNodeProperties.x = pos.x;
      clusterNodeProperties.allowedToMoveX = true;
    }
    if (clusterNodeProperties.x === undefined) {
      if (pos === undefined) {
        pos = this._getClusterPosition(childNodesObj);
      }
      clusterNodeProperties.y = pos.y;
      clusterNodeProperties.allowedToMoveY = true;
    }


    // force the ID to remain the same
    clusterNodeProperties.id = clusterId;


    // create the clusterNode
    var clusterNode = this.body.functions.createNode(clusterNodeProperties, Cluster);
    clusterNode.isCluster = true;
    clusterNode.containedNodes = childNodesObj;
    clusterNode.containedEdges = childEdgesObj;


    // disable the childEdges
    for (var edgeId in childEdgesObj) {
      if (childEdgesObj.hasOwnProperty(edgeId)) {
        if (this.body.edges[edgeId] !== undefined) {
          let edge = this.body.edges[edgeId];
          edge.togglePhysics(false);
          edge.options.hidden = true;
        }
      }
    }


    // disable the childNodes
    for (var nodeId in childNodesObj) {
      if (childNodesObj.hasOwnProperty(nodeId)) {
        this.clusteredNodes[nodeId] = {clusterId:clusterNodeProperties.id, node: this.body.nodes[nodeId]};
        this.body.nodes[nodeId].togglePhysics(false);
        this.body.nodes[nodeId].options.hidden = true;
      }
    }


    // finally put the cluster node into global
    this.body.nodes[clusterNodeProperties.id] = clusterNode;


    // push new edges to global
    for (var i = 0; i < newEdges.length; i++) {
      this.body.edges[newEdges[i].id] = newEdges[i];
      this.body.edges[newEdges[i].id].connect();
    }

    // set ID to undefined so no duplicates arise
    clusterNodeProperties.id = undefined;


    // wrap up
    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }


  /**
  * Check if a node is a cluster.
  * @param nodeId
  * @returns {*}
  */
  isCluster(nodeId) {
    if (this.body.nodes[nodeId] !== undefined) {
      return this.body.nodes[nodeId].isCluster === true;
    }
    else {
      console.log("Node does not exist.")
      return false;
    }
  }

  /**
  * get the position of the cluster node based on what's inside
  * @param {object} childNodesObj    | object with node objects, id as keys
  * @returns {{x: number, y: number}}
  * @private
  */
  _getClusterPosition(childNodesObj) {
    var childKeys = Object.keys(childNodesObj);
    var minX = childNodesObj[childKeys[0]].x;
    var maxX = childNodesObj[childKeys[0]].x;
    var minY = childNodesObj[childKeys[0]].y;
    var maxY = childNodesObj[childKeys[0]].y;
    var node;
    for (var i = 0; i < childKeys.lenght; i++) {
      node = childNodesObj[childKeys[0]];
      minX = node.x < minX ? node.x : minX;
      maxX = node.x > maxX ? node.x : maxX;
      minY = node.y < minY ? node.y : minY;
      maxY = node.y > maxY ? node.y : maxY;
    }
    return {x: 0.5*(minX + maxX), y: 0.5*(minY + maxY)};
  }


  /**
  * Open a cluster by calling this function.
  * @param {String}  clusterNodeId               | the ID of the cluster node
  * @param {Boolean} refreshData | wrap up afterwards if not true
  */
  openCluster(clusterNodeId, refreshData = true) {
    // kill conditions
    if (clusterNodeId === undefined)             {throw new Error("No clusterNodeId supplied to openCluster.");}
    if (this.body.nodes[clusterNodeId] === undefined) {throw new Error("The clusterNodeId supplied to openCluster does not exist.");}
    if (this.body.nodes[clusterNodeId].containedNodes === undefined) {console.log("The node:" + clusterNodeId + " is not a cluster."); return};

    var clusterNode = this.body.nodes[clusterNodeId];
    var containedNodes = clusterNode.containedNodes;
    var containedEdges = clusterNode.containedEdges;

    // release nodes
    for (var nodeId in containedNodes) {
      if (containedNodes.hasOwnProperty(nodeId)) {
        let containedNode = this.body.nodes[nodeId];
        containedNode = containedNodes[nodeId];
        // inherit position
        containedNode.x = clusterNode.x;
        containedNode.y = clusterNode.y;

        // inherit speed
        containedNode.vx = clusterNode.vx;
        containedNode.vy = clusterNode.vy;

        containedNode.options.hidden = false;
        containedNode.togglePhysics(true);

        delete this.clusteredNodes[nodeId];
      }
    }

    // release edges
    for (var edgeId in containedEdges) {
      if (containedEdges.hasOwnProperty(edgeId)) {
        var edge = this.body.edges[edgeId];
        edge.options.hidden = false;
        edge.togglePhysics(true);
      }
    }

    // remove all temporary edges
    for (var i = 0; i < clusterNode.edges.length; i++) {
      var edgeId = clusterNode.edges[i].id;
      var viaId = this.body.edges[edgeId].via.id;
      if (viaId) {
        this.body.edges[edgeId].via = undefined;
        delete this.body.nodes[viaId];
      }
      // this removes the edge from node.edges, which is why edgeIds is formed
      this.body.edges[edgeId].disconnect();
      delete this.body.edges[edgeId];
    }

    // remove clusterNode
    delete this.body.nodes[clusterNodeId];

    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }



  /**
  * Connect an edge that was previously contained from cluster A to cluster B if the node that it was originally connected to
  * is currently residing in cluster B
  * @param edge
  * @param nodeId
  * @param from
  * @private
  */
  _connectEdge(edge, nodeId, from) {
    var clusterStack = this._getClusterStack(nodeId);
    if (from === true) {
      edge.from = clusterStack[clusterStack.length - 1];
      edge.fromId = clusterStack[clusterStack.length - 1].id;
      clusterStack.pop()
      edge.fromArray = clusterStack;
    }
    else {
      edge.to = clusterStack[clusterStack.length - 1];
      edge.toId = clusterStack[clusterStack.length - 1].id;
      clusterStack.pop();
      edge.toArray = clusterStack;
    }
    edge.connect();
  }

  /**
  * Get the stack clusterId's that a certain node resides in. cluster A -> cluster B -> cluster C -> node
  * @param nodeId
  * @returns {Array}
  * @private
  */
  _getClusterStack(nodeId) {
    var stack = [];
    var max = 100;
    var counter = 0;

    while (this.clusteredNodes[nodeId] !== undefined && counter < max) {
      stack.push(this.clusteredNodes[nodeId].node);
      nodeId = this.clusteredNodes[nodeId].clusterId;
      counter++;
    }
    stack.push(this.body.nodes[nodeId]);
    return stack;
  }


  /**
  * Get the Id the node is connected to
  * @param edge
  * @param nodeId
  * @returns {*}
  * @private
  */
  _getConnectedId(edge, nodeId) {
    if (edge.toId != nodeId) {
      return edge.toId;
    }
    else if (edge.fromId != nodeId) {
      return edge.fromId;
    }
    else {
      return edge.fromId;
    }
  }

  /**
  * We determine how many connections denote an important hub.
  * We take the mean + 2*std as the important hub size. (Assuming a normal distribution of data, ~2.2%)
  *
  * @private
  */
  _getHubSize() {
    var average = 0;
    var averageSquared = 0;
    var hubCounter = 0;
    var largestHub = 0;

    for (var i = 0; i < this.body.nodeIndices.length; i++) {
      var node = this.body.nodes[this.body.nodeIndices[i]];
      if (node.edges.length > largestHub) {
        largestHub = node.edges.length;
      }
      average += node.edges.length;
      averageSquared += Math.pow(node.edges.length,2);
      hubCounter += 1;
    }
    average = average / hubCounter;
    averageSquared = averageSquared / hubCounter;

    var variance = averageSquared - Math.pow(average,2);
    var standardDeviation = Math.sqrt(variance);

    var hubThreshold = Math.floor(average + 2*standardDeviation);

    // always have at least one to cluster
    if (hubThreshold > largestHub) {
      hubThreshold = largestHub;
    }

    return hubThreshold;
  };

}


export default ClusterEngine;
