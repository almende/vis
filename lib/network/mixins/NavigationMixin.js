var util = require('../../util');
var Hammer = require('../../module/hammer');

exports._cleanNavigation = function() {
  // clean hammer bindings
  if (this.navigationHammers.existing.length != 0) {
    for (var i = 0; i < this.navigationHammers.existing.length; i++) {
      this.navigationHammers.existing[i].dispose();
    }
    this.navigationHammers.existing = [];
  }

  // clean up previous navigation items
  var wrapper = document.getElementById('network-navigation_wrapper');
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.removeChild(wrapper);
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

  this.navigationDivs = {};
  var navigationDivs = ['up','down','left','right','zoomIn','zoomOut','zoomExtends'];
  var navigationDivActions = ['_moveUp','_moveDown','_moveLeft','_moveRight','_zoomIn','_zoomOut','_zoomExtent'];

  this.navigationDivs['wrapper'] = document.createElement('div');
  this.navigationDivs['wrapper'].id = 'network-navigation_wrapper';
  this.frame.appendChild(this.navigationDivs['wrapper']);

  for (var i = 0; i < navigationDivs.length; i++) {
    this.navigationDivs[navigationDivs[i]] = document.createElement('div');
    this.navigationDivs[navigationDivs[i]].id = 'network-navigation_' + navigationDivs[i];
    this.navigationDivs[navigationDivs[i]].className = 'network-navigation ' + navigationDivs[i];
    this.navigationDivs['wrapper'].appendChild(this.navigationDivs[navigationDivs[i]]);

    var hammer = Hammer(this.navigationDivs[navigationDivs[i]], {prevent_default: true});
    hammer.on('touch', this[navigationDivActions[i]].bind(this));
    this.navigationHammers.new.push(hammer);
  }

  var hammerDoc = Hammer(document, {prevent_default: false});
  hammerDoc.on('release', this._stopMovement.bind(this));
  this.navigationHammers.new.push(hammerDoc);

  this.navigationHammers.existing = this.navigationHammers.new;
};


/**
 * this stops all movement induced by the navigation buttons
 *
 * @private
 */
exports._zoomExtent = function(event) {
  // FIXME: this is a workaround because the binding of Hammer on Document makes this fire twice
  if (this._zoomExtentLastTime === undefined || new Date() - this._zoomExtentLastTime > 200) {
    this._zoomExtentLastTime = new Date();
    this.zoomExtent({duration:800});
    event.stopPropagation();
  }
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
