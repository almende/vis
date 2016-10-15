var MatrixStyleHandler = require ('./MatrixStyleHandler');
var Point3d            = require('../Point3d');
var support            = require ('./Support');


//--------------------------
// Class SurfaceStyleHandler
//--------------------------

function SurfaceStyleHandler() {
  MatrixStyleHandler.call(this);

  this.isColorBar      = true;
  this.isValueLegend   = false;
}
support.derive(SurfaceStyleHandler, MatrixStyleHandler);


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

    // FIXME: there is a bug with determining
    //        the surface side (shadow or colored)

    topSideVisible = (crossproduct.z > 0);
  }

  if (topSideVisible) {
    // Calculate Hue from the current value.
    // At zMin the hue is 240, at zMax the hue is 0
    var zAvg = (
       point.point.z +
       right.point.z +
       top.point.z + cross.point.z
    ) / 4;

    var tmpHue = (zAvg - graph3d.zMin) * graph3d.scale.z;
    var h      = (1 - tmpHue / graph3d.verticalRatio) * 240;
    var s      = 1; // saturation
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


module.exports = SurfaceStyleHandler;
