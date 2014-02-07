/**
 * @constructor Range
 * A Range controls a numeric range with a start and end value.
 * The Range adjusts the range based on mouse events or programmatic changes,
 * and triggers events when the range is changing or has been changed.
 * @param {Object} [options]   See description at Range.setOptions
 * @extends Controller
 */
function Range(options) {
  this.id = util.randomUUID();
  this.start = null; // Number
  this.end = null;   // Number

  this.options = options || {};

  this.setOptions(options);
}

// extend the Range prototype with an event emitter mixin
Emitter(Range.prototype);

/**
 * Set options for the range controller
 * @param {Object} options      Available options:
 *                              {Number} min    Minimum value for start
 *                              {Number} max    Maximum value for end
 *                              {Number} zoomMin    Set a minimum value for
 *                                                  (end - start).
 *                              {Number} zoomMax    Set a maximum value for
 *                                                  (end - start).
 */
Range.prototype.setOptions = function (options) {
  util.extend(this.options, options);

  // re-apply range with new limitations
  if (this.start !== null && this.end !== null) {
    this.setRange(this.start, this.end);
  }
};

/**
 * Test whether direction has a valid value
 * @param {String} direction    'horizontal' or 'vertical'
 */
function validateDirection (direction) {
  if (direction != 'horizontal' && direction != 'vertical') {
    throw new TypeError('Unknown direction "' + direction + '". ' +
        'Choose "horizontal" or "vertical".');
  }
}

/**
 * Add listeners for mouse and touch events to the component
 * @param {Controller} controller
 * @param {Component} component  Should be a rootpanel
 * @param {String} event        Available events: 'move', 'zoom'
 * @param {String} direction    Available directions: 'horizontal', 'vertical'
 */
Range.prototype.subscribe = function (controller, component, event, direction) {
  var me = this;

  if (event == 'move') {
    // drag start listener
    controller.on('dragstart', function (event) {
      me._onDragStart(event, component);
    });

    // drag listener
    controller.on('drag', function (event) {
      me._onDrag(event, component, direction);
    });

    // drag end listener
    controller.on('dragend', function (event) {
      me._onDragEnd(event, component);
    });

    // ignore dragging when holding
    controller.on('hold', function (event) {
      me._onHold();
    });
  }
  else if (event == 'zoom') {
    // mouse wheel
    function mousewheel (event) {
      me._onMouseWheel(event, component, direction);
    }
    controller.on('mousewheel', mousewheel);
    controller.on('DOMMouseScroll', mousewheel); // For FF

    // pinch
    controller.on('touch', function (event) {
      me._onTouch(event);
    });
    controller.on('pinch', function (event) {
      me._onPinch(event, component, direction);
    });
  }
  else {
    throw new TypeError('Unknown event "' + event + '". ' +
        'Choose "move" or "zoom".');
  }
};

/**
 * Set a new start and end range
 * @param {Number} [start]
 * @param {Number} [end]
 */
Range.prototype.setRange = function(start, end) {
  var changed = this._applyRange(start, end);
  if (changed) {
    var params = {
          start: this.start,
          end: this.end
    };
    this.emit('rangechange', params);
    this.emit('rangechanged', params);
  }
};

/**
 * Set a new start and end range. This method is the same as setRange, but
 * does not trigger a range change and range changed event, and it returns
 * true when the range is changed
 * @param {Number} [start]
 * @param {Number} [end]
 * @return {Boolean} changed
 * @private
 */
Range.prototype._applyRange = function(start, end) {
  var newStart = (start != null) ? util.convert(start, 'Date').valueOf() : this.start,
      newEnd   = (end != null)   ? util.convert(end, 'Date').valueOf()   : this.end,
      max = (this.options.max != null) ? util.convert(this.options.max, 'Date').valueOf() : null,
      min = (this.options.min != null) ? util.convert(this.options.min, 'Date').valueOf() : null,
      diff;

  // check for valid number
  if (isNaN(newStart) || newStart === null) {
    throw new Error('Invalid start "' + start + '"');
  }
  if (isNaN(newEnd) || newEnd === null) {
    throw new Error('Invalid end "' + end + '"');
  }

  // prevent start < end
  if (newEnd < newStart) {
    newEnd = newStart;
  }

  // prevent start < min
  if (min !== null) {
    if (newStart < min) {
      diff = (min - newStart);
      newStart += diff;
      newEnd += diff;

      // prevent end > max
      if (max != null) {
        if (newEnd > max) {
          newEnd = max;
        }
      }
    }
  }

  // prevent end > max
  if (max !== null) {
    if (newEnd > max) {
      diff = (newEnd - max);
      newStart -= diff;
      newEnd -= diff;

      // prevent start < min
      if (min != null) {
        if (newStart < min) {
          newStart = min;
        }
      }
    }
  }

  // prevent (end-start) < zoomMin
  if (this.options.zoomMin !== null) {
    var zoomMin = parseFloat(this.options.zoomMin);
    if (zoomMin < 0) {
      zoomMin = 0;
    }
    if ((newEnd - newStart) < zoomMin) {
      if ((this.end - this.start) === zoomMin) {
        // ignore this action, we are already zoomed to the minimum
        newStart = this.start;
        newEnd = this.end;
      }
      else {
        // zoom to the minimum
        diff = (zoomMin - (newEnd - newStart));
        newStart -= diff / 2;
        newEnd += diff / 2;
      }
    }
  }

  // prevent (end-start) > zoomMax
  if (this.options.zoomMax !== null) {
    var zoomMax = parseFloat(this.options.zoomMax);
    if (zoomMax < 0) {
      zoomMax = 0;
    }
    if ((newEnd - newStart) > zoomMax) {
      if ((this.end - this.start) === zoomMax) {
        // ignore this action, we are already zoomed to the maximum
        newStart = this.start;
        newEnd = this.end;
      }
      else {
        // zoom to the maximum
        diff = ((newEnd - newStart) - zoomMax);
        newStart += diff / 2;
        newEnd -= diff / 2;
      }
    }
  }

  var changed = (this.start != newStart || this.end != newEnd);

  this.start = newStart;
  this.end = newEnd;

  return changed;
};

/**
 * Retrieve the current range.
 * @return {Object} An object with start and end properties
 */
Range.prototype.getRange = function() {
  return {
    start: this.start,
    end: this.end
  };
};

/**
 * Calculate the conversion offset and scale for current range, based on
 * the provided width
 * @param {Number} width
 * @returns {{offset: number, scale: number}} conversion
 */
Range.prototype.conversion = function (width) {
  return Range.conversion(this.start, this.end, width);
};

/**
 * Static method to calculate the conversion offset and scale for a range,
 * based on the provided start, end, and width
 * @param {Number} start
 * @param {Number} end
 * @param {Number} width
 * @returns {{offset: number, scale: number}} conversion
 */
Range.conversion = function (start, end, width) {
  if (width != 0 && (end - start != 0)) {
    return {
      offset: start,
      scale: width / (end - start)
    }
  }
  else {
    return {
      offset: 0,
      scale: 1
    };
  }
};

// global (private) object to store drag params
var touchParams = {};

/**
 * Start dragging horizontally or vertically
 * @param {Event} event
 * @param {Object} component
 * @private
 */
Range.prototype._onDragStart = function(event, component) {
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (touchParams.ignore) return;

  touchParams.start = this.start;
  touchParams.end = this.end;

  var frame = component.frame;
  if (frame) {
    frame.style.cursor = 'move';
  }
};

/**
 * Perform dragging operating.
 * @param {Event} event
 * @param {Component} component
 * @param {String} direction    'horizontal' or 'vertical'
 * @private
 */
Range.prototype._onDrag = function (event, component, direction) {
  validateDirection(direction);

  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (touchParams.ignore) return;

  var delta = (direction == 'horizontal') ? event.gesture.deltaX : event.gesture.deltaY,
      interval = (touchParams.end - touchParams.start),
      width = (direction == 'horizontal') ? component.width : component.height,
      diffRange = -delta / width * interval;

  this._applyRange(touchParams.start + diffRange, touchParams.end + diffRange);

  this.emit('rangechange', {
    start: this.start,
    end: this.end
  });
};

/**
 * Stop dragging operating.
 * @param {event} event
 * @param {Component} component
 * @private
 */
Range.prototype._onDragEnd = function (event, component) {
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (touchParams.ignore) return;

  if (component.frame) {
    component.frame.style.cursor = 'auto';
  }

  // fire a rangechanged event
  this.emit('rangechanged', {
    start: this.start,
    end: this.end
  });
};

/**
 * Event handler for mouse wheel event, used to zoom
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {Event} event
 * @param {Component} component
 * @param {String} direction    'horizontal' or 'vertical'
 * @private
 */
Range.prototype._onMouseWheel = function(event, component, direction) {
  validateDirection(direction);

  // retrieve delta
  var delta = 0;
  if (event.wheelDelta) { /* IE/Opera. */
    delta = event.wheelDelta / 120;
  } else if (event.detail) { /* Mozilla case. */
    // In Mozilla, sign of delta is different than in IE.
    // Also, delta is multiple of 3.
    delta = -event.detail / 3;
  }

  // If delta is nonzero, handle it.
  // Basically, delta is now positive if wheel was scrolled up,
  // and negative, if wheel was scrolled down.
  if (delta) {
    // perform the zoom action. Delta is normally 1 or -1

    // adjust a negative delta such that zooming in with delta 0.1
    // equals zooming out with a delta -0.1
    var scale;
    if (delta < 0) {
      scale = 1 - (delta / 5);
    }
    else {
      scale = 1 / (1 + (delta / 5)) ;
    }

    // calculate center, the date to zoom around
    var gesture = util.fakeGesture(this, event),
        pointer = getPointer(gesture.touches[0], component.frame),
        pointerDate = this._pointerToDate(component, direction, pointer);

    this.zoom(scale, pointerDate);
  }

  // Prevent default actions caused by mouse wheel
  // (else the page and timeline both zoom and scroll)
  event.preventDefault();
};

/**
 * Start of a touch gesture
 * @private
 */
Range.prototype._onTouch = function (event) {
  touchParams.start = this.start;
  touchParams.end = this.end;
  touchParams.ignore = false;
  touchParams.center = null;

  // don't move the range when dragging a selected event
  // TODO: it's not so neat to have to know about the state of the ItemSet
  var item = ItemSet.itemFromTarget(event);
  if (item && item.selected && this.options.editable) {
    touchParams.ignore = true;
  }
};

/**
 * On start of a hold gesture
 * @private
 */
Range.prototype._onHold = function () {
  touchParams.ignore = true;
};

/**
 * Handle pinch event
 * @param {Event} event
 * @param {Component} component
 * @param {String} direction    'horizontal' or 'vertical'
 * @private
 */
Range.prototype._onPinch = function (event, component, direction) {
  touchParams.ignore = true;

  if (event.gesture.touches.length > 1) {
    if (!touchParams.center) {
      touchParams.center = getPointer(event.gesture.center, component.frame);
    }

    var scale = 1 / event.gesture.scale,
        initDate = this._pointerToDate(component, direction, touchParams.center),
        center = getPointer(event.gesture.center, component.frame),
        date = this._pointerToDate(component, direction, center),
        delta = date - initDate; // TODO: utilize delta

    // calculate new start and end
    var newStart = parseInt(initDate + (touchParams.start - initDate) * scale);
    var newEnd = parseInt(initDate + (touchParams.end - initDate) * scale);

    // apply new range
    this.setRange(newStart, newEnd);
  }
};

/**
 * Helper function to calculate the center date for zooming
 * @param {Component} component
 * @param {{x: Number, y: Number}} pointer
 * @param {String} direction    'horizontal' or 'vertical'
 * @return {number} date
 * @private
 */
Range.prototype._pointerToDate = function (component, direction, pointer) {
  var conversion;
  if (direction == 'horizontal') {
    var width = component.width;
    conversion = this.conversion(width);
    return pointer.x / conversion.scale + conversion.offset;
  }
  else {
    var height = component.height;
    conversion = this.conversion(height);
    return pointer.y / conversion.scale + conversion.offset;
  }
};

/**
 * Get the pointer location relative to the location of the dom element
 * @param {{pageX: Number, pageY: Number}} touch
 * @param {Element} element   HTML DOM element
 * @return {{x: Number, y: Number}} pointer
 * @private
 */
function getPointer (touch, element) {
  return {
    x: touch.pageX - vis.util.getAbsoluteLeft(element),
    y: touch.pageY - vis.util.getAbsoluteTop(element)
  };
}

/**
 * Zoom the range the given scale in or out. Start and end date will
 * be adjusted, and the timeline will be redrawn. You can optionally give a
 * date around which to zoom.
 * For example, try scale = 0.9 or 1.1
 * @param {Number} scale      Scaling factor. Values above 1 will zoom out,
 *                            values below 1 will zoom in.
 * @param {Number} [center]   Value representing a date around which will
 *                            be zoomed.
 */
Range.prototype.zoom = function(scale, center) {
  // if centerDate is not provided, take it half between start Date and end Date
  if (center == null) {
    center = (this.start + this.end) / 2;
  }

  // calculate new start and end
  var newStart = center + (this.start - center) * scale;
  var newEnd = center + (this.end - center) * scale;

  this.setRange(newStart, newEnd);
};

/**
 * Move the range with a given delta to the left or right. Start and end
 * value will be adjusted. For example, try delta = 0.1 or -0.1
 * @param {Number}  delta     Moving amount. Positive value will move right,
 *                            negative value will move left
 */
Range.prototype.move = function(delta) {
  // zoom start Date and end Date relative to the centerDate
  var diff = (this.end - this.start);

  // apply new values
  var newStart = this.start + diff * delta;
  var newEnd = this.end + diff * delta;

  // TODO: reckon with min and max range

  this.start = newStart;
  this.end = newEnd;
};

/**
 * Move the range to a new center point
 * @param {Number} moveTo      New center point of the range
 */
Range.prototype.moveTo = function(moveTo) {
  var center = (this.start + this.end) / 2;

  var diff = center - moveTo;

  // calculate new start and end
  var newStart = this.start - diff;
  var newEnd = this.end - diff;

  this.setRange(newStart, newEnd);
};
