var assert = require('assert');
var sinon = require('sinon');
var jsdom_global = require('jsdom-global');

var canvasMockify = require('./canvas-mock');
var ColorPicker = require('../lib/shared/ColorPicker').default;

describe('ColorPicker', function () {
  beforeEach(function() {
    this.jsdom_global = jsdom_global(
      "<div id='mynetwork'></div>",
      { skipWindowCheck: true}
    );
    canvasMockify(window);
    this.container = document.getElementById('mynetwork');
  });

  afterEach(function() {
    this.jsdom_global();
    this.container.remove();
    this.container = undefined;
  });

  describe('constructor', function () {

    it('sets defaults', function () {
      var colorPicker = new ColorPicker();
      assert.equal(colorPicker.pixelRatio, 1);
      assert.equal(colorPicker.generated, false);
      assert.deepEqual(colorPicker.centerCoordinates, {x:289/2, y:289/2});
      assert.equal(colorPicker.r, 289 * 0.49);
      assert.deepEqual(colorPicker.color, {r:255,g:255,b:255,a:1.0});
      assert.equal(colorPicker.hueCircle, undefined);
      assert.deepEqual(colorPicker.initialColor, {r:255,g:255,b:255,a:1.0});
      assert.equal(colorPicker.previousColor, undefined);
      assert.equal(colorPicker.applied, false);
    });

    // TODO: This gets overridden during instantiation - Is this a bug?
    xit('can overwrite default pixelRation', function () {
      var colorPicker = new ColorPicker(777);
      assert.equal(colorPicker.pixelRatio, 777);
    });

  });

  describe('insertTo', function () {

    it('inserts the colorPicker into a div from the DOM', function () {
      var colorPicker = new ColorPicker();
      colorPicker.insertTo(this.container);
      assert.equal(colorPicker.container, this.container);
      assert.equal(this.container.children[this.container.children.length-1], colorPicker.frame);
    });
  });

  describe('setUpdateCallback', function () {

    it('prevents non-functions from being set as callback', function () {
      var colorPicker = new ColorPicker();
      assert.throws(function () {colorPicker.setUpdateCallback(null);}, Error, null);
    });
  });

  describe('setCloseCallback', function () {

    it('prevents non-functions from being set as callback', function () {
      var colorPicker = new ColorPicker();
      assert.throws(function () {colorPicker.setCloseCallback(null);}, Error, null);
    });
  });

  describe('_hide', function () {

    it('runs updateCallback when applied', function () {
      var callback = sinon.spy();
      var colorPicker = new ColorPicker();
      colorPicker.setUpdateCallback(callback);
      colorPicker.applied = true;
      colorPicker._hide();
      assert.equal(callback.callCount, 1);
    });

    it('does not run updateCallback when not applied', function () {
      var callback = sinon.spy();
      var colorPicker = new ColorPicker();
      colorPicker.setUpdateCallback(callback);
      colorPicker.applied = false;
      colorPicker._hide();
      assert.equal(callback.callCount, 0);
    });
  });

  describe('_isColorString', function () {

    it('returns color code when color is found', function () {
      var colorPicker = new ColorPicker();
      var color = colorPicker._isColorString('black');
      assert.equal(color, '#000000');
    });

    it('returns undefined when color is not found', function () {
      var colorPicker = new ColorPicker();
      var color = colorPicker._isColorString('zing!');
      assert.equal(color, undefined);
    });
  });

  describe('setColor', function () {

    it('does not change when \'none\'', function () {
      var colorPicker = new ColorPicker();
      colorPicker.setColor('none');
      assert.deepEqual(colorPicker.color, { r: 255, g: 255, b: 255, a: 1 });
    });

    it('handles null', function () {
      var colorPicker = new ColorPicker();
      colorPicker.setColor('none');
      assert.deepEqual(colorPicker.color, { r: 255, g: 255, b: 255, a: 1 });
    });
  });
});
