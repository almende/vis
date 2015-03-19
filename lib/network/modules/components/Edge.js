var util = require('../../../util');


import Label from './unified/label.js'
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
    this.title = undefined;
    this.widthSelected = this.options.width * this.options.widthSelectionMultiplier;
    this.value = undefined;
    this.selected = false;
    this.hover = false;
    this.labelDirty = true;
    this.colorDirty = true;

    this.from = undefined; // a node
    this.to   = undefined; // a node
    this.via  = undefined; // a temp node

    this.fromBackup = undefined; // used to clean up after reconnect (used for manipulation)
    this.toBackup   = undefined; // used to clean up after reconnect  (used for manipulation)

    // we use this to be able to reconnect the edge to a cluster if its node is put into a cluster
    // by storing the original information we can revert to the original connection when the cluser is opened.
    this.fromArray = [];
    this.toArray   = [];

    this.connected = false;

    this.labelModule = new Label(this.body, this.options);

    this.setOptions(options, true);

    this.controlNodesEnabled = false;
    this.controlNodes = {from: undefined, to: undefined, positions: {}};
    this.connectedNode = undefined;
  }


  /**
   * Set or overwrite options for the edge
   * @param {Object} options  an object with options
   * @param doNotEmit
   */
  setOptions(options, doNotEmit = false) {
    if (!options) {
      return;
    }
    this.colorDirty = true;

    var fields = [
      'id',
      'font',
      'hidden',
      'hoverWidth',
      'label',
      'length',
      'line',
      'opacity',
      'physics',
      'scaling',
      'selfReferenceSize',
      'value',
      'width',
      'widthMin',
      'widthMax',
      'widthSelectionMultiplier'
    ];
    util.selectiveDeepExtend(fields, this.options, options);
    
    util.mergeOptions(this.options, options, 'smooth');
    util.mergeOptions(this.options, options, 'dashes');

    if (options.arrows !== undefined) {
      util.mergeOptions(this.options.arrows, options.arrows, 'to');
      util.mergeOptions(this.options.arrows, options.arrows, 'middle');
      util.mergeOptions(this.options.arrows, options.arrows, 'from');
    }

    if (options.id !== undefined)   {this.id = options.id;}
    if (options.from !== undefined) {this.fromId = options.from;}
    if (options.to !== undefined)   {this.toId = options.to;}
    if (options.title !== undefined) {this.title = options.title;}
    if (options.value !== undefined) {this.value = options.value;}

    if (options.color !== undefined) {
      if (util.isString(options.color)) {
        this.options.color.color = options.color;
        this.options.color.highlight = options.color;
      }
      else {
        if (options.color.color !== undefined) {
          this.options.color.color = options.color.color;
        }
        if (options.color.highlight !== undefined) {
          this.options.color.highlight = options.color.highlight;
        }
        if (options.color.hover !== undefined) {
          this.options.color.hover = options.color.hover;
        }
      }

      // inherit colors
      if (options.color.inherit === undefined) {
        this.options.color.inherit.enabled = false;
      }
      else {
        util.mergeOptions(this.options.color, options.color, 'inherit');
      }
    }

    // A node is connected when it has a from and to node that both exist in the network.body.nodes.
    this.connect();

    this.widthSelected = this.options.width * this.options.widthSelectionMultiplier;

    this.setupSmoothEdges(doNotEmit);

    this.labelModule.setOptions(this.options);
  }


  /**
   * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
   * are used for the force calculation.
   *
   * @private
   */
  setupSmoothEdges(doNotEmit = false) {
    var changedData = false;
    if (this.options.smooth.enabled == true && this.options.smooth.dynamic == true) {
      if (this.via === undefined) {
        changedData = true;
        var nodeId = "edgeId:" + this.id;
        var node = this.body.functions.createNode({
            id: nodeId,
            mass: 1,
            shape: 'circle',
            image: "",
            physics:true,
            hidden:true
        });
        this.body.nodes[nodeId] = node;
        this.via = node;
        this.via.parentEdgeId = this.id;
        this.positionBezierNode();
      }
    }
    else {
      if (this.via !== undefined) {
        delete this.body.nodes[this.via.id];
        this.via = undefined;
        changedData = true;
      }
    }

    // node has been added or deleted
    if (changedData === true && doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
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
    let via = this.drawLine(ctx);
    this.drawArrows(ctx, via);
    this.drawLabel (ctx, via);
  }

  drawLine(ctx) {
    if (this.options.dashes.enabled === false) {
      return this._drawLine(ctx);
    }
    else {
      return this._drawDashLine(ctx);
    }
  }

  drawArrows(ctx, viaNode) {
    if (this.options.arrows.from.enabled === true)    {this._drawArrowHead(ctx,'from', viaNode);}
    if (this.options.arrows.middle.enabled === true)  {this._drawArrowHead(ctx,'middle', viaNode);}
    if (this.options.arrows.to.enabled === true)      {this._drawArrowHead(ctx,'to', viaNode);}


  }

  drawLabel(ctx, viaNode) {
    if (this.options.label !== undefined) {
      // set style
      var node1 = this.from;
      var node2 = this.to;
      var selected = (this.from.selected || this.to.selected || this.selected);
      if (node1.id != node2.id) {
        var point = this._pointOnEdge(0.5, viaNode);
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

      var dist = this._getDistanceToEdge(xFrom, yFrom, xTo, yTo, xObj, yObj);

      return (dist < distMax);
    }
    else {
      return false
    }
  }


  _getColor(ctx) {
    var colorObj = this.options.color;

    if (colorObj.inherit.enabled === true) {
      if (colorObj.inherit.useGradients == true) {
        var grd = ctx.createLinearGradient(this.from.x, this.from.y, this.to.x, this.to.y);
        var fromColor, toColor;
        fromColor = this.from.options.color.highlight.border;
        toColor = this.to.options.color.highlight.border;

        if (this.from.selected == false && this.to.selected == false) {
          fromColor = util.overrideOpacity(this.from.options.color.border, this.options.color.opacity);
          toColor = util.overrideOpacity(this.to.options.color.border, this.options.color.opacity);
        }
        else if (this.from.selected == true && this.to.selected == false) {
          toColor = this.to.options.color.border;
        }
        else if (this.from.selected == false && this.to.selected == true) {
          fromColor = this.from.options.color.border;
        }
        grd.addColorStop(0, fromColor);
        grd.addColorStop(1, toColor);

        // -------------------- this returns -------------------- //
        return grd;
      }

      if (this.colorDirty === true) {
        if (colorObj.inherit.source == "to") {
          colorObj.highlight = this.to.options.color.highlight.border;
          colorObj.hover = this.to.options.color.hover.border;
          colorObj.color = util.overrideOpacity(this.to.options.color.border, this.options.color.opacity);
        }
        else { // (this.options.color.inherit.source == "from") {
          colorObj.highlight = this.from.options.color.highlight.border;
          colorObj.hover = this.from.options.color.hover.border;
          colorObj.color = util.overrideOpacity(this.from.options.color.border, this.options.color.opacity);
        }
      }
    }

    // if color inherit is on and gradients are used, the function has already returned by now.
    this.colorDirty = false;

    if (this.selected == true) {
      return colorObj.highlight;
    }
    else if (this.hover == true) {
      return colorObj.hover;
    }
    else {
      return colorObj.color;
    }
  }



  /**
   * Redraw a edge as a line
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  _drawLine(ctx) {
    // set style
    ctx.strokeStyle = this._getColor(ctx);
    ctx.lineWidth = this._getLineWidth();
    var via;

    if (this.from != this.to) {
      // draw line
      via = this._line(ctx);
    }
    else {
      var x, y;
      var radius = this.options.selfReferenceSize;
      var node = this.from;
      if (!node.width) {
        node.resize(ctx);
      }
      if (node.width > node.height) {
        x = node.x + node.width * 0.5;
        y = node.y - radius;
      }
      else {
        x = node.x + radius;
        y = node.y - node.height * 0.5;
      }
      this._circle(ctx, x, y, radius);
    }

    return via;
  }


  /**
   * Get the line width of the edge. Depends on width and whether one of the
   * connected nodes is selected.
   * @return {Number} width
   * @private
   */
  _getLineWidth() {
    if (this.selected == true) {
      return Math.max(Math.min(this.widthSelected, this.options.widthMax), 0.3 * this.networkScaleInv);
    }
    else {
      if (this.hover == true) {
        return Math.max(Math.min(this.options.hoverWidth, this.options.widthMax), 0.3 * this.networkScaleInv);
      }
      else {
        return Math.max(this.options.width, 0.3 * this.networkScaleInv);
      }
    }
  }


  _getViaCoordinates() {
    if (this.options.smooth.dynamic == true && this.options.smooth.enabled == true) {
      return this.via;
    }
    else if (this.options.smooth.enabled == false) {
      return {x: 0, y: 0};
    }
    else {
      let xVia = undefined;
      let yVia = undefined;
      let factor = this.options.smooth.roundness;
      let type = this.options.smooth.type;
      let dx = Math.abs(this.from.x - this.to.x);
      let dy = Math.abs(this.from.y - this.to.y);
      if (type == 'discrete' || type == 'diagonalCross') {
        if (Math.abs(this.from.x - this.to.x) < Math.abs(this.from.y - this.to.y)) {
          if (this.from.y > this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dy;
              yVia = this.from.y - factor * dy;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dy;
              yVia = this.from.y - factor * dy;
            }
          }
          else if (this.from.y < this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dy;
              yVia = this.from.y + factor * dy;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dy;
              yVia = this.from.y + factor * dy;
            }
          }
          if (type == "discrete") {
            xVia = dx < factor * dy ? this.from.x : xVia;
          }
        }
        else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) {
          if (this.from.y > this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dx;
              yVia = this.from.y - factor * dx;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dx;
              yVia = this.from.y - factor * dx;
            }
          }
          else if (this.from.y < this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dx;
              yVia = this.from.y + factor * dx;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dx;
              yVia = this.from.y + factor * dx;
            }
          }
          if (type == "discrete") {
            yVia = dy < factor * dx ? this.from.y : yVia;
          }
        }
      }
      else if (type == "straightCross") {
        if (Math.abs(this.from.x - this.to.x) < Math.abs(this.from.y - this.to.y)) {  // up - down
          xVia = this.from.x;
          if (this.from.y < this.to.y) {
            yVia = this.to.y - (1 - factor) * dy;
          }
          else {
            yVia = this.to.y + (1 - factor) * dy;
          }
        }
        else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) { // left - right
          if (this.from.x < this.to.x) {
            xVia = this.to.x - (1 - factor) * dx;
          }
          else {
            xVia = this.to.x + (1 - factor) * dx;
          }
          yVia = this.from.y;
        }
      }
      else if (type == 'horizontal') {
        if (this.from.x < this.to.x) {
          xVia = this.to.x - (1 - factor) * dx;
        }
        else {
          xVia = this.to.x + (1 - factor) * dx;
        }
        yVia = this.from.y;
      }
      else if (type == 'vertical') {
        xVia = this.from.x;
        if (this.from.y < this.to.y) {
          yVia = this.to.y - (1 - factor) * dy;
        }
        else {
          yVia = this.to.y + (1 - factor) * dy;
        }
      }
      else if (type == 'curvedCW') {
        dx = this.to.x - this.from.x;
        dy = this.from.y - this.to.y;
        let radius = Math.sqrt(dx * dx + dy * dy);
        let pi = Math.PI;

        let originalAngle = Math.atan2(dy, dx);
        let myAngle = (originalAngle + ((factor * 0.5) + 0.5) * pi) % (2 * pi);

        xVia = this.from.x + (factor * 0.5 + 0.5) * radius * Math.sin(myAngle);
        yVia = this.from.y + (factor * 0.5 + 0.5) * radius * Math.cos(myAngle);
      }
      else if (type == 'curvedCCW') {
        dx = this.to.x - this.from.x;
        dy = this.from.y - this.to.y;
        let radius = Math.sqrt(dx * dx + dy * dy);
        let pi = Math.PI;

        let originalAngle = Math.atan2(dy, dx);
        let myAngle = (originalAngle + ((-factor * 0.5) + 0.5) * pi) % (2 * pi);

        xVia = this.from.x + (factor * 0.5 + 0.5) * radius * Math.sin(myAngle);
        yVia = this.from.y + (factor * 0.5 + 0.5) * radius * Math.cos(myAngle);
      }
      else { // continuous
        if (Math.abs(this.from.x - this.to.x) < Math.abs(this.from.y - this.to.y)) {
          if (this.from.y > this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dy;
              yVia = this.from.y - factor * dy;
              xVia = this.to.x < xVia ? this.to.x : xVia;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dy;
              yVia = this.from.y - factor * dy;
              xVia = this.to.x > xVia ? this.to.x : xVia;
            }
          }
          else if (this.from.y < this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dy;
              yVia = this.from.y + factor * dy;
              xVia = this.to.x < xVia ? this.to.x : xVia;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dy;
              yVia = this.from.y + factor * dy;
              xVia = this.to.x > xVia ? this.to.x : xVia;
            }
          }
        }
        else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) {
          if (this.from.y > this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dx;
              yVia = this.from.y - factor * dx;
              yVia = this.to.y > yVia ? this.to.y : yVia;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dx;
              yVia = this.from.y - factor * dx;
              yVia = this.to.y > yVia ? this.to.y : yVia;
            }
          }
          else if (this.from.y < this.to.y) {
            if (this.from.x < this.to.x) {
              xVia = this.from.x + factor * dx;
              yVia = this.from.y + factor * dx;
              yVia = this.to.y < yVia ? this.to.y : yVia;
            }
            else if (this.from.x > this.to.x) {
              xVia = this.from.x - factor * dx;
              yVia = this.from.y + factor * dx;
              yVia = this.to.y < yVia ? this.to.y : yVia;
            }
          }
        }
      }


      return {x: xVia, y: yVia};
    }
  }


  /**
   * Draw a line between two nodes
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _line(ctx) {
    // draw a straight line
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    if (this.options.smooth.enabled == true) {
      if (this.options.smooth.dynamic == false) {
        var via = this._getViaCoordinates();
        if (via.x === undefined) {
          ctx.lineTo(this.to.x, this.to.y);
          ctx.stroke();
          return undefined;
        }
        else {
//        this.via.x = via.x;
//        this.via.y = via.y;
          ctx.quadraticCurveTo(via.x, via.y, this.to.x, this.to.y);
          ctx.stroke();
          //ctx.circle(via.x,via.y,2)
          //ctx.stroke();
          return via;
        }
      }
      else {
        ctx.quadraticCurveTo(this.via.x, this.via.y, this.to.x, this.to.y);
        ctx.stroke();
        return this.via;
      }
    }
    else {
      ctx.lineTo(this.to.x, this.to.y);
      ctx.stroke();
      return undefined;
    }
  }


  /**
   * Draw a line from a node to itself, a circle
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x
   * @param {Number} y
   * @param {Number} radius
   * @private
   */
  _circle(ctx, x, y, radius) {
    // draw a circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();
  }


  /**
   * Draw label with white background and with the middle at (x, y)
   * @param {CanvasRenderingContext2D} ctx
   * @param {String} text
   * @param {Number} x
   * @param {Number} y
   * @private
   */



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
   * Redraw a edge as a dashes line
   * Draw this edge in the given canvas
   * @author David Jordan
   * @date 2012-08-08
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  _drawDashLine(ctx) {
    // set style
    ctx.strokeStyle = this._getColor(ctx);
    ctx.lineWidth = this._getLineWidth();

    var via = undefined;
    // only firefox and chrome support this method, else we use the legacy one.
    if (ctx.setLineDash !== undefined) {
      ctx.save();
      // configure the dash pattern
      var pattern = [0];
      if (this.options.dashes.length !== undefined && this.options.dashes.gap !== undefined) {
        pattern = [this.options.dashes.length, this.options.dashes.gap];
      }
      else {
        pattern = [5, 5];
      }

      // set dash settings for chrome or firefox
      ctx.setLineDash(pattern);
      ctx.lineDashOffset = 0;

      // draw the line
      via = this._line(ctx);

      // restore the dash settings.
      ctx.setLineDash([0]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
    else { // unsupporting smooth lines
      // draw dashes line
      ctx.beginPath();
      ctx.lineCap = 'round';
      if (this.options.dashes.altLength !== undefined) //If an alt dash value has been set add to the array this value
      {
        ctx.dashesLine(this.from.x, this.from.y, this.to.x, this.to.y,
          [this.options.dashes.length, this.options.dashes.gap, this.options.dashes.altLength, this.options.dashes.gap]);
      }
      else if (this.options.dashes.length !== undefined && this.options.dashes.gap !== undefined) //If a dash and gap value has been set add to the array this value
      {
        ctx.dashesLine(this.from.x, this.from.y, this.to.x, this.to.y,
          [this.options.dashes.length, this.options.dashes.gap]);
      }
      else //If all else fails draw a line
      {
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
      }
      ctx.stroke();
    }

    return via;
  }


  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   * @param percentage
   * @param via
   * @returns {{x: number, y: number}}
   * @private
   */
  _pointOnEdge(percentage, via = this._getViaCoordinates()) {
    if (this.options.smooth.enabled == false) {
      return {
        x: (1 - percentage) * this.from.x + percentage * this.to.x,
        y: (1 - percentage) * this.from.y + percentage * this.to.y
      }
    }
    else {
      var t = percentage;
      var x = Math.pow(1 - t, 2) * this.from.x + (2 * t * (1 - t)) * via.x + Math.pow(t, 2) * this.to.x;
      var y = Math.pow(1 - t, 2) * this.from.y + (2 * t * (1 - t)) * via.y + Math.pow(t, 2) * this.to.y;

      return {x: x, y: y};
    }
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

  /**
   * This function uses binary search to look for the point where the bezier curve crosses the border of the node.
   *
   * @param nearNode
   * @param ctx
   * @param viaNode
   * @param nearNode
   * @param ctx
   * @param viaNode
   * @param nearNode
   * @param ctx
   * @param viaNode
   */
  _findBorderPositionBezier(nearNode, ctx, viaNode = this._getViaCoordinates()) {
    var maxIterations = 10;
    var iteration = 0;
    var low = 0;
    var high = 1;
    var pos, angle, distanceToBorder, distanceToPoint, difference;
    var threshold = 0.2;
    var node = this.to;
    var from = false;
    if (nearNode.id === this.from.id) {
      node = this.from;
      from = true;
    }

    while (low <= high && iteration < maxIterations) {
      var middle = (low + high) * 0.5;

      pos = this._pointOnEdge(middle, viaNode);
      angle = Math.atan2((node.y - pos.y), (node.x - pos.x));
      distanceToBorder = node.distanceToBorder(ctx, angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }
      else if (difference < 0) { // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
        if (from == false) {
          low = middle;
        }
        else {
          high = middle;
        }
      }
      else {
        if (from == false) {
          high = middle;
        }
        else {
          low = middle;
        }
      }

      iteration++;
    }
    pos.t = middle;

    return pos;
  }


  /**
   * This function uses binary search to look for the point where the circle crosses the border of the node.
   * @param x
   * @param y
   * @param radius
   * @param node
   * @param low
   * @param high
   * @param direction
   * @param ctx
   * @returns {*}
   * @private
   */
  _findBorderPositionCircle(x,y,radius,node,low,high,direction,ctx) {
    var maxIterations = 10;
    var iteration = 0;
    var pos, angle, distanceToBorder, distanceToPoint, difference;
    var threshold = 0.05;

    while (low <= high && iteration < maxIterations) {
      var middle = (low + high) * 0.5;

      pos = this._pointOnCircle(x,y,radius,middle);
      angle = Math.atan2((node.y - pos.y), (node.x - pos.x));
      distanceToBorder = node.distanceToBorder(ctx, angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }
      else if (difference > 0) { // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
        if (direction > 0) {
          low = middle;
        }
        else {
          high = middle;
        }
      }
      else {
        if (direction > 0) {
          high = middle;
        }
        else {
          low = middle;
        }
      }
      iteration++;
    }
    pos.t = middle;

    return pos;
  }

  /**
   *
   * @param ctx
   * @param position
   * @param viaNode
   */
  _drawArrowHead(ctx,position,viaNode) {
    // set style
    ctx.strokeStyle = this._getColor(ctx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = this._getLineWidth();

    // set vars
    var angle;
    var length;
    var arrowPos;
    var node1;
    var node2;
    var guideOffset;
    var scaleFactor;

    if (position == 'from') {
      node1 = this.from;
      node2 = this.to;
      guideOffset = 0.1;
      scaleFactor = this.options.arrows.from.scaleFactor;
    }
    else if (position == 'to') {
      node1 = this.to;
      node2 = this.from;
      guideOffset = -0.1;
      scaleFactor = this.options.arrows.to.scaleFactor;
    }
    else {
      node1 = this.to;
      node2 = this.from;
      scaleFactor = this.options.arrows.middle.scaleFactor;
    }

    // if not connected to itself
    if (node1 != node2) {
      if (position !== 'middle') {
        // draw arrow head
        if (this.options.smooth.enabled == true) {
          arrowPos = this._findBorderPositionBezier(node1, ctx, viaNode);
          var guidePos = this._pointOnEdge(Math.max(0.0,Math.min(1.0,arrowPos.t + guideOffset)), viaNode);
          angle = Math.atan2((arrowPos.y - guidePos.y), (arrowPos.x - guidePos.x));
        }
        else {
          angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
          var dx = (node1.x - node2.x);
          var dy = (node1.y - node2.y);
          var edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
          var toBorderDist = this.to.distanceToBorder(ctx, angle);
          var toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

          arrowPos = {};
          arrowPos.x = (1 - toBorderPoint) * node2.x + toBorderPoint * node1.x;
          arrowPos.y = (1 - toBorderPoint) * node2.y + toBorderPoint * node1.y;
        }
      }
      else {
        angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
        arrowPos = this._pointOnEdge(0.6, viaNode); // this is 0.6 to account for the size of the arrow.
      }
      // draw arrow at the end of the line
      length = (10 + 5 * this.options.width) * scaleFactor;
      ctx.arrow(arrowPos.x, arrowPos.y, angle, length);
      ctx.fill();
      ctx.stroke();
    }
    else {
      // draw circle
      var angle, point;
      var x, y;
      var radius = this.options.selfReferenceSize;
      if (!node1.width) {
        node1.resize(ctx);
      }

      // get circle coordinates
      if (node1.width > node1.height) {
        x = node1.x + node1.width * 0.5;
        y = node1.y - radius;
      }
      else {
        x = node1.x + radius;
        y = node1.y - node1.height * 0.5;
      }


      if (position == 'from') {
        point = this._findBorderPositionCircle(x, y, radius, node1, 0.25, 0.6, -1, ctx);
        angle = point.t * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }
      else if (position == 'to') {
        point = this._findBorderPositionCircle(x, y, radius, node1, 0.6, 0.8, 1, ctx);
        angle = point.t * -2 * Math.PI + 1.5 * Math.PI - 1.1 * Math.PI;
      }
      else {
        point = this._pointOnCircle(x,y,radius,0.175);
        angle = 3.9269908169872414; // == 0.175 * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }

      // draw the arrowhead
      var length = (10 + 5 * this.options.width) * scaleFactor;
      ctx.arrow(point.x, point.y, angle, length);
      ctx.fill();
      ctx.stroke();
    }
  }


  /**
   * Calculate the distance between a point (x3,y3) and a line segment from
   * (x1,y1) to (x2,y2).
   * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @private
   */
  _getDistanceToEdge(x1, y1, x2, y2, x3, y3) { // x3,y3 is the point
    var returnValue = 0;
    if (this.from != this.to) {
      if (this.options.smooth.enabled == true) {
        var xVia, yVia;
        if (this.options.smooth.enabled == true && this.options.smooth.dynamic == true) {
          xVia = this.via.x;
          yVia = this.via.y;
        }
        else {
          var via = this._getViaCoordinates();
          xVia = via.x;
          yVia = via.y;
        }
        var minDistance = 1e9;
        var distance;
        var i, t, x, y;
        var lastX = x1;
        var lastY = y1;
        for (i = 1; i < 10; i++) {
          t = 0.1 * i;
          x = Math.pow(1 - t, 2) * x1 + (2 * t * (1 - t)) * xVia + Math.pow(t, 2) * x2;
          y = Math.pow(1 - t, 2) * y1 + (2 * t * (1 - t)) * yVia + Math.pow(t, 2) * y2;
          if (i > 0) {
            distance = this._getDistanceToLine(lastX, lastY, x, y, x3, y3);
            minDistance = distance < minDistance ? distance : minDistance;
          }
          lastX = x;
          lastY = y;
        }
        returnValue = minDistance;
      }
      else {
        returnValue = this._getDistanceToLine(x1, y1, x2, y2, x3, y3);
      }
    }
    else {
      var x, y, dx, dy;
      var radius = this.options.selfReferenceSize;
      var node = this.from;
      if (node.width > node.height) {
        x = node.x + 0.5 * node.width;
        y = node.y - radius;
      }
      else {
        x = node.x + radius;
        y = node.y - 0.5 * node.height;
      }
      dx = x - x3;
      dy = y - y3;
      returnValue = Math.abs(Math.sqrt(dx * dx + dy * dy) - radius);
    }

    if (this.labelModule.size.left < x3 &&
      this.labelModule.size.left + this.labelModule.size.width > x3 &&
      this.labelModule.size.top < y3 &&
      this.labelModule.size.top + this.labelModule.size.height > y3) {
      return 0;
    }
    else {
      return returnValue;
    }
  }

  _getDistanceToLine(x1, y1, x2, y2, x3, y3) {
    var px = x2 - x1;
    var py = y2 - y1;
    var something = px * px + py * py;
    var u = ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
      u = 1;
    }
    else if (u < 0) {
      u = 0;
    }

    var x = x1 + u * px;
    var y = y1 + u * py;
    var dx = x - x3;
    var dy = y - y3;

    //# Note: If the actual distance does not matter,
    //# if you only want to compare what this function
    //# returns to other results of this function, you
    //# can just return the squared distance instead
    //# (i.e. remove the sqrt) to gain a little performance

    return Math.sqrt(dx * dx + dy * dy);
  }


  /**
   * This allows the zoom level of the network to influence the rendering
   *
   * @param scale
   */
  setScale(scale) {
    this.networkScaleInv = 1.0 / scale;
  }

  select() {
    this.selected = true;
  }


  unselect() {
    this.selected = false;
  }

  positionBezierNode() {
    if (this.via !== undefined && this.from !== undefined && this.to !== undefined) {
      this.via.x = 0.5 * (this.from.x + this.to.x);
      this.via.y = 0.5 * (this.from.y + this.to.y);
    }
    else if (this.via !== undefined) {
      this.via.x = 0;
      this.via.y = 0;
    }
  }



































  //*************************************************************************************************//
  //*************************************************************************************************//
  //*************************************************************************************************//
  //*************************************************************************************************//
  //*********************** MOVE THESE FUNCTIONS TO THE MANIPULATION SYSTEM ************************//
  //*************************************************************************************************//
  //*************************************************************************************************//
  //*************************************************************************************************//
  //*************************************************************************************************//







  /**
   * This function draws the control nodes for the manipulator.
   * In order to enable this, only set the this.controlNodesEnabled to true.
   * @param ctx
   */
  _drawControlNodes(ctx) {
    if (this.controlNodesEnabled == true) {
      if (this.controlNodes.from === undefined && this.controlNodes.to === undefined) {
        var nodeIdFrom = "edgeIdFrom:".concat(this.id);
        var nodeIdTo = "edgeIdTo:".concat(this.id);
        var nodeFromOptions = {
          id: nodeIdFrom,
          shape: 'dot',
          color: {background: '#ff0000', border: '#3c3c3c', highlight: {background: '#07f968'}},
          radius: 7,
          borderWidth: 2,
          borderWidthSelected: 2,
          hidden: false,
          physics: false
        };
        var nodeToOptions = util.deepExtend({},nodeFromOptions);
        nodeToOptions.id = nodeIdTo;

        
        this.controlNodes.from = this.body.functions.createNode(nodeFromOptions);
        this.controlNodes.to = this.body.functions.createNode(nodeToOptions);
      }

      this.controlNodes.positions = {};
      if (this.controlNodes.from.selected == false) {
        this.controlNodes.positions.from = this.getControlNodeFromPosition(ctx);
        this.controlNodes.from.x = this.controlNodes.positions.from.x;
        this.controlNodes.from.y = this.controlNodes.positions.from.y;
      }
      if (this.controlNodes.to.selected == false) {
        this.controlNodes.positions.to = this.getControlNodeToPosition(ctx);
        this.controlNodes.to.x = this.controlNodes.positions.to.x;
        this.controlNodes.to.y = this.controlNodes.positions.to.y;
      }

      this.controlNodes.from.draw(ctx);
      this.controlNodes.to.draw(ctx);
    }
    else {
      this.controlNodes = {from: undefined, to: undefined, positions: {}};
    }
  }

  /**
   * Enable control nodes.
   * @private
   */
  _enableControlNodes() {
    this.fromBackup = this.from;
    this.toBackup = this.to;
    this.controlNodesEnabled = true;
  }


  /**
   * disable control nodes and remove from dynamicEdges from old node
   * @private
   */
  _disableControlNodes() {
    this.fromId = this.from.id;
    this.toId = this.to.id;
    if (this.fromId != this.fromBackup.id) { // from was changed, remove edge from old 'from' node dynamic edges
      this.fromBackup.detachEdge(this);
    }
    else if (this.toId != this.toBackup.id) { // to was changed, remove edge from old 'to' node dynamic edges
      this.toBackup.detachEdge(this);
    }

    this.fromBackup = undefined;
    this.toBackup = undefined;
    this.controlNodesEnabled = false;
  }


  /**
   * This checks if one of the control nodes is selected and if so, returns the control node object. Else it returns undefined.
   * @param x
   * @param y
   * @returns {undefined}
   * @private
   */
  _getSelectedControlNode(x, y) {
    var positions = this.controlNodes.positions;
    var fromDistance = Math.sqrt(Math.pow(x - positions.from.x, 2) + Math.pow(y - positions.from.y, 2));
    var toDistance = Math.sqrt(Math.pow(x - positions.to.x, 2) + Math.pow(y - positions.to.y, 2));

    if (fromDistance < 15) {
      this.connectedNode = this.from;
      this.from = this.controlNodes.from;
      return this.controlNodes.from;
    }
    else if (toDistance < 15) {
      this.connectedNode = this.to;
      this.to = this.controlNodes.to;
      return this.controlNodes.to;
    }
    else {
      return undefined;
    }
  }



  /**
   * this resets the control nodes to their original position.
   * @private
   */
  _restoreControlNodes() {
    if (this.controlNodes.from.selected == true) {
      this.from = this.connectedNode;
      this.connectedNode = undefined;
      this.controlNodes.from.unselect();
    }
    else if (this.controlNodes.to.selected == true) {
      this.to = this.connectedNode;
      this.connectedNode = undefined;
      this.controlNodes.to.unselect();
    }
  }


  /**
   * this calculates the position of the control nodes on the edges of the parent nodes.
   *
   * @param ctx
   * @returns {x: *, y: *}
   */
  getControlNodeFromPosition(ctx) {
    // draw arrow head
    var controlnodeFromPos;
    if (this.options.smooth.enabled == true) {
      controlnodeFromPos = this._findBorderPositionBezier(true, ctx);
    }
    else {
      var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
      var dx = (this.to.x - this.from.x);
      var dy = (this.to.y - this.from.y);
      var edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);

      var fromBorderDist = this.from.distanceToBorder(ctx, angle + Math.PI);
      var fromBorderPoint = (edgeSegmentLength - fromBorderDist) / edgeSegmentLength;
      controlnodeFromPos = {};
      controlnodeFromPos.x = (fromBorderPoint) * this.from.x + (1 - fromBorderPoint) * this.to.x;
      controlnodeFromPos.y = (fromBorderPoint) * this.from.y + (1 - fromBorderPoint) * this.to.y;
    }

    return controlnodeFromPos;
  }


  /**
   * this calculates the position of the control nodes on the edges of the parent nodes.
   *
   * @param ctx
   * @returns {{from: {x: number, y: number}, to: {x: *, y: *}}}
   */
  getControlNodeToPosition(ctx) {
    // draw arrow head
    var controlnodeToPos;
    if (this.options.smooth.enabled == true) {
      controlnodeToPos = this._findBorderPositionBezier(false, ctx);
    }
    else {
      var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
      var dx = (this.to.x - this.from.x);
      var dy = (this.to.y - this.from.y);
      var edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
      var toBorderDist = this.to.distanceToBorder(ctx, angle);
      var toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

      controlnodeToPos = {};
      controlnodeToPos.x = (1 - toBorderPoint) * this.from.x + toBorderPoint * this.to.x;
      controlnodeToPos.y = (1 - toBorderPoint) * this.from.y + toBorderPoint * this.to.y;
    }

    return controlnodeToPos;
  }
}

export default Edge;