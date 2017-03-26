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
});