// test vis.EventBus

var assert = require('assert'),
    vis = require('../vis');

var bus = new vis.EventBus();

var received = [];

var id1 = '1';
bus.on('message', function (event, data, source) {
  received.push({
    event: event,
    data: data,
    source: source
  });
}, id1);

var id2 = '2';
bus.emit('message', {text: 'hello world'}, id2);
bus.on('chat:*', function (event, data, source) {
  received.push({
    event: event,
    data: data,
    source: source
  });
});

bus.emit('chat:1', null, id2);
bus.emit('chat:2', {text: 'hello world'}, id1);

// verify if the messages are received
assert.deepEqual(received, [
  {event: 'message', data: {text: 'hello world'}, source: id2},
  {event: 'chat:1', data: null, source: id2},
  {event: 'chat:2', data: {text: 'hello world'}, source: id1}
]);

