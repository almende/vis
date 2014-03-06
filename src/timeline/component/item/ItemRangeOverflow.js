/**
 * @constructor ItemRangeOverflow
 * @extends ItemRange
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemRangeOverflow (parent, data, options, defaultOptions) {
  this.props = {
    content: {
      left: 0,
      width: 0
    }
  };

  ItemRange.call(this, parent, data, options, defaultOptions);
}

ItemRangeOverflow.prototype = new ItemRange (null, null);

ItemRangeOverflow.prototype.baseClassName = 'item rangeoverflow';

/**
 * Reposition the item horizontally
 * @Override
 */
ItemRangeOverflow.prototype.repositionX = function repositionX() {
  var parentWidth = this.parent.width,
      start = this.parent.toScreen(this.data.start) + this.offset,
      end = this.parent.toScreen(this.data.end) + this.offset,
      padding = 'padding' in this.options ? this.options.padding : this.defaultOptions.padding,
      contentLeft;

  // limit the width of the this, as browsers cannot draw very wide divs
  if (start < -parentWidth) {
    start = -parentWidth;
  }
  if (end > 2 * parentWidth) {
    end = 2 * parentWidth;
  }

  // when range exceeds left of the window, position the contents at the left of the visible area
  contentLeft = Math.max(-start, 0);

  this.left = start;
  var boxWidth = Math.max(end - start, 1);
  this.width = (this.props.content && boxWidth < this.props.content.width) ?
      this.props.content.width :
      boxWidth;

  this.dom.box.style.left = this.left + 'px';
  this.dom.box.style.width = boxWidth + 'px';
  this.dom.content.style.left = contentLeft + 'px';
};
