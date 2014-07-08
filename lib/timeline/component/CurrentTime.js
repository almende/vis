var util = require('../../util');
var Component = require('./Component');

/**
 * A current time bar
 * @param {{range: Range, dom: Object, domProps: Object}} body
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCurrentTime]
 * @constructor CurrentTime
 * @extends Component
 */
function CurrentTime (body, options) {
  this.body = body;

  // default options
  this.defaultOptions = {
    showCurrentTime: true
  };
  this.options = util.extend({}, this.defaultOptions);

  this._create();

  this.setOptions(options);
}

CurrentTime.prototype = new Component();

/**
 * Create the HTML DOM for the current time bar
 * @private
 */
CurrentTime.prototype._create = function() {
  var bar = document.createElement('div');
  bar.className = 'currenttime';
  bar.style.position = 'absolute';
  bar.style.top = '0px';
  bar.style.height = '100%';

  this.bar = bar;
};

/**
 * Destroy the CurrentTime bar
 */
CurrentTime.prototype.destroy = function () {
  this.options.showCurrentTime = false;
  this.redraw(); // will remove the bar from the DOM and stop refreshing

  this.body = null;
};

/**
 * Set options for the component. Options will be merged in current options.
 * @param {Object} options  Available parameters:
 *                          {boolean} [showCurrentTime]
 */
CurrentTime.prototype.setOptions = function(options) {
  if (options) {
    // copy all options that we know
    util.selectiveExtend(['showCurrentTime'], this.options, options);
  }
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
CurrentTime.prototype.redraw = function() {
  if (this.options.showCurrentTime) {
    var parent = this.body.dom.backgroundVertical;
    if (this.bar.parentNode != parent) {
      // attach to the dom
      if (this.bar.parentNode) {
        this.bar.parentNode.removeChild(this.bar);
      }
      parent.appendChild(this.bar);

      this.start();
    }

    var now = new Date();
    var x = this.body.util.toScreen(now);

    this.bar.style.left = x + 'px';
    this.bar.title = 'Current time: ' + now;
  }
  else {
    // remove the line from the DOM
    if (this.bar.parentNode) {
      this.bar.parentNode.removeChild(this.bar);
    }
    this.stop();
  }

  return false;
};

/**
 * Start auto refreshing the current time bar
 */
CurrentTime.prototype.start = function() {
  var me = this;

  function update () {
    me.stop();

    // determine interval to refresh
    var scale = me.body.range.conversion(me.body.domProps.center.width).scale;
    var interval = 1 / scale / 10;
    if (interval < 30)   interval = 30;
    if (interval > 1000) interval = 1000;

    me.redraw();

    // start a timer to adjust for the new time
    me.currentTimeTimer = setTimeout(update, interval);
  }

  update();
};

/**
 * Stop auto refreshing the current time bar
 */
CurrentTime.prototype.stop = function() {
  if (this.currentTimeTimer !== undefined) {
    clearTimeout(this.currentTimeTimer);
    delete this.currentTimeTimer;
  }
};

module.exports = CurrentTime;
