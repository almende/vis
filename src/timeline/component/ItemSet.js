/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See ItemSet.setOptions for the available
 *                                  options.
 * @constructor ItemSet
 * @extends Panel
 */
// TODO: improve performance by replacing all Array.forEach with a for loop
function ItemSet(parent, depends, options) {
  this.id = util.randomUUID();
  this.parent = parent;
  this.depends = depends;

  // event listeners
  this.listeners = {
    dragstart: this._onDragStart.bind(this),
    drag: this._onDrag.bind(this),
    dragend: this._onDragEnd.bind(this)
  };

  // one options object is shared by this itemset and all its items
  this.options = options || {};
  this.defaultOptions = {
    type: 'box',
    align: 'center',
    orientation: 'bottom',
    margin: {
      axis: 20,
      item: 10
    },
    padding: 5
  };

  this.dom = {};

  var me = this;
  this.itemsData = null;  // DataSet
  this.range = null;      // Range or Object {start: number, end: number}

  this.listeners = {
    'add': function (event, params, senderId) {
      if (senderId != me.id) {
        me._onAdd(params.items);
      }
    },
    'update': function (event, params, senderId) {
      if (senderId != me.id) {
        me._onUpdate(params.items);
      }
    },
    'remove': function (event, params, senderId) {
      if (senderId != me.id) {
        me._onRemove(params.items);
      }
    }
  };

  this.items = {};      // object with an Item for every data item
  this.selection = [];  // list with the ids of all selected nodes
  this.queue = {};      // queue with id/actions: 'add', 'update', 'delete'
  this.stack = new Stack(this, Object.create(this.options));
  this.conversion = null;

  // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis
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
 */
ItemSet.prototype.setOptions = Component.prototype.setOptions;



/**
 * Set controller for this component
 * @param {Controller | null} controller
 */
ItemSet.prototype.setController = function setController (controller) {
  var event;

  // unregister old event listeners
  if (this.controller) {
    for (event in this.listeners) {
      if (this.listeners.hasOwnProperty(event)) {
        this.controller.off(event, this.listeners[event]);
      }
    }
  }

  this.controller = controller || null;

  // register new event listeners
  if (this.controller) {
    for (event in this.listeners) {
      if (this.listeners.hasOwnProperty(event)) {
        this.controller.on(event, this.listeners[event]);
      }
    }
  }
};

// attach event listeners for dragging items to the controller
(function (me) {
  var _controller = null;
  var _onDragStart = null;
  var _onDrag = null;
  var _onDragEnd = null;

  Object.defineProperty(me, 'controller', {
    get: function () {
      return _controller;
    },

    set: function (controller) {

    }
  });
}) (this);


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
  var i, ii, id, item, selection;

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

    // trigger a select event
    selection = this.selection.concat([]);
    events.trigger(this, 'select', {
      ids: selection
    });

    if (this.controller) {
      this.requestRepaint();
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
 * Repaint the component
 * @return {Boolean} changed
 */
ItemSet.prototype.repaint = function repaint() {
  var changed = 0,
      update = util.updateProperty,
      asSize = util.option.asSize,
      options = this.options,
      orientation = this.getOption('orientation'),
      defaultOptions = this.defaultOptions,
      frame = this.frame;

  if (!frame) {
    frame = document.createElement('div');
    frame.className = 'itemset';

    var className = options.className;
    if (className) {
      util.addClassName(frame, util.option.asString(className));
    }

    // create background panel
    var background = document.createElement('div');
    background.className = 'background';
    frame.appendChild(background);
    this.dom.background = background;

    // create foreground panel
    var foreground = document.createElement('div');
    foreground.className = 'foreground';
    frame.appendChild(foreground);
    this.dom.foreground = foreground;

    // create axis panel
    var axis = document.createElement('div');
    axis.className = 'itemset-axis';
    //frame.appendChild(axis);
    this.dom.axis = axis;

    this.frame = frame;
    changed += 1;
  }

  if (!this.parent) {
    throw new Error('Cannot repaint itemset: no parent attached');
  }
  var parentContainer = this.parent.getContainer();
  if (!parentContainer) {
    throw new Error('Cannot repaint itemset: parent has no container element');
  }
  if (!frame.parentNode) {
    parentContainer.appendChild(frame);
    changed += 1;
  }
  if (!this.dom.axis.parentNode) {
    parentContainer.appendChild(this.dom.axis);
    changed += 1;
  }

  // reposition frame
  changed += update(frame.style, 'left',   asSize(options.left, '0px'));
  changed += update(frame.style, 'top',    asSize(options.top, '0px'));
  changed += update(frame.style, 'width',  asSize(options.width, '100%'));
  changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));

  // reposition axis
  changed += update(this.dom.axis.style, 'left', asSize(options.left, '0px'));
  changed += update(this.dom.axis.style, 'width',  asSize(options.width, '100%'));
  if (orientation == 'bottom') {
    changed += update(this.dom.axis.style, 'top',  (this.height + this.top) + 'px');
  }
  else { // orientation == 'top'
    changed += update(this.dom.axis.style, 'top', this.top + 'px');
  }

  this._updateConversion();

  var me = this,
      queue = this.queue,
      itemsData = this.itemsData,
      items = this.items,
      dataOptions = {
        // TODO: cleanup
        // fields: [(itemsData && itemsData.fieldId || 'id'), 'start', 'end', 'content', 'type', 'className']
      };

  // show/hide added/changed/removed items
  for (var id in queue) {
    if (queue.hasOwnProperty(id)) {
      var entry = queue[id],
          item = items[id],
          action = entry.action;

      //noinspection FallthroughInSwitchStatementJS
      switch (action) {
        case 'add':
        case 'update':
          var itemData = itemsData && itemsData.get(id, dataOptions);

          if (itemData) {
            var type = itemData.type ||
                (itemData.start && itemData.end && 'range') ||
                options.type ||
                'box';
            var constructor = ItemSet.types[type];

            // TODO: how to handle items with invalid data? hide them and give a warning? or throw an error?
            if (item) {
              // update item
              if (!constructor || !(item instanceof constructor)) {
                // item type has changed, hide and delete the item
                changed += item.hide();
                item = null;
              }
              else {
                item.data = itemData; // TODO: create a method item.setData ?
                changed++;
              }
            }

            if (!item) {
              // create item
              if (constructor) {
                item = new constructor(me, itemData, options, defaultOptions);
                item.id = entry.id; // we take entry.id, as id itself is stringified
                changed++;
              }
              else {
                throw new TypeError('Unknown item type "' + type + '"');
              }
            }

            // force a repaint (not only a reposition)
            item.repaint();

            items[id] = item;
          }

          // update queue
          delete queue[id];
          break;

        case 'remove':
          if (item) {
            // remove the item from the set selected items
            if (item.selected) {
              me._deselect(id);
            }

            // remove DOM of the item
            changed += item.hide();
          }

          // update lists
          delete items[id];
          delete queue[id];
          break;

        default:
          console.log('Error: unknown action "' + action + '"');
      }
    }
  }

  // reposition all items. Show items only when in the visible area
  util.forEach(this.items, function (item) {
    if (item.visible) {
      changed += item.show();
      item.reposition();
    }
    else {
      changed += item.hide();
    }
  });

  return (changed > 0);
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
 * Reflow the component
 * @return {Boolean} resized
 */
ItemSet.prototype.reflow = function reflow () {
  var changed = 0,
      options = this.options,
      marginAxis = options.margin && options.margin.axis || this.defaultOptions.margin.axis,
      marginItem = options.margin && options.margin.item || this.defaultOptions.margin.item,
      update = util.updateProperty,
      asNumber = util.option.asNumber,
      asSize = util.option.asSize,
      frame = this.frame;

  if (frame) {
    this._updateConversion();

    util.forEach(this.items, function (item) {
      changed += item.reflow();
    });

    // TODO: stack.update should be triggered via an event, in stack itself
    // TODO: only update the stack when there are changed items
    this.stack.update();

    var maxHeight = asNumber(options.maxHeight);
    var fixedHeight = (asSize(options.height) != null);
    var height;
    if (fixedHeight) {
      height = frame.offsetHeight;
    }
    else {
      // height is not specified, determine the height from the height and positioned items
      var visibleItems = this.stack.ordered; // TODO: not so nice way to get the filtered items
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
    }
    if (maxHeight != null) {
      height = Math.min(height, maxHeight);
    }
    changed += update(this, 'height', height);

    // calculate height from items
    changed += update(this, 'top', frame.offsetTop);
    changed += update(this, 'left', frame.offsetLeft);
    changed += update(this, 'width', frame.offsetWidth);
  }
  else {
    changed += 1;
  }

  return (changed > 0);
};

/**
 * Hide this component from the DOM
 * @return {Boolean} changed
 */
ItemSet.prototype.hide = function hide() {
  var changed = false;

  // remove the DOM
  if (this.frame && this.frame.parentNode) {
    this.frame.parentNode.removeChild(this.frame);
    changed = true;
  }
  if (this.dom.axis && this.dom.axis.parentNode) {
    this.dom.axis.parentNode.removeChild(this.dom.axis);
    changed = true;
  }

  return changed;
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
    throw new TypeError('Data must be an instance of DataSet');
  }

  if (oldItemsData) {
    // unsubscribe from old dataset
    util.forEach(this.listeners, function (callback, event) {
      oldItemsData.unsubscribe(event, callback);
    });

    // remove all drawn items
    ids = oldItemsData.getIds();
    this._onRemove(ids);
  }

  if (this.itemsData) {
    // subscribe to new dataset
    var id = this.id;
    util.forEach(this.listeners, function (callback, event) {
      me.itemsData.subscribe(event, callback, id);
    });

    // draw all new items
    ids = this.itemsData.getIds();
    this._onAdd(ids);
  }
};

/**
 * Get the current items items
 * @returns {vis.DataSet | null}
 */
ItemSet.prototype.getItems = function getItems() {
  return this.itemsData;
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdate = function _onUpdate(ids) {
  this._toQueue('update', ids);
};

/**
 * Handle changed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAdd = function _onAdd(ids) {
  this._toQueue('add', ids);
};

/**
 * Handle removed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemove = function _onRemove(ids) {
  this._toQueue('remove', ids);
};

/**
 * Put items in the queue to be added/updated/remove
 * @param {String} action     can be 'add', 'update', 'remove'
 * @param {Number[]} ids
 */
ItemSet.prototype._toQueue = function _toQueue(action, ids) {
  var queue = this.queue;
  ids.forEach(function (id) {
    queue[id] = {
      id: id,
      action: action
    };
  });

  if (this.controller) {
    //this.requestReflow();
    this.requestRepaint();
  }
};

/**
 * Calculate the scale and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods toTime
 * and toScreen can be used.
 * @private
 */
ItemSet.prototype._updateConversion = function _updateConversion() {
  var range = this.range;
  if (!range) {
    throw new Error('No range configured');
  }

  if (range.conversion) {
    this.conversion = range.conversion(this.width);
  }
  else {
    this.conversion = Range.conversion(range.start, range.end, this.width);
  }
};

/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
ItemSet.prototype.toTime = function toTime(x) {
  var conversion = this.conversion;
  return new Date(x / conversion.scale + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 */
ItemSet.prototype.toScreen = function toScreen(time) {
  var conversion = this.conversion;
  return (time.valueOf() - conversion.offset) * conversion.scale;
};

// global (private) object to store drag params
var touchParams = {};

/**
 * Start dragging the selected events
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
ItemSet.prototype._onDragStart = function (event) {
  var item = this._itemFromTarget(event);
console.log('_onDragStart', event)
  if (item && item.selected) {
    touchParams.items = [item];
    //touchParams.items = this.getSelection(); // TODO: use the current selection
    touchParams.itemsLeft = touchParams.items.map(function (item) {
      return item.left;
    });
    console.log('_onDragStart', touchParams)
    event.stopPropagation();
  }
};

/**
 * Drag selected items
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
ItemSet.prototype._onDrag = function (event) {
  if (touchParams.items) {
    var deltaX = event.gesture.deltaX;

    touchParams.items.forEach(function (item, i) {
      item.left = touchParams.itemsLeft[i] + deltaX;
      item.reposition();
    });

    event.stopPropagation();
  }
};

/**
 * End of dragging selected items
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
ItemSet.prototype._onDragEnd = function (event) {
  if (touchParams.items) {
    // actually apply the new locations

    touchParams.items = null;

    event.stopPropagation();
  }
};

/**
 * Find an item from an event target:
 * searches for the attribute 'timeline-item' in the event target's element tree
 * @param {Event} event
 * @return {Item | null| item
 * @private
 */
ItemSet.prototype._itemFromTarget = function _itemFromTarget (event) {
  var target = event.target;
  while (target) {
    if (target.hasOwnProperty('timeline-item')) {
      return target['timeline-item'];
    }
    target = target.parentNode;
  }

  return null;
};