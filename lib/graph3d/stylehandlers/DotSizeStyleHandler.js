var Point3d           = require('../Point3d');
var support           = require ('./Support');
var PointStyleHandler = require ('./PointStyleHandler');


//--------------------------
// Class DotSizeStyleHandler
//--------------------------

function DotSizeStyleHandler() {
	PointStyleHandler.call(this);

	this.numberOfColumns = 4;
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


DotSizeStyleHandler.prototype.redrawPoint = function(graph3d, ctx, point, dotSize) {
	//console.log("Called DotSizeStyleHandler.prototype.redrawPoint()");

  // calculate radius for the circle
  var size;
  size = dotSize/2 + 2*dotSize * (point.point.value - graph3d.valueMin) / (graph3d.valueMax - graph3d.valueMin);

  PointStyleHandler.prototype.redrawPoint.call(this, graph3d, ctx, point, size);
};


/**
 * Override for method in parent class.
 */
DotSizeStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  var dimensions = support.getLegendDimensions(graph3d);

  // Overrides for this particular style handler
  var dotSize = this.getDotSize(graph3d);

  dimensions.width    = dotSize / 2 + dotSize *2;            // px
  dimensions.left     = dimensions.right - dimensions.width; // px; recalc left from new width
  dimensions.widthMin = dotSize / 2;                         // px

  support.drawSizeLegendBox(graph3d, ctx, dimensions);
  support.printValueText(graph3d, ctx, dimensions, true);
};


module.exports = DotSizeStyleHandler;
