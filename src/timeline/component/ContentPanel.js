/**
 * A content panel can contain a groupset or an itemset, and can handle
 * vertical scrolling
 * @param {Component} [parent]
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]    Available parameters:
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | function} [className]
 * @constructor ContentPanel
 * @extends Panel
 */
function ContentPanel(parent, depends, options) {
  this.id = util.randomUUID();
  this.parent = parent;
  this.depends = depends;

  this.options = options || {};
}

ContentPanel.prototype = new Component();

/**
 * Set options. Will extend the current options.
 * @param {Object} [options]    Available parameters:
 *                              {String | function} [className]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 */
ContentPanel.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
ContentPanel.prototype.getContainer = function () {
  return this.frame;
};

/**
 * Repaint the component
 */
ContentPanel.prototype.repaint = function () {
  var asSize = util.option.asSize,
      options = this.options,
      frame = this.frame;

  // create frame
  if (!frame) {
    frame = document.createElement('div');
    this.frame = frame;

    if (!this.parent) throw new Error('Cannot repaint panel: no parent attached');
    var parentContainer = this.parent.getContainer();
    if (!parentContainer) throw new Error('Cannot repaint panel: parent has no container element');
    parentContainer.appendChild(frame);
  }

  // update className
  frame.className = 'content-panel' + (options.className ? (' ' + asSize(options.className)) : '');

  // update frame size
  this._updateSize();
};
