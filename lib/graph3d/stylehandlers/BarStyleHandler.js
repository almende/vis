var support               = require ('./Support');
var BarParentStyleHandler = require ('./BarParentStyleHandler');


//--------------------------
// Class BarStyleHandler
//--------------------------

function BarStyleHandler() {
	BarParentStyleHandler.call(this);

  this.isColorBar      = true;
  this.isValueLegend   = false;
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


module.exports = BarStyleHandler;
