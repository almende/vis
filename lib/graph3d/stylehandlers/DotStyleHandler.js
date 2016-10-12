var Point3d           = require('../Point3d');
var support           = require ('./Support');
var PointStyleHandler = require ('./PointStyleHandler');


//--------------------------
// Class DotStyleHandler
//--------------------------

function DotStyleHandler() {
	PointStyleHandler.call(this);
}
support.derive(DotStyleHandler, PointStyleHandler);


/**
 * Override for method in parent class.
 */
DotStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  var dimensions = support.getLegendDimensions(graph3d);

	support.drawColorBar(graph3d, ctx, dimensions);
  support.printValueText(graph3d, ctx, dimensions, false);
};


module.exports = DotStyleHandler;
