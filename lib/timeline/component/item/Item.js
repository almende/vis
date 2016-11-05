var Hammer = require('../../../module/hammer');
var util = require('../../../util');
var moment = require('../../../module/moment');


/**
 * @constructor Item
 * @param {Object} data             Object containing (optional) parameters type,
 *                                  start, end, content, group, className.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} options          Configuration options
 *                                  // TODO: describe available options
 */
function Item (data, conversion, options) {
  this.id = null;
  this.parent = null;
  this.data = data;
  this.dom = null;
  this.conversion = conversion || {};
  this.options = options || {};  
  this.selected = false;
  this.displayed = false;
  this.dirty = true;

  this.top = null;
  this.right = null;
  this.left = null;
  this.width = null;
  this.height = null;

  this.editable = null;
  if (this.data && 
      this.data.hasOwnProperty('editable') && 
      typeof this.data.editable === 'boolean') {
    this.editable = data.editable;
  }
}

Item.prototype.stack = true;

/**
 * Select current item
 */
Item.prototype.select = function() {
  this.selected = true;
  this.dirty = true;
  if (this.displayed) this.redraw();
};

/**
 * Unselect current item
 */
Item.prototype.unselect = function() {
  this.selected = false;
  this.dirty = true;
  if (this.displayed) this.redraw();
};

/**
 * Set data for the item. Existing data will be updated. The id should not
 * be changed. When the item is displayed, it will be redrawn immediately.
 * @param {Object} data
 */
Item.prototype.setData = function(data) {
  var groupChanged = data.group != undefined && this.data.group != data.group;
  if (groupChanged) {
    this.parent.itemSet._moveToGroup(this, data.group);
  }

  if (data.hasOwnProperty('editable') && typeof data.editable === 'boolean') {
    this.editable = data.editable;
  }

  this.data = data;
  this.dirty = true;
  if (this.displayed) this.redraw();
};

/**
 * Set a parent for the item
 * @param {ItemSet | Group} parent
 */
Item.prototype.setParent = function(parent) {
  if (this.displayed) {
    this.hide();
    this.parent = parent;
    if (this.parent) {
      this.show();
    }
  }
  else {
    this.parent = parent;
  }
};

/**
 * Check whether this item is visible inside given range
 * @returns {{start: Number, end: Number}} range with a timestamp for start and end
 * @returns {boolean} True if visible
 */
Item.prototype.isVisible = function(range) {
  return false;
};

/**
 * Show the Item in the DOM (when not already visible)
 * @return {Boolean} changed
 */
Item.prototype.show = function() {
  return false;
};

/**
 * Hide the Item from the DOM (when visible)
 * @return {Boolean} changed
 */
Item.prototype.hide = function() {
  return false;
};

/**
 * Repaint the item
 */
Item.prototype.redraw = function() {
  // should be implemented by the item
};

/**
 * Reposition the Item horizontally
 */
Item.prototype.repositionX = function() {
  // should be implemented by the item
};

/**
 * Reposition the Item vertically
 */
Item.prototype.repositionY = function() {
  // should be implemented by the item
};

/**
 * Repaint a delete button on the top right of the item when the item is selected
 * @param {HTMLElement} anchor
 * @protected
 */
Item.prototype._repaintDeleteButton = function (anchor) {
  var editable = (this.options.editable.remove || 
                  this.data.editable === true) &&
                 this.data.editable !== false;

  if (this.selected && editable && !this.dom.deleteButton) {
    // create and show button
    var me = this;

    var deleteButton = document.createElement('div');

    if (this.options.rtl) {
      deleteButton.className = 'vis-delete-rtl';
    } else {
      deleteButton.className = 'vis-delete';
    }
    deleteButton.title = 'Delete this item';

    // TODO: be able to destroy the delete button
    new Hammer(deleteButton).on('tap', function (event) {
      event.stopPropagation();
      me.parent.removeFromDataSet(me);
    });

    anchor.appendChild(deleteButton);
    this.dom.deleteButton = deleteButton;
  }
  else if (!this.selected && this.dom.deleteButton) {
    // remove button
    if (this.dom.deleteButton.parentNode) {
      this.dom.deleteButton.parentNode.removeChild(this.dom.deleteButton);
    }
    this.dom.deleteButton = null;
  }
};

/**
 * Repaint a onChange tooltip on the top right of the item when the item is selected
 * @param {HTMLElement} anchor
 * @protected
 */
Item.prototype._repaintOnItemUpdateTimeTooltip = function (anchor) {
  if (!this.options.tooltipOnItemUpdateTime) return;

  var editable = (this.options.editable.updateTime || 
                  this.data.editable === true) &&
                 this.data.editable !== false;

  if (this.selected && editable && !this.dom.onItemUpdateTimeTooltip) {
    // create and show tooltip
    var me = this;

    var onItemUpdateTimeTooltip = document.createElement('div');

    onItemUpdateTimeTooltip.className = 'vis-onUpdateTime-tooltip';
    anchor.appendChild(onItemUpdateTimeTooltip);
    this.dom.onItemUpdateTimeTooltip = onItemUpdateTimeTooltip;

  } else if (!this.selected && this.dom.onItemUpdateTimeTooltip) {
    // remove button
    if (this.dom.onItemUpdateTimeTooltip.parentNode) {
      this.dom.onItemUpdateTimeTooltip.parentNode.removeChild(this.dom.onItemUpdateTimeTooltip);
    }
    this.dom.onItemUpdateTimeTooltip = null;
  }

  // position onChange tooltip
  if (this.dom.onItemUpdateTimeTooltip) {

    // only show when editing
    this.dom.onItemUpdateTimeTooltip.style.visibility = this.parent.itemSet.touchParams.itemIsDragging ? 'visible' : 'hidden';
    
    // position relative to item's content
    if (this.options.rtl) {
      this.dom.onItemUpdateTimeTooltip.style.right = this.dom.content.style.right;
    } else {
      this.dom.onItemUpdateTimeTooltip.style.left = this.dom.content.style.left;
    }

    // position above or below the item depending on the item's position in the window
    var tooltipOffset = 50; // TODO: should be tooltip height (depends on template)
    var scrollTop = this.parent.itemSet.body.domProps.scrollTop;

      // TODO: this.top for orientation:true is actually the items distance from the bottom... 
      // (should be this.bottom)
    var itemDistanceFromTop 
    if (this.options.orientation.item == 'top') {
      itemDistanceFromTop = this.top;
    } else {
      itemDistanceFromTop = (this.parent.height - this.top - this.height)
    }
    var isCloseToTop = itemDistanceFromTop + this.parent.top - tooltipOffset < -scrollTop;

    if (isCloseToTop) {
      this.dom.onItemUpdateTimeTooltip.style.bottom = "";
      this.dom.onItemUpdateTimeTooltip.style.top = this.height + 2 + "px";
    } else {
      this.dom.onItemUpdateTimeTooltip.style.top = "";
      this.dom.onItemUpdateTimeTooltip.style.bottom = this.height + 2 + "px";
    }
    
    // handle tooltip content
    var content;
    var templateFunction;

    if (this.options.tooltipOnItemUpdateTime && this.options.tooltipOnItemUpdateTime.template) {
      templateFunction = this.options.tooltipOnItemUpdateTime.template.bind(this);
      content = templateFunction(this.data);
    } else {
      content = 'start: ' + moment(this.data.start).format('MM/DD/YYYY hh:mm');
      if (this.data.end) { 
        content += '<br> end: ' + moment(this.data.end).format('MM/DD/YYYY hh:mm');
      }
    }
    this.dom.onItemUpdateTimeTooltip.innerHTML = content;
  }
};


/**
 * Set HTML contents for the item
 * @param {Element} element   HTML element to fill with the contents
 * @private
 */
Item.prototype._updateContents = function (element) {
  var content;
  var templateFunction;

  if (this.options.template) {
    var itemData = this.parent.itemSet.itemsData.get(this.id); // get a clone of the data from the dataset
    templateFunction = this.options.template.bind(this);
    content = templateFunction(itemData, element);
  } else {
    content = this.data.content;
  }

  if ((content instanceof Object) && !(content instanceof Element)) {
    templateFunction(itemData, element)
  } else {
    var changed = this._contentToString(this.content) !== this._contentToString(content);
    if (changed) {
      // only replace the content when changed
      if (content instanceof Element) {
        element.innerHTML = '';
        element.appendChild(content);
      }
      else if (content != undefined) {
        element.innerHTML = content;
      }
      else {
        if (!(this.data.type == 'background' && this.data.content === undefined)) {
          throw new Error('Property "content" missing in item ' + this.id);
        }
      }

      this.content = content;
    }
  }
};

/**
 * Set HTML contents for the item
 * @param {Element} element   HTML element to fill with the contents
 * @private
 */
Item.prototype._updateTitle = function (element) {
  if (this.data.title != null) {
    element.title = this.data.title || '';
  }
  else {
    element.removeAttribute('vis-title');
  }
};

/**
 * Process dataAttributes timeline option and set as data- attributes on dom.content
 * @param {Element} element   HTML element to which the attributes will be attached
 * @private
 */
 Item.prototype._updateDataAttributes = function(element) {
  if (this.options.dataAttributes && this.options.dataAttributes.length > 0) {
    var attributes = [];

    if (Array.isArray(this.options.dataAttributes)) {
      attributes = this.options.dataAttributes;
    }
    else if (this.options.dataAttributes == 'all') {
      attributes = Object.keys(this.data);
    }
    else {
      return;
    }

    for (var i = 0; i < attributes.length; i++) {
      var name = attributes[i];
      var value = this.data[name];

      if (value != null) {
        element.setAttribute('data-' + name, value);
      }
      else {
        element.removeAttribute('data-' + name);
      }
    }
  }
};

/**
 * Update custom styles of the element
 * @param element
 * @private
 */
Item.prototype._updateStyle = function(element) {
  // remove old styles
  if (this.style) {
    util.removeCssText(element, this.style);
    this.style = null;
  }

  // append new styles
  if (this.data.style) {
    util.addCssText(element, this.data.style);
    this.style = this.data.style;
  }
};


/**
 * Stringify the items contents
 * @param {string | Element | undefined} content
 * @returns {string | undefined}
 * @private
 */
Item.prototype._contentToString = function (content) {
  if (typeof content === 'string') return content;
  if (content && 'outerHTML' in content) return content.outerHTML;
  return content;
};

/**
 * Return the width of the item left from its start date
 * @return {number}
 */
Item.prototype.getWidthLeft = function () {
  return 0;
};

/**
 * Return the width of the item right from the max of its start and end date
 * @return {number}
 */
Item.prototype.getWidthRight = function () {
  return 0;
};

/**
 * Repaint a drag area on the center of the item when the item is selected
 * @protected
 */
Item.prototype._repaintDragCenter = function () {
  if (this.selected && this.options.editable.updateTime && !this.dom.dragCenter) {
    // create and show drag area
    var dragCenter = document.createElement('div');
    dragCenter.className = 'vis-drag-center';
    dragCenter.dragCenterItem = this;

    if (this.dom.box) {
      this.dom.box.appendChild(dragCenter);
    } 
    else if (this.dom.point) {
      this.dom.point.appendChild(dragCenter);
    }
    
    this.dom.dragCenter = dragCenter;
  }
  else if (!this.selected && this.dom.dragCenter) {
    // delete drag area
    if (this.dom.dragCenter.parentNode) {
      this.dom.dragCenter.parentNode.removeChild(this.dom.dragCenter);
    }
    this.dom.dragCenter = null;
  }
};

module.exports = Item;
