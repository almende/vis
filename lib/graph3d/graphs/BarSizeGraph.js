var BarParentGraph = require ('./BarParentGraph');
var support        = require ('./Support');


function BarSizeGraph() {
  this.isColorBar    = false;
  this.isValueLegend = false;
}
support.derive(BarSizeGraph, BarParentGraph);


BarSizeGraph.prototype.getColor = function(graph3d, point) {
  return {
    color      : graph3d.dataColor.fill,
    borderColor: graph3d.dataColor.stroke
  };
};


/**
 * Override for method in parent class.
 */
BarSizeGraph.prototype.redrawPoint =
function(graph3d, ctx, point, xWidth, yWidth) {
  // calculate size for the bar
  var numer  = (point.point.value - graph3d.valueMin);
  var denom  = (graph3d.valueMax  - graph3d.valueMin);
  var factor = numer/denom * 0.8 + 0.2;

  xWidth = graph3d.xBarWidth / 2 * factor;
  yWidth = graph3d.yBarWidth / 2 * factor;

  this.parent().redrawPoint.call(this, graph3d, ctx, point, xWidth, yWidth);
};


module.exports = BarSizeGraph;
