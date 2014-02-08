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
 * @param {Graph} graph A graph object, used to find and edge to
 *                                nodes.
 * @param {Object} constants      An object with default values for
 *                                example for the color
 */
function Edge (properties, graph, constants) {
  if (!graph) {
    throw "No graph provided";
  }
  this.graph = graph;

  // initialize constants
  this.widthMin = constants.edges.widthMin;
  this.widthMax = constants.edges.widthMax;

  // initialize variables
  this.id     = undefined;
  this.fromId = undefined;
  this.toId   = undefined;
  this.style  = constants.edges.style;
  this.title  = undefined;
  this.width  = constants.edges.width;
  this.value  = undefined;
  this.length = constants.physics.springLength;
  this.selected = false;

  this.from = null;   // a node
  this.to = null;     // a node

  // we use this to be able to reconnect the edge to a cluster if its node is put into a cluster
  // by storing the original information we can revert to the original connection when the cluser is opened.
  this.originalFromId = [];
  this.originalToId = [];

  this.connected = false;

  // Added to support dashed lines
  // David Jordan
  // 2012-08-08
  this.dash = util.extend({}, constants.edges.dash); // contains properties length, gap, altLength

  this.springConstant = constants.physics.springConstant;
  this.color       = constants.edges.color;
  this.widthFixed  = false;
  this.lengthFixed = false;

  this.setProperties(properties, constants);
}

/**
 * Set or overwrite properties for the edge
 * @param {Object} properties  an object with properties
 * @param {Object} constants   and object with default, global properties
 */
Edge.prototype.setProperties = function(properties, constants) {
  if (!properties) {
    return;
  }

  if (properties.from !== undefined)           {this.fromId = properties.from;}
  if (properties.to !== undefined)             {this.toId = properties.to;}

  if (properties.id !== undefined)             {this.id = properties.id;}
  if (properties.style !== undefined)          {this.style = properties.style;}
  if (properties.label !== undefined)          {this.label = properties.label;}
  if (this.label) {
    this.fontSize = constants.edges.fontSize;
    this.fontFace = constants.edges.fontFace;
    this.fontColor = constants.edges.fontColor;
    if (properties.fontColor !== undefined)  {this.fontColor = properties.fontColor;}
    if (properties.fontSize !== undefined)   {this.fontSize = properties.fontSize;}
    if (properties.fontFace !== undefined)   {this.fontFace = properties.fontFace;}
  }
  if (properties.title !== undefined)        {this.title = properties.title;}
  if (properties.width !== undefined)        {this.width = properties.width;}
  if (properties.value !== undefined)        {this.value = properties.value;}
  if (properties.length !== undefined)       {this.length = properties.length;}

  // Added to support dashed lines
  // David Jordan
  // 2012-08-08
  if (properties.dash) {
    if (properties.dash.length !== undefined)    {this.dash.length = properties.dash.length;}
    if (properties.dash.gap !== undefined)       {this.dash.gap = properties.dash.gap;}
    if (properties.dash.altLength !== undefined) {this.dash.altLength = properties.dash.altLength;}
  }

  if (properties.color !== undefined) {this.color = properties.color;}

  // A node is connected when it has a from and to node.
  this.connect();

  this.widthFixed = this.widthFixed || (properties.width !== undefined);
  this.lengthFixed = this.lengthFixed || (properties.length !== undefined);

  // set draw method based on style
  switch (this.style) {
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

  this.from = this.graph.nodes[this.fromId] || null;
  this.to = this.graph.nodes[this.toId] || null;
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
  return this.title;
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
    var scale = (this.widthMax - this.widthMin) / (max - min);
    this.width = (this.value - min) * scale + this.widthMin;
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
  var distMax = 10;

  var xFrom = this.from.x;
  var yFrom = this.from.y;
  var xTo = this.to.x;
  var yTo = this.to.y;
  var xObj = obj.left;
  var yObj = obj.top;


  var dist = Edge._dist(xFrom, yFrom, xTo, yTo, xObj, yObj);

  return (dist < distMax);
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
  ctx.strokeStyle = this.color;
  ctx.lineWidth = this._getLineWidth();

  var point;
  if (this.from != this.to) {
    // draw line
    this._line(ctx);

    // draw label
    if (this.label) {
      point = this._pointOnLine(0.5);
      this._label(ctx, this.label, point.x, point.y);
    }
  }
  else {
    var x, y;
    var radius = this.length / 4;
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
    return Math.min(this.width * 2, this.widthMax)*this.graphScaleInv;
  }
  else {
    return this.width*this.graphScaleInv;
  }
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
  ctx.lineTo(this.to.x, this.to.y);
  ctx.stroke();
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
    // TODO: cache the calculated size
    ctx.font = ((this.from.selected || this.to.selected) ? "bold " : "") +
        this.fontSize + "px " + this.fontFace;
    ctx.fillStyle = 'white';
    var width = ctx.measureText(text).width;
    var height = this.fontSize;
    var left = x - width / 2;
    var top = y - height / 2;

    ctx.fillRect(left, top, width, height);

    // draw text
    ctx.fillStyle = this.fontColor || "black";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, left, top);
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
  ctx.strokeStyle = this.color;
  ctx.lineWidth = this._getLineWidth();

  // draw dashed line
  ctx.beginPath();
  ctx.lineCap = 'round';
  if (this.dash.altLength !== undefined) //If an alt dash value has been set add to the array this value
  {
    ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,
        [this.dash.length,this.dash.gap,this.dash.altLength,this.dash.gap]);
  }
  else if (this.dash.length !== undefined && this.dash.gap !== undefined) //If a dash and gap value has been set add to the array this value
  {
    ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,
        [this.dash.length,this.dash.gap]);
  }
  else //If all else fails draw a line
  {
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
  }
  ctx.stroke();

  // draw label
  if (this.label) {
    var point = this._pointOnLine(0.5);
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
  ctx.strokeStyle = this.color;
  ctx.fillStyle = this.color;
  ctx.lineWidth = this._getLineWidth();

  if (this.from != this.to) {
    // draw line
    this._line(ctx);

    // draw an arrow halfway the line
    var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
    var length = 10 + 5 * this.width; // TODO: make customizable?
    point = this._pointOnLine(0.5);
    ctx.arrow(point.x, point.y, angle, length);
    ctx.fill();
    ctx.stroke();

    // draw label
    if (this.label) {
      point = this._pointOnLine(0.5);
      this._label(ctx, this.label, point.x, point.y);
    }
  }
  else {
    // draw circle
    var x, y;
    var radius = this.length / 4;
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

    // draw all arrows
    var angle = 0.2 * Math.PI;
    var length = 10 + 5 * this.width; // TODO: make customizable?
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
  ctx.strokeStyle = this.color;
  ctx.fillStyle = this.color;
  ctx.lineWidth = this._getLineWidth();

  // draw line
  var angle, length;
  if (this.from != this.to) {
    // calculate length and angle of the line
    angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
    var dx = (this.to.x - this.from.x);
    var dy = (this.to.y - this.from.y);
    var lEdge = Math.sqrt(dx * dx + dy * dy);

    var lFrom = this.from.distanceToBorder(ctx, angle + Math.PI);
    var pFrom = (lEdge - lFrom) / lEdge;
    var xFrom = (pFrom) * this.from.x + (1 - pFrom) * this.to.x;
    var yFrom = (pFrom) * this.from.y + (1 - pFrom) * this.to.y;

    var lTo = this.to.distanceToBorder(ctx, angle);
    var pTo = (lEdge - lTo) / lEdge;
    var xTo = (1 - pTo) * this.from.x + pTo * this.to.x;
    var yTo = (1 - pTo) * this.from.y + pTo * this.to.y;

    ctx.beginPath();
    ctx.moveTo(xFrom, yFrom);
    ctx.lineTo(xTo, yTo);
    ctx.stroke();

    // draw arrow at the end of the line
    length = 10 + 5 * this.width; // TODO: make customizable?
    ctx.arrow(xTo, yTo, angle, length);
    ctx.fill();
    ctx.stroke();

    // draw label
    if (this.label) {
      var point = this._pointOnLine(0.5);
      this._label(ctx, this.label, point.x, point.y);
    }
  }
  else {
    // draw circle
    var node = this.from;
    var x, y, arrow;
    var radius = this.length / 4;
    if (!node.width) {
      node.resize(ctx);
    }
    if (node.width > node.height) {
      x = node.x + node.width / 2;
      y = node.y - radius;
      arrow = {
        x: x,
        y: node.y,
        angle: 0.9 * Math.PI
      };
    }
    else {
      x = node.x + radius;
      y = node.y - node.height / 2;
      arrow = {
        x: node.x,
        y: y,
        angle: 0.6 * Math.PI
      };
    }
    ctx.beginPath();
    // TODO: do not draw a circle, but an arc
    // TODO: similarly, for a line without arrows, draw to the border of the nodes instead of the center
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();

    // draw all arrows
    length = 10 + 5 * this.width; // TODO: make customizable?
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
Edge._dist = function (x1,y1, x2,y2, x3,y3) { // x3,y3 is the point
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
 * This allows the zoom level of the graph to influence the rendering
 *
 * @param scale
 */
Edge.prototype.setScale = function(scale) {
  this.graphScaleInv = 1.0/scale;
};


Edge.prototype.select = function() {
  this.selected = true;
}

Edge.prototype.unselect = function() {
  this.selected = false;
}