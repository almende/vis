'use strict';

let util = require('../../util');
import NetworkUtil from '../NetworkUtil';

class LayoutEngine {
  constructor(body) {
    this.body = body;

    this.initialRandomSeed = Math.round(Math.random() * 1000000);
    this.randomSeed = this.initialRandomSeed;
    this.setPhysics = false;
    this.options = {};
    this.optionsBackup = {physics:{}};

    this.defaultOptions = {
      randomSeed: undefined,
      improvedLayout: true,
      hierarchical: {
        enabled:false,
        levelSeparation: 150,
        nodeSpacing: 100,
        treeSpacing: 200,
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true,
        direction: 'UD',   // UD, DU, LR, RL
        sortMethod: 'hubsize' // hubsize, directed
      }
    };
    util.extend(this.options, this.defaultOptions);
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

        // make sure the level separation is the right way up
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
        allOptions.physics = {
          enabled:this.optionsBackup.physics.enabled === undefined ? true :  this.optionsBackup.physics.enabled,
          solver:'hierarchicalRepulsion'
        };
        this.optionsBackup.physics.enabled = this.optionsBackup.physics.enabled === undefined ? true : this.optionsBackup.physics.enabled;
        this.optionsBackup.physics.solver = this.optionsBackup.physics.solver || 'barnesHut';
      }
      else if (typeof allOptions.physics === 'object') {
        this.optionsBackup.physics.enabled = allOptions.physics.enabled === undefined ? true : allOptions.physics.enabled;
        this.optionsBackup.physics.solver  = allOptions.physics.solver  || 'barnesHut';
        allOptions.physics.solver = 'hierarchicalRepulsion';
      }
      else if (allOptions.physics !== false) {
        this.optionsBackup.physics.solver ='barnesHut';
        allOptions.physics = {solver:'hierarchicalRepulsion'};
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
            type: allOptions.edges.smooth.type === undefined ? 'dynamic' : allOptions.edges.smooth.type,
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
   * Use Kamada Kawai to position nodes. This is quite a heavy algorithm so if there are a lot of nodes we
   * cluster them first to reduce the amount.
   */
  layoutNetwork() {
    if (this.options.hierarchical.enabled !== true && this.options.improvedLayout === true) {
      // first check if we should Kamada Kawai to layout. The threshold is if less than half of the visible
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
    let range = NetworkUtil.getRangeCore(this.body.nodes, this.body.nodeIndices);
    let center = NetworkUtil.findCenter(range);
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
      let definedPositions = true;
      let undefinedLevel = false;
      this.hierarchicalLevels = {};
      this.lastNodeOnLevel = {};
      this.hierarchicalChildrenReference = {};
      this.hierarchicalParentReference = {};
      this.hierarchicalTrees = {};
      this.treeIndex = -1;

      this.distributionOrdering = {};
      this.distributionIndex = {};
      this.distributionOrderingPresence = {};


      for (nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          node = this.body.nodes[nodeId];
          if (node.options.x === undefined && node.options.y === undefined) {
            definedPositions = false;
          }
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
        // define levels if undefined by the users. Based on hubsize.
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


        // fallback for cases where there are nodes but no edges
        for (let nodeId in this.body.nodes) {
          if (this.body.nodes.hasOwnProperty(nodeId)) {
            if (this.hierarchicalLevels[nodeId] === undefined) {
              this.hierarchicalLevels[nodeId] = 0;
            }
          }
        }
        // check the distribution of the nodes per level.
        let distribution = this._getDistribution();

        // get the parent children relations.
        this._generateMap();

        // place the nodes on the canvas.
        this._placeNodesByHierarchy(distribution);

        // condense the whitespace.
        this._condenseHierarchy();

        // shift to center so gravity does not have to do much
        this._shiftToCenter();
      }
    }
  }

  /**
   * @private
   */
  _condenseHierarchy() {
    // Global var in this scope to define when the movement has stopped.
    let stillShifting = false;
    let branches = {};
    // first we have some methods to help shifting trees around.
    // the main method to shift the trees
    let shiftTrees = () => {
      let treeSizes = getTreeSizes();
      for (let i = 0; i < treeSizes.length - 1; i++) {
        let diff = treeSizes[i].max - treeSizes[i+1].min;
        shiftTree(i + 1, diff + this.options.hierarchical.treeSpacing);
      }
    };

    // shift a single tree by an offset
    let shiftTree = (index, offset) => {
      for (let nodeId in this.hierarchicalTrees) {
        if (this.hierarchicalTrees.hasOwnProperty(nodeId)) {
          if (this.hierarchicalTrees[nodeId] === index) {
            let node = this.body.nodes[nodeId];
            let pos = this._getPositionForHierarchy(node);
            this._setPositionForHierarchy(node, pos + offset, undefined, true);
          }
        }
      }
    };

    // get the width of a tree
    let getTreeSize = (index) => {
      let min = 1e9;
      let max = -1e9;
      for (let nodeId in this.hierarchicalTrees) {
        if (this.hierarchicalTrees.hasOwnProperty(nodeId)) {
          if (this.hierarchicalTrees[nodeId] === index) {
            let pos = this._getPositionForHierarchy(this.body.nodes[nodeId]);
            min = Math.min(pos, min);
            max = Math.max(pos, max);
          }
        }
      }
      return {min:min, max:max};
    };

    // get the width of all trees
    let getTreeSizes = () => {
      let treeWidths = [];
      for (let i = 0; i <= this.treeIndex; i++) {
        treeWidths.push(getTreeSize(i));
      }
      return treeWidths;
    };


    // get a map of all nodes in this branch
    let getBranchNodes = (source, map) => {
      map[source.id] = true;
      if (this.hierarchicalChildrenReference[source.id]) {
        let children = this.hierarchicalChildrenReference[source.id];
        if (children.length > 0) {
          for (let i = 0; i < children.length; i++) {
            getBranchNodes(this.body.nodes[children[i]], map);
          }
        }
      }
    };

    // get a min max width as well as the maximum movement space it has on either sides
    // we use min max terminology because width and height can interchange depending on the direction of the layout
    let getBranchBoundary = (branchMap, maxLevel = 1e9) => {
      let minSpace = 1e9;
      let maxSpace = 1e9;
      let min = 1e9;
      let max = -1e9;
      for (let branchNode in branchMap) {
        if (branchMap.hasOwnProperty(branchNode)) {
          let node = this.body.nodes[branchNode];
          let level = this.hierarchicalLevels[node.id];
          let position = this._getPositionForHierarchy(node);

          // get the space around the node.
          let [minSpaceNode, maxSpaceNode] = this._getSpaceAroundNode(node,branchMap);
          minSpace = Math.min(minSpaceNode, minSpace);
          maxSpace = Math.min(maxSpaceNode, maxSpace);

          // the width is only relevant for the levels two nodes have in common. This is why we filter on this.
          if (level <= maxLevel) {
            min = Math.min(position, min);
            max = Math.max(position, max);
          }
        }
      }

      return [min, max, minSpace, maxSpace];
    };

    // get the maximum level of a branch.
    let getMaxLevel = (nodeId) => {
      let level = this.hierarchicalLevels[nodeId];
      if (this.hierarchicalChildrenReference[nodeId]) {
        let children = this.hierarchicalChildrenReference[nodeId];
        if (children.length > 0) {
          for (let i = 0; i < children.length; i++) {
            level = Math.max(level,getMaxLevel(children[i]));
          }
        }
      }
      return level;
    };

    // check what the maximum level is these nodes have in common.
    let getCollisionLevel = (node1, node2) => {
      let maxLevel1 = getMaxLevel(node1.id);
      let maxLevel2 = getMaxLevel(node2.id);
      return Math.min(maxLevel1, maxLevel2);
    };

    // check if two nodes have the same parent(s)
    let hasSameParent = (node1, node2) => {
      let parents1 = this.hierarchicalParentReference[node1.id];
      let parents2 = this.hierarchicalParentReference[node2.id];
      if (parents1 === undefined || parents2 === undefined) {
        return false;
      }

      for (let i = 0; i < parents1.length; i++) {
        for (let j = 0; j < parents2.length; j++) {
          if (parents1[i] == parents2[j]) {
            return true;
          }
        }
      }
      return false;
    };

    // condense elements. These can be nodes or branches depending on the callback.
    let shiftElementsCloser = (callback, levels, centerParents) => {
      for (let i = 0; i < levels.length; i++) {
        let level = levels[i];
        let levelNodes = this.distributionOrdering[level];
        if (levelNodes.length > 1) {
          for (let j = 0; j < levelNodes.length - 1; j++) {
            if (hasSameParent(levelNodes[j],levelNodes[j+1]) === true)  {
              if (this.hierarchicalTrees[levelNodes[j].id] === this.hierarchicalTrees[levelNodes[j+1].id])  {
                callback(levelNodes[j],levelNodes[j+1], centerParents);
              }
            }}
        }
      }
    };

    // callback for shifting branches
    let branchShiftCallback = (node1, node2, centerParent = false) => {
      //window.CALLBACKS.push(() => {
        let pos1 = this._getPositionForHierarchy(node1);
        let pos2 = this._getPositionForHierarchy(node2);
        let diffAbs = Math.abs(pos2 - pos1);
        //console.log("NOW CHEcKING:", node1.id, node2.id, diffAbs);
        if (diffAbs > this.options.hierarchical.nodeSpacing) {
          let branchNodes1 = {}; branchNodes1[node1.id] = true;
          let branchNodes2 = {}; branchNodes2[node2.id] = true;

          getBranchNodes(node1, branchNodes1);
          getBranchNodes(node2, branchNodes2);

          // check the largest distance between the branches
          let maxLevel = getCollisionLevel(node1, node2);
          let [min1,max1, minSpace1, maxSpace1] = getBranchBoundary(branchNodes1, maxLevel);
          let [min2,max2, minSpace2, maxSpace2] = getBranchBoundary(branchNodes2, maxLevel);

          //console.log(node1.id, getBranchBoundary(branchNodes1, maxLevel), node2.id, getBranchBoundary(branchNodes2, maxLevel), maxLevel);
          let diffBranch = Math.abs(max1 - min2);
          if (diffBranch > this.options.hierarchical.nodeSpacing) {
            let offset = max1 - min2 + this.options.hierarchical.nodeSpacing;
            if (offset < -minSpace2 + this.options.hierarchical.nodeSpacing) {
              offset = -minSpace2 + this.options.hierarchical.nodeSpacing;
              //console.log("RESETTING OFFSET", max1 - min2 + this.options.hierarchical.nodeSpacing, -minSpace2, offset);
            }
            if (offset < 0) {
              //console.log("SHIFTING", node2.id, offset);
              this._shiftBlock(node2.id, offset);
              stillShifting = true;

              if (centerParent === true)
                this._centerParent(node2);
            }
          }

        }
        //this.body.emitter.emit("_redraw");})
    };

    let minimizeEdgeLength = (iterations, node) => {
      //window.CALLBACKS.push(() => {
      //  console.log("ts",node.id);
        let nodeId = node.id;
        let allEdges = node.edges;
        let nodeLevel = this.hierarchicalLevels[node.id];

        // gather constants
        let C2 = this.options.hierarchical.levelSeparation * this.options.hierarchical.levelSeparation;
        let referenceNodes = {};
        let aboveEdges = [];
        for (let i = 0; i < allEdges.length; i++) {
          let edge = allEdges[i];
          if (edge.toId != edge.fromId) {
            let otherNode = edge.toId == nodeId ? edge.from : edge.to;
            referenceNodes[allEdges[i].id] = otherNode;
            if (this.hierarchicalLevels[otherNode.id] < nodeLevel) {
              aboveEdges.push(edge);
            }
          }
        }

        // differentiated sum of lengths based on only moving one node over one axis
        let getFx = (point, edges) => {
          let sum = 0;
          for (let i = 0; i < edges.length; i++) {
            if (referenceNodes[edges[i].id] !== undefined) {
              let a = this._getPositionForHierarchy(referenceNodes[edges[i].id]) - point;
              sum += a / Math.sqrt(a * a + C2);
            }
          }
          return sum;
        };

        // doubly differentiated sum of lengths based on only moving one node over one axis
        let getDFx = (point, edges) => {
          let sum = 0;
          for (let i = 0; i < edges.length; i++) {
            if (referenceNodes[edges[i].id] !== undefined) {
              let a = this._getPositionForHierarchy(referenceNodes[edges[i].id]) - point;
              sum -= (C2 * Math.pow(a * a + C2, -1.5));
            }
          }
          return sum;
        };

        let getGuess = (iterations, edges) => {
          let guess = this._getPositionForHierarchy(node);
          // Newton's method for optimization
          let guessMap = {};
          for (let i = 0; i < iterations; i++) {
            let fx = getFx(guess, edges);
            let dfx = getDFx(guess, edges);

            // we limit the movement to avoid instability.
            let limit = 40;
            let ratio = Math.max(-limit, Math.min(limit, Math.round(fx/dfx)));
            guess = guess - ratio;
            // reduce duplicates
            if (guessMap[guess] !== undefined) {
              break;
            }
            guessMap[guess] = i;
          }
          return guess;
        };

        let moveBranch = (guess) => {
          // position node if there is space
          let nodePosition = this._getPositionForHierarchy(node);

          // check movable area of the branch
          if (branches[node.id] === undefined) {
            let branchNodes = {};
            branchNodes[node.id] = true;
            getBranchNodes(node, branchNodes);
            branches[node.id] = branchNodes;
          }
          let [minBranch, maxBranch, minSpaceBranch, maxSpaceBranch] = getBranchBoundary(branches[node.id]);

          let diff = guess - nodePosition;

          // check if we are allowed to move the node:
          let branchOffset = 0;
          if (diff > 0) {
            branchOffset = Math.min(diff, maxSpaceBranch - this.options.hierarchical.nodeSpacing);
          }
          else if (diff < 0) {
            branchOffset = -Math.min(-diff, minSpaceBranch - this.options.hierarchical.nodeSpacing);
          }

          if (branchOffset != 0) {
            //console.log("moving branch:",branchOffset, maxSpaceBranch, minSpaceBranch)
            this._shiftBlock(node.id, branchOffset);
            //this.body.emitter.emit("_redraw");
            stillShifting = true;
          }
        };

        let moveNode = (guess) => {
          let nodePosition = this._getPositionForHierarchy(node);

          // position node if there is space
          let [minSpace, maxSpace] = this._getSpaceAroundNode(node);
          let diff = guess - nodePosition;
          // check if we are allowed to move the node:
          let newPosition = nodePosition;
          if (diff > 0) {
            newPosition = Math.min(nodePosition + (maxSpace - this.options.hierarchical.nodeSpacing), guess);
          }
          else if (diff < 0) {
            newPosition = Math.max(nodePosition - (minSpace - this.options.hierarchical.nodeSpacing), guess);
          }

          if (newPosition !== nodePosition) {
            //console.log("moving Node:",diff, minSpace, maxSpace);
            this._setPositionForHierarchy(node, newPosition, undefined, true);
            //this.body.emitter.emit("_redraw");
            stillShifting = true;
          }
        };

        let guess = getGuess(iterations, aboveEdges);
        moveBranch(guess);
        guess = getGuess(iterations, allEdges);
        moveNode(guess);
      //})
    };

    // method to remove whitespace between branches. Because we do bottom up, we can center the parents.
    let minimizeEdgeLengthBottomUp = (iterations) => {
      let levels = Object.keys(this.distributionOrdering);
      levels = levels.reverse();
      for (let i = 0; i < iterations; i++) {
        stillShifting = false;
        for (let j = 0; j < levels.length; j++) {
          let level = levels[j];
          let levelNodes = this.distributionOrdering[level];
          for (let k = 0; k < levelNodes.length; k++) {
            minimizeEdgeLength(1000, levelNodes[k]);
          }
        }
        if (stillShifting !== true) {
          //console.log("FINISHED minimizeEdgeLengthBottomUp IN " + i);
          break;
        }
      }
    };

    // method to remove whitespace between branches. Because we do bottom up, we can center the parents.
    let shiftBranchesCloserBottomUp = (iterations) => {
      let levels = Object.keys(this.distributionOrdering);
      levels = levels.reverse();
      for (let i = 0; i < iterations; i++) {
        stillShifting = false;
        shiftElementsCloser(branchShiftCallback, levels, true);
        if (stillShifting !== true) {
          //console.log("FINISHED shiftBranchesCloserBottomUp IN " + (i+1));
          break;
        }
      }
    };

    // center all parents
    let centerAllParents = () => {
      for (let nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId))
          this._centerParent(this.body.nodes[nodeId]);
      }
    };

    // center all parents
    let centerAllParentsBottomUp = () => {
      let levels = Object.keys(this.distributionOrdering);
      levels = levels.reverse();
      for (let i = 0; i < levels.length; i++) {
        let level = levels[i];
        let levelNodes = this.distributionOrdering[level];
        for (let j = 0; j < levelNodes.length; j++) {
          this._centerParent(levelNodes[j]);
        }
      }
    };

    // the actual work is done here.
    if (this.options.hierarchical.blockShifting === true) {
      shiftBranchesCloserBottomUp(5);
      centerAllParents();
    }

    // minimize edge length
    if (this.options.hierarchical.edgeMinimization === true) {
      minimizeEdgeLengthBottomUp(20);
    }

    if (this.options.hierarchical.parentCentralization === true) {
      centerAllParentsBottomUp()
    }

    shiftTrees();
  }

  /**
   * This gives the space around the node. IF a map is supplied, it will only check against nodes NOT in the map.
   * This is used to only get the distances to nodes outside of a branch.
   * @param node
   * @param map
   * @returns {*[]}
   * @private
   */
  _getSpaceAroundNode(node, map) {
    let useMap = true;
    if (map === undefined) {
      useMap = false;
    }
    let level = this.hierarchicalLevels[node.id];
    if (level !== undefined) {
      let index = this.distributionIndex[node.id];
      let position = this._getPositionForHierarchy(node);
      let minSpace = 1e9;
      let maxSpace = 1e9;
      if (index !== 0) {
        let prevNode = this.distributionOrdering[level][index - 1];
        if ((useMap === true && map[prevNode.id] === undefined) || useMap === false) {
          let prevPos = this._getPositionForHierarchy(prevNode);
          minSpace = position - prevPos;
        }
      }

      if (index != this.distributionOrdering[level].length - 1) {
        let nextNode = this.distributionOrdering[level][index + 1];
        if ((useMap === true && map[nextNode.id] === undefined) || useMap === false) {
          let nextPos = this._getPositionForHierarchy(nextNode);
          maxSpace = Math.min(maxSpace, nextPos - position);
        }
      }

      return [minSpace, maxSpace];
    }
    else {
      return [0, 0];
    }
  }

  /**
   * We use this method to center a parent node and check if it does not cross other nodes when it does.
   * @param node
   * @private
   */
  _centerParent(node) {
    if (this.hierarchicalParentReference[node.id]) {
      let parents = this.hierarchicalParentReference[node.id];
      for (var i = 0; i < parents.length; i++) {
        let parentId = parents[i];
        let parentNode = this.body.nodes[parentId];
        if (this.hierarchicalChildrenReference[parentId]) {
          // get the range of the children
          let minPos = 1e9;
          let maxPos = -1e9;
          let children = this.hierarchicalChildrenReference[parentId];
          if (children.length > 0) {
            for (let i = 0; i < children.length; i++) {
              let childNode = this.body.nodes[children[i]];
              minPos = Math.min(minPos, this._getPositionForHierarchy(childNode));
              maxPos = Math.max(maxPos, this._getPositionForHierarchy(childNode));
            }
          }

          let position = this._getPositionForHierarchy(parentNode);
          let [minSpace, maxSpace] = this._getSpaceAroundNode(parentNode);
          let newPosition = 0.5 * (minPos + maxPos);
          let diff = position - newPosition;
          if ((diff < 0 && Math.abs(diff) < maxSpace - this.options.hierarchical.nodeSpacing) || (diff > 0 && Math.abs(diff) < minSpace - this.options.hierarchical.nodeSpacing))  {
            this._setPositionForHierarchy(parentNode, newPosition, undefined, true);
          }
        }
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
    this.positionedNodes = {};
    // start placing all the level 0 nodes first. Then recursively position their branches.
    for (let level in distribution) {
      if (distribution.hasOwnProperty(level)) {
        // sort nodes in level by position:
        let nodeArray = Object.keys(distribution[level]);
        nodeArray = this._indexArrayToNodes(nodeArray);
        this._sortNodeArray(nodeArray);
        let handledNodeCount = 0;

        for (let i = 0; i < nodeArray.length; i++) {
          let node = nodeArray[i];
          if (this.positionedNodes[node.id] === undefined) {
            let pos = this.options.hierarchical.nodeSpacing * handledNodeCount;
            // we get the X or Y values we need and store them in pos and previousPos. The get and set make sure we get X or Y
            if (handledNodeCount > 0) {pos = this._getPositionForHierarchy(nodeArray[i-1]) + this.options.hierarchical.nodeSpacing;}
            this._setPositionForHierarchy(node, pos, level);
            this._validataPositionAndContinue(node, level, pos);

            handledNodeCount++;
          }
        }
      }
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
    if (this.hierarchicalChildrenReference[parentId] === undefined) {
      return;
    }

    // get a list of childNodes
    let childNodes = [];
    for (let i = 0; i < this.hierarchicalChildrenReference[parentId].length; i++) {
      childNodes.push(this.body.nodes[this.hierarchicalChildrenReference[parentId][i]]);
    }

    // use the positions to order the nodes.
    this._sortNodeArray(childNodes);

    // position the childNodes
    for (let i = 0; i < childNodes.length; i++) {
      let childNode = childNodes[i];
      let childNodeLevel = this.hierarchicalLevels[childNode.id];
      // check if the child node is below the parent node and if it has already been positioned.
      if (childNodeLevel > parentLevel && this.positionedNodes[childNode.id] === undefined) {
        // get the amount of space required for this node. If parent the width is based on the amount of children.
        let pos;

        // we get the X or Y values we need and store them in pos and previousPos. The get and set make sure we get X or Y
        if (i === 0) {pos = this._getPositionForHierarchy(this.body.nodes[parentId]);}
        else         {pos = this._getPositionForHierarchy(childNodes[i-1]) + this.options.hierarchical.nodeSpacing;}
        this._setPositionForHierarchy(childNode, pos, childNodeLevel);
        this._validataPositionAndContinue(childNode, childNodeLevel, pos);
      }
      else {
        return;
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
    this._setPositionForHierarchy(this.body.nodes[parentId], 0.5 * (minPos + maxPos), parentLevel);
  }


  /**
   * This method checks for overlap and if required shifts the branch. It also keeps records of positioned nodes.
   * Finally it will call _placeBranchNodes to place the branch nodes.
   * @param node
   * @param level
   * @param pos
   * @private
   */
  _validataPositionAndContinue(node, level, pos) {
    // if overlap has been detected, we shift the branch
    if (this.lastNodeOnLevel[level] !== undefined) {
      let previousPos = this._getPositionForHierarchy(this.body.nodes[this.lastNodeOnLevel[level]]);
      if (pos - previousPos < this.options.hierarchical.nodeSpacing) {
        let diff = (previousPos + this.options.hierarchical.nodeSpacing) - pos;
        let sharedParent = this._findCommonParent(this.lastNodeOnLevel[level], node.id);
        this._shiftBlock(sharedParent.withChild, diff);
      }
    }

    // store change in position.
    this.lastNodeOnLevel[level] = node.id;

    this.positionedNodes[node.id] = true;

    this._placeBranchNodes(node.id, level);
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
        NetworkUtil.cloneOptions(nodeA,'node'),
        NetworkUtil.cloneOptions(nodeB,'node'),
        NetworkUtil.cloneOptions(edge,'edge')
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
        if (this.hierarchicalLevels[nodeId] !== undefined) {
          minLevel = Math.min(this.hierarchicalLevels[nodeId], minLevel);
        }
      }
    }

    // subtract the minimum from the set so we have a range starting from 0
    for (let nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        if (this.hierarchicalLevels[nodeId] !== undefined) {
          this.hierarchicalLevels[nodeId] -= minLevel;
        }
      }
    }
  }


  /**
   * Update the bookkeeping of parent and child.
   * @private
   */
  _generateMap() {
    let fillInRelations = (parentNode, childNode) => {
      if (this.hierarchicalLevels[childNode.id] > this.hierarchicalLevels[parentNode.id]) {
        let parentNodeId = parentNode.id;
        let childNodeId = childNode.id;
        if (this.hierarchicalChildrenReference[parentNodeId] === undefined) {
          this.hierarchicalChildrenReference[parentNodeId] = [];
        }
        this.hierarchicalChildrenReference[parentNodeId].push(childNodeId);
        if (this.hierarchicalParentReference[childNodeId] === undefined) {
          this.hierarchicalParentReference[childNodeId] = [];
        }
        this.hierarchicalParentReference[childNodeId].push(parentNodeId);
      }
    };

    this._crawlNetwork(fillInRelations);
  }


  /**
   * Crawl over the entire network and use a callback on each node couple that is connected to each other.
   * @param callback          | will receive nodeA nodeB and the connecting edge. A and B are unique.
   * @param startingNodeId
   * @private
   */
  _crawlNetwork(callback = function() {}, startingNodeId) {
    let progress = {};
    let treeIndex = 0;

    let crawler = (node, tree) => {
      if (progress[node.id] === undefined) {

        if (this.hierarchicalTrees[node.id] === undefined) {
          this.hierarchicalTrees[node.id] = tree;
          this.treeIndex = Math.max(tree, this.treeIndex);
        }

        progress[node.id] = true;
        let childNode;
        for (let i = 0; i < node.edges.length; i++) {
          if (node.edges[i].connected === true) {
            if (node.edges[i].toId === node.id) {
              childNode = node.edges[i].from;
            }
            else {
              childNode = node.edges[i].to;
            }

            if (node.id !== childNode.id) {
              callback(node, childNode, node.edges[i]);
              crawler(childNode, tree);
            }
          }
        }
      }
    };


    // we can crawl from a specific node or over all nodes.
    if (startingNodeId === undefined) {
      for (let i = 0; i < this.body.nodeIndices.length; i++) {
        let node = this.body.nodes[this.body.nodeIndices[i]];
        if (progress[node.id] === undefined) {
          crawler(node, treeIndex);
          treeIndex += 1;
        }
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
    if (this.hierarchicalChildrenReference[parentId] !== undefined) {
      for (let i = 0; i < this.hierarchicalChildrenReference[parentId].length; i++) {
        this._shiftBlock(this.hierarchicalChildrenReference[parentId][i], diff);
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
      if (this.hierarchicalParentReference[child] !== undefined) {
        for (let i = 0; i < this.hierarchicalParentReference[child].length; i++) {
          let parent = this.hierarchicalParentReference[child][i];
          parents[parent] = true;
          iterateParents(parents, parent)
        }
      }
    };
    let findParent = (parents, child) => {
      if (this.hierarchicalParentReference[child] !== undefined) {
        for (let i = 0; i < this.hierarchicalParentReference[child].length; i++) {
          let parent = this.hierarchicalParentReference[child][i];
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
   * @param level
   * @private
   */
  _setPositionForHierarchy(node, position, level, doNotUpdate = false) {
    //console.log('_setPositionForHierarchy',node.id, position)
    if (doNotUpdate !== true) {
      if (this.distributionOrdering[level] === undefined) {
        this.distributionOrdering[level] = [];
        this.distributionOrderingPresence[level] = {};
      }

      if (this.distributionOrderingPresence[level][node.id] === undefined) {
        this.distributionOrdering[level].push(node);
        this.distributionIndex[node.id] = this.distributionOrdering[level].length - 1;
      }
      this.distributionOrderingPresence[level][node.id] = true;
    }

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