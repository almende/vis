var support               = require ('./Support');
var BarParentStyleHandler = require ('./BarParentStyleHandler');


//--------------------------
// Class BarColorStyleHandler
//--------------------------

function BarColorStyleHandler() {
	BarParentStyleHandler.call(this);

	this.numberOfColumns = 4;
  this.isColorBar      = true;
  this.isValueLegend   = true;
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


module.exports = BarColorStyleHandler;
