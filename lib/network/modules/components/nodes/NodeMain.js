var util = require('../../../../util');


import Label from '../unified/label.js'
/**
 * @class Node
 * A node. A node can be connected to other nodes via one or multiple edges.
 * @param {object} options An object containing options for the node. All
 *                            options are optional, except for the id.
 *                              {number} id     Id of the node. Required
 *                              {string} label  Text label for the node
 *                              {number} x      Horizontal position of the node
 *                              {number} y      Vertical position of the node
 *                              {string} shape  Node shape, available:
 *                                              "database", "circle", "ellipse",
 *                                              "box", "image", "text", "dot",
 *                                              "star", "triangle", "triangleDown",
 *                                              "square", "icon"
 *                              {string} image  An image url
 *                              {string} title  An title text, can be HTML
 *                              {anytype} group A group name or number
 * @param {Network.Images} imagelist    A list with images. Only needed
 *                                            when the node has an image
 * @param {Network.Groups} grouplist    A list with groups. Needed for
 *                                            retrieving group options
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 *
 */
class Node {
  constructor(options, body, imagelist, grouplist, globalOptions) {
    this.options = util.bridgeObject(globalOptions);

    this.selected = false;
    this.hover = false;

    this.edges = []; // all edges connected to this node

    // set defaults for the options
    this.id = undefined;
    this.allowedToMoveX = false;
    this.allowedToMoveY = false;
    this.xFixed = false;
    this.yFixed = false;

    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};

    this.imagelist = imagelist;
    this.grouplist = grouplist;

    // physics options
    this.x = null;
    this.y = null;
    this.predefinedPosition = false; // used to check if initial zoomExtent should just take the range or approximate

    this.fixedData = {x: null, y: null};
    this.labelModule = new Label(body, this.options);

    this.setOptions(options);
  }


  /**
   * Attach a edge to the node
   * @param {Edge} edge
   */
  attachEdge(edge) {
    if (this.edges.indexOf(edge) == -1) {
      this.edges.push(edge);
    }
  }


  /**
   * Detach a edge from the node
   * @param {Edge} edge
   */
  detachEdge(edge) {
    var index = this.edges.indexOf(edge);
    if (index != -1) {
      this.edges.splice(index, 1);
    }
  }



  /**
   * Set or overwrite options for the node
   * @param {Object} options an object with options
   * @param {Object} constants  and object with default, global options
   */
  setOptions(options) {
    if (!options) {
      return;
    }

    var fields = [
      'borderWidth',
      'borderWidthSelected',
      'shape',
      'image',
      'brokenImage',
      'size',
      'label',
      'customScalingFunction',
      'icon',
      'value',
      'hidden',
      'physics'
    ];
    util.selectiveDeepExtend(fields, this.options, options);

    // basic options
    if (options.id !== undefined) {
      this.id = options.id;
    }
    if (options.title !== undefined) {
      this.title = options.title;
    }
    if (options.x !== undefined) {
      this.x = options.x;
      this.predefinedPosition = true;
    }
    if (options.y !== undefined) {
      this.y = options.y;
      this.predefinedPosition = true;
    }
    if (options.value !== undefined) {
      this.value = options.value;
    }
    if (options.level !== undefined) {
      this.level = options.level;
      this.preassignedLevel = true;
    }

    if (options.triggerFunction !== undefined) {
      this.triggerFunction = options.triggerFunction;
    }

    if (this.id === undefined) {
      throw "Node must have an id";
    }

    // copy group options
    if (typeof options.group === 'number' || (typeof options.group === 'string' && options.group != '')) {
      var groupObj = this.grouplist.get(options.group);
      util.deepExtend(this.options, groupObj);
      // the color object needs to be completely defined. Since groups can partially overwrite the colors, we parse it again, just in case.
      this.options.color = util.parseColor(this.options.color);
    }
    // individual shape options
    if (options.color !== undefined) {
      this.options.color = util.parseColor(options.color);
    }

    if (this.options.image !== undefined && this.options.image != "") {
      if (this.imagelist) {
        this.imageObj = this.imagelist.load(this.options.image, this.options.brokenImage);
      }
      else {
        throw "No imagelist provided";
      }
    }

    if (options.allowedToMoveX !== undefined) {
      this.xFixed = !options.allowedToMoveX;
      this.allowedToMoveX = options.allowedToMoveX;
    }
    else if (options.x !== undefined && this.allowedToMoveX == false) {
      this.xFixed = true;
    }


    if (options.allowedToMoveY !== undefined) {
      this.yFixed = !options.allowedToMoveY;
      this.allowedToMoveY = options.allowedToMoveY;
    }
    else if (options.y !== undefined && this.allowedToMoveY == false) {
      this.yFixed = true;
    }

    // choose draw method depending on the shape
    switch (this.options.shape) {
      case 'database':
        this.draw = this._drawDatabase;
        this.resize = this._resizeDatabase;
        break;
      case 'box':
        this.draw = this._drawBox;
        this.resize = this._resizeBox;
        break;
      case 'circle':
        this.draw = this._drawCircle;
        this.resize = this._resizeCircle;
        break;
      case 'ellipse':
        this.draw = this._drawEllipse;
        this.resize = this._resizeEllipse;
        break;
      // TODO: add diamond shape
      case 'image':
        this.draw = this._drawImage;
        this.resize = this._resizeImage;
        break;
      case 'circularImage':
        this.draw = this._drawCircularImage;
        this.resize = this._resizeCircularImage;
        break;
      case 'text':
        this.draw = this._drawText;
        this.resize = this._resizeText;
        break;
      case 'dot':
        this.draw = this._drawDot;
        this.resize = this._resizeShape;
        break;
      case 'square':
        this.draw = this._drawSquare;
        this.resize = this._resizeShape;
        break;
      case 'triangle':
        this.draw = this._drawTriangle;
        this.resize = this._resizeShape;
        break;
      case 'triangleDown':
        this.draw = this._drawTriangleDown;
        this.resize = this._resizeShape;
        break;
      case 'star':
        this.draw = this._drawStar;
        this.resize = this._resizeShape;
        break;
      case 'icon':
        this.draw = this._drawIcon;
        this.resize = this._resizeIcon;
        break;
      default:
        this.draw = this._drawEllipse;
        this.resize = this._resizeEllipse;
        break;
    }

    this.labelModule.setOptions(this.options);

    // reset the size of the node, this can be changed
    this._reset();

  }


  /**
   * select this node
   */
  select() {
    this.selected = true;
    this._reset();
  }


  /**
   * unselect this node
   */
  unselect() {
    this.selected = false;
    this._reset();
  }



  /**
   * Reset the calculated size of the node, forces it to recalculate its size
   * @private
   */
  _reset() {
    this.width = undefined;
    this.height = undefined;
  }


  /**
   * get the title of this node.
   * @return {string} title    The title of the node, or undefined when no title
   *                           has been set.
   */
  getTitle() {
    return typeof this.title === "function" ? this.title() : this.title;
  }


  /**
   * Calculate the distance to the border of the Node
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Number} angle        Angle in radians
   * @returns {number} distance   Distance to the border in pixels
   */
  distanceToBorder(ctx, angle) {
    var borderWidth = 1;

    if (!this.width) {
      this.resize(ctx);
    }

    switch (this.options.shape) {
      case 'circle':
      case 'dot':
        return this.options.size + borderWidth;

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
          // TODO: reckon with border size too in case of box
        }
        else {
          return 0;
        }

    }
    // TODO: implement calculation of distance to border for all shapes
  }


  /**
   * Check if this node has a fixed x and y position
   * @return {boolean}      true if fixed, false if not
   */
  isFixed() {
    return (this.xFixed && this.yFixed);
  }


  /**
   * check if this node is selecte
   * @return {boolean} selected   True if node is selected, else false
   */
  isSelected() {
    return this.selected;
  }


  /**
   * Retrieve the value of the node. Can be undefined
   * @return {Number} value
   */
  getValue() {
    return this.value;
  }


  /**
   * Adjust the value range of the node. The node will adjust it's size
   * based on its value.
   * @param {Number} min
   * @param {Number} max
   */
  setValueRange(min, max, total) {
    if (this.value !== undefined) {
      var scale = this.options.scaling.customScalingFunction(min, max, total, this.value);
      var sizeDiff = this.options.scaling.max - this.options.scaling.min;
      if (this.options.scaling.label.enabled == true) {
        var fontDiff = this.options.scaling.label.max - this.options.scaling.label.min;
        this.options.font.size = this.options.scaling.label.min + scale * fontDiff;
      }
      this.options.size = this.options.scaling.min + scale * sizeDiff;
    }
  }


  /**
   * Draw this node in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  draw(ctx) {
    throw "Draw method not initialized for node";
  }


  /**
   * Recalculate the size of this node in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  resize(ctx) {
    throw "Resize method not initialized for node";
  }


  /**
   * Check if this object is overlapping with the provided object
   * @param {Object} obj   an object with parameters left, top, right, bottom
   * @return {boolean}     True if location is located on node
   */
  isOverlappingWith(obj) {
    return (this.left < obj.right &&
    this.left + this.width > obj.left &&
    this.top < obj.bottom &&
    this.top + this.height > obj.top);
  }


  _resizeImage(ctx) {
    // TODO: pre calculate the image size

    if (!this.width || !this.height) {  // undefined or 0
      var width, height;
      if (this.value) {
        var scale = this.imageObj.height / this.imageObj.width;
        if (scale !== undefined) {
          width = this.options.size || this.imageObj.width;
          height = this.options.size * scale || this.imageObj.height;
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
      this.width = width;
      this.height = height;
    }
  }


  _drawImageAtPosition(ctx) {
    if (this.imageObj.width != 0) {
      // draw the image
      ctx.globalAlpha = 1.0;
      ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
    }
  }


  _drawImageLabel(ctx) {
    var yLabel;
    var offset = 0;

    if (this.height) {
      offset = this.height / 2;
      var labelDimensions = this.labelModule.labelDimensions;

      if (labelDimensions.lineCount >= 1) {
        offset += labelDimensions.height / 2;
        offset += 3;
      }
    }

    yLabel = this.y + offset;

    this.labelModule.draw(ctx, this.x, yLabel);
  }


  _drawImage(ctx) {
    this._resizeImage(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    this._drawImageAtPosition(ctx);

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    this._drawImageLabel(ctx);
    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
  }


  _resizeCircularImage(ctx) {
    if (!this.imageObj.src || !this.imageObj.width || !this.imageObj.height) {
      if (!this.width) {
        var diameter = this.options.size * 2;
        this.width = diameter;
        this.height = diameter;
        this._swapToImageResizeWhenImageLoaded = true;
      }
    }
    else {
      if (this._swapToImageResizeWhenImageLoaded) {
        this.width = 0;
        this.height = 0;
        delete this._swapToImageResizeWhenImageLoaded;
      }
      this._resizeImage(ctx);
    }

  }


  _drawCircularImage(ctx) {
    this._resizeCircularImage(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    var centerX = this.left + (this.width / 2);
    var centerY = this.top + (this.height / 2);
    var size = Math.abs(this.height / 2);

    this._drawRawCircle(ctx, size);

    ctx.save();
    ctx.circle(this.x, this.y, size);
    ctx.stroke();
    ctx.clip();

    this._drawImageAtPosition(ctx);

    ctx.restore();

    this.boundingBox.top = this.y - this.options.size;
    this.boundingBox.left = this.x - this.options.size;
    this.boundingBox.right = this.x + this.options.size;
    this.boundingBox.bottom = this.y + this.options.size;

    this._drawImageLabel(ctx);

    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
  }


  _resizeBox(ctx) {
    if (!this.width) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx,this.selected);
      this.width = textSize.width + 2 * margin;
      this.height = textSize.height + 2 * margin;
    }
  }


  _drawBox(ctx) {
    this._resizeBox(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;

    ctx.roundRect(this.left, this.top, this.width, this.height, this.options.size);
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    this.labelModule.draw(ctx, this.x, this.y);
  }


  _resizeDatabase(ctx) {
    if (!this.width) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx,this.selected);
      var size = textSize.width + 2 * margin;
      this.width = size;
      this.height = size;
    }
  }


  _drawDatabase(ctx) {
    this._resizeDatabase(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;
    ctx.database(this.x - this.width / 2, this.y - this.height * 0.5, this.width, this.height);
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    this.labelModule.draw(ctx, this.x, this.y);
  }


  _resizeCircle(ctx) {
    if (!this.width) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx,this.selected);
      var diameter = Math.max(textSize.width, textSize.height) + 2 * margin;
      this.options.size = diameter / 2;

      this.width = diameter;
      this.height = diameter;
    }
  }


  _drawRawCircle(ctx, size) {
    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;

    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;
    ctx.circle(this.x, this.y, size);
    ctx.fill();
    ctx.stroke();
  }


  _drawCircle(ctx) {
    this._resizeCircle(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    this._drawRawCircle(ctx, this.options.size);

    this.boundingBox.top = this.y - this.options.size;
    this.boundingBox.left = this.x - this.options.size;
    this.boundingBox.right = this.x + this.options.size;
    this.boundingBox.bottom = this.y + this.options.size;

    this.labelModule.draw(ctx, this.x, this.y);
  }


  _resizeEllipse(ctx) {
    if (this.width === undefined) {
      var textSize = this.labelModule.getTextSize(ctx,this.selected);

      this.width = textSize.width * 1.5;
      this.height = textSize.height * 2;
      if (this.width < this.height) {
        this.width = this.height;
      }
    }
  }


  _drawEllipse(ctx) {
    this._resizeEllipse(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;

    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;

    ctx.ellipse(this.left, this.top, this.width, this.height);
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    this.labelModule.draw(ctx, this.x, this.y, this.selected);
  }


  _drawDot(ctx) {
    this._drawShape(ctx, 'circle');
  }


  _drawTriangle(ctx) {
    this._drawShape(ctx, 'triangle');
  }


  _drawTriangleDown(ctx) {
    this._drawShape(ctx, 'triangleDown');
  }


  _drawSquare(ctx) {
    this._drawShape(ctx, 'square');
  }


  _drawStar(ctx) {
    this._drawShape(ctx, 'star');
  }


  _resizeShape(ctx) {
    if (!this.width) {
      var size = 2 * this.options.size;
      this.width = size;
      this.height = size;
    }
  }


  _drawShape(ctx, shape) {
    this._resizeShape(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;
    var sizeMultiplier = 2;

    // choose draw method depending on the shape
    switch (shape) {
      case 'dot':
        sizeMultiplier = 2;
        break;
      case 'square':
        sizeMultiplier = 2;
        break;
      case 'triangle':
        sizeMultiplier = 3;
        break;
      case 'triangleDown':
        sizeMultiplier = 3;
        break;
      case 'star':
        sizeMultiplier = 4;
        break;
    }

    ctx.strokeStyle = this.selected ? this.options.color.highlight.border : this.hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = this.selected ? this.options.color.highlight.background : this.hover ? this.options.color.hover.background : this.options.color.background;
    ctx[shape](this.x, this.y, this.options.size);
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = this.y - this.options.size;
    this.boundingBox.left = this.x - this.options.size;
    this.boundingBox.right = this.x + this.options.size;
    this.boundingBox.bottom = this.y + this.options.size;

    if (this.options.label!== undefined) {
      this.labelModule.draw(ctx, this.x, this.y + (this.height + this.labelModule.size.height)*0.5, this.selected, 'hanging');
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
    }
  }


  _resizeText(ctx) {
    if (!this.width) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx,this.selected);
      this.width = textSize.width + 2 * margin;
      this.height = textSize.height + 2 * margin;
    }
  }


  _drawText(ctx) {
    this._resizeText(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    this.labelModule.draw(ctx, this.x, this.y);

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;
  }


  _resizeIcon(ctx) {
    if (!this.width) {
      var margin = 5;
      var iconSize =
      {
        width: Number(this.options.icon.iconSize),
        height: Number(this.options.icon.iconSize)
      };
      this.width = iconSize.width + 2 * margin;
      this.height = iconSize.height + 2 * margin;
    }
  }


  _drawIcon(ctx) {
    this._resizeIcon(ctx);

    this.options.icon.iconSize = this.options.icon.iconSize || 50;

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;
    this._icon(ctx);


    this.boundingBox.top = this.y - this.options.icon.iconSize / 2;
    this.boundingBox.left = this.x - this.options.icon.iconSize / 2;
    this.boundingBox.right = this.x + this.options.icon.iconSize / 2;
    this.boundingBox.bottom = this.y + this.options.icon.iconSize / 2;

    if (this.options.label!== unde) {
      var iconTextSpacing = 5;
      this.labelModule.draw(ctx, this.x, this.y + this.height / 2 + iconTextSpacing);

      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
    }
  }


  _icon(ctx) {
    var relativeIconSize = Number(this.options.icon.iconSize) * this.networkScale;

    if (this.options.icon.code && relativeIconSize > this.options.scaling.label.drawThreshold - 1) {

      var iconSize = Number(this.options.icon.iconSize);

      ctx.font = (this.selected ? "bold " : "") + iconSize + "px " + this.options.icon.iconFontFace;

      // draw icon
      ctx.fillStyle = this.options.icon.iconColor || "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.options.icon.code, this.x, this.y);
    }
  }

}

export default Node;
