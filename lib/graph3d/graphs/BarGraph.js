var BarParentGraph = require ('./BarParentGraph');
var support        = require ('./Support');


function BarGraph() {
  BarParentGraph.call(this);

  this.isColorBar      = true;
  this.isValueLegend   = false;
}
support.derive(BarGraph, BarParentGraph);


BarGraph.prototype.getColor = function(graph3d, point) {
  // Calculate Hue from the current value.
  // At zMin the hue is 240, at zMax the hue is 0
  var tmpHue = (point.point.z - graph3d.zMin) * graph3d.scale.z;
  var hue    = (1 - tmpHue / graph3d.verticalRatio) * 240;

  return {
    color      : graph3d._hsv2rgb(hue, 1, 1),
    borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


module.exports = BarGraph;
