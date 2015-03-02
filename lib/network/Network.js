var Emitter = require('emitter-component');
var Hammer = require('../module/hammer');
var keycharm = require('keycharm');
var util = require('../util');
var hammerUtil = require('../hammerUtil');
var DataSet = require('../DataSet');
var DataView = require('../DataView');
var dotparser = require('./dotparser');
var gephiParser = require('./gephiParser');
var Groups = require('./Groups');
var Images = require('./Images');
var Node = require('./Node');
var Edge = require('./Edge');
var Popup = require('./Popup');
var MixinLoader = require('./mixins/MixinLoader');
var Activator = require('../shared/Activator');
var locales = require('./locales');

// Load custom shapes into CanvasRenderingContext2D
require('./shapes');

import { PhysicsEngine } from './modules/PhysicsEngine'
import { ClusterEngine } from './modules/Clustering'
import { CanvasRenderer } from './modules/CanvasRenderer'
import { Canvas } from './modules/Canvas'
import { View } from './modules/View'
import { TouchEventHandler } from './modules/TouchEventHandler'

/**
 * @constructor Network
 * Create a network visualization, displaying nodes and edges.
 *
 * @param {Element} container   The DOM element in which the Network will
 *                                  be created. Normally a div element.
 * @param {Object} data         An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 */
function Network (container, data, options) {
  if (!(this instanceof Network)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  this._initializeMixinLoaders();


  // render and calculation settings
  this.initializing = true;

  this.triggerFunctions = {add:null,edit:null,editEdge:null,connect:null,del:null};

  var customScalingFunction = function (min,max,total,value) {
    if (max == min) {
      return 0.5;
    }
    else {
      var scale = 1 / (max - min);
      return Math.max(0,(value - min)*scale);
    }
  };

  // set constant values
  this.defaultOptions = {
    nodes: {
      customScalingFunction: customScalingFunction,
      mass: 1,
      radiusMin: 10,
      radiusMax: 30,
      radius: 10,
      shape: 'ellipse',
      image: undefined,
      widthMin: 16, // px
      widthMax: 64, // px
      fontColor: 'black',
      fontSize: 14, // px
      fontFace: 'verdana',
      fontFill: undefined,
      fontStrokeWidth: 0, // px
      fontStrokeColor: '#ffffff',
      fontDrawThreshold: 3,
      scaleFontWithValue: false,
      fontSizeMin: 14,
      fontSizeMax: 30,
      fontSizeMaxVisible: 30,
      value: 1,
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
      group: undefined,
      borderWidth: 1,
      borderWidthSelected: undefined
    },
    edges: {
      customScalingFunction: customScalingFunction,
      widthMin: 1, //
      widthMax: 15,//
      width: 1,
      widthSelectionMultiplier: 2,
      hoverWidth: 1.5,
      value:1,
      style: 'line',
      color: {
        color:'#848484',
        highlight:'#848484',
        hover: '#848484'
      },
      opacity:1.0,
      fontColor: '#343434',
      fontSize: 14, // px
      fontFace: 'arial',
      fontFill: 'white',
      fontStrokeWidth: 0, // px
      fontStrokeColor: 'white',
      labelAlignment:'horizontal',
      arrowScaleFactor: 1,
      dash: {
        length: 10,
        gap: 5,
        altLength: undefined
      },
      inheritColor: "from", // to, from, false, true (== from)
      useGradients: false // release in 4.0
    },
    configurePhysics:false,
    navigation: {
      enabled: false
    },
    keyboard: {
      enabled: false,
      speed: {x: 10, y: 10, zoom: 0.02},
      bindToWindow: true
    },
    dataManipulation: {
      enabled: false,
      initiallyVisible: false
    },
    hierarchicalLayout: {
      enabled:false,
      levelSeparation: 150,
      nodeSpacing: 100,
      direction: "UD",   // UD, DU, LR, RL
      layout: "hubsize" // hubsize, directed
    },

    smoothCurves: {
      enabled: true,
      dynamic: true,
      type: "continuous",
      roundness: 0.5
    },
    locale: 'en',
    locales: locales,
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
    dragNetwork: true,
    dragNodes: true,
    zoomable: true,
    hover: false,
    hideEdgesOnDrag: false,
    hideNodesOnDrag: false,
    width : '100%',
    height : '100%',
    selectable: true,
    useDefaultGroups: true
  };
  this.constants = util.extend({}, this.defaultOptions);

  // containers for nodes and edges
  this.body = {
    nodes: {},
    nodeIndices: [],
    supportNodes: {},
    supportNodeIndices: [],
    edges: {},
    data: {
      nodes: null,      // A DataSet or DataView
      edges: null       // A DataSet or DataView
    },
    functions:{
      createNode: this._createNode.bind(this),
      createEdge: this._createEdge.bind(this)
    },
    emitter: {
      on: this.on.bind(this),
      off: this.off.bind(this),
      emit: this.emit.bind(this),
      once: this.once.bind(this)
    },
    eventListeners: {
      onTap: function() {},
      onTouch: function() {},
      onDoubleTap: function() {},
      onHold: function() {},
      onDragStart: function() {},
      onDrag: function() {},
      onDragEnd: function() {},
      onMouseWheel: function() {},
      onPinch: function() {},
      onMouseMove: function() {},
      onRelease: function() {}
    },
    container: container
  };

  // modules
  this.view = new View(this.body);
  this.renderer = new CanvasRenderer(this.body);
  this.clustering = new ClusterEngine(this.body);
  this.physics = new PhysicsEngine(this.body);
  this.canvas = new Canvas(this.body);
  this.touchHandler = new TouchEventHandler(this.body);

  this.renderer.setCanvas(this.canvas);
  this.view.setCanvas(this.canvas);
  this.touchHandler.setCanvas(this.canvas);

  this.hoverObj = {nodes:{},edges:{}};
  this.controlNodesActive = false;
  this.navigationHammers = [];
  this.manipulationHammers = [];

  // Node variables
  var me = this;
  this.groups = new Groups(); // object with groups
  this.images = new Images(); // object with images
  this.images.setOnloadCallback(function (status) {
    me._requestRedraw();
  });

  // keyboard navigation variables
  this.xIncrement = 0;
  this.yIncrement = 0;
  this.zoomIncrement = 0;

  // loading all the mixins:
  // load the force calculation functions, grouped under the physics system.
  //this._loadPhysicsSystem();
  // create a frame and canvas
  // load the cluster system.   (mandatory, even when not using the cluster system, there are function calls to it)
  // load the selection system. (mandatory, required by Network)
  this._loadSelectionSystem();
  // load the selection system. (mandatory, required by Network)
  //this._loadHierarchySystem();

  // apply options
  this.setOptions(options);

  // other vars
  this.cachedFunctions = {};
  this.startedStabilization = false;
  this.stabilized = false;
  this.stabilizationIterations = null;
  this.draggingNodes = false;

  // position and scale variables and objects

  this.pointerPosition = {"x": 0,"y": 0};   // coordinates of the bottom right of the canvas. they will be set during _redraw
  this.scale = 1;                     // defining the global scale variable in the constructor

  // create event listeners used to subscribe on the DataSets of the nodes and edges
  this.nodesListeners = {
    'add': function (event, params) {
      me._addNodes(params.items);
      me.start();
    },
    'update': function (event, params) {
      me._updateNodes(params.items, params.data);
      me.start();
    },
    'remove': function (event, params) {
      me._removeNodes(params.items);
      me.start();
    }
  };
  this.edgesListeners = {
    'add': function (event, params) {
      me._addEdges(params.items);
      me.start();
    },
    'update': function (event, params) {
      me._updateEdges(params.items);
      me.start();
    },
    'remove': function (event, params) {
      me._removeEdges(params.items);
      me.start();
    }
  };


  // properties for the animation
  this.moving = true;
  this.renderTimer = undefined; // Scheduling function. Is definded in this.start();

  // load data (the disable start variable will be the same as the enabled clustering)
  this.setData(data, this.constants.hierarchicalLayout.enabled);

  // hierarchical layout
  if (this.constants.hierarchicalLayout.enabled == true) {
    this._setupHierarchicalLayout();
  }
  else {
    // zoom so all data will fit on the screen, if clustering is enabled, we do not want start to be called here.
    if (this.constants.stabilize == false) {
      this.zoomExtent({duration:0}, true, this.constants.clustering.enabled);
    }
  }

  if (this.constants.stabilize == false) {
    this.initializing = false;
  }

  var me = this;
  // this event will trigger a rebuilding of the cache of colors, nodes etc.
  this.on("_dataChanged", function () {
    me._updateNodeIndexList();
    me.physics._updateCalculationNodes();
    me._markAllEdgesAsDirty();
    if (me.initializing !== true) {
      me.moving = true;
      me.start();
    }
  })

  this.on("_newEdgesCreated", this._createBezierNodes.bind(this));
  //this.on("stabilizationIterationsDone", function () {me.initializing = false; me.start();}.bind(this));
}

// Extend Network with an Emitter mixin
Emitter(Network.prototype);


Network.prototype._createNode = function(properties) {
  return new Node(properties, this.images, this.groups, this.constants)
}

Network.prototype._createEdge = function(properties) {
  return new Edge(properties, this.body, this.constants)
}




/**
 * Update the this.body.nodeIndices with the most recent node index list
 * @private
 */
Network.prototype._updateNodeIndexList = function() {
  this.body.supportNodeIndices = Object.keys(this.body.supportNodes)
  this.body.nodeIndices = Object.keys(this.body.nodes);
};


/**
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data              Object containing parameters:
 *                                   {Array | DataSet | DataView} [nodes] Array with nodes
 *                                   {Array | DataSet | DataView} [edges] Array with edges
 *                                   {String} [dot] String containing data in DOT format
 *                                   {String} [gephi] String containing data in gephi JSON format
 *                                   {Options} [options] Object with options
 * @param {Boolean} [disableStart]   | optional: disable the calling of the start function.
 */
Network.prototype.setData = function(data, disableStart) {
  if (disableStart === undefined) {
    disableStart = false;
  }

  // unselect all to ensure no selections from old data are carried over.
  this._unselectAll(true);

  // we set initializing to true to ensure that the hierarchical layout is not performed until both nodes and edges are added.
  this.initializing = true;

  if (data && data.dot && (data.nodes || data.edges)) {
    throw new SyntaxError('Data must contain either parameter "dot" or ' +
        ' parameter pair "nodes" and "edges", but not both.');
  }

  // clean up in case there is anyone in an active mode of the manipulation. This is the same option as bound to the escape button.
  if (this.constants.dataManipulation.enabled == true) {
    this._createManipulatorBar();
  }

  // set options
  this.setOptions(data && data.options);
  // set all data
  if (data && data.dot) {
    // parse DOT file
    if(data && data.dot) {
      var dotData = dotparser.DOTToGraph(data.dot);
      this.setData(dotData);
      return;
    }
  }
  else if (data && data.gephi) {
    // parse DOT file
    if(data && data.gephi) {
      var gephiData = gephiParser.parseGephi(data.gephi);
      this.setData(gephiData);
      return;
    }
  }
  else {
    this._setNodes(data && data.nodes);
    this._setEdges(data && data.edges);
  }

  if (disableStart == false) {
    if (this.constants.hierarchicalLayout.enabled == true) {
      this._resetLevels();
      this._setupHierarchicalLayout();
    }
    else {
      // find a stable position or start animating to a stable position
      this.physics.startSimulation()
    }
  }
  else {
    this.initializing = false;
  }
};

/**
 * Set options
 * @param {Object} options
 */
Network.prototype.setOptions = function (options) {
  if (options) {
    var prop;
    var fields = ['nodes','edges','smoothCurves','hierarchicalLayout','navigation',
      'keyboard','dataManipulation','onAdd','onEdit','onEditEdge','onConnect','onDelete','clickToUse'
    ];
    // extend all but the values in fields
    util.selectiveNotDeepExtend(fields,this.constants, options);
    util.selectiveNotDeepExtend(['color'],this.constants.nodes, options.nodes);
    util.selectiveNotDeepExtend(['color','length'],this.constants.edges, options.edges);

    this.groups.useDefaultGroups = this.constants.useDefaultGroups;

    this.physics.setOptions(options.physics);
    this.canvas.setOptions(this.constants);


    if (options.onAdd)      {this.triggerFunctions.add      = options.onAdd;}
    if (options.onEdit)     {this.triggerFunctions.edit     = options.onEdit;}
    if (options.onEditEdge) {this.triggerFunctions.editEdge = options.onEditEdge;}
    if (options.onConnect)  {this.triggerFunctions.connect  = options.onConnect;}
    if (options.onDelete)   {this.triggerFunctions.del      = options.onDelete;}

    util.mergeOptions(this.constants, options,'smoothCurves');
    util.mergeOptions(this.constants, options,'hierarchicalLayout');
    util.mergeOptions(this.constants, options,'clustering');
    util.mergeOptions(this.constants, options,'navigation');
    util.mergeOptions(this.constants, options,'keyboard');
    util.mergeOptions(this.constants, options,'dataManipulation');


    if (options.dataManipulation) {
      this.editMode = this.constants.dataManipulation.initiallyVisible;
    }


    // TODO: work out these options and document them
    if (options.edges) {
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
        this.constants.edges.inheritColor = false;
      }

      if (!options.edges.fontColor) {
        if (options.edges.color !== undefined) {
          if (util.isString(options.edges.color))           {this.constants.edges.fontColor = options.edges.color;}
          else if (options.edges.color.color !== undefined) {this.constants.edges.fontColor = options.edges.color.color;}
        }
      }
    }

    if (options.nodes) {
      if (options.nodes.color) {
        var newColorObj = util.parseColor(options.nodes.color);
        this.constants.nodes.color.background = newColorObj.background;
        this.constants.nodes.color.border = newColorObj.border;
        this.constants.nodes.color.highlight.background = newColorObj.highlight.background;
        this.constants.nodes.color.highlight.border = newColorObj.highlight.border;
        this.constants.nodes.color.hover.background = newColorObj.hover.background;
        this.constants.nodes.color.hover.border = newColorObj.hover.border;
      }
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

    if ('clickToUse' in options) {
      if (options.clickToUse) {
        if (!this.activator) {
          this.activator = new Activator(this.frame);
          this.activator.on('change', this._createKeyBinds.bind(this));
        }
      }
      else {
        if (this.activator) {
          this.activator.destroy();
          delete this.activator;
        }
      }
    }

    if (options.labels) {
      throw new Error('Option "labels" is deprecated. Use options "locale" and "locales" instead.');
    }

    // (Re)loading the mixins that can be enabled or disabled in the options.
    // load the force calculation functions, grouped under the physics system.
    // load the navigation system.
    //this._loadNavigationControls();
    //// load the data manipulation system
    //this._loadManipulationSystem();
    //// configure the smooth curves
    //this._configureSmoothCurves();

    // bind hammer
    this.canvas._bindHammer();

    // bind keys. If disabled, this will not do anything;
    //this._createKeyBinds();

    this._markAllEdgesAsDirty();
    this.canvas.setSize(this.constants.width, this.constants.height);
    if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
      this._resetLevels();
      this._setupHierarchicalLayout();
    }

    if (this.initializing !== true) {
      this.moving = true;
      this.start();
    }
  }
};



/**
 * Binding the keys for keyboard navigation. These functions are defined in the NavigationMixin
 * @private
 */
Network.prototype._createKeyBinds = function() {
  return;

  //var me = this;
  //if (this.keycharm !== undefined) {
  //  this.keycharm.destroy();
  //}
  //
  //if (this.constants.keyboard.bindToWindow == true) {
  //  this.keycharm = keycharm({container: window, preventDefault: false});
  //}
  //else {
  //  this.keycharm = keycharm({container: this.frame, preventDefault: false});
  //}
  //
  //this.keycharm.reset();
  //
  //if (this.constants.keyboard.enabled && this.isActive()) {
  //  this.keycharm.bind("up",   this._moveUp.bind(me)   , "keydown");
  //  this.keycharm.bind("up",   this._yStopMoving.bind(me), "keyup");
  //  this.keycharm.bind("down", this._moveDown.bind(me) , "keydown");
  //  this.keycharm.bind("down", this._yStopMoving.bind(me), "keyup");
  //  this.keycharm.bind("left", this._moveLeft.bind(me) , "keydown");
  //  this.keycharm.bind("left", this._xStopMoving.bind(me), "keyup");
  //  this.keycharm.bind("right",this._moveRight.bind(me), "keydown");
  //  this.keycharm.bind("right",this._xStopMoving.bind(me), "keyup");
  //  this.keycharm.bind("=",    this._zoomIn.bind(me),    "keydown");
  //  this.keycharm.bind("=",    this._stopZoom.bind(me),    "keyup");
  //  this.keycharm.bind("num+", this._zoomIn.bind(me),    "keydown");
  //  this.keycharm.bind("num+", this._stopZoom.bind(me),    "keyup");
  //  this.keycharm.bind("num-", this._zoomOut.bind(me),   "keydown");
  //  this.keycharm.bind("num-", this._stopZoom.bind(me),    "keyup");
  //  this.keycharm.bind("-",    this._zoomOut.bind(me),   "keydown");
  //  this.keycharm.bind("-",    this._stopZoom.bind(me),    "keyup");
  //  this.keycharm.bind("[",    this._zoomIn.bind(me),    "keydown");
  //  this.keycharm.bind("[",    this._stopZoom.bind(me),    "keyup");
  //  this.keycharm.bind("]",    this._zoomOut.bind(me),   "keydown");
  //  this.keycharm.bind("]",    this._stopZoom.bind(me),    "keyup");
  //  this.keycharm.bind("pageup",this._zoomIn.bind(me),   "keydown");
  //  this.keycharm.bind("pageup",this._stopZoom.bind(me),   "keyup");
  //  this.keycharm.bind("pagedown",this._zoomOut.bind(me),"keydown");
  //  this.keycharm.bind("pagedown",this._stopZoom.bind(me), "keyup");
  //}
  //
  //if (this.constants.dataManipulation.enabled == true) {
  //  this.keycharm.bind("esc",this._createManipulatorBar.bind(me));
  //  this.keycharm.bind("delete",this._deleteSelected.bind(me));
  //}
};

/**
 * Cleans up all bindings of the network, removing it fully from the memory IF the variable is set to null after calling this function.
 * var network = new vis.Network(..);
 * network.destroy();
 * network = null;
 */
Network.prototype.destroy = function() {
  this.start = function () {};
  this.redraw = function () {};
  this.renderTimer = false;

  // cleanup physicsConfiguration if it exists
  this._cleanupPhysicsConfiguration();

  // remove keybindings
  this.keycharm.reset();

  // clear hammer bindings
  this.hammer.destroy();

  // clear events
  this.off();

  this._recursiveDOMDelete(this.containerElement);
};

Network.prototype._recursiveDOMDelete = function(DOMobject) {
  while (DOMobject.hasChildNodes() == true) {
    this._recursiveDOMDelete(DOMobject.firstChild);
    DOMobject.removeChild(DOMobject.firstChild);
  }
};

/**
 * Check if there is an element on the given position in the network
 * (a node or edge). If so, and if this element has a title,
 * show a popup window with its title.
 *
 * @param {{x:Number, y:Number}} pointer
 * @private
 */
Network.prototype._checkShowPopup = function (pointer) {
  var obj = {
    left:   this._XconvertDOMtoCanvas(pointer.x),
    top:    this._YconvertDOMtoCanvas(pointer.y),
    right:  this._XconvertDOMtoCanvas(pointer.x),
    bottom: this._YconvertDOMtoCanvas(pointer.y)
  };

  var id;
  var previousPopupObjId = this.popupObj === undefined ? "" : this.popupObj.id;
  var nodeUnderCursor = false;
  var popupType = "node";

  if (this.popupObj == undefined) {
    // search the nodes for overlap, select the top one in case of multiple nodes
    var nodes = this.body.nodes;
    var overlappingNodes = [];
    for (id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        var node = nodes[id];
        if (node.isOverlappingWith(obj)) {
          if (node.getTitle() !== undefined) {
            overlappingNodes.push(id);
          }
        }
      }
    }

    if (overlappingNodes.length > 0) {
      // if there are overlapping nodes, select the last one, this is the
      // one which is drawn on top of the others
      this.popupObj = this.body.nodes[overlappingNodes[overlappingNodes.length - 1]];
      // if you hover over a node, the title of the edge is not supposed to be shown.
      nodeUnderCursor = true;
    }
  }

  if (this.popupObj === undefined && nodeUnderCursor == false) {
    // search the edges for overlap
    var edges = this.body.edges;
    var overlappingEdges = [];
    for (id in edges) {
      if (edges.hasOwnProperty(id)) {
        var edge = edges[id];
        if (edge.connected === true && (edge.getTitle() !== undefined) &&
            edge.isOverlappingWith(obj)) {
          overlappingEdges.push(id);
        }
      }
    }

    if (overlappingEdges.length > 0) {
      this.popupObj = this.body.edges[overlappingEdges[overlappingEdges.length - 1]];
      popupType = "edge";
    }
  }

  if (this.popupObj) {
    // show popup message window
    if (this.popupObj.id != previousPopupObjId) {
      if (this.popup === undefined) {
        this.popup = new Popup(this.frame, this.constants.tooltip);
      }

      this.popup.popupTargetType = popupType;
      this.popup.popupTargetId = this.popupObj.id;

      // adjust a small offset such that the mouse cursor is located in the
      // bottom left location of the popup, and you can easily move over the
      // popup area
      this.popup.setPosition(pointer.x + 3, pointer.y - 5);
      this.popup.setText(this.popupObj.getTitle());
      this.popup.show();
    }
  }
  else {
    if (this.popup) {
      this.popup.hide();
    }
  }
};


/**
 * Check if the popup must be hidden, which is the case when the mouse is no
 * longer hovering on the object
 * @param {{x:Number, y:Number}} pointer
 * @private
 */
Network.prototype._checkHidePopup = function (pointer) {
  var pointerObj = {
    left:   this._XconvertDOMtoCanvas(pointer.x),
    top:    this._YconvertDOMtoCanvas(pointer.y),
    right:  this._XconvertDOMtoCanvas(pointer.x),
    bottom: this._YconvertDOMtoCanvas(pointer.y)
  };

  var stillOnObj = false;
  if (this.popup.popupTargetType == 'node') {
    stillOnObj = this.body.nodes[this.popup.popupTargetId].isOverlappingWith(pointerObj);
    if (stillOnObj === true) {
      var overNode = this._getNodeAt(pointer);
      stillOnObj = overNode.id == this.popup.popupTargetId;
    }
  }
  else {
    if (this._getNodeAt(pointer) === null) {
      stillOnObj = this.body.edges[this.popup.popupTargetId].isOverlappingWith(pointerObj);
    }
  }


  if (stillOnObj === false) {
    this.popupObj = undefined;
    this.popup.hide();
  }
};


/**
 * Set a data set with nodes for the network
 * @param {Array | DataSet | DataView} nodes         The data containing the nodes.
 * @private
 */
Network.prototype._setNodes = function(nodes) {
  var oldNodesData = this.body.data.nodes;

  if (nodes instanceof DataSet || nodes instanceof DataView) {
    this.body.data.nodes = nodes;
  }
  else if (Array.isArray(nodes)) {
    this.body.data.nodes = new DataSet();
    this.body.data.nodes.add(nodes);
  }
  else if (!nodes) {
    this.body.data.nodes = new DataSet();
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
  this.body.nodes = {};

  if (this.body.data.nodes) {
    // subscribe to new dataset
    var me = this;
    util.forEach(this.nodesListeners, function (callback, event) {
      me.body.data.nodes.on(event, callback);
    });

    // draw all new nodes
    var ids = this.body.data.nodes.getIds();
    this._addNodes(ids);
  }
  this._updateSelection();
};

/**
 * Add nodes
 * @param {Number[] | String[]} ids
 * @private
 */
Network.prototype._addNodes = function(ids) {
  var id;
  for (var i = 0, len = ids.length; i < len; i++) {
    id = ids[i];
    var data = this.body.data.nodes.get(id);
    var node = new Node(data, this.images, this.groups, this.constants);
    this.body.nodes[id] = node; // note: this may replace an existing node
    if ((node.xFixed == false || node.yFixed == false) && (node.x === null || node.y === null)) {
      var radius = 10 * 0.1*ids.length + 10;
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
  this.physics._updateCalculationNodes();
  this._reconnectEdges();
  this._updateValueRange(this.body.nodes);
};

/**
 * Update existing nodes, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Network.prototype._updateNodes = function(ids,changedData) {
  var nodes = this.body.nodes;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    var node = nodes[id];
    var data = changedData[i];
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
  this._updateValueRange(nodes);
  this._markAllEdgesAsDirty();
};


Network.prototype._markAllEdgesAsDirty = function() {
  for (var edgeId in this.body.edges) {
    this.body.edges[edgeId].colorDirty = true;
  }
}

/**
 * Remove existing nodes. If nodes do not exist, the method will just ignore it.
 * @param {Number[] | String[]} ids
 * @private
 */
Network.prototype._removeNodes = function(ids) {
  var nodes = this.body.nodes;

  // remove from selection
  for (var i = 0, len = ids.length; i < len; i++) {
    if (this.selectionObj.nodes[ids[i]] !== undefined) {
      this.body.nodes[ids[i]].unselect();
      this._removeFromSelection(this.body.nodes[ids[i]]);
    }
  }

  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    delete nodes[id];
  }



  this._updateNodeIndexList();
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
  this.physics._updateCalculationNodes();
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
Network.prototype._setEdges = function(edges) {
  var oldEdgesData = this.body.data.edges;

  if (edges instanceof DataSet || edges instanceof DataView) {
    this.body.data.edges = edges;
  }
  else if (Array.isArray(edges)) {
    this.body.data.edges = new DataSet();
    this.body.data.edges.add(edges);
  }
  else if (!edges) {
    this.body.data.edges = new DataSet();
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
  this.body.edges = {};

  if (this.body.data.edges) {
    // subscribe to new dataset
    var me = this;
    util.forEach(this.edgesListeners, function (callback, event) {
      me.body.data.edges.on(event, callback);
    });

    // draw all new nodes
    var ids = this.body.data.edges.getIds();
    this._addEdges(ids);
  }

  this._reconnectEdges();
};

/**
 * Add edges
 * @param {Number[] | String[]} ids
 * @private
 */
Network.prototype._addEdges = function (ids) {
  var edges = this.body.edges,
      edgesData = this.body.data.edges;

  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];

    var oldEdge = edges[id];
    if (oldEdge) {
      oldEdge.disconnect();
    }

    var data = edgesData.get(id, {"showInternalIds" : true});
    edges[id] = new Edge(data, this.body, this.constants);
  }
  this.moving = true;
  this._updateValueRange(edges);
  this._createBezierNodes();
  this.physics._updateCalculationNodes();
  if (this.constants.hierarchicalLayout.enabled == true && this.initializing == false) {
    this._resetLevels();
    this._setupHierarchicalLayout();
  }
};

/**
 * Update existing edges, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Network.prototype._updateEdges = function (ids) {
  var edges = this.body.edges;
  var edgesData = this.body.data.edges;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];

    var data = edgesData.get(id);
    var edge = edges[id];
    if (edge) {
      // update edge
      edge.disconnect();
      edge.setProperties(data);
      edge.connect();
    }
    else {
      // create edge
      edge = new Edge(data, this.body, this.constants);
      this.body.edges[id] = edge;
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
Network.prototype._removeEdges = function (ids) {
  var edges = this.body.edges;

  // remove from selection
  for (var i = 0, len = ids.length; i < len; i++) {
    if (this.selectionObj.edges[ids[i]] !== undefined) {
      edges[ids[i]].unselect();
      this._removeFromSelection(edges[ids[i]]);
    }
  }

  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    var edge = edges[id];
    if (edge) {
      if (edge.via != null) {
        delete this.body.supportNodes[edge.via.id];
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
  this.physics._updateCalculationNodes();
};

/**
 * Reconnect all edges
 * @private
 */
Network.prototype._reconnectEdges = function() {
  var id,
      nodes = this.body.nodes,
      edges = this.body.edges;
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
Network.prototype._updateValueRange = function(obj) {
  var id;

  // determine the range of the objects
  var valueMin = undefined;
  var valueMax = undefined;
  var valueTotal = 0;
  for (id in obj) {
    if (obj.hasOwnProperty(id)) {
      var value = obj[id].getValue();
      if (value !== undefined) {
        valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
        valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
        valueTotal += value;
      }
    }
  }

  // adjust the range of all objects
  if (valueMin !== undefined && valueMax !== undefined) {
    for (id in obj) {
      if (obj.hasOwnProperty(id)) {
        obj[id].setValueRange(valueMin, valueMax, valueTotal);
      }
    }
  }
};


/**
 * Set the translation of the network
 * @param {Number} offsetX    Horizontal offset
 * @param {Number} offsetY    Vertical offset
 * @private
 */
Network.prototype._setTranslation = function(offsetX, offsetY) {
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
 * Get the translation of the network
 * @return {Object} translation    An object with parameters x and y, both a number
 * @private
 */
Network.prototype._getTranslation = function() {
  return {
    x: this.translation.x,
    y: this.translation.y
  };
};

/**
 * Scale the network
 * @param {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Network.prototype._setScale = function(scale) {
  this.scale = scale;
};

/**
 * Get the current scale of  the network
 * @return {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Network.prototype._getScale = function() {
  return this.scale;
};


/**
 * Move the network according to the keyboard presses.
 *
 * @private
 */
Network.prototype._handleNavigation = function() {
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
Network.prototype.freezeSimulation = function(freeze) {
  if (freeze == true) {
    this.freezeSimulationEnabled = true;
    this.moving = false;
  }
  else {
    this.freezeSimulationEnabled = false;
    this.moving = true;
    this.start();
  }
};


/**
 * This function cleans the support nodes if they are not needed and adds them when they are.
 *
 * @param {boolean} [disableStart]
 * @private
 */
Network.prototype._configureSmoothCurves = function(disableStart = true) {
  if (this.constants.smoothCurves.enabled == true && this.constants.smoothCurves.dynamic == true) {
    this._createBezierNodes();
    // cleanup unused support nodes
    for (let i = 0; i < this.body.supportNodeIndices.length; i++) {
      let nodeId = this.body.supportNodeIndices[i];
      // delete support nodes for edges that have been deleted
      if (this.body.edges[this.body.supportNodes[nodeId].parentEdgeId] === undefined) {
        delete this.body.supportNodes[nodeId];
      }
    }
  }
  else {
    // delete the support nodes
    this.body.supportNodes = {};
    for (var edgeId in this.body.edges) {
      if (this.body.edges.hasOwnProperty(edgeId)) {
        this.body.edges[edgeId].via = null;
      }
    }
  }


  this._updateNodeIndexList();
  this.physics._updateCalculationNodes();
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
Network.prototype._createBezierNodes = function(specificEdges = this.body.edges) {
  if (this.constants.smoothCurves.enabled == true && this.constants.smoothCurves.dynamic == true) {
    for (var edgeId in specificEdges) {
      if (specificEdges.hasOwnProperty(edgeId)) {
        var edge = specificEdges[edgeId];
        if (edge.via == null) {
          var nodeId = "edgeId:".concat(edge.id);
          var node = new Node(
                  {id:nodeId,
                    mass:1,
                    shape:'circle',
                    image:"",
                    internalMultiplier:1
                  },{},{},this.constants);
          this.body.supportNodes[nodeId] = node;
          edge.via = node;
          edge.via.parentEdgeId = edge.id;
          edge.positionBezierNode();
        }
      }
    }
    this._updateNodeIndexList();
  }
};

/**
 * load the functions that load the mixins into the prototype.
 *
 * @private
 */
Network.prototype._initializeMixinLoaders = function () {
  for (var mixin in MixinLoader) {
    if (MixinLoader.hasOwnProperty(mixin)) {
      Network.prototype[mixin] = MixinLoader[mixin];
    }
  }
};

/**
 * Load the XY positions of the nodes into the dataset.
 */
Network.prototype.storePosition = function() {
  console.log("storePosition is depricated: use .storePositions() from now on.")
  this.storePositions();
};

/**
 * Load the XY positions of the nodes into the dataset.
 */
Network.prototype.storePositions = function() {
  var dataArray = [];
  for (var nodeId in this.body.nodes) {
    if (this.body.nodes.hasOwnProperty(nodeId)) {
      var node = this.body.nodes[nodeId];
      var allowedToMoveX = !this.body.nodes.xFixed;
      var allowedToMoveY = !this.body.nodes.yFixed;
      if (this.body.data.nodes._data[nodeId].x != Math.round(node.x) || this.body.data.nodes._data[nodeId].y != Math.round(node.y)) {
        dataArray.push({id:nodeId,x:Math.round(node.x),y:Math.round(node.y),allowedToMoveX:allowedToMoveX,allowedToMoveY:allowedToMoveY});
      }
    }
  }
  this.body.data.nodes.update(dataArray);
};

/**
 * Return the positions of the nodes.
 */
Network.prototype.getPositions = function(ids) {
  var dataArray = {};
  if (ids !== undefined) {
    if (Array.isArray(ids) == true) {
      for (var i = 0; i < ids.length; i++) {
        if (this.body.nodes[ids[i]] !== undefined) {
          var node = this.body.nodes[ids[i]];
          dataArray[ids[i]] = {x: Math.round(node.x), y: Math.round(node.y)};
        }
      }
    }
    else {
      if (this.body.nodes[ids] !== undefined) {
        var node = this.body.nodes[ids];
        dataArray[ids] = {x: Math.round(node.x), y: Math.round(node.y)};
      }
    }
  }
  else {
    for (var nodeId in this.body.nodes) {
      if (this.body.nodes.hasOwnProperty(nodeId)) {
        var node = this.body.nodes[nodeId];
        dataArray[nodeId] = {x: Math.round(node.x), y: Math.round(node.y)};
      }
    }
  }
  return dataArray;
};


/**
 * Returns true when the Network is active.
 * @returns {boolean}
 */
Network.prototype.isActive = function () {
  return !this.activator || this.activator.active;
};


/**
 * Sets the scale
 * @returns {Number}
 */
Network.prototype.setScale = function () {
  return this._setScale();
};


/**
 * Returns the scale
 * @returns {Number}
 */
Network.prototype.getScale = function () {
  return this._getScale();
};


/**
 * Check if a node is a cluster.
 * @param nodeId
 * @returns {*}
 */
Network.prototype.isCluster = function(nodeId) {
  if (this.body.nodes[nodeId] !== undefined) {
    return this.body.nodes[nodeId].isCluster;
  }
  else {
    console.log("Node does not exist.")
    return false;
  }
};

/**
 * Returns the scale
 * @returns {Number}
 */
Network.prototype.getCenterCoordinates = function () {
  return this.DOMtoCanvas({x: 0.5 * this.frame.canvas.clientWidth, y: 0.5 * this.frame.canvas.clientHeight});
};


Network.prototype.getBoundingBox = function(nodeId) {
  if (this.body.nodes[nodeId] !== undefined) {
    return this.body.nodes[nodeId].boundingBox;
  }
}

Network.prototype.getConnectedNodes = function(nodeId) {
  var nodeList = [];
  if (this.body.nodes[nodeId] !== undefined) {
    var node = this.body.nodes[nodeId];
    var nodeObj = {nodeId : true}; // used to quickly check if node already exists
    for (var i = 0; i < node.edges.length; i++) {
      var edge = node.edges[i];
      if (edge.toId == nodeId) {
        if (nodeObj[edge.fromId] === undefined) {
          nodeList.push(edge.fromId);
          nodeObj[edge.fromId] = true;
        }
      }
      else if (edge.fromId == nodeId) {
        if (nodeObj[edge.toId] === undefined) {
          nodeList.push(edge.toId)
          nodeObj[edge.toId] = true;
        }
      }
    }
  }
  return nodeList;
}


Network.prototype.getEdgesFromNode = function(nodeId) {
  var edgesList = [];
  if (this.body.nodes[nodeId] !== undefined) {
    var node = this.body.nodes[nodeId];
    for (var i = 0; i < node.edges.length; i++) {
      edgesList.push(node.edges[i].id);
    }
  }
  return edgesList;
}

Network.prototype.generateColorObject = function(color) {
  return util.parseColor(color);

}

module.exports = Network;
