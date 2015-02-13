/**
 * Creation of the ClusterMixin var.
 *
 * This contains all the functions the Network object can use to employ clustering
 */

/**
* This is only called in the constructor of the network object
*
*/
exports.startWithClustering = function() {
 // cluster if the data set is big
 this.clusterToFit(this.constants.clustering.initialMaxNodes, true);

 // updates the lables after clustering
 this.updateLabels();

 // this is called here because if clusterin is disabled, the start and stabilize are called in
 // the setData function.
 if (this.constants.stabilize == true) {
   this._stabilize();
 }
 this.start();
};

/**
 * This function clusters until the initialMaxNodes has been reached
 *
 * @param {Number}  maxNumberOfNodes
 * @param {Boolean} reposition
 */
exports.clusterToFit = function(maxNumberOfNodes, reposition) {
  var numberOfNodes = this.nodeIndices.length;

  var maxLevels = 50;
  var level = 0;

  // we first cluster the hubs, then we pull in the outliers, repeat
  while (numberOfNodes > maxNumberOfNodes && level < maxLevels) {
    if (level % 3 == 0.0) {
      this.forceAggregateHubs(true);
      this.normalizeClusterLevels();
    }
    else {
      this.increaseClusterLevel(); // this also includes a cluster normalization
    }
    this.forceAggregateHubs(true);
    numberOfNodes = this.nodeIndices.length;
    level += 1;
  }

  // after the clustering we reposition the nodes to reduce the initial chaos
  if (level > 0 && reposition == true) {
    this.repositionNodes();
  }
  this._updateCalculationNodes();
};

/**
 * This function can be called to open up a specific cluster.
 * It will unpack the cluster back one level.
 *
 * @param node    | Node object: cluster to open.
 */
exports.openCluster = function(node) {
  var isMovingBeforeClustering = this.moving;
  if (node.clusterSize > this.constants.clustering.sectorThreshold && this._nodeInActiveArea(node) &&
    !(this._sector() == "default" && this.nodeIndices.length == 1)) {
    // this loads a new sector, loads the nodes and edges and nodeIndices of it.
    this._addSector(node);
    var level = 0;

    // we decluster until we reach a decent number of nodes
    while ((this.nodeIndices.length < this.constants.clustering.initialMaxNodes) && (level < 10)) {
      this.decreaseClusterLevel();
      level += 1;
    }

  }
  else {
    this._expandClusterNode(node,false,true);

    // update the index list and labels
    this._updateNodeIndexList();
    this._updateCalculationNodes();
    this.updateLabels();
  }

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }
};


/**
 * This calls the updateClustes with default arguments
 */
exports.updateClustersDefault = function() {
  if (this.constants.clustering.enabled == true && this.constants.clustering.clusterByZoom == true) {
    this.updateClusters(0,false,false);
  }
};


/**
 * This function can be called to increase the cluster level. This means that the nodes with only one edge connection will
 * be clustered with their connected node. This can be repeated as many times as needed.
 * This can be called externally (by a keybind for instance) to reduce the complexity of big datasets.
 */
exports.increaseClusterLevel = function() {
  this.updateClusters(-1,false,true);
};


/**
 * This function can be called to decrease the cluster level. This means that the nodes with only one edge connection will
 * be unpacked if they are a cluster. This can be repeated as many times as needed.
 * This can be called externally (by a key-bind for instance) to look into clusters without zooming.
 */
exports.decreaseClusterLevel = function() {
  this.updateClusters(1,false,true);
};


/**
 * This is the main clustering function. It clusters and declusters on zoom or forced
 * This function clusters on zoom, it can be called with a predefined zoom direction
 * If out, check if we can form clusters, if in, check if we can open clusters.
 * This function is only called from _zoom()
 *
 * @param {Number} zoomDirection  | -1 / 0 / +1   for  zoomOut / determineByZoom / zoomIn
 * @param {Boolean} recursive     | enabled or disable recursive calling of the opening of clusters
 * @param {Boolean} force         | enabled or disable forcing
 * @param {Boolean} doNotStart    | if true do not call start
 *
 */
exports.updateClusters = function(zoomDirection,recursive,force,doNotStart) {
  var isMovingBeforeClustering = this.moving;
  var amountOfNodes = this.nodeIndices.length;

  var detectedZoomingIn = (this.previousScale < this.scale && zoomDirection == 0);
  var detectedZoomingOut = (this.previousScale > this.scale && zoomDirection == 0);

  // on zoom out collapse the sector if the scale is at the level the sector was made
  if (detectedZoomingOut == true) {
    this._collapseSector();
  }

  // check if we zoom in or out
  if (detectedZoomingOut == true || zoomDirection == -1) { // zoom out
    // forming clusters when forced pulls outliers in. When not forced, the edge length of the
    // outer nodes determines if it is being clustered
    this._formClusters(force);
  }
  else if (detectedZoomingIn == true || zoomDirection == 1) { // zoom in
    if (force == true) {
      // _openClusters checks for each node if the formationScale of the cluster is smaller than
      // the current scale and if so, declusters. When forced, all clusters are reduced by one step
      this._openClusters(recursive,force);
    }
    else {
      // if a cluster takes up a set percentage of the active window
      //this._openClustersBySize();
      this._openClusters(recursive, false);
    }
  }
  this._updateNodeIndexList();

  // if a cluster was NOT formed and the user zoomed out, we try clustering by hubs
  if (this.nodeIndices.length == amountOfNodes && (detectedZoomingOut == true || zoomDirection == -1))  {
    this._aggregateHubs(force);
    this._updateNodeIndexList();
  }

  // we now reduce chains.
  if (detectedZoomingOut == true || zoomDirection == -1) { // zoom out
    this.handleChains();
    this._updateNodeIndexList();
  }

  this.previousScale = this.scale;

  // update labels
  this.updateLabels();

  // if a cluster was formed, we increase the clusterSession
  if (this.nodeIndices.length < amountOfNodes) { // this means a clustering operation has taken place
    this.clusterSession += 1;
    // if clusters have been made, we normalize the cluster level
    this.normalizeClusterLevels();
  }

  if (doNotStart == false || doNotStart === undefined) {
    // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
    if (this.moving != isMovingBeforeClustering) {
      this.start();
    }
  }

  this._updateCalculationNodes();
};

/**
 * This function handles the chains. It is called on every updateClusters().
 */
exports.handleChains = function() {
  // after clustering we check how many chains there are
  var chainPercentage = this._getChainFraction();
  if (chainPercentage > this.constants.clustering.chainThreshold) {
    this._reduceAmountOfChains(1 - this.constants.clustering.chainThreshold / chainPercentage)

  }
};

/**
 * this functions starts clustering by hubs
 * The minimum hub threshold is set globally
 *
 * @private
 */
exports._aggregateHubs = function(force) {
  this._getHubSize();
  this._formClustersByHub(force,false);
};


/**
 * This function forces hubs to form.
 *
 */
exports.forceAggregateHubs = function(doNotStart) {
  var isMovingBeforeClustering = this.moving;
  var amountOfNodes = this.nodeIndices.length;

  this._aggregateHubs(true);

  // update the index list, dynamic edges and labels
  this._updateNodeIndexList();
  this.updateLabels();

  this._updateCalculationNodes();

  // if a cluster was formed, we increase the clusterSession
  if (this.nodeIndices.length != amountOfNodes) {
    this.clusterSession += 1;
  }

  if (doNotStart == false || doNotStart === undefined) {
    // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
    if (this.moving != isMovingBeforeClustering) {
      this.start();
    }
  }
};

/**
 * If a cluster takes up more than a set percentage of the screen, open the cluster
 *
 * @private
 */
exports._openClustersBySize = function() {
  if (this.constants.clustering.clusterByZoom == true) {
    for (var nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        var node = this.nodes[nodeId];
        if (node.inView() == true) {
          if ((node.width * this.scale > this.constants.clustering.screenSizeThreshold * this.frame.canvas.clientWidth) ||
            (node.height * this.scale > this.constants.clustering.screenSizeThreshold * this.frame.canvas.clientHeight)) {
            this.openCluster(node);
          }
        }
      }
    }
  }
};


/**
 * This function loops over all nodes in the nodeIndices list. For each node it checks if it is a cluster and if it
 * has to be opened based on the current zoom level.
 *
 * @private
 */
exports._openClusters = function(recursive,force) {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    this._expandClusterNode(node,recursive,force);
    this._updateCalculationNodes();
  }
};

/**
 * This function checks if a node has to be opened. This is done by checking the zoom level.
 * If the node contains child nodes, this function is recursively called on the child nodes as well.
 * This recursive behaviour is optional and can be set by the recursive argument.
 *
 * @param {Node}    parentNode    | to check for cluster and expand
 * @param {Boolean} recursive     | enabled or disable recursive calling
 * @param {Boolean} force         | enabled or disable forcing
 * @param {Boolean} [openAll]     | This will recursively force all nodes in the parent to be released
 * @private
 */
exports._expandClusterNode = function(parentNode, recursive, force, openAll) {
  // first check if node is a cluster
  if (parentNode.clusterSize > 1) {
    if (openAll === undefined) {
      openAll = false;
    }
    // this means that on a double tap event or a zoom event, the cluster fully unpacks if it is smaller than 20

    recursive = openAll || recursive;
    // if the last child has been added on a smaller scale than current scale decluster
    if (parentNode.formationScale < this.scale || force == true) {
      // we will check if any of the contained child nodes should be removed from the cluster
      for (var containedNodeId in parentNode.containedNodes) {
        if (parentNode.containedNodes.hasOwnProperty(containedNodeId)) {
          var childNode = parentNode.containedNodes[containedNodeId];

          // force expand will expand the largest cluster size clusters. Since we cluster from outside in, we assume that
          // the largest cluster is the one that comes from outside
          if (force == true) {
            if (childNode.clusterSession == parentNode.clusterSessions[parentNode.clusterSessions.length-1]
                || openAll) {
              this._expelChildFromParent(parentNode,containedNodeId,recursive,force,openAll);
            }
          }
          else {
            if (this._nodeInActiveArea(parentNode)) {
              this._expelChildFromParent(parentNode,containedNodeId,recursive,force,openAll);
            }
          }
        }
      }
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
 * @param {String}  containedNodeId   | child_node id as it is contained in the containedNodes object of the parent node
 * @param {Boolean} recursive         | This will also check if the child needs to be expanded.
 *                                      With force and recursive both true, the entire cluster is unpacked
 * @param {Boolean} force             | This will disregard the zoom level and will expel this child from the parent
 * @param {Boolean} openAll           | This will recursively force all nodes in the parent to be released
 * @private
 */
exports._expelChildFromParent = function(parentNode, containedNodeId, recursive, force, openAll) {
  var childNode = parentNode.containedNodes[containedNodeId]

  // if child node has been added on smaller scale than current, kick out
  if (childNode.formationScale < this.scale || force == true) {
    // unselect all selected items
    this._unselectAll();

    // put the child node back in the global nodes object
    this.nodes[containedNodeId] = childNode;

    // release the contained edges from this childNode back into the global edges
    this._releaseContainedEdges(parentNode,childNode);

    // reconnect rerouted edges to the childNode
    this._connectEdgeBackToChild(parentNode,childNode);

    // validate all edges in dynamicEdges
    this._validateEdges(parentNode);

    // undo the changes from the clustering operation on the parent node
    parentNode.options.mass -= childNode.options.mass;
    parentNode.clusterSize -= childNode.clusterSize;
    parentNode.options.fontSize = Math.min(this.constants.clustering.maxFontSize, this.constants.nodes.fontSize + this.constants.clustering.fontSizeMultiplier*(parentNode.clusterSize-1));

    // place the child node near the parent, not at the exact same location to avoid chaos in the system
    childNode.x = parentNode.x + parentNode.growthIndicator * (0.5 - Math.random());
    childNode.y = parentNode.y + parentNode.growthIndicator * (0.5 - Math.random());

    // remove node from the list
    delete parentNode.containedNodes[containedNodeId];

    // check if there are other childs with this clusterSession in the parent.
    var othersPresent = false;
    for (var childNodeId in parentNode.containedNodes) {
      if (parentNode.containedNodes.hasOwnProperty(childNodeId)) {
        if (parentNode.containedNodes[childNodeId].clusterSession == childNode.clusterSession) {
          othersPresent = true;
          break;
        }
      }
    }
    // if there are no others, remove the cluster session from the list
    if (othersPresent == false) {
      parentNode.clusterSessions.pop();
    }

    this._repositionBezierNodes(childNode);
//      this._repositionBezierNodes(parentNode);

    // remove the clusterSession from the child node
    childNode.clusterSession = 0;

    // recalculate the size of the node on the next time the node is rendered
    parentNode.clearSizeCache();

    // restart the simulation to reorganise all nodes
    this.moving = true;
  }

  // check if a further expansion step is possible if recursivity is enabled
  if (recursive == true) {
    this._expandClusterNode(childNode,recursive,force,openAll);
  }
};


/**
 * position the bezier nodes at the center of the edges
 *
 * @param node
 * @private
 */
exports._repositionBezierNodes = function(node) {
  for (var i = 0; i < node.dynamicEdges.length; i++) {
    node.dynamicEdges[i].positionBezierNode();
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
exports._formClusters = function(force) {
  if (force == false) {
    if (this.constants.clustering.clusterByZoom == true) {
      this._formClustersByZoom();
    }
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
exports._formClustersByZoom = function() {
  var dx,dy,length;
  var minLength = this.constants.clustering.clusterEdgeThreshold/this.scale;

  // check if any edges are shorter than minLength and start the clustering
  // the clustering favours the node with the larger mass
  for (var edgeId in this.edges) {
    if (this.edges.hasOwnProperty(edgeId)) {
      var edge = this.edges[edgeId];
      if (edge.connected) {
        if (edge.toId != edge.fromId) {
          dx = (edge.to.x - edge.from.x);
          dy = (edge.to.y - edge.from.y);
          length = Math.sqrt(dx * dx + dy * dy);


          if (length < minLength) {
            // first check which node is larger
            var parentNode = edge.from;
            var childNode = edge.to;
            if (edge.to.options.mass > edge.from.options.mass) {
              parentNode = edge.to;
              childNode = edge.from;
            }

            if (childNode.dynamicEdges.length == 1) {
              this._addToCluster(parentNode,childNode,false);
            }
            else if (parentNode.dynamicEdges.length == 1) {
              this._addToCluster(childNode,parentNode,false);
            }
          }
        }
      }
    }
  }
};

/**
 * This function forces the network to cluster all nodes with only one connecting edge to their
 * connected node.
 *
 * @private
 */
exports._forceClustersByZoom = function() {
  for (var nodeId in this.nodes) {
    // another node could have absorbed this child.
    if (this.nodes.hasOwnProperty(nodeId)) {
      var childNode = this.nodes[nodeId];

      // the edges can be swallowed by another decrease
      if (childNode.dynamicEdges.length == 1) {
        var edge = childNode.dynamicEdges[0];
        var parentNode = (edge.toId == childNode.id) ? this.nodes[edge.fromId] : this.nodes[edge.toId];
        // group to the largest node
        if (childNode.id != parentNode.id) {
          if (parentNode.options.mass > childNode.options.mass) {
            this._addToCluster(parentNode,childNode,true);
          }
          else {
            this._addToCluster(childNode,parentNode,true);
          }
        }
      }
    }
  }
};


/**
 * To keep the nodes of roughly equal size we normalize the cluster levels.
 * This function clusters a node to its smallest connected neighbour.
 *
 * @param node
 * @private
 */
exports._clusterToSmallestNeighbour = function(node) {
  var smallestNeighbour = -1;
  var smallestNeighbourNode = null;
  for (var i = 0; i < node.dynamicEdges.length; i++) {
    if (node.dynamicEdges[i] !== undefined) {
      var neighbour = null;
      if (node.dynamicEdges[i].fromId != node.id) {
        neighbour = node.dynamicEdges[i].from;
      }
      else if (node.dynamicEdges[i].toId != node.id) {
        neighbour = node.dynamicEdges[i].to;
      }


      if (neighbour != null && smallestNeighbour > neighbour.clusterSessions.length) {
        smallestNeighbour = neighbour.clusterSessions.length;
        smallestNeighbourNode = neighbour;
      }
    }
  }

  if (neighbour != null && this.nodes[neighbour.id] !== undefined) {
    this._addToCluster(neighbour, node, true);
  }
};


/**
 * This function forms clusters from hubs, it loops over all nodes
 *
 * @param {Boolean} force         |   Disregard zoom level
 * @param {Boolean} onlyEqual     |   This only clusters a hub with a specific number of edges
 * @private
 */
exports._formClustersByHub = function(force, onlyEqual) {
  // we loop over all nodes in the list
  for (var nodeId in this.nodes) {
    // we check if it is still available since it can be used by the clustering in this loop
    if (this.nodes.hasOwnProperty(nodeId)) {
      this._formClusterFromHub(this.nodes[nodeId],force,onlyEqual);
    }
  }
};

/**
 * This function forms a cluster from a specific preselected hub node
 *
 * @param {Node}    hubNode       |   the node we will cluster as a hub
 * @param {Boolean} force         |   Disregard zoom level
 * @param {Boolean} onlyEqual     |   This only clusters a hub with a specific number of edges
 * @param {Number} [absorptionSizeOffset] |
 * @private
 */
exports._formClusterFromHub = function(hubNode, force, onlyEqual, absorptionSizeOffset) {
  if (absorptionSizeOffset === undefined) {
    absorptionSizeOffset = 0;
  }
  //this.hubThreshold = 43
  //if (hubNode.dynamicEdgesLength < 0) {
  // console.error(hubNode.dynamicEdgesLength, this.hubThreshold, onlyEqual)
  //}
  // we decide if the node is a hub
  if ((hubNode.dynamicEdges.length >= this.hubThreshold && onlyEqual == false) ||
    (hubNode.dynamicEdges.length == this.hubThreshold && onlyEqual == true)) {
    // initialize variables
    var dx,dy,length;
    var minLength = this.constants.clustering.clusterEdgeThreshold/this.scale;
    var allowCluster = false;

    // we create a list of edges because the dynamicEdges change over the course of this loop
    var edgesIdarray = [];
    var amountOfInitialEdges = hubNode.dynamicEdges.length;
    for (var j = 0; j < amountOfInitialEdges; j++) {
      edgesIdarray.push(hubNode.dynamicEdges[j].id);
    }

    // if the hub clustering is not forced, we check if one of the edges connected
    // to a cluster is small enough based on the constants.clustering.clusterEdgeThreshold
    if (force == false) {
      allowCluster = false;
      for (j = 0; j < amountOfInitialEdges; j++) {
        var edge = this.edges[edgesIdarray[j]];
        if (edge !== undefined) {
          if (edge.connected) {
            if (edge.toId != edge.fromId) {
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
    }

    // start the clustering if allowed
    if ((!force && allowCluster) || force) {
      var children = [];
      var childrenIds = {};
      // we loop over all edges INITIALLY connected to this hub to get a list of the childNodes
      for (j = 0; j < amountOfInitialEdges; j++) {
        edge = this.edges[edgesIdarray[j]];
        var childNode = this.nodes[(edge.fromId == hubNode.id) ? edge.toId : edge.fromId];
        if (childrenIds[childNode.id] === undefined) {
          childrenIds[childNode.id] = true;
          children.push(childNode);
        }
      }

      for (j = 0; j < children.length; j++) {
        var childNode = children[j];
        // we do not want hubs to merge with other hubs nor do we want to cluster itself.
        if ((childNode.dynamicEdges.length <= (this.hubThreshold + absorptionSizeOffset)) &&
          (childNode.id != hubNode.id)) {
          this._addToCluster(hubNode,childNode,force);

        }
        else {
          //console.log("WILL NOT MERGE:",childNode.dynamicEdges.length , (this.hubThreshold + absorptionSizeOffset))
        }
      }

    }
  }
};



/**
 * This function adds the child node to the parent node, creating a cluster if it is not already.
 *
 * @param {Node} parentNode           | this is the node that will house the child node
 * @param {Node} childNode            | this node will be deleted from the global this.nodes and stored in the parent node
 * @param {Boolean} force             | true will only update the remainingEdges at the very end of the clustering, ensuring single level collapse
 * @private
 */
exports._addToCluster = function(parentNode, childNode, force) {
  // join child node in the parent node
  parentNode.containedNodes[childNode.id] = childNode;
  //console.log(parentNode.id, childNode.id)
  // manage all the edges connected to the child and parent nodes
  for (var i = 0; i < childNode.dynamicEdges.length; i++) {
    var edge = childNode.dynamicEdges[i];
    if (edge.toId == parentNode.id || edge.fromId == parentNode.id) { // edge connected to parentNode
      //console.log("COLLECT",parentNode.id, childNode.id, edge.toId, edge.fromId)
      this._addToContainedEdges(parentNode,childNode,edge);
    }
    else {
      //console.log("REWIRE",parentNode.id, childNode.id, edge.toId, edge.fromId)
      this._connectEdgeToCluster(parentNode,childNode,edge);
    }
  }
  // a contained node has no dynamic edges.
  childNode.dynamicEdges = [];

  // remove circular edges from clusters
  this._containCircularEdgesFromNode(parentNode,childNode);


  // remove the childNode from the global nodes object
  delete this.nodes[childNode.id];

  // update the properties of the child and parent
  var massBefore = parentNode.options.mass;
  childNode.clusterSession = this.clusterSession;
  parentNode.options.mass += childNode.options.mass;
  parentNode.clusterSize += childNode.clusterSize;
  parentNode.options.fontSize = Math.min(this.constants.clustering.maxFontSize, this.constants.nodes.fontSize + this.constants.clustering.fontSizeMultiplier*parentNode.clusterSize);

  // keep track of the clustersessions so we can open the cluster up as it has been formed.
  if (parentNode.clusterSessions[parentNode.clusterSessions.length - 1] != this.clusterSession) {
    parentNode.clusterSessions.push(this.clusterSession);
  }

  // forced clusters only open from screen size and double tap
  if (force == true) {
    parentNode.formationScale = 0;
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
 * This adds an edge from the childNode to the contained edges of the parent node
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @param edge          | Edge object
 * @private
 */
exports._addToContainedEdges = function(parentNode, childNode, edge) {
  // create an array object if it does not yet exist for this childNode
  if (parentNode.containedEdges[childNode.id] === undefined) {
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
 * It keeps track of which nodes it has been connected to with the originalId array.
 *
 * @param {Node} parentNode    | Node object
 * @param {Node} childNode     | Node object
 * @param {Edge} edge          | Edge object
 * @private
 */
exports._connectEdgeToCluster = function(parentNode, childNode, edge) {
  // handle circular edges
  if (edge.toId == edge.fromId) {
    this._addToContainedEdges(parentNode, childNode, edge);
  }
  else {
    if (edge.toId == childNode.id) {    // edge connected to other node on the "to" side
      edge.originalToId.push(childNode.id);
      edge.to = parentNode;
      edge.toId = parentNode.id;
    }
    else {          // edge connected to other node with the "from" side
      edge.originalFromId.push(childNode.id);
      edge.from = parentNode;
      edge.fromId = parentNode.id;
    }

    this._addToReroutedEdges(parentNode,childNode,edge);
  }
};


/**
 * If a node is connected to itself, a circular edge is drawn. When clustering we want to contain
 * these edges inside of the cluster.
 *
 * @param parentNode
 * @param childNode
 * @private
 */
exports._containCircularEdgesFromNode = function(parentNode, childNode) {
  // manage all the edges connected to the child and parent nodes
  for (var i = 0; i < parentNode.dynamicEdges.length; i++) {
    var edge = parentNode.dynamicEdges[i];
    // handle circular edges
    if (edge.toId == edge.fromId) {
      this._addToContainedEdges(parentNode, childNode, edge);
    }
  }
};


/**
 * This adds an edge from the childNode to the rerouted edges of the parent node
 *
 * @param parentNode    | Node object
 * @param childNode     | Node object
 * @param edge          | Edge object
 * @private
 */
exports._addToReroutedEdges = function(parentNode, childNode, edge) {
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
exports._connectEdgeBackToChild = function(parentNode, childNode) {
  if (parentNode.reroutedEdges.hasOwnProperty(childNode.id)) {
    for (var i = 0; i < parentNode.reroutedEdges[childNode.id].length; i++) {
      var edge = parentNode.reroutedEdges[childNode.id][i];
      if (edge.originalFromId[edge.originalFromId.length-1] == childNode.id) {
        edge.originalFromId.pop();
        edge.fromId = childNode.id;
        edge.from = childNode;
      }
      else {
        edge.originalToId.pop();
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
exports._validateEdges = function(parentNode) {
  var dynamicEdges = []
  for (var i = 0; i < parentNode.dynamicEdges.length; i++) {
    var edge = parentNode.dynamicEdges[i];
    if (parentNode.id == edge.toId || parentNode.id == edge.fromId) {
      dynamicEdges.push(edge);
    }
  }
  parentNode.dynamicEdges = dynamicEdges;
};


/**
 * This function released the contained edges back into the global domain and puts them back into the
 * dynamic edges of both parent and child.
 *
 * @param {Node} parentNode    |
 * @param {Node} childNode     |
 * @private
 */
exports._releaseContainedEdges = function(parentNode, childNode) {
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
 */
exports.updateLabels = function() {
  var nodeId;
  // update node labels
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      var node = this.nodes[nodeId];
      if (node.clusterSize > 1) {
        node.label = "[".concat(String(node.clusterSize),"]");
      }
    }
  }

  // update node labels
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      if (node.clusterSize == 1) {
        if (node.originalLabel !== undefined) {
          node.label = node.originalLabel;
        }
        else {
          node.label = String(node.id);
        }
      }
    }
  }

//    /* Debug Override */
//    for (nodeId in this.nodes) {
//      if (this.nodes.hasOwnProperty(nodeId)) {
//        node = this.nodes[nodeId];
//        node.label = String(node.clusterSize + ":" + node.dynamicEdges.length);
//      }
//    }

};


/**
 * We want to keep the cluster level distribution rather small. This means we do not want unclustered nodes
 * if the rest of the nodes are already a few cluster levels in.
 * To fix this we use this function. It determines the min and max cluster level and sends nodes that have not
 * clustered enough to the clusterToSmallestNeighbours function.
 */
exports.normalizeClusterLevels = function() {
  var maxLevel = 0;
  var minLevel = 1e9;
  var clusterLevel = 0;
  var nodeId;

  // we loop over all nodes in the list
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      clusterLevel = this.nodes[nodeId].clusterSessions.length;
      if (maxLevel < clusterLevel) {maxLevel = clusterLevel;}
      if (minLevel > clusterLevel) {minLevel = clusterLevel;}
    }
  }

  if (maxLevel - minLevel > this.constants.clustering.clusterLevelDifference) {
    var amountOfNodes = this.nodeIndices.length;
    var targetLevel = maxLevel - this.constants.clustering.clusterLevelDifference;
    // we loop over all nodes in the list
    for (nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        if (this.nodes[nodeId].clusterSessions.length < targetLevel) {
          this._clusterToSmallestNeighbour(this.nodes[nodeId]);
        }
      }
    }
    this._updateNodeIndexList();
    // if a cluster was formed, we increase the clusterSession
    if (this.nodeIndices.length != amountOfNodes) {
      this.clusterSession += 1;
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
exports._nodeInActiveArea = function(node) {
  return (
    Math.abs(node.x - this.areaCenter.x) <= this.constants.clustering.activeAreaBoxSize/this.scale
      &&
    Math.abs(node.y - this.areaCenter.y) <= this.constants.clustering.activeAreaBoxSize/this.scale
    )
};


/**
 * This is an adaptation of the original repositioning function. This is called if the system is clustered initially
 * It puts large clusters away from the center and randomizes the order.
 *
 */
exports.repositionNodes = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    if ((node.xFixed == false || node.yFixed == false)) {
      var radius = 10 * 0.1*this.nodeIndices.length * Math.min(100,node.options.mass);
      var angle = 2 * Math.PI * Math.random();
      if (node.xFixed == false) {node.x = radius * Math.cos(angle);}
      if (node.yFixed == false) {node.y = radius * Math.sin(angle);}
      this._repositionBezierNodes(node);
    }
  }
};


/**
 * We determine how many connections denote an important hub.
 * We take the mean + 2*std as the important hub size. (Assuming a normal distribution of data, ~2.2%)
 *
 * @private
 */
exports._getHubSize = function() {
  var average = 0;
  var averageSquared = 0;
  var hubCounter = 0;
  var largestHub = 0;

  for (var i = 0; i < this.nodeIndices.length; i++) {

    var node = this.nodes[this.nodeIndices[i]];
    if (node.dynamicEdges.length > largestHub) {
      largestHub = node.dynamicEdges.length;
    }
    average += node.dynamicEdges.length;
    averageSquared += Math.pow(node.dynamicEdges.length,2);
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
 * We reduce the amount of "extension nodes" or chains. These are not quickly clustered with the outliers and hubs methods
 * with this amount we can cluster specifically on these chains.
 *
 * @param   {Number} fraction     | between 0 and 1, the percentage of chains to reduce
 * @private
 */
exports._reduceAmountOfChains = function(fraction) {
  this.hubThreshold = 2;
  var reduceAmount = Math.floor(this.nodeIndices.length * fraction);
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      if (this.nodes[nodeId].dynamicEdges.length == 2) {
        if (reduceAmount > 0) {
          this._formClusterFromHub(this.nodes[nodeId],true,true,1);
          reduceAmount -= 1;
        }
      }
    }
  }
};

/**
 * We get the amount of "extension nodes" or chains. These are not quickly clustered with the outliers and hubs methods
 * with this amount we can cluster specifically on these chains.
 *
 * @private
 */
exports._getChainFraction = function() {
  var chains = 0;
  var total = 0;
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      if (this.nodes[nodeId].dynamicEdges.length == 2) {
        chains += 1;
      }
      total += 1;
    }
  }
  return chains/total;
};
