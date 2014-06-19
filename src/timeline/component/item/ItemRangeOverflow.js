/**
 * @constructor ItemRangeOverflow
 * @extends ItemRange
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} [options]        Configuration options
 *                                  // TODO: describe options
 */
function ItemRangeOverflow (data, conversion, options) {
  this.props = {
    content: {
      left: 0,
      width: 0
    }
  };

  ItemRange.call(this, data, conversion, options);
}

ItemRangeOverflow.prototype = new ItemRange (null, null, null);

ItemRangeOverflow.prototype.baseClassName = 'item rangeoverflow';

/**
 * Reposition the item horizontally
 * @Override
 */
ItemRangeOverflow.prototype.repositionX = function() {
  var parentWidth = this.parent.width,
      start = this.conversion.toScreen(this.data.start),
      end = this.conversion.toScreen(this.data.end),
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
  this.width = boxWidth + this.props.content.width;
  // Note: The calculation of width is an optimistic calculation, giving
  //       a width which will not change when moving the Timeline
  //       So no restacking needed, which is nicer for the eye

  this.dom.box.style.left = this.left + 'px';
  this.dom.box.style.width = boxWidth + 'px';
  this.dom.content.style.left = contentLeft + 'px';
};
