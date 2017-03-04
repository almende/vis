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
  var now = moment();

  it('should initialize with minimal data', function() {
    var pointItem = new PointItem({start: now.toDate()}, null, null);
    assert.equal(pointItem.props.content.height, 0);
    assert.deepEqual(pointItem.data.start, now.toDate());
  });

  it('should have a default width of 0', function() {
    var pointItem = new PointItem({start: now}, null, null);
    assert.equal(pointItem.getWidthRight(), 0);
    assert.equal(pointItem.getWidthLeft(), 0);
   });

  it('should error if there is missing data', function () {
    assert.throws(function () { new PointItem({}, null, null)}, Error);
  });

  it('should be visible if the range is during', function() {
    var range = new Range(TestSupport.buildSimpleTimelineRangeBody());
    range.start = now.clone().add(-1, 'second');
    range.end = range.start.clone().add(1, 'hour');
    var pointItem = new PointItem({start: now.toDate()}, null, null);
    assert(pointItem.isVisible(range));
  });

  it('should not be visible if the range is after', function() {
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
    var pointItem = new PointItem({start: now.toDate()}, null, null);
    assert(pointItem.isVisible(range));
  });

  it('should redraw() and then not be dirty', function() {
    var pointItem = new PointItem({start: now.toDate()}, null, {editable: false});
    pointItem.setParent(TestSupport.buildMockItemSet());
    assert(pointItem.dirty);
    pointItem.redraw();
    assert(!pointItem.dirty);
  });

  it('should redraw() and then have point attached to its parent', function() {
    var pointItem = new PointItem({start: now.toDate()}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    assert(!parent.dom.foreground.hasChildNodes());
    pointItem.redraw();
    assert(parent.dom.foreground.hasChildNodes());
  });

  it('should redraw() and then have the correct classname for a non-editable item', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: false}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-readonly");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-readonly");
  });

  it('should redraw() and then have the correct classname for an editable item (with object option)', function() {
    var pointItem = new PointItem({start: now.toDate()}, null, {editable: {updateTime: true, updateGroup: false}});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-editable");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-editable");
  });

  it('should redraw() and then have the correct classname for an editable item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate()}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-editable");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-editable");
  });

  it('should redraw() and then have the correct classname for an editable:false override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: false}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-readonly");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-readonly");
  });

  it('should redraw() and then have the correct classname for an editable:true override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: true}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-editable");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-editable");
  });

  it('should redraw() and then have the correct classname for an editable:false override item (with object option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: false}, null, {editable: {updateTime: true, updateGroup: false}});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-readonly");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-readonly");
  });

  it('should redraw() and then have the correct classname for an editable:false override item (with object option for group change)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: false}, null, {editable: {updateTime: false, updateGroup: true}});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-readonly");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-readonly");
  });

  it('should redraw() and then have the correct classname for an editable:true override item (with object option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: true}, null, {editable: {updateTime: false, updateGroup: false}});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-editable");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-editable");
  });

  it('should redraw() and then have the correct classname for an editable:true non-override item (with object option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: true}, null, {editable: {updateTime: false, updateGroup: false, overrideItems: true}});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-readonly");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-readonly");
  });

  it('should redraw() and then have the correct classname for an editable:false non-override item (with object option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: false}, null, {editable: {updateTime: true, updateGroup: false, overrideItems: true}});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.dom.dot.className, "vis-item vis-dot vis-editable");
    assert.equal(pointItem.dom.point.className, "vis-item vis-point vis-editable");
  });

  it('should redraw() and then have the correct property for an editable: {updateTime} override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateTime: true}}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, true);
    assert.equal(pointItem.editable.updateGroup, undefined);
    assert.equal(pointItem.editable.remove, undefined);
  });

  it('should redraw() and then have the correct property for an editable: {updateTime} override item (with boolean option false)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateTime: true}}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, true);
    assert.equal(pointItem.editable.updateGroup, undefined);
    assert.equal(pointItem.editable.remove, undefined);
  });

  it('should redraw() and then have the correct property for an editable: {updateGroup} override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateGroup: true}}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, undefined);
    assert.equal(pointItem.editable.updateGroup, true);
    assert.equal(pointItem.editable.remove, undefined);
  });

  it('should redraw() and then have the correct property for an editable: {updateGroup} override item (with boolean option false)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateGroup: true}}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, undefined);
    assert.equal(pointItem.editable.updateGroup, true);
    assert.equal(pointItem.editable.remove, undefined);
  });

  it('should redraw() and then have the correct property for an editable: {remove} override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {remove: true}}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, undefined);
    assert.equal(pointItem.editable.updateGroup, undefined);
    assert.equal(pointItem.editable.remove, true);
  });

  it('should redraw() and then have the correct property for an editable: {remove} override item (with boolean option false)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {remove: true}}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, undefined);
    assert.equal(pointItem.editable.updateGroup, undefined);
    assert.equal(pointItem.editable.remove, true);
  });

  it('should redraw() and then have the correct property for an editable: {updateTime, remove} override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateTime: true, remove: true}}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, true);
    assert.equal(pointItem.editable.updateGroup, undefined);
    assert.equal(pointItem.editable.remove, true);
  });

  it('should redraw() and then have the correct property for an editable: {updateTime, remove} override item (with boolean option false)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateTime: true, remove: true}}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, true);
    assert.equal(pointItem.editable.updateGroup, undefined);
    assert.equal(pointItem.editable.remove, true);
  });

  it('should redraw() and then have the correct property for an editable: {updateTime, updateGroup, remove} override item (with boolean option)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateTime: true, updateGroup: true, remove: true}}, null, {editable: true});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, true);
    assert.equal(pointItem.editable.updateGroup, true);
    assert.equal(pointItem.editable.remove, true);
  });

  it('should redraw() and then have the correct property for an editable: {updateTime, updateGroup, remove} override item (with boolean option false)', function() {
    var pointItem = new PointItem({start: now.toDate(), editable: {updateTime: true, updateGroup: true, remove: true}}, null, {editable: false});
    var parent = TestSupport.buildMockItemSet();
    pointItem.setParent(parent);
    pointItem.redraw();
    assert.equal(pointItem.editable.updateTime, true);
    assert.equal(pointItem.editable.updateGroup, true);
    assert.equal(pointItem.editable.remove, true);
  });
});
