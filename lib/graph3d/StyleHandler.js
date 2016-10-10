////////////////////////////////////////////
// Style Handlers
//
//
// Todo
// ====
//
// * Upon pull request: check tabs -> spaces.
//
// * Data member 'numberOfColumns' *only* used in Graph3D.prototype._determineColumnIndexes(), which
//  is commented out. Remove this data member from all style handlers if method mentioned removed.
// 
//
// Notes
// =====
// - The goal is to leave the classes stateless, hence avoiding to need to call the
//   parent constructor in a given child constructor.
//
// - For several levels of inheritance, this leads to a number of chained prototypes.
//   Since the 3D graphs should be as responsive as possible, this might not be a good idea.
//
//
// Inheritance
// ===========
//
// The code pattern here for inheritance is:
//
//   function Derived() {
// 	   Base.call(this);
//   }
//   Derived.prototype = Object.create(Base.prototype);
//   Derived.prototype.constructor = Derived;
//
// Source for settings up classes with inheritance:
//
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript
//
// 
////////////////////////////////////////////
var Point3d      = require('./Point3d');
var Point2d      = require('./Point2d');
var StepNumber   = require('./StepNumber');


// Start namespace
(function(StyleHandler, $, undefined) {


/////////////////////////////
// Private Definitions
/////////////////////////////


function derive(child, parent) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
}


/**
 * Calculate the translations and screen positions of all points
 */
function calcTranslations(graph3d, points, sort) {
	//console.log("Called calcTranslations");
	if (sort === undefined) {
		sort = true;
	}

  for (var i = 0; i < points.length; i++) {
    var point    = points[i];
    point.trans  = graph3d._convertPointToTranslation(point.point);
    point.screen = graph3d._convertTranslationToScreen(point.trans);

    // calculate the translation of the point at the bottom (needed for sorting)
    var transBottom = graph3d._convertPointToTranslation(point.bottom);
    point.dist = graph3d.showPerspective ? transBottom.length() : -transBottom.z;
  }

  // sort the points on depth of their (x,y) position (not on z)
	if (sort) {
    var sortDepth = function (a, b) {
      return b.dist - a.dist;
    };
    points.sort(sortDepth);
  }
}


//--------------------------
// Class BaseStyleHandler
//--------------------------

function BaseStyleHandler() {
	this.numberOfColumns = 3;
}

BaseStyleHandler.prototype.drawLegend        = function(graph3d) {};
BaseStyleHandler.prototype.adjustForBarWidth = function(graph3d, xRange, yRange) {};


/**
 * Filter the data based on the current filter
 *
 * This method for 'dot', 'dot-line', etc.
 *
 * @param {Array} data
 * @return {Array} dataPoints   Array with point objects which can be drawn on screen
 */
BaseStyleHandler.prototype.getDataPoints = function(graph3d, data) {
  //console.log("Called BaseStyleHandler.prototype.getDataPoints()");

  var i, obj, point;
  var dataPoints = [];

  var colX = graph3d.colX;
  var colY = graph3d.colY;
  var colZ = graph3d.colZ;

  // copy all values from the google data table to a list with Point3d objects
  for (i = 0; i < data.length; i++) {
    point = new Point3d();
    point.x = data[i][colX] || 0;
    point.y = data[i][colY] || 0;
    point.z = data[i][colZ] || 0;

    if (graph3d.colValue !== undefined) {
      point.value = data[i][graph3d.colValue] || 0;
    }

    obj = {};
    obj.point  = point;
    obj.bottom = new Point3d(point.x, point.y, graph3d.zMin);
    obj.trans  = undefined;
    obj.screen = undefined;

    dataPoints.push(obj);
  }

  return dataPoints;
};


/**
 * Find a data point close to given screen position (x, y)
 */
BaseStyleHandler.prototype.dataPointFromXY = function(graph3d, x, y) {
  var distMax          = 100; // px
  var closestDist      = null;
  var closestDataPoint = null;

  // find the closest data point, using distance to the center of the point on 2d screen
  for (var i = 0; i < graph3d.dataPoints.length; i++) {
    var dataPoint = graph3d.dataPoints[i];
    var point     = dataPoint.screen;

    if (point) {
      var distX = Math.abs(x - point.x);
      var distY = Math.abs(y - point.y);
      var dist  = Math.sqrt(distX * distX + distY * distY);

      if ((closestDist === null || dist < closestDist) && dist < distMax) {
        closestDist      = dist;
        closestDataPoint = dataPoint;
      }
    }
  }

  return closestDataPoint;
};


//--------------------------
// Class MatrixStyleHandler
//--------------------------

function MatrixStyleHandler() {
	BaseStyleHandler.call(this);
}
derive(MatrixStyleHandler, BaseStyleHandler);


/**
 * Override of method in parent class.
 */
MatrixStyleHandler.prototype.getDataPoints = function(graph3d, data) {
  //console.log("Called MatrixStyleHandler.prototype.getDataPoints()");

  // TODO: store the created matrix dataPoints in the filters instead of reloading each time
  var x, y, i, z, obj, point;
  var dataPoints = [];

  var colX = graph3d.colX;
  var colY = graph3d.colY;
  var colZ = graph3d.colZ;

  // copy all values from the google data table to a matrix
  // the provided values are supposed to form a grid of (x,y) positions

  // create two lists with all present x and y values
  var dataX = [];
  var dataY = [];
  for (i = 0; i < graph3d.getNumberOfRows(data); i++) {
    x = data[i][colX] || 0;
    y = data[i][colY] || 0;

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
    var point = new Point3d();
    point.x = data[i][colX] || 0;
    point.y = data[i][colY] || 0;
    point.z = data[i][colZ] || 0;

    var xIndex = dataX.indexOf(point.x);  // TODO: implement Array().indexOf() for Internet Explorer
    var yIndex = dataY.indexOf(point.y);

    if (dataMatrix[xIndex] === undefined) {
      dataMatrix[xIndex] = [];
    }

    obj = {};
    obj.point  = point;
    obj.bottom = new Point3d(point.x, point.y, graph3d.zMin);
    obj.trans  = undefined;
    obj.screen = undefined;

    dataMatrix[xIndex][yIndex] = obj;

    dataPoints.push(obj);
  }

  // fill in the pointers to the neighbors.
  for (x = 0; x < dataMatrix.length; x++) {
    for (y = 0; y < dataMatrix[x].length; y++) {
			var d = dataMatrix[x][y];
      if (!d) continue;

      d.pointRight = (x < dataMatrix.length-1)    ? dataMatrix[x+1][y] : undefined;
      d.pointTop   = (y < dataMatrix[x].length-1) ? dataMatrix[x][y+1] : undefined;
      d.pointCross =
        (x < dataMatrix.length-1 && y < dataMatrix[x].length-1) ?
          dataMatrix[x+1][y+1] :
          undefined;
    }
  }

  return dataPoints;
};


MatrixStyleHandler.prototype.redraw = function(graph3d, sort) {
	var points = graph3d.dataPoints;
  if (points === undefined || points.length <= 0)
    return; // TODO: throw exception?

  var ctx      = graph3d.getContext();
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

	calcTranslations(graph3d, points);

  for (var i = 0; i < points.length; i++) {
    var point = points[i];
	  this.redrawPoint(graph3d, ctx, point);
	}
};


//--------------------------
// Class PointStyleHandler
//--------------------------

function PointStyleHandler() {
	BaseStyleHandler.call(this);
}
derive(PointStyleHandler, BaseStyleHandler);


/**
 * Draw all datapoints as dots.
 * This function can be used when the style is 'dot' or 'dot-line'
 */
PointStyleHandler.prototype.redraw = function(graph3d) {
  var points = graph3d.dataPoints;
  if (points === undefined || points.length <= 0)
    return;  // TODO: throw exception?

  var ctx = graph3d.getContext();

	calcTranslations(graph3d, points);

  // draw the datapoints as colored circles
  var dotSize = graph3d.frame.clientWidth * graph3d.dotSizeRatio;  // px
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
		this.redrawPoint(graph3d, ctx, point, dotSize);
  }
};


PointStyleHandler.prototype._calcRadius = function(graph3d, point, size) {
  var radius;
  if (graph3d.showPerspective) {
    radius = size / -point.trans.z;
  }
  else {
    radius = size * - (graph3d.eye.z / graph3d.camera.getArmLength());
  }
  if (radius < 0) {
    radius = 0;
  }

  return radius;
}


PointStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
  var hue = (1 - (point.point.z - graph3d.zMin) * graph3d.scale.z  / graph3d.verticalRatio) * 240;

	return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


PointStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, size) {
	//console.log("Called PointStyleHandler.prototype.redrawPoint()");

  var radius = this._calcRadius(graph3d, point, size);
  var colors = this.getColor(graph3d, point);

  // draw the circle
  ctx.lineWidth   = graph3d._getStrokeWidth(point);
  ctx.strokeStyle = colors.borderColor;
  ctx.fillStyle   = colors.color;
  ctx.beginPath();
  ctx.arc(point.screen.x, point.screen.y, radius, 0, Math.PI*2, true);
  ctx.fill();
  ctx.stroke();
};


//--------------------------
// Class BarParentStyleHandler
//--------------------------

function BarParentStyleHandler() {
	BaseStyleHandler.call(this);
}
derive(BarParentStyleHandler, BaseStyleHandler);


/**
 * Draw all datapoints as bars.
 * This function can be used when the style is 'bar', 'bar-color', or 'bar-size'
 */
BarParentStyleHandler.prototype.redraw = function(graph3d) {
	var points = graph3d.dataPoints;
  if (points === undefined || points.length <= 0)
    return; // TODO: throw exception?

  var ctx      = graph3d.getContext();
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

	calcTranslations(graph3d, points);

  // draw the datapoints as bars
  var xWidth = graph3d.xBarWidth / 2;
  var yWidth = graph3d.yBarWidth / 2;

  for (var i = 0; i < points.length; i++) {
    var point  = points[i];

    this.redrawPoint(graph3d, ctx, point, xWidth, yWidth);
  }
};


BarParentStyleHandler.prototype.adjustForBarWidth = function(graph3d, xRange, yRange) {
	//console.log("Called BarParentStyleHandler.prototype.adjustForBarWidth");

  if (graph3d.defaultXBarWidth !== undefined) {
    graph3d.xBarWidth = graph3d.defaultXBarWidth;
  }
  else {
    var dataX = graph3d.getDistinctValues(data, graph3d.colX);
    graph3d.xBarWidth = (dataX[1] - dataX[0]) || 1;
  }

  if (graph3d.defaultYBarWidth !== undefined) {
    graph3d.yBarWidth = graph3d.defaultYBarWidth;
  }
  else {
    var dataY = graph3d.getDistinctValues(data, graph3d.colY);
    graph3d.yBarWidth = (dataY[1] - dataY[0]) || 1;
  }

  xRange.min -= graph3d.xBarWidth / 2;
  xRange.max += graph3d.xBarWidth / 2;

  yRange.min -= graph3d.yBarWidth / 2;
  yRange.max += graph3d.yBarWidth / 2;
};


BarParentStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, xWidth, yWidth) {
  var i, j, surface, corners;
  var colors = this.getColor(graph3d, point);

  // calculate all corner points
  var me = graph3d;
  var point3d = point.point;
  var top = [
    {point: new Point3d(point3d.x - xWidth, point3d.y - yWidth, point3d.z)},
    {point: new Point3d(point3d.x + xWidth, point3d.y - yWidth, point3d.z)},
    {point: new Point3d(point3d.x + xWidth, point3d.y + yWidth, point3d.z)},
    {point: new Point3d(point3d.x - xWidth, point3d.y + yWidth, point3d.z)}
  ];
  var bottom = [
    {point: new Point3d(point3d.x - xWidth, point3d.y - yWidth, graph3d.zMin)},
    {point: new Point3d(point3d.x + xWidth, point3d.y - yWidth, graph3d.zMin)},
    {point: new Point3d(point3d.x + xWidth, point3d.y + yWidth, graph3d.zMin)},
    {point: new Point3d(point3d.x - xWidth, point3d.y + yWidth, graph3d.zMin)}
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
    var transCenter = graph3d._convertPointToTranslation(surface.center);
    surface.dist = graph3d.showPerspective ? transCenter.length() : -transCenter.z;
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
  ctx.lineWidth   = graph3d._getStrokeWidth(point);
  ctx.strokeStyle = colors.borderColor;
  ctx.fillStyle   = colors.color;

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
};


/**
 * Find a data point close to given screen position (x, y)
 *
 * This is an override of the method in the parent class.
 *
 * TODO: Check necessity of this method; the (placement of) the tooltips seems
 *       to be just fine without it.
 */
BarParentStyleHandler.prototype.dataPointFromXY = function(graph3d, x, y) {
  var center = new Point2d(x, y);

  // the data points are ordered from far away to closest
  for (var i = graph3d.dataPoints.length - 1; i >= 0; i--) {
    var dataPoint = graph3d.dataPoints[i];
    var surfaces  = dataPoint.surfaces;

    if (surfaces) {
      for (var s = surfaces.length - 1; s >= 0; s--) {
        // split each surface in two triangles, and see if the center point is inside one of these
        var surface   = surfaces[s];
        var corners   = surface.corners;
        var triangle1 = [corners[0].screen, corners[1].screen, corners[2].screen];
        var triangle2 = [corners[2].screen, corners[3].screen, corners[0].screen];

        if (graph3d._insideTriangle(center, triangle1) ||
            graph3d._insideTriangle(center, triangle2)) {
          // return immediately at the first hit
          return dataPoint;
        }
      }
    }
  }

  return null;
};


/////////////////////////////
// Leaf Classes
/////////////////////////////


//--------------------------
// Class DotStyleHandler
//--------------------------

function DotStyleHandler() {
	PointStyleHandler.call(this);
}
derive(DotStyleHandler, PointStyleHandler);


//--------------------------
// Class DotLineStyleHandler
//--------------------------

function DotLineStyleHandler() {
	PointStyleHandler.call(this);
}
derive(DotLineStyleHandler, PointStyleHandler);

DotLineStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, dotSize) {
	//console.log("Called DotLineStyleHandler.prototype.redrawPoint()");

  // draw a vertical line from the bottom to the graph value
  //var from = this._convert3Dto2D(new Point3d(point.point.x, point.point.y, this.zMin));
  var from = graph3d._convert3Dto2D(point.bottom);
  ctx.lineWidth = 1;
  ctx.strokeStyle = graph3d.gridColor;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(point.screen.x, point.screen.y);
  ctx.stroke();

  PointStyleHandler.prototype.redrawPoint.call(this, graph3d, ctx, point, dotSize);
};


//--------------------------
// Class DotColorStyleHandler
//--------------------------

function DotColorStyleHandler() {
	PointStyleHandler.call(this);

	this.numberOfColumns = 4;
}
derive(DotColorStyleHandler, PointStyleHandler);


/**
 * Override of parent method.
 */
DotColorStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate the color based on the value
  var hue = (1 - (point.point.value - graph3d.valueMin) * graph3d.scale.value) * 240;

	return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


/**
 * Redraw the legend showing the colors
 */
// TODO: consolidate with DotSizeStyleHandler.prototype.drawLegend
DotColorStyleHandler.prototype.drawLegend = function(graph3d) {
  var dotSize  = graph3d.frame.clientWidth * graph3d.dotSizeRatio;
  var widthMin = 20; // px
  var widthMax = 20; // px

  var height = Math.max(graph3d.frame.clientHeight * 0.25, 100);
  var top    = graph3d.margin;
  var right  = graph3d.frame.clientWidth - graph3d.margin;
  var left   = right - widthMax;
  var bottom = top + height;

  var ctx       = graph3d.getContext();
  ctx.lineWidth = 1;
  ctx.font      = '14px arial'; // TODO: put in options

  // draw the color bar
  var ymin = 0;
  var ymax = height; // Todo: make height customizable

  for (var y = ymin; y < ymax; y++) {
    var f = (y - ymin) / (ymax - ymin);

    //var width = (dotSize / 2 + (1-f) * dotSize * 2); // Todo: put this in one function
    var hue = f * 240;
    var color = graph3d._hsv2rgb(hue, 1, 1);

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(left, top + y);
    ctx.lineTo(right, top + y);
    ctx.stroke();
  }

  ctx.strokeStyle =  graph3d.axisColor;
  ctx.strokeRect(left, top, widthMax, height);

  // print values along the color bar
  var gridLineLen = 5; // px
  var step = new StepNumber(graph3d.valueMin, graph3d.valueMax, (graph3d.valueMax-graph3d.valueMin)/5, true);
  step.start();
  if (step.getCurrent() < graph3d.valueMin) {
    step.next();
  }
  while (!step.end()) {
    y = bottom - (step.getCurrent() - graph3d.valueMin) / (graph3d.valueMax - graph3d.valueMin) * height;

    ctx.beginPath();
    ctx.moveTo(left - gridLineLen, y);
    ctx.lineTo(left, y);
    ctx.stroke();

    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = graph3d.axisColor;
    ctx.fillText(step.getCurrent(), left - 2 * gridLineLen, y);

    step.next();
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  var label = graph3d.legendLabel;
  ctx.fillText(label, right, bottom + graph3d.margin);
};


//--------------------------
// Class DotSizeStyleHandler
//--------------------------

function DotSizeStyleHandler() {
	PointStyleHandler.call(this);

	this.numberOfColumns = 4;
};
derive(DotSizeStyleHandler, PointStyleHandler);


/**
 * Override of parent method.
 */
DotSizeStyleHandler.prototype.getColor = function(graph3d, point) {
	return {
    color      : graph3d.dataColor.fill,
    borderColor: graph3d.dataColor.stroke
  };
};


DotSizeStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, dotSize) {
	//console.log("Called DotSizeStyleHandler.prototype.redrawPoint()");

  // calculate radius for the circle
  var size;
  size = dotSize/2 + 2*dotSize * (point.point.value - graph3d.valueMin) / (graph3d.valueMax - graph3d.valueMin);

  PointStyleHandler.prototype.redrawPoint.call(this, graph3d, ctx, point, size);
};


/**
 * Redraw the legend showing the colors
 */
// TODO: consolidate with DotColorStyleHandler.prototype.drawLegend
DotSizeStyleHandler.prototype.drawLegend = function(graph3d) {
  var dotSize  = graph3d.frame.clientWidth * graph3d.dotSizeRatio;
  var widthMin = dotSize / 2; // px
  var widthMax = dotSize / 2 + dotSize * 2; // Todo: put this in one function

  var height = Math.max(graph3d.frame.clientHeight * 0.25, 100);
  var top    = graph3d.margin;
  var right  = graph3d.frame.clientWidth - graph3d.margin;
  var left   = right - widthMax;
  var bottom = top + height;

  var ctx       = graph3d.getContext();
  ctx.lineWidth = 1;
  ctx.font = '14px arial'; // TODO: put in options

  // draw border around color bar
  ctx.strokeStyle =  graph3d.axisColor;
  ctx.fillStyle   =  graph3d.dataColor.fill;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right - widthMax + widthMin, bottom);
  ctx.lineTo(left, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // print values along the color bar
  var gridLineLen = 5; // px
  var step = new StepNumber(graph3d.valueMin, graph3d.valueMax, (graph3d.valueMax - graph3d.valueMin)/5, true);
  step.start();
  if (step.getCurrent() < graph3d.valueMin) {
    step.next();
  }
  while (!step.end()) {
    var y = bottom - (step.getCurrent() - graph3d.valueMin) / (graph3d.valueMax - graph3d.valueMin) * height;

    ctx.beginPath();
    ctx.moveTo(left - gridLineLen, y);
    ctx.lineTo(left, y);
    ctx.stroke();

    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = graph3d.axisColor;
    ctx.fillText(step.getCurrent(), left - 2 * gridLineLen, y);

    step.next();
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  var label = this.legendLabel;
  ctx.fillText(label, right, bottom + this.margin);
};


//--------------------------
// Class LineStyleHandler
//--------------------------

// No need for a parent class here (for now)
function LineStyleHandler() {
	BaseStyleHandler.call(this);
}
derive(LineStyleHandler, BaseStyleHandler);


/**
 * Draw a line through all datapoints.
 */
LineStyleHandler.prototype.redraw = function(graph3d) {
	var points = graph3d.dataPoints;
  if (points === undefined || points.length <= 0)
    return; // TODO: throw exception?

  var ctx = graph3d.getContext();

	calcTranslations(graph3d, points, false);

  // start the line
  if (points.length > 0) {
    var point = points[0];

    ctx.lineWidth   = graph3d._getStrokeWidth(point);
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.strokeStyle = graph3d.dataColor.stroke;
    ctx.beginPath();
    ctx.moveTo(point.screen.x, point.screen.y);

    for (var i = 1; i < points.length; i++) {
      point = points[i];
      ctx.lineTo(point.screen.x, point.screen.y);
    }

    // finish the line
    ctx.stroke();
  }
};


//--------------------------
// Class GridStyleHandler
//--------------------------

function GridStyleHandler() {
	MatrixStyleHandler.call(this);
}
derive(GridStyleHandler, MatrixStyleHandler);


GridStyleHandler.prototype._gridLine = function(graph3d, ctx, from, to) {
  if (to === undefined) return;

  // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
  var zAvg = (from.point.z + to.point.z) / 2;
  var h    = (1 - (zAvg - graph3d.zMin) * graph3d.scale.z  / graph3d.verticalRatio) * 240;

  ctx.lineWidth   = graph3d._getStrokeWidth(from) * 2;
  ctx.strokeStyle = graph3d._hsv2rgb(h, 1, 1);
  ctx.beginPath();
  ctx.moveTo(from.screen.x, from.screen.y);
  ctx.lineTo(to.screen.x  , to.screen.y  );
  ctx.stroke();
};


GridStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point) {
  if (point === undefined) return; 

  var right = point.pointRight;
  var top   = point.pointTop;

	this._gridLine(graph3d, ctx, point, right);
	this._gridLine(graph3d, ctx, point, top);
};


//--------------------------
// Class SurfaceStyleHandler
//--------------------------

function SurfaceStyleHandler() {
	MatrixStyleHandler.call(this);
}
derive(SurfaceStyleHandler, MatrixStyleHandler);


SurfaceStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point) {
  if (point === undefined) return; 

	var topSideVisible = true;
  var fillStyle      = 'gray';
  var strokeStyle    = graph3d.axisColor;

  var right = point.pointRight;
  var top   = point.pointTop;
  var cross = point.pointCross;

  if (right === undefined || top === undefined || cross === undefined) return; 

  if (graph3d.showGrayBottom || graph3d.showShadow) {
    // calculate the cross product of the two vectors from center
    // to left and right, in order to know whether we are looking at the
    // bottom or at the top side. We can also use the cross product
    // for calculating light intensity
    var aDiff        = Point3d.subtract(cross.trans, point.trans);
    var bDiff        = Point3d.subtract(top.trans, right.trans);
    var crossproduct = Point3d.crossProduct(aDiff, bDiff);
    var len          = crossproduct.length();
    // FIXME: there is a bug with determining the surface side (shadow or colored)

    topSideVisible = (crossproduct.z > 0);
  }

  if (topSideVisible) {
    // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
    var zAvg = (point.point.z + right.point.z + top.point.z + cross.point.z) / 4;
    var h    = (1 - (zAvg - graph3d.zMin) * graph3d.scale.z  / graph3d.verticalRatio) * 240;
    var s    = 1; // saturation
    var v;

    if (graph3d.showShadow) {
      v = Math.min(1 + (crossproduct.x / len) / 2, 1);  // value. TODO: scale
      fillStyle   = graph3d._hsv2rgb(h, s, v);
      strokeStyle = fillStyle;
    }
    else  {
      v = 1;
      fillStyle   = graph3d._hsv2rgb(h, s, v);
      strokeStyle = graph3d.axisColor; // TODO: should be customizable
    }
  }

  ctx.lineWidth = graph3d._getStrokeWidth(point);
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
};


//--------------------------
// Class BarStyleHandler
//--------------------------

function BarStyleHandler() {
	BarParentStyleHandler.call(this);
}
derive(BarStyleHandler, BarParentStyleHandler);


BarStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
  var hue = (1 - (point.point.z - graph3d.zMin) * graph3d.scale.z  / graph3d.verticalRatio) * 240;

  return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


//--------------------------
// Class BarColorStyleHandler
//--------------------------

function BarColorStyleHandler() {
	BarParentStyleHandler.call(this);

	this.numberOfColumns = 4;
}
derive(BarColorStyleHandler, BarParentStyleHandler);


BarColorStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate the color based on the value
  var hue = (1 - (point.point.value - graph3d.valueMin) * graph3d.scale.value) * 240;

  return {
   color      : graph3d._hsv2rgb(hue, 1, 1),
   borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


//--------------------------
// Class BarSizeStyleHandler
//--------------------------

function BarSizeStyleHandler() {
	BarParentStyleHandler.call(this);

	this.numberOfColumns = 4;
}
derive(BarSizeStyleHandler, BarParentStyleHandler);


BarSizeStyleHandler.prototype.getColor = function(graph3d, point) {
  return {
    color      : graph3d.dataColor.fill,
    borderColor: graph3d.dataColor.stroke
  };
};


/**
 * Override for method in parent class.
 */
BarSizeStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, xWidth, yWidth) {
  // calculate size for the bar
  var min_offset = (point.point.value - graph3d.valueMin);
  var denom      = (graph3d.valueMax  - graph3d.valueMin) * 0.8 + 0.2;

  xWidth = (graph3d.xBarWidth / 2) * min_offset / denom;
  yWidth = (graph3d.yBarWidth / 2) * min_offset / denom;

  BarParentStyleHandler.prototype.redrawPoint.call(this, graph3d, ctx, point, xWidth, yWidth);
};


/////////////////////////////
// Public functions
/////////////////////////////

/// enumerate the available styles
StyleHandler.STYLE = {
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
 * Retrieve the style index from given styleName
 * @param {string} styleName  Style name such as 'dot', 'grid', 'dot-line'
 * @return {Number} styleNumber Enumeration value representing the style, or -1
 *                when not found
 */
StyleHandler.getStyleNumber = function(styleName) {
	//console.log("Called StyleHandler.getStyleNumber()");

  switch (styleName) {
    case 'dot'      : return StyleHandler.STYLE.DOT;
    case 'dot-line' : return StyleHandler.STYLE.DOTLINE;
    case 'dot-color': return StyleHandler.STYLE.DOTCOLOR;
    case 'dot-size' : return StyleHandler.STYLE.DOTSIZE;
    case 'line'     : return StyleHandler.STYLE.LINE;
    case 'grid'     : return StyleHandler.STYLE.GRID;
    case 'surface'  : return StyleHandler.STYLE.SURFACE;
    case 'bar'      : return StyleHandler.STYLE.BAR;
    case 'bar-color': return StyleHandler.STYLE.BARCOLOR;
    case 'bar-size' : return StyleHandler.STYLE.BARSIZE;
  }

  return -1;
};


StyleHandler.init = function(style) {
  switch (style) {
    case StyleHandler.STYLE.DOT     : return new DotStyleHandler();
    case StyleHandler.STYLE.DOTLINE : return new DotLineStyleHandler();
    case StyleHandler.STYLE.DOTCOLOR: return new DotColorStyleHandler();
    case StyleHandler.STYLE.DOTSIZE : return new DotSizeStyleHandler();
    case StyleHandler.STYLE.LINE    : return new LineStyleHandler();
    case StyleHandler.STYLE.GRID    : return new GridStyleHandler();
    case StyleHandler.STYLE.SURFACE : return new SurfaceStyleHandler();
    case StyleHandler.STYLE.BAR     : return new BarStyleHandler();
    case StyleHandler.STYLE.BARCOLOR: return new BarColorStyleHandler();
    case StyleHandler.STYLE.BARSIZE : return new BarSizeStyleHandler()
  }

  return null;
};

// End namespace
}( window.StyleHandler = window.StyleHandler || {}, undefined ));

////////////////////////////////////////////
// End Style Handlers
////////////////////////////////////////////
