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

  this.options = options || {};
  this.defaultOptions = {
    autoResize: true
  };

  // create the HTML DOM
  this._create();

  // attach the root panel to the provided container
  if (!this.container) throw new Error('Cannot redraw root panel: no container attached');
  this.container.appendChild(this.getFrame());


  this._initWatch();
}

RootPanel.prototype = new Panel();

/**
 * Create the HTML DOM for the root panel
 */
RootPanel.prototype._create = function _create() {
  // create frame
  this.frame = document.createElement('div');

  // create event listeners for all interesting events, these events will be
  // emitted via emitter
  this.hammer = Hammer(this.frame, {
    prevent_default: true
  });
  this.listeners = {};

  var me = this;
  var events = [
    'touch', 'pinch', 'tap', 'doubletap', 'hold',
    'dragstart', 'drag', 'dragend',
    'mousewheel', 'DOMMouseScroll' // DOMMouseScroll is for Firefox
  ];
  events.forEach(function (event) {
    var listener = function () {
      var args = [event].concat(Array.prototype.slice.call(arguments, 0));
      me.emit.apply(me, args);
    };
    me.hammer.on(event, listener);
    me.listeners[event] = listener;
  });
};

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
RootPanel.prototype.setOptions = function setOptions(options) {
  if (options) {
    util.extend(this.options, options);

    this.redraw();

    this._initWatch();
  }
};

/**
 * Get the frame of the root panel
 */
RootPanel.prototype.getFrame = function getFrame() {
  return this.frame;
};

/**
 * Repaint the root panel
 */
RootPanel.prototype.redraw = function redraw() {
  // update class name
  var options = this.options;
  var editable = options.editable.updateTime || options.editable.updateGroup;
  var className = 'vis timeline rootpanel ' + options.orientation + (editable ? ' editable' : '');
  if (options.className) className += ' ' + util.option.asString(className);
  this.frame.className = className;

  // redraw the child components
  var childsResized = this._repaintChilds();

  // update frame size
  this.frame.style.maxHeight = util.option.asSize(this.options.maxHeight, '');
  this.frame.style.minHeight = util.option.asSize(this.options.minHeight, '');
  this._updateSize();

  // if the root panel or any of its childs is resized, redraw again,
  // as other components may need to be resized accordingly
  var resized = this._isResized() || childsResized;
  if (resized) {
    setTimeout(this.redraw.bind(this), 0);
  }
};

/**
 * Initialize watching when option autoResize is true
 * @private
 */
RootPanel.prototype._initWatch = function _initWatch() {
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
RootPanel.prototype._watch = function _watch() {
  var me = this;

  this._unwatch();

  var checkSize = function checkSize() {
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
        me.redraw();
        // TODO: emit a resize event instead?
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
RootPanel.prototype._unwatch = function _unwatch() {
  if (this.watchTimer) {
    clearInterval(this.watchTimer);
    this.watchTimer = undefined;
  }

  // TODO: remove event listener on window.resize
};
