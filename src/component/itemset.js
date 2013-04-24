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
    this.data = null;  // DataSet
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

    this.items = {};
    this.queue = {};      // queue with items to be added/updated/removed
    this.stack = new Stack(this);
    this.conversion = null;

    this.setOptions(options);
}

ItemSet.prototype = new Panel();

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
ItemSet.prototype.setOptions = function (options) {
    util.extend(this.options, options);

    // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis

    this.stack.setOptions(this.options);
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
ItemSet.prototype.setRange = function (range) {
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
ItemSet.prototype.repaint = function () {
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
        data = this.data,
        items = this.items,
        dataOptions = {
            fields: ['id', 'start', 'end', 'content', 'type']
        };
    // TODO: copy options from the itemset itself?
    // TODO: make orientation dynamically changable for the items

    // show/hide added/changed/removed items
    Object.keys(queue).forEach(function (id) {
        var entry = queue[id];
        var item = entry.item;
        //noinspection FallthroughInSwitchStatementJS
        switch (entry.action) {
            case 'add':
            case 'update':
                var itemData = data.get(id, dataOptions);
                var type = itemData.type ||
                    (itemData.start && itemData.end && 'range') ||
                    'box';
                var constructor = vis.component.item[type];

                // TODO: how to handle items with invalid data? hide them and give a warning? or throw an error?
                if (item) {
                    // update item
                    if (!constructor || !(item instanceof constructor)) {
                        // item type has changed, delete the item
                        item.visible = false;
                        changed += item.repaint();
                        item = null;
                    }
                    else {
                        item.data = itemData; // TODO: create a method item.setData ?
                        changed += item.repaint();
                    }
                }

                if (!item) {
                    // create item
                    if (constructor) {
                        item = new constructor(me, itemData, options);
                        changed += item.repaint();
                    }
                    else {
                        throw new TypeError('Unknown item type "' + type + '"');
                    }
                }

                // update lists
                items[id] = item;
                delete queue[id];
                break;

            case 'remove':
                if (item) {
                    // TODO: remove dom of the item
                    item.visible = false;
                    changed += item.repaint();
                }

                // update lists
                delete items[id];
                delete queue[id];
                break;

            default:
                console.log('Error: unknown action "' + entry.action + '"');
        }
    });

    // reposition all items
    util.forEach(this.items, function (item) {
        item.reposition();
    });

    return (changed > 0);
};

/**
 * Get the foreground container element
 * @return {HTMLElement} foreground
 */
ItemSet.prototype.getForeground = function () {
    return this.dom.foreground;
};

/**
 * Get the background container element
 * @return {HTMLElement} background
 */
ItemSet.prototype.getBackground = function () {
    return this.dom.background;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
ItemSet.prototype.reflow = function () {
    var changed = 0,
        options = this.options,
        update = util.updateProperty,
        asNumber = util.option.asNumber,
        frame = this.frame;

    if (frame) {
        this._updateConversion();

        util.forEach(this.items, function (item) {
            changed += item.reflow();
        });

        // TODO: stack.update should be triggered via an event, in stack itself
        // TODO: only update the stack when there are changed items
        this.stack.update();

        var maxHeight = asNumber(options.maxHeight);
        var height;
        if (options.height != null) {
            height = frame.offsetHeight;
            if (maxHeight != null) {
                height = Math.min(height, maxHeight);
            }
            changed += update(this, 'height', height);
        }
        else {
            // height is not specified, determine the height from the height and positioned items
            var frameHeight = this.height;
            height = 0;
            if (options.orientation == 'top') {
                util.forEach(this.items, function (item) {
                    height = Math.max(height, item.top + item.height);
                });
            }
            else {
                // orientation == 'bottom'
                util.forEach(this.items, function (item) {
                    height = Math.max(height, frameHeight - item.top);
                });
            }
            height += options.margin.axis;

            if (maxHeight != null) {
                height = Math.min(height, maxHeight);
            }

            changed += update(this, 'height', height);
        }

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
 * Set data
 * @param {DataSet | Array | DataTable} data
 */
ItemSet.prototype.setData = function(data) {
    // unsubscribe from current dataset
    var current = this.data;
    if (current) {
        util.forEach(this.listeners, function (callback, event) {
            current.unsubscribe(event, callback);
        });
    }

    if (data instanceof DataSet) {
        this.data = data;
    }
    else {
        this.data = new DataSet({
            fieldTypes: {
                start: 'Date',
                end: 'Date'
            }
        });
        this.data.add(data);
    }

    var id = this.id;
    var me = this;
    util.forEach(this.listeners, function (callback, event) {
        me.data.subscribe(event, callback, id);
    });

    var dataItems = this.data.get({filter: ['id']});
    var ids = [];
    util.forEach(dataItems, function (dataItem, index) {
        ids[index] = dataItem.id;
    });
    this._onAdd(ids);
};


/**
 * Get the data range of the item set.
 * @returns {{min: Date, max: Date}} range  A range with a start and end Date.
 *                                          When no minimum is found, min==null
 *                                          When no maximum is found, max==null
 */
ItemSet.prototype.getDataRange = function () {
    // calculate min from start filed
    var data = this.data;
    var min = data.min('start');
    min = min ? min.start.valueOf() : null;

    // calculate max of both start and end fields
    var maxStart = data.max('start');
    var maxEnd = data.max('end');
    maxStart = maxStart ? maxStart.start.valueOf() : null;
    maxEnd = maxEnd ? maxEnd.end.valueOf() : null;
    var max = Math.max(maxStart, maxEnd);

    return {
        min: new Date(min),
        max: new Date(max)
    };
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdate = function(ids) {
    this._toQueue(ids, 'update');
};

/**
 * Handle changed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAdd = function(ids) {
    this._toQueue(ids, 'add');
};

/**
 * Handle removed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemove = function(ids) {
    this._toQueue(ids, 'remove');
};

/**
 * Put items in the queue to be added/updated/remove
 * @param {Number[]} ids
 * @param {String} action     can be 'add', 'update', 'remove'
 */
ItemSet.prototype._toQueue = function (ids, action) {
    var items = this.items;
    var queue = this.queue;
    ids.forEach(function (id) {
        var entry = queue[id];
        if (entry) {
            // already queued, update the action of the entry
            entry.action = action;
        }
        else {
            // not yet queued, add an entry to the queue
            queue[id] = {
                item: items[id] || null,
                action: action
            };
        }
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
ItemSet.prototype._updateConversion = function() {
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
ItemSet.prototype.toTime = function(x) {
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
ItemSet.prototype.toScreen = function(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};

// exports
vis.component.ItemSet = ItemSet;
