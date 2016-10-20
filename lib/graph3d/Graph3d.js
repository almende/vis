var Emitter = require('emitter-component'); var DataSet = require('../DataSet');
var DataView = require('../DataView');
var util = require('../util');
var Point3d = require('./Point3d');
var Point2d = require('./Point2d');
var Camera = require('./Camera');
var Filter = require('./Filter');
var Slider = require('./Slider');
var StepNumber = require('./StepNumber');

// -----------------------------------------------------------------------------
// Definitions private to module
// -----------------------------------------------------------------------------

/// enumerate the available styles
Graph3d.STYLE = {
  BAR     : 0,
  BARCOLOR: 1,
  BARSIZE : 2,
  DOT     : 3,
  DOTLINE : 4,
  DOTCOLOR: 5,
  DOTSIZE : 6,
  GRID    : 7,
  LINE    : 8,
  SURFACE : 9
};


/**
 * Field names in the options hash which are of relevance to the user.
 *
 * Specifically, these are the fields which require no special handling,
 * and can be directly copied over.
 */
var OPTIONKEYS = [
  'width',
  'height',
  'filterLabel',
  'legendLabel',
  'xLabel',
  'yLabel',
  'zLabel',
  'xValueLabel',
  'yValueLabel',
  'zValueLabel',
  'showGrid',
  'showPerspective',
  'showShadow',
  'keepAspectRatio',
  'verticalRatio',
  'showAnimationControls',
  'animationInterval',
  'animationPreload',
  'animationAutoStart',
  'axisColor',
  'gridColor',
  'xCenter',
  'yCenter'
];


/**
 * Field names in the options hash which are of relevance to the user.
 *
 * Same as OPTIONKEYS, but internally these fields are stored with 
 * prefix 'default' in the name.
 */
var PREFIXEDOPTIONKEYS = [
  'xBarWidth',
  'yBarWidth',
  'valueMin',
  'valueMax',
  'xMin',
  'xMax',
  'xStep',
  'yMin',
  'yMax',
  'yStep',
  'zMin',
  'zMax',
  'zStep'
];


/**
 * Default values for option settings.
 *
 * These are the values used when a Graph3d instance is initialized
 * without custom settings.
 *
 * If a field is not in this list, a default value of 'undefined' can
 * be assumed. Of course, it does no harm to set a field explicitly to
 * 'undefined' here.
 *
 * A value of 'undefined' here normally means:
 *
 *     'derive from current data and graph style'
 *
 * In the code, this is indicated by the comment 'auto by default'.
 */
var DEFAULTS = {
  width            : '400px',
  height           : '400px',
  filterLabel      : 'time',
  legendLabel      : 'value',
  xLabel           : 'x',
  yLabel           : 'y',
  zLabel           : 'z',
  xValueLabel      : function(v) { return v; },
  yValueLabel      : function(v) { return v; },
  zValueLabel      : function(v) { return v; },
  showGrid         : true,
  showPerspective  : true,
  showShadow       : false,
  keepAspectRatio  : true,
  verticalRatio    : 0.5,           // 0.1 to 1.0, where 1.0 results in a 'cube'

  showAnimationControls: undefined, // auto by default
  animationInterval    : 1000,      // milliseconds
  animationPreload     : false,
  animationAutoStart   : undefined, // auto by default

  axisColor        : '#4D4D4D',
  gridColor        : '#D3D3D3',
  xCenter          : '55%',
  yCenter          : '50%',

  // Following require special handling, therefore not mentioned in the OPTIONKEYS tables.

  style            : Graph3d.STYLE.DOT,
  tooltip          : false,
  showLegend       : undefined,     // auto by default (based on graph style)
  backgroundColor  : undefined,

  dataColor        : {
    fill       : '#7DC1FF',
    stroke     : '#3267D2',
    strokeWidth: 1                  // px
  },

  cameraPosition   : {
     horizontal: 1.0,
     vertical  : 0.5,
     distance  : 1.7
  },

  // Following stored internally with field prefix 'default'
	// All these are 'auto by default'

  xBarWidth : undefined,
  yBarWidth : undefined,
  valueMin  : undefined,
  valueMax  : undefined,
  xMin      : undefined,
  xMax      : undefined,
  xStep     : undefined,
  yMin      : undefined,
  yMax      : undefined,
  yStep     : undefined,
  zMin      : undefined,
  zMax      : undefined,
  zStep     : undefined
};


/**
 * Make first letter of parameter upper case.
 *
 * Source: http://stackoverflow.com/a/1026087
 */
function capitalize(str) {
  if (str === undefined || str === "") {
    return str;
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}


/**
 * Add a prefix to a field name, taking style guide into account
 */
function prefixFieldName(prefix, fieldName) {
  if (prefix === undefined || prefix === "") {
    return fieldName;
  }

  return prefix + capitalize(fieldName);
}


/**
 * Forcibly copy fields from src to dst in a controlled manner.
 *
 * A given field in dst will always be overwitten. If this field
 * is undefined or not present in src, the field in dst will 
 * be explicitly set to undefined.
 * 
 * The intention here is to be able to reset all option fields.
 * 
 * Only the fields mentioned in array 'fields' will be handled.
 *
 * @param fields array with names of fields to copy
 * @param prefix optional; prefix to use for the target fields.
 */
function forceCopy(src, dst, fields, prefix) {
  var srcKey;
  var dstKey;

  for (var i in fields) {
    srcKey  = fields[i];
    dstKey  = prefixFieldName(prefix, srcKey);

    dst[dstKey] = src[srcKey];
  }
}


/**
 * Copy fields from src to dst in a safe and controlled manner.
 *
 * Only the fields mentioned in array 'fields' will be copied over,
 * and only if these are actually defined.
 *
 * @param fields array with names of fields to copy
 * @param prefix optional; prefix to use for the target fields.
 */
function safeCopy(src, dst, fields, prefix) {
  var srcKey;
  var dstKey;

  for (var i in fields) {
    srcKey  = fields[i];
    if (src[srcKey] === undefined) continue;

    dstKey  = prefixFieldName(prefix, srcKey);

    dst[dstKey] = src[srcKey];
  }
}



// -----------------------------------------------------------------------------
// Class Graph3d
// -----------------------------------------------------------------------------


/**
 * @constructor Graph3d
 * Graph3d displays data in 3d.
 *
 * Graph3d is developed in javascript as a Google Visualization Chart.
 *
 * @param {Element} container   The DOM element in which the Graph3d will
 *                              be created. Normally a div element.
 * @param {DataSet | DataView | Array} [data]
 * @param {Object} [options]
 */
function Graph3d(container, data, options) {
  if (!(this instanceof Graph3d)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  // create variables and set default values
  this.containerElement = container;

  this.dataTable = null;  // The original data table
  this.dataPoints = null; // The table with point objects

  // create a frame and canvas
  this.create();

  //
  // Set Defaults 
  //

  // Handle the defaults which can be simply copied over
  forceCopy(DEFAULTS, this, OPTIONKEYS);
  forceCopy(DEFAULTS, this, PREFIXEDOPTIONKEYS, 'default');

  // Following are internal fields, not part of the user settings
  this.margin = 10;                  // px
  this.showGrayBottom = false;       // TODO: this does not work correctly
  this.showTooltip = false;
  this.dotSizeRatio = 0.02;          // size of the dots as a fraction of the graph width
  this.eye = new Point3d(0, 0, -1);  // TODO: set eye.z about 3/4 of the width of the window?

  // Handle the more complex ('special') fields
  this._setSpecialSettings(DEFAULTS, this);

  //
  // End Set Defaults
  //

  // the column indexes
  this.colX = undefined;
  this.colY = undefined;
  this.colZ = undefined;
  this.colValue = undefined;
  this.colFilter = undefined;

  // TODO: customize axis range

  // apply options (also when undefined)
  this.setOptions(options);

  // apply data
  if (data) {
    this.setData(data);
  }
}

// Extend Graph3d with an Emitter mixin
Emitter(Graph3d.prototype);

/**
 * Calculate the scaling values, dependent on the range in x, y, and z direction
 */
Graph3d.prototype._setScale = function() {
  this.scale = new Point3d(1 / (this.xMax - this.xMin),
    1 / (this.yMax - this.yMin),
    1 / (this.zMax - this.zMin));

  // keep aspect ration between x and y scale if desired
  if (this.keepAspectRatio) {
    if (this.scale.x < this.scale.y) {
      //noinspection JSSuspiciousNameCombination
      this.scale.y = this.scale.x;
    }
    else {
      //noinspection JSSuspiciousNameCombination
      this.scale.x = this.scale.y;
    }
  }

  // scale the vertical axis
  this.scale.z *= this.verticalRatio;
  // TODO: can this be automated? verticalRatio?

  // determine scale for (optional) value
  this.scale.value = 1 / (this.valueMax - this.valueMin);

  // position the camera arm
  var xCenter = (this.xMax + this.xMin) / 2 * this.scale.x;
  var yCenter = (this.yMax + this.yMin) / 2 * this.scale.y;
  var zCenter = (this.zMax + this.zMin) / 2 * this.scale.z;
  this.camera.setArmLocation(xCenter, yCenter, zCenter);
};


/**
 * Convert a 3D location to a 2D location on screen
 * http://en.wikipedia.org/wiki/3D_projection
 * @param {Point3d} point3d   A 3D point with parameters x, y, z
 * @return {Point2d} point2d  A 2D point with parameters x, y
 */
Graph3d.prototype._convert3Dto2D = function(point3d) {
  var translation = this._convertPointToTranslation(point3d);
  return this._convertTranslationToScreen(translation);
};

/**
 * Convert a 3D location its translation seen from the camera
 * http://en.wikipedia.org/wiki/3D_projection
 * @param {Point3d} point3d    A 3D point with parameters x, y, z
 * @return {Point3d} translation A 3D point with parameters x, y, z This is
 *                   the translation of the point, seen from the
 *                   camera
 */
Graph3d.prototype._convertPointToTranslation = function(point3d) {
  var ax = point3d.x * this.scale.x,
    ay = point3d.y * this.scale.y,
    az = point3d.z * this.scale.z,

    cx = this.camera.getCameraLocation().x,
    cy = this.camera.getCameraLocation().y,
    cz = this.camera.getCameraLocation().z,

  // calculate angles
    sinTx = Math.sin(this.camera.getCameraRotation().x),
    cosTx = Math.cos(this.camera.getCameraRotation().x),
    sinTy = Math.sin(this.camera.getCameraRotation().y),
    cosTy = Math.cos(this.camera.getCameraRotation().y),
    sinTz = Math.sin(this.camera.getCameraRotation().z),
    cosTz = Math.cos(this.camera.getCameraRotation().z),

  // calculate translation
    dx = cosTy * (sinTz * (ay - cy) + cosTz * (ax - cx)) - sinTy * (az - cz),
    dy = sinTx * (cosTy * (az - cz) + sinTy * (sinTz * (ay - cy) + cosTz * (ax - cx))) + cosTx * (cosTz * (ay - cy) - sinTz * (ax-cx)),
    dz = cosTx * (cosTy * (az - cz) + sinTy * (sinTz * (ay - cy) + cosTz * (ax - cx))) - sinTx * (cosTz * (ay - cy) - sinTz * (ax-cx));

  return new Point3d(dx, dy, dz);
};

/**
 * Convert a translation point to a point on the screen
 * @param {Point3d} translation   A 3D point with parameters x, y, z This is
 *                    the translation of the point, seen from the
 *                    camera
 * @return {Point2d} point2d    A 2D point with parameters x, y
 */
Graph3d.prototype._convertTranslationToScreen = function(translation) {
  var ex = this.eye.x,
    ey = this.eye.y,
    ez = this.eye.z,
    dx = translation.x,
    dy = translation.y,
    dz = translation.z;

  // calculate position on screen from translation
  var bx;
  var by;
  if (this.showPerspective) {
    bx = (dx - ex) * (ez / dz);
    by = (dy - ey) * (ez / dz);
  }
  else {
    bx = dx * -(ez / this.camera.getArmLength());
    by = dy * -(ez / this.camera.getArmLength());
  }

  // shift and scale the point to the center of the screen
  // use the width of the graph to scale both horizontally and vertically.
  return new Point2d(
    this.currentXCenter + bx * this.frame.canvas.clientWidth,
    this.currentYCenter - by * this.frame.canvas.clientWidth);
};


/**
 * Calculate the translations and screen positions of all points
 */
Graph3d.prototype._calcTranslations = function(points, sort) {
  if (sort === undefined) {
    sort = true;
  }

  for (var i = 0; i < points.length; i++) {
    var point    = points[i];
    point.trans  = this._convertPointToTranslation(point.point);
    point.screen = this._convertTranslationToScreen(point.trans);

    // calculate the translation of the point at the bottom (needed for sorting)
    var transBottom = this._convertPointToTranslation(point.bottom);
    point.dist = this.showPerspective ? transBottom.length() : -transBottom.z;
  }

  if (!sort) {
    return;
  }

  // sort the points on depth of their (x,y) position (not on z)
  var sortDepth = function (a, b) {
    return b.dist - a.dist;
  };
  points.sort(sortDepth);
};


// -----------------------------------------------------------------------------
//  Methods for handling settings
// -----------------------------------------------------------------------------


/**
 * Special handling for certain parameters
 *
 * 'Special' here means: setting requires more than a simple copy
 */
Graph3d.prototype._setSpecialSettings = function(src, dst) {
  if (src.backgroundColor !== undefined) {
    this._setBackgroundColor(src.backgroundColor, dst);
  }

  this._setDataColor(src.dataColor, dst);
  this._setStyle(src.style, dst);
  this._setShowLegend(src.showLegend, dst);
  this._setCameraPosition(src.cameraPosition, dst);

  // As special fields go, this is an easy one; just a translation of the name.
  // Can't use this.tooltip directly, because that field exists internally
  if (src.tooltip !== undefined) {
    dst.showTooltip = src.tooltip;
  }
};


/**
 * Set the value of setting 'showLegend'
 *
 * This depends on the value of the style fields, so it must be called
 * after the style field has been initialized.
 */
Graph3d.prototype._setShowLegend = function(showLegend, dst) {
  if (showLegend === undefined) {
    // If the default was auto, make a choice for this field
    var isAutoByDefault = (DEFAULTS.showLegend === undefined);

    if (isAutoByDefault) {
      // these styles default to having legends
      var isLegendGraphStyle = this.style === Graph3d.STYLE.DOTCOLOR
                            || this.style === Graph3d.STYLE.DOTSIZE;

      this.showLegend = isLegendGraphStyle;
    } else {
       // Leave current value as is
    }
  } else {
    dst.showLegend = showLegend;
  }
};


Graph3d.prototype._setStyle = function(style, dst) {
  if (style === undefined) {
    return;   // Nothing to do
  }

  var styleNumber;

  if (typeof style === 'string') {
    styleNumber = this._getStyleNumber(style);

    if (styleNumber === -1 ) {
      throw new Error('Style \'' + style + '\' is invalid');
    }
  } else {
    // Do a pedantic check on style number value
    var valid = false;
    for (var n in Graph3d.STYLE) {
      if (Graph3d.STYLE[n] === style) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      throw new Error('Style \'' + style + '\' is invalid');
    }

    styleNumber = style;
  }

  dst.style = styleNumber;
};



/**
 * Set the background styling for the graph
 * @param {string | {fill: string, stroke: string, strokeWidth: string}} backgroundColor
 */
Graph3d.prototype._setBackgroundColor = function(backgroundColor, dst) {
  var fill = 'white';
  var stroke = 'gray';
  var strokeWidth = 1;

  if (typeof(backgroundColor) === 'string') {
    fill = backgroundColor;
    stroke = 'none';
    strokeWidth = 0;
  }
  else if (typeof(backgroundColor) === 'object') {
    if (backgroundColor.fill !== undefined)    fill = backgroundColor.fill;
    if (backgroundColor.stroke !== undefined)    stroke = backgroundColor.stroke;
    if (backgroundColor.strokeWidth !== undefined) strokeWidth = backgroundColor.strokeWidth;
  }
  else {
    throw new Error('Unsupported type of backgroundColor');
  }

  dst.frame.style.backgroundColor = fill;
  dst.frame.style.borderColor = stroke;
  dst.frame.style.borderWidth = strokeWidth + 'px';
  dst.frame.style.borderStyle = 'solid';
};


Graph3d.prototype._setDataColor = function(dataColor, dst) {
  if (dataColor === undefined) {
    return;    // Nothing to do
  }

  if (dst.dataColor === undefined) {
    dst.dataColor = {};
  }

  if (typeof dataColor === 'string') {
    dst.dataColor.fill   = dataColor;
    dst.dataColor.stroke = dataColor;
  }
  else {
    if (dataColor.fill) {
      dst.dataColor.fill = dataColor.fill;
    }
    if (dataColor.stroke) {
      dst.dataColor.stroke = dataColor.stroke;
    }
    if (dataColor.strokeWidth !== undefined) {
      dst.dataColor.strokeWidth = dataColor.strokeWidth;
    }
  }
};


Graph3d.prototype._setCameraPosition = function(cameraPosition, dst) {
  var camPos = cameraPosition;
  if (camPos === undefined) {
    return;
  }

  if (dst.camera === undefined) {
    dst.camera = new Camera();
  }

  dst.camera.setArmRotation(camPos.horizontal, camPos.vertical);
  dst.camera.setArmLength(camPos.distance);
};


//
// Public methods for specific settings
//

/**
 * Set the rotation and distance of the camera
 * @param {Object} pos   An object with the camera position. The object
 *             contains three parameters:
 *             - horizontal {Number}
 *             The horizontal rotation, between 0 and 2*PI.
 *             Optional, can be left undefined.
 *             - vertical {Number}
 *             The vertical rotation, between 0 and 0.5*PI
 *             if vertical=0.5*PI, the graph is shown from the
 *             top. Optional, can be left undefined.
 *             - distance {Number}
 *             The (normalized) distance of the camera to the
 *             center of the graph, a value between 0.71 and 5.0.
 *             Optional, can be left undefined.
 */
Graph3d.prototype.setCameraPosition = function(pos) {
  this._setCameraPosition(pos, this);
  this.redraw();
};


// -----------------------------------------------------------------------------
//  End methods for handling settings
// -----------------------------------------------------------------------------




/**
 * Retrieve the style index from given styleName
 * @param {string} styleName  Style name such as 'dot', 'grid', 'dot-line'
 * @return {Number} styleNumber Enumeration value representing the style, or -1
 *                when not found
 */
Graph3d.prototype._getStyleNumber = function(styleName) {
  switch (styleName) {
    case 'dot':     return Graph3d.STYLE.DOT;
    case 'dot-line':  return Graph3d.STYLE.DOTLINE;
    case 'dot-color':   return Graph3d.STYLE.DOTCOLOR;
    case 'dot-size':  return Graph3d.STYLE.DOTSIZE;
    case 'line':    return Graph3d.STYLE.LINE;
    case 'grid':    return Graph3d.STYLE.GRID;
    case 'surface':   return Graph3d.STYLE.SURFACE;
    case 'bar':     return Graph3d.STYLE.BAR;
    case 'bar-color':   return Graph3d.STYLE.BARCOLOR;
    case 'bar-size':  return Graph3d.STYLE.BARSIZE;
  }

  return -1;
};

/**
 * Determine the indexes of the data columns, based on the given style and data
 * @param {DataSet} data
 * @param {Number}  style
 */
Graph3d.prototype._determineColumnIndexes = function(data, style) {
  if (this.style === Graph3d.STYLE.DOT ||
    this.style === Graph3d.STYLE.DOTLINE ||
    this.style === Graph3d.STYLE.LINE ||
    this.style === Graph3d.STYLE.GRID ||
    this.style === Graph3d.STYLE.SURFACE ||
    this.style === Graph3d.STYLE.BAR) {
    // 3 columns expected, and optionally a 4th with filter values
    this.colX = 0;
    this.colY = 1;
    this.colZ = 2;
    this.colValue = undefined;

    if (data.getNumberOfColumns() > 3) {
      this.colFilter = 3;
    }
  }
  else if (this.style === Graph3d.STYLE.DOTCOLOR ||
    this.style === Graph3d.STYLE.DOTSIZE ||
    this.style === Graph3d.STYLE.BARCOLOR ||
    this.style === Graph3d.STYLE.BARSIZE) {
    // 4 columns expected, and optionally a 5th with filter values
    this.colX = 0;
    this.colY = 1;
    this.colZ = 2;
    this.colValue = 3;

    if (data.getNumberOfColumns() > 4) {
      this.colFilter = 4;
    }
  }
  else {
    throw new Error('Unknown style "' + this.style + '"');
  }
};

Graph3d.prototype.getNumberOfRows = function(data) {
  return data.length;
}


Graph3d.prototype.getNumberOfColumns = function(data) {
  var counter = 0;
  for (var column in data[0]) {
    if (data[0].hasOwnProperty(column)) {
      counter++;
    }
  }
  return counter;
}


Graph3d.prototype.getDistinctValues = function(data, column) {
  var distinctValues = [];
  for (var i = 0; i < data.length; i++) {
    if (distinctValues.indexOf(data[i][column]) == -1) {
      distinctValues.push(data[i][column]);
    }
  }
  return distinctValues;
}


Graph3d.prototype.getColumnRange = function(data,column) {
  var minMax = {min:data[0][column],max:data[0][column]};
  for (var i = 0; i < data.length; i++) {
    if (minMax.min > data[i][column]) { minMax.min = data[i][column]; }
    if (minMax.max < data[i][column]) { minMax.max = data[i][column]; }
  }
  return minMax;
};

/**
 * Initialize the data from the data table. Calculate minimum and maximum values
 * and column index values
 * @param {Array | DataSet | DataView} rawData   The data containing the items for the Graph.
 * @param {Number}     style   Style Number
 */
Graph3d.prototype._dataInitialize = function (rawData, style) {
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

  // _determineColumnIndexes
  // getNumberOfRows (points)
  // getNumberOfColumns (x,y,z,v,t,t1,t2...)
  // getDistinctValues (unique values?)
  // getColumnRange

  // determine the location of x,y,z,value,filter columns
  this.colX = 'x';
  this.colY = 'y';
  this.colZ = 'z';

  // check if a filter column is provided
  if (data[0].hasOwnProperty('filter')) {
    this.colFilter = 'filter';  // Bugfix: only set this field if it's actually present!

    if (this.dataFilter === undefined) {
      this.dataFilter = new Filter(rawData, this.colFilter, this);
      this.dataFilter.setOnLoadCallback(function() {me.redraw();});
    }
  }


  var withBars = this.style == Graph3d.STYLE.BAR ||
    this.style == Graph3d.STYLE.BARCOLOR ||
    this.style == Graph3d.STYLE.BARSIZE;

  // determine barWidth from data
  if (withBars) {
    if (this.defaultXBarWidth !== undefined) {
      this.xBarWidth = this.defaultXBarWidth;
    }
    else {
      var dataX = this.getDistinctValues(data,this.colX);
      this.xBarWidth = (dataX[1] - dataX[0]) || 1;
    }

    if (this.defaultYBarWidth !== undefined) {
      this.yBarWidth = this.defaultYBarWidth;
    }
    else {
      var dataY = this.getDistinctValues(data,this.colY);
      this.yBarWidth = (dataY[1] - dataY[0]) || 1;
    }
  }

  // calculate minimums and maximums
  var xRange = this.getColumnRange(data,this.colX);
  if (withBars) {
    xRange.min -= this.xBarWidth / 2;
    xRange.max += this.xBarWidth / 2;
  }
  this.xMin = (this.defaultXMin !== undefined) ? this.defaultXMin : xRange.min;
  this.xMax = (this.defaultXMax !== undefined) ? this.defaultXMax : xRange.max;
  if (this.xMax <= this.xMin) this.xMax = this.xMin + 1;
  this.xStep = (this.defaultXStep !== undefined) ? this.defaultXStep : (this.xMax-this.xMin)/5;

  var yRange = this.getColumnRange(data,this.colY);
  if (withBars) {
    yRange.min -= this.yBarWidth / 2;
    yRange.max += this.yBarWidth / 2;
  }
  this.yMin = (this.defaultYMin !== undefined) ? this.defaultYMin : yRange.min;
  this.yMax = (this.defaultYMax !== undefined) ? this.defaultYMax : yRange.max;
  if (this.yMax <= this.yMin) this.yMax = this.yMin + 1;
  this.yStep = (this.defaultYStep !== undefined) ? this.defaultYStep : (this.yMax-this.yMin)/5;

  var zRange = this.getColumnRange(data,this.colZ);
  this.zMin = (this.defaultZMin !== undefined) ? this.defaultZMin : zRange.min;
  this.zMax = (this.defaultZMax !== undefined) ? this.defaultZMax : zRange.max;
  if (this.zMax <= this.zMin) this.zMax = this.zMin + 1;
  this.zStep = (this.defaultZStep !== undefined) ? this.defaultZStep : (this.zMax-this.zMin)/5;

  // Bugfix: Only handle field 'style' if it's actually present
  if (data[0].hasOwnProperty('style')) {
    this.colValue = 'style';
    var valueRange = this.getColumnRange(data,this.colValue);
    this.valueMin = (this.defaultValueMin !== undefined) ? this.defaultValueMin : valueRange.min;
    this.valueMax = (this.defaultValueMax !== undefined) ? this.defaultValueMax : valueRange.max;
    if (this.valueMax <= this.valueMin) this.valueMax = this.valueMin + 1;
  }
  
  // set the scale dependent on the ranges.
  this._setScale();
};



/**
 * Filter the data based on the current filter
 * @param {Array} data
 * @return {Array} dataPoints   Array with point objects which can be drawn on screen
 */
Graph3d.prototype._getDataPoints = function (data) {
  // TODO: store the created matrix dataPoints in the filters instead of reloading each time
  var x, y, i, z, obj, point;

  var dataPoints = [];

  if (this.style === Graph3d.STYLE.GRID ||
    this.style === Graph3d.STYLE.SURFACE) {
    // copy all values from the google data table to a matrix
    // the provided values are supposed to form a grid of (x,y) positions

    // create two lists with all present x and y values
    var dataX = [];
    var dataY = [];
    for (i = 0; i < this.getNumberOfRows(data); i++) {
      x = data[i][this.colX] || 0;
      y = data[i][this.colY] || 0;

      if (dataX.indexOf(x) === -1) {
        dataX.push(x);
      }
      if (dataY.indexOf(y) === -1) {
        dataY.push(y);
      }
    }

    var sortNumber = function (a, b) {
      return a - b;
    };
    dataX.sort(sortNumber);
    dataY.sort(sortNumber);

    // create a grid, a 2d matrix, with all values.
    var dataMatrix = [];   // temporary data matrix
    for (i = 0; i < data.length; i++) {
      x = data[i][this.colX] || 0;
      y = data[i][this.colY] || 0;
      z = data[i][this.colZ] || 0;

      var xIndex = dataX.indexOf(x);  // TODO: implement Array().indexOf() for Internet Explorer
      var yIndex = dataY.indexOf(y);

      if (dataMatrix[xIndex] === undefined) {
        dataMatrix[xIndex] = [];
      }

      var point3d = new Point3d();
      point3d.x = x;
      point3d.y = y;
      point3d.z = z;
      point3d.data = data[i];

      obj = {};
      obj.point = point3d;
      obj.trans = undefined;
      obj.screen = undefined;
      obj.bottom = new Point3d(x, y, this.zMin);

      dataMatrix[xIndex][yIndex] = obj;

      dataPoints.push(obj);
    }

    // fill in the pointers to the neighbors.
    for (x = 0; x < dataMatrix.length; x++) {
      for (y = 0; y < dataMatrix[x].length; y++) {
        if (dataMatrix[x][y]) {
          dataMatrix[x][y].pointRight = (x < dataMatrix.length-1) ? dataMatrix[x+1][y] : undefined;
          dataMatrix[x][y].pointTop   = (y < dataMatrix[x].length-1) ? dataMatrix[x][y+1] : undefined;
          dataMatrix[x][y].pointCross =
            (x < dataMatrix.length-1 && y < dataMatrix[x].length-1) ?
              dataMatrix[x+1][y+1] :
              undefined;
        }
      }
    }
  }
  else {  // 'dot', 'dot-line', etc.

    // Bugfix: ensure value field is present in data if expected
    var hasValueField = this.style === Graph3d.STYLE.BARCOLOR
                     || this.style === Graph3d.STYLE.BARSIZE
                     || this.style === Graph3d.STYLE.DOTCOLOR
                     || this.style === Graph3d.STYLE.DOTSIZE;

    if (hasValueField) {
      if (this.colValue === undefined) {
        throw new Error('Expected data to have '
          + ' field \'style\' '
          + ' for graph style \'' + this.style + '\''
        );
      }

      if (data[0][this.colValue] === undefined) {
        throw new Error('Expected data to have '
          + ' field \'' + this.colValue + '\' '
          + ' for graph style \'' + this.style + '\''
        );
      }
    }
    

    // copy all values from the google data table to a list with Point3d objects
    for (i = 0; i < data.length; i++) {
      point = new Point3d();
      point.x = data[i][this.colX] || 0;
      point.y = data[i][this.colY] || 0;
      point.z = data[i][this.colZ] || 0;
      point.data = data[i];

      if (this.colValue !== undefined) {
        point.value = data[i][this.colValue] || 0;
      }

      obj = {};
      obj.point = point;
      obj.bottom = new Point3d(point.x, point.y, this.zMin);
      obj.trans = undefined;
      obj.screen = undefined;

      dataPoints.push(obj);
    }
  }

  return dataPoints;
};

/**
 * Create the main frame for the Graph3d.
 * This function is executed once when a Graph3d object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 */
Graph3d.prototype.create = function () {
  // remove all elements from the container element.
  while (this.containerElement.hasChildNodes()) {
    this.containerElement.removeChild(this.containerElement.firstChild);
  }

  this.frame = document.createElement('div');
  this.frame.style.position = 'relative';
  this.frame.style.overflow = 'hidden';

  // create the graph canvas (HTML canvas element)
  this.frame.canvas = document.createElement( 'canvas' );
  this.frame.canvas.style.position = 'relative';
  this.frame.appendChild(this.frame.canvas);
  //if (!this.frame.canvas.getContext) {
  {
    var noCanvas = document.createElement( 'DIV' );
    noCanvas.style.color = 'red';
    noCanvas.style.fontWeight =  'bold' ;
    noCanvas.style.padding =  '10px';
    noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
    this.frame.canvas.appendChild(noCanvas);
  }

  this.frame.filter = document.createElement( 'div' );
  this.frame.filter.style.position = 'absolute';
  this.frame.filter.style.bottom = '0px';
  this.frame.filter.style.left = '0px';
  this.frame.filter.style.width = '100%';
  this.frame.appendChild(this.frame.filter);

  // add event listeners to handle moving and zooming the contents
  var me = this;
  var onmousedown = function (event) {me._onMouseDown(event);};
  var ontouchstart = function (event) {me._onTouchStart(event);};
  var onmousewheel = function (event) {me._onWheel(event);};
  var ontooltip = function (event) {me._onTooltip(event);};
  // TODO: these events are never cleaned up... can give a 'memory leakage'

  util.addEventListener(this.frame.canvas, 'keydown', onkeydown);
  util.addEventListener(this.frame.canvas, 'mousedown', onmousedown);
  util.addEventListener(this.frame.canvas, 'touchstart', ontouchstart);
  util.addEventListener(this.frame.canvas, 'mousewheel', onmousewheel);
  util.addEventListener(this.frame.canvas, 'mousemove', ontooltip);

  // add the new graph to the container element
  this.containerElement.appendChild(this.frame);
};


/**
 * Set a new size for the graph
 * @param {string} width   Width in pixels or percentage (for example '800px'
 *             or '50%')
 * @param {string} height  Height in pixels or percentage  (for example '400px'
 *             or '30%')
 */
Graph3d.prototype.setSize = function(width, height) {
  this.frame.style.width = width;
  this.frame.style.height = height;

  this._resizeCanvas();
};

/**
 * Resize the canvas to the current size of the frame
 */
Graph3d.prototype._resizeCanvas = function() {
  this.frame.canvas.style.width = '100%';
  this.frame.canvas.style.height = '100%';

  this.frame.canvas.width = this.frame.canvas.clientWidth;
  this.frame.canvas.height = this.frame.canvas.clientHeight;

  // adjust with for margin
  this.frame.filter.style.width = (this.frame.canvas.clientWidth - 2 * 10) + 'px';
};

/**
 * Start animation
 */
Graph3d.prototype.animationStart = function() {
  if (!this.frame.filter || !this.frame.filter.slider)
    throw new Error('No animation available');

  this.frame.filter.slider.play();
};


/**
 * Stop animation
 */
Graph3d.prototype.animationStop = function() {
  if (!this.frame.filter || !this.frame.filter.slider) return;

  this.frame.filter.slider.stop();
};


/**
 * Resize the center position based on the current values in this.xCenter
 * and this.yCenter (which are strings with a percentage or a value
 * in pixels). The center positions are the variables this.currentXCenter
 * and this.currentYCenter
 */
Graph3d.prototype._resizeCenter = function() {
  // calculate the horizontal center position
  if (this.xCenter.charAt(this.xCenter.length-1) === '%') {
    this.currentXCenter =
      parseFloat(this.xCenter) / 100 *
        this.frame.canvas.clientWidth;
  }
  else {
    this.currentXCenter = parseFloat(this.xCenter); // supposed to be in px
  }

  // calculate the vertical center position
  if (this.yCenter.charAt(this.yCenter.length-1) === '%') {
    this.currentYCenter =
      parseFloat(this.yCenter) / 100 *
        (this.frame.canvas.clientHeight - this.frame.filter.clientHeight);
  }
  else {
    this.currentYCenter = parseFloat(this.yCenter); // supposed to be in px
  }
};



/**
 * Retrieve the current camera rotation
 * @return {object}   An object with parameters horizontal, vertical, and
 *          distance
 */
Graph3d.prototype.getCameraPosition = function() {
  var pos = this.camera.getArmRotation();
  pos.distance = this.camera.getArmLength();
  return pos;
};

/**
 * Load data into the 3D Graph
 */
Graph3d.prototype._readData = function(data) {
  // read the data
  this._dataInitialize(data, this.style);


  if (this.dataFilter) {
    // apply filtering
    this.dataPoints = this.dataFilter._getDataPoints();
  }
  else {
    // no filtering. load all data
    this.dataPoints = this._getDataPoints(this.dataTable);
  }

  // draw the filter
  this._redrawFilter();
};

/**
 * Replace the dataset of the Graph3d
 * @param {Array | DataSet | DataView} data
 */
Graph3d.prototype.setData = function (data) {
  this._readData(data);
  this.redraw();

  // start animation when option is true
  if (this.animationAutoStart && this.dataFilter) {
    this.animationStart();
  }
};

/**
 * Update the options. Options will be merged with current options
 * @param {Object} options
 */
Graph3d.prototype.setOptions = function (options) {
  var cameraPosition = undefined;

  this.animationStop();

  if (options !== undefined) {
    // retrieve parameter values

    // Handle the parameters which can be simply copied over
    safeCopy(options, this, OPTIONKEYS);
    safeCopy(options, this, PREFIXEDOPTIONKEYS, 'default');

    // Handle the more complex ('special') fields
    this._setSpecialSettings(options, this);
  }

  this.setSize(this.width, this.height);

  // re-load the data
  if (this.dataTable) {
    this.setData(this.dataTable);
  }

  // start animation when option is true
  if (this.animationAutoStart && this.dataFilter) {
    this.animationStart();
  }
};

/**
 * Redraw the Graph.
 */
Graph3d.prototype.redraw = function() {
  if (this.dataPoints === undefined) {
    throw new Error('Graph data not initialized');
  }

  this._resizeCanvas();
  this._resizeCenter();
  this._redrawSlider();
  this._redrawClear();
  this._redrawAxis();

  if (this.style === Graph3d.STYLE.GRID ||
    this.style === Graph3d.STYLE.SURFACE) {
    this._redrawDataGrid();
  }
  else if (this.style === Graph3d.STYLE.LINE) {
    this._redrawDataLine();
  }
  else if (this.style === Graph3d.STYLE.BAR ||
    this.style === Graph3d.STYLE.BARCOLOR ||
    this.style === Graph3d.STYLE.BARSIZE) {
    this._redrawDataBar();
  }
  else {
    // style is DOT, DOTLINE, DOTCOLOR, DOTSIZE
    this._redrawDataDot();
  }

  this._redrawInfo();
  this._redrawLegend();
};


/**
 * Get drawing context without exposing canvas
 */
Graph3d.prototype._getContext = function() {
  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');
  return ctx;
};


/**
 * Clear the canvas before redrawing
 */
Graph3d.prototype._redrawClear = function() {
  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
};


/**
 * Get legend width 
 */
Graph3d.prototype._getLegendWidth = function() {
  var width; 
  if (this.style === Graph3d.STYLE.DOTSIZE) {
    var dotSize = this.frame.clientWidth * this.dotSizeRatio;
    width =  dotSize / 2 + dotSize * 2; 
  } else if (this.style === Graph3d.STYLE.BARSIZE) {
    width = this.xBarWidth ;
  } else {
    width = 20; 
  }
  return width;
}


/**
 * Redraw the legend based on size, dot color, or surface height 
 */
Graph3d.prototype._redrawLegend = function() {
 
  //Return without drawing anything, if no legend is specified 
  if (this.showLegend !== true) {return;}     

  // Do not draw legend when graph style does not support
  if (this.style === Graph3d.STYLE.LINE
   || this.style === Graph3d.STYLE.BARSIZE //TODO add legend support for BARSIZE 
  ){return;} 

  // Legend types - size and color. Determine if size legend.  
  var isSizeLegend = (this.style === Graph3d.STYLE.BARSIZE 
                   || this.style === Graph3d.STYLE.DOTSIZE) ;

  // Legend is either tracking z values or style values. This flag if false means use z values. 
  var isValueLegend = (this.style === Graph3d.STYLE.DOTSIZE 
                  || this.style === Graph3d.STYLE.DOTCOLOR 
                  || this.style === Graph3d.STYLE.BARCOLOR);

  var height = Math.max(this.frame.clientHeight * 0.25, 100);
  var top    = this.margin;
  var width  = this._getLegendWidth() ; // px - overwritten by size legend  
  var right  = this.frame.clientWidth - this.margin;
  var left   = right - width;
  var bottom = top + height;

  var ctx = this._getContext();
  ctx.lineWidth = 1;
  ctx.font = '14px arial'; // TODO: put in options

  if (isSizeLegend === false) {
    // draw the color bar
    var ymin = 0;
    var ymax = height; // Todo: make height customizable
    var y;

    for (y = ymin; y < ymax; y++) {
      var f = (y - ymin) / (ymax - ymin);
      var hue = f * 240;
      var color = this._hsv2rgb(hue, 1, 1);

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(left, top + y);
      ctx.lineTo(right, top + y);
      ctx.stroke();
    }
    ctx.strokeStyle =  this.axisColor;
    ctx.strokeRect(left, top, width, height);

  } else {
    
    // draw the size legend box 
    var  widthMin;
    if (this.style === Graph3d.STYLE.DOTSIZE) { 
      var  dotSize = this.frame.clientWidth * this.dotSizeRatio;
      widthMin = dotSize / 2; // px
    } else if (this.style === Graph3d.STYLE.BARSIZE) { 
      //widthMin = this.xBarWidth * 0.2 this is wrong - barwidth measures in terms of xvalues 
    }
    ctx.strokeStyle =  this.axisColor;
    ctx.fillStyle =  this.dataColor.fill;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right - width + widthMin, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // print value text along the legend edge 
  var gridLineLen = 5; // px
 
  var legendMin = isValueLegend ? this.valueMin :  this.zMin; 
  var legendMax = isValueLegend ? this.valueMax :  this.zMax;
  var step = new StepNumber(legendMin, legendMax, (legendMax-legendMin)/5, true);
  step.start(true);

  var y;
  while (!step.end()) {
    y = bottom - (step.getCurrent() - legendMin) / (legendMax - legendMin) * height;

    ctx.beginPath();
    ctx.moveTo(left - gridLineLen, y);
    ctx.lineTo(left, y);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.axisColor;
    ctx.fillText(step.getCurrent(), left - 2 * gridLineLen, y);

    step.next();
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  var label = this.legendLabel;
  ctx.fillText(label, right, bottom + this.margin);
  
};

/**
 * Redraw the filter
 */
Graph3d.prototype._redrawFilter = function() {
  this.frame.filter.innerHTML = '';

  if (this.dataFilter) {
    var options = {
      'visible': this.showAnimationControls
    };
    var slider = new Slider(this.frame.filter, options);
    this.frame.filter.slider = slider;

    // TODO: css here is not nice here...
    this.frame.filter.style.padding = '10px';
    //this.frame.filter.style.backgroundColor = '#EFEFEF';

    slider.setValues(this.dataFilter.values);
    slider.setPlayInterval(this.animationInterval);

    // create an event handler
    var me = this;
    var onchange = function () {
      var index = slider.getIndex();

      me.dataFilter.selectValue(index);
      me.dataPoints = me.dataFilter._getDataPoints();

      me.redraw();
    };
    slider.setOnChangeCallback(onchange);
  }
  else {
    this.frame.filter.slider = undefined;
  }
};

/**
 * Redraw the slider
 */
Graph3d.prototype._redrawSlider = function() {
  if ( this.frame.filter.slider !== undefined) {
    this.frame.filter.slider.redraw();
  }
};


/**
 * Redraw common information
 */
Graph3d.prototype._redrawInfo = function() {
  if (this.dataFilter) {
    var ctx = this._getContext();

    ctx.font = '14px arial'; // TODO: put in options
    ctx.lineStyle = 'gray';
    ctx.fillStyle = 'gray';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    var x = this.margin;
    var y = this.margin;
    ctx.fillText(this.dataFilter.getLabel() + ': ' + this.dataFilter.getSelectedValue(), x, y);
  }
};


/**
 * Draw a line between 2d points 'from' and 'to'.
 *
 * If stroke style specified, set that as well.
 */
Graph3d.prototype._line = function(ctx, from, to, strokeStyle) {
  if (strokeStyle !== undefined) {
    ctx.strokeStyle = strokeStyle;
  }

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x  , to.y  );
  ctx.stroke();
}


Graph3d.prototype.drawAxisLabelX = function(ctx, point3d, text, armAngle, yMargin) {
  if (yMargin === undefined) {
    yMargin = 0;
  }

  var point2d = this._convert3Dto2D(point3d);

  if (Math.cos(armAngle * 2) > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    point2d.y += yMargin;
  }
  else if (Math.sin(armAngle * 2) < 0){
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
  }
  else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
  }

  ctx.fillStyle = this.axisColor;
  ctx.fillText(text, point2d.x, point2d.y);
}


Graph3d.prototype.drawAxisLabelY = function(ctx, point3d, text, armAngle, yMargin) {
  if (yMargin === undefined) {
    yMargin = 0;
  }

  var point2d = this._convert3Dto2D(point3d);

  if (Math.cos(armAngle * 2) < 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    point2d.y += yMargin;
  }
  else if (Math.sin(armAngle * 2) > 0){
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
  }
  else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
  }

  ctx.fillStyle = this.axisColor;
  ctx.fillText(text, point2d.x, point2d.y);
}


Graph3d.prototype.drawAxisLabelZ = function(ctx, point3d, text, offset) {
  if (offset === undefined) {
    offset = 0;
  }

  var point2d = this._convert3Dto2D(point3d);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = this.axisColor;
  ctx.fillText(text, point2d.x - offset, point2d.y);
};


/**


/**
 * Draw a line between 2d points 'from' and 'to'.
 *
 * If stroke style specified, set that as well.
 */
Graph3d.prototype._line3d = function(ctx, from, to, strokeStyle) {
  var from2d = this._convert3Dto2D(from);
  var to2d   = this._convert3Dto2D(to);

  this._line(ctx, from2d, to2d, strokeStyle);
}


/**
 * Redraw the axis
 */
Graph3d.prototype._redrawAxis = function() {
  var ctx = this._getContext(),
    from, to, step, prettyStep,
    text, xText, yText, zText,
    offset, xOffset, yOffset,
    xMin2d, xMax2d;

  // TODO: get the actual rendered style of the containerElement
  //ctx.font = this.containerElement.style.font;
  ctx.font = 24 / this.camera.getArmLength() + 'px arial';

  // calculate the length for the short grid lines
  var gridLenX   = 0.025 / this.scale.x;
  var gridLenY   = 0.025 / this.scale.y;
  var textMargin = 5 / this.camera.getArmLength(); // px
  var armAngle   = this.camera.getArmRotation().horizontal;
  var armVector  = new Point2d(Math.cos(armAngle), Math.sin(armAngle));

  // draw x-grid lines
  ctx.lineWidth = 1;
  prettyStep = (this.defaultXStep === undefined);
  step = new StepNumber(this.xMin, this.xMax, this.xStep, prettyStep);
  step.start(true);

  while (!step.end()) {
    var x = step.getCurrent();

    if (this.showGrid) {
      from = new Point3d(x, this.yMin, this.zMin);
      to   = new Point3d(x, this.yMax, this.zMin);
      this._line3d(ctx, from, to, this.gridColor);
    }
    else {
      from = new Point3d(x, this.yMin, this.zMin);
      to   = new Point3d(x, this.yMin+gridLenX, this.zMin);
      this._line3d(ctx, from, to, this.axisColor);

      from = new Point3d(x, this.yMax, this.zMin);
      to   = new Point3d(x, this.yMax-gridLenX, this.zMin);
      this._line3d(ctx, from, to, this.axisColor);
    }

    yText       = (armVector.x > 0) ? this.yMin : this.yMax;
    var point3d = new Point3d(x, yText, this.zMin);
    var msg     = '  ' + this.xValueLabel(x) + '  ';
    this.drawAxisLabelX(ctx, point3d, msg, armAngle, textMargin);

    step.next();
  }

  // draw y-grid lines
  ctx.lineWidth = 1;
  prettyStep = (this.defaultYStep === undefined);
  step = new StepNumber(this.yMin, this.yMax, this.yStep, prettyStep);
  step.start(true);

  while (!step.end()) {
    var y = step.getCurrent();

    if (this.showGrid) {
      from = new Point3d(this.xMin, y, this.zMin);
      to   = new Point3d(this.xMax, y, this.zMin);
      this._line3d(ctx, from, to, this.gridColor);
    }
    else {
      from = new Point3d(this.xMin, y, this.zMin);
      to   = new Point3d(this.xMin+gridLenY, y, this.zMin);
      this._line3d(ctx, from, to, this.axisColor);

      from = new Point3d(this.xMax, y, this.zMin);
      to   = new Point3d(this.xMax-gridLenY, y, this.zMin);
      this._line3d(ctx, from, to, this.axisColor);
    }

    xText   = (armVector.y > 0) ? this.xMin : this.xMax;
    point3d = new Point3d(xText, y, this.zMin);
    var msg = '  ' + this.yValueLabel(y) + '  ';    
    this.drawAxisLabelY(ctx, point3d, msg, armAngle, textMargin);

    step.next();
  }

  // draw z-grid lines and axis
  ctx.lineWidth = 1;
  prettyStep = (this.defaultZStep === undefined);
  step = new StepNumber(this.zMin, this.zMax, this.zStep, prettyStep);
  step.start(true);

  xText = (armVector.x > 0) ? this.xMin : this.xMax;
  yText = (armVector.y < 0) ? this.yMin : this.yMax;

  while (!step.end()) {
    var z = step.getCurrent();

    // TODO: make z-grid lines really 3d?
    var from3d = new Point3d(xText, yText, z);
    var from2d = this._convert3Dto2D(from3d);
    to = new Point2d(from2d.x - textMargin, from2d.y);
    this._line(ctx, from2d, to, this.axisColor);

    var msg = this.zValueLabel(z) + ' ';
    this.drawAxisLabelZ(ctx, from3d, msg, 5);

    step.next();
  }

  ctx.lineWidth = 1;
  from = new Point3d(xText, yText, this.zMin);
  to   = new Point3d(xText, yText, this.zMax);
  this._line3d(ctx, from, to, this.axisColor);

  // draw x-axis
  ctx.lineWidth = 1;
  // line at yMin
  xMin2d = new Point3d(this.xMin, this.yMin, this.zMin);
  xMax2d = new Point3d(this.xMax, this.yMin, this.zMin);
  this._line3d(ctx, xMin2d, xMax2d, this.axisColor);
  // line at ymax
  xMin2d = new Point3d(this.xMin, this.yMax, this.zMin);
  xMax2d = new Point3d(this.xMax, this.yMax, this.zMin);
  this._line3d(ctx, xMin2d, xMax2d, this.axisColor);

  // draw y-axis
  ctx.lineWidth = 1;
  // line at xMin
  from = new Point3d(this.xMin, this.yMin, this.zMin);
  to   = new Point3d(this.xMin, this.yMax, this.zMin);
  this._line3d(ctx, from, to, this.axisColor);
  // line at xMax
  from = new Point3d(this.xMax, this.yMin, this.zMin);
  to   = new Point3d(this.xMax, this.yMax, this.zMin);
  this._line3d(ctx, from, to, this.axisColor);

  // draw x-label
  var xLabel = this.xLabel;
  if (xLabel.length > 0) {
    yOffset = 0.1 / this.scale.y;
    xText   = (this.xMin + this.xMax) / 2;
    yText   = (armVector.x > 0) ? this.yMin - yOffset: this.yMax + yOffset;
    text    = new Point3d(xText, yText, this.zMin);
    this.drawAxisLabelX(ctx, text, xLabel, armAngle);
  }

  // draw y-label
  var yLabel = this.yLabel;
  if (yLabel.length > 0) {
    xOffset = 0.1 / this.scale.x;
    xText   = (armVector.y > 0) ? this.xMin - xOffset : this.xMax + xOffset;
    yText   = (this.yMin + this.yMax) / 2;
    text    = new Point3d(xText, yText, this.zMin);

    this.drawAxisLabelY(ctx, text, yLabel, armAngle);
  }

  // draw z-label
  var zLabel = this.zLabel;
  if (zLabel.length > 0) {
    offset = 30;  // pixels.  // TODO: relate to the max width of the values on the z axis?
    xText  = (armVector.x > 0) ? this.xMin : this.xMax;
    yText  = (armVector.y < 0) ? this.yMin : this.yMax;
    zText  = (this.zMin + this.zMax) / 2;
    text   = new Point3d(xText, yText, zText);

    this.drawAxisLabelZ(ctx, text, zLabel, offset);
  }
};

/**
 * Calculate the color based on the given value.
 * @param {Number} H   Hue, a value be between 0 and 360
 * @param {Number} S   Saturation, a value between 0 and 1
 * @param {Number} V   Value, a value between 0 and 1
 */
Graph3d.prototype._hsv2rgb = function(H, S, V) {
  var R, G, B, C, Hi, X;

  C = V * S;
  Hi = Math.floor(H/60);  // hi = 0,1,2,3,4,5
  X = C * (1 - Math.abs(((H/60) % 2) - 1));

  switch (Hi) {
    case 0: R = C; G = X; B = 0; break;
    case 1: R = X; G = C; B = 0; break;
    case 2: R = 0; G = C; B = X; break;
    case 3: R = 0; G = X; B = C; break;
    case 4: R = X; G = 0; B = C; break;
    case 5: R = C; G = 0; B = X; break;

    default: R = 0; G = 0; B = 0; break;
  }

  return 'RGB(' + parseInt(R*255) + ',' + parseInt(G*255) + ',' + parseInt(B*255) + ')';
};


/**
 * Draw all datapoints as a grid
 * This function can be used when the style is 'grid'
 */
Graph3d.prototype._redrawDataGrid = function() {
  var ctx = this._getContext(),
    point, right, top, cross,
    i,
    topSideVisible, fillStyle, strokeStyle, lineWidth,
    h, s, v, zAvg;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return; // TODO: throw exception?

  this._calcTranslations(this.dataPoints);

  if (this.style === Graph3d.STYLE.SURFACE) {
    for (i = 0; i < this.dataPoints.length; i++) {
      point = this.dataPoints[i];
      right = this.dataPoints[i].pointRight;
      top   = this.dataPoints[i].pointTop;
      cross = this.dataPoints[i].pointCross;

      if (point !== undefined && right !== undefined && top !== undefined && cross !== undefined) {

        if (this.showGrayBottom || this.showShadow) {
          // calculate the cross product of the two vectors from center
          // to left and right, in order to know whether we are looking at the
          // bottom or at the top side. We can also use the cross product
          // for calculating light intensity
          var aDiff = Point3d.subtract(cross.trans, point.trans);
          var bDiff = Point3d.subtract(top.trans, right.trans);
          var crossproduct = Point3d.crossProduct(aDiff, bDiff);
          var len = crossproduct.length();
          // FIXME: there is a bug with determining the surface side (shadow or colored)

          topSideVisible = (crossproduct.z > 0);
        }
        else {
          topSideVisible = true;
        }

        if (topSideVisible) {
          // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
          zAvg = (point.point.z + right.point.z + top.point.z + cross.point.z) / 4;
          h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
          s = 1; // saturation

          if (this.showShadow) {
            v = Math.min(1 + (crossproduct.x / len) / 2, 1);  // value. TODO: scale
            fillStyle = this._hsv2rgb(h, s, v);
            strokeStyle = fillStyle;
          }
          else  {
            v = 1;
            fillStyle = this._hsv2rgb(h, s, v);
            strokeStyle = this.axisColor; // TODO: should be customizable
          }
        }
        else {
          fillStyle = 'gray';
          strokeStyle = this.axisColor;
        }

        ctx.lineWidth = this._getStrokeWidth(point);
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(point.screen.x, point.screen.y);
        ctx.lineTo(right.screen.x, right.screen.y);
        ctx.lineTo(cross.screen.x, cross.screen.y);
        ctx.lineTo(top.screen.x, top.screen.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); // TODO: only draw stroke when strokeWidth > 0
      }
    }
  }
  else { // grid style
    for (i = 0; i < this.dataPoints.length; i++) {
      point = this.dataPoints[i];
      right = this.dataPoints[i].pointRight;
      top   = this.dataPoints[i].pointTop;

      if (point !== undefined && right !== undefined) {
        // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
        zAvg = (point.point.z + right.point.z) / 2;
        h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;

        ctx.lineWidth = this._getStrokeWidth(point) * 2;
        ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
        this._line(ctx, point.screen, right.screen);
      }

      if (point !== undefined && top !== undefined) {
        // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
        zAvg = (point.point.z + top.point.z) / 2;
        h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;

        ctx.lineWidth = this._getStrokeWidth(point) * 2;
        ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
        this._line(ctx, point.screen, top.screen);
      }
    }
  }
};

Graph3d.prototype._getStrokeWidth = function(point) {
  if (point !== undefined) {
    if (this.showPerspective) {
      return 1 / -point.trans.z * this.dataColor.strokeWidth;
    }
    else {
      return -(this.eye.z / this.camera.getArmLength()) * this.dataColor.strokeWidth;
    }
  }

  return this.dataColor.strokeWidth;
};

/**
 * Draw all datapoints as dots.
 * This function can be used when the style is 'dot' or 'dot-line'
 */
Graph3d.prototype._redrawDataDot = function() {
  var ctx = this._getContext();
  var i;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  this._calcTranslations(this.dataPoints);

  // draw the datapoints as colored circles
  var dotSize = this.frame.clientWidth * this.dotSizeRatio;  // px
  for (i = 0; i < this.dataPoints.length; i++) {
    var point = this.dataPoints[i];

    if (this.style === Graph3d.STYLE.DOTLINE) {
      // draw a vertical line from the bottom to the graph value
      //var from = this._convert3Dto2D(new Point3d(point.point.x, point.point.y, this.zMin));
      var from = this._convert3Dto2D(point.bottom);
      ctx.lineWidth = 1;
      this._line(ctx, from, point.screen, this.gridColor);
    }

    // calculate radius for the circle
    var size;
    if (this.style === Graph3d.STYLE.DOTSIZE) {
      size = dotSize/2 + 2*dotSize * (point.point.value - this.valueMin) / (this.valueMax - this.valueMin);
    }
    else {
      size = dotSize;
    }

    var radius;
    if (this.showPerspective) {
      radius = size / -point.trans.z;
    }
    else {
      radius = size * -(this.eye.z / this.camera.getArmLength());
    }
    if (radius < 0) {
      radius = 0;
    }

    var hue, color, borderColor;
    if (this.style === Graph3d.STYLE.DOTCOLOR ) {
      // calculate the color based on the value
      hue = (1 - (point.point.value - this.valueMin) * this.scale.value) * 240;
      color = this._hsv2rgb(hue, 1, 1);
      borderColor = this._hsv2rgb(hue, 1, 0.8);
    }
    else if (this.style === Graph3d.STYLE.DOTSIZE) {
      color = this.dataColor.fill;
      borderColor = this.dataColor.stroke;
    }
    else {
      // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
      hue = (1 - (point.point.z - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
      color = this._hsv2rgb(hue, 1, 1);
      borderColor = this._hsv2rgb(hue, 1, 0.8);
    }

    // draw the circle
    ctx.lineWidth = this._getStrokeWidth(point);
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.screen.x, point.screen.y, radius, 0, Math.PI*2, true);
    ctx.fill();
    ctx.stroke();
  }
};

/**
 * Draw all datapoints as bars.
 * This function can be used when the style is 'bar', 'bar-color', or 'bar-size'
 */
Graph3d.prototype._redrawDataBar = function() {
  var ctx = this._getContext();
  var i, j, surface, corners;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  this._calcTranslations(this.dataPoints);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // draw the datapoints as bars
  var xWidth = this.xBarWidth / 2;
  var yWidth = this.yBarWidth / 2;
  for (i = 0; i < this.dataPoints.length; i++) {
    var point = this.dataPoints[i];

    // determine color
    var hue, color, borderColor;
    if (this.style === Graph3d.STYLE.BARCOLOR ) {
      // calculate the color based on the value
      hue = (1 - (point.point.value - this.valueMin) * this.scale.value) * 240;
      color = this._hsv2rgb(hue, 1, 1);
      borderColor = this._hsv2rgb(hue, 1, 0.8);
    }
    else if (this.style === Graph3d.STYLE.BARSIZE) {
      color = this.dataColor.fill;
      borderColor = this.dataColor.stroke;
    }
    else {
      // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
      hue = (1 - (point.point.z - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
      color = this._hsv2rgb(hue, 1, 1);
      borderColor = this._hsv2rgb(hue, 1, 0.8);
    }

    // calculate size for the bar
    if (this.style === Graph3d.STYLE.BARSIZE) {
      xWidth = (this.xBarWidth / 2) * ((point.point.value - this.valueMin) / (this.valueMax - this.valueMin) * 0.8 + 0.2);
      yWidth = (this.yBarWidth / 2) * ((point.point.value - this.valueMin) / (this.valueMax - this.valueMin) * 0.8 + 0.2);
    }

    // calculate all corner points
    var me = this;
    var point3d = point.point;
    var top = [
      {point: new Point3d(point3d.x - xWidth, point3d.y - yWidth, point3d.z)},
      {point: new Point3d(point3d.x + xWidth, point3d.y - yWidth, point3d.z)},
      {point: new Point3d(point3d.x + xWidth, point3d.y + yWidth, point3d.z)},
      {point: new Point3d(point3d.x - xWidth, point3d.y + yWidth, point3d.z)}
    ];
    var bottom = [
      {point: new Point3d(point3d.x - xWidth, point3d.y - yWidth, this.zMin)},
      {point: new Point3d(point3d.x + xWidth, point3d.y - yWidth, this.zMin)},
      {point: new Point3d(point3d.x + xWidth, point3d.y + yWidth, this.zMin)},
      {point: new Point3d(point3d.x - xWidth, point3d.y + yWidth, this.zMin)}
    ];

    // calculate screen location of the points
    top.forEach(function (obj) {
      obj.screen = me._convert3Dto2D(obj.point);
    });
    bottom.forEach(function (obj) {
      obj.screen = me._convert3Dto2D(obj.point);
    });

    // create five sides, calculate both corner points and center points
    var surfaces = [
      {corners: top, center: Point3d.avg(bottom[0].point, bottom[2].point)},
      {corners: [top[0], top[1], bottom[1], bottom[0]], center: Point3d.avg(bottom[1].point, bottom[0].point)},
      {corners: [top[1], top[2], bottom[2], bottom[1]], center: Point3d.avg(bottom[2].point, bottom[1].point)},
      {corners: [top[2], top[3], bottom[3], bottom[2]], center: Point3d.avg(bottom[3].point, bottom[2].point)},
      {corners: [top[3], top[0], bottom[0], bottom[3]], center: Point3d.avg(bottom[0].point, bottom[3].point)}
    ];
    point.surfaces = surfaces;

    // calculate the distance of each of the surface centers to the camera
    for (j = 0; j < surfaces.length; j++) {
      surface = surfaces[j];
      var transCenter = this._convertPointToTranslation(surface.center);
      surface.dist = this.showPerspective ? transCenter.length() : -transCenter.z;
      // TODO: this dept calculation doesn't work 100% of the cases due to perspective,
      //     but the current solution is fast/simple and works in 99.9% of all cases
      //     the issue is visible in example 14, with graph.setCameraPosition({horizontal: 2.97, vertical: 0.5, distance: 0.9})
    }

    // order the surfaces by their (translated) depth
    surfaces.sort(function (a, b) {
      var diff = b.dist - a.dist;
      if (diff) return diff;

      // if equal depth, sort the top surface last
      if (a.corners === top) return 1;
      if (b.corners === top) return -1;

      // both are equal
      return 0;
    });

    // draw the ordered surfaces
    ctx.lineWidth = this._getStrokeWidth(point);
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = color;
    // NOTE: we start at j=2 instead of j=0 as we don't need to draw the two surfaces at the backside
    for (j = 2; j < surfaces.length; j++) {
      surface = surfaces[j];
      corners = surface.corners;
      ctx.beginPath();
      ctx.moveTo(corners[3].screen.x, corners[3].screen.y);
      ctx.lineTo(corners[0].screen.x, corners[0].screen.y);
      ctx.lineTo(corners[1].screen.x, corners[1].screen.y);
      ctx.lineTo(corners[2].screen.x, corners[2].screen.y);
      ctx.lineTo(corners[3].screen.x, corners[3].screen.y);
      ctx.fill();
      ctx.stroke();
    }
  }
};


/**
 * Draw a line through all datapoints.
 * This function can be used when the style is 'line'
 */
Graph3d.prototype._redrawDataLine = function() {
  var ctx = this._getContext(),
    point, i;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  this._calcTranslations(this.dataPoints, false);

  // start the line
  if (this.dataPoints.length > 0) {
    point = this.dataPoints[0];

    ctx.lineWidth = this._getStrokeWidth(point);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.dataColor.stroke;
    ctx.beginPath();
    ctx.moveTo(point.screen.x, point.screen.y);

    // draw the datapoints as colored circles
    for (i = 1; i < this.dataPoints.length; i++) {
      point = this.dataPoints[i];
      ctx.lineTo(point.screen.x, point.screen.y);
    }

    // finish the line
    ctx.stroke();
  }
};

/**
 * Start a moving operation inside the provided parent element
 * @param {Event}     event     The event that occurred (required for
 *                  retrieving the  mouse position)
 */
Graph3d.prototype._onMouseDown = function(event) {
  event = event || window.event;

  // check if mouse is still down (may be up when focus is lost for example
  // in an iframe)
  if (this.leftButtonDown) {
    this._onMouseUp(event);
  }

  // only react on left mouse button down
  this.leftButtonDown = event.which ? (event.which === 1) : (event.button === 1);
  if (!this.leftButtonDown && !this.touchDown) return;

  // get mouse position (different code for IE and all other browsers)
  this.startMouseX = getMouseX(event);
  this.startMouseY = getMouseY(event);

  this.startStart = new Date(this.start);
  this.startEnd = new Date(this.end);
  this.startArmRotation = this.camera.getArmRotation();

  this.frame.style.cursor = 'move';

  // add event listeners to handle moving the contents
  // we store the function onmousemove and onmouseup in the graph, so we can
  // remove the eventlisteners lateron in the function mouseUp()
  var me = this;
  this.onmousemove = function (event) {me._onMouseMove(event);};
  this.onmouseup   = function (event) {me._onMouseUp(event);};
  util.addEventListener(document, 'mousemove', me.onmousemove);
  util.addEventListener(document, 'mouseup', me.onmouseup);
  util.preventDefault(event);
};


/**
 * Perform moving operating.
 * This function activated from within the funcion Graph.mouseDown().
 * @param {Event}   event  Well, eehh, the event
 */
Graph3d.prototype._onMouseMove = function (event) {
  event = event || window.event;

  // calculate change in mouse position
  var diffX = parseFloat(getMouseX(event)) - this.startMouseX;
  var diffY = parseFloat(getMouseY(event)) - this.startMouseY;

  var horizontalNew = this.startArmRotation.horizontal + diffX / 200;
  var verticalNew = this.startArmRotation.vertical + diffY / 200;

  var snapAngle = 4; // degrees
  var snapValue = Math.sin(snapAngle / 360 * 2 * Math.PI);

  // snap horizontally to nice angles at 0pi, 0.5pi, 1pi, 1.5pi, etc...
  // the -0.001 is to take care that the vertical axis is always drawn at the left front corner
  if (Math.abs(Math.sin(horizontalNew)) < snapValue) {
    horizontalNew = Math.round((horizontalNew / Math.PI)) * Math.PI - 0.001;
  }
  if (Math.abs(Math.cos(horizontalNew)) < snapValue) {
    horizontalNew = (Math.round((horizontalNew/ Math.PI - 0.5)) + 0.5) * Math.PI - 0.001;
  }

  // snap vertically to nice angles
  if (Math.abs(Math.sin(verticalNew)) < snapValue) {
    verticalNew = Math.round((verticalNew / Math.PI)) * Math.PI;
  }
  if (Math.abs(Math.cos(verticalNew)) < snapValue) {
    verticalNew = (Math.round((verticalNew/ Math.PI - 0.5)) + 0.5) * Math.PI;
  }

  this.camera.setArmRotation(horizontalNew, verticalNew);
  this.redraw();

  // fire a cameraPositionChange event
  var parameters = this.getCameraPosition();
  this.emit('cameraPositionChange', parameters);

  util.preventDefault(event);
};


/**
 * Stop moving operating.
 * This function activated from within the funcion Graph.mouseDown().
 * @param {event}  event   The event
 */
Graph3d.prototype._onMouseUp = function (event) {
  this.frame.style.cursor = 'auto';
  this.leftButtonDown = false;

  // remove event listeners here
  util.removeEventListener(document, 'mousemove', this.onmousemove);
  util.removeEventListener(document, 'mouseup',   this.onmouseup);
  util.preventDefault(event);
};

/**
 * After having moved the mouse, a tooltip should pop up when the mouse is resting on a data point
 * @param {Event}  event   A mouse move event
 */
Graph3d.prototype._onTooltip = function (event) {
  var delay = 300; // ms
  var boundingRect = this.frame.getBoundingClientRect();
  var mouseX = getMouseX(event) - boundingRect.left;
  var mouseY = getMouseY(event) - boundingRect.top;

  if (!this.showTooltip) {
    return;
  }

  if (this.tooltipTimeout) {
    clearTimeout(this.tooltipTimeout);
  }

  // (delayed) display of a tooltip only if no mouse button is down
  if (this.leftButtonDown) {
    this._hideTooltip();
    return;
  }

  if (this.tooltip && this.tooltip.dataPoint) {
    // tooltip is currently visible
    var dataPoint = this._dataPointFromXY(mouseX, mouseY);
    if (dataPoint !== this.tooltip.dataPoint) {
      // datapoint changed
      if (dataPoint) {
        this._showTooltip(dataPoint);
      }
      else {
        this._hideTooltip();
      }
    }
  }
  else {
    // tooltip is currently not visible
    var me = this;
    this.tooltipTimeout = setTimeout(function () {
      me.tooltipTimeout = null;

      // show a tooltip if we have a data point
      var dataPoint = me._dataPointFromXY(mouseX, mouseY);
      if (dataPoint) {
        me._showTooltip(dataPoint);
      }
    }, delay);
  }
};

/**
 * Event handler for touchstart event on mobile devices
 */
Graph3d.prototype._onTouchStart = function(event) {
  this.touchDown = true;

  var me = this;
  this.ontouchmove = function (event) {me._onTouchMove(event);};
  this.ontouchend  = function (event) {me._onTouchEnd(event);};
  util.addEventListener(document, 'touchmove', me.ontouchmove);
  util.addEventListener(document, 'touchend', me.ontouchend);

  this._onMouseDown(event);
};

/**
 * Event handler for touchmove event on mobile devices
 */
Graph3d.prototype._onTouchMove = function(event) {
  this._onMouseMove(event);
};

/**
 * Event handler for touchend event on mobile devices
 */
Graph3d.prototype._onTouchEnd = function(event) {
  this.touchDown = false;

  util.removeEventListener(document, 'touchmove', this.ontouchmove);
  util.removeEventListener(document, 'touchend',   this.ontouchend);

  this._onMouseUp(event);
};


/**
 * Event handler for mouse wheel event, used to zoom the graph
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {event}  event   The event
 */
Graph3d.prototype._onWheel = function(event) {
  if (!event) /* For IE. */
    event = window.event;

  // retrieve delta
  var delta = 0;
  if (event.wheelDelta) { /* IE/Opera. */
    delta = event.wheelDelta/120;
  } else if (event.detail) { /* Mozilla case. */
    // In Mozilla, sign of delta is different than in IE.
    // Also, delta is multiple of 3.
    delta = -event.detail/3;
  }

  // If delta is nonzero, handle it.
  // Basically, delta is now positive if wheel was scrolled up,
  // and negative, if wheel was scrolled down.
  if (delta) {
    var oldLength = this.camera.getArmLength();
    var newLength = oldLength * (1 - delta / 10);

    this.camera.setArmLength(newLength);
    this.redraw();

    this._hideTooltip();
  }

  // fire a cameraPositionChange event
  var parameters = this.getCameraPosition();
  this.emit('cameraPositionChange', parameters);

  // Prevent default actions caused by mouse wheel.
  // That might be ugly, but we handle scrolls somehow
  // anyway, so don't bother here..
  util.preventDefault(event);
};

/**
 * Test whether a point lies inside given 2D triangle
 * @param {Point2d} point
 * @param {Point2d[]} triangle
 * @return {boolean} Returns true if given point lies inside or on the edge of the triangle
 * @private
 */
Graph3d.prototype._insideTriangle = function (point, triangle) {
  var a = triangle[0],
    b = triangle[1],
    c = triangle[2];

  function sign (x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }

  var as = sign((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x));
  var bs = sign((c.x - b.x) * (point.y - b.y) - (c.y - b.y) * (point.x - b.x));
  var cs = sign((a.x - c.x) * (point.y - c.y) - (a.y - c.y) * (point.x - c.x));

  // each of the three signs must be either equal to each other or zero
  return (as == 0 || bs == 0 || as == bs) &&
    (bs == 0 || cs == 0 || bs == cs) &&
    (as == 0 || cs == 0 || as == cs);
};

/**
 * Find a data point close to given screen position (x, y)
 * @param {Number} x
 * @param {Number} y
 * @return {Object | null} The closest data point or null if not close to any data point
 * @private
 */
Graph3d.prototype._dataPointFromXY = function (x, y) {
  var i,
    distMax = 100, // px
    dataPoint = null,
    closestDataPoint = null,
    closestDist = null,
    center = new Point2d(x, y);

  if (this.style === Graph3d.STYLE.BAR ||
    this.style === Graph3d.STYLE.BARCOLOR ||
    this.style === Graph3d.STYLE.BARSIZE) {
    // the data points are ordered from far away to closest
    for (i = this.dataPoints.length - 1; i >= 0; i--) {
      dataPoint = this.dataPoints[i];
      var surfaces  = dataPoint.surfaces;
      if (surfaces) {
        for (var s = surfaces.length - 1; s >= 0; s--) {
          // split each surface in two triangles, and see if the center point is inside one of these
          var surface = surfaces[s];
          var corners = surface.corners;
          var triangle1 = [corners[0].screen, corners[1].screen, corners[2].screen];
          var triangle2 = [corners[2].screen, corners[3].screen, corners[0].screen];
          if (this._insideTriangle(center, triangle1) ||
            this._insideTriangle(center, triangle2)) {
            // return immediately at the first hit
            return dataPoint;
          }
        }
      }
    }
  }
  else {
    // find the closest data point, using distance to the center of the point on 2d screen
    for (i = 0; i < this.dataPoints.length; i++) {
      dataPoint = this.dataPoints[i];
      var point = dataPoint.screen;
      if (point) {
        var distX = Math.abs(x - point.x);
        var distY = Math.abs(y - point.y);
        var dist  = Math.sqrt(distX * distX + distY * distY);

        if ((closestDist === null || dist < closestDist) && dist < distMax) {
          closestDist = dist;
          closestDataPoint = dataPoint;
        }
      }
    }
  }


  return closestDataPoint;
};

/**
 * Display a tooltip for given data point
 * @param {Object} dataPoint
 * @private
 */
Graph3d.prototype._showTooltip = function (dataPoint) {
  var content, line, dot;

  if (!this.tooltip) {
    content = document.createElement('div');
    content.style.position = 'absolute';
    content.style.padding = '10px';
    content.style.border = '1px solid #4d4d4d';
    content.style.color = '#1a1a1a';
    content.style.background = 'rgba(255,255,255,0.7)';
    content.style.borderRadius = '2px';
    content.style.boxShadow = '5px 5px 10px rgba(128,128,128,0.5)';

    line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.height = '40px';
    line.style.width = '0';
    line.style.borderLeft = '1px solid #4d4d4d';

    dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.height = '0';
    dot.style.width = '0';
    dot.style.border = '5px solid #4d4d4d';
    dot.style.borderRadius = '5px';

    this.tooltip = {
      dataPoint: null,
      dom: {
        content: content,
        line: line,
        dot: dot
      }
    };
  }
  else {
    content = this.tooltip.dom.content;
    line  = this.tooltip.dom.line;
    dot   = this.tooltip.dom.dot;
  }

  this._hideTooltip();

  this.tooltip.dataPoint = dataPoint;
  if (typeof this.showTooltip === 'function') {
    content.innerHTML = this.showTooltip(dataPoint.point);
  }
  else {
    content.innerHTML = '<table>' +
      '<tr><td>' + this.xLabel + ':</td><td>' + dataPoint.point.x + '</td></tr>' +
      '<tr><td>' + this.yLabel + ':</td><td>' + dataPoint.point.y + '</td></tr>' +
      '<tr><td>' + this.zLabel + ':</td><td>' + dataPoint.point.z + '</td></tr>' +
      '</table>';
  }

  content.style.left  = '0';
  content.style.top   = '0';
  this.frame.appendChild(content);
  this.frame.appendChild(line);
  this.frame.appendChild(dot);

  // calculate sizes
  var contentWidth  = content.offsetWidth;
  var contentHeight   = content.offsetHeight;
  var lineHeight    = line.offsetHeight;
  var dotWidth    = dot.offsetWidth;
  var dotHeight     = dot.offsetHeight;

  var left = dataPoint.screen.x - contentWidth / 2;
  left = Math.min(Math.max(left, 10), this.frame.clientWidth - 10 - contentWidth);

  line.style.left   = dataPoint.screen.x + 'px';
  line.style.top    = (dataPoint.screen.y - lineHeight) + 'px';
  content.style.left  = left + 'px';
  content.style.top   = (dataPoint.screen.y - lineHeight - contentHeight) + 'px';
  dot.style.left    = (dataPoint.screen.x - dotWidth / 2) + 'px';
  dot.style.top     = (dataPoint.screen.y - dotHeight / 2) + 'px';
};

/**
 * Hide the tooltip when displayed
 * @private
 */
Graph3d.prototype._hideTooltip = function () {
  if (this.tooltip) {
    this.tooltip.dataPoint = null;

    for (var prop in this.tooltip.dom) {
      if (this.tooltip.dom.hasOwnProperty(prop)) {
        var elem = this.tooltip.dom[prop];
        if (elem && elem.parentNode) {
          elem.parentNode.removeChild(elem);
        }
      }
    }
  }
};

/**--------------------------------------------------------------------------**/


/**
 * Get the horizontal mouse position from a mouse event
 * @param {Event} event
 * @return {Number} mouse x
 */
function getMouseX (event) {
  if ('clientX' in event) return event.clientX;
  return event.targetTouches[0] && event.targetTouches[0].clientX || 0;
}

/**
 * Get the vertical mouse position from a mouse event
 * @param {Event} event
 * @return {Number} mouse y
 */
function getMouseY (event) {
  if ('clientY' in event) return event.clientY;
  return event.targetTouches[0] && event.targetTouches[0].clientY || 0;
}

module.exports = Graph3d;
