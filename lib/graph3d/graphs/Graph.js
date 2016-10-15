////////////////////////////////////////////////////////////////////////////////
// Graph Style Handlers
//
// This is the interface for accessing the particular style handlers for a given
// graph. Each style handler handles one graph type.
//
////////////////////////////////////////////////////////////////////////////////
var BarColorGraph  = require ('./BarColorGraph');
var BarGraph       = require ('./BarGraph');
var BarSizeGraph   = require ('./BarSizeGraph');
var DotColorGraph  = require ('./DotColorGraph');
var DotGraph       = require ('./DotGraph');
var DotLineGraph   = require ('./DotLineGraph');
var DotSizeGraph   = require ('./DotSizeGraph');
var GridGraph      = require ('./GridGraph');
var LineGraph      = require ('./LineGraph');
var SurfaceGraph   = require ('./SurfaceGraph');
var support        = require ('./Support');


/// enumerate the available styles
var STYLE = {
  BAR     : 0,
  BARCOLOR: 1,
  BARSIZE : 2,
  DOT     : 3,
  DOTLINE : 4,
  DOTCOLOR: 5,
  DOTSIZE : 6,
  GRID    : 7,
  LINE    : 8,
  SURFACE : 9
};


/**
 * Retrieve the style index from given styleName
 * @param {string} styleName  Style name such as 'dot', 'grid', 'dot-line'
 * @return {Number} styleNumber Enumeration value representing the style, or -1
 *                when not found
 */
function getStyleNumber(styleName) {
  switch (styleName) {
    case 'dot'      : return STYLE.DOT;
    case 'dot-line' : return STYLE.DOTLINE;
    case 'dot-color': return STYLE.DOTCOLOR;
    case 'dot-size' : return STYLE.DOTSIZE;
    case 'line'     : return STYLE.LINE;
    case 'grid'     : return STYLE.GRID;
    case 'surface'  : return STYLE.SURFACE;
    case 'bar'      : return STYLE.BAR;
    case 'bar-color': return STYLE.BARCOLOR;
    case 'bar-size' : return STYLE.BARSIZE;
  }

  return -1;
}


function init(style) {
  switch (style) {
    case STYLE.DOT     : return new DotGraph();
    case STYLE.DOTLINE : return new DotLineGraph();
    case STYLE.DOTCOLOR: return new DotColorGraph();
    case STYLE.DOTSIZE : return new DotSizeGraph();
    case STYLE.LINE    : return new LineGraph();
    case STYLE.GRID    : return new GridGraph();
    case STYLE.SURFACE : return new SurfaceGraph();
    case STYLE.BAR     : return new BarGraph();
    case STYLE.BARCOLOR: return new BarColorGraph();
    case STYLE.BARSIZE : return new BarSizeGraph()
  }

  return null;
}


function redraw(graph3d) {
  var points = graph3d.dataPoints;

  if (points === undefined || points.length <= 0)
    return; // TODO: throw exception?

  var graphHandler = graph3d._graphHandler;
  var ctx          = graph3d.getContext();

  support.calcTranslations(graph3d, points, graphHandler.doSort);
  graphHandler.redraw(graph3d, ctx, points);
}


module.exports.STYLE          = STYLE;
module.exports.init           = init;
module.exports.getStyleNumber = getStyleNumber;
module.exports.redraw         = redraw;
