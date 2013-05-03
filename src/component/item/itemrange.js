/**
 * @constructor ItemRange
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data       Object containing parameters start, end
 *                            content, className.
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 */
function ItemRange (parent, data, options) {
    this.props = {
        content: {
            left: 0,
            width: 0
        }
    };

    Item.call(this, parent, data, options);
}

ItemRange.prototype = new Item (null, null);

/**
 * Select the item
 * @override
 */
ItemRange.prototype.select = function select() {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemRange.prototype.unselect = function unselect() {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemRange.prototype.repaint = function repaint() {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (!dom) {
        this._create();
        dom = this.dom;
        changed = true;
    }

    if (dom) {
        if (!this.options && !this.options.parent) {
            throw new Error('Cannot repaint item: no parent attached');
        }
        var foreground = this.parent.getForeground();
        if (!foreground) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no foreground container element');
        }

        if (!dom.box.parentNode) {
            foreground.appendChild(dom.box);
            changed = true;
        }

        // update content
        if (this.data.content != this.content) {
            this.content = this.data.content;
            if (this.content instanceof Element) {
                dom.content.innerHTML = '';
                dom.content.appendChild(this.content);
            }
            else if (this.data.content != undefined) {
                dom.content.innerHTML = this.content;
            }
            else {
                throw new Error('Property "content" missing in item ' + this.data.id);
            }
            changed = true;
        }

        // update class
        var className = this.data.className ? ('' + this.data.className) : '';
        if (this.className != className) {
            this.className = className;
            dom.box.className = 'item range' + className;
            changed = true;
        }
    }

    return changed;
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 * @return {Boolean} changed
 */
ItemRange.prototype.show = function show() {
    if (!this.dom || !this.dom.box.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
ItemRange.prototype.hide = function hide() {
    var changed = false,
        dom = this.dom;
    if (dom) {
        if (dom.box.parentNode) {
            dom.box.parentNode.removeChild(dom.box);
            changed = true;
        }
    }
    return changed;
};

/**
 * Reflow the item: calculate its actual size from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemRange.prototype.reflow = function reflow() {
    var changed = 0,
        dom,
        props,
        options,
        parent,
        start,
        end,
        data,
        range,
        update,
        box,
        parentWidth,
        contentLeft,
        orientation,
        top;

    if (this.data.start == undefined) {
        throw new Error('Property "start" missing in item ' + this.data.id);
    }
    if (this.data.end == undefined) {
        throw new Error('Property "end" missing in item ' + this.data.id);
    }

    data = this.data;
    range = this.parent && this.parent.range;
    if (data && range) {
        // TODO: account for the width of the item. Take some margin
        this.visible = (data.start < range.end) && (data.end > range.start);
    }
    else {
        this.visible = false;
    }

    if (this.visible) {
        dom = this.dom;
        if (dom) {
            props = this.props;
            options = this.options;
            parent = this.parent;
            start = parent.toScreen(this.data.start);
            end = parent.toScreen(this.data.end);
            update = util.updateProperty;
            box = dom.box;
            parentWidth = parent.width;
            orientation = options.orientation;

            changed += update(props.content, 'width', dom.content.offsetWidth);

            changed += update(this, 'height', box.offsetHeight);

            // limit the width of the this, as browsers cannot draw very wide divs
            if (start < -parentWidth) {
                start = -parentWidth;
            }
            if (end > 2 * parentWidth) {
                end = 2 * parentWidth;
            }

            // when range exceeds left of the window, position the contents at the left of the visible area
            if (start < 0) {
                contentLeft = Math.min(-start,
                    (end - start - props.content.width - 2 * options.padding));
                // TODO: remove the need for options.padding. it's terrible.
            }
            else {
                contentLeft = 0;
            }
            changed += update(props.content, 'left', contentLeft);

            if (orientation == 'top') {
                top = options.margin.axis;
                changed += update(this, 'top', top);
            }
            else {
                // default or 'bottom'
                top = parent.height - this.height - options.margin.axis;
                changed += update(this, 'top', top);
            }

            changed += update(this, 'left', start);
            changed += update(this, 'width', Math.max(end - start, 1)); // TODO: reckon with border width;
        }
        else {
            changed += 1;
        }
    }

    return (changed > 0);
};

/**
 * Create an items DOM
 * @private
 */
ItemRange.prototype._create = function _create() {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};
        // background box
        dom.box = document.createElement('div');
        // className is updated in repaint()

        // contents box
        dom.content = document.createElement('div');
        dom.content.className = 'content';
        dom.box.appendChild(dom.content);
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemRange.prototype.reposition = function reposition() {
    var dom = this.dom,
        props = this.props;

    if (dom) {
        dom.box.style.top = this.top + 'px';
        dom.box.style.left = this.left + 'px';
        dom.box.style.width = this.width + 'px';

        dom.content.style.left = props.content.left + 'px';
    }
};
