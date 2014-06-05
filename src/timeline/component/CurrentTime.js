/**
 * A current time bar
 * @param {{range: Range, dom: Object}} timeline
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCurrentTime]
 * @constructor CurrentTime
 * @extends Component
 */

function CurrentTime (timeline, options) {
  this.timeline = timeline;

  this.options = options || {};

  this._create();
}

CurrentTime.prototype = new Component();

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
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
CurrentTime.prototype.repaint = function repaint() {
  // FIXME: CurrentTime should be on the foreground

  if (this.options.showCurrentTime) {
    if (this.bar.parentNode != this.timeline.dom.backgroundVertical) {
      // attach to the dom
      if (this.bar.parentNode) {
        this.bar.parentNode.removeChild(this.bar);
      }
      this.timeline.dom.backgroundVertical.appendChild(this.bar);

      this.start();
    }

    var now = new Date();
    var x = this.options.toScreen(now);

    this.bar.style.left = x + 'px';
    this.bar.title = 'Current time: ' + now;
  }
  else {
    // remove the line from the DOM
    if (this.bar.parentNode) {
      this.bar.parentNode.removeChild(this.bar);
      this.stop();
    }
  }

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
    var scale = me.timeline.range.conversion(me.timeline.props.center.width).scale;
    var interval = 1 / scale / 10;
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
