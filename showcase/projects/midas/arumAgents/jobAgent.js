'use strict';



function JobAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);
  this.rpc = this.loadModule('rpc', this.rpcFunctions);
  this.connect(eve.system.transports.getAll());

  this.id = id;
  this.type = this.id.replace('job_','');
  this.globalStats = new DurationStats();
  this.globalStats.getFakeStats(id);

  this.agentStats = {};

  this.allJobs = {};   // used to quickly look up a job ID
  this.openJobs = {};  // used to check if there is a watcher to
  this.closedJobs = {};// keeps a list of agentIds containing jobs, used for stats collection
  // optimization would be nice with running averages, but N samples are needed, wait for demo data.

  this.watchers  = {};
}

// extend the eve.Agent prototype
JobAgent.prototype = Object.create(eve.Agent.prototype);
JobAgent.prototype.constructor = JobAgent;

// define RPC functions, preferably in a separated object to clearly distinct
// exposed functions from local functions.
JobAgent.prototype.rpcFunctions = {};


JobAgent.prototype.expandPrerequisites = function(prerequisites) {
  var expanded = [];
  if (prerequisites !== undefined) {
    for (var i = 0; i < prerequisites.length; i++) {
      var prereq = prerequisites[i];
      if (typeof prereq == 'string') {
        expanded.push({
          jobId: prereq,
          uuid: uuid(),
          times : new DurationData(),
          stats: new DurationStats()
        });
      }
      else if (typeof prereq == 'object' && prereq.type !== undefined) { //&& prereq.agentId !== undefined not needed since the same items will be added when only type exists
        prereq.uuid = uuid();
        prereq.times = new DurationData();
        prereq.stats = new DurationStats();
        expanded.push(prereq);
      }
      else {
        console.log('ERROR: cannot use the prerequisites! Not in array of strings or array of objects with correct fields format.');
        throw new Error('ERROR: cannot use the prerequisites! Not in array of strings or array of objects with correct fields format.');
      }
    }
  }
  return expanded;
};
/**
 * Create new Job for agent
 * @param params
 */
JobAgent.prototype.rpcFunctions.add = function(params) {
  var agentId = params.agentId;
  var jobId = params.jobId;

  // create stats if not yet exits
  if (this.agentStats[agentId] === undefined) {
    this.agentStats[agentId] = new DurationStats();
  }

  // create open job
  if (this.openJobs[agentId] === undefined) {
    this.openJobs[agentId] = {};
  }
  if (this.openJobs[agentId][jobId] !== undefined) {
    console.log('cannot start new job, jobId:', jobId, ' already exists!');
    throw new Error('cannot start new job, jobId:' + jobId + ' already exists!');
  }
  var prerequisites = this.expandPrerequisites(params.prerequisites);
  this.openJobs[agentId][jobId] = new Job(jobId, this.id, params.time, agentId, prerequisites);
  this.allJobs[jobId] = this.openJobs[agentId][jobId];
  this.addWatchers(jobId, prerequisites);


  // return prediction
  var statsData;
  if (this.agentStats[agentId].duration.mean == 0) {
    statsData = this.globalStats.getData();
  }
  else {
    statsData = this.agentStats[agentId].getData();
  }
  return statsData;
};

/**
 * finish the job of an agent
 * @param params
 */
JobAgent.prototype.rpcFunctions.finish = function(params) {
  var agentId = params.agentId;
  var jobId = params.jobId;
  var job = this.openJobs[agentId][jobId];

  // finish job
  job.finish(params.time);
  // notify watchers that a job is finished.
  if (this.watchers[jobId] !== undefined) {
    for (var i = 0; i < this.watchers[jobId].length; i++) {
      var val = this.watchers[jobId][i];
      var address     = val.address;
      var parentJobId = val.parentJobId;
      var uuid        = val.uuid;
      this.rpc.request(address, {method:'watchedJobFinished', params:{
        uuid:                 uuid,
        parentJobId:          parentJobId,
        duration:             job.duration.getData()
      }}).done();
    }
  }
  // cleanup watchers
  delete this.watchers[jobId];

  // move from open to closed jobs.
  if (this.closedJobs[agentId] === undefined) {
    this.closedJobs[agentId] = {};
  }
  if (this.closedJobs[agentId][jobId] !== undefined) {
    console.log('cannot close job, jobId:', jobId, ' already exists!');
    throw new Error('cannot close job, jobId:' + jobId + ' already exists!');
  }
  this.closedJobs[agentId][jobId] = this.openJobs[agentId][jobId];

  delete this.openJobs[agentId][jobId];

  this.updateStats();

  return {
    elapsedTime: this.closedJobs[agentId][jobId].elapsedTime,
    elapsedTimeWithPause: this.closedJobs[agentId][jobId].elapsedTimeWithPause,
    duration: this.closedJobs[agentId][jobId].duration.getData(),
    prediction: this.globalStats.getData()
  };
};

/**
 * update the job of an agent
 * @param params
 */
JobAgent.prototype.rpcFunctions.update = function(params) {
  var agentId = params.agentId;
  var jobId = params.jobId;
  var job = this.openJobs[agentId][jobId];
  var operation = params.operation;

  switch (operation) {
    case 'pause':
      job.pause(params.time, false);
      break;
    case 'endOfDay':
      job.pause(params.time, true);
      break;
    case 'startOfDay':
      job.resume(params.time, true);
      break;
    case 'resume':
      job.resume(params.time, false);
      break;
  }
  return {jobId: jobId, type: this.type, elapsedTime: job.elapsedTime, elapsedTimeWithPause: job.elapsedTimeWithPause};
};

/**
 * return agent stats
 * @param params
 * @returns {*}
 */
JobAgent.prototype.rpcFunctions.getAgentStats = function(params) {
  return this.agentStats[params.agentId];
};


/**
 * return global stats
 * @param params
 * @returns {{mean: number, std: number}|*}
 */
JobAgent.prototype.rpcFunctions.getGlobalStats = function(params) {
  return this.globalStats;
};

JobAgent.prototype.rpcFunctions.watchedJobFinished = function(params) {
  var jobId = params.parentJobId;
  this.allJobs[jobId].prerequisiteFinished(params);
};


/**
 *
 * @param params
 * @param sender
 * @returns {*}
 */
JobAgent.prototype.rpcFunctions.addWatcherOnJobId = function(params, sender) {
  var jobId = params.jobId;
  var uuid = params.uuid;
  var parentJobId = params.parentJobId;
  var job = this.allJobs[jobId];

  // if the job is already finished, call the finished callback
  if (job.finished == true) {
    this.rpc.request(sender, {method:'watchedJobFinished', params:{
      uuid:                 uuid,
      parentJobId:          parentJobId,
      duration:             job.duration.getData()  // we need the pure json data, not the class
    }}).done();
  }
  else {
    // we will create a watcher on a job which will alert the watcher when the job is finished with all the times.
    if (this.watchers[jobId] === undefined) {
      this.watchers[jobId] = [];
    }
    this.watchers[jobId].push({address: params.address, uuid: uuid});
  }

  // return the best prediction we have
  if (this.agentStats[job.agentId].mean == 0) {
    return this.globalStats.getData(); // we need the pure json data, not the class
  }
  return this.agentStats[job.agentId].getData(); // we need the pure json data, not the class
};


/**
 *
 * @param params
 * @param sender
 * @returns {*}
 */
JobAgent.prototype.rpcFunctions.addWatcherByAgentID = function(params, sender) {
  var agentId = params.agentId;
  var parentJobId = params.parentJobId;
  var jobId = null;
  var uuid = params.uuid;
  var returnStats;

  // see which statistics collection we will need to return.
  if (this.agentStats[agentId].duration.mean == 0) {
    returnStats = this.globalStats;
  }
  else {
    returnStats = this.agentStats[agentId];
  }
  // see if we have an open job with that agent of this type
  if (this.openJobs[agentId] !== undefined) {
    for (var jId in this.openJobs[agentId]) {
      if (this.openJobs[agentId].hasOwnProperty(jId)) {
        jobId = jId;
        break;
      }
    }
  }
  // there is no open job from supplied agent of this type. return the mean of the return stats
  if (jobId === null) {
    this.rpc.request(params.address, {method:'watchedJobFinished', params:{
      uuid:                 uuid,
      parentJobId:          parentJobId,
      duration:             returnStats.getMeanData(), // we need the pure json data, not the class
      oldData: true
    }}).done();
  }
  else {
    params.jobId = jobId;
    this.rpcFunctions.addWatcherOnJobId.call(this, params, sender);
  }

  // return the best prediction we have
  return returnStats.getData();  // we need the pure json data, not the class
};

/**
 *
 * @param params
 * @param sender
 * @returns {*}
 */
JobAgent.prototype.rpcFunctions.addWatcherByType = function(params, sender) {
  // since we cannot watch a global type, we return the global stats at that point.
  this.rpc.request(params.address, {method:'watchedJobFinished', params:{
    uuid:                 params.uuid,
    parentJobId:          params.parentJobId,
    duration:             this.globalStats.getMeanData(), // we need the pure json data, not the class
    oldData: true
  }}).done();
  return this.globalStats.getData(); // we need the pure json data, not the class
};


/**
 *
 * @param parentJobId           | ID from the job that wants to WATCH other jobs
 * @param prerequisites
 */
JobAgent.prototype.addWatchers = function(parentJobId, prerequisites) {
  for (var i = 0; i < prerequisites.length; i++) {
    var prereq = prerequisites[i];
    var params = {
      uuid: prereq.uuid,
      address: this.id, // this is the callback address
      parentJobId: parentJobId// this is the job that wants to watch the other one.
    };
    var me = this;
    if (prereq.jobId !== undefined) {
      // we now have a parentJobId to watch
      // we first need to find the type of job this belongs to.
      this.rpc.request('JobAgentGenerator', {method: 'returnJobAddress', params: {jobId: prereq.jobId}})
        // now that we have an address, set a watcher on the job id
        .done(function (address) {
          if (address != 'doesNotExist') {
            params.jobId = prereq.jobId;  // this is the job we want to watch
            me.rpc.request(address, {method: 'addWatcherOnJobId', params: params})
              .done(function (preliminaryStats) {
                me.allJobs[parentJobId].watchingPrerequisite(preliminaryStats, prereq.uuid);
              })
          }
          else {
            console.log('ERROR: watch job does not exist.');
            throw new Error('ERROR: watch job does not exist.');
          }
        });
    }
    else if (prereq.agentId !== undefined && prereq.type !== undefined) {
      // we now have an agentId and a jobType to watch.
      params.agentId = prereq.agentId;  // this is the job we want to watch
      this.rpc.request(prereq.type, {method: 'addWatcherByAgentID', params: params})
        .done(function (preliminaryStats) {
          me.allJobs[parentJobId].watchingPrerequisite(preliminaryStats, prereq.uuid);
        })
    }
    else if (prereq.type !== undefined) {
      this.rpc.request(prereq.type, {method: 'addWatcherByType', params: params})
        .done(function (preliminaryStats) {
          me.allJobs[parentJobId].watchingPrerequisite(preliminaryStats, prereq.uuid);
        })
    }
  }
};

JobAgent.prototype.updatePredictedStartup = function(jobId, prediction) {
  var jobPrediction = this.allJobs[jobId].predictedStartupTime;
  jobPrediction.mean = Math.max(jobPrediction.mean, prediction.mean);
  jobPrediction.std = Math.sqrt(Math.pow(jobPrediction.std,2) + Math.pow(prediction.std,2));

  this.allJobs[jobId].prerequisitesCount += 1;
};


/**
 * Update all statistics
 *
 */
JobAgent.prototype.updateStats = function() {
  this.globalStats.clearStats();

  var count = 0;
  for (var agentId in this.closedJobs) {
    if (this.closedJobs.hasOwnProperty(agentId)) {
      var collection = this.closedJobs[agentId];
      // could be optimised with rolling average for efficient memory management
      this.agentStats[agentId].setData(this.updateStatsIn(collection));
      this.globalStats.sumStats(this.agentStats[agentId]);
      count += 1;
    }
  }
  this.globalStats.averageStats(count);
};


/**
 *
 * @param collection
 * @returns {{duration: *, durationWithPause: *, durationWithStartup: *, durationWithBoth: *}}
 */
JobAgent.prototype.updateStatsIn = function(collection) {
  var stats = {};
  for (var i = 0; i < this.globalStats.fields.length; i++) {
    var field = this.globalStats.fields[i];
    stats[field] = this.collectStatsIn(collection, field);
  }
  return stats;
};


JobAgent.prototype.collectStatsIn = function(collection, field) {
  var total  = 0;
  var mean   = 0;
  var std    = 0;
  var minVal = 1e16;
  var maxVal = 0;
  var count  = 0;

  for (var jobId in collection) {
    if (collection.hasOwnProperty(jobId)) {
      var value = collection[jobId].duration[field];
      maxVal = value > maxVal ? value : maxVal;
      minVal = value < minVal ? value : minVal;

      total += collection[jobId].duration[field];
      count += 1;
    }
  }
  if (count > 0) {
    mean = total / count;
    for (var jobId in collection) {
      if (collection.hasOwnProperty(jobId)) {
        std += Math.pow(collection[jobId].duration[field] - mean,2);
      }
    }

    std = Math.sqrt(std/count);
    return {mean: mean, std: std, min: minVal, max: maxVal};
  }
  else {
    return {mean: 0, std: 0, min: 0, max: 0};
  }
};

JobAgent.prototype.hasJob = function(params) {
  return this.allJobs[params.jobId] !== undefined;
};
