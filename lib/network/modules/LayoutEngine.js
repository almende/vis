'use strict';

let util = require('../../util');
var NetworkUtil = require('../NetworkUtil').default;


/**
 * Container for derived data on current network, relating to hierarchy.
 *
 * Local, private class.
 *
 * TODO: Perhaps move more code for hierarchy state handling to this class.
 *       Till now, only the required and most obvious has been done.
 */
class HierarchicalStatus {

  constructor() {
    this.childrenReference = {};
    this.parentReference = {};
    this.levels = {};
    this.trees = {};

    this.isTree = false;
  }


  /**
   * Add the relation between given nodes to the current state.
   */
  addRelation(parentNodeId, childNodeId) {
    if (this.childrenReference[parentNodeId] === undefined) {
      this.childrenReference[parentNodeId] = [];
    }
    this.childrenReference[parentNodeId].push(childNodeId);

    if (this.parentReference[childNodeId] === undefined) {
      this.parentReference[childNodeId] = [];
    }
    this.parentReference[childNodeId].push(parentNodeId);
  }


  /**
   * Check if the current state is for a tree or forest network.
   *
   * This is the case if every node has at most one parent.
   *
   * Pre: parentReference init'ed properly for current network
   */
  checkIfTree() {
    for (let i in this.parentReference) {
      if (this.parentReference[i].length > 1) {
        this.isTree = false;
        return;
      }
    }

    this.isTree = true;
  }


  /**
   * Ensure level for given id is defined.
   *
   * Sets level to zero for given node id if not already present
   */
  ensureLevel(nodeId) {
    if (this.levels[nodeId] === undefined) {
      this.levels[nodeId] = 0;
    }
  }


  /**
   * get the maximum level of a branch.
   *
   * TODO: Never entered; find a test case to test this!
   */
  getMaxLevel(nodeId) {
    let accumulator = {};

    let _getMaxLevel = (nodeId) => {
      if (accumulator[nodeId] !== undefined) {
        return accumulator[nodeId];
      }
      let level = this.levels[nodeId];
      if (this.childrenReference[nodeId]) {
        let children = this.childrenReference[nodeId];
        if (children.length > 0) {
          for (let i = 0; i < children.length; i++) {
            level = Math.max(level,_getMaxLevel(children[i]));
          }
        }
      }
      accumulator[nodeId] = level;
      return level;
    };

    return _getMaxLevel(nodeId);
  }


  levelDownstream(nodeA, nodeB) {
    if (this.levels[nodeB.id] === undefined) {
      // set initial level
      if (this.levels[nodeA.id] === undefined) {
        this.levels[nodeA.id] = 0;
      }
      // set level
      this.levels[nodeB.id] = this.levels[nodeA.id] + 1;
    }
  }


  /**
   * Small util method to set the minimum levels of the nodes to zero.
   */
  setMinLevelToZero(nodes) {
    let minLevel = 1e9;
    // get the minimum level
    for (let nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        if (this.levels[nodeId] !== undefined) {
          minLevel = Math.min(this.levels[nodeId], minLevel);
        }
      }
    }

    // subtract the minimum from the set so we have a range starting from 0
    for (let nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        if (this.levels[nodeId] !== undefined) {
          this.levels[nodeId] -= minLevel;
        }
      }
    }
  }


  /**
   * Get the min and max xy-coordinates of a given tree
   */
  getTreeSize(nodes, index) {
    let min_x = 1e9;
    let max_x = -1e9;
    let min_y = 1e9;
    let max_y = -1e9;

    for (let nodeId in this.trees) {
      if (this.trees.hasOwnProperty(nodeId)) {
        if (this.trees[nodeId] === index) {
          let node = nodes[nodeId];
          min_x = Math.min(node.x, min_x);
          max_x = Math.max(node.x, max_x);
          min_y = Math.min(node.y, min_y);
          max_y = Math.max(node.y, max_y);
        }
      }
    }

    return {
      min_x: min_x,
      max_x: max_x,
      min_y: min_y,
      max_y: max_y
    };
  }
}


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
    this.body.emitter.on('_adjustEdgesForHierarchicalLayout', () => {
      if (this.options.hierarchical.enabled !== true) {
        return;
      }
      // get the type of static smooth curve in case it is required
      let type = this.getStaticType();

      // force all edges into static smooth curves.
      this.body.emitter.emit('_forceDisableDynamicCurves', type, false);
    });
  }

  setOptions(options, allOptions) {
    if (options !== undefined) {
      let hierarchical = this.options.hierarchical;
      let prevHierarchicalState = hierarchical.enabled;
      util.selectiveDeepExtend(["randomSeed", "improvedLayout"],this.options, options);
      util.mergeOptions(this.options, options, 'hierarchical');
      if (options.randomSeed !== undefined)     {this.initialRandomSeed = options.randomSeed;}

      if (hierarchical.enabled === true) {
        if (prevHierarchicalState === true) {
          // refresh the overridden options for nodes and edges.
          this.body.emitter.emit('refresh', true);
        }

        // make sure the level separation is the right way up
        if (hierarchical.direction === 'RL' || hierarchical.direction === 'DU') {
          if (hierarchical.levelSeparation > 0) {
            hierarchical.levelSeparation *= -1;
          }
        }
        else {
          if (hierarchical.levelSeparation < 0) {
            hierarchical.levelSeparation *= -1;
          }
        }

        this.body.emitter.emit('_resetHierarchicalLayout');
        // because the hierarchical system needs it's own physics and smooth curve settings,
        // we adapt the other options if needed.
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
      let backupPhysics = this.optionsBackup.physics;

      // set the physics
      if (allOptions.physics === undefined || allOptions.physics === true) {
        allOptions.physics = {
          enabled: backupPhysics.enabled === undefined ? true : backupPhysics.enabled,
          solver :'hierarchicalRepulsion'
        };
        backupPhysics.enabled = backupPhysics.enabled === undefined ? true : backupPhysics.enabled;
        backupPhysics.solver = backupPhysics.solver || 'barnesHut';
      }
      else if (typeof allOptions.physics === 'object') {
        backupPhysics.enabled = allOptions.physics.enabled === undefined ? true : allOptions.physics.enabled;
        backupPhysics.solver  = allOptions.physics.solver  || 'barnesHut';
        allOptions.physics.solver = 'hierarchicalRepulsion';
      }
      else if (allOptions.physics !== false) {
        backupPhysics.solver ='barnesHut';
        allOptions.physics = {solver:'hierarchicalRepulsion'};
      }

      // get the type of static smooth curve in case it is required
      let type = this.getStaticType();

      // disable smooth curves if nothing is defined. If smooth curves have been turned on,
      // turn them into static smooth curves.
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
          let smooth =  allOptions.edges.smooth;

          // allow custom types except for dynamic
          if (smooth.type !== undefined && smooth.type !== 'dynamic') {
            type = smooth.type;
          }

          // TODO: this is options merging; see if the standard routines can be used here.
          this.optionsBackup.edges = {
            smooth        : smooth.enabled        === undefined ? true     : smooth.enabled,
            type          : smooth.type           === undefined ? 'dynamic': smooth.type,
            roundness     : smooth.roundness      === undefined ? 0.5      : smooth.roundness,
            forceDirection: smooth.forceDirection === undefined ? false    : smooth.forceDirection
          };


          // NOTE: Copying an object to self; this is basically setting defaults for undefined variables
          allOptions.edges.smooth = {
            enabled       : smooth.enabled        === undefined ? true : smooth.enabled,
            type          : type,
            roundness     : smooth.roundness      === undefined ? 0.5  : smooth.roundness,
            forceDirection: smooth.forceDirection === undefined ? false: smooth.forceDirection
          }
        }
      }

      // Force all edges into static smooth curves.
      // Only applies to edges that do not use the global options for smooth.
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
      let radius = nodesArray.length + 50;
      for (let i = 0; i < nodesArray.length; i++) {
        let node = nodesArray[i];
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
      let indices = this.body.nodeIndices;

      // first check if we should Kamada Kawai to layout. The threshold is if less than half of the visible
      // nodes have predefined positions we use this.
      let positionDefined = 0;
      for (let i = 0; i < indices.length; i++) {
        let node = this.body.nodes[indices[i]];
        if (node.predefinedPosition === true) {
          positionDefined += 1;
        }
      }

      // if less than half of the nodes have a predefined position we continue
      if (positionDefined < 0.5 * indices.length) {
        let MAX_LEVELS = 10;
        let level = 0;
        let clusterThreshold = 150;
        // Performance enhancement, during clustering edges need only be simple straight lines.
        // These options don't propagate outside the clustering phase.
        let clusterOptions = {
          clusterEdgeProperties:{
            smooth: {
              enabled: false
            }
          }
        };

        // if there are a lot of nodes, we cluster before we run the algorithm.
        // NOTE: this part fails to find clusters for large scale-free networks, which should
        //       be easily clusterable.
        // TODO: examine why this is so
        if (indices.length > clusterThreshold) {
          let startLength = indices.length;
          while (indices.length > clusterThreshold && level <= MAX_LEVELS) {
            //console.time("clustering")
            level += 1;
            let before = indices.length;
            // if there are many nodes we do a hubsize cluster
            if (level % 3 === 0) {
              this.body.modules.clustering.clusterBridges(clusterOptions);
            }
            else {
              this.body.modules.clustering.clusterOutliers(clusterOptions);
            }
            let after = indices.length;
            if (before == after && level % 3 !== 0) {
              this._declusterAll();
              this.body.emitter.emit("_layoutFailed");
              console.info("This network could not be positioned by this version of the improved layout algorithm."
                        +  " Please disable improvedLayout for better performance.");
              return;
            }
            //console.timeEnd("clustering")
            //console.log(before,level,after);
          }
          // increase the size of the edges
          this.body.modules.kamadaKawai.setOptions({springLength: Math.max(150, 2 * startLength)})
        }
        if (level > MAX_LEVELS){
          console.info("The clustering didn't succeed within the amount of interations allowed,"
                     + " progressing with partial result.");
        }

        // position the system for these nodes and edges
        this.body.modules.kamadaKawai.solve(indices, this.body.edgeIndices, true);

        // shift to center point
        this._shiftToCenter();

        // perturb the nodes a little bit to force the physics to kick in
        let offset = 70;
        for (let i = 0; i < indices.length; i++) {
          // Only perturb the nodes that aren't fixed
          let node = this.body.nodes[indices[i]];
          if (node.predefinedPosition === false) {
            node.x += (0.5 - this.seededRandom())*offset;
            node.y += (0.5 - this.seededRandom())*offset;
          }
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
      let node = this.body.nodes[this.body.nodeIndices[i]];
      node.x -= center.x;
      node.y -= center.y;
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
      this.lastNodeOnLevel = {};
      this.hierarchical = new HierarchicalStatus();
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
            this.hierarchical.levels[nodeId] = node.options.level;
          }
          else {
            undefinedLevel = true;
          }
        }
      }

      // if the user defined some levels but not all, alert and run without hierarchical layout
      if (undefinedLevel === true && definedLevel === true) {
        throw new Error('To use the hierarchical layout, nodes require either no predefined levels'
                      + ' or levels have to be defined for all nodes.');
      }
      else {
        // define levels if undefined by the users. Based on hubsize.
        if (undefinedLevel === true) {
          let sortMethod = this.options.hierarchical.sortMethod;
          if (sortMethod === 'hubsize') {
            this._determineLevelsByHubsize();
          }
          else if (sortMethod === 'directed') {
            this._determineLevelsDirected();
          }
          else if (sortMethod === 'custom') {
            this._determineLevelsCustomCallback();
          }
        }


        // fallback for cases where there are nodes but no edges
        for (let nodeId in this.body.nodes) {
          if (this.body.nodes.hasOwnProperty(nodeId)) {
            this.hierarchical.ensureLevel(nodeId);
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
      let shiftBy = 0;
      for (let i = 0; i < treeSizes.length - 1; i++) {
        let diff = treeSizes[i].max - treeSizes[i+1].min;
        shiftBy += diff + this.options.hierarchical.treeSpacing;
        shiftTree(i + 1, shiftBy);
      }
    };

    // shift a single tree by an offset
    let shiftTree = (index, offset) => {
      for (let nodeId in this.hierarchical.trees) {
        if (this.hierarchical.trees.hasOwnProperty(nodeId)) {
          if (this.hierarchical.trees[nodeId] === index) {
            let node = this.body.nodes[nodeId];
            let pos = this._getPositionForHierarchy(node);
            this._setPositionForHierarchy(node, pos + offset, undefined, true);
          }
        }
      }
    };

    // get the width of a tree
    let getTreeSize = (index) => {
      let res = this.hierarchical.getTreeSize(this.body.nodes, index);
      if (this._isVertical()) {
        return {min: res.min_x, max: res.max_x};
      } else {
        return {min: res.min_y, max: res.max_y};
      }
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
      if (map[source.id]) {
        return;
      }
      map[source.id] = true;
      if (this.hierarchical.childrenReference[source.id]) {
        let children = this.hierarchical.childrenReference[source.id];
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
          let level = this.hierarchical.levels[node.id];
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


    // check what the maximum level is these nodes have in common.
    let getCollisionLevel = (node1, node2) => {
      let maxLevel1 = this.hierarchical.getMaxLevel(node1.id);
      let maxLevel2 = this.hierarchical.getMaxLevel(node2.id);
      return Math.min(maxLevel1, maxLevel2);
    };

    // check if two nodes have the same parent(s)
    let hasSameParent = (node1, node2) => {
      let parents1 = this.hierarchical.parentReference[node1.id];
      let parents2 = this.hierarchical.parentReference[node2.id];
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
              if (this.hierarchical.trees[levelNodes[j].id] === this.hierarchical.trees[levelNodes[j+1].id])  {
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
        let nodeSpacing =  this.options.hierarchical.nodeSpacing;
        //console.log("NOW CHECKING:", node1.id, node2.id, diffAbs);
        if (diffAbs > nodeSpacing) {
          let branchNodes1 = {};
          let branchNodes2 = {};

          getBranchNodes(node1, branchNodes1);
          getBranchNodes(node2, branchNodes2);

          // check the largest distance between the branches
          let maxLevel = getCollisionLevel(node1, node2);
          let [min1,max1, minSpace1, maxSpace1] = getBranchBoundary(branchNodes1, maxLevel);
          let [min2,max2, minSpace2, maxSpace2] = getBranchBoundary(branchNodes2, maxLevel);

          //console.log(node1.id, getBranchBoundary(branchNodes1, maxLevel), node2.id,
          //            getBranchBoundary(branchNodes2, maxLevel), maxLevel);
          let diffBranch = Math.abs(max1 - min2);
          if (diffBranch > nodeSpacing) {
            let offset = max1 - min2 + nodeSpacing;
            if (offset < -minSpace2 + nodeSpacing) {
              offset = -minSpace2 + nodeSpacing;
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
        let nodeLevel = this.hierarchical.levels[node.id];

        // gather constants
        let C2 = this.options.hierarchical.levelSeparation * this.options.hierarchical.levelSeparation;
        let referenceNodes = {};
        let aboveEdges = [];
        for (let i = 0; i < allEdges.length; i++) {
          let edge = allEdges[i];
          if (edge.toId != edge.fromId) {
            let otherNode = edge.toId == nodeId ? edge.from : edge.to;
            referenceNodes[allEdges[i].id] = otherNode;
            if (this.hierarchical.levels[otherNode.id] < nodeLevel) {
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
    let level = this.hierarchical.levels[node.id];
    if (level !== undefined) {
      let index = this.distributionIndex[node.id];
      let position = this._getPositionForHierarchy(node);
      let ordering = this.distributionOrdering[level];
      let minSpace = 1e9;
      let maxSpace = 1e9;
      if (index !== 0) {
        let prevNode = ordering[index - 1];
        if ((useMap === true && map[prevNode.id] === undefined) || useMap === false) {
          let prevPos = this._getPositionForHierarchy(prevNode);
          minSpace = position - prevPos;
        }
      }

      if (index != ordering.length - 1) {
        let nextNode = ordering[index + 1];
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
    if (this.hierarchical.parentReference[node.id]) {
      let parents = this.hierarchical.parentReference[node.id];
      for (var i = 0; i < parents.length; i++) {
        let parentId = parents[i];
        let parentNode = this.body.nodes[parentId];
        let children = this.hierarchical.childrenReference[parentId];

        if (children !== undefined) {
          // get the range of the children
          let newPosition = this._getCenterPosition(children);

          let position = this._getPositionForHierarchy(parentNode);
          let [minSpace, maxSpace] = this._getSpaceAroundNode(parentNode);
          let diff = position - newPosition;
          if ((diff < 0 && Math.abs(diff) < maxSpace - this.options.hierarchical.nodeSpacing) ||
              (diff > 0 && Math.abs(diff) < minSpace - this.options.hierarchical.nodeSpacing)) {
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
            let spacing = this.options.hierarchical.nodeSpacing;
            let pos = spacing * handledNodeCount;
            // We get the X or Y values we need and store them in pos and previousPos.
            // The get and set make sure we get X or Y
            if (handledNodeCount > 0) {
              pos = this._getPositionForHierarchy(nodeArray[i-1]) + spacing;
            }
            this._setPositionForHierarchy(node, pos, level);
            this._validatePositionAndContinue(node, level, pos);

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
    let childRef = this.hierarchical.childrenReference[parentId];

    // if this is not a parent, cancel the placing. This can happen with multiple parents to one child.
    if (childRef === undefined) {
      return;
    }

    // get a list of childNodes
    let childNodes = [];
    for (let i = 0; i < childRef.length; i++) {
      childNodes.push(this.body.nodes[childRef[i]]);
    }

    // use the positions to order the nodes.
    this._sortNodeArray(childNodes);

    // position the childNodes
    for (let i = 0; i < childNodes.length; i++) {
      let childNode = childNodes[i];
      let childNodeLevel = this.hierarchical.levels[childNode.id];
      // check if the child node is below the parent node and if it has already been positioned.
      if (childNodeLevel > parentLevel && this.positionedNodes[childNode.id] === undefined) {
        // get the amount of space required for this node. If parent the width is based on the amount of children.
        let spacing = this.options.hierarchical.nodeSpacing;
        let pos;

        // we get the X or Y values we need and store them in pos and previousPos.
        // The get and set make sure we get X or Y
        if (i === 0) {pos = this._getPositionForHierarchy(this.body.nodes[parentId]);}
        else         {pos = this._getPositionForHierarchy(childNodes[i-1]) + spacing;}
        this._setPositionForHierarchy(childNode, pos, childNodeLevel);
        this._validatePositionAndContinue(childNode, childNodeLevel, pos);
      }
      else {
        return;
      }
    }

    // center the parent nodes.
    let center = this._getCenterPosition(childNodes);
    this._setPositionForHierarchy(this.body.nodes[parentId], center, parentLevel);
  }


  /**
   * This method checks for overlap and if required shifts the branch. It also keeps records of positioned nodes.
   * Finally it will call _placeBranchNodes to place the branch nodes.
   * @param node
   * @param level
   * @param pos
   * @private
   */
  _validatePositionAndContinue(node, level, pos) {
    // This only works for strict hierarchical networks, i.e. trees and forests
    // Early exit if this is not the case
    if (!this.hierarchical.isTree) return;

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
   * Receives an array with node indices and returns an array with the actual node references.
   * Used for sorting based on node properties.
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

    // we fix Y because the hierarchy is vertical,
    // we fix X so we do not give a node an x position for a second time.
    // the fix of X is removed after the x value has been set.
    for (nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        node = this.body.nodes[nodeId];
        let level = this.hierarchical.levels[nodeId] === undefined ? 0 : this.hierarchical.levels[nodeId];
        if(this._isVertical()) {
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
   * Return the active (i.e. visible) edges for this node
   *
   * @returns {array} Array of edge instances
   * @private
   */
  _getActiveEdges(node) {
    let result = [];

    for (let j in node.edges) {
      let edge = node.edges[j];
      if (this.body.edgeIndices.indexOf(edge.id) !== -1) {
        result.push(edge);
      }
    }

    return result;
  }


  /**
   * Get the hubsizes for all active nodes.
   *
   * @returns {number}
   * @private
   */
  _getHubSizes() {
    let hubSizes = {};
    let nodeIds = this.body.nodeIndices;

    for (let i in nodeIds) {
      let nodeId = nodeIds[i];
      let node = this.body.nodes[nodeId];
      let hubSize = this._getActiveEdges(node).length;
      hubSizes[hubSize] = true;
    }

    // Make an array of the size sorted descending
    let result = [];
    for (let size in hubSizes) {
      result.push(Number(size));
    }
    result.sort(function(a, b) {
      return b - a;
    });

    return result;
  }


  /**
   * this function allocates nodes in levels based on the recursive branching from the largest hubs.
   *
   * @private
   */
  _determineLevelsByHubsize() {
    let levelDownstream = (nodeA, nodeB) => {
      this.hierarchical.levelDownstream(nodeA, nodeB);
    }

    let hubSizes = this._getHubSizes();

    for (let i = 0; i < hubSizes.length; ++i ) {
      let hubSize = hubSizes[i];
      if (hubSize === 0) break;

      let nodeIds = this.body.nodeIndices;
      for (let j in nodeIds) {
        let nodeId = nodeIds[j];
        let node = this.body.nodes[nodeId];

        if (hubSize === this._getActiveEdges(node).length) {
          this._crawlNetwork(levelDownstream, nodeId);
        }
      }
    }
  }


  /**
   * TODO: release feature
   * TODO: Determine if this feature is needed at all
   *
   * @private
   */
  _determineLevelsCustomCallback() {
    let minLevel = 100000;

    // TODO: this should come from options.
    let customCallback = function(nodeA, nodeB, edge) {

    };

    // TODO: perhaps move to HierarchicalStatus.
    //       But I currently don't see the point, this method is not used.
    let levelByDirection = (nodeA, nodeB, edge) => {
      let levelA = this.hierarchical.levels[nodeA.id];
      // set initial level
      if (levelA === undefined) { levelA = this.hierarchical.levels[nodeA.id] = minLevel;}

      let diff = customCallback(
        NetworkUtil.cloneOptions(nodeA,'node'),
        NetworkUtil.cloneOptions(nodeB,'node'),
        NetworkUtil.cloneOptions(edge,'edge')
      );

      this.hierarchical.levels[nodeB.id] = levelA + diff;
    };

    this._crawlNetwork(levelByDirection);
    this.hierarchical.setMinLevelToZero(this.body.nodes);
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
      let levelA = this.hierarchical.levels[nodeA.id];
      // set initial level
      if (levelA === undefined) { levelA = this.hierarchical.levels[nodeA.id] = minLevel;}
      if (edge.toId == nodeB.id) {
        this.hierarchical.levels[nodeB.id] = levelA + 1;
      }
      else {
        this.hierarchical.levels[nodeB.id] = levelA - 1;
      }
    };

    this._crawlNetwork(levelByDirection);
    this.hierarchical.setMinLevelToZero(this.body.nodes);
  }


  /**
   * Update the bookkeeping of parent and child.
   * @private
   */
  _generateMap() {
    let fillInRelations = (parentNode, childNode) => {
      if (this.hierarchical.levels[childNode.id] > this.hierarchical.levels[parentNode.id]) {
        this.hierarchical.addRelation(parentNode.id, childNode.id);
      }
    };

    this._crawlNetwork(fillInRelations);
    this.hierarchical.checkIfTree();
  }


  /**
   * Crawl over the entire network and use a callback on each node couple that is connected to each other.
   * @param callback          | will receive nodeA, nodeB and the connecting edge. A and B are distinct.
   * @param startingNodeId
   * @private
   */
  _crawlNetwork(callback = function() {}, startingNodeId) {
    let progress = {};
    let treeIndex = 0;

    let crawler = (node, tree) => {
      if (progress[node.id] === undefined) {

        if (this.hierarchical.trees[node.id] === undefined) {
          this.hierarchical.trees[node.id] = tree;
          this.treeIndex = Math.max(tree, this.treeIndex);
        }

        progress[node.id] = true;
        let childNode;
        let edges = this._getActiveEdges(node);
        for (let i = 0; i < edges.length; i++) {
          let edge = edges[i];
          if (edge.connected === true) {
            if (edge.toId == node.id) {         // '==' because id's can be string and numeric
              childNode = edge.from;
            }
            else {
              childNode = edge.to;
            }

            if (node.id != childNode.id) {      // '!=' because id's can be string and numeric
              callback(node, childNode, edge);
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
    let progress = {};
    let shifter = (parentId) => {
      if (progress[parentId]) {
        return;
      }
      progress[parentId] = true;
      if(this._isVertical()) {
        this.body.nodes[parentId].x += diff;
      }
      else {
        this.body.nodes[parentId].y += diff;
      }

      let childRef = this.hierarchical.childrenReference[parentId];
      if (childRef !== undefined) {
        for (let i = 0; i < childRef.length; i++) {
          shifter(childRef[i]);
        }
      }
    };
    shifter(parentId);
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
      let parentRef =  this.hierarchical.parentReference[child];
      if (parentRef !== undefined) {
        for (let i = 0; i < parentRef.length; i++) {
          let parent = parentRef[i];
          parents[parent] = true;
          iterateParents(parents, parent)
        }
      }
    };
    let findParent = (parents, child) => {
      let parentRef =  this.hierarchical.parentReference[child];
      if (parentRef !== undefined) {
        for (let i = 0; i < parentRef.length; i++) {
          let parent = parentRef[i];
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

    if(this._isVertical()) {
      node.x = position;
    }
    else {
      node.y = position;
    }
  }


  /**
   * Utility function to cut down on typing this all the time.
   *
   * TODO: use this in all applicable situations in this class.
   *
   * @private
   */
  _isVertical() {
    return (this.options.hierarchical.direction === 'UD' || this.options.hierarchical.direction === 'DU');
  }

  /**
   * Abstract the getting of the position of a node so we do not have to repeat the direction check all the time.
   * @param node
   * @returns {number|*}
   * @private
   */
  _getPositionForHierarchy(node) {
    if(this._isVertical()) {
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
      if(this._isVertical()) {
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


  /**
   * Get the type of static smooth curve in case it is required.
   *
   * The return value is the type to use to translate dynamic curves to
   * another type, in the case of hierarchical layout. Dynamic curves do
   * not work for that layout type.
   */
  getStaticType() {
    // Node that 'type' is the edge type, and therefore 'orthogonal' to the layout type.
    let type = 'horizontal';
    if (!this._isVertical()) {
      type = 'vertical';
    }

    return type;
  }


  /**
   * Determine the center position of a branch from the passed list of child nodes
   *
   * This takes into account the positions of all the child nodes.
   * @param childNodes {array} Array of either child nodes or node id's
   * @return {number}
   * @private
   */
  _getCenterPosition(childNodes) {
    let minPos = 1e9;
    let maxPos = -1e9;

    for (let i = 0; i < childNodes.length; i++) {
      let childNode;
      if (childNodes[i].id !== undefined) {
        childNode = childNodes[i];
      } else {
        let childNodeId = childNodes[i];
        childNode = this.body.nodes[childNodeId];
      }

      let position = this._getPositionForHierarchy(childNode);
      minPos = Math.min(minPos, position);
      maxPos = Math.max(maxPos, position);
    }

    return 0.5 * (minPos + maxPos);
  }
}

export default LayoutEngine;
