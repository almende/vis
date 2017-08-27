var assert = require('assert');
var Queue = require('../lib/Queue');

describe('Queue', function () {
  it('queue actions', function () {
    var queue = new Queue();

    var count = 0;
    function inc() {
      count++;
    }

    queue.queue(inc);
    assert.equal(count, 0);

    queue.flush();
    assert.equal(count, 1);
  });

  it('queue actions with a delay', function (done) {
    var queue = new Queue({delay: 25});

    var count = 0;
    function inc() {
      count++;
    }

    queue.queue(inc);
    assert.equal(count, 0);

    setTimeout(function () {
      assert.equal(count, 1);

      done();
    }, 50);
  });

  it('queue multiple actions with a delay', function (done) {
    var queue = new Queue({delay: 100});

    var count = 0;
    function inc() {
      count++;
    }

    queue.queue(inc);
    assert.equal(count, 0);

    setTimeout(function () {
      queue.queue(inc);
      assert.equal(count, 0);

      // flush should now occur after 100 ms from now, lets test after 75 and 125 ms
      setTimeout(function () {
        assert.equal(count, 0);

        setTimeout(function () {
          assert.equal(count, 2);

          done();
        }, 50);
      }, 75);
    }, 50);
  });

  it('flush when the configured maximum is exceeded', function () {
    var queue = new Queue({max: 4});

    var count = 0;
    function inc() {
      count++;
    }

    queue.queue(inc);
    queue.queue(inc);
    assert.equal(count, 0);

    queue.queue(inc);
    queue.queue(inc);
    queue.queue(inc);
    assert.equal(count, 5);
  });

  it('queue actions with args', function () {
    var queue = new Queue();

    var count = 0;
    function add(value) {
      count += value;
    }

    queue.queue({fn: add, args: [2]});
    assert.equal(count, 0);

    queue.flush();
    assert.equal(count, 2);
  });

  it('queue actions with args and context', function () {
    var queue = new Queue();

    var obj = {
      count: 0,
      add: function (value) {
        this.count += value;
      }
    };

    queue.queue({context: obj, fn: obj.add, args: [2]});
    assert.equal(obj.count, 0);

    queue.flush();
    assert.equal(obj.count, 2);
  });

  it('replace functions on an object', function () {
    var queue = new Queue();

    var obj = {
      count: 0,
      add: function (value) {
        this.count += value;
      }
    };

    queue.replace(obj, 'add');

    obj.add(3);
    assert.equal(obj.count, 0);

    queue.flush();
    assert.equal(obj.count, 3);
  });

  it('extend an object', function () {
    var obj = {
      count: 0,
      add: function (value) {
        this.count += value;
      },
      subtract: function (value) {
        this.count -= value;
      }
    };

    Queue.extend(obj, {replace: ['add', 'subtract']});

    obj.add(3);
    obj.subtract(1);
    assert.equal(obj.count, 0);

    obj.flush();
    assert.equal(obj.count, 2);
  });

  it('set options in constructor', function () {
    var queue = new Queue({delay: 3, max: 5});
    assert.equal(queue.delay, 3);
    assert.equal(queue.max, 5);
  });

  it('set options explicitly', function () {
    var queue = new Queue();
    queue.setOptions({delay: 3, max: 5});
    assert.equal(queue.delay, 3);
    assert.equal(queue.max, 5);
  });

  it('set option delay', function () {
    var queue = new Queue();
    queue.setOptions({delay: 3});
    assert.equal(queue.delay, 3);
    assert.equal(queue.max, Infinity);
  });

  it('set option max', function () {
    var queue = new Queue();
    queue.setOptions({max: 5});
    assert.equal(queue.delay, null);
    assert.equal(queue.max, 5);
  });

  it('destroy flushes the queue', function () {
    var queue = new Queue({max: 4});

    var count = 0;
    function inc() {
      count++;
    }
    queue.queue(inc);
    queue.destroy();
    assert.equal(count, 1)
  });

  it('destroy removes extensions', function () {
    var obj = {
      count: 0,
      add: function (value) {
        this.count += value;
      },
      subtract: function (value) {
        this.count -= value;
      }
    };

    var queue = Queue.extend(obj, {replace: ['add', 'subtract']});
    queue.destroy();
    assert.equal(queue._extended, null);
  });

});
