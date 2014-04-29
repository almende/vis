/**
 * @constructor Group
 * @param {Number | String} groupId
 */
function Group (groupId) {
  this.groupId = groupId;
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

  this.dom.group = document.createElement('div');
};

/**
 * Repaint the group
 * @return {boolean} Returns true if the component is resized
 */
Group.prototype.repaint = function repaint() {
  // TODO: implement Group.repaint
};

/**
 * Add an item to the group
 * @param {Item} item
 */
Group.prototype.add = function add(item) {
  this.items[item.id] = item;
};

/**
 * Remove an item from the group
 * @param {Item} item
 */
Group.prototype.remove = function remove(item) {
  delete this.items[item.id];
};

