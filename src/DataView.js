/**
 * DataView
 *
 * a dataview offers a filtered view on a dataset or an other dataview.
 *
 * @param {DataSet | DataView} data
 * @param {Object} [options]   Available options: see method get
 *
 * @constructor DataView
 */
function DataView (data, options) {
    this.id = util.randomUUID();

    this.data = null;
    this.ids = {}; // ids of the items currently in memory (just contains a boolean true)
    this.options = options || {};
    this.fieldId = 'id'; // name of the field containing id
    this.subscribers = {}; // event subscribers

    var me = this;
    this.listener = function () {
        me._onEvent.apply(me, arguments);
    };

    this.setData(data);
}

/**
 * Set a data source for the view
 * @param {DataSet | DataView} data
 */
DataView.prototype.setData = function (data) {
    var ids, dataItems, i, len;

    if (this.data) {
        // unsubscribe from current dataset
        if (this.data.unsubscribe) {
            this.data.unsubscribe('*', this.listener);
        }

        // trigger a remove of all items in memory
        ids = [];
        for (var id in this.ids) {
            if (this.ids.hasOwnProperty(id)) {
                ids.push(id);
            }
        }
        this.ids = {};
        this._trigger('remove', {items: ids});
    }

    this.data = data;

    if (this.data) {
        // update fieldId
        this.fieldId = this.options.fieldId ||
            (this.data && this.data.options && this.data.options.fieldId) ||
            'id';

        // trigger an add of all added items
        ids = this.data.getIds({filter: this.options && this.options.filter});
        for (i = 0, len = ids.length; i < len; i++) {
            id = ids[i];
            this.ids[id] = true;
        }
        this._trigger('add', {items: ids});

        // subscribe to new dataset
        if (this.data.subscribe) {
            this.data.subscribe('*', this.listener);
        }
    }
};

/**
 * Get data from the data view
 *
 * Usage:
 *
 *     get()
 *     get(options: Object)
 *     get(options: Object, data: Array | DataTable)
 *
 *     get(id: Number)
 *     get(id: Number, options: Object)
 *     get(id: Number, options: Object, data: Array | DataTable)
 *
 *     get(ids: Number[])
 *     get(ids: Number[], options: Object)
 *     get(ids: Number[], options: Object, data: Array | DataTable)
 *
 * Where:
 *
 * {Number | String} id         The id of an item
 * {Number[] | String{}} ids    An array with ids of items
 * {Object} options             An Object with options. Available options:
 *                              {String} [type] Type of data to be returned. Can
 *                                              be 'DataTable' or 'Array' (default)
 *                              {Object.<String, String>} [convert]
 *                              {String[]} [fields] field names to be returned
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * {Array | DataTable} [data]   If provided, items will be appended to this
 *                              array or table. Required in case of Google
 *                              DataTable.
 * @param args
 */
DataView.prototype.get = function (args) {
    var me = this;

    // parse the arguments
    var ids, options, data;
    var firstType = util.getType(arguments[0]);
    if (firstType == 'String' || firstType == 'Number' || firstType == 'Array') {
        // get(id(s) [, options] [, data])
        ids = arguments[0];  // can be a single id or an array with ids
        options = arguments[1];
        data = arguments[2];
    }
    else {
        // get([, options] [, data])
        options = arguments[0];
        data = arguments[1];
    }

    // extend the options with the default options and provided options
    var viewOptions = util.extend({}, this.options, options);

    // create a combined filter method when needed
    if (this.options.filter && options && options.filter) {
        viewOptions.filter = function (item) {
            return me.options.filter(item) && options.filter(item);
        }
    }

    // build up the call to the linked data set
    var getArguments = [];
    if (ids != undefined) {
        getArguments.push(ids);
    }
    getArguments.push(viewOptions);
    getArguments.push(data);

    return this.data && this.data.get.apply(this.data, getArguments);
};

/**
 * Get ids of all items or from a filtered set of items.
 * @param {Object} [options]    An Object with options. Available options:
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Array} ids
 */
DataView.prototype.getIds = function (options) {
    var ids;

    if (this.data) {
        var defaultFilter = this.options.filter;
        var filter;

        if (options && options.filter) {
            if (defaultFilter) {
                filter = function (item) {
                    return defaultFilter(item) && options.filter(item);
                }
            }
            else {
                filter = options.filter;
            }
        }
        else {
            filter = defaultFilter;
        }

        ids = this.data.getIds({
            filter: filter,
            order: options && options.order
        });
    }
    else {
        ids = [];
    }

    return ids;
};

/**
 * Event listener. Will propagate all events from the connected data set to
 * the subscribers of the DataView, but will filter the items and only trigger
 * when there are changes in the filtered data set.
 * @param {String} event
 * @param {Object | null} params
 * @param {String} senderId
 * @private
 */
DataView.prototype._onEvent = function (event, params, senderId) {
    var i, len, id, item,
        ids = params && params.items,
        data = this.data,
        added = [],
        updated = [],
        removed = [];

    if (ids && data) {
        switch (event) {
            case 'add':
                // filter the ids of the added items
                for (i = 0, len = ids.length; i < len; i++) {
                    id = ids[i];
                    item = this.get(id);
                    if (item) {
                        this.ids[id] = true;
                        added.push(id);
                    }
                }

                break;

            case 'update':
                // determine the event from the views viewpoint: an updated
                // item can be added, updated, or removed from this view.
                for (i = 0, len = ids.length; i < len; i++) {
                    id = ids[i];
                    item = this.get(id);

                    if (item) {
                        if (this.ids[id]) {
                            updated.push(id);
                        }
                        else {
                            this.ids[id] = true;
                            added.push(id);
                        }
                    }
                    else {
                        if (this.ids[id]) {
                            delete this.ids[id];
                            removed.push(id);
                        }
                        else {
                            // nothing interesting for me :-(
                        }
                    }
                }

                break;

            case 'remove':
                // filter the ids of the removed items
                for (i = 0, len = ids.length; i < len; i++) {
                    id = ids[i];
                    if (this.ids[id]) {
                        delete this.ids[id];
                        removed.push(id);
                    }
                }

                break;
        }

        if (added.length) {
            this._trigger('add', {items: added}, senderId);
        }
        if (updated.length) {
            this._trigger('update', {items: updated}, senderId);
        }
        if (removed.length) {
            this._trigger('remove', {items: removed}, senderId);
        }
    }
};

// copy subscription functionality from DataSet
DataView.prototype.subscribe = DataSet.prototype.subscribe;
DataView.prototype.unsubscribe = DataSet.prototype.unsubscribe;
DataView.prototype._trigger = DataSet.prototype._trigger;
