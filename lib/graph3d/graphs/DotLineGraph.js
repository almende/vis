var Point3d    = require('../Point3d');
var PointGraph = require ('./PointGraph');
var support    = require ('./Support');


function DotLineGraph() {
  this.isColorBar      = true;
  this.isValueLegend   = false;
}
support.derive(DotLineGraph, PointGraph);


DotLineGraph.prototype.redrawPoint =
function(graph3d, ctx, point, dotSize) {
  // draw a vertical line from the bottom to the graph value
  var from = graph3d._convert3Dto2D(point.bottom);
  ctx.lineWidth = 1;
  ctx.strokeStyle = graph3d.gridColor;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(point.screen.x, point.screen.y);
  ctx.stroke();

  this.parent().redrawPoint.call(this, graph3d, ctx, point, dotSize);
};


module.exports = DotLineGraph;
