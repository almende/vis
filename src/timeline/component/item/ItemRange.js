/**
 * @constructor ItemRange
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemRange (parent, data, options, defaultOptions) {
  this.props = {
    content: {
      width: 0
    }
  };

  // validate data
  if (data) {
    if (data.start == undefined) {
      throw new Error('Property "start" missing in item ' + data.id);
    }
    if (data.end == undefined) {
      throw new Error('Property "end" missing in item ' + data.id);
    }
  }

  Item.call(this, parent, data, options, defaultOptions);
}

ItemRange.prototype = new Item (null, null);

/**
 * Check whether this item is visible in the current time window
 * @returns {boolean} True if visible
 */
ItemRange.prototype.isVisible = function isVisible () {
  // determine visibility
  var data = this.data;
  var range = this.parent && this.parent.range;

  if (data && range) {
    return (data.start < range.end) && (data.end > range.start);
  }
  else {
    return false;
  }
}

/**
 * Repaint the item
 */
ItemRange.prototype.repaint = function repaint() {
  var dom,
      update = util.updateProperty,
      props= this.props;

  // create DOM
  dom = this.dom;
  if (!dom) {
    this.dom = {};
    dom = this.dom;

      // background box
    dom.box = document.createElement('div');
    // className is updated in repaint()

    // contents box
    dom.content = document.createElement('div');
    dom.content.className = 'content';
    dom.box.appendChild(dom.content);

    // attach this item as attribute
    dom.box['timeline-item'] = this;
  }

  // append DOM to parent DOM
  if (!this.parent) {
    throw new Error('Cannot repaint item: no parent attached');
  }
  if (!dom.box.parentNode) {
    var foreground = this.parent.getForeground();
    if (!foreground) {
      throw new Error('Cannot repaint time axis: parent has no foreground container element');
    }
    foreground.appendChild(dom.box);
  }
  this.displayed = true;

  // update contents
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
      throw new Error('Property "content" missing in item ' + this.data.id);
    }
  }

  // update class
  var className = (this.data.className ? (' ' + this.data.className) : '') +
      (this.selected ? ' selected' : '');
  if (this.className != className) {
    this.className = className;
    dom.box.className = 'item range' + className;
  }

  // recalculate size
  if (this.dirty) {
    update(props.content, 'width', this.dom.content.offsetWidth);
    update(this, 'height', this.dom.box.offsetHeight);

    this.dirty = false;
  }

  this._repaintDeleteButton(dom.box);
  this._repaintDragLeft();
  this._repaintDragRight();
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 */
ItemRange.prototype.show = function show() {
  if (!this.displayed) {
    this.repaint();
  }
};

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
ItemRange.prototype.hide = function hide() {
  if (this.displayed) {
    var box = this.dom.box;

    if (box.parentNode) {
      box.parentNode.removeChild(box);
    }

    this.displayed = false;
  }
};

/**
 * Reflow the item: calculate its actual size from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
// TODO: remove function
ItemRange.prototype.reflow = function reflow() {
  return false;

  var changed = 0,
      dom,
      props,
      options,
      margin,
      padding,
      parent,
      start,
      end,
      data,
      range,
      update,
      box,
      parentWidth,
      contentLeft,
      orientation,
      top;

  if (this.visible) {
    dom = this.dom;
    if (dom) {
      props = this.props;
      options = this.options;
      parent = this.parent;
      start = parent.toScreen(this.data.start) + this.offset;
      end = parent.toScreen(this.data.end) + this.offset;
      update = util.updateProperty;
      box = dom.box;
      parentWidth = parent.width;
      orientation = options.orientation || this.defaultOptions.orientation;
      margin = options.margin && options.margin.axis || this.defaultOptions.margin.axis;
      padding = options.padding || this.defaultOptions.padding;

      changed += update(props.content, 'width', dom.content.offsetWidth);

      changed += update(this, 'height', box.offsetHeight);

      // limit the width of the this, as browsers cannot draw very wide divs
      if (start < -parentWidth) {
        start = -parentWidth;
      }
      if (end > 2 * parentWidth) {
        end = 2 * parentWidth;
      }

      // when range exceeds left of the window, position the contents at the left of the visible area
      if (start < 0) {
        contentLeft = Math.min(-start,
            (end - start - props.content.width - 2 * padding));
        // TODO: remove the need for options.padding. it's terrible.
      }
      else {
        contentLeft = 0;
      }
      changed += update(props.content, 'left', contentLeft);

      if (orientation == 'top') {
        top = margin;
        changed += update(this, 'top', top);
      }
      else {
        // default or 'bottom'
        top = parent.height - this.height - margin;
        changed += update(this, 'top', top);
      }

      changed += update(this, 'left', start);
      changed += update(this, 'width', Math.max(end - start, 1)); // TODO: reckon with border width;
    }
    else {
      changed += 1;
    }
  }

  return (changed > 0);
};

/**
 * Create an items DOM
 * @private
 */
ItemRange.prototype._create = function _create() {
  var dom = this.dom;
  if (!dom) {
    this.dom = dom = {};
    // background box
    dom.box = document.createElement('div');
    // className is updated in repaint()

    // contents box
    dom.content = document.createElement('div');
    dom.content.className = 'content';
    dom.box.appendChild(dom.content);

    // attach this item as attribute
    dom.box['timeline-item'] = this;
  }
};

/**
 * Reposition the item horizontally
 * @Override
 */
ItemRange.prototype.repositionX = function repositionX() {
  var props = this.props,
      parentWidth = this.parent.width,
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
  if (start < 0) {
    contentLeft = Math.min(-start,
        (end - start - props.content.width - 2 * padding));
    // TODO: remove the need for options.padding. it's terrible.
  }
  else {
    contentLeft = 0;
  }

  this.left = start;
  this.width = Math.max(end - start, 1);

  this.dom.box.style.left = this.left + 'px';
  this.dom.box.style.width = this.width + 'px';
  this.dom.content.style.left = contentLeft + 'px';
};

/**
 * Reposition the item vertically
 * @Override
 */
ItemRange.prototype.repositionY = function repositionY() {
  this.dom.box.style.top = this.top + 'px';
};

/**
 * Repaint a drag area on the left side of the range when the range is selected
 * @private
 */
ItemRange.prototype._repaintDragLeft = function () {
  if (this.selected && this.options.editable && !this.dom.dragLeft) {
    // create and show drag area
    var dragLeft = document.createElement('div');
    dragLeft.className = 'drag-left';
    dragLeft.dragLeftItem = this;

    // TODO: this should be redundant?
    Hammer(dragLeft, {
      preventDefault: true
    }).on('drag', function () {
          //console.log('drag left')
        });

    this.dom.box.appendChild(dragLeft);
    this.dom.dragLeft = dragLeft;
  }
  else if (!this.selected && this.dom.dragLeft) {
    // delete drag area
    if (this.dom.dragLeft.parentNode) {
      this.dom.dragLeft.parentNode.removeChild(this.dom.dragLeft);
    }
    this.dom.dragLeft = null;
  }
};

/**
 * Repaint a drag area on the right side of the range when the range is selected
 * @private
 */
ItemRange.prototype._repaintDragRight = function () {
  if (this.selected && this.options.editable && !this.dom.dragRight) {
    // create and show drag area
    var dragRight = document.createElement('div');
    dragRight.className = 'drag-right';
    dragRight.dragRightItem = this;

    // TODO: this should be redundant?
    Hammer(dragRight, {
      preventDefault: true
    }).on('drag', function () {
      //console.log('drag right')
    });

    this.dom.box.appendChild(dragRight);
    this.dom.dragRight = dragRight;
  }
  else if (!this.selected && this.dom.dragRight) {
    // delete drag area
    if (this.dom.dragRight.parentNode) {
      this.dom.dragRight.parentNode.removeChild(this.dom.dragRight);
    }
    this.dom.dragRight = null;
  }
};
