var util = require('../../../util');

import Label from './shared/Label'

import Box           from './nodes/shapes/Box'
import Circle        from './nodes/shapes/Circle'
import CircularImage from './nodes/shapes/CircularImage'
import Database      from './nodes/shapes/Database'
import Diamond       from './nodes/shapes/Diamond'
import Dot           from './nodes/shapes/Dot'
import Ellipse       from './nodes/shapes/Ellipse'
import Icon          from './nodes/shapes/Icon'
import Image         from './nodes/shapes/Image'
import Square        from './nodes/shapes/Square'
import Star          from './nodes/shapes/Star'
import Text          from './nodes/shapes/Text'
import Triangle      from './nodes/shapes/Triangle'
import TriangleDown  from './nodes/shapes/TriangleDown'
import  Validator    from "../../../shared/Validator";
import  {printStyle} from "../../../shared/Validator";


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
  constructor(options, body, imagelist, grouplist, globalOptions, defaultOptions, nodeOptions) {
    this.options = util.bridgeObject(globalOptions);
    this.globalOptions = globalOptions;
    this.defaultOptions = defaultOptions;
    this.nodeOptions = nodeOptions;
    this.body = body;

    this.edges = []; // all edges connected to this node

    // set defaults for the options
    this.id = undefined;
    this.imagelist = imagelist;
    this.grouplist = grouplist;

    // state options
    this.x = undefined;
    this.y = undefined;
    this.baseSize = this.options.size;
    this.baseFontSize = this.options.font.size;
    this.predefinedPosition = false; // used to check if initial fit should just take the range or approximate
    this.selected = false;
    this.hover = false;

    this.labelModule = new Label(this.body, this.options, false /* Not edge label */);
    this.setOptions(options);
  }


  /**
   * Attach a edge to the node
   * @param {Edge} edge
   */
  attachEdge(edge) {
    if (this.edges.indexOf(edge) === -1) {
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
    let currentShape = this.options.shape;
    if (!options) {
      return;
    }
    // basic options
    if (options.id !== undefined)    {this.id = options.id;}

    if (this.id === undefined) {
      throw "Node must have an id";
    }


    // set these options locally
    // clear x and y positions
    if (options.x !== undefined) {
      if (options.x === null) {this.x = undefined; this.predefinedPosition = false;}
      else                    {this.x = parseInt(options.x); this.predefinedPosition = true;}
    }
    if (options.y !== undefined) {
      if (options.y === null) {this.y = undefined; this.predefinedPosition = false;}
      else                    {this.y = parseInt(options.y); this.predefinedPosition = true;}
    }
    if (options.size !== undefined)  {this.baseSize = options.size;}
    if (options.value !== undefined) {options.value = parseFloat(options.value);}

    // copy group options
    if (typeof options.group === 'number' || (typeof options.group === 'string' && options.group != '')) {
      var groupObj = this.grouplist.get(options.group);
      util.deepExtend(this.options, groupObj);
      // the color object needs to be completely defined. Since groups can partially overwrite the colors, we parse it again, just in case.
      this.options.color = util.parseColor(this.options.color);
    }

    // this transforms all shorthands into fully defined options
    Node.parseOptions(this.options, options, true, this.globalOptions);

    this.choosify(options);

    // load the images
    if (this.options.image !== undefined) {
      if (this.imagelist) {
        this.imageObj = this.imagelist.load(this.options.image, this.options.brokenImage, this.id);
      }
      else {
        throw "No imagelist provided";
      }
    }

    this.updateLabelModule(options);
    this.updateShape(currentShape);
    this.labelModule.propagateFonts(this.nodeOptions, options, this.defaultOptions);

    if (options.hidden !== undefined || options.physics !== undefined) {
      return true;
    }
    return false;
  }


  /**
   * This process all possible shorthands in the new options and makes sure that the parentOptions are fully defined.
   * Static so it can also be used by the handler.
   * @param parentOptions
   * @param newOptions
   * @param allowDeletion
   * @param globalOptions
   */
  static parseOptions(parentOptions, newOptions, allowDeletion = false, globalOptions = {}) {
    var fields = [
      'color',
      'font',
      'fixed',
      'shadow'
    ];
    util.selectiveNotDeepExtend(fields, parentOptions, newOptions, allowDeletion);

    // merge the shadow options into the parent.
    util.mergeOptions(parentOptions, newOptions, 'shadow', allowDeletion, globalOptions);

    // individual shape newOptions
    if (newOptions.color !== undefined && newOptions.color !== null) {
      let parsedColor = util.parseColor(newOptions.color);
      util.fillIfDefined(parentOptions.color, parsedColor);
    }
    else if (allowDeletion === true && newOptions.color === null) {
      parentOptions.color = util.bridgeObject(globalOptions.color); // set the object back to the global options
    }

    // handle the fixed options
    if (newOptions.fixed !== undefined && newOptions.fixed !== null) {
      if (typeof newOptions.fixed === 'boolean') {
        parentOptions.fixed.x = newOptions.fixed;
        parentOptions.fixed.y = newOptions.fixed;
      }
      else {
        if (newOptions.fixed.x !== undefined && typeof newOptions.fixed.x === 'boolean') {
          parentOptions.fixed.x = newOptions.fixed.x;
        }
        if (newOptions.fixed.y !== undefined && typeof newOptions.fixed.y === 'boolean') {
          parentOptions.fixed.y = newOptions.fixed.y;
        }
      }
    }

    // handle the font options
    if (newOptions.font !== undefined && newOptions.font !== null) {
      Label.parseOptions(parentOptions.font, newOptions);
    }
    else if (allowDeletion === true && newOptions.font === null) {
      parentOptions.font =  util.bridgeObject(globalOptions.font); // set the object back to the global options
    }

    // handle the scaling options, specifically the label part
    if (newOptions.scaling !== undefined) {
      util.mergeOptions(parentOptions.scaling, newOptions.scaling, 'label', allowDeletion, globalOptions.scaling);
    }
  }

  choosify(options) {
    this.chooser = true;

    let pile = [options, this.options, this.defaultOptions];

    let chosen = util.topMost(pile, 'chosen');
    if (typeof chosen === 'boolean') {
      this.chooser = chosen;
    } else if (typeof chosen === 'object') {
      let chosenNode = util.topMost(pile, ['chosen', 'node']);
      if ((typeof chosenNode === 'boolean') || (typeof chosenNode === 'function')) {
        this.chooser = chosenNode;
      }
    }
  }

  getFormattingValues() {
    let values = {
      color: this.options.color.background,
      borderWidth: this.options.borderWidth,
      borderColor: this.options.color.border,
      size: this.options.size,
      borderDashes: this.options.shapeProperties.borderDashes,
      borderRadius: this.options.shapeProperties.borderRadius,
      shadow: this.options.shadow.enabled,
      shadowColor: this.options.shadow.color,
      shadowSize: this.options.shadow.size,
      shadowX: this.options.shadow.x,
      shadowY: this.options.shadow.y
    };
    if (this.selected || this.hover) {
      if (this.chooser === true) {
        if (this.selected) {
          values.borderWidth *= 2;
          values.color = this.options.color.highlight.background;
          values.borderColor = this.options.color.highlight.border;
          values.shadow = this.options.shadow.enabled;
        } else if (this.hover) {
          values.color = this.options.color.hover.background;
          values.borderColor = this.options.color.hover.border;
          values.shadow = this.options.shadow.enabled;
        }
      } else if (typeof this.chooser === 'function') {
        this.chooser(values, this.options.id, this.selected, this.hover);
        if (values.shadow === false) {
          if ((values.shadowColor !== this.options.shadow.color) ||
              (values.shadowSize !== this.options.shadow.size) ||
              (values.shadowX !== this.options.shadow.x) ||
              (values.shadowY !== this.options.shadow.y)) {
            values.shadow = true;
          }
        }
      }
    } else {
      values.shadow = this.options.shadow.enabled;
    }
    return values;
  }


  updateLabelModule(options) {
    if (this.options.label === undefined || this.options.label === null) {
      this.options.label = '';
    }
    this.labelModule.setOptions(this.options, true);
    if (this.labelModule.baseSize !== undefined) {
      this.baseFontSize = this.labelModule.baseSize;
    }
    this.labelModule.constrain(this.nodeOptions, options, this.defaultOptions);
    this.labelModule.choosify(this.nodeOptions, options, this.defaultOptions);
  }

  updateShape(currentShape) {
    if (currentShape === this.options.shape && this.shape) {
      this.shape.setOptions(this.options, this.imageObj);
    }
    else {
      // choose draw method depending on the shape
      switch (this.options.shape) {
        case 'box':
          this.shape = new Box(this.options, this.body, this.labelModule);
          break;
        case 'circle':
          this.shape = new Circle(this.options, this.body, this.labelModule);
          break;
        case 'circularImage':
          this.shape = new CircularImage(this.options, this.body, this.labelModule, this.imageObj);
          break;
        case 'database':
          this.shape = new Database(this.options, this.body, this.labelModule);
          break;
        case 'diamond':
          this.shape = new Diamond(this.options, this.body, this.labelModule);
          break;
        case 'dot':
          this.shape = new Dot(this.options, this.body, this.labelModule);
          break;
        case 'ellipse':
          this.shape = new Ellipse(this.options, this.body, this.labelModule);
          break;
        case 'icon':
          this.shape = new Icon(this.options, this.body, this.labelModule);
          break;
        case 'image':
          this.shape = new Image(this.options, this.body, this.labelModule, this.imageObj);
          break;
        case 'square':
          this.shape = new Square(this.options, this.body, this.labelModule);
          break;
        case 'star':
          this.shape = new Star(this.options, this.body, this.labelModule);
          break;
        case 'text':
          this.shape = new Text(this.options, this.body, this.labelModule);
          break;
        case 'triangle':
          this.shape = new Triangle(this.options, this.body, this.labelModule);
          break;
        case 'triangleDown':
          this.shape = new TriangleDown(this.options, this.body, this.labelModule);
          break;
        default:
          this.shape = new Ellipse(this.options, this.body, this.labelModule);
          break;
      }
    }
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
    return this.options.title;
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
    return this.options.value;
  }


  /**
   * Adjust the value range of the node. The node will adjust it's size
   * based on its value.
   * @param {Number} min
   * @param {Number} max
   */
  setValueRange(min, max, total) {
    if (this.options.value !== undefined) {
      var scale = this.options.scaling.customScalingFunction(min, max, total, this.options.value);
      var sizeDiff = this.options.scaling.max - this.options.scaling.min;
      if (this.options.scaling.label.enabled === true) {
        var fontDiff = this.options.scaling.label.max - this.options.scaling.label.min;
        this.options.font.size = this.options.scaling.label.min + scale * fontDiff;
      }
      this.options.size = this.options.scaling.min + scale * sizeDiff;
    }
    else {
      this.options.size = this.baseSize;
      this.options.font.size = this.baseFontSize;
    }

    this.updateLabelModule();
  }


  /**
   * Draw this node in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  draw(ctx) {
    let values = this.getFormattingValues();
    this.shape.draw(ctx, this.x, this.y, this.selected, this.hover, values);
  }


  /**
   * Update the bounding box of the shape
   */
  updateBoundingBox(ctx) {
    this.shape.updateBoundingBox(this.x,this.y,ctx);
  }

  /**
   * Recalculate the size of this node in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   */
  resize(ctx) {
    let values = this.getFormattingValues();
    this.shape.resize(ctx, this.selected, this.hover, values);
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

  /**
   * Check if this object is overlapping with the provided object
   * @param {Object} obj   an object with parameters left, top, right, bottom
   * @return {boolean}     True if location is located on node
   */
  isBoundingBoxOverlappingWith(obj) {
    return (
      this.shape.boundingBox.left < obj.right &&
      this.shape.boundingBox.right > obj.left &&
      this.shape.boundingBox.top < obj.bottom &&
      this.shape.boundingBox.bottom > obj.top
    );
  }
}

export default Node;
