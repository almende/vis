////////////////////////////////////////////
// Style Handlers
//
//
// Bugs
// ====
//
// * z-axiz values missing minus sign - check other axes as well
//
// * Bar size graph - The empty position at (10,0) gets selected too often
//
// TODO
// ====
//
// * dist/img/timeline/delete.png marked as deleted by git. I didn't do this, but it doesn't
//   appear to be used anywhere. Check this.
//
// * dotSize only for DotSizeStyleHandler; don't pass it to the other handlers
//
// * Scan for STYLE enum values and eliminate them if possible
//
// * Data member 'numberOfColumns' *only* used in Graph3D.prototype._determineColumnIndexes(), which
//  is commented out. Remove this data member from all style handlers if method mentioned removed.
//
// * Before pull request:
//
//   - Scan all TODO's
//   - Fix header comments (find source for this)
//   - adjust for style guide
//   - check tabs -> spaces (also in style guide)
// 
//
// Notes
// =====
// - The goal is to leave the classes stateless, hence avoiding to need to call the
//   parent constructor in a given child constructor.
//
// - For several levels of inheritance, this leads to a number of chained prototypes.
//   Since the 3D graphs should be as responsive as possible, this might not be a good idea.
//
//
// -----------------------------------------
//
// Inheritance
// ===========
//
// The code pattern here for inheritance is:
//
//   function Derived() {
// 	   Base.call(this);
//   }
//   Derived.prototype = Object.create(Base.prototype);
//   Derived.prototype.constructor = Derived;
//
// Source for settings up classes with inheritance:
//
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript
//
// 
////////////////////////////////////////////
var support               = require ('./stylehandlers/Support');
var BarStyleHandler       = require ('./stylehandlers/BarStyleHandler');
var BarColorStyleHandler  = require ('./stylehandlers/BarColorStyleHandler');
var BarSizeStyleHandler   = require ('./stylehandlers/BarSizeStyleHandler');
var LineStyleHandler      = require ('./stylehandlers/LineStyleHandler');
var DotStyleHandler       = require ('./stylehandlers/DotStyleHandler');
var DotLineStyleHandler   = require ('./stylehandlers/DotLineStyleHandler');
var DotSizeStyleHandler   = require ('./stylehandlers/DotSizeStyleHandler');
var DotColorStyleHandler  = require ('./stylehandlers/DotColorStyleHandler');
var GridStyleHandler      = require ('./stylehandlers/GridStyleHandler');
var SurfaceStyleHandler   = require ('./stylehandlers/SurfaceStyleHandler');


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
	//console.log("Called StyleHandler.getStyleNumber()");

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
	var styleHandler = graph3d._styleHandler;

	var points = graph3d.dataPoints;
  if (points === undefined || points.length <= 0)
    return; // TODO: throw exception?

  var ctx      = graph3d.getContext();

	support.calcTranslations(graph3d, points, styleHandler.doSort);

	styleHandler.redraw(graph3d, ctx, points);
}


module.exports.STYLE          = STYLE;
module.exports.init           = init;
module.exports.getStyleNumber = getStyleNumber;
module.exports.redraw         = redraw;
