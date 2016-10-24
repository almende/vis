////////////////////////////////////////////////////////////////////////////////
// class Range
//
// Helper class to make working with related min and max values easier.
//
////////////////////////////////////////////////////////////////////////////////


function Range() {
  this.min = undefined;
  this.max = undefined;
}


Range.prototype.add = function(value) {
  if (value === undefined) return;

  if (this.min === undefined || this.min > value ) {
    this.min = value;
  }

  if (this.max === undefined || this.max < value) {
    this.max = value;
  }
};


/**
 * Adjust the current range so that the passed range fits in it.
 */
Range.prototype.combine = function(range) {
   this.add(range.min);
   this.add(range.max);
};


/**
 * Replace the current min and max values with the
 * passed values.
 */
Range.prototype.override = function(min, max) {
  if (min !== undefined) {
    this.min = min;
  }

  if (max !== undefined) {
    this.max = max;
  }

  if (this.max <= this.min) this.max = this.min + 1;
};


/**
 * Expand the range by the given value
 *
 * min will be lowered by given amount,
 * max will be raised by given amount
 *
 * Shrinking by passing a negative value is allowed.
 */
Range.prototype.expand = function(val) {
  if (val === undefined) {
    return;
  }

  this.min -= val;
  this.max += val;

  if (this.max <= this.min) this.max = this.min + 1;
};


Range.prototype.range = function() {
  return this.max - this.min;
};


Range.prototype.center = function() {
 return (this.min + this.max) / 2;
};


module.exports = Range;
