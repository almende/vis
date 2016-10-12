var support            = require ('./Support');
var MatrixStyleHandler = require ('./MatrixStyleHandler');


//--------------------------
// Class GridStyleHandler
//--------------------------

function GridStyleHandler() {
	MatrixStyleHandler.call(this);
}
support.derive(GridStyleHandler, MatrixStyleHandler);


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


/**
 * Override for method in parent class.
 */
GridStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  var dimensions = support.getLegendDimensions(graph3d);

  support.drawColorBar(graph3d, ctx, dimensions);
  support.printValueText(graph3d, ctx, dimensions, false);
};


module.exports = GridStyleHandler;
