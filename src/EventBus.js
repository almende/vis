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
 *                                  {String} event, {*} [data], {*} [source]
 * @param {*} [target]
 * @returns {String} id    A subscription id
 */
EventBus.prototype.on = function (event, callback, target) {
  var regexp = (event instanceof RegExp) ?
      event :
      new RegExp(event.replace('*', '\\w+'));

  var subscription = {
    id:       util.randomUUID(),
    event:    event,
    regexp:   regexp,
    callback: (typeof callback === 'function') ? callback : null,
    target:   target
  };

  this.subscriptions.push(subscription);

  return subscription.id;
};

/**
 * Unsubscribe from an event
 * @param {String | Object} filter   Filter for subscriptions to be removed
 *                                   Filter can be a string containing a
 *                                   subscription id, or an object containing
 *                                   one or more of the fields id, event,
 *                                   callback, and target.
 */
EventBus.prototype.off = function (filter) {
  var i = 0;
  while (i < this.subscriptions.length) {
    var subscription = this.subscriptions[i];

    var match = true;
    if (filter instanceof Object) {
      // filter is an object. All fields must match
      for (var prop in filter) {
        if (filter.hasOwnProperty(prop)) {
          if (filter[prop] !== subscription[prop]) {
            match = false;
          }
        }
      }
    }
    else {
      // filter is a string, filter on id
      match = (subscription.id == filter);
    }

    if (match) {
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
 * @param {*} [data]
 * @param {*} [source]
 */
EventBus.prototype.emit = function (event, data, source) {
  for (var i =0; i < this.subscriptions.length; i++) {
    var subscription = this.subscriptions[i];
    if (subscription.regexp.test(event)) {
      if (subscription.callback) {
        subscription.callback(event, data, source);
      }
    }
  }
};
