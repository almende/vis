var assert = require('assert');
var vis = require('../dist/vis');
var jsdom = require('mocha-jsdom');
var moment = vis.moment;
var timeline = vis.timeline;
var PointItem = require("../lib/timeline/component/item/PointItem");
var Range = timeline.Range;
var TestSupport = require('./TestSupport');

describe('Timeline PointItem', function () {
  
  jsdom();

  it('should initialize with minimal data', function() {
    var now = moment().toDate();
    var pointItem = new PointItem({start: now}, null, null);
    assert.equal(pointItem.props.content.height, 0);
    assert.equal(pointItem.data.start, now);
  });

  it('should have a default width of 0', function() {
    var now = moment().toDate();
    var pointItem = new PointItem({start: now}, null, null);
    assert.equal(pointItem.getWidthRight(), 0);
    assert.equal(pointItem.getWidthLeft(), 0);
   });

  it('should error if there is missing data', function () {
    assert.throws(function () { new PointItem({}, null, null)}, Error);
  });

  it('should be visible if the range is during', function() {
    var now = moment();
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    range.start = now.clone().add(-1, 'second');
    range.end = range.start.clone().add(1, 'hour');
    var pointItem = new PointItem({start: now.toDate()}, null, null);
    assert(pointItem.isVisible(range));
  });

  it('should not be visible if the range is after', function() {
    var now = moment();
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    range.start = now.clone().add(1, 'second');
    range.end = range.start.clone().add(1, 'hour');
    var pointItem = new PointItem({start: now.toDate()}, null, null);
    assert(!pointItem.isVisible(range));
  });

  it('should not be visible if the range is before', function() {
    var now = moment();
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    range.end = now.clone().add(-1, 'second');
    range.start = range.end.clone().add(-1, 'hour');
    var pointItem = new PointItem({start: now.toDate()}, null, null);
    assert(!pointItem.isVisible(range));
  });

  it('should be visible for a "now" point with a default range', function() {
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    var now = moment().toDate();
    var pointItem = new PointItem({start: now}, null, null);
    assert(pointItem.isVisible(range));
  });
});