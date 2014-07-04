/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array | google.visualization.DataTable} [items]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor
 */
function Timeline (container, items, options) {
  if (!(this instanceof Timeline)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  var me = this;
  this.defaultOptions = {
    start: null,
    end:   null,

    autoResize: true,

    orientation: 'bottom',
    width: null,
    height: null,
    maxHeight: null,
    minHeight: null
  };
  this.options = util.deepExtend({}, this.defaultOptions);

  // Create the DOM, props, and emitter
  this._create(container);

  // all components listed here will be repainted automatically
  this.components = [];

  this.body = {
    dom: this.dom,
    domProps: this.props,
    emitter: {
      on: this.on.bind(this),
      off: this.off.bind(this),
      emit: this.emit.bind(this)
    },
    util: {
      snap: null, // will be specified after TimeAxis is created
      toScreen: me._toScreen.bind(me),
      toGlobalScreen: me._toGlobalScreen.bind(me), // this refers to the root.width
      toTime: me._toTime.bind(me),
      toGlobalTime : me._toGlobalTime.bind(me)
    }
  };

  // range
  this.range = new Range(this.body);
  this.components.push(this.range);
  this.body.range = this.range;

  // time axis
  this.timeAxis = new TimeAxis(this.body);
  this.components.push(this.timeAxis);
  this.body.util.snap = this.timeAxis.snap.bind(this.timeAxis);

  // current time bar
  this.currentTime = new CurrentTime(this.body);
  this.components.push(this.currentTime);

  // custom time bar
  // Note: time bar will be attached in this.setOptions when selected
  this.customTime = new CustomTime(this.body);
  this.components.push(this.customTime);

  // item set
  this.itemSet = new ItemSet(this.body);
  this.components.push(this.itemSet);

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
  else {
    this.redraw();
  }
}

// turn Timeline into an event emitter
Emitter(Timeline.prototype);

/**
 * Create the main DOM for the Timeline: a root panel containing left, right,
 * top, bottom, content, and background panel.
 * @param {Element} container  The container element where the Timeline will
 *                             be attached.
 * @private
 */
Timeline.prototype._create = function (container) {
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
  this.dom.shadowTop            = document.createElement('div');
  this.dom.shadowBottom         = document.createElement('div');
  this.dom.shadowTopLeft        = document.createElement('div');
  this.dom.shadowBottomLeft     = document.createElement('div');
  this.dom.shadowTopRight       = document.createElement('div');
  this.dom.shadowBottomRight    = document.createElement('div');

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
  this.dom.shadowTop.className            = 'shadow top';
  this.dom.shadowBottom.className         = 'shadow bottom';
  this.dom.shadowTopLeft.className        = 'shadow top';
  this.dom.shadowBottomLeft.className     = 'shadow bottom';
  this.dom.shadowTopRight.className       = 'shadow top';
  this.dom.shadowBottomRight.className    = 'shadow bottom';

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

  this.dom.centerContainer.appendChild(this.dom.shadowTop);
  this.dom.centerContainer.appendChild(this.dom.shadowBottom);
  this.dom.leftContainer.appendChild(this.dom.shadowTopLeft);
  this.dom.leftContainer.appendChild(this.dom.shadowBottomLeft);
  this.dom.rightContainer.appendChild(this.dom.shadowTopRight);
  this.dom.rightContainer.appendChild(this.dom.shadowBottomRight);

  this.on('rangechange', this.redraw.bind(this));
  this.on('change', this.redraw.bind(this));
  this.on('touch', this._onTouch.bind(this));
  this.on('pinch', this._onPinch.bind(this));
  this.on('dragstart', this._onDragStart.bind(this));
  this.on('drag', this._onDrag.bind(this));

  // create event listeners for all interesting events, these events will be
  // emitted via emitter
  this.hammer = Hammer(this.dom.root, {
    prevent_default: true
  });
  this.listeners = {};

  var me = this;
  var events = [
    'touch', 'pinch',
    'tap', 'doubletap', 'hold',
    'dragstart', 'drag', 'dragend',
    'mousewheel', 'DOMMouseScroll' // DOMMouseScroll is needed for Firefox
  ];
  events.forEach(function (event) {
    var listener = function () {
      var args = [event].concat(Array.prototype.slice.call(arguments, 0));
      me.emit.apply(me, args);
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
    border: {},
    scrollTop: 0,
    scrollTopMin: 0
  };
  this.touch = {}; // store state information needed for touch events

  // attach the root panel to the provided container
  if (!container) throw new Error('No container provided');
  container.appendChild(this.dom.root);
};

/**
 * Destroy the Timeline, clean up all DOM elements and event listeners.
 */
Timeline.prototype.destroy = function () {
  // unbind datasets
  this.clear();

  // remove all event listeners
  this.off();

  // stop checking for changed size
  this._stopAutoResize();

  // remove from DOM
  if (this.dom.root.parentNode) {
    this.dom.root.parentNode.removeChild(this.dom.root);
  }
  this.dom = null;

  // cleanup hammer touch events
  for (var event in this.listeners) {
    if (this.listeners.hasOwnProperty(event)) {
      delete this.listeners[event];
    }
  }
  this.listeners = null;
  this.hammer = null;

  // give all components the opportunity to cleanup
  this.components.forEach(function (component) {
    component.destroy();
  });

  this.body = null;
};

/**
 * Set options. Options will be passed to all components loaded in the Timeline.
 * @param {Object} [options]
 *                           {String} orientation
 *                              Vertical orientation for the Timeline,
 *                              can be 'bottom' (default) or 'top'.
 *                           {String | Number} width
 *                              Width for the timeline, a number in pixels or
 *                              a css string like '1000px' or '75%'. '100%' by default.
 *                           {String | Number} height
 *                              Fixed height for the Timeline, a number in pixels or
 *                              a css string like '400px' or '75%'. If undefined,
 *                              The Timeline will automatically size such that
 *                              its contents fit.
 *                           {String | Number} minHeight
 *                              Minimum height for the Timeline, a number in pixels or
 *                              a css string like '400px' or '75%'.
 *                           {String | Number} maxHeight
 *                              Maximum height for the Timeline, a number in pixels or
 *                              a css string like '400px' or '75%'.
 *                           {Number | Date | String} start
 *                              Start date for the visible window
 *                           {Number | Date | String} end
 *                              End date for the visible window
 */
Timeline.prototype.setOptions = function (options) {
  if (options) {
    // copy the known options
    var fields = ['width', 'height', 'minHeight', 'maxHeight', 'autoResize', 'start', 'end', 'orientation'];
    util.selectiveExtend(fields, this.options, options);

    // enable/disable autoResize
    this._initAutoResize();
  }

  // propagate options to all components
  this.components.forEach(function (component) {
    component.setOptions(options);
  });

  // TODO: remove deprecation error one day (deprecated since version 0.8.0)
  if (options && options.order) {
    throw new Error('Option order is deprecated. There is no replacement for this feature.');
  }

  // redraw everything
  this.redraw();
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
      type: {
        start: 'Date',
        end: 'Date'
      }
    });
  }

  // set items
  this.itemsData = newDataSet;
  this.itemSet && this.itemSet.setItems(newDataSet);

  if (initialLoad && ('start' in this.options || 'end' in this.options)) {
    this.fit();

    var start = ('start' in this.options) ? util.convert(this.options.start, 'Date') : null;
    var end   = ('end' in this.options)   ? util.convert(this.options.end, 'Date') : null;

    this.setWindow(start, end);
  }
};

/**
 * Set groups
 * @param {vis.DataSet | Array | google.visualization.DataTable} groups
 */
Timeline.prototype.setGroups = function(groups) {
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
Timeline.prototype.clear = function(what) {
  // clear items
  if (!what || what.items) {
    this.setItems(null);
  }

  // clear groups
  if (!what || what.groups) {
    this.setGroups(null);
  }

  // clear options of timeline and of each of the components
  if (!what || what.options) {
    this.components.forEach(function (component) {
      component.setOptions(component.defaultOptions);
    });

    this.setOptions(this.defaultOptions); // this will also do a redraw
  }
};

/**
 * Set Timeline window such that it fits all items
 */
Timeline.prototype.fit = function() {
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
Timeline.prototype.getItemRange = function() {
  // calculate min from start filed
  var itemsData = this.itemsData,
      min = null,
      max = null;

  if (itemsData) {
    // calculate the minimum value of the field 'start'
    var minItem = itemsData.min('start');
    min = minItem ? util.convert(minItem.start, 'Date').valueOf() : null;
    // Note: we convert first to Date and then to number because else
    // a conversion from ISODate to Number will fail

    // calculate maximum value of fields 'start' and 'end'
    var maxStartItem = itemsData.max('start');
    if (maxStartItem) {
      max = util.convert(maxStartItem.start, 'Date').valueOf();
    }
    var maxEndItem = itemsData.max('end');
    if (maxEndItem) {
      if (max == null) {
        max = util.convert(maxEndItem.end, 'Date').valueOf();
      }
      else {
        max = Math.max(max, util.convert(maxEndItem.end, 'Date').valueOf());
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
Timeline.prototype.setSelection = function(ids) {
  this.itemSet && this.itemSet.setSelection(ids);
};

/**
 * Get the selected items by their id
 * @return {Array} ids  The ids of the selected items
 */
Timeline.prototype.getSelection = function() {
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
Timeline.prototype.setWindow = function(start, end) {
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
Timeline.prototype.getWindow = function() {
  var range = this.range.getRange();
  return {
    start: new Date(range.start),
    end: new Date(range.end)
  };
};

/**
 * Force a redraw of the Timeline. Can be useful to manually redraw when
 * option autoResize=false
 */
Timeline.prototype.redraw = function() {
  var resized = false,
      options = this.options,
      props = this.props,
      dom = this.dom;

  if (!dom) return; // when destroyed

  // update class names
  dom.root.className = 'vis timeline root ' + options.orientation;

  // update root width and height options
  dom.root.style.maxHeight = util.option.asSize(options.maxHeight, '');
  dom.root.style.minHeight = util.option.asSize(options.minHeight, '');
  dom.root.style.width = util.option.asSize(options.width, '');

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

  // update the scrollTop, feasible range for the offset can be changed
  // when the height of the Timeline or of the contents of the center changed
  this._updateScrollTop();

  // reposition the scrollable contents
  var offset = this.props.scrollTop;
  if (options.orientation == 'bottom') {
    offset += Math.max(this.props.centerContainer.height - this.props.center.height -
        this.props.border.top - this.props.border.bottom, 0);
  }
  dom.center.style.left = '0';
  dom.center.style.top  = offset + 'px';
  dom.left.style.left   = '0';
  dom.left.style.top    = offset + 'px';
  dom.right.style.left  = '0';
  dom.right.style.top   = offset + 'px';

  // show shadows when vertical scrolling is available
  var visibilityTop = this.props.scrollTop == 0 ? 'hidden' : '';
  var visibilityBottom = this.props.scrollTop == this.props.scrollTopMin ? 'hidden' : '';
  dom.shadowTop.style.visibility          = visibilityTop;
  dom.shadowBottom.style.visibility       = visibilityBottom;
  dom.shadowTopLeft.style.visibility      = visibilityTop;
  dom.shadowBottomLeft.style.visibility   = visibilityBottom;
  dom.shadowTopRight.style.visibility     = visibilityTop;
  dom.shadowBottomRight.style.visibility  = visibilityBottom;

  // redraw all components
  this.components.forEach(function (component) {
    resized = component.redraw() || resized;
  });
  if (resized) {
    // keep repainting until all sizes are settled
    this.redraw();
  }
};

// TODO: deprecated since version 1.1.0, remove some day
Timeline.prototype.repaint = function () {
    throw new Error('Function repaint is deprecated. Use redraw instead.');
};

/**
 * Convert a position on screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @private
 */
// TODO: move this function to Range
Timeline.prototype._toTime = function(x) {
  var conversion = this.range.conversion(this.props.center.width);
  return new Date(x / conversion.scale + conversion.offset);
};


/**
 * Convert a position on the global screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 * @private
 */
// TODO: move this function to Range
Timeline.prototype._toGlobalTime = function(x) {
  var conversion = this.range.conversion(this.props.root.width);
  return new Date(x / conversion.scale + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 * @private
 */
// TODO: move this function to Range
Timeline.prototype._toScreen = function(time) {
  var conversion = this.range.conversion(this.props.center.width);
  return (time.valueOf() - conversion.offset) * conversion.scale;
};


/**
 * Convert a datetime (Date object) into a position on the root
 * This is used to get the pixel density estimate for the screen, not the center panel
 * @param {Date}   time A date
 * @return {int}   x    The position on root in pixels which corresponds
 *                      with the given date.
 * @private
 */
// TODO: move this function to Range
Timeline.prototype._toGlobalScreen = function(time) {
  var conversion = this.range.conversion(this.props.root.width);
  return (time.valueOf() - conversion.offset) * conversion.scale;
};


/**
 * Initialize watching when option autoResize is true
 * @private
 */
Timeline.prototype._initAutoResize = function () {
  if (this.options.autoResize == true) {
    this._startAutoResize();
  }
  else {
    this._stopAutoResize();
  }
};

/**
 * Watch for changes in the size of the container. On resize, the Panel will
 * automatically redraw itself.
 * @private
 */
Timeline.prototype._startAutoResize = function () {
  var me = this;

  this._stopAutoResize();

  this._onResize = function() {
    if (me.options.autoResize != true) {
      // stop watching when the option autoResize is changed to false
      me._stopAutoResize();
      return;
    }

    if (me.dom.root) {
      // check whether the frame is resized
      if ((me.dom.root.clientWidth != me.props.lastWidth) ||
          (me.dom.root.clientHeight != me.props.lastHeight)) {
        me.props.lastWidth = me.dom.root.clientWidth;
        me.props.lastHeight = me.dom.root.clientHeight;

        me.emit('change');
      }
    }
  };

  // add event listener to window resize
  util.addEventListener(window, 'resize', this._onResize);

  this.watchTimer = setInterval(this._onResize, 1000);
};

/**
 * Stop watching for a resize of the frame.
 * @private
 */
Timeline.prototype._stopAutoResize = function () {
  if (this.watchTimer) {
    clearInterval(this.watchTimer);
    this.watchTimer = undefined;
  }

  // remove event listener on window.resize
  util.removeEventListener(window, 'resize', this._onResize);
  this._onResize = null;
};

/**
 * Start moving the timeline vertically
 * @param {Event} event
 * @private
 */
Timeline.prototype._onTouch = function (event) {
  this.touch.allowDragging = true;
};

/**
 * Start moving the timeline vertically
 * @param {Event} event
 * @private
 */
Timeline.prototype._onPinch = function (event) {
  this.touch.allowDragging = false;
};

/**
 * Start moving the timeline vertically
 * @param {Event} event
 * @private
 */
Timeline.prototype._onDragStart = function (event) {
  this.touch.initialScrollTop = this.props.scrollTop;
};

/**
 * Move the timeline vertically
 * @param {Event} event
 * @private
 */
Timeline.prototype._onDrag = function (event) {
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.touch.allowDragging) return;

  var delta = event.gesture.deltaY;

  var oldScrollTop = this._getScrollTop();
  var newScrollTop = this._setScrollTop(this.touch.initialScrollTop + delta);

  if (newScrollTop != oldScrollTop) {
    this.redraw(); // TODO: this causes two redraws when dragging, the other is triggered by rangechange already
  }
};

/**
 * Apply a scrollTop
 * @param {Number} scrollTop
 * @returns {Number} scrollTop  Returns the applied scrollTop
 * @private
 */
Timeline.prototype._setScrollTop = function (scrollTop) {
  this.props.scrollTop = scrollTop;
  this._updateScrollTop();
  return this.props.scrollTop;
};

/**
 * Update the current scrollTop when the height of  the containers has been changed
 * @returns {Number} scrollTop  Returns the applied scrollTop
 * @private
 */
Timeline.prototype._updateScrollTop = function () {
  // recalculate the scrollTopMin
  var scrollTopMin = Math.min(this.props.centerContainer.height - this.props.center.height, 0); // is negative or zero
  if (scrollTopMin != this.props.scrollTopMin) {
    // in case of bottom orientation, change the scrollTop such that the contents
    // do not move relative to the time axis at the bottom
    if (this.options.orientation == 'bottom') {
      this.props.scrollTop += (scrollTopMin - this.props.scrollTopMin);
    }
    this.props.scrollTopMin = scrollTopMin;
  }

  // limit the scrollTop to the feasible scroll range
  if (this.props.scrollTop > 0) this.props.scrollTop = 0;
  if (this.props.scrollTop < scrollTopMin) this.props.scrollTop = scrollTopMin;

  return this.props.scrollTop;
};

/**
 * Get the current scrollTop
 * @returns {number} scrollTop
 * @private
 */
Timeline.prototype._getScrollTop = function () {
  return this.props.scrollTop;
};
