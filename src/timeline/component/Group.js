/**
 * @constructor Group
 * @param {Number | String} groupId
 * @param {ItemSet} itemSet
 */
function Group (groupId, itemSet) {
  this.groupId = groupId;

  this.itemSet = itemSet;

  this.dom = {};
  this.items = {}; // items filtered by groupId of this group

  this._create();
}

/**
 * Create DOM elements for the group
 * @private
 */
Group.prototype._create = function() {
  var label = document.createElement('div');
  label.className = 'vlabel';
  this.dom.label = label;

  var inner = document.createElement('div');
  inner.className = 'inner';
  label.appendChild(inner);
  this.dom.inner = inner;

  var foreground = document.createElement('div');
  foreground.className = 'group';
  foreground['timeline-group'] = this;
  this.dom.foreground = foreground;

  this.dom.background = document.createElement('div');

  this.dom.axis = document.createElement('div');
};

/**
 * Get the foreground container element
 * @return {HTMLElement} foreground
 */
Group.prototype.getForeground = function getForeground() {
  return this.dom.foreground;
};

/**
 * Get the background container element
 * @return {HTMLElement} background
 */
Group.prototype.getBackground = function getBackground() {
  return this.dom.background;
};

/**
 * Get the axis container element
 * @return {HTMLElement} axis
 */
Group.prototype.getAxis = function getAxis() {
  return this.dom.axis;
};

/**
 * Get the height of the itemsets background
 * @return {Number} height
 */
Group.prototype.getBackgroundHeight = function getBackgroundHeight() {
  return this.itemSet.height;
};

/**
 * Repaint this group
 */
Group.prototype.repaint = function repaint() {
  // TODO: implement Group.repaint
};

/**
 * Show this group: attach to the DOM
 */
Group.prototype.show = function show() {
  if (!this.dom.label.parentNode) {
    this.itemSet.getLabelSet().appendChild(this.dom.label);
  }

  if (!this.dom.foreground.parentNode) {
    this.itemSet.getForeground().appendChild(this.dom.foreground);
  }

  if (!this.dom.background.parentNode) {
    this.itemSet.getBackground().appendChild(this.dom.background);
  }

  if (!this.dom.axis.parentNode) {
    this.itemSet.getAxis().appendChild(this.dom.axis);
  }
};

/**
 * Hide this group: remove from the DOM
 */
Group.prototype.hide = function hide() {
  var label = this.dom.label;
  if (label.parentNode) {
    label.parentNode.removeChild(label);
  }

  var foreground = this.dom.foreground;
  if (foreground.parentNode) {
    foreground.parentNode.removeChild(foreground);
  }

  var background = this.dom.background;
  if (background.parentNode) {
    background.parentNode.removeChild(background);
  }

  var axis = this.dom.axis;
  if (axis.parentNode) {
    axis.parentNode.removeChild(axis);
  }
};

/**
 * Add an item to the group
 * @param {Item} item
 */
Group.prototype.add = function add(item) {
  this.items[item.id] = item;
  item.setParent(this);
};

/**
 * Remove an item from the group
 * @param {Item} item
 */
Group.prototype.remove = function remove(item) {
  delete this.items[item.id];
  item.setParent(this.itemSet);
};

