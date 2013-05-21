var assert = require('assert'),
    moment = require('moment'),
    vis = require('../vis.js'),
    DataSet = vis.DataSet,
    DataView = vis.DataView;


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
groups.subscribe('*', function () {
    groupsTriggerCount++;
});
var group2TriggerCount = 0;
group2.subscribe('*', function () {
    group2TriggerCount++;
});

groups.update({id:2, content: 'Item 2 (changed)'});
assert.equal(groupsTriggerCount, 1);
assert.equal(group2TriggerCount, 1);

groups.update({id:5, content: 'Item 5 (changed)'});
assert.equal(groupsTriggerCount, 2);
assert.equal(group2TriggerCount, 1);

// detach the view from groups
group2.setData(null);
assert.equal(groupsTriggerCount, 2);
assert.equal(group2TriggerCount, 2);

groups.update({id:2, content: 'Item 2 (changed again)'});
assert.equal(groupsTriggerCount, 3);
assert.equal(group2TriggerCount, 2);
