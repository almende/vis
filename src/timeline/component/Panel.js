/**
 * A panel can contain components
 * @param {Component} [parent]
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]    Available parameters:
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | function} [className]
 * @constructor Panel
 * @extends Component
 */
function Panel(parent, depends, options) {
  this.id = util.randomUUID();
  this.parent = parent;
  this.depends = depends;

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
 * Repaint the component
 */
Panel.prototype.repaint = function () {
  var asSize = util.option.asSize,
      options = this.options,
      frame = this.frame;

  // create frame
  if (!frame) {
    frame = document.createElement('div');

    if (!this.parent) throw new Error('Cannot repaint panel: no parent attached');

    var parentContainer = this.parent.getContainer();
    if (!parentContainer) throw new Error('Cannot repaint panel: parent has no container element');

    parentContainer.appendChild(frame);

    this.frame = frame;
  }

  // update className
  frame.className = 'vpanel' + (options.className ? (' ' + asSize(options.className)) : '');

  // update class name
  var className = 'vis timeline rootpanel ' + options.orientation + (options.editable ? ' editable' : '');
  if (options.className) className += ' ' + util.option.asString(className);
  frame.className = className;

  // update frame size
  this._updateSize();
};

/**
 * Apply the size from options to the panel, and recalculate it's actual size.
 * @private
 */
Panel.prototype._updateSize = function () {
  // apply size
  this.frame.style.top    = util.option.asSize(this.options.top, '0px');
  this.frame.style.left   = util.option.asSize(this.options.left, '0px');
  this.frame.style.width  = util.option.asSize(this.options.width, '100%');
  this.frame.style.height = util.option.asSize(this.options.height, '100%');

  // get actual size
  this.top    = this.frame.offsetTop;
  this.left   = this.frame.offsetLeft;
  this.width  = this.frame.offsetWidth;
  this.height = this.frame.offsetHeight;
};
