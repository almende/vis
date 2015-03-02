var util = require('../../util');
var Hammer = require('../../module/hammer');

exports._cleanNavigation = function() {
  // clean hammer bindings
  if (this.navigationHammers.length != 0) {
    for (var i = 0; i < this.navigationHammers.length; i++) {
      this.navigationHammers[i].dispose();
    }
    this.navigationHammers = [];
  }

  this._navigationReleaseOverload = function () {};

  // clean up previous navigation items
  if (this.navigationDOM && this.navigationDOM['wrapper'] && this.navigationDOM['wrapper'].parentNode) {
    this.navigationDOM['wrapper'].parentNode.removeChild(this.navigationDOM['wrapper']);
  }
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

  this.navigationDOM = {};
  var navigationDivs = ['up','down','left','right','zoomIn','zoomOut','zoomExtends'];
  var navigationDivActions = ['_moveUp','_moveDown','_moveLeft','_moveRight','_zoomIn','_zoomOut','_zoomExtent'];

  this.navigationDOM['wrapper'] = document.createElement('div');
  this.frame.appendChild(this.navigationDOM['wrapper']);

  for (var i = 0; i < navigationDivs.length; i++) {
    this.navigationDOM[navigationDivs[i]] = document.createElement('div');
    this.navigationDOM[navigationDivs[i]].className = 'network-navigation ' + navigationDivs[i];
    this.navigationDOM['wrapper'].appendChild(this.navigationDOM[navigationDivs[i]]);

    var hammer = Hammer(this.navigationDOM[navigationDivs[i]], {prevent_default: true});
    hammer.on('touch', this[navigationDivActions[i]].bind(this));
    this.navigationHammers.push(hammer);
  }

  this._navigationReleaseOverload = this._stopMovement;

};


/**
 * this stops all movement induced by the navigation buttons
 *
 * @private
 */
exports._zoomExtent = function(event) {
  this.zoomExtent({duration:700});
  event.stopPropagation();
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
  event.preventDefault();
};


/**
 * move the screen down
 * @private
 */
exports._moveDown = function(event) {
  this.yIncrement = -this.constants.keyboard.speed.y;
  this.start(); // if there is no node movement, the calculation wont be done
  event.preventDefault();
};


/**
 * move the screen left
 * @private
 */
exports._moveLeft = function(event) {
  this.xIncrement = this.constants.keyboard.speed.x;
  this.start(); // if there is no node movement, the calculation wont be done
  event.preventDefault();
};


/**
 * move the screen right
 * @private
 */
exports._moveRight = function(event) {
  this.xIncrement = -this.constants.keyboard.speed.y;
  this.start(); // if there is no node movement, the calculation wont be done
  event.preventDefault();
};


/**
 * Zoom in, using the same method as the movement.
 * @private
 */
exports._zoomIn = function(event) {
  this.zoomIncrement = this.constants.keyboard.speed.zoom;
  this.start(); // if there is no node movement, the calculation wont be done
  event.preventDefault();
};


/**
 * Zoom out
 * @private
 */
exports._zoomOut = function(event) {
  this.zoomIncrement = -this.constants.keyboard.speed.zoom;
  this.start(); // if there is no node movement, the calculation wont be done
  event.preventDefault();
};


/**
 * Stop zooming and unhighlight the zoom controls
 * @private
 */
exports._stopZoom = function(event) {
  this.zoomIncrement = 0;
  event && event.preventDefault();
};


/**
 * Stop moving in the Y direction and unHighlight the up and down
 * @private
 */
exports._yStopMoving = function(event) {
  this.yIncrement = 0;
  event && event.preventDefault();
};


/**
 * Stop moving in the X direction and unHighlight left and right.
 * @private
 */
exports._xStopMoving = function(event) {
  this.xIncrement = 0;
  event && event.preventDefault();
};
