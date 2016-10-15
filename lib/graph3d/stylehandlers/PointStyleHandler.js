var BaseStyleHandler = require ('./BaseStyleHandler');
var Point3d          = require('../Point3d');
var support          = require ('./Support');


//--------------------------
// Class PointStyleHandler
//--------------------------

function PointStyleHandler() {
  BaseStyleHandler.call(this);
}
support.derive(PointStyleHandler, BaseStyleHandler);


PointStyleHandler.prototype.getDotSize = function(graph3d) {
  return graph3d.frame.clientWidth * graph3d.dotSizeRatio;
};


/**
 * Draw all datapoints as dots.
 * This function can be used when the style is 'dot' or 'dot-line'
 */
PointStyleHandler.prototype.redraw = function(graph3d, ctx, points) {
  // draw the datapoints as colored circles
  var dotSize = this.getDotSize(graph3d);

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
  // Calculate Hue from the current value.
  // At zMin the hue is 240, at zMax the hue is 0
  var tmpHue = (point.point.z - graph3d.zMin) * graph3d.scale.z;
  var hue    = (1 - tmpHue / graph3d.verticalRatio) * 240;

  return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


PointStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, size) {
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


module.exports = PointStyleHandler;
