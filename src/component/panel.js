/**
 * A panel can contain components
 * @param {Component} [parent]
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]    Available parameters:
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | function} [className]
 * @constructor Panel
 * @extends Component
 */
function Panel(parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;
    this.options = {};

    this.setOptions(options);
}

Panel.prototype = new Component();

/**
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
Panel.prototype.getContainer = function () {
    return this.frame;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
Panel.prototype.repaint = function () {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'panel';

        if (options.className) {
            if (typeof options.className == 'function') {
                util.addClassName(frame, String(options.className()));
            }
            else {
                util.addClassName(frame, String(options.className));
            }
        }

        this.frame = frame;
        changed += 1;
    }
    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint panel: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint panel: parent has no container element');
        }
        parentContainer.appendChild(frame);
        changed += 1;
    }

    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));
    changed += update(frame.style, 'height', asSize(options.height, '100%'));

    return (changed > 0);
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
Panel.prototype.reflow = function () {
    var changed = 0,
        update = util.updateProperty,
        frame = this.frame;

    if (frame) {
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
        changed += update(this, 'height', frame.offsetHeight);
    }
    else {
        changed += 1;
    }

    return (changed > 0);
};

// exports
if (typeof exports !== 'undefined') {
    if (!('component' in exports)) {
        exports.component = {};
    }
    exports.component.Panel = Panel;
}
