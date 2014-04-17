/**
 * An GroupSet holds a set of groups
 * @param {Panel} contentPanel      Panel where the ItemSets will be created
 * @param {Panel} labelPanel        Panel where the labels will be created
 * @param {Object} [options]        See GroupSet.setOptions for the available
 *                                  options.
 * @constructor GroupSet
 * @extends Panel
 */
function GroupSet(contentPanel, labelPanel, options) {
  this.id = util.randomUUID();

  this.contentPanel = contentPanel;
  this.labelPanel = labelPanel;
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

  // changes in groups are queued  key/value map containing id/action
  this.queue = {};

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
    className: 'labelSet',
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
  var i, id, group, label,
      update = util.updateProperty,
      asSize = util.option.asSize,
      asString = util.option.asString,
      options = this.options,
      orientation = this.getOption('orientation'),
      frame = this.frame,
      resized = false,
      me = this,
      queue = this.queue,
      groups = this.groups,
      groupsData = this.groupsData;

  this.queue = {}; // clear old queue, we have a copy here

  // show/hide added/changed/removed groups
  var ids = Object.keys(queue);
  if (ids.length) {
    ids.forEach(function (id) {
      var action = queue[id];
      var group = groups[id];

      //noinspection FallthroughInSwitchStatementJS
      switch (action) {
        case 'add':
        case 'update':
          if (!group) {
            var groupOptions = Object.create(me.options);
            util.extend(groupOptions, {
              height: null
            });

            // TODO: do not recreate the group with every update

            group = new Group(me.frame, me.labelSet.frame, id, groupOptions);
            group.on('change', me.emit.bind(me, 'change')); // propagate change event
            group.setRange(me.range);
            group.setItems(me.itemsData); // attach items data
            groups[id] = group;

            // Note: it is important to add the binding after group.setItems
            // is executed, because that will start an infinite loop
            // as this call will already trigger a repaint
          }

          // update group data
          group.setData(groupsData.get(id));
          break;

        case 'remove':
          if (group) {
            group.setItems(); // detach items data
            group.hide(); // FIXME: for some reason when doing setItems after hide, setItems again makes the label visible
            delete groups[id];
          }

          break;

        default:
          console.log('Error: unknown action "' + action + '"');
      }
    });

    // reorder the groups
    this.groupIds = this.groupsData.getIds({
      order: this.options.groupOrder
    });

    // hide the groups now, they will be repainted later in this function
    // in correct order
    this.groupIds.forEach(function (id) {
      groups[id].hide();
    });

    resized = true;
  }

  // repaint all groups in order
  this.groupIds.forEach(function (id) {
    var groupResized = groups[id].repaint();
    resized = resized || groupResized;
  });

  // reposition the labels and calculate the maximum label width
  // TODO: labels are not displayed correctly when orientation=='top'
  // TODO: width of labelPanel is not immediately updated on a change in groups
  var maxWidth = 0;
  for (id in groups) {
    if (groups.hasOwnProperty(id)) {
      group = groups[id];
      maxWidth = Math.max(maxWidth, group.props.label.width);
    }
  }
  resized = util.updateProperty(this.props.labels, 'width', maxWidth) || resized;

  // recalculate the height of the groupset
  var fixedHeight = (asSize(options.height) != null);
  var height;
  if (!fixedHeight) {
    // height is not specified, calculate the sum of the height of all groups
    height = 0;

    for (id in this.groups) {
      if (this.groups.hasOwnProperty(id)) {
        group = this.groups[id];
        height += group.height;
      }
    }
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

  // TODO: replace the following with a panel holding all itemsets, do not hide groups individually
  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      this.groups[groupId].hide();
    }
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * A repaint will be executed when the component is not visible
 * @return {Boolean} changed
 */
GroupSet.prototype.show = function show() {
  // show label set
  if (!this.labelPanel.hasChild(this.labelSet)) {
    this.labelPanel.removeChild(this.labelSet);
  }

  // TODO: replace the following with a panel holding all itemsets, do not show groups individually
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
  this._toQueue(ids, 'update');
};

/**
 * Handle changed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onAdd = function _onAdd(ids) {
  this._toQueue(ids, 'add');
};

/**
 * Handle removed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onRemove = function _onRemove(ids) {
  this._toQueue(ids, 'remove');
};

/**
 * Put groups in the queue to be added/updated/remove
 * @param {Number[]} ids
 * @param {String} action     can be 'add', 'update', 'remove'
 */
GroupSet.prototype._toQueue = function _toQueue(ids, action) {
  // TODO: remove this queuing thing, immediately apply changes

  var queue = this.queue;
  ids.forEach(function (id) {
    queue[id] = action;
  });

  this.emit('change');
};

/**
 * Find the Group from an event target:
 * searches for the attribute 'timeline-groupset' in the event target's element
 * tree, then finds the right group in this groupset
 * @param {Event} event
 * @return {Group | null} group
 */
GroupSet.groupFromTarget = function groupFromTarget (event) {
  var groupset,
      target = event.target;

  while (target) {
    if (target.hasOwnProperty('timeline-groupset')) {
      groupset = target['timeline-groupset'];
      break;
    }
    target = target.parentNode;
  }

  if (groupset) {
    for (var groupId in groupset.groups) {
      if (groupset.groups.hasOwnProperty(groupId)) {
        var group = groupset.groups[groupId];
        if (group.itemset && ItemSet.itemSetFromTarget(event) == group.itemset) {
          return group;
        }
      }
    }
  }

  return null;
};
