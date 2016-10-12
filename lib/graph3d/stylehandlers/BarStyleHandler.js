var support               = require ('./Support');
var BarParentStyleHandler = require ('./BarParentStyleHandler');


//--------------------------
// Class BarStyleHandler
//--------------------------

function BarStyleHandler() {
	BarParentStyleHandler.call(this);
}
support.derive(BarStyleHandler, BarParentStyleHandler);


BarStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate Hue from the current value. At zMin the hue is 240, at zMax the hue is 0
  var hue = (1 - (point.point.z - graph3d.zMin) * graph3d.scale.z  / graph3d.verticalRatio) * 240;

  return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


/**
 * Override for method in parent class.
 */
BarStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  var dimensions = support.getLegendDimensions(graph3d);

  support.drawColorBar(graph3d, ctx, dimensions);
  support.printValueText(graph3d, ctx, dimensions, false);
};


module.exports = BarStyleHandler;
