var Emitter = require('emitter-component');
var DataSet = require('../DataSet');
var DataView = require('../DataView');
var util = require('../util');
var Point3d = require('./Point3d');
var Point2d = require('./Point2d');
var Camera = require('./Camera');
var Filter = require('./Filter');
var Slider = require('./Slider');
var StepNumber = require('./StepNumber');

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
  this.width = '400px';
  this.height = '400px';
  this.margin = 10; // px
  this.defaultXCenter = '55%';
  this.defaultYCenter = '50%';

  this.xLabel = 'x';
  this.yLabel = 'y';
  this.zLabel = 'z';

  var passValueFn = function(v) { return v; };
  this.xValueLabel = passValueFn;
  this.yValueLabel = passValueFn;
  this.zValueLabel = passValueFn;
  
  this.filterLabel = 'time';
  this.legendLabel = 'value';

  this.style = Graph3d.STYLE.DOT;
  this.showPerspective = true;
  this.showGrid = true;
  this.keepAspectRatio = true;
  this.showShadow = false;
  this.showGrayBottom = false; // TODO: this does not work correctly
  this.showTooltip = false;
  this.verticalRatio = 0.5; // 0.1 to 1.0, where 1.0 results in a 'cube'

  this.animationInterval = 1000; // milliseconds
  this.animationPreload = false;

  this.camera = new Camera();
  this.eye = new Point3d(0, 0, -1);  // TODO: set eye.z about 3/4 of the width of the window?

  this.dataTable = null;  // The original data table
  this.dataPoints = null; // The table with point objects

  // the column indexes
  this.colX = undefined;
  this.colY = undefined;
  this.colZ = undefined;
  this.colValue = undefined;
  this.colFilter = undefined;

  this.xMin = 0;
  this.xStep = undefined; // auto by default
  this.xMax = 1;
  this.yMin = 0;
  this.yStep = undefined; // auto by default
  this.yMax = 1;
  this.zMin = 0;
  this.zStep = undefined; // auto by default
  this.zMax = 1;
  this.valueMin = 0;
  this.valueMax = 1;
  this.xBarWidth = 1;
  this.yBarWidth = 1;
  // TODO: customize axis range

  // constants
  this.colorAxis = '#4D4D4D';
  this.colorGrid = '#D3D3D3';
  this.colorDot = '#7DC1FF';
  this.colorDotBorder = '#3267D2';

  // create a frame and canvas
  this.create();

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
    this.xcenter + bx * this.frame.canvas.clientWidth,
    this.ycenter - by * this.frame.canvas.clientWidth);
};

/**
 * Set the background styling for the graph
 * @param {string | {fill: string, stroke: string, strokeWidth: string}} backgroundColor
 */
Graph3d.prototype._setBackgroundColor = function(backgroundColor) {
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
  else if  (backgroundColor === undefined) {
    // use use defaults
  }
  else {
    throw 'Unsupported type of backgroundColor';
  }

  this.frame.style.backgroundColor = fill;
  this.frame.style.borderColor = stroke;
  this.frame.style.borderWidth = strokeWidth + 'px';
  this.frame.style.borderStyle = 'solid';
};


/// enumerate the available styles
Graph3d.STYLE = {
  BAR: 0,
  BARCOLOR: 1,
  BARSIZE: 2,
  DOT : 3,
  DOTLINE : 4,
  DOTCOLOR: 5,
  DOTSIZE: 6,
  GRID : 7,
  LINE: 8,
  SURFACE : 9
};

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
    throw 'Unknown style "' + this.style + '"';
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
  this.colValue = 'style';
  this.colFilter = 'filter';



  // check if a filter column is provided
  if (data[0].hasOwnProperty('filter')) {
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

  if (this.colValue !== undefined) {
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
    // copy all values from the google data table to a list with Point3d objects
    for (i = 0; i < data.length; i++) {
      point = new Point3d();
      point.x = data[i][this.colX] || 0;
      point.y = data[i][this.colY] || 0;
      point.z = data[i][this.colZ] || 0;

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
    throw 'No animation available';

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
 * Resize the center position based on the current values in this.defaultXCenter
 * and this.defaultYCenter (which are strings with a percentage or a value
 * in pixels). The center positions are the variables this.xCenter
 * and this.yCenter
 */
Graph3d.prototype._resizeCenter = function() {
  // calculate the horizontal center position
  if (this.defaultXCenter.charAt(this.defaultXCenter.length-1) === '%') {
    this.xcenter =
      parseFloat(this.defaultXCenter) / 100 *
        this.frame.canvas.clientWidth;
  }
  else {
    this.xcenter = parseFloat(this.defaultXCenter); // supposed to be in px
  }

  // calculate the vertical center position
  if (this.defaultYCenter.charAt(this.defaultYCenter.length-1) === '%') {
    this.ycenter =
      parseFloat(this.defaultYCenter) / 100 *
        (this.frame.canvas.clientHeight - this.frame.filter.clientHeight);
  }
  else {
    this.ycenter = parseFloat(this.defaultYCenter); // supposed to be in px
  }
};

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
  if (pos === undefined) {
    return;
  }

  if (pos.horizontal !== undefined && pos.vertical !== undefined) {
    this.camera.setArmRotation(pos.horizontal, pos.vertical);
  }

  if (pos.distance !== undefined) {
    this.camera.setArmLength(pos.distance);
  }

  this.redraw();
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
    if (options.width !== undefined)       this.width = options.width;
    if (options.height !== undefined)      this.height = options.height;

    if (options.xCenter !== undefined)     this.defaultXCenter = options.xCenter;
    if (options.yCenter !== undefined)     this.defaultYCenter = options.yCenter;

    if (options.filterLabel !== undefined)     this.filterLabel = options.filterLabel;
    if (options.legendLabel !== undefined)     this.legendLabel = options.legendLabel;
    if (options.xLabel !== undefined)     this.xLabel = options.xLabel;
    if (options.yLabel !== undefined)     this.yLabel = options.yLabel;
    if (options.zLabel !== undefined)     this.zLabel = options.zLabel;

    if (options.xValueLabel !== undefined)     this.xValueLabel = options.xValueLabel;
    if (options.yValueLabel !== undefined)     this.yValueLabel = options.yValueLabel;
    if (options.zValueLabel !== undefined)     this.zValueLabel = options.zValueLabel;

    if (options.style !== undefined) {
      var styleNumber = this._getStyleNumber(options.style);
      if (styleNumber !== -1) {
        this.style = styleNumber;
      }
    }
    if (options.showGrid !== undefined)      this.showGrid = options.showGrid;
    if (options.showPerspective !== undefined)   this.showPerspective = options.showPerspective;
    if (options.showShadow !== undefined)    this.showShadow = options.showShadow;
    if (options.tooltip !== undefined)       this.showTooltip = options.tooltip;
    if (options.showAnimationControls !== undefined) this.showAnimationControls = options.showAnimationControls;
    if (options.keepAspectRatio !== undefined)   this.keepAspectRatio = options.keepAspectRatio;
    if (options.verticalRatio !== undefined)   this.verticalRatio = options.verticalRatio;

    if (options.animationInterval !== undefined) this.animationInterval = options.animationInterval;
    if (options.animationPreload !== undefined)  this.animationPreload = options.animationPreload;
    if (options.animationAutoStart !== undefined)this.animationAutoStart = options.animationAutoStart;

    if (options.xBarWidth !== undefined) this.defaultXBarWidth = options.xBarWidth;
    if (options.yBarWidth !== undefined) this.defaultYBarWidth = options.yBarWidth;

    if (options.xMin !== undefined) this.defaultXMin = options.xMin;
    if (options.xStep !== undefined) this.defaultXStep = options.xStep;
    if (options.xMax !== undefined) this.defaultXMax = options.xMax;
    if (options.yMin !== undefined) this.defaultYMin = options.yMin;
    if (options.yStep !== undefined) this.defaultYStep = options.yStep;
    if (options.yMax !== undefined) this.defaultYMax = options.yMax;
    if (options.zMin !== undefined) this.defaultZMin = options.zMin;
    if (options.zStep !== undefined) this.defaultZStep = options.zStep;
    if (options.zMax !== undefined) this.defaultZMax = options.zMax;
    if (options.valueMin !== undefined) this.defaultValueMin = options.valueMin;
    if (options.valueMax !== undefined) this.defaultValueMax = options.valueMax;

    if (options.cameraPosition !== undefined) cameraPosition = options.cameraPosition;

    if (cameraPosition !== undefined) {
      this.camera.setArmRotation(cameraPosition.horizontal, cameraPosition.vertical);
      this.camera.setArmLength(cameraPosition.distance);
    }
    else {
      this.camera.setArmRotation(1.0, 0.5);
      this.camera.setArmLength(1.7);
    }
  }

  this._setBackgroundColor(options && options.backgroundColor);

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
    throw 'Error: graph data not initialized';
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
 * Clear the canvas before redrawing
 */
Graph3d.prototype._redrawClear = function() {
  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
};


/**
 * Redraw the legend showing the colors
 */
Graph3d.prototype._redrawLegend = function() {
  var y;

  if (this.style === Graph3d.STYLE.DOTCOLOR ||
    this.style === Graph3d.STYLE.DOTSIZE) {

    var dotSize = this.frame.clientWidth * 0.02;

    var widthMin, widthMax;
    if (this.style === Graph3d.STYLE.DOTSIZE) {
      widthMin = dotSize / 2; // px
      widthMax = dotSize / 2 + dotSize * 2; // Todo: put this in one function
    }
    else {
      widthMin = 20; // px
      widthMax = 20; // px
    }

    var height = Math.max(this.frame.clientHeight * 0.25, 100);
    var top = this.margin;
    var right = this.frame.clientWidth - this.margin;
    var left = right - widthMax;
    var bottom = top + height;
  }

  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  ctx.font = '14px arial'; // TODO: put in options

  if (this.style === Graph3d.STYLE.DOTCOLOR) {
    // draw the color bar
    var ymin = 0;
    var ymax = height; // Todo: make height customizable
    for (y = ymin; y < ymax; y++) {
      var f = (y - ymin) / (ymax - ymin);

      //var width = (dotSize / 2 + (1-f) * dotSize * 2); // Todo: put this in one function
      var hue = f * 240;
      var color = this._hsv2rgb(hue, 1, 1);

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(left, top + y);
      ctx.lineTo(right, top + y);
      ctx.stroke();
    }

    ctx.strokeStyle =  this.colorAxis;
    ctx.strokeRect(left, top, widthMax, height);
  }

  if (this.style === Graph3d.STYLE.DOTSIZE) {
    // draw border around color bar
    ctx.strokeStyle =  this.colorAxis;
    ctx.fillStyle =  this.colorDot;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right - widthMax + widthMin, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (this.style === Graph3d.STYLE.DOTCOLOR ||
    this.style === Graph3d.STYLE.DOTSIZE) {
    // print values along the color bar
    var gridLineLen = 5; // px
    var step = new StepNumber(this.valueMin, this.valueMax, (this.valueMax-this.valueMin)/5, true);
    step.start();
    if (step.getCurrent() < this.valueMin) {
      step.next();
    }
    while (!step.end()) {
      y = bottom - (step.getCurrent() - this.valueMin) / (this.valueMax - this.valueMin) * height;

      ctx.beginPath();
      ctx.moveTo(left - gridLineLen, y);
      ctx.lineTo(left, y);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.colorAxis;
      ctx.fillText(step.getCurrent(), left - 2 * gridLineLen, y);

      step.next();
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    var label = this.legendLabel;
    ctx.fillText(label, right, bottom + this.margin);
  }
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
    var canvas = this.frame.canvas;
    var ctx = canvas.getContext('2d');

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
 * Redraw the axis
 */
Graph3d.prototype._redrawAxis = function() {
  var canvas = this.frame.canvas,
    ctx = canvas.getContext('2d'),
    from, to, step, prettyStep,
    text, xText, yText, zText,
    offset, xOffset, yOffset,
    xMin2d, xMax2d;

  // TODO: get the actual rendered style of the containerElement
  //ctx.font = this.containerElement.style.font;
  ctx.font = 24 / this.camera.getArmLength() + 'px arial';

  // calculate the length for the short grid lines
  var gridLenX = 0.025 / this.scale.x;
  var gridLenY = 0.025 / this.scale.y;
  var textMargin = 5 / this.camera.getArmLength(); // px
  var armAngle = this.camera.getArmRotation().horizontal;

  // draw x-grid lines
  ctx.lineWidth = 1;
  prettyStep = (this.defaultXStep === undefined);
  step = new StepNumber(this.xMin, this.xMax, this.xStep, prettyStep);
  step.start();
  if (step.getCurrent() < this.xMin) {
    step.next();
  }
  while (!step.end()) {
    var x = step.getCurrent();

    if (this.showGrid) {
      from = this._convert3Dto2D(new Point3d(x, this.yMin, this.zMin));
      to = this._convert3Dto2D(new Point3d(x, this.yMax, this.zMin));
      ctx.strokeStyle = this.colorGrid;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    else {
      from = this._convert3Dto2D(new Point3d(x, this.yMin, this.zMin));
      to = this._convert3Dto2D(new Point3d(x, this.yMin+gridLenX, this.zMin));
      ctx.strokeStyle = this.colorAxis;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      from = this._convert3Dto2D(new Point3d(x, this.yMax, this.zMin));
      to = this._convert3Dto2D(new Point3d(x, this.yMax-gridLenX, this.zMin));
      ctx.strokeStyle = this.colorAxis;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    yText = (Math.cos(armAngle) > 0) ? this.yMin : this.yMax;
    text = this._convert3Dto2D(new Point3d(x, yText, this.zMin));
    if (Math.cos(armAngle * 2) > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      text.y += textMargin;
    }
    else if (Math.sin(armAngle * 2) < 0){
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
    }
    else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
    }
    ctx.fillStyle = this.colorAxis;
    ctx.fillText('  ' + this.xValueLabel(step.getCurrent()) + '  ', text.x, text.y);    

    step.next();
  }

  // draw y-grid lines
  ctx.lineWidth = 1;
  prettyStep = (this.defaultYStep === undefined);
  step = new StepNumber(this.yMin, this.yMax, this.yStep, prettyStep);
  step.start();
  if (step.getCurrent() < this.yMin) {
    step.next();
  }
  while (!step.end()) {
    if (this.showGrid) {
      from = this._convert3Dto2D(new Point3d(this.xMin, step.getCurrent(), this.zMin));
      to = this._convert3Dto2D(new Point3d(this.xMax, step.getCurrent(), this.zMin));
      ctx.strokeStyle = this.colorGrid;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    else {
      from = this._convert3Dto2D(new Point3d(this.xMin, step.getCurrent(), this.zMin));
      to = this._convert3Dto2D(new Point3d(this.xMin+gridLenY, step.getCurrent(), this.zMin));
      ctx.strokeStyle = this.colorAxis;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      from = this._convert3Dto2D(new Point3d(this.xMax, step.getCurrent(), this.zMin));
      to = this._convert3Dto2D(new Point3d(this.xMax-gridLenY, step.getCurrent(), this.zMin));
      ctx.strokeStyle = this.colorAxis;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    xText = (Math.sin(armAngle ) > 0) ? this.xMin : this.xMax;
    text = this._convert3Dto2D(new Point3d(xText, step.getCurrent(), this.zMin));
    if (Math.cos(armAngle * 2) < 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      text.y += textMargin;
    }
    else if (Math.sin(armAngle * 2) > 0){
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
    }
    else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
    }
    ctx.fillStyle = this.colorAxis;
    ctx.fillText('  ' + this.yValueLabel(step.getCurrent()) + '  ', text.x, text.y);    

    step.next();
  }

  // draw z-grid lines and axis
  ctx.lineWidth = 1;
  prettyStep = (this.defaultZStep === undefined);
  step = new StepNumber(this.zMin, this.zMax, this.zStep, prettyStep);
  step.start();
  if (step.getCurrent() < this.zMin) {
    step.next();
  }
  xText = (Math.cos(armAngle ) > 0) ? this.xMin : this.xMax;
  yText = (Math.sin(armAngle ) < 0) ? this.yMin : this.yMax;
  while (!step.end()) {
    // TODO: make z-grid lines really 3d?
    from = this._convert3Dto2D(new Point3d(xText, yText, step.getCurrent()));
    ctx.strokeStyle = this.colorAxis;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x - textMargin, from.y);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.colorAxis;
    ctx.fillText(this.zValueLabel(step.getCurrent()) + ' ', from.x - 5, from.y);

    step.next();
  }
  ctx.lineWidth = 1;
  from = this._convert3Dto2D(new Point3d(xText, yText, this.zMin));
  to = this._convert3Dto2D(new Point3d(xText, yText, this.zMax));
  ctx.strokeStyle = this.colorAxis;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  // draw x-axis
  ctx.lineWidth = 1;
  // line at yMin
  xMin2d = this._convert3Dto2D(new Point3d(this.xMin, this.yMin, this.zMin));
  xMax2d = this._convert3Dto2D(new Point3d(this.xMax, this.yMin, this.zMin));
  ctx.strokeStyle = this.colorAxis;
  ctx.beginPath();
  ctx.moveTo(xMin2d.x, xMin2d.y);
  ctx.lineTo(xMax2d.x, xMax2d.y);
  ctx.stroke();
  // line at ymax
  xMin2d = this._convert3Dto2D(new Point3d(this.xMin, this.yMax, this.zMin));
  xMax2d = this._convert3Dto2D(new Point3d(this.xMax, this.yMax, this.zMin));
  ctx.strokeStyle = this.colorAxis;
  ctx.beginPath();
  ctx.moveTo(xMin2d.x, xMin2d.y);
  ctx.lineTo(xMax2d.x, xMax2d.y);
  ctx.stroke();

  // draw y-axis
  ctx.lineWidth = 1;
  // line at xMin
  from = this._convert3Dto2D(new Point3d(this.xMin, this.yMin, this.zMin));
  to = this._convert3Dto2D(new Point3d(this.xMin, this.yMax, this.zMin));
  ctx.strokeStyle = this.colorAxis;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  // line at xMax
  from = this._convert3Dto2D(new Point3d(this.xMax, this.yMin, this.zMin));
  to = this._convert3Dto2D(new Point3d(this.xMax, this.yMax, this.zMin));
  ctx.strokeStyle = this.colorAxis;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  // draw x-label
  var xLabel = this.xLabel;
  if (xLabel.length > 0) {
    yOffset = 0.1 / this.scale.y;
    xText = (this.xMin + this.xMax) / 2;
    yText = (Math.cos(armAngle) > 0) ? this.yMin - yOffset: this.yMax + yOffset;
    text = this._convert3Dto2D(new Point3d(xText, yText, this.zMin));
    if (Math.cos(armAngle * 2) > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
    }
    else if (Math.sin(armAngle * 2) < 0){
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
    }
    else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
    }
    ctx.fillStyle = this.colorAxis;
    ctx.fillText(xLabel, text.x, text.y);
  }

  // draw y-label
  var yLabel = this.yLabel;
  if (yLabel.length > 0) {
    xOffset = 0.1 / this.scale.x;
    xText = (Math.sin(armAngle ) > 0) ? this.xMin - xOffset : this.xMax + xOffset;
    yText = (this.yMin + this.yMax) / 2;
    text = this._convert3Dto2D(new Point3d(xText, yText, this.zMin));
    if (Math.cos(armAngle * 2) < 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
    }
    else if (Math.sin(armAngle * 2) > 0){
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
    }
    else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
    }
    ctx.fillStyle = this.colorAxis;
    ctx.fillText(yLabel, text.x, text.y);
  }

  // draw z-label
  var zLabel = this.zLabel;
  if (zLabel.length > 0) {
    offset = 30;  // pixels.  // TODO: relate to the max width of the values on the z axis?
    xText = (Math.cos(armAngle ) > 0) ? this.xMin : this.xMax;
    yText = (Math.sin(armAngle ) < 0) ? this.yMin : this.yMax;
    zText = (this.zMin + this.zMax) / 2;
    text = this._convert3Dto2D(new Point3d(xText, yText, zText));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.colorAxis;
    ctx.fillText(zLabel, text.x - offset, text.y);
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
  var canvas = this.frame.canvas,
    ctx = canvas.getContext('2d'),
    point, right, top, cross,
    i,
    topSideVisible, fillStyle, strokeStyle, lineWidth,
    h, s, v, zAvg;


  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return; // TODO: throw exception?

  // calculate the translations and screen position of all points
  for (i = 0; i < this.dataPoints.length; i++) {
    var trans = this._convertPointToTranslation(this.dataPoints[i].point);
    var screen = this._convertTranslationToScreen(trans);

    this.dataPoints[i].trans = trans;
    this.dataPoints[i].screen = screen;

    // calculate the translation of the point at the bottom (needed for sorting)
    var transBottom = this._convertPointToTranslation(this.dataPoints[i].bottom);
    this.dataPoints[i].dist = this.showPerspective ? transBottom.length() : -transBottom.z;
  }

  // sort the points on depth of their (x,y) position (not on z)
  var sortDepth = function (a, b) {
    return b.dist - a.dist;
  };
  this.dataPoints.sort(sortDepth);

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
            strokeStyle = this.colorAxis;
          }
        }
        else {
          fillStyle = 'gray';
          strokeStyle = this.colorAxis;
        }
        lineWidth = 0.5;

        ctx.lineWidth = lineWidth;
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(point.screen.x, point.screen.y);
        ctx.lineTo(right.screen.x, right.screen.y);
        ctx.lineTo(cross.screen.x, cross.screen.y);
        ctx.lineTo(top.screen.x, top.screen.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  else { // grid style
    for (i = 0; i < this.dataPoints.length; i++) {
      point = this.dataPoints[i];
      right = this.dataPoints[i].pointRight;
      top   = this.dataPoints[i].pointTop;

      if (point !== undefined) {
        if (this.showPerspective) {
          lineWidth = 2 / -point.trans.z;
        }
        else {
          lineWidth = 2 * -(this.eye.z / this.camera.getArmLength());
        }
      }

      if (point !== undefined && right !== undefined) {
        // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
        zAvg = (point.point.z + right.point.z) / 2;
        h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
        ctx.beginPath();
        ctx.moveTo(point.screen.x, point.screen.y);
        ctx.lineTo(right.screen.x, right.screen.y);
        ctx.stroke();
      }

      if (point !== undefined && top !== undefined) {
        // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
        zAvg = (point.point.z + top.point.z) / 2;
        h = (1 - (zAvg - this.zMin) * this.scale.z  / this.verticalRatio) * 240;

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = this._hsv2rgb(h, 1, 1);
        ctx.beginPath();
        ctx.moveTo(point.screen.x, point.screen.y);
        ctx.lineTo(top.screen.x, top.screen.y);
        ctx.stroke();
      }
    }
  }
};


/**
 * Draw all datapoints as dots.
 * This function can be used when the style is 'dot' or 'dot-line'
 */
Graph3d.prototype._redrawDataDot = function() {
  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');
  var i;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  // calculate the translations of all points
  for (i = 0; i < this.dataPoints.length; i++) {
    var trans = this._convertPointToTranslation(this.dataPoints[i].point);
    var screen = this._convertTranslationToScreen(trans);
    this.dataPoints[i].trans = trans;
    this.dataPoints[i].screen = screen;

    // calculate the distance from the point at the bottom to the camera
    var transBottom = this._convertPointToTranslation(this.dataPoints[i].bottom);
    this.dataPoints[i].dist = this.showPerspective ? transBottom.length() : -transBottom.z;
  }

  // order the translated points by depth
  var sortDepth = function (a, b) {
    return b.dist - a.dist;
  };
  this.dataPoints.sort(sortDepth);

  // draw the datapoints as colored circles
  var dotSize = this.frame.clientWidth * 0.02;  // px
  for (i = 0; i < this.dataPoints.length; i++) {
    var point = this.dataPoints[i];

    if (this.style === Graph3d.STYLE.DOTLINE) {
      // draw a vertical line from the bottom to the graph value
      //var from = this._convert3Dto2D(new Point3d(point.point.x, point.point.y, this.zMin));
      var from = this._convert3Dto2D(point.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = this.colorGrid;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(point.screen.x, point.screen.y);
      ctx.stroke();
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
      color = this.colorDot;
      borderColor = this.colorDotBorder;
    }
    else {
      // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
      hue = (1 - (point.point.z - this.zMin) * this.scale.z  / this.verticalRatio) * 240;
      color = this._hsv2rgb(hue, 1, 1);
      borderColor = this._hsv2rgb(hue, 1, 0.8);
    }

    // draw the circle
    ctx.lineWidth = 1.0;
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
  var canvas = this.frame.canvas;
  var ctx = canvas.getContext('2d');
  var i, j, surface, corners;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  // calculate the translations of all points
  for (i = 0; i < this.dataPoints.length; i++) {
    var trans = this._convertPointToTranslation(this.dataPoints[i].point);
    var screen = this._convertTranslationToScreen(trans);
    this.dataPoints[i].trans = trans;
    this.dataPoints[i].screen = screen;

    // calculate the distance from the point at the bottom to the camera
    var transBottom = this._convertPointToTranslation(this.dataPoints[i].bottom);
    this.dataPoints[i].dist = this.showPerspective ? transBottom.length() : -transBottom.z;
  }

  // order the translated points by depth
  var sortDepth = function (a, b) {
    return b.dist - a.dist;
  };
  this.dataPoints.sort(sortDepth);

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
      color = this.colorDot;
      borderColor = this.colorDotBorder;
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
    ctx.lineWidth = 1;
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
  var canvas = this.frame.canvas,
    ctx = canvas.getContext('2d'),
    point, i;

  if (this.dataPoints === undefined || this.dataPoints.length <= 0)
    return;  // TODO: throw exception?

  // calculate the translations of all points
  for (i = 0; i < this.dataPoints.length; i++) {
    var trans = this._convertPointToTranslation(this.dataPoints[i].point);
    var screen = this._convertTranslationToScreen(trans);

    this.dataPoints[i].trans = trans;
    this.dataPoints[i].screen = screen;
  }

  // start the line
  if (this.dataPoints.length > 0) {
    point = this.dataPoints[0];

    ctx.lineWidth = 1;    // TODO: make customizable
    ctx.strokeStyle = 'blue'; // TODO: make customizable
    ctx.beginPath();
    ctx.moveTo(point.screen.x, point.screen.y);
  }

  // draw the datapoints as colored circles
  for (i = 1; i < this.dataPoints.length; i++) {
    point = this.dataPoints[i];
    ctx.lineTo(point.screen.x, point.screen.y);
  }

  // finish the line
  if (this.dataPoints.length > 0) {
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
      '<tr><td>x:</td><td>' + dataPoint.point.x + '</td></tr>' +
      '<tr><td>y:</td><td>' + dataPoint.point.y + '</td></tr>' +
      '<tr><td>z:</td><td>' + dataPoint.point.z + '</td></tr>' +
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
