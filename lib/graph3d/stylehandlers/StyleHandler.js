////////////////////////////////////////////////////////////////////////////////
// Style Handlers
//
// This is the interface for accessing the particular style handlers for a given
// graph. Each style handler handles one graph type.
//
//
// Notes
// =====
//
// - The goal is to leave the base classes stateless, hence avoiding to need
//   to call the parent constructor in a given child constructor. Apart from
//   a view class-specific constants, this is working out.
//
//
// Inheritance
// ===========
//
// The code pattern here for inheritance is:
//
//   function Derived() {
//     Base.call(this);
//   }
//   Derived.prototype = Object.create(Base.prototype);
//   Derived.prototype.constructor = Derived;
//
// Source for settings up classes with inheritance:
//
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript
//
////////////////////////////////////////////////////////////////////////////////
var BarColorStyleHandler  = require ('./BarColorStyleHandler');
var BarSizeStyleHandler   = require ('./BarSizeStyleHandler');
var BarStyleHandler       = require ('./BarStyleHandler');
var DotColorStyleHandler  = require ('./DotColorStyleHandler');
var DotLineStyleHandler   = require ('./DotLineStyleHandler');
var DotSizeStyleHandler   = require ('./DotSizeStyleHandler');
var DotStyleHandler       = require ('./DotStyleHandler');
var GridStyleHandler      = require ('./GridStyleHandler');
var LineStyleHandler      = require ('./LineStyleHandler');
var SurfaceStyleHandler   = require ('./SurfaceStyleHandler');
var support               = require ('./Support');


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
    case STYLE.DOT     : return new DotStyleHandler();
    case STYLE.DOTLINE : return new DotLineStyleHandler();
    case STYLE.DOTCOLOR: return new DotColorStyleHandler();
    case STYLE.DOTSIZE : return new DotSizeStyleHandler();
    case STYLE.LINE    : return new LineStyleHandler();
    case STYLE.GRID    : return new GridStyleHandler();
    case STYLE.SURFACE : return new SurfaceStyleHandler();
    case STYLE.BAR     : return new BarStyleHandler();
    case STYLE.BARCOLOR: return new BarColorStyleHandler();
    case STYLE.BARSIZE : return new BarSizeStyleHandler()
  }

  return null;
}


function redraw(graph3d) {
  var points = graph3d.dataPoints;

  if (points === undefined || points.length <= 0)
    return; // TODO: throw exception?

  var styleHandler = graph3d._styleHandler;
  var ctx          = graph3d.getContext();

  support.calcTranslations(graph3d, points, styleHandler.doSort);
  styleHandler.redraw(graph3d, ctx, points);
}


module.exports.STYLE          = STYLE;
module.exports.init           = init;
module.exports.getStyleNumber = getStyleNumber;
module.exports.redraw         = redraw;
