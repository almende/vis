var util = require("../../util");
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');

import Edge  from "./components/Edge"
import Label from "./components/shared/Label"

class EdgesHandler {
  constructor(body, images, groups) {
    this.body = body;
    this.images = images;
    this.groups = groups;

    // create the edge API in the body container
    this.body.functions.createEdge = this.create.bind(this);

    this.edgesListeners = {
      add:    (event, params) => {this.add(params.items);},
      update: (event, params) => {this.update(params.items);},
      remove: (event, params) => {this.remove(params.items);}
    };

    this.options = {};
    this.defaultOptions = {
      arrows: {
        to:     {enabled: false, scaleFactor:1}, // boolean / {arrowScaleFactor:1} / {enabled: false, arrowScaleFactor:1}
        middle: {enabled: false, scaleFactor:1},
        from:   {enabled: false, scaleFactor:1}
      },
      arrowStrikethrough: true,
      color: {
        color:'#848484',
        highlight:'#848484',
        hover: '#848484',
        inherit: 'from',
        opacity:1.0
      },
      dashes: false,
      font: {
        color: '#343434',
        size: 14, // px
        face: 'arial',
        background: 'none',
        strokeWidth: 2, // px
        strokeColor: '#ffffff',
        align:'horizontal'
      },
      hidden: false,
      hoverWidth: 1.5,
      label: undefined,
      labelHighlightBold: true,
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
          drawThreshold: 5
        },
        customScalingFunction: function (min,max,total,value) {
          if (max === min) {
            return 0.5;
          }
          else {
            var scale = 1 / (max - min);
            return Math.max(0,(value - min)*scale);
          }
        }
      },
      selectionWidth: 1.5,
      selfReferenceSize:20,
      shadow:{
        enabled: false,
        color: 'rgba(0,0,0,0.5)',
        size:10,
        x:5,
        y:5
      },
      smooth: {
        enabled: true,
        type: "dynamic",
        forceDirection:'none',
        roundness: 0.5
      },
      title:undefined,
      width: 1,
      value: undefined
    };

    util.extend(this.options, this.defaultOptions);

    this.bindEventListeners();
  }

  bindEventListeners() {
    // this allows external modules to force all dynamic curves to turn static.
    this.body.emitter.on("_forceDisableDynamicCurves", (type) => {
      if (type === 'dynamic') {
        type = 'continuous';
      }
      let emitChange = false;
      for (let edgeId in this.body.edges) {
        if (this.body.edges.hasOwnProperty(edgeId)) {
          let edge = this.body.edges[edgeId];
          let edgeData = this.body.data.edges._data[edgeId];

          // only forcibly remove the smooth curve if the data has been set of the edge has the smooth curves defined.
          // this is because a change in the global would not affect these curves.
          if (edgeData !== undefined) {
            let edgeOptions = edgeData.smooth;
            if (edgeOptions !== undefined) {
              if (edgeOptions.enabled === true && edgeOptions.type === 'dynamic') {
                if (type === undefined) {
                  edge.setOptions({smooth: false});
                }
                else {
                  edge.setOptions({smooth: {type: type}});
                }
                emitChange = true;
              }
            }
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

    // refresh the edges. Used when reverting from hierarchical layout
    this.body.emitter.on("refreshEdges", this.refresh.bind(this));
    this.body.emitter.on("refresh",      this.refresh.bind(this));
    this.body.emitter.on("destroy",      () => {
      util.forEach(this.edgesListeners, (callback, event) => {
        if (this.body.data.edges)
          this.body.data.edges.off(event, callback);
      });
      delete this.body.functions.createEdge;
      delete this.edgesListeners.add;
      delete this.edgesListeners.update;
      delete this.edgesListeners.remove;
      delete this.edgesListeners;
    });

  }

  setOptions(options) {
    if (options !== undefined) {
      // use the parser from the Edge class to fill in all shorthand notations
      Edge.parseOptions(this.options, options);

      // handle multiple input cases for color
      if (options.color !== undefined) {
        this.markAllEdgesAsDirty();
      }

      // update smooth settings in all edges
      let dataChanged = false;
      if (options.smooth !== undefined) {
        for (let edgeId in this.body.edges) {
          if (this.body.edges.hasOwnProperty(edgeId)) {
            dataChanged = this.body.edges[edgeId].updateEdgeType() || dataChanged;
          }
        }
      }

      // update fonts in all edges
      if (options.font !== undefined) {
        // use the parser from the Label class to fill in all shorthand notations
        Label.parseOptions(this.options.font, options);
        for (let edgeId in this.body.edges) {
          if (this.body.edges.hasOwnProperty(edgeId)) {
            this.body.edges[edgeId].updateLabelModule();
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
      if (edge !== undefined) {
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
        edge.cleanup();
        edge.disconnect();
        delete edges[id];
      }
    }

    this.body.emitter.emit("_dataChanged");
  }

  refresh() {
    let edges = this.body.edges;
    for (let edgeId in edges) {
      let edge = undefined;
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
      }
      let data = this.body.data.edges._data[edgeId];
      if (edge !== undefined && data !== undefined) {
        edge.setOptions(data);
      }
    }
  }

  create(properties) {
    return new Edge(properties, this.body, this.options)
  }


  markAllEdgesAsDirty() {
    for (var edgeId in this.body.edges) {
      this.body.edges[edgeId].edgeType.colorDirty = true;
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


  getConnectedNodes(edgeId) {
    let nodeList = [];
    if (this.body.edges[edgeId] !== undefined) {
      let edge = this.body.edges[edgeId];
      if (edge.fromId) {nodeList.push(edge.fromId);}
      if (edge.toId)   {nodeList.push(edge.toId);}
    }
    return nodeList;
  }

}

export default EdgesHandler;