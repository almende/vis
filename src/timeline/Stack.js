/**
 * @constructor Stack
 * Stacks items on top of each other.
 * @param {ItemSet} parent
 * @param {Object} [options]
 */
function Stack (parent, options) {
    this.parent = parent;

    this.options = options || {};
    this.defaultOptions = {
        order: function (a, b) {
            //return (b.width - a.width) || (a.left - b.left);  // TODO: cleanup
            // Order: ranges over non-ranges, ranged ordered by width, and
            // lastly ordered by start.
            if (a instanceof ItemRange) {
                if (b instanceof ItemRange) {
                    var aInt = (a.data.end - a.data.start);
                    var bInt = (b.data.end - b.data.start);
                    return (aInt - bInt) || (a.data.start - b.data.start);
                }
                else {
                    return -1;
                }
            }
            else {
                if (b instanceof ItemRange) {
                    return 1;
                }
                else {
                    return (a.data.start - b.data.start);
                }
            }
        },
        margin: {
            item: 10
        }
    };

    this.ordered = [];  // ordered items
}

/**
 * Set options for the stack
 * @param {Object} options  Available options:
 *                          {ItemSet} parent
 *                          {Number} margin
 *                          {function} order  Stacking order
 */
Stack.prototype.setOptions = function setOptions (options) {
    util.extend(this.options, options);

    // TODO: register on data changes at the connected parent itemset, and update the changed part only and immediately
};

/**
 * Stack the items such that they don't overlap. The items will have a minimal
 * distance equal to options.margin.item.
 */
Stack.prototype.update = function update() {
    this._order();
    this._stack();
};

/**
 * Order the items. The items are ordered by width first, and by left position
 * second.
 * If a custom order function has been provided via the options, then this will
 * be used.
 * @private
 */
Stack.prototype._order = function _order () {
    var items = this.parent.items;
    if (!items) {
        throw new Error('Cannot stack items: parent does not contain items');
    }

    // TODO: store the sorted items, to have less work later on
    var ordered = [];
    var index = 0;
    // items is a map (no array)
    util.forEach(items, function (item) {
        if (item.visible) {
            ordered[index] = item;
            index++;
        }
    });

    //if a customer stack order function exists, use it.
    var order = this.options.order || this.defaultOptions.order;
    if (!(typeof order === 'function')) {
        throw new Error('Option order must be a function');
    }

    ordered.sort(order);

    this.ordered = ordered;
};

/**
 * Adjust vertical positions of the events such that they don't overlap each
 * other.
 * @private
 */
Stack.prototype._stack = function _stack () {
    var i,
        iMax,
        ordered = this.ordered,
        options = this.options,
        orientation = options.orientation || this.defaultOptions.orientation,
        axisOnTop = (orientation == 'top'),
        margin;

    if (options.margin && options.margin.item !== undefined) {
        margin = options.margin.item;
    }
    else {
        margin = this.defaultOptions.margin.item
    }

    // calculate new, non-overlapping positions
    for (i = 0, iMax = ordered.length; i < iMax; i++) {
        var item = ordered[i];
        var collidingItem = null;
        do {
            // TODO: optimize checking for overlap. when there is a gap without items,
            //  you only need to check for items from the next item on, not from zero
            collidingItem = this.checkOverlap(ordered, i, 0, i - 1, margin);
            if (collidingItem != null) {
                // There is a collision. Reposition the event above the colliding element
                if (axisOnTop) {
                    item.top = collidingItem.top + collidingItem.height + margin;
                }
                else {
                    item.top = collidingItem.top - item.height - margin;
                }
            }
        } while (collidingItem);
    }
};

/**
 * Check if the destiny position of given item overlaps with any
 * of the other items from index itemStart to itemEnd.
 * @param {Array} items     Array with items
 * @param {int}  itemIndex  Number of the item to be checked for overlap
 * @param {int}  itemStart  First item to be checked.
 * @param {int}  itemEnd    Last item to be checked.
 * @return {Object | null}  colliding item, or undefined when no collisions
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 */
Stack.prototype.checkOverlap = function checkOverlap (items, itemIndex,
                                                      itemStart, itemEnd, margin) {
    var collision = this.collision;

    // we loop from end to start, as we suppose that the chance of a
    // collision is larger for items at the end, so check these first.
    var a = items[itemIndex];
    for (var i = itemEnd; i >= itemStart; i--) {
        var b = items[i];
        if (collision(a, b, margin)) {
            if (i != itemIndex) {
                return b;
            }
        }
    }

    return null;
};

/**
 * Test if the two provided items collide
 * The items must have parameters left, width, top, and height.
 * @param {Component} a     The first item
 * @param {Component} b     The second item
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 * @return {boolean}        true if a and b collide, else false
 */
Stack.prototype.collision = function collision (a, b, margin) {
    var a_width;
    var b_width;

    if (a.props.content !== undefined && a.width < a.props.content.width)
        a_width = a.props.content.width;
    else
        a_width = a.width;

    if (b.props.content !== undefined && b.width < b.props.content.width)
        b_width = b.props.content.width;
    else
        b_width = b.width
    
    return ((a.left - margin) < (b.left + b_width) &&
        (a.left + a_width + margin) > b.left &&
        (a.top - margin) < (b.top + b.height) &&
        (a.top + a.height + margin) > b.top);
};
