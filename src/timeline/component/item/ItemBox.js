/**
 * @constructor ItemBox
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemBox (parent, data, options, defaultOptions) {
  this.props = {
    dot: {
      width: 0,
      height: 0
    },
    line: {
      width: 0,
      height: 0
    }
  };

  // validate data
  if (data.start == undefined) {
    throw new Error('Property "start" missing in item ' + data);
  }

  Item.call(this, parent, data, options, defaultOptions);
}

ItemBox.prototype = new Item (null, null);

/**
 * Check whether this item is visible in the current time window
 * @returns {boolean} True if visible
 */
ItemBox.prototype.isVisible = function isVisible () {
  // determine visibility
  var data = this.data;
  var range = this.parent && this.parent.range;

  if (data && range) {
    // TODO: account for the width of the item. Right now we add 1/4 to the window
    var interval = (range.end - range.start) / 4;
    interval = 0; // TODO: remove
    return (data.start > range.start - interval) && (data.start < range.end + interval);
  }
  else {
    return false;
  }
}

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemBox.prototype.repaint = function repaint() {
  // TODO: make an efficient repaint
  var dom,
      update = util.updateProperty,
      props= this.props;

  // create DOM
  dom = this.dom;
  if (!dom) {
    this.dom = {};
    dom = this.dom;

    // create main box
    dom.box = document.createElement('DIV');

    // contents box (inside the background box). used for making margins
    dom.content = document.createElement('DIV');
    dom.content.className = 'content';
    dom.box.appendChild(dom.content);

    // line to axis
    dom.line = document.createElement('DIV');
    dom.line.className = 'line';

    // dot on axis
    dom.dot = document.createElement('DIV');
    dom.dot.className = 'dot';

    // attach this item as attribute
    dom.box['timeline-item'] = this;
  }

  // append DOM to parent DOM
  if (!this.parent) {
    throw new Error('Cannot repaint item: no parent attached');
  }
  if (!dom.box.parentNode) {
    var foreground = this.parent.getForeground();
    if (!foreground) throw new Error('Cannot repaint time axis: parent has no foreground container element');
    foreground.appendChild(dom.box);
  }
  if (!dom.line.parentNode) {
    var background = this.parent.getBackground();
    if (!background) throw new Error('Cannot repaint time axis: parent has no background container element');
    background.appendChild(dom.line);
  }
  if (!dom.dot.parentNode) {
    var axis = this.parent.getAxis();
    if (!background) throw new Error('Cannot repaint time axis: parent has no axis container element');
    axis.appendChild(dom.dot);
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
    dom.box.className = 'item box' + className;
    dom.line.className = 'item line' + className;
    dom.dot.className  = 'item dot' + className;

    this.dirty = true;
  }

  // recalculate size
  if (this.dirty) {
    update(props.dot, 'height', dom.dot.offsetHeight);
    update(props.dot, 'width', dom.dot.offsetWidth);
    update(props.line, 'width', dom.line.offsetWidth);
    update(this, 'width', dom.box.offsetWidth);
    update(this, 'height', dom.box.offsetHeight);

    this.dirty = false;
  }

  // TODO: repaint delete button
  this._repaintDeleteButton(dom.box);

  return false;
};

/**
 * Show the item in the DOM (when not already displayed). The items DOM will
 * be created when needed.
 */
ItemBox.prototype.show = function show() {
  if (!this.displayed) {
    this.repaint();
  }
};

/**
 * Hide the item from the DOM (when visible)
 */
ItemBox.prototype.hide = function hide() {
  if (this.displayed) {
    var dom = this.dom;

    if (dom.box.parentNode)   dom.box.parentNode.removeChild(dom.box);
    if (dom.line.parentNode)  dom.line.parentNode.removeChild(dom.line);
    if (dom.dot.parentNode)   dom.dot.parentNode.removeChild(dom.dot);

    this.displayed = false;
  }

  this.top = null;
  this.left = null;
};

/**
 * Reposition the item horizontally
 * @Override
 */
ItemBox.prototype.repositionX = function repositionX() {
  var start = this.parent.toScreen(this.data.start) + this.offset,
      align = this.options.align || this.defaultOptions.align,
      left,
      box = this.dom.box,
      line = this.dom.line,
      dot = this.dom.dot;

  // calculate left position of the box
  if (align == 'right') {
    this.left = start - this.width;
  }
  else if (align == 'left') {
    this.left = start;
  }
  else {
    // default or 'center'
    this.left = start - this.width / 2;
  }

  // reposition box
  box.style.left = this.left + 'px';

  // reposition line
  line.style.left = (start - this.props.line.width / 2) + 'px';

  // reposition dot
  dot.style.left = (start - this.props.dot.width / 2) + 'px';
};

/**
 * Reposition the item vertically
 * @Override
 */
ItemBox.prototype.repositionY = function repositionY () {
  var orientation = this.options.orientation || this.defaultOptions.orientation,
      box = this.dom.box,
      line = this.dom.line,
      dot = this.dom.dot;

  // reposition box
  box.style.top = (this.top || 0) + 'px';

  // reposition line
  if (orientation == 'top') {
    line.style.top = 0 + 'px';
    line.style.height = this.top + 'px';
  }
  else {
    // orientation 'bottom'
    line.style.top = (this.top + this.height) + 'px';
    line.style.height = Math.max(this.parent.height - this.top - this.height +
        this.props.dot.height / 2, 0) + 'px';
  }

  // reposition dot
  dot.style.top = (-this.props.dot.height / 2) + 'px';
}
