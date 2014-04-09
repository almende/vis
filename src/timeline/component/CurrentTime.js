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

  this._create();
}

CurrentTime.prototype = new Component();

CurrentTime.prototype.setOptions = Component.prototype.setOptions;

/**
 * Create the HTML DOM for the current time bar
 * @private
 */
CurrentTime.prototype._create = function _create () {
  var bar = document.createElement('div');
  bar.className = 'currenttime';
  bar.style.position = 'absolute';
  bar.style.top = '0px';
  bar.style.height = '100%';

  this.bar = bar;
};

/**
 * Get the frame element of the current time bar
 * @returns {HTMLElement} frame
 */
CurrentTime.prototype.getFrame = function getFrame() {
  return this.bar;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
CurrentTime.prototype.repaint = function repaint() {
  var parent = this.parent;

  var now = new Date();
  var x = this.options.toScreen(now);

  this.bar.style.left = x + 'px';
  this.bar.title = 'Current time: ' + now;

  return false;
};

/**
 * Start auto refreshing the current time bar
 */
CurrentTime.prototype.start = function start() {
  var me = this;

  function update () {
    me.stop();

    // determine interval to refresh
    var scale = me.range.conversion(parent.width).scale;
    var interval = 1 / scale / 2;
    if (interval < 30)   interval = 30;
    if (interval > 1000) interval = 1000;

    me.repaint();

    // start a timer to adjust for the new time
    me.currentTimeTimer = setTimeout(update, interval);
  }

  update();
};

/**
 * Stop auto refreshing the current time bar
 */
CurrentTime.prototype.stop = function stop() {
  if (this.currentTimeTimer !== undefined) {
    clearTimeout(this.currentTimeTimer);
    delete this.currentTimeTimer;
  }
};
