// Utility functions for ordering and stacking of items
var EPSILON = 0.001; // used when checking collisions, to prevent round-off errors

/**
 * Order items by their start data
 * @param {Item[]} items
 */
exports.orderByStart = function(items) {
  items.sort(function (a, b) {
    return a.data.start - b.data.start;
  });
};

/**
 * Order items by their end date. If they have no end date, their start date
 * is used.
 * @param {Item[]} items
 */
exports.orderByEnd = function(items) {
  items.sort(function (a, b) {
    var aTime = ('end' in a.data) ? a.data.end : a.data.start,
        bTime = ('end' in b.data) ? b.data.end : b.data.start;

    return aTime - bTime;
  });
};

/**
 * Adjust vertical positions of the items such that they don't overlap each
 * other.
 * @param {Item[]} items
 *            All visible items
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 *            Margins between items and between items and the axis.
 * @param {boolean} [force=false]
 *            If true, all items will be repositioned. If false (default), only
 *            items having a top===null will be re-stacked
 */
exports.stack = function(items, margin, force) {
  var i, iMax;

  if (force) {
    // reset top position of all items
    for (i = 0, iMax = items.length; i < iMax; i++) {
      items[i].top = null;
    }
  }

  // calculate new, non-overlapping positions
  for (i = 0, iMax = items.length; i < iMax; i++) {
    var item = items[i];
    if (item.stack && item.top === null) {
      // initialize top position
      item.top = margin.axis;

      do {
        // TODO: optimize checking for overlap. when there is a gap without items,
        //       you only need to check for items from the next item on, not from zero
        var collidingItem = null;
        for (var j = 0, jj = items.length; j < jj; j++) {
          var other = items[j];
          if (other.top !== null && other !== item && other.stack && exports.collision(item, other, margin.item)) {
            collidingItem = other;
            break;
          }
        }

        if (collidingItem != null) {
          // There is a collision. Reposition the items above the colliding element
          item.top = collidingItem.top + collidingItem.height + margin.item.vertical;
        }
      } while (collidingItem);
    }
  }
};


/**
 * Adjust vertical positions of the items without stacking them
 * @param {Item[]} items
 *            All visible items
 * @param {{item: {horizontal: number, vertical: number}, axis: number}} margin
 *            Margins between items and between items and the axis.
 */
exports.nostack = function(items, margin, subgroups) {
  var i, iMax, newTop;

  // reset top position of all items
  for (i = 0, iMax = items.length; i < iMax; i++) {
    if (items[i].data.subgroup !== undefined) {
      newTop = margin.axis;
      for (var subgroup in subgroups) {
        if (subgroups.hasOwnProperty(subgroup)) {
          if (subgroups[subgroup].visible == true && subgroups[subgroup].index < subgroups[items[i].data.subgroup].index) {
            newTop += subgroups[subgroup].height + margin.item.vertical;
          }
        }
      }
      items[i].top = newTop;
    }
    else {
      items[i].top = margin.axis;
    }
  }
};

/**
 * Test if the two provided items collide
 * The items must have parameters left, width, top, and height.
 * @param {Item} a          The first item
 * @param {Item} b          The second item
 * @param {{horizontal: number, vertical: number}} margin
 *                          An object containing a horizontal and vertical
 *                          minimum required margin.
 * @return {boolean}        true if a and b collide, else false
 */
exports.collision = function(a, b, margin) {
  return ((a.left - margin.horizontal + EPSILON)       < (b.left + b.width) &&
      (a.left + a.width + margin.horizontal - EPSILON) > b.left &&
      (a.top - margin.vertical + EPSILON)              < (b.top + b.height) &&
      (a.top + a.height + margin.vertical - EPSILON)   > b.top);
};
