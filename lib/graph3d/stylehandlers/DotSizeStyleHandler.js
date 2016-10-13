var Point3d           = require('../Point3d');
var support           = require ('./Support');
var PointStyleHandler = require ('./PointStyleHandler');


//--------------------------
// Class DotSizeStyleHandler
//--------------------------

function DotSizeStyleHandler() {
  PointStyleHandler.call(this);

  this.numberOfColumns = 4;
  this.isColorBar      = false;
  this.isValueLegend   = true;
};
support.derive(DotSizeStyleHandler, PointStyleHandler);


/**
 * Override of parent method.
 */
DotSizeStyleHandler.prototype.getColor = function(graph3d, point) {
  return {
    color      : graph3d.dataColor.fill,
    borderColor: graph3d.dataColor.stroke
  };
};


DotSizeStyleHandler.prototype.redrawPoint =
function(graph3d, ctx, point, dotSize) {
  //console.log('Called DotSizeStyleHandler.prototype.redrawPoint()');

  // calculate radius for the circle
  var g = graph3d;
  var tmpSize = (point.point.value - g.valueMin) / (g.valueMax - g.valueMin);
  var size = dotSize/2 + 2*dotSize * tmpSize;

  PointStyleHandler.prototype.redrawPoint.call(this, graph3d, ctx, point, size);
};


/**
 * Override for method in parent class.
 */
DotSizeStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  // Overrides for this particular style handler
  var dotSize = this.getDotSize(graph3d);

  var overrides = {
    width   : dotSize / 2 + dotSize *2,            // px
    widthMin: dotSize / 2                          // px
  };

  PointStyleHandler.prototype.drawLegend.call(this, graph3d, ctx, overrides);
};


module.exports = DotSizeStyleHandler;
