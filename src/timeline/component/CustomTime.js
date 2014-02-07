/**
 * A custom time bar
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCustomTime]
 * @constructor CustomTime
 * @extends Component
 */

function CustomTime (parent, depends, options) {
  this.id = util.randomUUID();
  this.parent = parent;
  this.depends = depends;

  this.options = options || {};
  this.defaultOptions = {
    showCustomTime: false
  };

  this.customTime = new Date();
  this.eventParams = {}; // stores state parameters while dragging the bar
}

CustomTime.prototype = new Component();

Emitter(CustomTime.prototype);

CustomTime.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the container element of the bar, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
CustomTime.prototype.getContainer = function () {
  return this.frame;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
CustomTime.prototype.repaint = function () {
  var bar = this.frame,
      parent = this.parent,
      parentContainer = parent.parent.getContainer();

  if (!parent) {
    throw new Error('Cannot repaint bar: no parent attached');
  }

  if (!parentContainer) {
    throw new Error('Cannot repaint bar: parent has no container element');
  }

  if (!this.getOption('showCustomTime')) {
    if (bar) {
      parentContainer.removeChild(bar);
      delete this.frame;
    }

    return false;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'customtime';
    bar.style.position = 'absolute';
    bar.style.top = '0px';
    bar.style.height = '100%';

    parentContainer.appendChild(bar);

    var drag = document.createElement('div');
    drag.style.position = 'relative';
    drag.style.top = '0px';
    drag.style.left = '-10px';
    drag.style.height = '100%';
    drag.style.width = '20px';
    bar.appendChild(drag);

    this.frame = bar;

    var me = this;
    util.addEventListener(bar, 'mousedown', me._onMouseDown.bind(me));
  }

  if (!parent.conversion) {
    parent._updateConversion();
  }

  var x = parent.toScreen(this.customTime);

  bar.style.left = x + 'px';
  bar.title = 'Time: ' + this.customTime;

  return false;
};

/**
 * Set custom time.
 * @param {Date} time
 */
CustomTime.prototype.setCustomTime = function(time) {
  this.customTime = new Date(time.valueOf());
  this.repaint();
};

/**
 * Retrieve the current custom time.
 * @return {Date} customTime
 */
CustomTime.prototype.getCustomTime = function() {
  return new Date(this.customTime.valueOf());
};

/**
 * Start moving horizontally
 * @param {Event} event
 * @private
 */
CustomTime.prototype._onMouseDown = function(event) {
  event = event || window.event;

  // only react on left mouse button down
  var leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
  if (!leftButtonDown) {
    return;
  }

  // get mouse position
  this.eventParams.mouseX = util.getPageX(event);
  this.eventParams.moved = false;

  this.eventParams.customTime = this.customTime;

  // add event listeners to handle moving the custom time bar
  var me = this;
  if (!this.eventParams.onMouseMove) {
    this.eventParams.onMouseMove = me._onMouseMove.bind(me);
    util.addEventListener(document, 'mousemove', this.eventParams.onMouseMove);
  }
  if (!this.eventParams.onMouseUp) {
    this.eventParams.onMouseUp = me._onMouseUp.bind(me);
    util.addEventListener(document, 'mouseup', this.eventParams.onMouseUp);
  }

  util.stopPropagation(event);
  util.preventDefault(event);
};

/**
 * Perform moving operating.
 * This function activated from within the function CustomTime._onMouseDown().
 * @param {Event} event
 * @private
 */
CustomTime.prototype._onMouseMove = function (event) {
  event = event || window.event;
  var parent = this.parent;

  // calculate change in mouse position
  var mouseX = util.getPageX(event);

  if (this.eventParams.mouseX === undefined) {
    this.eventParams.mouseX = mouseX;
  }

  var diff = mouseX - this.eventParams.mouseX;

  // if mouse movement is big enough, register it as a "moved" event
  if (Math.abs(diff) >= 1) {
    this.eventParams.moved = true;
  }

  var x = parent.toScreen(this.eventParams.customTime);
  var xnew = x + diff;
  this.setCustomTime(parent.toTime(xnew));

  // fire a timechange event
  if (this.controller) {
    this.controller.emit('timechange', {
      time: this.customTime
    })
  }

  util.preventDefault(event);
};

/**
 * Stop moving operating.
 * This function activated from within the function CustomTime._onMouseDown().
 * @param {event} event
 * @private
 */
CustomTime.prototype._onMouseUp = function (event) {
  // remove event listeners here, important for Safari
  if (this.eventParams.onMouseMove) {
    util.removeEventListener(document, 'mousemove', this.eventParams.onMouseMove);
    this.eventParams.onMouseMove = null;
  }
  if (this.eventParams.onMouseUp) {
    util.removeEventListener(document, 'mouseup', this.eventParams.onMouseUp);
    this.eventParams.onMouseUp = null;
  }

  if (this.eventParams.moved) {
    // fire a timechanged event
    if (this.controller) {
      this.controller.emit('timechanged', {
        time: this.customTime
      })
    }
  }
};
