var keycharm = require('keycharm');
var Emitter = require('emitter-component');
var Hammer = require('../module/hammer');
var util = require('../util');

/**
 * Turn an element into an clickToUse element.
 * When not active, the element has a transparent overlay. When the overlay is
 * clicked, the mode is changed to active.
 * When active, the element is displayed with a blue border around it, and
 * the interactive contents of the element can be used. When clicked outside
 * the element, the elements mode is changed to inactive.
 * @param {Element} container
 * @constructor
 */
function Activator(container) {
  this.active = false;

  this.dom = {
    container: container
  };

  this.dom.overlay = document.createElement('div');
  this.dom.overlay.className = 'overlay';

  this.dom.container.appendChild(this.dom.overlay);

  this.hammer = Hammer(this.dom.overlay, {prevent_default: false});
  this.hammer.on('tap', this._onTapOverlay.bind(this));

  // block all touch events (except tap)
  var me = this;
  var events = [
    'touch', 'pinch',
    'doubletap', 'hold',
    'dragstart', 'drag', 'dragend',
    'mousewheel', 'DOMMouseScroll' // DOMMouseScroll is needed for Firefox
  ];
  events.forEach(function (event) {
    me.hammer.on(event, function (event) {
      event.stopPropagation();
    });
  });

  // attach a tap event to the window, in order to deactivate when clicking outside the timeline
  this.windowHammer = Hammer(window, {prevent_default: false});
  this.windowHammer.on('tap', function (event) {
    // deactivate when clicked outside the container
    if (!_hasParent(event.target, container)) {
      me.deactivate();
    }
  });

  if (this.keycharm !== undefined) {
    this.keycharm.destroy();
  }
  this.keycharm = keycharm();

  // keycharm listener only bounded when active)
  this.escListener = this.deactivate.bind(this);
}

// turn into an event emitter
Emitter(Activator.prototype);

// The currently active activator
Activator.current = null;

/**
 * Destroy the activator. Cleans up all created DOM and event listeners
 */
Activator.prototype.destroy = function () {
  this.deactivate();

  // remove dom
  this.dom.overlay.parentNode.removeChild(this.dom.overlay);

  // cleanup hammer instances
  this.hammer = null;
  this.windowHammer = null;
  // FIXME: cleaning up hammer instances doesn't work (Timeline not removed from memory)
};

/**
 * Activate the element
 * Overlay is hidden, element is decorated with a blue shadow border
 */
Activator.prototype.activate = function () {
  // we allow only one active activator at a time
  if (Activator.current) {
    Activator.current.deactivate();
  }
  Activator.current = this;

  this.active = true;
  this.dom.overlay.style.display = 'none';
  util.addClassName(this.dom.container, 'vis-active');

  this.emit('change');
  this.emit('activate');

  // ugly hack: bind ESC after emitting the events, as the Network rebinds all
  // keyboard events on a 'change' event
  this.keycharm.bind('esc', this.escListener);
};

/**
 * Deactivate the element
 * Overlay is displayed on top of the element
 */
Activator.prototype.deactivate = function () {
  this.active = false;
  this.dom.overlay.style.display = '';
  util.removeClassName(this.dom.container, 'vis-active');
  this.keycharm.unbind('esc', this.escListener);

  this.emit('change');
  this.emit('deactivate');
};

/**
 * Handle a tap event: activate the container
 * @param event
 * @private
 */
Activator.prototype._onTapOverlay = function (event) {
  // activate the container
  this.activate();
  event.stopPropagation();
};

/**
 * Test whether the element has the requested parent element somewhere in
 * its chain of parent nodes.
 * @param {HTMLElement} element
 * @param {HTMLElement} parent
 * @returns {boolean} Returns true when the parent is found somewhere in the
 *                    chain of parent nodes.
 * @private
 */
function _hasParent(element, parent) {
  while (element) {
    if (element === parent) {
      return true
    }
    element = element.parentNode;
  }
  return false;
}

module.exports = Activator;
