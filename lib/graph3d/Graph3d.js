var Emitter      = require('emitter-component');
var DataSet      = require('../DataSet');
var DataView     = require('../DataView');
var util         = require('../util');
var Point3d      = require('./Point3d');
var Point2d      = require('./Point2d');
var Camera       = require('./Camera');
var Filter       = require('./Filter');
var Slider       = require('./Slider');
var StepNumber   = require('./StepNumber');
var support      = require('./stylehandlers/Support');
var StyleHandler = require('./StyleHandler');


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
  this.width            = '400px';
  this.height           = '400px';
  this.margin           = 10; // px
  this.defaultXCenter   = '55%';
  this.defaultYCenter   = '50%';

  this.xLabel = 'x';
  this.yLabel = 'y';
  this.zLabel = 'z';

  var passValueFn = function(v) { return v; };
  this.xValueLabel = passValueFn;
  this.yValueLabel = passValueFn;
  this.zValueLabel = passValueFn;
  
  this.filterLabel = 'time';
  this.legendLabel = 'value';
  this.showLegend  = undefined; // auto by default (based on graph style)

  this.style           = StyleHandler.STYLE.DOT;
	this._styleHandler   = StyleHandler.init(this.style);
  this.showPerspective = true;
  this.showGrid        = true;
  this.keepAspectRatio = true;
  this.showShadow      = false;
  this.showGrayBottom  = false; // TODO: this does not work correctly
  this.showTooltip     = false;
  this.verticalRatio   = 0.5; // 0.1 to 1.0, where 1.0 results in a 'cube'

  this.animationInterval = 1000; // milliseconds
  this.animationPreload  = false;

  this.camera = new Camera();
  this.camera.setArmRotation(1.0, 0.5);
  this.camera.setArmLength(1.7);
  this.eye = new Point3d(0, 0, -1);  // TODO: set eye.z about 3/4 of the width of the window?

  this.dataTable = null;  // The original data table
  this.dataPoints = null; // The table with point objects

  // the column indexes
  this.colX      = undefined;
  this.colY      = undefined;
  this.colZ      = undefined;
  this.colValue  = undefined;
  this.colFilter = undefined;

  this.xMin      = 0;
  this.xStep     = undefined; // auto by default
  this.xMax      = 1;
  this.yMin      = 0;
  this.yStep     = undefined; // auto by default
  this.yMax      = 1;
  this.zMin      = 0;
  this.zStep     = undefined; // auto by default
  this.zMax      = 1;
  this.valueMin  = 0;
  this.valueMax  = 1;
  this.xBarWidth = 1;
  this.yBarWidth = 1;
  // TODO: customize axis range

  // colors
  this.axisColor = '#4D4D4D';
  this.gridColor = '#D3D3D3';
  this.dataColor = {
    fill: '#7DC1FF',
    stroke: '#3267D2',
    strokeWidth: 1  // px
  };

  this.dotSizeRatio = 0.02; // size of the dots as a fraction of the graph width

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
  var cameraLocation = this.camera.getCameraLocation();
  var cameraRotation = this.camera.getCameraRotation();

  var ax = point3d.x * this.scale.x;
  var ay = point3d.y * this.scale.y;
  var az = point3d.z * this.scale.z;

  var cx = cameraLocation.x;
  var cy = cameraLocation.y;
  var cz = cameraLocation.z;

  // calculate angles
  var sinTx = Math.sin(cameraRotation.x);
  var cosTx = Math.cos(cameraRotation.x);
  var sinTy = Math.sin(cameraRotation.y);
  var cosTy = Math.cos(cameraRotation.y);
  var sinTz = Math.sin(cameraRotation.z);
  var cosTz = Math.cos(cameraRotation.z);

  // calculate translation
  var factor0 = (sinTz * (ay - cy) + cosTz * (ax - cx));
  var factor1 = (cosTy * (az - cz) + sinTy * factor0);
  var factor2 = (cosTz * (ay - cy) - sinTz * (ax - cx));

  var dx      = cosTy * factor0 - sinTy * (az - cz);
  var dy      = sinTx * factor1 + cosTx * factor2;
  var dz      = cosTx * factor1 - sinTx * factor2;

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
    if (backgroundColor.fill        !== undefined) fill        = backgroundColor.fill;
    if (backgroundColor.stroke      !== undefined) stroke      = backgroundColor.stroke;
    if (backgroundColor.strokeWidth !== undefined) strokeWidth = backgroundColor.strokeWidth;
  }
  else if  (backgroundColor === undefined) {
    // use defaults
  }
  else {
    throw 'Unsupported type of backgroundColor';
  }

  this.frame.style.backgroundColor = fill;
  this.frame.style.borderColor = stroke;
  this.frame.style.borderWidth = strokeWidth + 'px';
  this.frame.style.borderStyle = 'solid';
};


// Enumerate the available styles
// This definition retained for external compatibility (It should be internal, but you never know)
Graph3d.STYLE = StyleHandler.STYLE; 


/**
 * Determine the indexes of the data columns, based on the given style and data
 * @param {DataSet} data
 * @param {Number}  style
 *
 * -----------------------------------------------------------------------------------
 * NOTE:
 *
 * * This method was not being called upon starting the style handler refactoring.
 * * Filled in for completeness.
 *
 * It actually looks superfluous, because:
 *
 * * The point at which is was commented out, is in dataInitialize(). directly after
 * the call, the set values are overwritten with other fixed *string* values.
 *
 * * Not clear what to pass as parameter.
 *
 * TODO: Check if this is necessary; if not remove it and also member var numberOfColumns
 *       in the style handlers.
 *
 * -----------------------------------------------------------------------------------
 */
/* DISABLED FOR NOW 
Graph3d.prototype._determineColumnIndexes = function(data) {
	// Expect values of following: 3 or 4
	var numColumnsExpected = this._styleHandler.numberOfColumns;

  this.colX = 0;
  this.colY = 1;
  this.colZ = 2;

  if (numColumnsExpected == 3) {
    this.colValue = undefined;
  } else {
    this.colValue = 3;
  }

  // optionally an extra columns with filter values
  if (this.getNumberOfColumns(data) > numColumnsExpected) {
    this.colFilter = numColumnsExpected + 1;
   }
};
*/


Graph3d.prototype.getNumberOfRows = function(data) {
  return data.length;
};


Graph3d.prototype.getNumberOfColumns = function(data) {
  var counter = 0;
  for (var column in data[0]) {
    if (data[0].hasOwnProperty(column)) {
      counter++;
    }
  }
  return counter;
};


Graph3d.prototype.getDistinctValues = function(data, column) {
	var values         = data.get();
  var distinctValues = [];

  for (var i in values) {
    var value = values[i][column];

    if (distinctValues.indexOf(value) == -1) {
      distinctValues.push(value);
    }
  }

  return distinctValues;
};


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

  this.dataSet   = rawData;
  this.dataTable = data;

  // subscribe to changes in the dataset
  this._onChange = function () {
    me.setData(me.dataSet);
  };
  this.dataSet.on('*', this._onChange);

  //this._determineColumnIndexes();
  // getNumberOfRows (points)
  // getNumberOfColumns (x,y,z,v,t,t1,t2...)
  // getDistinctValues (unique values?)
  // getColumnRange

  // determine the location of x,y,z,value,filter columns
  this.colX      = 'x';
  this.colY      = 'y';
  this.colZ      = 'z';
  this.colValue  = 'style';
  this.colFilter = 'filter';



  // check if a filter column is provided
  if (data[0].hasOwnProperty('filter')) {
    if (this.dataFilter === undefined) {
      this.dataFilter = new Filter(rawData, this.colFilter, this);
      this.dataFilter.setOnLoadCallback(function() {me.redraw();});
    }
  }


  var xRange = this.getColumnRange(data, this.colX);
  var yRange = this.getColumnRange(data, this.colY);

  // For Bar graphs, take bar dimensions into account
	this._styleHandler.adjustForBarWidth(this, xRange, yRange);

  // calculate minimums and maximums
  this.xMin = (this.defaultXMin !== undefined) ? this.defaultXMin : xRange.min;
  this.xMax = (this.defaultXMax !== undefined) ? this.defaultXMax : xRange.max;
  if (this.xMax <= this.xMin) this.xMax = this.xMin + 1;
  this.xStep = (this.defaultXStep !== undefined) ? this.defaultXStep : (this.xMax-this.xMin)/5;

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
  
  // these styles default to having legends
  var isLegendGraphStyle =  this.style === Graph3d.STYLE.DOTCOLOR || this.style === Graph3d.STYLE.DOTSIZE;
  this.showLegend        =  (this.defaultShowLegend !== undefined) ? this.defaultShowLegend : isLegendGraphStyle;
                                                             
  // set the scale dependent on the ranges.
  this._setScale();
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
  var onmousedown  = function (event) {me._onMouseDown(event);};
  var ontouchstart = function (event) {me._onTouchStart(event);};
  var onmousewheel = function (event) {me._onWheel(event);};
  var ontooltip    = function (event) {me._onTooltip(event);};
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
  this.frame.canvas.style.width  = '100%';
  this.frame.canvas.style.height = '100%';

  this.frame.canvas.width  = this.frame.canvas.clientWidth;
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
 *
 * TODO: test filter redrawing here
 */
Graph3d.prototype._readData = function(data) {
  // read the data
  this._dataInitialize(data, this.style);


  if (this.dataFilter) {
    // apply filtering
    this.dataPoints = this.dataFilter._getDataPoints();

    // draw the filter
    this._redrawFilter();
  }
  else {
    // no filtering. load all data
    this.dataPoints = this._styleHandler.getDataPoints(this, this.dataTable);
    this.frame.filter.slider = undefined;
  }
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
  this.animationStop();

  if (options !== undefined) {

		var copy_fields = [
      'width',
      'height',
      'xCenter',
      'yCenter',
      'filterLabel',
      'legendLabel',
      'xLabel',
      'yLabel',
      'zLabel',
      'xValueLabel',
      'yValueLabel',
      'zValueLabel',
      'dotSizeRatio',
      'showGrid',
      'showPerspective',
      'showShadow',
      'showAnimationControls',
      'keepAspectRatio',
      'verticalRatio',
      'animationInterval',
      'animationPreload',
      'animationAutoStart',
      'xBarWidth',
      'yBarWidth',
      'xMin',
      'xStep',
      'xMax',
      'yMin',
      'yStep',
      'yMax',
      'zMin',
      'zStep',
      'zMax',
      'valueMin',
      'valueMax',
      'axisColor',
      'gridColor'
    ];

    // retrieve simple parameter values
    support.safe_copy(options, this, copy_fields);

		//
		// Special handling for certain parameters	
		//

    if (options.style !== undefined) {
      var styleNumber = StyleHandler.getStyleNumber(options.style);

      if (styleNumber !== -1) {
        this.style = styleNumber;
				this._styleHandler = StyleHandler.init(this.style);
      }
    }

    if (options.showLegend      !== undefined) this.defaultShowLegend = options.showLegend; 
    if (options.tooltip         !== undefined) this.showTooltip       = options.tooltip;
    if (options.backgroundColor !== undefined) this._setBackgroundColor(options.backgroundColor);

    if (options.cameraPosition !== undefined) {
      var cameraPosition = options.cameraPosition;
      this.camera.setArmRotation(cameraPosition.horizontal, cameraPosition.vertical);
      this.camera.setArmLength(cameraPosition.distance);
    }

    // colors
    if (options.dataColor) {
      if (typeof options.dataColor === 'string') {
        this.dataColor.fill   = options.dataColor;
        this.dataColor.stroke = options.dataColor;
      }
      else {
        if (options.dataColor.fill) {
          this.dataColor.fill = options.dataColor.fill;
        }
        if (options.dataColor.stroke) {
          this.dataColor.stroke = options.dataColor.stroke;
        }
        if (options.dataColor.strokeWidth !== undefined) {
          this.dataColor.strokeWidth = options.dataColor.strokeWidth;
        }
      }
    }
    
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
	//console.log("Graph3d.prototype.redraw() called");

  if (this.dataPoints === undefined) {
    throw 'Error: graph data not initialized';
  }

  this._resizeCanvas();
  this._resizeCenter();
  this._redrawSlider();
  this._redrawClear();
  this._redrawAxis();

	StyleHandler.redraw(this);

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
 * Redraw the legend based on size, dot color, or surface height 
 */
Graph3d.prototype._redrawLegend = function() {
  //Return without drawing anything, if no legend is specified 
  if (this.showLegend !== true) return;

  var ctx = this.getContext();
  ctx.lineWidth = 1;
  ctx.font = '14px arial'; // TODO: put in options

  this._styleHandler.drawLegend(this, ctx);
};


/**
 * Redraw the filter
 */
Graph3d.prototype._redrawFilter = function() {
  this.frame.filter.innerHTML = '';

  if (this.dataFilter) {
    throw("Method _redrawFilter() should only be called if filter data available.");
  }

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
      ctx.strokeStyle = this.gridColor;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    else {
      from = this._convert3Dto2D(new Point3d(x, this.yMin, this.zMin));
      to = this._convert3Dto2D(new Point3d(x, this.yMin+gridLenX, this.zMin));
      ctx.strokeStyle = this.axisColor;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      from = this._convert3Dto2D(new Point3d(x, this.yMax, this.zMin));
      to = this._convert3Dto2D(new Point3d(x, this.yMax-gridLenX, this.zMin));
      ctx.strokeStyle = this.axisColor;
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
    ctx.fillStyle = this.axisColor;
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
      ctx.strokeStyle = this.gridColor;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    else {
      from = this._convert3Dto2D(new Point3d(this.xMin, step.getCurrent(), this.zMin));
      to = this._convert3Dto2D(new Point3d(this.xMin+gridLenY, step.getCurrent(), this.zMin));
      ctx.strokeStyle = this.axisColor;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      from = this._convert3Dto2D(new Point3d(this.xMax, step.getCurrent(), this.zMin));
      to = this._convert3Dto2D(new Point3d(this.xMax-gridLenY, step.getCurrent(), this.zMin));
      ctx.strokeStyle = this.axisColor;
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
    ctx.fillStyle = this.axisColor;
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
    ctx.strokeStyle = this.axisColor;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(from.x - textMargin, from.y);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.axisColor;
    ctx.fillText(this.zValueLabel(step.getCurrent()) + ' ', from.x - 5, from.y);

    step.next();
  }
  ctx.lineWidth = 1;
  from = this._convert3Dto2D(new Point3d(xText, yText, this.zMin));
  to = this._convert3Dto2D(new Point3d(xText, yText, this.zMax));
  ctx.strokeStyle = this.axisColor;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  // draw x-axis
  ctx.lineWidth = 1;
  // line at yMin
  xMin2d = this._convert3Dto2D(new Point3d(this.xMin, this.yMin, this.zMin));
  xMax2d = this._convert3Dto2D(new Point3d(this.xMax, this.yMin, this.zMin));
  ctx.strokeStyle = this.axisColor;
  ctx.beginPath();
  ctx.moveTo(xMin2d.x, xMin2d.y);
  ctx.lineTo(xMax2d.x, xMax2d.y);
  ctx.stroke();
  // line at ymax
  xMin2d = this._convert3Dto2D(new Point3d(this.xMin, this.yMax, this.zMin));
  xMax2d = this._convert3Dto2D(new Point3d(this.xMax, this.yMax, this.zMin));
  ctx.strokeStyle = this.axisColor;
  ctx.beginPath();
  ctx.moveTo(xMin2d.x, xMin2d.y);
  ctx.lineTo(xMax2d.x, xMax2d.y);
  ctx.stroke();

  // draw y-axis
  ctx.lineWidth = 1;
  // line at xMin
  from = this._convert3Dto2D(new Point3d(this.xMin, this.yMin, this.zMin));
  to = this._convert3Dto2D(new Point3d(this.xMin, this.yMax, this.zMin));
  ctx.strokeStyle = this.axisColor;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  // line at xMax
  from = this._convert3Dto2D(new Point3d(this.xMax, this.yMin, this.zMin));
  to = this._convert3Dto2D(new Point3d(this.xMax, this.yMax, this.zMin));
  ctx.strokeStyle = this.axisColor;
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
    ctx.fillStyle = this.axisColor;
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
    ctx.fillStyle = this.axisColor;
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
    ctx.fillStyle = this.axisColor;
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
  //console.log("Called Graph3d.prototype._dataPointFromXY()");
	return this._styleHandler.dataPointFromXY(this, x, y);
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


Graph3d.prototype.getContext = function () {
  var canvas = this.frame.canvas;
  return canvas.getContext('2d');
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
