var Emitter = require('emitter-component');
var Hammer = require('../module/hammer');
var util = require('../util');
var DataSet = require('../DataSet');
var DataView = require('../DataView');
var dotparser = require('./dotparser');
var gephiParser = require('./gephiParser');
var Groups = require('./Groups');
var Images = require('./Images');
var Popup = require('./Popup');
var Activator = require('../shared/Activator');
var locales = require('./locales');

// Load custom shapes into CanvasRenderingContext2D
require('./shapes');

import  NodesHandler        from './modules/NodesHandler';
import  EdgesHandler        from './modules/EdgesHandler';
import  PhysicsEngine       from './modules/PhysicsEngine';
import  ClusterEngine       from './modules/Clustering';
import  CanvasRenderer      from './modules/CanvasRenderer';
import  Canvas              from './modules/Canvas';
import  View                from './modules/View';
import  InteractionHandler  from './modules/InteractionHandler';
import  SelectionHandler    from "./modules/SelectionHandler";
import  LayoutEngine        from "./modules/LayoutEngine";

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

  // set constant values
  this.remainingOptions = {
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
    locale: 'en',
    locales: locales,
    useDefaultGroups: true
  };

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
      createNode: () => {},
      createEdge: () => {}
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
    container: container,
    view: {
      scale:1,
      translation:{x:0,y:0}
    }
  };

  // todo think of good comment for this set
  var groups = new Groups(); // object with groups
  var images = new Images(() => this.body.emitter.emit("_requestRedraw")); // object with images

  // data handling modules
  this.canvas             = new Canvas(this.body);                         // DOM handler
  this.selectionHandler   = new SelectionHandler(this.body, this.canvas);  // Selection handler
  this.interactionHandler = new InteractionHandler(this.body, this.canvas, this.selectionHandler);  // Interaction handler handles all the hammer bindings (that are bound by canvas), key
  this.view               = new View(this.body, this.canvas);              // camera handler, does animations and zooms
  this.renderer           = new CanvasRenderer(this.body, this.canvas);    // renderer, starts renderloop, has events that modules can hook into
  this.physics            = new PhysicsEngine(this.body);                  // physics engine, does all the simulations
  this.layoutEngine       = new LayoutEngine(this.body);                   // TODO: layout engine for initial positioning and hierarchical positioning
  this.clustering         = new ClusterEngine(this.body);                  // clustering api

  this.nodesHandler       = new NodesHandler(this.body, images, groups, this.layoutEngine);   // Handle adding, deleting and updating of nodes as well as global options
  this.edgesHandler       = new EdgesHandler(this.body, images, groups);   // Handle adding, deleting and updating of edges as well as global options



  // this event will trigger a rebuilding of the cache everything. Used when nodes or edges have been added or removed.
  this.body.emitter.on("_dataChanged", (params) => {
    var t0 = new Date().valueOf();
    // update shortcut lists
    this._updateNodeIndexList();
    this.physics._updateCalculationNodes();
    // update values
    this._updateValueRange(this.body.nodes);
    this._updateValueRange(this.body.edges);
    // update edges
    this._reconnectEdges();
    this._markAllEdgesAsDirty();
    // start simulation (can be called safely, even if already running)
    this.body.emitter.emit("startSimulation");
    console.log("_dataChanged took:", new Date().valueOf() - t0);
  })

  // this is called when options of EXISTING nodes or edges have changed.
  this.body.emitter.on("_dataUpdated", () => {
    var t0 = new Date().valueOf();
    // update values
    this._updateValueRange(this.body.nodes);
    this._updateValueRange(this.body.edges);
    // update edges
    this._reconnectEdges();
    this._markAllEdgesAsDirty();
    // start simulation (can be called safely, even if already running)
    this.body.emitter.emit("startSimulation");
    console.log("_dataUpdated took:", new Date().valueOf() - t0);
  });

  // create the DOM elements
  this.canvas.create();

  // apply options
  this.setOptions(options);

  // load data (the disable start variable will be the same as the enabled clustering)
  this.setData(data);

}

// Extend Network with an Emitter mixin
Emitter(Network.prototype);


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
Network.prototype.setData = function(data) {
  // reset the physics engine.
  this.body.emitter.emit("resetPhysics");
  this.body.emitter.emit("_resetData");

  // unselect all to ensure no selections from old data are carried over.
  this.selectionHandler.unselectAll();

  // we set initializing to true to ensure that the hierarchical layout is not performed until both nodes and edges are added.
  this.initializing = true;

  if (data && data.dot && (data.nodes || data.edges)) {
    throw new SyntaxError('Data must contain either parameter "dot" or ' +
        ' parameter pair "nodes" and "edges", but not both.');
  }

  // clean up in case there is anyone in an active mode of the manipulation. This is the same option as bound to the escape button.
  //if (this.constants.dataManipulation.enabled == true) {
  //  this._createManipulatorBar();
  //}

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
    this.nodesHandler.setData(data && data.nodes);
    this.edgesHandler.setData(data && data.edges);
  }

  // find a stable position or start animating to a stable position
  this.body.emitter.emit("initPhysics");
};

/**
 * Set options
 * @param {Object} options
 */
Network.prototype.setOptions = function (options) {
  if (options) {
    //var fields = ['nodes','edges','smoothCurves','hierarchicalLayout','navigation',
    //  'keyboard','dataManipulation','onAdd','onEdit','onEditEdge','onConnect','onDelete','clickToUse'
    //];
    // extend all but the values in fields
    //util.selectiveNotDeepExtend(fields,this.constants, options);
    //util.selectiveNotDeepExtend(['color'],this.constants.nodes, options.nodes);
    //util.selectiveNotDeepExtend(['color','length'],this.constants.edges, options.edges);

    //this.groups.useDefaultGroups = this.constants.useDefaultGroups;

    this.nodesHandler.setOptions(options.nodes);
    this.edgesHandler.setOptions(options.edges);
    this.physics.setOptions(options.physics);
    this.canvas.setOptions(options.canvas);
    this.renderer.setOptions(options.rendering);
    this.view.setOptions(options.view);
    this.interactionHandler.setOptions(options.interaction);
    this.selectionHandler.setOptions(options.selection);
    this.layoutEngine.setOptions(options.layout);
    //this.clustering.setOptions(options.clustering);

    //util.mergeOptions(this.constants, options,'smoothCurves');
    //util.mergeOptions(this.constants, options,'hierarchicalLayout');
    //util.mergeOptions(this.constants, options,'clustering');
    //util.mergeOptions(this.constants, options,'navigation');
    //util.mergeOptions(this.constants, options,'keyboard');
    //util.mergeOptions(this.constants, options,'dataManipulation');


    //if (options.dataManipulation) {
    //  this.editMode = this.constants.dataManipulation.initiallyVisible;
    //}


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
      if (options.clickToUse === true) {
        if (this.activator === undefined) {
          this.activator = new Activator(this.frame);
          this.activator.on('change', this._createKeyBinds.bind(this));
        }
      }
      else {
        if (this.activator !== undefined) {
          this.activator.destroy();
          delete this.activator;
        }
        this.body.emitter.emit("activate");
      }
    }
    else {
      this.body.emitter.emit("activate");
    }

    this.canvas.setSize();
  }
};


/**
 * Cleans up all bindings of the network, removing it fully from the memory IF the variable is set to null after calling this function.
 * var network = new vis.Network(..);
 * network.destroy();
 * network = null;
 */
Network.prototype.destroy = function() {
  this.body.emitter.emit("destroy");

  // clear events
  this.body.emitter.off();

  // remove the container and everything inside it recursively
  this.util.recursiveDOMDelete(this.body.container);
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
      var overNode = this.getNodeAt(pointer);
      stillOnObj = overNode.id == this.popup.popupTargetId;
    }
  }
  else {
    if (this.getNodeAt(pointer) === null) {
      stillOnObj = this.body.edges[this.popup.popupTargetId].isOverlappingWith(pointerObj);
    }
  }


  if (stillOnObj === false) {
    this.popupObj = undefined;
    this.popup.hide();
  }
};




Network.prototype._markAllEdgesAsDirty = function() {
  for (var edgeId in this.body.edges) {
    this.body.edges[edgeId].colorDirty = true;
  }
}



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
