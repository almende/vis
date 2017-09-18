var assert = require('assert');
var vis = require('../dist/vis');
var moment = vis.moment;
var DataSet = vis.DataSet;
var Queue = vis.Queue;
// TODO: test the source code immediately, but this is ES6

var now = new Date();

describe('DataSet', function () {
  it('should work', function () {
    // TODO: improve DataSet tests, split up in one test per function

    var data = new DataSet({
      type: {
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
    assert.equal(data.length, 4);
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
      type: {start: 'Number'}
    }).sort(sort), [
      {id: 1, start: now.valueOf()},
      {id: 2, start: now.valueOf()},
      {id: 3, start: now.valueOf()},
      {id: 4, start: now.valueOf()}
    ]);


    // get a single item
    assert.deepEqual(data.get(1, {
      fields: ['id', 'start'],
      type: {start: 'ISODate'}
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
    assert.equal(data.length, 3);

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
    assert.equal(data.length, 4);

    // update an item
    data.update({id: 5, content: 'changed!'});                         // update item (extend existing fields)
    assert.equal(data.length, 4);
    data.remove(3);                                                    // remove existing item
    assert.equal(data.length, 3);
    data.add({id: 3, other: 'bla'});                                   // add new item
    assert.equal(data.length, 4);
    data.update({id: 6, content: 'created!', start: now.valueOf()});   // this item is not yet existing, create it
    assert.equal(data.length, 5);
    assert.deepEqual(data.get().sort(sort), [
      {id: 1, content: 'Item 1', start: now},
      {id: 3, other: 'bla'},
      {id: 4, content: 'Item 4', start: now},
      {id: 5, content: 'changed!', start: now},
      {id: 6, content: 'created!', start: now}
    ]);
    assert.equal(data.length, 5);

    data.clear();
    assert.equal(data.length, 0);

    assert.equal(data.get().length, 0);


    // test filtering and sorting
    data = new DataSet();
    data.add([
      {id: 1, age: 30, group: 2},
      {id: 2, age: 25, group: 4},
      {id: 3, age: 17, group: 2},
      {id: 4, age: 27, group: 3}
    ]);

    assert.deepEqual(data.get({order: 'age'}), [
      {id: 3, age: 17, group: 2},
      {id: 2, age: 25, group: 4},
      {id: 4, age: 27, group: 3},
      {id: 1, age: 30, group: 2}
    ]);
    assert.deepEqual(data.getIds({order: 'age'}), [3, 2, 4, 1]);

    assert.deepEqual(data.get({order: 'age', fields: ['id']}), [
      {id: 3},
      {id: 2},
      {id: 4},
      {id: 1}
    ]);

    assert.deepEqual(data.get({
      order: 'age',
      filter: function (item) {
        return item.group == 2;
      },
      fields: ['id']
    }), [
      {id: 3},
      {id: 1}
    ]);
    assert.deepEqual(data.getIds({
      order: 'age',
      filter: function (item) {
        return (item.group == 2);
      }
    }), [3, 1]);


    data.clear();


    // test if the setting of the showInternalIds works locally for a single get request
    data.add({content: 'Item 1'});
    data.add({content: 'Item 2'});

    assert.notStrictEqual(data.get()[0].id, undefined);

    // create a dataset with initial data
    var data = new DataSet([
      {id: 1, content: 'Item 1', start: new Date(now.valueOf())},
      {id: 2, content: 'Item 2', start: now.toISOString()}
    ]);
    assert.deepEqual(data.getIds(), [1, 2]);

    // create a dataset with initial data and options
    var data = new DataSet([
      {_id: 1, content: 'Item 1', start: new Date(now.valueOf())},
      {_id: 2, content: 'Item 2', start: now.toISOString()}
    ], {fieldId: '_id'});
    assert.deepEqual(data.getIds(), [1, 2]);

    // TODO: extensively test DataSet
    // TODO: test subscribing to events

  });

  it('should queue and flush changes', function () {
    var options = {queue: true};
    var dataset = new DataSet([
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ], options);

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ]);

    dataset.add({id: 3, content: 'Item 3'});
    dataset.update({id: 1, content: 'Item 1 (updated)'});
    dataset.remove(2);

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ]);

    dataset.flush();

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1 (updated)'},
      {id: 3, content: 'Item 3'}
    ]);
  });

  it('should queue and flush changes after a timeout', function (done) {
    var options = {queue: {delay: 100}};
    var dataset = new DataSet([
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ], options);

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ]);

    dataset.add({id: 3, content: 'Item 3'});
    dataset.update({id: 1, content: 'Item 1 (updated)'});
    dataset.remove(2);

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ]);

    setTimeout(function () {
      assert.deepEqual(dataset.get(), [
        {id: 1, content: 'Item 1 (updated)'},
        {id: 3, content: 'Item 3'}
      ]);

      done();
    }, 200)
  });

  it('should remove a queue from the dataset', function () {
    var options = {queue: true};
    var dataset = new DataSet([
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ], options);

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ]);

    dataset.add({id: 3, content: 'Item 3'});
    dataset.update({id: 1, content: 'Item 1 (updated)'});
    dataset.remove(2);

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1'},
      {id: 2, content: 'Item 2'}
    ]);

    dataset.setOptions({queue: false}); // remove queue, should flush changes

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1 (updated)'},
      {id: 3, content: 'Item 3'}
    ]);

    dataset.add({id: 4, content: 'Item 4'});

    assert.deepEqual(dataset.get(), [
      {id: 1, content: 'Item 1 (updated)'},
      {id: 3, content: 'Item 3'},
      {id: 4, content: 'Item 4'}
    ]);
  });

  describe('add', function () {
    it('adds nothing for an empty array', function () {
      var dataset = new DataSet([]);
      var dataItems = [];
      assert.equal(dataset.add(dataItems).length, 0)
    });

    it('adds items of an array', function () {
      var dataset = new DataSet([]);
      var dataItems = [
        {_id: 1, content: 'Item 1', start: new Date(now.valueOf())},
        {_id: 2, content: 'Item 2', start: new Date(now.valueOf())}
      ];
      assert.equal(dataset.add(dataItems).length, 2)
    });

    it('adds a single object', function () {
      var dataset = new DataSet([]);
      var dataItem = {_id: 1, content: 'Item 1', start: new Date(now.valueOf())};
      assert.equal(dataset.add(dataItem).length, 1)
    });

    it('throws an error when passed bad datatypes', function () {
      var dataset = new DataSet([]);
      assert.throws(function () { dataset.add(null) }, Error, "null type throws error");
      assert.throws(function () { dataset.add(undefined) }, Error, "undefined type throws error");
    });
  });

  describe('setOptions', function () {
    var dataset = new DataSet([
      {_id: 1, content: 'Item 1', start: new Date(now.valueOf())}
    ], {queue: true});

    it('does not update queue when passed an undefined queue', function () {
      var dataset = new DataSet([], {queue: true});
      dataset.setOptions({queue: undefined});
      assert.notEqual(dataset._queue, undefined)
    });

    it('destroys the queue when queue set to false', function () {
      var dataset = new DataSet([]);
      dataset.setOptions({queue: false});
      assert.equal(dataset._queue, undefined)
    });

    it('udpates queue options', function () {
      var dataset = new DataSet([]);
      dataset.setOptions({queue: {max: 5, delay: 3}});
      assert.equal(dataset._queue.max, 5);
      assert.equal(dataset._queue.delay, 3);
    });

    it('creates new queue given if none is set', function () {
      var dataset = new DataSet([], {queue: true});
      dataset._queue.destroy();
      dataset._queue = null;
      dataset.setOptions({queue: {max: 5, delay: 3}});
      assert.equal(dataset._queue.max, 5);
      assert.equal(dataset._queue.delay, 3);
    });
  });

  describe('on / off', function () {
    var dataset = new DataSet([
      {_id: 1, content: 'Item 1', start: new Date(now.valueOf())}
    ]);
    var count = 0;
    function inc() {count++;}

    it('fires for put', function () {
      var dataset = new DataSet([]);
      count = 0;
      // on
      dataset.on('add', inc);
      dataset.add({_id: 1, content: 'Item 1', start: new Date(now.valueOf())});
      assert.equal(count, 1);
      // off
      dataset.off('add', inc);
      dataset.add({_id: 2, content: 'Item 2', start: new Date(now.valueOf())});
      assert.equal(count, 1);
    });

    it('fires for remove', function () {
      var dataset = new DataSet([]);
      count = 0;
      // on
      dataset.on('remove', inc);
      var id = dataset.add({_id: 1, content: 'Item 1', start: new Date(now.valueOf())});
      dataset.remove(id);
      assert.equal(count, 1);
      // off
      dataset.off('remove', inc);
      id = dataset.add({_id: 1, content: 'Item 1', start: new Date(now.valueOf())});
      dataset.remove(id);
      assert.equal(count, 1);

    });

    it('fires for update', function () {
      var dataset = new DataSet([]);
      count = 0;
      // on
      dataset.on('update', inc);
      var id = dataset.add({_id: 1, content: 'Item 1', start: new Date(now.valueOf())});
      dataset.update({id: id, content: 'beep boop'});
      assert.equal(count, 1);
      // off
      dataset.off('update', inc);
      id = dataset.add({_id: 1, content: 'Item 1', start: new Date(now.valueOf())});
      dataset.update({id: id, content: 'beep boop'});
      assert.equal(count, 1);
    });
  });
});
