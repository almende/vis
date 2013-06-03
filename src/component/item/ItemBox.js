/**
 * @constructor ItemBox
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemBox (parent, data, options, defaultOptions) {
    this.props = {
        dot: {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        },
        line: {
            top: 0,
            left: 0,
            width: 0,
            height: 0
        }
    };

    Item.call(this, parent, data, options, defaultOptions);
}

ItemBox.prototype = new Item (null, null);

/**
 * Select the item
 * @override
 */
ItemBox.prototype.select = function select() {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemBox.prototype.unselect = function unselect() {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemBox.prototype.repaint = function repaint() {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (!dom) {
        this._create();
        dom = this.dom;
        changed = true;
    }

    if (dom) {
        if (!this.parent) {
            throw new Error('Cannot repaint item: no parent attached');
        }
        var foreground = this.parent.getForeground();
        if (!foreground) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no foreground container element');
        }
        var background = this.parent.getBackground();
        if (!background) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no background container element');
        }
        var axis = this.parent.getAxis();
        if (!background) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no axis container element');
        }

        if (!dom.box.parentNode) {
            foreground.appendChild(dom.box);
            changed = true;
        }
        if (!dom.line.parentNode) {
            background.appendChild(dom.line);
            changed = true;
        }
        if (!dom.dot.parentNode) {
            axis.appendChild(dom.dot);
            changed = true;
        }

        // update contents
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
        var className = (this.data.className? ' ' + this.data.className : '') +
            (this.selected ? ' selected' : '');
        if (this.className != className) {
            this.className = className;
            dom.box.className = 'item box' + className;
            dom.line.className = 'item line' + className;
            dom.dot.className  = 'item dot' + className;
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
ItemBox.prototype.show = function show() {
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
ItemBox.prototype.hide = function hide() {
    var changed = false,
        dom = this.dom;
    if (dom) {
        if (dom.box.parentNode) {
            dom.box.parentNode.removeChild(dom.box);
            changed = true;
        }
        if (dom.line.parentNode) {
            dom.line.parentNode.removeChild(dom.line);
        }
        if (dom.dot.parentNode) {
            dom.dot.parentNode.removeChild(dom.dot);
        }
    }
    return changed;
};

/**
 * Reflow the item: calculate its actual size and position from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemBox.prototype.reflow = function reflow() {
    var changed = 0,
        update,
        dom,
        props,
        options,
        margin,
        start,
        align,
        orientation,
        top,
        left,
        data,
        range;

    if (this.data.start == undefined) {
        throw new Error('Property "start" missing in item ' + this.data.id);
    }

    data = this.data;
    range = this.parent && this.parent.range;
    if (data && range) {
        // TODO: account for the width of the item. Take some margin
        this.visible = (data.start > range.start) && (data.start < range.end);
    }
    else {
        this.visible = false;
    }

    if (this.visible) {
        dom = this.dom;
        if (dom) {
            update = util.updateProperty;
            props = this.props;
            options = this.options;
            start = this.parent.toScreen(this.data.start);
            align = options.align || this.defaultOptions.align;
            margin = options.margin && options.margin.axis || this.defaultOptions.margin.axis;
            orientation = options.orientation || this.defaultOptions.orientation;

            changed += update(props.dot, 'height', dom.dot.offsetHeight);
            changed += update(props.dot, 'width', dom.dot.offsetWidth);
            changed += update(props.line, 'width', dom.line.offsetWidth);
            changed += update(props.line, 'height', dom.line.offsetHeight);
            changed += update(props.line, 'top', dom.line.offsetTop);
            changed += update(this, 'width', dom.box.offsetWidth);
            changed += update(this, 'height', dom.box.offsetHeight);
            if (align == 'right') {
                left = start - this.width;
            }
            else if (align == 'left') {
                left = start;
            }
            else {
                // default or 'center'
                left = start - this.width / 2;
            }
            changed += update(this, 'left', left);

            changed += update(props.line, 'left', start - props.line.width / 2);
            changed += update(props.dot, 'left', start - props.dot.width / 2);
            changed += update(props.dot, 'top', -props.dot.height / 2);
            if (orientation == 'top') {
                top = margin;

                changed += update(this, 'top', top);
            }
            else {
                // default or 'bottom'
                var parentHeight = this.parent.height;
                top = parentHeight - this.height - margin;

                changed += update(this, 'top', top);
            }
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
ItemBox.prototype._create = function _create() {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};

        // create the box
        dom.box = document.createElement('DIV');
        // className is updated in repaint()

        // contents box (inside the background box). used for making margins
        dom.content = document.createElement('DIV');
        dom.content.className = 'content';
        dom.box.appendChild(dom.content);

        // line to axis
        dom.line = document.createElement('DIV');
        dom.line.className = 'line';

        // dot on axis
        dom.dot = document.createElement('DIV');
        dom.dot.className = 'dot';
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemBox.prototype.reposition = function reposition() {
    var dom = this.dom,
        props = this.props,
        orientation = this.options.orientation || this.defaultOptions.orientation;

    if (dom) {
        var box = dom.box,
            line = dom.line,
            dot = dom.dot;

        box.style.left = this.left + 'px';
        box.style.top = this.top + 'px';

        line.style.left = props.line.left + 'px';
        if (orientation == 'top') {
            line.style.top = 0 + 'px';
            line.style.height = this.top + 'px';
        }
        else {
            // orientation 'bottom'
            line.style.top = (this.top + this.height) + 'px';
            line.style.height = Math.max(this.parent.height - this.top - this.height +
                this.props.dot.height / 2, 0) + 'px';
        }

        dot.style.left = props.dot.left + 'px';
        dot.style.top = props.dot.top + 'px';
    }
};
