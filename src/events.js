
/**
 * Event listener (singleton)
 */
var events = {
    'listeners': [],

    /**
     * Find a single listener by its object
     * @param {Object} object
     * @return {Number} index  -1 when not found
     */
    'indexOf': function (object) {
        var listeners = this.listeners;
        for (var i = 0, iMax = this.listeners.length; i < iMax; i++) {
            var listener = listeners[i];
            if (listener && listener.object == object) {
                return i;
            }
        }
        return -1;
    },

    /**
     * Add an event listener
     * @param {Object} object
     * @param {String} event       The name of an event, for example 'select'
     * @param {function} callback  The callback method, called when the
     *                             event takes place
     */
    'addListener': function (object, event, callback) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (!listener) {
            listener = {
                'object': object,
                'events': {}
            };
            this.listeners.push(listener);
        }

        var callbacks = listener.events[event];
        if (!callbacks) {
            callbacks = [];
            listener.events[event] = callbacks;
        }

        // add the callback if it does not yet exist
        if (callbacks.indexOf(callback) == -1) {
            callbacks.push(callback);
        }
    },

    /**
     * Remove an event listener
     * @param {Object} object
     * @param {String} event       The name of an event, for example 'select'
     * @param {function} callback  The registered callback method
     */
    'removeListener': function (object, event, callback) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (listener) {
            var callbacks = listener.events[event];
            if (callbacks) {
                index = callbacks.indexOf(callback);
                if (index != -1) {
                    callbacks.splice(index, 1);
                }

                // remove the array when empty
                if (callbacks.length == 0) {
                    delete listener.events[event];
                }
            }

            // count the number of registered events. remove listener when empty
            var count = 0;
            var events = listener.events;
            for (var e in events) {
                if (events.hasOwnProperty(e)) {
                    count++;
                }
            }
            if (count == 0) {
                delete this.listeners[index];
            }
        }
    },

    /**
     * Remove all registered event listeners
     */
    'removeAllListeners': function () {
        this.listeners = [];
    },

    /**
     * Trigger an event. All registered event handlers will be called
     * @param {Object} object
     * @param {String} event
     * @param {Object} properties (optional)
     */
    'trigger': function (object, event, properties) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (listener) {
            var callbacks = listener.events[event];
            if (callbacks) {
                for (var i = 0, iMax = callbacks.length; i < iMax; i++) {
                    callbacks[i](properties);
                }
            }
        }
    }
};

// exports
vis.events = events;
