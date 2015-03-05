

function timelineAgent(id, proxyAddress) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.proxyAddress = proxyAddress;

  this.eventTypes = {};
  this.timelineEvents = [];

  this.timelineClient = undefined;
  this.inputClient = undefined;


  // extend the agent with RPC functionality
  this.rpc = this.loadModule('rpc', this.rpcFunctions, {timeout:2000}); // option 1

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());

}

// extend the eve.Agent prototype
timelineAgent.prototype = Object.create(eve.Agent.prototype);
timelineAgent.prototype.constructor = timelineAgent;

timelineAgent.prototype.rpcFunctions = {};

timelineAgent.prototype.rpcFunctions.close = function() {
  sessionClosed();
};

timelineAgent.prototype.connectToProxy = function() {
  this.rpc.request(this.proxyAddress, {method:'setTimelineClient',params:{}}).done(function () {
    connected = true;
  });
};

timelineAgent.prototype.rpcFunctions.addTimelineEvent = function(params,sender) {
  addToDataset(params);
};

timelineAgent.prototype.rpcFunctions.resetTimelineEvents = function(params,sender) {
  clearDataset();
};

timelineAgent.prototype.wakeProxy = function(httpAddress) {
  this.rpc.request(httpAddress, {method:'wakeUp',params:{}}).done();
};

timelineAgent.prototype.getTimelineEvents = function (params, sender) {
  var me = this;
  return new Promise(function(resolve,reject) {
    me.rpc.request(me.proxyAddress, {method: 'getTimelineEvents', params: {}})
      .then(function (reply) {
        resolve(reply);
      })
      .catch(function(err) {reject(err);});
  })
};
