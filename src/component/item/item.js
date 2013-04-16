
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
    this.visible = true;
    this.dom = null;
    this.options = options;
}

Item.prototype = new Component();

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

// create a namespace for all item types
var itemTypes = {};