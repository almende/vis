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
RootPanel.prototype.setOptions = function (options) {
  if (options) {
    util.extend(this.options, options);

    this.repaint();

    var autoResize = this.getOption('autoResize');
    if (autoResize) {
      this._watch();
    }
    else {
      this._unwatch();
    }
  }
};

/**
 * Repaint the root panel
 */
RootPanel.prototype.repaint = function () {
  // create frame
  if (!this.frame) {
    if (!this.container) throw new Error('Cannot repaint root panel: no container attached');
    this.frame = document.createElement('div');
    this.container.appendChild(this.frame);

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
  }

  // update class name
  var options = this.options;
  var className = 'vis timeline rootpanel ' + options.orientation + (options.editable ? ' editable' : '');
  if (options.className) className += ' ' + util.option.asString(className);
  this.frame.className = className;

  // repaint the child components
  var childsResized = this._repaintChilds();

  // update frame size
  this.frame.style.maxHeight = util.option.asSize(this.options.maxHeight, '');
  this._updateSize();

  // if the root panel or any of its childs is resized, repaint again,
  // as other components may need to be resized accordingly
  var resized = this._isResized() || childsResized;
  if (resized) {
    setTimeout(this.repaint.bind(this), 0);
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
        me.repaint();
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
RootPanel.prototype._unwatch = function () {
  if (this.watchTimer) {
    clearInterval(this.watchTimer);
    this.watchTimer = undefined;
  }

  // TODO: remove event listener on window.resize
};
