/**
 * Prototype for visual components
 */
function Component () {
  this.id = null;
  this.parent = null;
  this.childs = null;
  this.options = null;

  this.frame = null; // main DOM element
  this.top = 0;
  this.left = 0;
  this.width = 0;
  this.height = 0;
}

// Turn the Component into an event emitter
Emitter(Component.prototype);

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

    this.repaint();
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
 * Get the container element of the component, which can be used by a child to
 * add its own widgets. Not all components do have a container for childs, in
 * that case null is returned.
 * @returns {HTMLElement | null} container
 */
// TODO: get rid of the getContainer and getFrame methods, provide these via the options
Component.prototype.getContainer = function getContainer() {
  // should be implemented by the component
  return null;
};

/**
 * Get the frame element of the component, the outer HTML DOM element.
 * @returns {HTMLElement | null} frame
 */
Component.prototype.getFrame = function getFrame() {
  return this.frame;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
Component.prototype.repaint = function repaint() {
  // should be implemented by the component
  return false;
};

/**
 * Hide the component from the DOM
 * @return {Boolean} changed
 */
Component.prototype.hide = function hide() {
  if (this.frame && this.frame.parentNode) {
    this.frame.parentNode.removeChild(this.frame);
    return true;
  }
  else {
    return false;
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * A repaint will be executed when the component is not visible
 * @return {Boolean} changed
 */
Component.prototype.show = function show() {
  if (!this.frame || !this.frame.parentNode) {
    return this.repaint();
  }
  else {
    return false;
  }
};

/**
 * Test whether the component is resized since the last time _isResized() was
 * called.
 * @return {Boolean} Returns true if the component is resized
 * @private
 */
Component.prototype._isResized = function _isResized() {
  var resized = (this._previousWidth !== this.width || this._previousHeight !== this.height);

  this._previousWidth = this.width;
  this._previousHeight = this.height;

  return resized;
};
