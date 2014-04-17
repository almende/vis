/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Object} [options]        See ItemSet.setOptions for the available
 *                                  options.
 * @constructor ItemSet
 * @extends Panel
 */
// TODO: improve performance by replacing all Array.forEach with a for loop
function ItemSet(options) {
  this.id = util.randomUUID();

  // one options object is shared by this itemset and all its items
  this.options = options || {};
  this.itemOptions = Object.create(this.options);
  this.dom = {};
  this.hammer = null;

  var me = this;
  this.itemsData = null;  // DataSet
  this.range = null;      // Range or Object {start: number, end: number}

  // data change listeners
  this.listeners = {
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

  this.items = {};        // object with an Item for every data item
  this.orderedItems = {
    byStart: [],
    byEnd: []
  };
  this.visibleItems = []; // visible, ordered items
  this.visibleItemsStart = 0; // start index of visible items in this.orderedItems // TODO: cleanup
  this.visibleItemsEnd = 0;   // start index of visible items in this.orderedItems // TODO: cleanup
  this.selection = [];  // list with the ids of all selected nodes
  this.queue = {};      // queue with id/actions: 'add', 'update', 'delete'
  this.stack = new Stack(Object.create(this.options));
  this.stackDirty = true; // if true, all items will be restacked on next repaint

  this.touchParams = {}; // stores properties while dragging

  // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis

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
  frame.appendChild(background);
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
  frame.appendChild(axis);

  // attach event listeners
  // TODO: use event listeners from the rootpanel to improve performance
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
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
ItemSet.prototype.repaint = function repaint() {
  var asSize = util.option.asSize,
      asString = util.option.asString,
      options = this.options,
      orientation = this.getOption('orientation'),
      frame = this.frame;

  // update className
  frame.className = 'itemset' + (options.className ? (' ' + asString(options.className)) : '');

  // check whether zoomed (in that case we need to re-stack everything)
  var visibleInterval = this.range.end - this.range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval) || (this.width != this.lastWidth);
  this.lastVisibleInterval = visibleInterval;
  this.lastWidth = this.width;

  /* TODO: implement+fix smarter way to update visible items
  // find the first visible item
  // TODO: use faster search, not linear
  var byEnd = this.orderedItems.byEnd;
  var start = 0;
  var item = null;
  while ((item = byEnd[start]) &&
      (('end' in item.data) ? item.data.end : item.data.start) < this.range.start) {
    start++;
  }

  // find the last visible item
  // TODO: use faster search, not linear
  var byStart = this.orderedItems.byStart;
  var end = 0;
  while ((item = byStart[end]) && item.data.start < this.range.end) {
    end++;
  }

  console.log('visible items', start, end); // TODO: cleanup
  console.log('visible item ids', byStart[start] && byStart[start].id, byEnd[end-1] && byEnd[end-1].id); // TODO: cleanup

  this.visibleItems = [];
  var i = start;
  item = byStart[i];
  var lastItem = byEnd[end];
  while (item && item !== lastItem) {
    this.visibleItems.push(item);
    item = byStart[++i];
  }
  this.stack.order(this.visibleItems);

  // show visible items
  for (var i = 0, ii = this.visibleItems.length; i < ii; i++) {
    item = this.visibleItems[i];

    if (!item.displayed) item.show();
    item.top = null; // reset stacking position

    // reposition item horizontally
    item.repositionX();
  }
   */

  // simple, brute force calculation of visible items
  // TODO: replace with a faster, more sophisticated solution
  this.visibleItems = [];
  for (var id in this.items) {
    if (this.items.hasOwnProperty(id)) {
      var item = this.items[id];
      if (item.isVisible(this.range)) {
        if (!item.displayed) item.show();

        // reposition item horizontally
        item.repositionX();

        this.visibleItems.push(item);
      }
      else {
        if (item.displayed) item.hide();
      }
    }
  }

  // reposition visible items vertically
  //this.stack.order(this.visibleItems); // TODO: solve ordering issue
  var force = this.stackDirty || zoomed; // force re-stacking of all items if true
  this.stack.stack(this.visibleItems, force);
  this.stackDirty = false;
  for (var i = 0, ii = this.visibleItems.length; i < ii; i++) {
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
  this.dom.axis.style.top    = (orientation == 'top') ? '0' : '';
  this.dom.axis.style.bottom = (orientation == 'top') ? '' : '0';

  return this._isResized();
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
      me.itemsData.on(event, callback, id);
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
        dataset.remove(item);
      }
    });
  }
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @private
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
            options.type ||
            'box';

    var constructor = ItemSet.types[type];

    // TODO: how to handle items with invalid data? hide them and give a warning? or throw an error?
    if (item) {
      // update item
      if (!constructor || !(item instanceof constructor)) {
        // item type has changed, hide and delete the item
        item.hide();
        item = null;
      }
      else {
        item.data = itemData; // TODO: create a method item.setData ?
      }
    }

    if (!item) {
      // create item
      if (constructor) {
        item = new constructor(me, itemData, options, itemOptions);
        item.id = id;
      }
      else {
        throw new TypeError('Unknown item type "' + type + '"');
      }
    }

    me.items[id] = item;
  });

  this._order();

  this.stackDirty = true; // force re-stacking of all items next repaint
  this.emit('change');
};

/**
 * Handle added items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAdd = ItemSet.prototype._onUpdate;

/**
 * Handle removed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemove = function _onRemove(ids) {
  var count = 0;
  var me = this;
  ids.forEach(function (id) {
    var item = me.items[id];
    if (item) {
      count++;
      item.hide(); // TODO: only hide when displayed
      delete me.items[id];
      delete me.visibleItems[id];
    }
  });

  if (count) {
    this._order();
    this.stackDirty = true; // force re-stacking of all items next repaint
    this.emit('change');
  }
};

/**
 * Order the items
 * @private
 */
ItemSet.prototype._order = function _order() {
  var array = util.toArray(this.items);
  this.orderedItems.byStart = array;
  this.orderedItems.byEnd = [].concat(array);

  // reorder the items
  this.stack.orderByStart(this.orderedItems.byStart);
  this.stack.orderByEnd(this.orderedItems.byEnd);

  // TODO: cleanup
  //console.log('byStart', this.orderedItems.byStart.map(function (item) {return item.id}))
  //console.log('byEnd', this.orderedItems.byEnd.map(function (item) {return item.id}))
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
            changes.push(item);
          }
          else {
            // restore original values
            if ('start' in props) props.item.data.start = props.start;
            if ('end' in props)   props.item.data.end   = props.end;

            this.stackDirty = true; // force re-stacking of all items next repaint
            this.emit('change');
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