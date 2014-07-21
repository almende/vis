var Hammer = require('../../../module/hammer');
var Item = require('./Item');

/**
 * @constructor ItemRange
 * @extends Item
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} [options]        Configuration options
 *                                  // TODO: describe options
 */
function ItemRange (data, conversion, options) {
  this.props = {
    content: {
      width: 0
    }
  };
  this.overflow = false; // if contents can overflow (css styling), this flag is set to true

  // validate data
  if (data) {
    if (data.start == undefined) {
      throw new Error('Property "start" missing in item ' + data.id);
    }
    if (data.end == undefined) {
      throw new Error('Property "end" missing in item ' + data.id);
    }
  }

  Item.call(this, data, conversion, options);
}

ItemRange.prototype = new Item (null, null, null);

ItemRange.prototype.baseClassName = 'item range';

/**
 * Check whether this item is visible inside given range
 * @returns {{start: Number, end: Number}} range with a timestamp for start and end
 * @returns {boolean} True if visible
 */
ItemRange.prototype.isVisible = function(range) {
  // determine visibility
  return (this.data.start < range.end) && (this.data.end > range.start);
};

/**
 * Repaint the item
 */
ItemRange.prototype.redraw = function() {
  var dom = this.dom;
  if (!dom) {
    // create DOM
    this.dom = {};
    dom = this.dom;

      // background box
    dom.box = document.createElement('div');
    // className is updated in redraw()

    // contents box
    dom.content = document.createElement('div');
    dom.content.className = 'content';
    dom.box.appendChild(dom.content);

    // attach this item as attribute
    dom.box['timeline-item'] = this;
  }

  // append DOM to parent DOM
  if (!this.parent) {
    throw new Error('Cannot redraw item: no parent attached');
  }
  if (!dom.box.parentNode) {
    var foreground = this.parent.dom.foreground;
    if (!foreground) {
      throw new Error('Cannot redraw time axis: parent has no foreground container element');
    }
    foreground.appendChild(dom.box);
  }
  this.displayed = true;

  // update contents
  if (this.data.content != this.content) {
    this.content = this.data.content;
    if (this.content instanceof Element) {
      dom.content.innerHTML = '';
      dom.content.appendChild(this.content);
    }
    else if (this.data.content != undefined) {
      dom.content.innerHTML = this.content;
    }
    else {
      throw new Error('Property "content" missing in item ' + this.data.id);
    }

    this.dirty = true;
  }

  // update title
  if (this.data.title != this.title) {
    dom.box.title = this.data.title;
    this.title = this.data.title;
  }

  // update class
  var className = (this.data.className ? (' ' + this.data.className) : '') +
      (this.selected ? ' selected' : '');
  if (this.className != className) {
    this.className = className;
    dom.box.className = this.baseClassName + className;

    this.dirty = true;
  }

  // recalculate size
  if (this.dirty) {
    // determine from css whether this box has overflow
    this.overflow = window.getComputedStyle(dom.content).overflow !== 'hidden';

    this.props.content.width = this.dom.content.offsetWidth;
    this.height = this.dom.box.offsetHeight;

    this.dirty = false;
  }

  this._repaintDeleteButton(dom.box);
  this._repaintDragLeft();
  this._repaintDragRight();
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 */
ItemRange.prototype.show = function() {
  if (!this.displayed) {
    this.redraw();
  }
};

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
ItemRange.prototype.hide = function() {
  if (this.displayed) {
    var box = this.dom.box;

    if (box.parentNode) {
      box.parentNode.removeChild(box);
    }

    this.top = null;
    this.left = null;

    this.displayed = false;
  }
};

/**
 * Reposition the item horizontally
 * @Override
 */
// TODO: delete the old function
ItemRange.prototype.repositionX = function() {
  var props = this.props,
      parentWidth = this.parent.width,
      start = this.conversion.toScreen(this.data.start),
      end = this.conversion.toScreen(this.data.end),
      padding = this.options.padding,
      contentLeft;

  // limit the width of the this, as browsers cannot draw very wide divs
  if (start < -parentWidth) {
    start = -parentWidth;
  }
  if (end > 2 * parentWidth) {
    end = 2 * parentWidth;
  }
  var boxWidth = Math.max(end - start, 1);

  if (this.overflow) {
    // when range exceeds left of the window, position the contents at the left of the visible area
    contentLeft = Math.max(-start, 0);

    this.left = start;
    this.width = boxWidth + this.props.content.width;
    // Note: The calculation of width is an optimistic calculation, giving
    //       a width which will not change when moving the Timeline
    //       So no restacking needed, which is nicer for the eye;
  }
  else { // no overflow
    // when range exceeds left of the window, position the contents at the left of the visible area
    if (start < 0) {
      contentLeft = Math.min(-start,
          (end - start - props.content.width - 2 * padding));
      // TODO: remove the need for options.padding. it's terrible.
    }
    else {
      contentLeft = 0;
    }

    this.left = start;
    this.width = boxWidth;
  }

  this.dom.box.style.left = this.left + 'px';
  this.dom.box.style.width = boxWidth + 'px';
  this.dom.content.style.left = contentLeft + 'px';
};

/**
 * Reposition the item vertically
 * @Override
 */
ItemRange.prototype.repositionY = function() {
  var orientation = this.options.orientation,
      box = this.dom.box;

  if (orientation == 'top') {
    box.style.top = this.top + 'px';
  }
  else {
    box.style.top = (this.parent.height - this.top - this.height) + 'px';
  }
};

/**
 * Repaint a drag area on the left side of the range when the range is selected
 * @protected
 */
ItemRange.prototype._repaintDragLeft = function () {
  if (this.selected && this.options.editable.updateTime && !this.dom.dragLeft) {
    // create and show drag area
    var dragLeft = document.createElement('div');
    dragLeft.className = 'drag-left';
    dragLeft.dragLeftItem = this;

    // TODO: this should be redundant?
    Hammer(dragLeft, {
      preventDefault: true
    }).on('drag', function () {
          //console.log('drag left')
        });

    this.dom.box.appendChild(dragLeft);
    this.dom.dragLeft = dragLeft;
  }
  else if (!this.selected && this.dom.dragLeft) {
    // delete drag area
    if (this.dom.dragLeft.parentNode) {
      this.dom.dragLeft.parentNode.removeChild(this.dom.dragLeft);
    }
    this.dom.dragLeft = null;
  }
};

/**
 * Repaint a drag area on the right side of the range when the range is selected
 * @protected
 */
ItemRange.prototype._repaintDragRight = function () {
  if (this.selected && this.options.editable.updateTime && !this.dom.dragRight) {
    // create and show drag area
    var dragRight = document.createElement('div');
    dragRight.className = 'drag-right';
    dragRight.dragRightItem = this;

    // TODO: this should be redundant?
    Hammer(dragRight, {
      preventDefault: true
    }).on('drag', function () {
      //console.log('drag right')
    });

    this.dom.box.appendChild(dragRight);
    this.dom.dragRight = dragRight;
  }
  else if (!this.selected && this.dom.dragRight) {
    // delete drag area
    if (this.dom.dragRight.parentNode) {
      this.dom.dragRight.parentNode.removeChild(this.dom.dragRight);
    }
    this.dom.dragRight = null;
  }
};

module.exports = ItemRange;
