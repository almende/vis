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
    this.start = 0; // Number
    this.end = 0;   // Number

    this.options = {
        min: null,
        max: null,
        zoomMin: null,
        zoomMax: null
    };

    this.setOptions(options);

    this.listeners = [];
}

/**
 * Set options for the range controller
 * @param {Object} options      Available options:
 *                              {Number} start  Set start value of the range
 *                              {Number} end    Set end value of the range
 *                              {Number} min    Minimum value for start
 *                              {Number} max    Maximum value for end
 *                              {Number} zoomMin    Set a minimum value for
 *                                                  (end - start).
 *                              {Number} zoomMax    Set a maximum value for
 *                                                  (end - start).
 */
Range.prototype.setOptions = function (options) {
    util.extend(this.options, options);

    if (options.start != null || options.end != null) {
        this.setRange(options.start, options.end);
    }
};

/**
 * Add listeners for mouse and touch events to the component
 * @param {Component} component
 * @param {String} event        Available events: 'move', 'zoom'
 * @param {String} direction    Available directions: 'horizontal', 'vertical'
 */
Range.prototype.subscribe = function (component, event, direction) {
    var me = this;
    var listener;

    if (direction != 'horizontal' && direction != 'vertical') {
        throw new TypeError('Unknown direction "' + direction + '". ' +
            'Choose "horizontal" or "vertical".');
    }

    //noinspection FallthroughInSwitchStatementJS
    if (event == 'move') {
        listener = {
            component: component,
            event: event,
            direction: direction,
            callback: function (event) {
                me._onMouseDown(event, listener);
            },
            params: {}
        };

        component.on('mousedown', listener.callback);
        me.listeners.push(listener);
    }
    else if (event == 'zoom') {
        listener = {
            component: component,
            event: event,
            direction: direction,
            callback: function (event) {
                me._onMouseWheel(event, listener);
            },
            params: {}
        };

        component.on('mousewheel', listener.callback);
        me.listeners.push(listener);
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
 * @param {Number} start
 * @param {Number} end
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
 * @param {Number} start
 * @param {Number} end
 * @return {Boolean} changed
 * @private
 */
Range.prototype._applyRange = function(start, end) {
    var newStart = (start != null) ? util.cast(start, 'Number') : this.start;
    var newEnd = (end != null) ? util.cast(end, 'Number') : this.end;
    var diff;

    // check for valid number
    if (isNaN(newStart)) {
        throw new Error('Invalid start "' + start + '"');
    }
    if (isNaN(newEnd)) {
        throw new Error('Invalid end "' + end + '"');
    }

    // prevent start < end
    if (newEnd < newStart) {
        newEnd = newStart;
    }

    // prevent start < min
    if (this.options.min != null) {
        var min = this.options.min.valueOf();
        if (newStart < min) {
            diff = (min - newStart);
            newStart += diff;
            newEnd += diff;
        }
    }

    // prevent end > max
    if (this.options.max != null) {
        var max = this.options.max.valueOf();
        if (newEnd > max) {
            diff = (newEnd - max);
            newStart -= diff;
            newEnd -= diff;
        }
    }

    // prevent (end-start) > zoomMin
    if (this.options.zoomMin != null) {
        var zoomMin = this.options.zoomMin.valueOf();
        if (zoomMin < 0) {
            zoomMin = 0;
        }
        if ((newEnd - newStart) < zoomMin) {
            if ((this.end - this.start) > zoomMin) {
                // zoom to the minimum
                diff = (zoomMin - (newEnd - newStart));
                newStart -= diff / 2;
                newEnd += diff / 2;
            }
            else {
                // ingore this action, we are already zoomed to the minimum
                newStart = this.start;
                newEnd = this.end;
            }
        }
    }

    // prevent (end-start) > zoomMin
    if (this.options.zoomMax != null) {
        var zoomMax = this.options.zoomMax.valueOf();
        if (zoomMax < 0) {
            zoomMax = 0;
        }
        if ((newEnd - newStart) > zoomMax) {
            if ((this.end - this.start) < zoomMax) {
                // zoom to the maximum
                diff = ((newEnd - newStart) - zoomMax);
                newStart += diff / 2;
                newEnd -= diff / 2;
            }
            else {
                // ingore this action, we are already zoomed to the maximum
                newStart = this.start;
                newEnd = this.end;
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
    var start = this.start;
    var end = this.end;

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

/**
 * Start moving horizontally or vertically
 * @param {Event} event
 * @param {Object} listener   Listener containing the component and params
 * @private
 */
Range.prototype._onMouseDown = function(event, listener) {
    event = event || window.event;
    var params = listener.params;

    // only react on left mouse button down
    var leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
    if (!leftButtonDown) {
        return;
    }

    // get mouse position
    params.mouseX = util.getPageX(event);
    params.mouseY = util.getPageY(event);
    params.previousLeft = 0;
    params.previousOffset = 0;

    params.moved = false;
    params.start = this.start;
    params.end = this.end;

    var frame = listener.component.frame;
    if (frame) {
        frame.style.cursor = 'move';
    }

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the timeaxis,
    // so we can remove the eventlisteners lateron in the function onmouseup
    var me = this;
    if (!params.onMouseMove) {
        params.onMouseMove = function (event) {
            me._onMouseMove(event, listener);
        };
        util.addEventListener(document, "mousemove", params.onMouseMove);
    }
    if (!params.onMouseUp) {
        params.onMouseUp = function (event) {
            me._onMouseUp(event, listener);
        };
        util.addEventListener(document, "mouseup", params.onMouseUp);
    }

    util.preventDefault(event);
};

/**
 * Perform moving operating.
 * This function activated from within the funcion TimeAxis._onMouseDown().
 * @param {Event} event
 * @param {Object} listener
 * @private
 */
Range.prototype._onMouseMove = function (event, listener) {
    event = event || window.event;

    var params = listener.params;

    // calculate change in mouse position
    var mouseX = util.getPageX(event);
    var mouseY = util.getPageY(event);

    if (params.mouseX == undefined) {
        params.mouseX = mouseX;
    }
    if (params.mouseY == undefined) {
        params.mouseY = mouseY;
    }

    var diffX = mouseX - params.mouseX;
    var diffY = mouseY - params.mouseY;
    var diff = (listener.direction == 'horizontal') ? diffX : diffY;

    // if mouse movement is big enough, register it as a "moved" event
    if (Math.abs(diff) >= 1) {
        params.moved = true;
    }

    var interval = (params.end - params.start);
    var width = (listener.direction == 'horizontal') ?
        listener.component.width : listener.component.height;
    var diffRange = -diff / width * interval;
    this._applyRange(params.start + diffRange, params.end + diffRange);

    // fire a rangechange event
    this._trigger('rangechange');

    util.preventDefault(event);
};

/**
 * Stop moving operating.
 * This function activated from within the function Range._onMouseDown().
 * @param {event} event
 * @param {Object} listener
 * @private
 */
Range.prototype._onMouseUp = function (event, listener) {
    event = event || window.event;

    var params = listener.params;

    if (listener.component.frame) {
        listener.component.frame.style.cursor = 'auto';
    }

    // remove event listeners here, important for Safari
    if (params.onMouseMove) {
        util.removeEventListener(document, "mousemove", params.onMouseMove);
        params.onMouseMove = null;
    }
    if (params.onMouseUp) {
        util.removeEventListener(document, "mouseup",   params.onMouseUp);
        params.onMouseUp = null;
    }
    //util.preventDefault(event);

    if (params.moved) {
        // fire a rangechanged event
        this._trigger('rangechanged');
    }
};

/**
 * Event handler for mouse wheel event, used to zoom
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {Event} event
 * @param {Object} listener
 * @private
 */
Range.prototype._onMouseWheel = function(event, listener) {
    event = event || window.event;

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
            var frame = listener.component.frame;
            if (frame) {
                var size, conversion;
                if (listener.direction == 'horizontal') {
                    size = listener.component.width;
                    conversion = me.conversion(size);
                    var frameLeft = util.getAbsoluteLeft(frame);
                    var mouseX = util.getPageX(event);
                    zoomAround = (mouseX - frameLeft) / conversion.factor + conversion.offset;
                }
                else {
                    size = listener.component.height;
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

    // Prevent default actions caused by mouse wheel.
    // That might be ugly, but we handle scrolls somehow
    // anyway, so don't bother here...
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
