var util = require('../../../util');

import Label from './unified/label'

import Box           from './nodes/shapes/box'
import Circle        from './nodes/shapes/circle'
import CircularImage from './nodes/shapes/circularImage'
import Database      from './nodes/shapes/database'
import Dot           from './nodes/shapes/dot'
import Ellipse       from './nodes/shapes/ellipse'
import Icon          from './nodes/shapes/icon'
import Image         from './nodes/shapes/image'
import Square        from './nodes/shapes/square'
import Star          from './nodes/shapes/star'
import Text          from './nodes/shapes/text'
import Triangle      from './nodes/shapes/triangle'
import TriangleDown  from './nodes/shapes/triangleDown'

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

    this.body = body;
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
    this.labelModule = new Label(this.body, this.options);

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
   * Enable or disable the physics.
   * @param status
   */
  togglePhysics(status) {
    this.options.physics = status;
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
      'id',
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
        this.shape = new Database(this.options, this.body, this.labelModule);
        break;
      case 'box':
        this.shape = new Box(this.options, this.body, this.labelModule);
        break;
      case 'circle':
        this.shape = new Circle(this.options, this.body, this.labelModule);
        break;
      case 'ellipse':
        this.shape = new Ellipse(this.options, this.body, this.labelModule);
        break;
      // TODO: add diamond shape
      case 'image':
        this.shape = new Image(this.options, this.body, this.labelModule, this.imageObj);
        break;
      case 'circularImage':
        this.shape = new CircularImage(this.options, this.body, this.labelModule, this.imageObj);
        break;
      case 'text':
        this.shape = new Text(this.options, this.body, this.labelModule);
        break;
      case 'dot':
        this.shape = new Dot(this.options, this.body, this.labelModule);
        break;
      case 'square':
        this.shape = new Square(this.options, this.body, this.labelModule);
        break;
      case 'triangle':
        this.shape = new Triangle(this.options, this.body, this.labelModule);
        break;
      case 'triangleDown':
        this.shape = new TriangleDown(this.options, this.body, this.labelModule);
        break;
      case 'star':
        this.shape = new Star(this.options, this.body, this.labelModule);
        break;
      case 'icon':
        this.shape = new Icon(this.options, this.body, this.labelModule);
        break;
      default:
        this.shape = new Ellipse(this.options, this.body, this.labelModule);
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
    this.shape.width = undefined;
    this.shape.height = undefined;
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
    return this.shape.distanceToBorder(ctx,angle);
  }


  /**
   * Check if this node has a fixed x and y position
   * @return {boolean}      true if fixed, false if not
   */
  isFixed() {
    return (this.options.fixed.x && this.options.fixed.y);
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
    this.shape.draw(ctx, this.x, this.y, this.selected, this.hover);
  }


  /**
   * Recalculate the size of this node in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  resize(ctx) {
    this.shape.resize(ctx);
  }


  /**
   * Check if this object is overlapping with the provided object
   * @param {Object} obj   an object with parameters left, top, right, bottom
   * @return {boolean}     True if location is located on node
   */
  isOverlappingWith(obj) {
    return (
      this.shape.left < obj.right &&
      this.shape.left + this.shape.width > obj.left &&
      this.shape.top < obj.bottom &&
      this.shape.top + this.shape.height > obj.top
    );
  }


}

export default Node;
