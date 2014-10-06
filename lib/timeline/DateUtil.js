/**
 * Created by Alex on 10/3/2014.
 */
var moment = require('../module/moment');


/**
 * used in Core to convert the options into a volatile variable
 * 
 * @param Core
 */
exports.convertHiddenOptions = function(body, hiddenDates) {
  var specificHiddenDates = hiddenDates.specific;
  if (specificHiddenDates) {
    if (Array.isArray(specificHiddenDates) == true) {
      for (var i = 0; i < specificHiddenDates.length; i++) {
        var dateItem = {};
        dateItem.start = moment(specificHiddenDates[i].start).toDate().valueOf();
        dateItem.end = moment(specificHiddenDates[i].end).toDate().valueOf();
        body.hiddenDates.push(dateItem);
      }
      body.hiddenDates.sort(function (a, b) {
        return a.start - b.start;
      }); // sort by start time
    }
    else {
      body.hiddenDates = [{
        start: moment(specificHiddenDates.start).toDate().valueOf(),
        end: moment(specificHiddenDates.end).toDate().valueOf()
      }
      ];
    }
  }

  var periodicHiddenDates = hiddenDates.periodic;
  if (periodicHiddenDates) {
    if (periodicHiddenDates.times) {
      if (Array.isArray(periodicHiddenDates.times) != true) {
        periodicHiddenDates.times = [periodicHiddenDates.times];
      }
    }
    if (periodicHiddenDates.days) {
      if (Array.isArray(periodicHiddenDates.days) != true) {
        periodicHiddenDates.days = [periodicHiddenDates.days];
      }
    }
  }
};

exports.updateHiddenDates = function (body, hiddenDates) {
  if (hiddenDates && hiddenDates.periodic) {
    body.hiddenDates = [];
    exports.convertHiddenOptions(body, hiddenDates);

    var start = moment(body.range.start);
    var end = moment(body.range.end);

    if (hiddenDates.periodic.days) {
      var nextStartDay = moment(body.range.start);
      var nextEndDay = moment(body.range.start);
      for (var i = 0; i < hiddenDates.periodic.days.length; i++) {
        var startDay = hiddenDates.periodic.days[i].start;
        var endDay = hiddenDates.periodic.days[i].end;

        nextStartDay.isoWeekday(startDay);
        nextEndDay.isoWeekday(endDay);
        if (start < nextStartDay) {
          nextStartDay.isoWeekday(startDay - 7);
        }
        if (start < nextEndDay) {
          nextEndDay.isoWeekday(endDay - 7);
        }
        nextStartDay.milliseconds(0);
        nextStartDay.seconds(0);
        nextStartDay.minutes(0);
        nextStartDay.hours(0);

        nextEndDay.milliseconds(0);
        nextEndDay.seconds(0);
        nextEndDay.minutes(0);
        nextEndDay.hours(0);

        while (nextStartDay < end) {
          body.hiddenDates.push({start: nextStartDay.valueOf(), end: nextEndDay.valueOf()});
          nextStartDay.isoWeekday(startDay + 7);
          nextEndDay.isoWeekday(endDay + 7);
        }
        body.hiddenDates.push({start: nextStartDay.valueOf(), end: nextEndDay.valueOf()});
      }
    }

    if (hiddenDates.periodic.times) {
      var nextStartDay = moment(body.range.start);
      var nextEndDay = moment(body.range.start);
      end = end.valueOf();

      for (var i = 0; i < hiddenDates.periodic.times.length; i++) {
        var startTime = hiddenDates.periodic.times[i].start.split(":");
        var endTime = hiddenDates.periodic.times[i].end.split(":");

        nextStartDay.milliseconds(0);
        nextStartDay.seconds(startTime[2]);
        nextStartDay.minutes(startTime[1]);
        nextStartDay.hours(startTime[0]);

        nextEndDay.milliseconds(0);
        nextEndDay.seconds(endTime[2]);
        nextEndDay.minutes(endTime[1]);
        nextEndDay.hours(endTime[0]);

        nextStartDay = nextStartDay.valueOf();
        nextEndDay = nextEndDay.valueOf();

        if (endTime[0] < startTime[0]) {
          nextEndDay += 3600000*24;
        }

        nextStartDay -= 7*3600000*24;
        nextEndDay -= 7*3600000*24;
        while (nextStartDay < (end + 7*3600000*24)) {
          body.hiddenDates.push({start: nextStartDay.valueOf(), end: nextEndDay.valueOf()});
          nextStartDay += 3600000*24;
          nextEndDay += 3600000*24;
        }
      }
    }
    exports.removeDuplicates(body);
    var startHidden = exports.isHidden(body.range.start, body.hiddenDates);
    var endHidden = exports.isHidden(body.range.end,body.hiddenDates);
    var rangeStart = body.range.start;
    var rangeEnd = body.range.end;
    if (startHidden.hidden == true) {rangeStart = startHidden.endDate;}
    if (endHidden.hidden == true)   {rangeEnd   = endHidden.startDate;}
    if (startHidden.hidden == true || endHidden.hidden == true) {
      body.range._applyRange(rangeStart, rangeEnd);
    }
  }
}

exports.removeDuplicates = function(body) {
  var hiddenDates = body.hiddenDates;
  var safeDates = [];
  for (var i = 0; i < hiddenDates.length; i++) {
    for (var j = 0; j < hiddenDates.length; j++) {
      if (i != j && hiddenDates[j].remove != true && hiddenDates[i].remove != true) {
        // j inside i
        if (hiddenDates[j].start >= hiddenDates[i].start && hiddenDates[j].end <= hiddenDates[i].end) {
          hiddenDates[j].remove = true;
        }
        // j start inside i
        else if (hiddenDates[j].start >= hiddenDates[i].start && hiddenDates[j].start <= hiddenDates[i].end) {
          hiddenDates[i].end = hiddenDates[j].end;
          hiddenDates[j].remove = true;
        }
        // j end inside i
        else if (hiddenDates[j].end >= hiddenDates[i].start && hiddenDates[j].end <= hiddenDates[i].end) {
          hiddenDates[i].start = hiddenDates[j].start;
          hiddenDates[j].remove = true;
        }
      }
    }
  }

  for (var i = 0; i < hiddenDates.length; i++) {
    if (hiddenDates[i].remove !== true) {
      safeDates.push(hiddenDates[i]);
    }
  }

  body.hiddenDates = safeDates;
  body.hiddenDates.sort(function (a, b) {
    return a.start - b.start;
  }); // sort by start time
}

exports.printDates = function(dates) {
  for (var i =0; i < dates.length; i++) {
    console.log(i, new Date(dates[i].start),new Date(dates[i].end), dates[i].start, dates[i].end, dates[i].remove);
  }
}

/**
 * Used in TimeStep to avoid the hidden times.
 * @param timeStep
 * @param previousTime
 */
exports.stepOverHiddenDates = function(timeStep, previousTime) {
  var stepInHidden = false;
  var currentValue = timeStep.current.valueOf();
  for (var i = 0; i < timeStep.hiddenDates.length; i++) {
    var startDate = timeStep.hiddenDates[i].start;
    var endDate = timeStep.hiddenDates[i].end;
    if (currentValue >= startDate && currentValue < endDate) {
      stepInHidden = true;
      break;
    }
  }

  if (stepInHidden == true && currentValue < timeStep._end.valueOf() && currentValue != previousTime) {
    var prevValue = moment(previousTime);
    var newValue = moment(endDate);
    if (prevValue.dayOfYear() != newValue.dayOfYear()) {
      timeStep.switchedDay = true;
    }
    timeStep.current = newValue.toDate();
  }
};


/**
 * Used in TimeStep to avoid the hidden times.
 * @param timeStep
 * @param previousTime
 */
exports.checkFirstStep = function(timeStep) {
  var stepInHidden = false;
  var currentValue = timeStep.current.valueOf();
  for (var i = 0; i < timeStep.hiddenDates.length; i++) {
    var startDate = timeStep.hiddenDates[i].start;
    var endDate = timeStep.hiddenDates[i].end;
    if (currentValue >= startDate && currentValue < endDate) {
      stepInHidden = true;
      break;
    }
  }

  if (stepInHidden == true && currentValue <= timeStep._end.valueOf()) {
    var newValue = moment(endDate);
    timeStep.current = newValue.toDate();
  }
};

/**
 * replaces the Core toScreen methods
 * @param Core
 * @param time
 * @param width
 * @returns {number}
 */
exports.toScreen = function(Core, time, width) {
  var hidden = exports.isHidden(time, Core.body.hiddenDates)
  if (hidden.hidden == true) {
    time = hidden.startDate;
  }

  var res = exports.correctTimeForDuration(Core.body.hiddenDates, Core.range, time);
  var duration = res.duration;
  time = res.time;

  var conversion = Core.range.conversion(width, duration);
  return (time.valueOf() - conversion.offset) * conversion.scale;
};


/**
 * Replaces the core toTime methods
 * @param body
 * @param range
 * @param x
 * @param width
 * @returns {Date}
 */
exports.toTime = function(body, range, x, width) {
  var duration = exports.getHiddenDuration(body.hiddenDates, range);
  var conversion = range.conversion(width, duration);

  return new Date(x / conversion.scale + conversion.offset);
};


/**
 * Support function
 *
 * @param hiddenTimes
 * @param range
 * @returns {number}
 */
exports.getHiddenDuration = function(hiddenTimes, range) {
  var duration = 0;
  for (var i = 0; i < hiddenTimes.length; i++) {
    var startDate = hiddenTimes[i].start;
    var endDate = hiddenTimes[i].end;
    // if time after the cutout, and the
    if (startDate >= range.start && endDate < range.end) {
      duration += endDate - startDate;
    }
  }
  return duration;
};


/**
 * Support function
 * @param hiddenTimes
 * @param range
 * @param time
 * @returns {{duration: number, time: *, offset: number}}
 */
exports.correctTimeForDuration = function(hiddenTimes, range, time) {
  var duration = 0;
  var timeOffset = 0;
  time = moment(time).toDate().valueOf();

  for (var i = 0; i < hiddenTimes.length; i++) {
    var startDate = hiddenTimes[i].start;
    var endDate = hiddenTimes[i].end;
    // if time after the cutout, and the
    if (startDate >= range.start && endDate < range.end) {
      duration += (endDate - startDate);
      if (time >= endDate) {
        timeOffset += (endDate - startDate);
      }
    }
  }
  time -= timeOffset;
  return {duration: duration, time:time, offset: timeOffset};
};


/**
 * Used with zooming and dragging, zoom inverts the left right for the start
 *
 * @param hiddenTimes
 * @param range
 * @param start
 * @param end
 * @param delta
 * @param zoom
 * @returns {*}
 */
exports.snapAwayFromHidden = function(hiddenTimes, range, start, end, delta, zoom) {
  zoom = zoom || false;
  var newStart = start;
  var newEnd = end;
  var newDates = false;
  for (var i = 0; i < hiddenTimes.length; i++) {
    var startDate = hiddenTimes[i].start;
    var endDate = hiddenTimes[i].end;
    if (start >= startDate && start < endDate) { // if the start is entering a hidden zone
      newDates = true;
      // start from left, snap to right
      if (range.previousDelta - delta > 0 && zoom == false || zoom == true && range.previousDelta - delta < 0) { // from the left
        newStart = endDate + 1;
      }
      else { // start from right, snap to left
        newStart = startDate - 1;
      }
    }
    if (end >= startDate && end < endDate) { // if the end is entering a hidden zone
      newDates = true;
      if (range.previousDelta - delta < 0) { //  end from right, snap to left
        newEnd = startDate - 1;
      }
      else { // end from left, snap to right
        newEnd = endDate + 1;
      }
    }
  }
  if (newDates == true) {
    range.deltaDifference += delta;
    return {newStart: newStart, newEnd: newEnd};
  }
  return false;
};


/**
 * Check if a time is hidden
 *
 * @param time
 * @param hiddenTimes
 * @returns {{hidden: boolean, startDate: Window.start, endDate: *}}
 */
exports.isHidden = function(time, hiddenTimes) {
  var isHidden = false;
  for (var i = 0; i < hiddenTimes.length; i++) {
    var startDate = hiddenTimes[i].start;
    var endDate = hiddenTimes[i].end;

    if (time >= startDate && time < endDate) { // if the start is entering a hidden zone
      isHidden = true;
      break;
    }
  }
  return {hidden: isHidden, startDate: startDate, endDate: endDate};
}