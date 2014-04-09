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

  this.top = 0;
  this.left = 0;
  this.width = 0;
  this.height = 0;
}

Group.prototype = new Component();

// TODO: comment
Group.prototype.setOptions = Component.prototype.setOptions;

/**
 * Set item set for the group. The group will create a view on the itemSet,
 * filtered by the groups id.
 * @param {DataSet | DataView} items
 */
Group.prototype.setItems = function setItems(items) {
  if (this.itemSet) {
    // remove current item set
    this.itemSet.hide();
    this.itemSet.setItems();
    this.contentPanel.removeChild(this.itemSet);
    this.itemSet = null;
  }

  if (items) {
    var groupId = this.groupId;

    var itemSetOptions = Object.create(this.options);
    this.itemSet = new ItemSet(itemSetOptions);
    this.itemSet.on('change', this.emit.bind(this, 'change')); // propagate change event
    this.contentPanel.appendChild(this.itemSet);

    if (this.range) this.itemSet.setRange(this.range);

    this.view = new DataView(items, {
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

  this.top    = this.itemSet ? this.itemSet.top : 0;
  this.height = this.itemSet ? this.itemSet.height : 0;

  // TODO: reckon with the height of the group label

  if (this.label) {
    // TODO: only update the labels width/height when the label is changed
    var inner = this.label.firstChild;
    this.props.label.width = inner.clientWidth;
    this.props.label.height = inner.clientHeight;
  }
  else {
    this.props.label.width = 0;
    this.props.label.height = 0;
  }

  return resized;
};
