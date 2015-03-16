var util = require('../../../../util');

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

    this.initializing = true;

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
    this.labelDimensions = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
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

    this.widthFixed = false;
    this.lengthFixed = false;

    this.setOptions(options);

    this.controlNodesEnabled = false;
    this.controlNodes = {from: undefined, to: undefined, positions: {}};
    this.connectedNode = undefined;

    this.initializing = false;
  }


  /**
   * Set or overwrite options for the edge
   * @param {Object} options  an object with options
   * @param {Object} constants   and object with default, global options
   */
  setOptions(options) {
    if (!options) {
      return;
    }
    this.colorDirty = true;

    var fields = ['style', 'fontSize', 'fontFace', 'fontColor', 'fontFill', 'fontStrokeWidth', 'fontStrokeColor', 'width',
      'widthSelectionMultiplier', 'hoverWidth', 'arrowScaleFactor', 'dash', 'inheritColor', 'labelAlignment', 'opacity',
      'customScalingFunction', 'useGradients', 'value','smooth'
    ];
    util.selectiveDeepExtend(fields, this.options, options);

    if (options.from !== undefined) {
      this.fromId = options.from;
    }
    if (options.to !== undefined) {
      this.toId = options.to;
    }

    if (options.id !== undefined) {
      this.id = options.id;
    }
    if (options.label !== undefined) {
      this.label = options.label;
      this.labelDirty = true;
    }

    if (options.title !== undefined) {
      this.title = options.title;
    }
    if (options.value !== undefined) {
      this.value = options.value;
    }
    if (options.length !== undefined) {
      this.physics.springLength = options.length;
    }

    if (options.color !== undefined) {
      this.options.inheritColor = false;
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
    }

    util.mergeOptions(this.options, options, 'smooth');

    // A node is connected when it has a from and to node that both exist in the network.body.nodes.
    this.connect();

    this.widthFixed = this.widthFixed || (options.width !== undefined);
    this.lengthFixed = this.lengthFixed || (options.length !== undefined);

    this.widthSelected = this.options.width * this.options.widthSelectionMultiplier;

    this.setupsmooth(this.initializing === false);

    // set draw method based on style
    switch (this.options.style) {
      case 'line':
        this.draw = this._drawLine;
        break;
      case 'arrow':
        this.draw = this._drawArrow;
        break;
      case 'arrow-center':
        this.draw = this._drawArrowCenter;
        break;
      case 'dash-line':
        this.draw = this._drawDashLine;
        break;
      default:
        this.draw = this._drawLine;
        break;
    }
  }


  /**
   * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
   * are used for the force calculation.
   *
   * @private
   */
  setupsmooth(emitChange = true) {
    var changedData = false;
    if (this.options.smooth.enabled == true && this.options.smooth.dynamic == true) {
      if (this.via === undefined) {
        changedData = true;
        var nodeId = "edgeId:" + this.id;
        var node = this.body.functions.createNode({
            id: nodeId,
            mass: 1,
            shape: 'circle',
            image: ""
        });
        this.body.supportNodes[nodeId] = node;
        this.via = node;
        this.via.parentEdgeId = this.id;
        this.positionBezierNode();
      }
    }
    else {
      if (this.via !== undefined) {
        delete this.body.supportNodes[this.via.id];
        this.via = undefined;
        changedData = true;
      }
    }

    // node has been added or deleted
    if (changedData === true && emitChange === true) {
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
   */
  setValueRange(min, max, total) {
    if (!this.widthFixed && this.value !== undefined) {
      var scale = this.options.customScalingFunction(min, max, total, this.value);
      var widthDiff = this.options.widthMax - this.options.widthMin;
      this.options.width = this.options.widthMin + scale * widthDiff;
      this.widthSelected = this.options.width * this.options.widthSelectionMultiplier;
    }
  }


  /**
   * Redraw a edge
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  draw(ctx) {
    throw "Method draw not initialized in edge";
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
    if (this.options.useGradients == true) {
      var grd = ctx.createLinearGradient(this.from.x, this.from.y, this.to.x, this.to.y);
      var fromColor, toColor;
      fromColor = this.from.options.color.highlight.border;
      toColor = this.to.options.color.highlight.border;


      if (this.from.selected == false && this.to.selected == false) {
        fromColor = util.overrideOpacity(this.from.options.color.border, this.options.opacity);
        toColor = util.overrideOpacity(this.to.options.color.border, this.options.opacity);
      }
      else if (this.from.selected == true && this.to.selected == false) {
        toColor = this.to.options.color.border;
      }
      else if (this.from.selected == false && this.to.selected == true) {
        fromColor = this.from.options.color.border;
      }
      grd.addColorStop(0, fromColor);
      grd.addColorStop(1, toColor);
      return grd;
    }

    if (this.colorDirty === true) {

      if (this.options.inheritColor == "to") {
        colorObj = {
          highlight: this.to.options.color.highlight.border,
          hover: this.to.options.color.hover.border,
          color: util.overrideOpacity(this.from.options.color.border, this.options.opacity)
        };
      }
      else if (this.options.inheritColor == "from" || this.options.inheritColor == true) {
        colorObj = {
          highlight: this.from.options.color.highlight.border,
          hover: this.from.options.color.hover.border,
          color: util.overrideOpacity(this.from.options.color.border, this.options.opacity)
        };
      }
      this.options.color = colorObj;
      this.colorDirty = false;
    }


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

    if (this.from != this.to) {
      // draw line
      var via = this._line(ctx);

      // draw label
      var point;
      if (this.label) {
        if (this.options.smooth.enabled == true && via != undefined) {
          var midpointX = 0.5 * (0.5 * (this.from.x + via.x) + 0.5 * (this.to.x + via.x));
          var midpointY = 0.5 * (0.5 * (this.from.y + via.y) + 0.5 * (this.to.y + via.y));
          point = {x: midpointX, y: midpointY};
        }
        else {
          point = this._pointOnLine(0.5);
        }
        this._label(ctx, this.label, point.x, point.y);
      }
    }
    else {
      var x, y;
      var radius = this.physics.springLength / 4;
      var node = this.from;
      if (!node.width) {
        node.resize(ctx);
      }
      if (node.width > node.height) {
        x = node.x + node.width / 2;
        y = node.y - radius;
      }
      else {
        x = node.x + radius;
        y = node.y - node.height / 2;
      }
      this._circle(ctx, x, y, radius);
      point = this._pointOnCircle(x, y, radius, 0.5);
      this._label(ctx, this.label, point.x, point.y);
    }
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
  _label(ctx, text, x, y) {
    if (text) {
      ctx.font = ((this.from.selected || this.to.selected) ? "bold " : "") +
      this.options.fontSize + "px " + this.options.fontFace;
      var yLine;

      if (this.labelDirty == true) {
        var lines = String(text).split('\n');
        var lineCount = lines.length;
        var fontSize = Number(this.options.fontSize);
        yLine = y + (1 - lineCount) / 2 * fontSize;

        var width = ctx.measureText(lines[0]).width;
        for (var i = 1; i < lineCount; i++) {
          var lineWidth = ctx.measureText(lines[i]).width;
          width = lineWidth > width ? lineWidth : width;
        }
        var height = this.options.fontSize * lineCount;
        var left = x - width / 2;
        var top = y - height / 2;

        // cache
        this.labelDimensions = {top: top, left: left, width: width, height: height, yLine: yLine};
      }

      var yLine = this.labelDimensions.yLine;

      ctx.save();

      if (this.options.labelAlignment != "horizontal") {
        ctx.translate(x, yLine);
        this._rotateForLabelAlignment(ctx);
        x = 0;
        yLine = 0;
      }


      this._drawLabelRect(ctx);
      this._drawLabelText(ctx, x, yLine, lines, lineCount, fontSize);

      ctx.restore();
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
   * Draws the label rectangle
   * @param {CanvasRenderingContext2D} ctx
   * @param {String} labelAlignment
   * @private
   */
  _drawLabelRect(ctx) {
    if (this.options.fontFill !== undefined && this.options.fontFill !== undefined && this.options.fontFill !== "none") {
      ctx.fillStyle = this.options.fontFill;

      var lineMargin = 2;

      if (this.options.labelAlignment == 'line-center') {
        ctx.fillRect(-this.labelDimensions.width * 0.5, -this.labelDimensions.height * 0.5, this.labelDimensions.width, this.labelDimensions.height);
      }
      else if (this.options.labelAlignment == 'line-above') {
        ctx.fillRect(-this.labelDimensions.width * 0.5, -(this.labelDimensions.height + lineMargin), this.labelDimensions.width, this.labelDimensions.height);
      }
      else if (this.options.labelAlignment == 'line-below') {
        ctx.fillRect(-this.labelDimensions.width * 0.5, lineMargin, this.labelDimensions.width, this.labelDimensions.height);
      }
      else {
        ctx.fillRect(this.labelDimensions.left, this.labelDimensions.top, this.labelDimensions.width, this.labelDimensions.height);
      }
    }
  }


  /**
   * Draws the label text
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x
   * @param {Number} yLine
   * @param {Array} lines
   * @param {Number} lineCount
   * @param {Number} fontSize
   * @private
   */
  _drawLabelText(ctx, x, yLine, lines, lineCount, fontSize) {
    // draw text
    ctx.fillStyle = this.options.fontColor || "black";
    ctx.textAlign = "center";

    // check for label alignment
    if (this.options.labelAlignment != 'horizontal') {
      var lineMargin = 2;
      if (this.options.labelAlignment == 'line-above') {
        ctx.textBaseline = "alphabetic";
        yLine -= 2 * lineMargin; // distance from edge, required because we use alphabetic. Alphabetic has less difference between browsers
      }
      else if (this.options.labelAlignment == 'line-below') {
        ctx.textBaseline = "hanging";
        yLine += 2 * lineMargin;// distance from edge, required because we use hanging. Hanging has less difference between browsers
      }
      else {
        ctx.textBaseline = "middle";
      }
    }
    else {
      ctx.textBaseline = "middle";
    }

    // check for strokeWidth
    if (this.options.fontStrokeWidth > 0) {
      ctx.lineWidth = this.options.fontStrokeWidth;
      ctx.strokeStyle = this.options.fontStrokeColor;
      ctx.lineJoin = 'round';
    }
    for (var i = 0; i < lineCount; i++) {
      if (this.options.fontStrokeWidth > 0) {
        ctx.strokeText(lines[i], x, yLine);
      }
      ctx.fillText(lines[i], x, yLine);
      yLine += fontSize;
    }
  }


  /**
   * Redraw a edge as a dashed line
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
      if (this.options.dash.length !== undefined && this.options.dash.gap !== undefined) {
        pattern = [this.options.dash.length, this.options.dash.gap];
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
      // draw dashed line
      ctx.beginPath();
      ctx.lineCap = 'round';
      if (this.options.dash.altLength !== undefined) //If an alt dash value has been set add to the array this value
      {
        ctx.dashedLine(this.from.x, this.from.y, this.to.x, this.to.y,
          [this.options.dash.length, this.options.dash.gap, this.options.dash.altLength, this.options.dash.gap]);
      }
      else if (this.options.dash.length !== undefined && this.options.dash.gap !== undefined) //If a dash and gap value has been set add to the array this value
      {
        ctx.dashedLine(this.from.x, this.from.y, this.to.x, this.to.y,
          [this.options.dash.length, this.options.dash.gap]);
      }
      else //If all else fails draw a line
      {
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
      }
      ctx.stroke();
    }

    // draw label
    if (this.label) {
      var point;
      if (this.options.smooth.enabled == true && via != undefined) {
        var midpointX = 0.5 * (0.5 * (this.from.x + via.x) + 0.5 * (this.to.x + via.x));
        var midpointY = 0.5 * (0.5 * (this.from.y + via.y) + 0.5 * (this.to.y + via.y));
        point = {x: midpointX, y: midpointY};
      }
      else {
        point = this._pointOnLine(0.5);
      }
      this._label(ctx, this.label, point.x, point.y);
    }
  }


  /**
   * Get a point on a line
   * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
   * @return {Object} point
   * @private
   */
  _pointOnLine(percentage) {
    return {
      x: (1 - percentage) * this.from.x + percentage * this.to.x,
      y: (1 - percentage) * this.from.y + percentage * this.to.y
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
    var angle = (percentage - 3 / 8) * 2 * Math.PI;
    return {
      x: x + radius * Math.cos(angle),
      y: y - radius * Math.sin(angle)
    }
  }


  /**
   * Redraw a edge as a line with an arrow halfway the line
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  _drawArrowCenter(ctx) {
    var point;
    // set style
    ctx.strokeStyle = this._getColor(ctx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = this._getLineWidth();

    if (this.from != this.to) {
      // draw line
      var via = this._line(ctx);

      var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
      var length = (10 + 5 * this.options.width) * this.options.arrowScaleFactor;
      // draw an arrow halfway the line
      if (this.options.smooth.enabled == true && via != undefined) {
        var midpointX = 0.5 * (0.5 * (this.from.x + via.x) + 0.5 * (this.to.x + via.x));
        var midpointY = 0.5 * (0.5 * (this.from.y + via.y) + 0.5 * (this.to.y + via.y));
        point = {x: midpointX, y: midpointY};
      }
      else {
        point = this._pointOnLine(0.5);
      }

      ctx.arrow(point.x, point.y, angle, length);
      ctx.fill();
      ctx.stroke();

      // draw label
      if (this.label) {
        this._label(ctx, this.label, point.x, point.y);
      }
    }
    else {
      // draw circle
      var x, y;
      var radius = 0.25 * Math.max(100, this.physics.springLength);
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

      // draw all arrows
      var angle = 0.2 * Math.PI;
      var length = (10 + 5 * this.options.width) * this.options.arrowScaleFactor;
      point = this._pointOnCircle(x, y, radius, 0.5);
      ctx.arrow(point.x, point.y, angle, length);
      ctx.fill();
      ctx.stroke();

      // draw label
      if (this.label) {
        point = this._pointOnCircle(x, y, radius, 0.5);
        this._label(ctx, this.label, point.x, point.y);
      }
    }
  }


  _pointOnBezier(t) {
    var via = this._getViaCoordinates();

    var x = Math.pow(1 - t, 2) * this.from.x + (2 * t * (1 - t)) * via.x + Math.pow(t, 2) * this.to.x;
    var y = Math.pow(1 - t, 2) * this.from.y + (2 * t * (1 - t)) * via.y + Math.pow(t, 2) * this.to.y;

    return {x: x, y: y};
  }

  /**
   * This function uses binary search to look for the point where the bezier curve crosses the border of the node.
   *
   * @param from
   * @param ctx
   * @returns {*}
   * @private
   */
  _findBorderPosition(from, ctx) {
    var maxIterations = 10;
    var iteration = 0;
    var low = 0;
    var high = 1;
    var pos, angle, distanceToBorder, distanceToNodes, difference;
    var threshold = 0.2;
    var node = this.to;
    if (from == true) {
      node = this.from;
    }

    while (low <= high && iteration < maxIterations) {
      var middle = (low + high) * 0.5;

      pos = this._pointOnBezier(middle);
      angle = Math.atan2((node.y - pos.y), (node.x - pos.x));
      distanceToBorder = node.distanceToBorder(ctx, angle);
      distanceToNodes = Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2));
      difference = distanceToBorder - distanceToNodes;
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
   * Redraw a edge as a line with an arrow
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  _drawArrow(ctx) {
    // set style
    ctx.strokeStyle = this._getColor(ctx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = this._getLineWidth();

    // set vars
    var angle, length, arrowPos;

    // if not connected to itself
    if (this.from != this.to) {
      // draw line
      this._line(ctx);

      // draw arrow head
      if (this.options.smooth.enabled == true) {
        var via = this._getViaCoordinates();
        arrowPos = this._findBorderPosition(false, ctx);
        var guidePos = this._pointOnBezier(Math.max(0.0, arrowPos.t - 0.1))
        angle = Math.atan2((arrowPos.y - guidePos.y), (arrowPos.x - guidePos.x));
      }
      else {
        angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
        var dx = (this.to.x - this.from.x);
        var dy = (this.to.y - this.from.y);
        var edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
        var toBorderDist = this.to.distanceToBorder(ctx, angle);
        var toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

        arrowPos = {};
        arrowPos.x = (1 - toBorderPoint) * this.from.x + toBorderPoint * this.to.x;
        arrowPos.y = (1 - toBorderPoint) * this.from.y + toBorderPoint * this.to.y;
      }

      // draw arrow at the end of the line
      length = (10 + 5 * this.options.width) * this.options.arrowScaleFactor;
      ctx.arrow(arrowPos.x, arrowPos.y, angle, length);
      ctx.fill();
      ctx.stroke();

      // draw label
      if (this.label) {
        var point;
        if (this.options.smooth.enabled == true && via != undefined) {
          point = this._pointOnBezier(0.5);
        }
        else {
          point = this._pointOnLine(0.5);
        }
        this._label(ctx, this.label, point.x, point.y);
      }
    }
    else {
      // draw circle
      var node = this.from;
      var x, y, arrow;
      var radius = 0.25 * Math.max(100, this.physics.springLength);
      if (!node.width) {
        node.resize(ctx);
      }
      if (node.width > node.height) {
        x = node.x + node.width * 0.5;
        y = node.y - radius;
        arrow = {
          x: x,
          y: node.y,
          angle: 0.9 * Math.PI
        };
      }
      else {
        x = node.x + radius;
        y = node.y - node.height * 0.5;
        arrow = {
          x: node.x,
          y: y,
          angle: 0.6 * Math.PI
        };
      }
      ctx.beginPath();
      // TODO: similarly, for a line without arrows, draw to the border of the nodes instead of the center
      ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
      ctx.stroke();

      // draw all arrows
      var length = (10 + 5 * this.options.width) * this.options.arrowScaleFactor;
      ctx.arrow(arrow.x, arrow.y, arrow.angle, length);
      ctx.fill();
      ctx.stroke();

      // draw label
      if (this.label) {
        point = this._pointOnCircle(x, y, radius, 0.5);
        this._label(ctx, this.label, point.x, point.y);
      }
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
        var i, t, x, y, lastX, lastY;
        for (i = 0; i < 10; i++) {
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
      var radius = 0.25 * this.physics.springLength;
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

    if (this.labelDimensions.left < x3 &&
      this.labelDimensions.left + this.labelDimensions.width > x3 &&
      this.labelDimensions.top < y3 &&
      this.labelDimensions.top + this.labelDimensions.height > y3) {
      return 0;
    }
    else {
      return returnValue;
    }
  }

  _getDistanceToLine(x1, y1, x2, y2, x3, y3) {
    var px = x2 - x1,
      py = y2 - y1,
      something = px * px + py * py,
      u = ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
      u = 1;
    }
    else if (u < 0) {
      u = 0;
    }

    var x = x1 + u * px,
      y = y1 + u * py,
      dx = x - x3,
      dy = y - y3;

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
          borderWidthSelected: 2
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
      controlnodeFromPos = this._findBorderPosition(true, ctx);
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
    var controlnodeFromPos, controlnodeToPos;
    if (this.options.smooth.enabled == true) {
      controlnodeToPos = this._findBorderPosition(false, ctx);
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