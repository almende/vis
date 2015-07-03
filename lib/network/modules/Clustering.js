let util = require("../../util");
import Cluster from './components/nodes/Cluster'

class ClusterEngine {
  constructor(body) {
    this.body = body;
    this.clusteredNodes = {};

    this.options = {};
    this.defaultOptions = {};
    util.extend(this.options, this.defaultOptions);

    this.body.emitter.on('_resetData', () => {this.clusteredNodes = {};})
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
  clusterByHubsize(hubsize, options) {
    if (hubsize === undefined) {
      hubsize = this._getHubSize();
    }
    else if (typeof(hubsize) === "object") {
      options = this._checkOptions(hubsize);
      hubsize = this._getHubSize();
    }

    let nodesToCluster = [];
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let node = this.body.nodes[this.body.nodeIndices[i]];
      if (node.edges.length >= hubsize) {
        nodesToCluster.push(node.id);
      }
    }

    for (let i = 0; i < nodesToCluster.length; i++) {
      this.clusterByConnection(nodesToCluster[i],options,false);
    }
    this.body.emitter.emit('_dataChanged');
  }


  /**
  * loop over all nodes, check if they adhere to the condition and cluster if needed.
  * @param options
  * @param refreshData
  */
  cluster(options = {}, refreshData = true) {
    if (options.joinCondition === undefined) {throw new Error("Cannot call clusterByNodeData without a joinCondition function in the options.");}

    // check if the options object is fine, append if needed
    options = this._checkOptions(options);

    let childNodesObj = {};
    let childEdgesObj = {};

    // collect the nodes that will be in the cluster
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let nodeId = this.body.nodeIndices[i];
      let node = this.body.nodes[nodeId];
      let clonedOptions = this._cloneOptions(node);
      if (options.joinCondition(clonedOptions) === true) {
        childNodesObj[nodeId] = this.body.nodes[nodeId];

        // collect the nodes that will be in the cluster
        for (let i = 0; i < node.edges.length; i++) {
          let edge = node.edges[i];
          childEdgesObj[edge.id] = edge;
        }
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
    let clusters = [];

    // collect the nodes that will be in the cluster
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let childNodesObj = {};
      let childEdgesObj = {};
      let nodeId = this.body.nodeIndices[i];
      let visibleEdges = 0;
      let edge;
      for (let j = 0; j < this.body.nodes[nodeId].edges.length; j++) {
        if (this.body.nodes[nodeId].edges[j].options.hidden === false) {
          visibleEdges++;
          edge = this.body.nodes[nodeId].edges[j];
        }
      }

      if (visibleEdges === 1) {
        // this is an outlier
        let childNodeId = this._getConnectedId(edge, nodeId);
        if (childNodeId !== nodeId) {
          if (options.joinCondition === undefined) {
            if (this._checkIfUsed(clusters,nodeId,edge.id) === false && this._checkIfUsed(clusters,childNodeId,edge.id) === false) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[nodeId] = this.body.nodes[nodeId];
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
            }
          }
          else {
            let clonedOptions = this._cloneOptions(this.body.nodes[nodeId]);
            if (options.joinCondition(clonedOptions) === true && this._checkIfUsed(clusters,nodeId,edge.id) === false) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[nodeId] = this.body.nodes[nodeId];
            }
            clonedOptions = this._cloneOptions(this.body.nodes[childNodeId]);
            if (options.joinCondition(clonedOptions) === true && this._checkIfUsed(clusters,nodeId,edge.id) === false) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
            }
          }

          if (Object.keys(childNodesObj).length > 0 && Object.keys(childEdgesObj).length > 0) {
            clusters.push({nodes: childNodesObj, edges: childEdgesObj})
          }
        }
      }
    }

    for (let i = 0; i < clusters.length; i++) {
      this._cluster(clusters[i].nodes, clusters[i].edges, options, false)
    }

    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }


  _checkIfUsed(clusters, nodeId, edgeId) {
    for (let i = 0; i < clusters.length; i++) {
      let cluster = clusters[i];
      if (cluster.nodes[nodeId] !== undefined || cluster.edges[edgeId] !== undefined) {
        return true;
      }
    }
    return false;
  }

  /**
  * suck all connected nodes of a node into the node.
  * @param nodeId
  * @param options
  * @param refreshData
  */
  clusterByConnection(nodeId, options, refreshData = true) {
    // kill conditions
    if (nodeId === undefined)             {throw new Error("No nodeId supplied to clusterByConnection!");}
    if (this.body.nodes[nodeId] === undefined) {throw new Error("The nodeId given to clusterByConnection does not exist!");}

    let node = this.body.nodes[nodeId];
    options = this._checkOptions(options, node);
    if (options.clusterNodeProperties.x === undefined) {options.clusterNodeProperties.x = node.x;}
    if (options.clusterNodeProperties.y === undefined) {options.clusterNodeProperties.y = node.y;}
    if (options.clusterNodeProperties.fixed === undefined) {
      options.clusterNodeProperties.fixed = {};
      options.clusterNodeProperties.fixed.x = node.options.fixed.x;
      options.clusterNodeProperties.fixed.y = node.options.fixed.y;
    }


    let childNodesObj = {};
    let childEdgesObj = {};
    let parentNodeId = node.id;
    let parentClonedOptions = this._cloneOptions(node);
    childNodesObj[parentNodeId] = node;

    // collect the nodes that will be in the cluster
    for (let i = 0; i < node.edges.length; i++) {
      let edge = node.edges[i];
      let childNodeId = this._getConnectedId(edge, parentNodeId);

      if (childNodeId !== parentNodeId) {
        if (options.joinCondition === undefined) {
          childEdgesObj[edge.id] = edge;
          childNodesObj[childNodeId] = this.body.nodes[childNodeId];
        }
        else {
          // clone the options and insert some additional parameters that could be interesting.
          let childClonedOptions = this._cloneOptions(this.body.nodes[childNodeId]);
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
  _cloneOptions(item, type) {
    let clonedOptions = {};
    if (type === undefined || type === 'node') {
      util.deepExtend(clonedOptions, item.options, true);
      clonedOptions.x = item.x;
      clonedOptions.y = item.y;
      clonedOptions.amountOfConnections = item.edges.length;
    }
    else {
      util.deepExtend(clonedOptions, item.options, true);
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
  _createClusterEdges (childNodesObj, childEdgesObj, newEdges, clusterNodeProperties, clusterEdgeProperties) {
    let edge, childNodeId, childNode, toId, fromId, otherNodeId;

    let childKeys = Object.keys(childNodesObj);
    for (let i = 0; i < childKeys.length; i++) {
      childNodeId = childKeys[i];
      childNode = childNodesObj[childNodeId];

      // construct new edges from the cluster to others
      for (let j = 0; j < childNode.edges.length; j++) {
        edge = childNode.edges[j];
        childEdgesObj[edge.id] = edge;

        // childNodeId position will be replaced by the cluster.
        if (edge.toId == childNodeId) { // this is a double equals because ints and strings can be interchanged here.
          toId = clusterNodeProperties.id;
          fromId = edge.fromId;
          otherNodeId = fromId;
        }
        else {
          toId = edge.toId;
          fromId = clusterNodeProperties.id;
          otherNodeId = toId;
        }

        // if the node connected to the cluster is also in the cluster we do not need a new edge.
        if (childNodesObj[otherNodeId] === undefined) {
          let clonedOptions = this._cloneOptions(edge, 'edge');
          util.deepExtend(clonedOptions, clusterEdgeProperties);
          clonedOptions.from = fromId;
          clonedOptions.to = toId;
          clonedOptions.id = 'clusterEdge:' + util.randomUUID();
          newEdges.push(this.body.functions.createEdge(clonedOptions));
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

    let clusterNodeProperties = util.deepExtend({},options.clusterNodeProperties);

    // construct the clusterNodeProperties
    if (options.processProperties !== undefined) {
      // get the childNode options
      let childNodesOptions = [];
      for (let nodeId in childNodesObj) {
        let clonedOptions = this._cloneOptions(childNodesObj[nodeId]);
        childNodesOptions.push(clonedOptions);
      }

      // get clusterproperties based on childNodes
      let childEdgesOptions = [];
      for (let edgeId in childEdgesObj) {
        // these cluster edges will be removed on creation of the cluster.
        if (edgeId.substr(0,12) !== "clusterEdge:") {
          let clonedOptions = this._cloneOptions(childEdgesObj[edgeId], 'edge');
          childEdgesOptions.push(clonedOptions);
        }
      }

      clusterNodeProperties = options.processProperties(clusterNodeProperties, childNodesOptions, childEdgesOptions);
      if (!clusterNodeProperties) {
        throw new Error("The processProperties function does not return properties!");
      }
    }

    // check if we have an unique id;
    if (clusterNodeProperties.id === undefined) {clusterNodeProperties.id = 'cluster:' + util.randomUUID();}
    let clusterId = clusterNodeProperties.id;

    if (clusterNodeProperties.label === undefined) {
      clusterNodeProperties.label = 'cluster';
    }


    // give the clusterNode a postion if it does not have one.
    let pos = undefined;
    if (clusterNodeProperties.x === undefined) {
      pos = this._getClusterPosition(childNodesObj);
      clusterNodeProperties.x = pos.x;
    }
    if (clusterNodeProperties.y === undefined) {
      if (pos === undefined) {
        pos = this._getClusterPosition(childNodesObj);
      }
      clusterNodeProperties.y = pos.y;
    }

    // force the ID to remain the same
    clusterNodeProperties.id = clusterId;

    // create the clusterNode
    let clusterNode = this.body.functions.createNode(clusterNodeProperties, Cluster);
    clusterNode.isCluster = true;
    clusterNode.containedNodes = childNodesObj;
    clusterNode.containedEdges = childEdgesObj;
    // cache a copy from the cluster edge properties if we have to reconnect others later on
    clusterNode.clusterEdgeProperties = options.clusterEdgeProperties;

    // finally put the cluster node into global
    this.body.nodes[clusterNodeProperties.id] = clusterNode;

    // create the new edges that will connect to the cluster
    let newEdges = [];
    this._createClusterEdges(childNodesObj, childEdgesObj, newEdges, clusterNodeProperties, options.clusterEdgeProperties);

    // disable the childEdges
    for (let edgeId in childEdgesObj) {
      if (childEdgesObj.hasOwnProperty(edgeId)) {
        if (this.body.edges[edgeId] !== undefined) {
          let edge = this.body.edges[edgeId];
          // if the edge is a clusterEdge, we delete it. The opening of the clusters will restore these edges when required.
          if (edgeId.substr(0,12) === "clusterEdge:") {
            edge.edgeType.cleanup();
            // this removes the edge from node.edges, which is why edgeIds is formed
            edge.disconnect();
            delete childEdgesObj[edgeId];
            delete this.body.edges[edgeId];
          }
          else {
            edge.togglePhysics(false);
            edge.options.hidden = true;
          }
        }
      }
    }

    // disable the childNodes
    for (let nodeId in childNodesObj) {
      if (childNodesObj.hasOwnProperty(nodeId)) {
        this.clusteredNodes[nodeId] = {clusterId:clusterNodeProperties.id, node: this.body.nodes[nodeId]};
        this.body.nodes[nodeId].togglePhysics(false);
        this.body.nodes[nodeId].options.hidden = true;
      }
    }

    // push new edges to global
    for (let i = 0; i < newEdges.length; i++) {
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
      console.log("Node does not exist.");
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
    let childKeys = Object.keys(childNodesObj);
    let minX = childNodesObj[childKeys[0]].x;
    let maxX = childNodesObj[childKeys[0]].x;
    let minY = childNodesObj[childKeys[0]].y;
    let maxY = childNodesObj[childKeys[0]].y;
    let node;
    for (let i = 1; i < childKeys.length; i++) {
      node = childNodesObj[childKeys[i]];
      minX = node.x < minX ? node.x : minX;
      maxX = node.x > maxX ? node.x : maxX;
      minY = node.y < minY ? node.y : minY;
      maxY = node.y > maxY ? node.y : maxY;
    }


    return {x: 0.5*(minX + maxX), y: 0.5*(minY + maxY)};
  }



  /**
  * Open a cluster by calling this function.
  * @param {String}  clusterNodeId | the ID of the cluster node
  * @param {Boolean} refreshData | wrap up afterwards if not true
  */
  openCluster(clusterNodeId, options, refreshData = true) {
    // kill conditions
    if (clusterNodeId === undefined)                    {throw new Error("No clusterNodeId supplied to openCluster.");}
    if (this.body.nodes[clusterNodeId] === undefined)   {throw new Error("The clusterNodeId supplied to openCluster does not exist.");}
    if (this.body.nodes[clusterNodeId].containedNodes === undefined) {
      console.log("The node:" + clusterNodeId + " is not a cluster.");
      return
    }
    let clusterNode = this.body.nodes[clusterNodeId];
    let containedNodes = clusterNode.containedNodes;
    let containedEdges = clusterNode.containedEdges;

    // allow the user to position the nodes after release.
    if (options !== undefined && options.releaseFunction !== undefined && typeof options.releaseFunction === 'function') {
      let positions = {};
      let clusterPosition = {x:clusterNode.x, y:clusterNode.y};
      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          let containedNode = this.body.nodes[nodeId];
          positions[nodeId] = {x: containedNode.x, y: containedNode.y};
        }
      }
      let newPositions = options.releaseFunction(clusterPosition, positions);

      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          let containedNode = this.body.nodes[nodeId];
          if (newPositions[nodeId] !== undefined) {
            containedNode.x = newPositions[nodeId].x || clusterNode.x;
            containedNode.y = newPositions[nodeId].y || clusterNode.y;
          }
        }
      }
    }
    else {
      // copy the position from the cluster
      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          let containedNode = this.body.nodes[nodeId];
          containedNode = containedNodes[nodeId];
          // inherit position
          containedNode.x = clusterNode.x;
          containedNode.y = clusterNode.y;
        }
      }
    }

    // release nodes
    for (let nodeId in containedNodes) {
      if (containedNodes.hasOwnProperty(nodeId)) {
        let containedNode = this.body.nodes[nodeId];

        // inherit speed
        containedNode.vx = clusterNode.vx;
        containedNode.vy = clusterNode.vy;

        containedNode.options.hidden = false;
        containedNode.togglePhysics(true);

        delete this.clusteredNodes[nodeId];
      }
    }

    // release edges
    for (let edgeId in containedEdges) {
      if (containedEdges.hasOwnProperty(edgeId)) {
        let edge = containedEdges[edgeId];
        // if this edge was a temporary edge and it's connected nodes do not exist anymore, we remove it from the data
        if (this.body.nodes[edge.fromId] === undefined || this.body.nodes[edge.toId] === undefined || edge.toId == clusterNodeId || edge.fromId == clusterNodeId) {
          edge.edgeType.cleanup();
          // this removes the edge from node.edges, which is why edgeIds is formed
          edge.disconnect();
          delete this.body.edges[edgeId];
        }
        else {
          // one of the nodes connected to this edge is in a cluster. We give the edge to that cluster so it will be released when that cluster is opened.
          if (this.clusteredNodes[edge.fromId] !== undefined || this.clusteredNodes[edge.toId] !== undefined) {
            let fromId, toId;
            let clusteredNode = this.clusteredNodes[edge.fromId] || this.clusteredNodes[edge.toId];
            let clusterId = clusteredNode.clusterId;
            let clusterNode = this.body.nodes[clusterId];
            clusterNode.containedEdges[edgeId] = edge;

            if (this.clusteredNodes[edge.fromId] !== undefined) {
              fromId = clusterId;
              toId = edge.toId;
            }
            else {
              fromId = edge.fromId;
              toId = clusterId;
            }

            // if both from and to nodes are visible, we create a new temporary edge
            if (this.body.nodes[fromId].options.hidden !== true && this.body.nodes[toId].options.hidden !== true) {
              let clonedOptions = this._cloneOptions(edge, 'edge');
              let id = 'clusterEdge:' + util.randomUUID();
              util.deepExtend(clonedOptions, clusterNode.clusterEdgeProperties);
              util.deepExtend(clonedOptions, {from: fromId, to: toId, hidden: false, physics: true, id: id});
              let newEdge = this.body.functions.createEdge(clonedOptions);

              this.body.edges[id] = newEdge;
              this.body.edges[id].connect();
            }
          }
          else {
            edge.options.hidden = false;
            edge.togglePhysics(true);
          }
        }
      }
    }

    // remove all temporary edges, make an array of ids so we don't remove from the list we're iterating over.
    let removeIds = [];
    for (let i = 0; i < clusterNode.edges.length; i++) {
      let edgeId = clusterNode.edges[i].id;
      removeIds.push(edgeId);
    }

    // actually removing the edges
    for (let i = 0; i < removeIds.length; i++) {
      let edgeId = removeIds[i];
      this.body.edges[edgeId].edgeType.cleanup();
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

  getNodesInCluster(clusterId) {
    let nodesArray = []
    if (this.isCluster(clusterId) === true) {
      let containedNodes = this.body.nodes[clusterId].containedNodes;
      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          nodesArray.push(nodeId)
        }
      }
    }

    return nodesArray;
  }

  /**
  * Get the stack clusterId's that a certain node resides in. cluster A -> cluster B -> cluster C -> node
  * @param nodeId
  * @returns {Array}
  * @private
  */
  findNode(nodeId) {
    let stack = [];
    let max = 100;
    let counter = 0;

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
    let average = 0;
    let averageSquared = 0;
    let hubCounter = 0;
    let largestHub = 0;

    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let node = this.body.nodes[this.body.nodeIndices[i]];
      if (node.edges.length > largestHub) {
        largestHub = node.edges.length;
      }
      average += node.edges.length;
      averageSquared += Math.pow(node.edges.length,2);
      hubCounter += 1;
    }
    average = average / hubCounter;
    averageSquared = averageSquared / hubCounter;

    let letiance = averageSquared - Math.pow(average,2);
    let standardDeviation = Math.sqrt(letiance);

    let hubThreshold = Math.floor(average + 2*standardDeviation);

    // always have at least one to cluster
    if (hubThreshold > largestHub) {
      hubThreshold = largestHub;
    }

    return hubThreshold;
  };

}


export default ClusterEngine;
