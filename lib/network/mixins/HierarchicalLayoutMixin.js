exports._resetLevels = function() {
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      var node = this.nodes[nodeId];
      if (node.preassignedLevel == false) {
        node.level = -1;
        node.hierarchyEnumerated = false;
      }
    }
  }
};

/**
 * This is the main function to layout the nodes in a hierarchical way.
 * It checks if the node details are supplied correctly
 *
 * @private
 */
exports._setupHierarchicalLayout = function() {
  if (this.constants.hierarchicalLayout.enabled == true && this.nodeIndices.length > 0) {
    // get the size of the largest hubs and check if the user has defined a level for a node.
    var hubsize = 0;
    var node, nodeId;
    var definedLevel = false;
    var undefinedLevel = false;

    for (nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        node = this.nodes[nodeId];
        if (node.level != -1) {
          definedLevel = true;
        }
        else {
          undefinedLevel = true;
        }
        if (hubsize < node.edges.length) {
          hubsize = node.edges.length;
        }
      }
    }

    // if the user defined some levels but not all, alert and run without hierarchical layout
    if (undefinedLevel == true && definedLevel == true) {
      throw new Error("To use the hierarchical layout, nodes require either no predefined levels or levels have to be defined for all nodes.");
      this.zoomExtent({duration:0},true,this.constants.clustering.enabled);
      if (!this.constants.clustering.enabled) {
        this.start();
      }
    }
    else {
      // setup the system to use hierarchical method.
      this._changeConstants();

      // define levels if undefined by the users. Based on hubsize
      if (undefinedLevel == true) {
        if (this.constants.hierarchicalLayout.layout == "hubsize") {
          this._determineLevels(hubsize);
        }
        else {
          this._determineLevelsDirected(false);
        }

      }
      // check the distribution of the nodes per level.
      var distribution = this._getDistribution();

      // place the nodes on the canvas. This also stablilizes the system.
      this._placeNodesByHierarchy(distribution);

      // start the simulation.
      this.start();
    }
  }
};


/**
 * This function places the nodes on the canvas based on the hierarchial distribution.
 *
 * @param {Object} distribution | obtained by the function this._getDistribution()
 * @private
 */
exports._placeNodesByHierarchy = function(distribution) {
  var nodeId, node;

  // start placing all the level 0 nodes first. Then recursively position their branches.
  for (var level in distribution) {
    if (distribution.hasOwnProperty(level)) {

      for (nodeId in distribution[level].nodes) {
        if (distribution[level].nodes.hasOwnProperty(nodeId)) {
          node = distribution[level].nodes[nodeId];
          if (this.constants.hierarchicalLayout.direction == "UD" || this.constants.hierarchicalLayout.direction == "DU") {
            if (node.xFixed) {
              node.x = distribution[level].minPos;
              node.xFixed = false;

              distribution[level].minPos += distribution[level].nodeSpacing;
            }
          }
          else {
            if (node.yFixed) {
              node.y = distribution[level].minPos;
              node.yFixed = false;

              distribution[level].minPos += distribution[level].nodeSpacing;
            }
          }
          this._placeBranchNodes(node.edges,node.id,distribution,node.level);
        }
      }
    }
  }

  // stabilize the system after positioning. This function calls zoomExtent.
  this._stabilize();
};


/**
 * This function get the distribution of levels based on hubsize
 *
 * @returns {Object}
 * @private
 */
exports._getDistribution = function() {
  var distribution = {};
  var nodeId, node, level;

  // we fix Y because the hierarchy is vertical, we fix X so we do not give a node an x position for a second time.
  // the fix of X is removed after the x value has been set.
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      node.xFixed = true;
      node.yFixed = true;
      if (this.constants.hierarchicalLayout.direction == "UD" || this.constants.hierarchicalLayout.direction == "DU") {
        node.y = this.constants.hierarchicalLayout.levelSeparation*node.level;
      }
      else {
        node.x = this.constants.hierarchicalLayout.levelSeparation*node.level;
      }
      if (distribution[node.level] === undefined) {
        distribution[node.level] = {amount: 0, nodes: {}, minPos:0, nodeSpacing:0};
      }
      distribution[node.level].amount += 1;
      distribution[node.level].nodes[nodeId] = node;
    }
  }

  // determine the largest amount of nodes of all levels
  var maxCount = 0;
  for (level in distribution) {
    if (distribution.hasOwnProperty(level)) {
      if (maxCount < distribution[level].amount) {
        maxCount = distribution[level].amount;
      }
    }
  }

  // set the initial position and spacing of each nodes accordingly
  for (level in distribution) {
    if (distribution.hasOwnProperty(level)) {
      distribution[level].nodeSpacing = (maxCount + 1) * this.constants.hierarchicalLayout.nodeSpacing;
      distribution[level].nodeSpacing /= (distribution[level].amount + 1);
      distribution[level].minPos = distribution[level].nodeSpacing - (0.5 * (distribution[level].amount + 1) * distribution[level].nodeSpacing);
    }
  }

  return distribution;
};


/**
 * this function allocates nodes in levels based on the recursive branching from the largest hubs.
 *
 * @param hubsize
 * @private
 */
exports._determineLevels = function(hubsize) {
  var nodeId, node;

  // determine hubs
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      if (node.edges.length == hubsize) {
        node.level = 0;
      }
    }
  }

  // branch from hubs
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      if (node.level == 0) {
        this._setLevel(1,node.edges,node.id);
      }
    }
  }
};



/**
 * this function allocates nodes in levels based on the direction of the edges
 *
 * @param hubsize
 * @private
 */
exports._determineLevelsDirected = function() {
  var nodeId, node, firstNode;
  var minLevel = 10000;

  // set first node to source
  firstNode = this.nodes[this.nodeIndices[0]];
  firstNode.level = minLevel;
  this._setLevelDirected(minLevel,firstNode.edges,firstNode.id);

  // get the minimum level
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      minLevel = node.level < minLevel ? node.level : minLevel;
    }
  }

  // subtract the minimum from the set so we have a range starting from 0
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      node.level -= minLevel;
    }
  }
};


/**
 * Since hierarchical layout does not support:
 *    - smooth curves (based on the physics),
 *    - clustering (based on dynamic node counts)
 *
 * We disable both features so there will be no problems.
 *
 * @private
 */
exports._changeConstants = function() {
  this.constants.clustering.enabled = false;
  this.constants.physics.barnesHut.enabled = false;
  this.constants.physics.hierarchicalRepulsion.enabled = true;
  this._loadSelectedForceSolver();
  if (this.constants.smoothCurves.enabled == true) {
    this.constants.smoothCurves.dynamic = false;
  }
  this._configureSmoothCurves();

  var config = this.constants.hierarchicalLayout;
  config.levelSeparation = Math.abs(config.levelSeparation);
  if (config.direction == "RL" || config.direction == "DU") {
    config.levelSeparation *= -1;
  }

  if (config.direction == "RL" || config.direction == "LR") {
    if (this.constants.smoothCurves.enabled == true) {
      this.constants.smoothCurves.type = "vertical";
    }
  }
  else {
    if (this.constants.smoothCurves.enabled == true) {
      this.constants.smoothCurves.type = "horizontal";
    }
  }
};


/**
 * This is a recursively called function to enumerate the branches from the largest hubs and place the nodes
 * on a X position that ensures there will be no overlap.
 *
 * @param edges
 * @param parentId
 * @param distribution
 * @param parentLevel
 * @private
 */
exports._placeBranchNodes = function(edges, parentId, distribution, parentLevel) {
  for (var i = 0; i < edges.length; i++) {
    var childNode = null;
    if (edges[i].toId == parentId) {
      childNode = edges[i].from;
    }
    else {
      childNode = edges[i].to;
    }

    // if a node is conneceted to another node on the same level (or higher (means lower level))!, this is not handled here.
    var nodeMoved = false;
    if (this.constants.hierarchicalLayout.direction == "UD" || this.constants.hierarchicalLayout.direction == "DU") {
      if (childNode.xFixed && childNode.level > parentLevel) {
        childNode.xFixed = false;
        childNode.x = distribution[childNode.level].minPos;
        nodeMoved = true;
      }
    }
    else {
      if (childNode.yFixed && childNode.level > parentLevel) {
        childNode.yFixed = false;
        childNode.y = distribution[childNode.level].minPos;
        nodeMoved = true;
      }
    }

    if (nodeMoved == true) {
      distribution[childNode.level].minPos += distribution[childNode.level].nodeSpacing;
      if (childNode.edges.length > 1) {
        this._placeBranchNodes(childNode.edges,childNode.id,distribution,childNode.level);
      }
    }
  }
};


/**
 * this function is called recursively to enumerate the barnches of the largest hubs and give each node a level.
 *
 * @param level
 * @param edges
 * @param parentId
 * @private
 */
exports._setLevel = function(level, edges, parentId) {
  for (var i = 0; i < edges.length; i++) {
    var childNode = null;
    if (edges[i].toId == parentId) {
      childNode = edges[i].from;
    }
    else {
      childNode = edges[i].to;
    }
    if (childNode.level == -1 || childNode.level > level) {
      childNode.level = level;
      if (childNode.edges.length > 1) {
        this._setLevel(level+1, childNode.edges, childNode.id);
      }
    }
  }
};


/**
 * this function is called recursively to enumerate the branched of the first node and give each node a level based on edge direction
 *
 * @param level
 * @param edges
 * @param parentId
 * @private
 */
exports._setLevelDirected = function(level, edges, parentId) {
  this.nodes[parentId].hierarchyEnumerated = true;
  var childNode, direction;
  for (var i = 0; i < edges.length; i++) {
    direction = 1;
    if (edges[i].toId == parentId) {
      childNode = edges[i].from;
      direction = -1;
    }
    else {
      childNode = edges[i].to;
    }
    if (childNode.level == -1) {
      childNode.level = level + direction;
    }
  }

  for (var i = 0; i < edges.length; i++) {
    if (edges[i].toId == parentId) {childNode = edges[i].from;}
    else {childNode = edges[i].to;}

    if (childNode.edges.length > 1 && childNode.hierarchyEnumerated === false) {
      this._setLevelDirected(childNode.level, childNode.edges, childNode.id);
    }
  }
};


/**
 * Unfix nodes
 *
 * @private
 */
exports._restoreNodes = function() {
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      this.nodes[nodeId].xFixed = false;
      this.nodes[nodeId].yFixed = false;
    }
  }
};
