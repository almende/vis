/**
 * A root panel can hold components. The root panel must be initialized with
 * a DOM element as container.
 * @param {HTMLElement} container
 * @param {Object} [options]    Available parameters: see RootPanel.setOptions.
 * @constructor RootPanel
 * @extends Panel
 */
function RootPanel(container, options) {
  this.id = util.randomUUID();
  this.container = container;

  // create functions to be used as DOM event listeners
  var me = this;
  this.hammer = null;

  // create listeners for all interesting events, these events will be emitted
  // via the controller
  var events = [
    'touch', 'pinch', 'tap', 'doubletap', 'hold',
    'dragstart', 'drag', 'dragend',
    'mousewheel', 'DOMMouseScroll' // DOMMouseScroll is for Firefox
  ];
  this.listeners = {};
  events.forEach(function (event) {
    me.listeners[event] = function () {
      var args = [event].concat(Array.prototype.slice.call(arguments, 0));
      me.controller.emit.apply(me.controller, args);
    };
  });

  this.options = options || {};
  this.defaultOptions = {
    autoResize: true
  };
}

RootPanel.prototype = new Panel();

/**
 * Set options. Will extend the current options.
 * @param {Object} [options]    Available parameters:
 *                              {String | function} [className]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {Boolean | function} [autoResize]
 */
RootPanel.prototype.setOptions = Component.prototype.setOptions;

/**
 * Repaint the component
 */
RootPanel.prototype.repaint = function () {
  var asSize = util.option.asSize,
      options = this.options,
      frame = this.frame;

  // create frame
  if (!frame) {
    frame = document.createElement('div');
    this.frame = frame;

    if (!this.container) throw new Error('Cannot repaint root panel: no container attached');
    this.container.appendChild(frame);

    this._registerListeners();
  }

  // update class name
  var className = 'vis timeline rootpanel ' + options.orientation + (options.editable ? ' editable' : '');
  if (options.className) className += ' ' + util.option.asString(className);
  frame.className = className;

  // update frame size
  this._updateSize();

  this._updateWatch();
};

/**
 * Update watching for resize, depending on the current option
 * @private
 */
RootPanel.prototype._updateWatch = function () {
  var autoResize = this.getOption('autoResize');
  if (autoResize) {
    this._watch();
  }
  else {
    this._unwatch();
  }
};

/**
 * Watch for changes in the size of the frame. On resize, the Panel will
 * automatically redraw itself.
 * @private
 */
RootPanel.prototype._watch = function () {
  var me = this;

  this._unwatch();

  var checkSize = function () {
    var autoResize = me.getOption('autoResize');
    if (!autoResize) {
      // stop watching when the option autoResize is changed to false
      me._unwatch();
      return;
    }

    if (me.frame) {
      // check whether the frame is resized
      if ((me.frame.clientWidth != me.lastWidth) ||
          (me.frame.clientHeight != me.lastHeight)) {
        me.lastWidth = me.frame.clientWidth;
        me.lastHeight = me.frame.clientHeight;
        me.requestRepaint();
      }
    }
  };

  // TODO: automatically cleanup the event listener when the frame is deleted
  util.addEventListener(window, 'resize', checkSize);

  this.watchTimer = setInterval(checkSize, 1000);
};

/**
 * Stop watching for a resize of the frame.
 * @private
 */
RootPanel.prototype._unwatch = function () {
  if (this.watchTimer) {
    clearInterval(this.watchTimer);
    this.watchTimer = undefined;
  }

  // TODO: remove event listener on window.resize
};

/**
 * Set controller for this component, or remove current controller by passing
 * null as parameter value.
 * @param {Controller | null} controller
 */
RootPanel.prototype.setController = function setController (controller) {
  this.controller = controller || null;

  if (this.controller) {
    this._registerListeners();
  }
  else {
    this._unregisterListeners();
  }
};

/**
 * Register event emitters emitted by the rootpanel
 * @private
 */
RootPanel.prototype._registerListeners = function () {
  if (this.frame && this.controller && !this.hammer) {
    this.hammer = Hammer(this.frame, {
      prevent_default: true
    });

    for (var event in this.listeners) {
      if (this.listeners.hasOwnProperty(event)) {
        this.hammer.on(event, this.listeners[event]);
      }
    }
  }
};

/**
 * Unregister event emitters from the rootpanel
 * @private
 */
RootPanel.prototype._unregisterListeners = function () {
  if (this.hammer) {
    for (var event in this.listeners) {
      if (this.listeners.hasOwnProperty(event)) {
        this.hammer.off(event, this.listeners[event]);
      }
    }

    this.hammer = null;
  }
};
