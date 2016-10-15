var BarParentGraph = require ('./BarParentGraph');
var support        = require ('./Support');


function BarColorGraph() {
  this.isColorBar    = true;
  this.isValueLegend = true;
}
support.derive(BarColorGraph, BarParentGraph);


BarColorGraph.prototype.getColor = function(graph3d, point) {
  // calculate the color based on the value
  var tmpHue = (point.point.value - graph3d.valueMin);
  var hue    = (1 - tmpHue * graph3d.scale.value) * 240;

  return {
   color      : graph3d._hsv2rgb(hue, 1, 1),
   borderColor: graph3d._hsv2rgb(hue, 1, 0.8)
  };
};


module.exports = BarColorGraph;
