/**
 * A current time bar
 * @param {Range} range
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCurrentTime]
 * @constructor CurrentTime
 * @extends Component
 */

function CurrentTime (range, options) {
  this.id = util.randomUUID();

  this.range = range;
  this.options = options || {};
  this.defaultOptions = {
    showCurrentTime: false
  };
}

CurrentTime.prototype = new Component();

CurrentTime.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the container element of the bar, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
CurrentTime.prototype.getContainer = function () {
  return this.frame;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
CurrentTime.prototype.repaint = function () {
  var bar = this.frame,
      parent = this.parent;

  if (!parent) {
    throw new Error('Cannot repaint bar: no parent attached');
  }

  var parentContainer = parent.getContainer();
  if (!parentContainer) {
    throw new Error('Cannot repaint bar: parent has no container element');
  }

  if (!this.getOption('showCurrentTime')) {
    if (bar) {
      parentContainer.removeChild(bar);
      delete this.frame;
    }

    return false;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'currenttime';
    bar.style.position = 'absolute';
    bar.style.top = '0px';
    bar.style.height = '100%';

    parentContainer.appendChild(bar);
    this.frame = bar;
  }

  var now = new Date();
  var x = this.options.toScreen(now);

  bar.style.left = x + 'px';
  bar.title = 'Current time: ' + now;

  // start a timer to adjust for the new time
  if (this.currentTimeTimer !== undefined) {
    clearTimeout(this.currentTimeTimer);
    delete this.currentTimeTimer;
  }

  // determine interval to refresh
  var timeline = this;
  var scale = this.range.conversion(parent.width).scale;
  var interval = 1 / scale / 2;
  if (interval < 30)   interval = 30;
  if (interval > 1000) interval = 1000;

  this.currentTimeTimer = setTimeout(function() {
    timeline.repaint();
  }, interval);

  return false;
};
