/**
 * Created by Alex on 3/4/2015.
 */


var util = require("../../util");
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');

import Edge from "./components/Edge"

class EdgesHandler {
  constructor(body, images, groups) {
    this.body = body;
    this.images = images;
    this.groups = groups;

    // create the edge API in the body container
    this.body.functions.createEdge = this.create.bind(this);

    this.edgesListeners = {
      'add':    (event, params) => {this.add(params.items);},
      'update': (event, params) => {this.update(params.items);},
      'remove': (event, params) => {this.remove(params.items);}
    };

    this.options = {};
    this.defaultOptions = {
      arrows: {
        to:     {enabled: false, scaleFactor:1}, // boolean / {arrowScaleFactor:1} / {enabled: false, arrowScaleFactor:1}
        middle: {enabled: false, scaleFactor:1},
        from:   {enabled: false, scaleFactor:1}
      },
      color: {
        color:'#848484',
        highlight:'#848484',
        hover: '#848484',
        inherit: {
          enabled: true,
          source: 'from', // from / true
          useGradients: false // release in 4.0
        },
        opacity:1.0
      },
      dashes:{
        enabled: false,
        preset: 'dotted',
        length: 10,
        gap: 5,
        altLength: undefined
      },
      font: {
        color: '#343434',
        size: 14, // px
        face: 'arial',
        background: 'none',
        stroke: 1, // px
        strokeColor: '#ffffff',
        align:'horizontal'
      },
      hidden: false,
      hoverWidth: 1.5,
      label: undefined,
      length: undefined,
      physics: true,
      scaling:{
        min: 1,
        max: 15,
        label: {
          enabled: true,
          min: 14,
          max: 30,
          maxVisible: 30,
          drawThreshold: 3
        },
        customScalingFunction: function (min,max,total,value) {
          if (max == min) {
            return 0.5;
          }
          else {
            var scale = 1 / (max - min);
            return Math.max(0,(value - min)*scale);
          }
        }
      },
      selfReferenceSize:20,
      smooth: {
        enabled: true,
        dynamic: true,
        type: "continuous",
        roundness: 0.5
      },
      title:undefined,
      width: 1,
      widthSelectionMultiplier: 2,
      value:1
    };

    util.extend(this.options, this.defaultOptions);


    // this allows external modules to force all dynamic curves to turn static.
    this.body.emitter.on("_forceDisableDynamicCurves", (type) => {
      let emitChange = false;
      for (let edgeId in this.body.edges) {
        if (this.body.edges.hasOwnProperty(edgeId)) {
          let edgeOptions = this.body.edges[edgeId].options.smooth;
          if (edgeOptions.enabled === true && edgeOptions.dynamic === true) {
            if (type === undefined) {
              edge.setOptions({smooth:false});
            }
            else {
              edge.setOptions({smooth:{dynamic:false, type:type}});
            }
            emitChange = true;
          }
        }
      }
      if (emitChange === true) {
        this.body.emitter.emit("_dataChanged");
      }
    });

    // this is called when options of EXISTING nodes or edges have changed.
    this.body.emitter.on("_dataUpdated", () => {
      this.reconnectEdges();
      this.markAllEdgesAsDirty();
    });

  }

  setOptions(options) {
    if (options !== undefined) {
      util.mergeOptions(this.options, options, 'smooth');
      util.mergeOptions(this.options, options, 'dashes');

      // hanlde multiple input cases for arrows
      if (options.arrows !== undefined) {
        if (typeof options.arrows === 'string') {
          let arrows = options.arrows.toLowerCase();
          if (arrows.indexOf("to")     != -1) {this.options.arrows.to.enabled     = true;}
          if (arrows.indexOf("middle") != -1) {this.options.arrows.middle.enabled = true;}
          if (arrows.indexOf("from")   != -1) {this.options.arrows.from.enabled   = true;}
        }
        else if (typeof options.arrows === 'object') {
          util.mergeOptions(this.options.arrows, options.arrows, 'to');
          util.mergeOptions(this.options.arrows, options.arrows, 'middle');
          util.mergeOptions(this.options.arrows, options.arrows, 'from');
        }
        else {
          throw new Error("The arrow options can only be an object or a string. Refer to the documentation. You used:" + JSON.stringify(options.arrows));
        }
      }

      // hanlde multiple input cases for color
      if (options.color !== undefined) {
        if (util.isString(options.color)) {
          util.assignAllKeys(this.options.color, options.color);
          this.options.color.inherit.enabled = false;
        }
        else {
          util.extend(this.options.color, options.color);
          if (options.color.inherit === undefined) {
            this.options.color.inherit.enabled = false;
          }
        }
        util.mergeOptions(this.options.color, options.color, 'inherit');
      }

      // update smooth settings
      let dataChanged = false;
      if (options.smooth !== undefined) {
        for (let nodeId in this.body.edges) {
          if (this.body.edges.hasOwnProperty(nodeId)) {
            dataChanged = this.body.edges[nodeId].updateEdgeType() || dataChanged;
          }
        }
      }

      // update fonts
      if (options.font) {
        for (let nodeId in this.body.edges) {
          if (this.body.edges.hasOwnProperty(nodeId)) {
            this.body.edges[nodeId].updateLabelModule();
          }
        }
      }

      // update the state of the variables if needed
      if (options.hidden !== undefined || options.physics !== undefined  || dataChanged === true) {
        this.body.emitter.emit('_dataChanged');
      }
    }
  }


  /**
   * Load edges by reading the data table
   * @param {Array | DataSet | DataView} edges    The data containing the edges.
   * @private
   * @private
   */
  setData(edges, doNotEmit = false) {
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

    // TODO: is this null or undefined or false?
    if (oldEdgesData) {
      // unsubscribe from old dataset
      util.forEach(this.edgesListeners, (callback, event) => {oldEdgesData.off(event, callback);});
    }

    // remove drawn edges
    this.body.edges = {};

    // TODO: is this null or undefined or false?
    if (this.body.data.edges) {
      // subscribe to new dataset
      util.forEach(this.edgesListeners, (callback, event) =>  {this.body.data.edges.on(event, callback);});

      // draw all new nodes
      var ids = this.body.data.edges.getIds();
      this.add(ids, true);
    }

    if (doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }


  /**
   * Add edges
   * @param {Number[] | String[]} ids
   * @private
   */
  add(ids, doNotEmit = false) {
    var edges = this.body.edges;
    var edgesData = this.body.data.edges;

    for (let i = 0; i < ids.length; i++) {
      var id = ids[i];

      var oldEdge = edges[id];
      if (oldEdge) {
        oldEdge.disconnect();
      }

      var data = edgesData.get(id, {"showInternalIds" : true});
      edges[id] = this.create(data);
    }

    if (doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }



  /**
   * Update existing edges, or create them when not yet existing
   * @param {Number[] | String[]} ids
   * @private
   */
  update(ids) {
    var edges = this.body.edges;
    var edgesData = this.body.data.edges;
    var dataChanged = false;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var data = edgesData.get(id);
      var edge = edges[id];
      if (edge === null) {
        // update edge
        edge.disconnect();
        dataChanged = edge.setOptions(data) || dataChanged; // if a support node is added, data can be changed.
        edge.connect();
      }
      else {
        // create edge
        this.body.edges[id] = this.create(data);
        dataChanged = true;
      }
    }

    if (dataChanged === true) {
      this.body.emitter.emit("_dataChanged");
    }
    else {
      this.body.emitter.emit("_dataUpdated");
    }
  }



  /**
   * Remove existing edges. Non existing ids will be ignored
   * @param {Number[] | String[]} ids
   * @private
   */
  remove(ids) {
    var edges = this.body.edges;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var edge = edges[id];
      if (edge !== undefined) {
        if (edge.via != null) {
          delete this.body.supportNodes[edge.via.id];
        }
        edge.disconnect();
        delete edges[id];
      }
    }

    this.body.emitter.emit("_dataChanged");
  }

  create(properties) {
    return new Edge(properties, this.body, this.options)
  }


  markAllEdgesAsDirty() {
    for (var edgeId in this.body.edges) {
      this.body.edges[edgeId].colorDirty = true;
    }
  }



  /**
   * Reconnect all edges
   * @private
   */
  reconnectEdges() {
    var id;
    var nodes = this.body.nodes;
    var edges = this.body.edges;

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
  }


}

export default EdgesHandler;