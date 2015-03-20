/**
 * Created by Alex on 3/4/2015.
 */

var util = require("../../util");
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');

import Node from "./components/Node";

class NodesHandler {
  constructor(body, images, groups, layoutEngine) {
    this.body = body;
    this.images = images;
    this.groups = groups;
    this.layoutEngine = layoutEngine;

    // create the node API in the body container
    this.body.functions.createNode = this.create.bind(this);

    this.nodesListeners = {
      'add':    (event, params) => {this.add(params.items);},
      'update': (event, params) => {this.update(params.items, params.data);},
      'remove': (event, params) => {this.remove(params.items);}
    };


    this.options = {};
    this.defaultOptions = {
      borderWidth: 1,
      borderWidthSelected: undefined,
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
      fixed: {
        x:false,
        y:false
      },
      font: {
        color: '#343434',
        size: 14, // px
        face: 'arial',
        background: 'none',
        stroke: 0, // px
        strokeColor: 'white',
        align:'horizontal'
      },
      group: undefined,
      hidden: false,
      icon: {
        fontFace: undefined,  //'FontAwesome',
        code:  undefined,     //'\uf007',
        size:  undefined,     //50,
        color:  undefined     //'#aa00ff'
      },
      image: undefined, // --> URL
      label: undefined,
      mass: 1,
      physics: true,
      scaling: {
        min: 10,
        max: 40,
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
      shape: 'ellipse',
      size: 10,
      value: 1
    };

    util.extend(this.options, this.defaultOptions);
  }

  setOptions(options) {

  }

  /**
   * Set a data set with nodes for the network
   * @param {Array | DataSet | DataView} nodes         The data containing the nodes.
   * @private
   */
  setData(nodes) {
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
      this.add(ids);
    }
    this.body.emitter.emit("_dataChanged");
  }


  /**
   * Add nodes
   * @param {Number[] | String[]} ids
   * @private
   */
  add(ids) {
    var id;
    var newNodes = [];
    for (var i = 0; i < ids.length; i++) {
      id = ids[i];
      var properties = this.body.data.nodes.get(id);
      var node = this.create(properties);;
      newNodes.push(node);
      this.body.nodes[id] = node; // note: this may replace an existing node
    }

    this.layoutEngine.positionInitially(newNodes);

    this.body.emitter.emit("_dataChanged");
  }

  /**
   * Update existing nodes, or create them when not yet existing
   * @param {Number[] | String[]} ids
   * @private
   */
  update(ids, changedData) {
    var nodes = this.body.nodes;
    var dataChanged = false;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var node = nodes[id];
      var data = changedData[i];
      if (node !== undefined) {
        // update node
        node.setOptions(data, this.constants);
      }
      else {
        dataChanged = true;
        // create node
        node = this.create(properties);
        nodes[id] = node;
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
   * Remove existing nodes. If nodes do not exist, the method will just ignore it.
   * @param {Number[] | String[]} ids
   * @private
   */
  remove(ids) {
    var nodes = this.body.nodes;

    for (let i = 0; i < ids.length; i++) {
      var id = ids[i];
      delete nodes[id];
    }

    this.body.emitter.emit("_dataChanged");
  }



  create(properties, constructorClass = Node) {
    return new constructorClass(properties, this.body, this.images, this.groups, this.options)
  }


}

export default NodesHandler;