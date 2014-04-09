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

  // create the DOM
  this._create();
}

CustomTime.prototype = new Component();

CustomTime.prototype.setOptions = Component.prototype.setOptions;

/**
 * Create the DOM for the custom time
 * @private
 */
CustomTime.prototype._create = function _create () {
  var bar = document.createElement('div');
  bar.className = 'customtime';
  bar.style.position = 'absolute';
  bar.style.top = '0px';
  bar.style.height = '100%';
  this.bar = bar;

  var drag = document.createElement('div');
  drag.style.position = 'relative';
  drag.style.top = '0px';
  drag.style.left = '-10px';
  drag.style.height = '100%';
  drag.style.width = '20px';
  bar.appendChild(drag);

  // attach event listeners
  this.hammer = Hammer(bar, {
    prevent_default: true
  });
  this.hammer.on('dragstart', this._onDragStart.bind(this));
  this.hammer.on('drag',      this._onDrag.bind(this));
  this.hammer.on('dragend',   this._onDragEnd.bind(this));
};

/**
 * Get the frame element of the custom time bar
 * @returns {HTMLElement} frame
 */
CustomTime.prototype.getFrame = function getFrame() {
  return this.bar;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
CustomTime.prototype.repaint = function () {
  var x = this.options.toScreen(this.customTime);

  this.bar.style.left = x + 'px';
  this.bar.title = 'Time: ' + this.customTime;

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
