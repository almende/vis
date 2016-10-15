var Point3d           = require('../Point3d');
var PointStyleHandler = require ('./PointStyleHandler');
var support           = require ('./Support');


//--------------------------
// Class DotColorStyleHandler
//--------------------------

function DotColorStyleHandler() {
  PointStyleHandler.call(this);

  this.isColorBar    = true;
  this.isValueLegend = true;
}
support.derive(DotColorStyleHandler, PointStyleHandler);


/**
 * Override of parent method.
 */
DotColorStyleHandler.prototype.getColor = function(graph3d, point) {
  // calculate the color based on the value
  var tmpHue = (point.point.value - graph3d.valueMin);
  var hue    = (1 - tmpHue * graph3d.scale.value) * 240;

  return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


module.exports = DotColorStyleHandler;

