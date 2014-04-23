/**
 * An GroupSet holds a set of groups
 * @param {Panel} contentPanel      Panel where the ItemSets will be created
 * @param {Panel} labelPanel        Panel where the labels will be created
 * @param {Panel} backgroundPanel   Panel where the vertical lines of box
 *                                  items are created
 * @param {Panel} axisPanel         Panel on the axis where the dots of box
 *                                  items will be created
 * @param {Object} [options]        See GroupSet.setOptions for the available
 *                                  options.
 * @constructor GroupSet
 * @extends Panel
 */
function GroupSet(contentPanel, labelPanel, backgroundPanel, axisPanel, options) {
  this.id = util.randomUUID();

  this.contentPanel = contentPanel;
  this.labelPanel = labelPanel;
  this.backgroundPanel = backgroundPanel;
  this.axisPanel = axisPanel;
  this.options = options || {};

  this.range = null;      // Range or Object {start: number, end: number}
  this.itemsData = null;  // DataSet with items
  this.groupsData = null; // DataSet with groups

  this.groups = {};       // map with groups
  this.groupIds = [];     // list with ordered group ids

  this.dom = {};
  this.props = {
    labels: {
      width: 0
    }
  };

  // TODO: implement right orientation of the labels (left/right)

  var me = this;
  this.listeners = {
    'add': function (event, params) {
      me._onAdd(params.items);
    },
    'update': function (event, params) {
      me._onUpdate(params.items);
    },
    'remove': function (event, params) {
      me._onRemove(params.items);
    }
  };

  // create HTML DOM
  this._create();
}

GroupSet.prototype = new Panel();

/**
 * Create the HTML DOM elements for the GroupSet
 * @private
 */
GroupSet.prototype._create = function _create () {
  // TODO: reimplement groupSet DOM elements
  var frame = document.createElement('div');
  frame.className = 'groupset';
  frame['timeline-groupset'] = this;
  this.frame = frame;

  this.labelSet = new Panel({
    className: 'labelset',
    width: '100%',
    height: '100%'
  });
  this.labelPanel.appendChild(this.labelSet);
};

/**
 * Get the frame element of component
 * @returns {null} Get frame is not supported by GroupSet
 */
GroupSet.prototype.getFrame = function getFrame() {
  return this.frame;
};

/**
 * Set options for the GroupSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} groupsOrder
 *                           TODO: describe options
 */
GroupSet.prototype.setOptions = Component.prototype.setOptions;

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
GroupSet.prototype.setRange = function (range) {
  this.range = range;

  for (var id in this.groups) {
    if (this.groups.hasOwnProperty(id)) {
      this.groups[id].setRange(range);
    }
  }
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
GroupSet.prototype.setItems = function setItems(items) {
  this.itemsData = items;

  for (var id in this.groups) {
    if (this.groups.hasOwnProperty(id)) {
      var group = this.groups[id];
      // TODO: every group will emit a change event, causing a lot of unnecessary repaints. improve this.
      group.setItems(items);
    }
  }
};

/**
 * Get items
 * @return {vis.DataSet | null} items
 */
GroupSet.prototype.getItems = function getItems() {
  return this.itemsData;
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
GroupSet.prototype.setRange = function setRange(range) {
  this.range = range;
};

/**
 * Set groups
 * @param {vis.DataSet} groups
 */
GroupSet.prototype.setGroups = function setGroups(groups) {
  var me = this,
      ids;

  // unsubscribe from current dataset
  if (this.groupsData) {
    util.forEach(this.listeners, function (callback, event) {
      me.groupsData.unsubscribe(event, callback);
    });

    // remove all drawn groups
    ids = this.groupsData.getIds();
    this._onRemove(ids);
  }

  // replace the dataset
  if (!groups) {
    this.groupsData = null;
  }
  else if (groups instanceof DataSet) {
    this.groupsData = groups;
  }
  else {
    this.groupsData = new DataSet({
      convert: {
        start: 'Date',
        end: 'Date'
      }
    });
    this.groupsData.add(groups);
  }

  if (this.groupsData) {
    // subscribe to new dataset
    var id = this.id;
    util.forEach(this.listeners, function (callback, event) {
      me.groupsData.on(event, callback, id);
    });

    // draw all new groups
    ids = this.groupsData.getIds();
    this._onAdd(ids);
  }

  this.emit('change');
};

/**
 * Get groups
 * @return {vis.DataSet | null} groups
 */
GroupSet.prototype.getGroups = function getGroups() {
  return this.groupsData;
};

/**
 * Set selected items by their id. Replaces the current selection.
 * Unknown id's are silently ignored.
 * @param {Array} [ids] An array with zero or more id's of the items to be
 *                      selected. If ids is an empty array, all items will be
 *                      unselected.
 */
GroupSet.prototype.setSelection = function setSelection(ids) {
  var selection = [],
      groups = this.groups;

  // iterate over each of the groups
  for (var id in groups) {
    if (groups.hasOwnProperty(id)) {
      var group = groups[id];
      group.setSelection(ids);
    }
  }

  return selection;
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
GroupSet.prototype.getSelection = function getSelection() {
  var selection = [],
      groups = this.groups;

  // iterate over each of the groups
  for (var id in groups) {
    if (groups.hasOwnProperty(id)) {
      var group = groups[id];
      selection = selection.concat(group.getSelection());
    }
  }

  return selection;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component was resized since previous repaint
 */
GroupSet.prototype.repaint = function repaint() {
  var i, id, group,
      asSize = util.option.asSize,
      asString = util.option.asString,
      options = this.options,
      orientation = this.getOption('orientation'),
      frame = this.frame,
      resized = false,
      groups = this.groups;

  // repaint all groups in order
  this.groupIds.forEach(function (id) {
    var groupResized = groups[id].repaint();
    resized = resized || groupResized;
  });

  // reposition the labels and calculate the maximum label width
  var maxWidth = 0;
  for (id in groups) {
    if (groups.hasOwnProperty(id)) {
      group = groups[id];
      maxWidth = Math.max(maxWidth, group.props.label.width);
    }
  }
  resized = util.updateProperty(this.props.labels, 'width', maxWidth) || resized;

  // recalculate the height of the groupset, and recalculate top positions of the groups
  var fixedHeight = (asSize(options.height) != null);
  var height;
  if (!fixedHeight) {
    // height is not specified, calculate the sum of the height of all groups
    height = 0;

    this.groupIds.forEach(function (id) {
      var group = groups[id];
      group.top = height;
      if (group.itemSet) group.itemSet.top = group.top; // TODO: this is an ugly hack
      height += group.height;
    });
  }

  // update classname
  frame.className = 'groupset' + (options.className ? (' ' + asString(options.className)) : '');

  // calculate actual size and position
  this.top = frame.offsetTop;
  this.left = frame.offsetLeft;
  this.width = frame.offsetWidth;
  this.height = height;

  return resized;
};

/**
 * Update the groupIds. Requires a repaint afterwards
 * @private
 */
GroupSet.prototype._updateGroupIds = function () {
  // reorder the groups
  this.groupIds = this.groupsData.getIds({
    order: this.options.groupOrder
  });

  // hide the groups now, they will be shown again in the next repaint
  // in correct order
  var groups = this.groups;
  this.groupIds.forEach(function (id) {
    groups[id].hide();
  });
};

/**
 * Get the width of the group labels
 * @return {Number} width
 */
GroupSet.prototype.getLabelsWidth = function getLabelsWidth() {
  return this.props.labels.width;
};

/**
 * Hide the component from the DOM
 */
GroupSet.prototype.hide = function hide() {
  // hide labelset
  this.labelPanel.removeChild(this.labelSet);

  // hide each of the groups
  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      this.groups[groupId].hide();
    }
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * @return {Boolean} changed
 */
GroupSet.prototype.show = function show() {
  // show label set
  if (!this.labelPanel.hasChild(this.labelSet)) {
    this.labelPanel.removeChild(this.labelSet);
  }

  // show each of the groups
  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      this.groups[groupId].show();
    }
  }
};

/**
 * Handle updated groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onUpdate = function _onUpdate(ids) {
  this._onAdd(ids);
};

/**
 * Handle changed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onAdd = function _onAdd(ids) {
  var me = this;

  ids.forEach(function (id) {
    var group = me.groups[id];
    if (!group) {
      var groupOptions = Object.create(me.options);
      util.extend(groupOptions, {
        height: null
      });

      group = new Group(me, me.labelSet, me.backgroundPanel, me.axisPanel, id, groupOptions);
      group.on('change', me.emit.bind(me, 'change')); // propagate change event
      group.setRange(me.range);
      group.setItems(me.itemsData); // attach items data
      me.groups[id] = group;
      group.parent = me;
    }

    // update group data
    group.setData(me.groupsData.get(id));
  });

  this._updateGroupIds();

  this.emit('change');
};

/**
 * Handle removed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onRemove = function _onRemove(ids) {
  var groups = this.groups;
  ids.forEach(function (id) {
    var group = groups[id];

    if (group) {
      group.setItems(); // detach items data
      group.hide(); // FIXME: for some reason when doing setItems after hide, setItems again makes the label visible
      delete groups[id];
    }
  });

  this._updateGroupIds();

  this.emit('change');
};

/**
 * Find the GroupSet from an event target:
 * searches for the attribute 'timeline-groupset' in the event target's element
 * tree, then finds the right group in this groupset
 * @param {Event} event
 * @return {Group | null} group
 */
GroupSet.groupSetFromTarget = function groupSetFromTarget (event) {
  var target = event.target;
  while (target) {
    if (target.hasOwnProperty('timeline-groupset')) {
      return target['timeline-groupset'];
    }
    target = target.parentNode;
  }

  return null;
};

/**
 * Find the Group from an event target:
 * searches for the two elements having attributes 'timeline-groupset' and
 * 'timeline-itemset' in the event target's element, then finds the right group.
 * @param {Event} event
 * @return {Group | null} group
 */
GroupSet.groupFromTarget = function groupFromTarget (event) {
  // find the groupSet
  var groupSet = GroupSet.groupSetFromTarget(event);

  // find the ItemSet
  var itemSet = ItemSet.itemSetFromTarget(event);

  // find the right group
  if (groupSet && itemSet) {
    for (var groupId in groupSet.groups) {
      if (groupSet.groups.hasOwnProperty(groupId)) {
        var group = groupSet.groups[groupId];
        if (group.itemSet == itemSet) {
          return group;
        }
      }
    }
  }

  return null;
};
