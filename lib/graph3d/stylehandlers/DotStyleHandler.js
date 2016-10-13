var Point3d           = require('../Point3d');
var support           = require ('./Support');
var PointStyleHandler = require ('./PointStyleHandler');


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
