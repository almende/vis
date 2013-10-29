/**
 * A current time bar
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        Available parameters:
 *                                  {Boolean} [showCurrentTime]
 * @constructor CurrentTime
 * @extends Component
 */

function CurrentTime (parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

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
 * @return {Boolean} changed
 */
CurrentTime.prototype.repaint = function () {
    var bar = this.frame,
        parent = this.parent,
        parentContainer = parent.parent.getContainer();

    if (!parent) {
        throw new Error('Cannot repaint bar: no parent attached');
    }

    if (!parentContainer) {
        throw new Error('Cannot repaint bar: parent has no container element');
    }

    if (!this.getOption('showCurrentTime')) {
        if (bar) {
            parentContainer.removeChild(bar);
            delete this.frame;
        }

        return;
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

    if (!parent.conversion) {
        parent._updateConversion();
    }

    var now = new Date();
    var x = parent.toScreen(now);

    bar.style.left = x + 'px';
    bar.title = 'Current time: ' + now;

    // start a timer to adjust for the new time
    if (this.currentTimeTimer !== undefined) {
        clearTimeout(this.currentTimeTimer);
        delete this.currentTimeTimer;
    }

    var timeline = this;
    var interval = 1 / parent.conversion.factor / 2;

    if (interval < 30) {
        interval = 30;
    }
    
    this.currentTimeTimer = setTimeout(function() {
        timeline.repaint();
    }, interval);

    return false;
};
