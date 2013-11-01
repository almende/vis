/**
 * @constructor ItemRangeOverflow
 * @extends ItemRange
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemRangeOverflow (parent, data, options, defaultOptions) {
    this.props = {
        content: {
            left: 0,
            width: 0
        }
    };

    ItemRange.call(this, parent, data, options, defaultOptions);
}

ItemRangeOverflow.prototype = new ItemRange (null, null);

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemRangeOverflow.prototype.repaint = function repaint() {
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
        var className = this.data.className ? (' ' + this.data.className) : '';
        if (this.className != className) {
            this.className = className;
            dom.box.className = 'item rangeoverflow' + className;
            changed = true;
        }
    }

    return changed;
};

/**
 * Return the items width
 * @return {Integer} width
 */
ItemRangeOverflow.prototype.getWidth = function getWidth() {
    if (this.props.content !== undefined && this.width < this.props.content.width)
        return this.props.content.width;
    else
        return this.width;
}
