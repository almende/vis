/**
 * @constructor Cluster
 * Contains the cluster properties for the graph object
 */
function Cluster() {
  this.clusterSession = 0;
  this.hubThreshold = 5;
}


/**
 * This function can be called to open up a specific cluster.
 * It will unpack the cluster back one level.
 *
 * @param node    | Node object: cluster to open.
 */
Cluster.prototype.openCluster = function(node) {
  var isMovingBeforeClustering = this.moving;

  this._expandClusterNode(node,false,true);

  // housekeeping
  this._updateNodeIndexList();
  this._updateDynamicEdges();
  this._updateLabels();

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};




/**
 * This function can be called to increase the cluster level. This means that the nodes with only one edge connection will
 * be clustered with their connected node. This can be repeated as many times as needed.
 * This can be called externally (by a keybind for instance) to reduce the complexity of big datasets.
 */
Cluster.prototype.increaseClusterLevel = function() {
  this.updateClusters(-1,false,true);
};



/**
 * This function can be called to decrease the cluster level. This means that the nodes with only one edge connection will
 * be unpacked if they are a cluster. This can be repeated as many times as needed.
 * This can be called externally (by a key-bind for instance) to look into clusters without zooming.
 */
Cluster.prototype.decreaseClusterLevel = function() {
  this.updateClusters(1,false,true);
};


/**
 * This function clusters on zoom, it can be called with a predefined zoom direction
 * If out, check if we can form clusters, if in, check if we can open clusters.
 * This function is only called from _zoom()
 *
 * @param {Int} zoomDirection
 * @param {Boolean} recursive     | enable or disable recursive calling of the opening of clusters
 * @param {Boolean} force         | enable or disable forcing
 *
 * @private
 */
Cluster.prototype.updateClusters = function(zoomDirection,recursive,force) {
  var isMovingBeforeClustering = this.moving;
  var amountOfNodes = this.nodeIndices.length;

  // check if we zoom in or out
  if (this.previousScale > this.scale || zoomDirection == -1) { // zoom out
    this._formClusters(force);
  }
  else if (this.previousScale < this.scale || zoomDirection == 1) { // zoom out
    this._openClusters(recursive,force);
  }
  this._updateNodeIndexList();

  // if a cluster was NOT formed and the user zoomed out, we try clustering by hubs and update the index again
  if (this.nodeIndices.length == amountOfNodes && (this.previousScale > this.scale || zoomDirection == -1))  {
    this._aggregateHubs(force);
    this._updateNodeIndexList();
  }

  this.previousScale = this.scale;

  // rest of the housekeeping
  this._updateDynamicEdges();
  this._updateLabels();

  // if a cluster was formed, we increase the clusterSession
  if (this.nodeIndices.length < amountOfNodes) { // this means a clustering operation has taken place
    this.clusterSession += 1;
  }

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};

/**
 * this functions starts clustering by hubs
 * The minimum hub threshold is set globally
 *
 * @private
 */
Cluster.prototype._aggregateHubs = function(force) {
  this._getHubSize();
  this._clusterByHub(force);
};


/**
 * This function is fired by keypress. It forces hubs to form.
 *
 */
Cluster.prototype.forceAggregateHubs = function() {
  var isMovingBeforeClustering = this.moving;
  var amountOfNodes = this.nodeIndices.length;

  this._aggregateHubs(true);

  // housekeeping
  this._updateNodeIndexList();
  this._updateDynamicEdges();
  this._updateLabels();

  // if a cluster was formed, we increase the clusterSession
  if (this.nodeIndices.length != amountOfNodes) {
    this.clusterSession += 1;
  }

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};





/**
 * This function loops over all nodes in the nodeIndices list. For each node it checks if it is a cluster and if it
 * has to be opened based on the current zoom level.
 *
 * @private
 */
Cluster.prototype._openClusters = function(recursive,force) {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    this._expandClusterNode(node,recursive,force);
  }
};

/**
 * This function checks if a node has to be opened. This is done by checking the zoom level.
 * If the node contains child nodes, this function is recursively called on the child nodes as well.
 * This recursive behaviour is optional and can be set by the recursive argument.
 *
 * @param {Node}    parentNode    | to check for cluster and expand
 * @param {Boolean} recursive     | enable or disable recursive calling
 * @param {Boolean} force         | enable or disable forcing
 * @param {Boolean} openAll       | This will recursively force all nodes in the parent to be released
 * @private
 */
Cluster.prototype._expandClusterNode = function(parentNode, recursive, force, openAll) {
  var openedCluster = false;
  // first check if node is a cluster
  if (parentNode.clusterSize > 1) {
    // this means that on a double tap event or a zoom event, the cluster fully unpacks if it is smaller than 20
    if (parentNode.clusterSize < 20 && force == false) {
      openAll = true;
    }
    recursive = openAll ? true : recursive;
    // if the last child has been added on a smaller scale than current scale (@optimization)
    if (parentNode.formationScale < this.scale || force == true) {
      // we will check if any of the contained child nodes should be removed from the cluster
      for (var containedNodeID in parentNode.containedNodes) {
        if (parentNode.containedNodes.hasOwnProperty(containedNodeID)) {
          var childNode = parentNode.containedNodes[containedNodeID];

          // force expand will expand the largest cluster size clusters. Since we cluster from outside in, we assume that
          // the largest cluster is the one that comes from outside
          if (force == true) {
            if (childNode.clusterSession == parentNode.clusterSessions[parentNode.clusterSessions.length-1]
                || openAll) {
              this._expelChildFromParent(parentNode,containedNodeID,recursive,force,openAll);
              openedCluster = true;
            }
          }
          else {
            if (this._parentNodeInActiveArea(parentNode)) {
              this._expelChildFromParent(parentNode,containedNodeID,recursive,force,openAll);
              openedCluster = true;
            }
          }
        }
      }
    }
    if (openedCluster == true) {
      parentNode.clusterSessions.pop();
    }
  }
};

/**
 * ONLY CALLED FROM _expandClusterNode
 *
 * This function will expel a child_node from a parent_node. This is to de-cluster the node. This function will remove
 * the child node from the parent contained_node object and put it back into the global nodes object.
 * The same holds for the edge that was connected to the child node. It is moved back into the global edges object.
 *
 * @param {Node}    parentNode        | the parent node
 * @param {String}  containedNodeID   | child_node id as it is contained in the containedNodes object of the parent node
 * @param {Boolean} recursive         | This will also check if the child needs to be expanded.
 *                                      With force and recursive both true, the entire cluster is unpacked
 * @param {Boolean} force             | This will disregard the zoom level and will expel this child from the parent
 * @param {Boolean} openAll           | This will recursively force all nodes in the parent to be released
 * @private
 */
Cluster.prototype._expelChildFromParent = function(parentNode, containedNodeID, recursive, force, openAll) {
  var childNode = parentNode.containedNodes[containedNodeID];

  // if child node has been added on smaller scale than current, kick out
  if (childNode.formationScale < this.scale || force == true) {
    // put the child node back in the global nodes object
    this.nodes[containedNodeID] = childNode;

    // release the contained edges from this childNode back into the global edges
    this._releaseContainedEdges(parentNode,childNode);

    // reconnect rerouted edges to the childNode
    this._connectEdgeBackToChild(parentNode,childNode);

    // validate all edges in dynamicEdges
    this._validateEdges(parentNode);

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
    this._expandClusterNode(childNode,recursive,force,openAll);
  }
};


/**
 * This function checks if any nodes at the end of their trees have edges below a threshold length
 * This function is called only from updateClusters()
 * forceLevelCollapse ignores the length of the edge and collapses one level
 * This means that a node with only one edge will be clustered with its connected node
 *
 * @private
 * @param {Boolean} force
 */
Cluster.prototype._formClusters = function(force) {
  if (force == false) {
    this._formClustersByZoom();
  }
  else {
    this._forceClustersByZoom();
  }
};

/**
 * This function handles the clustering by zooming out, this is based on a minimum edge distance
 *
 * @private
 */
Cluster.prototype._formClustersByZoom = function() {
  var dx,dy,length,
      minLength = this.constants.clustering.clusterLength/this.scale;

  // check if any edges are shorter than minLength and start the clustering
  // the clustering favours the node with the larger mass
  for (var edgeID in this.edges) {
    if (this.edges.hasOwnProperty(edgeID)) {
      var edge = this.edges[edgeID];
      if (edge.connected) {
        dx = (edge.to.x - edge.from.x);
        dy = (edge.to.y - edge.from.y);
        length = Math.sqrt(dx * dx + dy * dy);


        if (length < minLength) {
          // first check which node is larger
          var parentNode = edge.from;
          var childNode = edge.to;
          if (edge.to.mass > edge.from.mass) {
            parentNode = edge.to;
            childNode = edge.from;
          }

          if (childNode.dynamicEdgesLength == 1) {
            this._addToCluster(parentNode,childNode,false);
          }
          else if (parentNode.dynamicEdgesLength == 1) {
            this._addToCluster(childNode,parentNode,false);
          }
        }
      }
    }
  }
};

/**
 * This function forces the graph to cluster all nodes with only one connecting edge to their
 * connected node.
 *
 * @private
 */
Cluster.prototype._forceClustersByZoom = function() {
  for (var nodeID in this.nodes) {
    // another node could have absorbed this child.
    if (this.nodes.hasOwnProperty(nodeID)) {
      var childNode = this.nodes[nodeID];

      // the edges can be swallowed by another decrease
      if (childNode.dynamicEdgesLength == 1 && childNode.dynamicEdges.length != 0) {
        var edge = childNode.dynamicEdges[0];
        var parentNode = (edge.toId == childNode.id) ? this.nodes[edge.fromId] : this.nodes[edge.toId];

        // group to the largest node
        if (parentNode.mass > childNode.mass) {
          this._addToCluster(parentNode,childNode,true);
        }
        else {
          this._addToCluster(childNode,parentNode,true);
        }
      }
    }
  }
};



/**
 *
 * @param {Boolean} force
 * @private
 */
Cluster.prototype._clusterByHub = function(force) {
  var dx,dy,length;
  var minLength = this.constants.clustering.clusterLength/this.scale;
  var allowCluster = false;

  // we loop over all nodes in the list
  for (var nodeID in this.nodes) {
    // we check if it is still available since it can be used by the clustering in this loop
    if (this.nodes.hasOwnProperty(nodeID)) {
      var hubNode = this.nodes[nodeID];

      // we decide if the node is a hub
      if (hubNode.dynamicEdgesLength >= this.hubThreshold) {
        // we create a list of edges because the dynamicEdges change over the course of this loop
        var edgesIDarray = [];
        var amountOfInitialEdges = hubNode.dynamicEdges.length;
        for (var j = 0; j < amountOfInitialEdges; j++) {
          edgesIDarray.push(hubNode.dynamicEdges[j].id);
        }

        // if the hub clustering is not forces, we check if one of the edges connected
        // to a cluster is small enough based on the constants.clustering.clusterLength
        if (force == false) {
          allowCluster = false;
          for (j = 0; j < amountOfInitialEdges; j++) {
            var edge = this.edges[edgesIDarray[j]];
            if (edge !== undefined) {
              if (edge.connected) {
                dx = (edge.to.x - edge.from.x);
                dy = (edge.to.y - edge.from.y);
                length = Math.sqrt(dx * dx + dy * dy);

                if (length < minLength) {
                  allowCluster = true;
                  break;
                }
              }
            }
          }
        }

        // start the clustering if allowed
        if ((!force && allowCluster) || force) {
          // we loop over all edges INITIALLY connected to this hub
          for (j = 0; j < amountOfInitialEdges; j++) {
            edge = this.edges[edgesIDarray[j]];

            // the edge can be clustered by this function in a previous loop
            if (edge !== undefined) {
              var childNode = this.nodes[(edge.fromId == hubNode.id) ? edge.toId : edge.fromId];

              // we do not want hubs to merge with other hubs.
              if (childNode.dynamicEdges.length <= this.hubThreshold) {
                this._addToCluster(hubNode,childNode,force);
              }
            }
          }
        }
      }
    }
  }
};




/**
 * This function adds the child node to the parent node, creating a cluster if it is not already.
 * This function is called only from updateClusters()
 *
 * @param {Node} parentNode           | this is the node that will house the child node
 * @param {Node} childNode            | this node will be deleted from the global this.nodes and stored in the parent node
 * @param {Boolean} force             | true will only update the remainingEdges at the very end of the clustering, ensuring single level collapse
 * @private
 */
Cluster.prototype._addToCluster = function(parentNode, childNode, force) {
  // join child node in the parent node
  parentNode.containedNodes[childNode.id] = childNode;

  // manage all the edges connected to the child and parent nodes
  for (var i = 0; i < childNode.dynamicEdges.length; i++) {
    var edge = childNode.dynamicEdges[i];
    if (edge.toId == parentNode.id || edge.fromId == parentNode.id) { // edge connected to parentNode
      this._addToContainedEdges(parentNode,childNode,edge);
    }
    else {
      this._connectEdgeToCluster(parentNode,childNode,edge);
    }
  }
  childNode.dynamicEdges = [];

  // remove the childNode from the global nodes object
  delete this.nodes[childNode.id];

  var massBefore = parentNode.mass;

  childNode.clusterSession = this.clusterSession;
  parentNode.mass += this.constants.clustering.massTransferCoefficient * childNode.mass;
  parentNode.clusterSize += childNode.clusterSize;
  parentNode.fontSize += this.constants.clustering.fontSizeMultiplier * childNode.clusterSize;

  // keep track of the clustersessions so we can open the cluster up as it has been formed.
  if (parentNode.clusterSessions[parentNode.clusterSessions.length - 1] != this.clusterSession) {
    parentNode.clusterSessions.push(this.clusterSession);
  }

  // giving the clusters a dynamic formationScale to ensure not all clusters open up when zoomed
  if (force == true) {
    parentNode.formationScale = Math.pow(1 - (1.0/11.0),this.clusterSession+2);
  }
  else {
    parentNode.formationScale = this.scale; // The latest child has been added on this scale
  }

  // recalculate the size of the node on the next time the node is rendered
  parentNode.clearSizeCache();

  // set the pop-out scale for the childnode
  parentNode.containedNodes[childNode.id].formationScale = parentNode.formationScale;

  // nullify the movement velocity of the child, this is to avoid hectic behaviour
  childNode.clearVelocity();

  // the mass has altered, preservation of energy dictates the velocity to be updated
  parentNode.updateVelocity(massBefore);


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

    // this corrects for multiple edges pointing at the same other node
    var correction = 0;
    if (node.dynamicEdgesLength > 1) {
      for (var j = 0; j < node.dynamicEdgesLength - 1; j++) {
        var edgeToId = node.dynamicEdges[j].toId;
        var edgeFromId = node.dynamicEdges[j].fromId;
        for (var k = j+1; k < node.dynamicEdgesLength; k++) {
          if ((node.dynamicEdges[k].toId == edgeToId && node.dynamicEdges[k].fromId == edgeFromId) ||
              (node.dynamicEdges[k].fromId == edgeToId && node.dynamicEdges[k].toId == edgeFromId)) {
            correction += 1;
          }
        }
      }
    }

    node.dynamicEdgesLength -= correction;
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
  if (parentNode.reroutedEdges.hasOwnProperty(childNode.id)) {
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
 * When loops are clustered, an edge can be both in the rerouted array and the contained array.
 * This function is called last to verify that all edges in dynamicEdges are in fact connected to the
 * parentNode
 *
 * @param parentNode    | Node object
 * @private
 */
Cluster.prototype._validateEdges = function(parentNode) {
  // TODO: check if good idea
  for (var i = 0; i < parentNode.dynamicEdges.length; i++) {
    var edge = parentNode.dynamicEdges[i];
    if (parentNode.id != edge.toId && parentNode.id != edge.fromId) {
      parentNode.dynamicEdges.splice(i,1);
    }
  }
};


/**
 * This function released the contained edges back into the global domain and puts them back into the
 * dynamic edges of both parent and child.
 *
 * @param {Node} parentNode    |
 * @param {Node} childNode     |
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




// ------------------- UTILITY FUNCTIONS ---------------------------- //


/**
 * This updates the node labels for all nodes (for debugging purposes)
 * @private
 */
Cluster.prototype._updateLabels = function() {
  var nodeID;
  // update node labels
  for (nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      var node = this.nodes[nodeID];
      if (node.clusterSize > 1) {
        node.label = "[".concat(String(node.clusterSize),"]");
      }
    }
  }

  // update node labels
  for (nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      node = this.nodes[nodeID];
      if (node.clusterSize == 1) {
        node.label = String(node.id);
      }
    }
  }

  /* Debug Override */
  for (nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      node = this.nodes[nodeID];
      node.label = String(node.clusterSize).concat(":",String(node.id));
    }
  }

};


/**
 * This function determines if the cluster we want to decluster is in the active area
 * this means around the zoom center
 *
 * @param {Node} node
 * @returns {boolean}
 * @private
 */
Cluster.prototype._parentNodeInActiveArea = function(node) {
  return (
    Math.abs(node.x - this.zoomCenter.x) <= this.constants.clustering.activeAreaBoxSize/this.scale
      &&
    Math.abs(node.y - this.zoomCenter.y) <= this.constants.clustering.activeAreaBoxSize/this.scale
    )
};


/**
 * This is an adaptation of the original repositioning function. This is called if the system is clustered initially
 * It puts large clusters away from the center and randomizes the order.
 *
 * @private
 */
Cluster.prototype._repositionNodes = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    if (!node.isFixed()) {
      var radius = this.constants.edges.length * (1 + 0.6*node.clusterSize);
      var angle = 2 * Math.PI * Math.random();
      node.x = radius * Math.cos(angle);
      node.y = radius * Math.sin(angle);
    }
  }
};





/**
 * We determine how many connections denote an important hub.
 * We take the mean + 2*std as the important hub size. (Assuming a normal distribution of data, ~2.2%)
 *
 * @private
 */
Cluster.prototype._getHubSize = function() {
  var average = 0;
  var averageSquared = 0;
  var hubCounter = 0;
  var largestHub = 0;

  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    if (node.dynamicEdgesLength > largestHub) {
      largestHub = node.dynamicEdgesLength;
    }
    average += node.dynamicEdgesLength;
    averageSquared += Math.pow(node.dynamicEdgesLength,2);
    hubCounter += 1;
  }
  average = average / hubCounter;
  averageSquared = averageSquared / hubCounter;

  var variance = averageSquared - Math.pow(average,2);

  var standardDeviation = Math.sqrt(variance);

  this.hubThreshold = Math.floor(average + 2*standardDeviation);

  // always have at least one to cluster
  if (this.hubThreshold > largestHub) {
    this.hubThreshold = largestHub;
  }

//  console.log("average",average,"averageSQ",averageSquared,"var",variance,"std",standardDeviation);
//  console.log("hubThreshold:",this.hubThreshold);
};


/**
 * We get the amount of "extension nodes" or snakes. These are not quickly clustered with the outliers and hubs methods
 * with this amount we can cluster specifically on these snakes.
 *
 * @returns {number}
 * @private
 */
Cluster.prototype._getAmountOfSnakes = function() {
  var snakes = 0;
  for (nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      if (this.nodes[nodeID].dynamicEdges.length == 2) {
        snakes += 1;
      }
    }
  }
  return snakes;
};