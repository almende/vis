var DataSet  = require('../DataSet');
var DataView = require('../DataView');
var Point3d  = require('./Point3d');
var Range    = require('./Range');


function DataGroup() {
  this.dataTable = null;  // The original data table
}


/**
 * Initialize the data from the data table. Calculate minimum and maximum values
 * and column index values
 * @param {Array | DataSet | DataView} rawData The data containing the items for
 *                                             the Graph.
 * @param {Number}                     style   Style Number
 */
DataGroup.prototype.dataInitialize = function(graph3d, rawData, style) {
  var me = this;

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
  this._onChange = function () {
    me.setData(me.dataSet);
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

  // calculate minimums and maximums
  var NUMSTEPS = 5;

  var xRange = this.getColumnRange(data, this.colX);
  if (withBars) {
    xRange.expand(this.xBarWidth / 2);
  }
  this._setRangeDefaults(xRange, graph3d.defaultXMin, graph3d.defaultXMax);
  this.xRange = xRange;
  this.xStep = (this.defaultXStep !== undefined) ? graph3d.defaultXStep : xRange.range()/NUMSTEPS;

  var yRange = this.getColumnRange(data, this.colY);
  if (withBars) {
    yRange.expand(this.yBarWidth / 2);
  }
  this._setRangeDefaults(yRange, graph3d.defaultYMin, graph3d.defaultYMax);
  this.yRange = yRange;
  this.yStep = (graph3d.defaultYStep !== undefined) ? graph3d.defaultYStep : yRange.range()/NUMSTEPS;

  var zRange = this.getColumnRange(data, this.colZ);
  this._setRangeDefaults(zRange, graph3d.defaultZMin, graph3d.defaultZMax);
  this.zRange = zRange;
  this.zStep = (graph3d.defaultZStep !== undefined) ? graph3d.defaultZStep : zRange.range()/NUMSTEPS;

  if (data[0].hasOwnProperty('style')) {
    this.colValue = 'style';
    var valueRange = this.getColumnRange(data, this.colValue);
    this._setRangeDefaults(valueRange, graph3d.defaultValueMin, graph3d.defaultValueMax);
    this.valueRange = valueRange;
  }
};


DataGroup.prototype.getDistinctValues = function(column) {
  var data           = this.dataTable;
  var distinctValues = [];

  for (var i = 0; i < data.length; i++) {
    if (distinctValues.indexOf(data[i][column]) == -1) {
      distinctValues.push(data[i][column]);
    }
  }

  return distinctValues.sort(function(a,b) { return a - b; });
};


/**
 * Determine the smallest difference between the values for given
 * column in the passed data set.
 *
 * @returns {Number|null} Smallest difference value or
 *                        null, if it can't be determined.
 */
DataGroup.prototype.getSmallestDifference = function(data, column) {
  var values = this.getDistinctValues(data, column);
  var diffs  = [];

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
 * NOTE: Not used yet but it will be.
 */
DataGroup.prototype.getNumberOfRows = function() {
  return this.dataTable.length;
}


/**
 * NOTE: This method is used nowhere.
 */
DataGroup.prototype.getNumberOfColumns = function() {
  var data = this.dataTable;

  var counter = 0;
  for (var column in data[0]) {
    if (data[0].hasOwnProperty(column)) {
      counter++;
    }
  }
  return counter;
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
