var support = require ('./Support');
var Point3d = require('../Point3d');

//--------------------------
// Class BaseStyleHandler
//--------------------------

function BaseStyleHandler() {
	this.numberOfColumns = 3;
}

BaseStyleHandler.prototype.adjustForBarWidth = function(graph3d, xRange, yRange) {};


BaseStyleHandler.prototype.drawLegend = function(graph3d, ctx, options) {
  var dimensions = support.getLegendDimensions(graph3d);

  // If options passed, allow these to override the default dimension values.
  if (options !== undefined) {
    support.safe_copy(options, dimensions);

    dimensions.left = dimensions.right - dimensions.width; // px; recalc left in case width changed
	}

  if (this.isColorBar) {
    support.drawColorBar(graph3d, ctx, dimensions);
  } else {
    support.drawSizeLegendBox(graph3d, ctx, dimensions);
  }

  support.printValueText(graph3d, ctx, dimensions, this.isValueLegend);
};


/**
 * Filter the data based on the current filter
 *
 * This method for 'dot', 'dot-line', etc.
 *
 * @param {Array} data
 * @return {Array} dataPoints   Array with point objects which can be drawn on screen
 *
 * TODO: test this method; find path to activate it.
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

module.exports = BaseStyleHandler;
