'use strict';

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

    this.lastNodeOnLevel = {};
    this.hierarchicalParents = {};
    this.hierarchicalChildren = {};

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
        return this.adaptAllOptionsForHierarchicalLayout(allOptions);
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

  adaptAllOptionsForHierarchicalLayout(allOptions) {
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
        // define levels if undefined by the users. Based on hubsize
        if (undefinedLevel === true) {
          if (this.options.hierarchical.sortMethod === 'hubsize') {
            this._determineLevelsByHubsize();
          }
          else if (this.options.hierarchical.sortMethod === 'directed') {
            this._determineLevelsDirected();
          }
          else if (this.options.hierarchical.sortMethod === 'custom') {
            this._determineLevelsCustomCallback();
          }
        }


        // check the distribution of the nodes per level.
        let distribution = this._getDistribution();

        // get the parent children relations.
        this._generateMap();

        // place the nodes on the canvas.
        this._placeNodesByHierarchy(distribution);

        // Todo: condense the whitespace.
        this._condenseHierarchy(distribution);

        // shift to center so gravity does not have to do much
        this._shiftToCenter();
      }
    }
  }

  /**
   * TODO: implement. Clear whitespace after positioning.
   * @private
   */
  _condenseHierarchy(distribution) {
  }


  /**
   * This function places the nodes on the canvas based on the hierarchial distribution.
   *
   * @param {Object} distribution | obtained by the function this._getDistribution()
   * @private
   */
  _placeNodesByHierarchy(distribution) {
    this.positionedNodes = {};
    // start placing all the level 0 nodes first. Then recursively position their branches.
    for (let level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        // sort nodes in level by position:
        let nodeArray = Object.keys(distribution[level]);
        nodeArray = this._indexArrayToNodes(nodeArray);
        this._sortNodeArray(nodeArray);

        for (let i = 0; i < nodeArray.length; i++) {
          let node = nodeArray[i];
          if (this.positionedNodes[node.id] === undefined) {
            this._setPositionForHierarchy(node, this.nodeSpacing * i);
            this.positionedNodes[node.id] = true;
            this._placeBranchNodes(node.id, level);
          }
        }
      }
    }
  }

  /**
   * Receives an array with node indices and returns an array with the actual node references. Used for sorting based on
   * node properties.
   * @param idArray
   */
  _indexArrayToNodes(idArray) {
    let array = [];
    for (let i = 0; i < idArray.length; i++) {
      array.push(this.body.nodes[idArray[i]])
    }
    return array;
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
          distribution[level] = {};
        }
        distribution[level][nodeId] = node;
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
    let hubSize = 1;

    let levelDownstream = (nodeA, nodeB) => {
      if (this.hierarchicalLevels[nodeB.id] === undefined) {
        // set initial level
        if (this.hierarchicalLevels[nodeA.id] === undefined) {
          this.hierarchicalLevels[nodeA.id] = 0;
        }
        // set level
        this.hierarchicalLevels[nodeB.id] = this.hierarchicalLevels[nodeA.id] + 1;
      }
    };

    while (hubSize > 0) {
      // determine hubs
      hubSize = this._getHubSize();
      if (hubSize === 0)
        break;

      for (let nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          let node = this.body.nodes[nodeId];
          if (node.edges.length === hubSize) {
            this._crawlNetwork(levelDownstream,nodeId);
          }
        }
      }
    }
  }

  /**
   * TODO: release feature
   * @private
   */
  _determineLevelsCustomCallback() {
    let minLevel = 100000;

    // TODO: this should come from options.
    let customCallback = function(nodeA, nodeB, edge) {

    };

    let levelByDirection = (nodeA, nodeB, edge) => {
      let levelA = this.hierarchicalLevels[nodeA.id];
      // set initial level
      if (levelA === undefined) {this.hierarchicalLevels[nodeA.id] = minLevel;}

      let diff = customCallback(
        NetworkUtil._cloneOptions(nodeA,'node'),
        NetworkUtil._cloneOptions(nodeB,'node'),
        NetworkUtil._cloneOptions(edge,'edge')
      );

      this.hierarchicalLevels[nodeB.id] = this.hierarchicalLevels[nodeA.id] + diff;
    };

    this._crawlNetwork(levelByDirection);
    this._setMinLevelToZero();
  }

  /**
   * this function allocates nodes in levels based on the direction of the edges
   *
   * @param hubsize
   * @private
   */
  _determineLevelsDirected() {
    let minLevel = 10000;
    let levelByDirection = (nodeA, nodeB, edge) => {
      let levelA = this.hierarchicalLevels[nodeA.id];
      // set initial level
      if (levelA === undefined) {this.hierarchicalLevels[nodeA.id] = minLevel;}
      if (edge.toId == nodeB.id) {
        this.hierarchicalLevels[nodeB.id] = this.hierarchicalLevels[nodeA.id] + 1;
      }
      else {
        this.hierarchicalLevels[nodeB.id] = this.hierarchicalLevels[nodeA.id] - 1;
      }
    };
    this._crawlNetwork(levelByDirection);
    this._setMinLevelToZero();
  }


  /**
   * Small util method to set the minimum levels of the nodes to zero.
   * @private
   */
  _setMinLevelToZero() {
    let minLevel = 1e9;
    // get the minimum level
    for (let nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        minLevel = Math.min(this.hierarchicalLevels[nodeId], minLevel);
      }
    }

    // subtract the minimum from the set so we have a range starting from 0
    for (let nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        this.hierarchicalLevels[nodeId] -= minLevel;
      }
    }
  }


  /**
   * Update the bookkeeping of parent and child.
   * @param parentNodeId
   * @param childNodeId
   * @private
   */
  _generateMap() {
    let fillInRelations = (parentNode, childNode) => {
      if (this.hierarchicalLevels[childNode.id] > this.hierarchicalLevels[parentNode.id]) {
        let parentNodeId = parentNode.id;
        let childNodeId = childNode.id;
        if (this.hierarchicalParents[parentNodeId] === undefined) {
          this.hierarchicalParents[parentNodeId] = {children: [], amount: 0};
        }
        this.hierarchicalParents[parentNodeId].children.push(childNodeId);
        if (this.hierarchicalChildren[childNodeId] === undefined) {
          this.hierarchicalChildren[childNodeId] = {parents: [], amount: 0};
        }
        this.hierarchicalChildren[childNodeId].parents.push(parentNodeId);
      }
    };

    this._crawlNetwork(fillInRelations);
  }


  /**
   * Crawl over the entire network and use a callback on each node couple that is connected to eachother.
   * @param callback          | will receive nodeA nodeB and the connecting edge. A and B are unique.
   * @param startingNodeId
   * @private
   */
  _crawlNetwork(callback = function() {}, startingNodeId) {
    let progress = {};
    let crawler = (node) => {
      if (progress[node.id] === undefined) {
        progress[node.id] = true;
        let childNode;
        for (let i = 0; i < node.edges.length; i++) {
          if (node.edges[i].toId === node.id) {childNode = node.edges[i].from;}
          else                                {childNode = node.edges[i].to;}

          if (node.id !== childNode.id) {
            callback(node, childNode, node.edges[i]);
            crawler(childNode);
          }
        }
      }
    };


    // we can crawl from a specific node or over all nodes.
    if (startingNodeId === undefined) {
      for (let i = 0; i < this.body.nodeIndices.length; i++) {
        let node = this.body.nodes[this.body.nodeIndices[i]];
        crawler(node);
      }
    }
    else {
      let node = this.body.nodes[startingNodeId];
      if (node === undefined) {
        console.error("Node not found:", startingNodeId);
        return;
      }
      crawler(node);
    }


  }


  /**
   * This is a recursively called function to enumerate the branches from the largest hubs and place the nodes
   * on a X position that ensures there will be no overlap.
   *
   * @param parentId
   * @param parentLevel
   * @private
   */
  _placeBranchNodes(parentId, parentLevel) {
    // if this is not a parent, cancel the placing. This can happen with multiple parents to one child.
    if (this.hierarchicalParents[parentId] === undefined) {
      return;
    }

    // get a list of childNodes
    let childNodes = [];
    for (let i = 0; i < this.hierarchicalParents[parentId].children.length; i++) {
      childNodes.push(this.body.nodes[this.hierarchicalParents[parentId].children[i]]);
    }

    // use the positions to order the nodes.
    this._sortNodeArray(childNodes);

    // position the childNodes
    for (let i = 0; i < childNodes.length; i++) {
      let childNode = childNodes[i];
      let childNodeLevel = this.hierarchicalLevels[childNode.id];
      // check if the childnode is below the parent node and if it has already been positioned.
      if (childNodeLevel > parentLevel && this.positionedNodes[childNode.id] === undefined) {
        // get the amount of space required for this node. If parent the width is based on the amount of children.
        let pos;

        // we get the X or Y values we need and store them in pos and previousPos. The get and set make sure we get X or Y
        if (i === 0) {pos = this._getPositionForHierarchy(this.body.nodes[parentId]);}
        else         {pos = this._getPositionForHierarchy(childNodes[i-1]) + this.nodeSpacing;}
        this._setPositionForHierarchy(childNode, pos);

        // if overlap has been detected, we shift the branch
        if (this.lastNodeOnLevel[childNodeLevel] !== undefined) {
          let previousPos = this._getPositionForHierarchy(this.body.nodes[this.lastNodeOnLevel[childNodeLevel]]);
          if (pos - previousPos < this.nodeSpacing) {
            let diff = (previousPos + this.nodeSpacing) - pos;
            let sharedParent = this._findCommonParent(this.lastNodeOnLevel[childNodeLevel], childNode.id);
            this._shiftBlock(sharedParent.withChild, diff);
          }
        }

        // store change in position.
        this.lastNodeOnLevel[childNodeLevel] = childNode.id;

        this.positionedNodes[childNode.id] = true;

        this._placeBranchNodes(childNode.id, childNodeLevel);
      }
      else {
        return
      }
    }

    // center the parent nodes.
    let minPos = 1e9;
    let maxPos = -1e9;
    for (let i = 0; i < childNodes.length; i++) {
      let childNodeId = childNodes[i].id;
      minPos = Math.min(minPos, this._getPositionForHierarchy(this.body.nodes[childNodeId]));
      maxPos = Math.max(maxPos, this._getPositionForHierarchy(this.body.nodes[childNodeId]));
    }
    this._setPositionForHierarchy(this.body.nodes[parentId], 0.5 * (minPos + maxPos));
  }


  /**
   * Shift a branch a certain distance
   * @param parentId
   * @param diff
   * @private
   */
  _shiftBlock(parentId, diff) {
    if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
      this.body.nodes[parentId].x += diff;
    }
    else {
      this.body.nodes[parentId].y += diff;
    }
    if (this.hierarchicalParents[parentId] !== undefined) {
      for (let i = 0; i < this.hierarchicalParents[parentId].children.length; i++) {
        this._shiftBlock(this.hierarchicalParents[parentId].children[i], diff);
      }
    }
  }


  /**
   * Find a common parent between branches.
   * @param childA
   * @param childB
   * @returns {{foundParent, withChild}}
   * @private
   */
  _findCommonParent(childA,childB) {
    let parents = {};
    let iterateParents = (parents,child) => {
      if (this.hierarchicalChildren[child] !== undefined) {
        for (let i = 0; i < this.hierarchicalChildren[child].parents.length; i++) {
          let parent = this.hierarchicalChildren[child].parents[i];
          parents[parent] = true;
          iterateParents(parents, parent)
        }
      }
    };
    let findParent = (parents, child) => {
      if (this.hierarchicalChildren[child] !== undefined) {
        for (let i = 0; i < this.hierarchicalChildren[child].parents.length; i++) {
          let parent = this.hierarchicalChildren[child].parents[i];
          if (parents[parent] !== undefined) {
            return {foundParent:parent, withChild:child};
          }
          let branch = findParent(parents, parent);
          if (branch.foundParent !== null) {
            return branch;
          }
        }
      }
      return {foundParent:null, withChild:child};
    };

    iterateParents(parents, childA);
    return findParent(parents, childB);
  }

  /**
   * Abstract the getting of the position so we won't have to repeat the check for direction all the time
   * @param node
   * @param position
   * @private
   */
  _setPositionForHierarchy(node, position) {
    if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
      node.x = position;
    }
    else {
      node.y = position;
    }
  }

  /**
   * Abstract the getting of the position of a node so we do not have to repeat the direction check all the time.
   * @param node
   * @returns {number|*}
   * @private
   */
  _getPositionForHierarchy(node) {
    if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
      return node.x;
    }
    else {
      return node.y;
    }
  }

  /**
   * Use the x or y value to sort the array, allowing users to specify order.
   * @param nodeArray
   * @private
   */
  _sortNodeArray(nodeArray) {
    if (nodeArray.length > 1) {
      if (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU') {
        nodeArray.sort(function (a, b) {
          return a.x - b.x;
        })
      }
      else {
        nodeArray.sort(function (a, b) {
          return a.y - b.y;
        })
      }
    }
  }



}

export default LayoutEngine;