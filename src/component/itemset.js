/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See ItemSet.setOptions for the available
 *                                  options.
 * @constructor ItemSet
 * @extends Panel
 */
// TODO: improve performance by replacing all Array.forEach with a for loop
function ItemSet(parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

    // one options object is shared by this itemset and all its items
    this.options = {
        style: 'box',
        align: 'center',
        orientation: 'bottom',
        margin: {
            axis: 20,
            item: 10
        },
        padding: 5
    };

    this.dom = {};

    var me = this;
    this.items = null;  // DataSet
    this.range = null; // Range or Object {start: number, end: number}

    this.listeners = {
        'add': function (event, params) {
            me._onAdd(params.items);
        },
        'update': function (event, params) {
            me._onUpdate(params.items);
        },
        'remove': function (event, params) {
            me._onRemove(params.items);
        }
    };

    this.contents = {};    // object with an Item for every data item
    this.queue = {};       // queue with id/actions: 'add', 'update', 'delete'
    this.stack = new Stack(this);
    this.conversion = null;

    if (options) {
        this.setOptions(options);
    }
}

ItemSet.prototype = new Panel();

// available item types will be registered here
ItemSet.types = {
    box: ItemBox,
    range: ItemRange,
    point: ItemPoint
};

/**
 * Set options for the ItemSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} [className]
 *                              class name for the itemset
 *                           {String} [style]
 *                              Default style for the items. Choose from 'box'
 *                              (default), 'point', or 'range'. The default
 *                              Style can be overwritten by individual items.
 *                           {String} align
 *                              Alignment for the items, only applicable for
 *                              ItemBox. Choose 'center' (default), 'left', or
 *                              'right'.
 *                           {String} orientation
 *                              Orientation of the item set. Choose 'top' or
 *                              'bottom' (default).
 *                           {Number} margin.axis
 *                              Margin between the axis and the items in pixels.
 *                              Default is 20.
 *                           {Number} margin.item
 *                              Margin between items in pixels. Default is 10.
 *                           {Number} padding
 *                              Padding of the contents of an item in pixels.
 *                              Must correspond with the items css. Default is 5.
 */
ItemSet.prototype.setOptions = function setOptions(options) {
    util.extend(this.options, options);

    // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis

    this.stack.setOptions(this.options);
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
ItemSet.prototype.setRange = function setRange(range) {
    if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
        throw new TypeError('Range must be an instance of Range, ' +
            'or an object containing start and end.');
    }
    this.range = range;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
ItemSet.prototype.repaint = function repaint() {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;

    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'itemset';

        if (options.className) {
            util.addClassName(frame, util.option.asString(options.className));
        }

        // create background panel
        var background = document.createElement('div');
        background.className = 'background';
        frame.appendChild(background);
        this.dom.background = background;

        // create foreground panel
        var foreground = document.createElement('div');
        foreground.className = 'foreground';
        frame.appendChild(foreground);
        this.dom.foreground = foreground;

        // create axis panel
        var axis = document.createElement('div');
        axis.className = 'itemset-axis';
        //frame.appendChild(axis);
        this.dom.axis = axis;

        this.frame = frame;
        changed += 1;
    }

    if (!this.parent) {
        throw new Error('Cannot repaint itemset: no parent attached');
    }
    var parentContainer = this.parent.getContainer();
    if (!parentContainer) {
        throw new Error('Cannot repaint itemset: parent has no container element');
    }
    if (!frame.parentNode) {
        parentContainer.appendChild(frame);
        changed += 1;
    }
    if (!this.dom.axis.parentNode) {
        parentContainer.appendChild(this.dom.axis);
        changed += 1;
    }

    // reposition frame
    changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));
    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));

    // reposition axis
    changed += update(this.dom.axis.style, 'top', asSize(options.top, '0px'));

    this._updateConversion();

    var me = this,
        queue = this.queue,
        items = this.items,
        contents = this.contents,
        dataOptions = {
            fields: ['id', 'start', 'end', 'content', 'type']
        };
    // TODO: copy options from the itemset itself?
    // TODO: make orientation dynamically changable for the items

    // show/hide added/changed/removed items
    Object.keys(queue).forEach(function (id) {
        //var entry = queue[id];
        var action = queue[id];
        var item = contents[id];
        //var item = entry.item;
        //noinspection FallthroughInSwitchStatementJS
        switch (action) {
            case 'add':
            case 'update':
                var itemData = items.get(id, dataOptions);

                var type = itemData.type ||
                    (itemData.start && itemData.end && 'range') ||
                    'box';
                var constructor = ItemSet.types[type];

                // TODO: how to handle items with invalid data? hide them and give a warning? or throw an error?
                if (item) {
                    // update item
                    if (!constructor || !(item instanceof constructor)) {
                        // item type has changed, hide and delete the item
                        changed += item.hide();
                        item = null;
                    }
                    else {
                        item.data = itemData; // TODO: create a method item.setData ?
                        changed++;
                    }
                }

                if (!item) {
                    // create item
                    if (constructor) {
                        item = new constructor(me, itemData, options);
                        changed++;
                    }
                    else {
                        throw new TypeError('Unknown item type "' + type + '"');
                    }
                }

                // update lists
                contents[id] = item;
                delete queue[id];
                break;

            case 'remove':
                if (item) {
                    // remove DOM of the item
                    changed += item.hide();
                }

                // update lists
                delete contents[id];
                delete queue[id];
                break;

            default:
                console.log('Error: unknown action "' + action + '"');
        }
    });

    // reposition all items. Show items only when in the visible area
    util.forEach(this.contents, function (item) {
        if (item.visible) {
            changed += item.show();
            item.reposition();
        }
        else {
            changed += item.hide();
        }
    });

    return (changed > 0);
};

/**
 * Get the foreground container element
 * @return {HTMLElement} foreground
 */
ItemSet.prototype.getForeground = function getForeground() {
    return this.dom.foreground;
};

/**
 * Get the background container element
 * @return {HTMLElement} background
 */
ItemSet.prototype.getBackground = function getBackground() {
    return this.dom.background;
};

/**
 * Get the axis container element
 * @return {HTMLElement} axis
 */
ItemSet.prototype.getAxis = function getAxis() {
    return this.dom.axis;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
ItemSet.prototype.reflow = function reflow () {
    var changed = 0,
        options = this.options,
        update = util.updateProperty,
        asNumber = util.option.asNumber,
        frame = this.frame;

    if (frame) {
        this._updateConversion();

        util.forEach(this.contents, function (item) {
            changed += item.reflow();
        });

        // TODO: stack.update should be triggered via an event, in stack itself
        // TODO: only update the stack when there are changed items
        this.stack.update();

        var maxHeight = asNumber(options.maxHeight);
        var height;
        if (options.height != null) {
            height = frame.offsetHeight;
        }
        else {
            // height is not specified, determine the height from the height and positioned items
            var visibleItems = this.stack.ordered; // TODO: not so nice way to get the filtered items
            if (visibleItems.length) {
                var min = visibleItems[0].top;
                var max = visibleItems[0].top + visibleItems[0].height;
                util.forEach(visibleItems, function (item) {
                    min = Math.min(min, item.top);
                    max = Math.max(max, (item.top + item.height));
                });
                height = (max - min) + options.margin.axis + options.margin.item;
            }
            else {
                height = options.margin.axis + options.margin.item;
            }
        }
        if (maxHeight != null) {
            height = Math.min(height, maxHeight);
        }
        changed += update(this, 'height', height);

        // calculate height from items
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
    }
    else {
        changed += 1;
    }

    return (changed > 0);
};

/**
 * Hide this component from the DOM
 * @return {Boolean} changed
 */
ItemSet.prototype.hide = function hide() {
    var changed = false;

    // remove the DOM
    if (this.frame && this.frame.parentNode) {
        this.frame.parentNode.removeChild(this.frame);
        changed = true;
    }
    if (this.dom.axis && this.dom.axis.parentNode) {
        this.dom.axis.parentNode.removeChild(this.dom.axis);
        changed = true;
    }

    return changed;
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
ItemSet.prototype.setItems = function setItems(items) {
    var me = this,
        dataItems,
        ids;

    // unsubscribe from current dataset
    var current = this.items;
    if (current) {
        util.forEach(this.listeners, function (callback, event) {
            current.unsubscribe(event, callback);
        });

        // remove all drawn items
        dataItems = current.get({fields: ['id']});
        ids = [];
        util.forEach(dataItems, function (dataItem, index) {
            ids[index] = dataItem.id;
        });
        this._onRemove(ids);
    }

    // replace the dataset
    if (!items) {
        this.items = null;
    }
    else if (items instanceof DataSet) {
        this.items = items;
    }
    else {
        throw new TypeError('Data must be an instance of DataSet');
    }

    if (this.items) {
        // subscribe to new dataset
        var id = this.id;
        util.forEach(this.listeners, function (callback, event) {
            me.items.subscribe(event, callback, id);
        });

        // draw all new items
        dataItems = this.items.get({fields: ['id']});
        ids = [];
        util.forEach(dataItems, function (dataItem, index) {
            ids[index] = dataItem.id;
        });
        this._onAdd(ids);
    }
};

/**
 * Get the current items items
 * @returns {vis.DataSet | null}
 */
ItemSet.prototype.getItems = function getItems() {
    return this.items;
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdate = function _onUpdate(ids) {
    console.log('onUpdate', ids)
    this._toQueue(ids, 'update');
};

/**
 * Handle changed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAdd = function _onAdd(ids) {
    this._toQueue(ids, 'add');
};

/**
 * Handle removed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemove = function _onRemove(ids) {
    this._toQueue(ids, 'remove');
};

/**
 * Put items in the queue to be added/updated/remove
 * @param {Number[]} ids
 * @param {String} action     can be 'add', 'update', 'remove'
 */
ItemSet.prototype._toQueue = function _toQueue(ids, action) {
    var queue = this.queue;
    ids.forEach(function (id) {
        queue[id] = action;
    });

    if (this.controller) {
        //this.requestReflow();
        this.requestRepaint();
    }
};

/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods toTime
 * and toScreen can be used.
 * @private
 */
ItemSet.prototype._updateConversion = function _updateConversion() {
    var range = this.range;
    if (!range) {
        throw new Error('No range configured');
    }

    if (range.conversion) {
        this.conversion = range.conversion(this.width);
    }
    else {
        this.conversion = Range.conversion(range.start, range.end, this.width);
    }
};

/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
ItemSet.prototype.toTime = function toTime(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 */
ItemSet.prototype.toScreen = function toScreen(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};
