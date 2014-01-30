/**
 * An GroupSet holds a set of groups
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See GroupSet.setOptions for the available
 *                                  options.
 * @constructor GroupSet
 * @extends Panel
 */
function GroupSet(parent, depends, options) {
  this.id = util.randomUUID();
  this.parent = parent;
  this.depends = depends;

  this.options = options || {};

  this.range = null;      // Range or Object {start: number, end: number}
  this.itemsData = null;  // DataSet with items
  this.groupsData = null; // DataSet with groups

  this.groups = {};       // map with groups

  this.dom = {};
  this.props = {
    labels: {
      width: 0
    }
  };

  // TODO: implement right orientation of the labels

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
}

GroupSet.prototype = new Panel();

/**
 * Set options for the GroupSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} groupsOrder
 *                           TODO: describe options
 */
GroupSet.prototype.setOptions = Component.prototype.setOptions;

GroupSet.prototype.setRange = function (range) {
  // TODO: implement setRange
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
      me.groupsData.subscribe(event, callback, id);
    });

    // draw all new groups
    ids = this.groupsData.getIds();
    this._onAdd(ids);
  }
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
 * @return {Boolean} changed
 */
GroupSet.prototype.repaint = function repaint() {
  var changed = 0,
      i, id, group, label,
      update = util.updateProperty,
      asSize = util.option.asSize,
      asElement = util.option.asElement,
      options = this.options,
      frame = this.dom.frame,
      labels = this.dom.labels,
      labelSet = this.dom.labelSet;

  // create frame
  if (!this.parent) {
    throw new Error('Cannot repaint groupset: no parent attached');
  }
  var parentContainer = this.parent.getContainer();
  if (!parentContainer) {
    throw new Error('Cannot repaint groupset: parent has no container element');
  }
  if (!frame) {
    frame = document.createElement('div');
    frame.className = 'groupset';
    this.dom.frame = frame;

    var className = options.className;
    if (className) {
      util.addClassName(frame, util.option.asString(className));
    }

    changed += 1;
  }
  if (!frame.parentNode) {
    parentContainer.appendChild(frame);
    changed += 1;
  }

  // create labels
  var labelContainer = asElement(options.labelContainer);
  if (!labelContainer) {
    throw new Error('Cannot repaint groupset: option "labelContainer" not defined');
  }
  if (!labels) {
    labels = document.createElement('div');
    labels.className = 'labels';
    this.dom.labels = labels;
  }
  if (!labelSet) {
    labelSet = document.createElement('div');
    labelSet.className = 'label-set';
    labels.appendChild(labelSet);
    this.dom.labelSet = labelSet;
  }
  if (!labels.parentNode || labels.parentNode != labelContainer) {
    if (labels.parentNode) {
      labels.parentNode.removeChild(labels.parentNode);
    }
    labelContainer.appendChild(labels);
  }

  // reposition frame
  changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));
  changed += update(frame.style, 'top',    asSize(options.top, '0px'));
  changed += update(frame.style, 'left',   asSize(options.left, '0px'));
  changed += update(frame.style, 'width',  asSize(options.width, '100%'));

  // reposition labels
  changed += update(labelSet.style, 'top',    asSize(options.top, '0px'));
  changed += update(labelSet.style, 'height', asSize(options.height, this.height + 'px'));

  var me = this,
      queue = this.queue,
      groups = this.groups,
      groupsData = this.groupsData;

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
              height: null,
              maxHeight: null
            });

            group = new Group(me, id, groupOptions);
            group.setItems(me.itemsData); // attach items data
            groups[id] = group;

            me.controller.add(group);
          }

          // TODO: update group data
          group.data = groupsData.get(id);

          delete queue[id];
          break;

        case 'remove':
          if (group) {
            group.setItems(); // detach items data
            delete groups[id];

            me.controller.remove(group);
          }

          // update lists
          delete queue[id];
          break;

        default:
          console.log('Error: unknown action "' + action + '"');
      }
    });

    // the groupset depends on each of the groups
    //this.depends = this.groups; // TODO: gives a circular reference through the parent

    // TODO: apply dependencies of the groupset

    // update the top positions of the groups in the correct order
    var orderedGroups = this.groupsData.getIds({
      order: this.options.groupOrder
    });
    for (i = 0; i < orderedGroups.length; i++) {
      (function (group, prevGroup) {
        var top = 0;
        if (prevGroup) {
          top = function () {
            // TODO: top must reckon with options.maxHeight
            return prevGroup.top + prevGroup.height;
          }
        }
        group.setOptions({
          top: top
        });
      })(groups[orderedGroups[i]], groups[orderedGroups[i - 1]]);
    }

    // (re)create the labels
    while (labelSet.firstChild) {
      labelSet.removeChild(labelSet.firstChild);
    }
    for (i = 0; i < orderedGroups.length; i++) {
      id = orderedGroups[i];
      label = this._createLabel(id);
      labelSet.appendChild(label);
    }

    changed++;
  }

  // reposition the labels
  // TODO: labels are not displayed correctly when orientation=='top'
  // TODO: width of labelPanel is not immediately updated on a change in groups
  for (id in groups) {
    if (groups.hasOwnProperty(id)) {
      group = groups[id];
      label = group.label;
      if (label) {
        label.style.top = group.top + 'px';
        label.style.height = group.height + 'px';
      }
    }
  }

  return (changed > 0);
};

/**
 * Create a label for group with given id
 * @param {Number} id
 * @return {Element} label
 * @private
 */
GroupSet.prototype._createLabel = function(id) {
  var group = this.groups[id];
  var label = document.createElement('div');
  label.className = 'label';
  var inner = document.createElement('div');
  inner.className = 'inner';
  label.appendChild(inner);

  var content = group.data && group.data.content;
  if (content instanceof Element) {
    inner.appendChild(content);
  }
  else if (content != undefined) {
    inner.innerHTML = content;
  }

  var className = group.data && group.data.className;
  if (className) {
    util.addClassName(label, className);
  }

  group.label = label; // TODO: not so nice, parking labels in the group this way!!!

  return label;
};

/**
 * Get container element
 * @return {HTMLElement} container
 */
GroupSet.prototype.getContainer = function getContainer() {
  return this.dom.frame;
};

/**
 * Get the width of the group labels
 * @return {Number} width
 */
GroupSet.prototype.getLabelsWidth = function getContainer() {
  return this.props.labels.width;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
GroupSet.prototype.reflow = function reflow() {
  var changed = 0,
      id, group,
      options = this.options,
      update = util.updateProperty,
      asNumber = util.option.asNumber,
      asSize = util.option.asSize,
      frame = this.dom.frame;

  if (frame) {
    var maxHeight = asNumber(options.maxHeight);
    var fixedHeight = (asSize(options.height) != null);
    var height;
    if (fixedHeight) {
      height = frame.offsetHeight;
    }
    else {
      // height is not specified, calculate the sum of the height of all groups
      height = 0;

      for (id in this.groups) {
        if (this.groups.hasOwnProperty(id)) {
          group = this.groups[id];
          height += group.height;
        }
      }
    }
    if (maxHeight != null) {
      height = Math.min(height, maxHeight);
    }
    changed += update(this, 'height', height);

    changed += update(this, 'top', frame.offsetTop);
    changed += update(this, 'left', frame.offsetLeft);
    changed += update(this, 'width', frame.offsetWidth);
  }

  // calculate the maximum width of the labels
  var width = 0;
  for (id in this.groups) {
    if (this.groups.hasOwnProperty(id)) {
      group = this.groups[id];
      var labelWidth = group.props && group.props.label && group.props.label.width || 0;
      width = Math.max(width, labelWidth);
    }
  }
  changed += update(this.props.labels, 'width', width);

  return (changed > 0);
};

/**
 * Hide the component from the DOM
 * @return {Boolean} changed
 */
GroupSet.prototype.hide = function hide() {
  if (this.dom.frame && this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
    return true;
  }
  else {
    return false;
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * A repaint will be executed when the component is not visible
 * @return {Boolean} changed
 */
GroupSet.prototype.show = function show() {
  if (!this.dom.frame || !this.dom.frame.parentNode) {
    return this.repaint();
  }
  else {
    return false;
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
  var queue = this.queue;
  ids.forEach(function (id) {
    queue[id] = action;
  });

  if (this.controller) {
    //this.requestReflow();
    this.requestRepaint();
  }
};
