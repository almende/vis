'use strict';

function uuid() {
  return (Math.random()*1e15).toString(32) + "-" + (Math.random()*1e15).toString(32);
}

/**
 * This is a local assignment, this keeps track on how long an assignment takes THIS worker.
 *
 * @param id
 * @param type
 * @param timeStart
 * @constructor
 */
function Job(id, type, timeStart, agentId, prerequisites) {
  this.id = id;
  this.type = type;
  this.agentId = agentId;

  this.timeStart = timeStart;
  this.timeResumed = timeStart;
  this.timePaused = 0;
  this.elapsedTime = 0;
  this.elapsedTimeWithPause = 0;
  this.endOfDayPause = false;

  this.paused = false;
  this.finished = false;

  this.duration = new DurationData();
  this.prediction = new DurationStats();
  this.startupTime = new DurationData();
  this.predictedStartupTime = new DurationStats();

  this.prerequisites = prerequisites;
}

Job.prototype.prerequisiteFinished = function(params) {
  var uuid = params.uuid;
  for (var i = 0; i < this.prerequisites.length; i++) {
    var prereq = this.prerequisites[i];
    if (prereq.uuid == uuid) {
      prereq.times.setData(params.duration);
      break;
    }
  }
};

Job.prototype.watchingPrerequisite = function(preliminaryStats, uuid) {
  for (var i = 0; i < this.prerequisites.length; i++) {
    var prereq = this.prerequisites[i];
    if (prereq.uuid == uuid) {
      prereq.stats.setData(preliminaryStats);
      this.predictedStartupTime.useHighest(preliminaryStats);
      break;
    }
  }
};

Job.prototype.finalizePrerequisites = function() {
  for (var i = 0; i < this.prerequisites.length; i++) {
    this.startupTime.useHighest(this.prerequisites[i].times);
  }
};

Job.prototype.finish = function(time) {
  this.finished = true;
  this.elapsedTime += new Date(time).getTime() - new Date(this.timeResumed).getTime();
  this.elapsedTimeWithPause += new Date(time).getTime() - new Date(this.timeResumed).getTime();
  this.finalizePrerequisites();

  this.duration.calculateDuration(time, this.timeStart, this.elapsedTime, this.elapsedTimeWithPause, this.startupTime);
};

Job.prototype.pause = function(time, endOfDay) {
  // if this is the endOfDay AND the job is paused, count the pause time and set the endOfDay pause to true
  if (endOfDay == true && this.paused == true) {
    this.elapsedTimeWithPause += new Date(time).getTime() - new Date(this.timePaused).getTime();
    this.endOfDayPause = true;
  }
  // if this is the endOfDay AND the job is NOT paused, pause the job, increment the timers
  else if (endOfDay == true && this.paused == false) {
    this.elapsedTimeWithPause += new Date(time).getTime() - new Date(this.timeResumed).getTime();
    this.elapsedTime += new Date(time).getTime() - new Date(this.timeResumed).getTime();
    this.endOfDayPause = true;
  }
  else if (this.paused == false) {
    this.elapsedTimeWithPause += new Date(time).getTime() - new Date(this.timeResumed).getTime();
    this.elapsedTime += new Date(time).getTime() - new Date(this.timeResumed).getTime();
    this.timePaused = time;
    this.paused = true;
  }
};

Job.prototype.resume = function(time, startOfDay) {
  // if the job was paused because of the endOfDay, resume it and set the timeResumed to now
  if (this.endOfDayPause == true && startOfDay == true && this.paused == false) {
    this.timeResumed = time;
    this.endOfDayPause = false;
  }
  // if the job was paused before the endOfDay, keep it paused, but set the paused time to now.
  else if (this.endOfDayPause == true && startOfDay == true && this.paused == true) {
    this.timePaused = time;
    this.endOfDayPause = false;
  }
  // if this is NOT the start of day and the job was paused, resume job, increment
  else if (startOfDay == false && this.paused == true) {
    this.elapsedTimeWithPause += new Date(time).getTime() - new Date(this.timePaused).getTime();
    this.timeResumed = time;
    this.paused = false;
  }


};


