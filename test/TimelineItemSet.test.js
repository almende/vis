var assert = require('assert');

describe('Timeline ItemSet', function () {
  before(function () {
    delete require.cache[require.resolve('../dist/vis')]
    this.jsdom = require('jsdom-global')();
    this.vis = require('../dist/vis');
    var TestSupport = require('./TestSupport');
    var rangeBody = TestSupport.buildSimpleTimelineRangeBody();
    this.testrange = new this.vis.timeline.Range(rangeBody);
    this.testrange.setRange(new Date(2017, 1, 26, 13, 26, 3, 320), new Date(2017, 1, 26, 13, 26, 4, 320), false, false, null);
    this.testitems =  new this.vis.DataSet({
      type: {
        start: 'Date',
        end: 'Date'
      }
    });
    // add single items with different date types
    this.testitems.add({id: 1, content: 'Item 1', start: new Date(2017, 1, 26, 13, 26, 3, 600), type: 'point'});
    this.testitems.add({id: 2, content: 'Item 2', start: new Date(2017, 1, 26, 13, 26, 5, 600), type: 'point'});
  })

  after(function () {
    this.jsdom();
  })

  var getBasicBody = function() {
    var body = {
      dom: {
        container: document.createElement('div'),
        leftContainer: document.createElement('div'),
        centerContainer: document.createElement('div'),
        top: document.createElement('div'),
        left: document.createElement('div'),
        center: document.createElement('div'),
        backgroundVertical: document.createElement('div')
      },
      domProps: {
        root: {},
        background: {},
        centerContainer: {},
        leftContainer: {},
        rightContainer: {},
        center: {},
        left: {},
        right: {},
        top: {},
        bottom: {},
        border: {},
        scrollTop: 0,
        scrollTopMin: 0
      },
      emitter: {
        on: function() {return {};},
        emit: function() {}
      },
      util: {
      }
    }
    return body;
  };

  it('should initialise with minimal data', function () {
    var body = getBasicBody();
    var itemset = new this.vis.timeline.components.ItemSet(body, {});
    assert(itemset);
  });

  it('should redraw() and have the right classNames', function () {
    var body = getBasicBody();
    body.range = this.testrange;
    var itemset = new this.vis.timeline.components.ItemSet(body, {});
    itemset.redraw();
    assert.equal(itemset.dom.frame.className, 'vis-itemset');
    assert.equal(itemset.dom.background.className, 'vis-background');
    assert.equal(itemset.dom.foreground.className, 'vis-foreground');
    assert.equal(itemset.dom.axis.className, 'vis-axis');
    assert.equal(itemset.dom.labelSet.className, 'vis-labelset');
  });

  it('should start with no items', function () {
    var body = getBasicBody();
    var itemset = new this.vis.timeline.components.ItemSet(body, {});
    assert.equal(itemset.getItems(), null);
  });

  it('should store items correctly', function() {
    var body = getBasicBody();
    body.range = this.testrange;
    var DateUtil = this.vis.timeline.DateUtil;
    body.util.toScreen = function(time) {
      return DateUtil.toScreen({
        body: {
          hiddenDates: []
        },
        range: {
          conversion: function() {
            return {offset: 0, scale: 100};
          }
        }
      }, time, 900)
    };
    var itemset = new this.vis.timeline.components.ItemSet(body, {});
    itemset.setItems(this.testitems);
    assert.equal(itemset.getItems().length, 2);
    assert.deepEqual(itemset.getItems(), this.testitems);
  });
});
