var assert = require('assert');
var vis = require('../dist/vis');
var jsdom = require('mocha-jsdom')
var moment = vis.moment;
var timeline = vis.timeline;
var Range = timeline.Range;
var TestSupport = require('./TestSupport');

describe('Timeline Range', function () {
  
  jsdom();

  it('should have start default before now', function () {
    var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0).valueOf();
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    assert(range.start < now, "Default start is before now");
  });

  it('should have end default after now', function () {
    var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0).valueOf();
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    assert(range.end > now, "Default end is after now");
  });

  it('should support custom start and end dates', function () {
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    range.setRange(new Date(2017, 0, 26, 13, 26, 3, 320), new Date(2017, 3, 11, 0, 23, 35, 0), false, false, null);
    assert.equal(range.start, new Date(2017, 0, 26, 13, 26, 3, 320).valueOf(),  "start is as expected");
    assert.equal(range.end, new Date(2017, 3, 11, 0, 23, 35, 0).valueOf(),  "end is as expected");
  });

  it('should calculate milliseconds per pixel', function () {
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    assert(range.getMillisecondsPerPixel() > 0, "positive value for milliseconds per pixel");
  });

  it('should calculate 1 millisecond per pixel for simple range', function () {
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    range.setRange(new Date(2017, 0, 26, 13, 26, 3, 320), new Date(2017, 0, 26, 13, 26, 4, 320), false, false, null);
    assert.equal(range.getMillisecondsPerPixel(), 1, "one second over 1000 pixels");
  });
});