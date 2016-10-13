var Point3d          = require('../Point3d');
var support          = require ('./Support');
var BaseStyleHandler = require ('./BaseStyleHandler');


//--------------------------
// Class MatrixStyleHandler
//--------------------------

function MatrixStyleHandler() {
  BaseStyleHandler.call(this);
}
support.derive(MatrixStyleHandler, BaseStyleHandler);


/**
 * Override of method in parent class.
 */
MatrixStyleHandler.prototype.getDataPoints = function(graph3d, data) {
  //console.log('Called MatrixStyleHandler.prototype.getDataPoints()');

  // TODO: store the created matrix dataPoints in the filters
  //       instead of reloading each time
  var x;
  var y;
  var i;
  var z;
  var obj;
  var point;
  var dataPoints = [];

  var colX = graph3d.colX;
  var colY = graph3d.colY;
  var colZ = graph3d.colZ;

  // copy all values from the google data table to a matrix
  // the provided values are supposed to form a grid of (x,y) positions

  // create two lists with all present x and y values
  var dataX = [];
  var dataY = [];
  for (i = 0; i < graph3d.getNumberOfRows(data); i++) {
    x = data[i][colX] || 0;
    y = data[i][colY] || 0;

    if (dataX.indexOf(x) === -1) {
      dataX.push(x);
    }
    if (dataY.indexOf(y) === -1) {
      dataY.push(y);
    }
  }

  var sortNumber = function (a, b) {
    return a - b;
  };
  dataX.sort(sortNumber);
  dataY.sort(sortNumber);

  // create a grid, a 2d matrix, with all values.
  var dataMatrix = [];   // temporary data matrix
  for (i = 0; i < data.length; i++) {
    var point = new Point3d();
    point.x = data[i][colX] || 0;
    point.y = data[i][colY] || 0;
    point.z = data[i][colZ] || 0;

    obj = {};
    obj.point  = point;
    obj.bottom = new Point3d(point.x, point.y, graph3d.zMin);
    obj.trans  = undefined;
    obj.screen = undefined;

    // TODO: implement Array().indexOf() for Internet Explorer
    var xIndex = dataX.indexOf(point.x);
    var yIndex = dataY.indexOf(point.y);

    if (dataMatrix[xIndex] === undefined) {
      dataMatrix[xIndex] = [];
    }

    dataMatrix[xIndex][yIndex] = obj;

    dataPoints.push(obj);
  }

  // fill in the pointers to the neighbors.
  for (x = 0; x < dataMatrix.length; x++) {
    for (y = 0; y < dataMatrix[x].length; y++) {
      var d = dataMatrix[x][y];
      if (!d) continue;

      var dDown  = dataMatrix[x+1][y];
      var dRight = dataMatrix[x  ][y+1];
      d.pointRight = (x < dataMatrix.length-1)    ? dDown  : undefined;
      d.pointTop   = (y < dataMatrix[x].length-1) ? dRight : undefined;
      d.pointCross =
        (x < dataMatrix.length-1 && y < dataMatrix[x].length-1) ?
          dataMatrix[x+1][y+1] :
          undefined;
    }
  }

  return dataPoints;
};


MatrixStyleHandler.prototype.redraw = function(graph3d, ctx, points) {
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    this.redrawPoint(graph3d, ctx, point);
  }
};

module.exports = MatrixStyleHandler;
