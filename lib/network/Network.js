// Load custom shapes into CanvasRenderingContext2D
require('./shapes');

let Emitter = require('emitter-component');
let Hammer = require('../module/hammer');
let util = require('../util');
let DataSet = require('../DataSet');
let DataView = require('../DataView');
let dotparser = require('./dotparser');
let gephiParser = require('./gephiParser');
let Images = require('./Images');
let Activator = require('../shared/Activator');
let locales = require('./locales');

import  Groups              from './modules/Groups';
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
import  ManipulationSystem  from "./modules/ManipulationSystem";
import  ConfigurationSystem from "./../shared/ConfigurationSystem";
import  Validator           from "./../shared/Validator";
import  {printStyle}        from "./../shared/Validator";
import  {allOptions, configureOptions} from './options.js';



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
function Network(container, data, options) {
  if (!(this instanceof Network)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  // set constant values
  this.options = {};
  this.defaultOptions = {
    locale: 'en',
    locales: locales,
    clickToUse: false
  };
  util.extend(this.options, this.defaultOptions);

  // containers for nodes and edges
  this.body = {
    nodes: {},
    nodeIndices: [],
    edges: {},
    edgeIndices: [],
    data: {
      nodes: null,      // A DataSet or DataView
      edges: null       // A DataSet or DataView
    },
    functions: {
      createNode: function() {},
      createEdge: function() {},
      getPointer: function() {}
    },
    emitter: {
      on:   this.on.bind(this),
      off:  this.off.bind(this),
      emit: this.emit.bind(this),
      once: this.once.bind(this)
    },
    eventListeners: {
      onTap:        function() {},
      onTouch:      function() {},
      onDoubleTap:  function() {},
      onHold:       function() {},
      onDragStart:  function() {},
      onDrag:       function() {},
      onDragEnd:    function() {},
      onMouseWheel: function() {},
      onPinch:      function() {},
      onMouseMove:  function() {},
      onRelease:    function() {},
      onContext:    function() {}
    },
    container: container,
    view: {
      scale: 1,
      translation: {x: 0, y: 0}
    }
  };



  // bind the event listeners
  this.bindEventListeners();

  // setting up all modules
  this.images              = new Images(() => this.body.emitter.emit("_requestRedraw")); // object with images
  this.groups              = new Groups(); // object with groups
  this.canvas              = new Canvas(this.body);                         // DOM handler
  this.selectionHandler    = new SelectionHandler(this.body, this.canvas);  // Selection handler
  this.interactionHandler  = new InteractionHandler(this.body, this.canvas, this.selectionHandler);  // Interaction handler handles all the hammer bindings (that are bound by canvas), key
  this.view                = new View(this.body, this.canvas);              // camera handler, does animations and zooms
  this.renderer            = new CanvasRenderer(this.body, this.canvas);    // renderer, starts renderloop, has events that modules can hook into
  this.physics             = new PhysicsEngine(this.body);                  // physics engine, does all the simulations
  this.layoutEngine        = new LayoutEngine(this.body);                   // layout engine for inital layout and hierarchical layout
  this.clustering          = new ClusterEngine(this.body);                  // clustering api
  this.manipulation        = new ManipulationSystem(this.body, this.canvas, this.selectionHandler); // data manipulation system

  this.nodesHandler        = new NodesHandler(this.body, this.images, this.groups, this.layoutEngine);   // Handle adding, deleting and updating of nodes as well as global options
  this.edgesHandler        = new EdgesHandler(this.body, this.images, this.groups);   // Handle adding, deleting and updating of edges as well as global options

  // create the DOM elements
  this.canvas._create();

  // setup configuration system
  this.configurationSystem = new ConfigurationSystem(this, this.body.container, configureOptions, this.canvas.pixelRatio);

  // apply options
  this.setOptions(options);

  // load data (the disable start variable will be the same as the enabled clustering)
  this.setData(data);

}

// Extend Network with an Emitter mixin
Emitter(Network.prototype);


/**
 * Set options
 * @param {Object} options
 */
Network.prototype.setOptions = function (options) {
  if (options !== undefined) {

    let errorFound = Validator.validate(options, allOptions);
    if (errorFound === true) {
      console.log('%cErrors have been found in the supplied options object.', printStyle);
    }

    // copy the global fields over
    let fields = ['locale','locales','clickToUse'];
    util.selectiveDeepExtend(fields,this.options, options);

    // the hierarchical system can adapt the edges and the physics to it's own options because not all combinations work with the hierarichical system.
    options = this.layoutEngine.setOptions(options.layout, options);

    this.canvas.setOptions(options); // options for canvas are in globals

    // pass the options to the modules
    this.groups.setOptions(options.groups);
    this.nodesHandler.setOptions(options.nodes);
    this.edgesHandler.setOptions(options.edges);
    this.physics.setOptions(options.physics);
    this.manipulation.setOptions(options.manipulation,options); // manipulation uses the locales in the globals

    this.interactionHandler.setOptions(options.interaction);
    this.renderer.setOptions(options.interaction);            // options for rendering are in interaction
    this.selectionHandler.setOptions(options.interaction);    // options for selection are in interaction

    // these two do not have options at the moment, here for completeness
    //this.view.setOptions(options.view);
    //this.clustering.setOptions(options.clustering);

    this.configurationSystem.setOptions(options.configure);

    // if the configuration system is enabled, copy all options and put them into the config system
    if (this.configurationSystem.options.enabled === true) {
      let networkOptions = {nodes:{},edges:{},layout:{},interaction:{},manipulation:{},physics:{},global:{}};
      util.deepExtend(networkOptions.nodes,        this.nodesHandler.options);
      util.deepExtend(networkOptions.edges,        this.edgesHandler.options);
      util.deepExtend(networkOptions.layout,       this.layoutEngine.options);
      // load the selectionHandler and rendere default options in to the interaction group
      util.deepExtend(networkOptions.interaction,  this.selectionHandler.options);
      util.deepExtend(networkOptions.interaction,  this.renderer.options);

      util.deepExtend(networkOptions.interaction,  this.interactionHandler.options);
      util.deepExtend(networkOptions.manipulation, this.manipulation.options);
      util.deepExtend(networkOptions.physics,      this.physics.options);

      // load globals into the global object
      util.deepExtend(networkOptions.global,       this.canvas.options);
      util.deepExtend(networkOptions.global,       this.options);

      this.configurationSystem.setModuleOptions(networkOptions);
    }

    // handle network global options
    if (options.clickToUse !== undefined) {
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

    // start the physics simulation. Can be safely called multiple times.
    this.body.emitter.emit("startSimulation");
  }
};


/**
 * Update the this.body.nodeIndices with the most recent node index list
 * @private
 */
Network.prototype._updateVisibleIndices = function () {
  let nodes = this.body.nodes;
  let edges = this.body.edges;
  this.body.nodeIndices = [];
  this.body.edgeIndices = [];

  for (let nodeId in nodes) {
    if (nodes.hasOwnProperty(nodeId)) {
      if (nodes[nodeId].options.hidden === false) {
        this.body.nodeIndices.push(nodeId);
      }
    }
  }

  for (let edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      if (edges[edgeId].options.hidden === false) {
        this.body.edgeIndices.push(edgeId);
      }
    }
  }
};


/**
 * Bind all events
 */
Network.prototype.bindEventListeners = function () {
  // this event will trigger a rebuilding of the cache everything. Used when nodes or edges have been added or removed.
  this.body.emitter.on("_dataChanged", () => {
    // update shortcut lists
    this._updateVisibleIndices();
    this.physics.updatePhysicsIndices();

    // call the dataUpdated event because the only difference between the two is the updating of the indices
    this.body.emitter.emit("_dataUpdated");
  });

  // this is called when options of EXISTING nodes or edges have changed.
  this.body.emitter.on("_dataUpdated", () => {
    // update values
    this._updateValueRange(this.body.nodes);
    this._updateValueRange(this.body.edges);
    // start simulation (can be called safely, even if already running)
    this.body.emitter.emit("startSimulation");
  });
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
 */
Network.prototype.setData = function (data) {
  // reset the physics engine.
  this.body.emitter.emit("resetPhysics");
  this.body.emitter.emit("_resetData");

  // unselect all to ensure no selections from old data are carried over.
  this.selectionHandler.unselectAll();

  if (data && data.dot && (data.nodes || data.edges)) {
    throw new SyntaxError('Data must contain either parameter "dot" or ' +
      ' parameter pair "nodes" and "edges", but not both.');
  }

  // set options
  this.setOptions(data && data.options);
  // set all data
  if (data && data.dot) {
    // parse DOT file
    if (data && data.dot) {
      var dotData = dotparser.DOTToGraph(data.dot);
      this.setData(dotData);
      return;
    }
  }
  else if (data && data.gephi) {
    // parse DOT file
    if (data && data.gephi) {
      var gephiData = gephiParser.parseGephi(data.gephi);
      this.setData(gephiData);
      return;
    }
  }
  else {
    this.nodesHandler.setData(data && data.nodes, true);
    this.edgesHandler.setData(data && data.edges, true);
  }

  // emit change in data
  this.body.emitter.emit("_dataChanged");

  // find a stable position or start animating to a stable position
  this.body.emitter.emit("initPhysics");
};


/**
 * Cleans up all bindings of the network, removing it fully from the memory IF the variable is set to null after calling this function.
 * var network = new vis.Network(..);
 * network.destroy();
 * network = null;
 */
Network.prototype.destroy = function () {
  this.body.emitter.emit("destroy");
  // clear events
  this.body.emitter.off();
  this.off();

  // delete modules
  delete this.groups;
  delete this.canvas;
  delete this.selectionHandler;
  delete this.interactionHandler;
  delete this.view;
  delete this.renderer;
  delete this.physics;
  delete this.layoutEngine;
  delete this.clustering;
  delete this.manipulation;
  delete this.nodesHandler;
  delete this.edgesHandler;
  delete this.configurationSystem;
  delete this.images;

  // delete emitter bindings
  delete this.body.emitter.emit;
  delete this.body.emitter.on;
  delete this.body.emitter.off;
  delete this.body.emitter.once;
  delete this.body.emitter;


  for (var nodeId in this.body.nodes) {
    delete this.body.nodes[nodeId];
  }
  for (var edgeId in this.body.edges) {
    delete this.body.edges[edgeId];
  }

  // remove the container and everything inside it recursively
  util.recursiveDOMDelete(this.body.container);
};


/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Object} obj    An object containing a set of Edges or Nodes
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 * @private
 */
Network.prototype._updateValueRange = function (obj) {
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
 * Returns true when the Network is active.
 * @returns {boolean}
 */
Network.prototype.isActive = function () {
  return !this.activator || this.activator.active;
};


Network.prototype.setSize             = function() {this.canvas.setSize.apply(this.canvas,arguments);};
Network.prototype.canvasToDOM         = function() {this.canvas.canvasToDOM.apply(this.canvas,arguments);};
Network.prototype.DOMtoCanvas         = function() {this.canvas.setSize.DOMtoCanvas(this.canvas,arguments);};
Network.prototype.findNode            = function() {this.clustering.findNode.apply(this.clustering,arguments);};
Network.prototype.isCluster           = function() {this.clustering.isCluster.apply(this.clustering,arguments);};
Network.prototype.openCluster         = function() {this.clustering.openCluster.apply(this.clustering,arguments);};
Network.prototype.cluster             = function() {this.clustering.cluster.apply(this.clustering,arguments);};
Network.prototype.clusterByConnection = function() {this.clustering.clusterByConnection.apply(this.clustering,arguments);};
Network.prototype.clusterByHubsize    = function() {this.clustering.clusterByHubsize.apply(this.clustering,arguments);};
Network.prototype.clusterOutliers     = function() {this.clustering.clusterOutliers.apply(this.clustering,arguments);};
Network.prototype.getSeed             = function() {this.layoutEngine.getSeed.apply(this.layoutEngine,arguments);};
Network.prototype.enableEditMode      = function() {this.manipulation.enableEditMode.apply(this.manipulation,arguments);};
Network.prototype.disableEditMode     = function() {this.manipulation.disableEditMode.apply(this.manipulation,arguments);};
Network.prototype.addNodeMode         = function() {this.manipulation.addNodeMode.apply(this.manipulation,arguments);};
Network.prototype.editNodeMode        = function() {this.manipulation.editNodeMode.apply(this.manipulation,arguments);};
Network.prototype.addEdgeMode         = function() {this.manipulation.addEdgeMode.apply(this.manipulation,arguments);};
Network.prototype.editEdgeMode        = function() {this.manipulation.editEdgeMode.apply(this.manipulation,arguments);};
Network.prototype.deleteSelected      = function() {this.manipulation.deleteSelected.apply(this.manipulation,arguments);};
Network.prototype.getPositions        = function() {this.nodesHandler.getPositions.apply(this.nodesHandler,arguments);};
Network.prototype.storePositions      = function() {this.nodesHandler.storePositions.apply(this.nodesHandler,arguments);};
Network.prototype.getBoundingBox      = function() {this.nodesHandler.getBoundingBox.apply(this.nodesHandler,arguments);};
Network.prototype.getConnectedNodes   = function() {this.nodesHandler.getConnectedNodes.apply(this.nodesHandler,arguments);};
Network.prototype.getEdges            = function() {this.nodesHandler.getEdges.apply(this.nodesHandler,arguments);};
Network.prototype.startSimulation     = function() {this.physics.startSimulation.apply(this.physics,arguments);};
Network.prototype.stopSimulation      = function() {this.physics.stopSimulation.apply(this.physics,arguments);};
Network.prototype.stabilize           = function() {this.physics.stabilize.apply(this.physics,arguments);};
Network.prototype.getSelection        = function() {this.selectionHandler.getSelection.apply(this.selectionHandler,arguments);};
Network.prototype.getSelectedNodes    = function() {this.selectionHandler.getSelectedNodes.apply(this.selectionHandler,arguments);};
Network.prototype.getSelectedEdges    = function() {this.selectionHandler.getSelectedEdges.apply(this.selectionHandler,arguments);};
Network.prototype.getNodeAt           = function() {this.selectionHandler.getNodeAt.apply(this.selectionHandler,arguments);};
Network.prototype.getEdgeAt           = function() {this.selectionHandler.getEdgeAt.apply(this.selectionHandler,arguments);};
Network.prototype.selectNodes         = function() {this.selectionHandler.selectNodes.apply(this.selectionHandler,arguments);};
Network.prototype.selectEdges         = function() {this.selectionHandler.selectEdges.apply(this.selectionHandler,arguments);};
Network.prototype.unselectAll         = function() {this.selectionHandler.unselectAll.apply(this.selectionHandler,arguments);};
Network.prototype.redraw              = function() {this.renderer.redraw.apply(this.renderer,arguments);};
Network.prototype.getScale            = function() {this.view.getScale.apply(this.view,arguments);};
Network.prototype.getPosition         = function() {this.view.getPosition.apply(this.view,arguments);};
Network.prototype.fit                 = function() {this.view.fit.apply(this.view,arguments);};
Network.prototype.moveTo              = function() {this.view.moveTo.apply(this.view,arguments);};
Network.prototype.focus               = function() {this.view.focus.apply(this.view,arguments);};
Network.prototype.releaseNode         = function() {this.view.releaseNode.apply(this.view,arguments);};


module.exports = Network;
