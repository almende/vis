var support               = require ('./Support');
var BarParentStyleHandler = require ('./BarParentStyleHandler');


//--------------------------
// Class BarColorStyleHandler
//--------------------------

function BarColorStyleHandler() {
	BarParentStyleHandler.call(this);

	this.numberOfColumns = 4;
}
support.derive(BarColorStyleHandler, BarParentStyleHandler);


BarColorStyleHandler.prototype.getColor = function(graph3d, point) {
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
BarColorStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  var dimensions = support.getLegendDimensions(graph3d);

  support.drawColorBar(graph3d, ctx, dimensions);
  support.printValueText(graph3d, ctx, dimensions, true);
};


module.exports = BarColorStyleHandler;
