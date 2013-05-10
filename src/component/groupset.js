/**
 * An GroupSet holds a set of groups
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See GroupSet.setOptions for the available
 *                                  options.
 * @constructor GroupSet
 * @extends Panel
 */
function GroupSet(parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

    this.options = {};

    this.range = null;  // Range or Object {start: number, end: number}
    this.items = null;  // dataset with items
    this.groups = null; // dataset with groups

    this.contents = {};  // object with an ItemSet for every group

    // changes in groups are queued
    this.queue = {};

    var me = this;
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

    if (options) {
        this.setOptions(options);
    }
}

GroupSet.prototype = new Panel();

/**
 * Set options for the ItemSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           TODO: describe options
 */
GroupSet.prototype.setOptions = function setOptions(options) {
    util.extend(this.options, options);

    // TODO: implement options
};

GroupSet.prototype.setRange = function (range) {
    // TODO: implement setRange
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
GroupSet.prototype.setItems = function setItems(items) {
    this.items = items;

    util.forEach(this.contents, function (group) {
        group.setItems(items);
    });

};

/**
 * Get items
 * @return {vis.DataSet | null} items
 */
GroupSet.prototype.getItems = function getItems() {
    return this.items;
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
GroupSet.prototype.setRange = function setRange(range) {
    this.range = range;
};

/**
 * Set groups
 * @param {vis.DataSet} groups
 */
GroupSet.prototype.setGroups = function setGroups(groups) {
    var me = this,
        dataGroups,
        ids;

    // unsubscribe from current dataset
    if (this.groups) {
        util.forEach(this.listeners, function (callback, event) {
            me.groups.unsubscribe(event, callback);
        });

        // remove all drawn groups
        dataGroups = this.groups.get({fields: ['id']});
        ids = [];
        util.forEach(dataGroups, function (dataGroup, index) {
            ids[index] = dataGroup.id;
        });
        this._onRemove(ids);
    }

    // replace the dataset
    if (!groups) {
        this.groups = null;
    }
    else if (groups instanceof DataSet) {
        this.groups = groups;
    }
    else {
        this.groups = new DataSet({
            fieldTypes: {
                start: 'Date',
                end: 'Date'
            }
        });
        this.groups.add(groups);
    }

    if (this.groups) {
        // subscribe to new dataset
        var id = this.id;
        util.forEach(this.listeners, function (callback, event) {
            me.groups.subscribe(event, callback, id);
        });

        // draw all new groups
        dataGroups = this.groups.get({fields: ['id']});
        ids = [];
        util.forEach(dataGroups, function (dataGroup, index) {
            ids[index] = dataGroup.id;
        });
        this._onAdd(ids);
    }
};

/**
 * Get groups
 * @return {vis.DataSet | null} groups
 */
GroupSet.prototype.getGroups = function getGroups() {
    return this.groups;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
GroupSet.prototype.repaint = function repaint() {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;

    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'groupset';

        if (options.className) {
            util.addClassName(frame, util.option.asString(options.className));
        }

        this.frame = frame;
        changed += 1;
    }

    if (!this.parent) {
        throw new Error('Cannot repaint groupset: no parent attached');
    }
    var parentContainer = this.parent.getContainer();
    if (!parentContainer) {
        throw new Error('Cannot repaint groupset: parent has no container element');
    }
    if (!frame.parentNode) {
        parentContainer.appendChild(frame);
        changed += 1;
    }

    // reposition frame
    changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));
    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));

    var me = this,
        queue = this.queue,
        items = this.items,
        contents = this.contents,
        groups = this.groups,
        dataOptions = {
            fields: ['id', 'content']
        };

    // show/hide added/changed/removed items
    Object.keys(queue).forEach(function (id) {
        var entry = queue[id];
        var group = entry.item;
        //noinspection FallthroughInSwitchStatementJS
        switch (entry.action) {
            case 'add':
                // TODO: create group
                group = new ItemSet(me);
                group.setRange(me.range);
                group.setItems(me.items);

                // update lists
                contents[id] = group;
                delete queue[id];
                break;

            case 'update':
                // TODO: update group

                // update lists
                contents[id] = group;
                delete queue[id];
                break;

            case 'remove':
                if (group) {
                    // remove DOM of the group
                    changed += group.hide();
                }

                // update lists
                delete contents[id];
                delete queue[id];
                break;

            default:
                console.log('Error: unknown action "' + entry.action + '"');
        }
    });

    // reposition all groups
    util.forEach(this.contents, function (group) {
        changed += group.repaint();
    });

    return (changed > 0);
};

/**
 * Get container element
 * @return {HTMLElement} container
 */
GroupSet.prototype.getContainer = function getContainer() {
    // TODO: replace later on with container element for holding itemsets
    return this.frame;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
GroupSet.prototype.reflow = function reflow() {
    var changed = 0,
        options = this.options,
        update = util.updateProperty,
        asNumber = util.option.asNumber,
        frame = this.frame;

    if (frame) {
        // reposition all groups
        util.forEach(this.contents, function (group) {
            changed += group.reflow();
        });

        var maxHeight = asNumber(options.maxHeight);
        var height;
        if (options.height != null) {
            height = frame.offsetHeight;
        }
        else {
            // height is not specified, calculate the sum of the height of all groups
            height = 0;
            util.forEach(this.contents, function (group) {
                height += group.height;
            });
        }
        if (maxHeight != null) {
            height = Math.min(height, maxHeight);
        }
        changed += update(this, 'height', height);

        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
    }

    return (changed > 0);
};

/**
 * Hide the component from the DOM
 * @return {Boolean} changed
 */
GroupSet.prototype.hide = function hide() {
    if (this.frame && this.frame.parentNode) {
        this.frame.parentNode.removeChild(this.frame);
        return true;
    }
    else {
        return false;
    }
};

/**
 * Show the component in the DOM (when not already visible).
 * A repaint will be executed when the component is not visible
 * @return {Boolean} changed
 */
GroupSet.prototype.show = function show() {
    if (!this.frame || !this.frame.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Handle updated groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onUpdate = function _onUpdate(ids) {
    this._toQueue(ids, 'update');
};

/**
 * Handle changed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onAdd = function _onAdd(ids) {
    this._toQueue(ids, 'add');
};

/**
 * Handle removed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onRemove = function _onRemove(ids) {
    this._toQueue(ids, 'remove');
};

/**
 * Put groups in the queue to be added/updated/remove
 * @param {Number[]} ids
 * @param {String} action     can be 'add', 'update', 'remove'
 */
GroupSet.prototype._toQueue = function _toQueue(ids, action) {
    var groups = this.groups;
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
                item: groups[id] || null,
                action: action
            };
        }
    });

    if (this.controller) {
        //this.requestReflow();
        this.requestRepaint();
    }
};
