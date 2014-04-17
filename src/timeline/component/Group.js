/**
 * @constructor Group
 * @param {Panel} contentPanel
 * @param {Panel} labelPanel
 * @param {Number | String} groupId
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 * @extends Component
 */
function Group (contentPanel, labelPanel, groupId, options) {
  this.id = util.randomUUID();
  this.contentPanel = contentPanel;
  this.labelPanel = labelPanel;

  this.groupId = groupId;
  this.itemSet = null;    // ItemSet
  this.options = options || {};
  this.options.top = 0;

  this.props = {
    label: {
      width: 0,
      height: 0
    }
  };

  this.dom = {};

  this.top = 0;
  this.left = 0;
  this.width = 0;
  this.height = 0;

  this._create();
}

Group.prototype = new Component();

// TODO: comment
Group.prototype.setOptions = Component.prototype.setOptions;

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
};

/**
 * Get the HTML DOM label of this group
 * @returns {Element} label
 */
Group.prototype.getLabel = function getLabel() {
  return this.dom.label;
};

/**
 * Set the group data for this group
 * @param {Object} data   Group data, can contain properties content and className
 */
Group.prototype.setData = function setData(data) {
  // update contents
  var content = data && data.content;
  if (content instanceof Element) {
    this.dom.inner.appendChild(content);
  }
  else if (content != undefined) {
    this.dom.inner.innerHTML = content;
  }
  else {
    this.dom.inner.innerHTML = this.groupId;
  }

  // update className
  var className = data && data.className;
  if (className) {
    util.addClassName(this.dom.label, className);
  }
};

/**
 * Set item set for the group. The group will create a view on the itemSet,
 * filtered by the groups id.
 * @param {DataSet | DataView} itemSet
 */
Group.prototype.setItems = function setItems(itemSet) {
  if (this.itemSet) {
    // remove current item set
    this.itemSet.hide();
    this.itemSet.setItems();
    this.contentPanel.removeChild(this.itemSet);
    this.itemSet = null;
  }

  if (itemSet) {
    var groupId = this.groupId;

    var itemSetOptions = Object.create(this.options);
    this.itemSet = new ItemSet(itemSetOptions);
    this.itemSet.on('change', this.emit.bind(this, 'change')); // propagate change event
    this.contentPanel.appendChild(this.itemSet);

    if (this.range) this.itemSet.setRange(this.range);

    this.view = new DataView(itemSet, {
      filter: function (item) {
        return item.group == groupId;
      }
    });
    this.itemSet.setItems(this.view);
  }
};

/**
 * hide the group, detach from DOM if needed
 */
Group.prototype.hide = function hide() {
  if (this.itemSet) this.itemSet.hide();
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
Group.prototype.setRange = function (range) {
  this.range = range;

  if (this.itemSet) this.itemSet.setRange(range);
};

/**
 * Set selected items by their id. Replaces the current selection.
 * Unknown id's are silently ignored.
 * @param {Array} [ids] An array with zero or more id's of the items to be
 *                      selected. If ids is an empty array, all items will be
 *                      unselected.
 */
Group.prototype.setSelection = function setSelection(ids) {
  if (this.itemSet) this.itemSet.setSelection(ids);
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
Group.prototype.getSelection = function getSelection() {
  return this.itemSet ? this.itemSet.getSelection() : [];
};

/**
 * Repaint the group
 * @return {boolean} Returns true if the component is resized
 */
Group.prototype.repaint = function repaint() {
  var resized = this.itemSet.repaint();

  // TODO: top is redundant, cleanup
  this.top    = this.itemSet ? this.itemSet.top : 0;
  this.height = this.itemSet ? this.itemSet.height : 0;

  this.dom.label.style.height = this.height + 'px';

  // calculate inner size of the label
  resized = util.updateProperty(this.props.label, 'width', this.dom.inner.clientWidth) || resized;
  resized = util.updateProperty(this.props.label, 'height', this.dom.inner.clientHeight) || resized;

  return resized;
};
