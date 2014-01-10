/**
 * @class Node
 * A node. A node can be connected to other nodes via one or multiple edges.
 * @param {object} properties An object containing properties for the node. All
 *                            properties are optional, except for the id.
 *                              {number} id     Id of the node. Required
 *                              {string} label  Text label for the node
 *                              {number} x      Horizontal position of the node
 *                              {number} y      Vertical position of the node
 *                              {string} shape  Node shape, available:
 *                                              "database", "circle", "ellipse",
 *                                              "box", "image", "text", "dot",
 *                                              "star", "triangle", "triangleDown",
 *                                              "square"
 *                              {string} image  An image url
 *                              {string} title  An title text, can be HTML
 *                              {anytype} group A group name or number
 * @param {Graph.Images} imagelist    A list with images. Only needed
 *                                            when the node has an image
 * @param {Graph.Groups} grouplist    A list with groups. Needed for
 *                                            retrieving group properties
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 */
function Node(properties, imagelist, grouplist, constants) {
  this.selected = false;


  this.edges = []; // all edges connected to this node
  this.group = constants.nodes.group;

  this.fontSize = constants.nodes.fontSize;
  this.fontFace = constants.nodes.fontFace;
  this.fontColor = constants.nodes.fontColor;

  this.color = constants.nodes.color;

  // set defaults for the properties
  this.id = undefined;
  this.shape = constants.nodes.shape;
  this.image = constants.nodes.image;
  this.x = 0;
  this.y = 0;
  this.xFixed = false;
  this.yFixed = false;
  this.radius = constants.nodes.radius;
  this.radiusFixed = false;
  this.radiusMin = constants.nodes.radiusMin;
  this.radiusMax = constants.nodes.radiusMax;

  this.imagelist = imagelist;
  this.grouplist = grouplist;

  this.setProperties(properties, constants);

  // creating the variables for clustering
  this.resetCluster();
  this.remainingEdges = 0;
  this.remainingEdges_unapplied = 0;
  this.clusterSession = 0;

  this.clusterSizeWidthFactor  = constants.clustering.clusterSizeWidthFactor;
  this.clusterSizeHeightFactor = constants.clustering.clusterSizeHeightFactor;
  this.clusterSizeRadiusFactor = constants.clustering.clusterSizeRadiusFactor;

  // mass, force, velocity
  this.mass = 50;  // kg (mass is adjusted for the number of connected edges)
  this.fx = 0.0;  // external force x
  this.fy = 0.0;  // external force y
  this.vx = 0.0;  // velocity x
  this.vy = 0.0;  // velocity y
  this.minForce = constants.minForce;
  this.damping = 0.9; // damping factor
}

/**
 * (re)setting the clustering variables and objects
 */
Node.prototype.resetCluster = function() {
  // clustering variables
  this.formationScale = undefined; // this is used to determine when to open the cluster
  this.clusterSize = 1;            // this signifies the total amount of nodes in this cluster
  this.containedNodes = {};
  this.containedEdges = {};
};

/**
 * Attach a edge to the node
 * @param {Edge} edge
 */
Node.prototype.attachEdge = function(edge) {
  if (this.edges.indexOf(edge) == -1) {
    this.edges.push(edge);
  }
  this.remainingEdges = this.edges.length;
  this.remainingEdges_unapplied = this.remainingEdges;
  this._updateMass();
};

/**
 * Detach a edge from the node
 * @param {Edge} edge
 */
Node.prototype.detachEdge = function(edge) {
  var index = this.edges.indexOf(edge);
  if (index != -1) {
    this.edges.splice(index, 1);
  }
  this.remainingEdges = this.edges.length;
  this.remainingEdges_unapplied = this.remainingEdges;
  this._updateMass();
};

/**
 * Update the nodes mass, which is determined by the number of edges connecting
 * to it (more edges -> heavier node).
 * @private
 */
Node.prototype._updateMass = function() {
  this.mass = 50 + 20 * this.edges.length; // kg
};

/**
 * Set or overwrite properties for the node
 * @param {Object} properties an object with properties
 * @param {Object} constants  and object with default, global properties
 */
Node.prototype.setProperties = function(properties, constants) {
  if (!properties) {
    return;
  }

  // basic properties
  if (properties.id != undefined)        {this.id = properties.id;}
  if (properties.label != undefined)     {this.label = properties.label;}
  if (properties.title != undefined)     {this.title = properties.title;}
  if (properties.group != undefined)     {this.group = properties.group;}
  if (properties.x != undefined)         {this.x = properties.x;}
  if (properties.y != undefined)         {this.y = properties.y;}
  if (properties.value != undefined)     {this.value = properties.value;}

  if (this.id === undefined) {
    throw "Node must have an id";
  }

  // copy group properties
  if (this.group) {
    var groupObj = this.grouplist.get(this.group);
    for (var prop in groupObj) {
      if (groupObj.hasOwnProperty(prop)) {
        this[prop] = groupObj[prop];
      }
    }
  }

  // individual shape properties
  if (properties.shape != undefined)          {this.shape = properties.shape;}
  if (properties.image != undefined)          {this.image = properties.image;}
  if (properties.radius != undefined)         {this.radius = properties.radius;}
  if (properties.color != undefined)          {this.color = Node.parseColor(properties.color);}

  if (properties.fontColor != undefined)      {this.fontColor = properties.fontColor;}
  if (properties.fontSize != undefined)       {this.fontSize = properties.fontSize;}
  if (properties.fontFace != undefined)       {this.fontFace = properties.fontFace;}


  if (this.image != undefined) {
    if (this.imagelist) {
      this.imageObj = this.imagelist.load(this.image);
    }
    else {
      throw "No imagelist provided";
    }
  }

  this.xFixed = this.xFixed || (properties.x != undefined);
  this.yFixed = this.yFixed || (properties.y != undefined);
  this.radiusFixed = this.radiusFixed || (properties.radius != undefined);

  if (this.shape == 'image') {
    this.radiusMin = constants.nodes.widthMin;
    this.radiusMax = constants.nodes.widthMax;
  }

  // choose draw method depending on the shape
  switch (this.shape) {
    case 'database':      this.draw = this._drawDatabase; this.resize = this._resizeDatabase; break;
    case 'box':           this.draw = this._drawBox; this.resize = this._resizeBox; break;
    case 'circle':        this.draw = this._drawCircle; this.resize = this._resizeCircle; break;
    case 'ellipse':       this.draw = this._drawEllipse; this.resize = this._resizeEllipse; break;
    // TODO: add diamond shape
    case 'image':         this.draw = this._drawImage; this.resize = this._resizeImage; break;
    case 'text':          this.draw = this._drawText; this.resize = this._resizeText; break;
    case 'dot':           this.draw = this._drawDot; this.resize = this._resizeShape; break;
    case 'square':        this.draw = this._drawSquare; this.resize = this._resizeShape; break;
    case 'triangle':      this.draw = this._drawTriangle; this.resize = this._resizeShape; break;
    case 'triangleDown':  this.draw = this._drawTriangleDown; this.resize = this._resizeShape; break;
    case 'star':          this.draw = this._drawStar; this.resize = this._resizeShape; break;
    default:              this.draw = this._drawEllipse; this.resize = this._resizeEllipse; break;
  }

  // reset the size of the node, this can be changed
  this._reset();
};

/**
 * Parse a color property into an object with border, background, and
 * hightlight colors
 * @param {Object | String} color
 * @return {Object} colorObject
 */
Node.parseColor = function(color) {
  var c;
  if (util.isString(color)) {
    c = {
      border: color,
      background: color,
      highlight: {
        border: color,
        background: color
      },
      cluster: {
        border: color,
        background: color,
        highlight: {
          border: color,
          background: color
        }
      }
    };
    // TODO: automatically generate a nice highlight color
  }
  else {
    c = {};
    c.background = color.background || 'white';
    c.border = color.border || c.background;

    if (util.isString(color.highlight)) {
      c.highlight = {
        border: color.highlight,
        background: color.highlight
      }
    }
    else {
      c.highlight = {};
      c.highlight.background = color.highlight && color.highlight.background || c.background;
      c.highlight.border = color.highlight && color.highlight.border || c.border;
    }

    // check if cluster colorgroup has been defined
    if (util.isString(color.cluster)) {
      c.cluster = {
        border: color.cluster,
        background: color.cluster
      }
    }
    else {
      c.cluster = {};
      c.cluster.background = color.cluster && color.cluster.background || c.background;
      c.cluster.border = color.cluster && color.cluster.border || c.border;
    }

    // check if cluster highlight colorgroup has been defined
    if (util.isString(color.cluster.highlight)) {
      c.cluster.highlight = {
        border: color.cluster.highlight,
        background: color.cluster.highlight
      }
    }
    else {
      c.cluster.highlight = {};
      c.cluster.highlight.background = color.cluster.highlight && color.cluster.highlight.background || c.background;
      c.cluster.highlight.border = color.cluster.highlight && color.cluster.highlight.border || c.border;
    }
  }
  return c;
};

/**
 * select this node
 */
Node.prototype.select = function() {
  this.selected = true;
  this._reset();
};

/**
 * unselect this node
 */
Node.prototype.unselect = function() {
  this.selected = false;
  this._reset();
};


/**
 * Reset the calculated size of the node, forces it to recalculate its size
 */
Node.prototype.clearSizeCache = function() {
  this._reset();
};

/**
 * Reset the calculated size of the node, forces it to recalculate its size
 * @private
 */
Node.prototype._reset = function() {
  this.width = undefined;
  this.height = undefined;
};

/**
 * get the title of this node.
 * @return {string} title    The title of the node, or undefined when no title
 *                           has been set.
 */
Node.prototype.getTitle = function() {
  return this.title;
};

/**
 * Calculate the distance to the border of the Node
 * @param {CanvasRenderingContext2D}   ctx
 * @param {Number} angle        Angle in radians
 * @returns {number} distance   Distance to the border in pixels
 */
Node.prototype.distanceToBorder = function (ctx, angle) {
  var borderWidth = 1;

  if (!this.width) {
    this.resize(ctx);
  }

  //noinspection FallthroughInSwitchStatementJS
  switch (this.shape) {
    case 'circle':
    case 'dot':
      return this.radius + borderWidth;

    case 'ellipse':
      var a = this.width / 2;
      var b = this.height / 2;
      var w = (Math.sin(angle) * a);
      var h = (Math.cos(angle) * b);
      return a * b / Math.sqrt(w * w + h * h);

    // TODO: implement distanceToBorder for database
    // TODO: implement distanceToBorder for triangle
    // TODO: implement distanceToBorder for triangleDown

    case 'box':
    case 'image':
    case 'text':
    default:
      if (this.width) {
        return Math.min(
            Math.abs(this.width / 2 / Math.cos(angle)),
            Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
        // TODO: reckon with border radius too in case of box
      }
      else {
        return 0;
      }

  }

  // TODO: implement calculation of distance to border for all shapes
};

/**
 * Set forces acting on the node
 * @param {number} fx   Force in horizontal direction
 * @param {number} fy   Force in vertical direction
 */
Node.prototype._setForce = function(fx, fy) {
  this.fx = fx;
  this.fy = fy;
};

/**
 * Add forces acting on the node
 * @param {number} fx   Force in horizontal direction
 * @param {number} fy   Force in vertical direction
 * @private
 */
Node.prototype._addForce = function(fx, fy) {
  this.fx += fx;
  this.fy += fy;
};

/**
 * Perform one discrete step for the node
 * @param {number} interval    Time interval in seconds
 */
Node.prototype.discreteStep = function(interval) {
  if (!this.xFixed) {
    var dx   = -this.damping * this.vx;     // damping force
    var ax   = (this.fx + dx) / this.mass;  // acceleration
    this.vx += ax / interval;               // velocity
    this.x  += this.vx / interval;          // position
  }

  if (!this.yFixed) {
    var dy   = -this.damping * this.vy;     // damping force
    var ay   = (this.fy + dy) / this.mass;  // acceleration
    this.vy += ay / interval;               // velocity
    this.y  += this.vy / interval;          // position
  }
};


/**
 * Check if this node has a fixed x and y position
 * @return {boolean}      true if fixed, false if not
 */
Node.prototype.isFixed = function() {
  return (this.xFixed && this.yFixed);
};

/**
 * Check if this node is moving
 * @param {number} vmin   the minimum velocity considered as "moving"
 * @return {boolean}      true if moving, false if it has no velocity
 */
// TODO: replace this method with calculating the kinetic energy
Node.prototype.isMoving = function(vmin) {
  return (Math.abs(this.vx) > vmin || Math.abs(this.vy) > vmin ||
      (!this.xFixed && Math.abs(this.fx) > this.minForce) ||
      (!this.yFixed && Math.abs(this.fy) > this.minForce));
};

/**
 * check if this node is selecte
 * @return {boolean} selected   True if node is selected, else false
 */
Node.prototype.isSelected = function() {
  return this.selected;
};

/**
 * Retrieve the value of the node. Can be undefined
 * @return {Number} value
 */
Node.prototype.getValue = function() {
  return this.value;
};

/**
 * Calculate the distance from the nodes location to the given location (x,y)
 * @param {Number} x
 * @param {Number} y
 * @return {Number} value
 */
Node.prototype.getDistance = function(x, y) {
  var dx = this.x - x,
      dy = this.y - y;
  return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Adjust the value range of the node. The node will adjust it's radius
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Node.prototype.setValueRange = function(min, max) {
  if (!this.radiusFixed && this.value !== undefined) {
    if (max == min) {
      this.radius = (this.radiusMin + this.radiusMax) / 2;
    }
    else {
      var scale = (this.radiusMax - this.radiusMin) / (max - min);
      this.radius = (this.value - min) * scale + this.radiusMin;
    }
  }
};

/**
 * Draw this node in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Node.prototype.draw = function(ctx) {
  throw "Draw method not initialized for node";
};

/**
 * Recalculate the size of this node in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Node.prototype.resize = function(ctx) {
  throw "Resize method not initialized for node";
};

/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top, right, bottom
 * @return {boolean}     True if location is located on node
 */
Node.prototype.isOverlappingWith = function(obj) {
  return (this.left          < obj.right &&
      this.left + this.width > obj.left &&
      this.top               < obj.bottom &&
      this.top + this.height > obj.top);
};

Node.prototype._resizeImage = function (ctx) {
  // TODO: pre calculate the image size
  if (!this.width) {  // undefined or 0
    var width, height;
    if (this.value) {
      var scale = this.imageObj.height / this.imageObj.width;
      width = this.radius || this.imageObj.width;
      height = this.radius * scale || this.imageObj.height;
    }
    else {
      width = this.imageObj.width;
      height = this.imageObj.height;
    }
    this.width  = width;
    this.height = height;

    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawImage = function (ctx) {
  this._resizeImage(ctx);

  this.left   = this.x - this.width / 2;
  this.top    = this.y - this.height / 2;

  var yLabel;
  if (this.imageObj) {
    ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
    yLabel = this.y + this.height / 2;
  }
  else {
    // image still loading... just draw the label for now
    yLabel = this.y;
  }

  this._label(ctx, this.label, this.x, yLabel, undefined, "top");
};


Node.prototype._resizeBox = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    this.width = textSize.width + 2 * margin;
    this.height = textSize.height + 2 * margin;

    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawBox = function (ctx) {
  this._resizeBox(ctx);

  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  if (this.clusterSize > 1) {
    ctx.strokeStyle = this.selected ? this.color.cluster.highlight.border : this.color.cluster.border;
    ctx.fillStyle = this.selected ? this.color.cluster.highlight.background : this.color.cluster.background;
  }
  else {
    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
  }
  ctx.lineWidth = (this.selected ? 2.0 : 1.0) + (this.clusterSize > 1) ? 2.0 : 0.0;
  ctx.roundRect(this.left, this.top, this.width, this.height, this.radius);
  ctx.fill();
  ctx.stroke();

  this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._resizeDatabase = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    var size = textSize.width + 2 * margin;
    this.width = size;
    this.height = size;

    // scaling used for clustering
    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawDatabase = function (ctx) {
  this._resizeDatabase(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  if (this.clusterSize > 1) {
    ctx.strokeStyle = this.selected ? this.color.cluster.highlight.border : this.color.cluster.border;
    ctx.fillStyle = this.selected ? this.color.cluster.highlight.background : this.color.cluster.background;
  }
  else {
    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
  }
  ctx.lineWidth = (this.selected ? 2.0 : 1.0) + (this.clusterSize > 1) ? 2.0 : 0.0;
  ctx.database(this.x - this.width/2, this.y - this.height*0.5, this.width, this.height);
  ctx.fill();
  ctx.stroke();

  this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._resizeCircle = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    var diameter = Math.max(textSize.width, textSize.height) + 2 * margin;
    this.radius = diameter / 2;

    this.width = diameter;
    this.height = diameter;

    // scaling used for clustering
    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawCircle = function (ctx) {
  this._resizeCircle(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  if (this.clusterSize > 1) {
    ctx.strokeStyle = this.selected ? this.color.cluster.highlight.border : this.color.cluster.border;
    ctx.fillStyle = this.selected ? this.color.cluster.highlight.background : this.color.cluster.background;
  }
  else {
    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
  }
  ctx.lineWidth = (this.selected ? 2.0 : 1.0) + (this.clusterSize > 1) ? 2.0 : 0.0;
  ctx.circle(this.x, this.y, this.radius);
  ctx.fill();
  ctx.stroke();

  this._label(ctx, this.label, this.x, this.y);
};

Node.prototype._resizeEllipse = function (ctx) {
  if (!this.width) {
    var textSize = this.getTextSize(ctx);

    this.width = textSize.width * 1.5;
    this.height = textSize.height * 2;
    if (this.width < this.height) {
      this.width = this.height;
    }

    // scaling used for clustering
    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawEllipse = function (ctx) {
  this._resizeEllipse(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  if (this.clusterSize > 1) {
    ctx.strokeStyle = this.selected ? this.color.cluster.highlight.border : this.color.cluster.border;
    ctx.fillStyle = this.selected ? this.color.cluster.highlight.background : this.color.cluster.background;
  }
  else {
    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
  }
  ctx.lineWidth = (this.selected ? 2.0 : 1.0) + (this.clusterSize > 1) ? 2.0 : 0.0;
  ctx.ellipse(this.left, this.top, this.width, this.height);
  ctx.fill();
  ctx.stroke();
  this._label(ctx, this.label, this.x, this.y);
};

Node.prototype._drawDot = function (ctx) {
  this._drawShape(ctx, 'circle');
};

Node.prototype._drawTriangle = function (ctx) {
  this._drawShape(ctx, 'triangle');
};

Node.prototype._drawTriangleDown = function (ctx) {
  this._drawShape(ctx, 'triangleDown');
};

Node.prototype._drawSquare = function (ctx) {
  this._drawShape(ctx, 'square');
};

Node.prototype._drawStar = function (ctx) {
  this._drawShape(ctx, 'star');
};

Node.prototype._resizeShape = function (ctx) {
  if (!this.width) {
    var size = 2 * this.radius;
    this.width = size;
    this.height = size;

    // scaling used for clustering
    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawShape = function (ctx, shape) {
  this._resizeShape(ctx);

  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;
  if (this.clusterSize > 1) {
    ctx.strokeStyle = this.selected ? this.color.cluster.highlight.border : this.color.cluster.border;
    ctx.fillStyle = this.selected ? this.color.cluster.highlight.background : this.color.cluster.background;
  }
  else {
    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
  }
  ctx.lineWidth = (this.selected ? 2.0 : 1.0) + (this.clusterSize > 1) ? 2.0 : 0.0;

  ctx[shape](this.x, this.y, this.radius);
  ctx.fill();
  ctx.stroke();

  if (this.label) {
    this._label(ctx, this.label, this.x, this.y + this.height / 2, undefined, 'top');
  }
};

Node.prototype._resizeText = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    this.width = textSize.width + 2 * margin;
    this.height = textSize.height + 2 * margin;

    // scaling used for clustering
    this.width += this.clusterSize * this.clusterSizeWidthFactor;
    this.height += this.clusterSize * this.clusterSizeHeightFactor;
    this.radius += this.clusterSize * this.clusterSizeRadiusFactor;
  }
};

Node.prototype._drawText = function (ctx) {
  this._resizeText(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._label = function (ctx, text, x, y, align, baseline) {
  if (text) {
    ctx.font = (this.selected ? "bold " : "") + this.fontSize + "px " + this.fontFace;
    ctx.fillStyle = this.fontColor || "black";
    ctx.textAlign = align || "center";
    ctx.textBaseline = baseline || "middle";

    var lines = text.split('\n'),
        lineCount = lines.length,
        fontSize = (this.fontSize + 4),
        yLine = y + (1 - lineCount) / 2 * fontSize;

    for (var i = 0; i < lineCount; i++) {
      ctx.fillText(lines[i], x, yLine);
      yLine += fontSize;
    }
  }
};


Node.prototype.getTextSize = function(ctx) {
  if (this.label != undefined) {
    ctx.font = (this.selected ? "bold " : "") + this.fontSize + "px " + this.fontFace;

    var lines = this.label.split('\n'),
        height = (this.fontSize + 4) * lines.length,
        width = 0;

    for (var i = 0, iMax = lines.length; i < iMax; i++) {
      width = Math.max(width, ctx.measureText(lines[i]).width);
    }

    return {"width": width, "height": height};
  }
  else {
    return {"width": 0, "height": 0};
  }
};
