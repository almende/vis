var assert = require('assert');
var jsdom_global = require('jsdom-global');

var canvasMockify = require('./canvas-mock');
var Configurator = require('../lib/shared/Configurator').default;
var Network = require('../lib/network/Network');
var {allOptions, configureOptions} = require('../lib/network/options.js');

describe('Configurator', function () {
  beforeEach(function() {
    this.jsdom_global = canvasMockify("<div id='mynetwork'></div><div id='other'></div>");
    this.container = document.getElementById('mynetwork');
  });

  afterEach(function() {
    this.jsdom_global();
    this.container.remove();
    this.container = undefined;
  });

  describe('constructor', function () {

    it('sets extends options with default options', function () {
      var config = new Configurator();
      assert.deepEqual(config.options, config.defaultOptions);
    });
  });

  describe('setOptions', function () {

    it('with undefined will not modify defaults', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions();
      assert.deepEqual(config.options, config.defaultOptions);
    });

    it('with undefined will set enabled to false', function () {
      var config = new Configurator(Network, this.container);
      config.options.enabled = false;
      config.setOptions();
      assert.equal(config.options.enabled, false);
    });

    it('with string sets filter and set enabled to true', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions('stringFilter!');
      assert.equal(config.options.filter, 'stringFilter!');
      assert.equal(config.options.enabled, true);
    });

    it('with array sets filter and set enabled to true', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions(['array', 'Filter', '!']);
      assert.equal(config.options.filter, 'array,Filter,!');
      assert.equal(config.options.enabled, true);
    });

    it('with object sets filter', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions(
        {container: 'newContainer',
          filter: 'newFilter',
          showButton: 'newShowButton',
          enabled: false
        });
      assert.equal(config.options.container, 'newContainer');
      assert.equal(config.options.filter, 'newFilter');
      assert.equal(config.options.showButton, 'newShowButton');
      assert.equal(config.options.enabled, false);
    });

    it('with object and filter is false enabled will be false', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions({filter: false});
      assert.equal(config.options.enabled, false);
    });

    it('with boolean true sets filter', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions(true);
      assert.equal(config.options.enabled, true);
    });

    it('with boolean false sets filter', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions(false);
      assert.equal(config.options.enabled, false);
    });

    it('with function sets filter', function () {
      var config = new Configurator(Network, this.container);
      config.setOptions(function () {});
      assert.equal(config.options.enabled, true);
    });

    it('with null raises exception', function () {
      var config = new Configurator(Network, this.container);
      assert.throws(function () {config.setOptions(null)}, TypeError, null);
    });

  });

  describe('setModuleOptions', function () {

    it('creates no new dom elements if enabled is false', function () {
      var config = new Configurator(Network, this.container);
      config.setModuleOptions();
      assert.equal(this.container.children.length, 0);
    });

    it('adds div with vis-configuration-wrapper class when enabled', function () {
      var config = new Configurator(Network, this.container);
      config.options.enabled = true;
      config.setModuleOptions();
      assert.equal(this.container.children.length, 1);
      assert.equal(this.container.children[0].className, 'vis-configuration-wrapper');
    });

    it('overwrites config.container with config.options.container', function () {
      var config = new Configurator(Network, this.container);
      config.options.enabled = true;
      config.options.container = document.getElementById('other');
      config.setModuleOptions();
      assert.equal(config.container, config.options.container);
      assert.equal(config.container.children[0].className, 'vis-configuration-wrapper');
    });
  });

  // TODO: This test needs work
  describe('getOptions', function () {

    xit('creates no new dom elements if enabled is false', function () {
      var config = new Configurator(Network, this.container, configureOptions);
      var options = config.getOptions();
    });
  });
});
