/**
 * A panel can contain components
 * @param {Object} [options]    Available parameters:
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | function} [className]
 * @constructor Panel
 * @extends Component
 */
function Panel(options) {
  this.id = util.randomUUID();
  this.parent = null; // TODO: remove parent?
  this.childs = [];

  this.options = options || {};

  // create frame
  this.frame = document.createElement('div');
}

Panel.prototype = new Component();

/**
 * Set options. Will extend the current options.
 * @param {Object} [options]    Available parameters:
 *                              {String | function} [className]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 */
Panel.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the outer frame of the panel
 * @returns {HTMLElement} frame
 */
Panel.prototype.getFrame = function () {
  return this.frame;
};

/**
 * Append a child to the panel
 * @param {Component} child
 */
Panel.prototype.appendChild = function (child) {
  this.childs.push(child);
  child.parent = this;

  // attach to the DOM
  var frame = child.getFrame();
  if (frame) {
    if (frame.parentNode) {
      frame.parentNode.removeChild(frame);
    }
    this.frame.appendChild(frame);
  }
};

/**
 * Insert a child to the panel
 * @param {Component} child
 * @param {Component} beforeChild
 */
Panel.prototype.insertBefore = function (child, beforeChild) {
  var index = this.childs.indexOf(beforeChild);
  if (index != -1) {
    this.childs.splice(index, 0, child);
    child.parent = this;

    // attach to the DOM
    var frame = child.getFrame();
    if (frame) {
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame);
      }
      this.frame.appendChild(frame);
    }
  }
};

/**
 * Remove a child from the panel
 * @param {Component} child
 */
Panel.prototype.removeChild = function (child) {
  var index = this.childs.indexOf(child);
  if (index != -1) {
    this.childs.splice(index, 1);
    child.parent = null;

    // remove from the DOM
    var frame = child.getFrame();
    if (frame && frame.parentNode) {
      this.frame.removeChild(frame);
    }
  }
};

/**
 * Test whether the panel contains given child
 * @param {Component} child
 */
Panel.prototype.hasChild = function (child) {
  var index = this.childs.indexOf(child);
  return (index != -1);
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component was resized since previous repaint
 */
Panel.prototype.repaint = function () {
  var asString = util.option.asString,
      options = this.options,
      frame = this.getFrame();

  // update className
  frame.className = 'vpanel' + (options.className ? (' ' + asString(options.className)) : '');

  // repaint the child components
  var childsResized = this._repaintChilds();

  // update frame size
  this._updateSize();

  return this._isResized() || childsResized;
};

/**
 * Repaint all childs of the panel
 * @return {boolean} Returns true if the component is resized
 * @private
 */
Panel.prototype._repaintChilds = function () {
  var resized = false;
  for (var i = 0, ii = this.childs.length; i < ii; i++) {
    resized = this.childs[i].repaint() || resized;
  }
  return resized;
};

/**
 * Apply the size from options to the panel, and recalculate it's actual size.
 * @private
 */
Panel.prototype._updateSize = function () {
  // apply size
  this.frame.style.top    = util.option.asSize(this.options.top);
  this.frame.style.bottom = util.option.asSize(this.options.bottom);
  this.frame.style.left   = util.option.asSize(this.options.left);
  this.frame.style.right  = util.option.asSize(this.options.right);
  this.frame.style.width  = util.option.asSize(this.options.width, '100%');
  this.frame.style.height = util.option.asSize(this.options.height, '');

  // get actual size
  this.top    = this.frame.offsetTop;
  this.left   = this.frame.offsetLeft;
  this.width  = this.frame.offsetWidth;
  this.height = this.frame.offsetHeight;
};
