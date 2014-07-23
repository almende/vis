var Emitter = require('emitter-component');
var Hammer = require('../module/hammer');
var util = require('../util');
var DataSet = require('../DataSet');
var DataView = require('../DataView');
var Range = require('./Range');
var Core = require('./Core');
var TimeAxis = require('./component/TimeAxis');
var CurrentTime = require('./component/CurrentTime');
var CustomTime = require('./component/CustomTime');
var LineGraph = require('./component/LineGraph');

/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array | google.visualization.DataTable} [items]
 * @param {Object} [options]  See Graph2d.setOptions for the available options.
 * @constructor
 */
function Graph2d (container, items, options, groups) {
  for (var coreProp in Core.prototype) {
    if (Core.prototype.hasOwnProperty(coreProp) && !Graph2d.prototype.hasOwnProperty(coreProp)) {
      Graph2d.prototype[coreProp] = Core.prototype[coreProp];
    }
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
  this.linegraph = new LineGraph(this.body);
  this.components.push(this.linegraph);

  this.itemsData = null;      // DataSet
  this.groupsData = null;     // DataSet

  // apply options
  if (options) {
    this.setOptions(options);
  }

  // IMPORTANT: THIS HAPPENS BEFORE SET ITEMS!
  if (groups) {
    this.setGroups(groups);
  }

  // create itemset
  if (items) {
    this.setItems(items);
  }
  else {
    this.redraw();
  }
}

/**
 * Set options. Options will be passed to all components loaded in the Graph2d.
 * @param {Object} [options]
 *                           {String} orientation
 *                              Vertical orientation for the Graph2d,
 *                              can be 'bottom' (default) or 'top'.
 *                           {String | Number} width
 *                              Width for the timeline, a number in pixels or
 *                              a css string like '1000px' or '75%'. '100%' by default.
 *                           {String | Number} height
 *                              Fixed height for the Graph2d, a number in pixels or
 *                              a css string like '400px' or '75%'. If undefined,
 *                              The Graph2d will automatically size such that
 *                              its contents fit.
 *                           {String | Number} minHeight
 *                              Minimum height for the Graph2d, a number in pixels or
 *                              a css string like '400px' or '75%'.
 *                           {String | Number} maxHeight
 *                              Maximum height for the Graph2d, a number in pixels or
 *                              a css string like '400px' or '75%'.
 *                           {Number | Date | String} start
 *                              Start date for the visible window
 *                           {Number | Date | String} end
 *                              End date for the visible window
 */
Graph2d.prototype.setOptions = function (options) {
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
 * Set items
 * @param {vis.DataSet | Array | google.visualization.DataTable | null} items
 */
Graph2d.prototype.setItems = function(items) {
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
  this.linegraph && this.linegraph.setItems(newDataSet);

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
Graph2d.prototype.setGroups = function(groups) {
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
  this.linegraph.setGroups(newDataSet);
};

/**
 * Returns an object containing an SVG element with the icon of the group (size determined by iconWidth and iconHeight), the label of the group (content) and the yAxisOrientation of the group (left or right).
 * @param groupId
 * @param width
 * @param height
 */
Graph2d.prototype.getLegend = function(groupId, width, height) {
  if (width  === undefined) {width  = 15;}
  if (height === undefined) {height = 15;}
  if (this.linegraph.groups[groupId] !== undefined) {
    return this.linegraph.groups[groupId].getLegend(width,height);
  }
  else {
    return "cannot find group:" +  groupId;
  }
}

/**
 * This checks if the visible option of the supplied group (by ID) is true or false.
 * @param groupId
 * @returns {*}
 */
Graph2d.prototype.isGroupVisible = function(groupId) {
  if (this.linegraph.groups[groupId] !== undefined) {
    return this.linegraph.groups[groupId].visible;
  }
  else {
    return false;
  }
}


/**
 * Get the data range of the item set.
 * @returns {{min: Date, max: Date}} range  A range with a start and end Date.
 *                                          When no minimum is found, min==null
 *                                          When no maximum is found, max==null
 */
Graph2d.prototype.getItemRange = function() {
  var min = null;
  var max = null;

  // calculate min from start filed
  for (var groupId in this.linegraph.groups) {
    if (this.linegraph.groups.hasOwnProperty(groupId)) {
      if (this.linegraph.groups[groupId].visible == true) {
        for (var i = 0; i < this.linegraph.groups[groupId].itemsData.length; i++) {
          var item = this.linegraph.groups[groupId].itemsData[i];
          var value = util.convert(item.x, 'Date').valueOf();
          min = min == null ? value : min > value ? value : min;
          max = max == null ? value : max < value ? value : max;
        }
      }
    }
  }

  return {
    min: (min != null) ? new Date(min) : null,
    max: (max != null) ? new Date(max) : null
  };
};



module.exports = Graph2d;
