var util = require('../util');
var Node = require('./Node');

/**
 * @class Edge
 *
 * A edge connects two nodes
 * @param {Object} properties     Object with properties. Must contain
 *                                At least properties from and to.
 *                                Available properties: from (number),
 *                                to (number), label (string, color (string),
 *                                width (number), style (string),
 *                                length (number), title (string)
 * @param {Network} network       A Network object, used to find and edge to
 *                                nodes.
 * @param {Object} constants      An object with default values for
 *                                example for the color
 */
function Edge (properties, network, networkConstants) {
  if (!network) {
    throw "No network provided";
  }
  var fields = ['edges','physics'];
  var constants = util.selectiveBridgeObject(fields,networkConstants);
  this.options = constants.edges;
  this.physics = constants.physics;
  this.options['smoothCurves'] = networkConstants['smoothCurves'];


  this.network = network;

  // initialize variables
  this.id     = undefined;
  this.fromId = undefined;
  this.toId   = undefined;
  this.title  = undefined;
  this.widthSelected = this.options.width * this.options.widthSelectionMultiplier;
  this.value  = undefined;
  this.selected = false;
  this.hover = false;
  this.labelDimensions = {top:0,left:0,width:0,height:0,yLine:0}; // could be cached
  this.dirtyLabel = true;

  this.from = null;   // a node
  this.to = null;     // a node
  this.via = null;    // a temp node

  this.fromBackup = null; // used to clean up after reconnect
  this.toBackup = null;;  // used to clean up after reconnect

  // we use this to be able to reconnect the edge to a cluster if its node is put into a cluster
  // by storing the original information we can revert to the original connection when the cluser is opened.
  this.originalFromId = [];
  this.originalToId = [];

  this.connected = false;

  this.widthFixed  = false;
  this.lengthFixed = false;

  this.setProperties(properties);

  this.controlNodesEnabled = false;
  this.controlNodes = {from:null, to:null, positions:{}};
  this.connectedNode = null;
}

/**
 * Set or overwrite properties for the edge
 * @param {Object} properties  an object with properties
 * @param {Object} constants   and object with default, global properties
 */
Edge.prototype.setProperties = function(properties) {
  if (!properties) {
    return;
  }

  var fields = ['style','fontSize','fontFace','fontColor','fontFill','width',
    'widthSelectionMultiplier','hoverWidth','arrowScaleFactor','dash','inheritColor'
  ];
  util.selectiveDeepExtend(fields, this.options, properties);

  if (properties.from !== undefined)           {this.fromId = properties.from;}
  if (properties.to !== undefined)             {this.toId = properties.to;}

  if (properties.id !== undefined)             {this.id = properties.id;}
  if (properties.label !== undefined)          {this.label = properties.label; this.dirtyLabel = true;}

  if (properties.title !== undefined)        {this.title = properties.title;}
  if (properties.value !== undefined)        {this.value = properties.value;}
  if (properties.length !== undefined)       {this.physics.springLength = properties.length;}

  if (properties.color !== undefined) {
    this.options.inheritColor = false;
    if (util.isString(properties.color)) {
      this.options.color.color = properties.color;
      this.options.color.highlight = properties.color;
    }
    else {
      if (properties.color.color !== undefined)     {this.options.color.color = properties.color.color;}
      if (properties.color.highlight !== undefined) {this.options.color.highlight = properties.color.highlight;}
      if (properties.color.hover !== undefined)     {this.options.color.hover = properties.color.hover;}
    }
  }

  // A node is connected when it has a from and to node.
  this.connect();

  this.widthFixed = this.widthFixed || (properties.width !== undefined);
  this.lengthFixed = this.lengthFixed || (properties.length !== undefined);

  this.widthSelected = this.options.width* this.options.widthSelectionMultiplier;

  // set draw method based on style
  switch (this.options.style) {
    case 'line':          this.draw = this._drawLine; break;
    case 'arrow':         this.draw = this._drawArrow; break;
    case 'arrow-center':  this.draw = this._drawArrowCenter; break;
    case 'dash-line':     this.draw = this._drawDashLine; break;
    default:              this.draw = this._drawLine; break;
  }
};

/**
 * Connect an edge to its nodes
 */
Edge.prototype.connect = function () {
  this.disconnect();

  this.from = this.network.nodes[this.fromId] || null;
  this.to = this.network.nodes[this.toId] || null;
  this.connected = (this.from && this.to);

  if (this.connected) {
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
};

/**
 * Disconnect an edge from its nodes
 */
Edge.prototype.disconnect = function () {
  if (this.from) {
    this.from.detachEdge(this);
    this.from = null;
  }
  if (this.to) {
    this.to.detachEdge(this);
    this.to = null;
  }

  this.connected = false;
};

/**
 * get the title of this edge.
 * @return {string} title    The title of the edge, or undefined when no title
 *                           has been set.
 */
Edge.prototype.getTitle = function() {
  return typeof this.title === "function" ? this.title() : this.title;
};


/**
 * Retrieve the value of the edge. Can be undefined
 * @return {Number} value
 */
Edge.prototype.getValue = function() {
  return this.value;
};

/**
 * Adjust the value range of the edge. The edge will adjust it's width
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Edge.prototype.setValueRange = function(min, max) {
  if (!this.widthFixed && this.value !== undefined) {
    var scale = (this.options.widthMax - this.options.widthMin) / (max - min);
    this.options.width= (this.value - min) * scale + this.options.widthMin;
    this.widthSelected = this.options.width* this.options.widthSelectionMultiplier;
  }
};

/**
 * Redraw a edge
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Edge.prototype.draw = function(ctx) {
  throw "Method draw not initialized in edge";
};

/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top
 * @return {boolean}     True if location is located on the edge
 */
Edge.prototype.isOverlappingWith = function(obj) {
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
};

Edge.prototype._getColor = function() {
  var colorObj = this.options.color;
  if (this.options.inheritColor == "to") {
    colorObj = {
      highlight: this.to.options.color.highlight.border,
      hover: this.to.options.color.hover.border,
      color: this.to.options.color.border
    };
  }
  else if (this.options.inheritColor == "from" || this.options.inheritColor == true) {
    colorObj = {
      highlight: this.from.options.color.highlight.border,
      hover: this.from.options.color.hover.border,
      color: this.from.options.color.border
    };
  }

  if (this.selected == true)   {return colorObj.highlight;}
  else if (this.hover == true) {return colorObj.hover;}
  else                         {return colorObj.color;}
};


/**
 * Redraw a edge as a line
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawLine = function(ctx) {
  // set style
  ctx.strokeStyle = this._getColor();
  ctx.lineWidth   = this._getLineWidth();

  if (this.from != this.to) {
    // draw line
    var via = this._line(ctx);

    // draw label
    var point;
    if (this.label) {
      if (this.options.smoothCurves.enabled == true && via != null) {
        var midpointX = 0.5*(0.5*(this.from.x + via.x) + 0.5*(this.to.x + via.x));
        var midpointY = 0.5*(0.5*(this.from.y + via.y) + 0.5*(this.to.y + via.y));
        point = {x:midpointX, y:midpointY};
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
};

/**
 * Get the line width of the edge. Depends on width and whether one of the
 * connected nodes is selected.
 * @return {Number} width
 * @private
 */
Edge.prototype._getLineWidth = function() {
  if (this.selected == true) {
    return  Math.max(Math.min(this.widthSelected, this.options.widthMax), 0.3*this.networkScaleInv);
  }
  else {
    if (this.hover == true) {
      return Math.max(Math.min(this.options.hoverWidth, this.options.widthMax), 0.3*this.networkScaleInv);
    }
    else {
      return Math.max(this.options.width, 0.3*this.networkScaleInv);
    }
  }
};

Edge.prototype._getViaCoordinates = function () {
  var xVia = null;
  var yVia = null;
  var factor = this.options.smoothCurves.roundness;
  var type = this.options.smoothCurves.type;

  var dx = Math.abs(this.from.x - this.to.x);
  var dy = Math.abs(this.from.y - this.to.y);
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
        yVia = this.to.y - (1-factor) * dy;
      }
      else {
        yVia = this.to.y + (1-factor) * dy;
      }
    }
    else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) { // left - right
      if (this.from.x < this.to.x) {
        xVia = this.to.x - (1-factor) * dx;
      }
      else {
        xVia = this.to.x + (1-factor) * dx;
      }
      yVia = this.from.y;
    }
  }
  else if (type == 'horizontal') {
    if (this.from.x < this.to.x) {
      xVia = this.to.x - (1-factor) * dx;
    }
    else {
      xVia = this.to.x + (1-factor) * dx;
    }
    yVia = this.from.y;
  }
  else if (type == 'vertical') {
    xVia = this.from.x;
    if (this.from.y < this.to.y) {
      yVia = this.to.y - (1-factor) * dy;
    }
    else {
      yVia = this.to.y + (1-factor) * dy;
    }
  }
  else { // continuous
    if (Math.abs(this.from.x - this.to.x) < Math.abs(this.from.y - this.to.y)) {
      if (this.from.y > this.to.y) {
        if (this.from.x < this.to.x) {
//          console.log(1)
          xVia = this.from.x + factor * dy;
          yVia = this.from.y - factor * dy;
          xVia = this.to.x < xVia ? this.to.x : xVia;
        }
        else if (this.from.x > this.to.x) {
//          console.log(2)
          xVia = this.from.x - factor * dy;
          yVia = this.from.y - factor * dy;
          xVia = this.to.x > xVia ? this.to.x :xVia;
        }
      }
      else if (this.from.y < this.to.y) {
        if (this.from.x < this.to.x) {
//          console.log(3)
          xVia = this.from.x + factor * dy;
          yVia = this.from.y + factor * dy;
          xVia = this.to.x < xVia ? this.to.x : xVia;
        }
        else if (this.from.x > this.to.x) {
//          console.log(4, this.from.x, this.to.x)
          xVia = this.from.x - factor * dy;
          yVia = this.from.y + factor * dy;
          xVia = this.to.x > xVia ? this.to.x : xVia;
        }
      }
    }
    else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) {
      if (this.from.y > this.to.y) {
        if (this.from.x < this.to.x) {
//          console.log(5)
          xVia = this.from.x + factor * dx;
          yVia = this.from.y - factor * dx;
          yVia = this.to.y > yVia ? this.to.y : yVia;
        }
        else if (this.from.x > this.to.x) {
//          console.log(6)
          xVia = this.from.x - factor * dx;
          yVia = this.from.y - factor * dx;
          yVia = this.to.y > yVia ? this.to.y : yVia;
        }
      }
      else if (this.from.y < this.to.y) {
        if (this.from.x < this.to.x) {
//          console.log(7)
          xVia = this.from.x + factor * dx;
          yVia = this.from.y + factor * dx;
          yVia = this.to.y < yVia ? this.to.y : yVia;
        }
        else if (this.from.x > this.to.x) {
//          console.log(8)
          xVia = this.from.x - factor * dx;
          yVia = this.from.y + factor * dx;
          yVia = this.to.y < yVia ? this.to.y : yVia;
        }
      }
    }
  }


  return {x:xVia, y:yVia};
};

/**
 * Draw a line between two nodes
 * @param {CanvasRenderingContext2D} ctx
 * @private
 */
Edge.prototype._line = function (ctx) {
  // draw a straight line
  ctx.beginPath();
  ctx.moveTo(this.from.x, this.from.y);
  if (this.options.smoothCurves.enabled == true) {
    if (this.options.smoothCurves.dynamic == false) {
      var via = this._getViaCoordinates();
      if (via.x == null) {
        ctx.lineTo(this.to.x, this.to.y);
        ctx.stroke();
        return null;
      }
      else {
//        this.via.x = via.x;
//        this.via.y = via.y;
        ctx.quadraticCurveTo(via.x,via.y,this.to.x, this.to.y);
        ctx.stroke();
        return via;
      }
    }
    else {
      ctx.quadraticCurveTo(this.via.x,this.via.y,this.to.x, this.to.y);
      ctx.stroke();
      return this.via;
    }
  }
  else {
    ctx.lineTo(this.to.x, this.to.y);
    ctx.stroke();
    return null;
  }
};

/**
 * Draw a line from a node to itself, a circle
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @private
 */
Edge.prototype._circle = function (ctx, x, y, radius) {
  // draw a circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.stroke();
};

/**
 * Draw label with white background and with the middle at (x, y)
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text
 * @param {Number} x
 * @param {Number} y
 * @private
 */
Edge.prototype._label = function (ctx, text, x, y) {
  if (text) {
    ctx.font = ((this.from.selected || this.to.selected) ? "bold " : "") +
    this.options.fontSize + "px " + this.options.fontFace;
    var yLine;

    if (this.dirtyLabel == true) {
      var lines = String(text).split('\n');
      var lineCount = lines.length;
      var fontSize = (Number(this.options.fontSize) + 4);
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
      this.labelDimensions = {top:top,left:left,width:width,height:height,yLine:yLine};
    }


    if (this.options.fontFill !== undefined && this.options.fontFill !== null && this.options.fontFill !== "none") {
      ctx.fillStyle = this.options.fontFill;
      ctx.fillRect(this.labelDimensions.left,
        this.labelDimensions.top,
        this.labelDimensions.width,
        this.labelDimensions.height);
    }

    // draw text
    ctx.fillStyle = this.options.fontColor || "black";
    ctx.textAlign = "center";
    ctx.textBaseline =  "middle";
    yLine = this.labelDimensions.yLine;
    for (var i = 0; i < lineCount; i++) {
      ctx.fillText(lines[i], x, yLine);
      yLine += fontSize;
    }
  }
};

/**
 * Redraw a edge as a dashed line
 * Draw this edge in the given canvas
 * @author David Jordan
 * @date 2012-08-08
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawDashLine = function(ctx) {
  // set style
  ctx.strokeStyle = this._getColor();
  ctx.lineWidth = this._getLineWidth();

  var via = null;
  // only firefox and chrome support this method, else we use the legacy one.
  if (ctx.mozDash !== undefined || ctx.setLineDash !== undefined) {
    // configure the dash pattern
    var pattern = [0];
    if (this.options.dash.length !== undefined && this.options.dash.gap !== undefined) {
      pattern = [this.options.dash.length,this.options.dash.gap];
    }
    else {
      pattern = [5,5];
    }

    // set dash settings for chrome or firefox
    if (typeof ctx.setLineDash !== 'undefined') { //Chrome
      ctx.setLineDash(pattern);
      ctx.lineDashOffset = 0;

    } else { //Firefox
      ctx.mozDash = pattern;
      ctx.mozDashOffset = 0;
    }

    // draw the line
    via = this._line(ctx);

    // restore the dash settings.
    if (typeof ctx.setLineDash !== 'undefined') { //Chrome
      ctx.setLineDash([0]);
      ctx.lineDashOffset = 0;

    } else { //Firefox
      ctx.mozDash = [0];
      ctx.mozDashOffset = 0;
    }
  }
  else { // unsupporting smooth lines
    // draw dashed line
    ctx.beginPath();
    ctx.lineCap = 'round';
    if (this.options.dash.altLength !== undefined) //If an alt dash value has been set add to the array this value
    {
      ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,
          [this.options.dash.length,this.options.dash.gap,this.options.dash.altLength,this.options.dash.gap]);
    }
    else if (this.options.dash.length !== undefined && this.options.dash.gap !== undefined) //If a dash and gap value has been set add to the array this value
    {
      ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,
          [this.options.dash.length,this.options.dash.gap]);
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
    if (this.options.smoothCurves.enabled == true && via != null) {
      var midpointX = 0.5*(0.5*(this.from.x + via.x) + 0.5*(this.to.x + via.x));
      var midpointY = 0.5*(0.5*(this.from.y + via.y) + 0.5*(this.to.y + via.y));
      point = {x:midpointX, y:midpointY};
    }
    else {
      point = this._pointOnLine(0.5);
    }
    this._label(ctx, this.label, point.x, point.y);
  }
};

/**
 * Get a point on a line
 * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
 * @return {Object} point
 * @private
 */
Edge.prototype._pointOnLine = function (percentage) {
  return {
    x: (1 - percentage) * this.from.x + percentage * this.to.x,
    y: (1 - percentage) * this.from.y + percentage * this.to.y
  }
};

/**
 * Get a point on a circle
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
 * @return {Object} point
 * @private
 */
Edge.prototype._pointOnCircle = function (x, y, radius, percentage) {
  var angle = (percentage - 3/8) * 2 * Math.PI;
  return {
    x: x + radius * Math.cos(angle),
    y: y - radius * Math.sin(angle)
  }
};

/**
 * Redraw a edge as a line with an arrow halfway the line
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawArrowCenter = function(ctx) {
  var point;
  // set style
  ctx.strokeStyle = this._getColor();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = this._getLineWidth();

  if (this.from != this.to) {
    // draw line
    var via = this._line(ctx);

    var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
    var length = (10 + 5 * this.options.width) * this.options.arrowScaleFactor;
    // draw an arrow halfway the line
    if (this.options.smoothCurves.enabled == true && via != null) {
      var midpointX = 0.5*(0.5*(this.from.x + via.x) + 0.5*(this.to.x + via.x));
      var midpointY = 0.5*(0.5*(this.from.y + via.y) + 0.5*(this.to.y + via.y));
      point = {x:midpointX, y:midpointY};
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
    var radius = 0.25 * Math.max(100,this.physics.springLength);
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
};



/**
 * Redraw a edge as a line with an arrow
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawArrow = function(ctx) {
  // set style
  ctx.strokeStyle = this._getColor();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = this._getLineWidth();

  var angle, length;
  //draw a line
  if (this.from != this.to) {
    angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
    var dx = (this.to.x - this.from.x);
    var dy = (this.to.y - this.from.y);
    var edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);

    var fromBorderDist = this.from.distanceToBorder(ctx, angle + Math.PI);
    var fromBorderPoint = (edgeSegmentLength - fromBorderDist) / edgeSegmentLength;
    var xFrom = (fromBorderPoint) * this.from.x + (1 - fromBorderPoint) * this.to.x;
    var yFrom = (fromBorderPoint) * this.from.y + (1 - fromBorderPoint) * this.to.y;

    var via;
    if (this.options.smoothCurves.dynamic == true && this.options.smoothCurves.enabled == true ) {
      via = this.via;
    }
    else if (this.options.smoothCurves.enabled == true) {
      via = this._getViaCoordinates();
    }

    if (this.options.smoothCurves.enabled == true && via.x != null) {
      angle = Math.atan2((this.to.y - via.y), (this.to.x - via.x));
      dx = (this.to.x - via.x);
      dy = (this.to.y - via.y);
      edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
    }
    var toBorderDist = this.to.distanceToBorder(ctx, angle);
    var toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

    var xTo,yTo;
    if (this.options.smoothCurves.enabled == true && via.x != null) {
     xTo = (1 - toBorderPoint) * via.x + toBorderPoint * this.to.x;
     yTo = (1 - toBorderPoint) * via.y + toBorderPoint * this.to.y;
    }
    else {
      xTo = (1 - toBorderPoint) * this.from.x + toBorderPoint * this.to.x;
      yTo = (1 - toBorderPoint) * this.from.y + toBorderPoint * this.to.y;
    }

    ctx.beginPath();
    ctx.moveTo(xFrom,yFrom);
    if (this.options.smoothCurves.enabled == true && via.x != null) {
      ctx.quadraticCurveTo(via.x,via.y,xTo, yTo);
    }
    else {
      ctx.lineTo(xTo, yTo);
    }
    ctx.stroke();

    // draw arrow at the end of the line
    length = (10 + 5 * this.options.width) * this.options.arrowScaleFactor;
    ctx.arrow(xTo, yTo, angle, length);
    ctx.fill();
    ctx.stroke();

    // draw label
    if (this.label) {
      var point;
      if (this.options.smoothCurves.enabled == true && via != null) {
        var midpointX = 0.5*(0.5*(this.from.x + via.x) + 0.5*(this.to.x + via.x));
        var midpointY = 0.5*(0.5*(this.from.y + via.y) + 0.5*(this.to.y + via.y));
        point = {x:midpointX, y:midpointY};
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
    var radius = 0.25 * Math.max(100,this.physics.springLength);
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
};



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
Edge.prototype._getDistanceToEdge = function (x1,y1, x2,y2, x3,y3) { // x3,y3 is the point
  var returnValue = 0;
  if (this.from != this.to) {
    if (this.options.smoothCurves.enabled == true) {
      var xVia, yVia;
      if (this.options.smoothCurves.enabled == true && this.options.smoothCurves.dynamic == true) {
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
      var i,t,x,y, lastX, lastY;
      for (i = 0; i < 10; i++) {
        t = 0.1*i;
        x = Math.pow(1-t,2)*x1 + (2*t*(1 - t))*xVia + Math.pow(t,2)*x2;
        y = Math.pow(1-t,2)*y1 + (2*t*(1 - t))*yVia + Math.pow(t,2)*y2;
        if (i > 0) {
          distance = this._getDistanceToLine(lastX,lastY,x,y, x3,y3);
          minDistance = distance < minDistance ? distance : minDistance;
        }
        lastX = x; lastY = y;
      }
      returnValue = minDistance;
    }
    else {
      returnValue = this._getDistanceToLine(x1,y1,x2,y2,x3,y3);
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
    returnValue = Math.abs(Math.sqrt(dx*dx + dy*dy) - radius);
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
};

Edge.prototype._getDistanceToLine = function(x1,y1,x2,y2,x3,y3) {
  var px = x2-x1,
    py = y2-y1,
    something = px*px + py*py,
    u =  ((x3 - x1) * px + (y3 - y1) * py) / something;

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

  return Math.sqrt(dx*dx + dy*dy);
};

/**
 * This allows the zoom level of the network to influence the rendering
 *
 * @param scale
 */
Edge.prototype.setScale = function(scale) {
  this.networkScaleInv = 1.0/scale;
};


Edge.prototype.select = function() {
  this.selected = true;
};

Edge.prototype.unselect = function() {
  this.selected = false;
};

Edge.prototype.positionBezierNode = function() {
  if (this.via !== null && this.from !== null && this.to !== null) {
    this.via.x = 0.5 * (this.from.x + this.to.x);
    this.via.y = 0.5 * (this.from.y + this.to.y);
  }
  else {
    this.via.x = 0;
    this.via.y = 0;
  }
};

/**
 * This function draws the control nodes for the manipulator.
 * In order to enable this, only set the this.controlNodesEnabled to true.
 * @param ctx
 */
Edge.prototype._drawControlNodes = function(ctx) {
  if (this.controlNodesEnabled == true) {
    if (this.controlNodes.from === null && this.controlNodes.to === null) {
      var nodeIdFrom = "edgeIdFrom:".concat(this.id);
      var nodeIdTo = "edgeIdTo:".concat(this.id);
      var constants = {
                      nodes:{group:'', radius:8},
                      physics:{damping:0},
                      clustering: {maxNodeSizeIncrements: 0 ,nodeScaling: {width:0, height: 0, radius:0}}
                      };
      this.controlNodes.from = new Node(
        {id:nodeIdFrom,
          shape:'dot',
            color:{background:'#ff4e00', border:'#3c3c3c', highlight: {background:'#07f968'}}
        },{},{},constants);
      this.controlNodes.to = new Node(
        {id:nodeIdTo,
          shape:'dot',
          color:{background:'#ff4e00', border:'#3c3c3c', highlight: {background:'#07f968'}}
        },{},{},constants);
    }

    if (this.controlNodes.from.selected == false && this.controlNodes.to.selected == false) {
      this.controlNodes.positions = this.getControlNodePositions(ctx);
      this.controlNodes.from.x = this.controlNodes.positions.from.x;
      this.controlNodes.from.y = this.controlNodes.positions.from.y;
      this.controlNodes.to.x = this.controlNodes.positions.to.x;
      this.controlNodes.to.y = this.controlNodes.positions.to.y;
    }

    this.controlNodes.from.draw(ctx);
    this.controlNodes.to.draw(ctx);
  }
  else {
    this.controlNodes = {from:null, to:null, positions:{}};
  }
};

/**
 * Enable control nodes.
 * @private
 */
Edge.prototype._enableControlNodes = function() {
  this.fromBackup = this.from;
  this.toBackup = this.to;
  this.controlNodesEnabled = true;
};

/**
 * disable control nodes and remove from dynamicEdges from old node
 * @private
 */
Edge.prototype._disableControlNodes = function() {
  this.fromId = this.from.id;
  this.toId = this.to.id;
  if (this.fromId != this.fromBackup.id) { // from was changed, remove edge from old 'from' node dynamic edges
    this.fromBackup.detachEdge(this);
  }
  else if (this.toId != this.toBackup.id) { // to was changed, remove edge from old 'to' node dynamic edges
    this.toBackup.detachEdge(this);
  }

  this.fromBackup = null;
  this.toBackup = null;
  this.controlNodesEnabled = false;
};


/**
 * This checks if one of the control nodes is selected and if so, returns the control node object. Else it returns null.
 * @param x
 * @param y
 * @returns {null}
 * @private
 */
Edge.prototype._getSelectedControlNode = function(x,y) {
  var positions = this.controlNodes.positions;
  var fromDistance = Math.sqrt(Math.pow(x - positions.from.x,2) + Math.pow(y - positions.from.y,2));
  var toDistance =   Math.sqrt(Math.pow(x - positions.to.x  ,2) + Math.pow(y - positions.to.y  ,2));

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
    return null;
  }
};


/**
 * this resets the control nodes to their original position.
 * @private
 */
Edge.prototype._restoreControlNodes = function() {
  if (this.controlNodes.from.selected == true) {
    this.from = this.connectedNode;
    this.connectedNode = null;
    this.controlNodes.from.unselect();
  }
  else if (this.controlNodes.to.selected == true) {
    this.to = this.connectedNode;
    this.connectedNode = null;
    this.controlNodes.to.unselect();
  }
};

/**
 * this calculates the position of the control nodes on the edges of the parent nodes.
 *
 * @param ctx
 * @returns {{from: {x: number, y: number}, to: {x: *, y: *}}}
 */
Edge.prototype.getControlNodePositions = function(ctx) {
  var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
  var dx = (this.to.x - this.from.x);
  var dy = (this.to.y - this.from.y);
  var edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
  var fromBorderDist = this.from.distanceToBorder(ctx, angle + Math.PI);
  var fromBorderPoint = (edgeSegmentLength - fromBorderDist) / edgeSegmentLength;
  var xFrom = (fromBorderPoint) * this.from.x + (1 - fromBorderPoint) * this.to.x;
  var yFrom = (fromBorderPoint) * this.from.y + (1 - fromBorderPoint) * this.to.y;

  var via;
  if (this.options.smoothCurves.dynamic == true && this.options.smoothCurves.enabled == true) {
    via = this.via;
  }
  else if (this.options.smoothCurves.enabled == true) {
    via = this._getViaCoordinates();
  }

  if (this.options.smoothCurves.enabled == true && via.x != null) {
    angle = Math.atan2((this.to.y - via.y), (this.to.x - via.x));
    dx = (this.to.x - via.x);
    dy = (this.to.y - via.y);
    edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
  }
  var toBorderDist = this.to.distanceToBorder(ctx, angle);
  var toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

  var xTo,yTo;
  if (this.options.smoothCurves.enabled == true && via.x != null) {
    xTo = (1 - toBorderPoint) * via.x + toBorderPoint * this.to.x;
    yTo = (1 - toBorderPoint) * via.y + toBorderPoint * this.to.y;
  }
  else {
    xTo = (1 - toBorderPoint) * this.from.x + toBorderPoint * this.to.x;
    yTo = (1 - toBorderPoint) * this.from.y + toBorderPoint * this.to.y;
  }

  return {from:{x:xFrom,y:yFrom},to:{x:xTo,y:yTo}};
};

module.exports = Edge;