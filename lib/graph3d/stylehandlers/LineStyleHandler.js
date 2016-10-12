var support          = require ('./Support');
var BaseStyleHandler = require ('./BaseStyleHandler');


//--------------------------
// Class LineStyleHandler
//--------------------------

// No need for a parent class here (for now)
function LineStyleHandler() {
	BaseStyleHandler.call(this);

  this.doSort = false;
}
support.derive(LineStyleHandler, BaseStyleHandler);


/**
 * Draw a line through all datapoints.
 */
LineStyleHandler.prototype.redraw = function(graph3d, ctx, points) {

  // start the line
  if (points.length > 0) {
    var point = points[0];

    ctx.lineWidth   = graph3d._getStrokeWidth(point);
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.strokeStyle = graph3d.dataColor.stroke;
    ctx.beginPath();
    ctx.moveTo(point.screen.x, point.screen.y);

    for (var i = 1; i < points.length; i++) {
      point = points[i];
      ctx.lineTo(point.screen.x, point.screen.y);
    }

    // finish the line
    ctx.stroke();
  }
};


/**
 * Override for method in parent class.
 */
LineStyleHandler.prototype.drawLegend = function(graph3d, ctx) {
  // Do nothing; no legend for this style handler.
};

module.exports = LineStyleHandler;
