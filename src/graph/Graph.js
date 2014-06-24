/**
 * @constructor Graph
 * Create a graph visualization, displaying nodes and edges.
 *
 * @param {Element} container   The DOM element in which the Graph will
 *                                  be created. Normally a div element.
 * @param {Object} data         An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 */
function Graph (container, data, options) {

  this._initializeMixinLoaders();

  // create variables and set default values
  this.containerElement = container;
  this.width = '100%';
  this.height = '100%';

  // render and calculation settings
  this.renderRefreshRate = 60;                         // hz (fps)
  this.renderTimestep = 1000 / this.renderRefreshRate; // ms -- saves calculation later on
  this.renderTime = 0.5 * this.renderTimestep;         // measured time it takes to render a frame
  this.maxPhysicsTicksPerRender = 3;                   // max amount of physics ticks per render step.
  this.physicsDiscreteStepsize = 0.50;                 // discrete stepsize of the simulation

  this.stabilize = true;  // stabilize before displaying the graph
  this.selectable = true;
  this.initializing = true;

  // these functions are triggered when the dataset is edited
  this.triggerFunctions = {add:null,edit:null,editEdge:null,connect:null,del:null};

  // set constant values
  this.constants = {
    nodes: {
      radiusMin: 5,
      radiusMax: 20,
      radius: 5,
      shape: 'ellipse',
      image: undefined,
      widthMin: 16, // px
      widthMax: 64, // px
      fixed: false,
      fontColor: 'black',
      fontSize: 14, // px
      fontFace: 'verdana',
      level: -1,
      color: {
          border: '#2B7CE9',
          background: '#97C2FC',
        highlight: {
          border: '#2B7CE9',
          background: '#D2E5FF'
        },
        hover: {
          border: '#2B7CE9',
          background: '#D2E5FF'
        }
      },
      borderColor: '#2B7CE9',
      backgroundColor: '#97C2FC',
      highlightColor: '#D2E5FF',
      group: undefined
    },
    edges: {
      widthMin: 1,
      widthMax: 15,
      width: 1,
      hoverWidth: 1.5,
      style: 'line',
      color: {
        color:'#848484',
        highlight:'#848484',
        hover: '#848484'
      },
      fontColor: '#343434',
      fontSize: 14, // px
      fontFace: 'arial',
      fontFill: 'white',
      arrowScaleFactor: 1,
      dash: {
        length: 10,
        gap: 5,
        altLength: undefined
      }
    },
    configurePhysics:false,
    physics: {
      barnesHut: {
        enabled: true,
        theta: 1 / 0.6, // inverted to save time during calculation
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09
      },
      repulsion: {
        centralGravity: 0.1,
        springLength: 200,
        springConstant: 0.05,
        nodeDistance: 100,
        damping: 0.09
      },
      hierarchicalRepulsion: {
        enabled: false,
        centralGravity: 0.0,
        springLength: 100,
        springConstant: 0.01,
        nodeDistance: 60,
        damping: 0.09
      },
      damping: null,
      centralGravity: null,
      springLength: null,
      springConstant: null
    },
    clustering: {                   // Per Node in Cluster = PNiC
      enabled: false,               // (Boolean)             | global on/off switch for clustering.
      initialMaxNodes: 100,         // (# nodes)             | if the initial amount of nodes is larger than this, we cluster until the total number is less than this threshold.
      clusterThreshold:500,         // (# nodes)             | during calculate forces, we check if the total number of nodes is larger than this. If it is, cluster until reduced to reduceToNodes
      reduceToNodes:300,            // (# nodes)             | during calculate forces, we check if the total number of nodes is larger than clusterThreshold. If it is, cluster until reduced to this
      chainThreshold: 0.4,          // (% of all drawn nodes)| maximum percentage of allowed chainnodes (long strings of connected nodes) within all nodes. (lower means less chains).
      clusterEdgeThreshold: 20,     // (px)                  | edge length threshold. if smaller, this node is clustered.
      sectorThreshold: 100,         // (# nodes in cluster)  | cluster size threshold. If larger, expanding in own sector.
      screenSizeThreshold: 0.2,     // (% of canvas)         | relative size threshold. If the width or height of a clusternode takes up this much of the screen, decluster node.
      fontSizeMultiplier: 4.0,      // (px PNiC)             | how much the cluster font size grows per node in cluster (in px).
      maxFontSize: 1000,
      forceAmplification: 0.1,      // (multiplier PNiC)     | factor of increase fo the repulsion force of a cluster (per node in cluster).
      distanceAmplification: 0.1,   // (multiplier PNiC)     | factor how much the repulsion distance of a cluster increases (per node in cluster).
      edgeGrowth: 20,               // (px PNiC)             | amount of clusterSize connected to the edge is multiplied with this and added to edgeLength.
      nodeScaling: {width:  1,      // (px PNiC)             | growth of the width  per node in cluster.
                    height: 1,      // (px PNiC)             | growth of the height per node in cluster.
                    radius: 1},     // (px PNiC)             | growth of the radius per node in cluster.
      maxNodeSizeIncrements: 600,   // (# increments)        | max growth of the width  per node in cluster.
      activeAreaBoxSize: 80,       // (px)                  | box area around the curser where clusters are popped open.
      clusterLevelDifference: 2
    },
    navigation: {
      enabled: false
    },
    keyboard: {
      enabled: false,
      speed: {x: 10, y: 10, zoom: 0.02}
    },
    dataManipulation: {
      enabled: false,
      initiallyVisible: false
    },
    hierarchicalLayout: {
      enabled:false,
      levelSeparation: 150,
      nodeSpacing: 100,
      direction: "UD"   // UD, DU, LR, RL
    },
    freezeForStabilization: false,
    smoothCurves: true,
    maxVelocity:  10,
    minVelocity:  0.1,   // px/s
    stabilizationIterations: 1000,  // maximum number of iteration to stabilize
    labels:{
      add:"Add Node",
      edit:"Edit",
      link:"Add Link",
      del:"Delete selected",
      editNode:"Edit Node",
      editEdge:"Edit Edge",
      back:"Back",
      addDescription:"Click in an empty space to place a new node.",
      linkDescription:"Click on a node and drag the edge to another node to connect them.",
      editEdgeDescription:"Click on the control points and drag them to a node to connect to it.",
      addError:"The function for add does not support two arguments (data,callback).",
      linkError:"The function for connect does not support two arguments (data,callback).",
      editError:"The function for edit does not support two arguments (data, callback).",
      editBoundError:"No edit function has been bound to this button.",
      deleteError:"The function for delete does not support two arguments (data, callback).",
      deleteClusterError:"Clusters cannot be deleted."
    },
    tooltip: {
      delay: 300,
      fontColor: 'black',
      fontSize: 14, // px
      fontFace: 'verdana',
      color: {
        border: '#666',
        background: '#FFFFC6'
      }
    },
    dragGraph: true,
    dragNodes: true,
    zoomable: true,
    hover: false
  };
  this.hoverObj = {nodes:{},edges:{}};


  // Node variables
  var graph = this;
  this.groups = new Groups(); // object with groups
  this.images = new Images(); // object with images
  this.images.setOnloadCallback(function () {
    graph._redraw();
  });

  // keyboard navigation variables
  this.xIncrement = 0;
  this.yIncrement = 0;
  this.zoomIncrement = 0;

  // loading all the mixins:
  // load the force calculation functions, grouped under the physics system.
  this._loadPhysicsSystem();
  // create a frame and canvas
  this._create();
  // load the sector system.    (mandatory, fully integrated with Graph)
  this._loadSectorSystem();
  // load the cluster system.   (mandatory, even when not using the cluster system, there are function calls to it)
  this._loadClusterSystem();
  // load the selection system. (mandatory, required by Graph)
  this._loadSelectionSystem();
  // load the selection system. (mandatory, required by Graph)
  this._loadHierarchySystem();

  // apply options
  this._setTranslation(this.frame.clientWidth / 2, this.frame.clientHeight / 2);
  this._setScale(1);
  this.setOptions(options);

  // other vars
  this.freezeSimulation = false;// freeze the simulation
  this.cachedFunctions = {};

  // containers for nodes and edges
  this.calculationNodes = {};
  this.calculationNodeIndices = [];
  this.nodeIndices = [];        // array with all the indices of the nodes. Used to speed up forces calculation
  this.nodes = {};              // object with Node objects
  this.edges = {};              // object with Edge objects

  // position and scale variables and objects
  this.canvasTopLeft     = {"x": 0,"y": 0};   // coordinates of the top left of the canvas.     they will be set during _redraw.
  this.canvasBottomRight = {"x": 0,"y": 0};   // coordinates of the bottom right of the canvas. they will be set during _redraw
  this.pointerPosition = {"x": 0,"y": 0};   // coordinates of the bottom right of the canvas. they will be set during _redraw
  this.areaCenter = {};               // object with x and y elements used for determining the center of the zoom action
  this.scale = 1;                     // defining the global scale variable in the constructor
  this.previousScale = this.scale;    // this is used to check if the zoom operation is zooming in or out

  // datasets or dataviews
  this.nodesData = null;      // A DataSet or DataView
  this.edgesData = null;      // A DataSet or DataView

  // create event listeners used to subscribe on the DataSets of the nodes and edges
  this.nodesListeners = {
    'add': function (event, params) {
      graph._addNodes(params.items);
      graph.start();
    },
    'update': function (event, params) {
      graph._updateNodes(params.items);
      graph.start();
    },
    'remove': function (event, params) {
      graph._removeNodes(params.items);
      graph.start();
    }
  };
  this.edgesListeners = {
    'add': function (event, params) {
      graph._addEdges(params.items);
      graph.start();
    },
    'update': function (event, params) {
      graph._updateEdges(params.items);
      graph.start();
    },
    'remove': function (event, params) {
      graph._removeEdges(params.items);
      graph.start();
    }
  };

  // properties for the animation
  this.moving = true;
  this.timer = undefined; // Scheduling function. Is definded in this.start();

  // load data (the disable start variable will be the same as the enabled clustering)
  this.setData(data,this.constants.clustering.enabled || this.constants.hierarchicalLayout.enabled);

  // hierarchical layout
  this.initializing = false;
  if (this.constants.hierarchicalLayout.enabled == true) {
    this._setupHierarchicalLayout();
  }
  else {
    // zoom so all data will fit on the screen, if clustering is enabled, we do not want start to be called here.
    if (this.stabilize == false) {
      this.zoomExtent(true,this.constants.clustering.enabled);
    }
  }

  // if clustering is disabled, the simulation will have started in the setData function
  if (this.constants.clustering.enabled) {
    this.startWithClustering();
  }
}

// Extend Graph with an Emitter mixin
Emitter(Graph.prototype);

/**
 * Get the script path where the vis.js library is located
 *
 * @returns {string | null} path   Path or null when not found. Path does not
 *                                 end with a slash.
 * @private
 */
Graph.prototype._getScriptPath = function() {
  var scripts = document.getElementsByTagName( 'script' );

  // find script named vis.js or vis.min.js
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    var match = src && /\/?vis(.min)?\.js$/.exec(src);
    if (match) {
      // return path without the script name
      return src.substring(0, src.length - match[0].length);
    }
  }

  return null;
};


/**
 * Find the center position of the graph
 * @private
 */
Graph.prototype._getRange = function() {
  var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      node = this.nodes[nodeId];
      if (minX > (node.x)) {minX = node.x;}
      if (maxX < (node.x)) {maxX = node.x;}
      if (minY > (node.y)) {minY = node.y;}
      if (maxY < (node.y)) {maxY = node.y;}
    }
  }
  if (minX == 1e9 && maxX == -1e9 && minY == 1e9 && maxY == -1e9) {
    minY = 0, maxY = 0, minX = 0, maxX = 0;
  }
  return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
};


/**
 * @param {object} range = {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
 * @returns {{x: number, y: number}}
 * @private
 */
Graph.prototype._findCenter = function(range) {
  return {x: (0.5 * (range.maxX + range.minX)),
          y: (0.5 * (range.maxY + range.minY))};
};


/**
 * center the graph
 *
 * @param {object} range = {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
 */
Graph.prototype._centerGraph = function(range) {
  var center = this._findCenter(range);

  center.x *= this.scale;
  center.y *= this.scale;
  center.x -= 0.5 * this.frame.canvas.clientWidth;
  center.y -= 0.5 * this.frame.canvas.clientHeight;

  this._setTranslation(-center.x,-center.y); // set at 0,0
};


/**
 * This function zooms out to fit all data on screen based on amount of nodes
 *
 * @param {Boolean} [initialZoom]  | zoom based on fitted formula or range, true = fitted, default = false;
 * @param {Boolean} [disableStart] | If true, start is not called.
 */
Graph.prototype.zoomExtent = function(initialZoom, disableStart) {
  if (initialZoom === undefined) {
    initialZoom = false;
  }
  if (disableStart === undefined) {
    disableStart = false;
  }

  var range = this._getRange();
  var zoomLevel;

  if (initialZoom == true) {
    var numberOfNodes = this.nodeIndices.length;
    if (this.constants.smoothCurves == true) {
      if (this.constants.clustering.enabled == true &&
        numberOfNodes >= this.constants.clustering.initialMaxNodes) {
        zoomLevel = 49.07548 / (numberOfNodes + 142.05338) + 9.1444e-04; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
      }
      else {
        zoomLevel = 12.662 / (numberOfNodes + 7.4147) + 0.0964822; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
      }
    }
    else {
      if (this.constants.clustering.enabled == true &&
          numberOfNodes >= this.constants.clustering.initialMaxNodes) {
        zoomLevel = 77.5271985 / (numberOfNodes + 187.266146) + 4.76710517e-05; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
      }
      else {
        zoomLevel = 30.5062972 / (numberOfNodes + 19.93597763) + 0.08413486; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
      }
    }

    // correct for larger canvasses.
    var factor = Math.min(this.frame.canvas.clientWidth / 600, this.frame.canvas.clientHeight / 600);
    zoomLevel *= factor;
  }
  else {
    var xDistance = (Math.abs(range.minX) + Math.abs(range.maxX)) * 1.1;
    var yDistance = (Math.abs(range.minY) + Math.abs(range.maxY)) * 1.1;

    var xZoomLevel = this.frame.canvas.clientWidth / xDistance;
    var yZoomLevel = this.frame.canvas.clientHeight / yDistance;

    zoomLevel = (xZoomLevel <= yZoomLevel) ? xZoomLevel : yZoomLevel;
  }

  if (zoomLevel > 1.0) {
    zoomLevel = 1.0;
  }


  this._setScale(zoomLevel);
  this._centerGraph(range);
  if (disableStart == false) {
    this.moving = true;
    this.start();
  }
};


/**
 * Update the this.nodeIndices with the most recent node index list
 * @private
 */
Graph.prototype._updateNodeIndexList = function() {
  this._clearNodeIndexList();
  for (var idx in this.nodes) {
    if (this.nodes.hasOwnProperty(idx)) {
      this.nodeIndices.push(idx);
    }
  }
};


/**
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data              Object containing parameters:
 *                                   {Array | DataSet | DataView} [nodes] Array with nodes
 *                                   {Array | DataSet | DataView} [edges] Array with edges
 *                                   {String} [dot] String containing data in DOT format
 *                                   {Options} [options] Object with options
 * @param {Boolean} [disableStart]   | optional: disable the calling of the start function.
 */
Graph.prototype.setData = function(data, disableStart) {
  if (disableStart === undefined) {
    disableStart = false;
  }

  if (data && data.dot && (data.nodes || data.edges)) {
    throw new SyntaxError('Data must contain either parameter "dot" or ' +
        ' parameter pair "nodes" and "edges", but not both.');
  }

  // set options
  this.setOptions(data && data.options);

  // set all data
  if (data && data.dot) {
    // parse DOT file
    if(data && data.dot) {
      var dotData = vis.util.DOTToGraph(data.dot);
      this.setData(dotData);
      return;
    }
  }
  else {
    this._setNodes(data && data.nodes);
    this._setEdges(data && data.edges);
  }

  this._putDataInSector();

  if (!disableStart) {
    // find a stable position or start animating to a stable position
    if (this.stabilize) {
      var me = this;
      setTimeout(function() {me._stabilize(); me.start();},0)
    }
    else {
      this.start();
    }
  }
};

/**
 * Set options
 * @param {Object} options
 * @param {Boolean} [initializeView] | set zoom and translation to default.
 */
Graph.prototype.setOptions = function (options) {
  if (options) {
    var prop;
    // retrieve parameter values
    if (options.width !== undefined)           {this.width = options.width;}
    if (options.height !== undefined)          {this.height = options.height;}
    if (options.stabilize !== undefined)       {this.stabilize = options.stabilize;}
    if (options.selectable !== undefined)      {this.selectable = options.selectable;}
    if (options.smoothCurves !== undefined)    {this.constants.smoothCurves = options.smoothCurves;}
    if (options.freezeForStabilization !== undefined)    {this.constants.freezeForStabilization = options.freezeForStabilization;}
    if (options.configurePhysics !== undefined){this.constants.configurePhysics = options.configurePhysics;}
    if (options.stabilizationIterations !== undefined)   {this.constants.stabilizationIterations = options.stabilizationIterations;}
    if (options.dragGraph !== undefined)       {this.constants.dragGraph = options.dragGraph;}
    if (options.dragNodes !== undefined)       {this.constants.dragNodes = options.dragNodes;}
    if (options.zoomable !== undefined)        {this.constants.zoomable = options.zoomable;}
    if (options.hover !== undefined)           {this.constants.hover = options.hover;}

    if (options.labels !== undefined)  {
      for (prop in options.labels) {
        if (options.labels.hasOwnProperty(prop)) {
          this.constants.labels[prop] = options.labels[prop];
        }
      }
    }

    if (options.onAdd) {
        this.triggerFunctions.add = options.onAdd;
      }

    if (options.onEdit) {
      this.triggerFunctions.edit = options.onEdit;
    }

    if (options.onEditEdge) {
      this.triggerFunctions.editEdge = options.onEditEdge;
    }

    if (options.onConnect) {
      this.triggerFunctions.connect = options.onConnect;
    }

    if (options.onDelete) {
      this.triggerFunctions.del = options.onDelete;
    }

    if (options.physics) {
      if (options.physics.barnesHut) {
        this.constants.physics.barnesHut.enabled = true;
        for (prop in options.physics.barnesHut) {
          if (options.physics.barnesHut.hasOwnProperty(prop)) {
            this.constants.physics.barnesHut[prop] = options.physics.barnesHut[prop];
          }
        }
      }

      if (options.physics.repulsion) {
        this.constants.physics.barnesHut.enabled = false;
        for (prop in options.physics.repulsion) {
          if (options.physics.repulsion.hasOwnProperty(prop)) {
            this.constants.physics.repulsion[prop] = options.physics.repulsion[prop];
          }
        }
      }

      if (options.physics.hierarchicalRepulsion) {
        this.constants.hierarchicalLayout.enabled = true;
        this.constants.physics.hierarchicalRepulsion.enabled = true;
        this.constants.physics.barnesHut.enabled = false;
        for (prop in options.physics.hierarchicalRepulsion) {
          if (options.physics.hierarchicalRepulsion.hasOwnProperty(prop)) {
            this.constants.physics.hierarchicalRepulsion[prop] = options.physics.hierarchicalRepulsion[prop];
          }
        }
      }
    }

    if (options.hierarchicalLayout) {
      this.constants.hierarchicalLayout.enabled = true;
      for (prop in options.hierarchicalLayout) {
        if (options.hierarchicalLayout.hasOwnProperty(prop)) {
          this.constants.hierarchicalLayout[prop] = options.hierarchicalLayout[prop];
        }
      }
    }
    else if (options.hierarchicalLayout !== undefined)  {
      this.constants.hierarchicalLayout.enabled = false;
    }

    if (options.clustering) {
      this.constants.clustering.enabled = true;
      for (prop in options.clustering) {
        if (options.clustering.hasOwnProperty(prop)) {
          this.constants.clustering[prop] = options.clustering[prop];
        }
      }
    }
    else if (options.clustering !== undefined)  {
      this.constants.clustering.enabled = false;
    }

    if (options.navigation) {
      this.constants.navigation.enabled = true;
      for (prop in options.navigation) {
        if (options.navigation.hasOwnProperty(prop)) {
          this.constants.navigation[prop] = options.navigation[prop];
        }
      }
    }
    else if (options.navigation !== undefined) {
      this.constants.navigation.enabled = false;
    }

    if (options.keyboard) {
      this.constants.keyboard.enabled = true;
      for (prop in options.keyboard) {
        if (options.keyboard.hasOwnProperty(prop)) {
          this.constants.keyboard[prop] = options.keyboard[prop];
        }
      }
    }
    else if (options.keyboard !== undefined)  {
      this.constants.keyboard.enabled = false;
    }

    if (options.dataManipulation) {
      this.constants.dataManipulation.enabled = true;
      for (prop in options.dataManipulation) {
        if (options.dataManipulation.hasOwnProperty(prop)) {
          this.constants.dataManipulation[prop] = options.dataManipulation[prop];
        }
      }
      this.editMode = this.constants.dataManipulation.initiallyVisible;
    }
    else if (options.dataManipulation !== undefined)  {
      this.constants.dataManipulation.enabled = false;
    }

    // TODO: work out these options and document them
    if (options.edges) {
      for (prop in options.edges) {
        if (options.edges.hasOwnProperty(prop)) {
          if (typeof options.edges[prop] != "object") {
            this.constants.edges[prop] = options.edges[prop];
          }
        }
      }


      if (options.edges.color !== undefined) {
        if (util.isString(options.edges.color)) {
          this.constants.edges.color = {};
          this.constants.edges.color.color = options.edges.color;
          this.constants.edges.color.highlight = options.edges.color;
          this.constants.edges.color.hover = options.edges.color;
        }
        else {
          if (options.edges.color.color !== undefined)     {this.constants.edges.color.color = options.edges.color.color;}
          if (options.edges.color.highlight !== undefined) {this.constants.edges.color.highlight = options.edges.color.highlight;}
          if (options.edges.color.hover !== undefined)     {this.constants.edges.color.hover = options.edges.color.hover;}
        }
      }

      if (!options.edges.fontColor) {
        if (options.edges.color !== undefined) {
          if (util.isString(options.edges.color))           {this.constants.edges.fontColor = options.edges.color;}
          else if (options.edges.color.color !== undefined) {this.constants.edges.fontColor = options.edges.color.color;}
        }
      }

      // Added to support dashed lines
      // David Jordan
      // 2012-08-08
      if (options.edges.dash) {
        if (options.edges.dash.length !== undefined) {
          this.constants.edges.dash.length = options.edges.dash.length;
        }
        if (options.edges.dash.gap !== undefined) {
          this.constants.edges.dash.gap = options.edges.dash.gap;
        }
        if (options.edges.dash.altLength !== undefined) {
          this.constants.edges.dash.altLength = options.edges.dash.altLength;
        }
      }
    }

    if (options.nodes) {
      for (prop in options.nodes) {
        if (options.nodes.hasOwnProperty(prop)) {
          this.constants.nodes[prop] = options.nodes[prop];
        }
      }

      if (options.nodes.color) {
        this.constants.nodes.color = util.parseColor(options.nodes.color);
      }

      /*
       if (options.nodes.widthMin) this.constants.nodes.radiusMin = options.nodes.widthMin;
       if (options.nodes.widthMax) this.constants.nodes.radiusMax = options.nodes.widthMax;
       */
    }
    if (options.groups) {
      for (var groupname in options.groups) {
        if (options.groups.hasOwnProperty(groupname)) {
          var group = options.groups[groupname];
          this.groups.add(groupname, group);
        }
      }
    }

    if (options.tooltip) {
      for (prop in options.tooltip) {
        if (options.tooltip.hasOwnProperty(prop)) {
          this.constants.tooltip[prop] = options.tooltip[prop];
        }
      }
      if (options.tooltip.color) {
        this.constants.tooltip.color = util.parseColor(options.tooltip.color);
      }
    }
  }


  // (Re)loading the mixins that can be enabled or disabled in the options.
  // load the force calculation functions, grouped under the physics system.
  this._loadPhysicsSystem();
  // load the navigation system.
  this._loadNavigationControls();
  // load the data manipulation system
  this._loadManipulationSystem();
  // configure the smooth curves
  this._configureSmoothCurves();


  // bind keys. If disabled, this will not do anything;
  this._createKeyBinds();
  this.setSize(this.width, this.height);
  this.moving = true;
  this.start();

};

/**
 * Create the main frame for the Graph.
 * This function is executed once when a Graph object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 * @private
 */
Graph.prototype._create = function () {
  // remove all elements from the container element.
  while (this.containerElement.hasChildNodes()) {
    this.containerElement.removeChild(this.containerElement.firstChild);
  }

  this.frame = document.createElement('div');
  this.frame.className = 'graph-frame';
  this.frame.style.position = 'relative';
  this.frame.style.overflow = 'hidden';

  // create the graph canvas (HTML canvas element)
  this.frame.canvas = document.createElement( 'canvas' );
  this.frame.canvas.style.position = 'relative';
  this.frame.appendChild(this.frame.canvas);
  if (!this.frame.canvas.getContext) {
    var noCanvas = document.createElement( 'DIV' );
    noCanvas.style.color = 'red';
    noCanvas.style.fontWeight =  'bold' ;
    noCanvas.style.padding =  '10px';
    noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
    this.frame.canvas.appendChild(noCanvas);
  }

  var me = this;
  this.drag = {};
  this.pinch = {};
  this.hammer = Hammer(this.frame.canvas, {
    prevent_default: true
  });
  this.hammer.on('tap',       me._onTap.bind(me) );
  this.hammer.on('doubletap', me._onDoubleTap.bind(me) );
  this.hammer.on('hold',      me._onHold.bind(me) );
  this.hammer.on('pinch',     me._onPinch.bind(me) );
  this.hammer.on('touch',     me._onTouch.bind(me) );
  this.hammer.on('dragstart', me._onDragStart.bind(me) );
  this.hammer.on('drag',      me._onDrag.bind(me) );
  this.hammer.on('dragend',   me._onDragEnd.bind(me) );
  this.hammer.on('release',   me._onRelease.bind(me) );
  this.hammer.on('mousewheel',me._onMouseWheel.bind(me) );
  this.hammer.on('DOMMouseScroll',me._onMouseWheel.bind(me) ); // for FF
  this.hammer.on('mousemove', me._onMouseMoveTitle.bind(me) );

  // add the frame to the container element
  this.containerElement.appendChild(this.frame);

};


/**
 * Binding the keys for keyboard navigation. These functions are defined in the NavigationMixin
 * @private
 */
Graph.prototype._createKeyBinds = function() {
  var me = this;
  this.mousetrap = mousetrap;

  this.mousetrap.reset();

  if (this.constants.keyboard.enabled == true) {
    this.mousetrap.bind("up",   this._moveUp.bind(me)   , "keydown");
    this.mousetrap.bind("up",   this._yStopMoving.bind(me), "keyup");
    this.mousetrap.bind("down", this._moveDown.bind(me) , "keydown");
    this.mousetrap.bind("down", this._yStopMoving.bind(me), "keyup");
    this.mousetrap.bind("left", this._moveLeft.bind(me) , "keydown");
    this.mousetrap.bind("left", this._xStopMoving.bind(me), "keyup");
    this.mousetrap.bind("right",this._moveRight.bind(me), "keydown");
    this.mousetrap.bind("right",this._xStopMoving.bind(me), "keyup");
    this.mousetrap.bind("=",    this._zoomIn.bind(me),    "keydown");
    this.mousetrap.bind("=",    this._stopZoom.bind(me),    "keyup");
    this.mousetrap.bind("-",    this._zoomOut.bind(me),   "keydown");
    this.mousetrap.bind("-",    this._stopZoom.bind(me),    "keyup");
    this.mousetrap.bind("[",    this._zoomIn.bind(me),    "keydown");
    this.mousetrap.bind("[",    this._stopZoom.bind(me),    "keyup");
    this.mousetrap.bind("]",    this._zoomOut.bind(me),   "keydown");
    this.mousetrap.bind("]",    this._stopZoom.bind(me),    "keyup");
    this.mousetrap.bind("pageup",this._zoomIn.bind(me),   "keydown");
    this.mousetrap.bind("pageup",this._stopZoom.bind(me),   "keyup");
    this.mousetrap.bind("pagedown",this._zoomOut.bind(me),"keydown");
    this.mousetrap.bind("pagedown",this._stopZoom.bind(me), "keyup");
  }

  if (this.constants.dataManipulation.enabled == true) {
    this.mousetrap.bind("escape",this._createManipulatorBar.bind(me));
    this.mousetrap.bind("del",this._deleteSelected.bind(me));
  }
};

/**
 * Get the pointer location from a touch location
 * @param {{pageX: Number, pageY: Number}} touch
 * @return {{x: Number, y: Number}} pointer
 * @private
 */
Graph.prototype._getPointer = function (touch) {
  return {
    x: touch.pageX - vis.util.getAbsoluteLeft(this.frame.canvas),
    y: touch.pageY - vis.util.getAbsoluteTop(this.frame.canvas)
  };
};

/**
 * On start of a touch gesture, store the pointer
 * @param event
 * @private
 */
Graph.prototype._onTouch = function (event) {
  this.drag.pointer = this._getPointer(event.gesture.center);
  this.drag.pinched = false;
  this.pinch.scale = this._getScale();

  this._handleTouch(this.drag.pointer);
};

/**
 * handle drag start event
 * @private
 */
Graph.prototype._onDragStart = function () {
  this._handleDragStart();
};


/**
 * This function is called by _onDragStart.
 * It is separated out because we can then overload it for the datamanipulation system.
 *
 * @private
 */
Graph.prototype._handleDragStart = function() {
  var drag = this.drag;
  var node = this._getNodeAt(drag.pointer);
  // note: drag.pointer is set in _onTouch to get the initial touch location

  drag.dragging = true;
  drag.selection = [];
  drag.translation = this._getTranslation();
  drag.nodeId = null;

  if (node != null) {
    drag.nodeId = node.id;
    // select the clicked node if not yet selected
    if (!node.isSelected()) {
      this._selectObject(node,false);
    }

    // create an array with the selected nodes and their original location and status
    for (var objectId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(objectId)) {
        var object = this.selectionObj.nodes[objectId];
        var s = {
          id: object.id,
          node: object,

          // store original x, y, xFixed and yFixed, make the node temporarily Fixed
          x: object.x,
          y: object.y,
          xFixed: object.xFixed,
          yFixed: object.yFixed
        };

        object.xFixed = true;
        object.yFixed = true;

        drag.selection.push(s);
      }
    }
  }
};


/**
 * handle drag event
 * @private
 */
Graph.prototype._onDrag = function (event) {
  this._handleOnDrag(event)
};


/**
 * This function is called by _onDrag.
 * It is separated out because we can then overload it for the datamanipulation system.
 *
 * @private
 */
Graph.prototype._handleOnDrag = function(event) {
  if (this.drag.pinched) {
    return;
  }

  var pointer = this._getPointer(event.gesture.center);

  var me = this,
    drag = this.drag,
    selection = drag.selection;
  if (selection && selection.length && this.constants.dragNodes == true) {
    // calculate delta's and new location
    var deltaX = pointer.x - drag.pointer.x,
      deltaY = pointer.y - drag.pointer.y;

    // update position of all selected nodes
    selection.forEach(function (s) {
      var node = s.node;

      if (!s.xFixed) {
        node.x = me._XconvertDOMtoCanvas(me._XconvertCanvasToDOM(s.x) + deltaX);
      }

      if (!s.yFixed) {
        node.y = me._YconvertDOMtoCanvas(me._YconvertCanvasToDOM(s.y) + deltaY);
      }
    });

    // start _animationStep if not yet running
    if (!this.moving) {
      this.moving = true;
      this.start();
    }
  }
  else {
    if (this.constants.dragGraph == true) {
      // move the graph
      var diffX = pointer.x - this.drag.pointer.x;
      var diffY = pointer.y - this.drag.pointer.y;

      this._setTranslation(
        this.drag.translation.x + diffX,
        this.drag.translation.y + diffY);
      this._redraw();
      this.moving = true;
      this.start();
    }
  }
};

/**
 * handle drag start event
 * @private
 */
Graph.prototype._onDragEnd = function () {
  this.drag.dragging = false;
  var selection = this.drag.selection;
  if (selection) {
    selection.forEach(function (s) {
      // restore original xFixed and yFixed
      s.node.xFixed = s.xFixed;
      s.node.yFixed = s.yFixed;
    });
  }
};

/**
 * handle tap/click event: select/unselect a node
 * @private
 */
Graph.prototype._onTap = function (event) {
  var pointer = this._getPointer(event.gesture.center);
  this.pointerPosition = pointer;
  this._handleTap(pointer);

};


/**
 * handle doubletap event
 * @private
 */
Graph.prototype._onDoubleTap = function (event) {
  var pointer = this._getPointer(event.gesture.center);
  this._handleDoubleTap(pointer);
};


/**
 * handle long tap event: multi select nodes
 * @private
 */
Graph.prototype._onHold = function (event) {
  var pointer = this._getPointer(event.gesture.center);
  this.pointerPosition = pointer;
  this._handleOnHold(pointer);
};

/**
 * handle the release of the screen
 *
 * @private
 */
Graph.prototype._onRelease = function (event) {
  var pointer = this._getPointer(event.gesture.center);
  this._handleOnRelease(pointer);
};

/**
 * Handle pinch event
 * @param event
 * @private
 */
Graph.prototype._onPinch = function (event) {
  var pointer = this._getPointer(event.gesture.center);

  this.drag.pinched = true;
  if (!('scale' in this.pinch)) {
    this.pinch.scale = 1;
  }

  // TODO: enabled moving while pinching?
  var scale = this.pinch.scale * event.gesture.scale;
  this._zoom(scale, pointer)
};

/**
 * Zoom the graph in or out
 * @param {Number} scale a number around 1, and between 0.01 and 10
 * @param {{x: Number, y: Number}} pointer    Position on screen
 * @return {Number} appliedScale    scale is limited within the boundaries
 * @private
 */
Graph.prototype._zoom = function(scale, pointer) {
  if (this.constants.zoomable == true) {
    var scaleOld = this._getScale();
    if (scale < 0.00001) {
      scale = 0.00001;
    }
    if (scale > 10) {
      scale = 10;
    }
  // + this.frame.canvas.clientHeight / 2
    var translation = this._getTranslation();

    var scaleFrac = scale / scaleOld;
    var tx = (1 - scaleFrac) * pointer.x + translation.x * scaleFrac;
    var ty = (1 - scaleFrac) * pointer.y + translation.y * scaleFrac;

    this.areaCenter = {"x" : this._XconvertDOMtoCanvas(pointer.x),
                       "y" : this._YconvertDOMtoCanvas(pointer.y)};

    this._setScale(scale);
    this._setTranslation(tx, ty);
    this.updateClustersDefault();
    this._redraw();

    if (scaleOld < scale) {
      this.emit("zoom", {direction:"+"});
    }
    else {
      this.emit("zoom", {direction:"-"});
    }

    return scale;
  }
};


/**
 * Event handler for mouse wheel event, used to zoom the timeline
 * See http://adomas.org/javascript-mouse-wheel/
 *     https://github.com/EightMedia/hammer.js/issues/256
 * @param {MouseEvent}  event
 * @private
 */
Graph.prototype._onMouseWheel = function(event) {
  // retrieve delta
  var delta = 0;
  if (event.wheelDelta) { /* IE/Opera. */
    delta = event.wheelDelta/120;
  } else if (event.detail) { /* Mozilla case. */
    // In Mozilla, sign of delta is different than in IE.
    // Also, delta is multiple of 3.
    delta = -event.detail/3;
  }

  // If delta is nonzero, handle it.
  // Basically, delta is now positive if wheel was scrolled up,
  // and negative, if wheel was scrolled down.
  if (delta) {

    // calculate the new scale
    var scale = this._getScale();
    var zoom = delta / 10;
    if (delta < 0) {
      zoom = zoom / (1 - zoom);
    }
    scale *= (1 + zoom);

    // calculate the pointer location
    var gesture = util.fakeGesture(this, event);
    var pointer = this._getPointer(gesture.center);

    // apply the new scale
    this._zoom(scale, pointer);
  }

  // Prevent default actions caused by mouse wheel.
  event.preventDefault();
};


/**
 * Mouse move handler for checking whether the title moves over a node with a title.
 * @param  {Event} event
 * @private
 */
Graph.prototype._onMouseMoveTitle = function (event) {
  var gesture = util.fakeGesture(this, event);
  var pointer = this._getPointer(gesture.center);

  // check if the previously selected node is still selected
  if (this.popupObj) {
    this._checkHidePopup(pointer);
  }

  // start a timeout that will check if the mouse is positioned above
  // an element
  var me = this;
  var checkShow = function() {
    me._checkShowPopup(pointer);
  };
  if (this.popupTimer) {
    clearInterval(this.popupTimer); // stop any running calculationTimer
  }
  if (!this.drag.dragging) {
    this.popupTimer = setTimeout(checkShow, this.constants.tooltip.delay);
  }


  /**
   * Adding hover highlights
   */
  if (this.constants.hover == true) {
    // removing all hover highlights
    for (var edgeId in this.hoverObj.edges) {
      if (this.hoverObj.edges.hasOwnProperty(edgeId)) {
        this.hoverObj.edges[edgeId].hover = false;
        delete this.hoverObj.edges[edgeId];
      }
    }

    // adding hover highlights
    var obj = this._getNodeAt(pointer);
    if (obj == null) {
      obj = this._getEdgeAt(pointer);
    }
    if (obj != null) {
      this._hoverObject(obj);
    }

    // removing all node hover highlights except for the selected one.
    for (var nodeId in this.hoverObj.nodes) {
      if (this.hoverObj.nodes.hasOwnProperty(nodeId)) {
        if (obj instanceof Node && obj.id != nodeId || obj instanceof Edge || obj == null) {
          this._blurObject(this.hoverObj.nodes[nodeId]);
          delete this.hoverObj.nodes[nodeId];
        }
      }
    }
    this.redraw();
  }
};

/**
 * Check if there is an element on the given position in the graph
 * (a node or edge). If so, and if this element has a title,
 * show a popup window with its title.
 *
 * @param {{x:Number, y:Number}} pointer
 * @private
 */
Graph.prototype._checkShowPopup = function (pointer) {
  var obj = {
    left:   this._XconvertDOMtoCanvas(pointer.x),
    top:    this._YconvertDOMtoCanvas(pointer.y),
    right:  this._XconvertDOMtoCanvas(pointer.x),
    bottom: this._YconvertDOMtoCanvas(pointer.y)
  };

  var id;
  var lastPopupNode = this.popupObj;

  if (this.popupObj == undefined) {
    // search the nodes for overlap, select the top one in case of multiple nodes
    var nodes = this.nodes;
    for (id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        var node = nodes[id];
        if (node.getTitle() !== undefined && node.isOverlappingWith(obj)) {
          this.popupObj = node;
          break;
        }
      }
    }
  }

  if (this.popupObj === undefined) {
    // search the edges for overlap
    var edges = this.edges;
    for (id in edges) {
      if (edges.hasOwnProperty(id)) {
        var edge = edges[id];
        if (edge.connected && (edge.getTitle() !== undefined) &&
            edge.isOverlappingWith(obj)) {
          this.popupObj = edge;
          break;
        }
      }
    }
  }

  if (this.popupObj) {
    // show popup message window
    if (this.popupObj != lastPopupNode) {
      var me = this;
      if (!me.popup) {
        me.popup = new Popup(me.frame, me.constants.tooltip);
      }

      // adjust a small offset such that the mouse cursor is located in the
      // bottom left location of the popup, and you can easily move over the
      // popup area
      me.popup.setPosition(pointer.x - 3, pointer.y - 3);
      me.popup.setText(me.popupObj.getTitle());
      me.popup.show();
    }
  }
  else {
    if (this.popup) {
      this.popup.hide();
    }
  }
};


/**
 * Check if the popup must be hided, which is the case when the mouse is no
 * longer hovering on the object
 * @param {{x:Number, y:Number}} pointer
 * @private
 */
Graph.prototype._checkHidePopup = function (pointer) {
  if (!this.popupObj || !this._getNodeAt(pointer) ) {
    this.popupObj = undefined;
    if (this.popup) {
      this.popup.hide();
    }
  }
};


/**
 * Set a new size for the graph
 * @param {string} width   Width in pixels or percentage (for example '800px'
 *                         or '50%')
 * @param {string} height  Height in pixels or percentage  (for example '400px'
 *                         or '30%')
 */
Graph.prototype.setSize = function(width, height) {
  this.frame.style.width = width;
  this.frame.style.height = height;

  this.frame.canvas.style.width = '100%';
  this.frame.canvas.style.height = '100%';

  this.frame.canvas.width = this.frame.canvas.clientWidth;
  this.frame.canvas.height = this.frame.canvas.clientHeight;

  if (this.manipulationDiv !== undefined) {
    this.manipulationDiv.style.width = this.frame.canvas.clientWidth + "px";
  }
  if (this.navigationDivs !== undefined) {
    if (this.navigationDivs['wrapper'] !== undefined) {
      this.navigationDivs['wrapper'].style.width = this.frame.canvas.clientWidth + "px";
      this.navigationDivs['wrapper'].style.height = this.frame.canvas.clientHeight + "px";
    }
  }

  this.emit('resize', {width:this.frame.canvas.width,height:this.frame.canvas.height});
};

/**
 * Set a data set with nodes for the graph
 * @param {Array | DataSet | DataView} nodes         The data containing the nodes.
 * @private
 */
Graph.prototype._setNodes = function(nodes) {
  var oldNodesData = this.nodesData;

  if (nodes instanceof DataSet || nodes instanceof DataView) {
    this.nodesData = nodes;
  }
  else if (nodes instanceof Array) {
    this.nodesData = new DataSet();
    this.nodesData.add(nodes);
  }
  else if (!nodes) {
    this.nodesData = new DataSet();
  }
  else {
    throw new TypeError('Array or DataSet expected');
  }

  if (oldNodesData) {
    // unsubscribe from old dataset
    util.forEach(this.nodesListeners, function (callback, event) {
      oldNodesData.off(event, callback);
    });
  }

  // remove drawn nodes
  this.nodes = {};

  if (this.nodesData) {
    // subscribe to new dataset
    var me = this;
    util.forEach(this.nodesListeners, function (callback, event) {
      me.nodesData.on(event, callback);
    });

    // draw all new nodes
    var ids = this.nodesData.getIds();
    this._addNodes(ids);
  }
  this._updateSelection();
};

/**
 * Add nodes
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._addNodes = function(ids) {
  var id;
  for (var i = 0, len = ids.length; i < len; i++) {
    id = ids[i];
    var data = this.nodesData.get(id);
    var node = new Node(data, this.images, this.groups, this.constants);
    this.nodes[id] = node; // note: this may replace an existing node

    if ((node.xFixed == false || node.yFixed == false) && (node.x === null || node.y === null)) {
      var radius = 10 * 0.1*ids.length;
      var angle = 2 * Math.PI * Math.random();
      if (node.xFixed == false) {node.x = radius * Math.cos(angle);}
      if (node.yFixed == false) {node.y = radius * Math.sin(angle);}
    }
    this.moving = true;
  }
  this._updateNodeIndexList();
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this._updateCalculationNodes();
  this._reconnectEdges();
  this._updateValueRange(this.nodes);
  this.updateLabels();
};

/**
 * Update existing nodes, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._updateNodes = function(ids) {
  var nodes = this.nodes,
      nodesData = this.nodesData;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    var node = nodes[id];
    var data = nodesData.get(id);
    if (node) {
      // update node
      node.setProperties(data, this.constants);
    }
    else {
      // create node
      node = new Node(properties, this.images, this.groups, this.constants);
      nodes[id] = node;
    }
  }
  this.moving = true;
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this._updateNodeIndexList();
  this._reconnectEdges();
  this._updateValueRange(nodes);
};

/**
 * Remove existing nodes. If nodes do not exist, the method will just ignore it.
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._removeNodes = function(ids) {
  var nodes = this.nodes;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    delete nodes[id];
  }
  this._updateNodeIndexList();
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this._updateCalculationNodes();
  this._reconnectEdges();
  this._updateSelection();
  this._updateValueRange(nodes);
};

/**
 * Load edges by reading the data table
 * @param {Array | DataSet | DataView} edges    The data containing the edges.
 * @private
 * @private
 */
Graph.prototype._setEdges = function(edges) {
  var oldEdgesData = this.edgesData;

  if (edges instanceof DataSet || edges instanceof DataView) {
    this.edgesData = edges;
  }
  else if (edges instanceof Array) {
    this.edgesData = new DataSet();
    this.edgesData.add(edges);
  }
  else if (!edges) {
    this.edgesData = new DataSet();
  }
  else {
    throw new TypeError('Array or DataSet expected');
  }

  if (oldEdgesData) {
    // unsubscribe from old dataset
    util.forEach(this.edgesListeners, function (callback, event) {
      oldEdgesData.off(event, callback);
    });
  }

  // remove drawn edges
  this.edges = {};

  if (this.edgesData) {
    // subscribe to new dataset
    var me = this;
    util.forEach(this.edgesListeners, function (callback, event) {
      me.edgesData.on(event, callback);
    });

    // draw all new nodes
    var ids = this.edgesData.getIds();
    this._addEdges(ids);
  }

  this._reconnectEdges();
};

/**
 * Add edges
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._addEdges = function (ids) {
  var edges = this.edges,
      edgesData = this.edgesData;

  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];

    var oldEdge = edges[id];
    if (oldEdge) {
      oldEdge.disconnect();
    }

    var data = edgesData.get(id, {"showInternalIds" : true});
    edges[id] = new Edge(data, this, this.constants);
  }

  this.moving = true;
  this._updateValueRange(edges);
  this._createBezierNodes();
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this._updateCalculationNodes();
};

/**
 * Update existing edges, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._updateEdges = function (ids) {
  var edges = this.edges,
      edgesData = this.edgesData;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];

    var data = edgesData.get(id);
    var edge = edges[id];
    if (edge) {
      // update edge
      edge.disconnect();
      edge.setProperties(data, this.constants);
      edge.connect();
    }
    else {
      // create edge
      edge = new Edge(data, this, this.constants);
      this.edges[id] = edge;
    }
  }

  this._createBezierNodes();
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this.moving = true;
  this._updateValueRange(edges);
};

/**
 * Remove existing edges. Non existing ids will be ignored
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._removeEdges = function (ids) {
  var edges = this.edges;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    var edge = edges[id];
    if (edge) {
      if (edge.via != null) {
        delete this.sectors['support']['nodes'][edge.via.id];
      }
      edge.disconnect();
      delete edges[id];
    }
  }

  this.moving = true;
  this._updateValueRange(edges);
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this._updateCalculationNodes();
};

/**
 * Reconnect all edges
 * @private
 */
Graph.prototype._reconnectEdges = function() {
  var id,
      nodes = this.nodes,
      edges = this.edges;
  for (id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      nodes[id].edges = [];
    }
  }

  for (id in edges) {
    if (edges.hasOwnProperty(id)) {
      var edge = edges[id];
      edge.from = null;
      edge.to = null;
      edge.connect();
    }
  }
};

/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Object} obj    An object containing a set of Edges or Nodes
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 * @private
 */
Graph.prototype._updateValueRange = function(obj) {
  var id;

  // determine the range of the objects
  var valueMin = undefined;
  var valueMax = undefined;
  for (id in obj) {
    if (obj.hasOwnProperty(id)) {
      var value = obj[id].getValue();
      if (value !== undefined) {
        valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
        valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
      }
    }
  }

  // adjust the range of all objects
  if (valueMin !== undefined && valueMax !== undefined) {
    for (id in obj) {
      if (obj.hasOwnProperty(id)) {
        obj[id].setValueRange(valueMin, valueMax);
      }
    }
  }
};

/**
 * Redraw the graph with the current data
 * chart will be resized too.
 */
Graph.prototype.redraw = function() {
  this.setSize(this.width, this.height);
  this._redraw();
};

/**
 * Redraw the graph with the current data
 * @private
 */
Graph.prototype._redraw = function() {
  var ctx = this.frame.canvas.getContext('2d');
  // clear the canvas
  var w = this.frame.canvas.width;
  var h = this.frame.canvas.height;
  ctx.clearRect(0, 0, w, h);

  // set scaling and translation
  ctx.save();
  ctx.translate(this.translation.x, this.translation.y);
  ctx.scale(this.scale, this.scale);

  this.canvasTopLeft = {
    "x": this._XconvertDOMtoCanvas(0),
    "y": this._YconvertDOMtoCanvas(0)
  };
  this.canvasBottomRight = {
    "x": this._XconvertDOMtoCanvas(this.frame.canvas.clientWidth),
    "y": this._YconvertDOMtoCanvas(this.frame.canvas.clientHeight)
  };

  this._doInAllSectors("_drawAllSectorNodes",ctx);
  this._doInAllSectors("_drawEdges",ctx);
  this._doInAllSectors("_drawNodes",ctx,false);
  this._doInAllSectors("_drawControlNodes",ctx);

//  this._doInSupportSector("_drawNodes",ctx,true);
//  this._drawTree(ctx,"#F00F0F");

  // restore original scaling and translation
  ctx.restore();
};

/**
 * Set the translation of the graph
 * @param {Number} offsetX    Horizontal offset
 * @param {Number} offsetY    Vertical offset
 * @private
 */
Graph.prototype._setTranslation = function(offsetX, offsetY) {
  if (this.translation === undefined) {
    this.translation = {
      x: 0,
      y: 0
    };
  }

  if (offsetX !== undefined) {
    this.translation.x = offsetX;
  }
  if (offsetY !== undefined) {
    this.translation.y = offsetY;
  }

  this.emit('viewChanged');
};

/**
 * Get the translation of the graph
 * @return {Object} translation    An object with parameters x and y, both a number
 * @private
 */
Graph.prototype._getTranslation = function() {
  return {
    x: this.translation.x,
    y: this.translation.y
  };
};

/**
 * Scale the graph
 * @param {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Graph.prototype._setScale = function(scale) {
  this.scale = scale;
};

/**
 * Get the current scale of  the graph
 * @return {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Graph.prototype._getScale = function() {
  return this.scale;
};

/**
 * Convert the X coordinate in DOM-space (coordinate point in browser relative to the container div) to
 * the X coordinate in canvas-space (the simulation sandbox, which the camera looks upon)
 * @param {number} x
 * @returns {number}
 * @private
 */
Graph.prototype._XconvertDOMtoCanvas = function(x) {
  return (x - this.translation.x) / this.scale;
};

/**
 * Convert the X coordinate in canvas-space (the simulation sandbox, which the camera looks upon) to
 * the X coordinate in DOM-space (coordinate point in browser relative to the container div)
 * @param {number} x
 * @returns {number}
 * @private
 */
Graph.prototype._XconvertCanvasToDOM = function(x) {
  return x * this.scale + this.translation.x;
};

/**
 * Convert the Y coordinate in DOM-space (coordinate point in browser relative to the container div) to
 * the Y coordinate in canvas-space (the simulation sandbox, which the camera looks upon)
 * @param {number} y
 * @returns {number}
 * @private
 */
Graph.prototype._YconvertDOMtoCanvas = function(y) {
  return (y - this.translation.y) / this.scale;
};

/**
 * Convert the Y coordinate in canvas-space (the simulation sandbox, which the camera looks upon) to
 * the Y coordinate in DOM-space (coordinate point in browser relative to the container div)
 * @param {number} y
 * @returns {number}
 * @private
 */
Graph.prototype._YconvertCanvasToDOM = function(y) {
  return y * this.scale + this.translation.y ;
};


/**
 *
 * @param {object} pos   = {x: number, y: number}
 * @returns {{x: number, y: number}}
 * @constructor
 */
Graph.prototype.canvasToDOM = function(pos) {
  return {x:this._XconvertCanvasToDOM(pos.x),y:this._YconvertCanvasToDOM(pos.y)};
}

/**
 *
 * @param {object} pos   = {x: number, y: number}
 * @returns {{x: number, y: number}}
 * @constructor
 */
Graph.prototype.DOMtoCanvas = function(pos) {
  return {x:this._XconvertDOMtoCanvas(pos.x),y:this._YconvertDOMtoCanvas(pos.y)};
}

/**
 * Redraw all nodes
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
 * @param {CanvasRenderingContext2D}   ctx
 * @param {Boolean} [alwaysShow]
 * @private
 */
Graph.prototype._drawNodes = function(ctx,alwaysShow) {
  if (alwaysShow === undefined) {
    alwaysShow = false;
  }

  // first draw the unselected nodes
  var nodes = this.nodes;
  var selected = [];

  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      nodes[id].setScaleAndPos(this.scale,this.canvasTopLeft,this.canvasBottomRight);
      if (nodes[id].isSelected()) {
        selected.push(id);
      }
      else {
        if (nodes[id].inArea() || alwaysShow) {
          nodes[id].draw(ctx);
        }
      }
    }
  }

  // draw the selected nodes on top
  for (var s = 0, sMax = selected.length; s < sMax; s++) {
    if (nodes[selected[s]].inArea() || alwaysShow) {
      nodes[selected[s]].draw(ctx);
    }
  }
};

/**
 * Redraw all edges
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawEdges = function(ctx) {
  var edges = this.edges;
  for (var id in edges) {
    if (edges.hasOwnProperty(id)) {
      var edge = edges[id];
      edge.setScale(this.scale);
      if (edge.connected) {
        edges[id].draw(ctx);
      }
    }
  }
};

/**
 * Redraw all edges
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawControlNodes = function(ctx) {
  var edges = this.edges;
  for (var id in edges) {
    if (edges.hasOwnProperty(id)) {
      edges[id]._drawControlNodes(ctx);
    }
  }
};

/**
 * Find a stable position for all nodes
 * @private
 */
Graph.prototype._stabilize = function() {
  if (this.constants.freezeForStabilization == true) {
    this._freezeDefinedNodes();
  }

  // find stable position
  var count = 0;
  while (this.moving && count < this.constants.stabilizationIterations) {
    this._physicsTick();
    count++;
  }
  this.zoomExtent(false,true);
  if (this.constants.freezeForStabilization == true) {
    this._restoreFrozenNodes();
  }
  this.emit("stabilized",{iterations:count});
};

/**
 * When initializing and stabilizing, we can freeze nodes with a predefined position. This greatly speeds up stabilization
 * because only the supportnodes for the smoothCurves have to settle.
 *
 * @private
 */
Graph.prototype._freezeDefinedNodes = function() {
  var nodes = this.nodes;
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      if (nodes[id].x != null && nodes[id].y != null) {
        nodes[id].fixedData.x = nodes[id].xFixed;
        nodes[id].fixedData.y = nodes[id].yFixed;
        nodes[id].xFixed = true;
        nodes[id].yFixed = true;
      }
    }
  }
};

/**
 * Unfreezes the nodes that have been frozen by _freezeDefinedNodes.
 *
 * @private
 */
Graph.prototype._restoreFrozenNodes = function() {
  var nodes = this.nodes;
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      if (nodes[id].fixedData.x != null) {
        nodes[id].xFixed = nodes[id].fixedData.x;
        nodes[id].yFixed = nodes[id].fixedData.y;
      }
    }
  }
};


/**
 * Check if any of the nodes is still moving
 * @param {number} vmin   the minimum velocity considered as 'moving'
 * @return {boolean}      true if moving, false if non of the nodes is moving
 * @private
 */
Graph.prototype._isMoving = function(vmin) {
  var nodes = this.nodes;
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id) && nodes[id].isMoving(vmin)) {
      return true;
    }
  }
  return false;
};


/**
 * /**
 * Perform one discrete step for all nodes
 *
 * @private
 */
Graph.prototype._discreteStepNodes = function() {
  var interval = this.physicsDiscreteStepsize;
  var nodes = this.nodes;
  var nodeId;
  var nodesPresent = false;

  if (this.constants.maxVelocity > 0) {
    for (nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        nodes[nodeId].discreteStepLimited(interval, this.constants.maxVelocity);
        nodesPresent = true;
      }
    }
  }
  else {
    for (nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        nodes[nodeId].discreteStep(interval);
        nodesPresent = true;
      }
    }
  }

  if (nodesPresent == true) {
    var vminCorrected = this.constants.minVelocity / Math.max(this.scale,0.05);
    if (vminCorrected > 0.5*this.constants.maxVelocity) {
      this.moving = true;
    }
    else {
      this.moving = this._isMoving(vminCorrected);
    }
  }
};

/**
 * A single simulation step (or "tick") in the physics simulation
 *
 * @private
 */
Graph.prototype._physicsTick = function() {
  if (!this.freezeSimulation) {
    if (this.moving) {
      this._doInAllActiveSectors("_initializeForceCalculation");
      this._doInAllActiveSectors("_discreteStepNodes");
      if (this.constants.smoothCurves) {
        this._doInSupportSector("_discreteStepNodes");
      }
      this._findCenter(this._getRange())
    }
  }
};


/**
 * This function runs one step of the animation. It calls an x amount of physics ticks and one render tick.
 * It reschedules itself at the beginning of the function
 *
 * @private
 */
Graph.prototype._animationStep = function() {
  // reset the timer so a new scheduled animation step can be set
  this.timer = undefined;
  // handle the keyboad movement
  this._handleNavigation();

  // this schedules a new animation step
  this.start();

  // start the physics simulation
  var calculationTime = Date.now();
  var maxSteps = 1;
  this._physicsTick();
  var timeRequired = Date.now() - calculationTime;
  while (timeRequired < (this.renderTimestep - this.renderTime) && maxSteps < this.maxPhysicsTicksPerRender) {
    this._physicsTick();
    timeRequired = Date.now() - calculationTime;
    maxSteps++;

  }

  // start the rendering process
  var renderTime = Date.now();
  this._redraw();
  this.renderTime = Date.now() - renderTime;
};

if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                 window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
}

/**
 * Schedule a animation step with the refreshrate interval.
 */
Graph.prototype.start = function() {
  if (this.moving || this.xIncrement != 0 || this.yIncrement != 0 || this.zoomIncrement != 0) {
    if (!this.timer) {
      var ua = navigator.userAgent.toLowerCase();

      var requiresTimeout = false;
      if (ua.indexOf('msie 9.0') != -1) { // IE 9
        requiresTimeout = true;
      }
      else if (ua.indexOf('safari') != -1) {  // safari
        if (ua.indexOf('chrome') <= -1) {
          requiresTimeout = true;
        }
      }

      if (requiresTimeout == true) {
        this.timer = window.setTimeout(this._animationStep.bind(this), this.renderTimestep); // wait this.renderTimeStep milliseconds and perform the animation step function
      }
      else{
        this.timer = window.requestAnimationFrame(this._animationStep.bind(this), this.renderTimestep); // wait this.renderTimeStep milliseconds and perform the animation step function
      }
    }
  }
  else {
    this._redraw();
  }
};


/**
 * Move the graph according to the keyboard presses.
 *
 * @private
 */
Graph.prototype._handleNavigation = function() {
  if (this.xIncrement != 0 || this.yIncrement != 0) {
    var translation = this._getTranslation();
    this._setTranslation(translation.x+this.xIncrement, translation.y+this.yIncrement);
  }
  if (this.zoomIncrement != 0) {
    var center = {
      x: this.frame.canvas.clientWidth / 2,
      y: this.frame.canvas.clientHeight / 2
    };
    this._zoom(this.scale*(1 + this.zoomIncrement), center);
  }
};


/**
 *  Freeze the _animationStep
 */
Graph.prototype.toggleFreeze = function() {
  if (this.freezeSimulation == false) {
    this.freezeSimulation = true;
  }
  else {
    this.freezeSimulation = false;
    this.start();
  }
};


/**
 * This function cleans the support nodes if they are not needed and adds them when they are.
 *
 * @param {boolean} [disableStart]
 * @private
 */
Graph.prototype._configureSmoothCurves = function(disableStart) {
  if (disableStart === undefined) {
    disableStart = true;
  }

  if (this.constants.smoothCurves == true) {
    this._createBezierNodes();
  }
  else {
    // delete the support nodes
    this.sectors['support']['nodes'] = {};
    for (var edgeId in this.edges) {
      if (this.edges.hasOwnProperty(edgeId)) {
        this.edges[edgeId].smooth = false;
        this.edges[edgeId].via = null;
      }
    }
  }
  this._updateCalculationNodes();
  if (!disableStart) {
    this.moving = true;
    this.start();
  }
};


/**
 * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
 * are used for the force calculation.
 *
 * @private
 */
Graph.prototype._createBezierNodes = function() {
  if (this.constants.smoothCurves == true) {
    for (var edgeId in this.edges) {
      if (this.edges.hasOwnProperty(edgeId)) {
        var edge = this.edges[edgeId];
        if (edge.via == null) {
          edge.smooth = true;
          var nodeId = "edgeId:".concat(edge.id);
          this.sectors['support']['nodes'][nodeId] = new Node(
                  {id:nodeId,
                    mass:1,
                    shape:'circle',
                    image:"",
                    internalMultiplier:1
                  },{},{},this.constants);
          edge.via = this.sectors['support']['nodes'][nodeId];
          edge.via.parentEdgeId = edge.id;
          edge.positionBezierNode();
        }
      }
    }
  }
};

/**
 * load the functions that load the mixins into the prototype.
 *
 * @private
 */
Graph.prototype._initializeMixinLoaders = function () {
  for (var mixinFunction in graphMixinLoaders) {
    if (graphMixinLoaders.hasOwnProperty(mixinFunction)) {
      Graph.prototype[mixinFunction] = graphMixinLoaders[mixinFunction];
    }
  }
};

/**
 * Load the XY positions of the nodes into the dataset.
 */
Graph.prototype.storePosition = function() {
  var dataArray = [];
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      var node = this.nodes[nodeId];
      var allowedToMoveX = !this.nodes.xFixed;
      var allowedToMoveY = !this.nodes.yFixed;
      if (this.nodesData.data[nodeId].x != Math.round(node.x) || this.nodesData.data[nodeId].y != Math.round(node.y)) {
        dataArray.push({id:nodeId,x:Math.round(node.x),y:Math.round(node.y),allowedToMoveX:allowedToMoveX,allowedToMoveY:allowedToMoveY});
      }
    }
  }
  this.nodesData.update(dataArray);
};


/**
 * Center a node in view.
 *
 * @param {Number} nodeId
 * @param {Number} [zoomLevel]
 */
Graph.prototype.focusOnNode = function (nodeId, zoomLevel) {
  if (this.nodes.hasOwnProperty(nodeId)) {
    if (zoomLevel === undefined) {
      zoomLevel = this._getScale();
    }
    var nodePosition= {x: this.nodes[nodeId].x, y: this.nodes[nodeId].y};

    var requiredScale = zoomLevel;
    this._setScale(requiredScale);

    var canvasCenter = this.DOMtoCanvas({x:0.5 * this.frame.canvas.width,y:0.5 * this.frame.canvas.height});
    var translation = this._getTranslation();

    var distanceFromCenter = {x:canvasCenter.x - nodePosition.x,
                              y:canvasCenter.y - nodePosition.y};

    this._setTranslation(translation.x + requiredScale * distanceFromCenter.x,
                         translation.y + requiredScale * distanceFromCenter.y);
    this.redraw();
  }
  else {
    console.log("This nodeId cannot be found.")
  }
};









