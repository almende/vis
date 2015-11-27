'use strict'

let util = require('../../util');
import NetworkUtil from '../NetworkUtil';

class LayoutEngine {
  constructor(body) {
    this.body = body;

    this.initialRandomSeed = Math.round(Math.random() * 1000000);
    this.randomSeed = this.initialRandomSeed;
    this.options = {};
    this.optionsBackup = {};


    this.defaultOptions = {
      randomSeed: undefined,
      improvedLayout: true,
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
    this.body.emitter.on('_dataLoaded', () => {
      this.layoutNetwork();
    });
    this.body.emitter.on('_resetHierarchicalLayout', () => {
      this.setupHierarchicalLayout();
    });
  }

  setOptions(options, allOptions) {
    if (options !== undefined) {
      let prevHierarchicalState = this.options.hierarchical.enabled;
      util.selectiveDeepExtend(["randomSeed", "improvedLayout"],this.options, options);
      util.mergeOptions(this.options, options, 'hierarchical');
      if (options.randomSeed !== undefined)     {this.initialRandomSeed = options.randomSeed;}

      if (this.options.hierarchical.enabled === true) {
        if (prevHierarchicalState === true) {
          // refresh the overridden options for nodes and edges.
          this.body.emitter.emit('refresh', true);
        }

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
            roundness: allOptions.edges.smooth.roundness === undefined ? 0.5 : allOptions.edges.smooth.roundness,
            forceDirection: allOptions.edges.smooth.forceDirection === undefined ? false : allOptions.edges.smooth.forceDirection
          };
          allOptions.edges.smooth = {
            enabled: allOptions.edges.smooth.enabled === undefined ? true : allOptions.edges.smooth.enabled,
            type:type,
            roundness: allOptions.edges.smooth.roundness === undefined ? 0.5 : allOptions.edges.smooth.roundness,
            forceDirection: allOptions.edges.smooth.forceDirection === undefined ? false : allOptions.edges.smooth.forceDirection
          }
        }
      }

      // force all edges into static smooth curves. Only applies to edges that do not use the global options for smooth.
      this.body.emitter.emit('_forceDisableDynamicCurves', type);
    }
    return allOptions;
  }

  seededRandom() {
    let x = Math.sin(this.randomSeed++) * 10000;
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


  /**
   * Use KamadaKawai to position nodes. This is quite a heavy algorithm so if there are a lot of nodes we
   * cluster them first to reduce the amount.
   */
  layoutNetwork() {
    if (this.options.hierarchical.enabled !== true && this.options.improvedLayout === true) {
      // first check if we should KamadaKawai to layout. The threshold is if less than half of the visible
      // nodes have predefined positions we use this.
      let positionDefined = 0;
      for (let i = 0; i < this.body.nodeIndices.length; i++) {
        let node = this.body.nodes[this.body.nodeIndices[i]];
        if (node.predefinedPosition === true) {
          positionDefined += 1;
        }
      }

      // if less than half of the nodes have a predefined position we continue
      if (positionDefined < 0.5 * this.body.nodeIndices.length) {
        let MAX_LEVELS = 10;
        let level = 0;
        let clusterThreshold = 100;
        // if there are a lot of nodes, we cluster before we run the algorithm.
        if (this.body.nodeIndices.length > clusterThreshold) {
          let startLength = this.body.nodeIndices.length;
          while (this.body.nodeIndices.length > clusterThreshold) {
            //console.time("clustering")
            level += 1;
            let before = this.body.nodeIndices.length;
            // if there are many nodes we do a hubsize cluster
            if (level % 3 === 0) {
              this.body.modules.clustering.clusterBridges();
            }
            else {
              this.body.modules.clustering.clusterOutliers();
            }
            let after = this.body.nodeIndices.length;
            if ((before == after && level % 3 !== 0) || level > MAX_LEVELS) {
              this._declusterAll();
              this.body.emitter.emit("_layoutFailed");
              console.info("This network could not be positioned by this version of the improved layout algorithm. Please disable improvedLayout for better performance.");
              return;
            }
            //console.timeEnd("clustering")
            //console.log(level,after)
          }
          // increase the size of the edges
          this.body.modules.kamadaKawai.setOptions({springLength: Math.max(150, 2 * startLength)})
        }

        // position the system for these nodes and edges
        this.body.modules.kamadaKawai.solve(this.body.nodeIndices, this.body.edgeIndices, true);

        // shift to center point
        this._shiftToCenter();

        // perturb the nodes a little bit to force the physics to kick in
        let offset = 70;
        for (let i = 0; i < this.body.nodeIndices.length; i++) {
          this.body.nodes[this.body.nodeIndices[i]].x += (0.5 - this.seededRandom())*offset;
          this.body.nodes[this.body.nodeIndices[i]].y += (0.5 - this.seededRandom())*offset;
        }

        // uncluster all clusters
        this._declusterAll();

        // reposition all bezier nodes.
        this.body.emitter.emit("_repositionBezierNodes");
      }
    }
  }

  /**
   * Move all the nodes towards to the center so gravitational pull wil not move the nodes away from view
   * @private
   */
  _shiftToCenter() {
    let range = NetworkUtil._getRangeCore(this.body.nodes, this.body.nodeIndices);
    let center = NetworkUtil._findCenter(range);
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      this.body.nodes[this.body.nodeIndices[i]].x -= center.x;
      this.body.nodes[this.body.nodeIndices[i]].y -= center.y;
    }
  }

  _declusterAll() {
    let clustersPresent = true;
    while (clustersPresent === true) {
      clustersPresent = false;
      for (let i = 0; i < this.body.nodeIndices.length; i++) {
        if (this.body.nodes[this.body.nodeIndices[i]].isCluster === true) {
          clustersPresent = true;
          this.body.modules.clustering.openCluster(this.body.nodeIndices[i], {}, false);
        }
      }
      if (clustersPresent === true) {
        this.body.emitter.emit('_dataChanged');
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

        // add offset to distribution
        this._addOffsetsToDistribution(distribution);

        // place the nodes on the canvas.
        this._placeNodesByHierarchy(distribution);
      }
    }
  }


  /**
   * center align the nodes in the hierarchy for quicker display.
   * @param distribution
   * @private
   */
  _addOffsetsToDistribution(distribution) {
    let maxDistances = 0;
    // get the maximum amount of distances between nodes over all levels
    for (let level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        if (maxDistances < distribution[level].amount) {
          maxDistances = distribution[level].amount;
        }
      }
    }
    // o---o---o : 3 nodes, 2 disances. hence -1
    maxDistances -= 1;

    // set the distances for all levels but normalize on the first level (0)
    var zeroLevelDistance = distribution[0].amount - 1 - maxDistances;
    for (let level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        var distances = distribution[level].amount - 1 - zeroLevelDistance;
        distribution[level].distance = ((maxDistances - distances) * 0.5) * this.nodeSpacing;
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

              // since the placeBranchNodes can make this process not exactly sequential, we have to avoid overlap by either spacing from the node, or simply adding distance.
              distribution[level].distance = Math.max(distribution[level].distance + this.nodeSpacing, node.x + this.nodeSpacing);
            }
            else {
              if (node.y === undefined) {node.y = distribution[level].distance;}
              // since the placeBranchNodes can make this process not exactly sequential, we have to avoid overlap by either spacing from the node, or simply adding distance.
              distribution[level].distance = Math.max(distribution[level].distance + this.nodeSpacing, node.y + this.nodeSpacing);
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
              childNode.x = Math.max(distribution[childNodeLevel].distance);
            }
            distribution[childNodeLevel].distance = childNode.x + this.nodeSpacing;
            this.positionedNodes[childNode.id] = true;
          }
          else {
            if (childNode.y === undefined) {
              childNode.y = Math.max(distribution[childNodeLevel].distance)
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