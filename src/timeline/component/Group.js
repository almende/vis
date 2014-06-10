/**
 * @constructor Group
 * @param {Number | String} groupId
 * @param {Object} data
 * @param {ItemSet} itemSet
 */
function Group (groupId, data, itemSet) {
  this.groupId = groupId;

  this.itemSet = itemSet;

  this.dom = {};
  this.props = {
    label: {
      width: 0,
      height: 0
    }
  };

  this.items = {};        // items filtered by groupId of this group
  this.visibleItems = []; // items currently visible in window
  this.orderedItems = {   // items sorted by start and by end
    byStart: [],
    byEnd: []
  };

  this._create();

  this.setData(data);
}

/**
 * Create DOM elements for the group
 * @private
 */
Group.prototype._create = function() {
  var label = document.createElement('div');
  label.className = 'vlabel';
  this.dom.label = label;

  var inner = document.createElement('div');
  inner.className = 'inner';
  label.appendChild(inner);
  this.dom.inner = inner;

  var foreground = document.createElement('div');
  foreground.className = 'group';
  foreground['timeline-group'] = this;
  this.dom.foreground = foreground;

  this.dom.background = document.createElement('div');

  this.dom.axis = document.createElement('div');

  // create a hidden marker to detect when the Timelines container is attached
  // to the DOM, or the style of a parent of the Timeline is changed from
  // display:none is changed to visible.
  this.dom.marker = document.createElement('div');
  this.dom.marker.style.visibility = 'hidden';
  this.dom.marker.innerHTML = '?';
  this.dom.background.appendChild(this.dom.marker);
};

/**
 * Set the group data for this group
 * @param {Object} data   Group data, can contain properties content and className
 */
Group.prototype.setData = function setData(data) {
  // update contents
  var content = data && data.content;
  if (content instanceof Element) {
    this.dom.inner.appendChild(content);
  }
  else if (content != undefined) {
    this.dom.inner.innerHTML = content;
  }
  else {
    this.dom.inner.innerHTML = this.groupId;
  }

  if (!this.dom.inner.firstChild) {
    util.addClassName(this.dom.inner, 'hidden');
  }
  else {
    util.removeClassName(this.dom.inner, 'hidden');
  }

  // update className
  var className = data && data.className;
  if (className) {
    util.addClassName(this.dom.label, className);
  }
};

/**
 * Get the width of the group label
 * @return {number} width
 */
Group.prototype.getLabelWidth = function getLabelWidth() {
  return this.props.label.width;
};


/**
 * Repaint this group
 * @param {{start: number, end: number}} range
 * @param {{item: number, axis: number}} margin
 * @param {boolean} [restack=false]  Force restacking of all items
 * @return {boolean} Returns true if the group is resized
 */
Group.prototype.redraw = function redraw(range, margin, restack) {
  var resized = false;

  this.visibleItems = this._updateVisibleItems(this.orderedItems, this.visibleItems, range);

  // force recalculation of the height of the items when the marker height changed
  // (due to the Timeline being attached to the DOM or changed from display:none to visible)
  var markerHeight = this.dom.marker.clientHeight;
  if (markerHeight != this.lastMarkerHeight) {
    this.lastMarkerHeight = markerHeight;

    util.forEach(this.items, function (item) {
      item.dirty = true;
      if (item.displayed) item.redraw();
    });

    restack = true;
  }

  // reposition visible items vertically
  if (this.itemSet.options.stack) { // TODO: ugly way to access options...
    stack.stack(this.visibleItems, margin, restack);
  }
  else { // no stacking
    stack.nostack(this.visibleItems, margin);
  }

  // recalculate the height of the group
  var height;
  var visibleItems = this.visibleItems;
  if (visibleItems.length) {
    var min = visibleItems[0].top;
    var max = visibleItems[0].top + visibleItems[0].height;
    util.forEach(visibleItems, function (item) {
      min = Math.min(min, item.top);
      max = Math.max(max, (item.top + item.height));
    });
    height = (max - min) + margin.axis + margin.item;
  }
  else {
    height = margin.axis + margin.item;
  }
  height = Math.max(height, this.props.label.height);

  // calculate actual size and position
  var foreground = this.dom.foreground;
  this.top = foreground.offsetTop;
  this.left = foreground.offsetLeft;
  this.width = foreground.offsetWidth;
  resized = util.updateProperty(this, 'height', height) || resized;

  // recalculate size of label
  resized = util.updateProperty(this.props.label, 'width', this.dom.inner.clientWidth) || resized;
  resized = util.updateProperty(this.props.label, 'height', this.dom.inner.clientHeight) || resized;

  // apply new height
  foreground.style.height  = height + 'px';
  this.dom.label.style.height = height + 'px';

  // update vertical position of items after they are re-stacked and the height of the group is calculated
  for (var i = 0, ii = this.visibleItems.length; i < ii; i++) {
    var item = this.visibleItems[i];
    item.repositionY();
  }

  return resized;
};

/**
 * Show this group: attach to the DOM
 */
Group.prototype.show = function show() {
  if (!this.dom.label.parentNode) {
    this.itemSet.dom.labelSet.appendChild(this.dom.label);
  }

  if (!this.dom.foreground.parentNode) {
    this.itemSet.dom.foreground.appendChild(this.dom.foreground);
  }

  if (!this.dom.background.parentNode) {
    this.itemSet.dom.background.appendChild(this.dom.background);
  }

  if (!this.dom.axis.parentNode) {
    this.itemSet.dom.axis.appendChild(this.dom.axis);
  }
};

/**
 * Hide this group: remove from the DOM
 */
Group.prototype.hide = function hide() {
  var label = this.dom.label;
  if (label.parentNode) {
    label.parentNode.removeChild(label);
  }

  var foreground = this.dom.foreground;
  if (foreground.parentNode) {
    foreground.parentNode.removeChild(foreground);
  }

  var background = this.dom.background;
  if (background.parentNode) {
    background.parentNode.removeChild(background);
  }

  var axis = this.dom.axis;
  if (axis.parentNode) {
    axis.parentNode.removeChild(axis);
  }
};

/**
 * Add an item to the group
 * @param {Item} item
 */
Group.prototype.add = function add(item) {
  this.items[item.id] = item;
  item.setParent(this);

  if (item instanceof ItemRange && this.visibleItems.indexOf(item) == -1) {
    var range = this.itemSet.timeline.range; // TODO: not nice accessing the range like this
    this._checkIfVisible(item, this.visibleItems, range);
  }
};

/**
 * Remove an item from the group
 * @param {Item} item
 */
Group.prototype.remove = function remove(item) {
  delete this.items[item.id];
  item.setParent(this.itemSet);

  // remove from visible items
  var index = this.visibleItems.indexOf(item);
  if (index != -1) this.visibleItems.splice(index, 1);

  // TODO: also remove from ordered items?
};

/**
 * Remove an item from the corresponding DataSet
 * @param {Item} item
 */
Group.prototype.removeFromDataSet = function removeFromDataSet(item) {
  this.itemSet.removeItem(item.id);
};

/**
 * Reorder the items
 */
Group.prototype.order = function order() {
  var array = util.toArray(this.items);
  this.orderedItems.byStart = array;
  this.orderedItems.byEnd = this._constructByEndArray(array);

  stack.orderByStart(this.orderedItems.byStart);
  stack.orderByEnd(this.orderedItems.byEnd);
};

/**
 * Create an array containing all items being a range (having an end date)
 * @param {Item[]} array
 * @returns {ItemRange[]}
 * @private
 */
Group.prototype._constructByEndArray = function _constructByEndArray(array) {
  var endArray = [];

  for (var i = 0; i < array.length; i++) {
    if (array[i] instanceof ItemRange) {
      endArray.push(array[i]);
    }
  }
  return endArray;
};

/**
 * Update the visible items
 * @param {{byStart: Item[], byEnd: Item[]}} orderedItems   All items ordered by start date and by end date
 * @param {Item[]} visibleItems                             The previously visible items.
 * @param {{start: number, end: number}} range              Visible range
 * @return {Item[]} visibleItems                            The new visible items.
 * @private
 */
Group.prototype._updateVisibleItems = function _updateVisibleItems(orderedItems, visibleItems, range) {
  var initialPosByStart,
      newVisibleItems = [],
      i;

  // first check if the items that were in view previously are still in view.
  // this handles the case for the ItemRange that is both before and after the current one.
  if (visibleItems.length > 0) {
    for (i = 0; i < visibleItems.length; i++) {
      this._checkIfVisible(visibleItems[i], newVisibleItems, range);
    }
  }

  // If there were no visible items previously, use binarySearch to find a visible ItemPoint or ItemRange (based on startTime)
  if (newVisibleItems.length == 0) {
    initialPosByStart = this._binarySearch(orderedItems, range, false);
  }
  else {
    initialPosByStart = orderedItems.byStart.indexOf(newVisibleItems[0]);
  }

  // use visible search to find a visible ItemRange (only based on endTime)
  var initialPosByEnd = this._binarySearch(orderedItems, range, true);

  // if we found a initial ID to use, trace it up and down until we meet an invisible item.
  if (initialPosByStart != -1) {
    for (i = initialPosByStart; i >= 0; i--) {
      if (this._checkIfInvisible(orderedItems.byStart[i], newVisibleItems, range)) {break;}
    }
    for (i = initialPosByStart + 1; i < orderedItems.byStart.length; i++) {
      if (this._checkIfInvisible(orderedItems.byStart[i], newVisibleItems, range)) {break;}
    }
  }

  // if we found a initial ID to use, trace it up and down until we meet an invisible item.
  if (initialPosByEnd != -1) {
    for (i = initialPosByEnd; i >= 0; i--) {
      if (this._checkIfInvisible(orderedItems.byEnd[i], newVisibleItems, range)) {break;}
    }
    for (i = initialPosByEnd + 1; i < orderedItems.byEnd.length; i++) {
      if (this._checkIfInvisible(orderedItems.byEnd[i], newVisibleItems, range)) {break;}
    }
  }

  return newVisibleItems;
};

/**
 * This function does a binary search for a visible item. The user can select either the this.orderedItems.byStart or .byEnd
 * arrays. This is done by giving a boolean value true if you want to use the byEnd.
 * This is done to be able to select the correct if statement (we do not want to check if an item is visible, we want to check
 * if the time we selected (start or end) is within the current range).
 *
 * The trick is that every interval has to either enter the screen at the initial load or by dragging. The case of the ItemRange that is
 * before and after the current range is handled by simply checking if it was in view before and if it is again. For all the rest,
 * either the start OR end time has to be in the range.
 *
 * @param {{byStart: Item[], byEnd: Item[]}} orderedItems
 * @param {{start: number, end: number}} range
 * @param {Boolean} byEnd
 * @returns {number}
 * @private
 */
Group.prototype._binarySearch = function _binarySearch(orderedItems, range, byEnd) {
  var array = [];
  var byTime = byEnd ? 'end' : 'start';
  if (byEnd == true) {array = orderedItems.byEnd;  }
  else               {array = orderedItems.byStart;}

  var interval = range.end - range.start;

  var found = false;
  var low = 0;
  var high = array.length;
  var guess = Math.floor(0.5*(high+low));
  var newGuess;

  if (high == 0) {guess = -1;}
  else if (high == 1) {
    if ((array[guess].data[byTime] > range.start - interval) && (array[guess].data[byTime] < range.end)) {
      guess =  0;
    }
    else {
      guess = -1;
    }
  }
  else {
    high -= 1;
    while (found == false) {
      if ((array[guess].data[byTime] > range.start - interval) && (array[guess].data[byTime] < range.end)) {
        found = true;
      }
      else {
        if (array[guess].data[byTime] < range.start - interval) { // it is too small --> increase low
          low = Math.floor(0.5*(high+low));
        }
        else {  // it is too big --> decrease high
          high = Math.floor(0.5*(high+low));
        }
        newGuess = Math.floor(0.5*(high+low));
        // not in list;
        if (guess == newGuess) {
          guess = -1;
          found = true;
        }
        else {
          guess = newGuess;
        }
      }
    }
  }
  return guess;
};

/**
 * this function checks if an item is invisible. If it is NOT we make it visible
 * and add it to the global visible items. If it is, return true.
 *
 * @param {Item} item
 * @param {Item[]} visibleItems
 * @param {{start:number, end:number}} range
 * @returns {boolean}
 * @private
 */
Group.prototype._checkIfInvisible = function _checkIfInvisible(item, visibleItems, range) {
  if (item.isVisible(range)) {
    if (!item.displayed) item.show();
    item.repositionX();
    if (visibleItems.indexOf(item) == -1) {
      visibleItems.push(item);
    }
    return false;
  }
  else {
    return true;
  }
};

/**
 * this function is very similar to the _checkIfInvisible() but it does not
 * return booleans, hides the item if it should not be seen and always adds to
 * the visibleItems.
 * this one is for brute forcing and hiding.
 *
 * @param {Item} item
 * @param {Array} visibleItems
 * @param {{start:number, end:number}} range
 * @private
 */
Group.prototype._checkIfVisible = function _checkIfVisible(item, visibleItems, range) {
  if (item.isVisible(range)) {
    if (!item.displayed) item.show();
    // reposition item horizontally
    item.repositionX();
    visibleItems.push(item);
  }
  else {
    if (item.displayed) item.hide();
  }
};
