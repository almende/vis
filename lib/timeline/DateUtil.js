/**
 * Created by Alex on 10/3/2014.
 */
var moment = require('../module/moment');


exports.convertHiddenOptions = function(timeline) {
  var hiddenTimes = timeline.options.hide;
  if (Array.isArray(hiddenTimes) == true) {
    for (var i = 0; i < hiddenTimes.length; i++) {
      var dateItem = {};
      dateItem.start = moment(hiddenTimes[i].start).toDate().valueOf();
      dateItem.end = moment(hiddenTimes[i].end).toDate().valueOf();
      timeline.body.hiddenDates.push(dateItem);
    }
    timeline.body.hiddenDates.sort(function(a,b) {return a.start - b.start;}); // sort by start time
  }
  else {
    timeline.body.hiddenDates = [{
        start:moment(hiddenTimes.start).toDate().valueOf(),
        end:moment(hiddenTimes.end).toDate().valueOf()
      }
    ];
  }
}

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
    timeStep.current = moment(endDate).toDate();
  }
}

exports.toScreen = function(timeline, time, width) {
  var hidden = exports.isHidden(time, timeline.body.hiddenDates)
  if (hidden.hidden == true) {
    time = hidden.startDate;
  }

  var res = exports.correctTimeForDuration(timeline.body.hiddenDates, timeline.range, time);
  var duration = res.duration;
  time = res.time;

  var conversion = timeline.range.conversion(width, duration);
  return (time.valueOf() - conversion.offset) * conversion.scale;
}

exports.toTime = function(body, range, x, width) {
  var duration = exports.getHiddenDuration(body.hiddenDates, range);

  var conversion = range.conversion(width, duration);
  var time = new Date(x / conversion.scale + conversion.offset);

  //var hidden = exports.isHidden(time, timeline.body.hiddenDates)
  //if (hidden.hidden == true) {
  //  time = hidden.startDate;
  //}
  //time = exports.correctTimeForDuration(body.hiddenDates, range, time).time;
  return time;
}


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
}


exports.correctTimeForDuration = function(hiddenTimes, range, time) {
  var duration = 0;
  var timeOffset = 0;
  time = moment(time).toDate().valueOf()

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
}





exports.snapAwayFromHidden = function(hiddenTimes, range, start, end, delta, zoom) {
  zoom = zoom || false;
  var newStart = start;
  var newEnd = end;
  for (var i = 0; i < hiddenTimes.length; i++) {
    var startDate = hiddenTimes[i].start;
    var endDate = hiddenTimes[i].end;
    if (start >= startDate && start < endDate) { // if the start is entering a hidden zone
      range.deltaDifference += delta;
      if (range.previousDelta - delta > 0 && zoom == false || zoom == true && range.previousDelta - delta < 0) { // from the left
        console.log("start from left, snap to right")
        newStart = endDate + 1;
      }
      else { // from the right
        console.log("start from right, snap to left")
        newStart = startDate - 1;
      }
      return {newStart: newStart, newEnd: newEnd};
    }
    else if (end >= startDate && end < endDate) { // if the start is entering a hidden zone
      range.deltaDifference += delta;
      if (range.previousDelta - delta < 0) { //  from the right
        console.log("end from right, snap to left")
        newEnd = startDate - 1;

      }
      else { // from the left
        console.log("end from left, snap to right")
        newEnd = endDate + 1;
      }
      return {newStart: newStart, newEnd: newEnd};
    }
  }
  return false;
}

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