// TODO: turn Stack into a Mixin?

/**
 * @constructor Stack
 * Stacks items on top of each other.
 * @param {ItemSet} itemset
 * @param {Object} [options]
 */
function Stack (itemset, options) {
  this.itemset = itemset;

  this.options = options || {};
  this.defaultOptions = {
    order: function (a, b) {
      // Order: ranges over non-ranges, ranged ordered by width,
      //        and non-ranges ordered by start.
      if (a instanceof ItemRange) {
        if (b instanceof ItemRange) {
          var aInt = (a.data.end - a.data.start);
          var bInt = (b.data.end - b.data.start);
          return (aInt - bInt) || (a.data.start - b.data.start);
        }
        else {
          return -1;
        }
      }
      else {
        if (b instanceof ItemRange) {
          return 1;
        }
        else {
          if (!a.data) {
            throw new Error('hu')
          }
          return (a.data.start - b.data.start);
        }
      }
    },
    margin: {
      item: 10
    }
  };

  this.ordered = [];  // ordered items
}

/**
 * Set options for the stack
 * @param {Object} options  Available options:
 *                          {ItemSet} itemset
 *                          {Number} margin
 *                          {function} order  Stacking order
 */
Stack.prototype.setOptions = function setOptions (options) {
  util.extend(this.options, options);

  // TODO: register on data changes at the connected itemset, and update the changed part only and immediately
};

/**
 * Stack the items such that they don't overlap. The items will have a minimal
 * distance equal to options.margin.item.
 */
Stack.prototype.update = function update() {
  this._order();
  this._stack(this.ordered);
};

/**
 * Order the items. If a custom order function has been provided via the options,
 * then this will be used.
 * @private
 */
Stack.prototype._order = function _order () {
  var items = this.itemset.items;
  if (!items) {
    throw new Error('Cannot stack items: ItemSet does not contain items');
  }

  // TODO: use sorted items instead of ordering every time

  this.ordered = this.order(items);
};

/**
 * Order a map with items
 * @param {Object<String, Item>} items
 * @return {Item[]} sorted items
 */
Stack.prototype.order = function order(items) {
  var ordered = [];

  // convert map to array
  for (var id in items) {
    if (items.hasOwnProperty(id)) ordered.push(items[id]);
  }

  //order the items
  var order = this.options.order || this.defaultOptions.order;
  if (!(typeof order === 'function')) {
    throw new Error('Option order must be a function');
  }
  ordered.sort(order);

  return ordered;
};

/**
 * Adjust vertical positions of the events such that they don't overlap each
 * other.
 * @param {Item[]} items
 * @private
 */
Stack.prototype._stack = function _stack (items) {
  var i,
      iMax,
      options = this.options,
      orientation = options.orientation || this.defaultOptions.orientation,
      axisOnTop = (orientation == 'top'),
      margin,
      parentHeight = this.itemset.height; // TODO: should use the height of the itemsets parent

  if (options.margin && options.margin.item !== undefined) {
    margin = options.margin.item;
  }
  else {
    margin = this.defaultOptions.margin.item
  }

  // initialize top position
  for (i = 0, iMax = items.length; i < iMax; i++) {
    var item = items[i];

    //*
    if (orientation == 'top') {
      item.top = margin;
    }
    else {
      // default or 'bottom'
      item.top = parentHeight - item.height - 2 * margin;
    }
  }

    // calculate new, non-overlapping positions
  for (i = 0, iMax = items.length; i < iMax; i++) {
    var item = items[i];
    var collidingItem = null;

    /* TODO: cleanup
    // initialize top position
    if (orientation == 'top') {
      item.top = margin;
    }
    else {
      // default or 'bottom'
      item.top = parentHeight - item.height - 2 * margin;
    }
    //*/

    do {
      // TODO: optimize checking for overlap. when there is a gap without items,
      //  you only need to check for items from the next item on, not from zero
      collidingItem = this._checkOverlap (items, i, 0, i - 1, margin);
      if (collidingItem != null) {
        // There is a collision. Reposition the event above the colliding element
        if (axisOnTop) {
          item.top = collidingItem.top + collidingItem.height + margin;
        }
        else {
          item.top = collidingItem.top - item.height - margin;
        }
      }
    } while (collidingItem);
  }
};

/**
 * Adjust vertical positions of the events such that they don't overlap each
 * other.
 * @param {Item[]} items           All visible items
 * @private
 */
Stack.prototype.stack = function stack (items) {
  var i,
      iMax,
      options = this.options,
      orientation = options.orientation || this.defaultOptions.orientation,
      axisOnTop = (orientation == 'top'),
      margin,
      parentHeight = this.itemset.height;

  if (options.margin && options.margin.item !== undefined) {
    margin = options.margin.item;
  }
  else {
    margin = this.defaultOptions.margin.item
  }

  // calculate new, non-overlapping positions
  for (i = 0, iMax = items.length; i < iMax; i++) {
    var item = items[i];
    if (item.top === null) {
      // initialize top position
      if (axisOnTop) {
        item.top = margin;
      }
      else {
        // default or 'bottom'
        item.top = parentHeight - item.height - 2 * margin;
      }

      var collidingItem;
      do {
        // TODO: optimize checking for overlap. when there is a gap without items,
        //       you only need to check for items from the next item on, not from zero
        collidingItem = this.checkOverlap (item, items, margin);
        if (collidingItem != null) {
          // There is a collision. Reposition the event above the colliding element
          if (axisOnTop) {
            item.top = collidingItem.top + collidingItem.height + margin;
          }
          else {
            item.top = collidingItem.top - item.height - margin;
          }
        }
      } while (collidingItem);
    }
  }
};

/**
 * Check if the destiny position of given item overlaps with any
 * of the other items from index itemStart to itemEnd.
 * @param {Item} item       item to be checked
 * @param {Item[]} items    Array with items
 * @return {Object | null}  colliding item, or undefined when no collisions
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 */
Stack.prototype.checkOverlap = function checkOverlap (item, items, margin) {
  for (var i = 0, ii = items.length; i < ii; i++) {
    var b = items[i];
    if (b.top !== null && b !== item && this.collision(item, b, margin)) {
      return b;
    }
  }

  return null;
};

/**
 * Check if the destiny position of given item overlaps with any
 * of the other items from index itemStart to itemEnd.
 * @param {Array} items     Array with items
 * @param {int}  itemIndex  Number of the item to be checked for overlap
 * @param {int}  itemStart  First item to be checked.
 * @param {int}  itemEnd    Last item to be checked.
 * @return {Object | null}  colliding item, or undefined when no collisions
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 */
Stack.prototype._checkOverlap = function _checkOverlap (items, itemIndex,
                                                        itemStart, itemEnd, margin) {
  var collision = this.collision;

  // we loop from end to start, as we suppose that the chance of a
  // collision is larger for items at the end, so check these first.
  var a = items[itemIndex];
  for (var i = itemEnd; i >= itemStart; i--) {
    var b = items[i];
    if (collision(a, b, margin)) {
      if (i != itemIndex) {
        return b;
      }
    }
  }

  return null;
};

/**
 * Test if the two provided items collide
 * The items must have parameters left, width, top, and height.
 * @param {Component} a     The first item
 * @param {Component} b     The second item
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 * @return {boolean}        true if a and b collide, else false
 */
Stack.prototype.collision = function collision (a, b, margin) {
  return ((a.left - margin) < (b.left + b.width) &&
      (a.left + a.width + margin) > b.left &&
      (a.top - margin) < (b.top + b.height) &&
      (a.top + a.height + margin) > b.top);
};
