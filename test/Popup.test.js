var assert = require('assert');
var jsdom_global = require('jsdom-global');

var canvasMockify = require('./canvas-mock');
var Popup = require('../lib/shared/Popup').default;


describe('Popup', function () {
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

    it('defaults overflowMethod to "cap"', function () {
      var popup = new Popup(this.container);
      assert.equal(popup.overflowMethod, 'cap');
    });

    it('defaults hidden to false', function () {
      var popup = new Popup(this.container);
      assert.equal(popup.hidden, false);
    });
  });

  describe('setPosition', function () {

    it('handles ints', function () {
      var popup = new Popup(this.container);
      popup.setPosition(1, 2);
      assert.equal(popup.x, 1);
      assert.equal(popup.y, 2);
    });

    it('handles strings', function () {
      var popup = new Popup(this.container);
      popup.setPosition('1', '2');
      assert.equal(popup.x, 1);
      assert.equal(popup.y, 2);
    });

    it('handles null with NaN', function () {
      var popup = new Popup(this.container);
      popup.setPosition(null, null);
      assert(isNaN(popup.x));
      assert(isNaN(popup.y));
    });

    it('handles undefined with NaN', function () {
      var popup = new Popup(this.container);
      popup.setPosition(undefined, undefined);
      assert(isNaN(popup.x));
      assert(isNaN(popup.y));
    });
  });

  describe('setText', function () {

    it('using Element replaces innerHTML', function () {
      var popup = new Popup(this.container);
      popup.frame.innerHTML = '<div>This will get cleared!</div>';
      popup.setText(document.createElement('div'));
      assert.equal(popup.frame.innerHTML, '<div></div>');
    });

    it('using string replaces innerHTML', function () {
      var popup = new Popup(this.container);
      popup.frame.innerHTML = '<div>This will get cleared!</div>';
      popup.setText('your text here!');
      assert.equal(popup.frame.innerHTML, 'your text here!');
    });
  });

  describe('show', function () {

    it('set to undefined will show', function () {
      var popup = new Popup(this.container);
      popup.show(undefined);
      assert.equal(popup.hidden, false);
      assert.notEqual(popup.frame.style.left, "0px");
      assert.notEqual(popup.frame.style.top, "0px");
      assert.equal(popup.frame.style.visibility, "visible");
    });

    it('set to true will show', function () {
      var popup = new Popup(this.container);
      popup.show(true);
      assert.equal(popup.hidden, false);
      assert.notEqual(popup.frame.style.left, "0px");
      assert.notEqual(popup.frame.style.top, "0px");
      assert.equal(popup.frame.style.visibility, "visible");
    });

    it('set to true with overflowMethod "flip" will show', function () {
      var popup = new Popup(this.container, 'flip');
      popup.show(true);
      assert.equal(popup.hidden, false);
      assert.equal(popup.frame.style.left, "0px");
      assert.equal(popup.frame.style.top, "0px");
      assert.equal(popup.frame.style.visibility, "visible");
    });

    it('set to false will hide', function () {
      var popup = new Popup(this.container);
      popup.show(false);
      assert.equal(popup.hidden, true);
      assert.equal(popup.frame.style.left, "0px");
      assert.equal(popup.frame.style.top, "0px");
      assert.equal(popup.frame.style.visibility, "hidden");
    });
  });

  describe('hide', function () {

    it('sets hidden to true, frame style to 0,0 and visibility to hidden', function () {
      var popup = new Popup(this.container);
      popup.hide();
      assert.equal(popup.hidden, true);
      assert.equal(popup.frame.style.left, "0px");
      assert.equal(popup.frame.style.top, "0px");
      assert.equal(popup.frame.style.visibility, "hidden");
    });
  });

  describe('destroy', function () {

    it('removes frame from container', function () {
      assert.equal(this.container.children.length, 0);
      var popup = new Popup(this.container);
      assert.equal(this.container.children.length, 1);
      popup.destroy();
      assert.equal(this.container.children.length, 0);
    });
  });
});
