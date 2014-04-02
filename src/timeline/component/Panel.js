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
  this.parent = null;
  this.childs = [];

  this.options = options || {};
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
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
Panel.prototype.getContainer = function () {
  return this.frame;
};

/**
 * Append a child to the panel
 * @param {Component} child
 */
Panel.prototype.appendChild = function (child) {
  this.childs.push(child);
  child.parent = this;
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
  }
};

/**
 * Repaint the component
 */
Panel.prototype.repaint = function () {
  var asSize = util.option.asSize,
      options = this.options,
      frame = this.frame;

  // create frame
  if (!frame) {
    frame = document.createElement('div');
    this.frame = frame;

    if (!this.parent) throw new Error('Cannot repaint panel: no parent attached');

    var parentContainer = this.parent.getContainer();
    if (!parentContainer) throw new Error('Cannot repaint panel: parent has no container element');
    parentContainer.appendChild(frame);
  }

  // update className
  frame.className = 'vpanel' + (options.className ? (' ' + asSize(options.className)) : '');

  // repaint the child components
  this._repaintChilds();

  // update frame size
  this._updateSize();
};

/**
 * Repaint all childs of the panel
 * @private
 */
Panel.prototype._repaintChilds = function () {
  for (var i = 0, ii = this.childs.length; i < ii; i++) {
    this.childs[i].repaint();
  }
};

/**
 * Apply the size from options to the panel, and recalculate it's actual size.
 * @private
 */
Panel.prototype._updateSize = function () {
  // apply size
  this.frame.style.top    = util.option.asSize(this.options.top, null);
  this.frame.style.bottom = util.option.asSize(this.options.bottom, null);
  this.frame.style.left   = util.option.asSize(this.options.left, null);
  this.frame.style.right  = util.option.asSize(this.options.right, null);
  this.frame.style.width  = util.option.asSize(this.options.width, '100%');
  this.frame.style.height = util.option.asSize(this.options.height, '100%');

  // get actual size
  this.top    = this.frame.offsetTop;
  this.left   = this.frame.offsetLeft;
  this.width  = this.frame.offsetWidth;
  this.height = this.frame.offsetHeight;
};
