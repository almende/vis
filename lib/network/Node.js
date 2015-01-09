var util = require('../util');

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
 * @param {Network.Images} imagelist    A list with images. Only needed
 *                                            when the node has an image
 * @param {Network.Groups} grouplist    A list with groups. Needed for
 *                                            retrieving group properties
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 *
 */
function Node(properties, imagelist, grouplist, networkConstants) {
  var constants = util.selectiveBridgeObject(['nodes'],networkConstants);
  this.options = constants.nodes;

  this.selected = false;
  this.hover = false;

  this.edges = []; // all edges connected to this node
  this.dynamicEdges = [];
  this.reroutedEdges = {};

  this.fontDrawThreshold = 3;

  // set defaults for the properties
  this.id = undefined;
  this.allowedToMoveX = false;
  this.allowedToMoveY = false;
  this.xFixed = false;
  this.yFixed = false;
  this.horizontalAlignLeft = true; // these are for the navigation controls
  this.verticalAlignTop    = true; // these are for the navigation controls
  this.baseRadiusValue = networkConstants.nodes.radius;
  this.radiusFixed = false;
  this.level = -1;
  this.preassignedLevel = false;
  this.hierarchyEnumerated = false;
  this.labelDimensions = {top:0, left:0, width:0, height:0, yLine:0}; // could be cached
  this.boundingBox = {top:0, left:0, right:0, bottom:0};

  this.imagelist = imagelist;
  this.grouplist = grouplist;

  // physics properties
  this.fx = 0.0;  // external force x
  this.fy = 0.0;  // external force y
  this.vx = 0.0;  // velocity x
  this.vy = 0.0;  // velocity y
  this.x = null;
  this.y = null;

  // used for reverting to previous position on stabilization
  this.previousState = {vx:0,vy:0,x:0,y:0};

  this.damping = networkConstants.physics.damping; // written every time gravity is calculated
  this.fixedData = {x:null,y:null};

  this.setProperties(properties, constants);

  // creating the variables for clustering
  this.resetCluster();
  this.dynamicEdgesLength = 0;
  this.clusterSession = 0;
  this.clusterSizeWidthFactor  = networkConstants.clustering.nodeScaling.width;
  this.clusterSizeHeightFactor = networkConstants.clustering.nodeScaling.height;
  this.clusterSizeRadiusFactor = networkConstants.clustering.nodeScaling.radius;
  this.maxNodeSizeIncrements = networkConstants.clustering.maxNodeSizeIncrements;
  this.growthIndicator = 0;

  // variables to tell the node about the network.
  this.networkScaleInv = 1;
  this.networkScale = 1;
  this.canvasTopLeft = {"x": -300, "y": -300};
  this.canvasBottomRight = {"x":  300, "y":  300};
  this.parentEdgeId = null;
}


/**
 *  Revert the position and velocity of the previous step.
 */
Node.prototype.revertPosition = function() {
  this.x = this.previousState.x;
  this.y = this.previousState.y;
  this.vx = this.previousState.vx;
  this.vy = this.previousState.vy;
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
  this.clusterSessions = [];
};

/**
 * Attach a edge to the node
 * @param {Edge} edge
 */
Node.prototype.attachEdge = function(edge) {
  if (this.edges.indexOf(edge) == -1) {
    this.edges.push(edge);
  }
  if (this.dynamicEdges.indexOf(edge) == -1) {
    this.dynamicEdges.push(edge);
  }
  this.dynamicEdgesLength = this.dynamicEdges.length;
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
  index = this.dynamicEdges.indexOf(edge);
  if (index != -1) {
    this.dynamicEdges.splice(index, 1);
  }
  this.dynamicEdgesLength = this.dynamicEdges.length;
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

  var fields = ['borderWidth','borderWidthSelected','shape','image','brokenImage','radius','fontColor',
    'fontSize','fontFace','fontFill','group','mass'
  ];
  util.selectiveDeepExtend(fields, this.options, properties);

  // basic properties
  if (properties.id !== undefined)        {this.id = properties.id;}
  if (properties.label !== undefined)     {this.label = properties.label; this.originalLabel = properties.label;}
  if (properties.title !== undefined)     {this.title = properties.title;}
  if (properties.x !== undefined)         {this.x = properties.x;}
  if (properties.y !== undefined)         {this.y = properties.y;}
  if (properties.value !== undefined)     {this.value = properties.value;}
  if (properties.level !== undefined)     {this.level = properties.level; this.preassignedLevel = true;}

  // navigation controls properties
  if (properties.horizontalAlignLeft !== undefined) {this.horizontalAlignLeft = properties.horizontalAlignLeft;}
  if (properties.verticalAlignTop    !== undefined) {this.verticalAlignTop    = properties.verticalAlignTop;}
  if (properties.triggerFunction     !== undefined) {this.triggerFunction     = properties.triggerFunction;}

  if (this.id === undefined) {
    throw "Node must have an id";
  }

  // copy group properties
  if (typeof this.options.group === 'number' || (typeof this.options.group === 'string' && this.options.group != '')) {
    var groupObj = this.grouplist.get(this.options.group);
    util.deepExtend(this.options, groupObj);
    // the color object needs to be completely defined. Since groups can partially overwrite the colors, we parse it again, just in case.
    this.options.color = util.parseColor(this.options.color);
  }
  else if (properties.color === undefined) {
    this.options.color = constants.nodes.color;
  }

  // individual shape properties
  if (properties.radius !== undefined)         {this.baseRadiusValue = this.options.radius;}
  if (properties.color !== undefined)          {this.options.color = util.parseColor(properties.color);}
  if (this.options.image !== undefined && this.options.image!= "") {
    if (this.imagelist) {
      this.imageObj = this.imagelist.load(this.options.image, this.options.brokenImage);
    }
    else {
      throw "No imagelist provided";
    }
  }

  if (properties.allowedToMoveX !== undefined) {
    this.xFixed = !properties.allowedToMoveX;
    this.allowedToMoveX = properties.allowedToMoveX;
  }
  else if (properties.x !== undefined && this.allowedToMoveX == false) {
    this.xFixed = true;
  }


  if (properties.allowedToMoveY !== undefined) {
    this.yFixed = !properties.allowedToMoveY;
    this.allowedToMoveY = properties.allowedToMoveY;
  }
  else if (properties.y !== undefined && this.allowedToMoveY == false) {
    this.yFixed = true;
  }

  this.radiusFixed = this.radiusFixed || (properties.radius !== undefined);

  if (this.options.shape === 'image' || this.options.shape === 'circularImage') {
    this.options.radiusMin = constants.nodes.widthMin;
    this.options.radiusMax = constants.nodes.widthMax;
  }

  // choose draw method depending on the shape
  switch (this.options.shape) {
    case 'database':      this.draw = this._drawDatabase; this.resize = this._resizeDatabase; break;
    case 'box':           this.draw = this._drawBox; this.resize = this._resizeBox; break;
    case 'circle':        this.draw = this._drawCircle; this.resize = this._resizeCircle; break;
    case 'ellipse':       this.draw = this._drawEllipse; this.resize = this._resizeEllipse; break;
    // TODO: add diamond shape
    case 'image':         this.draw = this._drawImage; this.resize = this._resizeImage; break;
    case 'circularImage': this.draw = this._drawCircularImage; this.resize = this._resizeCircularImage; break;
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
  return typeof this.title === "function" ? this.title() : this.title;
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

  switch (this.options.shape) {
    case 'circle':
    case 'dot':
      return this.options.radius+ borderWidth;

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
 * Store the state before the next step
 */
Node.prototype.storeState = function() {
  this.previousState.x = this.x;
  this.previousState.y = this.y;
  this.previousState.vx = this.vx;
  this.previousState.vy = this.vy;
}

/**
 * Perform one discrete step for the node
 * @param {number} interval    Time interval in seconds
 */
Node.prototype.discreteStep = function(interval) {
  this.storeState();
  if (!this.xFixed) {
    var dx   = this.damping * this.vx;     // damping force
    var ax   = (this.fx - dx) / this.options.mass;  // acceleration
    this.vx += ax * interval;               // velocity
    this.x  += this.vx * interval;          // position
  }
  else {
    this.fx = 0;
    this.vx = 0;
  }

  if (!this.yFixed) {
    var dy   = this.damping * this.vy;     // damping force
    var ay   = (this.fy - dy) / this.options.mass;  // acceleration
    this.vy += ay * interval;               // velocity
    this.y  += this.vy * interval;          // position
  }
  else {
    this.fy = 0;
    this.vy = 0;
  }
};



/**
 * Perform one discrete step for the node
 * @param {number} interval    Time interval in seconds
 * @param {number} maxVelocity The speed limit imposed on the velocity
 */
Node.prototype.discreteStepLimited = function(interval, maxVelocity) {
  this.storeState();
  if (!this.xFixed) {
    var dx   = this.damping * this.vx;     // damping force
    var ax   = (this.fx - dx) / this.options.mass;  // acceleration
    this.vx += ax * interval;               // velocity
    this.vx = (Math.abs(this.vx) > maxVelocity) ? ((this.vx > 0) ? maxVelocity : -maxVelocity) : this.vx;
    this.x  += this.vx * interval;          // position
  }
  else {
    this.fx = 0;
    this.vx = 0;
  }

  if (!this.yFixed) {
    var dy   = this.damping * this.vy;     // damping force
    var ay   = (this.fy - dy) / this.options.mass;  // acceleration
    this.vy += ay * interval;               // velocity
    this.vy = (Math.abs(this.vy) > maxVelocity) ? ((this.vy > 0) ? maxVelocity : -maxVelocity) : this.vy;
    this.y  += this.vy * interval;          // position
  }
  else {
    this.fy = 0;
    this.vy = 0;
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
Node.prototype.isMoving = function(vmin) {
  var velocity = Math.sqrt(Math.pow(this.vx,2) + Math.pow(this.vy,2));
//  this.velocity = Math.sqrt(Math.pow(this.vx,2) + Math.pow(this.vy,2))
  return (velocity > vmin);
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
      this.options.radius= (this.options.radiusMin + this.options.radiusMax) / 2;
    }
    else {
      var scale = (this.options.radiusMax - this.options.radiusMin) / (max - min);
      this.options.radius= (this.value - min) * scale + this.options.radiusMin;
    }
  }
  this.baseRadiusValue = this.options.radius;
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
  return (this.left              < obj.right  &&
          this.left + this.width > obj.left   &&
          this.top               < obj.bottom &&
          this.top + this.height > obj.top);
};

Node.prototype._resizeImage = function (ctx) {
  // TODO: pre calculate the image size

  if (!this.width || !this.height) {  // undefined or 0
    var width, height;
    if (this.value) {
      this.options.radius= this.baseRadiusValue;
      var scale = this.imageObj.height / this.imageObj.width;
      if (scale !== undefined) {
        width = this.options.radius|| this.imageObj.width;
        height = this.options.radius* scale || this.imageObj.height;
      }
      else {
        width = 0;
        height = 0;
      }
    }
    else {
      width = this.imageObj.width;
      height = this.imageObj.height;
    }
    this.width  = width;
    this.height = height;

    this.growthIndicator = 0;
    if (this.width > 0 && this.height > 0) {
      this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements)  * this.clusterSizeWidthFactor;
      this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeHeightFactor;
      this.options.radius+= Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeRadiusFactor;
      this.growthIndicator = this.width - width;
    }
  }

};

Node.prototype._drawImageAtPosition = function (ctx) {
  if (this.imageObj.width != 0 ) {
    // draw the shade
    if (this.clusterSize > 1) {
      var lineWidth = ((this.clusterSize > 1) ? 10 : 0.0);
      lineWidth *= this.networkScaleInv;
      lineWidth = Math.min(0.2 * this.width,lineWidth);

      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.imageObj, this.left - lineWidth, this.top - lineWidth, this.width + 2*lineWidth, this.height + 2*lineWidth);
    }

    // draw the image
    ctx.globalAlpha = 1.0;
    ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
  }
};

Node.prototype._drawImageLabel = function (ctx) {
  var yLabel;
  if (this.imageObj.width != 0 ) {
    
    yLabel = this.y + this.height / 2;
  }
  else {
    // image still loading... just draw the label for now
    yLabel = this.y;
  }

  this._label(ctx, this.label, this.x, yLabel, undefined, "top");
};

Node.prototype._drawImage = function (ctx) {
  this._resizeImage(ctx);
  this.left   = this.x - this.width / 2;
  this.top    = this.y - this.height / 2;

  this._drawImageAtPosition(ctx);

  this.boundingBox.top = this.top;
  this.boundingBox.left = this.left;
  this.boundingBox.right = this.left + this.width;
  this.boundingBox.bottom = this.top + this.height;

  this._drawImageLabel(ctx);
  this.boundingBox.left = Math.min(this.boundingBox.left, this.labelDimensions.left);
  this.boundingBox.right = Math.max(this.boundingBox.right, this.labelDimensions.left + this.labelDimensions.width);
  this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelDimensions.height);
};

Node.prototype._resizeCircularImage = function (ctx) {
  this._resizeImage(ctx);
};

Node.prototype._drawCircularImage = function (ctx) {
  this._resizeCircularImage(ctx);

  this.left   = this.x - this.width / 2;
  this.top    = this.y - this.height / 2;
  
  var centerX = this.left + (this.width / 2);
  var centerY = this.top + (this.height / 2);
  var radius = Math.abs(this.height / 2);

  this._drawRawCircle(ctx, centerX, centerY, radius);

  ctx.save();
  ctx.circle(this.x, this.y, radius);
  ctx.stroke();
  ctx.clip();

  this._drawImageAtPosition(ctx);

  ctx.restore();

  this.boundingBox.top = this.y - this.options.radius;
  this.boundingBox.left = this.x - this.options.radius;
  this.boundingBox.right = this.x + this.options.radius;
  this.boundingBox.bottom = this.y + this.options.radius;

  this._drawImageLabel(ctx); 
  
  this.boundingBox.left = Math.min(this.boundingBox.left, this.labelDimensions.left);
  this.boundingBox.right = Math.max(this.boundingBox.right, this.labelDimensions.left + this.labelDimensions.width);
  this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelDimensions.height);
};

Node.prototype._resizeBox = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    this.width = textSize.width + 2 * margin;
    this.height = textSize.height + 2 * margin;

    this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeWidthFactor;
    this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeHeightFactor;
    this.growthIndicator = this.width - (textSize.width + 2 * margin);
//    this.options.radius+= Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeRadiusFactor;

  }
};

Node.prototype._drawBox = function (ctx) {
  this._resizeBox(ctx);

  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  var clusterLineWidth = 2.5;
  var borderWidth = this.options.borderWidth;
  var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

  ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;

  // draw the outer border
  if (this.clusterSize > 1) {
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

    ctx.roundRect(this.left-2*ctx.lineWidth, this.top-2*ctx.lineWidth, this.width+4*ctx.lineWidth, this.height+4*ctx.lineWidth, this.options.radius);
    ctx.stroke();
  }
  ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
  ctx.lineWidth *= this.networkScaleInv;
  ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

  ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;

  ctx.roundRect(this.left, this.top, this.width, this.height, this.options.radius);
  ctx.fill();
  ctx.stroke();

  this.boundingBox.top = this.top;
  this.boundingBox.left = this.left;
  this.boundingBox.right = this.left + this.width;
  this.boundingBox.bottom = this.top + this.height;

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
    this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeWidthFactor;
    this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeHeightFactor;
    this.options.radius+= Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeRadiusFactor;
    this.growthIndicator = this.width - size;
  }
};

Node.prototype._drawDatabase = function (ctx) {
  this._resizeDatabase(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  var clusterLineWidth = 2.5;
  var borderWidth = this.options.borderWidth;
  var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

  ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;

  // draw the outer border
  if (this.clusterSize > 1) {
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

    ctx.database(this.x - this.width/2 - 2*ctx.lineWidth, this.y - this.height*0.5 - 2*ctx.lineWidth, this.width + 4*ctx.lineWidth, this.height + 4*ctx.lineWidth);
    ctx.stroke();
  }
  ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
  ctx.lineWidth *= this.networkScaleInv;
  ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

  ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;
  ctx.database(this.x - this.width/2, this.y - this.height*0.5, this.width, this.height);
  ctx.fill();
  ctx.stroke();

  this.boundingBox.top = this.top;
  this.boundingBox.left = this.left;
  this.boundingBox.right = this.left + this.width;
  this.boundingBox.bottom = this.top + this.height;

  this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._resizeCircle = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    var diameter = Math.max(textSize.width, textSize.height) + 2 * margin;
    this.options.radius = diameter / 2;

    this.width = diameter;
    this.height = diameter;

    // scaling used for clustering
//    this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeWidthFactor;
//    this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeHeightFactor;
    this.options.radius += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeRadiusFactor;
    this.growthIndicator = this.options.radius- 0.5*diameter;
  }
};

Node.prototype._drawRawCircle = function (ctx, x, y, radius) {
  var clusterLineWidth = 2.5;
  var borderWidth = this.options.borderWidth;
  var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;
    
  ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;

  // draw the outer border
  if (this.clusterSize > 1) {
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

    ctx.circle(x, y, radius+2*ctx.lineWidth);
    ctx.stroke();
  }
  ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
  ctx.lineWidth *= this.networkScaleInv;
  ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

  ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;
  ctx.circle(this.x, this.y, radius);
  ctx.fill();
  ctx.stroke();
};

Node.prototype._drawCircle = function (ctx) {
  this._resizeCircle(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  this._drawRawCircle(ctx, this.x, this.y, this.options.radius);

  this.boundingBox.top = this.y - this.options.radius;
  this.boundingBox.left = this.x - this.options.radius;
  this.boundingBox.right = this.x + this.options.radius;
  this.boundingBox.bottom = this.y + this.options.radius;

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
    var defaultSize = this.width;

    // scaling used for clustering
    this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeWidthFactor;
    this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeHeightFactor;
    this.options.radius += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeRadiusFactor;
    this.growthIndicator = this.width - defaultSize;
  }
};

Node.prototype._drawEllipse = function (ctx) {
  this._resizeEllipse(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  var clusterLineWidth = 2.5;
  var borderWidth = this.options.borderWidth;
  var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

  ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;

  // draw the outer border
  if (this.clusterSize > 1) {
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

    ctx.ellipse(this.left-2*ctx.lineWidth, this.top-2*ctx.lineWidth, this.width+4*ctx.lineWidth, this.height+4*ctx.lineWidth);
    ctx.stroke();
  }
  ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
  ctx.lineWidth *= this.networkScaleInv;
  ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

  ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;

  ctx.ellipse(this.left, this.top, this.width, this.height);
  ctx.fill();
  ctx.stroke();

  this.boundingBox.top = this.top;
  this.boundingBox.left = this.left;
  this.boundingBox.right = this.left + this.width;
  this.boundingBox.bottom = this.top + this.height;

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
    this.options.radius= this.baseRadiusValue;
    var size = 2 * this.options.radius;
    this.width = size;
    this.height = size;

    // scaling used for clustering
    this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeWidthFactor;
    this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeHeightFactor;
    this.options.radius+= Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * 0.5 * this.clusterSizeRadiusFactor;
    this.growthIndicator = this.width - size;
  }
};

Node.prototype._drawShape = function (ctx, shape) {
  this._resizeShape(ctx);

  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  var clusterLineWidth = 2.5;
  var borderWidth = this.options.borderWidth;
  var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;
  var radiusMultiplier = 2;

  // choose draw method depending on the shape
  switch (shape) {
    case 'dot':           radiusMultiplier = 2; break;
    case 'square':        radiusMultiplier = 2; break;
    case 'triangle':      radiusMultiplier = 3; break;
    case 'triangleDown':  radiusMultiplier = 3; break;
    case 'star':          radiusMultiplier = 4; break;
  }

  ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;
  // draw the outer border
  if (this.clusterSize > 1) {
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

    ctx[shape](this.x, this.y, this.options.radius+ radiusMultiplier * ctx.lineWidth);
    ctx.stroke();
  }
  ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth) + ((this.clusterSize > 1) ? clusterLineWidth : 0.0);
  ctx.lineWidth *= this.networkScaleInv;
  ctx.lineWidth = Math.min(this.width,ctx.lineWidth);

  ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;
  ctx[shape](this.x, this.y, this.options.radius);
  ctx.fill();
  ctx.stroke();

  this.boundingBox.top = this.y - this.options.radius;
  this.boundingBox.left = this.x - this.options.radius;
  this.boundingBox.right = this.x + this.options.radius;
  this.boundingBox.bottom = this.y + this.options.radius;

  if (this.label) {
    this._label(ctx, this.label, this.x, this.y + this.height / 2, undefined, 'top',true);
    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelDimensions.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelDimensions.left + this.labelDimensions.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelDimensions.height);
  }
};

Node.prototype._resizeText = function (ctx) {
  if (!this.width) {
    var margin = 5;
    var textSize = this.getTextSize(ctx);
    this.width = textSize.width + 2 * margin;
    this.height = textSize.height + 2 * margin;

    // scaling used for clustering
    this.width  += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeWidthFactor;
    this.height += Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeHeightFactor;
    this.options.radius+= Math.min(this.clusterSize - 1, this.maxNodeSizeIncrements) * this.clusterSizeRadiusFactor;
    this.growthIndicator = this.width - (textSize.width + 2 * margin);
  }
};

Node.prototype._drawText = function (ctx) {
  this._resizeText(ctx);
  this.left = this.x - this.width / 2;
  this.top = this.y - this.height / 2;

  this._label(ctx, this.label, this.x, this.y);

  this.boundingBox.top = this.top;
  this.boundingBox.left = this.left;
  this.boundingBox.right = this.left + this.width;
  this.boundingBox.bottom = this.top + this.height;
};


Node.prototype._label = function (ctx, text, x, y, align, baseline, labelUnderNode) {
  if (text && Number(this.options.fontSize) * this.networkScale > this.fontDrawThreshold) {
    ctx.font = (this.selected ? "bold " : "") + this.options.fontSize + "px " + this.options.fontFace;

    var lines = text.split('\n');
    var lineCount = lines.length;
    var fontSize = (Number(this.options.fontSize) + 4); // TODO: why is this +4 ?
    var yLine = y + (1 - lineCount) / 2 * fontSize;
    if (labelUnderNode == true) {
      yLine = y + (1 - lineCount) / (2 * fontSize);
    }

    // font fill from edges now for nodes!
    var width = ctx.measureText(lines[0]).width;
    for (var i = 1; i < lineCount; i++) {
      var lineWidth = ctx.measureText(lines[i]).width;
      width = lineWidth > width ? lineWidth : width;
    }
    var height = this.options.fontSize * lineCount;
    var left = x - width / 2;
    var top = y - height / 2;
    if (baseline == "top") {
      top += 0.5 * fontSize;
    }
    this.labelDimensions = {top:top,left:left,width:width,height:height,yLine:yLine};

    // create the fontfill background
    if (this.options.fontFill !== undefined && this.options.fontFill !== null && this.options.fontFill !== "none") {
      ctx.fillStyle = this.options.fontFill;
      ctx.fillRect(left, top, width, height);
    }

    // draw text
    ctx.fillStyle = this.options.fontColor || "black";
    ctx.textAlign = align || "center";
    ctx.textBaseline = baseline || "middle";
    for (var i = 0; i < lineCount; i++) {
      ctx.fillText(lines[i], x, yLine);
      yLine += fontSize;
    }
  }
};


Node.prototype.getTextSize = function(ctx) {
  if (this.label !== undefined) {
    ctx.font = (this.selected ? "bold " : "") + this.options.fontSize + "px " + this.options.fontFace;

    var lines = this.label.split('\n'),
        height = (Number(this.options.fontSize) + 4) * lines.length,
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

/**
 * this is used to determine if a node is visible at all. this is used to determine when it needs to be drawn.
 * there is a safety margin of 0.3 * width;
 *
 * @returns {boolean}
 */
Node.prototype.inArea = function() {
  if (this.width !== undefined) {
  return (this.x + this.width *this.networkScaleInv  >= this.canvasTopLeft.x     &&
          this.x - this.width *this.networkScaleInv  <  this.canvasBottomRight.x &&
          this.y + this.height*this.networkScaleInv  >= this.canvasTopLeft.y     &&
          this.y - this.height*this.networkScaleInv  <  this.canvasBottomRight.y);
  }
  else {
    return true;
  }
};

/**
 * checks if the core of the node is in the display area, this is used for opening clusters around zoom
 * @returns {boolean}
 */
Node.prototype.inView = function() {
  return (this.x >= this.canvasTopLeft.x    &&
          this.x < this.canvasBottomRight.x &&
          this.y >= this.canvasTopLeft.y    &&
          this.y < this.canvasBottomRight.y);
};

/**
 * This allows the zoom level of the network to influence the rendering
 * We store the inverted scale and the coordinates of the top left, and bottom right points of the canvas
 *
 * @param scale
 * @param canvasTopLeft
 * @param canvasBottomRight
 */
Node.prototype.setScaleAndPos = function(scale,canvasTopLeft,canvasBottomRight) {
  this.networkScaleInv = 1.0/scale;
  this.networkScale = scale;
  this.canvasTopLeft = canvasTopLeft;
  this.canvasBottomRight = canvasBottomRight;
};


/**
 * This allows the zoom level of the network to influence the rendering
 *
 * @param scale
 */
Node.prototype.setScale = function(scale) {
  this.networkScaleInv = 1.0/scale;
  this.networkScale = scale;
};



/**
 * set the velocity at 0. Is called when this node is contained in another during clustering
 */
Node.prototype.clearVelocity = function() {
  this.vx = 0;
  this.vy = 0;
};


/**
 * Basic preservation of (kinectic) energy
 *
 * @param massBeforeClustering
 */
Node.prototype.updateVelocity = function(massBeforeClustering) {
  var energyBefore = this.vx * this.vx * massBeforeClustering;
  //this.vx = (this.vx < 0) ? -Math.sqrt(energyBefore/this.options.mass) : Math.sqrt(energyBefore/this.options.mass);
  this.vx = Math.sqrt(energyBefore/this.options.mass);
  energyBefore = this.vy * this.vy * massBeforeClustering;
  //this.vy = (this.vy < 0) ? -Math.sqrt(energyBefore/this.options.mass) : Math.sqrt(energyBefore/this.options.mass);
  this.vy = Math.sqrt(energyBefore/this.options.mass);
};

module.exports = Node;
