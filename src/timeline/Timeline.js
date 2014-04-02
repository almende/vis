/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array | google.visualization.DataTable} [items]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor
 */
function Timeline (container, items, options) {
  // validate arguments
  if (!container) throw new Error('No container element provided');

  var me = this;
  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
  this.options = {
    orientation: 'bottom',
    direction: 'horizontal', // 'horizontal' or 'vertical'
    autoResize: true,
    editable: false,
    selectable: true,
    snap: null, // will be specified after timeaxis is created

    min: null,
    max: null,
    zoomMin: 10,                                // milliseconds
    zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000, // milliseconds
    // moveable: true, // TODO: option moveable
    // zoomable: true, // TODO: option zoomable

    showMinorLabels: true,
    showMajorLabels: true,
    showCurrentTime: false,
    showCustomTime: false,

    type: 'box',
    align: 'center',
    margin: {
      axis: 20,
      item: 10
    },
    padding: 5,

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

    toScreen: me._toScreen.bind(me),
    toTime: me._toTime.bind(me)
  };

  // root panel
  var rootOptions = Object.create(this.options);
  rootOptions.height = function () {
    if (me.options.height) {
      // fixed height
      return me.options.height;
    }
    else {
      // auto height
      // return (me.timeaxis.height + me.content.height) + 'px';
      // TODO: return the sum of the height of the childs
    }
  };
  this.rootPanel = new RootPanel(container, rootOptions);

  // single select (or unselect) when tapping an item
  this.rootPanel.on('tap',  this._onSelectItem.bind(this));

  // multi select when holding mouse/touch, or on ctrl+click
  this.rootPanel.on('hold', this._onMultiSelectItem.bind(this));

  // add item on doubletap
  this.rootPanel.on('doubletap', this._onAddItem.bind(this));

  // label panel
  var labelOptions = Object.create(this.options);
  labelOptions.top = '0';
  labelOptions.bottom = null;
  labelOptions.left = '0';
  labelOptions.right = null;
  labelOptions.height = '100%';
  labelOptions.width = function () {
    /* TODO: dynamically determine the width of the label panel
    if (me.content && typeof me.content.getLabelsWidth === 'function') {
      return me.content.getLabelsWidth();
    }
    else {
      return 0;
    }
    */
    return 200;
  };
  this.labelPanel = new Panel(labelOptions);
  this.rootPanel.appendChild(this.labelPanel);

  // main panel (contains time axis and itemsets)
  var mainOptions = Object.create(this.options);
  mainOptions.top = '0';
  mainOptions.bottom = null;
  mainOptions.left = null;
  mainOptions.right = '0';
  mainOptions.height = '100%';
  mainOptions.width = function () {
    return me.rootPanel.width - me.labelPanel.width;
  };
  this.mainPanel = new Panel(mainOptions);
  this.rootPanel.appendChild(this.mainPanel);

  // range
  // TODO: move range inside rootPanel?
  var rangeOptions = Object.create(this.options);
  this.range = new Range(this.rootPanel, this.mainPanel, rangeOptions);
  this.range.setRange(
      now.clone().add('days', -3).valueOf(),
      now.clone().add('days', 4).valueOf()
  );
  this.range.on('rangechange', function (properties) {
    me.rootPanel.repaint();
    me.emit('rangechange', properties);
  });
  this.range.on('rangechanged', function (properties) {
    me.rootPanel.repaint();
    me.emit('rangechanged', properties);
  });

  // panel with time axis
  var timeAxisOptions = Object.create(rootOptions);
  timeAxisOptions.range = this.range;
  timeAxisOptions.left = null;
  timeAxisOptions.top = null;
  timeAxisOptions.width = null;
  timeAxisOptions.height = null;  // height is determined by the
  this.timeAxis = new TimeAxis(timeAxisOptions);
  this.timeAxis.setRange(this.range);
  this.options.snap = this.timeAxis.snap.bind(this.timeAxis);
  this.mainPanel.appendChild(this.timeAxis);

  // content panel (contains itemset(s))
  var contentOptions = Object.create(this.options);
  contentOptions.top = '0';
  contentOptions.bottom = null;
  contentOptions.left = '0';
  contentOptions.right = null;
  contentOptions.height = function () {
    return me.mainPanel.height - me.timeAxis.height;
  };
  contentOptions.width = null;
  this.contentPanel = new Panel(contentOptions);
  this.mainPanel.appendChild(this.contentPanel);

  // current time bar
  this.currentTime = new CurrentTime(this.range, rootOptions);
  this.mainPanel.appendChild(this.currentTime);

  // custom time bar
  this.customTime = new CustomTime(rootOptions);
  this.mainPanel.appendChild(this.customTime);
  this.customTime.on('timechange', function (time) {
    me.emit('timechange', time);
  });
  this.customTime.on('timechanged', function (time) {
    me.emit('timechanged', time);
  });

  // create groupset
  this.setGroups(null);

  this.itemsData = null;      // DataSet
  this.groupsData = null;     // DataSet

  // apply options
  if (options) {
    this.setOptions(options);
  }

  // create itemset and groupset
  if (items) {
    this.setItems(items);
  }
}

// turn Timeline into an event emitter
Emitter(Timeline.prototype);

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
  util.extend(this.options, options);

  // force update of range (apply new min/max etc.)
  // both start and end are optional
  this.range.setRange(options.start, options.end);

  if ('editable' in options || 'selectable' in options) {
    if (this.options.selectable) {
      // force update of selection
      this.setSelection(this.getSelection());
    }
    else {
      // remove selection
      this.setSelection([]);
    }
  }

  // validate the callback functions
  var validateCallback = (function (fn) {
    if (!(this.options[fn] instanceof Function) || this.options[fn].length != 2) {
      throw new Error('option ' + fn + ' must be a function ' + fn + '(item, callback)');
    }
  }).bind(this);
  ['onAdd', 'onUpdate', 'onRemove', 'onMove'].forEach(validateCallback);

  //this.controller.reflow(); // TODO: remove
  this.rootPanel.repaint();
};

/**
 * Set a custom time bar
 * @param {Date} time
 */
Timeline.prototype.setCustomTime = function (time) {
  if (!this.customTime) {
    throw new Error('Cannot get custom time: Custom time bar is not enabled');
  }

  this.customTime.setCustomTime(time);
};

/**
 * Retrieve the current custom time.
 * @return {Date} customTime
 */
Timeline.prototype.getCustomTime = function() {
  if (!this.customTime) {
    throw new Error('Cannot get custom time: Custom time bar is not enabled');
  }

  return this.customTime.getCustomTime();
};

/**
 * Set items
 * @param {vis.DataSet | Array | google.visualization.DataTable | null} items
 */
Timeline.prototype.setItems = function(items) {
  var initialLoad = (this.itemsData == null);

  // convert to type DataSet when needed
  var newDataSet;
  if (!items) {
    newDataSet = null;
  }
  else if (items instanceof DataSet) {
    newDataSet = items;
  }
  if (!(items instanceof DataSet)) {
    newDataSet = new DataSet({
      convert: {
        start: 'Date',
        end: 'Date'
      }
    });
    newDataSet.add(items);
  }

  // set items
  this.itemsData = newDataSet;
  /* TODO
  this.content.setItems(newDataSet);
  */

  if (initialLoad && (this.options.start == undefined || this.options.end == undefined)) {
    // apply the data range as range
    var dataRange = this.getItemRange();

    // add 5% space on both sides
    var start = dataRange.min;
    var end = dataRange.max;
    if (start != null && end != null) {
      var interval = (end.valueOf() - start.valueOf());
      if (interval <= 0) {
        // prevent an empty interval
        interval = 24 * 60 * 60 * 1000; // 1 day
      }
      start = new Date(start.valueOf() - interval * 0.05);
      end = new Date(end.valueOf() + interval * 0.05);
    }

    // override specified start and/or end date
    if (this.options.start != undefined) {
      start = util.convert(this.options.start, 'Date');
    }
    if (this.options.end != undefined) {
      end = util.convert(this.options.end, 'Date');
    }

    // apply range if there is a min or max available
    if (start != null || end != null) {
      this.range.setRange(start, end);
    }
  }
};

/**
 * Set groups
 * @param {vis.DataSet | Array | google.visualization.DataTable} groups
 */
Timeline.prototype.setGroups = function(groups) {
  var me = this;
  this.groupsData = groups;

  // switch content type between ItemSet or GroupSet when needed
  var Type = this.groupsData ? GroupSet : ItemSet;
  if (!(this.content instanceof Type)) {
    // remove old content set
    if (this.content) {
      this.content.hide();
      if (this.content.setItems) {
        this.content.setItems(); // disconnect from items
      }
      if (this.content.setGroups) {
        this.content.setGroups(); // disconnect from groups
      }
      //this.controller.remove(this.content); // TODO: cleanup
    }

    // create new content set
    var options = Object.create(this.options);
    util.extend(options, {
      top: function () {
        return (me.options.orientation == 'top') ? (me.timeaxis.height + 'px') : '';
      },
      bottom: function () {
        return (me.options.orientation == 'top') ? '' : (me.timeaxis.height + 'px');
      },
      left: null,
      width: '100%',
      height: function () {
        if (me.options.height) {
          // fixed height
          return me.itemPanel.height - me.timeaxis.height;
        }
        else {
          // auto height
          return null;
        }
      },
      maxHeight: function () {
        // TODO: change maxHeight to be a css string like '100%' or '300px'
        if (me.options.maxHeight) {
          if (!util.isNumber(me.options.maxHeight)) {
            throw new TypeError('Number expected for property maxHeight');
          }
          return me.options.maxHeight - me.timeaxis.height;
        }
        else {
          return null;
        }
      },
      labelContainer: function () {
        return me.labelPanel.getContainer();
      }
    });

    /* TODO
    this.content = new Type(this.itemPanel, [this.timeaxis], options);
    if (this.content.setRange) {
      this.content.setRange(this.range);
    }
    if (this.content.setItems) {
      this.content.setItems(this.itemsData);
    }
    if (this.content.setGroups) {
      this.content.setGroups(this.groupsData);
    }
    */
  }
};

/**
 * Get the data range of the item set.
 * @returns {{min: Date, max: Date}} range  A range with a start and end Date.
 *                                          When no minimum is found, min==null
 *                                          When no maximum is found, max==null
 */
Timeline.prototype.getItemRange = function getItemRange() {
  // calculate min from start filed
  var itemsData = this.itemsData,
      min = null,
      max = null;

  if (itemsData) {
    // calculate the minimum value of the field 'start'
    var minItem = itemsData.min('start');
    min = minItem ? minItem.start.valueOf() : null;

    // calculate maximum value of fields 'start' and 'end'
    var maxStartItem = itemsData.max('start');
    if (maxStartItem) {
      max = maxStartItem.start.valueOf();
    }
    var maxEndItem = itemsData.max('end');
    if (maxEndItem) {
      if (max == null) {
        max = maxEndItem.end.valueOf();
      }
      else {
        max = Math.max(max, maxEndItem.end.valueOf());
      }
    }
  }

  return {
    min: (min != null) ? new Date(min) : null,
    max: (max != null) ? new Date(max) : null
  };
};

/**
 * Set selected items by their id. Replaces the current selection
 * Unknown id's are silently ignored.
 * @param {Array} [ids] An array with zero or more id's of the items to be
 *                      selected. If ids is an empty array, all items will be
 *                      unselected.
 */
Timeline.prototype.setSelection = function setSelection (ids) {
  if (this.content) this.content.setSelection(ids);
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
Timeline.prototype.getSelection = function getSelection() {
  return this.content ? this.content.getSelection() : [];
};

/**
 * Set the visible window. Both parameters are optional, you can change only
 * start or only end.
 * @param {Date | Number | String} [start] Start date of visible window
 * @param {Date | Number | String} [end]   End date of visible window
 */
Timeline.prototype.setWindow = function setWindow(start, end) {
  this.range.setRange(start, end);
};

/**
 * Get the visible window
 * @return {{start: Date, end: Date}}   Visible range
 */
Timeline.prototype.getWindow = function setWindow() {
  var range = this.range.getRange();
  return {
    start: new Date(range.start),
    end: new Date(range.end)
  };
};

/**
 * Handle selecting/deselecting an item when tapping it
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
Timeline.prototype._onSelectItem = function (event) {
  if (!this.options.selectable) return;

  var ctrlKey  = event.gesture.srcEvent && event.gesture.srcEvent.ctrlKey;
  var shiftKey = event.gesture.srcEvent && event.gesture.srcEvent.shiftKey;
  if (ctrlKey || shiftKey) {
    this._onMultiSelectItem(event);
    return;
  }

  var item = ItemSet.itemFromTarget(event);

  var selection = item ? [item.id] : [];
  this.setSelection(selection);

  this.emit('select', {
    items: this.getSelection()
  });

  event.stopPropagation();
};

/**
 * Handle creation and updates of an item on double tap
 * @param event
 * @private
 */
Timeline.prototype._onAddItem = function (event) {
  if (!this.options.selectable) return;
  if (!this.options.editable) return;

  var me = this,
      item = ItemSet.itemFromTarget(event);

  if (item) {
    // update item

    // execute async handler to update the item (or cancel it)
    var itemData = me.itemsData.get(item.id); // get a clone of the data from the dataset
    this.options.onUpdate(itemData, function (itemData) {
      if (itemData) {
        me.itemsData.update(itemData);
      }
    });
  }
  else {
    // add item
    var xAbs = vis.util.getAbsoluteLeft(this.rootPanel.frame);
    var x = event.gesture.center.pageX - xAbs;
    var newItem = {
      start: this.timeaxis.snap(this._toTime(x)),
      content: 'new item'
    };

    var id = util.randomUUID();
    newItem[this.itemsData.fieldId] = id;

    var group = GroupSet.groupFromTarget(event);
    if (group) {
      newItem.group = group.groupId;
    }

    // execute async handler to customize (or cancel) adding an item
    this.options.onAdd(newItem, function (item) {
      if (item) {
        me.itemsData.add(newItem);
        // TODO: need to trigger a repaint?
      }
    });
  }
};

/**
 * Handle selecting/deselecting multiple items when holding an item
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
Timeline.prototype._onMultiSelectItem = function (event) {
  if (!this.options.selectable) return;

  var selection,
      item = ItemSet.itemFromTarget(event);

  if (item) {
    // multi select items
    selection = this.getSelection(); // current selection
    var index = selection.indexOf(item.id);
    if (index == -1) {
      // item is not yet selected -> select it
      selection.push(item.id);
    }
    else {
      // item is already selected -> deselect it
      selection.splice(index, 1);
    }
    this.setSelection(selection);

    this.emitter.emit('select', {
      items: this.getSelection()
    });

    event.stopPropagation();
  }
};

/**
 * Convert a position on screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @private
 */
Timeline.prototype._toTime = function _toTime(x) {
  var conversion = this.range.conversion(this.mainPanel.width);
  return new Date(x / conversion.scale + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 * @private
 */
Timeline.prototype._toScreen = function _toScreen(time) {
  var conversion = this.range.conversion(this.mainPanel.width);
  return (time.valueOf() - conversion.offset) * conversion.scale;
};
