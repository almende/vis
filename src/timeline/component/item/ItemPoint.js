/**
 * @constructor ItemPoint
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemPoint (parent, data, options, defaultOptions) {
  this.props = {
    dot: {
      top: 0,
      width: 0,
      height: 0
    },
    content: {
      height: 0,
      marginLeft: 0
    }
  };

  // validate data
  if (data) {
    if (data.start == undefined) {
      throw new Error('Property "start" missing in item ' + data);
    }
  }

  Item.call(this, parent, data, options, defaultOptions);
}

ItemPoint.prototype = new Item (null, null);

/**
 * Check whether this item is visible in the current time window
 * @returns {boolean} True if visible
 */
ItemPoint.prototype.isVisible = function isVisible () {
  // determine visibility
  var data = this.data;
  var range = this.parent && this.parent.range;

  if (data && range) {
    var interval = (range.end - range.start);
    return (data.start > range.start - interval) && (data.start < range.end);
  }
  else {
    return false;
  }
}

/**
 * Repaint the item
 */
ItemPoint.prototype.repaint = function repaint() {
  var dom = this.dom;
  if (!dom) {
    // create DOM
    this.dom = {};
    dom = this.dom;

    // background box
    dom.point = document.createElement('div');
    // className is updated in repaint()

    // contents box, right from the dot
    dom.content = document.createElement('div');
    dom.content.className = 'content';
    dom.point.appendChild(dom.content);

    // dot at start
    dom.dot = document.createElement('div');
    dom.dot.className  = 'dot';
    dom.point.appendChild(dom.dot);

    // attach this item as attribute
    dom.point['timeline-item'] = this;
  }

  // append DOM to parent DOM
  if (!this.parent) {
    throw new Error('Cannot repaint item: no parent attached');
  }
  if (!dom.point.parentNode) {
    var foreground = this.parent.getForeground();
    if (!foreground) {
      throw new Error('Cannot repaint time axis: parent has no foreground container element');
    }
    foreground.appendChild(dom.point);
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

  // update class
  var className = (this.data.className? ' ' + this.data.className : '') +
      (this.selected ? ' selected' : '');
  if (this.className != className) {
    this.className = className;
    dom.point.className  = 'item point' + className;

    this.dirty = true;
  }

  // recalculate size
  if (this.dirty) {
    this.width = dom.point.offsetWidth;
    this.height = dom.point.offsetHeight;
    this.props.dot.width = dom.dot.offsetWidth;
    this.props.dot.height = dom.dot.offsetHeight;
    this.props.content.height = dom.content.offsetHeight;

    // resize contents
    dom.content.style.marginLeft = 1.5 * this.props.dot.width + 'px';
    //dom.content.style.marginRight = ... + 'px'; // TODO: margin right

    dom.dot.style.top = ((this.height - this.props.dot.height) / 2) + 'px';

    this.dirty = false;
  }

  this._repaintDeleteButton(dom.box);
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 */
ItemPoint.prototype.show = function show() {
  if (!this.displayed) {
    this.repaint();
  }
};

/**
 * Hide the item from the DOM (when visible)
 */
ItemPoint.prototype.hide = function hide() {
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
ItemPoint.prototype.repositionX = function repositionX() {
  var start = this.parent.toScreen(this.data.start) + this.offset;

  this.left = start - this.props.dot.width / 2;

  // reposition point
  this.dom.point.style.left = this.left + 'px';
};

/**
 * Reposition the item vertically
 * @Override
 */
ItemPoint.prototype.repositionY = function repositionY () {
  this.dom.point.style.top = this.top + 'px';
}
