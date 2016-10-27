var assert = require('assert');
var vis = require('../dist/vis');
var moment = vis.moment;
var DataSet = vis.DataSet;
var DataView = vis.DataView;
// TODO: test the source code immediately, but this is ES6

// TODO: improve DataView tests, split up in one test per function
describe('DataView', function () {
  it('should work', function () {
    var groups = new DataSet();

// add items with different groups
    groups.add([
      {id: 1, content: 'Item 1', group: 1},
      {id: 2, content: 'Item 2', group: 2},
      {id: 3, content: 'Item 3', group: 2},
      {id: 4, content: 'Item 4', group: 1},
      {id: 5, content: 'Item 5', group: 3}
    ]);

    var group2 = new DataView(groups, {
      filter: function (item) {
        return item.group == 2;
      }
    });

// test getting the filtered data
    assert.deepEqual(group2.get(), [
      {id: 2, content: 'Item 2', group: 2},
      {id: 3, content: 'Item 3', group: 2}
    ]);
    assert.equal(group2.length, 2);

// test filtering the view contents
    assert.deepEqual(group2.get({
      filter: function (item) {
        return item.id > 2;
      }
    }), [
      {id: 3, content: 'Item 3', group: 2}
    ]);

// test event subscription
    var groupsTriggerCount = 0;
    groups.on('*', function () {
      groupsTriggerCount++;
    });
    var group2TriggerCount = 0;
    group2.on('*', function () {
      group2TriggerCount++;
    });

    groups.update({id:2, content: 'Item 2 (changed)'});
    assert.equal(groupsTriggerCount, 1);
    assert.equal(group2TriggerCount, 1);
    assert.equal(group2.length, 2);

    groups.update({id:5, content: 'Item 5 (changed)'});
    assert.equal(groupsTriggerCount, 2);
    assert.equal(group2TriggerCount, 1);
    assert.equal(group2.length, 2);

// detach the view from groups
    group2.setData(null);
    assert.equal(groupsTriggerCount, 2);
    assert.equal(group2TriggerCount, 2);
    assert.equal(group2.length, 0);

    groups.update({id:2, content: 'Item 2 (changed again)'});
    assert.equal(groupsTriggerCount, 3);
    assert.equal(group2TriggerCount, 2);

    // test updating of .length property
    group2.setData(groups);
    assert.equal(group2.length, 2);

    // add a new item
    groups.add({id: 6, content: 'Item 6', group: 2});
    assert.equal(group2.length, 3);

    // change an items group to 2
    groups.update({id: 4, group: 2});
    assert.equal(group2.length, 4);

    // change an items group to 1
    groups.update({id: 4, group: 1});
    assert.equal(group2.length, 3);

    // remove an item
    groups.remove(2);
    assert.equal(group2.length, 2);

    // remove all items
    groups.clear();
    assert.equal(group2.length, 0);
  });


  it('should refresh a DataView with filter', function () {
    var data = new DataSet([
      {id:1, value:2},
      {id:2, value:4},
      {id:3, value:7}
    ]);

    var threshold = 5;

    // create a view. The view has a filter with a dynamic property `threshold`
    var view = new DataView(data, {
      filter: function (item) {
        return item.value < threshold;
      }
    });

    var added, updated, removed;
    view.on('add', function (event, props) {added = added.concat(props.items)});
    view.on('update', function (event, props) {updated = updated.concat(props.items)});
    view.on('remove', function (event, props) {removed = removed.concat(props.items)});

    assert.deepEqual(view.get(), [
      {id:1, value:2},
      {id:2, value:4}
    ]);

    // change the threshold to 3
    added = [];
    updated = [];
    removed = [];
    threshold = 3;
    view.refresh();
    assert.deepEqual(view.get(), [{id:1, value:2}]);
    assert.deepEqual(added, []);
    assert.deepEqual(updated, []);
    assert.deepEqual(removed, [2]);

    // change threshold to 8
    added = [];
    updated = [];
    removed = [];
    threshold = 8;
    view.refresh();
    assert.deepEqual(view.get(), [
      {id:1, value:2},
      {id:2, value:4},
      {id:3, value:7}
    ]);
    assert.deepEqual(added, [2, 3]);
    assert.deepEqual(updated, []);
    assert.deepEqual(removed, []);
  });

  it('should pass data of changed items when updating a DataSet', function () {
    var data = new DataSet([
      {id: 1, title: 'Item 1', group: 1},
      {id: 2, title: 'Item 2', group: 2},
      {id: 3, title: 'Item 3', group: 2}
    ]);
    var view = new DataView(data, {
      filter: function (item) {
        return item.group === 2;
      }
    });

    var dataUpdates = [];
    var viewUpdates = [];


    data.on('update', function (event, properties, senderId) {
      dataUpdates.push([event, properties]);
    });

    view.on('update', function (event, properties, senderId) {
      viewUpdates.push([event, properties]);
    });

    // make a change not affecting the DataView
    data.update({id: 1, title: 'Item 1 (changed)'});
    assert.deepEqual(dataUpdates, [
      ['update', {
        items: [1],
        data: [{id: 1, title: 'Item 1 (changed)'}],
        oldData: [{"group": 1, "id": 1, "title": "Item 1"}]
  }]
    ]);
    assert.deepEqual(viewUpdates, []);

    // make a change affecting the DataView
    data.update({id: 2, title: 'Item 2 (changed)'});
    assert.deepEqual(dataUpdates, [
      ['update', {
        items: [1],
        data: [{id: 1, title: 'Item 1 (changed)'}],
        oldData: [{"group": 1, "id": 1, "title": "Item 1"}]
      }],
      ['update', {
        items: [2],
        data: [{id: 2, title: 'Item 2 (changed)'}],
        oldData: [{"group": 2, "id": 2, "title": "Item 2"}]
      }]
    ]);
    assert.deepEqual(viewUpdates, [
      ['update', {items: [2], data: [{id: 2, title: 'Item 2 (changed)'}],
      oldData: [{"group": 2, "id": 2, "title": "Item 2"}]}]
    ]);

  });

});
