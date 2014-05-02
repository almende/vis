/**
 * @constructor ItemRangeOverflow
 * @extends ItemRange
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemRangeOverflow (data, options, defaultOptions) {
  this.props = {
    content: {
      left: 0,
      width: 0
    }
  };

  ItemRange.call(this, data, options, defaultOptions);
}

ItemRangeOverflow.prototype = new ItemRange (null);

ItemRangeOverflow.prototype.baseClassName = 'item rangeoverflow';

/**
 * Reposition the item horizontally
 * @Override
 */
ItemRangeOverflow.prototype.repositionX = function repositionX() {
  var parentWidth = this.parent.width,
      start = this.defaultOptions.toScreen(this.data.start),
      end = this.defaultOptions.toScreen(this.data.end),
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
  this.width = (this.props.content.width < boxWidth) ?
      boxWidth :
      start + contentLeft + this.props.content.width;

  this.dom.box.style.left = this.left + 'px';
  this.dom.box.style.width = boxWidth + 'px';
  this.dom.content.style.left = contentLeft + 'px';
};
