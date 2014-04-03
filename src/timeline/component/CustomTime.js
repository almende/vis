/**
 * A custom time bar
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCustomTime]
 * @constructor CustomTime
 * @extends Component
 */

function CustomTime (options) {
  this.id = util.randomUUID();

  this.options = options || {};
  this.defaultOptions = {
    showCustomTime: false
  };

  this.customTime = new Date();
  this.eventParams = {}; // stores state parameters while dragging the bar
}

CustomTime.prototype = new Component();

Emitter(CustomTime.prototype);

CustomTime.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the container element of the bar, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
CustomTime.prototype.getContainer = function () {
  return this.frame;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
CustomTime.prototype.repaint = function () {
  var bar = this.frame,
      parent = this.parent;

  if (!parent) {
    throw new Error('Cannot repaint bar: no parent attached');
  }

  var parentContainer = parent.getContainer();
  if (!parentContainer) {
    throw new Error('Cannot repaint bar: parent has no container element');
  }

  if (!this.getOption('showCustomTime')) {
    if (bar) {
      parentContainer.removeChild(bar);
      delete this.frame;
    }

    return false;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'customtime';
    bar.style.position = 'absolute';
    bar.style.top = '0px';
    bar.style.height = '100%';

    parentContainer.appendChild(bar);

    var drag = document.createElement('div');
    drag.style.position = 'relative';
    drag.style.top = '0px';
    drag.style.left = '-10px';
    drag.style.height = '100%';
    drag.style.width = '20px';
    bar.appendChild(drag);

    this.frame = bar;

    // attach event listeners
    this.hammer = Hammer(bar, {
      prevent_default: true
    });
    this.hammer.on('dragstart', this._onDragStart.bind(this));
    this.hammer.on('drag',      this._onDrag.bind(this));
    this.hammer.on('dragend',   this._onDragEnd.bind(this));
  }

  var x = this.options.toScreen(this.customTime);

  bar.style.left = x + 'px';
  bar.title = 'Time: ' + this.customTime;

  return false;
};

/**
 * Set custom time.
 * @param {Date} time
 */
CustomTime.prototype.setCustomTime = function(time) {
  this.customTime = new Date(time.valueOf());
  this.repaint();
};

/**
 * Retrieve the current custom time.
 * @return {Date} customTime
 */
CustomTime.prototype.getCustomTime = function() {
  return new Date(this.customTime.valueOf());
};

/**
 * Start moving horizontally
 * @param {Event} event
 * @private
 */
CustomTime.prototype._onDragStart = function(event) {
  this.eventParams.dragging = true;
  this.eventParams.customTime = this.customTime;

  event.stopPropagation();
  event.preventDefault();
};

/**
 * Perform moving operating.
 * @param {Event} event
 * @private
 */
CustomTime.prototype._onDrag = function (event) {
  if (!this.eventParams.dragging) return;

  var deltaX = event.gesture.deltaX,
      x = this.options.toScreen(this.eventParams.customTime) + deltaX,
      time = this.options.toTime(x);

  this.setCustomTime(time);

  // fire a timechange event
  this.emit('timechange', {
    time: new Date(this.customTime.valueOf())
  });

  event.stopPropagation();
  event.preventDefault();
};

/**
 * Stop moving operating.
 * @param {event} event
 * @private
 */
CustomTime.prototype._onDragEnd = function (event) {
  if (!this.eventParams.dragging) return;

  // fire a timechanged event
  this.emit('timechanged', {
    time: new Date(this.customTime.valueOf())
  });

  event.stopPropagation();
  event.preventDefault();
};
