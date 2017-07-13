var DataSet  = require('../DataSet');
var DataView = require('../DataView');
var Point3d  = require('./Point3d');
var Range    = require('./Range');


/**
 * Creates a container for all data of one specific 3D-graph.
 *
 * On construction, the container is totally empty; the data
 * needs to be initialized with method initializeData().
 * Failure to do so will result in the following exception begin thrown
 * on instantiation of Graph3D:
 *
 *     Error: Array, DataSet, or DataView expected
 *
 * @constructor
 */
function DataGroup() {
  this.dataTable = null;  // The original data table
}


/**
 * Initializes the instance from the passed data.
 *
 * Calculates minimum and maximum values and column index values.
 *
 * The graph3d instance is used internally to access the settings for
 * the given instance.
 * TODO: Pass settings only instead.
 *
 * @param {Graph3D}  graph3d Reference to the calling Graph3D instance.
 * @param {Array | DataSet | DataView} rawData The data containing the items for
 *                                             the Graph.
 * @param {Number}   style   Style Number
 */
DataGroup.prototype.initializeData = function(graph3d, rawData, style) {
  // unsubscribe from the dataTable
  if (this.dataSet) {
    this.dataSet.off('*', this._onChange);
  }

  if (rawData === undefined)
    return;

  if (Array.isArray(rawData)) {
    rawData = new DataSet(rawData);
  }

  var data;
  if (rawData instanceof DataSet || rawData instanceof DataView) {
    data = rawData.get();
  }
  else {
    throw new Error('Array, DataSet, or DataView expected');
  }

  if (data.length == 0)
    return;

  this.dataSet = rawData;
  this.dataTable = data;

  // subscribe to changes in the dataset
  var me = this;
  this._onChange = function () {
    graph3d.setData(me.dataSet);
  };
  this.dataSet.on('*', this._onChange);

  // determine the location of x,y,z,value,filter columns
  this.colX = 'x';
  this.colY = 'y';
  this.colZ = 'z';


  var withBars = graph3d.hasBars(style);

  // determine barWidth from data
  if (withBars) {
    if (graph3d.defaultXBarWidth !== undefined) {
      this.xBarWidth = graph3d.defaultXBarWidth;
    }
    else {
      this.xBarWidth = this.getSmallestDifference(data, this.colX) || 1;
    }

    if (graph3d.defaultYBarWidth !== undefined) {
      this.yBarWidth = graph3d.defaultYBarWidth;
    }
    else {
      this.yBarWidth = this.getSmallestDifference(data, this.colY) || 1;
    }
  }

  // calculate minima and maxima
  this._initializeRange(data, this.colX, graph3d, withBars);
  this._initializeRange(data, this.colY, graph3d, withBars);
  this._initializeRange(data, this.colZ, graph3d, false);

  if (data[0].hasOwnProperty('style')) {
    this.colValue = 'style';
    var valueRange = this.getColumnRange(data, this.colValue);
    this._setRangeDefaults(valueRange, graph3d.defaultValueMin, graph3d.defaultValueMax);
    this.valueRange = valueRange;
  }
};


/**
 * Collect the range settings for the given data column.
 *
 * This internal method is intended to make the range 
 * initalization more generic.
 *
 * TODO: if/when combined settings per axis defined, get rid of this.
 *
 * @private
 *
 * @param {'x'|'y'|'z'} column  The data column to process
 * @param {Graph3D}     graph3d Reference to the calling Graph3D instance;
 *                              required for access to settings
 */
DataGroup.prototype._collectRangeSettings = function(column, graph3d) {
  var index = ['x', 'y', 'z'].indexOf(column);

  if (index == -1) {
    throw new Error('Column \'' + column + '\' invalid');
  }

  var upper = column.toUpperCase();

  return {
    barWidth   : this[column + 'BarWidth'],
    min        : graph3d['default' + upper + 'Min'],
    max        : graph3d['default' + upper + 'Max'],
    step       : graph3d['default' + upper + 'Step'],
    range_label: column + 'Range', // Name of instance field to write to
    step_label : column + 'Step'   // Name of instance field to write to
  };
}


/**
 * Initializes the settings per given column.
 *
 * TODO: if/when combined settings per axis defined, rewrite this.
 *
 * @private
 *
 * @param {DataSet | DataView} data     The data containing the items for the Graph
 * @param {'x'|'y'|'z'}        column   The data column to process
 * @param {Graph3D}            graph3d  Reference to the calling Graph3D instance;
 *                                      required for access to settings
 * @param {Boolean}            withBars True if initializing for bar graph
 */
DataGroup.prototype._initializeRange = function(data, column, graph3d, withBars) {
  var NUMSTEPS = 5;
  var settings = this._collectRangeSettings(column, graph3d);

  var range = this.getColumnRange(data, column);
  if (withBars && column != 'z') {          // Safeguard for 'z'; it doesn't have a bar width
    range.expand(settings.barWidth / 2);
  }

  this._setRangeDefaults(range, settings.min, settings.max);
  this[settings.range_label] = range;
  this[settings.step_label ] = (settings.step !== undefined) ? settings.step : range.range()/NUMSTEPS;
}


/**
 * Creates a list with all the different values in the data for the given column.
 *
 * If no data passed, use the internal data of this instance.
 *
 * @param {'x'|'y'|'z'}                column The data column to process
 * @param {DataSet|DataView|undefined} data   The data containing the items for the Graph
 *
 * @returns {Array} All distinct values in the given column data, sorted ascending.
 */
DataGroup.prototype.getDistinctValues = function(column, data) {
  if (data === undefined) {
    data = this.dataTable;
  }

  var values = [];

  for (var i = 0; i < data.length; i++) {
    var value = data[i][column] || 0;
    if (values.indexOf(value) === -1) {
      values.push(value);
    }
  }

  return values.sort(function(a,b) { return a - b; });
};


/**
 * Determine the smallest difference between the values for given
 * column in the passed data set.
 *
 * @param {DataSet|DataView|undefined} data   The data containing the items for the Graph
 * @param {'x'|'y'|'z'}                column The data column to process
 *
 * @returns {Number|null} Smallest difference value or
 *                        null, if it can't be determined.
 */
DataGroup.prototype.getSmallestDifference = function(data, column) {
  var values = this.getDistinctValues(data, column);

  // Get all the distinct diffs
  // Array values is assumed to be sorted here
  var smallest_diff = null;

  for (var i = 1; i < values.length; i++) {
    var diff = values[i] - values[i - 1];

    if (smallest_diff == null || smallest_diff > diff ) {
      smallest_diff = diff;
    }
  }

  return smallest_diff;
}


/**
 * Get the absolute min/max values for the passed data column.
 *
 * @param {DataSet|DataView|undefined} data   The data containing the items for the Graph
 * @param {'x'|'y'|'z'}                column The data column to process
 *
 * @returns {Range} A Range instance with min/max members properly set.
 */
DataGroup.prototype.getColumnRange = function(data, column) {
  var range  = new Range();

  // Adjust the range so that it covers all values in the passed data elements.
  for (var i = 0; i < data.length; i++) {
    var item = data[i][column];
    range.adjust(item);
  }

  return range;
};


/**
 * Determines the number of rows in the current data.
 *
 * @returns {Number}
 */
DataGroup.prototype.getNumberOfRows = function() {
  return this.dataTable.length;
}


/**
 * Set default values for range
 *
 * The default values override the range values, if defined.
 *
 * Because it's possible that only defaultMin or defaultMax is set, it's better
 * to pass in a range already set with the min/max set from the data. Otherwise,
 * it's quite hard to process the min/max properly.
 */
DataGroup.prototype._setRangeDefaults = function (range, defaultMin, defaultMax) {
  if (defaultMin !== undefined) {
    range.min = defaultMin;
  }

  if (defaultMax !== undefined) {
    range.max = defaultMax;
  }

  // This is the original way that the default min/max values were adjusted.
  // TODO: Perhaps it's better if an error is thrown if the values do not agree.
  //       But this will change the behaviour.
  if (range.max <= range.min) range.max = range.min + 1;
};


DataGroup.prototype.getDataTable = function() {
  return this.dataTable;
};


DataGroup.prototype.getDataSet = function() {
  return this.dataSet;
};


/**
 * Reload the data
 */
DataGroup.prototype.reload = function() {
  if (this.dataTable) {
    this.setData(this.dataTable);
  }
};


module.exports = DataGroup;
