let util = require("../../util");
var NetworkUtil = require('../NetworkUtil').default;
var Cluster = require('./components/nodes/Cluster').default;

class ClusterEngine {
  constructor(body) {
    this.body = body;
    this.clusteredNodes = {};
    this.clusteredEdges = {};

    this.options = {};
    this.defaultOptions = {};
    util.extend(this.options, this.defaultOptions);

    this.body.emitter.on('_resetData', () => {this.clusteredNodes = {}; this.clusteredEdges = {};})
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
      this.clusterByConnection(nodesToCluster[i],options,true);
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
      let clonedOptions = NetworkUtil.cloneOptions(node);
      if (options.joinCondition(clonedOptions) === true) {
        childNodesObj[nodeId] = this.body.nodes[nodeId];

        // collect the nodes that will be in the cluster
        for (let i = 0; i < node.edges.length; i++) {
          let edge = node.edges[i];
          if (this.clusteredEdges[edge.id] === undefined) {
            childEdgesObj[edge.id] = edge;
          }
        }
      }
    }

    this._cluster(childNodesObj, childEdgesObj, options, refreshData);
  }


  /**
   * Cluster all nodes in the network that have only X edges
   * @param edgeCount
   * @param options
   * @param refreshData
   */
  clusterByEdgeCount(edgeCount, options, refreshData = true) {
    options = this._checkOptions(options);
    let clusters = [];
    let usedNodes = {};
    let edge, edges, node, nodeId, relevantEdgeCount;
    // collect the nodes that will be in the cluster
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let childNodesObj = {};
      let childEdgesObj = {};
      nodeId = this.body.nodeIndices[i];

      // if this node is already used in another cluster this session, we do not have to re-evaluate it.
      if (usedNodes[nodeId] === undefined) {
        relevantEdgeCount = 0;
        node = this.body.nodes[nodeId];
        edges = [];
        for (let j = 0; j < node.edges.length; j++) {
          edge = node.edges[j];
          if (this.clusteredEdges[edge.id] === undefined) {
            if (edge.toId !== edge.fromId) {
              relevantEdgeCount++;
            }
            edges.push(edge);
          }
        }

        // this node qualifies, we collect its neighbours to start the clustering process.
        if (relevantEdgeCount === edgeCount) {
          let gatheringSuccessful = true;
          for (let j = 0; j < edges.length; j++) {
            edge = edges[j];
            let childNodeId = this._getConnectedId(edge, nodeId);
            // add the nodes to the list by the join condition.
            if (options.joinCondition === undefined) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[nodeId] = this.body.nodes[nodeId];
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
              usedNodes[nodeId] = true;
            }
            else {
              let clonedOptions = NetworkUtil.cloneOptions(this.body.nodes[nodeId]);
              if (options.joinCondition(clonedOptions) === true) {
                childEdgesObj[edge.id] = edge;
                childNodesObj[nodeId] = this.body.nodes[nodeId];
                usedNodes[nodeId] = true;
              }
              else {
                // this node does not qualify after all.
                gatheringSuccessful = false;
                break;
              }
            }
          }

          // add to the cluster queue
          if (Object.keys(childNodesObj).length > 0 && Object.keys(childEdgesObj).length > 0 && gatheringSuccessful === true) {
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

  /**
  * Cluster all nodes in the network that have only 1 edge
  * @param options
  * @param refreshData
  */
  clusterOutliers(options, refreshData = true) {
    this.clusterByEdgeCount(1,options,refreshData);
  }

  /**
   * Cluster all nodes in the network that have only 2 edge
   * @param options
   * @param refreshData
   */
  clusterBridges(options, refreshData = true) {
    this.clusterByEdgeCount(2,options,refreshData);
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
    let parentClonedOptions = NetworkUtil.cloneOptions(node);
    childNodesObj[parentNodeId] = node;

    // collect the nodes that will be in the cluster
    for (let i = 0; i < node.edges.length; i++) {
      let edge = node.edges[i];
      if (this.clusteredEdges[edge.id] === undefined) {
        let childNodeId = this._getConnectedId(edge, parentNodeId);

        // if the child node is not in a cluster
        if (this.clusteredNodes[childNodeId] === undefined) {
          if (childNodeId !== parentNodeId) {
            if (options.joinCondition === undefined) {
              childEdgesObj[edge.id] = edge;
              childNodesObj[childNodeId] = this.body.nodes[childNodeId];
            }
            else {
              // clone the options and insert some additional parameters that could be interesting.
              let childClonedOptions = NetworkUtil.cloneOptions(this.body.nodes[childNodeId]);
              if (options.joinCondition(parentClonedOptions, childClonedOptions) === true) {
                childEdgesObj[edge.id] = edge;
                childNodesObj[childNodeId] = this.body.nodes[childNodeId];
              }
            }
          }
          else {
            // swallow the edge if it is self-referencing.
            childEdgesObj[edge.id] = edge;
          }
        }
      }
    }
    var childNodeIDs = Object.keys(childNodesObj).map(function(childNode){
      return childNodesObj[childNode].id;
    })

    for (childNode in childNodesObj) {
      var childNode = childNodesObj[childNode];
      for (var y=0; y < childNode.edges.length; y++){
        var childEdge = childNode.edges[y];
        if (childNodeIDs.indexOf(this._getConnectedId(childEdge,childNode.id)) > -1){
          childEdgesObj[childEdge.id] = childEdge;
        }
      }
    }
    this._cluster(childNodesObj, childEdgesObj, options, refreshData);
  }


  /**
  * This function creates the edges that will be attached to the cluster
  * It looks for edges that are connected to the nodes from the "outside' of the cluster.
  *
  * @param childNodesObj
  * @param childEdgesObj
  * @param clusterNodeProperties
  * @param clusterEdgeProperties
  * @private
  */
  _createClusterEdges (childNodesObj, childEdgesObj, clusterNodeProperties, clusterEdgeProperties) {
    let edge, childNodeId, childNode, toId, fromId, otherNodeId;

    // loop over all child nodes and their edges to find edges going out of the cluster
    // these edges will be replaced by clusterEdges.
    let childKeys = Object.keys(childNodesObj);
    let createEdges = [];
    for (let i = 0; i < childKeys.length; i++) {
      childNodeId = childKeys[i];
      childNode = childNodesObj[childNodeId];

      // construct new edges from the cluster to others
      for (let j = 0; j < childNode.edges.length; j++) {
        edge = childNode.edges[j];
        // we only handle edges that are visible to the system, not the disabled ones from the clustering process.
        if (this.clusteredEdges[edge.id] === undefined) {
          // self-referencing edges will be added to the "hidden" list
          if (edge.toId == edge.fromId) {
            childEdgesObj[edge.id] = edge;
          }
          else {
            // set up the from and to.
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
          }

          // Only edges from the cluster outwards are being replaced.
          if (childNodesObj[otherNodeId] === undefined) {
            createEdges.push({edge: edge, fromId: fromId, toId: toId});
          }
        }
      }
    }

    // here we actually create the replacement edges. We could not do this in the loop above as the creation process
    // would add an edge to the edges array we are iterating over.
    for (let j = 0; j < createEdges.length; j++) {
      let edge = createEdges[j].edge;
      // copy the options of the edge we will replace
      let clonedOptions = NetworkUtil.cloneOptions(edge, 'edge');
      // make sure the properties of clusterEdges are superimposed on it
      util.deepExtend(clonedOptions, clusterEdgeProperties);

      // set up the edge
      clonedOptions.from = createEdges[j].fromId;
      clonedOptions.to = createEdges[j].toId;
      clonedOptions.id = 'clusterEdge:' + util.randomUUID();
      //clonedOptions.id = '(cf: ' + createEdges[j].fromId + " to: " + createEdges[j].toId + ")" + Math.random();

      // create the edge and give a reference to the one it replaced.
      let newEdge = this.body.functions.createEdge(clonedOptions);
      newEdge.clusteringEdgeReplacingId = edge.id;

      // also reference the new edge in the old edge
      this.body.edges[edge.id].edgeReplacedById = newEdge.id;

      // connect the edge.
      this.body.edges[newEdge.id] = newEdge;
      newEdge.connect();

      // hide the replaced edge
      this._backupEdgeOptions(edge);
      edge.setOptions({physics:false, hidden:true});
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
    // kill condition: no nodes don't bother
    if (Object.keys(childNodesObj).length == 0) {return;}

    // allow clusters of 1 if options allow
    if (Object.keys(childNodesObj).length == 1 && options.clusterNodeProperties.allowSingleNodeCluster != true) {return;}

    // check if this cluster call is not trying to cluster anything that is in another cluster.
    for (let nodeId in childNodesObj) {
      if (childNodesObj.hasOwnProperty(nodeId)) {
        if (this.clusteredNodes[nodeId] !== undefined) {
          return;
        }
      }
    }

    let clusterNodeProperties = util.deepExtend({},options.clusterNodeProperties);

    // construct the clusterNodeProperties
    if (options.processProperties !== undefined) {
      // get the childNode options
      let childNodesOptions = [];
      for (let nodeId in childNodesObj) {
        if (childNodesObj.hasOwnProperty(nodeId)) {
          let clonedOptions = NetworkUtil.cloneOptions(childNodesObj[nodeId]);
          childNodesOptions.push(clonedOptions);
        }
      }

      // get cluster properties based on childNodes
      let childEdgesOptions = [];
      for (let edgeId in childEdgesObj) {
        if (childEdgesObj.hasOwnProperty(edgeId)) {
          // these cluster edges will be removed on creation of the cluster.
          if (edgeId.substr(0, 12) !== "clusterEdge:") {
            let clonedOptions = NetworkUtil.cloneOptions(childEdgesObj[edgeId], 'edge');
            childEdgesOptions.push(clonedOptions);
          }
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


    // give the clusterNode a position if it does not have one.
    let pos = undefined;
    if (clusterNodeProperties.x === undefined) {
      pos = this._getClusterPosition(childNodesObj);
      clusterNodeProperties.x = pos.x;
    }
    if (clusterNodeProperties.y === undefined) {
      if (pos === undefined) {pos = this._getClusterPosition(childNodesObj);}
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

    // create the new edges that will connect to the cluster, all self-referencing edges will be added to childEdgesObject here.
    this._createClusterEdges(childNodesObj, childEdgesObj, clusterNodeProperties, options.clusterEdgeProperties);

    // disable the childEdges
    for (let edgeId in childEdgesObj) {
      if (childEdgesObj.hasOwnProperty(edgeId)) {
        if (this.body.edges[edgeId] !== undefined) {
          let edge = this.body.edges[edgeId];
          // cache the options before changing
          this._backupEdgeOptions(edge);
          // disable physics and hide the edge
          edge.setOptions({physics:false, hidden:true});
        }
      }
    }

    // disable the childNodes
    for (let nodeId in childNodesObj) {
      if (childNodesObj.hasOwnProperty(nodeId)) {
        this.clusteredNodes[nodeId] = {clusterId:clusterNodeProperties.id, node: this.body.nodes[nodeId]};
        this.body.nodes[nodeId].setOptions({hidden:true, physics:false});
      }
    }

    // set ID to undefined so no duplicates arise
    clusterNodeProperties.id = undefined;

    // wrap up
    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }

  _backupEdgeOptions(edge) {
    if (this.clusteredEdges[edge.id] === undefined) {
      this.clusteredEdges[edge.id] = {physics: edge.options.physics, hidden: edge.options.hidden};
    }
  }

  _restoreEdge(edge) {
    let originalOptions = this.clusteredEdges[edge.id];
    if (originalOptions !== undefined) {
      edge.setOptions({physics: originalOptions.physics, hidden: originalOptions.hidden});
      delete this.clusteredEdges[edge.id];
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
            containedNode.x = (newPositions[nodeId].x === undefined ? clusterNode.x : newPositions[nodeId].x);
            containedNode.y = (newPositions[nodeId].y === undefined ? clusterNode.y : newPositions[nodeId].y);
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
          if (containedNode.options.fixed.x === false) {containedNode.x = clusterNode.x;}
          if (containedNode.options.fixed.y === false) {containedNode.y = clusterNode.y;}
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

        // we use these methods to avoid re-instantiating the shape, which happens with setOptions.
        containedNode.setOptions({hidden:false, physics:true});

        delete this.clusteredNodes[nodeId];
      }
    }

    // copy the clusterNode edges because we cannot iterate over an object that we add or remove from.
    let edgesToBeDeleted = [];
    for (let i = 0; i < clusterNode.edges.length; i++) {
      edgesToBeDeleted.push(clusterNode.edges[i]);
    }

    // actually handling the deleting.
    for (let i = 0; i < edgesToBeDeleted.length; i++) {
      let edge = edgesToBeDeleted[i];

      let otherNodeId = this._getConnectedId(edge, clusterNodeId);
      // if the other node is in another cluster, we transfer ownership of this edge to the other cluster
      if (this.clusteredNodes[otherNodeId] !== undefined) {
        // transfer ownership:
        let otherCluster = this.body.nodes[this.clusteredNodes[otherNodeId].clusterId];
        let transferEdge = this.body.edges[edge.clusteringEdgeReplacingId];
        if (transferEdge !== undefined) {
          otherCluster.containedEdges[transferEdge.id] = transferEdge;

          // delete local reference
          delete containedEdges[transferEdge.id];

          // create new cluster edge from the otherCluster:
          // get to and from
          let fromId = transferEdge.fromId;
          let toId = transferEdge.toId;
          if (transferEdge.toId == otherNodeId) {
            toId = this.clusteredNodes[otherNodeId].clusterId;
          }
          else {
            fromId = this.clusteredNodes[otherNodeId].clusterId;
          }

          // clone the options and apply the cluster options to them
          let clonedOptions = NetworkUtil.cloneOptions(transferEdge, 'edge');
          util.deepExtend(clonedOptions, otherCluster.clusterEdgeProperties);

          // apply the edge specific options to it.
          let id = 'clusterEdge:' + util.randomUUID();
          util.deepExtend(clonedOptions, {from: fromId, to: toId, hidden: false, physics: true, id: id});

          // create it
          let newEdge = this.body.functions.createEdge(clonedOptions);
          newEdge.clusteringEdgeReplacingId = transferEdge.id;
          this.body.edges[id] = newEdge;
          this.body.edges[id].connect();
        }
      }
      else {
        let replacedEdge = this.body.edges[edge.clusteringEdgeReplacingId];
        if (replacedEdge !== undefined) {
          this._restoreEdge(replacedEdge);
        }
      }
      edge.cleanup();
      // this removes the edge from node.edges, which is why edgeIds is formed
      edge.disconnect();
      delete this.body.edges[edge.id];
    }

    // handle the releasing of the edges
    for (let edgeId in containedEdges) {
      if (containedEdges.hasOwnProperty(edgeId)) {
        this._restoreEdge(containedEdges[edgeId]);
      }
    }

    // remove clusterNode
    delete this.body.nodes[clusterNodeId];

    if (refreshData === true) {
      this.body.emitter.emit('_dataChanged');
    }
  }

  getNodesInCluster(clusterId) {
    let nodesArray = [];
    if (this.isCluster(clusterId) === true) {
      let containedNodes = this.body.nodes[clusterId].containedNodes;
      for (let nodeId in containedNodes) {
        if (containedNodes.hasOwnProperty(nodeId)) {
          nodesArray.push(this.body.nodes[nodeId].id)
        }
      }
    }

    return nodesArray;
  }

  /**
  * Get the stack clusterId's that a certain node resides in. cluster A -> cluster B -> cluster C -> node
  *
  * If a node can't be found in the chain, return an empty array.
  *
  * @param {string|number} nodeId
  * @returns {Array}
  */
  findNode(nodeId) {
    let stack = [];
    let max = 100;
    let counter = 0;
    let node;

    while (this.clusteredNodes[nodeId] !== undefined && counter < max) {
      node = this.body.nodes[nodeId]
      if (node === undefined) return [];
      stack.push(node.id);

      nodeId = this.clusteredNodes[nodeId].clusterId;
      counter++;
    }

    node = this.body.nodes[nodeId]
    if (node === undefined) return [];
    stack.push(node.id);

    stack.reverse();
    return stack;
  }

  /**
  * Using a clustered nodeId, update with the new options
  * @param clusteredNodeId
  * @param {object} newOptions
  */
  updateClusteredNode(clusteredNodeId, newOptions) {
    if (clusteredNodeId === undefined) {throw new Error("No clusteredNodeId supplied to updateClusteredNode.");}
    if (newOptions === undefined) {throw new Error("No newOptions supplied to updateClusteredNode.");}
    if (this.body.nodes[clusteredNodeId] === undefined)   {throw new Error("The clusteredNodeId supplied to updateClusteredNode does not exist.");}

    this.body.nodes[clusteredNodeId].setOptions(newOptions);
    this.body.emitter.emit('_dataChanged');
  }

  /**
  * Using a base edgeId, update all related clustered edges with the new options
  * @param startEdgeId
  * @param {object} newOptions
  */
  updateEdge(startEdgeId, newOptions) {
    if (startEdgeId === undefined) {throw new Error("No startEdgeId supplied to updateEdge.");}
    if (newOptions === undefined) {throw new Error("No newOptions supplied to updateEdge.");}
    if (this.body.edges[startEdgeId] === undefined)   {throw new Error("The startEdgeId supplied to updateEdge does not exist.");}

    let allEdgeIds = this.getClusteredEdges(startEdgeId);
    for (let i = 0; i < allEdgeIds.length; i++) {
      var edge = this.body.edges[allEdgeIds[i]];
      edge.setOptions(newOptions);
    }
    this.body.emitter.emit('_dataChanged');
  }

  /**
  * Get a stack of clusterEdgeId's (+base edgeid) that a base edge is the same as. cluster edge C -> cluster edge B -> cluster edge A -> base edge(edgeId)
  * @param edgeId
  * @returns {Array}
  */
  getClusteredEdges(edgeId) {
    let stack = [];
    let max = 100;
    let counter = 0;

    while (edgeId !== undefined && this.body.edges[edgeId] !== undefined && counter < max) {
      stack.push(this.body.edges[edgeId].id);
      edgeId = this.body.edges[edgeId].edgeReplacedById;
      counter++;
    }
    stack.reverse();
    return stack;
  }

  /**
  * Get the base edge id of clusterEdgeId. cluster edge (clusteredEdgeId) -> cluster edge B -> cluster edge C -> base edge
  * @param clusteredEdgeId
  * @returns baseEdgeId
  */
  getBaseEdge(clusteredEdgeId) {
    let baseEdgeId = clusteredEdgeId;
    let max = 100;
    let counter = 0;

    while (clusteredEdgeId !== undefined && this.body.edges[clusteredEdgeId] !== undefined && counter < max) {
      clusteredEdgeId = this.body.edges[clusteredEdgeId].clusteringEdgeReplacingId;
      counter++;
      if (clusteredEdgeId !== undefined) {
        baseEdgeId = clusteredEdgeId;
      }
    }
    return baseEdgeId;
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

    let variance = averageSquared - Math.pow(average,2);
    let standardDeviation = Math.sqrt(variance);

    let hubThreshold = Math.floor(average + 2*standardDeviation);

    // always have at least one to cluster
    if (hubThreshold > largestHub) {
      hubThreshold = largestHub;
    }

    return hubThreshold;
  };

}


export default ClusterEngine;
