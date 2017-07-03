var assert = require('assert');
var vis = require('../dist/vis');
var jsdom = require('mocha-jsdom')
var moment = vis.moment;
var timeline = vis.timeline;
var TimeStep = timeline.TimeStep;
var TestSupport = require('./TestSupport');

describe('TimeStep', function () {
  
  jsdom();

  it('should work with just start and end dates', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5));
    assert.equal(timestep.autoScale, true, "should autoscale if scale not specified");
    assert.equal(timestep.scale, "day", "should default to day scale if scale not specified");
    assert.equal(timestep.step, 1, "should default to 1 day step if scale not specified");
  });

  it('should work with specified scale (just under 1 second)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5), 999);
    assert.equal(timestep.scale, "second", "should have right scale");
    assert.equal(timestep.step, 1, "should have right step size");
  });

  // TODO: check this - maybe should work for 1000?
  it('should work with specified scale (1 second)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5), 1001);
    assert.equal(timestep.scale, "second", "should have right scale");
    assert.equal(timestep.step, 5, "should have right step size");
  });

  it('should work with specified scale (2 seconds)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5), 2000);
    assert.equal(timestep.scale, "second", "should have right scale");
    assert.equal(timestep.step, 5, "should have right step size");
  });

  it('should work with specified scale (5 seconds)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5), 5001);
    assert.equal(timestep.scale, "second", "should have right scale");
    assert.equal(timestep.step, 10, "should have right step size");
  });

  it('should perform the step with a specified scale (1 year)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5));
    timestep.setScale({ scale: 'year', step: 1 });
    timestep.start();
    assert.equal(timestep.getCurrent().unix(), moment("2017-01-01T00:00:00.000").unix(), "should have the right initial value");
    timestep.next();
    assert.equal(timestep.getCurrent().unix(), moment("2018-01-01T00:00:00.000").unix(), "should have the right value after a step");
  });

  it('should perform the step with a specified scale (1 month)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5));
    timestep.setScale({ scale: 'month', step: 1 });
    timestep.start();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-01T00:00:00.000").unix(), "should have the right initial value");
    timestep.next();
    assert.equal(timestep.getCurrent().unix(), moment("2017-05-01T00:00:00.000").unix(), "should have the right value after a step");
  });

  it('should perform the step with a specified scale (1 week)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5));
    timestep.setScale({ scale: 'week', step: 1 });
    timestep.start();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-02T00:00:00.000").unix(), "should have the right initial value");
    timestep.next();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-09T00:00:00.000").unix(), "should have the right value after a step");
  });

  it('should perform the step with a specified scale (1 day)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5));
    timestep.setScale({ scale: 'day', step: 1 });
    timestep.start();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-03T00:00:00.000").unix(), "should have the right initial value");
    timestep.next();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-04T00:00:00.000").unix(), "should have the right value after a step");
  });

  it('should perform the step with a specified scale (1 hour)', function () {
    var timestep = new TimeStep(new Date(2017, 3, 3), new Date(2017, 3, 5));
    timestep.setScale({ scale: 'hour', step: 1 });
    timestep.start();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-03T00:00:00.000").unix(), "should have the right initial value");
    timestep.next();
    assert.equal(timestep.getCurrent().unix(), moment("2017-04-03T01:00:00.000").unix(), "should have the right value after a step");
  });

});