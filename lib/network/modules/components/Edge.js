var util = require('../../../util');


import Label              from './unified/Label.js'
import BezierEdgeDynamic  from './edges/BezierEdgeDynamic'
import BezierEdgeStatic   from './edges/BezierEdgeStatic'
import StraightEdge       from './edges/StraightEdge'
/**
 * @class Edge
 *
 * A edge connects two nodes
 * @param {Object} properties     Object with options. Must contain
 *                                At least options from and to.
 *                                Available options: from (number),
 *                                to (number), label (string, color (string),
 *                                width (number), style (string),
 *                                length (number), title (string)
 * @param {Network} network       A Network object, used to find and edge to
 *                                nodes.
 * @param {Object} constants      An object with default values for
 *                                example for the color
 */
class Edge {
  constructor(options, body, globalOptions) {
    if (body === undefined) {
      throw "No body provided";
    }
    this.options = util.bridgeObject(globalOptions);
    this.body = body;

    // initialize variables
    this.id = undefined;
    this.fromId = undefined;
    this.toId = undefined;
    this.value = undefined;
    this.selected = false;
    this.hover = false;
    this.labelDirty = true;
    this.colorDirty = true;

    this.from = undefined; // a node
    this.to   = undefined; // a node

    this.edgeType = undefined;

    this.connected = false;

    this.labelModule = new Label(this.body, this.options);

    this.setOptions(options);

    this.controlNodesEnabled = false;
    this.controlNodes = {from: undefined, to: undefined, positions: {}};
    this.connectedNode = undefined;
  }


  /**
   * Set or overwrite options for the edge
   * @param {Object} options  an object with options
   * @param doNotEmit
   */
  setOptions(options) {
    if (!options) {
      return;
    }
    this.colorDirty = true;

    var fields = [
      'id',
      'font',
      'from',
      'hidden',
      'hoverWidth',
      'label',
      'length',
      'line',
      'opacity',
      'physics',
      'scaling',
      'selfReferenceSize',
      'to',
      'title',
      'value',
      'width',
      'widthMin',
      'widthMax',
      'widthSelectionMultiplier'
    ];
    util.selectiveDeepExtend(fields, this.options, options);
    
    util.mergeOptions(this.options, options, 'smooth');
    util.mergeOptions(this.options, options, 'dashes');

    if (options.id !== undefined)   {this.id = options.id;}
    if (options.from !== undefined) {this.fromId = options.from;}
    if (options.to !== undefined)   {this.toId = options.to;}
    if (options.title !== undefined) {this.title = options.title;}
    if (options.value !== undefined) {this.value = options.value;}

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

    // A node is connected when it has a from and to node that both exist in the network.body.nodes.
    this.connect();

    this.labelModule.setOptions(this.options);

    let dataChanged = this.updateEdgeType();
    return dataChanged;
  }

  updateEdgeType() {
    let dataChanged = false;
    let changeInType = true;
    if (this.edgeType !== undefined) {
      if (this.edgeType instanceof BezierEdgeDynamic && this.options.smooth.enabled == true && this.options.smooth.dynamic == true) {changeInType = false;}
      if (this.edgeType instanceof BezierEdgeStatic  && this.options.smooth.enabled == true && this.options.smooth.dynamic == false){changeInType = false;}
      if (this.edgeType instanceof StraightEdge      && this.options.smooth.enabled == false)                                       {changeInType = false;}

      if (changeInType == true) {
        dataChanged = this.edgeType.cleanup();
      }
    }

    if (changeInType === true) {
      if (this.options.smooth.enabled === true) {
        if (this.options.smooth.dynamic === true) {
          dataChanged = true;
          this.edgeType = new BezierEdgeDynamic(this.options, this.body, this.labelModule);
        }
        else {
          this.edgeType = new BezierEdgeStatic(this.options, this.body, this.labelModule);
        }
      }
      else {
        this.edgeType = new StraightEdge(this.options, this.body, this.labelModule);
      }
    }
    else {
      // if nothing changes, we just set the options.
      this.edgeType.setOptions(this.options);
    }

    return dataChanged;
  }


  /**
   * Enable or disable the physics.
   * @param status
   */
  togglePhysics(status) {
    if (this.options.smooth.enabled == true && this.options.smooth.dynamic == true) {
      if (this.via === undefined) {
        this.via.pptions.physics = status;
      }
    }
    this.options.physics = status;
  }

  /**
   * Connect an edge to its nodes
   */
  connect() {
    this.disconnect();

    this.from = this.body.nodes[this.fromId] || undefined;
    this.to = this.body.nodes[this.toId] || undefined;
    this.connected = (this.from !== undefined && this.to !== undefined);

    if (this.connected === true) {
      this.from.attachEdge(this);
      this.to.attachEdge(this);
    }
    else {
      if (this.from) {
        this.from.detachEdge(this);
      }
      if (this.to) {
        this.to.detachEdge(this);
      }
    }
  }


  /**
   * Disconnect an edge from its nodes
   */
  disconnect() {
    if (this.from) {
      this.from.detachEdge(this);
      this.from = undefined;
    }
    if (this.to) {
      this.to.detachEdge(this);
      this.to = undefined;
    }

    this.connected = false;
  }


  /**
   * get the title of this edge.
   * @return {string} title    The title of the edge, or undefined when no title
   *                           has been set.
   */
  getTitle() {
    return typeof this.title === "function" ? this.title() : this.title;
  }


  /**
   * check if this node is selecte
   * @return {boolean} selected   True if node is selected, else false
   */
  isSelected() {
    return this.selected;
  }



  /**
   * Retrieve the value of the edge. Can be undefined
   * @return {Number} value
   */
  getValue() {
    return this.value;
  }


  /**
   * Adjust the value range of the edge. The edge will adjust it's width
   * based on its value.
   * @param {Number} min
   * @param {Number} max
   * @param total
   */
  setValueRange(min, max, total) {
    if (this.value !== undefined) {
      var scale = this.options.scaling.customScalingFunction(min, max, total, this.value);
      var widthDiff = this.options.scaling.max - this.options.scaling.min;
      if (this.options.scaling.label.enabled == true) {
        var fontDiff = this.options.scaling.label.max - this.options.scaling.label.min;
        this.options.font.size = this.options.scaling.label.min + scale * fontDiff;
      }
      this.options.width = this.options.scaling.min + scale * widthDiff;
    }
  }


  /**
   * Redraw a edge
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  draw(ctx) {
    let via = this.edgeType.drawLine(ctx, this.selected, this.hover);
    this.drawArrows(ctx, via);
    this.drawLabel (ctx, via);
  }

  drawArrows(ctx, viaNode) {
    if (this.options.arrows.from.enabled   === true) {this.edgeType.drawArrowHead(ctx,'from',   viaNode, this.selected, this.hover);}
    if (this.options.arrows.middle.enabled === true) {this.edgeType.drawArrowHead(ctx,'middle', viaNode, this.selected, this.hover);}
    if (this.options.arrows.to.enabled     === true) {this.edgeType.drawArrowHead(ctx,'to',     viaNode, this.selected, this.hover);}
  }

  drawLabel(ctx, viaNode) {
    if (this.options.label !== undefined) {
      // set style
      var node1 = this.from;
      var node2 = this.to;
      var selected = (this.from.selected || this.to.selected || this.selected);
      if (node1.id != node2.id) {
        var point = this.edgeType.getPoint(0.5, viaNode);
        ctx.save();

        // if the label has to be rotated:
        if (this.options.font.align !== "horizontal") {
          this.labelModule.calculateLabelSize(ctx,selected,point.x,point.y);
          ctx.translate(point.x, this.labelModule.size.yLine);
          this._rotateForLabelAlignment(ctx);
        }

        // draw the label
        this.labelModule.draw(ctx, point.x, point.y, selected);
        ctx.restore();
      }
      else {
        var x, y;
        var radius = this.options.selfReferenceSize;
        if (node1.width > node1.height) {
          x = node1.x + node1.width * 0.5;
          y = node1.y - radius;
        }
        else {
          x = node1.x + radius;
          y = node1.y - node1.height * 0.5;
        }
        point = this._pointOnCircle(x, y, radius, 0.125);

        this.labelModule.draw(ctx, point.x, point.y, selected);
      }
    }
  }


  /**
   * Check if this object is overlapping with the provided object
   * @param {Object} obj   an object with parameters left, top
   * @return {boolean}     True if location is located on the edge
   */
  isOverlappingWith(obj) {
    if (this.connected) {
      var distMax = 10;
      var xFrom = this.from.x;
      var yFrom = this.from.y;
      var xTo = this.to.x;
      var yTo = this.to.y;
      var xObj = obj.left;
      var yObj = obj.top;

      var dist = this.edgeType.getDistanceToEdge(xFrom, yFrom, xTo, yTo, xObj, yObj);

      return (dist < distMax);
    }
    else {
      return false
    }
  }


  /**
   * Rotates the canvas so the text is most readable
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _rotateForLabelAlignment(ctx) {
    var dy = this.from.y - this.to.y;
    var dx = this.from.x - this.to.x;
    var angleInDegrees = Math.atan2(dy, dx);

    // rotate so label it is readable
    if ((angleInDegrees < -1 && dx < 0) || (angleInDegrees > 0 && dx < 0)) {
      angleInDegrees = angleInDegrees + Math.PI;
    }

    ctx.rotate(angleInDegrees);
  }


  /**
   * Get a point on a circle
   * @param {Number} x
   * @param {Number} y
   * @param {Number} radius
   * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
   * @return {Object} point
   * @private
   */
  _pointOnCircle(x, y, radius, percentage) {
    var angle = percentage * 2 * Math.PI;
    return {
      x: x + radius * Math.cos(angle),
      y: y - radius * Math.sin(angle)
    }
  }


  select() {
    this.selected = true;
  }


  unselect() {
    this.selected = false;
  }
}

export default Edge;