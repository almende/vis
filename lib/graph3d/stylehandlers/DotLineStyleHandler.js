var Point3d           = require('../Point3d');
var support           = require ('./Support');
var PointStyleHandler = require ('./PointStyleHandler');


//--------------------------
// Class DotLineStyleHandler
//--------------------------

function DotLineStyleHandler() {
	PointStyleHandler.call(this);

  this.isColorBar      = true;
  this.isValueLegend   = false;
}
support.derive(DotLineStyleHandler, PointStyleHandler);


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


module.exports = DotLineStyleHandler;
