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

  this._updateLabels();

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
  this._updateLabels();

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }

  this.clusterSession = (this.clusterSession == 0) ? 0 : this.clusterSession - 1;

};


/**
 * This function can be called to open up a specific cluster.
 * It will recursively unpack the entire cluster back to individual nodes.
 *
 * @param node    | Node object: cluster to open.
 */
Cluster.prototype.fullyOpenCluster = function(node) {
  var isMovingBeforeClustering = this.moving;

  this._expandClusterNode(node,true,true);
  this._updateNodeIndexList();

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
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
  for (var nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      var node = this.nodes[nodeID];
      node.label = String(node.remainingEdges).concat(":",node.remainingEdges_unapplied,":",String(node.clusterSize));
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
            this._expelChildFromParent(parentNode,containedNodeID,recursive,forceExpand);
          }
        }
      }
    }
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
    // put the child node back in the global nodes object and the corresponding edge in the global edges object
    this.nodes[containedNodeID] = childNode;
    this.edges[parentNode.containedEdges[containedNodeID].id] = parentNode.containedEdges[containedNodeID];

    // undo the changes from the clustering operation on the parent node
    parentNode.mass -= this.constants.clustering.massTransferCoefficient * childNode.mass;
    parentNode.fontSize -= this.constants.clustering.fontSizeMultiplier * childNode.clusterSize;
    parentNode.clusterSize -= childNode.clusterSize;
    parentNode.remainingEdges += 1;
    parentNode.remainingEdges_unapplied = parentNode.remainingEdges;

    // place the child node near the parent, not at the exact same location to avoid chaos in the system
    childNode.x = parentNode.x;
    childNode.y = parentNode.y;

    // remove the clusterSession from the child node
    childNode.clusterSession = 0;

    // remove node from the list
    delete parentNode.containedNodes[containedNodeID];
    delete parentNode.containedEdges[containedNodeID];

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

  var min_length = this.constants.clustering.clusterLength/this.scale;

  var dx,dy,length,
    edges = this.edges;

  // create an array of edge ids
  var edgesIDarray = []
  for (var id in edges) {
    if (edges.hasOwnProperty(id)) {
      edgesIDarray.push(id);
    }
  }

  // check if any edges are shorter than min_length and start the clustering
  // the clustering favours the node with the larger mass
  for (var i = 0; i < edgesIDarray.length; i++) {
    var edgeID = edgesIDarray[i];
    var edge = edges[edgeID];
    edge.id = edgeID;
    if (edge.connected) {
      dx = (edge.to.x - edge.from.x);
      dy = (edge.to.y - edge.from.y);
      length = Math.sqrt(dx * dx + dy * dy);


      if (length < min_length || forceLevelCollapse == true) {
        // checking for clustering possibilities

        // first check which node is larger
        var parentNode = edge.from
        var childNode = edge.to
        if (edge.to.mass > edge.from.mass) {
          parentNode = edge.to
          childNode = edge.from
        }

        // we allow clustering from outside in, ideally the child node in on the outside
        // if we do not cluster from outside in, we would have to reconnect edges or keep a second set of edges for the
        // clusters. This will also have to be altered in the force calculation and rendering.
        // This method is non-destructive and does not require a second set of data.
        if (childNode.remainingEdges == 1 && childNode.remainingEdges_unapplied != 0) {
          this._addToCluster(parentNode,childNode,edge,forceLevelCollapse);
          delete this.edges[edgesIDarray[i]];
        }
        else if (parentNode.remainingEdges == 1 && parentNode.remainingEdges_unapplied != 0) {
          this._addToCluster(childNode,parentNode,edge,forceLevelCollapse);
          delete this.edges[edgesIDarray[i]];
        }
      }
    }
  }
  this._updateNodeIndexList();

  if (forceLevelCollapse == true) {
    this._applyClusterLevel();
  }

  if (this.nodeIndices.length != amountOfNodes) { // this means a clustering operation has taken place
    this.clusterSession += 1;
  }
  console.log(this.clusterSession)
};


/**
 * This function adds the child node to the parent node, creating a cluster if it is not already.
 * This function is called only from _updateClusters()
 *
 * @param parent_node           | Node object: this is the node that will house the child node
 * @param child_node            | Node object: this node will be deleted from the global this.nodes and stored in the parent node
 * @param edge                  | Edge object: this edge will be deleted from the global this.edges and stored in the parent node
 * @param force_level_collapse  | Boolean: true will only update the remainingEdges at the very end of the clustering, ensuring single level collapse
 * @private
 */
Cluster.prototype._addToCluster = function(parentNode, childNode, edge, forceLevelCollapse) {
  // join child node and edge in parent node
  parentNode.containedNodes[childNode.id] = childNode;
  parentNode.containedEdges[childNode.id] = edge;  // the edge gets the node ID so we can easily recover it when expanding the cluster

  if (this.nodes.hasOwnProperty(childNode.id)) {
    delete this.nodes[childNode.id];
  }

  childNode.clusterSession = this.clusterSession;
  parentNode.mass += this.constants.clustering.massTransferCoefficient * childNode.mass;
  parentNode.clusterSize += childNode.clusterSize;
  parentNode.fontSize += this.constants.clustering.fontSizeMultiplier * childNode.clusterSize;
  parentNode.formationScale = this.scale; // The latest child has been added on this scale

  // recalculate the size of the node on the next time the node is rendered
  parentNode.clearSizeCache();

  parentNode.containedNodes[childNode.id].formationScale = this.scale; // this child has been added at this scale.
  if (forceLevelCollapse == true) {
    parentNode.remainingEdges_unapplied -= 1;
  }
  else {
    parentNode.remainingEdges -= 1;
  }

  // restart the simulation to reorganise all nodes
  this.moving = true;
};


/**
 * This function will apply the changes made to the remainingEdges during the formation of the clusters.
 * This is a seperate function to allow for level-wise collapsing of the node tree.
 * It has to be called if a level is collapsed. It is called by _formClusters().
 * @private
 */
Cluster.prototype._applyClusterLevel = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    node.remainingEdges = node.remainingEdges_unapplied;
  }
};
