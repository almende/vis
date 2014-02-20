var HierarchicalLayoutMixin = {


  /**
   * This is the main function to layout the nodes in a hierarchical way.
   * It checks if the node details are supplied correctly
   *
   * @private
   */
  _setupHierarchicalLayout : function() {
    if (this.constants.hierarchicalLayout.enabled == true) {

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
        alert("To use the hierarchical layout, nodes require either no predefined levels or levels have to be defined for all nodes.")
        this.zoomToFit(true,this.constants.clustering.enabled);
        if (!this.constants.clustering.enabled) {
          this.start();
        }
      }
      else {
        // setup the system to use hierarchical method.
        this._changeConstants();

        // define levels if undefined by the users. Based on hubsize
        if (undefinedLevel == true) {
          this._determineLevels(hubsize);
        }
        // check the distribution of the nodes per level.
        var distribution = this._getDistribution();

        // place the nodes on the canvas. This also stablilizes the system.
        this._placeNodesByHierarchy(distribution);

        // start the simulation.
        this.start();
      }
    }
  },


  /**
   * This function places the nodes on the canvas based on the hierarchial distribution.
   *
   * @param {Object} distribution | obtained by the function this._getDistribution()
   * @private
   */
  _placeNodesByHierarchy : function(distribution) {
    var nodeId, node;

    // start placing all the level 0 nodes first. Then recursively position their branches.
    for (nodeId in distribution[0].nodes) {
      if (distribution[0].nodes.hasOwnProperty(nodeId)) {
        node = distribution[0].nodes[nodeId];
        if (node.xFixed) {
          node.x = distribution[0].minPos;
          distribution[0].minPos += distribution[0].nodeSpacing;
          node.xFixed = false;
        }
        this._placeBranchNodes(node.edges,node.id,distribution,node.level);
      }
    }

    // give the nodes a defined width so the zoomToFit can be used. This size is arbitrary.
    for (nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        node = this.nodes[nodeId];
        node.width = 100;
        node.height = 100;
      }
    }

    // stabilize the system after positioning. This function calls zoomToFit.
    this._doStabilize();

    // reset the arbitrary width and height we gave the nodes.
    for (nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        this.nodes[nodeId]._reset();
      }
    }
  },


  /**
   * This function get the distribution of levels based on hubsize
   *
   * @returns {Object}
   * @private
   */
  _getDistribution : function() {
    var distribution = {};
    var nodeId, node;

    // we fix Y because the hierarchy is vertical, we fix X so we do not give a node an x position for a second time.
    // the fix of X is removed after the x value has been set.
    for (nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        node = this.nodes[nodeId];
        node.xFixed = true;
        node.yFixed = true;
        node.y = this.constants.hierarchicalLayout.levelSeparation*node.level;
        if (!distribution.hasOwnProperty(node.level)) {
          distribution[node.level] = {amount: 0, nodes: {}, minPos:0, nodeSpacing:0};
        }
        distribution[node.level].amount += 1;
        distribution[node.level].nodes[node.id] = node;
      }
    }

    // determine the largest amount of nodes of all levels
    var maxCount = 0;
    for (var level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        if (maxCount < distribution[level].amount) {
          maxCount = distribution[level].amount;
        }
      }
    }

    // set the initial position and spacing of each nodes accordingly
    for (var level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        distribution[level].nodeSpacing = (maxCount + 1) * this.constants.hierarchicalLayout.nodeSpacing;
        distribution[level].nodeSpacing /= (distribution[level].amount + 1);
        distribution[level].minPos = distribution[level].nodeSpacing - (0.5 * (distribution[level].amount + 1) * distribution[level].nodeSpacing);
      }
    }

    return distribution;
  },


  /**
   * this function allocates nodes in levels based on the recursive branching from the largest hubs.
   *
   * @param hubsize
   * @private
   */
  _determineLevels : function(hubsize) {
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
  },


  /**
   * Since hierarchical layout does not support:
   *    - smooth curves (based on the physics),
   *    - clustering (based on dynamic node counts)
   *
   * We disable both features so there will be no problems.
   *
   * @private
   */
  _changeConstants : function() {
    this.constants.clustering.enabled = false;
    this.constants.physics.barnesHut.enabled = false;
    this.constants.physics.hierarchicalRepulsion.enabled = true;
    this._loadSelectedForceSolver();
    this.constants.smoothCurves = false;
    this._configureSmoothCurves();
  },


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
  _placeBranchNodes : function(edges, parentId, distribution, parentLevel) {
    for (var i = 0; i < edges.length; i++) {
      var childNode = null;
      if (edges[i].toId == parentId) {
        childNode = edges[i].from;
      }
      else {
        childNode = edges[i].to;
      }

      // if a node is conneceted to another node on the same level (or higher (means lower level))!, this is not handled here.
      if (childNode.xFixed && childNode.level > parentLevel) {
        childNode.xFixed = false;
        childNode.x = distribution[childNode.level].minPos;
        distribution[childNode.level].minPos += distribution[childNode.level].nodeSpacing;
        if (childNode.edges.length > 1) {
          this._placeBranchNodes(childNode.edges,childNode.id,distribution,childNode.level);
        }
      }
    }
  },


  /**
   * this function is called recursively to enumerate the barnches of the largest hubs and give each node a level.
   *
   * @param level
   * @param edges
   * @param parentId
   * @private
   */
  _setLevel : function(level, edges, parentId) {
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
        if (edges.length > 1) {
          this._setLevel(level+1, childNode.edges, childNode.id);
        }
      }
    }
  }
};