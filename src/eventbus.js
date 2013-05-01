/**
 * An event bus can be used to emit events, and to subscribe to events
 * @constructor EventBus
 */
function EventBus() {
    this.subscriptions = [];
}

/**
 * Subscribe to an event
 * @param {String | RegExp} event   The event can be a regular expression, or
 *                                  a string with wildcards, like 'server.*'.
 * @param {function} callback.      Callback are called with three parameters:
 *                                  {String} event, {Object} [data],
 *                                  {*} [source]
 * @param {*} [target]
 * @returns {String} id    A subscription id
 */
EventBus.prototype.on = function (event, callback, target) {
    var subscription = {
        id:       util.randomUUID(),
        event:    event instanceof RegExp ? event : new RegExp(event.replace('*', '\\w+')),
        callback: (typeof callback === 'function') ? callback : null,
        target:   target
    };

    this.subscriptions.push(subscription);

    return subscription.id;
};

/**
 * Unsubscribe from an event
 * @param {String} id   subscription id
 */
EventBus.prototype.off = function (id) {
    var i = 0;
    while (i < this.subscriptions.length) {
        var subscription = this.subscriptions[i];
        if (subscription.id == id) {
            this.subscriptions.splice(i, 1);
        }
        else {
            i++;
        }
    }
};

/**
 * Emit an event
 * @param {String} event
 * @param {Object} [data]
 * @param {*} [source]
 */
EventBus.prototype.emit = function (event, data, source) {
    for (var i =0; i < this.subscriptions.length; i++) {
        var subscription = this.subscriptions[i];
        if (subscription.event.test(event)) {
            if (subscription.callback) {
                subscription.callback(event, data, source);
            }
        }
    }
};
