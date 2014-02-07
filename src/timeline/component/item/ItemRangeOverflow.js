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

  // define a private property _width, which is the with of the range box
  // adhering to the ranges start and end date. The property width has a
  // getter which returns the max of border width and content width
  this._width = 0;
  Object.defineProperty(this, 'width', {
    get: function () {
      return (this.props.content && this._width < this.props.content.width) ?
          this.props.content.width :
          this._width;
    },

    set: function (width) {
      this._width = width;
    }
  });

  ItemRange.call(this, parent, data, options, defaultOptions);
}

ItemRangeOverflow.prototype = new ItemRange (null, null);

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemRangeOverflow.prototype.repaint = function repaint() {
  // TODO: make an efficient repaint
  var changed = false;
  var dom = this.dom;

  if (!dom) {
    this._create();
    dom = this.dom;
    changed = true;
  }

  if (dom) {
    if (!this.parent) {
      throw new Error('Cannot repaint item: no parent attached');
    }
    var foreground = this.parent.getForeground();
    if (!foreground) {
      throw new Error('Cannot repaint time axis: ' +
          'parent has no foreground container element');
    }

    if (!dom.box.parentNode) {
      foreground.appendChild(dom.box);
      changed = true;
    }

    // update content
    if (this.data.content != this.content) {
      this.content = this.data.content;
      if (this.content instanceof Element) {
        dom.content.innerHTML = '';
        dom.content.appendChild(this.content);
      }
      else if (this.data.content != undefined) {
        dom.content.innerHTML = this.content;
      }
      else {
        throw new Error('Property "content" missing in item ' + this.id);
      }
      changed = true;
    }

    this._repaintDeleteButton(dom.box);

    // update class
    var className = (this.data.className? ' ' + this.data.className : '') +
        (this.selected ? ' selected' : '');
    if (this.className != className) {
      this.className = className;
      dom.box.className = 'item rangeoverflow' + className;
      changed = true;
    }
  }

  return changed;
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemRangeOverflow.prototype.reposition = function reposition() {
  var dom = this.dom,
      props = this.props;

  if (dom) {
    dom.box.style.top = this.top + 'px';
    dom.box.style.left = this.left + 'px';
    dom.box.style.width = this._width + 'px';

    dom.content.style.left = props.content.left + 'px';
  }
};
