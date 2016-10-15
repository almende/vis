var BaseGraph = require ('./BaseGraph');
var Point2d   = require('../Point2d');
var Point3d   = require('../Point3d');
var support   = require ('./Support');


function BarParentGraph() {
}
support.derive(BarParentGraph, BaseGraph);


/**
 * Draw all datapoints as bars.
 * This function can be used when the style is 'bar', 'bar-color', or 'bar-size'
 */
BarParentGraph.prototype.redraw = function(graph3d, ctx, points) {
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

  // draw the datapoints as bars
  var xWidth = graph3d.xBarWidth / 2;
  var yWidth = graph3d.yBarWidth / 2;

  for (var i = 0; i < points.length; i++) {
    var point  = points[i];

    this.redrawPoint(graph3d, ctx, point, xWidth, yWidth);
  }
};


BarParentGraph.prototype.adjustForBarWidth =
function(graph3d, data, xRange, yRange) {
  if (graph3d.xBarWidth === undefined) {
    var dataX = graph3d.getDistinctValues(data, graph3d.colX);
    graph3d.xBarWidth = (dataX[1] - dataX[0]) || 1;
  }

  if (graph3d.yBarWidth === undefined) {
    var dataY = graph3d.getDistinctValues(data, graph3d.colY);
    graph3d.yBarWidth = (dataY[1] - dataY[0]) || 1;
  }

  xRange.min -= graph3d.xBarWidth / 2;
  xRange.max += graph3d.xBarWidth / 2;

  yRange.min -= graph3d.yBarWidth / 2;
  yRange.max += graph3d.yBarWidth / 2;
};


BarParentGraph.prototype.redrawPoint =
function(graph3d, ctx, point, xWidth, yWidth) {
  var i;
  var j;
  var surface;
  var corners;
  var colors = this.getColor(graph3d, point);

  // calculate all corner points
  var me      = graph3d;
  var point3d = point.point;
  var top     = [
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
  var surfaces = [{
      corners: top,
      center : Point3d.avg(bottom[0].point, bottom[2].point)
    }, {
      corners: [top[0], top[1], bottom[1], bottom[0]],
      center : Point3d.avg(bottom[1].point, bottom[0].point)
    }, {
      corners: [top[1], top[2], bottom[2], bottom[1]],
      center : Point3d.avg(bottom[2].point, bottom[1].point)
    }, {
      corners: [top[2], top[3], bottom[3], bottom[2]],
      center : Point3d.avg(bottom[3].point, bottom[2].point)
    }, {
      corners: [top[3], top[0], bottom[0], bottom[3]],
      center : Point3d.avg(bottom[0].point, bottom[3].point)
    }
  ];
  point.surfaces = surfaces;

  // calculate the distance of each of the surface centers to the camera
  for (j = 0; j < surfaces.length; j++) {
    surface      = surfaces[j];
    var center   = graph3d._convertPointToTranslation(surface.center);
    surface.dist = graph3d.showPerspective ? center.length() : -center.z;

    // TODO: This dept calculation doesn't work 100% of the cases due to
    //       perspective, but the current solution is fast/simple and
    //       works in 99.9% of all cases.
    //       The issue is visible in example 14, with:
    //
    //       graph.setCameraPosition({
    //         horizontal: 2.97,
    //         vertical  : 0.5,
    //         distance: 0.9
    //       })
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

  // NOTE: we start at j=2 instead of j=0 as we don't need
  //       to draw the two surfaces at the backside
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
BarParentGraph.prototype.dataPointFromXY = function(graph3d, x, y) {
  var center = new Point2d(x, y);

  // the data points are ordered from far away to closest
  for (var i = graph3d.dataPoints.length - 1; i >= 0; i--) {
    var dataPoint = graph3d.dataPoints[i];
    var surfaces  = dataPoint.surfaces;

    if (surfaces) {
      for (var s = surfaces.length - 1; s >= 0; s--) {
        // split each surface in two triangles, and see if the center point
        //is inside one of these
        var surface   = surfaces[s];
        var corners   = surface.corners;

        var triangle1 = [
          corners[0].screen,
          corners[1].screen,
          corners[2].screen
        ];
        var triangle2 = [
          corners[2].screen,
          corners[3].screen,
          corners[0].screen
        ];

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

module.exports = BarParentGraph;
