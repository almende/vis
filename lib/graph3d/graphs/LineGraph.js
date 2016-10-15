var BaseGraph = require ('./BaseGraph');
var support   = require ('./Support');


function LineGraph() {
  BaseGraph.call(this);

  this.doSort = false;
}
support.derive(LineGraph, BaseGraph);


/**
 * Draw a line through all datapoints.
 */
LineGraph.prototype.redraw = function(graph3d, ctx, points) {
  if (points.length === 0) {
    return;
  }

  // start the line
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
};


/**
 * Override for method in parent class.
 */
LineGraph.prototype.drawLegend = function(graph3d, ctx) {
  // Do nothing; no legend for this style handler.
};

module.exports = LineGraph;
