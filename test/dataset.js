var assert = require('assert'),
    moment = require('moment'),
    vis = require('../dist/vis.js'),
    DataSet = vis.DataSet;

var now = new Date();

var data = new DataSet({
  convert: {
    start: 'Date',
    end: 'Date'
  }
});

// add single items with different date types
data.add({id: 1, content: 'Item 1', start: new Date(now.valueOf())});
data.add({id: 2, content: 'Item 2', start: now.toISOString()});
data.add([
  //{id: 3, content: 'Item 3', start: moment(now)}, // TODO: moment fails, not the same instance
  {id: 3, content: 'Item 3', start: now},
  {id: 4, content: 'Item 4', start: '/Date(' + now.valueOf() + ')/'}
]);

var items = data.get();
assert.equal(items.length, 4);
items.forEach(function (item) {
  assert.ok(item.start instanceof Date);
});

// get filtered fields only
var sort = function (a, b) {
  return a.id > b.id;
};
assert.deepEqual(data.get({
  fields: ['id', 'content']
}).sort(sort), [
  {id: 1, content: 'Item 1'},
  {id: 2, content: 'Item 2'},
  {id: 3, content: 'Item 3'},
  {id: 4, content: 'Item 4'}
]);


// convert dates
assert.deepEqual(data.get({
  fields: ['id', 'start'],
  convert: {start: 'Number'}
}).sort(sort), [
  {id: 1, start: now.valueOf()},
  {id: 2, start: now.valueOf()},
  {id: 3, start: now.valueOf()},
  {id: 4, start: now.valueOf()}
]);


// get a single item
assert.deepEqual(data.get(1, {
  fields: ['id', 'start'],
  convert: {start: 'ISODate'}
}), {
  id: 1,
  start: now.toISOString()
});

// remove an item
data.remove(2);
assert.deepEqual(data.get({
  fields: ['id']
}).sort(sort), [
  {id: 1},
  {id: 3},
  {id: 4}
]);

// add an item
data.add({id: 5, content: 'Item 5', start: now.valueOf()});
assert.deepEqual(data.get({
  fields: ['id']
}).sort(sort), [
  {id: 1},
  {id: 3},
  {id: 4},
  {id: 5}
]);

// update an item
data.update({id: 5, content: 'changed!'});                         // update item (extend existing fields)
data.remove(3);                                                    // remove existing item
data.add({id: 3, other: 'bla'});                                   // add new item
data.update({id: 6, content: 'created!', start: now.valueOf()});   // this item is not yet existing, create it
assert.deepEqual(data.get().sort(sort), [
  {id: 1, content: 'Item 1', start: now},
  {id: 3, other: 'bla'},
  {id: 4, content: 'Item 4', start: now},
  {id: 5, content: 'changed!', start: now},
  {id: 6, content: 'created!', start: now}
]);

data.clear();

assert.equal(data.get().length, 0);


// test filtering and sorting
data = new vis.DataSet();
data.add([
  {id:1, age: 30, group: 2},
  {id:2, age: 25, group: 4},
  {id:3, age: 17, group: 2},
  {id:4, age: 27, group: 3}
]);

assert.deepEqual(data.get({order: 'age'}), [
  {id:3, age: 17, group: 2},
  {id:2, age: 25, group: 4},
  {id:4, age: 27, group: 3},
  {id:1, age: 30, group: 2}
]);
assert.deepEqual(data.getIds({order: 'age'}), [3,2,4,1]);

assert.deepEqual(data.get({order: 'age', fields: ['id']}), [
  {id:3},
  {id:2},
  {id:4},
  {id:1}
]);

assert.deepEqual(data.get({
  order: 'age',
  filter: function (item) {
    return item.group == 2;
  },
  fields: ['id']
}), [
  {id:3},
  {id:1}
]);
assert.deepEqual(data.getIds({
  order: 'age',
  filter: function (item) {
    return (item.group == 2);
  }
}), [3,1]);



// TODO: extensively test DataSet
