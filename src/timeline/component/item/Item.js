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
  this.displayed = false;
  this.dirty = true;

  this.top = null;
  this.left = null;
  this.width = null;
  this.height = null;
}

/**
 * Select current item
 */
Item.prototype.select = function select() {
  this.selected = true;
  if (this.displayed) this.repaint();
};

/**
 * Unselect current item
 */
Item.prototype.unselect = function unselect() {
  this.selected = false;
  if (this.displayed) this.repaint();
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
 */
Item.prototype.repaint = function repaint() {
  // should be implemented by the item
};

/**
 * Reposition the Item horizontally
 */
Item.prototype.repositionX = function repositionX() {
  // should be implemented by the item
};

/**
 * Reposition the Item vertically
 */
Item.prototype.repositionY = function repositionY() {
  // should be implemented by the item
};

/**
 * Repaint a delete button on the top right of the item when the item is selected
 * @param {HTMLElement} anchor
 * @private
 */
Item.prototype._repaintDeleteButton = function (anchor) {
  if (this.selected && this.options.editable && !this.dom.deleteButton) {
    // create and show button
    var parent = this.parent;
    var id = this.id;

    var deleteButton = document.createElement('div');
    deleteButton.className = 'delete';
    deleteButton.title = 'Delete this item';

    Hammer(deleteButton, {
      preventDefault: true
    }).on('tap', function (event) {
      parent.removeItem(id);
      event.stopPropagation();
    });

    anchor.appendChild(deleteButton);
    this.dom.deleteButton = deleteButton;
  }
  else if (!this.selected && this.dom.deleteButton) {
    // remove button
    if (this.dom.deleteButton.parentNode) {
      this.dom.deleteButton.parentNode.removeChild(this.dom.deleteButton);
    }
    this.dom.deleteButton = null;
  }
};
