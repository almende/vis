/**
 * @constructor Item
 * @param {ItemSet} parent
 * @param {Object} data       Object containing (optional) parameters type,
 *                            start, end, content, group, className.
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 */
function Item (parent, data, options) {
    this.parent = parent;
    this.data = data;
    this.selected = false;
    this.dom = null;
    this.options = options;

    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

/**
 * Select current item
 */
Item.prototype.select = function () {
    this.selected = true;
};

/**
 * Unselect current item
 */
Item.prototype.unselect = function () {
    this.selected = false;
};

/**
 * Show the Item in the DOM (when not already visible)
 * @return {Boolean} changed
 */
Item.prototype.show = function () {
    return false;
};

/**
 * Hide the Item from the DOM (when visible)
 * @return {Boolean} changed
 */
Item.prototype.hide = function () {
    return false;
};

/**
 * Determine whether the item is visible in its parent window.
 * @return {Boolean} visible
 */
Item.prototype.isVisible = function () {
    // should be implemented by the item
    return false;
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
Item.prototype.repaint = function () {
    // should be implemented by the item
    return false;
};

/**
 * Reflow the item
 * @return {Boolean} resized
 */
Item.prototype.reflow = function () {
    // should be implemented by the item
    return false;
};
