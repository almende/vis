var Point3d           = require('../Point3d');
var PointStyleHandler = require ('./PointStyleHandler');
var support           = require ('./Support');


//--------------------------
// Class DotStyleHandler
//--------------------------

function DotStyleHandler() {
  PointStyleHandler.call(this);

  this.isColorBar      = true;
  this.isValueLegend   = false;
}
support.derive(DotStyleHandler, PointStyleHandler);


module.exports = DotStyleHandler;
