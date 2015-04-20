var Hammer = require('./module/hammer');

/**
 * Register a touch event, taking place before a gesture
 * @param {Hammer} hammer       A hammer instance
 * @param {function} callback   Callback, called as callback(event)
 */
exports.onTouch = function (hammer, callback) {
  callback.inputHandler = function (event) {
    if (event.isFirst && !isTouching) {
      callback(event);

      isTouching = true;
      setTimeout(function () {
        isTouching = false;
      }, 0);
    }
  };

  hammer.on('hammer.input', callback.inputHandler);
};

// isTouching is true while a touch action is being emitted
// this is a hack to prevent `touch` from being fired twice
var isTouching = false;

/**
 * Register a release event, taking place after a gesture
 * @param {Hammer} hammer       A hammer instance
 * @param {function} callback   Callback, called as callback(event)
 */
exports.onRelease = function (hammer, callback) {
  callback.inputHandler = function (event) {
    if (event.isFinal && !isReleasing) {
      callback(event);

      isReleasing = true;
      setTimeout(function () {
        isReleasing = false;
      }, 0);
    }
  };

  return hammer.on('hammer.input', callback.inputHandler);
};


// isReleasing is true while a release action is being emitted
// this is a hack to prevent `release` from being fired twice
var isReleasing = false;


/**
 * Unregister a touch event, taking place before a gesture
 * @param {Hammer} hammer       A hammer instance
 * @param {function} callback   Callback, called as callback(event)
 */
exports.offTouch = function (hammer, callback) {
  hammer.off('hammer.input', callback.inputHandler);
};

/**
 * Unregister a release event, taking place before a gesture
 * @param {Hammer} hammer       A hammer instance
 * @param {function} callback   Callback, called as callback(event)
 */
exports.offRelease = exports.offTouch;
