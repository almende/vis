var Item = require('./Item');

/**
 * @constructor PointItem
 * @extends Item
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} [options]        Configuration options
 *                                  // TODO: describe available options
 */
function PointItem (data, conversion, options) {
  this.props = {
    dot: {
      top: 0,
      width: 0,
      height: 0
    },
    content: {
      height: 0,
      marginLeft: 0,
      marginRight: 0
    }
  };
  this.options = options;
  // validate data
  if (data) {
    if (data.start == undefined) {
      throw new Error('Property "start" missing in item ' + data);
    }
  }

  Item.call(this, data, conversion, options);
}

PointItem.prototype = new Item (null, null, null);

/**
 * Check whether this item is visible inside given range
 * @param {{start: Number, end: Number}} range with a timestamp for start and end
 * @returns {boolean} True if visible
 */
PointItem.prototype.isVisible = function(range) {
  // determine visibility
  var widthInMs = this.width * range.getMillisecondsPerPixel();
  
  return (this.data.start.getTime() + widthInMs > range.start ) && (this.data.start < range.end);
};

/**
 * Repaint the item
 */
PointItem.prototype.redraw = function() {
  var dom = this.dom;
  if (!dom) {
    // create DOM
    this.dom = {};
    dom = this.dom;

    // background box
    dom.point = document.createElement('div');
    // className is updated in redraw()

    // contents box, right from the dot
    dom.content = document.createElement('div');
    dom.content.className = 'vis-item-content';
    dom.point.appendChild(dom.content);

    // dot at start
    dom.dot = document.createElement('div');
    dom.point.appendChild(dom.dot);

    // attach this item as attribute
    dom.point['timeline-item'] = this;

    this.dirty = true;
  }

  // append DOM to parent DOM
  if (!this.parent) {
    throw new Error('Cannot redraw item: no parent attached');
  }
  if (!dom.point.parentNode) {
    var foreground = this.parent.dom.foreground;
    if (!foreground) {
      throw new Error('Cannot redraw item: parent has no foreground container element');
    }
    foreground.appendChild(dom.point);
  }
  this.displayed = true;

  // Update DOM when item is marked dirty. An item is marked dirty when:
  // - the item is not yet rendered
  // - the item's data is changed
  // - the item is selected/deselected
  if (this.dirty) {
    this._updateContents(this.dom.content);
    this._updateDataAttributes(this.dom.point);
    this._updateStyle(this.dom.point);

    var editable = (this.editable.updateTime || this.editable.updateGroup);
    // update class
    var className = (this.data.className ? ' ' + this.data.className : '') +
        (this.selected ? ' vis-selected' : '') +
        (editable ? ' vis-editable' : ' vis-readonly');
    dom.point.className  = 'vis-item vis-point' + className;
    dom.dot.className  = 'vis-item vis-dot' + className;

    // recalculate size of dot and contents
    this.props.dot.width = dom.dot.offsetWidth;
    this.props.dot.height = dom.dot.offsetHeight;
    this.props.content.height = dom.content.offsetHeight;

    // resize contents
    if (this.options.rtl) {
      dom.content.style.marginRight = 2 * this.props.dot.width + 'px';
    } else {
      dom.content.style.marginLeft = 2 * this.props.dot.width + 'px';
    }
    //dom.content.style.marginRight = ... + 'px'; // TODO: margin right

    // recalculate size
    this.width = dom.point.offsetWidth;
    this.height = dom.point.offsetHeight;

    // reposition the dot
    dom.dot.style.top = ((this.height - this.props.dot.height) / 2) + 'px';
    if (this.options.rtl) {
      dom.dot.style.right = (this.props.dot.width / 2) + 'px';
    } else {
      dom.dot.style.left = (this.props.dot.width / 2) + 'px';
    }

    this.dirty = false;
  }
  
  this._repaintOnItemUpdateTimeTooltip(dom.point);
  this._repaintDragCenter();
  this._repaintDeleteButton(dom.point);
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 */
PointItem.prototype.show = function() {
  if (!this.displayed) {
    this.redraw();
  }
};

/**
 * Hide the item from the DOM (when visible)
 */
PointItem.prototype.hide = function() {
  if (this.displayed) {
    if (this.dom.point.parentNode) {
      this.dom.point.parentNode.removeChild(this.dom.point);
    }

    this.displayed = false;
  }
};

/**
 * Reposition the item horizontally
 * @Override
 */
PointItem.prototype.repositionX = function() {
  var start = this.conversion.toScreen(this.data.start);

  if (this.options.rtl) {
    this.right = start - this.props.dot.width;

    // reposition point
    this.dom.point.style.right = this.right + 'px';
  } else {
    this.left = start - this.props.dot.width;

    // reposition point
    this.dom.point.style.left = this.left + 'px';
  }
};

/**
 * Reposition the item vertically
 * @Override
 */
PointItem.prototype.repositionY = function() {
  var orientation = this.options.orientation.item;
  var point = this.dom.point;
  if (orientation == 'top') {
    point.style.top = this.top + 'px';
  }
  else {
    point.style.top = (this.parent.height - this.top - this.height) + 'px';
  }
};

/**
 * Return the width of the item left from its start date
 * @return {number}
 */
PointItem.prototype.getWidthLeft = function () {
  return this.props.dot.width;
};

/**
 * Return the width of the item right from  its start date
 * @return {number}
 */
PointItem.prototype.getWidthRight = function () {
  return this.props.dot.width;
};

module.exports = PointItem;
