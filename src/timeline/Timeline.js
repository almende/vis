/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array | google.visualization.DataTable} [items]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor
 */
function Timeline (container, items, options) {
  var me = this;
  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
  this.options = {
    orientation: 'bottom',
    autoResize: true,
    editable: true,
    selectable: true,

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
  };

  // controller
  this.controller = new Controller();

  // root panel
  if (!container) {
    throw new Error('No container element provided');
  }
  var rootOptions = Object.create(this.options);
  rootOptions.height = function () {
    // TODO: change to height
    if (me.options.height) {
      // fixed height
      return me.options.height;
    }
    else {
      // auto height
      return (me.timeaxis.height + me.content.height) + 'px';
    }
  };
  this.rootPanel = new RootPanel(container, rootOptions);
  this.controller.add(this.rootPanel);

  // single select (or unselect) when tapping an item
  // TODO: implement ctrl+click
  this.controller.on('tap',  this._onSelectItem.bind(this));

  // multi select when holding mouse/touch, or on ctrl+click
  this.controller.on('hold', this._onMultiSelectItem.bind(this));

  // item panel
  var itemOptions = Object.create(this.options);
  itemOptions.left = function () {
    return me.labelPanel.width;
  };
  itemOptions.width = function () {
    return me.rootPanel.width - me.labelPanel.width;
  };
  itemOptions.top = null;
  itemOptions.height = null;
  this.itemPanel = new Panel(this.rootPanel, [], itemOptions);
  this.controller.add(this.itemPanel);

  // label panel
  var labelOptions = Object.create(this.options);
  labelOptions.top = null;
  labelOptions.left = null;
  labelOptions.height = null;
  labelOptions.width = function () {
    if (me.content && typeof me.content.getLabelsWidth === 'function') {
      return me.content.getLabelsWidth();
    }
    else {
      return 0;
    }
  };
  this.labelPanel = new Panel(this.rootPanel, [], labelOptions);
  this.controller.add(this.labelPanel);

  // range
  var rangeOptions = Object.create(this.options);
  this.range = new Range(rangeOptions);
  this.range.setRange(
      now.clone().add('days', -3).valueOf(),
      now.clone().add('days', 4).valueOf()
  );

  // TODO: reckon with options moveable and zoomable
  // TODO: put the listeners in setOptions, be able to dynamically change with options moveable and zoomable
  // TODO: enable moving again
  this.range.subscribe(this.controller, this.rootPanel, 'move', 'horizontal');
  this.range.subscribe(this.controller, this.rootPanel, 'zoom', 'horizontal');
  this.range.on('rangechange', function (properties) {
    var force = true;
    me.controller.emit('rangechange', properties);
    me.controller.emit('request-reflow', force);
  });
  this.range.on('rangechanged', function (properties) {
    var force = true;
    me.controller.emit('rangechanged', properties);
    me.controller.emit('request-reflow', force);
  });

  // time axis
  var timeaxisOptions = Object.create(rootOptions);
  timeaxisOptions.range = this.range;
  timeaxisOptions.left = null;
  timeaxisOptions.top = null;
  timeaxisOptions.width = '100%';
  timeaxisOptions.height = null;
  this.timeaxis = new TimeAxis(this.itemPanel, [], timeaxisOptions);
  this.timeaxis.setRange(this.range);
  this.controller.add(this.timeaxis);

  // current time bar
  this.currenttime = new CurrentTime(this.timeaxis, [], rootOptions);
  this.controller.add(this.currenttime);

  // custom time bar
  this.customtime = new CustomTime(this.timeaxis, [], rootOptions);
  this.controller.add(this.customtime);

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

/**
 * Add an event listener to the timeline
 * @param {String} event    Available events: select, rangechange, rangechanged,
 *                          timechange, timechanged
 * @param {function} callback
 */
Timeline.prototype.on = function on (event, callback) {
  this.controller.on(event, callback);
};

/**
 * Add an event listener from the timeline
 * @param {String} event
 * @param {function} callback
 */
Timeline.prototype.off = function off (event, callback) {
  this.controller.off(event, callback);
};

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
  util.extend(this.options, options);

  // force update of range (apply new min/max etc.)
  // both start and end are optional
  this.range.setRange(options.start, options.end);

  this.controller.reflow();
  this.controller.repaint();
};

/**
 * Set a custom time bar
 * @param {Date} time
 */
Timeline.prototype.setCustomTime = function (time) {
  if (!this.customtime) {
    throw new Error('Cannot get custom time: Custom time bar is not enabled');
  }

  this.customtime.setCustomTime(time);
};

/**
 * Retrieve the current custom time.
 * @return {Date} customTime
 */
Timeline.prototype.getCustomTime = function() {
  if (!this.customtime) {
    throw new Error('Cannot get custom time: Custom time bar is not enabled');
  }

  return this.customtime.getCustomTime();
};

/**
 * Set items
 * @param {vis.DataSet | Array | google.visualization.DataTable | null} items
 */
Timeline.prototype.setItems = function(items) {
  var initialLoad = (this.itemsData == null);

  // convert to type DataSet when needed
  var newItemSet;
  if (!items) {
    newItemSet = null;
  }
  else if (items instanceof DataSet) {
    newItemSet = items;
  }
  if (!(items instanceof DataSet)) {
    newItemSet = new DataSet({
      convert: {
        start: 'Date',
        end: 'Date'
      }
    });
    newItemSet.add(items);
  }

  // set items
  this.itemsData = newItemSet;
  this.content.setItems(newItemSet);

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
      this.controller.remove(this.content);
    }

    // create new content set
    var options = Object.create(this.options);
    util.extend(options, {
      top: function () {
        if (me.options.orientation == 'top') {
          return me.timeaxis.height;
        }
        else {
          return me.itemPanel.height - me.timeaxis.height - me.content.height;
        }
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
    this.controller.add(this.content);
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
 * Handle selecting/deselecting an item when tapping it
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
Timeline.prototype._onSelectItem = function (event) {
  if (!this.options.selectable) {
    return;
  }

  var item = ItemSet.itemFromTarget(event);

  var selection = item ? [item.id] : [];
  this.setSelection(selection);

  this.controller.emit('select', {
    items: this.getSelection()
  });

  event.stopPropagation();
};

/**
 * Handle selecting/deselecting multiple items when holding an item
 * @param {Event} event
 * @private
 */
// TODO: move this function to ItemSet
Timeline.prototype._onMultiSelectItem = function (event) {
  if (!this.options.selectable) {
    return;
  }

  var selection,
      item = ItemSet.itemFromTarget(event);

  if (!item) {
    // do nothing...
    return;
  }

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

  this.controller.emit('select', {
    items: this.getSelection()
  });

  event.stopPropagation();
};
