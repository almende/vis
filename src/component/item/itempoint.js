/**
 * @constructor ItemPoint
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data       Object containing parameters start
 *                            content, className.
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 */
function ItemPoint (parent, data, options) {
    this.props = {
        dot: {
            top: 0,
            width: 0,
            height: 0
        },
        content: {
            height: 0,
            marginLeft: 0
        }
    };

    Item.call(this, parent, data, options);
}

ItemPoint.prototype = new Item (null, null);

/**
 * Select the item
 * @override
 */
ItemPoint.prototype.select = function () {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemPoint.prototype.unselect = function () {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemPoint.prototype.repaint = function () {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (this.visible) {
        if (!dom) {
            this._create();
            changed = true;
        }
        dom = this.dom;

        if (dom) {
            if (!this.options && !this.options.parent) {
                throw new Error('Cannot repaint item: no parent attached');
            }
            var parentContainer = this.parent.getContainer();
            if (!parentContainer) {
                throw new Error('Cannot repaint time axis: parent has no container element');
            }

            if (!dom.point.parentNode) {
                parentContainer.appendChild(dom.point);
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
                dom.point.className  = 'item point' + className;
                changed = true;
            }
        }
    }
    else {
        // hide when visible
        if (dom) {
            if (dom.point.parentNode) {
                dom.point.parentNode.removeChild(dom.point);
                changed = true;
            }
        }
    }

    return changed;
};

/**
 * Reflow the item: calculate its actual size from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemPoint.prototype.reflow = function () {
    if (this.data.start == undefined) {
        throw new Error('Property "start" missing in item ' + this.data.id);
    }

    var update = util.updateProperty,
        dom = this.dom,
        props = this.props,
        options = this.options,
        orientation = options.orientation,
        start = this.parent.toScreen(this.data.start),
        changed = 0,
        top;

    if (dom) {
        changed += update(this, 'width', dom.point.offsetWidth);
        changed += update(this, 'height', dom.point.offsetHeight);
        changed += update(props.dot, 'width', dom.dot.offsetWidth);
        changed += update(props.dot, 'height', dom.dot.offsetHeight);
        changed += update(props.content, 'height', dom.content.offsetHeight);

        if (orientation == 'top') {
            top = options.margin.axis;
        }
        else {
            // default or 'bottom'
            var parentHeight = this.parent.height;
            top = Math.max(parentHeight - this.height - options.margin.axis, 0);
        }
        changed += update(this, 'top', top);
        changed += update(this, 'left', start - props.dot.width / 2);
        changed += update(props.content, 'marginLeft', 1.5 * props.dot.width);
        //changed += update(props.content, 'marginRight', 0.5 * props.dot.width); // TODO

        changed += update(props.dot, 'top', (this.height - props.dot.height) / 2);
    }
    else {
        changed += 1;
    }

    return (changed > 0);
};

/**
 * Create an items DOM
 * @private
 */
ItemPoint.prototype._create = function () {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};

        // background box
        dom.point = document.createElement('div');
        // className is updated in repaint()

        // contents box, right from the dot
        dom.content = document.createElement('div');
        dom.content.className = 'content';
        dom.point.appendChild(dom.content);

        // dot at start
        dom.dot = document.createElement('div');
        dom.dot.className  = 'dot';
        dom.point.appendChild(dom.dot);
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemPoint.prototype.reposition = function () {
    var dom = this.dom,
        props = this.props;

    if (dom) {
        dom.point.style.top = this.top + 'px';
        dom.point.style.left = this.left + 'px';

        dom.content.style.marginLeft = props.content.marginLeft + 'px';
        //dom.content.style.marginRight = props.content.marginRight + 'px'; // TODO

        dom.dot.style.top = props.dot.top + 'px';
    }
};

// exports
vis.component.item.point = ItemPoint;
