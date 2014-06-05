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
  this.defaultOptions = {
    orientation: 'bottom',
    direction: 'horizontal', // 'horizontal' or 'vertical'
    autoResize: true,
    stack: true,

    editable: {
      updateTime: false,
      updateGroup: false,
      add: false,
      remove: false
    },

    selectable: true,

    start: null,
    end: null,
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

    groupOrder: null,

    width: null,
    height: null,
    maxHeight: null,
    minHeight: null,

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
    }
  };

  this.options = {};
  util.deepExtend(this.options, this.defaultOptions);
  util.deepExtend(this.options, {
    // FIXME: not nice passing these functions via the options
    snap: null, // will be specified after timeaxis is created

    toScreen: me._toScreen.bind(me),
    toTime: me._toTime.bind(me)
  });

  // Create the DOM, props, and emitter
  this._create();

  // attach the root panel to the provided container
  if (!container) throw new Error('No container provided');
  container.appendChild(this.dom.root);

  // TODO: remove temporary contents
  //this.dom.background.innerHTML = '<span style="color: red;">background</span>';
  this.dom.center.innerHTML = '<span style="color: red;">center</span>';
  this.dom.center.innerHTML = 'center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center<br>center';
  this.dom.left.innerHTML = '<span style="color: red;">left</span>';
  this.dom.right.innerHTML = '<span style="color: red;">right</span>';
  //this.dom.top.innerHTML = '<span style="color: red;">top</span>';
  //this.dom.bottom.innerHTML = '<span style="color: red;">bottom</span>';

  this.components = [];

  // create a Range
  this.range = new Range(this, this.options);
  this.range.setRange(
      now.clone().add('days', -3).valueOf(),
      now.clone().add('days', 4).valueOf()
  );

  // Create a TimeAxis
  var timeAxis = new TimeAxis(this, this.options);
  this.components.push(timeAxis);

  // re-emit public events
  this.emitter.on('rangechange', function (properties) {
    me.emit('rangechange', properties);
  });
  this.emitter.on('rangechanged', function (properties) {
    me.emit('rangechanged', properties);
  });


  /* TODO
  // root panel
  var rootOptions = util.extend(Object.create(this.options), {
    height: function () {
      if (me.options.height) {
        // fixed height
        return me.options.height;
      }
      else {
        // auto height
        // TODO: implement a css based solution to automatically have the right hight
        return (me.timeAxis.height + me.contentPanel.height) + 'px';
      }
    }
  });
  this.rootPanel = new RootPanel(container, rootOptions);

  // single select (or unselect) when tapping an item
  this.rootPanel.on('tap',  this._onSelectItem.bind(this));

  // multi select when holding mouse/touch, or on ctrl+click
  this.rootPanel.on('hold', this._onMultiSelectItem.bind(this));

  // add item on doubletap
  this.rootPanel.on('doubletap', this._onAddItem.bind(this));

  // side panel
  var sideOptions = util.extend(Object.create(this.options), {
    top: function () {
      return (sideOptions.orientation == 'top') ? '0' : '';
    },
    bottom: function () {
      return (sideOptions.orientation == 'top') ? '' : '0';
    },
    left: '0',
    right: null,
    height: '100%',
    width: function () {
      if (me.itemSet) {
        return me.itemSet.getLabelsWidth();
      }
      else {
        return 0;
      }
    },
    className: function () {
      return 'side' + (me.groupsData ? '' : ' hidden');
    }
  });
  this.sidePanel = new Panel(sideOptions);
  this.rootPanel.appendChild(this.sidePanel);

  // main panel (contains time axis and itemsets)
  var mainOptions = util.extend(Object.create(this.options), {
    left: function () {
      // we align left to enable a smooth resizing of the window
      return me.sidePanel.width;
    },
    right: null,
    height: '100%',
    width: function () {
      return me.rootPanel.width - me.sidePanel.width;
    },
    className: 'main'
  });
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
  var timeAxisOptions = util.extend(Object.create(rootOptions), {
    range: this.range,
    left: null,
    top: null,
    width: null,
    height: null
  });
  this.timeAxis = new TimeAxis(timeAxisOptions);
  this.timeAxis.setRange(this.range);
  this.options.snap = this.timeAxis.snap.bind(this.timeAxis);
  this.mainPanel.appendChild(this.timeAxis);

  // content panel (contains itemset(s))
  var contentOptions = util.extend(Object.create(this.options), {
    top: function () {
      return (me.options.orientation == 'top') ? (me.timeAxis.height + 'px') : '';
    },
    bottom: function () {
      return (me.options.orientation == 'top') ? '' : (me.timeAxis.height + 'px');
    },
    left: null,
    right: null,
    height: null,
    width: null,
    className: 'content'
  });
  this.contentPanel = new Panel(contentOptions);
  this.mainPanel.appendChild(this.contentPanel);

  // content panel (contains the vertical lines of box items)
  var backgroundOptions = util.extend(Object.create(this.options), {
    top: function () {
      return (me.options.orientation == 'top') ? (me.timeAxis.height + 'px') : '';
    },
    bottom: function () {
      return (me.options.orientation == 'top') ? '' : (me.timeAxis.height + 'px');
    },
    left: null,
    right: null,
    height: function () {
      return me.contentPanel.height;
    },
    width: null,
    className: 'background'
  });
  this.backgroundPanel = new Panel(backgroundOptions);
  this.mainPanel.insertBefore(this.backgroundPanel, this.contentPanel);

  // panel with axis holding the dots of item boxes
  var axisPanelOptions = util.extend(Object.create(rootOptions), {
    left: 0,
    top: function () {
      return (me.options.orientation == 'top') ? (me.timeAxis.height + 'px') : '';
    },
    bottom: function () {
      return (me.options.orientation == 'top') ? '' : (me.timeAxis.height + 'px');
    },
    width: '100%',
    height: 0,
    className: 'axis'
  });
  this.axisPanel = new Panel(axisPanelOptions);
  this.mainPanel.appendChild(this.axisPanel);

  // content panel (contains itemset(s))
  var sideContentOptions = util.extend(Object.create(this.options), {
    top: function () {
      return (me.options.orientation == 'top') ? (me.timeAxis.height + 'px') : '';
    },
    bottom: function () {
      return (me.options.orientation == 'top') ? '' : (me.timeAxis.height + 'px');
    },
    left: null,
    right: null,
    height: null,
    width: null,
    className: 'side-content'
  });
  this.sideContentPanel = new Panel(sideContentOptions);
  this.sidePanel.appendChild(this.sideContentPanel);

  // current time bar
  // Note: time bar will be attached in this.setOptions when selected
  this.currentTime = new CurrentTime(this.range, rootOptions);

  // custom time bar
  // Note: time bar will be attached in this.setOptions when selected
  this.customTime = new CustomTime(rootOptions);
  this.customTime.on('timechange', function (time) {
    me.emit('timechange', time);
  });
  this.customTime.on('timechanged', function (time) {
    me.emit('timechanged', time);
  });

  // itemset containing items and groups
  var itemOptions = util.extend(Object.create(this.options), {
    left: null,
    right: null,
    top: null,
    bottom: null,
    width: null,
    height: null
  });
  this.itemSet = new ItemSet(this.backgroundPanel, this.axisPanel, this.sideContentPanel, itemOptions);
  this.itemSet.setRange(this.range);
  this.itemSet.on('change', me.rootPanel.repaint.bind(me.rootPanel));
  this.contentPanel.appendChild(this.itemSet);
*/
  this.itemsData = null;      // DataSet
  this.groupsData = null;     // DataSet

  // apply options
  if (options) {
    this.setOptions(options);
  }

  // create itemset
  if (items) {
    this.setItems(items);
  }
}

// turn Timeline into an event emitter
Emitter(Timeline.prototype);

/**
 * Create the main DOM for the Timeline: a root panel containing left, right,
 * top, bottom, content, and background panel.
 * @private
 */
Timeline.prototype._create = function () {
  this.dom = {};

  this.dom.root                 = document.createElement('div');
  this.dom.background           = document.createElement('div');
  this.dom.backgroundVertical   = document.createElement('div');
  this.dom.backgroundHorizontal = document.createElement('div');
  this.dom.centerContainer      = document.createElement('div');
  this.dom.leftContainer        = document.createElement('div');
  this.dom.rightContainer       = document.createElement('div');
  this.dom.center               = document.createElement('div');
  this.dom.left                 = document.createElement('div');
  this.dom.right                = document.createElement('div');
  this.dom.top                  = document.createElement('div');
  this.dom.bottom               = document.createElement('div');

  this.dom.background.className           = 'vispanel background';
  this.dom.backgroundVertical.className   = 'vispanel background vertical';
  this.dom.backgroundHorizontal.className = 'vispanel background horizontal';
  this.dom.centerContainer.className      = 'vispanel center';
  this.dom.leftContainer.className        = 'vispanel left';
  this.dom.rightContainer.className       = 'vispanel right';
  this.dom.top.className                  = 'vispanel top';
  this.dom.bottom.className               = 'vispanel bottom';
  this.dom.left.className                 = 'content';
  this.dom.center.className               = 'content';
  this.dom.right.className                = 'content';

  this.dom.root.appendChild(this.dom.background);
  this.dom.root.appendChild(this.dom.backgroundVertical);
  this.dom.root.appendChild(this.dom.backgroundHorizontal);
  this.dom.root.appendChild(this.dom.centerContainer);
  this.dom.root.appendChild(this.dom.leftContainer);
  this.dom.root.appendChild(this.dom.rightContainer);
  this.dom.root.appendChild(this.dom.top);
  this.dom.root.appendChild(this.dom.bottom);

  this.dom.centerContainer.appendChild(this.dom.center);
  this.dom.leftContainer.appendChild(this.dom.left);
  this.dom.rightContainer.appendChild(this.dom.right);

  // TODO: move watch from RootPanel to here

  // create a central event bus
  this.emitter = new Emitter();

  this.emitter.on('rangechange', this.repaint.bind(this));

  // create event listeners for all interesting events, these events will be
  // emitted via emitter
  this.hammer = Hammer(this.dom.root, {
    prevent_default: true
  });
  this.listeners = {};

  var me = this;
  var events = [
    'touch', 'pinch', 'tap', 'doubletap', 'hold',
    'dragstart', 'drag', 'dragend',
    'mousewheel', 'DOMMouseScroll' // DOMMouseScroll is needed for Firefox
  ];
  events.forEach(function (event) {
    var listener = function () {
      var args = [event].concat(Array.prototype.slice.call(arguments, 0));
      me.emitter.emit.apply(me.emitter, args);
    };
    me.hammer.on(event, listener);
    me.listeners[event] = listener;
  });

  // size properties of each of the panels
  this.props = {
    root: {},
    background: {},
    centerContainer: {},
    leftContainer: {},
    rightContainer: {},
    center: {},
    left: {},
    right: {},
    top: {},
    bottom: {},
    border: {}
  };
};

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
  util.deepExtend(this.options, options);

  if ('editable' in options) {
    var isBoolean = typeof options.editable === 'boolean';

    this.options.editable = {
      updateTime:  isBoolean ? options.editable : (options.editable.updateTime || false),
      updateGroup: isBoolean ? options.editable : (options.editable.updateGroup || false),
      add:         isBoolean ? options.editable : (options.editable.add || false),
      remove:      isBoolean ? options.editable : (options.editable.remove || false)
    };
  }
/* TODO
  // force update of range (apply new min/max etc.)
  // both start and end are optional
  this.range.setRange(options.start, options.end);
 */
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
/* TODO
  // force the itemSet to refresh: options like orientation and margins may be changed
  this.itemSet.markDirty();
*/
  // validate the callback functions
  var validateCallback = (function (fn) {
    if (!(this.options[fn] instanceof Function) || this.options[fn].length != 2) {
      throw new Error('option ' + fn + ' must be a function ' + fn + '(item, callback)');
    }
  }).bind(this);
  ['onAdd', 'onUpdate', 'onRemove', 'onMove'].forEach(validateCallback);

  /* TODO
  // add/remove the current time bar
  if (this.options.showCurrentTime) {
    if (!this.mainPanel.hasChild(this.currentTime)) {
      this.mainPanel.appendChild(this.currentTime);
      this.currentTime.start();
    }
  }
  else {
    if (this.mainPanel.hasChild(this.currentTime)) {
      this.currentTime.stop();
      this.mainPanel.removeChild(this.currentTime);
    }
  }

  // add/remove the custom time bar
  if (this.options.showCustomTime) {
    if (!this.mainPanel.hasChild(this.customTime)) {
      this.mainPanel.appendChild(this.customTime);
    }
  }
  else {
    if (this.mainPanel.hasChild(this.customTime)) {
      this.mainPanel.removeChild(this.customTime);
    }
  }
*/
  // TODO: remove deprecation error one day (deprecated since version 0.8.0)
  if (options && options.order) {
    throw new Error('Option order is deprecated. There is no replacement for this feature.');
  }

  // repaint everything
  this.repaint();
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
  else if (items instanceof DataSet || items instanceof DataView) {
    newDataSet = items;
  }
  else {
    // turn an array into a dataset
    newDataSet = new DataSet(items, {
      convert: {
        start: 'Date',
        end: 'Date'
      }
    });
  }

  // set items
  this.itemsData = newDataSet;
  this.itemSet && this.itemSet.setItems(newDataSet);

  if (initialLoad && (this.options.start == undefined || this.options.end == undefined)) {
    this.fit();

    var start = (this.options.start != undefined) ? util.convert(this.options.start, 'Date') : null;
    var end   = (this.options.end != undefined) ? util.convert(this.options.end, 'Date') : null;

    this.setWindow(start, end);
  }
};

/**
 * Set groups
 * @param {vis.DataSet | Array | google.visualization.DataTable} groups
 */
Timeline.prototype.setGroups = function setGroups(groups) {
  // convert to type DataSet when needed
  var newDataSet;
  if (!groups) {
    newDataSet = null;
  }
  else if (groups instanceof DataSet || groups instanceof DataView) {
    newDataSet = groups;
  }
  else {
    // turn an array into a dataset
    newDataSet = new DataSet(groups);
  }

  this.groupsData = newDataSet;
  this.itemSet.setGroups(newDataSet);
};

/**
 * Clear the Timeline. By Default, items, groups and options are cleared.
 * Example usage:
 *
 *     timeline.clear();                // clear items, groups, and options
 *     timeline.clear({options: true}); // clear options only
 *
 * @param {Object} [what]      Optionally specify what to clear. By default:
 *                             {items: true, groups: true, options: true}
 */
Timeline.prototype.clear = function clear(what) {
  // clear items
  if (!what || what.items) {
    this.setItems(null);
  }

  // clear groups
  if (!what || what.groups) {
    this.setGroups(null);
  }

  // clear options
  if (!what || what.options) {
    this.setOptions(this.defaultOptions);
  }
};

/**
 * Set Timeline window such that it fits all items
 */
Timeline.prototype.fit = function fit() {
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

  // skip range set if there is no start and end date
  if (start === null && end === null) {
    return;
  }

  this.range.setRange(start, end);
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
  this.itemSet && this.itemSet.setSelection(ids);
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
Timeline.prototype.getSelection = function getSelection() {
  return this.itemSet && this.itemSet.getSelection() || [];
};

/**
 * Set the visible window. Both parameters are optional, you can change only
 * start or only end. Syntax:
 *
 *     TimeLine.setWindow(start, end)
 *     TimeLine.setWindow(range)
 *
 * Where start and end can be a Date, number, or string, and range is an
 * object with properties start and end.
 *
 * @param {Date | Number | String | Object} [start] Start date of visible window
 * @param {Date | Number | String} [end]   End date of visible window
 */
Timeline.prototype.setWindow = function setWindow(start, end) {
  if (arguments.length == 1) {
    var range = arguments[0];
    this.range.setRange(range.start, range.end);
  }
  else {
    this.range.setRange(start, end);
  }
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
 * Force a repaint of the Timeline. Can be useful to manually repaint when
 * option autoResize=false
 */
Timeline.prototype.repaint = function repaint() {
  var resized = false,
      options = this.options,
      props = this.props,
      dom = this.dom,
      editable = options.editable.updateTime || options.editable.updateGroup;

  // update class names
  dom.root.className = 'vis timeline root ' + options.orientation + (editable ? ' editable' : '');

  // update root height options
  dom.root.style.maxHeight = util.option.asSize(options.maxHeight, '');
  dom.root.style.minHeight = util.option.asSize(options.minHeight, '');

  // calculate border widths
  props.border.left   = (dom.centerContainer.offsetWidth - dom.centerContainer.clientWidth) / 2;
  props.border.right  = props.border.left;
  props.border.top    = (dom.centerContainer.offsetHeight - dom.centerContainer.clientHeight) / 2;
  props.border.bottom = props.border.top;
  var borderRootHeight= dom.root.offsetHeight - dom.root.clientHeight;
  var borderRootWidth = dom.root.offsetWidth - dom.root.clientWidth;

  // calculate the heights. If any of the side panels is empty, we set the height to
  // minus the border width, such that the border will be invisible
  props.center.height = dom.center.offsetHeight;
  props.left.height   = dom.left.offsetHeight;
  props.right.height  = dom.right.offsetHeight;
  props.top.height    = dom.top.clientHeight    || -props.border.top;
  props.bottom.height = dom.bottom.clientHeight || -props.border.bottom;

  // TODO: compensate borders when any of the panels is empty.

  // apply auto height
  // TODO: only calculate autoHeight when needed (else we cause an extra reflow/repaint of the DOM)
  var contentHeight = Math.max(props.left.height, props.center.height, props.right.height);
  var autoHeight = props.top.height + contentHeight + props.bottom.height +
      borderRootHeight + props.border.top + props.border.bottom;
  dom.root.style.height = util.option.asSize(options.height, autoHeight + 'px');

  // calculate heights of the content panels
  props.root.height = dom.root.offsetHeight;
  props.background.height = props.root.height - borderRootHeight;
  var containerHeight = props.root.height - props.top.height - props.bottom.height -
      borderRootHeight;
  props.centerContainer.height  = containerHeight;
  props.leftContainer.height    = containerHeight;
  props.rightContainer.height   = props.leftContainer.height;

  // calculate the widths of the panels
  props.root.width = dom.root.offsetWidth;
  props.background.width = props.root.width - borderRootWidth;
  props.left.width = dom.leftContainer.clientWidth   || -props.border.left;
  props.leftContainer.width = props.left.width;
  props.right.width = dom.rightContainer.clientWidth || -props.border.right;
  props.rightContainer.width = props.right.width;
  var centerWidth = props.root.width - props.left.width - props.right.width - borderRootWidth;
  props.center.width          = centerWidth;
  props.centerContainer.width = centerWidth;
  props.top.width             = centerWidth;
  props.bottom.width          = centerWidth;

  // resize the panels
  dom.background.style.height           = props.background.height + 'px';
  dom.backgroundVertical.style.height   = props.background.height + 'px';
  dom.backgroundHorizontal.style.height = props.centerContainer.height + 'px';
  dom.centerContainer.style.height      = props.centerContainer.height + 'px';
  dom.leftContainer.style.height        = props.leftContainer.height + 'px';
  dom.rightContainer.style.height       = props.rightContainer.height + 'px';

  dom.background.style.width            = props.background.width + 'px';
  dom.backgroundVertical.style.width    = props.centerContainer.width + 'px';
  dom.backgroundHorizontal.style.width  = props.background.width + 'px';
  dom.centerContainer.style.width       = props.center.width + 'px';
  dom.top.style.width                   = props.top.width + 'px';
  dom.bottom.style.width                = props.bottom.width + 'px';

  // reposition the panels
  dom.background.style.left           = '0';
  dom.background.style.top            = '0';
  dom.backgroundVertical.style.left   = props.left.width + 'px';
  dom.backgroundVertical.style.top    = '0';
  dom.backgroundHorizontal.style.left = '0';
  dom.backgroundHorizontal.style.top  = props.top.height + 'px';
  dom.centerContainer.style.left      = props.left.width + 'px';
  dom.centerContainer.style.top       = props.top.height + 'px';
  dom.leftContainer.style.left        = '0';
  dom.leftContainer.style.top         = props.top.height + 'px';
  dom.rightContainer.style.left       = (props.left.width + props.center.width) + 'px';
  dom.rightContainer.style.top        = props.top.height + 'px';
  dom.top.style.left                  = props.left.width + 'px';
  dom.top.style.top                   = '0';
  dom.bottom.style.left               = props.left.width + 'px';
  dom.bottom.style.top                = (props.top.height + props.centerContainer.height) + 'px';

  // repaint all components
  this.components.forEach(function (component) {
    resized = component.repaint() || resized;
  });
  if (resized) {
    // keep repainting until all sizes are settled
    this.repaint();
  }
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

  var oldSelection = this.getSelection();

  var item = ItemSet.itemFromTarget(event);
  var selection = item ? [item.id] : [];
  this.setSelection(selection);

  var newSelection = this.getSelection();

  // if selection is changed, emit a select event
  if (!util.equalArray(oldSelection, newSelection)) {
    this.emit('select', {
      items: this.getSelection()
    });
  }

  event.stopPropagation();
};

/**
 * Handle creation and updates of an item on double tap
 * @param event
 * @private
 */
Timeline.prototype._onAddItem = function (event) {
  if (!this.options.selectable) return;
  if (!this.options.editable.add) return;

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
    var xAbs = vis.util.getAbsoluteLeft(this.contentPanel.frame);
    var x = event.gesture.center.pageX - xAbs;
    var newItem = {
      start: this.timeAxis.snap(this._toTime(x)),
      content: 'new item'
    };

    // when default type is a range, add a default end date to the new item
    if (this.options.type === 'range' || this.options.type == 'rangeoverflow') {
      newItem.end = this.timeAxis.snap(this._toTime(x + this.rootPanel.width / 5));
    }

    var id = util.randomUUID();
    newItem[this.itemsData.fieldId] = id;

    var group = ItemSet.groupFromTarget(event);
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

    this.emit('select', {
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
  var conversion = this.range.conversion(this.props.center.width);
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
  var conversion = this.range.conversion(this.props.center.width);
  return (time.valueOf() - conversion.offset) * conversion.scale;
};
