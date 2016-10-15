var Point3d    = require('../Point3d');
var PointGraph = require ('./PointGraph');
var support    = require ('./Support');


function DotGraph() {
  PointGraph.call(this);

  this.isColorBar      = true;
  this.isValueLegend   = false;
}
support.derive(DotGraph, PointGraph);


module.exports = DotGraph;
