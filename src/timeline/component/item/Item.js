/**
 * @constructor Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing (optional) parameters type,
 *                                  start, end, content, group, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function Item (parent, data, options, defaultOptions) {
  this.parent = parent;
  this.data = data;
  this.dom = null;
  this.options = options || {};
  this.defaultOptions = defaultOptions || {};

  this.selected = false;
  this.visible = false;
  this.top = 0;
  this.left = 0;
  this.width = 0;
  this.height = 0;
}

/**
 * Select current item
 */
Item.prototype.select = function select() {
  this.selected = true;
  if (this.visible) this.repaint();
};

/**
 * Unselect current item
 */
Item.prototype.unselect = function unselect() {
  this.selected = false;
  if (this.visible) this.repaint();
};

/**
 * Show the Item in the DOM (when not already visible)
 * @return {Boolean} changed
 */
Item.prototype.show = function show() {
  return false;
};

/**
 * Hide the Item from the DOM (when visible)
 * @return {Boolean} changed
 */
Item.prototype.hide = function hide() {
  return false;
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
Item.prototype.repaint = function repaint() {
  // should be implemented by the item
  return false;
};

/**
 * Reflow the item
 * @return {Boolean} resized
 */
Item.prototype.reflow = function reflow() {
  // should be implemented by the item
  return false;
};

/**
 * Return the items width
 * @return {Integer} width
 */
Item.prototype.getWidth = function getWidth() {
  return this.width;
}
