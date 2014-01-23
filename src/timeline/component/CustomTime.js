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

  this.listeners = [];
  this.customTime = new Date();
}

CustomTime.prototype = new Component();

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

    return;
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

    this.subscribe(this, 'movetime');
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
CustomTime.prototype._setCustomTime = function(time) {
  this.customTime = new Date(time.valueOf());
  this.repaint();
};

/**
 * Retrieve the current custom time.
 * @return {Date} customTime
 */
CustomTime.prototype._getCustomTime = function() {
  return new Date(this.customTime.valueOf());
};

/**
 * Add listeners for mouse and touch events to the component
 * @param {Component} component
 */
CustomTime.prototype.subscribe = function (component, event) {
  var me = this;
  var listener = {
    component: component,
    event: event,
    callback: function (event) {
      me._onMouseDown(event, listener);
    },
    params: {}
  };

  component.on('mousedown', listener.callback);
  me.listeners.push(listener);

};

/**
 * Event handler
 * @param {String} event       name of the event, for example 'click', 'mousemove'
 * @param {function} callback  callback handler, invoked with the raw HTML Event
 *                             as parameter.
 */
CustomTime.prototype.on = function (event, callback) {
  var bar = this.frame;
  if (!bar) {
    throw new Error('Cannot add event listener: no parent attached');
  }

  events.addListener(this, event, callback);
  util.addEventListener(bar, event, callback);
};

/**
 * Start moving horizontally
 * @param {Event} event
 * @param {Object} listener   Listener containing the component and params
 * @private
 */
CustomTime.prototype._onMouseDown = function(event, listener) {
  event = event || window.event;
  var params = listener.params;

  // only react on left mouse button down
  var leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
  if (!leftButtonDown) {
    return;
  }

  // get mouse position
  params.mouseX = util.getPageX(event);
  params.moved = false;

  params.customTime = this.customTime;

  // add event listeners to handle moving the custom time bar
  var me = this;
  if (!params.onMouseMove) {
    params.onMouseMove = function (event) {
      me._onMouseMove(event, listener);
    };
    util.addEventListener(document, 'mousemove', params.onMouseMove);
  }
  if (!params.onMouseUp) {
    params.onMouseUp = function (event) {
      me._onMouseUp(event, listener);
    };
    util.addEventListener(document, 'mouseup', params.onMouseUp);
  }

  util.stopPropagation(event);
  util.preventDefault(event);
};

/**
 * Perform moving operating.
 * This function activated from within the funcion CustomTime._onMouseDown().
 * @param {Event} event
 * @param {Object} listener
 * @private
 */
CustomTime.prototype._onMouseMove = function (event, listener) {
  event = event || window.event;
  var params = listener.params;
  var parent = this.parent;

  // calculate change in mouse position
  var mouseX = util.getPageX(event);

  if (params.mouseX === undefined) {
    params.mouseX = mouseX;
  }

  var diff = mouseX - params.mouseX;

  // if mouse movement is big enough, register it as a "moved" event
  if (Math.abs(diff) >= 1) {
    params.moved = true;
  }

  var x = parent.toScreen(params.customTime);
  var xnew = x + diff;
  var time = parent.toTime(xnew);
  this._setCustomTime(time);

  // fire a timechange event
  events.trigger(this, 'timechange', {customTime: this.customTime});

  util.preventDefault(event);
};

/**
 * Stop moving operating.
 * This function activated from within the function CustomTime._onMouseDown().
 * @param {event} event
 * @param {Object} listener
 * @private
 */
CustomTime.prototype._onMouseUp = function (event, listener) {
  event = event || window.event;
  var params = listener.params;

  // remove event listeners here, important for Safari
  if (params.onMouseMove) {
    util.removeEventListener(document, 'mousemove', params.onMouseMove);
    params.onMouseMove = null;
  }
  if (params.onMouseUp) {
    util.removeEventListener(document, 'mouseup', params.onMouseUp);
    params.onMouseUp = null;
  }

  if (params.moved) {
    // fire a timechanged event
    events.trigger(this, 'timechanged', {customTime: this.customTime});
  }
};
