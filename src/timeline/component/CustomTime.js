/**
 * A custom time bar
 * @param {{range: Range, dom: Object}} timeline
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCustomTime]
 * @constructor CustomTime
 * @extends Component
 */

function CustomTime (timeline, options) {
  this.timeline = timeline;
  this.options = options || {};

  this.customTime = new Date();
  this.eventParams = {}; // stores state parameters while dragging the bar

  // create the DOM
  this._create();
}

CustomTime.prototype = new Component();

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
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
CustomTime.prototype.repaint = function () {
  if (this.options.showCustomTime) {
    if (this.bar.parentNode != this.timeline.dom.backgroundVertical) {
      // attach to the dom
      if (this.bar.parentNode) {
        this.bar.parentNode.removeChild(this.bar);
      }
      this.timeline.dom.backgroundVertical.appendChild(this.bar);
    }

    var x = this.options.toScreen(this.customTime);

    this.bar.style.left = x + 'px';
    this.bar.title = 'Time: ' + this.customTime;
  }
  else {
    // remove the line from the DOM
    if (this.bar.parentNode) {
      this.bar.parentNode.removeChild(this.bar);
    }
  }

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
  this.timeline.emitter.emit('timechange', {
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
  this.timeline.emitter.emit('timechanged', {
    time: new Date(this.customTime.valueOf())
  });

  event.stopPropagation();
  event.preventDefault();
};
