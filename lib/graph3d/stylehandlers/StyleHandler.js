////////////////////////////////////////////////////////////////////////////////
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
// * dist/img/timeline/delete.png marked as deleted by git. I didn't do this,
//   but it doesn't appear to be used anywhere. Check this.
//
// * dotSize only for DotSizeStyleHandler; don't pass it to the other handlers
//
// * Scan for STYLE enum values and eliminate them if possible
//
// * Data member 'numberOfColumns' *only* used in
//   Graph3D.prototype._determineColumnIndexes(), which is commented out.
//   Remove this data member from all style handlers if this method removed.
//
// * Before pull request:
//
//   - Scan all TODO's
//   - Fix header comments (find source for this)
//   - adjust for style guide
//
// Done
// ====
//
// * Style
//
//    Dit this for *all* files under =lib/graph3d=:
//
//    - tabs -> 2 spaces
//    - semicolons
//    - no space at EOL
//    - Lines <= 80 char's  - skipped comments with jsdoc-like syntax
//
//
//
// -----------------------------------------------------------------------------
// Check Styling
// =============
//
// with grep : grep -r "<regexp>" lib/graph3d/ | less
// with emacs: C-M-s <regexp>
//
// | Item             | regexp               | Extra grep          |
// |------------------|----------------------|---------------------|
// | 80 char's        | "^.\{82,\}$"         |                     |
// | Single quotes    | "\""                 |                     |
// | { same line      | "^ *{$"              |                     |
// | 1 var per 'var'  | "var[^,;]*?,[^;]*?;" | -Pzo                |
// | var names no '_' | "[^.]_"              |                     |
// | vars lowerCamel  | "var [A-Z]"          | | grep -v require   |
// | ===              | " [!=]= "            |                     |
// |------------------|----------------------|---------------------|
//
// -----------------------------------------------------------------------------
//
// Notes
// =====
// - The goal is to leave the base classes stateless, hence avoiding to need
//   to call the parent constructor in a given child constructor.
//
// - For several levels of inheritance, this leads to a number of
//   chained prototypes.
//   Since the 3D graphs should be as responsive as possible, this might not be
//   a good idea performance-wise.
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
// -----------------------------------------------------------------------------
// Pull Request Blurb
// ==================
//
// Please accept this pull request containing my changes to the graph3d part.
// The changes consist of refactoring the code so that all graph-style specific
// code is isolated per graph style.
//
//
// My actual goal is to enable multiple graphs within a view; this refactoring
// is, in my opinion, an essential step to attain that goal[1]. However, I think
// the refactoring as such is worthwile to fold back on its own, because it
// makes the graph3d code more maintainable.
//
// This is pure refactoring only; the functionality should be identical to
// previous (except for the occasional bug which I fixed along the way).
//
//
// In addition, I checked *all* code under graph3d for compliance with
// the style guidelines (as far as I can take it), except for:
//
// - jsDoc-like comment, e.g. '@param'. Not sure how to multiline this.
// - The occasional URL in comments.
// - const's upper case. This makes for pretty unreadable names, I'd rather avoid it.
// - Function length: I'm not going to touch the existing large functions, sorry.
//
//
// Further Notes
// =============
//
// I have the following reservation about my changes: namely, I use
// 'Object.create()' for implementing inheritance. This is an *ECMAScript5*
// construct, and it might be the case that the vis.js project requires further
// backward compatibility. Please advise me on this.
//
// I also added a single line to CONTRIBUTING.md, because of a mistake I made
// when starting with changes. Please check if you are OK with this.
//
//
// [1] - TODO quote Sandi Metz.
//
////////////////////////////////////////////////////////////////////////////////
var support               = require ('./Support');
var BarStyleHandler       = require ('./BarStyleHandler');
var BarColorStyleHandler  = require ('./BarColorStyleHandler');
var BarSizeStyleHandler   = require ('./BarSizeStyleHandler');
var LineStyleHandler      = require ('./LineStyleHandler');
var DotStyleHandler       = require ('./DotStyleHandler');
var DotLineStyleHandler   = require ('./DotLineStyleHandler');
var DotSizeStyleHandler   = require ('./DotSizeStyleHandler');
var DotColorStyleHandler  = require ('./DotColorStyleHandler');
var GridStyleHandler      = require ('./GridStyleHandler');
var SurfaceStyleHandler   = require ('./SurfaceStyleHandler');


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
  //console.log('Called StyleHandler.getStyleNumber()');

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
