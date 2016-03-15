var Hammer = require('../../module/hammer');
var util = require('../../util');
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');
var TimeStep = require('../TimeStep');
var Component = require('./Component');
var Group = require('./Group');
var BackgroundGroup = require('./BackgroundGroup');
var BoxItem = require('./item/BoxItem');
var PointItem = require('./item/PointItem');
var RangeItem = require('./item/RangeItem');
var BackgroundItem = require('./item/BackgroundItem');


var UNGROUPED = '__ungrouped__';   // reserved group id for ungrouped items
var BACKGROUND = '__background__'; // reserved group id for background items without group

/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {{dom: Object, domProps: Object, emitter: Emitter, range: Range}} body
 * @param {Object} [options]      See ItemSet.setOptions for the available options.
 * @constructor ItemSet
 * @extends Component
 */
function ItemSet(body, options) {
  this.body = body;
  this.defaultOptions = {
    rtl: false,
    type: null,  // 'box', 'point', 'range', 'background'
    orientation: {
      item: 'bottom'   // item orientation: 'top' or 'bottom'
    },
    align: 'auto', // alignment of box items
    stack: true,
    groupOrderSwap: function(fromGroup, toGroup, groups) {
    	var targetOrder = toGroup.order;
    	toGroup.order = fromGroup.order;
    	fromGroup.order = targetOrder;
    },
    groupOrder: 'order',

    selectable: true,
    multiselect: false,
    itemsAlwaysDraggable: false,

    editable: {
      updateTime: false,
      updateGroup: false,
      add: false,
      remove: false
    },

    groupEditable: {
      order: false,
      add: false,
      remove: false
    },    
    
    snap: TimeStep.snap,

    onAdd: function (item, callback) {
      callback(item);
    },
    onUpdate: function (item, callback) {
      callback(item);
    },
    onMove: function (item, callback) {
      callback(item);
    },
    onRemove: function (item, callback) {
      callback(item);
    },
    onMoving: function (item, callback) {
      callback(item);
    },
    onAddGroup: function (item, callback) {
      callback(item);
    },
    onMoveGroup: function (item, callback) {
      callback(item);
    },
    onRemoveGroup: function (item, callback) {
      callback(item);
    },

    margin: {
      item: {
        horizontal: 10,
        vertical: 10
      },
      axis: 20
    }
  };

  // options is shared by this ItemSet and all its items
  this.options = util.extend({}, this.defaultOptions);
  
  // options for getting items from the DataSet with the correct type
  this.itemOptions = {
    type: {start: 'Date', end: 'Date'}
  };

  this.conversion = {
    toScreen: body.util.toScreen,
    toTime: body.util.toTime
  };
  this.dom = {};
  this.props = {};
  this.hammer = null;

  var me = this;
  this.itemsData = null;    // DataSet
  this.groupsData = null;   // DataSet

  // listeners for the DataSet of the items
  this.itemListeners = {
    'add': function (event, params, senderId) {
      me._onAdd(params.items);
    },
    'update': function (event, params, senderId) {
      me._onUpdate(params.items);
    },
    'remove': function (event, params, senderId) {
      me._onRemove(params.items);
    }
  };

  // listeners for the DataSet of the groups
  this.groupListeners = {
    'add': function (event, params, senderId) {
      me._onAddGroups(params.items);
    },
    'update': function (event, params, senderId) {
      me._onUpdateGroups(params.items);
    },
    'remove': function (event, params, senderId) {
      me._onRemoveGroups(params.items);
    }
  };

  this.items = {};      // object with an Item for every data item
  this.groups = {};     // Group object for every group
  this.groupIds = [];

  this.selection = [];  // list with the ids of all selected nodes
  this.stackDirty = true; // if true, all items will be restacked on next redraw

  this.touchParams = {}; // stores properties while dragging
  this.groupTouchParams = {};
  // create the HTML DOM

  this._create();

  this.setOptions(options);
}

ItemSet.prototype = new Component();

// available item types will be registered here
ItemSet.types = {
  background: BackgroundItem,
  box: BoxItem,
  range: RangeItem,
  point: PointItem
};

/**
 * Create the HTML DOM for the ItemSet
 */
ItemSet.prototype._create = function(){
  var frame = document.createElement('div');
  frame.className = 'vis-itemset';
  frame['timeline-itemset'] = this;
  this.dom.frame = frame;

  // create background panel
  var background = document.createElement('div');
  background.className = 'vis-background';
  frame.appendChild(background);
  this.dom.background = background;

  // create foreground panel
  var foreground = document.createElement('div');
  foreground.className = 'vis-foreground';
  frame.appendChild(foreground);
  this.dom.foreground = foreground;

  // create axis panel
  var axis = document.createElement('div');
  axis.className = 'vis-axis';
  this.dom.axis = axis;

  // create labelset
  var labelSet = document.createElement('div');
  labelSet.className = 'vis-labelset';
  this.dom.labelSet = labelSet;

  // create ungrouped Group
  this._updateUngrouped();

  // create background Group
  var backgroundGroup = new BackgroundGroup(BACKGROUND, null, this);
  backgroundGroup.show();
  this.groups[BACKGROUND] = backgroundGroup;

  // attach event listeners
  // Note: we bind to the centerContainer for the case where the height
  //       of the center container is larger than of the ItemSet, so we
  //       can click in the empty area to create a new item or deselect an item.
  this.hammer = new Hammer(this.body.dom.centerContainer);

  // drag items when selected
  this.hammer.on('hammer.input', function (event) {
    if (event.isFirst) {
      this._onTouch(event);
    }
  }.bind(this));
  this.hammer.on('panstart', this._onDragStart.bind(this));
  this.hammer.on('panmove',  this._onDrag.bind(this));
  this.hammer.on('panend',   this._onDragEnd.bind(this));
  this.hammer.get('pan').set({threshold:5, direction: Hammer.DIRECTION_HORIZONTAL});

  // single select (or unselect) when tapping an item
  this.hammer.on('tap',  this._onSelectItem.bind(this));

  // multi select when holding mouse/touch, or on ctrl+click
  this.hammer.on('press', this._onMultiSelectItem.bind(this));

  // add item on doubletap
  this.hammer.on('doubletap', this._onAddItem.bind(this));
  this.groupHammer = new Hammer(this.body.dom.leftContainer);
  
  this.groupHammer.on('panstart', this._onGroupDragStart.bind(this));
  this.groupHammer.on('panmove',  this._onGroupDrag.bind(this));
  this.groupHammer.on('panend',   this._onGroupDragEnd.bind(this));
  this.groupHammer.get('pan').set({threshold:5, direction: Hammer.DIRECTION_HORIZONTAL});
  
  // attach to the DOM
  this.show();
};

/**
 * Set options for the ItemSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String} type
 *                              Default type for the items. Choose from 'box'
 *                              (default), 'point', 'range', or 'background'.
 *                              The default style can be overwritten by
 *                              individual items.
 *                           {String} align
 *                              Alignment for the items, only applicable for
 *                              BoxItem. Choose 'center' (default), 'left', or
 *                              'right'.
 *                           {String} orientation.item
 *                              Orientation of the item set. Choose 'top' or
 *                              'bottom' (default).
 *                           {Function} groupOrder
 *                              A sorting function for ordering groups
 *                           {Boolean} stack
 *                              If true (default), items will be stacked on
 *                              top of each other.
 *                           {Number} margin.axis
 *                              Margin between the axis and the items in pixels.
 *                              Default is 20.
 *                           {Number} margin.item.horizontal
 *                              Horizontal margin between items in pixels.
 *                              Default is 10.
 *                           {Number} margin.item.vertical
 *                              Vertical Margin between items in pixels.
 *                              Default is 10.
 *                           {Number} margin.item
 *                              Margin between items in pixels in both horizontal
 *                              and vertical direction. Default is 10.
 *                           {Number} margin
 *                              Set margin for both axis and items in pixels.
 *                           {Boolean} selectable
 *                              If true (default), items can be selected.
 *                           {Boolean} multiselect
 *                              If true, multiple items can be selected.
 *                              False by default.
 *                           {Boolean} editable
 *                              Set all editable options to true or false
 *                           {Boolean} editable.updateTime
 *                              Allow dragging an item to an other moment in time
 *                           {Boolean} editable.updateGroup
 *                              Allow dragging an item to an other group
 *                           {Boolean} editable.add
 *                              Allow creating new items on double tap
 *                           {Boolean} editable.remove
 *                              Allow removing items by clicking the delete button
 *                              top right of a selected item.
 *                           {Function(item: Item, callback: Function)} onAdd
 *                              Callback function triggered when an item is about to be added:
 *                              when the user double taps an empty space in the Timeline.
 *                           {Function(item: Item, callback: Function)} onUpdate
 *                              Callback function fired when an item is about to be updated.
 *                              This function typically has to show a dialog where the user
 *                              change the item. If not implemented, nothing happens.
 *                           {Function(item: Item, callback: Function)} onMove
 *                              Fired when an item has been moved. If not implemented,
 *                              the move action will be accepted.
 *                           {Function(item: Item, callback: Function)} onRemove
 *                              Fired when an item is about to be deleted.
 *                              If not implemented, the item will be always removed.
 */
ItemSet.prototype.setOptions = function(options) {
  if (options) {
    // copy all options that we know
    var fields = ['type', 'rtl', 'align', 'order', 'stack', 'selectable', 'multiselect', 'itemsAlwaysDraggable', 'multiselectPerGroup', 'groupOrder', 'dataAttributes', 'template', 'groupTemplate', 'hide', 'snap', 'groupOrderSwap'];
    util.selectiveExtend(fields, this.options, options);

    if ('orientation' in options) {
      if (typeof options.orientation === 'string') {
        this.options.orientation.item = options.orientation === 'top' ? 'top' : 'bottom';
      }
      else if (typeof options.orientation === 'object' && 'item' in options.orientation) {
        this.options.orientation.item = options.orientation.item;
      }
    }

    if ('margin' in options) {
      if (typeof options.margin === 'number') {
        this.options.margin.axis = options.margin;
        this.options.margin.item.horizontal = options.margin;
        this.options.margin.item.vertical = options.margin;
      }
      else if (typeof options.margin === 'object') {
        util.selectiveExtend(['axis'], this.options.margin, options.margin);
        if ('item' in options.margin) {
          if (typeof options.margin.item === 'number') {
            this.options.margin.item.horizontal = options.margin.item;
            this.options.margin.item.vertical = options.margin.item;
          }
          else if (typeof options.margin.item === 'object') {
            util.selectiveExtend(['horizontal', 'vertical'], this.options.margin.item, options.margin.item);
          }
        }
      }
    }

    if ('editable' in options) {
      if (typeof options.editable === 'boolean') {
        this.options.editable.updateTime  = options.editable;
        this.options.editable.updateGroup = options.editable;
        this.options.editable.add         = options.editable;
        this.options.editable.remove      = options.editable;
      }
      else if (typeof options.editable === 'object') {
        util.selectiveExtend(['updateTime', 'updateGroup', 'add', 'remove'], this.options.editable, options.editable);
      }
    }
    
    if ('groupEditable' in options) {
      if (typeof options.groupEditable === 'boolean') {
        this.options.groupEditable.order  = options.groupEditable;
        this.options.groupEditable.add    = options.groupEditable;
        this.options.groupEditable.remove = options.groupEditable;
      }
      else if (typeof options.groupEditable === 'object') {
        util.selectiveExtend(['order', 'add', 'remove'], this.options.groupEditable, options.groupEditable);
      }
    }

    // callback functions
    var addCallback = (function (name) {
      var fn = options[name];
      if (fn) {
        if (!(fn instanceof Function)) {
          throw new Error('option ' + name + ' must be a function ' + name + '(item, callback)');
        }
        this.options[name] = fn;
      }
    }).bind(this);
    ['onAdd', 'onUpdate', 'onRemove', 'onMove', 'onMoving', 'onAddGroup', 'onMoveGroup', 'onRemoveGroup'].forEach(addCallback);

    // force the itemSet to refresh: options like orientation and margins may be changed
    this.markDirty();
  }
};

/**
 * Mark the ItemSet dirty so it will refresh everything with next redraw.
 * Optionally, all items can be marked as dirty and be refreshed.
 * @param {{refreshItems: boolean}} [options]
 */
ItemSet.prototype.markDirty = function(options) {
  this.groupIds = [];
  this.stackDirty = true;

  if (options && options.refreshItems) {
    util.forEach(this.items, function (item) {
      item.dirty = true;
      if (item.displayed) item.redraw();
    });
  }
};

/**
 * Destroy the ItemSet
 */
ItemSet.prototype.destroy = function() {
  this.hide();
  this.setItems(null);
  this.setGroups(null);

  this.hammer = null;

  this.body = null;
  this.conversion = null;
};

/**
 * Hide the component from the DOM
 */
ItemSet.prototype.hide = function() {
  // remove the frame containing the items
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }

  // remove the axis with dots
  if (this.dom.axis.parentNode) {
    this.dom.axis.parentNode.removeChild(this.dom.axis);
  }

  // remove the labelset containing all group labels
  if (this.dom.labelSet.parentNode) {
    this.dom.labelSet.parentNode.removeChild(this.dom.labelSet);
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * @return {Boolean} changed
 */
ItemSet.prototype.show = function() {
  // show frame containing the items
  if (!this.dom.frame.parentNode) {
    this.body.dom.center.appendChild(this.dom.frame);
  }

  // show axis with dots
  if (!this.dom.axis.parentNode) {
    this.body.dom.backgroundVertical.appendChild(this.dom.axis);
  }

  // show labelset containing labels
  if (!this.dom.labelSet.parentNode) {
    this.body.dom.left.appendChild(this.dom.labelSet);
  }
};

/**
 * Set selected items by their id. Replaces the current selection
 * Unknown id's are silently ignored.
 * @param {string[] | string} [ids] An array with zero or more id's of the items to be
 *                                  selected, or a single item id. If ids is undefined
 *                                  or an empty array, all items will be unselected.
 */
ItemSet.prototype.setSelection = function(ids) {
  var i, ii, id, item;

  if (ids == undefined) ids = [];
  if (!Array.isArray(ids)) ids = [ids];

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
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
ItemSet.prototype.getSelection = function() {
  return this.selection.concat([]);
};

/**
 * Get the id's of the currently visible items.
 * @returns {Array} The ids of the visible items
 */
ItemSet.prototype.getVisibleItems = function() {
  var range = this.body.range.getRange();

  if (this.options.rtl) { 
    var right  = this.body.util.toScreen(range.start);
    var left = this.body.util.toScreen(range.end);
  } else {
    var left  = this.body.util.toScreen(range.start);
    var right = this.body.util.toScreen(range.end);
  }

  var ids = [];
  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      var group = this.groups[groupId];
      var rawVisibleItems = group.visibleItems;

      // filter the "raw" set with visibleItems into a set which is really
      // visible by pixels
      for (var i = 0; i < rawVisibleItems.length; i++) {
        var item = rawVisibleItems[i];
        // TODO: also check whether visible vertically
        if (this.options.rtl) { 
          if ((item.right < left) && (item.right + item.width > right)) {
            ids.push(item.id);
          }
        } else {
          if ((item.left < right) && (item.left + item.width > left)) {
            ids.push(item.id);
          }
        }
      }
    }
  }

  return ids;
};

/**
 * Deselect a selected item
 * @param {String | Number} id
 * @private
 */
ItemSet.prototype._deselect = function(id) {
  var selection = this.selection;
  for (var i = 0, ii = selection.length; i < ii; i++) {
    if (selection[i] == id) { // non-strict comparison!
      selection.splice(i, 1);
      break;
    }
  }
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
ItemSet.prototype.redraw = function() {
  var margin = this.options.margin,
      range = this.body.range,
      asSize = util.option.asSize,
      options = this.options,
      orientation = options.orientation.item,
      resized = false,
      frame = this.dom.frame;

  // recalculate absolute position (before redrawing groups)
  this.props.top = this.body.domProps.top.height + this.body.domProps.border.top;

  if (this.options.rtl) {
    this.props.right = this.body.domProps.right.width + this.body.domProps.border.right;
  } else {
    this.props.left = this.body.domProps.left.width + this.body.domProps.border.left;
  }

  // update class name
  frame.className = 'vis-itemset';

  // reorder the groups (if needed)
  resized = this._orderGroups() || resized;

  // check whether zoomed (in that case we need to re-stack everything)
  // TODO: would be nicer to get this as a trigger from Range
  var visibleInterval = range.end - range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval) || (this.props.width != this.props.lastWidth);
  if (zoomed) this.stackDirty = true;
  this.lastVisibleInterval = visibleInterval;
  this.props.lastWidth = this.props.width;

  var restack = this.stackDirty;
  var firstGroup = this._firstGroup();
  var firstMargin = {
    item: margin.item,
    axis: margin.axis
  };
  var nonFirstMargin = {
    item: margin.item,
    axis: margin.item.vertical / 2
  };
  var height = 0;
  var minHeight = margin.axis + margin.item.vertical;

  // redraw the background group
  this.groups[BACKGROUND].redraw(range, nonFirstMargin, restack);

  // redraw all regular groups
  util.forEach(this.groups, function (group) {
    var groupMargin = (group == firstGroup) ? firstMargin : nonFirstMargin;
    var groupResized = group.redraw(range, groupMargin, restack);
    resized = groupResized || resized;
    height += group.height;
  });
  height = Math.max(height, minHeight);
  this.stackDirty = false;

  // update frame height
  frame.style.height  = asSize(height);

  // calculate actual size
  this.props.width = frame.offsetWidth;
  this.props.height = height;

  // reposition axis
  this.dom.axis.style.top = asSize((orientation == 'top') ?
      (this.body.domProps.top.height + this.body.domProps.border.top) :
      (this.body.domProps.top.height + this.body.domProps.centerContainer.height));
  if (this.options.rtl) {
    this.dom.axis.style.right = '0';
  } else {
    this.dom.axis.style.left = '0';
  }

  // check if this component is resized
  resized = this._isResized() || resized;

  return resized;
};

/**
 * Get the first group, aligned with the axis
 * @return {Group | null} firstGroup
 * @private
 */
ItemSet.prototype._firstGroup = function() {
  var firstGroupIndex = (this.options.orientation.item == 'top') ? 0 : (this.groupIds.length - 1);
  var firstGroupId = this.groupIds[firstGroupIndex];
  var firstGroup = this.groups[firstGroupId] || this.groups[UNGROUPED];

  return firstGroup || null;
};

/**
 * Create or delete the group holding all ungrouped items. This group is used when
 * there are no groups specified.
 * @protected
 */
ItemSet.prototype._updateUngrouped = function() {
  var ungrouped = this.groups[UNGROUPED];
  var background = this.groups[BACKGROUND];
  var item, itemId;

  if (this.groupsData) {
    // remove the group holding all ungrouped items
    if (ungrouped) {
      ungrouped.hide();
      delete this.groups[UNGROUPED];

      for (itemId in this.items) {
        if (this.items.hasOwnProperty(itemId)) {
          item = this.items[itemId];
          item.parent && item.parent.remove(item);
          var groupId = this._getGroupId(item.data);
          var group = this.groups[groupId];
          group && group.add(item) || item.hide();
        }
      }
    }
  }
  else {
    // create a group holding all (unfiltered) items
    if (!ungrouped) {
      var id = null;
      var data = null;
      ungrouped = new Group(id, data, this);
      this.groups[UNGROUPED] = ungrouped;

      for (itemId in this.items) {
        if (this.items.hasOwnProperty(itemId)) {
          item = this.items[itemId];
          ungrouped.add(item);
        }
      }

      ungrouped.show();
    }
  }
};

/**
 * Get the element for the labelset
 * @return {HTMLElement} labelSet
 */
ItemSet.prototype.getLabelSet = function() {
  return this.dom.labelSet;
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
ItemSet.prototype.setItems = function(items) {
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
      oldItemsData.off(event, callback);
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

  this.body.emitter.emit('_change', {queue: true});
};

/**
 * Get the current items
 * @returns {vis.DataSet | null}
 */
ItemSet.prototype.getItems = function() {
  return this.itemsData;
};

/**
 * Set groups
 * @param {vis.DataSet} groups
 */
ItemSet.prototype.setGroups = function(groups) {
  var me = this,
      ids;

  // unsubscribe from current dataset
  if (this.groupsData) {
    util.forEach(this.groupListeners, function (callback, event) {
      me.groupsData.off(event, callback);
    });

    // remove all drawn groups
    ids = this.groupsData.getIds();
    this.groupsData = null;
    this._onRemoveGroups(ids); // note: this will cause a redraw
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

  // update the order of all items in each group
  this._order();

  this.body.emitter.emit('_change', {queue: true});
};

/**
 * Get the current groups
 * @returns {vis.DataSet | null} groups
 */
ItemSet.prototype.getGroups = function() {
  return this.groupsData;
};

/**
 * Remove an item by its id
 * @param {String | Number} id
 */
ItemSet.prototype.removeItem = function(id) {
  var item = this.itemsData.get(id),
      dataset = this.itemsData.getDataSet();

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
 * Get the time of an item based on it's data and options.type
 * @param {Object} itemData
 * @returns {string} Returns the type
 * @private
 */
ItemSet.prototype._getType = function (itemData) {
  return itemData.type || this.options.type || (itemData.end ? 'range' : 'box');
};


/**
 * Get the group id for an item
 * @param {Object} itemData
 * @returns {string} Returns the groupId
 * @private
 */
ItemSet.prototype._getGroupId = function (itemData) {
  var type = this._getType(itemData);
  if (type == 'background' && itemData.group == undefined) {
   return BACKGROUND;
  }
  else {
    return this.groupsData ? itemData.group : UNGROUPED;
  }
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @protected
 */
ItemSet.prototype._onUpdate = function(ids) {
  var me = this;

  ids.forEach(function (id) {
    var itemData = me.itemsData.get(id, me.itemOptions);
    var item = me.items[id];
    var type = me._getType(itemData);

    var constructor = ItemSet.types[type];
    var selected;

    if (item) {
      // update item
      if (!constructor || !(item instanceof constructor)) {
        // item type has changed, delete the item and recreate it
        selected = item.selected; // preserve selection of this item
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
        item = new constructor(itemData, me.conversion, me.options);
        item.id = id; // TODO: not so nice setting id afterwards
        me._addItem(item);
        if (selected) {
          this.selection.push(id);
          item.select();
        }
      }
      else if (type == 'rangeoverflow') {
        // TODO: deprecated since version 2.1.0 (or 3.0.0?). cleanup some day
        throw new TypeError('Item type "rangeoverflow" is deprecated. Use css styling instead: ' +
            '.vis-item.vis-range .vis-item-content {overflow: visible;}');
      }
      else {
        throw new TypeError('Unknown item type "' + type + '"');
      }
    }
  }.bind(this));

  this._order();
  this.stackDirty = true; // force re-stacking of all items next redraw
  this.body.emitter.emit('_change', {queue: true});
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
ItemSet.prototype._onRemove = function(ids) {
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
    this.stackDirty = true; // force re-stacking of all items next redraw
    this.body.emitter.emit('_change', {queue: true});
  }
};

/**
 * Update the order of item in all groups
 * @private
 */
ItemSet.prototype._order = function() {
  // reorder the items in all groups
  // TODO: optimization: only reorder groups affected by the changed items
  util.forEach(this.groups, function (group) {
    group.order();
  });
};

/**
 * Handle updated groups
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdateGroups = function(ids) {
  this._onAddGroups(ids);
};

/**
 * Handle changed groups (added or updated)
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAddGroups = function(ids) {
  var me = this;

  ids.forEach(function (id) {
    var groupData = me.groupsData.get(id);
    var group = me.groups[id];

    if (!group) {
      // check for reserved ids
      if (id == UNGROUPED || id == BACKGROUND) {
        throw new Error('Illegal group id. ' + id + ' is a reserved id.');
      }

      var groupOptions = Object.create(me.options);
      util.extend(groupOptions, {
        height: null
      });

      group = new Group(id, groupData, me);
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

      group.order();
      group.show();
    }
    else {
      // update group
      group.setData(groupData);
    }
  });

  this.body.emitter.emit('_change', {queue: true});
};

/**
 * Handle removed groups
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemoveGroups = function(ids) {
  var groups = this.groups;
  ids.forEach(function (id) {
    var group = groups[id];

    if (group) {
      group.hide();
      delete groups[id];
    }
  });

  this.markDirty();

  this.body.emitter.emit('_change', {queue: true});
};

/**
 * Reorder the groups if needed
 * @return {boolean} changed
 * @private
 */
ItemSet.prototype._orderGroups = function () {
  if (this.groupsData) {
    // reorder the groups
    var groupIds = this.groupsData.getIds({
      order: this.options.groupOrder
    });

    var changed = !util.equalArray(groupIds, this.groupIds);
    if (changed) {
      // hide all groups, removes them from the DOM
      var groups = this.groups;
      groupIds.forEach(function (groupId) {
        groups[groupId].hide();
      });

      // show the groups again, attach them to the DOM in correct order
      groupIds.forEach(function (groupId) {
        groups[groupId].show();
      });

      this.groupIds = groupIds;
    }

    return changed;
  }
  else {
    return false;
  }
};

/**
 * Add a new item
 * @param {Item} item
 * @private
 */
ItemSet.prototype._addItem = function(item) {
  this.items[item.id] = item;

  // add to group
  var groupId = this._getGroupId(item.data);
  var group = this.groups[groupId];
  if (group) group.add(item);
};

/**
 * Update an existing item
 * @param {Item} item
 * @param {Object} itemData
 * @private
 */
ItemSet.prototype._updateItem = function(item, itemData) {
  var oldGroupId = item.data.group;
  var oldSubGroupId = item.data.subgroup;

  // update the items data (will redraw the item when displayed)
  item.setData(itemData);

  // update group
  if (oldGroupId != item.data.group || oldSubGroupId != item.data.subgroup) {
    var oldGroup = this.groups[oldGroupId];
    if (oldGroup) oldGroup.remove(item);

    var groupId = this._getGroupId(item.data);
    var group = this.groups[groupId];
    if (group) group.add(item);
  }
};

/**
 * Delete an item from the ItemSet: remove it from the DOM, from the map
 * with items, and from the map with visible items, and from the selection
 * @param {Item} item
 * @private
 */
ItemSet.prototype._removeItem = function(item) {
  // remove from DOM
  item.hide();

  // remove from items
  delete this.items[item.id];

  // remove from selection
  var index = this.selection.indexOf(item.id);
  if (index != -1) this.selection.splice(index, 1);

  // remove from group
  item.parent && item.parent.remove(item);
};

/**
 * Create an array containing all items being a range (having an end date)
 * @param array
 * @returns {Array}
 * @private
 */
ItemSet.prototype._constructByEndArray = function(array) {
  var endArray = [];

  for (var i = 0; i < array.length; i++) {
    if (array[i] instanceof RangeItem) {
      endArray.push(array[i]);
    }
  }
  return endArray;
};

/**
 * Register the clicked item on touch, before dragStart is initiated.
 *
 * dragStart is initiated from a mousemove event, AFTER the mouse/touch is
 * already moving. Therefore, the mouse/touch can sometimes be above an other
 * DOM element than the item itself.
 *
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onTouch = function (event) {
  // store the touched item, used in _onDragStart
  this.touchParams.item = this.itemFromTarget(event);
  this.touchParams.dragLeftItem = event.target.dragLeftItem || false;
  this.touchParams.dragRightItem = event.target.dragRightItem || false;
  this.touchParams.itemProps = null;
};


/**
 * Given an group id, returns the index it has.
 *
 * @param {Number} groupID
 * @private
 */
ItemSet.prototype._getGroupIndex = function(groupId) {
    for (var i = 0; i < this.groupIds.length; i++) {
        if (groupId == this.groupIds[i])
            return i;
    }
};

/**
 * Start dragging the selected events
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDragStart = function (event) {
  var item = this.touchParams.item || null;
  var me = this;
  var props;

  if (item && (item.selected || this.options.itemsAlwaysDraggable)) {

    if (!this.options.editable.updateTime &&
        !this.options.editable.updateGroup &&
        !item.editable) {
      return;
    }

    // override options.editable
    if (item.editable === false) {
      return;
    }

    var dragLeftItem = this.touchParams.dragLeftItem;
    var dragRightItem = this.touchParams.dragRightItem;

    if (dragLeftItem) {
      props = {
        item: dragLeftItem,
        initialX: event.center.x,
        dragLeft:  true,
        data: this._cloneItemData(item.data)
      };

      this.touchParams.itemProps = [props];
    }
    else if (dragRightItem) {
      props = {
        item: dragRightItem,
        initialX: event.center.x,
        dragRight: true,
        data: this._cloneItemData(item.data)
      };

      this.touchParams.itemProps = [props];
    }
    else {
      this.touchParams.selectedItem = item;

      var baseGroupIndex = this._getGroupIndex(item.data.group);

      var itemsToDrag = (this.options.itemsAlwaysDraggable && !item.selected) ? [item.id] : this.getSelection();

      this.touchParams.itemProps = itemsToDrag.map(function (id) {
        var item = me.items[id];
        var groupIndex = me._getGroupIndex(item.data.group);
        return {
          item: item,
          initialX: event.center.x,
          groupOffset: baseGroupIndex-groupIndex,
          data: this._cloneItemData(item.data)
        };
      }.bind(this));
    }

    event.stopPropagation();
  }
  else if (this.options.editable.add && (event.srcEvent.ctrlKey || event.srcEvent.metaKey)) {
    // create a new range item when dragging with ctrl key down
    this._onDragStartAddItem(event);
  }
};

/**
 * Start creating a new range item by dragging.
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDragStartAddItem = function (event) {
  var snap = this.options.snap || null;

  if (this.options.rtl) {
    var xAbs = util.getAbsoluteRight(this.dom.frame);
    var x = xAbs - event.center.x  + 10;  // plus 10 to compensate for the drag starting as soon as you've moved 10px
  } else {
    var xAbs = util.getAbsoluteLeft(this.dom.frame);
    var x = event.center.x - xAbs - 10;  // minus 10 to compensate for the drag starting as soon as you've moved 10px
  }

  var time = this.body.util.toTime(x);
  var scale = this.body.util.getScale();
  var step = this.body.util.getStep();
  var start = snap ? snap(time, scale, step) : time;
  var end = start;

  var itemData = {
    type: 'range',
    start: start,
    end: end,
    content: 'new item'
  };

  var id = util.randomUUID();
  itemData[this.itemsData._fieldId] = id;

  var group = this.groupFromTarget(event);
  if (group) {
    itemData.group = group.groupId;
  }
  var newItem = new RangeItem(itemData, this.conversion, this.options);
  newItem.id = id; // TODO: not so nice setting id afterwards
  newItem.data = this._cloneItemData(itemData);
  this._addItem(newItem);

  var props = {
    item: newItem,
    initialX: event.center.x,
    data: newItem.data
  };

  if (this.options.rtl) {
    props.dragLeft = true;
  } else {
    props.dragRight = true;
  }
  this.touchParams.itemProps = [props];

  event.stopPropagation();
};

/**
 * Drag selected items
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDrag = function (event) {
  if (this.touchParams.itemProps) {
    event.stopPropagation();

    var me = this;
    var snap = this.options.snap || null;

    if (this.options.rtl) {
      var xOffset = this.body.dom.root.offsetLeft + this.body.domProps.right.width;
    } else {
      var xOffset = this.body.dom.root.offsetLeft + this.body.domProps.left.width;
    }

    var scale = this.body.util.getScale();
    var step = this.body.util.getStep();

    //only calculate the new group for the item that's actually dragged
    var selectedItem = this.touchParams.selectedItem;
    var updateGroupAllowed = me.options.editable.updateGroup;
    var newGroupBase = null;
    if (updateGroupAllowed && selectedItem) {
      if (selectedItem.data.group != undefined) {
        // drag from one group to another
        var group = me.groupFromTarget(event);
        if (group) {
          //we know the offset for all items, so the new group for all items
          //will be relative to this one.
          newGroupBase = this._getGroupIndex(group.groupId);
        }
      }
    }

    // move
    this.touchParams.itemProps.forEach(function (props) {
      var current = me.body.util.toTime(event.center.x - xOffset);
      var initial = me.body.util.toTime(props.initialX - xOffset);

      if (this.options.rtl) {
        var offset = -(current - initial); // ms
      } else {
        var offset = (current - initial); // ms
      }

      var itemData = this._cloneItemData(props.item.data); // clone the data
      if (props.item.editable === false) {
        return;
      }

      var updateTimeAllowed = me.options.editable.updateTime ||
          props.item.editable === true;
      if (updateTimeAllowed) {
        if (props.dragLeft) {
          // drag left side of a range item
          if (this.options.rtl) {
            if (itemData.end != undefined) {
              var initialEnd = util.convert(props.data.end, 'Date');
              var end = new Date(initialEnd.valueOf() + offset);
              // TODO: pass a Moment instead of a Date to snap(). (Breaking change)
              itemData.end = snap ? snap(end, scale, step) : end;
            }
          } else {
            if (itemData.start != undefined) {
              var initialStart = util.convert(props.data.start, 'Date');
              var start = new Date(initialStart.valueOf() + offset);
              // TODO: pass a Moment instead of a Date to snap(). (Breaking change)
              itemData.start = snap ? snap(start, scale, step) : start;
            }
          }
        }
        else if (props.dragRight) {
          // drag right side of a range item
          if (this.options.rtl) {
            if (itemData.start != undefined) {
              var initialStart = util.convert(props.data.start, 'Date');
              var start = new Date(initialStart.valueOf() + offset);
              // TODO: pass a Moment instead of a Date to snap(). (Breaking change)
              itemData.start = snap ? snap(start, scale, step) : start;
            }
          } else {
            if (itemData.end != undefined) {
              var initialEnd = util.convert(props.data.end, 'Date');
              var end = new Date(initialEnd.valueOf() + offset);
              // TODO: pass a Moment instead of a Date to snap(). (Breaking change)
              itemData.end = snap ? snap(end, scale, step) : end;
            }
          }
        }
        else {
          // drag both start and end
          if (itemData.start != undefined) {

            var initialStart = util.convert(props.data.start, 'Date').valueOf();
            var start = new Date(initialStart + offset);

            if (itemData.end != undefined) {
              var initialEnd = util.convert(props.data.end, 'Date');
              var duration  = initialEnd.valueOf() - initialStart.valueOf();

              // TODO: pass a Moment instead of a Date to snap(). (Breaking change)
              itemData.start = snap ? snap(start, scale, step) : start;
              itemData.end   = new Date(itemData.start.valueOf() + duration);
            }
            else {
              // TODO: pass a Moment instead of a Date to snap(). (Breaking change)
              itemData.start = snap ? snap(start, scale, step) : start;
            }


          }
        }
      }

      var updateGroupAllowed = me.options.editable.updateGroup ||
          props.item.editable === true;

      if (updateGroupAllowed && (!props.dragLeft && !props.dragRight) && newGroupBase!=null) {
        if (itemData.group != undefined) {
          var newOffset = newGroupBase - props.groupOffset;

          //make sure we stay in bounds
          newOffset = Math.max(0, newOffset);
          newOffset = Math.min(me.groupIds.length-1, newOffset);

          itemData.group = me.groupIds[newOffset];
        }
      }

      // confirm moving the item
      itemData = this._cloneItemData(itemData);  // convert start and end to the correct type
      me.options.onMoving(itemData, function (itemData) {
        if (itemData) {
          props.item.setData(this._cloneItemData(itemData, 'Date'));
        }
      }.bind(this));
    }.bind(this));

    this.stackDirty = true; // force re-stacking of all items next redraw
    this.body.emitter.emit('_change');
  }
};

/**
 * Move an item to another group
 * @param {Item} item
 * @param {String | Number} groupId
 * @private
 */
ItemSet.prototype._moveToGroup = function(item, groupId) {
  var group = this.groups[groupId];
  if (group && group.groupId != item.data.group) {
    var oldGroup = item.parent;
    oldGroup.remove(item);
    oldGroup.order();
    group.add(item);
    group.order();

    item.data.group = group.groupId;
  }
};

/**
 * End of dragging selected items
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onDragEnd = function (event) {
  if (this.touchParams.itemProps) {
    event.stopPropagation();

    var me = this;
    var dataset = this.itemsData.getDataSet();
    var itemProps = this.touchParams.itemProps ;
    this.touchParams.itemProps = null;

    itemProps.forEach(function (props) {
      var id = props.item.id;
      var exists = me.itemsData.get(id, me.itemOptions) != null;

      if (!exists) {
        // add a new item
        me.options.onAdd(props.item.data, function (itemData) {
          me._removeItem(props.item); // remove temporary item
          if (itemData) {
            me.itemsData.getDataSet().add(itemData);
          }

          // force re-stacking of all items next redraw
          me.stackDirty = true;
          me.body.emitter.emit('_change');
        });
      }
      else {
        // update existing item
        var itemData = this._cloneItemData(props.item.data); // convert start and end to the correct type
        me.options.onMove(itemData, function (itemData) {
          if (itemData) {
            // apply changes
            itemData[dataset._fieldId] = id; // ensure the item contains its id (can be undefined)
            dataset.update(itemData);
          }
          else {
            // restore original values
            props.item.setData(props.data);

            me.stackDirty = true; // force re-stacking of all items next redraw
            me.body.emitter.emit('_change');
          }
        });
      }
    }.bind(this));
  }
};

ItemSet.prototype._onGroupDragStart = function (event) {
	if (this.options.groupEditable.order) {
		this.groupTouchParams.group = this.groupFromTarget(event);
		
		if (this.groupTouchParams.group) {
			event.stopPropagation();
			
			this.groupTouchParams.originalOrder = this.groupsData.getIds({
			    order: this.options.groupOrder
		    });
		}
	}
}

ItemSet.prototype._onGroupDrag = function (event) {
	if (this.options.groupEditable.order && this.groupTouchParams.group) {
		event.stopPropagation();
		
		// drag from one group to another
		var group = this.groupFromTarget(event);
		
		// try to avoid toggling when groups differ in height
		if (group && group.height != this.groupTouchParams.group.height) {
			var movingUp = (group.top < this.groupTouchParams.group.top);
			var clientY = event.center ? event.center.y : event.clientY;
			var targetGroupTop = util.getAbsoluteTop(group.dom.foreground);
			var draggedGroupHeight = this.groupTouchParams.group.height;
			if (movingUp) {
				// skip swapping the groups when the dragged group is not below clientY afterwards
				if (targetGroupTop + draggedGroupHeight < clientY) {
					return;
				}
			} else {
				var targetGroupHeight = group.height;
				// skip swapping the groups when the dragged group is not below clientY afterwards
				if (targetGroupTop + targetGroupHeight - draggedGroupHeight > clientY) {
					return;
				}
			}
		}
		
		if (group && group != this.groupTouchParams.group) {
			var groupsData = this.groupsData;
			var targetGroup = groupsData.get(group.groupId);
			var draggedGroup = groupsData.get(this.groupTouchParams.group.groupId);
			
			// switch groups
			if (draggedGroup && targetGroup) {
				this.options.groupOrderSwap(draggedGroup, targetGroup, this.groupsData);
				this.groupsData.update(draggedGroup);
				this.groupsData.update(targetGroup);
			}
			
			// fetch current order of groups
			var newOrder = this.groupsData.getIds({
			    order: this.options.groupOrder
		    });
			
			// in case of changes since _onGroupDragStart
			if (!util.equalArray(newOrder, this.groupTouchParams.originalOrder)) {
				var groupsData = this.groupsData;
				var origOrder = this.groupTouchParams.originalOrder;
				var draggedId = this.groupTouchParams.group.groupId;
				var numGroups = Math.min(origOrder.length, newOrder.length);
				var curPos = 0;
				var newOffset = 0;
				var orgOffset = 0;
				while (curPos < numGroups) {
					// as long as the groups are where they should be step down along the groups order
					while ((curPos+newOffset) < numGroups 
						&& (curPos+orgOffset) < numGroups 
						&& newOrder[curPos+newOffset] == origOrder[curPos+orgOffset]) {
						curPos++;
					}
					
					// all ok
					if (curPos+newOffset >= numGroups) {
						break;
					}
					
					// not all ok
					// if dragged group was move upwards everything below should have an offset
					if (newOrder[curPos+newOffset] == draggedId) {
						newOffset = 1;
						continue;
					}
					// if dragged group was move downwards everything above should have an offset
					else if (origOrder[curPos+orgOffset] == draggedId) {
						orgOffset = 1;
						continue;
					} 
					// found a group (apart from dragged group) that has the wrong position -> switch with the 
					// group at the position where other one should be, fix index arrays and continue
					else {
						var slippedPosition = newOrder.indexOf(origOrder[curPos+orgOffset])
						var switchGroup = groupsData.get(newOrder[curPos+newOffset]);
						var shouldBeGroup = groupsData.get(origOrder[curPos+orgOffset]);
						this.options.groupOrderSwap(switchGroup, shouldBeGroup, groupsData);
						groupsData.update(switchGroup);
						groupsData.update(shouldBeGroup);
						
						var switchGroupId = newOrder[curPos+newOffset];
						newOrder[curPos+newOffset] = origOrder[curPos+orgOffset];
						newOrder[slippedPosition] = switchGroupId;
						
						curPos++;
					}
				}
			}
			
		}
	}
}

ItemSet.prototype._onGroupDragEnd = function (event) {
	if (this.options.groupEditable.order && this.groupTouchParams.group) {
		event.stopPropagation();
		
		// update existing group
		var me = this;
		var id = me.groupTouchParams.group.groupId;
		var dataset = me.groupsData.getDataSet();
        var groupData = util.extend({}, dataset.get(id)); // clone the data
        me.options.onMoveGroup(groupData, function (groupData) {
          if (groupData) {
            // apply changes
        	groupData[dataset._fieldId] = id; // ensure the group contains its id (can be undefined)
            dataset.update(groupData);
          }
          else {
        	  
        	// fetch current order of groups
  			var newOrder = dataset.getIds({
  			    order: me.options.groupOrder
  		    });
        	  
            // restore original order
        	if (!util.equalArray(newOrder, me.groupTouchParams.originalOrder)) {
        		var origOrder = me.groupTouchParams.originalOrder;
  				var numGroups = Math.min(origOrder.length, newOrder.length);
  				var curPos = 0;
  				while (curPos < numGroups) {
  					// as long as the groups are where they should be step down along the groups order
  					while (curPos < numGroups && newOrder[curPos] == origOrder[curPos]) {
  					    curPos++;
  					}
  					
  					// all ok
  					if (curPos >= numGroups) {
  						break;
  					}
  					
  					// found a group that has the wrong position -> switch with the 
  					// group at the position where other one should be, fix index arrays and continue
  					var slippedPosition = newOrder.indexOf(origOrder[curPos])
  					var switchGroup = dataset.get(newOrder[curPos]);
  					var shouldBeGroup = dataset.get(origOrder[curPos]);
  					me.options.groupOrderSwap(switchGroup, shouldBeGroup, dataset);
  					groupsData.update(switchGroup);
					groupsData.update(shouldBeGroup);
  						
  					var switchGroupId = newOrder[curPos];
  					newOrder[curPos] = origOrder[curPos];
  					newOrder[slippedPosition] = switchGroupId;
  						
  					curPos++;
  				}
  			}

          }
        });
        
        me.body.emitter.emit('groupDragged', { groupId: id });
	}
}

/**
 * Handle selecting/deselecting an item when tapping it
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onSelectItem = function (event) {
  if (!this.options.selectable) return;

  var ctrlKey  = event.srcEvent && (event.srcEvent.ctrlKey || event.srcEvent.metaKey);
  var shiftKey = event.srcEvent && event.srcEvent.shiftKey;
  if (ctrlKey || shiftKey) {
    this._onMultiSelectItem(event);
    return;
  }

  var oldSelection = this.getSelection();

  var item = this.itemFromTarget(event);
  var selection = item ? [item.id] : [];
  this.setSelection(selection);

  var newSelection = this.getSelection();

  // emit a select event,
  // except when old selection is empty and new selection is still empty
  if (newSelection.length > 0 || oldSelection.length > 0) {
    this.body.emitter.emit('select', {
      items: newSelection,
      event: event
    });
  }
};

/**
 * Handle creation and updates of an item on double tap
 * @param event
 * @private
 */
ItemSet.prototype._onAddItem = function (event) {
  if (!this.options.selectable) return;
  if (!this.options.editable.add) return;

  var me = this;
  var snap = this.options.snap || null;
  var item = this.itemFromTarget(event);

  if (item) {
    // update item

    // execute async handler to update the item (or cancel it)
    var itemData = me.itemsData.get(item.id); // get a clone of the data from the dataset
    this.options.onUpdate(itemData, function (itemData) {
      if (itemData) {
        me.itemsData.getDataSet().update(itemData);
      }
    });
  }
  else {
    // add item
    if (this.options.rtl) {
      var xAbs = util.getAbsoluteRight(this.dom.frame);
      var x = xAbs - event.center.x;
    } else {
      var xAbs = util.getAbsoluteLeft(this.dom.frame);
      var x = event.center.x - xAbs; 
    }
    // var xAbs = util.getAbsoluteLeft(this.dom.frame);
    // var x = event.center.x - xAbs;
    var start = this.body.util.toTime(x);
    var scale = this.body.util.getScale();
    var step = this.body.util.getStep();

    var newItemData = {
      start: snap ? snap(start, scale, step) : start,
      content: 'new item'
    };

    // when default type is a range, add a default end date to the new item
    if (this.options.type === 'range') {
      var end = this.body.util.toTime(x + this.props.width / 5);
      newItemData.end = snap ? snap(end, scale, step) : end;
    }

    newItemData[this.itemsData._fieldId] = util.randomUUID();

    var group = this.groupFromTarget(event);
    if (group) {
      newItemData.group = group.groupId;
    }

    // execute async handler to customize (or cancel) adding an item
    newItemData = this._cloneItemData(newItemData);     // convert start and end to the correct type
    this.options.onAdd(newItemData, function (item) {
      if (item) {
        me.itemsData.getDataSet().add(item);
        // TODO: need to trigger a redraw?
      }
    });
  }
};

/**
 * Handle selecting/deselecting multiple items when holding an item
 * @param {Event} event
 * @private
 */
ItemSet.prototype._onMultiSelectItem = function (event) {
  if (!this.options.selectable) return;

  var item = this.itemFromTarget(event);

  if (item) {
    // multi select items (if allowed)

    var selection = this.options.multiselect
      ? this.getSelection() // take current selection
      : [];                 // deselect current selection

    var shiftKey = event.srcEvent && event.srcEvent.shiftKey || false;

    if (shiftKey && this.options.multiselect) {
      // select all items between the old selection and the tapped item
      var itemGroup = this.itemsData.get(item.id).group;
    	
      // when filtering get the group of the last selected item
      var lastSelectedGroup = undefined;
      if (this.options.multiselectPerGroup) {
        if (selection.length > 0) {
          lastSelectedGroup = this.itemsData.get(selection[0]).group;
        }
      }
    	
      // determine the selection range
      if (!this.options.multiselectPerGroup || lastSelectedGroup == undefined || lastSelectedGroup == itemGroup) {
        selection.push(item.id);
      }
      var range = ItemSet._getItemRange(this.itemsData.get(selection, this.itemOptions));
      
      if (!this.options.multiselectPerGroup || lastSelectedGroup == itemGroup) {
        // select all items within the selection range
        selection = [];
        for (var id in this.items) {
          if (this.items.hasOwnProperty(id)) {
            var _item = this.items[id];
            var start = _item.data.start;
            var end = (_item.data.end !== undefined) ? _item.data.end : start;

            if (start >= range.min &&
                end <= range.max &&
                (!this.options.multiselectPerGroup || lastSelectedGroup == this.itemsData.get(_item.id).group) &&
                !(_item instanceof BackgroundItem)) {
              selection.push(_item.id); // do not use id but item.id, id itself is stringified
            }
          }
        }
      }
    }
    else {
      // add/remove this item from the current selection
      var index = selection.indexOf(item.id);
      if (index == -1) {
        // item is not yet selected -> select it
        selection.push(item.id);
      }
      else {
        // item is already selected -> deselect it
        selection.splice(index, 1);
      }
    }

    this.setSelection(selection);

    this.body.emitter.emit('select', {
      items: this.getSelection(),
      event: event
    });
  }
};

/**
 * Calculate the time range of a list of items
 * @param {Array.<Object>} itemsData
 * @return {{min: Date, max: Date}} Returns the range of the provided items
 * @private
 */
ItemSet._getItemRange = function(itemsData) {
  var max = null;
  var min = null;

  itemsData.forEach(function (data) {
    if (min == null || data.start < min) {
      min = data.start;
    }

    if (data.end != undefined) {
      if (max == null || data.end > max) {
        max = data.end;
      }
    }
    else {
      if (max == null || data.start > max) {
        max = data.start;
      }
    }
  });

  return {
    min: min,
    max: max
  }
};

/**
 * Find an item from an event target:
 * searches for the attribute 'timeline-item' in the event target's element tree
 * @param {Event} event
 * @return {Item | null} item
 */
ItemSet.prototype.itemFromTarget = function(event) {
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
ItemSet.prototype.groupFromTarget = function(event) {
  var clientY = event.center ? event.center.y : event.clientY;
  for (var i = 0; i < this.groupIds.length; i++) {
    var groupId = this.groupIds[i];
    var group = this.groups[groupId];
    var foreground = group.dom.foreground;
    var top = util.getAbsoluteTop(foreground);
    if (clientY > top && clientY < top + foreground.offsetHeight) {
      return group;
    }

    if (this.options.orientation.item === 'top') {
      if (i === this.groupIds.length - 1 && clientY > top) {
        return group;
      }
    }
    else {
      if (i === 0 && clientY < top + foreground.offset) {
        return group;
      }
    }
  }

  return null;
};

/**
 * Find the ItemSet from an event target:
 * searches for the attribute 'timeline-itemset' in the event target's element tree
 * @param {Event} event
 * @return {ItemSet | null} item
 */
ItemSet.itemSetFromTarget = function(event) {
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
 * Clone the data of an item, and "normalize" it: convert the start and end date
 * to the type (Date, Moment, ...) configured in the DataSet. If not configured,
 * start and end are converted to Date.
 * @param {Object} itemData, typically `item.data`
 * @param {string} [type]  Optional Date type. If not provided, the type from the DataSet is taken
 * @return {Object} The cloned object
 * @private
 */
ItemSet.prototype._cloneItemData = function (itemData, type) {
  var clone = util.extend({}, itemData);

  if (!type) {
    // convert start and end date to the type (Date, Moment, ...) configured in the DataSet
    type = this.itemsData.getDataSet()._options.type;
  }

  if (clone.start != undefined) {
    clone.start = util.convert(clone.start, type && type.start || 'Date');
  }
  if (clone.end != undefined) {
    clone.end = util.convert(clone.end , type && type.end || 'Date');
  }

  return clone;
};

module.exports = ItemSet;
