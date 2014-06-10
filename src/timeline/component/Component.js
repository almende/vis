/**
 * Prototype for visual components
 */
function Component () {
  this.options = null;
  this.props = null;
}

/**
 * Set parameters for the frame. Parameters will be merged in current parameter
 * set.
 * @param {Object} options  Available parameters:
 *                          {String | function} [className]
 *                          {String | Number | function} [left]
 *                          {String | Number | function} [top]
 *                          {String | Number | function} [width]
 *                          {String | Number | function} [height]
 */
Component.prototype.setOptions = function setOptions(options) {
  if (options) {
    util.extend(this.options, options);

    this.redraw();
  }
};

/**
 * Get an option value by name
 * The function will first check this.options object, and else will check
 * this.defaultOptions.
 * @param {String} name
 * @return {*} value
 */
Component.prototype.getOption = function getOption(name) {
  var value;
  if (this.options) {
    value = this.options[name];
  }
  if (value === undefined && this.defaultOptions) {
    value = this.defaultOptions[name];
  }
  return value;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
Component.prototype.redraw = function redraw() {
  // should be implemented by the component
  return false;
};

/**
 * Test whether the component is resized since the last time _isResized() was
 * called.
 * @return {Boolean} Returns true if the component is resized
 * @protected
 */
Component.prototype._isResized = function _isResized() {
  var resized = (this.props._previousWidth !== this.props.width ||
      this.props._previousHeight !== this.props.height);

  this.props._previousWidth = this.props.width;
  this.props._previousHeight = this.props.height;

  return resized;
};
