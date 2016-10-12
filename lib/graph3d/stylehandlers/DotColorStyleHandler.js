var Point3d           = require('../Point3d');
var support           = require ('./Support');
var PointStyleHandler = require ('./PointStyleHandler');


//--------------------------
// Class DotColorStyleHandler
//--------------------------

function DotColorStyleHandler() {
	PointStyleHandler.call(this);

	this.numberOfColumns = 4;
}
support.derive(DotColorStyleHandler, PointStyleHandler);


/**
 * Override of parent method.
 */
DotColorStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate the color based on the value
  var hue = (1 - (point.point.value - graph3d.valueMin) * graph3d.scale.value) * 240;

	return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


/**
 * Override for method in parent class.
 */
DotColorStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  var dimensions = support.getLegendDimensions(graph3d);

  support.drawColorBar(graph3d, ctx, dimensions);
  support.printValueText(graph3d, ctx, dimensions, true);
};

module.exports = DotColorStyleHandler;

