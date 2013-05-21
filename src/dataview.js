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
    this.data = null;
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

        // trigger a remove of all drawn items
        dataItems = this.get({fields: [this.fieldId, 'group']});
        ids = [];
        for (i = 0, len = dataItems.length; i < len; i++) {
            ids[i] = dataItems[i].id;
        }
        this._trigger('remove', {items: ids});
    }

    this.data = data;

    if (this.data) {
        // update fieldId
        this.fieldId = this.options.fieldId ||
            (this.data && this.data.options && this.data.options.fieldId) ||
            'id';

        // trigger an add of all added items
        dataItems = this.get({fields: [this.fieldId, 'group']});
        ids = [];
        for (i = 0, len = dataItems.length; i < len; i++) {
            ids[i] = dataItems[i].id;
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
 *                              {Object.<String, String>} [fieldTypes]
 *                              {String[]} [fields] field names to be returned
 *                              {function} [filter] filter items
 *                              TODO: implement an option order
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
 *                              TODO: implement an option order
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
            filter: filter
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
    var items = params && params.items,
        data = this.data,
        fieldId = this.fieldId,
        filter = this.options.filter,
        filteredItems = [];

    if (items && data && filter) {
        filteredItems = data.get(items, {
            filter: filter
        }).map(function (item) {
            return item[fieldId];
        });

        // TODO: dataview must trigger events from its own point of view:
        //       a changed item can be:
        //       - added to the filtered set
        //       - removed from the filtered set
        //       - changed in the filtered set

        if (filteredItems.length) {
            this._trigger(event, {items: filteredItems}, senderId);
        }
    }
};

// copy subscription functionality from DataSet
DataView.prototype.subscribe = DataSet.prototype.subscribe;
DataView.prototype.unsubscribe = DataSet.prototype.unsubscribe;
DataView.prototype._trigger = DataSet.prototype._trigger;
