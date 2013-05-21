/**
 * DataSet
 *
 * Usage:
 *     var dataSet = new DataSet({
 *         fieldId: '_id',
 *         fieldTypes: {
 *             // ...
 *         }
 *     });
 *
 *     dataSet.add(item);
 *     dataSet.add(data);
 *     dataSet.update(item);
 *     dataSet.update(data);
 *     dataSet.remove(id);
 *     dataSet.remove(ids);
 *     var data = dataSet.get();
 *     var data = dataSet.get(id);
 *     var data = dataSet.get(ids);
 *     var data = dataSet.get(ids, options, data);
 *     dataSet.clear();
 *
 * A data set can:
 * - add/remove/update data
 * - gives triggers upon changes in the data
 * - can  import/export data in various data formats
 *
 * @param {Object} [options]   Available options:
 *                             {String} fieldId Field name of the id in the
 *                                              items, 'id' by default.
 *                             {Object.<String, String} fieldTypes
 *                                              A map with field names as key,
 *                                              and the field type as value.
 *                             TODO: implement an option for a  default order
 * @constructor DataSet
 */
function DataSet (options) {
    var me = this;

    this.options = options || {};
    this.data = {};                                 // map with data indexed by id
    this.fieldId = this.options.fieldId || 'id';    // name of the field containing id
    this.fieldTypes = {};                           // field types by field name

    if (this.options.fieldTypes) {
        util.forEach(this.options.fieldTypes, function (value, field) {
            if (value == 'Date' || value == 'ISODate' || value == 'ASPDate') {
                me.fieldTypes[field] = 'Date';
            }
            else {
                me.fieldTypes[field] = value;
            }
        });
    }

    // event subscribers
    this.subscribers = {};

    this.internalIds = {};            // internally generated id's
}

/**
 * Subscribe to an event, add an event listener
 * @param {String} event        Event name. Available events: 'put', 'update',
 *                              'remove'
 * @param {function} callback   Callback method. Called with three parameters:
 *                                  {String} event
 *                                  {Object | null} params
 *                                  {String} senderId
 * @param {String} [id]         Optional id for the sender, used to filter
 *                              events triggered by the sender itself.
 */
DataSet.prototype.subscribe = function (event, callback, id) {
    var subscribers = this.subscribers[event];
    if (!subscribers) {
        subscribers = [];
        this.subscribers[event] = subscribers;
    }

    subscribers.push({
        id: id ? String(id) : null,
        callback: callback
    });
};

/**
 * Unsubscribe from an event, remove an event listener
 * @param {String} event
 * @param {function} callback
 */
DataSet.prototype.unsubscribe = function (event, callback) {
    var subscribers = this.subscribers[event];
    if (subscribers) {
        this.subscribers[event] = subscribers.filter(function (listener) {
            return (listener.callback != callback);
        });
    }
};

/**
 * Trigger an event
 * @param {String} event
 * @param {Object | null} params
 * @param {String} [senderId]       Optional id of the sender.
 * @private
 */
DataSet.prototype._trigger = function (event, params, senderId) {
    if (event == '*') {
        throw new Error('Cannot trigger event *');
    }

    var subscribers = [];
    if (event in this.subscribers) {
        subscribers = subscribers.concat(this.subscribers[event]);
    }
    if ('*' in this.subscribers) {
        subscribers = subscribers.concat(this.subscribers['*']);
    }

    subscribers.forEach(function (listener) {
        if (listener.callback) {
            listener.callback(event, params, senderId || null);
        }
    });
};

/**
 * Add data.
 * Adding an item will fail when there already is an item with the same id.
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.add = function (data, senderId) {
    var addedItems = [],
        id,
        me = this;

    if (data instanceof Array) {
        // Array
        data.forEach(function (item) {
            var id = me._addItem(item);
            addedItems.push(id);
        });
    }
    else if (util.isDataTable(data)) {
        // Google DataTable
        var columns = this._getColumnNames(data);
        for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
            var item = {};
            columns.forEach(function (field, col) {
                item[field] = data.getValue(row, col);
            });
            id = me._addItem(item);
            addedItems.push(id);
        }
    }
    else if (data instanceof Object) {
        // Single item
        id = me._addItem(data);
        addedItems.push(id);
    }
    else {
        throw new Error('Unknown dataType');
    }

    if (addedItems.length) {
        this._trigger('add', {items: addedItems}, senderId);
    }
};

/**
 * Update existing items. When an item does not exist, it will be created
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.update = function (data, senderId) {
    var addedItems = [],
        updatedItems = [],
        me = this,
        fieldId = me.fieldId;

    var addOrUpdate = function (item) {
        var id = item[fieldId];
        if (me.data[id]) {
            // update item
            id = me._updateItem(item);
            updatedItems.push(id);
        }
        else {
            // add new item
            id = me._addItem(item);
            addedItems.push(id);
        }
    };

    if (data instanceof Array) {
        // Array
        data.forEach(function (item) {
            addOrUpdate(item);
        });
    }
    else if (util.isDataTable(data)) {
        // Google DataTable
        var columns = this._getColumnNames(data);
        for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
            var item = {};
            columns.forEach(function (field, col) {
                item[field] = data.getValue(row, col);
            });
            addOrUpdate(item);
        }
    }
    else if (data instanceof Object) {
        // Single item
        addOrUpdate(data);
    }
    else {
        throw new Error('Unknown dataType');
    }

    if (addedItems.length) {
        this._trigger('add', {items: addedItems}, senderId);
    }
    if (updatedItems.length) {
        this._trigger('update', {items: updatedItems}, senderId);
    }
};

/**
 * Get a data item or multiple items.
 *
 * Usage:
 *
 *     get()
 *     get(options: Object)
 *     get(options: Object, data: Array | DataTable)
 *
 *     get(id: Number | String)
 *     get(id: Number | String, options: Object)
 *     get(id: Number | String, options: Object, data: Array | DataTable)
 *
 *     get(ids: Number[] | String[])
 *     get(ids: Number[] | String[], options: Object)
 *     get(ids: Number[] | String[], options: Object, data: Array | DataTable)
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
 *
 * @throws Error
 */
DataSet.prototype.get = function (args) {
    var me = this;

    // parse the arguments
    var id, ids, options, data;
    var firstType = util.getType(arguments[0]);
    if (firstType == 'String' || firstType == 'Number') {
        // get(id [, options] [, data])
        id = arguments[0];
        options = arguments[1];
        data = arguments[2];
    }
    else if (firstType == 'Array') {
        // get(ids [, options] [, data])
        ids = arguments[0];
        options = arguments[1];
        data = arguments[2];
    }
    else {
        // get([, options] [, data])
        options = arguments[0];
        data = arguments[1];
    }

    // determine the return type
    var type;
    if (options && options.type) {
        type = (options.type == 'DataTable') ? 'DataTable' : 'Array';

        if (data && (type != util.getType(data))) {
            throw new Error('Type of parameter "data" (' + util.getType(data) + ') ' +
                'does not correspond with specified options.type (' + options.type + ')');
        }
        if (type == 'DataTable' && !util.isDataTable(data)) {
            throw new Error('Parameter "data" must be a DataTable ' +
                'when options.type is "DataTable"');
        }
    }
    else if (data) {
        type = (util.getType(data) == 'DataTable') ? 'DataTable' : 'Array';
    }
    else {
        type = 'Array';
    }

    // build options
    var itemOptions = {
        fieldTypes: this._mergeFieldTypes(options && options.fieldTypes),
        fields: options && options.fields,
        filter: options && options.filter
    };

    var item, itemId, i, len;
    if (type == 'DataTable') {
        // return a Google DataTable
        var columns = this._getColumnNames(data);
        if (id != undefined) {
            // return a single item
            item = me._getItem(id, itemOptions);
            if (item) {
                this._appendRow(data, columns, item);
            }
        }
        else if (ids != undefined) {
            // return a subset of items
            for (i = 0, len = ids.length; i < len; i++) {
                item = me._getItem(ids[i], itemOptions);
                if (item) {
                    me._appendRow(data, columns, item);
                }
            }
        }
        else {
            // return all items
            for (itemId in this.data) {
                if (this.data.hasOwnProperty(itemId)) {
                    item = me._getItem(itemId, itemOptions);
                    if (item) {
                        me._appendRow(data, columns, item);
                    }
                }
            }
        }
    }
    else {
        // return an array
        if (!data) {
            data = [];
        }

        if (id != undefined) {
            // return a single item
            return me._getItem(id, itemOptions);
        }
        else if (ids != undefined) {
            // return a subset of items
            for (i = 0, len = ids.length; i < len; i++) {
                item = me._getItem(ids[i], itemOptions);
                if (item) {
                    data.push(item);
                }
            }
        }
        else {
            // return all items
            for (itemId in this.data) {
                if (this.data.hasOwnProperty(itemId)) {
                    item = me._getItem(itemId, itemOptions);
                    if (item) {
                        data.push(item);
                    }
                }
            }
        }
    }

    return data;
};

/**
 * Execute a callback function for every item in the dataset.
 * The order of the items is not determined.
 * @param {function} callback
 * @param {Object} [options]            Available options:
 *                                      {Object.<String, String>} [fieldTypes]
 *                                      {String[]} [fields] filter fields
 *                                      {function} [filter] filter items
 */
DataSet.prototype.forEach = function (callback, options) {
    var fieldTypes = this._mergeFieldTypes(options && options.fieldTypes);
    var fields = options && options.fields;
    var filter = options && options.filter;
    var me = this;

    util.forEach(this.data, function (item, id) {
        var item = me._castItem(item, fieldTypes, fields);
        if (!filter || filter(item)) {
            callback(item, id);
        }
    });
};

/**
 * Map every item in the dataset.
 * @param {function} callback
 * @param {Object} [options]            Available options:
 *                                      {Object.<String, String>} [fieldTypes]
 *                                      {String[]} [fields] filter fields
 *                                      {function} [filter] filter items
 *                                      TODO: implement an option order
 * @return {Object[]} mappedItems
 */
DataSet.prototype.map = function (callback, options) {
    var fieldTypes = this._mergeFieldTypes(options && options.fieldTypes);
    var fields = options && options.fields;
    var filter = options && options.filter;
    var me = this;
    var mappedItems = [];

    util.forEach(this.data, function (item, id) {
        var item = me._castItem(item, fieldTypes, fields);
        if (!filter || filter(item)) {
            var mappedItem = callback(item, id);
            mappedItems.push(mappedItem);
        }
    });

    return mappedItems;
};

/**
 * Merge the provided field types with the datasets fieldtypes
 * @param {Object} fieldTypes
 * @returns {Object} mergedFieldTypes
 * @private
 */
DataSet.prototype._mergeFieldTypes = function (fieldTypes) {
    var merged = {};

    // extend with the datasets fieldTypes
    if (this.options && this.options.fieldTypes) {
        util.forEach(this.options.fieldTypes, function (value, field) {
            merged[field] = value;
        });
    }

    // extend with provided fieldTypes
    if (fieldTypes) {
        util.forEach(fieldTypes, function (value, field) {
            merged[field] = value;
        });
    }

    return merged;
};

/**
 * Remove an object by pointer or by id
 * @param {String | Number | Object | Array} id   Object or id, or an array with
 *                                                objects or ids to be removed
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.remove = function (id, senderId) {
    var removedItems = [],
        me = this;

    if (util.isNumber(id) || util.isString(id)) {
        delete this.data[id];
        delete this.internalIds[id];
        removedItems.push(id);
    }
    else if (id instanceof Array) {
        id.forEach(function (id) {
            me.remove(id);
        });
        removedItems = items.concat(id);
    }
    else if (id instanceof Object) {
        // search for the object
        for (var i in this.data) {
            if (this.data.hasOwnProperty(i)) {
                if (this.data[i] == id) {
                    delete this.data[i];
                    delete this.internalIds[i];
                    removedItems.push(i);
                }
            }
        }
    }

    if (removedItems.length) {
        this._trigger('remove', {items: removedItems}, senderId);
    }
};

/**
 * Clear the data
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.clear = function (senderId) {
    var ids = Object.keys(this.data);

    this.data = {};
    this.internalIds = {};

    this._trigger('remove', {items: ids}, senderId);
};

/**
 * Find the item with maximum value of a specified field
 * @param {String} field
 * @return {Object | null} item  Item containing max value, or null if no items
 */
DataSet.prototype.max = function (field) {
    var data = this.data,
        ids = Object.keys(data);

    var max = null;
    var maxField = null;
    ids.forEach(function (id) {
        var item = data[id];
        var itemField = item[field];
        if (itemField != null && (!max || itemField > maxField)) {
            max = item;
            maxField = itemField;
        }
    });

    return max;
};

/**
 * Find the item with minimum value of a specified field
 * @param {String} field
 * @return {Object | null} item  Item containing max value, or null if no items
 */
DataSet.prototype.min = function (field) {
    var data = this.data,
        ids = Object.keys(data);

    var min = null;
    var minField = null;
    ids.forEach(function (id) {
        var item = data[id];
        var itemField = item[field];
        if (itemField != null && (!min || itemField < minField)) {
            min = item;
            minField = itemField;
        }
    });

    return min;
};

/**
 * Find all distinct values of a specified field
 * @param {String} field
 * @return {Array} values  Array containing all distinct values. If the data
 *                         items do not contain the specified field, an array
 *                         containing a single value undefined is returned.
 *                         The returned array is unordered.
 */
DataSet.prototype.distinct = function (field) {
    var data = this.data,
        values = [],
        fieldType = this.options.fieldTypes[field],
        count = 0;

    for (var prop in data) {
        if (data.hasOwnProperty(prop)) {
            var item = data[prop];
            var value = util.cast(item[field], fieldType);
            var exists = false;
            for (var i = 0; i < count; i++) {
                if (values[i] == value) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                values[count] = value;
                count++;
            }
        }
    }

    return values;
};

/**
 * Add a single item. Will fail when an item with the same id already exists.
 * @param {Object} item
 * @return {String} id
 * @private
 */
DataSet.prototype._addItem = function (item) {
    var id = item[this.fieldId];

    if (id != undefined) {
        // check whether this id is already taken
        if (this.data[id]) {
            // item already exists
            throw new Error('Cannot add item: item with id ' + id + ' already exists');
        }
    }
    else {
        // generate an id
        id = util.randomUUID();
        item[this.fieldId] = id;
        this.internalIds[id] = item;
    }

    var d = {};
    for (var field in item) {
        if (item.hasOwnProperty(field)) {
            var type = this.fieldTypes[field];  // type may be undefined
            d[field] = util.cast(item[field], type);
        }
    }
    this.data[id] = d;

    return id;
};

/**
 * Get, cast and filter an item
 * @param {String} id
 * @param {Object} options  Available options:
 *                          {Object.<String, String>} fieldTypes  Cast field types
 *                          {String[]} fields   Filter fields
 *                          {function} filter   Filter item, returns null if
 *                                              item does not match the filter
 * @return {Object | null} castedItem
 * @private
 */
DataSet.prototype._getItem = function (id, options) {
    var field, value;

    // get the item from the dataset
    var raw = this.data[id];
    if (!raw) {
        return null;
    }

    // cast the items field types
    var casted = {},
        fieldId = this.fieldId,
        internalIds = this.internalIds;
    if (options.fieldTypes) {
        var fieldTypes = options.fieldTypes;
        for (field in raw) {
            if (raw.hasOwnProperty(field)) {
                value = raw[field];
                // output all fields, except internal ids
                if ((field != fieldId) || !(value in internalIds)) {
                    casted[field] = util.cast(value, fieldTypes[field]);
                }
            }
        }
    }
    else {
        // no field types specified, no casting needed
        for (field in raw) {
            if (raw.hasOwnProperty(field)) {
                value = raw[field];
                // output all fields, except internal ids
                if ((field != fieldId) || !(value in internalIds)) {
                    casted[field] = value;
                }
            }
        }
    }

    // apply item filter
    if (options.filter && !options.filter(casted)) {
        return null;
    }

    // apply fields filter
    if (options.fields) {
        var filtered = {},
            fields = options.fields;
        for (field in casted) {
            if (casted.hasOwnProperty(field) && (fields.indexOf(field) != -1)) {
                filtered[field] = casted[field];
            }
        }
        return filtered;
    }
    else {
        return casted;
    }
};

/**
 * Update a single item: merge with existing item.
 * Will fail when the item has no id, or when there does not exist an item
 * with the same id.
 * @param {Object} item
 * @return {String} id
 * @private
 */
DataSet.prototype._updateItem = function (item) {
    var id = item[this.fieldId];
    if (id == undefined) {
        throw new Error('Cannot update item: item has no id (item: ' + JSON.stringify(item) + ')');
    }
    var d = this.data[id];
    if (!d) {
        // item doesn't exist
        throw new Error('Cannot update item: no item with id ' + id + ' found');
    }

    // merge with current item
    for (var field in item) {
        if (item.hasOwnProperty(field)) {
            var type = this.fieldTypes[field];  // type may be undefined
            d[field] = util.cast(item[field], type);
        }
    }

    return id;
};

/**
 * Get an array with the column names of a Google DataTable
 * @param {DataTable} dataTable
 * @return {Array} columnNames
 * @private
 */
DataSet.prototype._getColumnNames = function (dataTable) {
    var columns = [];
    for (var col = 0, cols = dataTable.getNumberOfColumns(); col < cols; col++) {
        columns[col] = dataTable.getColumnId(col) || dataTable.getColumnLabel(col);
    }
    return columns;
};

/**
 * Append an item as a row to the dataTable
 * @param dataTable
 * @param columns
 * @param item
 * @private
 */
DataSet.prototype._appendRow = function (dataTable, columns, item) {
    var row = dataTable.addRow();
    columns.forEach(function (field, col) {
        dataTable.setValue(row, col, item[field]);
    });
};
