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

    this.edgesListeners = {
      'add':    (event, params) => {this.add(params.items);},
      'update': (event, params) => {this.update(params.items);},
      'remove': (event, params) => {this.remove(params.items);}
    };

    var customScalingFunction = function (min,max,total,value) {
      if (max == min) {
        return 0.5;
      }
      else {
        var scale = 1 / (max - min);
        return Math.max(0,(value - min)*scale);
      }
    };

    this.options = {};
    this.defaultOptions = {
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
      useGradients: false, // release in 4.0
      smoothEdges: {
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
    var edges = this.body.edges,
      edgesData = this.body.data.edges;

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];

      var oldEdge = edges[id];
      if (oldEdge) {
        oldEdge.disconnect();
      }

      var data = edgesData.get(id, {"showInternalIds" : true});
      edges[id] = new Edge(data, this.body, this.options);
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
    for (var i = 0; i < ids.length; i++) {
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
        edge = new Edge(data, this.body, this.options);
        this.body.edges[id] = edge;
      }
    }

    this.body.emitter.emit("_dataUpdated")
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

  /**
   * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
   * are used for the force calculation.
   *
   * @private
   */
  createBezierNodes(specificEdges = this.body.edges) {
    var changedData = false;
    if (this.options.smoothEdges.enabled == true && this.options.smoothEdges.dynamic == true) {
      for (var edgeId in specificEdges) {
        if (specificEdges.hasOwnProperty(edgeId)) {
          var edge = specificEdges[edgeId];
          if (edge.via == null) {
            changedData = true;
            // TODO: move to nodes
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
    }
    if (changedData === true) {
      this.body.emitter.emit("_dataChanged");
    }
  }
}

export default EdgesHandler;