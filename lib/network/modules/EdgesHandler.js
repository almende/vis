/**
 * Created by Alex on 3/4/2015.
 */


var util = require("../../util");
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');
var Edge = require("./components/edges/EdgeMain");

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
      customScalingFunction: function (min,max,total,value) {
        if (max == min) {
          return 0.5;
        }
        else {
          var scale = 1 / (max - min);
          return Math.max(0,(value - min)*scale);
        }
      },
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
      useGradients: false, // release in 4.0
      smooth: {
        enabled: true,
        dynamic: true,
        type: "continuous",
        roundness: 0.5
      }
    };

    util.extend(this.options, this.defaultOptions);
  }

  setOptions(options) {

  }


  /**
   * Load edges by reading the data table
   * @param {Array | DataSet | DataView} edges    The data containing the edges.
   * @private
   * @private
   */
  setData(edges) {
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
      this.add(ids);
    }

    this.body.emitter.emit("_dataChanged");
  }


  /**
   * Add edges
   * @param {Number[] | String[]} ids
   * @private
   */
  add(ids) {
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

    this.body.emitter.emit("_dataChanged");
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
        edge.setOptions(data);
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

}

export default EdgesHandler;