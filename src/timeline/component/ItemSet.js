/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Panel} backgroundPanel Panel which can be used to display the
 *                                vertical lines of box items.
 * @param {Panel} axisPanel       Panel on the axis where the dots of box-items
 *                                can be displayed.
 * @param {Panel} labelPanel      Left side panel holding labels
 * @param {Object} [options]      See ItemSet.setOptions for the available options.
 * @constructor ItemSet
 * @extends Panel
 */
function ItemSet(backgroundPanel, axisPanel, labelPanel, options) {
  this.id = util.randomUUID();

  // one options object is shared by this itemset and all its items
  this.options = options || {};
  this.backgroundPanel = backgroundPanel;
  this.axisPanel = axisPanel;
  this.labelPanel = labelPanel;
  this.itemOptions = Object.create(this.options);
  this.dom = {};
  this.props = {
    labels: {
      width: 0
    }
  };
  this.hammer = null;

  var me = this;
  this.itemsData = null;    // DataSet
  this.groupsData = null;   // DataSet
  this.range = null;        // Range or Object {start: number, end: number}

  // listeners for the DataSet of the items
  this.itemListeners = {
    'add': function (event, params, senderId) {
      if (senderId != me.id) me._onAdd(params.items);
    },
    'update': function (event, params, senderId) {
      if (senderId != me.id) me._onUpdate(params.items);
    },
    'remove': function (event, params, senderId) {
      if (senderId != me.id) me._onRemove(params.items);
    }
  };

  // listeners for the DataSet of the groups
  this.groupListeners = {
    'add': function (event, params, senderId) {
      if (senderId != me.id) me._onAddGroups(params.items);
    },
    'update': function (event, params, senderId) {
      if (senderId != me.id) me._onUpdateGroups(params.items);
    },
    'remove': function (event, params, senderId) {
      if (senderId != me.id) me._onRemoveGroups(params.items);
    }
  };

  this.items = {};        // object with an Item for every data item
  this.orderedItems = {
    byStart: [],
    byEnd: []
  };

  this.groups = {}; // Group object for every group
  this.groupIds = [];
  this.ungrouped = null; // Group holding all ungrouped items (yeah, funny right?), used when there are no groups

  this.visibleItems = []; // visible, ordered items
  this.selection = [];  // list with the ids of all selected nodes
  this.stack = new Stack(Object.create(this.options));
  this.stackDirty = true; // if true, all items will be restacked on next repaint

  this.touchParams = {}; // stores properties while dragging
  // create the HTML DOM
  this._create();
}

ItemSet.prototype = new Panel();

// available item types will be registered here
ItemSet.types = {
  box: ItemBox,
  range: ItemRange,
  rangeoverflow: ItemRangeOverflow,
  point: ItemPoint
};

/**
 * Create the HTML DOM for the ItemSet
 */
ItemSet.prototype._create = function _create(){
  var frame = document.createElement('div');
  frame['timeline-itemset'] = this;
  this.frame = frame;

  // create background panel
  var background = document.createElement('div');
  background.className = 'background';
  this.backgroundPanel.frame.appendChild(background);
  this.dom.background = background;

  // create foreground panel
  var foreground = document.createElement('div');
  foreground.className = 'foreground';
  frame.appendChild(foreground);
  this.dom.foreground = foreground;

  // create axis panel
  var axis = document.createElement('div');
  axis.className = 'axis';
  this.dom.axis = axis;
  this.axisPanel.frame.appendChild(axis);

  // attach event listeners
  // TODO: use event listeners from the rootpanel to improve performance?
  this.hammer = Hammer(frame, {
    prevent_default: true
  });
  this.hammer.on('dragstart', this._onDragStart.bind(this));
  this.hammer.on('drag',      this._onDrag.bind(this));
  this.hammer.on('dragend',   this._onDragEnd.bind(this));
};

/**
 * Set options for the ItemSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} [className]
 *                              class name for the itemset
 *                           {String} [type]
 *                              Default type for the items. Choose from 'box'
 *                              (default), 'point', or 'range'. The default
 *                              Style can be overwritten by individual items.
 *                           {String} align
 *                              Alignment for the items, only applicable for
 *                              ItemBox. Choose 'center' (default), 'left', or
 *                              'right'.
 *                           {String} orientation
 *                              Orientation of the item set. Choose 'top' or
 *                              'bottom' (default).
 *                           {Number} margin.axis
 *                              Margin between the axis and the items in pixels.
 *                              Default is 20.
 *                           {Number} margin.item
 *                              Margin between items in pixels. Default is 10.
 *                           {Number} padding
 *                              Padding of the contents of an item in pixels.
 *                              Must correspond with the items css. Default is 5.
 *                           {Function} snap
 *                              Function to let items snap to nice dates when
 *                              dragging items.
 */
ItemSet.prototype.setOptions = Component.prototype.setOptions;

/**
 * Hide the component from the DOM
 */
ItemSet.prototype.hide = function hide() {
  // remove the axis with dots
  if (this.dom.axis.parentNode) {
    this.dom.axis.parentNode.removeChild(this.dom.axis);
  }

  // remove the background with vertical lines
  if (this.dom.background.parentNode) {
    this.dom.background.parentNode.removeChild(this.dom.background);
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * @return {Boolean} changed
 */
ItemSet.prototype.show = function show() {
  // show axis with dots
  if (!this.dom.axis.parentNode) {
    this.axisPanel.frame.appendChild(this.dom.axis);
  }

  // show background with vertical lines
  if (!this.dom.background.parentNode) {
    this.backgroundPanel.frame.appendChild(this.dom.background);
  }
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
ItemSet.prototype.setRange = function setRange(range) {
  if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
    throw new TypeError('Range must be an instance of Range, ' +
        'or an object containing start and end.');
  }
  this.range = range;
};

/**
 * Set selected items by their id. Replaces the current selection
 * Unknown id's are silently ignored.
 * @param {Array} [ids] An array with zero or more id's of the items to be
 *                      selected. If ids is an empty array, all items will be
 *                      unselected.
 */
ItemSet.prototype.setSelection = function setSelection(ids) {
  var i, ii, id, item;

  if (ids) {
    if (!Array.isArray(ids)) {
      throw new TypeError('Array expected');
    }

    // unselect currently selected items
    for (i = 0, ii = this.selection.length; i < ii; i++) {
      id = this.selection[i];
      item = this.items[id];
      if (item) item.unselect();
    }

    // select items
    this.selection = [];
    for (i = 0, ii = ids.length; i < ii; i++) {
      id = ids[i];
      item = this.items[id];
      if (item) {
        this.selection.push(id);
        item.select();
      }
    }
  }
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
ItemSet.prototype.getSelection = function getSelection() {
  return this.selection.concat([]);
};

/**
 * Deselect a selected item
 * @param {String | Number} id
 * @private
 */
ItemSet.prototype._deselect = function _deselect(id) {
  var selection = this.selection;
  for (var i = 0, ii = selection.length; i < ii; i++) {
    if (selection[i] == id) { // non-strict comparison!
      selection.splice(i, 1);
      break;
    }
  }
};

/**
 * Return the item sets frame
 * @returns {HTMLElement} frame
 */
ItemSet.prototype.getFrame = function getFrame() {
  return this.frame;
};

/**
 * This function does a binary search for a visible item. The user can select either the this.orderedItems.byStart or .byEnd
 * arrays. This is done by giving a boolean value true if you want to use the byEnd.
 * This is done to be able to select the correct if statement (we do not want to check if an item is visible, we want to check
 * if the time we selected (start or end) is within the current range).
 *
 * The trick is that every interval has to either enter the screen at the initial load or by dragging. The case of the ItemRange that is
 * before and after the current range is handled by simply checking if it was in view before and if it is again. For all the rest,
 * either the start OR end time has to be in the range.
 *
 * @param {{byStart: Item[], byEnd: Item[]}} orderedItems
 * @param {{start: number, end: number}} range
 * @param {Boolean} byEnd
 * @returns {number}
 * @private
 */
ItemSet.prototype._binarySearch = function _binarySearch(orderedItems, range, byEnd) {
  var array = [];
  var byTime = byEnd ? "end" : "start";
  if (byEnd == true) {array = orderedItems.byEnd;  }
  else               {array = orderedItems.byStart;}

  var interval = range.end - range.start;

  var found = false;
  var low = 0;
  var high = array.length;
  var guess = Math.floor(0.5*(high+low));
  var newGuess;

  if (high == 0) {guess = -1;}
  else if (high == 1) {
    if ((array[guess].data[byTime] > range.start - interval) && (array[guess].data[byTime] < range.end)) {
      guess =  0;
    }
    else {
      guess = -1;
    }
  }
  else {
    high -= 1;
    while (found == false) {
      if ((array[guess].data[byTime] > range.start - interval) && (array[guess].data[byTime] < range.end)) {
        found = true;
      }
      else {
        if (array[guess].data[byTime] < range.start - interval) { // it is too small --> increase low
          low = Math.floor(0.5*(high+low));
        }
        else {  // it is too big --> decrease high
          high = Math.floor(0.5*(high+low));
        }
        newGuess = Math.floor(0.5*(high+low));
        // not in list;
        if (guess == newGuess) {
          guess = -1;
          found = true;
        }
        else {
          guess = newGuess;
        }
      }
    }
  }
  return guess;
};

/**
 * this function checks if an item is invisible. If it is NOT we make it visible and add it to the global visible items. If it is, return true.
 *
 * @param {Item} item
 * @param {Item[]} visibleItems
 * @returns {boolean}
 * @private
 */
ItemSet.prototype._checkIfInvisible = function _checkIfInvisible(item, visibleItems) {
  if (item.isVisible(this.range)) {
    if (!item.displayed) item.show();
    item.repositionX();
    if (visibleItems.indexOf(item) == -1) {
      visibleItems.push(item);
    }
    return false;
  }
  else {
    return true;
  }
};


/**
 * this function is very similar to the _checkIfInvisible() but it does not return booleans, hides the item if it should not be seen and always adds to the visibleItems.
 * this one is for brute forcing and hiding.
 *
 * @param {Item} item
 * @param {Array} visibleItems
 * @private
 */
ItemSet.prototype._checkIfVisible = function _checkIfVisible(item, visibleItems) {
  if (item.isVisible(this.range)) {
    if (!item.displayed) item.show();
    // reposition item horizontally
    item.repositionX();
    visibleItems.push(item);
  }
  else {
    if (item.displayed) item.hide();
  }
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
ItemSet.prototype.repaint = function repaint() {
  var asSize = util.option.asSize,
      asString = util.option.asString,
      options = this.options,
      orientation = this.getOption('orientation'),
      frame = this.frame,
      i, ii;

  // update className
  frame.className = 'itemset' + (options.className ? (' ' + asString(options.className)) : '');

  // check whether zoomed (in that case we need to re-stack everything)
  var visibleInterval = this.range.end - this.range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval) || (this.width != this.lastWidth);
  this.lastVisibleInterval = visibleInterval;
  this.lastWidth = this.width;

  this.visibleItems = this._updateVisibleItems(this.orderedItems, this.visibleItems, this.range);

  // reposition visible items vertically.
  //this.stack.order(this.visibleItems); // TODO: improve ordering
  var force = this.stackDirty || zoomed; // force re-stacking of all items if true
  this.stack.stack(this.visibleItems, force);
  this.stackDirty = false;
  for (i = 0, ii = this.visibleItems.length; i < ii; i++) {
    this.visibleItems[i].repositionY();
  }

  // recalculate the height of the itemset
  var marginAxis = (options.margin && 'axis' in options.margin) ? options.margin.axis : this.itemOptions.margin.axis,
      marginItem = (options.margin && 'item' in options.margin) ? options.margin.item : this.itemOptions.margin.item,
      height;

  // determine the height from the stacked items
  var visibleItems = this.visibleItems;
  if (visibleItems.length) {
    var min = visibleItems[0].top;
    var max = visibleItems[0].top + visibleItems[0].height;
    util.forEach(visibleItems, function (item) {
      min = Math.min(min, item.top);
      max = Math.max(max, (item.top + item.height));
    });
    height = (max - min) + marginAxis + marginItem;
  }
  else {
    height = marginAxis + marginItem;
  }

  // reposition frame
  frame.style.left    = asSize(options.left, '');
  frame.style.right   = asSize(options.right, '');
  frame.style.top     = asSize((orientation == 'top') ? '0' : '');
  frame.style.bottom  = asSize((orientation == 'top') ? '' : '0');
  frame.style.width   = asSize(options.width, '100%');
  frame.style.height  = asSize(height);
  //frame.style.height  = asSize('height' in options ? options.height : height); // TODO: reckon with height

  // calculate actual size and position
  this.top = frame.offsetTop;
  this.left = frame.offsetLeft;
  this.width = frame.offsetWidth;
  this.height = height;

  // reposition axis
  this.dom.axis.style.left   = asSize(options.left, '0');
  this.dom.axis.style.right  = asSize(options.right, '');
  this.dom.axis.style.width  = asSize(options.width, '100%');
  this.dom.axis.style.height = asSize(0);
  this.dom.axis.style.top    = asSize((orientation == 'top') ? '0' : '');
  this.dom.axis.style.bottom = asSize((orientation == 'top') ? '' : '0');

  return this._isResized();
};

/**
 * Update the visible items
 * @param {{byStart: Item[], byEnd: Item[]}} orderedItems   All items ordered by start date and by end date
 * @param {Item[]} visibleItems                             The previously visible items.
 * @param {{start: number, end: number}} range              Visible range
 * @return {Item[]} visibleItems                            The new visible items.
 * @private
 */
ItemSet.prototype._updateVisibleItems = function _updateVisibleItems(orderedItems, visibleItems, range) {
  var initialPosByStart,
      newVisibleItems = [],
      i;

  // first check if the items that were in view previously are still in view.
  // this handles the case for the ItemRange that is both before and after the current one.
  if (visibleItems.length > 0) {
    for (i = 0; i < visibleItems.length; i++) {
      this._checkIfVisible(visibleItems[i], newVisibleItems);
    }
  }

  // If there were no visible items previously, use binarySearch to find a visible ItemPoint or ItemRange (based on startTime)
  if (newVisibleItems.length == 0) {
    initialPosByStart = this._binarySearch(orderedItems, range, false);
  }
  else {
    initialPosByStart = orderedItems.byStart.indexOf(newVisibleItems[0]);
  }

  // use visible search to find a visible ItemRange (only based on endTime)
  var initialPosByEnd = this._binarySearch(orderedItems, range, true);

  // if we found a initial ID to use, trace it up and down until we meet an invisible item.
  if (initialPosByStart != -1) {
    for (i = initialPosByStart; i >= 0; i--) {
      if (this._checkIfInvisible(orderedItems.byStart[i], newVisibleItems)) {break;}
    }
    for (i = initialPosByStart + 1; i < orderedItems.byStart.length; i++) {
      if (this._checkIfInvisible(orderedItems.byStart[i], newVisibleItems)) {break;}
    }
  }

  // if we found a initial ID to use, trace it up and down until we meet an invisible item.
  if (initialPosByEnd != -1) {
    for (i = initialPosByEnd; i >= 0; i--) {
      if (this._checkIfInvisible(orderedItems.byEnd[i], newVisibleItems)) {break;}
    }
    for (i = initialPosByEnd + 1; i < orderedItems.byEnd.length; i++) {
      if (this._checkIfInvisible(orderedItems.byEnd[i], newVisibleItems)) {break;}
    }
  }

  return newVisibleItems;
};

/**
 * Create or delete the group holding all ungrouped items. This group is used when
 * there are no groups specified.
 * @protected
 */
ItemSet.prototype._updateUngrouped = function _updateUngrouped() {
  if (this.groupsData) {
    // remove the group holding all (unfiltered) items
    if (this.ungrouped) {
      this.ungrouped.hide();
      this.ungrouped = null;
    }
  }
  else {
    // create a group holding all (unfiltered) items
    if (!this.ungrouped) {
      var id = null;
      this.ungrouped = new Group(id, this, this.dom.background, this.dom.axis, this.labelPanel.frame);

      for (var itemId in this.items) {
        if (this.items.hasOwnProperty(itemId)) {
          this.ungrouped.add(this.items[itemId]);
        }
      }

      this.ungrouped.show();
    }
  }
};

/**
 * Get the foreground container element
 * @return {HTMLElement} foreground
 */
ItemSet.prototype.getForeground = function getForeground() {
  return this.dom.foreground;
};

/**
 * Get the background container element
 * @return {HTMLElement} background
 */
ItemSet.prototype.getBackground = function getBackground() {
  return this.dom.background;
};

/**
 * Get the axis container element
 * @return {HTMLElement} axis
 */
ItemSet.prototype.getAxis = function getAxis() {
  return this.dom.axis;
};

/**
 * Get the element for the labelset
 * @return {HTMLElement} labelSet
 */
ItemSet.prototype.getLabelSet = function getLabelSet() {
  return this.labelPanel.frame;
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
ItemSet.prototype.setItems = function setItems(items) {
  var me = this,
      ids,
      oldItemsData = this.itemsData;

  // replace the dataset
  if (!items) {
    this.itemsData = null;
  }
  else if (items instanceof DataSet || items instanceof DataView) {
    this.itemsData = items;
  }
  else {
    throw new TypeError('Data must be an instance of DataSet or DataView');
  }

  if (oldItemsData) {
    // unsubscribe from old dataset
    util.forEach(this.itemListeners, function (callback, event) {
      oldItemsData.unsubscribe(event, callback);
    });

    // remove all drawn items
    ids = oldItemsData.getIds();
    this._onRemove(ids);
  }

  if (this.itemsData) {
    // subscribe to new dataset
    var id = this.id;
    util.forEach(this.itemListeners, function (callback, event) {
      me.itemsData.on(event, callback, id);
    });

    // add all new items
    ids = this.itemsData.getIds();
    this._onAdd(ids);

    // update the group holding all ungrouped items
    this._updateUngrouped();
  }
};

/**
 * Get the current items
 * @returns {vis.DataSet | null}
 */
ItemSet.prototype.getItems = function getItems() {
  return this.itemsData;
};

/**
 * Set groups
 * @param {vis.DataSet} groups
 */
ItemSet.prototype.setGroups = function setGroups(groups) {
  var me = this,
      ids;

  // unsubscribe from current dataset
  if (this.groupsData) {
    util.forEach(this.groupListeners, function (callback, event) {
      me.groupsData.unsubscribe(event, callback);
    });

    // remove all drawn groups
    ids = this.groupsData.getIds();
    this._onRemoveGroups(ids);
  }

  // replace the dataset
  if (!groups) {
    this.groupsData = null;
  }
  else if (groups instanceof DataSet || groups instanceof DataView) {
    this.groupsData = groups;
  }
  else {
    throw new TypeError('Data must be an instance of DataSet or DataView');
  }

  if (this.groupsData) {
    // subscribe to new dataset
    var id = this.id;
    util.forEach(this.groupListeners, function (callback, event) {
      me.groupsData.on(event, callback, id);
    });

    // draw all ms
    ids = this.groupsData.getIds();
    this._onAddGroups(ids);
  }

  // update the group holding all ungrouped items
  this._updateUngrouped();

  this.emit('change');
};

/**
 * Get the current groups
 * @returns {vis.DataSet | null} groups
 */
ItemSet.prototype.getGroups = function getGroups() {
  return this.groupsData;
};

/**
 * Remove an item by its id
 * @param {String | Number} id
 */
ItemSet.prototype.removeItem = function removeItem (id) {
  var item = this.itemsData.get(id),
      dataset = this._myDataSet();

  if (item) {
    // confirm deletion
    this.options.onRemove(item, function (item) {
      if (item) {
        // remove by id here, it is possible that an item has no id defined
        // itself, so better not delete by the item itself
        dataset.remove(id);
      }
    });
  }
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @protected
 */
ItemSet.prototype._onUpdate = function _onUpdate(ids) {
  var me = this,
      items = this.items,
      itemOptions = this.itemOptions;

  ids.forEach(function (id) {
    var itemData = me.itemsData.get(id),
        item = items[id],
        type = itemData.type ||
            (itemData.start && itemData.end && 'range') ||
            me.options.type ||
            'box';

    var constructor = ItemSet.types[type];

    if (item) {
      // update item
      if (!constructor || !(item instanceof constructor)) {
        // item type has changed, delete the item and recreate it
        me._removeItem(item);
        item = null;
      }
      else {
        me._updateItem(item, itemData);
      }
    }

    if (!item) {
      // create item
      if (constructor) {
        item = new constructor(me, itemData, me.options, itemOptions);
        item.id = id; // TODO: not so nice setting id afterwards
        me._addItem(item);
      }
      else {
        throw new TypeError('Unknown item type "' + type + '"');
      }
    }

    if (type == 'range' && me.visibleItems.indexOf(item) == -1) {
      me._checkIfVisible(item, me.visibleItems);
    }
  });

  this._order();
  this.stackDirty = true; // force re-stacking of all items next repaint
  this.emit('change');
};

/**
 * Handle added items
 * @param {Number[]} ids
 * @protected
 */
ItemSet.prototype._onAdd = ItemSet.prototype._onUpdate;

/**
 * Handle removed items
 * @param {Number[]} ids
 * @protected
 */
ItemSet.prototype._onRemove = function _onRemove(ids) {
  var count = 0;
  var me = this;
  ids.forEach(function (id) {
    var item = me.items[id];
    if (item) {
      count++;
      me._removeItem(item);
    }
  });

  if (count) {
    // update order
    this._order();
    this.stackDirty = true; // force re-stacking of all items next repaint
    this.emit('change');
  }
};

/**
 * Handle updated groups
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdateGroups = function _onUpdateGroups(ids) {
  this._onAddGroups(ids);
};

/**
 * Handle changed groups
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAddGroups = function _onAddGroups(ids) {
  var me = this;

  ids.forEach(function (id) {
    var group = me.groups[id];
    if (!group) {
      var groupOptions = Object.create(me.options);
      util.extend(groupOptions, {
        height: null
      });

      group = new Group(id, me, me.dom.background, me.dom.axis, me.labelPanel.frame);
      me.groups[id] = group;

      // add items with this groupId to the new group
      for (var itemId in me.items) {
        if (me.items.hasOwnProperty(itemId)) {
          var item = me.items[itemId];
          if (item.data.group == id) {
            group.add(item);
          }
        }
      }

      group.show();
    }
  });

  this._updateGroupIds();
};

/**
 * Handle removed groups
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemoveGroups = function _onRemoveGroups(ids) {
  var groups = this.groups;
  ids.forEach(function (id) {
    var group = groups[id];

    if (group) {
      group.hide();
      delete groups[id];
    }
  });

  this._updateGroupIds();
};

/**
 * Update the groupIds. Requires a repaint afterwards
 * @private
 */
ItemSet.prototype._updateGroupIds = function () {
  // reorder the groups
  this.groupIds = this.groupsData.getIds({
    order: this.options.groupOrder
  });
};

/**
 * Add a new item
 * @param {Item} item
 * @private
 */
ItemSet.prototype._addItem = function _addItem(item) {
  this.items[item.id] = item;

  // add to group
  if (this.ungrouped) {
    this.ungrouped.add(item);
  }
  else {
    var group = this.groups[item.data.group];
    if (group) group.add(item);
  }
};

/**
 * Update an existing item
 * @param {Item} item
 * @param {Object} itemData
 * @private
 */
ItemSet.prototype._updateItem = function _updateItem(item, itemData) {
  var oldGroup = item.data.group,
      group;

  item.data = itemData;
  item.repaint();

  // update group (if any)
  if (oldGroup != item.data.group) {
    if (oldGroup) {
      group = this.groups[item.data.group];
      if (group) group.remove(item);
    }

    if (this.ungrouped) {
      this.ungrouped.add(item);
    }
    else {
      group = this.groups[item.data.group];
      if (group) group.add(item);
    }
  }
};

/**
 * Delete an item from the ItemSet: remove it from the DOM, from the map
 * with items, and from the map with visible items, and from the selection
 * @param {Item} item
 * @private
 */
ItemSet.prototype._removeItem = function _removeItem(item) {
  // remove from DOM
  item.hide();

  // remove from items
  delete this.items[item.id];

  // remove from visible items
  var index = this.visibleItems.indexOf(item);
  if (index != -1) this.visibleItems.splice(index, 1);

  // remove from selection
  index = this.selection.indexOf(item.id);
  if (index != -1) this.selection.splice(index, 1);

  // remove from group
  if (this.ungrouped) {
    this.ungrouped.remove(item);
  }
  else {
    var group = this.groups[item.data.group];
    if (group) group.remove(item);
  }
};

/**
 * Order the items
 * @private
 */
ItemSet.prototype._order = function _order() {
  var array = util.toArray(this.items);
  this.orderedItems.byStart = array;
  this.orderedItems.byEnd = this._constructByEndArray(array);

  //this.orderedItems.byEnd = [].concat(array); // this copies the array

  // reorder the items
  this.stack.orderByStart(this.orderedItems.byStart);
  this.stack.orderByEnd(this.orderedItems.byEnd);
};

/**
 * Create an array containing all items being a range (having an end date)
 * @param array
 * @returns {Array}
 * @private
 */
ItemSet.prototype._constructByEndArray = function _constructByEndArray(array) {
  var endArray = [];

  for (var i = 0; i < array.length; i++) {
    if (array[i] instanceof ItemRange) {
      endArray.push(array[i]);
    }
  }
  return endArray;
};

/**
 * Get the width of the group labels
 * @return {Number} width
 */
ItemSet.prototype.getLabelsWidth = function getLabelsWidth() {
  return this.props.labels.width;
};

/**
 * Get the height of the itemsets background
 * @return {Number} height
 */
ItemSet.prototype.getBackgroundHeight = function getBackgroundHeight() {
  return this.height;
};

/**
 * Start dragging the selected events
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDragStart = function (event) {
  if (!this.options.editable) {
    return;
  }

  var item = ItemSet.itemFromTarget(event),
      me = this;

  if (item && item.selected) {
    var dragLeftItem = event.target.dragLeftItem;
    var dragRightItem = event.target.dragRightItem;

    if (dragLeftItem) {
      this.touchParams.itemProps = [{
        item: dragLeftItem,
        start: item.data.start.valueOf()
      }];
    }
    else if (dragRightItem) {
      this.touchParams.itemProps = [{
        item: dragRightItem,
        end: item.data.end.valueOf()
      }];
    }
    else {
      this.touchParams.itemProps = this.getSelection().map(function (id) {
        var item = me.items[id];
        var props = {
          item: item
        };

        if ('start' in item.data) {
          props.start = item.data.start.valueOf()
        }
        if ('end' in item.data)   {
          props.end = item.data.end.valueOf()
        }

        return props;
      });
    }

    event.stopPropagation();
  }
};

/**
 * Drag selected items
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDrag = function (event) {
  if (this.touchParams.itemProps) {
    var snap = this.options.snap || null,
        deltaX = event.gesture.deltaX,
        scale = (this.width / (this.range.end - this.range.start)),
        offset = deltaX / scale;

    // move
    this.touchParams.itemProps.forEach(function (props) {
      if ('start' in props) {
        var start = new Date(props.start + offset);
        props.item.data.start = snap ? snap(start) : start;
      }
      if ('end' in props) {
        var end = new Date(props.end + offset);
        props.item.data.end = snap ? snap(end) : end;
      }
    });

    // TODO: implement onMoving handler

    // TODO: implement dragging from one group to another

    this.stackDirty = true; // force re-stacking of all items next repaint
    this.emit('change');

    event.stopPropagation();
  }
};

/**
 * End of dragging selected items
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDragEnd = function (event) {
  if (this.touchParams.itemProps) {
    // prepare a change set for the changed items
    var changes = [],
        me = this,
        dataset = this._myDataSet();

    this.touchParams.itemProps.forEach(function (props) {
      var id = props.item.id,
          item = me.itemsData.get(id);

      var changed = false;
      if ('start' in props.item.data) {
        changed = (props.start != props.item.data.start.valueOf());
        item.start = util.convert(props.item.data.start, dataset.convert['start']);
      }
      if ('end' in props.item.data) {
        changed = changed  || (props.end != props.item.data.end.valueOf());
        item.end = util.convert(props.item.data.end, dataset.convert['end']);
      }

      // only apply changes when start or end is actually changed
      if (changed) {
        me.options.onMove(item, function (item) {
          if (item) {
            // apply changes
            item[dataset.fieldId] = id; // ensure the item contains its id (can be undefined)
            changes.push(item);
          }
          else {
            // restore original values
            if ('start' in props) props.item.data.start = props.start;
            if ('end' in props)   props.item.data.end   = props.end;

            me.stackDirty = true; // force re-stacking of all items next repaint
            me.emit('change');
          }
        });
      }
    });
    this.touchParams.itemProps = null;

    // apply the changes to the data (if there are changes)
    if (changes.length) {
      dataset.update(changes);
    }

    event.stopPropagation();
  }
};

/**
 * Find an item from an event target:
 * searches for the attribute 'timeline-item' in the event target's element tree
 * @param {Event} event
 * @return {Item | null} item
 */
ItemSet.itemFromTarget = function itemFromTarget (event) {
  var target = event.target;
  while (target) {
    if (target.hasOwnProperty('timeline-item')) {
      return target['timeline-item'];
    }
    target = target.parentNode;
  }

  return null;
};

/**
 * Find the Group from an event target:
 * searches for the attribute 'timeline-group' in the event target's element tree
 * @param {Event} event
 * @return {Group | null} group
 */
ItemSet.groupFromTarget = function groupFromTarget (event) {
  var target = event.target;
  while (target) {
    if (target.hasOwnProperty('timeline-group')) {
      return target['timeline-group'];
    }
    target = target.parentNode;
  }

  return null;
};

/**
 * Find the ItemSet from an event target:
 * searches for the attribute 'timeline-itemset' in the event target's element tree
 * @param {Event} event
 * @return {ItemSet | null} item
 */
ItemSet.itemSetFromTarget = function itemSetFromTarget (event) {
  var target = event.target;
  while (target) {
    if (target.hasOwnProperty('timeline-itemset')) {
      return target['timeline-itemset'];
    }
    target = target.parentNode;
  }

  return null;
};

/**
 * Find the DataSet to which this ItemSet is connected
 * @returns {null | DataSet} dataset
 * @private
 */
ItemSet.prototype._myDataSet = function _myDataSet() {
  // find the root DataSet
  var dataset = this.itemsData;
  while (dataset instanceof DataView) {
    dataset = dataset.data;
  }
  return dataset;
};