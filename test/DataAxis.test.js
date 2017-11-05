var assert = require('assert');
var jsdom_global = require('jsdom-global');
var canvasMockify = require('./canvas-mock');

var DataAxis = require('../lib/timeline/component/DataAxis');

describe('DataAxis', function () {
  beforeEach(function() {
    this.jsdom_global = canvasMockify("<svg id='svg'></svg>");
    this.svg = this.container = document.getElementById('svg');
    this.body = {
      functions: {},
      emitter: {
        on: function() {}
      }
    };
  });

  afterEach(function() {
    this.jsdom_global();
    this.svg.remove();
    this.svg = undefined;
  });

  it('should work', function () {
    var dataAxis = new DataAxis(this.body, {}, this.svg, {});

  });

  describe('screenToValue', function () {
    it('can called be without an explicit redraw', function () {
      var dataAxis = new DataAxis(this.body, {}, this.svg, {});
      assert(isNaN(dataAxis.screenToValue(77)));
    });
  });

  describe('convertValue', function () {
    it('can called be without an explicit redraw', function () {
      var dataAxis = new DataAxis(this.body, {}, this.svg, {});
      assert(isNaN(dataAxis.convertValue(77)));
    });
  });
});
