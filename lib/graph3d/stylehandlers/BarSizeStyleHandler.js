var support               = require ('./Support');
var BarParentStyleHandler = require ('./BarParentStyleHandler');


//--------------------------
// Class BarSizeStyleHandler
//--------------------------

function BarSizeStyleHandler() {
  BarParentStyleHandler.call(this);

  this.numberOfColumns = 4;
  this.isColorBar      = false;
  this.isValueLegend   = false;
}
support.derive(BarSizeStyleHandler, BarParentStyleHandler);


BarSizeStyleHandler.prototype.getColor = function(graph3d, point) {
  return {
    color      : graph3d.dataColor.fill,
    borderColor: graph3d.dataColor.stroke
  };
};


/**
 * Override for method in parent class.
 */
BarSizeStyleHandler.prototype.redrawPoint =
function(graph3d, ctx, point, xWidth, yWidth) {
  // calculate size for the bar
  var minOffset = (point.point.value - graph3d.valueMin);
  var denom     = (graph3d.valueMax  - graph3d.valueMin) * 0.8 + 0.2;

  xWidth = (graph3d.xBarWidth / 2) * minOffset / denom;
  yWidth = (graph3d.yBarWidth / 2) * minOffset / denom;

  this.parent().redrawPoint.call(this, graph3d, ctx, point, xWidth, yWidth);
};


module.exports = BarSizeStyleHandler;
