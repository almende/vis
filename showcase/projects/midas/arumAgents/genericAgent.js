'use strict';

if (typeof window === 'undefined') {
  var eve = require('evejs');
}

function GenericAgent(id, type) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.id = id;
  this.rpc = this.loadModule('rpc', this.rpcFunctions);
  this.connect(eve.system.transports.getAll());
  this.type = type;
  this.jobs = new JobManager(this);
  this.timelineDataset = timelineItems;

  timelineGroups.add({id:id, content:type + ": " + id, className: 'timelineGroup ' + type});

  this.availableSubgroups = [0,1,2,3,4,5,6,7,8,9,10];
  this.freeSubgroups = {};
  for (var i = 0; i < this.availableSubgroups.length; i++) {
    this.freeSubgroups[this.availableSubgroups[i]] = true;
  }
  this.usedSubgroups = {};
}

// extend the eve.Agent prototype
GenericAgent.prototype = Object.create(eve.Agent.prototype);
GenericAgent.prototype.constructor = GenericAgent;

// define RPC functions, preferably in a separated object to clearly distinct
// exposed functions from local functions.
GenericAgent.prototype.rpcFunctions = {};

GenericAgent.prototype.allocateSubgroup = function(type) {
  for (var i = 0; i < this.availableSubgroups.length; i++) {
    if (this.freeSubgroups[this.availableSubgroups[i]] == true) {
      this.usedSubgroups[type] = i;
      this.freeSubgroups[this.availableSubgroups[i]] = false;
      break;
    }
  }
};

GenericAgent.prototype.freeSubgroup = function(type) {
  this.freeSubgroups[this.usedSubgroups[type]] = true;
  delete this.usedSubgroups[type];
};

GenericAgent.prototype.newAssignment = function(id, type, time, prerequisites) {
  this.allocateSubgroup(type);
  this.jobs.add(id, type, time, prerequisites);
};

/**
 * @param id
 * @param time
 * @param type
 */
GenericAgent.prototype.finishAssignment = function(id, type, time) {
  this.jobs.finish(id, type, time);
};


GenericAgent.prototype.updateAssignment = function(id, type, time, operation) {
  this.jobs.update(id, type, time, operation);
};

GenericAgent.prototype.rpcFunctions.newEvent = function(params) {
  // handle events
  if (params.operation == 'start') {
    this.newAssignment(params.jobId, params.assignment, params.time, params.prerequisites)
  }
  else if (params.operation == 'finish') {
    this.finishAssignment(params.jobId, params.assignment, params.time);
  }
  else if (params.operation == 'pause' || params.operation == 'resume') {
    this.updateAssignment(params.jobId,params.assignment,params.time, params.operation);
  }
};

if (typeof window === 'undefined') {
  module.exports = GenericAgent;
}