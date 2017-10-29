var assert = require('assert');
var sinon = require('sinon');
var jsdom = require('jsdom');
var jsdom_global = require('jsdom-global');


var canvasMockify = require('./canvas-mock');
var Activator = require('../lib/shared/Activator');


describe('Activator', function () {
  beforeEach(function() {
    this.jsdom_global = canvasMockify("<div id='mynetwork'></div>");
    this.container = document.getElementById('mynetwork');
  });

  afterEach(function() {
    this.jsdom_global();
    this.container.remove();
    this.container = undefined;
  });

  describe('constructor', function () {

    it('sets defaults', function () {
      var activator = new Activator(this.container);
      assert.equal(activator.active, false);
    });

    it('creates overlay', function () {
      var activator = new Activator(this.container);
      assert.equal(activator.dom.container.children[0].className, 'vis-overlay');
    });
  });

  describe('activate', function () {
    it('emits an `activate` event', function () {
      var eventSpy = sinon.spy();
      var activator = new Activator(this.container);
      activator.on('activate', eventSpy);
      activator.activate();
      assert.equal(activator.active, true);
      assert(eventSpy.called, 'Event did not fire.');
      assert(eventSpy.calledOnce, 'Event fired more than once');
    });

    it('emits a `change` event', function () {
      var eventSpy = sinon.spy();
      var activator = new Activator(this.container);
      activator.on('change', eventSpy);
      activator.activate();
      assert.equal(activator.active, true);
      assert(eventSpy.called, 'Event did not fire.');
      assert(eventSpy.calledOnce, 'Event fired more than once');
    });
  });

  describe('deactivate', function () {
    it('emits a `deactivate` event', function () {
      var eventSpy = sinon.spy();
      var activator = new Activator(this.container);
      activator.on('deactivate', eventSpy);
      activator.deactivate();
      assert.equal(activator.active, false);
      assert(eventSpy.called, 'Event did not fire.');
      assert(eventSpy.calledOnce, 'Event fired more than once');
    });

    it('emits a `change` event', function () {
      var eventSpy = sinon.spy();
      var activator = new Activator(this.container);
      activator.on('change', eventSpy);
      activator.deactivate();
      assert.equal(activator.active, false);
      assert(eventSpy.called, 'Event did not fire.');
      assert(eventSpy.calledOnce, 'Event fired more than once');
    });
  });

  describe('destroy', function () {

    it('sets inactive, removes keycharm, and removes hammer', function () {
      var activator = new Activator(this.container);
      activator.destroy();
      assert.equal(activator.active, false);
      assert.equal(activator.keycharm, null);
      assert.equal(activator.hammer, null);
    });
  });
});
