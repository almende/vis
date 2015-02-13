/**
 * @constructor  DataStep
 * The class DataStep is an iterator for data for the lineGraph. You provide a start data point and an
 * end data point. The class itself determines the best scale (step size) based on the
 * provided start Date, end Date, and minimumStep.
 *
 * If minimumStep is provided, the step size is chosen as close as possible
 * to the minimumStep but larger than minimumStep. If minimumStep is not
 * provided, the scale is set to 1 DAY.
 * The minimumStep should correspond with the onscreen size of about 6 characters
 *
 * Alternatively, you can set a scale by hand.
 * After creation, you can initialize the class by executing first(). Then you
 * can iterate from the start date to the end date via next(). You can check if
 * the end date is reached with the function hasNext(). After each step, you can
 * retrieve the current date via getCurrent().
 * The DataStep has scales ranging from milliseconds, seconds, minutes, hours,
 * days, to years.
 *
 * Version: 1.2
 *
 * @param {Date} [start]         The start date, for example new Date(2010, 9, 21)
 *                               or new Date(2010, 9, 21, 23, 45, 00)
 * @param {Date} [end]           The end date
 * @param {Number} [minimumStep] Optional. Minimum step size in milliseconds
 */
function DataStep(start, end, minimumStep, containerHeight, customRange, alignZeros) {
  // variables
  this.current = 0;

  this.autoScale = true;
  this.stepIndex = 0;
  this.step = 1;
  this.scale = 1;

  this.marginStart;
  this.marginEnd;
  this.deadSpace = 0;

  this.majorSteps = [1,     2,    5,  10];
  this.minorSteps = [0.25,  0.5,  1,  2];

  this.alignZeros = alignZeros;

  this.setRange(start, end, minimumStep, containerHeight, customRange);
}



/**
 * Set a new range
 * If minimumStep is provided, the step size is chosen as close as possible
 * to the minimumStep but larger than minimumStep. If minimumStep is not
 * provided, the scale is set to 1 DAY.
 * The minimumStep should correspond with the onscreen size of about 6 characters
 * @param {Number} [start]      The start date and time.
 * @param {Number} [end]        The end date and time.
 * @param {Number} [minimumStep] Optional. Minimum step size in milliseconds
 */
DataStep.prototype.setRange = function(start, end, minimumStep, containerHeight, customRange) {
  this._start = customRange.min === undefined ? start : customRange.min;
  this._end = customRange.max === undefined ? end : customRange.max;

  if (this._start == this._end) {
    this._start -= 0.75;
    this._end += 1;
  }

  if (this.autoScale == true) {
    this.setMinimumStep(minimumStep, containerHeight);
  }

  this.setFirst(customRange);
};

/**
 * Automatically determine the scale that bests fits the provided minimum step
 * @param {Number} [minimumStep]  The minimum step size in milliseconds
 */
DataStep.prototype.setMinimumStep = function(minimumStep, containerHeight) {
  // round to floor
  var size = this._end - this._start;
  var safeSize = size * 1.2;
  var minimumStepValue = minimumStep * (safeSize / containerHeight);
  var orderOfMagnitude = Math.round(Math.log(safeSize)/Math.LN10);

  var minorStepIdx = -1;
  var magnitudefactor = Math.pow(10,orderOfMagnitude);

  var start = 0;
  if (orderOfMagnitude < 0) {
    start = orderOfMagnitude;
  }

  var solutionFound = false;
  for (var i = start; Math.abs(i) <= Math.abs(orderOfMagnitude); i++) {
    magnitudefactor = Math.pow(10,i);
    for (var j = 0; j < this.minorSteps.length; j++) {
      var stepSize = magnitudefactor * this.minorSteps[j];
      if (stepSize >= minimumStepValue) {
        solutionFound = true;
        minorStepIdx = j;
        break;
      }
    }
    if (solutionFound == true) {
      break;
    }
  }
  this.stepIndex = minorStepIdx;
  this.scale = magnitudefactor;
  this.step = magnitudefactor * this.minorSteps[minorStepIdx];
};



/**
 * Round the current date to the first minor date value
 * This must be executed once when the current date is set to start Date
 */
DataStep.prototype.setFirst = function(customRange) {
  if (customRange === undefined) {
    customRange = {};
  }

  var niceStart = customRange.min === undefined ? this._start - (this.scale * 2 * this.minorSteps[this.stepIndex]) : customRange.min;
  var niceEnd = customRange.max === undefined ? this._end + (this.scale * this.minorSteps[this.stepIndex]) : customRange.max;

  this.marginEnd = customRange.max === undefined ? this.roundToMinor(niceEnd) : customRange.max;
  this.marginStart = customRange.min === undefined ? this.roundToMinor(niceStart) : customRange.min;

  // if we need to align the zero's we need to make sure that there is a zero to use.
  if (this.alignZeros == true && (this.marginEnd - this.marginStart) % this.step != 0) {
    this.marginEnd += this.marginEnd % this.step;
  }

  this.deadSpace = this.roundToMinor(niceEnd) - niceEnd + this.roundToMinor(niceStart) - niceStart;
  this.marginRange = this.marginEnd - this.marginStart;


  this.current = this.marginEnd;
};

DataStep.prototype.roundToMinor = function(value) {
  var rounded = value - (value % (this.scale * this.minorSteps[this.stepIndex]));
  if (value % (this.scale * this.minorSteps[this.stepIndex]) > 0.5 * (this.scale * this.minorSteps[this.stepIndex])) {
    return rounded + (this.scale * this.minorSteps[this.stepIndex]);
  }
  else {
    return rounded;
  }
}


/**
 * Check if the there is a next step
 * @return {boolean}  true if the current date has not passed the end date
 */
DataStep.prototype.hasNext = function () {
  return (this.current >= this.marginStart);
};

/**
 * Do the next step
 */
DataStep.prototype.next = function() {
  var prev = this.current;
  this.current -= this.step;

  // safety mechanism: if current time is still unchanged, move to the end
  if (this.current == prev) {
    this.current = this._end;
  }
};

/**
 * Do the next step
 */
DataStep.prototype.previous = function() {
  this.current += this.step;
  this.marginEnd += this.step;
  this.marginRange = this.marginEnd - this.marginStart;
};



/**
 * Get the current datetime
 * @return {String}  current The current date
 */
DataStep.prototype.getCurrent = function(decimals) {
  // prevent round-off errors when close to zero
  var current = (Math.abs(this.current) < this.step / 2) ? 0 : this.current;
  var toPrecision = '' + Number(current).toPrecision(5);

  // If decimals is specified, then limit or extend the string as required
  if(decimals !== undefined && !isNaN(Number(decimals))) {
    // If string includes exponent, then we need to add it to the end
    var exp = "";
    var index = toPrecision.indexOf("e");
    if(index != -1) {
      // Get the exponent
      exp = toPrecision.slice(index);
      // Remove the exponent in case we need to zero-extend
      toPrecision = toPrecision.slice(0, index);
    }
    index = Math.max(toPrecision.indexOf(","), toPrecision.indexOf("."));
    if(index === -1) {
      // No decimal found - if we want decimals, then we need to add it
      if(decimals !== 0) {
        toPrecision += '.';
      }
      // Calculate how long the string should be
      index = toPrecision.length + decimals;
    }
    else if(decimals !== 0) {
      // Calculate how long the string should be - accounting for the decimal place
      index += decimals + 1;
    }
    if(index > toPrecision.length) {
      // We need to add zeros!
      for(var cnt = index - toPrecision.length; cnt > 0; cnt--) {
        toPrecision += '0';
      }
    }
    else {
      // we need to remove characters
      toPrecision = toPrecision.slice(0, index);
    }
    // Add the exponent if there is one
    toPrecision += exp;
  }
  else {
    if (toPrecision.indexOf(",") != -1 || toPrecision.indexOf(".") != -1) {
      // If no decimal is specified, and there are decimal places, remove trailing zeros
      for (var i = toPrecision.length - 1; i > 0; i--) {
        if (toPrecision[i] == "0") {
          toPrecision = toPrecision.slice(0, i);
        }
        else if (toPrecision[i] == "." || toPrecision[i] == ",") {
          toPrecision = toPrecision.slice(0, i);
          break;
        }
        else {
          break;
        }
      }
    }
  }

  return toPrecision;
};

/**
 * Check if the current value is a major value (for example when the step
 * is DAY, a major value is each first day of the MONTH)
 * @return {boolean} true if current date is major, else false.
 */
DataStep.prototype.isMajor = function() {
  return (this.current % (this.scale * this.majorSteps[this.stepIndex]) == 0);
};

module.exports = DataStep;
