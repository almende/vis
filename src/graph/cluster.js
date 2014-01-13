/**
 * @constructor Cluster
 * Contains the cluster properties for the graph object
 */
function Cluster() {
  this.clusterSession = 0;
}

/**
 * This function can be called to increase the cluster level. This means that the nodes with only one edge connection will
 * be clustered with their connected node. This can be repeated as many times as needed.
 * This can be called externally (by a keybind for instance) to reduce the complexity of big datasets.
 */
Cluster.prototype.increaseClusterLevel = function() {
  var isMovingBeforeClustering = this.moving;

  this._formClusters(true);

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};

/**
 * This function can be called to decrease the cluster level. This means that the nodes with only one edge connection will
 * be unpacked if they are a cluster. This can be repeated as many times as needed.
 * This can be called externally (by a key-bind for instance) to look into clusters without zooming.
 */
Cluster.prototype.decreaseClusterLevel = function() {
  var isMovingBeforeClustering = this.moving;

  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    if (node.clusterSize > 1) {
      this._expandClusterNode(node,false,true);
    }
  }
  this._updateNodeIndexList();

  this.clusterSession = (this.clusterSession == 0) ? 0 : this.clusterSession - 1;

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }

  this._updateLabels();
};


/**
 * This function can be called to open up a specific cluster.
 * It will unpack the cluster back one level.
 *
 * @param node    | Node object: cluster to open.
 */
Cluster.prototype.openCluster = function(node) {
  var isMovingBeforeClustering = this.moving;

  this._expandClusterNode(node,false,true);
  this._updateNodeIndexList();

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};


/**
 * This function checks if the zoom action is in or out.
 * If out, check if we can form clusters, if in, check if we can open clusters.
 * This function is only called from _zoom()
 *
 * @private
 */
Cluster.prototype._updateClusters = function() {
  var isMovingBeforeClustering = this.moving;

  if (this.previousScale > this.scale) { // zoom out
    this._formClusters(false);
  }
  else if (this.previousScale < this.scale) { // zoom out
    this._openClusters();
  }

  this._updateClusterLabels();
  this._updateNodeLabels();
  this._updateLabels();
  this.previousScale = this.scale;

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};

/**
 * This updates the node labels for all nodes (for debugging purposes)
 * @private
 */
Cluster.prototype._updateLabels = function() {
  // update node labels
  //this._updateClusterLabels();
 // this._updateNodeLabels();

   // Debug :
  for (var nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      var node = this.nodes[nodeID];
      node.label = String(node.dynamicEdges.length).concat(":",node.dynamicEdgesLength,":",String(node.clusterSize),":::",String(node.id));
    }
  }

};

/**
 * This updates the node labels for all clusters
 * @private
 */
Cluster.prototype._updateClusterLabels = function() {
  // update node labels
  for (var nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      var node = this.nodes[nodeID];
      if (node.clusterSize > 1) {
        node.label = "[".concat(String(node.clusterSize),"]");
      }
    }
  }
};

/**
 * This updates the node labels for all nodes that are NOT clusters
 * @private
 */
Cluster.prototype._updateNodeLabels = function() {
  // update node labels
  for (var nodeID in this.nodes) {
    var node = this.nodes[nodeID];
    if (node.clusterSize == 1) {
      node.label = String(node.id);
    }
  }
};


/**
 * This function loops over all nodes in the nodeIndices list. For each node it checks if it is a cluster and if it
 * has to be opened based on the current zoom level.
 *
 * @private
 */
Cluster.prototype._openClusters = function() {
  var amountOfNodes = this.nodeIndices.length;

  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    this._expandClusterNode(node,true,false);
  }

  this._updateNodeIndexList();

  if (this.nodeIndices.length != amountOfNodes) { // this means a clustering operation has taken place
    this.clusterSession -= 1;
  }
};


/**
 * This function checks if a node has to be opened. This is done by checking the zoom level.
 * If the node contains child nodes, this function is recursively called on the child nodes as well.
 * This recursive behaviour is optional and can be set by the recursive argument.
 *
 * @param parentNode    | Node object: to check for cluster and expand
 * @param recursive     | Boolean: enable or disable recursive calling
 * @param forceExpand   | Boolean: enable or disable forcing the last node to join the cluster to be expelled
 * @private
 */
Cluster.prototype._expandClusterNode = function(parentNode, recursive, forceExpand) {
  // first check if node is a cluster
  if (parentNode.clusterSize > 1) {
    // if the last child has been added on a smaller scale than current scale (@optimization)
    if (parentNode.formationScale < this.scale || forceExpand == true) {
      // we will check if any of the contained child nodes should be removed from the cluster
      for (var containedNodeID in parentNode.containedNodes) {
        if (parentNode.containedNodes.hasOwnProperty(containedNodeID)) {
          var childNode = parentNode.containedNodes[containedNodeID];

          // force expand will expand the largest cluster size clusters. Since we cluster from outside in, we assume that
          // the largest cluster is the one that comes from outside
          if (forceExpand == true) {
            if (childNode.clusterSession == this.clusterSession - 1) {
              this._expelChildFromParent(parentNode,containedNodeID,recursive,forceExpand);
            }
          }
          else {
            if (this._parentNodeInActiveArea(parentNode)) {
              this._expelChildFromParent(parentNode,containedNodeID,recursive,forceExpand);
            }
          }
        }
      }
    }
  }
};


Cluster.prototype._parentNodeInActiveArea = function(node) {
  if (Math.abs(node.x - this.zoomCenter.x) <= this.constants.clustering.activeAreaRadius/this.scale &&
      Math.abs(node.y - this.zoomCenter.y) <= this.constants.clustering.activeAreaRadius/this.scale) {
    return true;
  }
  else {
    return false;
  }
};

/**
 * This function will expel a child_node from a parent_node. This is to de-cluster the node. This function will remove
 * the child node from the parent contained_node object and put it back into the global nodes object.
 * The same holds for the edge that was connected to the child node. It is moved back into the global edges object.
 *
 * @param parentNode        | Node object: the parent node
 * @param containedNodeID   | String: child_node id as it is contained in the containedNodes object of the parent node
 * @param recursive         | Boolean:  This will also check if the child needs to be expanded.
 *                                      With force and recursive both true, the entire cluster is unpacked
 * @param forceExpand      | Boolean: This will disregard the zoom level and will expel this child from the parent
 * @private
 */
Cluster.prototype._expelChildFromParent = function(parentNode, containedNodeID, recursive, forceExpand) {
  var childNode = parentNode.containedNodes[containedNodeID];

  // if child node has been added on smaller scale than current, kick out
  if (childNode.formationScale < this.scale || forceExpand == true) {

    // put the child node back in the global nodes object
    this.nodes[containedNodeID] = childNode;

    // release the contained edges from this childNode back into the global edges
    this._releaseContainedEdges(parentNode,childNode)

    // reconnect rerouted edges to the childNode
    this._connectEdgeBackToChild(parentNode,childNode);

    // undo the changes from the clustering operation on the parent node
    parentNode.mass -= this.constants.clustering.massTransferCoefficient * childNode.mass;
    parentNode.fontSize -= this.constants.clustering.fontSizeMultiplier * childNode.clusterSize;
    parentNode.clusterSize -= childNode.clusterSize;
    parentNode.dynamicEdgesLength = parentNode.dynamicEdges.length;

    // place the child node near the parent, not at the exact same location to avoid chaos in the system
    childNode.x = parentNode.x + this.constants.edges.length * 0.2 * (0.5 - Math.random()) * parentNode.clusterSize;
    childNode.y = parentNode.y + this.constants.edges.length * 0.2 * (0.5 - Math.random()) * parentNode.clusterSize;

    // remove the clusterSession from the child node
    childNode.clusterSession = 0;

    // remove node from the list
    delete parentNode.containedNodes[containedNodeID];

    // restart the simulation to reorganise all nodes
    this.moving = true;

    // recalculate the size of the node on the next time the node is rendered
    parentNode.clearSizeCache();
  }

  // check if a further expansion step is possible if recursivity is enabled
  if (recursive == true) {
    this._expandClusterNode(childNode,recursive,forceExpand);
  }
};


/**
 * This function checks if any nodes at the end of their trees have edges below a threshold length
 * This function is called only from _updateClusters()
 * forceLevelCollapse ignores the length of the edge and collapses one level
 * This means that a node with only one edge will be clustered with its connected node
 *
 * @private
 * @param force_level_collapse    | Boolean
 */
Cluster.prototype._formClusters = function(forceLevelCollapse) {
  var amountOfNodes = this.nodeIndices.length;

  if (forceLevelCollapse == false) {
    this._formClustersByZoom();
  }
  else {
    this._forceClustersByZoom();
  }

  if (this.nodeIndices.length != amountOfNodes) { // this means a clustering operation has taken place
    this.clusterSession += 1;
  }
};

/**
 * This function handles the clustering by zooming out, this is based on minimum edge distance
 *
 * @private
 */
Cluster.prototype._formClustersByZoom = function() {
  var dx,dy,length,
      minLength = this.constants.clustering.clusterLength/this.scale;
  // create an array of edge ids
  var edgesIDarray = []
  for (var id in this.edges) {
    if (this.edges.hasOwnProperty(id)) {
      edgesIDarray.push(id);
    }
  }

  // check if any edges are shorter than minLength and start the clustering
  // the clustering favours the node with the larger mass
  for (var i = 0; i < edgesIDarray.length; i++) {
    var edgeID = edgesIDarray[i];
    var edge = this.edges[edgeID];
    if (edge.connected) {
      dx = (edge.to.x - edge.from.x);
      dy = (edge.to.y - edge.from.y);
      length = Math.sqrt(dx * dx + dy * dy);


      if (length < minLength) {
        // first check which node is larger
        var parentNode = edge.from
        var childNode = edge.to
        if (edge.to.mass > edge.from.mass) {
          parentNode = edge.to
          childNode = edge.from
        }

        // we allow clustering from outside in
        // if we do not cluster from outside in, we would have to reconnect edges or keep
        // a second set of edges for the clusters.
        // This will also have to be altered in the force calculation and rendering.
        // This method is non-destructive and does not require a second set of data.
        if (childNode.dynamicEdgesLength == 1) {
          this._addToCluster(parentNode,childNode,edge,false);
        }
        else if (parentNode.dynamicEdgesLength == 1) {
          this._addToCluster(childNode,parentNode,edge,false);
        }
      }
    }
  }
  this._updateNodeIndexList();
};

/**
 * This function forces the graph to cluster all nodes with only one connecting edge to their
 * connected node.
 *
 * @private
 */
Cluster.prototype._forceClustersByZoom = function() {
  for (var nodeID = 0; nodeID < this.nodeIndices.length; nodeID++) {
    var childNode = this.nodes[this.nodeIndices[nodeID]];
    if (childNode.dynamicEdgesLength == 1) {
      var edge = childNode.dynamicEdges[0];
      var parentNode = (edge.toId == childNode.id) ? this.nodes[edge.fromId] : this.nodes[edge.toId];
      this._addToCluster(parentNode,childNode,true);
    }
  }
  this._updateNodeIndexList();
  this._updateDynamicEdges();
};


Cluster.prototype.aggregateHubs = function() {
  var isMovingBeforeClustering = this.moving;

  var hubThreshold = 4;
  this._forceClustersByHub(hubThreshold);

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};


/**
 *
 * @param hubThreshold
 * @private
 */
Cluster.prototype._forceClustersByHub = function(hubThreshold) {
  for (var nodeID = 0; nodeID < this.nodeIndices.length; nodeID++) {
    if (this.nodes.hasOwnProperty(this.nodeIndices[nodeID])) {
      var hubNode = this.nodes[this.nodeIndices[nodeID]];
      if (hubNode.dynamicEdges.length >= hubThreshold) {
        var edgesIDarray = []
        var amountOfInitialEdges = hubNode.dynamicEdges.length;
        for (var i = 0; i < amountOfInitialEdges; i++) {
          edgesIDarray.push(hubNode.dynamicEdges[i].id);
        }
        for (var i = 0; i < amountOfInitialEdges; i++) {
          var edge = this.edges[edgesIDarray[i]];
          var childNode = this.nodes[(edge.fromId == hubNode.id) ? edge.toId : edge.fromId];
          this._addToCluster(hubNode,childNode,true);
        }
        break;
      }
    }
  }
  this._updateNodeIndexList();
  this._updateDynamicEdges();
  this._updateLabels();

  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }

};



/**
 * This function adds the child node to the parent node, creating a cluster if it is not already.
 * This function is called only from _updateClusters()
 *
 * @param parent_node           | Node object: this is the node that will house the child node
 * @param child_node            | Node object: this node will be deleted from the global this.nodes and stored in the parent node
 * @param force_level_collapse  | Boolean: true will only update the remainingEdges at the very end of the clustering, ensuring single level collapse
 * @private
 */
Cluster.prototype._addToCluster = function(parentNode, childNode, forceLevelCollapse) {
  // join child node in the parent node
  parentNode.containedNodes[childNode.id] = childNode;

  if (forceLevelCollapse == false) {
    parentNode.dynamicEdgesLength += childNode.dynamicEdges.length - 2;
  }

  for (var i = 0; i < childNode.dynamicEdges.length; i++) {
    var edge = childNode.dynamicEdges[i];
    if (edge.toId == parentNode.id || edge.fromId == parentNode.id) { // edge connected to parentNode
      this._addToContainedEdges(parentNode,childNode,edge);
    }
    else {
      console.log('connecting edge to cluster');
      this._connectEdgeToCluster(parentNode,childNode,edge);
    }
  }
  childNode.dynamicEdges = [];


  // remove the childNode from the global nodes object
  delete this.nodes[childNode.id];

  childNode.clusterSession = this.clusterSession;
  parentNode.mass += this.constants.clustering.massTransferCoefficient * childNode.mass;
  parentNode.clusterSize += childNode.clusterSize;
  parentNode.fontSize += this.constants.clustering.fontSizeMultiplier * childNode.clusterSize

  // giving the clusters a dynamic formationScale to ensure not all clusters open up when zoomed
  if (forceLevelCollapse == true) {
    parentNode.formationScale = this.scale * Math.pow(1.0/11.0,this.clusterSession);
  }
  else {
    parentNode.formationScale = this.scale; // The latest child has been added on this scale
    parentNode.dynamicEdgesLength = parentNode.dynamicEdges.length;
  }

  // recalculate the size of the node on the next time the node is rendered
  parentNode.clearSizeCache();

  parentNode.containedNodes[childNode.id].formationScale = this.scale; // this child has been added at this scale.

  // restart the simulation to reorganise all nodes
  this.moving = true;
};


/**
 * This function will apply the changes made to the remainingEdges during the formation of the clusters.
 * This is a seperate function to allow for level-wise collapsing of the node tree.
 * It has to be called if a level is collapsed. It is called by _formClusters().
 * @private
 */
Cluster.prototype._updateDynamicEdges = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    node.dynamicEdgesLength = node.dynamicEdges.length;
  }
};


Cluster.prototype._repositionNodes = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    if (!node.isFixed()) {
      // TODO: position new nodes in a smarter way!
      var radius = this.constants.edges.length * (1 + 0.5*node.clusterSize);
      var angle = 2 * Math.PI * Math.random();
      node.x = radius * Math.cos(angle);
      node.y = radius * Math.sin(angle);
    }
  }
};

/**
 * This adds an edge from the childNode to the contained edges of the parent node
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @param edge          | Edge object
 * @private
 */
Cluster.prototype._addToContainedEdges = function(parentNode, childNode, edge) {
  // create an array object if it does not yet exist for this childNode
  if (!(parentNode.containedEdges.hasOwnProperty(childNode.id))) {
    parentNode.containedEdges[childNode.id] = []
  }
  // add this edge to the list
  parentNode.containedEdges[childNode.id].push(edge);

  // remove the edge from the global edges object
  delete this.edges[edge.id];

  // remove the edge from the parent object
  for (var i = 0; i < parentNode.dynamicEdges.length; i++) {
    if (parentNode.dynamicEdges[i].id == edge.id) {
      parentNode.dynamicEdges.splice(i,1);
      break;
    }
  }
};

/**
 * This function connects an edge that was connected to a child node to the parent node.
 * It keeps track of which nodes it has been connected to with the originalID array.
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @param edge          | Edge object
 * @private
 */
Cluster.prototype._connectEdgeToCluster = function(parentNode, childNode, edge) {
  if (edge.toId == childNode.id) {    // edge connected to other node on the "to" side
    edge.originalToID.push(childNode.id);
    edge.to = parentNode;
    edge.toId = parentNode.id;
  }
  else {                                  // edge connected to other node with the "from" side
    edge.originalFromID.push(childNode.id);
    edge.from = parentNode;
    edge.fromId = parentNode.id;
  }

  this._addToReroutedEdges(parentNode,childNode,edge);
};


/**
 * This adds an edge from the childNode to the rerouted edges of the parent node
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @param edge          | Edge object
 * @private
 */
Cluster.prototype._addToReroutedEdges = function(parentNode, childNode, edge) {
  // create an array object if it does not yet exist for this childNode
  // we store the edge in the rerouted edges so we can restore it when the cluster pops open
  if (!(parentNode.reroutedEdges.hasOwnProperty(childNode.id))) {
    parentNode.reroutedEdges[childNode.id] = [];
  }
  parentNode.reroutedEdges[childNode.id].push(edge);

  // this edge becomes part of the dynamicEdges of the cluster node
  parentNode.dynamicEdges.push(edge);
};



/**
 * This function connects an edge that was connected to a cluster node back to the child node.
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @private
 */
Cluster.prototype._connectEdgeBackToChild = function(parentNode, childNode) {
  if (parentNode.reroutedEdges[childNode.id] != undefined) {
    for (var i = 0; i < parentNode.reroutedEdges[childNode.id].length; i++) {
      var edge = parentNode.reroutedEdges[childNode.id][i];
      if (edge.originalFromID[edge.originalFromID.length-1] == childNode.id) {
        edge.originalFromID.pop();
        edge.fromId = childNode.id;
        edge.from = childNode;
      }
      else {
        edge.originalToID.pop();
        edge.toId = childNode.id;
        edge.to = childNode;
      }

      // append this edge to the list of edges connecting to the childnode
      childNode.dynamicEdges.push(edge);

      // remove the edge from the parent object
      for (var j = 0; j < parentNode.dynamicEdges.length; j++) {
        if (parentNode.dynamicEdges[j].id == edge.id) {
          parentNode.dynamicEdges.splice(j,1);
          break;
        }
      }
    }
    // remove the entry from the rerouted edges
    delete parentNode.reroutedEdges[childNode.id];
  }
};

/**
 * This function released the contained edges back into the global domain and puts them back into the
 * dynamic edges of both parent and child.
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @private
 */
Cluster.prototype._releaseContainedEdges = function(parentNode, childNode) {
  for (var i = 0; i < parentNode.containedEdges[childNode.id].length; i++) {
    var edge = parentNode.containedEdges[childNode.id][i];

    // put the edge back in the global edges object
    this.edges[edge.id] = edge;

    // put the edge back in the dynamic edges of the child and parent
    childNode.dynamicEdges.push(edge);
    parentNode.dynamicEdges.push(edge);
  }
  // remove the entry from the contained edges
  delete parentNode.containedEdges[childNode.id];

};
