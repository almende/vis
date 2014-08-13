var util = require('../../util');
var Hammer = require('../../module/hammer');

exports._cleanNavigation = function() {
  // clean up previous navigation items
  var wrapper = document.getElementById('network-navigation_wrapper');
  if (wrapper != null) {
    this.containerElement.removeChild(wrapper);
  }
  document.onmouseup = null;
};

/**
 * Creation of the navigation controls nodes. They are drawn over the rest of the nodes and are not affected by scale and translation
 * they have a triggerFunction which is called on click. If the position of the navigation controls is dependent
 * on this.frame.canvas.clientWidth or this.frame.canvas.clientHeight, we flag horizontalAlignLeft and verticalAlignTop false.
 * This means that the location will be corrected by the _relocateNavigation function on a size change of the canvas.
 *
 * @private
 */
exports._loadNavigationElements = function() {
  this._cleanNavigation();

  this.navigationDivs = {};
  var navigationDivs = ['up','down','left','right','zoomIn','zoomOut','zoomExtends'];
  var navigationDivActions = ['_moveUp','_moveDown','_moveLeft','_moveRight','_zoomIn','_zoomOut','zoomExtent'];

  this.navigationDivs['wrapper'] = document.createElement('div');
  this.navigationDivs['wrapper'].id = "network-navigation_wrapper";
  this.navigationDivs['wrapper'].style.position = "absolute";
  this.navigationDivs['wrapper'].style.width = this.frame.canvas.clientWidth + "px";
  this.navigationDivs['wrapper'].style.height = this.frame.canvas.clientHeight + "px";
  this.containerElement.insertBefore(this.navigationDivs['wrapper'],this.frame);

  var me = this;
  for (var i = 0; i < navigationDivs.length; i++) {
    this.navigationDivs[navigationDivs[i]] = document.createElement('div');
    this.navigationDivs[navigationDivs[i]].id = "network-navigation_" + navigationDivs[i];
    this.navigationDivs[navigationDivs[i]].className = "network-navigation " + navigationDivs[i];
    this.navigationDivs['wrapper'].appendChild(this.navigationDivs[navigationDivs[i]]);
    var hammer = Hammer(this.navigationDivs[navigationDivs[i]], {prevent_default: true});
    hammer.on("touch", me[navigationDivActions[i]].bind(me));
  }
  var hammer = Hammer(document, {prevent_default: false});
  hammer.on("release", me._stopMovement.bind(me));
};

/**
 * this stops all movement induced by the navigation buttons
 *
 * @private
 */
exports._stopMovement = function() {
  this._xStopMoving();
  this._yStopMoving();
  this._stopZoom();
};


/**
 * move the screen up
 * By using the increments, instead of adding a fixed number to the translation, we keep fluent and
 * instant movement. The onKeypress event triggers immediately, then pauses, then triggers frequently
 * To avoid this behaviour, we do the translation in the start loop.
 *
 * @private
 */
exports._moveUp = function(event) {
  this.yIncrement = this.constants.keyboard.speed.y;
  this.start(); // if there is no node movement, the calculation wont be done
};


/**
 * move the screen down
 * @private
 */
exports._moveDown = function(event) {
  this.yIncrement = -this.constants.keyboard.speed.y;
  this.start(); // if there is no node movement, the calculation wont be done
};


/**
 * move the screen left
 * @private
 */
exports._moveLeft = function(event) {
  this.xIncrement = this.constants.keyboard.speed.x;
  this.start(); // if there is no node movement, the calculation wont be done
};


/**
 * move the screen right
 * @private
 */
exports._moveRight = function(event) {
  this.xIncrement = -this.constants.keyboard.speed.y;
  this.start(); // if there is no node movement, the calculation wont be done
};


/**
 * Zoom in, using the same method as the movement.
 * @private
 */
exports._zoomIn = function(event) {
  this.zoomIncrement = this.constants.keyboard.speed.zoom;
  this.start(); // if there is no node movement, the calculation wont be done
};


/**
 * Zoom out
 * @private
 */
exports._zoomOut = function() {
  this.zoomIncrement = -this.constants.keyboard.speed.zoom;
  this.start(); // if there is no node movement, the calculation wont be done
  util.preventDefault(event);
};


/**
 * Stop zooming and unhighlight the zoom controls
 * @private
 */
exports._stopZoom = function() {
  this.zoomIncrement = 0;
};


/**
 * Stop moving in the Y direction and unHighlight the up and down
 * @private
 */
exports._yStopMoving = function() {
  this.yIncrement = 0;
};


/**
 * Stop moving in the X direction and unHighlight left and right.
 * @private
 */
exports._xStopMoving = function() {
  this.xIncrement = 0;
};
