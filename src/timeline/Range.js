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
 * @param {Component} component
 * @param {String} event        Available events: 'move', 'zoom'
 * @param {String} direction    Available directions: 'horizontal', 'vertical'
 */
Range.prototype.subscribe = function (component, event, direction) {
    var me = this;

    if (event == 'move') {
        // drag start listener
        component.on('dragstart', function (event) {
            me._onDragStart(event, component);
        });

        // drag listener
        component.on('drag', function (event) {
            me._onDrag(event, component, direction);
        });

        // drag end listener
        component.on('dragend', function (event) {
            me._onDragEnd(event, component);
        });
    }
    else if (event == 'zoom') {
        // mouse wheel
        function mousewheel (event) {
            me._onMouseWheel(event, component, direction);
        }
        component.on('mousewheel', mousewheel);
        component.on('DOMMouseScroll', mousewheel); // For FF

        // TODO: pinch
    }
    else {
        throw new TypeError('Unknown event "' + event + '". ' +
            'Choose "move" or "zoom".');
    }
};

/**
 * Event handler
 * @param {String} event       name of the event, for example 'click', 'mousemove'
 * @param {function} callback  callback handler, invoked with the raw HTML Event
 *                             as parameter.
 */
Range.prototype.on = function (event, callback) {
    events.addListener(this, event, callback);
};

/**
 * Trigger an event
 * @param {String} event    name of the event, available events: 'rangechange',
 *                          'rangechanged'
 * @private
 */
Range.prototype._trigger = function (event) {
    events.trigger(this, event, {
        start: this.start,
        end: this.end
    });
};

/**
 * Set a new start and end range
 * @param {Number} [start]
 * @param {Number} [end]
 */
Range.prototype.setRange = function(start, end) {
    var changed = this._applyRange(start, end);
    if (changed) {
        this._trigger('rangechange');
        this._trigger('rangechanged');
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
    var newStart = (start != null) ? util.convert(start, 'Number') : this.start,
        newEnd   = (end != null)   ? util.convert(end, 'Number')   : this.end,
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
 * Calculate the conversion offset and factor for current range, based on
 * the provided width
 * @param {Number} width
 * @returns {{offset: number, factor: number}} conversion
 */
Range.prototype.conversion = function (width) {
    return Range.conversion(this.start, this.end, width);
};

/**
 * Static method to calculate the conversion offset and factor for a range,
 * based on the provided start, end, and width
 * @param {Number} start
 * @param {Number} end
 * @param {Number} width
 * @returns {{offset: number, factor: number}} conversion
 */
Range.conversion = function (start, end, width) {
    if (width != 0 && (end - start != 0)) {
        return {
            offset: start,
            factor: width / (end - start)
        }
    }
    else {
        return {
            offset: 0,
            factor: 1
        };
    }
};

// global (private) object to store drag params
var dragParams = {};

/**
 * Start dragging horizontally or vertically
 * @param {Event} event
 * @param {Object} component
 * @private
 */
Range.prototype._onDragStart = function(event, component) {
    dragParams.start = this.start;
    dragParams.end = this.end;

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

    var delta = (direction == 'horizontal') ? event.gesture.deltaX : event.gesture.deltaY,
        interval = (dragParams.end - dragParams.start),
        width = (direction == 'horizontal') ? component.width : component.height,
        diffRange = -delta / width * interval;

    this._applyRange(dragParams.start + diffRange, dragParams.end + diffRange);

    // fire a rangechange event
    this._trigger('rangechange');
};

/**
 * Stop dragging operating.
 * @param {event} event
 * @param {Component} component
 * @private
 */
Range.prototype._onDragEnd = function (event, component) {
    if (component.frame) {
        component.frame.style.cursor = 'auto';
    }

    // fire a rangechanged event
    this._trigger('rangechanged');
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
        var me = this;
        var zoom = function () {
            // perform the zoom action. Delta is normally 1 or -1
            var zoomFactor = delta / 5.0;
            var zoomAround = null;
            var frame = component.frame;
            if (frame) {
                var size, conversion;
                if (direction == 'horizontal') {
                    size = component.width;
                    conversion = me.conversion(size);
                    var frameLeft = util.getAbsoluteLeft(frame);
                    var mouseX = util.getPageX(event);
                    zoomAround = (mouseX - frameLeft) / conversion.factor + conversion.offset;
                }
                else {
                    size = component.height;
                    conversion = me.conversion(size);
                    var frameTop = util.getAbsoluteTop(frame);
                    var mouseY = util.getPageY(event);
                    zoomAround = ((frameTop + size - mouseY) - frameTop) / conversion.factor + conversion.offset;
                }
            }

            me.zoom(zoomFactor, zoomAround);
        };

        zoom();
    }

    // Prevent default actions caused by mouse wheel
    // (else the page and timeline both zoom and scroll)
    util.preventDefault(event);
};


/**
 * Zoom the range the given zoomfactor in or out. Start and end date will
 * be adjusted, and the timeline will be redrawn. You can optionally give a
 * date around which to zoom.
 * For example, try zoomfactor = 0.1 or -0.1
 * @param {Number} zoomFactor      Zooming amount. Positive value will zoom in,
 *                                 negative value will zoom out
 * @param {Number} zoomAround      Value around which will be zoomed. Optional
 */
Range.prototype.zoom = function(zoomFactor, zoomAround) {
    // if zoomAroundDate is not provided, take it half between start Date and end Date
    if (zoomAround == null) {
        zoomAround = (this.start + this.end) / 2;
    }

    // prevent zoom factor larger than 1 or smaller than -1 (larger than 1 will
    // result in a start>=end )
    if (zoomFactor >= 1) {
        zoomFactor = 0.9;
    }
    if (zoomFactor <= -1) {
        zoomFactor = -0.9;
    }

    // adjust a negative factor such that zooming in with 0.1 equals zooming
    // out with a factor -0.1
    if (zoomFactor < 0) {
        zoomFactor = zoomFactor / (1 + zoomFactor);
    }

    // zoom start and end relative to the zoomAround value
    var startDiff = (this.start - zoomAround);
    var endDiff = (this.end - zoomAround);

    // calculate new start and end
    var newStart = this.start - startDiff * zoomFactor;
    var newEnd = this.end - endDiff * zoomFactor;

    this.setRange(newStart, newEnd);
};

/**
 * Move the range with a given factor to the left or right. Start and end
 * value will be adjusted. For example, try moveFactor = 0.1 or -0.1
 * @param {Number}  moveFactor     Moving amount. Positive value will move right,
 *                                 negative value will move left
 */
Range.prototype.move = function(moveFactor) {
    // zoom start Date and end Date relative to the zoomAroundDate
    var diff = (this.end - this.start);

    // apply new values
    var newStart = this.start + diff * moveFactor;
    var newEnd = this.end + diff * moveFactor;

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
}
