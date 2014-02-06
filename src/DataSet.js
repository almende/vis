/**
 * DataSet
 *
 * Usage:
 *     var dataSet = new DataSet({
 *         fieldId: '_id',
 *         convert: {
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
 *                             {Object.<String, String} convert
 *                                              A map with field names as key,
 *                                              and the field type as value.
 * @constructor DataSet
 */
// TODO: add a DataSet constructor DataSet(data, options)
function DataSet (options) {
  this.id = util.randomUUID();

  this.options = options || {};
  this.data = {};                                 // map with data indexed by id
  this.fieldId = this.options.fieldId || 'id';    // name of the field containing id
  this.convert = {};                              // field types by field name
  this.showInternalIds = this.options.showInternalIds || false; // show internal ids with the get function

  if (this.options.convert) {
    for (var field in this.options.convert) {
      if (this.options.convert.hasOwnProperty(field)) {
        var value = this.options.convert[field];
        if (value == 'Date' || value == 'ISODate' || value == 'ASPDate') {
          this.convert[field] = 'Date';
        }
        else {
          this.convert[field] = value;
        }
      }
    }
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
 *                                  {String | Number} senderId
 */
DataSet.prototype.subscribe = function (event, callback) {
  var subscribers = this.subscribers[event];
  if (!subscribers) {
    subscribers = [];
    this.subscribers[event] = subscribers;
  }

  subscribers.push({
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

  for (var i = 0; i < subscribers.length; i++) {
    var subscriber = subscribers[i];
    if (subscriber.callback) {
      subscriber.callback(event, params, senderId || null);
    }
  }
};

/**
 * Add data.
 * Adding an item will fail when there already is an item with the same id.
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id
 * @return {Array} addedIds      Array with the ids of the added items
 */
DataSet.prototype.add = function (data, senderId) {
  var addedIds = [],
      id,
      me = this;

  if (data instanceof Array) {
    // Array
    for (var i = 0, len = data.length; i < len; i++) {
      id = me._addItem(data[i]);
      addedIds.push(id);
    }
  }
  else if (util.isDataTable(data)) {
    // Google DataTable
    var columns = this._getColumnNames(data);
    for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
      var item = {};
      for (var col = 0, cols = columns.length; col < cols; col++) {
        var field = columns[col];
        item[field] = data.getValue(row, col);
      }

      id = me._addItem(item);
      addedIds.push(id);
    }
  }
  else if (data instanceof Object) {
    // Single item
    id = me._addItem(data);
    addedIds.push(id);
  }
  else {
    throw new Error('Unknown dataType');
  }

  if (addedIds.length) {
    this._trigger('add', {items: addedIds}, senderId);
  }

  return addedIds;
};

/**
 * Update existing items. When an item does not exist, it will be created
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id
 * @return {Array} updatedIds     The ids of the added or updated items
 */
DataSet.prototype.update = function (data, senderId) {
  var addedIds = [],
      updatedIds = [],
      me = this,
      fieldId = me.fieldId;

  var addOrUpdate = function (item) {
    var id = item[fieldId];
    if (me.data[id]) {
      // update item
      id = me._updateItem(item);
      updatedIds.push(id);
    }
    else {
      // add new item
      id = me._addItem(item);
      addedIds.push(id);
    }
  };

  if (data instanceof Array) {
    // Array
    for (var i = 0, len = data.length; i < len; i++) {
      addOrUpdate(data[i]);
    }
  }
  else if (util.isDataTable(data)) {
    // Google DataTable
    var columns = this._getColumnNames(data);
    for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
      var item = {};
      for (var col = 0, cols = columns.length; col < cols; col++) {
        var field = columns[col];
        item[field] = data.getValue(row, col);
      }

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

  if (addedIds.length) {
    this._trigger('add', {items: addedIds}, senderId);
  }
  if (updatedIds.length) {
    this._trigger('update', {items: updatedIds}, senderId);
  }

  return addedIds.concat(updatedIds);
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
 *                              {Object.<String, String>} [convert]
 *                              {String[]} [fields] field names to be returned
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * {Array | DataTable} [data]   If provided, items will be appended to this
 *                              array or table. Required in case of Google
 *                              DataTable.
 *
 * @throws Error
 */
DataSet.prototype.get = function (args) {
  var me = this;
  var globalShowInternalIds = this.showInternalIds;

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

  // we allow the setting of this value for a single get request.
  if (options != undefined) {
    if (options.showInternalIds != undefined) {
      this.showInternalIds = options.showInternalIds;
    }
  }

  // build options
  var convert = options && options.convert || this.options.convert;
  var filter = options && options.filter;
  var items = [], item, itemId, i, len;

  // convert items
  if (id != undefined) {
    // return a single item
    item = me._getItem(id, convert);
    if (filter && !filter(item)) {
      item = null;
    }
  }
  else if (ids != undefined) {
    // return a subset of items
    for (i = 0, len = ids.length; i < len; i++) {
      item = me._getItem(ids[i], convert);
      if (!filter || filter(item)) {
        items.push(item);
      }
    }
  }
  else {
    // return all items
    for (itemId in this.data) {
      if (this.data.hasOwnProperty(itemId)) {
        item = me._getItem(itemId, convert);
        if (!filter || filter(item)) {
          items.push(item);
        }
      }
    }
  }

  // restore the global value of showInternalIds
  this.showInternalIds = globalShowInternalIds;

  // order the results
  if (options && options.order && id == undefined) {
    this._sort(items, options.order);
  }

  // filter fields of the items
  if (options && options.fields) {
    var fields = options.fields;
    if (id != undefined) {
      item = this._filterFields(item, fields);
    }
    else {
      for (i = 0, len = items.length; i < len; i++) {
        items[i] = this._filterFields(items[i], fields);
      }
    }
  }

  // return the results
  if (type == 'DataTable') {
    var columns = this._getColumnNames(data);
    if (id != undefined) {
      // append a single item to the data table
      me._appendRow(data, columns, item);
    }
    else {
      // copy the items to the provided data table
      for (i = 0, len = items.length; i < len; i++) {
        me._appendRow(data, columns, items[i]);
      }
    }
    return data;
  }
  else {
    // return an array
    if (id != undefined) {
      // a single item
      return item;
    }
    else {
      // multiple items
      if (data) {
        // copy the items to the provided array
        for (i = 0, len = items.length; i < len; i++) {
          data.push(items[i]);
        }
        return data;
      }
      else {
        // just return our array
        return items;
      }
    }
  }
};

/**
 * Get ids of all items or from a filtered set of items.
 * @param {Object} [options]    An Object with options. Available options:
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Array} ids
 */
DataSet.prototype.getIds = function (options) {
  var data = this.data,
      filter = options && options.filter,
      order = options && options.order,
      convert = options && options.convert || this.options.convert,
      i,
      len,
      id,
      item,
      items,
      ids = [];

  if (filter) {
    // get filtered items
    if (order) {
      // create ordered list
      items = [];
      for (id in data) {
        if (data.hasOwnProperty(id)) {
          item = this._getItem(id, convert);
          if (filter(item)) {
            items.push(item);
          }
        }
      }

      this._sort(items, order);

      for (i = 0, len = items.length; i < len; i++) {
        ids[i] = items[i][this.fieldId];
      }
    }
    else {
      // create unordered list
      for (id in data) {
        if (data.hasOwnProperty(id)) {
          item = this._getItem(id, convert);
          if (filter(item)) {
            ids.push(item[this.fieldId]);
          }
        }
      }
    }
  }
  else {
    // get all items
    if (order) {
      // create an ordered list
      items = [];
      for (id in data) {
        if (data.hasOwnProperty(id)) {
          items.push(data[id]);
        }
      }

      this._sort(items, order);

      for (i = 0, len = items.length; i < len; i++) {
        ids[i] = items[i][this.fieldId];
      }
    }
    else {
      // create unordered list
      for (id in data) {
        if (data.hasOwnProperty(id)) {
          item = data[id];
          ids.push(item[this.fieldId]);
        }
      }
    }
  }

  return ids;
};

/**
 * Execute a callback function for every item in the dataset.
 * The order of the items is not determined.
 * @param {function} callback
 * @param {Object} [options]    Available options:
 *                              {Object.<String, String>} [convert]
 *                              {String[]} [fields] filter fields
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 */
DataSet.prototype.forEach = function (callback, options) {
  var filter = options && options.filter,
      convert = options && options.convert || this.options.convert,
      data = this.data,
      item,
      id;

  if (options && options.order) {
    // execute forEach on ordered list
    var items = this.get(options);

    for (var i = 0, len = items.length; i < len; i++) {
      item = items[i];
      id = item[this.fieldId];
      callback(item, id);
    }
  }
  else {
    // unordered
    for (id in data) {
      if (data.hasOwnProperty(id)) {
        item = this._getItem(id, convert);
        if (!filter || filter(item)) {
          callback(item, id);
        }
      }
    }
  }
};

/**
 * Map every item in the dataset.
 * @param {function} callback
 * @param {Object} [options]    Available options:
 *                              {Object.<String, String>} [convert]
 *                              {String[]} [fields] filter fields
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Object[]} mappedItems
 */
DataSet.prototype.map = function (callback, options) {
  var filter = options && options.filter,
      convert = options && options.convert || this.options.convert,
      mappedItems = [],
      data = this.data,
      item;

  // convert and filter items
  for (var id in data) {
    if (data.hasOwnProperty(id)) {
      item = this._getItem(id, convert);
      if (!filter || filter(item)) {
        mappedItems.push(callback(item, id));
      }
    }
  }

  // order items
  if (options && options.order) {
    this._sort(mappedItems, options.order);
  }

  return mappedItems;
};

/**
 * Filter the fields of an item
 * @param {Object} item
 * @param {String[]} fields     Field names
 * @return {Object} filteredItem
 * @private
 */
DataSet.prototype._filterFields = function (item, fields) {
  var filteredItem = {};

  for (var field in item) {
    if (item.hasOwnProperty(field) && (fields.indexOf(field) != -1)) {
      filteredItem[field] = item[field];
    }
  }

  return filteredItem;
};

/**
 * Sort the provided array with items
 * @param {Object[]} items
 * @param {String | function} order      A field name or custom sort function.
 * @private
 */
DataSet.prototype._sort = function (items, order) {
  if (util.isString(order)) {
    // order by provided field name
    var name = order; // field name
    items.sort(function (a, b) {
      var av = a[name];
      var bv = b[name];
      return (av > bv) ? 1 : ((av < bv) ? -1 : 0);
    });
  }
  else if (typeof order === 'function') {
    // order by sort function
    items.sort(order);
  }
  // TODO: extend order by an Object {field:String, direction:String}
  //       where direction can be 'asc' or 'desc'
  else {
    throw new TypeError('Order must be a function or a string');
  }
};

/**
 * Remove an object by pointer or by id
 * @param {String | Number | Object | Array} id Object or id, or an array with
 *                                              objects or ids to be removed
 * @param {String} [senderId] Optional sender id
 * @return {Array} removedIds
 */
DataSet.prototype.remove = function (id, senderId) {
  var removedIds = [],
      i, len, removedId;

  if (id instanceof Array) {
    for (i = 0, len = id.length; i < len; i++) {
      removedId = this._remove(id[i]);
      if (removedId != null) {
        removedIds.push(removedId);
      }
    }
  }
  else {
    removedId = this._remove(id);
    if (removedId != null) {
      removedIds.push(removedId);
    }
  }

  if (removedIds.length) {
    this._trigger('remove', {items: removedIds}, senderId);
  }

  return removedIds;
};

/**
 * Remove an item by its id
 * @param {Number | String | Object} id   id or item
 * @returns {Number | String | null} id
 * @private
 */
DataSet.prototype._remove = function (id) {
  if (util.isNumber(id) || util.isString(id)) {
    if (this.data[id]) {
      delete this.data[id];
      delete this.internalIds[id];
      return id;
    }
  }
  else if (id instanceof Object) {
    var itemId = id[this.fieldId];
    if (itemId && this.data[itemId]) {
      delete this.data[itemId];
      delete this.internalIds[itemId];
      return itemId;
    }
  }
  return null;
};

/**
 * Clear the data
 * @param {String} [senderId] Optional sender id
 * @return {Array} removedIds    The ids of all removed items
 */
DataSet.prototype.clear = function (senderId) {
  var ids = Object.keys(this.data);

  this.data = {};
  this.internalIds = {};

  this._trigger('remove', {items: ids}, senderId);

  return ids;
};

/**
 * Find the item with maximum value of a specified field
 * @param {String} field
 * @return {Object | null} item  Item containing max value, or null if no items
 */
DataSet.prototype.max = function (field) {
  var data = this.data,
      max = null,
      maxField = null;

  for (var id in data) {
    if (data.hasOwnProperty(id)) {
      var item = data[id];
      var itemField = item[field];
      if (itemField != null && (!max || itemField > maxField)) {
        max = item;
        maxField = itemField;
      }
    }
  }

  return max;
};

/**
 * Find the item with minimum value of a specified field
 * @param {String} field
 * @return {Object | null} item  Item containing max value, or null if no items
 */
DataSet.prototype.min = function (field) {
  var data = this.data,
      min = null,
      minField = null;

  for (var id in data) {
    if (data.hasOwnProperty(id)) {
      var item = data[id];
      var itemField = item[field];
      if (itemField != null && (!min || itemField < minField)) {
        min = item;
        minField = itemField;
      }
    }
  }

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
      fieldType = this.options.convert[field],
      count = 0;

  for (var prop in data) {
    if (data.hasOwnProperty(prop)) {
      var item = data[prop];
      var value = util.convert(item[field], fieldType);
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
      var fieldType = this.convert[field];  // type may be undefined
      d[field] = util.convert(item[field], fieldType);
    }
  }
  this.data[id] = d;

  return id;
};

/**
 * Get an item. Fields can be converted to a specific type
 * @param {String} id
 * @param {Object.<String, String>} [convert]  field types to convert
 * @return {Object | null} item
 * @private
 */
DataSet.prototype._getItem = function (id, convert) {
  var field, value;

  // get the item from the dataset
  var raw = this.data[id];
  if (!raw) {
    return null;
  }

  // convert the items field types
  var converted = {},
      fieldId = this.fieldId,
      internalIds = this.internalIds;
  if (convert) {
    for (field in raw) {
      if (raw.hasOwnProperty(field)) {
        value = raw[field];
        // output all fields, except internal ids
        if ((field != fieldId) || (!(value in internalIds) || this.showInternalIds)) {
          converted[field] = util.convert(value, convert[field]);
        }
      }
    }
  }
  else {
    // no field types specified, no converting needed
    for (field in raw) {
      if (raw.hasOwnProperty(field)) {
        value = raw[field];
        // output all fields, except internal ids
        if ((field != fieldId) || (!(value in internalIds) || this.showInternalIds)) {
          converted[field] = value;
        }
      }
    }
  }
  return converted;
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
      var fieldType = this.convert[field];  // type may be undefined
      d[field] = util.convert(item[field], fieldType);
    }
  }

  return id;
};

/**
 * check if an id is an internal or external id
 * @param id
 * @returns {boolean}
 * @private
 */
DataSet.prototype.isInternalId = function(id) {
  return (id in this.internalIds);
};


/**
 * Get an array with the column names of a Google DataTable
 * @param {DataTable} dataTable
 * @return {String[]} columnNames
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

  for (var col = 0, cols = columns.length; col < cols; col++) {
    var field = columns[col];
    dataTable.setValue(row, col, item[field]);
  }
};
