'use strict';

function AgentGenerator(id) {
  // execute super constructor
  eve.Agent.call(this, id);
  this.rpc = this.loadModule('rpc', this.rpcFunctions);
  var me = this;
  this.amountOfEvents = 0;
  this.eventNumber = 0;
  this.eventsToFire = 0;
  this.lastEndOfDayTime = null;
  this.events = [];

  conn = this.connect(eve.system.transports.getAll());

  // connect to websocket if not online only
  if (conn[0].connect !== undefined) {
    conn[0].connect(EVENTS_AGENT_ADDRESS)
      .then(function () {
        console.log('Connected to ', EVENTS_AGENT_ADDRESS);
        me.rpc.request(EVENTS_AGENT_ADDRESS, {
          method: "loadEvents",
          params: {filename: "events.csv", actuallySend: true}
        }).done(function (reply) {
          me.amountOfEvents = reply;
          me.getEvents(AMOUNT_OF_INITIAL_EVENTS);
        });
      })
      .catch(function (err) {
        console.log('Error: Failed to connect to the conductor agent');
        console.log(err);

        // keep trying until the conductor agent is online
        setTimeout(connect, RECONNECT_DELAY);
      });
  }
  //use local connection
  else {
    EVENTS_AGENT_ADDRESS = 'eventGenerator';
    setTimeout(function() {
      me.rpc.request(EVENTS_AGENT_ADDRESS, {
        method: "loadEvents",
        params: {filename: "events.csv", actuallySend: true}
      }).done(function (reply) {
        me.amountOfEvents = reply;
        me.getEvents(AMOUNT_OF_INITIAL_EVENTS);
      });
    },40);
  }
}

// extend the eve.Agent prototype
AgentGenerator.prototype = Object.create(eve.Agent.prototype);
AgentGenerator.prototype.constructor = AgentGenerator;

// define RPC functions, preferably in a separated object to clearly distinct
// exposed functions from local functions.
AgentGenerator.prototype.rpcFunctions = {};

AgentGenerator.prototype.rpcFunctions.receiveEvent = function(params) {
  // setup timeline
  this.events.push(JSON.stringify(params));

  if (params.performedBy == "global") {
    this.imposeWorkingHours(params);
  }
  else {
    if (agentList[params.performedBy] === undefined) {
      agentList[params.performedBy] = new GenericAgent(params.performedBy, params.type);
    }
    this.rpc.request(params.performedBy, {method: "newEvent", params: params});
  }

  // check if we need to get another event, its done here to avoid raceconditions
  if (this.eventsToFire != 0) {
    var me = this;
    setTimeout(function() {
      me.eventNumber += 1;
      eventCounter.innerHTML = me.eventNumber +""; // make string so it works
      me.rpc.request(EVENTS_AGENT_ADDRESS, {method:'nextEvent', params:{}}).done();
      me.eventsToFire -= 1;
    },EVENT_DELAY);
    if (INCREASE_SPEED == true) {
      EVENT_DELAY = Math.max(0, 1000 - (1000 * (me.eventNumber / 205)));
    }
  }
};

AgentGenerator.prototype.getEvents = function (count) {
  if (this.eventNumber + count > this.amountOfEvents) {
    count = this.amountOfEvents - this.eventNumber;
  }
  if (count != 0) {
    this.eventsToFire = count - 1;
    this.rpc.request(EVENTS_AGENT_ADDRESS, {method: 'nextEvent', params: {}}).done();
    this.eventNumber += 1;
    eventCounter.innerHTML = this.eventNumber + ""; // make string so it works
  }
};

AgentGenerator.prototype.rpcFunctions.updateOpenJobs = function(params) {
  var skipJob = params.jobId;
  var time = params.time;
  this.moveTimeline(params);
  for (var agentId in agentList) {
    if (agentList.hasOwnProperty(agentId)) {
      agentList[agentId].jobs.updateJobs(time, skipJob);
    }
  }
};

AgentGenerator.prototype.moveTimeline = function(params) {
  timeline.setCustomTime(params.time);
  var range = timeline.getWindow();
  var duration = range.end - range.start;
  var hiddenDates = timeline.body.hiddenDates;
  var DateUtil = vis.timeline.DateUtil;
  var hiddenDuration = DateUtil.getHiddenDurationBetween(hiddenDates, range.start, range.end);
  var visibleDuration = duration - hiddenDuration;


  var fraction = 0.15;
  var requiredStartDuration = (1-fraction) * visibleDuration;
  var requiredEndDuration = fraction * visibleDuration;
  var convertedTime = new Date(params.time).getTime();
  var newStart;
  var newEnd;

  var elapsedDuration = 0;
  var previousPoint = convertedTime;
  for (var i = hiddenDates.length-1; i > 0; i--) {
    var startDate = hiddenDates[i].start;
    var endDate = hiddenDates[i].end;
    // if time after the cutout, and the
    if (endDate <= convertedTime) {
      elapsedDuration += previousPoint - endDate;
      previousPoint = startDate;
      if (elapsedDuration >= requiredStartDuration) {
        newStart = endDate + (elapsedDuration - requiredStartDuration);
        break;
      }
    }
  }
  if (newStart === undefined) {
    newStart = endDate - (requiredStartDuration - elapsedDuration);
  }

  elapsedDuration = 0;
  previousPoint = convertedTime;
  for (var i = 0; i < hiddenDates.length; i++) {
    var startDate = hiddenDates[i].start;
    var endDate = hiddenDates[i].end;
    // if time after the cutout, and the
    if (startDate >= convertedTime) {
      elapsedDuration += startDate - previousPoint;
      previousPoint = endDate;
      if (elapsedDuration >= requiredEndDuration) {
        newEnd = startDate - (elapsedDuration - requiredEndDuration);
        break;
      }
    }
  }
  if (newEnd === undefined) {
    newEnd = endDate + (requiredEndDuration - elapsedDuration);
  }

  timeline.setWindow(newStart, newEnd, {animate:Math.min(100,EVENT_DELAY)});
};

AgentGenerator.prototype.imposeWorkingHours = function(params) {
  var time = params.time;
  var operation = params.operation;

  for (var agentId in agentList) {
    if (agentList.hasOwnProperty(agentId)) {
      var agent = agentList[agentId];
      for (var jobId in agent.jobs.openJobs) {
        if (agent.jobs.openJobs.hasOwnProperty(jobId)) {
          var job = agent.jobs.openJobs[jobId];
          agent.updateAssignment(jobId, job.type, time, operation);
        }
      }
    }
  }

  if (operation == 'endOfDay') {
    this.lastEndOfDayTime = time;
  }
  else {
    if (this.lastEndOfDayTime !== null) {
      timelineItems.update({
        id: 'night' + uuid(),
        start: this.lastEndOfDayTime,
        end: time,
        type: 'background',
        className: 'night'
      });
      this.lastEndOfDayTime = null;
    }
  }


};

AgentGenerator.prototype.printEvents = function() {
  var str = "";
  str += "[";
  for (var i = 0; i < this.events.length; i++) {
    str += this.events[i];
    if (i < this.events.length - 1) {
      str += ","
    }
  }
  str += "]";
  console.log(str);
}