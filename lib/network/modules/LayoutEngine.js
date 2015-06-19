'use strict'

var util = require('../../util');

class LayoutEngine {
  constructor(body) {
    this.body = body;

    this.initialRandomSeed = Math.round(Math.random() * 1000000);
    this.randomSeed = this.initialRandomSeed;
    this.options = {};
    this.optionsBackup = {};

    this.defaultOptions = {
      randomSeed: undefined,
      hierarchical: {
        enabled:false,
        levelSeparation: 150,
        direction: 'UD',   // UD, DU, LR, RL
        sortMethod: 'hubsize' // hubsize, directed
      }
    };
    util.extend(this.options, this.defaultOptions);

    this.hierarchicalLevels = {};

    this.bindEventListeners();
  }

  bindEventListeners() {
    this.body.emitter.on('_dataChanged', () => {
      this.setupHierarchicalLayout();
    });
    this.body.emitter.on('_resetHierarchicalLayout', () => {
      this.setupHierarchicalLayout();
    });
  }

  setOptions(options, allOptions) {
    if (options !== undefined) {
      let prevHierarchicalState = this.options.hierarchical.enabled;

      util.mergeOptions(this.options, options, 'hierarchical');
      if (options.randomSeed !== undefined) {
        this.initialRandomSeed = options.randomSeed;
      }

      if (this.options.hierarchical.enabled === true) {
        // make sure the level seperation is the right way up
        if (this.options.hierarchical.direction === 'RL' || this.options.hierarchical.direction === 'DU') {
          if (this.options.hierarchical.levelSeparation > 0) {
            this.options.hierarchical.levelSeparation *= -1;
          }
        }
        else {
          if (this.options.hierarchical.levelSeparation < 0) {
            this.options.hierarchical.levelSeparation *= -1;
          }
        }

        this.body.emitter.emit('_resetHierarchicalLayout');
        // because the hierarchical system needs it's own physics and smooth curve settings, we adapt the other options if needed.
        return this.adaptAllOptions(allOptions);
      }
      else {
        if (prevHierarchicalState === true) {
          // refresh the overridden options for nodes and edges.
          this.body.emitter.emit('refresh');
          return util.deepExtend(allOptions,this.optionsBackup);
        }
      }
    }
    return allOptions;
  }

  adaptAllOptions(allOptions) {
    if (this.options.hierarchical.enabled === true) {
      // set the physics
      if (allOptions.physics === undefined || allOptions.physics === true) {
        allOptions.physics = {solver: 'hierarchicalRepulsion'};
        this.optionsBackup.physics = {solver:'barnesHut'};
      }
      else if (typeof allOptions.physics === 'object') {
        this.optionsBackup.physics = {solver:'barnesHut'};
        if (allOptions.physics.solver !== undefined) {
          this.optionsBackup.physics = {solver:allOptions.physics.solver};
        }
        allOptions.physics['solver'] = 'hierarchicalRepulsion';
      }
      else if (allOptions.physics !== false) {
        this.optionsBackup.physics = {solver:'barnesHut'};
        allOptions.physics['solver'] = 'hierarchicalRepulsion';
      }

      // get the type of static smooth curve in case it is required
      let type = 'horizontal';
      if (this.options.hierarchical.direction === 'RL' || this.options.hierarchical.direction === 'LR') {
        type = 'vertical';
      }

      // disable smooth curves if nothing is defined. If smooth curves have been turned on, turn them into static smooth curves.
      if (allOptions.edges === undefined) {
        this.optionsBackup.edges = {smooth:{enabled:true, type:'dynamic'}};
        allOptions.edges = {smooth: false};
      }
      else if (allOptions.edges.smooth === undefined) {
        this.optionsBackup.edges = {smooth:{enabled:true, type:'dynamic'}};
        allOptions.edges.smooth = false;
      }
      else {
        if (typeof allOptions.edges.smooth === 'boolean') {
          this.optionsBackup.edges = {smooth:allOptions.edges.smooth};
          allOptions.edges.smooth = {enabled: allOptions.edges.smooth, type:type}
        }
        else {
          // allow custom types except for dynamic
          if (allOptions.edges.smooth.type !== undefined && allOptions.edges.smooth.type !== 'dynamic') {
            type = allOptions.edges.smooth.type;
          }

          this.optionsBackup.edges = {
            smooth: allOptions.edges.smooth.enabled === undefined ? true : allOptions.edges.smooth.enabled,
            type:allOptions.edges.smooth.type === undefined ? 'dynamic' : allOptions.edges.smooth.type,
            roundness: allOptions.edges.smooth.roundness === undefined ? 0.5 : allOptions.edges.smooth.roundness
          };
          allOptions.edges.smooth = {
            enabled: allOptions.edges.smooth.enabled === undefined ? true : allOptions.edges.smooth.enabled,
            type:type,
            roundness: allOptions.edges.smooth.roundness === undefined ? 0.5 : allOptions.edges.smooth.roundness
          }
        }
      }

      // force all edges into static smooth curves. Only applies to edges that do not use the global options for smooth.
      this.body.emitter.emit('_forceDisableDynamicCurves', type);
    }
    return allOptions;
  }

  seededRandom() {
    var x = Math.sin(this.randomSeed++) * 10000;
    return x - Math.floor(x);
  }

  positionInitially(nodesArray) {
    if (this.options.hierarchical.enabled !== true) {
      this.randomSeed = this.initialRandomSeed;
      for (let i = 0; i < nodesArray.length; i++) {
        let node = nodesArray[i];
        let radius = 10 * 0.1 * nodesArray.length + 10;
        let angle = 2 * Math.PI * this.seededRandom();
        if (node.x === undefined) {
          node.x = radius * Math.cos(angle);
        }
        if (node.y === undefined) {
          node.y = radius * Math.sin(angle);
        }
      }
    }
  }

  getSeed() {
    return this.initialRandomSeed;
  }

  /**
   * This is the main function to layout the nodes in a hierarchical way.
   * It checks if the node details are supplied correctly
   *
   * @private
   */
  setupHierarchicalLayout() {
    if (this.options.hierarchical.enabled === true && this.body.nodeIndices.length > 0) {
      // get the size of the largest hubs and check if the user has defined a level for a node.
      let node, nodeId;
      let definedLevel = false;
      let undefinedLevel = false;
      this.hierarchicalLevels = {};
      this.nodeSpacing = 100;

      for (nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          node = this.body.nodes[nodeId];
          if (node.options.level !== undefined) {
            definedLevel = true;
            this.hierarchicalLevels[nodeId] = node.options.level;
          }
          else {
            undefinedLevel = true;
          }
        }
      }

      // if the user defined some levels but not all, alert and run without hierarchical layout
      if (undefinedLevel === true && definedLevel === true) {
        throw new Error('To use the hierarchical layout, nodes require either no predefined levels or levels have to be defined for all nodes.');
        return;
      }
      else {
        // setup the system to use hierarchical method.
        //this._changeConstants();

        // define levels if undefined by the users. Based on hubsize
        if (undefinedLevel === true) {
          if (this.options.hierarchical.sortMethod === 'hubsize') {
            this._determineLevelsByHubsize();
          }
          else if (this.options.hierarchical.sortMethod === 'directed' || 'direction') {
            this._determineLevelsDirected();
          }
        }

        // check the distribution of the nodes per level.
        let distribution = this._getDistribution();

        // place the nodes on the canvas.
        this._placeNodesByHierarchy(distribution);
      }
    }
  }

  /**
   * This function places the nodes on the canvas based on the hierarchial distribution.
   *
   * @param {Object} distribution | obtained by the function this._getDistribution()
   * @private
   */
  _placeNodesByHierarchy(distribution) {
    let nodeId, node;
    this.positionedNodes = {};
    // start placing all the level 0 nodes first. Then recursively position their branches.
    for (let level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        for (nodeId in distribution[level].nodes) {
          if (distribution[level].nodes.hasOwnProperty(nodeId)) {

            node = distribution[level].nodes[nodeId];

            if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
              if (node.x === undefined) {node.x = distribution[level].distance;}
              distribution[level].distance = node.x + this.nodeSpacing;
            }
            else {
              if (node.y === undefined) {node.y = distribution[level].distance;}
              distribution[level].distance = node.y + this.nodeSpacing;
            }

            this.positionedNodes[nodeId] = true;
            this._placeBranchNodes(node.edges,node.id,distribution,level);
          }
        }
      }
    }
  }


  /**
   * This function get the distribution of levels based on hubsize
   *
   * @returns {Object}
   * @private
   */
  _getDistribution() {
    let distribution = {};
    let nodeId, node;

    // we fix Y because the hierarchy is vertical, we fix X so we do not give a node an x position for a second time.
    // the fix of X is removed after the x value has been set.
    for (nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        node = this.body.nodes[nodeId];
        let level = this.hierarchicalLevels[nodeId] === undefined ? 0 : this.hierarchicalLevels[nodeId];
        if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
          node.y = this.options.hierarchical.levelSeparation * level;
          node.options.fixed.y = true;
        }
        else {
          node.x = this.options.hierarchical.levelSeparation * level;
          node.options.fixed.x = true;
        }
        if (distribution[level] === undefined) {
          distribution[level] = {amount: 0, nodes: {}, distance: 0};
        }
        distribution[level].amount += 1;
        distribution[level].nodes[nodeId] = node;
      }
    }
    return distribution;
  }


  /**
   * Get the hubsize from all remaining unlevelled nodes.
   *
   * @returns {number}
   * @private
   */
  _getHubSize() {
    let hubSize = 0;
    for (let nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        let node = this.body.nodes[nodeId];
        if (this.hierarchicalLevels[nodeId] === undefined) {
          hubSize = node.edges.length < hubSize ? hubSize : node.edges.length;
        }
      }
    }
    return hubSize;
  }


  /**
   * this function allocates nodes in levels based on the recursive branching from the largest hubs.
   *
   * @param hubsize
   * @private
   */
  _determineLevelsByHubsize() {
    let nodeId, node;
    let hubSize = 1;

    while (hubSize > 0) {
      // determine hubs
      hubSize = this._getHubSize();
      if (hubSize === 0)
        break;

      for (nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          node = this.body.nodes[nodeId];
          if (node.edges.length === hubSize) {
            this._setLevelByHubsize(0, node);
          }
        }
      }
    }
  }


  /**
   * this function is called recursively to enumerate the barnches of the largest hubs and give each node a level.
   *
   * @param level
   * @param edges
   * @param parentId
   * @private
   */
  _setLevelByHubsize(level, node) {
    if (this.hierarchicalLevels[node.id] !== undefined)
      return;

    let childNode;
    this.hierarchicalLevels[node.id] = level;
    for (let i = 0; i < node.edges.length; i++) {
      if (node.edges[i].toId === node.id) {
        childNode = node.edges[i].from;
      }
      else {
        childNode = node.edges[i].to;
      }
      this._setLevelByHubsize(level + 1, childNode);
    }
  }



  /**
   * this function allocates nodes in levels based on the direction of the edges
   *
   * @param hubsize
   * @private
   */
  _determineLevelsDirected() {
    let nodeId, node;
    let minLevel = 10000;

    // set first node to source
    for (nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        node = this.body.nodes[nodeId];
        this._setLevelDirected(minLevel,node);
      }
    }

    // get the minimum level
    for (nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        minLevel = this.hierarchicalLevels[nodeId] < minLevel ? this.hierarchicalLevels[nodeId] : minLevel;
      }
    }

    // subtract the minimum from the set so we have a range starting from 0
    for (nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        this.hierarchicalLevels[nodeId] -= minLevel;
      }
    }
  }


  /**
   * this function is called recursively to enumerate the branched of the first node and give each node a level based on edge direction
   *
   * @param level
   * @param edges
   * @param parentId
   * @private
   */
  _setLevelDirected(level, node) {
    if (this.hierarchicalLevels[node.id] !== undefined)
      return;

    let childNode;
    this.hierarchicalLevels[node.id] = level;

    for (let i = 0; i < node.edges.length; i++) {
      if (node.edges[i].toId === node.id) {
        childNode = node.edges[i].from;
        this._setLevelDirected(level - 1, childNode);
      }
      else {
        childNode = node.edges[i].to;
        this._setLevelDirected(level + 1, childNode);
      }
    }
  }



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
  _placeBranchNodes(edges, parentId, distribution, parentLevel) {
    for (let i = 0; i < edges.length; i++) {
      let childNode = undefined;
      let parentNode = undefined;
      if (edges[i].toId === parentId) {
        childNode = edges[i].from;
        parentNode = edges[i].to;
      }
      else {
        childNode = edges[i].to;
        parentNode = edges[i].from;
      }
      let childNodeLevel = this.hierarchicalLevels[childNode.id];

      if (this.positionedNodes[childNode.id] === undefined) {
        // if a node is conneceted to another node on the same level (or higher (means lower level))!, this is not handled here.
        if (childNodeLevel > parentLevel) {
          if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
            if (childNode.x === undefined) {
              childNode.x = Math.max(distribution[childNodeLevel].distance, parentNode.x);
            }
            distribution[childNodeLevel].distance = childNode.x + this.nodeSpacing;
            this.positionedNodes[childNode.id] = true;
          }
          else {
            if (childNode.y === undefined) {
              childNode.y = Math.max(distribution[childNodeLevel].distance, parentNode.y)
            }
            distribution[childNodeLevel].distance = childNode.y + this.nodeSpacing;
          }
          this.positionedNodes[childNode.id] = true;

          if (childNode.edges.length > 1) {
            this._placeBranchNodes(childNode.edges, childNode.id, distribution, childNodeLevel);
          }
        }
      }
    }
  }
}

export default LayoutEngine;