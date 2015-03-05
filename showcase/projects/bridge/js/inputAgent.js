function inputAgent(id, proxyAddress) {
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
inputAgent.prototype = Object.create(eve.Agent.prototype);
inputAgent.prototype.constructor = inputAgent;

inputAgent.prototype.rpcFunctions = {};

inputAgent.prototype.rpcFunctions.close = function() {
  sessionClosed();
};

inputAgent.prototype.connectToProxy = function() {
  this.rpc.request(this.proxyAddress, {method:'setInputClient',params:{}}).done(function () {
    connected = true;
  });
};

inputAgent.prototype.addEventType = function(data) {
  this.rpc.request(this.proxyAddress, {method:'addEventType',params:data}).done();
};

inputAgent.prototype.addTimelineEvent = function(item) {
  this.rpc.request(this.proxyAddress, {method:'addTimelineEvent',params:{item:item}}).done();
};

inputAgent.prototype.wakeProxy = function(httpAddress) {
  this.rpc.request(httpAddress, {method:'wakeUp',params:{}}).done();
};

inputAgent.prototype.resetEventTypes = function(data) {
  this.rpc.request(this.proxyAddress, {method:'resetEventTypes',params:data}).done();
};
inputAgent.prototype.resetTimelineEvents = function(data) {
  this.rpc.request(this.proxyAddress, {method:'resetTimelineEvents',params:data}).done();
};

inputAgent.prototype.getEventTypes = function (params, sender) {
  var me = this;
  return new Promise(function(resolve,reject) {
    me.rpc.request(me.proxyAddress, {method: 'getEventTypes', params: {}})
      .then(function (reply) {
        resolve(reply);
      })
      .catch(function(err) {reject(err);});
  })
};

inputAgent.prototype.getTimelineEvents = function (params, sender) {
  var me = this;
  return new Promise(function(resolve,reject) {
    me.rpc.request(me.proxyAddress, {method: 'getTimelineEvents', params: {}})
      .then(function (reply) {
        resolve(reply);
      })
      .catch(function(err) {reject(err);});
  })
};
