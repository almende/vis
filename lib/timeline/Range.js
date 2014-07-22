var util = require('../util');
var hammerUtil = require('../hammerUtil');
var moment = require('../module/moment');
var Component = require('./component/Component');

/**
 * @constructor Range
 * A Range controls a numeric range with a start and end value.
 * The Range adjusts the range based on mouse events or programmatic changes,
 * and triggers events when the range is changing or has been changed.
 * @param {{dom: Object, domProps: Object, emitter: Emitter}} body
 * @param {Object} [options]    See description at Range.setOptions
 */
function Range(body, options) {
  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
  this.start = now.clone().add('days', -3).valueOf(); // Number
  this.end = now.clone().add('days', 4).valueOf();   // Number

  this.body = body;

  // default options
  this.defaultOptions = {
    start: null,
    end: null,
    direction: 'horizontal', // 'horizontal' or 'vertical'
    moveable: true,
    zoomable: true,
    min: null,
    max: null,
    zoomMin: 10,                                // milliseconds
    zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000  // milliseconds
  };
  this.options = util.extend({}, this.defaultOptions);

  this.props = {
    touch: {}
  };

  // drag listeners for dragging
  this.body.emitter.on('dragstart', this._onDragStart.bind(this));
  this.body.emitter.on('drag',      this._onDrag.bind(this));
  this.body.emitter.on('dragend',   this._onDragEnd.bind(this));

  // ignore dragging when holding
  this.body.emitter.on('hold', this._onHold.bind(this));

  // mouse wheel for zooming
  this.body.emitter.on('mousewheel',      this._onMouseWheel.bind(this));
  this.body.emitter.on('DOMMouseScroll',  this._onMouseWheel.bind(this)); // For FF

  // pinch to zoom
  this.body.emitter.on('touch', this._onTouch.bind(this));
  this.body.emitter.on('pinch', this._onPinch.bind(this));

  this.setOptions(options);
}

Range.prototype = new Component();

/**
 * Set options for the range controller
 * @param {Object} options      Available options:
 *                              {Number | Date | String} start  Start date for the range
 *                              {Number | Date | String} end    End date for the range
 *                              {Number} min    Minimum value for start
 *                              {Number} max    Maximum value for end
 *                              {Number} zoomMin    Set a minimum value for
 *                                                  (end - start).
 *                              {Number} zoomMax    Set a maximum value for
 *                                                  (end - start).
 *                              {Boolean} moveable Enable moving of the range
 *                                                 by dragging. True by default
 *                              {Boolean} zoomable Enable zooming of the range
 *                                                 by pinching/scrolling. True by default
 */
Range.prototype.setOptions = function (options) {
  if (options) {
    // copy the options that we know
    var fields = ['direction', 'min', 'max', 'zoomMin', 'zoomMax', 'moveable', 'zoomable'];
    util.selectiveExtend(fields, this.options, options);

    if ('start' in options || 'end' in options) {
      // apply a new range. both start and end are optional
      this.setRange(options.start, options.end);
    }
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
 * Set a new start and end range
 * @param {Number} [start]
 * @param {Number} [end]
 */
Range.prototype.setRange = function(start, end) {
  var changed = this._applyRange(start, end);
  if (changed) {
    var params = {
      start: new Date(this.start),
      end: new Date(this.end)
    };
    this.body.emitter.emit('rangechange', params);
    this.body.emitter.emit('rangechanged', params);
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

/**
 * Start dragging horizontally or vertically
 * @param {Event} event
 * @private
 */
Range.prototype._onDragStart = function(event) {
  // only allow dragging when configured as movable
  if (!this.options.moveable) return;

  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.props.touch.allowDragging) return;

  this.props.touch.start = this.start;
  this.props.touch.end = this.end;

  if (this.body.dom.root) {
    this.body.dom.root.style.cursor = 'move';
  }
};

/**
 * Perform dragging operation
 * @param {Event} event
 * @private
 */
Range.prototype._onDrag = function (event) {
  // only allow dragging when configured as movable
  if (!this.options.moveable) return;
  var direction = this.options.direction;
  validateDirection(direction);
  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.props.touch.allowDragging) return;
  var delta = (direction == 'horizontal') ? event.gesture.deltaX : event.gesture.deltaY,
      interval = (this.props.touch.end - this.props.touch.start),
      width = (direction == 'horizontal') ? this.body.domProps.center.width : this.body.domProps.center.height,
      diffRange = -delta / width * interval;
  this._applyRange(this.props.touch.start + diffRange, this.props.touch.end + diffRange);
  this.body.emitter.emit('rangechange', {
    start: new Date(this.start),
    end:   new Date(this.end)
  });
};

/**
 * Stop dragging operation
 * @param {event} event
 * @private
 */
Range.prototype._onDragEnd = function (event) {
  // only allow dragging when configured as movable
  if (!this.options.moveable) return;

  // refuse to drag when we where pinching to prevent the timeline make a jump
  // when releasing the fingers in opposite order from the touch screen
  if (!this.props.touch.allowDragging) return;

  if (this.body.dom.root) {
    this.body.dom.root.style.cursor = 'auto';
  }

  // fire a rangechanged event
  this.body.emitter.emit('rangechanged', {
    start: new Date(this.start),
    end:   new Date(this.end)
  });
};

/**
 * Event handler for mouse wheel event, used to zoom
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {Event} event
 * @private
 */
Range.prototype._onMouseWheel = function(event) {
  // only allow zooming when configured as zoomable and moveable
  if (!(this.options.zoomable && this.options.moveable)) return;

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
    var gesture = hammerUtil.fakeGesture(this, event),
        pointer = getPointer(gesture.center, this.body.dom.center),
        pointerDate = this._pointerToDate(pointer);

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
  this.props.touch.start = this.start;
  this.props.touch.end = this.end;
  this.props.touch.allowDragging = true;
  this.props.touch.center = null;
};

/**
 * On start of a hold gesture
 * @private
 */
Range.prototype._onHold = function () {
  this.props.touch.allowDragging = false;
};

/**
 * Handle pinch event
 * @param {Event} event
 * @private
 */
Range.prototype._onPinch = function (event) {
  // only allow zooming when configured as zoomable and moveable
  if (!(this.options.zoomable && this.options.moveable)) return;

  this.props.touch.allowDragging = false;

  if (event.gesture.touches.length > 1) {
    if (!this.props.touch.center) {
      this.props.touch.center = getPointer(event.gesture.center, this.body.dom.center);
    }

    var scale = 1 / event.gesture.scale,
        initDate = this._pointerToDate(this.props.touch.center);

    // calculate new start and end
    var newStart = parseInt(initDate + (this.props.touch.start - initDate) * scale);
    var newEnd = parseInt(initDate + (this.props.touch.end - initDate) * scale);

    // apply new range
    this.setRange(newStart, newEnd);
  }
};

/**
 * Helper function to calculate the center date for zooming
 * @param {{x: Number, y: Number}} pointer
 * @return {number} date
 * @private
 */
Range.prototype._pointerToDate = function (pointer) {
  var conversion;
  var direction = this.options.direction;

  validateDirection(direction);

  if (direction == 'horizontal') {
    var width = this.body.domProps.center.width;
    conversion = this.conversion(width);
    return pointer.x / conversion.scale + conversion.offset;
  }
  else {
    var height = this.body.domProps.center.height;
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
    x: touch.pageX - util.getAbsoluteLeft(element),
    y: touch.pageY - util.getAbsoluteTop(element)
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

module.exports = Range;
