var Emitter = require('emitter-component'); var DataSet = require('../DataSet');
var DataView = require('../DataView');
var util = require('../util');
var Point3d = require('./Point3d');
var Point2d = require('./Point2d');
var Camera = require('./Camera');
var Filter = require('./Filter');
var Slider = require('./Slider');
var StepNumber = require('./StepNumber');
var Range = require('./Range');
var Settings = require('./Settings');


/// enumerate the available styles
Graph3d.STYLE = Settings.STYLE; 


/**
 * Following label is used in the settings to describe values which should be
 * determined by the code while running, from the current data and graph style.
 * 
 * Using 'undefined' directly achieves the same thing, but this is more
 * descriptive by describing the intent.
 */
var autoByDefault = undefined;


/**
 * Default values for option settings.
 *
 * These are the values used when a Graph3d instance is initialized without
 * custom settings.
 *
 * If a field is not in this list, a default value of 'autoByDefault' is assumed,
 * which is just an alias for 'undefined'.
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
  verticalRatio    : 0.5,    // 0.1 to 1.0, where 1.0 results in a 'cube'
  dotSizeRatio     : 0.02,   // size of the dots as a fraction of the graph width

  showAnimationControls: autoByDefault,
  animationInterval    : 1000, // milliseconds
  animationPreload     : false,
  animationAutoStart   : autoByDefault,

  axisColor        : '#4D4D4D',
  gridColor        : '#D3D3D3',
  xCenter          : '55%',
  yCenter          : '50%',

  style            : Graph3d.STYLE.DOT,
  tooltip          : false,
  showLegend       : autoByDefault, // determined by graph style
  backgroundColor  : autoByDefault,

  dataColor        : {
    fill       : '#7DC1FF',
    stroke     : '#3267D2',
    strokeWidth: 1 // px
  },

  cameraPosition   : {
     horizontal: 1.0,
     vertical  : 0.5,
     distance  : 1.7
  },

  xBarWidth : autoByDefault,
  yBarWidth : autoByDefault,
  valueMin  : autoByDefault,
  valueMax  : autoByDefault,
  xMin      : autoByDefault,
  xMax      : autoByDefault,
  xStep     : autoByDefault,
  yMin      : autoByDefault,
  yMax      : autoByDefault,
  yStep     : autoByDefault,
  zMin      : autoByDefault,
  zMax      : autoByDefault,
  zStep     : autoByDefault
};


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

  Settings.setDefaults(DEFAULTS, this);

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
  this.scale = new Point3d(
    1 / this.xRange.range(),
    1 / this.yRange.range(),
    1 / this.zRange.range()
  );

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
  if (this.valueRange !== undefined) {
    this.scale.value = 1 / this.valueRange.range();
  }

  // position the camera arm
  var xCenter = this.xRange.center() * this.scale.x;
  var yCenter = this.yRange.center() * this.scale.y;
  var zCenter = this.zRange.center() * this.scale.z;
  this.camera.setArmLocation(xCenter, yCenter, zCenter);
};


/**
 * Convert a 3D location to a 2D location on screen
 * Source: ttp://en.wikipedia.org/wiki/3D_projection
 *
 * @param   {Point3d} point3d  A 3D point with parameters x, y, z
 * @returns {Point2d} point2d  A 2D point with parameters x, y
 */
Graph3d.prototype._convert3Dto2D = function(point3d) {
  var translation = this._convertPointToTranslation(point3d);
  return this._convertTranslationToScreen(translation);
};

/**
 * Convert a 3D location its translation seen from the camera
 * Source: http://en.wikipedia.org/wiki/3D_projection
 *
 * @param   {Point3d} point3d     A 3D point with parameters x, y, z
 * @returns {Point3d} translation A 3D point with parameters x, y, z This is
 *                                the translation of the point, seen from the
 *                                camera.
 */
Graph3d.prototype._convertPointToTranslation = function(point3d) {
  var cameraLocation = this.camera.getCameraLocation(),
    cameraRotation = this.camera.getCameraRotation(),
    ax = point3d.x * this.scale.x,
    ay = point3d.y * this.scale.y,
    az = point3d.z * this.scale.z,

    cx = cameraLocation.x,
    cy = cameraLocation.y,
    cz = cameraLocation.z,

  // calculate angles
    sinTx = Math.sin(cameraRotation.x),
    cosTx = Math.cos(cameraRotation.x),
    sinTy = Math.sin(cameraRotation.y),
    cosTy = Math.cos(cameraRotation.y),
    sinTz = Math.sin(cameraRotation.z),
    cosTz = Math.cos(cameraRotation.z),

  // calculate translation
    dx = cosTy * (sinTz * (ay - cy) + cosTz * (ax - cx)) - sinTy * (az - cz),
    dy = sinTx * (cosTy * (az - cz) + sinTy * (sinTz * (ay - cy) + cosTz * (ax - cx))) + cosTx * (cosTz * (ay - cy) - sinTz * (ax-cx)),
    dz = cosTx * (cosTy * (az - cz) + sinTy * (sinTz * (ay - cy) + cosTz * (ax - cx))) - sinTx * (cosTz * (ay - cy) - sinTz * (ax-cx));

  return new Point3d(dx, dy, dz);
};

/**
 * Convert a translation point to a point on the screen
 *
 * @param   {Point3d} translation A 3D point with parameters x, y, z This is
 *                                the translation of the point, seen from the
 *                                camera.
 * @returns {Point2d} point2d     A 2D point with parameters x, y
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


/**
 * Get the absolute min/max values for the passed data column.
 *
 * @returns {Range} A Range instance with min/max members properly set.
 */
Graph3d.prototype.getColumnRange = function(data,column) {
  var range  = new Range();

  // Adjust the range so that it covers all values in the passed data elements.
  for (var i = 0; i < data.length; i++) {
    var item = data[i][column];
    range.adjust(item);
  }

  return range;
};


/**
 * Check if the state is consistent for the use of the value field.
 *
 * Throws if a problem is detected.
 */
Graph3d.prototype._checkValueField = function (data) {

  var hasValueField = this.style === Graph3d.STYLE.BARCOLOR
                   || this.style === Graph3d.STYLE.BARSIZE
                   || this.style === Graph3d.STYLE.DOTCOLOR
                   || this.style === Graph3d.STYLE.DOTSIZE;

  if (!hasValueField) {
    return;   // No need to check further
  }

  // Following field must be present for the current graph style
  if (this.colValue === undefined) {
    throw new Error('Expected data to have '
      + ' field \'style\' '
      + ' for graph style \'' + this.style + '\''
    );
  }

  // The data must also contain this field.
  // Note that only first data element is checked.
  if (data[0][this.colValue] === undefined) {
    throw new Error('Expected data to have '
      + ' field \'' + this.colValue + '\' '
      + ' for graph style \'' + this.style + '\''
    );
  }
};


/**
 * Set default values for range
 *
 * The default values override the range values, if defined.
 *
 * Because it's possible that only defaultMin or defaultMax is set, it's better
 * to pass in a range already set with the min/max set from the data. Otherwise,
 * it's quite hard to process the min/max properly.
 */
Graph3d.prototype._setRangeDefaults = function (range, defaultMin, defaultMax) {
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


/**
 * Initialize the data from the data table. Calculate minimum and maximum values
 * and column index values
 * @param {Array | DataSet | DataView} rawData The data containing the items for
 *                                             the Graph.
 * @param {Number}                     style   Style Number
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

  // determine the location of x,y,z,value,filter columns
  this.colX = 'x';
  this.colY = 'y';
  this.colZ = 'z';


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
  var NUMSTEPS = 5;

  var xRange = this.getColumnRange(data, this.colX);
  if (withBars) {
    xRange.expand(this.xBarWidth / 2);
  }
  this._setRangeDefaults(xRange, this.defaultXMin, this.defaultXMax);
  this.xRange = xRange;
  this.xStep = (this.defaultXStep !== undefined) ? this.defaultXStep : xRange.range()/NUMSTEPS;

  var yRange = this.getColumnRange(data, this.colY);
  if (withBars) {
    yRange.expand(this.yBarWidth / 2);
  }
  this._setRangeDefaults(yRange, this.defaultYMin, this.defaultYMax);
  this.yRange = yRange;
  this.yStep = (this.defaultYStep !== undefined) ? this.defaultYStep : yRange.range()/NUMSTEPS;

  var zRange = this.getColumnRange(data, this.colZ);
  this._setRangeDefaults(zRange, this.defaultZMin, this.defaultZMax);
  this.zRange = zRange;
  this.zStep = (this.defaultZStep !== undefined) ? this.defaultZStep : zRange.range()/NUMSTEPS;

  if (data[0].hasOwnProperty('style')) {
    this.colValue = 'style';
    var valueRange = this.getColumnRange(data,this.colValue);
    this._setRangeDefaults(valueRange, this.defaultValueMin, this.defaultValueMax);
    this.valueRange = valueRange;
  }


  // check if a filter column is provided
  // Needs to be started after zRange is defined
  if (data[0].hasOwnProperty('filter')) {
    // Only set this field if it's actually present
    this.colFilter = 'filter';

    if (this.dataFilter === undefined) {
      this.dataFilter = new Filter(rawData, this.colFilter, this);
      this.dataFilter.setOnLoadCallback(function() {me.redraw();});
    }
  }

  
  // set the scale dependent on the ranges.
  this._setScale();
};



/**
 * Filter the data based on the current filter
 *
 * @param   {Array} data
 * @returns {Array} dataPoints Array with point objects which can be drawn on
 *                             screen
 */
Graph3d.prototype._getDataPoints = function (data) {
  // TODO: store the created matrix dataPoints in the filters instead of
  //       reloading each time.
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

      // TODO: implement Array().indexOf() for Internet Explorer
      var xIndex = dataX.indexOf(x);
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
      obj.bottom = new Point3d(x, y, this.zRange.min);

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
    this._checkValueField(data);

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
      obj.bottom = new Point3d(point.x, point.y, this.zRange.min);
      obj.trans = undefined;
      obj.screen = undefined;

      if (this.style === Graph3d.STYLE.LINE) {
        if (i > 0) {
          // Add next point for line drawing
          dataPoints[i - 1].pointNext = obj;
        }
      }

      dataPoints.push(obj);
    }
  }

  return dataPoints;
};

/**
 * Create the main frame for the Graph3d.
 *
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
 *
 * @param {string} width  Width in pixels or percentage (for example '800px'
 *                        or '50%')
 * @param {string} height Height in pixels or percentage  (for example '400px'
 *                        or '30%')
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
 *
 * @returns {object} An object with parameters horizontal, vertical, and
 *                   distance
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
 *
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
 *
 * @param {Object} options
 */
Graph3d.prototype.setOptions = function (options) {
  var cameraPosition = undefined;

  this.animationStop();

  Settings.setOptions(options, this);

  this.setPointDrawingMethod();
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
 * Determine which point drawing method to use for the current graph style.
 */
Graph3d.prototype.setPointDrawingMethod = function() {
  var method = undefined;

  switch (this.style) {
    case Graph3d.STYLE.BAR:
      method = Graph3d.prototype._redrawBarGraphPoint;
      break;
    case Graph3d.STYLE.BARCOLOR:
      method = Graph3d.prototype._redrawBarColorGraphPoint;
      break;
    case Graph3d.STYLE.BARSIZE:
      method = Graph3d.prototype._redrawBarSizeGraphPoint;
      break;
    case Graph3d.STYLE.DOT:
      method = Graph3d.prototype._redrawDotGraphPoint;
      break;
    case Graph3d.STYLE.DOTLINE:
      method = Graph3d.prototype._redrawDotLineGraphPoint;
      break;
    case Graph3d.STYLE.DOTCOLOR:
      method = Graph3d.prototype._redrawDotColorGraphPoint;
      break;
    case Graph3d.STYLE.DOTSIZE:
      method = Graph3d.prototype._redrawDotSizeGraphPoint;
      break;
    case Graph3d.STYLE.SURFACE:
      method = Graph3d.prototype._redrawSurfaceGraphPoint;
      break;
    case Graph3d.STYLE.GRID:
      method = Graph3d.prototype._redrawGridGraphPoint;
      break;
    case Graph3d.STYLE.LINE:
      method = Graph3d.prototype._redrawLineGraphPoint;
      break;
    default:
      throw new Error('Can not determine point drawing method '
                    + 'for graph style \'' + this.style + '\'');
      break;
  }

  this._pointDrawingMethod = method;
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

  this._redrawDataGraph();

  this._redrawInfo();
  this._redrawLegend();
};


/**
 * Get drawing context without exposing canvas
 */
Graph3d.prototype._getContext = function() {
  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');

  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

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


Graph3d.prototype._dotSize = function() {
  return this.frame.clientWidth * this.dotSizeRatio;
};


/**
 * Get legend width 
 */
Graph3d.prototype._getLegendWidth = function() {
  var width; 

  if (this.style === Graph3d.STYLE.DOTSIZE) {
    var dotSize = this._dotSize();
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
  if (this.showLegend !== true) {
    return;
  }     

  // Do not draw legend when graph style does not support
  if (this.style === Graph3d.STYLE.LINE
   || this.style === Graph3d.STYLE.BARSIZE //TODO add legend support for BARSIZE 
  ){
    return;
  } 

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
      var dotSize = this._dotSize();
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
 
  var legendMin = isValueLegend ? this.valueRange.min :  this.zRange.min; 
  var legendMax = isValueLegend ? this.valueRange.max :  this.zRange.max;
  var step = new StepNumber(legendMin, legendMax, (legendMax-legendMin)/5, true);
  step.start(true);

  var y;
  var from;
  var to;
  while (!step.end()) {
    y = bottom - (step.getCurrent() - legendMin) / (legendMax - legendMin) * height;
    from  = new Point2d(left - gridLineLen, y);
    to    = new Point2d(left, y);
    this._line(ctx, from, to);

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
    offset, xOffset, yOffset;

  // TODO: get the actual rendered style of the containerElement
  //ctx.font = this.containerElement.style.font;
  ctx.font = 24 / this.camera.getArmLength() + 'px arial';

  // calculate the length for the short grid lines
  var gridLenX   = 0.025 / this.scale.x;
  var gridLenY   = 0.025 / this.scale.y;
  var textMargin = 5 / this.camera.getArmLength(); // px
  var armAngle   = this.camera.getArmRotation().horizontal;
  var armVector  = new Point2d(Math.cos(armAngle), Math.sin(armAngle));

  var xRange = this.xRange;
  var yRange = this.yRange;
  var zRange = this.zRange;

  // draw x-grid lines
  ctx.lineWidth = 1;
  prettyStep = (this.defaultXStep === undefined);
  step = new StepNumber(xRange.min, xRange.max, this.xStep, prettyStep);
  step.start(true);

  while (!step.end()) {
    var x = step.getCurrent();

    if (this.showGrid) {
      from = new Point3d(x, yRange.min, zRange.min);
      to   = new Point3d(x, yRange.max, zRange.min);
      this._line3d(ctx, from, to, this.gridColor);
    }
    else {
      from = new Point3d(x, yRange.min, zRange.min);
      to   = new Point3d(x, yRange.min+gridLenX, zRange.min);
      this._line3d(ctx, from, to, this.axisColor);

      from = new Point3d(x, yRange.max, zRange.min);
      to   = new Point3d(x, yRange.max-gridLenX, zRange.min);
      this._line3d(ctx, from, to, this.axisColor);
    }

    yText       = (armVector.x > 0) ? yRange.min : yRange.max;
    var point3d = new Point3d(x, yText, zRange.min);
    var msg     = '  ' + this.xValueLabel(x) + '  ';
    this.drawAxisLabelX(ctx, point3d, msg, armAngle, textMargin);

    step.next();
  }

  // draw y-grid lines
  ctx.lineWidth = 1;
  prettyStep = (this.defaultYStep === undefined);
  step = new StepNumber(yRange.min, yRange.max, this.yStep, prettyStep);
  step.start(true);

  while (!step.end()) {
    var y = step.getCurrent();

    if (this.showGrid) {
      from = new Point3d(xRange.min, y, zRange.min);
      to   = new Point3d(xRange.max, y, zRange.min);
      this._line3d(ctx, from, to, this.gridColor);
    }
    else {
      from = new Point3d(xRange.min, y, zRange.min);
      to   = new Point3d(xRange.min+gridLenY, y, zRange.min);
      this._line3d(ctx, from, to, this.axisColor);

      from = new Point3d(xRange.max, y, zRange.min);
      to   = new Point3d(xRange.max-gridLenY, y, zRange.min);
      this._line3d(ctx, from, to, this.axisColor);
    }

    xText   = (armVector.y > 0) ? xRange.min : xRange.max;
    point3d = new Point3d(xText, y, zRange.min);
    var msg = '  ' + this.yValueLabel(y) + '  ';    
    this.drawAxisLabelY(ctx, point3d, msg, armAngle, textMargin);

    step.next();
  }

  // draw z-grid lines and axis
  ctx.lineWidth = 1;
  prettyStep = (this.defaultZStep === undefined);
  step = new StepNumber(zRange.min, zRange.max, this.zStep, prettyStep);
  step.start(true);

  xText = (armVector.x > 0) ? xRange.min : xRange.max;
  yText = (armVector.y < 0) ? yRange.min : yRange.max;

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
  from = new Point3d(xText, yText, zRange.min);
  to   = new Point3d(xText, yText, zRange.max);
  this._line3d(ctx, from, to, this.axisColor);

  // draw x-axis
  var xMin2d;
  var xMax2d;
  ctx.lineWidth = 1;

  // line at yMin
  xMin2d = new Point3d(xRange.min, yRange.min, zRange.min);
  xMax2d = new Point3d(xRange.max, yRange.min, zRange.min);
  this._line3d(ctx, xMin2d, xMax2d, this.axisColor);
  // line at ymax
  xMin2d = new Point3d(xRange.min, yRange.max, zRange.min);
  xMax2d = new Point3d(xRange.max, yRange.max, zRange.min);
  this._line3d(ctx, xMin2d, xMax2d, this.axisColor);

  // draw y-axis
  ctx.lineWidth = 1;
  // line at xMin
  from = new Point3d(xRange.min, yRange.min, zRange.min);
  to   = new Point3d(xRange.min, yRange.max, zRange.min);
  this._line3d(ctx, from, to, this.axisColor);
  // line at xMax
  from = new Point3d(xRange.max, yRange.min, zRange.min);
  to   = new Point3d(xRange.max, yRange.max, zRange.min);
  this._line3d(ctx, from, to, this.axisColor);

  // draw x-label
  var xLabel = this.xLabel;
  if (xLabel.length > 0) {
    yOffset = 0.1 / this.scale.y;
    xText   = xRange.center() / 2;
    yText   = (armVector.x > 0) ? yRange.min - yOffset: yRange.max + yOffset;
    text    = new Point3d(xText, yText, zRange.min);
    this.drawAxisLabelX(ctx, text, xLabel, armAngle);
  }

  // draw y-label
  var yLabel = this.yLabel;
  if (yLabel.length > 0) {
    xOffset = 0.1 / this.scale.x;
    xText   = (armVector.y > 0) ? xRange.min - xOffset : xRange.max + xOffset;
    yText   = yRange.center() / 2;
    text    = new Point3d(xText, yText, zRange.min);

    this.drawAxisLabelY(ctx, text, yLabel, armAngle);
  }

  // draw z-label
  var zLabel = this.zLabel;
  if (zLabel.length > 0) {
    offset = 30;  // pixels.  // TODO: relate to the max width of the values on the z axis?
    xText  = (armVector.x > 0) ? xRange.min : xRange.max;
    yText  = (armVector.y < 0) ? yRange.min : yRange.max;
    zText  = zRange.center() / 2;
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


// -----------------------------------------------------------------------------
// Drawing primitives for the graphs
// -----------------------------------------------------------------------------


/**
 * Draw a bar element in the view with the given properties.
 */
Graph3d.prototype._redrawBar = function(ctx, point, xWidth, yWidth, color, borderColor) {
  var i, j, surface;

  // calculate all corner points
  var me = this;
  var point3d = point.point;
  var zMin = this.zRange.min;
  var top = [
    {point: new Point3d(point3d.x - xWidth, point3d.y - yWidth, point3d.z)},
    {point: new Point3d(point3d.x + xWidth, point3d.y - yWidth, point3d.z)},
    {point: new Point3d(point3d.x + xWidth, point3d.y + yWidth, point3d.z)},
    {point: new Point3d(point3d.x - xWidth, point3d.y + yWidth, point3d.z)}
  ];
  var bottom = [
    {point: new Point3d(point3d.x - xWidth, point3d.y - yWidth, zMin)},
    {point: new Point3d(point3d.x + xWidth, point3d.y - yWidth, zMin)},
    {point: new Point3d(point3d.x + xWidth, point3d.y + yWidth, zMin)},
    {point: new Point3d(point3d.x - xWidth, point3d.y + yWidth, zMin)}
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
    this._polygon(ctx, surface.corners);
  }
};


/**
 * Draw a polygon using the passed points and fill it with the passed style and stroke.
 *
 * @param points      an array of points. 
 * @param fillStyle   optional; the fill style to set
 * @param strokeStyle optional; the stroke style to set
 */
Graph3d.prototype._polygon = function(ctx, points, fillStyle, strokeStyle) {
  if (points.length < 2) {
    return;
  }

  if (fillStyle !== undefined) {
    ctx.fillStyle   = fillStyle;
  }
  if (strokeStyle !== undefined) {
    ctx.strokeStyle = strokeStyle;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].screen.x, points[0].screen.y);

  for (var i = 1; i < points.length; ++i) {
    var point = points[i];
    ctx.lineTo(point.screen.x, point.screen.y);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke(); // TODO: only draw stroke when strokeWidth > 0
};


/**
 * @param size optional; if not specified use value from 'this._dotSize()`
 */
Graph3d.prototype._drawCircle = function(ctx, point, color, borderColor, size) {
  var radius = this._calcRadius(point, size);

  ctx.lineWidth   = this._getStrokeWidth(point);
  ctx.strokeStyle = borderColor;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(point.screen.x, point.screen.y, radius, 0, Math.PI*2, true);
  ctx.fill();
  ctx.stroke();
};


/**
 * Determine the colors for the 'regular' graph styles.
 */
Graph3d.prototype._getColorsRegular = function(point) {
  // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
  var hue         = (1 - (point.point.z - this.zRange.min) * this.scale.z  / this.verticalRatio) * 240;
  var color       = this._hsv2rgb(hue, 1, 1);
  var borderColor = this._hsv2rgb(hue, 1, 0.8);

  return {
    fill  : color,
    border: borderColor
  };
};


/**
 * Get the colors for the 'color' graph styles.
 * These styles are currently: 'bar-color' and 'dot-color'
 */
Graph3d.prototype._getColorsColor = function(point) {
  // calculate the color based on the value
  var hue         = (1 - (point.point.value - this.valueRange.min) * this.scale.value) * 240;
  var color       = this._hsv2rgb(hue, 1, 1);
  var borderColor = this._hsv2rgb(hue, 1, 0.8);

  return {
    fill   : color,
    border : borderColor 
  };
};


/**
 * Get the colors for the 'size' graph styles.
 * These styles are currently: 'bar-size' and 'dot-size'
 */
Graph3d.prototype._getColorsSize = function() {
  return {
    fill   : this.dataColor.fill,
    border : this.dataColor.stroke
  };
};


/**
 * Determine the size of a point on-screen, as determined by the
 * distance to the camera.
 *
 * @param size the size that needs to be translated to screen coordinates.
 *             optional; if not passed, use the default point size.
 */
Graph3d.prototype._calcRadius = function(point, size) {
  if (size === undefined) {
    size = this._dotSize();
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

  return radius;
};


// -----------------------------------------------------------------------------
// Methods for drawing points per graph style.
// -----------------------------------------------------------------------------


/**
 * Draw single datapoint for graph style 'bar'.
 */
Graph3d.prototype._redrawBarGraphPoint = function(ctx, point) {
  var xWidth = this.xBarWidth / 2;
  var yWidth = this.yBarWidth / 2;
  var colors = this._getColorsRegular(point);

  this._redrawBar(ctx, point, xWidth, yWidth, colors.fill, colors.border);
};


/**
 * Draw single datapoint for graph style 'bar-color'.
 */
Graph3d.prototype._redrawBarColorGraphPoint = function(ctx, point) {
  var xWidth = this.xBarWidth / 2;
  var yWidth = this.yBarWidth / 2;
  var colors = this._getColorsColor(point);

  this._redrawBar(ctx, point, xWidth, yWidth, colors.fill, colors.border);
};


/**
 * Draw single datapoint for graph style 'bar-size'.
 */
Graph3d.prototype._redrawBarSizeGraphPoint = function(ctx, point) {
  // calculate size for the bar
  var fraction = (point.point.value - this.valueRange.min) / this.valueRange.range();
  var xWidth   = (this.xBarWidth / 2) * (fraction * 0.8 + 0.2);
  var yWidth   = (this.yBarWidth / 2) * (fraction * 0.8 + 0.2);

  var colors   = this._getColorsSize();

  this._redrawBar(ctx, point, xWidth, yWidth, colors.fill, colors.border);
};


/**
 * Draw single datapoint for graph style 'dot'.
 */
Graph3d.prototype._redrawDotGraphPoint = function(ctx, point) {
  var colors = this._getColorsRegular(point);

  this._drawCircle(ctx, point, colors.fill, colors.border);
};


/**
 * Draw single datapoint for graph style 'dot-line'.
 */
Graph3d.prototype._redrawDotLineGraphPoint = function(ctx, point) {
  // draw a vertical line from the XY-plane to the graph value
  var from = this._convert3Dto2D(point.bottom);
  ctx.lineWidth = 1;
  this._line(ctx, from, point.screen, this.gridColor);

  this._redrawDotGraphPoint(ctx, point);
};


/**
 * Draw single datapoint for graph style 'dot-color'.
 */
Graph3d.prototype._redrawDotColorGraphPoint = function(ctx, point) {
  var colors = this._getColorsColor(point);

  this._drawCircle(ctx, point, colors.fill, colors.border);
};


/**
 * Draw single datapoint for graph style 'dot-size'.
 */
Graph3d.prototype._redrawDotSizeGraphPoint = function(ctx, point) {
  var dotSize  = this._dotSize();
  var fraction = (point.point.value - this.valueRange.min) / this.valueRange.range();
  var size     = dotSize/2 + 2*dotSize * fraction;
  var colors   = this._getColorsSize();

  this._drawCircle(ctx, point, colors.fill, colors.border, size);
};


/**
 * Draw single datapoint for graph style 'surface'.
 */
Graph3d.prototype._redrawSurfaceGraphPoint = function(ctx, point) {
  var right = point.pointRight;
  var top   = point.pointTop;
  var cross = point.pointCross;

  if (point === undefined || right === undefined || top === undefined || cross === undefined) {
    return;
  }

  var topSideVisible = true;
  var fillStyle;
  var strokeStyle;
  var lineWidth;

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

  if (topSideVisible) {

    // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
    var zAvg = (point.point.z + right.point.z + top.point.z + cross.point.z) / 4;
    var h    = (1 - (zAvg - this.zRange.min) * this.scale.z  / this.verticalRatio) * 240;
    var s    = 1; // saturation
    var v;

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
  // TODO: only draw stroke when strokeWidth > 0

  var points = [point, right, cross, top];
  this._polygon(ctx, points, fillStyle, strokeStyle);
};


/**
 * Helper method for _redrawGridGraphPoint()
 */
Graph3d.prototype._drawGridLine = function(ctx, from, to) {
  if (from === undefined || to === undefined) {
     return;
  }

  // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
  var zAvg = (from.point.z + to.point.z) / 2;
  var h    = (1 - (zAvg - this.zRange.min) * this.scale.z  / this.verticalRatio) * 240;

  ctx.lineWidth   = this._getStrokeWidth(from) * 2;
  ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
  this._line(ctx, from.screen, to.screen);
};


/**
 * Draw single datapoint for graph style 'Grid'.
 */
Graph3d.prototype._redrawGridGraphPoint = function(ctx, point) {
  this._drawGridLine(ctx, point, point.pointRight);
  this._drawGridLine(ctx, point, point.pointTop);
};


/**
 * Draw single datapoint for graph style 'line'.
 */
Graph3d.prototype._redrawLineGraphPoint = function(ctx, point) {
  if (point.pointNext === undefined) {
    return;
  }

  ctx.lineWidth   = this._getStrokeWidth(point);
  ctx.strokeStyle = this.dataColor.stroke;

  this._line(ctx, point.screen, point.pointNext.screen);
};


/**
 * Draw all datapoints for currently selected graph style.
 *
 */
Graph3d.prototype._redrawDataGraph = function() {
  var ctx = this._getContext();
  var i;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  this._calcTranslations(this.dataPoints);

  for (i = 0; i < this.dataPoints.length; i++) {
    var point = this.dataPoints[i];

    // Using call() ensures that the correct context is used
    this._pointDrawingMethod.call(this, ctx, point);
  }
};


// -----------------------------------------------------------------------------
// End methods for drawing points per graph style.
// -----------------------------------------------------------------------------


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
 *
 * @param   {Point2d}   point
 * @param   {Point2d[]} triangle
 * @returns {boolean}   true if given point lies inside or on the edge of the
 *                      triangle, false otherwise
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
 *
 * @param   {Number} x
 * @param   {Number} y
 * @returns {Object | null} The closest data point or null if not close to any
 *                          data point
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
 *
 * @param   {Event}  event
 * @returns {Number} mouse x
 */
function getMouseX (event) {
  if ('clientX' in event) return event.clientX;
  return event.targetTouches[0] && event.targetTouches[0].clientX || 0;
}

/**
 * Get the vertical mouse position from a mouse event
 *
 * @param   {Event}  event
 * @returns {Number} mouse y
 */
function getMouseY (event) {
  if ('clientY' in event) return event.clientY;
  return event.targetTouches[0] && event.targetTouches[0].clientY || 0;
}


// -----------------------------------------------------------------------------
//  Public methods for specific settings
// -----------------------------------------------------------------------------

/**
 * Set the rotation and distance of the camera
 *
 * @param {Object}  pos            An object with the camera position
 * @param {?Number} pos.horizontal The horizontal rotation, between 0 and 2*PI.
 *                                 Optional, can be left undefined.
 * @param {?Number} pos.vertical   The vertical rotation, between 0 and 0.5*PI.
 *                                 if vertical=0.5*PI, the graph is shown from
 *                                 the top. Optional, can be left undefined.
 * @param {?Number} pos.distance   The (normalized) distance of the camera to the
 *                                 center of the graph, a value between 0.71 and
 *                                 5.0. Optional, can be left undefined.
 */
Graph3d.prototype.setCameraPosition = function(pos) {
  Settings.setCameraPosition(pos, this);
  this.redraw();
};


// -----------------------------------------------------------------------------
//  End public methods for specific settings
// -----------------------------------------------------------------------------


module.exports = Graph3d;
