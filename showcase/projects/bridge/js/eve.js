(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("amqp"));
	else if(typeof define === 'function' && define.amd)
		define(["amqp"], factory);
	else if(typeof exports === 'object')
		exports["eve"] = factory(require("amqp"));
	else
		root["eve"] = factory(root["amqp"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_23__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	exports.Agent = __webpack_require__(1);
	exports.ServiceManager = __webpack_require__(2);
	exports.TransportManager = __webpack_require__(3);

	exports.module = {
	  BabbleModule: __webpack_require__(5),
	  PatternModule: __webpack_require__(6),
	  RequestModule: __webpack_require__(7),
	  RPCModule: __webpack_require__(8)
	};

	exports.transport = {
	  Transport:          __webpack_require__(9),
	  AMQPTransport:      __webpack_require__(11),
	  DistribusTransport: __webpack_require__(13),
	  HTTPTransport:      __webpack_require__(15),
	  LocalTransport:     __webpack_require__(17),
	  PubNubTransport:    __webpack_require__(19),
	  WebSocketTransport: __webpack_require__(21),

	  connection: {
	    Connection:          __webpack_require__(10),
	    AMQPConnection:      __webpack_require__(12),
	    DistribusConnection: __webpack_require__(14),
	    HTTPConnection:      __webpack_require__(16),
	    LocalConnection:     __webpack_require__(18),
	    PubNubConnection:    __webpack_require__(20),
	    WebSocketConnection: __webpack_require__(22)
	  }
	};

	exports.hypertimer = __webpack_require__(24);
	exports.util = __webpack_require__(4);

	// register all modules at the Agent
	exports.Agent.registerModule(exports.module.BabbleModule);
	exports.Agent.registerModule(exports.module.PatternModule);
	exports.Agent.registerModule(exports.module.RequestModule);
	exports.Agent.registerModule(exports.module.RPCModule);

	// register all transports at the TransportManager
	exports.TransportManager.registerType(exports.transport.AMQPTransport);
	exports.TransportManager.registerType(exports.transport.DistribusTransport);
	exports.TransportManager.registerType(exports.transport.HTTPTransport);
	exports.TransportManager.registerType(exports.transport.LocalTransport);
	exports.TransportManager.registerType(exports.transport.PubNubTransport);
	exports.TransportManager.registerType(exports.transport.WebSocketTransport);

	// load the default ServiceManager, a singleton, initialized with a LocalTransport
	exports.system = new exports.ServiceManager();
	exports.system.transports.add(new exports.transport.LocalTransport());

	// override Agent.getTransportById in order to support Agent.connect(transportId)
	exports.Agent.getTransportById = function (id) {
	  return exports.system.transports.get(id);
	};


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var uuid = __webpack_require__(28);
	var util = __webpack_require__(4);

	/**
	 * Agent
	 * @param {string} [id]         Id for the agent. If not provided, the agent
	 *                              will be given a uuid.
	 * @constructor
	 */
	function Agent (id) {
	  this.id = id ? id.toString() : uuid();

	  // a list with all connected transports
	  this.connections = [];
	  this.defaultConnection = null;
	  this.ready = Promise.resolve([]);
	}

	// an object with modules which can be used to extend the agent
	Agent.modules = {};

	/**
	 * Register a new type of module. This module can then be loaded via
	 * Agent.extend() and Agent.loadModule().
	 * @param {Function} constructor     A module constructor
	 */
	Agent.registerModule = function (constructor) {
	  var type = constructor.prototype.type;
	  if (typeof constructor !== 'function') {
	    throw new Error('Constructor function expected');
	  }
	  if (!type) {
	    throw new Error('Field "prototype.type" missing in transport constructor');
	  }
	  if (type in Agent.modules) {
	    if (Agent.modules[type] !== constructor) {
	      throw new Error('Module of type "' + type + '" already exists');
	    }
	  }

	  Agent.modules[type] = constructor;
	};

	/**
	 * Get a transport by id.
	 * This static method can be overloaded for example by the get function of
	 * a singleton TransportManager.
	 * @param {string} id
	 * @return {Transport}
	 */
	Agent.getTransportById = function (id) {
	  throw new Error('Transport with id "' + id + '" not found');
	};

	/**
	 * Extend an agent with modules (mixins).
	 * The modules new functions are added to the Agent itself.
	 * See also function `loadModule`.
	 * @param {string | string[]} module  A module name or an Array with module
	 *                                    names. Available modules:
	 *                                    'pattern', 'request', 'babble'
	 * @param {Object} [options]          Additional options for loading the module
	 * @return {Agent} Returns the agent itself
	 */
	Agent.prototype.extend = function (module, options) {
	  if (Array.isArray(module)) {
	    var modules = [].concat(module);

	    // order the modules such that 'pattern' comes first, this module must be
	    // loaded before other modules ('request' specifically)
	    modules.sort(function (a, b) {
	      if (a == 'pattern') return -1;
	      if (b == 'pattern') return 1;
	      return 0;
	    });

	    // an array with module names
	    for (var i = 0; i < modules.length; i++) {
	      this.extend(modules[i], options)
	    }
	  }
	  else {
	    // a single module name
	    var constructor = _getModuleConstructor(module);
	    var instance = new constructor(this, options);
	    var mixin = instance.mixin();

	    // check for conflicts in the modules mixin functions
	    var me = this;
	    Object.keys(mixin).forEach(function (name) {
	      if (me[name] !== undefined && name !== '_receive') {
	        throw new Error('Conflict: agent already has a property "' + prop + '"');
	      }
	    });

	    // extend the agent with all mixin functions provided by the module
	    Object.keys(mixin).forEach(function (name) {
	      me[name] = mixin[name];
	    });
	  }

	  return this;
	};

	/**
	 * Load a module onto an agent.
	 * See also function `extend`.
	 * @param {string | string[]} module  A module name or an Array with module
	 *                                    names. Available modules:
	 *                                    'pattern', 'request', 'babble'
	 * @param {Object} [options]          Additional options for loading the module
	 * @return {Object} Returns the created module
	 */
	Agent.prototype.loadModule = function (module, options, additionalOptions) {
	  var _options = options !== undefined ? Object.create(options) : {};
	  _options.extend = false;

	  var constructor = _getModuleConstructor(module);
	  var instance = new constructor(this, options, additionalOptions);
	  var mixin = instance.mixin();

	  // only replace the _receive function, do not add other mixin functions
	  this._receive = mixin._receive;

	  return instance;
	};

	/**
	 * Get a module constructor by it's name.
	 * Throws an error when the module is not found.
	 * @param {string} name
	 * @return {function} Returns the modules constructor function
	 * @private
	 */
	function _getModuleConstructor(name) {
	  var constructor = Agent.modules[name];
	  if (!constructor) {
	    throw new Error('Unknown module "' + name + '". ' +
	        'Choose from: ' + Object.keys(Agent.modules).map(JSON.stringify).join(', '));
	  }
	  return constructor;
	}

	/**
	 * Send a message to an agent
	 * @param {string} to
	 *              to is either:
	 *              - A string "agentId", the id of the recipient. Will be send
	 *                via the default transport or when there is no default
	 *                transport via the first connected transport.
	 *              - A string "agentId@transportId" Only usable locally, not
	 *                for sharing an address with remote agents.
	 *              - A string "protocol://networkId/agentId". This is a sharable
	 *                identifier for an agent.
	 * @param {*} message  Message to be send
	 * @return {Promise} Returns a promise which resolves when the message as
	 *                   successfully been sent, or rejected when sending the
	 *                   message failed
	 */
	Agent.prototype.send = function(to, message) {
	  var colon = to.indexOf('://');
	  if (colon !== -1) {
	    // to is an url like "protocol://networkId/agentId"
	    var url = util.parseUrl(to);
	    if (url.protocol == 'http' || url.protocol == 'ws' || url.protocol == 'https') { // TODO: ugly fixed listing here...
	      return this._sendByProtocol(url.protocol, to, message);
	    }
	    else {
	      return this._sendByNetworkId(url.domain, url.path, message);
	    }
	  }

	  // TODO: deprecate this notation "agentId@transportId"?
	  var at = to.indexOf('@');
	  if (at != -1) {
	    // to is an id like "agentId@transportId"
	    var _to = to.substring(0, at);
	    var _transportId = to.substring(at + 1);
	    return this._sendByTransportId(_transportId, _to, message);
	  }

	  // to is an id like "agentId". Send via the default transport
	  var conn = this.defaultConnection;
	  if (conn) {
	    return conn.send(to, message);
	  }
	  else {
	    return Promise.reject(new Error('No transport found'));
	  }
	};

	/**
	 * Send a transport to an agent given a networkId
	 * @param {string} networkId    A network id
	 * @param {string} to           An agents id
	 * @param {string} message      Message to be send
	 * @return {Promise} Returns a promise which resolves when the message as
	 *                   successfully been sent, or rejected when sending the
	 *                   message failed
	 * @private
	 */
	Agent.prototype._sendByNetworkId = function(networkId, to, message) {
	  // TODO: change this.connections to a map with networkId as keys, much faster
	  for (var i = 0; i < this.connections.length; i++) {
	    var connection = this.connections[i];
	    if (connection.transport.networkId == networkId) {
	      return connection.send(to, message);
	    }
	  }

	  return Promise.reject(new Error('No transport found with networkId "' + networkId + '"'));
	};

	/**
	 * Send a message by a transport by protocol.
	 * The message will be send via the first found transport having the specified
	 * protocol.
	 * @param {string} protocol     A protocol, for example 'http' or 'ws'
	 * @param {string} to           An agents id
	 * @param {string} message      Message to be send
	 * @return {Promise} Returns a promise which resolves when the message as
	 *                   successfully been sent, or rejected when sending the
	 *                   message failed
	 * @private
	 */
	Agent.prototype._sendByProtocol = function(protocol, to, message) {
	  // the https addresses also make use of the http protocol.
	  protocol = protocol == 'https' ? 'http' : protocol;

	  for (var i = 0; i < this.connections.length; i++) {
	    var connection = this.connections[i];
	    if (connection.transport.type == protocol) {
	      return connection.send(to, message);
	    }
	  }

	  return Promise.reject(new Error('No transport found for protocol "' + protocol + '"'));
	};

	/**
	 * Send a transport to an agent via a specific transport
	 * @param {string} transportId  The configured id of a transport.
	 * @param {string} to           An agents id
	 * @param {string} message      Message to be send
	 * @return {Promise} Returns a promise which resolves when the message as
	 *                   successfully been sent, or rejected when sending the
	 *                   message failed
	 * @private
	 */
	Agent.prototype._sendByTransportId = function(transportId, to, message) {
	  for (var i = 0; i < this.connections.length; i++) {
	    var connection = this.connections[i];
	    if (connection.transport.id == transportId) {
	      return connection.send(to, message);
	    }
	  }

	  return Promise.reject(new Error('No transport found with id "' + transportId + '"'));
	};

	/**
	 * Receive a message.
	 * @param {string} from     Id of sender
	 * @param {*} message       Received message, a JSON object (often a string)
	 */
	Agent.prototype.receive = function(from, message) {
	  // ... to be overloaded
	};

	/**
	 * The method _receive is overloaded in a cascaded way by modules, and calls
	 * the public method Agent.receive at the end of the chain.
	 * @param {string} from     Id of sender
	 * @param {*} message       Received message, a JSON object (often a string)
	 * @returns {*} Returns the return value of Agent.receive
	 * @private
	 */
	Agent.prototype._receive = function (from, message) {
	  return this.receive(from, message);
	};

	/**
	 * Connect to a transport. The agent will subscribe itself to
	 * messages sent to his id.
	 * @param {string | Transport | Transport[] | string[]} transport
	 *                                  A Transport instance, or the id of a
	 *                                  transport loaded in eve.system.
	 * @param {string} [id]             An optional alternative id to be used
	 *                                  for the connection. By default, the agents
	 *                                  own id is used.
	 * @return {Connection | Connection[]}  Returns a connection or, in case of
	 *                                      multiple transports, returns an
	 *                                      array with connections. The connections
	 *                                      have a promise .ready which resolves
	 *                                      as soon as the connection is ready for
	 *                                      use.
	 */
	Agent.prototype.connect = function(transport, id) {
	  if (Array.isArray(transport)) {
	    var me = this;
	    return transport.map(function (_transport) {
	      return me._connect(_transport, id);
	    });
	  }
	  else if (typeof transport === 'string') {
	    // get transport by id
	    return this._connect(Agent.getTransportById(transport), id);
	  }
	  else {
	    // a transport instance
	    return this._connect(transport, id);
	  }
	};

	/**
	 * Connect to a transport
	 * @param {Transport} transport     A Transport instance
	 * @param {string} [id]             An optional alternative id to be used
	 *                                  for the connection. By default, the agents
	 *                                  own id is used.
	 * @return {Connection}             Returns a connection.
	 * @private
	 */
	Agent.prototype._connect = function (transport, id) {
	  // create a receive function which is bound to the _receive function.
	  // the _receive function can be replaced in by modules in a cascaded way,
	  // and in the end calls this.receive of the agent.
	  // note: we don't do receive = this._receive.bind(this) as the _receive
	  //       function can be overloaded after a connection is made.
	  var me = this;
	  var receive = function (from, message) {
	    return me._receive(from, message);
	  };
	  var connection = transport.connect(id || this.id, receive);
	  this.connections.push(connection);

	  // set or replace the defaultConnection
	  if (!this.defaultConnection) {
	    this.defaultConnection = connection;
	  }
	  else if (transport['default']) {
	    if (this.defaultConnection['default']) {
	      throw new Error('Cannot connect to a second default transport');
	    }
	    this.defaultConnection = connection;
	  }

	  this._updateReady();

	  return connection;
	};

	/**
	 * Disconnect from one or multiple transports
	 * @param {string | Transport | string[] | Transport[]} [transport]
	 *              A transport or an array with transports.
	 *              parameter transport can be an instance of a Transport, or the
	 *              id of a transport.
	 *              When transport is undefined, the agent will be disconnected
	 *              from all connected transports.
	 */
	Agent.prototype.disconnect = function(transport) {
	  var i, connection;

	  if (!transport) {
	    // disconnect all transports
	    while (connection = this.connections[0]) {
	      this._disconnect(connection);
	    }
	  }
	  else if (Array.isArray(transport)) {
	    // an array with transports
	    i = 0;
	    while (i < this.connections.length) {
	      connection = this.connections[i];
	      if (transport.indexOf(connection.transport) !== -1) {
	        this._disconnect(connection);
	      }
	      else {
	        i++;
	      }
	    }
	  }
	  else if (typeof transport === 'string') {
	    // transport by id
	    this.disconnect(Agent.getTransportById(transport));
	  }
	  else {
	    // a single transport
	    for (i = 0; i < this.connections.length; i++) {
	      connection = this.connections[i];
	      if (connection.transport === transport) {
	        this._disconnect(connection);
	        break;
	      }
	    }
	  }
	};

	/**
	 * Close a connection
	 * @param {Connection} connection
	 * @private
	 */
	Agent.prototype._disconnect = function (connection) {
	  // find the connection
	  var index = this.connections.indexOf(connection);
	  if (index !== -1) {
	    // close the connection
	    connection.close();

	    // remove from the list with connections
	    this.connections.splice(index, 1);

	    // replace the defaultConnection if needed
	    if (this.defaultConnection === connection) {
	      this.defaultConnection = this.connections[this.connections.length - 1] || null;
	    }
	  }

	  this._updateReady();
	};

	/**
	 * Update the ready state of the agent
	 * @private
	 */
	Agent.prototype._updateReady = function () {
	  // FIXME: we should not replace with a new Promise,
	  //        we have a problem when this.ready is requested before ready,
	  //        and another connection is opened before ready
	  this.ready = Promise.all(this.connections.map(function (connection) {
	    return connection.ready;
	  }));
	};

	module.exports = Agent;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var seed = __webpack_require__(25);
	var hypertimer = __webpack_require__(24);
	var TransportManager = __webpack_require__(3);

	// map with known configuration properties
	var KNOWN_PROPERTIES = {
	  transports: true,
	  timer: true,
	  random: true
	};

	function ServiceManager(config) {
	  this.transports = new TransportManager();

	  this.timer = hypertimer();

	  this.random = Math.random;

	  this.init(config);
	}

	/**
	 * Initialize the service manager with services loaded from a configuration
	 * object. All current services are unloaded and removed.
	 * @param {Object} config
	 */
	ServiceManager.prototype.init = function (config) {
	  this.transports.clear();

	  if (config) {
	    if (config.transports) {
	      this.transports.load(config.transports);
	    }

	    if (config.timer) {
	      this.timer.config(config.timer);
	    }

	    if (config.random) {
	      if (config.random.deterministic) {
	        var key = config.random.seed || 'random seed';
	        this.random = seed(key, config.random);
	      }
	      else {
	        this.random = Math.random;
	      }
	    }

	    for (var prop in config) {
	      if (config.hasOwnProperty(prop) && !KNOWN_PROPERTIES[prop]) {
	        // TODO: should log this warning via a configured logger
	        console.log('WARNING: Unknown configuration option "' + prop + '"')
	      }
	    }
	  }
	};

	/**
	 * Clear all configured services
	 */
	ServiceManager.prototype.clear = function () {
	  this.transports.clear();
	};

	module.exports = ServiceManager;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * A manager for loading and finding transports.
	 * @param {Array} [config]      Optional array containing configuration objects
	 *                             for transports.
	 * @constructor
	 */
	function TransportManager(config) {
	  this.transports = [];

	  if (config) {
	    this.load(config);
	  }
	}

	// map with all registered types of transports
	// each transport must register itself at the TransportManager using registerType.
	TransportManager.types = {};

	/**
	 * Register a new type of transport. This transport can then be loaded via
	 * configuration.
	 * @param {Transport.prototype} constructor     A transport constructor
	 */
	TransportManager.registerType = function (constructor) {
	  var type = constructor.prototype.type;
	  if (typeof constructor !== 'function') {
	    throw new Error('Constructor function expected');
	  }
	  if (!type) {
	    throw new Error('Field "prototype.type" missing in transport constructor');
	  }
	  if (type in TransportManager.types) {
	    if (TransportManager.types[type] !== constructor) {
	      throw new Error('Transport type "' + type + '" already exists');
	    }
	  }

	  TransportManager.types[type] = constructor;
	};

	/**
	 * Add a loaded transport to the manager
	 * @param {Transport} transport
	 * @return {Transport} returns the transport itself
	 */
	TransportManager.prototype.add = function (transport) {
	  this.transports.push(transport);
	  return transport;
	};

	/**
	 * Load one or multiple transports based on JSON configuration.
	 * New transports will be appended to current transports.
	 * @param {Object | Array} config
	 * @return {Transport | Transport[]} Returns the loaded transport(s)
	 */
	TransportManager.prototype.load = function (config) {
	  if (Array.isArray(config)) {
	    return config.map(this.load.bind(this));
	  }

	  var type = config.type;
	  if (!type) {
	    throw new Error('Property "type" missing');
	  }

	  var constructor = TransportManager.types[type];
	  if (!constructor) {
	    throw new Error('Unknown type of transport "' + type + '". ' +
	        'Choose from: ' + Object.keys(TransportManager.types).join(','))
	  }

	  var transport = new constructor(config);
	  this.transports.push(transport);
	  return transport;
	};

	/**
	 * Unload a transport.
	 * @param {Transport | Transport[] | string | string[]} transport
	 *              A Transport instance or the id of a transport, or an Array
	 *              with transports or transport ids.
	 */
	TransportManager.prototype.unload = function (transport) {
	  var _transport;
	  if (typeof transport === 'string') {
	    _transport = this.get(transport);
	  }
	  else if (Array.isArray(transport)) {
	    for (var i = 0; i < transport.length; i++) {
	      this.unload(transport[i]);
	    }
	  }
	  else {
	    _transport = transport;
	  }

	  if (_transport) {
	    _transport.close();

	    var index = this.transports.indexOf(_transport);
	    if (index !== -1) {
	      this.transports.splice(index, 1);
	    }
	  }
	};

	/**
	 * Get a transport by its id. The transport must have been created with an id
	 * @param {string} [id] The id of a transport
	 * @return {Transport} Returns the transport when found. Throws an error
	 *                     when not found.
	 */
	TransportManager.prototype.get = function (id) {
	  for (var i = 0; i < this.transports.length; i++) {
	    var transport = this.transports[i];
	    if (transport.id === id) {
	      return transport;
	    }
	  }

	  throw new Error('Transport with id "' + id + '" not found');
	};

	/**
	 * Get all transports.
	 * @return {Transport[]} Returns an array with all loaded transports.
	 */
	TransportManager.prototype.getAll = function () {
	  return this.transports.concat([]);
	};

	/**
	 * Find transports by type.
	 * @param {string} [type]   Type of the transport. Choose from 'amqp',
	 *                          'distribus', 'local', 'pubnub'.
	 * @return {Transport[]}    When type is defined, the all transports of this
	 *                          type are returned. When undefined, all transports
	 *                          are returned.
	 */
	TransportManager.prototype.getByType = function (type) {
	  if (type) {
	    if (!(type in TransportManager.types)) {
	      throw new Error('Unknown type of transport "' + type + '". ' +
	          'Choose from: ' + Object.keys(TransportManager.types).join(','))
	    }

	    return this.transports.filter(function (transport) {
	      return transport.type === type;
	    });
	  }
	  else {
	    return [].concat(this.transports);
	  }
	};

	/**
	 * Close all configured transports and remove them from the manager.
	 */
	TransportManager.prototype.clear = function () {
	  this.transports.forEach(function (transport) {
	    transport.close();
	  });
	  this.transports = [];
	};

	module.exports = TransportManager;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Test whether the provided value is a Promise.
	 * A value is marked as a Promise when it is an object containing functions
	 * `then` and `catch`.
	 * @param {*} value
	 * @return {boolean} Returns true when `value` is a Promise
	 */
	exports.isPromise = function (value) {
	  return value &&
	      typeof value['then'] === 'function' &&
	      typeof value['catch'] === 'function'
	};

	/**
	 * Splits an url like "protocol://domain/path"
	 * @param {string} url
	 * @return {{protocol: string, domain: string, path: string} | null}
	 *            Returns an object with properties protocol, domain, and path
	 *            when there is a match. Returns null if no valid url.
	 *
	 */
	exports.parseUrl = function (url) {
	  // match an url like "protocol://domain/path"
	  var match = /^([A-z]+):\/\/([^\/]+)(\/(.*)$|$)/.exec(url);
	  if (match) {
	    return {
	      protocol: match[1],
	      domain: match[2],
	      path: match[4]
	    }
	  }

	  return null;
	};

	/**
	 * Normalize a url. Removes trailing slash
	 * @param {string} url
	 * @return {string} Returns the normalized url
	 */
	exports.normalizeURL = function (url) {
	  if (url[url.length - 1] == '/') {
	    return url.substring(0, url.length - 1);
	  }
	  else {
	    return url;
	  }
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var babble = __webpack_require__(26);

	/**
	 * Create a Babble module for an agent.
	 * The agents _receive function is wrapped into a new handler.
	 * Creates a Babble instance with function `ask`, `tell`, `listen`, `listenOnce`
	 * @param {Agent} agent
	 * @param {Object} [options]   Optional parameters. Not applicable for BabbleModule
	 * @constructor
	 */
	function BabbleModule(agent, options) {
	  // create a new babbler
	  var babbler = babble.babbler(agent.id);
	  babbler.connect({
	    connect: function (params) {},
	    disconnect: function(token) {},
	    send: function (to, message) {
	      agent.send(to, message);
	    }
	  });
	  this.babbler = babbler;

	  // create a receive function for the agent
	  var receiveOriginal = agent._receive;
	  this._receive = function (from, message) {
	    babbler._receive(message);
	    // TODO: only propagate to receiveOriginal if the message is not handled by the babbler
	    return receiveOriginal.call(agent, from, message);
	  };
	}

	BabbleModule.prototype.type = 'babble';

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, ask: function, tell: function, listen: function, listenOnce: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	BabbleModule.prototype.mixin = function () {
	  var babbler = this.babbler;
	  return {
	    _receive: this._receive,
	    ask: babbler.ask.bind(babbler),
	    tell: babbler.tell.bind(babbler),
	    listen: babbler.listen.bind(babbler),
	    listenOnce: babbler.listenOnce.bind(babbler)
	  }
	};

	module.exports = BabbleModule;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Create a pattern listener onto an Agent.
	 * A new handler is added to the agents _receiver function.
	 * Creates a Pattern instance with functions `listen` and `unlisten`.
	 * @param {Agent} agent
	 * @param {Object} [options]   Optional parameters. Can contain properties:
	 *                            - stopPropagation: boolean
	 *                                                When false (default), a message
	 *                                                will be delivered at all
	 *                                                matching pattern listeners.
	 *                                                When true, a message will be
	 *                                                be delivered at the first
	 *                                                matching pattern listener only.
	 */
	function PatternModule(agent, options) {
	  this.agent = agent;
	  this.stopPropagation = options && options.stopPropagation || false;
	  this.receiveOriginal = agent._receive;
	  this.listeners = [];
	}

	PatternModule.prototype.type = 'pattern';

	/**
	 * Receive a message.
	 * All pattern listeners will be checked against their patterns, and if there
	 * is a match, the pattern listeners callback function is invoked.
	 * @param {string} from     Id of sender
	 * @param {*} message       Received message, a JSON object (often a string)
	 */
	PatternModule.prototype.receive = function(from, message) {
	  var response;
	  var responses = [];
	  for (var i = 0, ii = this.listeners.length; i < ii; i++) {
	    var listener = this.listeners[i];
	    var pattern = listener.pattern;
	    var match = (pattern instanceof Function && pattern(message)) ||
	        (pattern instanceof RegExp && pattern.test(message)) ||
	        (pattern == message);

	    if (match) {
	      response = listener.callback.call(this.agent, from, message);
	      responses.push(response);
	      if (this.stopPropagation) {
	        return responses[0];
	      }
	    }
	  }

	  response = this.receiveOriginal.call(this.agent, from, message);
	  responses.push(response);
	  return responses[0];
	};

	/**
	 * Add a pattern listener for incoming messages
	 * @param {string | RegExp | Function} pattern    Message pattern
	 * @param {Function} callback                     Callback function invoked when
	 *                                                a message matching the pattern
	 *                                                is received.
	 *                                                Invoked as callback(from, message)
	 */
	PatternModule.prototype.listen = function(pattern, callback) {
	  this.listeners.push({
	    pattern: pattern,
	    callback: callback
	  });
	};

	/**
	 * Remove a pattern listener for incoming messages
	 * @param {string | RegExp | Function} pattern    Message pattern
	 * @param {Function} callback
	 */
	PatternModule.prototype.unlisten = function(pattern, callback) {
	  for (var i = 0, ii = this.listeners.length; i < ii; i++) {
	    var listener = this.listeners[i];
	    if (listener.pattern === pattern && listener.callback === callback) {
	      this.listeners.splice(i, 1);
	      break;
	    }
	  }
	};

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, listen: function, unlisten: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	PatternModule.prototype.mixin = function () {
	  return {
	    _receive: this.receive.bind(this),
	    listen: this.listen.bind(this),
	    unlisten: this.unlisten.bind(this)
	  }
	};

	module.exports = PatternModule;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(28);
	var Promise = __webpack_require__(27);
	var util = __webpack_require__(4);

	var TIMEOUT = 60000; // ms

	/**
	 * Create a Request module.
	 * The module attaches a handler to the agents _receive function.
	 * Creates a Request instance with function `request`.
	 * @param {Agent} agent
	 * @param {Object} [options]   Optional parameters. Can contain properties:
	 *                            - timeout: number   A timeout for responses in
	 *                                                milliseconds. 60000 ms by
	 *                                                default.
	 */
	function RequestModule(agent, options) {
	  this.agent = agent;
	  this.receiveOriginal = agent._receive;
	  this.timeout = options && options.timeout || TIMEOUT;
	  this.queue = [];
	}

	RequestModule.prototype.type = 'request';

	/**
	 * Event handler, handles incoming messages
	 * @param {String} from     Id of the sender
	 * @param {*} message
	 * @return {boolean} Returns true when a message is handled, else returns false
	 */
	RequestModule.prototype.receive = function (from, message) {
	  var agent = this.agent;

	  if (typeof message === 'object') {
	    var envelope = message;

	    // match the request from the id in the response
	    var request = this.queue[envelope.id];
	    if (request) {
	      // remove the request from the queue
	      clearTimeout(request.timeout);
	      delete this.queue[envelope.id];

	      // resolve the requests promise with the response message
	      if (envelope.error) {
	        // TODO: turn this into an Error instance again
	        request.reject(new Error(envelope.error));
	      }
	      else {
	        request.resolve(envelope.message);
	      }
	      return true;
	    }
	    else if (message.type == 'request') {
	      try {
	        var response = this.receiveOriginal.call(agent, from, message.message);
	        if (util.isPromise(response)) {
	          // wait until the promise resolves
	          response
	              .then(function (result) {
	                agent.send(from, {type: 'request', id: message.id, message: result});
	              })
	              .catch(function (err) {
	                agent.send(from, {type: 'request', id: message.id, error: err.message || err.toString()});
	              });
	        }
	        else {
	          // immediately send a result
	          agent.send(from, {type: 'request', id: message.id, message: response });
	        }
	      }
	      catch (err) {
	        agent.send(from, {type: 'request', id: message.id, error: err.message || err.toString()});
	      }
	    }
	  }
	  else {
	    if (this.receiveOriginal) {
	      this.receiveOriginal.call(agent, from, message);
	    }
	  }
	};

	/**
	 * Send a request
	 * @param {string} to   Id of the recipient
	 * @param {*} message
	 * @returns {Promise.<*, Error>} Returns a promise resolving with the response message
	 */
	RequestModule.prototype.request = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    // put the data in an envelope with id
	    var id = uuid();
	    var envelope = {
	      type: 'request',
	      id: id,
	      message: message
	    };

	    // add the request to the list with requests in progress
	    me.queue[id] = {
	      resolve: resolve,
	      reject: reject,
	      timeout: setTimeout(function () {
	        delete me.queue[id];
	        reject(new Error('Timeout'));
	      }, me.timeout)
	    };

	    me.agent.send(to, envelope)
	        .catch(function (err) {
	          reject(err);
	        });
	  });
	};

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, request: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	RequestModule.prototype.mixin = function () {
	  return {
	    _receive: this.receive.bind(this),
	    request: this.request.bind(this)
	  }
	};

	module.exports = RequestModule;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(28);
	var Promise = __webpack_require__(27);
	var util = __webpack_require__(4);


	/**
	 *
	 * @param {Agent} agent
	 * @param {Object} availableFunctions
	 * @constructor
	 */
	function RPCModule(agent, availableFunctions, options) {
	  this.agent = agent;
	  this.receiveOriginal = agent._receive;
	  this.queue = {};
	  this.promiseTimeout = options && options.timeout || 1500; // 1 second

	  // check the available functions
	  if (availableFunctions instanceof Array) {
	    this.functionsFromArray(availableFunctions);
	  }
	  else if (availableFunctions instanceof Object) {
	    this.availableFunctions = availableFunctions;
	  }
	  else {
	    console.log('cannot use RPC with the supplied functions', availableFunctions);
	  }
	}

	RPCModule.prototype.type = 'rpc';

	/**
	 *
	 * @param availableFunctions
	 */
	RPCModule.prototype.functionsFromArray = function (availableFunctions) {
	  this.availableFunctions = {};
	  for (var i = 0; i < availableFunctions.length; i++) {
	    var fn = availableFunctions[i];
	    this.availableFunctions[fn] = this.agent[fn];
	  }
	};


	/**
	 *
	 * @param to
	 * @param message
	 * @returns {Promise}
	 */
	RPCModule.prototype.request = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    // prepare the envelope
	    if (typeof message  !=  'object' ) {reject(new TypeError('Message must be an object'));}
	    if (message.jsonrpc !== '2.0'    ) {message.jsonrpc = '2.0';}
	    if (message.id      === undefined) {message.id = uuid();}
	    if (message.method  === undefined) {reject(new Error('Property "method" expected'));}
	    if (message.params  === undefined) {message.params = {};}

	    // add the request to the list with requests in progress
	    me.queue[message.id] = {
	      resolve: resolve,
	      reject: reject,
	      timeout: setTimeout(function () {
	        delete me.queue[message.id];
	        reject(new Error('RPC Promise Timeout surpassed. Timeout: ' + me.promiseTimeout / 1000 + 's'));
	      }, me.promiseTimeout)
	    };
	    var sendRequest = me.agent.send(to, message);
	    if (util.isPromise(sendRequest) == true) {
	      sendRequest.catch(function (err) {reject(err);});
	    }
	  });
	};



	/**
	 *
	 * @param from
	 * @param message
	 * @returns {*}
	 */
	RPCModule.prototype.receive = function (from, message) {
	  if (typeof message == 'object') {
	    if (message.jsonrpc == '2.0') {
	      this._receive(from, message);
	    }
	    else {
	      this.receiveOriginal.call(this.agent, from, message);
	    }
	  }
	  else {
	    this.receiveOriginal.call(this.agent, from, message);
	  }
	};


	/**
	 *
	 * @param from
	 * @param message
	 * @returns {*}
	 * @private
	 */
	RPCModule.prototype._receive = function (from, message) {
	  // define structure of return message
	  var returnMessage = {jsonrpc:'2.0', id:message.id};

	  // check if this is a request
	  if (message.method !== undefined) {
	    // check is method is available for this agent
	    var method = this.availableFunctions[message.method];
	    if (method !== undefined) {
	      var response = method.call(this.agent, message.params, from) || null;
	      // check if response is a promise
	      if (util.isPromise(response)) {
	        var me = this;
	        response
	          .then(function (result) {
	            returnMessage.result = result;
	            me.agent.send(from, returnMessage)
	          })
	          .catch(function (error) {
	            returnMessage.error = error.message || error.toString();
	            me.agent.send(from, returnMessage);
	          })
	      }
	      else {
	        returnMessage.result = response;
	        this.agent.send(from, returnMessage);
	      }
	    }
	    else {
	      var error = new Error('Cannot find function: ' + message.method);
	      returnMessage.error = error.message || error.toString();
	      this.agent.send(from, returnMessage);
	    }
	  }
	  // check if this is a response
	  else if (message.result !== undefined || message.error !== undefined) {
	    var request = this.queue[message.id];
	    if (request !== undefined) {
	      // if an error is defined, reject promise
	      if (message.error != undefined) { // null or undefined
	        if (typeof message == 'object') {
	          request.reject(message.error);
	        }
	        else {
	          request.reject(new Error(message.error));
	        }
	      }
	      else {
	        request.resolve(message.result);
	      }
	    }
	  }
	  else {
	    // send error back to sender.
	    var error = new Error('No method or result defined. Message:' + JSON.stringify(message));
	    returnMessage.error = error.message || error.toString();
	    // FIXME: returned error should be an object {code: number, message: string}
	    this.agent.send(from, returnMessage);
	  }
	};

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, request: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	RPCModule.prototype.mixin = function () {
	  return {
	    _receive: this.receive.bind(this),
	    request: this.request.bind(this)
	  }
	};

	module.exports = RPCModule;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Abstract prototype of a transport
	 * @param {Object} [config]
	 * @constructor
	 */
	function Transport(config) {
	  this.id = config && config.id || null;
	  this['default'] = config && config['default'] || false;
	}

	Transport.prototype.type = null;

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive  Invoked as receive(from, message)
	 * @return {Connection}       Returns a connection
	 */
	Transport.prototype.connect = function(id, receive) {
	  throw new Error('Cannot invoke abstract function "connect"');
	};

	/**
	 * Close the transport
	 */
	Transport.prototype.close = function() {
	  throw new Error('Cannot invoke abstract function "close"');
	};

	module.exports = Transport;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);

	/**
	 * An abstract Transport connection
	 * @param {Transport} transport
	 * @param {string} id
	 * @param {function} receive
	 * @constructor
	 * @abstract
	 */
	function Connection (transport, id, receive) {
	  throw new Error('Cannot create an abstract Connection');
	}

	Connection.prototype.ready = Promise.reject(new Error('Cannot get abstract property ready'));

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	Connection.prototype.send = function (to, message) {
	  throw new Error('Cannot call abstract function send');
	};

	/**
	 * Close the connection, disconnect from the transport.
	 */
	Connection.prototype.close = function () {
	  throw new Error('Cannot call abstract function "close"');
	};

	module.exports = Connection;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var Transport = __webpack_require__(9);
	var AMQPConnection = __webpack_require__(12);

	/**
	 * Use AMQP as transport
	 * @param {Object} config   Config can contain the following properties:
	 *                          - `id: string`
	 *                          - `url: string`
	 *                          - `host: string`
	 *                          The config must contain either `url` or `host`.
	 *                          For example: {url: 'amqp://localhost'} or
	 *                          {host: 'dev.rabbitmq.com'}
	 * @constructor
	 */
	function AMQPTransport(config) {
	  this.id = config.id || null;
	  this.networkId = config.url || config.host || null;
	  this['default'] = config['default'] || false;

	  this.config = config;
	  this.connection = null;
	  this.exchange = null;

	  this.subscriptions = [];
	}

	AMQPTransport.prototype = new Transport();

	AMQPTransport.prototype.type = 'amqp';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive     Invoked as receive(from, message)
	 * @return {AMQPConnection} Returns a connection.
	 */
	AMQPTransport.prototype.connect = function(id, receive) {
	  return new AMQPConnection(this, id, receive);
	};

	/**
	 * Get an AMQP connection. If there is not yet a connection, a connection will
	 * be made.
	 * @param {Function} callback   Invoked as callback(connection)
	 * @private
	 */
	AMQPTransport.prototype._getConnection = function(callback) {
	  var me = this;

	  if (this.connection) {
	    // connection is available
	    callback(this.connection);
	  }
	  else {
	    if (this._onConnected) {
	      // connection is being opened but not yet ready
	      this._onConnected.push(callback);
	    }
	    else {
	      // no connection, create one
	      this._onConnected = [callback];

	      var amqp = __webpack_require__(23);   // lazy load the amqp library
	      var connection = amqp.createConnection(this.config);
	      connection.on('ready', function () {
	        var exchange = connection.exchange('', {confirm: true}, function () {
	          var _onConnected = me._onConnected;
	          delete me._onConnected;

	          me.connection = connection;
	          me.exchange = exchange;

	          _onConnected.forEach(function (callback) {
	            callback(me.connection);
	          });
	        });
	      });
	    }
	  }
	};

	/**
	 * Open a connection
	 * @param {string} id
	 * @param {Function} receive     Invoked as receive(from, message)
	 */
	AMQPTransport.prototype._connect = function(id, receive) {
	  var me = this;

	  return new Promise(function (resolve, reject) {
	    function subscribe(connection) {
	      var queue = connection.queue(id, {}, function() {
	        queue
	            .subscribe(function(message) {
	              var body = message.body;
	              receive(body.from, body.message);
	            })
	            .addCallback(function (ok) {
	              // register this subscription
	              me.subscriptions.push({
	                id: id,
	                consumerTag: ok.consumerTag
	              });

	              resolve(me);
	            });
	      });
	    }

	    me._getConnection(subscribe);
	  });
	};

	/**
	 * Close a connection an agent by its id
	 * @param {String} id
	 */
	AMQPTransport.prototype._close = function(id) {
	  var i = 0;
	  while (i < this.subscriptions.length) {
	    var subscription = this.subscriptions[i];
	    if (subscription.id == id) {
	      // remove this entry
	      this.subscriptions.splice(i, 1);
	    }
	    else {
	      i++;
	    }
	  }

	  if (this.subscriptions.length == 0) {
	    // fully disconnect if there are no subscribers left
	    this.exchange.destroy();
	    this.connection.disconnect();

	    this.connection = null;
	    this.exchange = null;
	  }
	};

	/**
	 * Close the transport.
	 */
	AMQPTransport.prototype.close = function() {
	  this.connection.destroy();
	  this.connection = null;
	};

	module.exports = AMQPTransport;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var Connection = __webpack_require__(10);

	/**
	 * A local connection.
	 * @param {AMQPTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function AMQPConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // ready state
	  this.ready = this.transport._connect(id, receive);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	AMQPConnection.prototype.send = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    var msg = {
	      body: {
	        from: me.id,
	        to: to,
	        message: message
	      }
	    };
	    var options = {
	      //immediate: true
	    };

	    me.transport.exchange.publish(to, msg, options, function () {
	      // FIXME: callback is not called. See https://github.com/postwait/node-amqp#exchangepublishroutingkey-message-options-callback
	      //console.log('sent', arguments)
	    });

	    resolve();
	  });
	};

	/**
	 * Close the connection
	 */
	AMQPConnection.prototype.close = function () {
	  this.transport._close(this.id);
	};

	module.exports = AMQPConnection;


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var distribus = __webpack_require__(29);
	var Transport = __webpack_require__(9);
	var DistribusConnection = __webpack_require__(14);

	/**
	 * Use distribus as transport
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 *                                - `host: distribus.Host`. Optional
	 *                                If `host` is not provided,
	 *                                a new local distribus Host is created.
	 * @constructor
	 */
	function DistribusTransport(config) {
	  this.id = config && config.id || null;
	  this['default'] = config && config['default'] || false;
	  this.host = config && config.host || new distribus.Host(config);

	  this.networkId = this.host.networkId; // FIXME: networkId can change when host connects to another host.
	}

	DistribusTransport.prototype = new Transport();

	DistribusTransport.prototype.type = 'distribus';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive     Invoked as receive(from, message)
	 * @return {DistribusConnection} Returns a connection.
	 */
	DistribusTransport.prototype.connect = function(id, receive) {
	  return new DistribusConnection(this, id, receive);
	};

	/**
	 * Close the transport.
	 */
	DistribusTransport.prototype.close = function() {
	  this.host.close();
	  this.host = null;
	};

	module.exports = DistribusTransport;


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var Connection = __webpack_require__(10);

	/**
	 * A local connection.
	 * @param {DistribusTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function DistribusConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // create a peer
	  var peer = this.transport.host.create(id);
	  peer.on('message', receive);

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	DistribusConnection.prototype.send = function (to, message) {
	  return this.transport.host.send(this.id, to, message);
	};

	/**
	 * Close the connection
	 */
	DistribusConnection.prototype.close = function () {
	  this.transport.host.remove(this.id);
	};

	module.exports = DistribusConnection;


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var http = __webpack_require__(30);
	var Promise = __webpack_require__(27);
	var Transport = __webpack_require__(9);
	var HTTPConnection = __webpack_require__(16);
	var uuid = __webpack_require__(28);

	/**
	 * HTTP Transport layer:
	 *
	 * Supported Options:
	 *
	 * {Number}  config.port              Port to listen on.
	 * {String}  config.path              Path, with or without leading and trailing slash (/)
	 * {Boolean} config.localShortcut     If the agentId exists locally, use local transport. (local)
	 *
	 * Address: http://127.0.0.1:PORTNUMBER/PATH
	 */
	function HTTPTransport(config) {
	  this.id = config && config.id || null;
	  this.networkId = null;

	  this.agents = {};
	  this.outstandingRequests = {}; // these are received messages that are expecting a response
	  this.outstandingMessages = {};

	  this.url =  config && config.url || "http://127.0.0.1:3000/agents/:id";
	  this.remoteUrl =  config && config.remoteUrl;
	  this.localShortcut = (config && config.localShortcut === false) ? false : true;

	  this.httpTimeout =         config && config.httpTimeout         || 2000; // 1 second - timeout to send message
	  this.httpResponseTimeout = config && config.httpResponseTimeout || 200;  // 0.5 second - timeout to expect reply after delivering request
	  this.regexHosts = /[http]{4}s?:\/\/([a-z\-\.A-Z0-9]*):?([0-9]*)(\/[a-z\/:A-Z0-9._\-% \\\(\)\*\+\.\^\$]*)/;
	  this.urlHostData = this.regexHosts.exec(this.url);

	  this.regexPath = this.getRegEx(this.urlHostData[3]);
	  this.port = config && config.port || this.urlHostData[2] || 3000;
	  this.path = this.urlHostData[3].replace(':id', '');

	  if (typeof window !== 'undefined') {
	    this.send = this.webSend;
	  }
	}

	HTTPTransport.prototype = new Transport();
	HTTPTransport.prototype.type = 'http';

	HTTPTransport.prototype.getRegEx = function(url) {
	  return new RegExp(url.replace(/[\\\(\)\*\+\.\^\$]/g,function(match) {return '\\' + match;}).replace(':id','([:a-zA-Z_0-9\-]*)'));
	};

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive  Invoked as receive(from, message)
	 * @return {HTTPConnection}   Returns a connection.
	 */
	HTTPTransport.prototype.connect = function(id, receive) {
	  if (this.server === undefined && typeof window === 'undefined') {
	    this.initiateServer();
	  }
	  this.outstandingRequests[id] = {};
	  this.outstandingMessages[id] = {};
	  return new HTTPConnection(this, id, receive);
	};

	/**
	 * Send a message to an agent
	 * @param {String} from    Id of sender
	 * @param {String} to      Id of addressed peer
	 * @param {String} message
	 */
	HTTPTransport.prototype.send = function(from, to, message) {
	  var me = this;
	  return new Promise(function (resolve,reject) {
	    var hostData = me.regexHosts.exec(to);
	    var fromRegexpCheck = me.regexPath.exec(from);
	    var fromAgentId = fromRegexpCheck[1];
	    var outstandingMessageID = uuid();

	    // check for local shortcut possibility
	    if (me.localShortcut == true) {
	      var toRegexpCheck = me.regexPath.exec(to);
	      var toAgentId = toRegexpCheck[1];
	      var toPath = hostData[3].replace(toAgentId,"");

	      // check if the "to" address is on the same URL, port and path as the "from"
	      if ((hostData[1] == '127.0.0.1'       && hostData[2] == me.urlHostData[2] && toPath == me.path) ||
	          (me.urlHostData[1] == hostData[1] && hostData[2] == me.urlHostData[2] && toPath == me.path)) {
	        // by definition true but check anyway
	        if (me.agents[toAgentId] !== undefined) {
	          me.agents[toAgentId](fromAgentId, message);
	          resolve();
	          return;
	        }
	      }
	    }

	    // stringify the message. If the message is an object, it can have an ID so it may be part of a req/rep.
	    if (typeof message == 'object') {
	      // check if the send is a reply to an outstanding request and if so, deliver
	      var outstanding = me.outstandingRequests[fromAgentId];
	      if (outstanding[message.id] !== undefined) {
	        var callback = outstanding[message.id];
	        callback.response.end(JSON.stringify(message));
	        clearTimeout(callback.timeout);
	        delete outstanding[message.id];
	        resolve();
	        return;
	      }
	      // stringify the message.
	      message = JSON.stringify(message)
	    }

	    // all post options
	    var options = {
	      host: hostData[1],
	      port: hostData[2],
	      path: hostData[3],
	      method: 'POST',
	      headers: {
	        'x-eve-senderurl' : from, // used to get senderID
	        'Content-type'    : 'text/plain'
	      }
	    };
	    var request = http.request(options, function(res) {
	      res.setEncoding('utf8');
	      // message was delivered, clear the cannot deliver timeout.
	      clearTimeout(me.outstandingMessages[fromAgentId][outstandingMessageID].timeout);
	      // listen to incoming data
	      res.on('data', function (response) {
	        var parsedResponse;
	        try {parsedResponse = JSON.parse(response);} catch (err) {parsedResponse = response;}
	        if (typeof parsedResponse == 'object') {
	          if (parsedResponse.__httpError__ !== undefined) {
	            reject(new Error(parsedResponse.__httpError__));
	            return;
	          }
	        }
	        me.agents[fromAgentId](to, parsedResponse);
	        resolve();
	      });
	    });

	    me.outstandingMessages[fromAgentId][outstandingMessageID] = {
	      timeout: setTimeout(function () {
	        request.abort();
	        reject(new Error("Cannot connect to " + to))
	      }, me.httpTimeout),
	      reject: reject
	    };

	    request.on('error', function(e) {
	      reject(e);
	    });

	    // write data to request body
	    request.write(message);
	    request.end();
	  });
	};


	/**
	 * Send a request to an url. Only for web.
	 * @param {String} from    Id of sender
	 * @param {String} to      Id of addressed peer
	 * @param {String} message
	 */
	HTTPTransport.prototype.webSend = function(from, to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    if (typeof message == 'object') {
	      message = JSON.stringify(message);
	    }
	    var fromRegexpCheck = me.regexPath.exec(from);
	    var fromAgentId = fromRegexpCheck[1];
	    // create XMLHttpRequest object to send the POST request
	    var http = new XMLHttpRequest();

	    // insert the callback function. This is called when the message has been delivered and a response has been received
	    http.onreadystatechange = function () {
	      if (http.readyState == 4 && http.status == 200) {
	        var response = "";
	        if (http.responseText.length > 0) {
	          response = JSON.parse(http.responseText);
	        }
	        me.agents[fromAgentId](to, response);
	        // launch callback function
	        resolve();
	      }
	      else if (http.readyState == 4) {
	        reject(new Error("http.status:" + http.status));
	      }
	    };

	    // open an asynchronous POST connection
	    http.open("POST", to, true);
	    // include header so the receiving code knows its a JSON object
	    http.setRequestHeader("Content-Type", "text/plain");
	    // send
	    http.send(message);
	  });
	};


	/**
	 * This is the HTTP equivalent of receiveMessage.
	 *
	 * @param request
	 * @param response
	 */
	HTTPTransport.prototype.processRequest = function(request, response) {
	  var url = request.url;

	  // define headers
	  var headers = {};
	  headers['Access-Control-Allow-Origin'] = '*';
	  headers['Access-Control-Allow-Credentials'] = true;
	  headers['Content-Type'] = 'text/plain';

	  var regexpCheck = this.regexPath.exec(url);
	  if (regexpCheck !== null) {
	    var agentId = regexpCheck[1];
	    var senderId = 'unknown';
	    if (request.headers['x-eve-senderurl'] !== undefined) {
	      senderId = request.headers['x-eve-senderurl'];
	    }
	    var body = '';
	    request.on('data', function (data) {
	      body += data;
	      if (body.length > 30e6) {        // 30e6 == 30MB
	        request.connection.destroy(); // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
	      }
	    });


	    var me = this;
	    request.on('end', function () {
	      var expectReply = false;
	      var message;
	      try {message = JSON.parse(body);} catch (err) {message = body;}

	      // check if JSON RPC
	      expectReply = message.jsonrpc && message.jsonrpc == '2.0' || expectReply;
	      // check if type == 'request'
	      expectReply = message.type && message.type == 'request' || expectReply;

	      response.writeHead(200, headers);
	      // construct callback
	      var callback = me.agents[agentId];
	      if (callback === undefined) {
	        var error = new Error('Agent: "' + agentId + '" does not exist.');
	        response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
	      }
	      else {
	        if (expectReply == true) {
	          me.outstandingRequests[agentId][message.id] = {
	            response: response,
	            timeout: setTimeout(function () {
	              response.end("timeout");
	              delete me.outstandingRequests[agentId][message.id];
	            }, me.httpResponseTimeout)
	          };
	          callback(senderId, message);
	        }
	        else {
	          // if we're not expecting a response, we first close the connection, then receive the message
	          response.end('');
	          if (callback !== undefined) {
	            callback(senderId, message);
	          }
	        }
	      }
	    });
	  }
	};

	/**
	 *  Configure a HTTP server listener
	 */
	HTTPTransport.prototype.initiateServer = function() {
	  if (this.server === undefined) {
	    var me = this;
	    this.server = http.createServer(function (request, response) {
	      if (request.method == 'OPTIONS') {
	        var headers = {};
	        headers['Access-Control-Allow-Origin'] = '*';
	        headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
	        headers['Access-Control-Allow-Credentials'] = true;
	        headers['Access-Control-Max-Age'] = '86400'; // 24 hours
	        headers['Access-Control-Allow-Headers'] = 'X-Requested-With, Access-Control-Allow-Origin, X-HTTP-Method-Override, Content-Type, Authorization, Accept';
	        // respond to the request
	        response.writeHead(200, headers);
	        response.end();
	      }
	      else if (request.method == 'POST') {
	        me.processRequest(request, response);
	      }
	    });

	    this.server.on('error', function(err) {
	      if (err.code == 'EADDRINUSE') {
	        throw new Error('ERROR: Could not start HTTP server. Port ' + me.port + ' is occupied.');
	      }
	      else {
	        throw new Error(err);
	      }
	    });

	    // Listen on port (default: 3000), IP defaults to 127.0.0.1
	    this.server.listen(this.port, function() {
	      // Put a friendly message on the terminal
	      console.log('Server listening at ', me.url);
	    });


	  }
	  else {
	    this.server.close();
	    this.server = undefined;
	    this.initiateServer();
	  }
	};


	/**
	 *  Close the HTTP server
	 */
	HTTPTransport.prototype.close = function() {
	  // close all open connections
	  for (var agentId in this.outstandingRequests) {
	    if (this.outstandingRequests.hasOwnProperty(agentId)) {
	      var agentRequests = this.outstandingRequests[agentId];
	      for (var messageId in agentRequests) {
	        if (agentRequests.hasOwnProperty(messageId)) {
	          var openMessage = agentRequests[messageId];
	          var error = new Error('Server shutting down.');
	          openMessage.response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
	        }
	      }
	    }
	  }
	  // close server
	  if (this.server) {
	    this.server.close();
	  }
	  this.server = null;
	};


	module.exports = HTTPTransport;



/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var Connection = __webpack_require__(10);

	/**
	 * A HTTP connection.
	 * @param {HTTPTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function HTTPConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // register the agents receive function
	  if (this.id in this.transport.agents) {
	    throw new Error('Agent with id ' + id + ' already exists');
	  }
	  this.transport.agents[this.id] = receive;

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 */
	HTTPConnection.prototype.send = function (to, message) {
	  var fromURL = this.transport.url.replace(':id', this.id);

	  var isURL = to.indexOf('://') !== -1;
	  var toURL;
	  if (isURL) {
	    toURL = to;
	  }
	  else {
	    if (this.transport.remoteUrl !== undefined) {
	      toURL = this.transport.remoteUrl.replace(':id', to);
	    }
	    else {
	      console.log('ERROR: no remote URL specified. Cannot send over HTTP.', to);
	    }
	  }

	  return this.transport.send(fromURL, toURL, message);
	};

	/**
	 * Close the connection
	 */
	HTTPConnection.prototype.close = function () {
	  delete this.transport.agents[this.id];
	};

	module.exports = HTTPConnection;


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Transport = __webpack_require__(9);
	var LocalConnection = __webpack_require__(18);

	/**
	 * Create a local transport.
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 * @constructor
	 */
	function LocalTransport(config) {
	  this.id = config && config.id || null;
	  this.networkId = this.id || null;
	  this['default'] = config && config['default'] || false;
	  this.agents = {};
	}

	LocalTransport.prototype = new Transport();

	LocalTransport.prototype.type = 'local';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive                  Invoked as receive(from, message)
	 * @return {LocalConnection} Returns a promise which resolves when
	 *                                                connected.
	 */
	LocalTransport.prototype.connect = function(id, receive) {
	  return new LocalConnection(this, id, receive);
	};

	/**
	 * Close the transport. Removes all agent connections.
	 */
	LocalTransport.prototype.close = function() {
	  this.agents = {};
	};

	module.exports = LocalTransport;


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var Connection = __webpack_require__(10);

	/**
	 * A local connection.
	 * @param {LocalTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function LocalConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // register the agents receive function
	  if (this.id in this.transport.agents) {
	    throw new Error('Agent with id ' + id + ' already exists');
	  }
	  this.transport.agents[this.id] = receive;

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	LocalConnection.prototype.send = function (to, message) {
	  var callback = this.transport.agents[to];
	  if (!callback) {
	    return Promise.reject(new Error('Agent with id ' + to + ' not found'));
	  }

	  // invoke the agents receiver as callback(from, message)
	  callback(this.id, message);

	  return Promise.resolve();
	};

	/**
	 * Close the connection
	 */
	LocalConnection.prototype.close = function () {
	  delete this.transport.agents[this.id];
	};

	module.exports = LocalConnection;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Transport = __webpack_require__(9);
	var PubNubConnection = __webpack_require__(20);

	/**
	 * Use pubnub as transport
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 *                                - `publish_key: string`. Required
	 *                                - `subscribe_key: string`. Required
	 * @constructor
	 */
	function PubNubTransport(config) {
	  this.id = config.id || null;
	  this.networkId = config.publish_key || null;
	  this['default'] = config['default'] || false;
	  this.pubnub = PUBNUB().init(config);
	}

	PubNubTransport.prototype = new Transport();

	PubNubTransport.prototype.type = 'pubnub';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive  Invoked as receive(from, message)
	 * @return {PubNubConnection} Returns a connection
	 */
	PubNubTransport.prototype.connect = function(id, receive) {
	  return new PubNubConnection(this, id, receive)
	};

	/**
	 * Close the transport.
	 */
	PubNubTransport.prototype.close = function() {
	  // FIXME: how to correctly close a pubnub connection?
	  this.pubnub = null;
	};

	/**
	 * Load the PubNub library
	 * @returns {Object} PUBNUB
	 */
	function PUBNUB() {
	  if (typeof window !== 'undefined') {
	    // browser
	    if (typeof window['PUBNUB'] === 'undefined') {
	      throw new Error('Please load pubnub first in the browser');
	    }
	    return window['PUBNUB'];
	  }
	  else {
	    // node.js
	    return __webpack_require__(32);
	  }
	}

	module.exports = PubNubTransport;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(27);
	var Connection = __webpack_require__(10);

	/**
	 * A connection. The connection is ready when the property .ready resolves.
	 * @param {PubNubTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function PubNubConnection(transport, id, receive) {
	  this.id = id;
	  this.transport = transport;

	  // ready state
	  var me = this;
	  this.ready = new Promise(function (resolve, reject) {
	    transport.pubnub.subscribe({
	      channel: id,
	      message: function (message) {
	        receive(message.from, message.message);
	      },
	      connect: function () {
	        resolve(me);
	      }
	    });
	  });
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	PubNubConnection.prototype.send = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    me.transport.pubnub.publish({
	      channel: to,
	      message: {
	        from: me.id,
	        to: to,
	        message: message
	      },
	      callback: resolve,
	      error: reject
	    });
	  });
	};

	/**
	 * Close the connection
	 */
	PubNubConnection.prototype.close = function () {
	  this.transport.pubnub.unsubscribe({
	    channel: this.id
	  });
	};

	module.exports = PubNubConnection;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var urlModule = __webpack_require__(31);
	var uuid = __webpack_require__(28);
	var Promise = __webpack_require__(27);
	var WebSocketServer = __webpack_require__(34).Server;

	var util = __webpack_require__(4);
	var Transport = __webpack_require__(9);
	var WebSocketConnection = __webpack_require__(22);

	/**
	 * Create a web socket transport.
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 *                                - `default: boolean`. Optional
	 *                                - `url: string`. Optional. If provided,
	 *                                  A WebSocket server is started on given
	 *                                  url.
	 *                                - `localShortcut: boolean`. Optional. If true
	 *                                  (default), messages to local agents are not
	 *                                  send via WebSocket but delivered immediately
	 *                                - `reconnectDelay: number` Optional. Delay in
	 *                                  milliseconds for reconnecting a broken
	 *                                  connection. 10000 ms by default. Connections
	 *                                  are only automatically reconnected after
	 *                                  there has been an established connection.
	 * @constructor
	 */
	function WebSocketTransport(config) {
	  this.id = config && config.id || null;
	  this.networkId = this.id || null;
	  this['default'] = config && config['default'] || false;
	  this.localShortcut = (config && config.localShortcut === false) ? false : true;
	  this.reconnectDelay = config && config.reconnectDelay || 10000;

	  this.httpTransport = config && config.httpTransport;

	  this.url = config && config.url || null;
	  this.server = null;

	  if (this.url != null) {
	    var urlParts = urlModule.parse(this.url);

	    if (urlParts.protocol != 'ws:') throw new Error('Invalid protocol, "ws:" expected');
	    if (this.url.indexOf(':id') == -1) throw new Error('":id" placeholder missing in url');

	    this.address = urlParts.protocol + '//' + urlParts.host; // the url without path, for example 'ws://localhost:3000'
	    this.ready = this._initServer(this.url);
	  }
	  else {
	    this.address = null;
	    this.ready = Promise.resolve(this);
	  }

	  this.agents = {}; // WebSocketConnections of all registered agents. The keys are the urls of the agents
	}

	WebSocketTransport.prototype = new Transport();

	WebSocketTransport.prototype.type = 'ws';

	/**
	 * Build an url for given id. Example:
	 *   var url = getUrl('agent1'); // 'ws://localhost:3000/agents/agent1'
	 * @param {String} id
	 * @return {String} Returns the url, or returns null when no url placeholder
	 *                  is defined.
	 */
	WebSocketTransport.prototype.getUrl = function (id) {
	  return this.url ? this.url.replace(':id', id) : null;
	};

	/**
	 * Initialize a server on given url
	 * @param {String} url    For example 'http://localhost:3000'
	 * @return {Promise} Returns a promise which resolves when the server is up
	 *                   and running
	 * @private
	 */
	WebSocketTransport.prototype._initServer = function (url) {
	  var urlParts = urlModule.parse(url);
	  var port = urlParts.port || 80;

	  var me = this;
	  return new Promise(function (resolve, reject) {
	    if (me.httpTransport !== undefined) {
	      console.log("WEBSOCKETS: using available server.");
	      me.server = new WebSocketServer({server: me.httpTransport.server}, function () {
	        resolve(me);
	      });
	    }
	    else {
	      me.server = new WebSocketServer({port: port}, function () {
	        resolve(me);
	      });
	    }


	    me.server.on('connection', me._onConnection.bind(me));

	    me.server.on('error', function (err) {
	      reject(err)
	    });
	  })
	};

	/**
	 * Handle a new connection. The connection is added to the addressed agent.
	 * @param {WebSocket} conn
	 * @private
	 */
	WebSocketTransport.prototype._onConnection = function (conn) {
	  var url = conn.upgradeReq.url;
	  var urlParts = urlModule.parse(url, true);
	  var toPath = urlParts.pathname;
	  var to = util.normalizeURL(this.address + toPath);

	  // read sender id from query parameters or generate a random uuid
	  var queryParams = urlParts.query;
	  var from = queryParams.id || uuid();
	  // TODO: make a config option to allow/disallow anonymous connections?
	  //console.log('onConnection, to=', to, ', from=', from, ', agents:', Object.keys(this.agents)); // TODO: cleanup

	  var agent = this.agents[to];
	  if (agent) {
	    agent._onConnection(from, conn);
	  }
	  else {
	    // reject the connection
	    // conn.send('Error: Agent with id "' + to + '" not found'); // TODO: can we send back a message before closing?
	    conn.close();
	  }
	};

	/**
	 * Connect an agent
	 * @param {string} id     The id or url of the agent. In case of an
	 *                        url, this url should match the url of the
	 *                        WebSocket server.
	 * @param {Function} receive                  Invoked as receive(from, message)
	 * @return {WebSocketConnection} Returns a promise which resolves when
	 *                                                connected.
	 */
	WebSocketTransport.prototype.connect = function(id, receive) {
	  var isURL = (id.indexOf('://') !== -1);

	  // FIXME: it's confusing right now what the final url will be based on the provided id...
	  var url = isURL ? id : (this.getUrl(id) || id);
	  if (url) url = util.normalizeURL(url);

	  // register the agents receive function
	  if (this.agents[url]) {
	    throw new Error('Agent with id ' + this.id + ' already exists');
	  }

	  var conn = new WebSocketConnection(this, url, receive);
	  this.agents[conn.url] = conn; // use conn.url, url can be changed when it was null

	  return conn;
	};

	/**
	 * Close the transport. Removes all agent connections.
	 */
	WebSocketTransport.prototype.close = function() {
	  // close all connections
	  for (var id in this.agents) {
	    if (this.agents.hasOwnProperty(id)) {
	      this.agents[id].close();
	    }
	  }
	  this.agents = {};

	  // close the server
	  if (this.server) {
	    this.server.close();
	  }
	};

	module.exports = WebSocketTransport;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(28);
	var Promise = __webpack_require__(27);
	var WebSocket = (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') ?
	    window.WebSocket :
	    __webpack_require__(34);

	var util = __webpack_require__(4);
	var Connection = __webpack_require__(10);

	/**
	 * A websocket connection.
	 * @param {WebSocketTransport} transport
	 * @param {string | number | null} url  The url of the agent. The url must match
	 *                                      the url of the WebSocket server.
	 *                                      If url is null, a UUID id is generated as url.
	 * @param {function} receive
	 * @constructor
	 */
	function WebSocketConnection(transport, url, receive) {
	  this.transport = transport;
	  this.url = url ? util.normalizeURL(url) : uuid();
	  this.receive = receive;

	  this.sockets = {};
	  this.closed = false;
	  this.reconnectTimers = {};

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to   The WebSocket url of the receiver
	 * @param {*} message
	 * @return {Promise} Returns a promise which resolves when the message is sent,
	 *                   and rejects when sending the message failed
	 */
	WebSocketConnection.prototype.send = function (to, message) {
	  //console.log('send', this.url, to, message); // TODO: cleanup

	  // deliver locally when possible
	  if (this.transport.localShortcut) {
	    var agent = this.transport.agents[to];
	    if (agent) {
	      try {
	        agent.receive(this.url, message);
	        return Promise.resolve();
	      }
	      catch (err) {
	        return Promise.reject(err);
	      }
	    }
	  }

	  // get or create a connection
	  var conn = this.sockets[to];
	  if (conn) {
	    try {
	      if (conn.readyState == conn.CONNECTING) {
	        // the connection is still opening
	        return new Promise(function (resolve, reject) {
	          //console.log(conn.onopen)//, conn.onopen.callback)
	          conn.onopen.callbacks.push(function () {
	            conn.send(JSON.stringify(message));
	            resolve();
	          })
	        });
	      }
	      else if (conn.readyState == conn.OPEN) {
	        conn.send(JSON.stringify(message));
	        return Promise.resolve();
	      }
	      else {
	        // remove the connection
	        conn = null;
	      }
	    }
	    catch (err) {
	      return Promise.reject(err);
	    }
	  }

	  if (!conn) {
	    // try to open a connection
	    var me = this;
	    return new Promise(function (resolve, reject) {
	      me._connect(to, function (conn) {
	        conn.send(JSON.stringify(message));
	        resolve();
	      }, function (err) {
	        reject(new Error('Failed to connect to agent "' + to + '"'));
	      });
	    })
	  }
	};

	/**
	 * Open a websocket connection to an other agent. No messages are sent.
	 * @param {string} to  Url of the remote agent.
	 * @returns {Promise.<WebSocketConnection, Error>}
	 *              Returns a promise which resolves when the connection is
	 *              established and rejects in case of an error.
	 */
	WebSocketConnection.prototype.connect = function (to) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    me._connect(to, function () {
	      resolve(me);
	    }, reject);
	  });
	};

	/**
	 * Open a websocket connection
	 * @param {String} to   Url of the remote agent
	 * @param {function} [callback]
	 * @param {function} [errback]
	 * @param {boolean} [doReconnect=false]
	 * @returns {WebSocket}
	 * @private
	 */
	WebSocketConnection.prototype._connect = function (to, callback, errback, doReconnect) {
	  var me = this;
	  var conn = new WebSocket(to + '?id=' + this.url);

	  // register the new socket
	  me.sockets[to] = conn;

	  conn.onopen = function () {
	    // Change doReconnect to true as soon as we have had an open connection
	    doReconnect = true;

	    conn.onopen.callbacks.forEach(function (cb) {
	      cb(conn);
	    });
	    conn.onopen.callbacks = [];
	  };
	  conn.onopen.callbacks = callback ? [callback] : [];

	  conn.onmessage = function (event) {
	    me.receive(to, JSON.parse(event.data));
	  };

	  conn.onclose = function () {
	    delete me.sockets[to];
	    if (doReconnect) {
	      me._reconnect(to);
	    }
	  };

	  conn.onerror = function (err) {
	    delete me.sockets[to];
	    if (errback) {
	      errback(err);
	    }
	  };

	  return conn;
	};

	/**
	 * Auto reconnect a broken connection
	 * @param {String} to   Url of the remote agent
	 * @private
	 */
	WebSocketConnection.prototype._reconnect = function (to) {
	  var me = this;
	  var doReconnect = true;
	  if (me.closed == false && me.reconnectTimers[to] == null) {
	    me.reconnectTimers[to] = setTimeout(function () {
	      delete me.reconnectTimers[to];
	      me._connect(to, null, null, doReconnect);
	    }, me.transport.reconnectDelay);
	  }
	};

	/**
	 * Register a websocket connection
	 * @param {String} from       Url of the remote agent
	 * @param {WebSocket} conn    WebSocket connection
	 * @returns {WebSocket}       Returns the websocket itself
	 * @private
	 */
	WebSocketConnection.prototype._onConnection = function (from, conn) {
	  var me = this;

	  conn.onmessage = function (event) {
	    me.receive(from, JSON.parse(event.data));
	  };

	  conn.onclose = function () {
	    // remove this connection from the sockets list
	    delete me.sockets[from];
	  };

	  conn.onerror = function (err) {
	    // TODO: what to do with errors?
	    delete me.sockets[from];
	  };

	  if (this.sockets[from]) {
	    // there is already a connection open with remote agent
	    // TODO: what to do with overwriting existing sockets?
	    this.sockets[from].close();
	  }

	  // register new connection
	  this.sockets[from] = conn;

	  return conn;
	};

	/**
	 * Get a list with all open sockets
	 * @return {String[]} Returns all open sockets
	 */
	WebSocketConnection.prototype.list = function () {
	  return Object.keys(this.sockets);
	};

	/**
	 * Close the connection. All open sockets will be closed and the agent will
	 * be unregistered from the WebSocketTransport.
	 */
	WebSocketConnection.prototype.close = function () {
	  this.closed = true;

	  // close all connections
	  for (var id in this.sockets) {
	    if (this.sockets.hasOwnProperty(id)) {
	      this.sockets[id].close();
	    }
	  }
	  this.sockets = {};

	  delete this.transport.agents[this.url];
	};

	module.exports = WebSocketConnection;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_23__;

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(33);


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var width = 256;// each RC4 output is 0 <= x < 256
	var chunks = 6;// at least six RC4 outputs for each double
	var digits = 52;// there are 52 significant digits in a double
	var pool = [];// pool: entropy pool starts empty
	var GLOBAL = typeof global === 'undefined' ? window : global;

	//
	// The following constants are related to IEEE 754 limits.
	//
	var startdenom = Math.pow(width, chunks),
	    significance = Math.pow(2, digits),
	    overflow = significance * 2,
	    mask = width - 1;


	var oldRandom = Math.random;

	//
	// seedrandom()
	// This is the seedrandom function described above.
	//
	module.exports = function(seed, options) {
	  if (options && options.global === true) {
	    options.global = false;
	    Math.random = module.exports(seed, options);
	    options.global = true;
	    return Math.random;
	  }
	  var use_entropy = (options && options.entropy) || false;
	  var key = [];

	  // Flatten the seed string or build one from local entropy if needed.
	  var shortseed = mixkey(flatten(
	    use_entropy ? [seed, tostring(pool)] :
	    0 in arguments ? seed : autoseed(), 3), key);

	  // Use the seed to initialize an ARC4 generator.
	  var arc4 = new ARC4(key);

	  // Mix the randomness into accumulated entropy.
	  mixkey(tostring(arc4.S), pool);

	  // Override Math.random

	  // This function returns a random double in [0, 1) that contains
	  // randomness in every bit of the mantissa of the IEEE 754 value.

	  return function() {         // Closure to return a random double:
	    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
	        d = startdenom,                 //   and denominator d = 2 ^ 48.
	        x = 0;                          //   and no 'extra last byte'.
	    while (n < significance) {          // Fill up all significant digits by
	      n = (n + x) * width;              //   shifting numerator and
	      d *= width;                       //   denominator and generating a
	      x = arc4.g(1);                    //   new least-significant-byte.
	    }
	    while (n >= overflow) {             // To avoid rounding up, before adding
	      n /= 2;                           //   last byte, shift everything
	      d /= 2;                           //   right using integer Math until
	      x >>>= 1;                         //   we have exactly the desired bits.
	    }
	    return (n + x) / d;                 // Form the number within [0, 1).
	  };
	};

	module.exports.resetGlobal = function () {
	  Math.random = oldRandom;
	};

	//
	// ARC4
	//
	// An ARC4 implementation.  The constructor takes a key in the form of
	// an array of at most (width) integers that should be 0 <= x < (width).
	//
	// The g(count) method returns a pseudorandom integer that concatenates
	// the next (count) outputs from ARC4.  Its return value is a number x
	// that is in the range 0 <= x < (width ^ count).
	//
	/** @constructor */
	function ARC4(key) {
	  var t, keylen = key.length,
	      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

	  // The empty key [] is treated as [0].
	  if (!keylen) { key = [keylen++]; }

	  // Set up S using the standard key scheduling algorithm.
	  while (i < width) {
	    s[i] = i++;
	  }
	  for (i = 0; i < width; i++) {
	    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
	    s[j] = t;
	  }

	  // The "g" method returns the next (count) outputs as one number.
	  (me.g = function(count) {
	    // Using instance members instead of closure state nearly doubles speed.
	    var t, r = 0,
	        i = me.i, j = me.j, s = me.S;
	    while (count--) {
	      t = s[i = mask & (i + 1)];
	      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
	    }
	    me.i = i; me.j = j;
	    return r;
	    // For robust unpredictability discard an initial batch of values.
	    // See http://www.rsa.com/rsalabs/node.asp?id=2009
	  })(width);
	}

	//
	// flatten()
	// Converts an object tree to nested arrays of strings.
	//
	function flatten(obj, depth) {
	  var result = [], typ = (typeof obj)[0], prop;
	  if (depth && typ == 'o') {
	    for (prop in obj) {
	      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
	    }
	  }
	  return (result.length ? result : typ == 's' ? obj : obj + '\0');
	}

	//
	// mixkey()
	// Mixes a string seed into a key that is an array of integers, and
	// returns a shortened string seed that is equivalent to the result key.
	//
	function mixkey(seed, key) {
	  var stringseed = seed + '', smear, j = 0;
	  while (j < stringseed.length) {
	    key[mask & j] =
	      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
	  }
	  return tostring(key);
	}

	//
	// autoseed()
	// Returns an object for autoseeding, using window.crypto if available.
	//
	/** @param {Uint8Array=} seed */
	function autoseed(seed) {
	  try {
	    GLOBAL.crypto.getRandomValues(seed = new Uint8Array(width));
	    return tostring(seed);
	  } catch (e) {
	    return [+new Date, GLOBAL, GLOBAL.navigator && GLOBAL.navigator.plugins,
	            GLOBAL.screen, tostring(pool)];
	  }
	}

	//
	// tostring()
	// Converts an array of charcodes to a string
	//
	function tostring(a) {
	  return String.fromCharCode.apply(0, a);
	}

	//
	// When seedrandom.js is loaded, we immediately mix a few bits
	// from the built-in RNG into the entropy pool.  Because we do
	// not want to intefere with determinstic PRNG state later,
	// seedrandom will not call Math.random on its own again after
	// initialization.
	//
	mixkey(Math.random(), pool);
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(39);


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(35)
	__webpack_require__(36)
	__webpack_require__(37)
	__webpack_require__(38)

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	
	exports = module.exports = function() {
		var ret = '', value;
		for (var i = 0; i < 32; i++) {
			value = exports.random() * 16 | 0;
			// Insert the hypens
			if (i > 4 && i < 21 && ! (i % 4)) {
				ret += '-';
			}
			// Add the next random character
			ret += (
				(i === 12) ? 4 : (
					(i === 16) ? (value & 3 | 8) : value
				)
			).toString(16);
		}
		return ret;
	};

	var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
	exports.isUUID = function(uuid) {
		return uuidRegex.test(uuid);
	};

	exports.random = function() {
		return Math.random();
	};



/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	exports.Host    = __webpack_require__(40);
	exports.Promise = __webpack_require__(41);


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	var http = module.exports;
	var EventEmitter = __webpack_require__(44).EventEmitter;
	var Request = __webpack_require__(42);
	var url = __webpack_require__(31)

	http.request = function (params, cb) {
	    if (typeof params === 'string') {
	        params = url.parse(params)
	    }
	    if (!params) params = {};
	    if (!params.host && !params.port) {
	        params.port = parseInt(window.location.port, 10);
	    }
	    if (!params.host && params.hostname) {
	        params.host = params.hostname;
	    }

	    if (!params.protocol) {
	        if (params.scheme) {
	            params.protocol = params.scheme + ':';
	        } else {
	            params.protocol = window.location.protocol;
	        }
	    }

	    if (!params.host) {
	        params.host = window.location.hostname || window.location.host;
	    }
	    if (/:/.test(params.host)) {
	        if (!params.port) {
	            params.port = params.host.split(':')[1];
	        }
	        params.host = params.host.split(':')[0];
	    }
	    if (!params.port) params.port = params.protocol == 'https:' ? 443 : 80;
	    
	    var req = new Request(new xhrHttp, params);
	    if (cb) req.on('response', cb);
	    return req;
	};

	http.get = function (params, cb) {
	    params.method = 'GET';
	    var req = http.request(params, cb);
	    req.end();
	    return req;
	};

	http.Agent = function () {};
	http.Agent.defaultMaxSockets = 4;

	var xhrHttp = (function () {
	    if (typeof window === 'undefined') {
	        throw new Error('no window object present');
	    }
	    else if (window.XMLHttpRequest) {
	        return window.XMLHttpRequest;
	    }
	    else if (window.ActiveXObject) {
	        var axs = [
	            'Msxml2.XMLHTTP.6.0',
	            'Msxml2.XMLHTTP.3.0',
	            'Microsoft.XMLHTTP'
	        ];
	        for (var i = 0; i < axs.length; i++) {
	            try {
	                var ax = new(window.ActiveXObject)(axs[i]);
	                return function () {
	                    if (ax) {
	                        var ax_ = ax;
	                        ax = null;
	                        return ax_;
	                    }
	                    else {
	                        return new(window.ActiveXObject)(axs[i]);
	                    }
	                };
	            }
	            catch (e) {}
	        }
	        throw new Error('ajax not supported in this browser')
	    }
	    else {
	        throw new Error('ajax not supported in this browser');
	    }
	})();

	http.STATUS_CODES = {
	    100 : 'Continue',
	    101 : 'Switching Protocols',
	    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
	    200 : 'OK',
	    201 : 'Created',
	    202 : 'Accepted',
	    203 : 'Non-Authoritative Information',
	    204 : 'No Content',
	    205 : 'Reset Content',
	    206 : 'Partial Content',
	    207 : 'Multi-Status',               // RFC 4918
	    300 : 'Multiple Choices',
	    301 : 'Moved Permanently',
	    302 : 'Moved Temporarily',
	    303 : 'See Other',
	    304 : 'Not Modified',
	    305 : 'Use Proxy',
	    307 : 'Temporary Redirect',
	    400 : 'Bad Request',
	    401 : 'Unauthorized',
	    402 : 'Payment Required',
	    403 : 'Forbidden',
	    404 : 'Not Found',
	    405 : 'Method Not Allowed',
	    406 : 'Not Acceptable',
	    407 : 'Proxy Authentication Required',
	    408 : 'Request Time-out',
	    409 : 'Conflict',
	    410 : 'Gone',
	    411 : 'Length Required',
	    412 : 'Precondition Failed',
	    413 : 'Request Entity Too Large',
	    414 : 'Request-URI Too Large',
	    415 : 'Unsupported Media Type',
	    416 : 'Requested Range Not Satisfiable',
	    417 : 'Expectation Failed',
	    418 : 'I\'m a teapot',              // RFC 2324
	    422 : 'Unprocessable Entity',       // RFC 4918
	    423 : 'Locked',                     // RFC 4918
	    424 : 'Failed Dependency',          // RFC 4918
	    425 : 'Unordered Collection',       // RFC 4918
	    426 : 'Upgrade Required',           // RFC 2817
	    428 : 'Precondition Required',      // RFC 6585
	    429 : 'Too Many Requests',          // RFC 6585
	    431 : 'Request Header Fields Too Large',// RFC 6585
	    500 : 'Internal Server Error',
	    501 : 'Not Implemented',
	    502 : 'Bad Gateway',
	    503 : 'Service Unavailable',
	    504 : 'Gateway Time-out',
	    505 : 'HTTP Version Not Supported',
	    506 : 'Variant Also Negotiates',    // RFC 2295
	    507 : 'Insufficient Storage',       // RFC 4918
	    509 : 'Bandwidth Limit Exceeded',
	    510 : 'Not Extended',               // RFC 2774
	    511 : 'Network Authentication Required' // RFC 6585
	};

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var punycode = __webpack_require__(54);

	exports.parse = urlParse;
	exports.resolve = urlResolve;
	exports.resolveObject = urlResolveObject;
	exports.format = urlFormat;

	exports.Url = Url;

	function Url() {
	  this.protocol = null;
	  this.slashes = null;
	  this.auth = null;
	  this.host = null;
	  this.port = null;
	  this.hostname = null;
	  this.hash = null;
	  this.search = null;
	  this.query = null;
	  this.pathname = null;
	  this.path = null;
	  this.href = null;
	}

	// Reference: RFC 3986, RFC 1808, RFC 2396

	// define these here so at least they only have to be
	// compiled once on the first module load.
	var protocolPattern = /^([a-z0-9.+-]+:)/i,
	    portPattern = /:[0-9]*$/,

	    // RFC 2396: characters reserved for delimiting URLs.
	    // We actually just auto-escape these.
	    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

	    // RFC 2396: characters not allowed for various reasons.
	    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

	    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
	    autoEscape = ['\''].concat(unwise),
	    // Characters that are never ever allowed in a hostname.
	    // Note that any invalid chars are also handled, but these
	    // are the ones that are *expected* to be seen, so we fast-path
	    // them.
	    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
	    hostEndingChars = ['/', '?', '#'],
	    hostnameMaxLen = 255,
	    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
	    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
	    // protocols that can allow "unsafe" and "unwise" chars.
	    unsafeProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that never have a hostname.
	    hostlessProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that always contain a // bit.
	    slashedProtocol = {
	      'http': true,
	      'https': true,
	      'ftp': true,
	      'gopher': true,
	      'file': true,
	      'http:': true,
	      'https:': true,
	      'ftp:': true,
	      'gopher:': true,
	      'file:': true
	    },
	    querystring = __webpack_require__(45);

	function urlParse(url, parseQueryString, slashesDenoteHost) {
	  if (url && isObject(url) && url instanceof Url) return url;

	  var u = new Url;
	  u.parse(url, parseQueryString, slashesDenoteHost);
	  return u;
	}

	Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
	  if (!isString(url)) {
	    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
	  }

	  var rest = url;

	  // trim before proceeding.
	  // This is to support parse stuff like "  http://foo.com  \n"
	  rest = rest.trim();

	  var proto = protocolPattern.exec(rest);
	  if (proto) {
	    proto = proto[0];
	    var lowerProto = proto.toLowerCase();
	    this.protocol = lowerProto;
	    rest = rest.substr(proto.length);
	  }

	  // figure out if it's got a host
	  // user@server is *always* interpreted as a hostname, and url
	  // resolution will treat //foo/bar as host=foo,path=bar because that's
	  // how the browser resolves relative URLs.
	  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
	    var slashes = rest.substr(0, 2) === '//';
	    if (slashes && !(proto && hostlessProtocol[proto])) {
	      rest = rest.substr(2);
	      this.slashes = true;
	    }
	  }

	  if (!hostlessProtocol[proto] &&
	      (slashes || (proto && !slashedProtocol[proto]))) {

	    // there's a hostname.
	    // the first instance of /, ?, ;, or # ends the host.
	    //
	    // If there is an @ in the hostname, then non-host chars *are* allowed
	    // to the left of the last @ sign, unless some host-ending character
	    // comes *before* the @-sign.
	    // URLs are obnoxious.
	    //
	    // ex:
	    // http://a@b@c/ => user:a@b host:c
	    // http://a@b?@c => user:a host:c path:/?@c

	    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
	    // Review our test case against browsers more comprehensively.

	    // find the first instance of any hostEndingChars
	    var hostEnd = -1;
	    for (var i = 0; i < hostEndingChars.length; i++) {
	      var hec = rest.indexOf(hostEndingChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }

	    // at this point, either we have an explicit point where the
	    // auth portion cannot go past, or the last @ char is the decider.
	    var auth, atSign;
	    if (hostEnd === -1) {
	      // atSign can be anywhere.
	      atSign = rest.lastIndexOf('@');
	    } else {
	      // atSign must be in auth portion.
	      // http://a@b/c@d => host:b auth:a path:/c@d
	      atSign = rest.lastIndexOf('@', hostEnd);
	    }

	    // Now we have a portion which is definitely the auth.
	    // Pull that off.
	    if (atSign !== -1) {
	      auth = rest.slice(0, atSign);
	      rest = rest.slice(atSign + 1);
	      this.auth = decodeURIComponent(auth);
	    }

	    // the host is the remaining to the left of the first non-host char
	    hostEnd = -1;
	    for (var i = 0; i < nonHostChars.length; i++) {
	      var hec = rest.indexOf(nonHostChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }
	    // if we still have not hit it, then the entire thing is a host.
	    if (hostEnd === -1)
	      hostEnd = rest.length;

	    this.host = rest.slice(0, hostEnd);
	    rest = rest.slice(hostEnd);

	    // pull out port.
	    this.parseHost();

	    // we've indicated that there is a hostname,
	    // so even if it's empty, it has to be present.
	    this.hostname = this.hostname || '';

	    // if hostname begins with [ and ends with ]
	    // assume that it's an IPv6 address.
	    var ipv6Hostname = this.hostname[0] === '[' &&
	        this.hostname[this.hostname.length - 1] === ']';

	    // validate a little.
	    if (!ipv6Hostname) {
	      var hostparts = this.hostname.split(/\./);
	      for (var i = 0, l = hostparts.length; i < l; i++) {
	        var part = hostparts[i];
	        if (!part) continue;
	        if (!part.match(hostnamePartPattern)) {
	          var newpart = '';
	          for (var j = 0, k = part.length; j < k; j++) {
	            if (part.charCodeAt(j) > 127) {
	              // we replace non-ASCII char with a temporary placeholder
	              // we need this to make sure size of hostname is not
	              // broken by replacing non-ASCII by nothing
	              newpart += 'x';
	            } else {
	              newpart += part[j];
	            }
	          }
	          // we test again with ASCII char only
	          if (!newpart.match(hostnamePartPattern)) {
	            var validParts = hostparts.slice(0, i);
	            var notHost = hostparts.slice(i + 1);
	            var bit = part.match(hostnamePartStart);
	            if (bit) {
	              validParts.push(bit[1]);
	              notHost.unshift(bit[2]);
	            }
	            if (notHost.length) {
	              rest = '/' + notHost.join('.') + rest;
	            }
	            this.hostname = validParts.join('.');
	            break;
	          }
	        }
	      }
	    }

	    if (this.hostname.length > hostnameMaxLen) {
	      this.hostname = '';
	    } else {
	      // hostnames are always lower case.
	      this.hostname = this.hostname.toLowerCase();
	    }

	    if (!ipv6Hostname) {
	      // IDNA Support: Returns a puny coded representation of "domain".
	      // It only converts the part of the domain name that
	      // has non ASCII characters. I.e. it dosent matter if
	      // you call it with a domain that already is in ASCII.
	      var domainArray = this.hostname.split('.');
	      var newOut = [];
	      for (var i = 0; i < domainArray.length; ++i) {
	        var s = domainArray[i];
	        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
	            'xn--' + punycode.encode(s) : s);
	      }
	      this.hostname = newOut.join('.');
	    }

	    var p = this.port ? ':' + this.port : '';
	    var h = this.hostname || '';
	    this.host = h + p;
	    this.href += this.host;

	    // strip [ and ] from the hostname
	    // the host field still retains them, though
	    if (ipv6Hostname) {
	      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
	      if (rest[0] !== '/') {
	        rest = '/' + rest;
	      }
	    }
	  }

	  // now rest is set to the post-host stuff.
	  // chop off any delim chars.
	  if (!unsafeProtocol[lowerProto]) {

	    // First, make 100% sure that any "autoEscape" chars get
	    // escaped, even if encodeURIComponent doesn't think they
	    // need to be.
	    for (var i = 0, l = autoEscape.length; i < l; i++) {
	      var ae = autoEscape[i];
	      var esc = encodeURIComponent(ae);
	      if (esc === ae) {
	        esc = escape(ae);
	      }
	      rest = rest.split(ae).join(esc);
	    }
	  }


	  // chop off from the tail first.
	  var hash = rest.indexOf('#');
	  if (hash !== -1) {
	    // got a fragment string.
	    this.hash = rest.substr(hash);
	    rest = rest.slice(0, hash);
	  }
	  var qm = rest.indexOf('?');
	  if (qm !== -1) {
	    this.search = rest.substr(qm);
	    this.query = rest.substr(qm + 1);
	    if (parseQueryString) {
	      this.query = querystring.parse(this.query);
	    }
	    rest = rest.slice(0, qm);
	  } else if (parseQueryString) {
	    // no query string, but parseQueryString still requested
	    this.search = '';
	    this.query = {};
	  }
	  if (rest) this.pathname = rest;
	  if (slashedProtocol[lowerProto] &&
	      this.hostname && !this.pathname) {
	    this.pathname = '/';
	  }

	  //to support http.request
	  if (this.pathname || this.search) {
	    var p = this.pathname || '';
	    var s = this.search || '';
	    this.path = p + s;
	  }

	  // finally, reconstruct the href based on what has been validated.
	  this.href = this.format();
	  return this;
	};

	// format a parsed object into a url string
	function urlFormat(obj) {
	  // ensure it's an object, and not a string url.
	  // If it's an obj, this is a no-op.
	  // this way, you can call url_format() on strings
	  // to clean up potentially wonky urls.
	  if (isString(obj)) obj = urlParse(obj);
	  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
	  return obj.format();
	}

	Url.prototype.format = function() {
	  var auth = this.auth || '';
	  if (auth) {
	    auth = encodeURIComponent(auth);
	    auth = auth.replace(/%3A/i, ':');
	    auth += '@';
	  }

	  var protocol = this.protocol || '',
	      pathname = this.pathname || '',
	      hash = this.hash || '',
	      host = false,
	      query = '';

	  if (this.host) {
	    host = auth + this.host;
	  } else if (this.hostname) {
	    host = auth + (this.hostname.indexOf(':') === -1 ?
	        this.hostname :
	        '[' + this.hostname + ']');
	    if (this.port) {
	      host += ':' + this.port;
	    }
	  }

	  if (this.query &&
	      isObject(this.query) &&
	      Object.keys(this.query).length) {
	    query = querystring.stringify(this.query);
	  }

	  var search = this.search || (query && ('?' + query)) || '';

	  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

	  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
	  // unless they had them to begin with.
	  if (this.slashes ||
	      (!protocol || slashedProtocol[protocol]) && host !== false) {
	    host = '//' + (host || '');
	    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
	  } else if (!host) {
	    host = '';
	  }

	  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
	  if (search && search.charAt(0) !== '?') search = '?' + search;

	  pathname = pathname.replace(/[?#]/g, function(match) {
	    return encodeURIComponent(match);
	  });
	  search = search.replace('#', '%23');

	  return protocol + host + pathname + search + hash;
	};

	function urlResolve(source, relative) {
	  return urlParse(source, false, true).resolve(relative);
	}

	Url.prototype.resolve = function(relative) {
	  return this.resolveObject(urlParse(relative, false, true)).format();
	};

	function urlResolveObject(source, relative) {
	  if (!source) return relative;
	  return urlParse(source, false, true).resolveObject(relative);
	}

	Url.prototype.resolveObject = function(relative) {
	  if (isString(relative)) {
	    var rel = new Url();
	    rel.parse(relative, false, true);
	    relative = rel;
	  }

	  var result = new Url();
	  Object.keys(this).forEach(function(k) {
	    result[k] = this[k];
	  }, this);

	  // hash is always overridden, no matter what.
	  // even href="" will remove it.
	  result.hash = relative.hash;

	  // if the relative url is empty, then there's nothing left to do here.
	  if (relative.href === '') {
	    result.href = result.format();
	    return result;
	  }

	  // hrefs like //foo/bar always cut to the protocol.
	  if (relative.slashes && !relative.protocol) {
	    // take everything except the protocol from relative
	    Object.keys(relative).forEach(function(k) {
	      if (k !== 'protocol')
	        result[k] = relative[k];
	    });

	    //urlParse appends trailing / to urls like http://www.example.com
	    if (slashedProtocol[result.protocol] &&
	        result.hostname && !result.pathname) {
	      result.path = result.pathname = '/';
	    }

	    result.href = result.format();
	    return result;
	  }

	  if (relative.protocol && relative.protocol !== result.protocol) {
	    // if it's a known url protocol, then changing
	    // the protocol does weird things
	    // first, if it's not file:, then we MUST have a host,
	    // and if there was a path
	    // to begin with, then we MUST have a path.
	    // if it is file:, then the host is dropped,
	    // because that's known to be hostless.
	    // anything else is assumed to be absolute.
	    if (!slashedProtocol[relative.protocol]) {
	      Object.keys(relative).forEach(function(k) {
	        result[k] = relative[k];
	      });
	      result.href = result.format();
	      return result;
	    }

	    result.protocol = relative.protocol;
	    if (!relative.host && !hostlessProtocol[relative.protocol]) {
	      var relPath = (relative.pathname || '').split('/');
	      while (relPath.length && !(relative.host = relPath.shift()));
	      if (!relative.host) relative.host = '';
	      if (!relative.hostname) relative.hostname = '';
	      if (relPath[0] !== '') relPath.unshift('');
	      if (relPath.length < 2) relPath.unshift('');
	      result.pathname = relPath.join('/');
	    } else {
	      result.pathname = relative.pathname;
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    result.host = relative.host || '';
	    result.auth = relative.auth;
	    result.hostname = relative.hostname || relative.host;
	    result.port = relative.port;
	    // to support http.request
	    if (result.pathname || result.search) {
	      var p = result.pathname || '';
	      var s = result.search || '';
	      result.path = p + s;
	    }
	    result.slashes = result.slashes || relative.slashes;
	    result.href = result.format();
	    return result;
	  }

	  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
	      isRelAbs = (
	          relative.host ||
	          relative.pathname && relative.pathname.charAt(0) === '/'
	      ),
	      mustEndAbs = (isRelAbs || isSourceAbs ||
	                    (result.host && relative.pathname)),
	      removeAllDots = mustEndAbs,
	      srcPath = result.pathname && result.pathname.split('/') || [],
	      relPath = relative.pathname && relative.pathname.split('/') || [],
	      psychotic = result.protocol && !slashedProtocol[result.protocol];

	  // if the url is a non-slashed url, then relative
	  // links like ../.. should be able
	  // to crawl up to the hostname, as well.  This is strange.
	  // result.protocol has already been set by now.
	  // Later on, put the first path part into the host field.
	  if (psychotic) {
	    result.hostname = '';
	    result.port = null;
	    if (result.host) {
	      if (srcPath[0] === '') srcPath[0] = result.host;
	      else srcPath.unshift(result.host);
	    }
	    result.host = '';
	    if (relative.protocol) {
	      relative.hostname = null;
	      relative.port = null;
	      if (relative.host) {
	        if (relPath[0] === '') relPath[0] = relative.host;
	        else relPath.unshift(relative.host);
	      }
	      relative.host = null;
	    }
	    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
	  }

	  if (isRelAbs) {
	    // it's absolute.
	    result.host = (relative.host || relative.host === '') ?
	                  relative.host : result.host;
	    result.hostname = (relative.hostname || relative.hostname === '') ?
	                      relative.hostname : result.hostname;
	    result.search = relative.search;
	    result.query = relative.query;
	    srcPath = relPath;
	    // fall through to the dot-handling below.
	  } else if (relPath.length) {
	    // it's relative
	    // throw away the existing file, and take the new path instead.
	    if (!srcPath) srcPath = [];
	    srcPath.pop();
	    srcPath = srcPath.concat(relPath);
	    result.search = relative.search;
	    result.query = relative.query;
	  } else if (!isNullOrUndefined(relative.search)) {
	    // just pull out the search.
	    // like href='?foo'.
	    // Put this after the other two cases because it simplifies the booleans
	    if (psychotic) {
	      result.hostname = result.host = srcPath.shift();
	      //occationaly the auth can get stuck only in host
	      //this especialy happens in cases like
	      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	      var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                       result.host.split('@') : false;
	      if (authInHost) {
	        result.auth = authInHost.shift();
	        result.host = result.hostname = authInHost.shift();
	      }
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    //to support http.request
	    if (!isNull(result.pathname) || !isNull(result.search)) {
	      result.path = (result.pathname ? result.pathname : '') +
	                    (result.search ? result.search : '');
	    }
	    result.href = result.format();
	    return result;
	  }

	  if (!srcPath.length) {
	    // no path at all.  easy.
	    // we've already handled the other stuff above.
	    result.pathname = null;
	    //to support http.request
	    if (result.search) {
	      result.path = '/' + result.search;
	    } else {
	      result.path = null;
	    }
	    result.href = result.format();
	    return result;
	  }

	  // if a url ENDs in . or .., then it must get a trailing slash.
	  // however, if it ends in anything else non-slashy,
	  // then it must NOT get a trailing slash.
	  var last = srcPath.slice(-1)[0];
	  var hasTrailingSlash = (
	      (result.host || relative.host) && (last === '.' || last === '..') ||
	      last === '');

	  // strip single dots, resolve double dots to parent dir
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = srcPath.length; i >= 0; i--) {
	    last = srcPath[i];
	    if (last == '.') {
	      srcPath.splice(i, 1);
	    } else if (last === '..') {
	      srcPath.splice(i, 1);
	      up++;
	    } else if (up) {
	      srcPath.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (!mustEndAbs && !removeAllDots) {
	    for (; up--; up) {
	      srcPath.unshift('..');
	    }
	  }

	  if (mustEndAbs && srcPath[0] !== '' &&
	      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
	    srcPath.unshift('');
	  }

	  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
	    srcPath.push('');
	  }

	  var isAbsolute = srcPath[0] === '' ||
	      (srcPath[0] && srcPath[0].charAt(0) === '/');

	  // put the host back
	  if (psychotic) {
	    result.hostname = result.host = isAbsolute ? '' :
	                                    srcPath.length ? srcPath.shift() : '';
	    //occationaly the auth can get stuck only in host
	    //this especialy happens in cases like
	    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	    var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                     result.host.split('@') : false;
	    if (authInHost) {
	      result.auth = authInHost.shift();
	      result.host = result.hostname = authInHost.shift();
	    }
	  }

	  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

	  if (mustEndAbs && !isAbsolute) {
	    srcPath.unshift('');
	  }

	  if (!srcPath.length) {
	    result.pathname = null;
	    result.path = null;
	  } else {
	    result.pathname = srcPath.join('/');
	  }

	  //to support request.http
	  if (!isNull(result.pathname) || !isNull(result.search)) {
	    result.path = (result.pathname ? result.pathname : '') +
	                  (result.search ? result.search : '');
	  }
	  result.auth = relative.auth || result.auth;
	  result.slashes = result.slashes || relative.slashes;
	  result.href = result.format();
	  return result;
	};

	Url.prototype.parseHost = function() {
	  var host = this.host;
	  var port = portPattern.exec(host);
	  if (port) {
	    port = port[0];
	    if (port !== ':') {
	      this.port = port.substr(1);
	    }
	    host = host.substr(0, host.length - port.length);
	  }
	  if (host) this.hostname = host;
	};

	function isString(arg) {
	  return typeof arg === "string";
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isNull(arg) {
	  return arg === null;
	}
	function isNullOrUndefined(arg) {
	  return  arg == null;
	}


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Version: 3.7.0
	var NOW             = 1
	,   READY           = false
	,   READY_BUFFER    = []
	,   PRESENCE_SUFFIX = '-pnpres'
	,   DEF_WINDOWING   = 10     // MILLISECONDS.
	,   DEF_TIMEOUT     = 10000  // MILLISECONDS.
	,   DEF_SUB_TIMEOUT = 310    // SECONDS.
	,   DEF_KEEPALIVE   = 60     // SECONDS (FOR TIMESYNC).
	,   SECOND          = 1000   // A THOUSAND MILLISECONDS.
	,   URLBIT          = '/'
	,   PARAMSBIT       = '&'
	,   PRESENCE_HB_THRESHOLD = 5
	,   PRESENCE_HB_DEFAULT  = 30
	,   SDK_VER         = '3.7.0'
	,   REPL            = /{([\w\-]+)}/g;

	/**
	 * UTILITIES
	 */
	function unique() { return'x'+ ++NOW+''+(+new Date) }
	function rnow()   { return+new Date }

	/**
	 * NEXTORIGIN
	 * ==========
	 * var next_origin = nextorigin();
	 */
	var nextorigin = (function() {
	    var max = 20
	    ,   ori = Math.floor(Math.random() * max);
	    return function( origin, failover ) {
	        return origin.indexOf('pubsub.') > 0
	            && origin.replace(
	             'pubsub', 'ps' + (
	                failover ? uuid().split('-')[0] :
	                (++ori < max? ori : ori=1)
	            ) ) || origin;
	    }
	})();


	/**
	 * Build Url
	 * =======
	 *
	 */
	function build_url( url_components, url_params ) {
	    var url    = url_components.join(URLBIT)
	    ,   params = [];

	    if (!url_params) return url;

	    each( url_params, function( key, value ) {
	        var value_str = (typeof value == 'object')?JSON['stringify'](value):value;
	        (typeof value != 'undefined' &&
	            value != null && encode(value_str).length > 0
	        ) && params.push(key + "=" + encode(value_str));
	    } );

	    url += "?" + params.join(PARAMSBIT);
	    return url;
	}

	/**
	 * UPDATER
	 * =======
	 * var timestamp = unique();
	 */
	function updater( fun, rate ) {
	    var timeout
	    ,   last   = 0
	    ,   runnit = function() {
	        if (last + rate > rnow()) {
	            clearTimeout(timeout);
	            timeout = setTimeout( runnit, rate );
	        }
	        else {
	            last = rnow();
	            fun();
	        }
	    };

	    return runnit;
	}

	/**
	 * GREP
	 * ====
	 * var list = grep( [1,2,3], function(item) { return item % 2 } )
	 */
	function grep( list, fun ) {
	    var fin = [];
	    each( list || [], function(l) { fun(l) && fin.push(l) } );
	    return fin
	}

	/**
	 * SUPPLANT
	 * ========
	 * var text = supplant( 'Hello {name}!', { name : 'John' } )
	 */
	function supplant( str, values ) {
	    return str.replace( REPL, function( _, match ) {
	        return values[match] || _
	    } );
	}

	/**
	 * timeout
	 * =======
	 * timeout( function(){}, 100 );
	 */
	function timeout( fun, wait ) {
	    return setTimeout( fun, wait );
	}

	/**
	 * uuid
	 * ====
	 * var my_uuid = uuid();
	 */
	function uuid(callback) {
	    var u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
	    function(c) {
	        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	    if (callback) callback(u);
	    return u;
	}

	function isArray(arg) {
	  //return !!arg && (Array.isArray && Array.isArray(arg) || typeof(arg.length) === "number")
	  return !!arg && (Array.isArray && Array.isArray(arg))
	}

	/**
	 * EACH
	 * ====
	 * each( [1,2,3], function(item) { } )
	 */
	function each( o, f) {
	    if ( !o || !f ) return;

	    if ( isArray(o) )
	        for ( var i = 0, l = o.length; i < l; )
	            f.call( o[i], o[i], i++ );
	    else
	        for ( var i in o )
	            o.hasOwnProperty    &&
	            o.hasOwnProperty(i) &&
	            f.call( o[i], i, o[i] );
	}

	/**
	 * MAP
	 * ===
	 * var list = map( [1,2,3], function(item) { return item + 1 } )
	 */
	function map( list, fun ) {
	    var fin = [];
	    each( list || [], function( k, v ) { fin.push(fun( k, v )) } );
	    return fin;
	}

	/**
	 * ENCODE
	 * ======
	 * var encoded_data = encode('path');
	 */
	function encode(path) { return encodeURIComponent(path) }

	/**
	 * Generate Subscription Channel List
	 * ==================================
	 * generate_channel_list(channels_object);
	 */
	function generate_channel_list(channels, nopresence) {
	    var list = [];
	    each( channels, function( channel, status ) {
	        if (nopresence) {
	            if(channel.search('-pnpres') < 0) {
	                if (status.subscribed) list.push(channel);
	            }
	        } else {
	            if (status.subscribed) list.push(channel);
	        }
	    });
	    return list.sort();
	}

	/**
	 * Generate Subscription Channel Groups List
	 * ==================================
	 * generate_channel_groups_list(channels_groups object);
	 */
	function generate_channel_groups_list(channel_groups, nopresence) {
	    var list = [];
	    each(channel_groups, function( channel_group, status ) {
	        if (nopresence) {
	            if(channel.search('-pnpres') < 0) {
	                if (status.subscribed) list.push(channel_group);
	            }
	        } else {
	            if (status.subscribed) list.push(channel_group);
	        }
	    });
	    return list.sort();
	}

	// PUBNUB READY TO CONNECT
	function ready() { timeout( function() {
	    if (READY) return;
	    READY = 1;
	    each( READY_BUFFER, function(connect) { connect() } );
	}, SECOND ); }

	function PNmessage(args) {
	    msg = args || {'apns' : {}},
	    msg['getPubnubMessage'] = function() {
	        var m = {};

	        if (Object.keys(msg['apns']).length) {
	            m['pn_apns'] = {
	                    'aps' : {
	                        'alert' : msg['apns']['alert'] ,
	                        'badge' : msg['apns']['badge']
	                    }
	            }
	            for (var k in msg['apns']) {
	                m['pn_apns'][k] = msg['apns'][k];
	            }
	            var exclude1 = ['badge','alert'];
	            for (var k in exclude1) {
	                //console.log(exclude[k]);
	                delete m['pn_apns'][exclude1[k]];
	            }
	        }



	        if (msg['gcm']) {
	            m['pn_gcm'] = {
	                'data' : msg['gcm']
	            }
	        }

	        for (var k in msg) {
	            m[k] = msg[k];
	        }
	        var exclude = ['apns','gcm','publish', 'channel','callback','error'];
	        for (var k in exclude) {
	            delete m[exclude[k]];
	        }

	        return m;
	    };
	    msg['publish'] = function() {

	        var m = msg.getPubnubMessage();

	        if (msg['pubnub'] && msg['channel']) {
	            msg['pubnub'].publish({
	                'message' : m,
	                'channel' : msg['channel'],
	                'callback' : msg['callback'],
	                'error' : msg['error']
	            })
	        }
	    };
	    return msg;
	}

	function PN_API(setup) {
	    var SUB_WINDOWING =  +setup['windowing']   || DEF_WINDOWING
	    ,   SUB_TIMEOUT   = (+setup['timeout']     || DEF_SUB_TIMEOUT) * SECOND
	    ,   KEEPALIVE     = (+setup['keepalive']   || DEF_KEEPALIVE)   * SECOND
	    ,   NOLEAVE       = setup['noleave']       || 0
	    ,   PUBLISH_KEY   = setup['publish_key']   || 'demo'
	    ,   SUBSCRIBE_KEY = setup['subscribe_key'] || 'demo'
	    ,   AUTH_KEY      = setup['auth_key']      || ''
	    ,   SECRET_KEY    = setup['secret_key']    || ''
	    ,   hmac_SHA256   = setup['hmac_SHA256']
	    ,   SSL           = setup['ssl']            ? 's' : ''
	    ,   ORIGIN        = 'http'+SSL+'://'+(setup['origin']||'pubsub.pubnub.com')
	    ,   STD_ORIGIN    = nextorigin(ORIGIN)
	    ,   SUB_ORIGIN    = nextorigin(ORIGIN)
	    ,   CONNECT       = function(){}
	    ,   PUB_QUEUE     = []
	    ,   CLOAK         = true
	    ,   TIME_DRIFT    = 0
	    ,   SUB_CALLBACK  = 0
	    ,   SUB_CHANNEL   = 0
	    ,   SUB_RECEIVER  = 0
	    ,   SUB_RESTORE   = setup['restore'] || 0
	    ,   SUB_BUFF_WAIT = 0
	    ,   TIMETOKEN     = 0
	    ,   RESUMED       = false
	    ,   CHANNELS      = {}
	    ,   CHANNEL_GROUPS       = {}
	    ,   STATE         = {}
	    ,   PRESENCE_HB_TIMEOUT  = null
	    ,   PRESENCE_HB          = validate_presence_heartbeat(setup['heartbeat'] || setup['pnexpires'] || 0, setup['error'])
	    ,   PRESENCE_HB_INTERVAL = setup['heartbeat_interval'] || PRESENCE_HB - 3
	    ,   PRESENCE_HB_RUNNING  = false
	    ,   NO_WAIT_FOR_PENDING  = setup['no_wait_for_pending']
	    ,   COMPATIBLE_35 = setup['compatible_3.5']  || false
	    ,   xdr           = setup['xdr']
	    ,   params        = setup['params'] || {}
	    ,   error         = setup['error']      || function() {}
	    ,   _is_online    = setup['_is_online'] || function() { return 1 }
	    ,   jsonp_cb      = setup['jsonp_cb']   || function() { return 0 }
	    ,   db            = setup['db']         || {'get': function(){}, 'set': function(){}}
	    ,   CIPHER_KEY    = setup['cipher_key']
	    ,   UUID          = setup['uuid'] || ( db && db['get'](SUBSCRIBE_KEY+'uuid') || '')
	    ,   _poll_timer
	    ,   _poll_timer2;

	    var crypto_obj    = setup['crypto_obj'] ||
	        {
	            'encrypt' : function(a,key){ return a},
	            'decrypt' : function(b,key){return b}
	        };

	    function _get_url_params(data) {
	        if (!data) data = {};
	        each( params , function( key, value ) {
	            if (!(key in data)) data[key] = value;
	        });
	        return data;
	    }

	    function _object_to_key_list(o) {
	        var l = []
	        each( o , function( key, value ) {
	            l.push(key);
	        });
	        return l;
	    }
	    function _object_to_key_list_sorted(o) {
	        return _object_to_key_list(o).sort();
	    }

	    function _get_pam_sign_input_from_params(params) {
	        var si = "";
	        var l = _object_to_key_list_sorted(params);

	        for (var i in l) {
	            var k = l[i]
	            si += k + "=" + encode(params[k]) ;
	            if (i != l.length - 1) si += "&"
	        }
	        return si;
	    }

	    function validate_presence_heartbeat(heartbeat, cur_heartbeat, error) {
	        var err = false;

	        if (typeof heartbeat === 'number') {
	            if (heartbeat > PRESENCE_HB_THRESHOLD || heartbeat == 0)
	                err = false;
	            else
	                err = true;
	        } else if(typeof heartbeat === 'boolean'){
	            if (!heartbeat) {
	                return 0;
	            } else {
	                return PRESENCE_HB_DEFAULT;
	            }
	        } else {
	            err = true;
	        }

	        if (err) {
	            error && error("Presence Heartbeat value invalid. Valid range ( x > " + PRESENCE_HB_THRESHOLD + " or x = 0). Current Value : " + (cur_heartbeat || PRESENCE_HB_THRESHOLD));
	            return cur_heartbeat || PRESENCE_HB_THRESHOLD;
	        } else return heartbeat;
	    }

	    function encrypt(input, key) {
	        return crypto_obj['encrypt'](input, key || CIPHER_KEY) || input;
	    }
	    function decrypt(input, key) {
	        return crypto_obj['decrypt'](input, key || CIPHER_KEY) ||
	               crypto_obj['decrypt'](input, CIPHER_KEY) ||
	               input;
	    }

	    function error_common(message, callback) {
	        callback && callback({ 'error' : message || "error occurred"});
	        error && error(message);
	    }
	    function _presence_heartbeat() {

	        clearTimeout(PRESENCE_HB_TIMEOUT);

	        if (!PRESENCE_HB_INTERVAL || PRESENCE_HB_INTERVAL >= 500 || PRESENCE_HB_INTERVAL < 1 || !generate_channel_list(CHANNELS,true).length){
	            PRESENCE_HB_RUNNING = false;
	            return;
	        }

	        PRESENCE_HB_RUNNING = true;
	        SELF['presence_heartbeat']({
	            'callback' : function(r) {
	                PRESENCE_HB_TIMEOUT = timeout( _presence_heartbeat, (PRESENCE_HB_INTERVAL) * SECOND );
	            },
	            'error' : function(e) {
	                error && error("Presence Heartbeat unable to reach Pubnub servers." + JSON.stringify(e));
	                PRESENCE_HB_TIMEOUT = timeout( _presence_heartbeat, (PRESENCE_HB_INTERVAL) * SECOND );
	            }
	        });
	    }

	    function start_presence_heartbeat() {
	        !PRESENCE_HB_RUNNING && _presence_heartbeat();
	    }

	    function publish(next) {

	        if (NO_WAIT_FOR_PENDING) {
	            if (!PUB_QUEUE.length) return;
	        } else {
	            if (next) PUB_QUEUE.sending = 0;
	            if ( PUB_QUEUE.sending || !PUB_QUEUE.length ) return;
	            PUB_QUEUE.sending = 1;
	        }

	        xdr(PUB_QUEUE.shift());
	    }

	    function each_channel(callback) {
	        var count = 0;

	        each( generate_channel_list(CHANNELS), function(channel) {
	            var chan = CHANNELS[channel];

	            if (!chan) return;

	            count++;
	            (callback||function(){})(chan);
	        } );

	        return count;
	    }
	    function _invoke_callback(response, callback, err) {
	        if (typeof response == 'object') {
	            if (response['error'] && response['message'] && response['payload']) {
	                err({'message' : response['message'], 'payload' : response['payload']});
	                return;
	            }
	            if (response['payload']) {
	                callback(response['payload']);
	                return;
	            }
	        }
	        callback(response);
	    }

	    function _invoke_error(response,err) {
	        if (typeof response == 'object' && response['error'] &&
	            response['message'] && response['payload']) {
	            err({'message' : response['message'], 'payload' : response['payload']});
	        } else err(response);
	    }

	    function CR(args, callback, url1, data) {
	            var callback        = args['callback']      || callback
	            ,   err             = args['error']         || error
	            ,   jsonp           = jsonp_cb();

	            var url = [
	                    STD_ORIGIN, 'v1', 'channel-registration',
	                    'sub-key', SUBSCRIBE_KEY
	                ];

	            url.push.apply(url,url1);

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });

	    }

	    // Announce Leave Event
	    var SELF = {
	        'LEAVE' : function( channel, blocking, callback, error ) {

	            var data   = { 'uuid' : UUID, 'auth' : AUTH_KEY }
	            ,   origin = nextorigin(ORIGIN)
	            ,   callback = callback || function(){}
	            ,   err      = error    || function(){}
	            ,   jsonp  = jsonp_cb();

	            // Prevent Leaving a Presence Channel
	            if (channel.indexOf(PRESENCE_SUFFIX) > 0) return true;

	            if (COMPATIBLE_35) {
	                if (!SSL)         return false;
	                if (jsonp == '0') return false;
	            }

	            if (NOLEAVE)  return false;

	            if (jsonp != '0') data['callback'] = jsonp;

	            xdr({
	                blocking : blocking || SSL,
	                timeout  : 2000,
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    origin, 'v2', 'presence', 'sub_key',
	                    SUBSCRIBE_KEY, 'channel', encode(channel), 'leave'
	                ]
	            });
	            return true;
	        },
	        'set_resumed' : function(resumed) {
	                RESUMED = resumed;
	        },
	        'get_cipher_key' : function() {
	            return CIPHER_KEY;
	        },
	        'set_cipher_key' : function(key) {
	            CIPHER_KEY = key;
	        },
	        'raw_encrypt' : function(input, key) {
	            return encrypt(input, key);
	        },
	        'raw_decrypt' : function(input, key) {
	            return decrypt(input, key);
	        },
	        'get_heartbeat' : function() {
	            return PRESENCE_HB;
	        },
	        'set_heartbeat' : function(heartbeat) {
	            PRESENCE_HB = validate_presence_heartbeat(heartbeat, PRESENCE_HB_INTERVAL, error);
	            PRESENCE_HB_INTERVAL = (PRESENCE_HB - 3 >= 1)?PRESENCE_HB - 3:1;
	            CONNECT();
	            _presence_heartbeat();
	        },
	        'get_heartbeat_interval' : function() {
	            return PRESENCE_HB_INTERVAL;
	        },
	        'set_heartbeat_interval' : function(heartbeat_interval) {
	            PRESENCE_HB_INTERVAL = heartbeat_interval;
	            _presence_heartbeat();
	        },
	        'get_version' : function() {
	            return SDK_VER;
	        },
	        'getGcmMessageObject' : function(obj) {
	            return {
	                'data' : obj
	            }
	        },
	        'getApnsMessageObject' : function(obj) {
	            var x =  {
	                'aps' : { 'badge' : 1, 'alert' : ''}
	            }
	            for (k in obj) {
	                k[x] = obj[k];
	            }
	            return x;
	        },
	        'newPnMessage' : function() {
	            var x = {};
	            if (gcm) x['pn_gcm'] = gcm;
	            if (apns) x['pn_apns'] = apns;
	            for ( k in n ) {
	                x[k] = n[k];
	            }
	            return x;
	        },

	        '_add_param' : function(key,val) {
	            params[key] = val;
	        },

	        'channel_group' : function(args, callback) {
	            var ns_ch       = args['channel_group']
	            ,   channels    = args['channels'] || args['channel']
	            ,   cloak       = args['cloak']
	            ,   namespace
	            ,   channel_group
	            ,   url = []
	            ,   data = {}
	            ,   mode = args['mode'] || 'add';


	            if (ns_ch) {
	                var ns_ch_a = ns_ch.split(':');

	                if (ns_ch_a.length > 1) {
	                    namespace = (ns_ch_a[0] === '*')?null:ns_ch_a[0];

	                    channel_group = ns_ch_a[1];
	                } else {
	                    channel_group = ns_ch_a[0];
	                }
	            }

	            namespace && url.push('namespace') && url.push(encode(namespace));

	            url.push('channel-group');

	            if (channel_group && channel_group !== '*') {
	                url.push(channel_group);
	            }

	            if (channels ) {
	                if (isArray(channels)) {
	                    channels = channels.join(',');
	                }
	                data[mode] = channels;
	                data['cloak'] = (CLOAK)?'true':'false';
	            } else {
	                if (mode === 'remove') url.push('remove');
	            }

	            if (typeof cloak != 'undefined') data['cloak'] = (cloak)?'true':'false';

	            CR(args, callback, url, data);
	        },

	        'channel_group_list_groups' : function(args, callback) {
	            var namespace;

	            namespace = args['namespace'] || args['ns'] || args['channel_group'] || null;
	            if (namespace) {
	                args["channel_group"] = namespace + ":*";
	            }

	            SELF['channel_group'](args, callback);
	        },

	        'channel_group_list_channels' : function(args, callback) {
	            if (!args['channel_group']) return error('Missing Channel Group');
	            SELF['channel_group'](args, callback);
	        },

	        'channel_group_remove_channel' : function(args, callback) {
	            if (!args['channel_group']) return error('Missing Channel Group');
	            if (!args['channel'] && !args['channels'] ) return error('Missing Channel');

	            args['mode'] = 'remove';
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_remove_group' : function(args, callback) {
	            if (!args['channel_group']) return error('Missing Channel Group');
	            if (args['channel']) return error('Use channel_group_remove_channel if you want to remove a channel from a group.');

	            args['mode'] = 'remove';
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_add_channel' : function(args, callback) {
	           if (!args['channel_group']) return error('Missing Channel Group');
	           if (!args['channel'] && !args['channels'] ) return error('Missing Channel');
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_cloak' : function(args, callback) {
	            if (typeof args['cloak'] == 'undefined') {
	                callback(CLOAK);
	                return;
	            }
	            CLOAK = args['cloak'];
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_list_namespaces' : function(args, callback) {
	            var url = ['namespace'];
	            CR(args, callback, url);
	        },
	        'channel_group_remove_namespace' : function(args, callback) {
	            var url = ['namespace',args['namespace'],'remove'];
	            CR(args, callback, url);
	        },

	        /*
	            PUBNUB.history({
	                channel  : 'my_chat_channel',
	                limit    : 100,
	                callback : function(history) { }
	            });
	        */
	        'history' : function( args, callback ) {
	            var callback         = args['callback'] || callback
	            ,   count            = args['count']    || args['limit'] || 100
	            ,   reverse          = args['reverse']  || "false"
	            ,   err              = args['error']    || function(){}
	            ,   auth_key         = args['auth_key'] || AUTH_KEY
	            ,   cipher_key       = args['cipher_key']
	            ,   channel          = args['channel']
	            ,   channel_group    = args['channel_group']
	            ,   start            = args['start']
	            ,   end              = args['end']
	            ,   include_token    = args['include_token']
	            ,   params           = {}
	            ,   jsonp            = jsonp_cb();

	            // Make sure we have a Channel
	            if (!channel && !channel_group) return error('Missing Channel');
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            params['stringtoken'] = 'true';
	            params['count']       = count;
	            params['reverse']     = reverse;
	            params['auth']        = auth_key;

	            if (channel_group) {
	                params['channel-group'] = channel_group;
	                if (!channel) {
	                    channel = ','; 
	                }
	            }
	            if (jsonp) params['callback']              = jsonp;
	            if (start) params['start']                 = start;
	            if (end)   params['end']                   = end;
	            if (include_token) params['include_token'] = 'true';

	            // Send Message
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(params),
	                success  : function(response) {
	                    if (typeof response == 'object' && response['error']) {
	                        err({'message' : response['message'], 'payload' : response['payload']});
	                        return;
	                    }
	                    var messages = response[0];
	                    var decrypted_messages = [];
	                    for (var a = 0; a < messages.length; a++) {
	                        var new_message = decrypt(messages[a],cipher_key);
	                        try {
	                            decrypted_messages['push'](JSON['parse'](new_message));
	                        } catch (e) {
	                            decrypted_messages['push']((new_message));
	                        }
	                    }
	                    callback([decrypted_messages, response[1], response[2]]);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v2', 'history', 'sub-key',
	                    SUBSCRIBE_KEY, 'channel', encode(channel)
	                ]
	            });
	        },

	        /*
	            PUBNUB.replay({
	                source      : 'my_channel',
	                destination : 'new_channel'
	            });
	        */
	        'replay' : function(args, callback) {
	            var callback    = callback || args['callback'] || function(){}
	            ,   auth_key    = args['auth_key'] || AUTH_KEY
	            ,   source      = args['source']
	            ,   destination = args['destination']
	            ,   stop        = args['stop']
	            ,   start       = args['start']
	            ,   end         = args['end']
	            ,   reverse     = args['reverse']
	            ,   limit       = args['limit']
	            ,   jsonp       = jsonp_cb()
	            ,   data        = {}
	            ,   url;

	            // Check User Input
	            if (!source)        return error('Missing Source Channel');
	            if (!destination)   return error('Missing Destination Channel');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            // Setup URL Params
	            if (jsonp != '0') data['callback'] = jsonp;
	            if (stop)         data['stop']     = 'all';
	            if (reverse)      data['reverse']  = 'true';
	            if (start)        data['start']    = start;
	            if (end)          data['end']      = end;
	            if (limit)        data['count']    = limit;

	            data['auth'] = auth_key;

	            // Compose URL Parts
	            url = [
	                STD_ORIGIN, 'v1', 'replay',
	                PUBLISH_KEY, SUBSCRIBE_KEY,
	                source, destination
	            ];

	            // Start (or Stop) Replay!
	            xdr({
	                callback : jsonp,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function() { callback([ 0, 'Disconnected' ]) },
	                url      : url,
	                data     : _get_url_params(data)
	            });
	        },

	        /*
	            PUBNUB.auth('AJFLKAJSDKLA');
	        */
	        'auth' : function(auth) {
	            AUTH_KEY = auth;
	            CONNECT();
	        },

	        /*
	            PUBNUB.time(function(time){ });
	        */
	        'time' : function(callback) {
	            var jsonp = jsonp_cb();
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params({ 'uuid' : UUID, 'auth' : AUTH_KEY }),
	                timeout  : SECOND * 5,
	                url      : [STD_ORIGIN, 'time', jsonp],
	                success  : function(response) { callback(response[0]) },
	                fail     : function() { callback(0) }
	            });
	        },

	        /*
	            PUBNUB.publish({
	                channel : 'my_chat_channel',
	                message : 'hello!'
	            });
	        */
	        'publish' : function( args, callback ) {
	            var msg      = args['message'];
	            if (!msg) return error('Missing Message');

	            var callback = callback || args['callback'] || msg['callback'] || function(){}
	            ,   channel  = args['channel'] || msg['channel']
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   cipher_key = args['cipher_key']
	            ,   err      = args['error'] || msg['error'] || function() {}
	            ,   post     = args['post'] || false
	            ,   store    = ('store_in_history' in args) ? args['store_in_history']: true
	            ,   jsonp    = jsonp_cb()
	            ,   add_msg  = 'push'
	            ,   url;

	            if (args['prepend']) add_msg = 'unshift'

	            if (!channel)       return error('Missing Channel');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (msg['getPubnubMessage']) {
	                msg = msg['getPubnubMessage']();
	            }

	            // If trying to send Object
	            msg = JSON['stringify'](encrypt(msg, cipher_key));

	            // Create URL
	            url = [
	                STD_ORIGIN, 'publish',
	                PUBLISH_KEY, SUBSCRIBE_KEY,
	                0, encode(channel),
	                jsonp, encode(msg)
	            ];

	            params = { 'uuid' : UUID, 'auth' : auth_key }

	            if (!store) params['store'] ="0"

	            // Queue Message Send
	            PUB_QUEUE[add_msg]({
	                callback : jsonp,
	                timeout  : SECOND * 5,
	                url      : url,
	                data     : _get_url_params(params),
	                fail     : function(response){
	                    _invoke_error(response, err);
	                    publish(1);
	                },
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                    publish(1);
	                },
	                mode     : (post)?'POST':'GET'
	            });

	            // Send Message
	            publish();
	        },

	        /*
	            PUBNUB.unsubscribe({ channel : 'my_chat' });
	        */
	        'unsubscribe' : function(args, callback) {
	            var channel       = args['channel']
	            ,   channel_group = args['channel_group']
	            ,   callback      = callback            || args['callback'] || function(){}
	            ,   err           = args['error']       || function(){};

	            TIMETOKEN   = 0;
	            //SUB_RESTORE = 1;    REVISIT !!!!

	            if (channel) {
	                // Prepare Channel(s)
	                channel = map( (
	                    channel.join ? channel.join(',') : ''+channel
	                ).split(','), function(channel) {
	                    if (!CHANNELS[channel]) return;
	                    return channel + ',' + channel + PRESENCE_SUFFIX;
	                } ).join(',');

	                // Iterate over Channels
	                each( channel.split(','), function(channel) {
	                    var CB_CALLED = true;
	                    if (!channel) return;
	                    if (READY) {
	                        CB_CALLED = SELF['LEAVE']( channel, 0 , callback, err);
	                    }
	                    if (!CB_CALLED) callback({action : "leave"});
	                    CHANNELS[channel] = 0;
	                    if (channel in STATE) delete STATE[channel];
	                } );
	            }

	            if (channel_group) {
	                // Prepare channel group(s)
	                channel_group = map( (
	                    channel_group.join ? channel_group.join(',') : ''+channel_group
	                ).split(','), function(channel_group) {
	                    if (!CHANNEL_GROUPS[channel_group]) return;
	                    return channel_group + ',' + channel_group + PRESENCE_SUFFIX;
	                } ).join(',');

	                // Iterate over channel groups
	                each( channel_group.split(','), function(channel) {
	                    var CB_CALLED = true;
	                    if (!channel_group) return;
	                    if (READY) {
	                        CB_CALLED = SELF['LEAVE']( channel_group, 0 , callback, err);
	                    }
	                    if (!CB_CALLED) callback({action : "leave"});
	                    CHANNEL_GROUPS[channel_group] = 0;
	                    if (channel_group in STATE) delete STATE[channel_group];
	                } );
	            }

	            // Reset Connection if Count Less
	            CONNECT();
	        },

	        /*
	            PUBNUB.subscribe({
	                channel  : 'my_chat'
	                callback : function(message) { }
	            });
	        */
	        'subscribe' : function( args, callback ) {
	            var channel         = args['channel']
	            ,   channel_group   = args['channel_group']
	            ,   callback        = callback            || args['callback']
	            ,   callback        = callback            || args['message']
	            ,   auth_key        = args['auth_key']    || AUTH_KEY
	            ,   connect         = args['connect']     || function(){}
	            ,   reconnect       = args['reconnect']   || function(){}
	            ,   disconnect      = args['disconnect']  || function(){}
	            ,   errcb           = args['error']       || function(){}
	            ,   idlecb          = args['idle']        || function(){}
	            ,   presence        = args['presence']    || 0
	            ,   noheresync      = args['noheresync']  || 0
	            ,   backfill        = args['backfill']    || 0
	            ,   timetoken       = args['timetoken']   || 0
	            ,   sub_timeout     = args['timeout']     || SUB_TIMEOUT
	            ,   windowing       = args['windowing']   || SUB_WINDOWING
	            ,   state           = args['state']
	            ,   heartbeat       = args['heartbeat'] || args['pnexpires']
	            ,   restore         = args['restore'] || SUB_RESTORE;

	            // Restore Enabled?
	            SUB_RESTORE = restore;

	            // Always Reset the TT
	            TIMETOKEN = timetoken;

	            // Make sure we have a Channel
	            if (!channel && !channel_group) {
	                return error('Missing Channel');
	            }

	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (heartbeat || heartbeat === 0) {
	                SELF['set_heartbeat'](heartbeat);
	            }

	            // Setup Channel(s)
	            if (channel) {
	                each( (channel.join ? channel.join(',') : ''+channel).split(','),
	                function(channel) {
	                    var settings = CHANNELS[channel] || {};

	                    // Store Channel State
	                    CHANNELS[SUB_CHANNEL = channel] = {
	                        name         : channel,
	                        connected    : settings.connected,
	                        disconnected : settings.disconnected,
	                        subscribed   : 1,
	                        callback     : SUB_CALLBACK = callback,
	                        'cipher_key' : args['cipher_key'],
	                        connect      : connect,
	                        disconnect   : disconnect,
	                        reconnect    : reconnect
	                    };

	                    if (state) {
	                        if (channel in state) {
	                            STATE[channel] = state[channel];
	                        } else {
	                            STATE[channel] = state;
	                        }
	                    }

	                    // Presence Enabled?
	                    if (!presence) return;

	                    // Subscribe Presence Channel
	                    SELF['subscribe']({
	                        'channel'  : channel + PRESENCE_SUFFIX,
	                        'callback' : presence,
	                        'restore'  : restore
	                    });

	                    // Presence Subscribed?
	                    if (settings.subscribed) return;

	                    // See Who's Here Now?
	                    if (noheresync) return;
	                    SELF['here_now']({
	                        'channel'  : channel,
	                        'callback' : function(here) {
	                            each( 'uuids' in here ? here['uuids'] : [],
	                            function(uid) { presence( {
	                                'action'    : 'join',
	                                'uuid'      : uid,
	                                'timestamp' : Math.floor(rnow() / 1000),
	                                'occupancy' : here['occupancy'] || 1
	                            }, here, channel ); } );
	                        }
	                    });
	                } );
	            }

	            // Setup Channel Groups
	            if (channel_group) {
	                each( (channel_group.join ? channel_group.join(',') : ''+channel_group).split(','),
	                function(channel_group) {
	                    var settings = CHANNEL_GROUPS[channel_group] || {};

	                    CHANNEL_GROUPS[channel_group] = {
	                        name         : channel_group,
	                        connected    : settings.connected,
	                        disconnected : settings.disconnected,
	                        subscribed   : 1,
	                        callback     : SUB_CALLBACK = callback,
	                        'cipher_key' : args['cipher_key'],
	                        connect      : connect,
	                        disconnect   : disconnect,
	                        reconnect    : reconnect
	                    };

	                    // Presence Enabled?
	                    if (!presence) return;

	                    // Subscribe Presence Channel
	                    SELF['subscribe']({
	                        'channel_group'  : channel_group + PRESENCE_SUFFIX,
	                        'callback' : presence,
	                        'restore'  : restore
	                    });

	                    // Presence Subscribed?
	                    if (settings.subscribed) return;

	                    // See Who's Here Now?
	                    if (noheresync) return;
	                    SELF['here_now']({
	                        'channel_group'  : channel_group,
	                        'callback' : function(here) {
	                            each( 'uuids' in here ? here['uuids'] : [],
	                            function(uid) { presence( {
	                                'action'    : 'join',
	                                'uuid'      : uid,
	                                'timestamp' : Math.floor(rnow() / 1000),
	                                'occupancy' : here['occupancy'] || 1
	                            }, here, channel_group ); } );
	                        }
	                    });
	                } );
	            }


	            // Test Network Connection
	            function _test_connection(success) {
	                if (success) {
	                    // Begin Next Socket Connection
	                    timeout( CONNECT, SECOND );
	                }
	                else {
	                    // New Origin on Failed Connection
	                    STD_ORIGIN = nextorigin( ORIGIN, 1 );
	                    SUB_ORIGIN = nextorigin( ORIGIN, 1 );

	                    // Re-test Connection
	                    timeout( function() {
	                        SELF['time'](_test_connection);
	                    }, SECOND );
	                }

	                // Disconnect & Reconnect
	                each_channel(function(channel){
	                    // Reconnect
	                    if (success && channel.disconnected) {
	                        channel.disconnected = 0;
	                        return channel.reconnect(channel.name);
	                    }

	                    // Disconnect
	                    if (!success && !channel.disconnected) {
	                        channel.disconnected = 1;
	                        channel.disconnect(channel.name);
	                    }
	                });
	            }

	            // Evented Subscribe
	            function _connect() {
	                var jsonp           = jsonp_cb()
	                ,   channels        = generate_channel_list(CHANNELS).join(',')
	                ,   channel_groups  = generate_channel_groups_list(CHANNEL_GROUPS).join(',');

	                // Stop Connection
	                if (!channels && !channel_groups) return;

	                if (!channels) channels = ',';

	                // Connect to PubNub Subscribe Servers
	                _reset_offline();

	                var data = _get_url_params({ 'uuid' : UUID, 'auth' : auth_key });

	                if (channel_groups) {
	                    data['channel-group'] = channel_groups;
	                }


	                var st = JSON.stringify(STATE);
	                if (st.length > 2) data['state'] = JSON.stringify(STATE);

	                if (PRESENCE_HB) data['heartbeat'] = PRESENCE_HB;

	                start_presence_heartbeat();
	                SUB_RECEIVER = xdr({
	                    timeout  : sub_timeout,
	                    callback : jsonp,
	                    fail     : function(response) {
	                        _invoke_error(response, errcb);
	                        //SUB_RECEIVER = null;
	                        SELF['time'](_test_connection);
	                    },
	                    data     : _get_url_params(data),
	                    url      : [
	                        SUB_ORIGIN, 'subscribe',
	                        SUBSCRIBE_KEY, encode(channels),
	                        jsonp, TIMETOKEN
	                    ],
	                    success : function(messages) {

	                        //SUB_RECEIVER = null;
	                        // Check for Errors
	                        if (!messages || (
	                            typeof messages == 'object' &&
	                            'error' in messages         &&
	                            messages['error']
	                        )) {
	                            errcb(messages['error']);
	                            return timeout( CONNECT, SECOND );
	                        }

	                        // User Idle Callback
	                        idlecb(messages[1]);

	                        // Restore Previous Connection Point if Needed
	                        TIMETOKEN = !TIMETOKEN               &&
	                                    SUB_RESTORE              &&
	                                    db['get'](SUBSCRIBE_KEY) || messages[1];

	                        /*
	                        // Connect
	                        each_channel_registry(function(registry){
	                            if (registry.connected) return;
	                            registry.connected = 1;
	                            registry.connect(channel.name);
	                        });
	                        */

	                        // Connect
	                        each_channel(function(channel){
	                            if (channel.connected) return;
	                            channel.connected = 1;
	                            channel.connect(channel.name);
	                        });

	                        if (RESUMED && !SUB_RESTORE) {
	                                TIMETOKEN = 0;
	                                RESUMED = false;
	                                // Update Saved Timetoken
	                                db['set']( SUBSCRIBE_KEY, 0 );
	                                timeout( _connect, windowing );
	                                return;
	                        }

	                        // Invoke Memory Catchup and Receive Up to 100
	                        // Previous Messages from the Queue.
	                        if (backfill) {
	                            TIMETOKEN = 10000;
	                            backfill  = 0;
	                        }

	                        // Update Saved Timetoken
	                        db['set']( SUBSCRIBE_KEY, messages[1] );

	                        // Route Channel <---> Callback for Message
	                        var next_callback = (function() {
	                            var channels = '';

	                            if (messages.length > 3) {
	                                channels = messages[3];
	                            } else if (messages.length > 2) {
	                                channels = messages[2];
	                            } else {
	                                channels =  map(
	                                    generate_channel_list(CHANNELS), function(chan) { return map(
	                                        Array(messages[0].length)
	                                        .join(',').split(','),
	                                        function() { return chan; }
	                                    ) }).join(',')
	                            }

	                            var list = channels.split(',');

	                            return function() {
	                                var channel = list.shift()||SUB_CHANNEL;
	                                return [
	                                    (CHANNELS[channel]||{})
	                                    .callback||SUB_CALLBACK,
	                                    channel.split(PRESENCE_SUFFIX)[0]
	                                ];
	                            };
	                        })();

	                        var latency = detect_latency(+messages[1]);
	                        each( messages[0], function(msg) {
	                            var next = next_callback();
	                            var decrypted_msg = decrypt(msg,
	                                (CHANNELS[next[1]])?CHANNELS[next[1]]['cipher_key']:null);
	                            next[0]( decrypted_msg, messages, next[2] || next[1], latency);
	                        });

	                        timeout( _connect, windowing );
	                    }
	                });
	            }

	            CONNECT = function() {
	                _reset_offline();
	                timeout( _connect, windowing );
	            };

	            // Reduce Status Flicker
	            if (!READY) return READY_BUFFER.push(CONNECT);

	            // Connect Now
	            CONNECT();
	        },

	        /*
	            PUBNUB.here_now({ channel : 'my_chat', callback : fun });
	        */
	        'here_now' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   channel  = args['channel']
	            ,   channel_group = args['channel_group']
	            ,   jsonp    = jsonp_cb()
	            ,   uuids    = ('uuids' in args) ? args['uuids'] : true
	            ,   state    = args['state']
	            ,   data     = { 'uuid' : UUID, 'auth' : auth_key };

	            if (!uuids) data['disable_uuids'] = 1;
	            if (state) data['state'] = 1;

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            var url = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub_key', SUBSCRIBE_KEY
	                ];

	            channel && url.push('channel') && url.push(encode(channel));

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            if (channel_group) {
	                data['channel-group'] = channel_group;
	                !channel && url.push('channel') && url.push(','); 
	            }


	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });
	        },

	        /*
	            PUBNUB.current_channels_by_uuid({ channel : 'my_chat', callback : fun });
	        */
	        'where_now' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   jsonp    = jsonp_cb()
	            ,   uuid     = args['uuid']     || UUID
	            ,   data     = { 'auth' : auth_key };

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub_key', SUBSCRIBE_KEY,
	                    'uuid', encode(uuid)
	                ]
	            });
	        },

	        'state' : function(args, callback) {
	            var callback = args['callback'] || callback || function(r) {}
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   jsonp    = jsonp_cb()
	            ,   state    = args['state']
	            ,   uuid     = args['uuid'] || UUID
	            ,   channel  = args['channel']
	            ,   channel_group = args['channel_group']
	            ,   url
	            ,   data     = _get_url_params({ 'auth' : auth_key });

	            // Make sure we have a Channel
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!uuid) return error('Missing UUID');
	            if (!channel && !channel_group) return error('Missing Channel');

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            if (typeof channel != 'undefined'
	                && CHANNELS[channel] && CHANNELS[channel].subscribed ) {
	                if (state) STATE[channel] = state;
	            }

	            if (typeof channel_group != 'undefined'
	                && CHANNEL_GROUPS[channel_group]
	                && CHANNEL_GROUPS[channel_group].subscribed
	                ) {
	                if (state) STATE[channel_group] = state;
	                data['channel-group'] = channel_group;

	                if (!channel) {
	                    channel = ',';
	                }
	            }

	            data['state'] = JSON.stringify(state);

	            if (state) {
	                url      = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel', channel,
	                    'uuid', uuid, 'data'
	                ]
	            } else {
	                url      = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel', channel,
	                    'uuid', encode(uuid)
	                ]
	            }

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url

	            });

	        },

	        /*
	            PUBNUB.grant({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                ttl      : 24 * 60, // Minutes
	                read     : true,
	                write    : true,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'grant' : function( args, callback ) {
	            var callback        = args['callback'] || callback
	            ,   err             = args['error']    || function(){}
	            ,   channel         = args['channel']
	            ,   channel_group   = args['channel_group']
	            ,   jsonp           = jsonp_cb()
	            ,   ttl             = args['ttl']
	            ,   r               = (args['read'] )?"1":"0"
	            ,   w               = (args['write'])?"1":"0"
	            ,   m               = (args['manage'])?"1":"0"
	            ,   auth_key        = args['auth_key'];

	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SECRET_KEY)    return error('Missing Secret Key');

	            var timestamp  = Math.floor(new Date().getTime() / 1000)
	            ,   sign_input = SUBSCRIBE_KEY + "\n" + PUBLISH_KEY + "\n"
	                    + "grant" + "\n";

	            var data = {
	                'w'         : w,
	                'r'         : r,
	                'timestamp' : timestamp
	            };
	            if (args['manage']) {
	                data['m'] = m;
	            }
	            if (typeof channel != 'undefined' && channel != null && channel.length > 0) data['channel'] = channel;
	            if (typeof channel_group != 'undefined' && channel_group != null && channel_group.length > 0) {
	                data['channel-group'] = channel_group;
	            }
	            if (jsonp != '0') { data['callback'] = jsonp; }
	            if (ttl || ttl === 0) data['ttl'] = ttl;

	            if (auth_key) data['auth'] = auth_key;

	            data = _get_url_params(data)

	            if (!auth_key) delete data['auth'];

	            sign_input += _get_pam_sign_input_from_params(data);

	            var signature = hmac_SHA256( sign_input, SECRET_KEY );

	            signature = signature.replace( /\+/g, "-" );
	            signature = signature.replace( /\//g, "_" );

	            data['signature'] = signature;

	            xdr({
	                callback : jsonp,
	                data     : data,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v1', 'auth', 'grant' ,
	                    'sub-key', SUBSCRIBE_KEY
	                ]
	            });
	        },

	        /*
	            PUBNUB.audit({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                read     : true,
	                write    : true,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'audit' : function( args, callback ) {
	            var callback        = args['callback'] || callback
	            ,   err             = args['error']    || function(){}
	            ,   channel         = args['channel']
	            ,   channel_group   = args['channel_group']
	            ,   auth_key        = args['auth_key']
	            ,   jsonp           = jsonp_cb();

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SECRET_KEY)    return error('Missing Secret Key');

	            var timestamp  = Math.floor(new Date().getTime() / 1000)
	            ,   sign_input = SUBSCRIBE_KEY + "\n"
	                + PUBLISH_KEY + "\n"
	                + "audit" + "\n";

	            var data = {'timestamp' : timestamp };
	            if (jsonp != '0') { data['callback'] = jsonp; }
	            if (typeof channel != 'undefined' && channel != null && channel.length > 0) data['channel'] = channel;
	            if (typeof channel_group != 'undefined' && channel_group != null && channel_group.length > 0) {
	                data['channel-group'] = channel_group;
	            }
	            if (auth_key) data['auth']    = auth_key;

	            data = _get_url_params(data);

	            if (!auth_key) delete data['auth'];

	            sign_input += _get_pam_sign_input_from_params(data);

	            var signature = hmac_SHA256( sign_input, SECRET_KEY );

	            signature = signature.replace( /\+/g, "-" );
	            signature = signature.replace( /\//g, "_" );

	            data['signature'] = signature;
	            xdr({
	                callback : jsonp,
	                data     : data,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v1', 'auth', 'audit' ,
	                    'sub-key', SUBSCRIBE_KEY
	                ]
	            });
	        },

	        /*
	            PUBNUB.revoke({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'revoke' : function( args, callback ) {
	            args['read']  = false;
	            args['write'] = false;
	            SELF['grant']( args, callback );
	        },
	        'set_uuid' : function(uuid) {
	            UUID = uuid;
	            CONNECT();
	        },
	        'get_uuid' : function() {
	            return UUID;
	        },
	        'presence_heartbeat' : function(args) {
	            var callback = args['callback'] || function() {}
	            var err      = args['error']    || function() {}
	            var jsonp    = jsonp_cb();
	            var data     = { 'uuid' : UUID, 'auth' : AUTH_KEY };

	            var st = JSON['stringify'](STATE);
	            if (st.length > 2) data['state'] = JSON['stringify'](STATE);

	            if (PRESENCE_HB > 0 && PRESENCE_HB < 320) data['heartbeat'] = PRESENCE_HB;

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            var channels        = encode(generate_channel_list(CHANNELS, true)['join'](','));
	            var channel_groups  = generate_channel_groups_list(CHANNEL_GROUPS, true)['join'](',');

	            if (!channels) channels = ',';
	            if (channel_groups) data['channel-group'] = channel_groups;

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                timeout  : SECOND * 5,
	                url      : [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel' , channels,
	                    'heartbeat'
	                ],
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) { _invoke_error(response, err); }
	            });
	        },
	        'stop_timers': function () {
	            clearTimeout(_poll_timer);
	            clearTimeout(_poll_timer2);
	        },

	        // Expose PUBNUB Functions
	        'xdr'           : xdr,
	        'ready'         : ready,
	        'db'            : db,
	        'uuid'          : uuid,
	        'map'           : map,
	        'each'          : each,
	        'each-channel'  : each_channel,
	        'grep'          : grep,
	        'offline'       : function(){_reset_offline(1, { "message":"Offline. Please check your network settings." })},
	        'supplant'      : supplant,
	        'now'           : rnow,
	        'unique'        : unique,
	        'updater'       : updater
	    };

	    function _poll_online() {
	        _is_online() || _reset_offline( 1, {
	            "error" : "Offline. Please check your network settings. "
	        });
	        _poll_timer && clearTimeout(_poll_timer);
	        _poll_timer = timeout( _poll_online, SECOND );
	    }

	    function _poll_online2() {
	        SELF['time'](function(success){
	            detect_time_detla( function(){}, success );
	            success || _reset_offline( 1, {
	                "error" : "Heartbeat failed to connect to Pubnub Servers." +
	                    "Please check your network settings."
	                });
	            _poll_timer2 && clearTimeout(_poll_timer2);
	            _poll_timer2 = timeout( _poll_online2, KEEPALIVE );
	        });
	    }

	    function _reset_offline(err, msg) {
	        SUB_RECEIVER && SUB_RECEIVER(err, msg);
	        SUB_RECEIVER = null;

	        clearTimeout(_poll_timer);
	        clearTimeout(_poll_timer2);
	    }

	    if (!UUID) UUID = SELF['uuid']();
	    db['set']( SUBSCRIBE_KEY + 'uuid', UUID );

	    _poll_timer = timeout( _poll_online,  SECOND    );
	    _poll_timer2 = timeout( _poll_online2, KEEPALIVE );
	    PRESENCE_HB_TIMEOUT = timeout( start_presence_heartbeat, ( PRESENCE_HB_INTERVAL - 3 ) * SECOND ) ;

	    // Detect Age of Message
	    function detect_latency(tt) {
	        var adjusted_time = rnow() - TIME_DRIFT;
	        return adjusted_time - tt / 10000;
	    }

	    detect_time_detla();
	    function detect_time_detla( cb, time ) {
	        var stime = rnow();

	        time && calculate(time) || SELF['time'](calculate);

	        function calculate(time) {
	            if (!time) return;
	            var ptime   = time / 10000
	            ,   latency = (rnow() - stime) / 2;
	            TIME_DRIFT = rnow() - (ptime + latency);
	            cb && cb(TIME_DRIFT);
	        }
	    }

	    return SELF;
	}
	/* ---------------------------------------------------------------------------
	WAIT! - This file depends on instructions from the PUBNUB Cloud.
	http://www.pubnub.com/account
	--------------------------------------------------------------------------- */

	/* ---------------------------------------------------------------------------
	PubNub Real-time Cloud-Hosted Push API and Push Notification Client Frameworks
	Copyright (c) 2011 TopMambo Inc.
	http://www.pubnub.com/
	http://www.pubnub.com/terms
	--------------------------------------------------------------------------- */

	/* ---------------------------------------------------------------------------
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
	--------------------------------------------------------------------------- */
	/**
	 * UTIL LOCALS
	 */
	var NOW                 = 1
	,   http                = __webpack_require__(30)
	,   https               = __webpack_require__(46)
	,   keepAliveAgent      = new (keepAliveIsEmbedded() ? http.Agent : __webpack_require__(55))({
	                            keepAlive: true,
	                            keepAliveMsecs: 300000,
	                            maxSockets: 5
	                          })
	,   XHRTME              = 310000
	,   DEF_TIMEOUT         = 10000
	,   SECOND              = 1000
	,   PNSDK               = 'PubNub-JS-' + 'Nodejs' + '/' +  '3.7.0'
	,   crypto              = __webpack_require__(48)
	,   proxy               = null
	,   XORIGN              = 1;


	function get_hmac_SHA256(data, key) {
	    return crypto.createHmac('sha256',
	                    new Buffer(key, 'utf8')).update(data).digest('base64');
	}


	/**
	 * ERROR
	 * ===
	 * error('message');
	 */
	function error(message) { console['error'](message) }

	/**
	 * Request
	 * =======
	 *  xdr({
	 *     url     : ['http://www.blah.com/url'],
	 *     success : function(response) {},
	 *     fail    : function() {}
	 *  });
	 */
	function xdr( setup ) {
	    var request
	    ,   response
	    ,   success  = setup.success || function(){}
	    ,   fail     = setup.fail    || function(){}
	    ,   origin   = setup.origin || 'pubsub.pubnub.com'
	    ,   ssl      = setup.ssl
	    ,   failed   = 0
	    ,   complete = 0
	    ,   loaded   = 0
	    ,   mode     = setup['mode'] || 'GET'
	    ,   data     = setup['data'] || {}
	    ,   xhrtme   = setup.timeout || DEF_TIMEOUT
	    ,   body = ''
	    ,   finished = function() {
	            if (loaded) return;
	                loaded = 1;

	            clearTimeout(timer);
	            try       { response = JSON['parse'](body); }
	            catch (r) { return done(1); }
	            success(response);
	        }
	    ,   done    = function(failed, response) {
	            if (complete) return;
	                complete = 1;

	            clearTimeout(timer);

	            if (request) {
	                request.on('error', function(){});
	                request.on('data', function(){});
	                request.on('end', function(){});
	                request.abort && request.abort();
	                request = null;
	            }
	            failed && fail(response);
	        }
	        ,   timer  = timeout( function(){done(1);} , xhrtme );

	    data['pnsdk'] = PNSDK;

	    var options = {};
	    var headers = {};
	    var payload = '';

	    if (mode == 'POST')
	        payload = decodeURIComponent(setup.url.pop());

	    var url = build_url( setup.url, data );
	    if (!ssl) ssl = (url.split('://')[0] == 'https')?true:false;

	    url = '/' + url.split('/').slice(3).join('/');

	    var origin       = setup.url[0].split("//")[1]

	    options.hostname = proxy ? proxy.hostname : setup.url[0].split("//")[1];
	    options.port     = proxy ? proxy.port : ssl ? 443 : 80;
	    options.path     = proxy ? "http://" + origin + url:url;
	    options.headers  = proxy ? { 'Host': origin }:null;
	    options.method   = mode;
	    options.keepAlive= !!keepAliveAgent;
	    //options.agent    = keepAliveAgent;    
	    options.body     = payload;

	    __webpack_require__(30).globalAgent.maxSockets = Infinity;
	    try {
	        request = (ssl ? https : http)['request'](options, function(response) {
	            response.setEncoding('utf8');
	            response.on( 'error', function(){done(1, body || { "error" : "Network Connection Error"})});
	            response.on( 'abort', function(){done(1, body || { "error" : "Network Connection Error"})});
	            response.on( 'data', function (chunk) {
	                if (chunk) body += chunk;
	            } );
	            response.on( 'end', function(){
	                var statusCode = response.statusCode;

	                switch(statusCode) {
	                    case 401:
	                    case 402:
	                    case 403:
	                        try {
	                            response = JSON['parse'](body);
	                            done(1,response);
	                        }
	                        catch (r) { return done(1, body); }
	                        return;
	                    default:
	                        break;
	                }
	                finished();
	            });
	        });
	        request.timeout = xhrtme;
	        request.on( 'error', function() {
	            done( 1, {"error":"Network Connection Error"} );
	        } );

	        if (mode == 'POST') request.write(payload);
	        request.end();

	    } catch(e) {
	        done(0);
	        return xdr(setup);
	    }

	    return done;
	}

	/**
	 * LOCAL STORAGE
	 */
	var db = (function(){
	    var store = {};
	    return {
	        'get' : function(key) {
	            return store[key];
	        },
	        'set' : function( key, value ) {
	            store[key] = value;
	        }
	    };
	})();

	function crypto_obj() {
	    var iv = "0123456789012345";
	    function get_padded_key(key) {
	        return crypto.createHash('sha256').update(key).digest("hex").slice(0,32);
	    }

	    return {
	        'encrypt' : function(input, key) {
	            if (!key) return input;
	            var plain_text = JSON['stringify'](input);
	            var cipher = crypto.createCipheriv('aes-256-cbc', get_padded_key(key), iv);
	            var base_64_encrypted = cipher.update(plain_text, 'utf8', 'base64') + cipher.final('base64');
	            return base_64_encrypted || input;
	        },
	        'decrypt' : function(input, key) {
	            if (!key) return input;
	            var decipher = crypto.createDecipheriv('aes-256-cbc', get_padded_key(key), iv);
	            try {
	                var decrypted = decipher.update(input, 'base64', 'utf8') + decipher.final('utf8');
	            } catch (e) {
	                return null;
	            }
	            return JSON.parse(decrypted);
	        }
	    }
	}

	function keepAliveIsEmbedded() {
	  return 'EventEmitter' in http.Agent.super_;
	}


	var CREATE_PUBNUB = function(setup) {
	    proxy = setup['proxy'];
	    setup['xdr'] = xdr;
	    setup['db'] = db;
	    setup['error'] = setup['error'] || error;
	    setup['hmac_SHA256'] = get_hmac_SHA256;
	    setup['crypto_obj'] = crypto_obj();
	    setup['params'] = {'pnsdk' : PNSDK};

	    if (setup['keepAlive'] === false) {
	      keepAliveAgent = undefined;
	    }

	    SELF = function(setup) {
	        return CREATE_PUBNUB(setup);
	    }
	    var PN = PN_API(setup);
	    for (var prop in PN) {
	        if (PN.hasOwnProperty(prop)) {
	            SELF[prop] = PN[prop];
	        }
	    }
	    SELF.init = SELF;
	    SELF.secure = SELF;
	    SELF.ready();
	    return SELF;
	}
	CREATE_PUBNUB.init = CREATE_PUBNUB;

	CREATE_PUBNUB.unique = unique
	CREATE_PUBNUB.secure = CREATE_PUBNUB;
	module.exports = CREATE_PUBNUB
	module.exports.PNmessage = PNmessage;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(43);

	// enum for type of timeout
	var TYPE = {
	  TIMEOUT: 0,
	  INTERVAL: 1,
	  TRIGGER: 2
	};

	var DISCRETE = 'discrete';

	/**
	 * Create a new hypertimer
	 * @param {Object} [options]  The following options are available:
	 *                            rate: number | 'discrete'
	 *                                        The rate of speed of hyper time with
	 *                                        respect to real-time in milliseconds
	 *                                        per millisecond. Rate must be a
	 *                                        positive number, or 'discrete' to
	 *                                        run in discrete time (jumping from
	 *                                        event to event). By default, rate is 1.
	 *                            deterministic: boolean
	 *                                        If true (default), simultaneous events
	 *                                        are executed in a deterministic order.
	 */
	function hypertimer(options) {
	  // options
	  var rate = 1;             // number of milliseconds per milliseconds
	  var deterministic = true; // run simultaneous events in a deterministic order

	  // properties
	  var running = false;   // true when running
	  var realTime = null;   // timestamp. the moment in real-time when hyperTime was set
	  var hyperTime = null;  // timestamp. the start time in hyper-time
	  var timeouts = [];     // array with all running timeouts
	  var current = {};      // the timeouts currently in progress (callback is being executed)
	  var timeoutId = null;  // currently running timer
	  var idSeq = 0;         // counter for unique timeout id's

	  // exported timer object with public functions and variables
	  var timer = {};

	  /**
	   * Change configuration options of the hypertimer, or retrieve current
	   * configuration.
	   * @param {Object} [options]  The following options are available:
	   *                            rate: number | 'discrete'
	   *                                        The rate of speed of hyper time with
	   *                                        respect to real-time in milliseconds
	   *                                        per millisecond. Rate must be a
	   *                                        positive number, or 'discrete' to
	   *                                        run in discrete time (jumping from
	   *                                        event to event). By default, rate is 1.
	   *                            deterministic: boolean
	   *                                        If true (default), simultaneous events
	   *                                        are executed in a deterministic order.
	   * @return {Object} Returns the applied configuration
	   */
	  timer.config = function(options) {
	    if (options) {
	      if ('rate' in options) {
	        var newRate = (options.rate === DISCRETE) ? DISCRETE : Number(options.rate);
	        if (newRate !== DISCRETE && (isNaN(newRate) || newRate <= 0)) {
	          throw new TypeError('rate must be a positive number or the string "discrete"');
	        }
	        hyperTime = timer.now();
	        realTime = util.systemNow();
	        rate = newRate;
	      }
	      if ('deterministic' in options) {
	        deterministic = options.deterministic ? true : false;
	      }
	    }

	    // reschedule running timeouts
	    _schedule();

	    // return a copy of the configuration options
	    return {
	      rate: rate,
	      deterministic: deterministic
	    };
	  };

	  /**
	   * Set the time of the timer. To get the current time, use getTime() or now().
	   * @param {number | Date} time  The time in hyper-time.
	   */
	  timer.setTime = function (time) {
	    if (time instanceof Date) {
	      hyperTime = time.valueOf();
	    }
	    else {
	      var newTime = Number(time);
	      if (isNaN(newTime)) {
	        throw new TypeError('time must be a Date or number');
	      }
	      hyperTime = newTime;
	    }

	    // reschedule running timeouts
	    _schedule();
	  };

	  /**
	   * Returns the current time of the timer as a number.
	   * See also getTime().
	   * @return {number} The time
	   */
	  timer.now = function () {
	    if (rate === DISCRETE) {
	      return hyperTime;
	    }
	    else {
	      if (running) {
	        // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
	        var realInterval = util.systemNow() - realTime;
	        var hyperInterval = realInterval * rate;
	        return hyperTime + hyperInterval;
	      }
	      else {
	        return hyperTime;
	      }
	    }
	  };

	  /**
	   * Continue the timer.
	   */
	  timer['continue'] = function() {
	    realTime = util.systemNow();
	    running = true;

	    // reschedule running timeouts
	    _schedule();
	  };

	  /**
	   * Pause the timer. The timer can be continued again with `continue()`
	   */
	  timer.pause = function() {
	    hyperTime = timer.now();
	    realTime = null;
	    running = false;

	    // reschedule running timeouts (pauses them)
	    _schedule();
	  };

	  /**
	   * Returns the current time of the timer as Date.
	   * See also now().
	   * @return {Date} The time
	   */
	// rename to getTime
	  timer.getTime = function() {
	    return new Date(timer.now());
	  };

	  /**
	   * Get the value of the hypertimer. This function returns the result of getTime().
	   * @return {Date} current time
	   */
	  timer.valueOf = timer.getTime;

	  /**
	   * Return a string representation of the current hyper-time.
	   * @returns {string} String representation
	   */
	  timer.toString = function () {
	    return timer.getTime().toString();
	  };

	  /**
	   * Set a timeout, which is triggered when the timeout occurs in hyper-time.
	   * See also setTrigger.
	   * @param {Function} callback   Function executed when delay is exceeded.
	   * @param {number} delay        The delay in milliseconds. When the delay is
	   *                              smaller or equal to zero, the callback is
	   *                              triggered immediately.
	   * @return {number} Returns a timeoutId which can be used to cancel the
	   *                  timeout using clearTimeout().
	   */
	  timer.setTimeout = function(callback, delay) {
	    var id = idSeq++;
	    var timestamp = timer.now() + delay;
	    if (isNaN(timestamp)) {
	      throw new TypeError('delay must be a number');
	    }

	    // add a new timeout to the queue
	    _queueTimeout({
	      id: id,
	      type: TYPE.TIMEOUT,
	      time: timestamp,
	      callback: callback
	    });

	    // reschedule the timeouts
	    _schedule();

	    return id;
	  };

	  /**
	   * Set a trigger, which is triggered when the timeout occurs in hyper-time.
	   * See also getTimeout.
	   * @param {Function} callback   Function executed when timeout occurs.
	   * @param {Date | number} time  An absolute moment in time (Date) when the
	   *                              callback will be triggered. When the date is
	   *                              a Date in the past, the callback is triggered
	   *                              immediately.
	   * @return {number} Returns a triggerId which can be used to cancel the
	   *                  trigger using clearTrigger().
	   */
	  timer.setTrigger = function (callback, time) {
	    var id = idSeq++;
	    var timestamp = Number(time);
	    if (isNaN(timestamp)) {
	      throw new TypeError('time must be a Date or number');
	    }

	    // add a new timeout to the queue
	    _queueTimeout({
	      id: id,
	      type: TYPE.TRIGGER,
	      time: timestamp,
	      callback: callback
	    });

	    // reschedule the timeouts
	    _schedule();

	    return id;
	  };


	  /**
	   * Trigger a callback every interval. Optionally, a start date can be provided
	   * to specify the first time the callback must be triggered.
	   * See also setTimeout and setTrigger.
	   * @param {Function} callback         Function executed when delay is exceeded.
	   * @param {number} interval           Interval in milliseconds. When interval
	   *                                    is smaller than zero or is infinity, the
	   *                                    interval will be set to zero and triggered
	   *                                    with a maximum rate.
	   * @param {Date | number} [firstTime] An absolute moment in time (Date) when the
	   *                                    callback will be triggered the first time.
	   *                                    By default, firstTime = now() + interval.
	   * @return {number} Returns a intervalId which can be used to cancel the
	   *                  trigger using clearInterval().
	   */
	  timer.setInterval = function(callback, interval, firstTime) {
	    var id = idSeq++;

	    var _interval = Number(interval);
	    if (isNaN(_interval)) {
	      throw new TypeError('interval must be a number');
	    }
	    if (_interval < 0 || !isFinite(_interval)) {
	      _interval = 0;
	    }

	    var timestamp;
	    if (firstTime != undefined) {
	      timestamp = Number(firstTime);
	      if (isNaN(timestamp)) {
	        throw new TypeError('firstTime must be a Date or number');
	      }
	    }
	    else {
	      // firstTime is undefined or null
	      timestamp = (timer.now() + _interval);
	    }

	    // add a new timeout to the queue
	    _queueTimeout({
	      id: id,
	      type: TYPE.INTERVAL,
	      interval: _interval,
	      time: timestamp,
	      firstTime: timestamp,
	      occurrence: 0,
	      callback: callback
	    });

	    // reschedule the timeouts
	    _schedule();

	    return id;
	  };

	  /**
	   * Cancel a timeout
	   * @param {number} timeoutId   The id of a timeout
	   */
	  timer.clearTimeout = function(timeoutId) {
	    // test whether timeout is currently being executed
	    if (current[timeoutId]) {
	      delete current[timeoutId];
	      return;
	    }

	    // find the timeout in the queue
	    for (var i = 0; i < timeouts.length; i++) {
	      if (timeouts[i].id === timeoutId) {
	        // remove this timeout from the queue
	        timeouts.splice(i, 1);

	        // reschedule timeouts
	        _schedule();
	        break;
	      }
	    }
	  };

	  /**
	   * Cancel a trigger
	   * @param {number} triggerId   The id of a trigger
	   */
	  timer.clearTrigger = timer.clearTimeout;

	  timer.clearInterval = timer.clearTimeout;

	  /**
	   * Returns a list with the id's of all timeouts
	   * @returns {number[]} Timeout id's
	   */
	  timer.list = function () {
	    return timeouts.map(function (timeout) {
	      return timeout.id;
	    });
	  };

	  /**
	   * Clear all timeouts
	   */
	  timer.clear = function () {
	    // empty the queue
	    current = {};
	    timeouts = [];

	    // reschedule
	    _schedule();
	  };

	  /**
	   * Add a timeout to the queue. After the queue has been changed, the queue
	   * must be rescheduled by executing _reschedule()
	   * @param {{id: number, type: number, time: number, callback: Function}} timeout
	   * @private
	   */
	  function _queueTimeout(timeout) {
	    // insert the new timeout at the right place in the array, sorted by time
	    if (timeouts.length > 0) {
	      var i = timeouts.length - 1;
	      while (i >= 0 && timeouts[i].time > timeout.time) {
	        i--;
	      }

	      // insert the new timeout in the queue. Note that the timeout is
	      // inserted *after* existing timeouts with the exact *same* time,
	      // so the order in which they are executed is deterministic
	      timeouts.splice(i + 1, 0, timeout);
	    }
	    else {
	      // queue is empty, append the new timeout
	      timeouts.push(timeout);
	    }
	  }

	  /**
	   * Execute a timeout
	   * @param {{id: number, type: number, time: number, callback: function}} timeout
	   * @param {function} [callback]
	   *             The callback is executed when the timeout's callback is
	   *             finished. Called without parameters
	   * @private
	   */
	  function _execTimeout(timeout, callback) {
	    // store the timeout in the queue with timeouts in progress
	    // it can be cleared when a clearTimeout is executed inside the callback
	    current[timeout.id] = timeout;

	    function finish() {
	      // in case of an interval we have to reschedule on next cycle
	      // interval must not be cleared while executing the callback
	      if (timeout.type === TYPE.INTERVAL && current[timeout.id]) {
	        timeout.occurrence++;
	        timeout.time = timeout.firstTime + timeout.occurrence * timeout.interval;
	        _queueTimeout(timeout);
	      }

	      // remove the timeout from the queue with timeouts in progress
	      delete current[timeout.id];

	      if (typeof callback === 'function') callback();
	    }

	    // execute the callback
	    try {
	      if (timeout.callback.length == 0) {
	        // synchronous timeout,  like `timer.setTimeout(function () {...}, delay)`
	        timeout.callback();
	        finish();
	      } else {
	        // asynchronous timeout, like `timer.setTimeout(function (done) {...; done(); }, delay)`
	        timeout.callback(finish);
	      }
	    } catch (err) {
	      // silently ignore errors thrown by the callback
	      finish();
	    }
	  }

	  /**
	   * Remove all timeouts occurring before or on the provided time from the
	   * queue and return them.
	   * @param {number} time    A timestamp
	   * @returns {Array} returns an array containing all expired timeouts
	   * @private
	   */
	  function _getExpiredTimeouts(time) {
	    var i = 0;
	    while (i < timeouts.length && ((timeouts[i].time <= time) || !isFinite(timeouts[i].time))) {
	      i++;
	    }
	    var expired = timeouts.splice(0, i);

	    if (deterministic == false) {
	      // the array with expired timeouts is in deterministic order
	      // shuffle them
	      util.shuffle(expired);
	    }

	    return expired;
	  }

	  /**
	   * Reschedule all queued timeouts
	   * @private
	   */
	  function _schedule() {
	    // do not _schedule when there are timeouts in progress
	    // this can be the case with async timeouts in discrete time.
	    // _schedule will be executed again when all async timeouts are finished.
	    if (rate === DISCRETE && Object.keys(current).length > 0) {
	      return;
	    }

	    var next = timeouts[0];

	    // cancel timer when running
	    if (timeoutId) {
	      clearTimeout(timeoutId);
	      timeoutId = null;
	    }

	    if (running && next) {
	      // schedule next timeout
	      var time = next.time;
	      var delay = time - timer.now();
	      var realDelay = (rate === DISCRETE) ? 0 : delay / rate;

	      function onTimeout() {
	        // when running in discrete time, update the hyperTime to the time
	        // of the current event
	        if (rate === DISCRETE) {
	          hyperTime = (time > hyperTime && isFinite(time)) ? time : hyperTime;
	        }

	        // grab all expired timeouts from the queue
	        var expired = _getExpiredTimeouts(time);
	        // note: expired.length can never be zero (on every change of the queue, we reschedule)

	        // execute all expired timeouts
	        if (rate === DISCRETE) {
	          // in discrete time, we execute all expired timeouts serially,
	          // and wait for their completion in order to guarantee deterministic
	          // order of execution
	          function next() {
	            var timeout = expired.shift();
	            if (timeout) {
	              _execTimeout(timeout, next);
	            }
	            else {
	              // schedule the next round
	              _schedule();
	            }
	          }
	          next();
	        }
	        else {
	          // in continuous time, we fire all timeouts in parallel,
	          // and don't await their completion (they can do async operations)
	          expired.forEach(_execTimeout);

	          // schedule the next round
	          _schedule();
	        }
	      }

	      timeoutId = setTimeout(onTimeout, Math.round(realDelay));
	      // Note: Math.round(realDelay) is to defeat a bug in node.js v0.10.30,
	      //       see https://github.com/joyent/node/issues/8065
	    }
	  }

	  Object.defineProperty(timer, 'running', {
	    get: function () {
	      return running;
	    }
	  });

	  timer.config(options);         // apply options
	  timer.setTime(util.systemNow()); // set time as current real time
	  timer.continue();              // start the timer

	  return timer;
	}

	module.exports = hypertimer;


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * Module dependencies.
	 */

	var global = (function() { return this; })();

	/**
	 * WebSocket constructor.
	 */

	var WebSocket = global.WebSocket || global.MozWebSocket;

	/**
	 * Module exports.
	 */

	module.exports = WebSocket ? ws : null;

	/**
	 * WebSocket constructor.
	 *
	 * The third `opts` options object gets ignored in web browsers, since it's
	 * non-standard, and throws a TypeError if passed to the constructor.
	 * See: https://github.com/einaros/ws/issues/227
	 *
	 * @param {String} uri
	 * @param {Array} protocols (optional)
	 * @param {Object) opts (optional)
	 * @api public
	 */

	function ws(uri, protocols, opts) {
	  var instance;
	  if (protocols) {
	    instance = new WebSocket(uri, protocols);
	  } else {
	    instance = new WebSocket(uri);
	  }
	  return instance;
	}

	if (WebSocket) ws.prototype = WebSocket.prototype;


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var asap = __webpack_require__(72)

	module.exports = Promise;
	function Promise(fn) {
	  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
	  if (typeof fn !== 'function') throw new TypeError('not a function')
	  var state = null
	  var value = null
	  var deferreds = []
	  var self = this

	  this.then = function(onFulfilled, onRejected) {
	    return new self.constructor(function(resolve, reject) {
	      handle(new Handler(onFulfilled, onRejected, resolve, reject))
	    })
	  }

	  function handle(deferred) {
	    if (state === null) {
	      deferreds.push(deferred)
	      return
	    }
	    asap(function() {
	      var cb = state ? deferred.onFulfilled : deferred.onRejected
	      if (cb === null) {
	        (state ? deferred.resolve : deferred.reject)(value)
	        return
	      }
	      var ret
	      try {
	        ret = cb(value)
	      }
	      catch (e) {
	        deferred.reject(e)
	        return
	      }
	      deferred.resolve(ret)
	    })
	  }

	  function resolve(newValue) {
	    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
	      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
	      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
	        var then = newValue.then
	        if (typeof then === 'function') {
	          doResolve(then.bind(newValue), resolve, reject)
	          return
	        }
	      }
	      state = true
	      value = newValue
	      finale()
	    } catch (e) { reject(e) }
	  }

	  function reject(newValue) {
	    state = false
	    value = newValue
	    finale()
	  }

	  function finale() {
	    for (var i = 0, len = deferreds.length; i < len; i++)
	      handle(deferreds[i])
	    deferreds = null
	  }

	  doResolve(fn, resolve, reject)
	}


	function Handler(onFulfilled, onRejected, resolve, reject){
	  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
	  this.onRejected = typeof onRejected === 'function' ? onRejected : null
	  this.resolve = resolve
	  this.reject = reject
	}

	/**
	 * Take a potentially misbehaving resolver function and make sure
	 * onFulfilled and onRejected are only called once.
	 *
	 * Makes no guarantees about asynchrony.
	 */
	function doResolve(fn, onFulfilled, onRejected) {
	  var done = false;
	  try {
	    fn(function (value) {
	      if (done) return
	      done = true
	      onFulfilled(value)
	    }, function (reason) {
	      if (done) return
	      done = true
	      onRejected(reason)
	    })
	  } catch (ex) {
	    if (done) return
	    done = true
	    onRejected(ex)
	  }
	}


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(35)
	var asap = __webpack_require__(72)

	module.exports = Promise
	Promise.prototype.done = function (onFulfilled, onRejected) {
	  var self = arguments.length ? this.then.apply(this, arguments) : this
	  self.then(null, function (err) {
	    asap(function () {
	      throw err
	    })
	  })
	}

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	//This file contains the ES6 extensions to the core Promises/A+ API

	var Promise = __webpack_require__(35)
	var asap = __webpack_require__(72)

	module.exports = Promise

	/* Static Functions */

	function ValuePromise(value) {
	  this.then = function (onFulfilled) {
	    if (typeof onFulfilled !== 'function') return this
	    return new Promise(function (resolve, reject) {
	      asap(function () {
	        try {
	          resolve(onFulfilled(value))
	        } catch (ex) {
	          reject(ex);
	        }
	      })
	    })
	  }
	}
	ValuePromise.prototype = Promise.prototype

	var TRUE = new ValuePromise(true)
	var FALSE = new ValuePromise(false)
	var NULL = new ValuePromise(null)
	var UNDEFINED = new ValuePromise(undefined)
	var ZERO = new ValuePromise(0)
	var EMPTYSTRING = new ValuePromise('')

	Promise.resolve = function (value) {
	  if (value instanceof Promise) return value

	  if (value === null) return NULL
	  if (value === undefined) return UNDEFINED
	  if (value === true) return TRUE
	  if (value === false) return FALSE
	  if (value === 0) return ZERO
	  if (value === '') return EMPTYSTRING

	  if (typeof value === 'object' || typeof value === 'function') {
	    try {
	      var then = value.then
	      if (typeof then === 'function') {
	        return new Promise(then.bind(value))
	      }
	    } catch (ex) {
	      return new Promise(function (resolve, reject) {
	        reject(ex)
	      })
	    }
	  }

	  return new ValuePromise(value)
	}

	Promise.all = function (arr) {
	  var args = Array.prototype.slice.call(arr)

	  return new Promise(function (resolve, reject) {
	    if (args.length === 0) return resolve([])
	    var remaining = args.length
	    function res(i, val) {
	      try {
	        if (val && (typeof val === 'object' || typeof val === 'function')) {
	          var then = val.then
	          if (typeof then === 'function') {
	            then.call(val, function (val) { res(i, val) }, reject)
	            return
	          }
	        }
	        args[i] = val
	        if (--remaining === 0) {
	          resolve(args);
	        }
	      } catch (ex) {
	        reject(ex)
	      }
	    }
	    for (var i = 0; i < args.length; i++) {
	      res(i, args[i])
	    }
	  })
	}

	Promise.reject = function (value) {
	  return new Promise(function (resolve, reject) { 
	    reject(value);
	  });
	}

	Promise.race = function (values) {
	  return new Promise(function (resolve, reject) { 
	    values.forEach(function(value){
	      Promise.resolve(value).then(resolve, reject);
	    })
	  });
	}

	/* Prototype Methods */

	Promise.prototype['catch'] = function (onRejected) {
	  return this.then(null, onRejected);
	}


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	//This file contains then/promise specific extensions that are only useful for node.js interop

	var Promise = __webpack_require__(35)
	var asap = __webpack_require__(72)

	module.exports = Promise

	/* Static Functions */

	Promise.denodeify = function (fn, argumentCount) {
	  argumentCount = argumentCount || Infinity
	  return function () {
	    var self = this
	    var args = Array.prototype.slice.call(arguments)
	    return new Promise(function (resolve, reject) {
	      while (args.length && args.length > argumentCount) {
	        args.pop()
	      }
	      args.push(function (err, res) {
	        if (err) reject(err)
	        else resolve(res)
	      })
	      fn.apply(self, args)
	    })
	  }
	}
	Promise.nodeify = function (fn) {
	  return function () {
	    var args = Array.prototype.slice.call(arguments)
	    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
	    var ctx = this
	    try {
	      return fn.apply(this, arguments).nodeify(callback, ctx)
	    } catch (ex) {
	      if (callback === null || typeof callback == 'undefined') {
	        return new Promise(function (resolve, reject) { reject(ex) })
	      } else {
	        asap(function () {
	          callback.call(ctx, ex)
	        })
	      }
	    }
	  }
	}

	Promise.prototype.nodeify = function (callback, ctx) {
	  if (typeof callback != 'function') return this

	  this.then(function (value) {
	    asap(function () {
	      callback.call(ctx, null, value)
	    })
	  }, function (err) {
	    asap(function () {
	      callback.call(ctx, err)
	    })
	  })
	}


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Babbler = __webpack_require__(49);

	var Tell = __webpack_require__(56);
	var Listen = __webpack_require__(57);
	var Then = __webpack_require__(58);
	var Decision = __webpack_require__(59);
	var IIf = __webpack_require__(60);

	/**
	 * Create a new babbler
	 * @param {String} id
	 * @return {Babbler} babbler
	 */
	exports.babbler = function (id) {
	  return new Babbler(id);
	};

	/**
	 * Create a control flow starting with a tell block
	 * @param {* | Function} [message] A static message or callback function
	 *                                 returning a message dynamically.
	 *                                 When `message` is a function, it will be
	 *                                 invoked as callback(message, context),
	 *                                 where `message` is the output from the
	 *                                 previous block in the chain, and `context` is
	 *                                 an object where state can be stored during a
	 *                                 conversation.
	 * @return {Tell} tell
	 */
	exports.tell = function (message) {
	  return new Tell(message);
	};

	/**
	 * Send a question, listen for a response.
	 * Creates two blocks: Tell and Listen.
	 * This is equivalent of doing `babble.tell(message).listen(callback)`
	 * @param {* | Function} message
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Last block in the created control flow
	 */
	exports.ask = function (message, callback) {
	  return exports
	      .tell(message)
	      .listen(callback);
	};

	/**
	 * Create a decision block and chain it to the current block.
	 *
	 * Syntax:
	 *
	 *     decide(choices)
	 *     decide(decision, choices)
	 *
	 * Where:
	 *
	 *     {Function | Object} [decision]
	 *                              When a `decision` function is provided, the
	 *                              function is invoked as decision(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 *                              The function must return the id for the next
	 *                              block in the control flow, which must be
	 *                              available in the provided `choices`.
	 *                              If `decision` is not provided, the next block
	 *                              will be mapped directly from the message.
	 *     {Object.<String, Block>} choices
	 *                              A map with the possible next blocks in the flow
	 *                              The next block is selected by the id returned
	 *                              by the decision function.
	 *
	 * There is one special id for choices: 'default'. This id is called when either
	 * the decision function returns an id which does not match any of the available
	 * choices.
	 *
	 * @param {Function | Object} arg1  Can be {function} decision or {Object} choices
	 * @param {Object} [arg2]           choices
	 * @return {Block} decision         The created decision block
	 */
	exports.decide = function (arg1, arg2) {
	  // TODO: test arguments.length > 2
	  return new Decision(arg1, arg2);
	};

	/**
	 * Listen for a message.
	 *
	 * Optionally a callback function can be provided, which is equivalent of
	 * doing `listen().then(callback)`.
	 *
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block}              Returns the created Listen block
	 */
	exports.listen = function(callback) {
	  var block = new Listen();
	  if (callback) {
	    return block.then(callback);
	  }
	  return block;
	};

	/**
	 * Create a control flow starting with a Then block
	 * @param {Function} callback   Invoked as callback(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 * @return {Then} then
	 */
	exports.then = function (callback) {
	  return new Then(callback);
	};

	/**
	 * IIf
	 * Create an iif block, which checks a condition and continues either with
	 * the trueBlock or the falseBlock. The input message is passed to the next
	 * block in the flow.
	 *
	 * Can be used as follows:
	 * - When `condition` evaluates true:
	 *   - when `trueBlock` is provided, the flow continues with `trueBlock`
	 *   - else, when there is a block connected to the IIf block, the flow continues
	 *     with that block.
	 * - When `condition` evaluates false:
	 *   - when `falseBlock` is provided, the flow continues with `falseBlock`
	 *
	 * Syntax:
	 *
	 *     new IIf(condition, trueBlock)
	 *     new IIf(condition, trueBlock [, falseBlock])
	 *     new IIf(condition).then(...)
	 *
	 * @param {Function | RegExp | *} condition   A condition returning true or false
	 *                                            In case of a function,
	 *                                            the function is invoked as
	 *                                            `condition(message, context)` and
	 *                                            must return a boolean. In case of
	 *                                            a RegExp, condition will be tested
	 *                                            to return true. In other cases,
	 *                                            non-strict equality is tested on
	 *                                            the input.
	 * @param {Block} [trueBlock]
	 * @param {Block} [falseBlock]
	 * @returns {Block}
	 */
	exports.iif = function (condition, trueBlock, falseBlock) {
	  return new IIf(condition, trueBlock, falseBlock);
	};

	// export the babbler prototype
	exports.Babbler = Babbler;

	// export all flow blocks
	exports.block = {
	  Block: __webpack_require__(61),
	  Then: __webpack_require__(58),
	  Decision: __webpack_require__(59),
	  IIf: __webpack_require__(60),
	  Listen: __webpack_require__(57),
	  Tell: __webpack_require__(56)
	};

	// export messagebus interfaces
	exports.messagebus = __webpack_require__(50);

	/**
	 * Babblify an actor. The babblified actor will be extended with functions
	 * `ask`, `tell`, and `listen`.
	 *
	 * Babble expects that messages sent via `actor.send(to, message)` will be
	 * delivered by the recipient on a function `actor.receive(from, message)`.
	 * Babble replaces the original `receive` with a new one, which is used to
	 * listen for all incoming messages. Messages ignored by babble are propagated
	 * to the original `receive` function.
	 *
	 * The actor can be restored in its original state using `unbabblify(actor)`.
	 *
	 * @param {Object} actor      The actor to be babblified. Must be an object
	 *                            containing functions `send(to, message)` and
	 *                            `receive(from, message)`.
	 * @param {Object} [params]   Optional parameters. Can contain properties:
	 *                            - id: string        The id for the babbler
	 *                            - send: string      The name of an alternative
	 *                                                send function available on
	 *                                                the actor.
	 *                            - receive: string The name of an alternative
	 *                                                receive function available
	 *                                                on the actor.
	 * @returns {Object}          Returns the babblified actor.
	 */
	exports.babblify = function (actor, params) {
	  var babblerId;
	  if (params && params.id !== undefined) {
	    babblerId = params.id;
	  }
	  else if (actor.id !== undefined) {
	    babblerId = actor.id
	  }
	  else {
	    throw new Error('Id missing. Ensure that either actor has a property "id", ' +
	        'or provide an id as a property in second argument params')
	  }

	  // validate actor
	  ['ask', 'tell', 'listen'].forEach(function (prop) {
	    if (actor[prop] !== undefined) {
	      throw new Error('Conflict: actor already has a property "' + prop + '"');
	    }
	  });

	  var sendName = params && params.send || 'send';
	  if (typeof actor[sendName] !== 'function') {
	    throw new Error('Missing function. ' +
	        'Function "' + sendName + '(to, message)" expected on actor or on params');
	  }

	  // create a new babbler
	  var babbler = exports.babbler(babblerId);

	  // attach receive function to the babbler
	  var receiveName = params && params.receive || 'receive';
	  var receiveOriginal = actor.hasOwnProperty(receiveName) ? actor[receiveName] : null;
	  if (receiveOriginal) {
	    actor[receiveName] = function (from, message) {
	      babbler._receive(message);
	      receiveOriginal.call(actor, from, message);
	    };
	  }
	  else {
	    actor[receiveName] = function (from, message) {
	      babbler._receive(message);
	    };
	  }

	  // attach send function to the babbler
	  babbler.send = function (to, message) {
	    // FIXME: there should be no need to send a message on next tick
	    setTimeout(function () {
	      actor[sendName](to, message)
	    }, 0)
	  };

	  // attach babbler functions and properties to the actor
	  actor.__babbler__ = {
	    babbler: babbler,
	    receive: receiveOriginal,
	    receiveName: receiveName
	  };
	  actor.ask = babbler.ask.bind(babbler);
	  actor.tell = babbler.tell.bind(babbler);
	  actor.listen = babbler.listen.bind(babbler);
	  actor.listenOnce = babbler.listenOnce.bind(babbler);

	  return actor;
	};

	/**
	 * Unbabblify an actor.
	 * @param {Object} actor
	 * @return {Object} Returns the unbabblified actor.
	 */
	exports.unbabblify = function (actor) {
	  var __babbler__ = actor.__babbler__;
	  if (__babbler__) {
	    delete actor.__babbler__;
	    delete actor.ask;
	    delete actor.tell;
	    delete actor.listen;
	    delete actor.listenOnce;
	    delete actor[__babbler__.receiveName];

	    // restore any original receive method
	    if (__babbler__.receive) {
	      actor[__babbler__.receiveName] = __babbler__.receive;
	    }
	  }

	  return actor;
	};


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	var WebSocket = __webpack_require__(76);
	var WebSocketServer = __webpack_require__(76).Server;
	var uuid = __webpack_require__(74);
	var Promise = __webpack_require__(41);
	var requestify = __webpack_require__(51);
	var Peer = __webpack_require__(52);

	/**
	 * Host
	 * @param {Object} [options]  Available options: see Host.config
	 */
	function Host(options) {
	  var me = this;

	  // peers and cached peer addresses
	  this.peers = {};      // local peers
	  this.addresses = {};  // cached addresses of peers located on other hosts

	  // pubsub
	  this.channels = {};   // keys are the channels, values are arrays with callbacks of subscribers

	  // default options
	  this.options = {
	    reconnectTimeout: 5 * 60 * 1000,  // give up reconnecting after 5 minutes
	    reconnectDelay: 1000,             // try reconnecting after one second
	    reconnectDecay: 2
	  };

	  // server properties
	  this.server = null;
	  this.address = null;
	  this.port = null;
	  this.connections = {}; // List with open connections, key is the url and value is the connection
	  this.timers = {};      // reconnect timers

	  /**
	   * Send a message from one peer to another
	   * @param {string} from   Id of the sending peer
	   * @param {string} to     Id of the receiving peer
	   * @param {*} message     JSON message
	   * @returns {Promise.<null, Error>} Resolves when sent
	   */
	  this.send = function (from, to, message) {
	    // see if the peer lives on the same host
	    var peer = me.peers[to];
	    if (peer) {
	      peer.emit('message', from, message);
	      return Promise.resolve(null);
	    }

	    // find the remote host where the recipient is located
	    return me.find(to)
	        .then(function (url) {
	          var conn = me.connections[url];
	          if (conn) {
	            var request = {
	              method: 'send',
	              params: {
	                from: from,
	                to: to,
	                message: message
	              }
	            };
	            // TODO: there is a maximum callstack issue when queuing a lot of notifications
	            return conn.request(request) // the send request returns null
	            //return conn.notify(request) // the send request returns null
	                .catch(function (err) {
	                  // FIXME: use a protocol for errors, use error code
	                  if (err.toString().indexOf('Error: Peer not found') === 0) {
	                    // this peer was deleted. Remove it from cache
	                    delete me.addresses[to];
	                    throw _peerNotFoundError(to);
	                  }
	                })
	          }
	          else {
	            throw _peerUnreachable(to, url);
	          }
	        });
	  };

	  this.config(options);
	}

	/**
	 * Apply configuration options to the host, and/or retrieve the current
	 * configuration.
	 * @param {Object} [options]  Available options:
	 *                            - networkId          An id for the distribus
	 *                                                 network. A Host can only
	 *                                                 connect to other hosts with
	 *                                                 the same id. networkId cannot
	 *                                                 be changed once set.
	 *                            - reconnectTimeout   Timeout in milliseconds for
	 *                                                 giving up reconnecting.
	 *                                                 5 minutes by default
	 *                            - reconnectDelay     Initial delay for trying to
	 *                                                 reconnect. for consecutive
	 *                                                 reconnect trials, the delay
	 *                                                 decays with a factor
	 *                                                 `reconnectDecay`.
	 *                                                 1 second by default.
	 *                            - reconnectDecay     Decay for the reconnect
	 *                                                 delay. 2 by default.
	 * @return {Object} Returns the current configuration
	 */
	Host.prototype.config = function (options) {
	  // apply new options
	  if (options) {
	    _merge(this.options, options);

	    // apply networkId
	    if (options.networkId) {
	      if (this.networkId !== null) {
	        this.networkId = options.networkId;
	      }
	      else {
	        throw new Error('Cannot replace networkId once set');
	      }
	    }
	  }

	  // return a copy of the options
	  return _merge({}, this.options);
	};

	/**
	 * Create a new peer.
	 * Throws an error when a peer with the same id already exists on this host.
	 * Does not check whether this id exists on any remote host (use Host.find(id)
	 * to validate this before creating a peer, or even better, use a uuid to
	 * prevent id collisions).
	 * @param {string} id   The id for the new peer
	 * @return {Peer} Returns the created peer
	 */
	Host.prototype.create = function (id) {
	  if (id in this.peers) {
	    throw new Error('Id already exists (id: ' + id +')');
	  }

	  var peer = new Peer(id, this.send);
	  this.peers[id] = peer;

	  return peer;
	};

	/**
	 * Remove a peer from the host
	 * @param {Peer | string} peer  A peer or the id of a peer
	 */
	Host.prototype.remove = function (peer) {
	  if (peer instanceof Peer) { // a peer instance
	    delete this.peers[peer.id];
	  }
	  else if (peer) { // a string with the peers id
	    delete this.peers[peer];
	  }
	};

	/**
	 * Get a local peer by its id
	 * @param {string} id   The id of an existing peer
	 * @return {Peer | null} returns the peer, or returns null when not existing.
	 */
	Host.prototype.get = function (id) {
	  return this.peers[id] || null;
	};

	/**
	 * Find the host of a peer by it's id
	 * @param {string} id   Id of a peer
	 * @return {Promise.<string | null, Error>} The url of the peers host.
	 *                                          Returns null if the found host has no url.
	 *                                          Throws an error if not found.
	 */
	Host.prototype.find = function (id) {
	  var me = this;

	  // check if this is a local peer
	  if (id in me.peers) {
	    return Promise.resolve(me.url || null);
	  }

	  // check if this id is already in cache
	  var url = me.addresses[id];
	  if (url) {
	    // yes, we already have the address
	    return Promise.resolve(url);
	  }

	  // search on other hosts
	  return new Promise(function (resolve, reject) {
	    // TODO: send requests in small batches, not all at once

	    // send a find request to a host
	    var found = false;
	    function _find(url) {
	      var conn = me.connections[url];
	      return conn.request({method: 'find', params: {id: id}})
	          .then(function (url) {
	            if (url && !found) {
	              // we found the peer
	              found = true;

	              // put this address in cache
	              // TODO: limit the number of cached addresses. When exceeding the limit, store on disk in a temporary db
	              me.addresses[id] = url;

	              // return the found url
	              resolve(url);
	            }
	          });
	    }

	    // ask all connected hosts if they host this peer
	    var results = Object.keys(me.connections).map(_find);

	    // if all requests are finished and the peer is not found, reject with an error
	    Promise.all(results)
	        .then(function () {
	          if (!found || results.length == 0) {
	            reject(_peerNotFoundError(id));
	          }
	        });
	  });
	};

	/**
	 * Start listening on a socket.
	 * @param {string} address
	 * @param {number} port
	 * @return {Promise.<Host, Error>} Returns itself when connected
	 */
	Host.prototype.listen = function (address, port) {
	  var me = this;

	  return new Promise(function (resolve, reject) {
	    if (me.server) {
	      reject(new Error('Server already listening'));
	      return;
	    }

	    me.server = new WebSocketServer({port: port}, function () {
	      me.address = address;
	      me.port = port;
	      me.url = 'ws://' + address + ':' + port;

	      resolve(me);
	    });

	    me.server.on('connection', function (conn) {
	      conn = requestify(conn);

	      conn.onerror = function (err) {
	        // TODO: what to do with errors?
	      };

	      conn.onclose = function () {
	        // remove this connection from the connections list
	        // (we do not yet forget the cached peers)
	        var url = me._findUrl(conn);
	        delete me.connections[url];

	        me.timers[url] = setTimeout(function () {
	          delete me.timers[url];

	          // clear cache
	          me._forgetPeers(url);
	        }, me.options.reconnectTimeout);
	      };

	      conn.onrequest = function (request) {
	        return me._onRequest(conn, request);
	      };
	    });

	    me.server.on('error', function (err) {
	      reject(err)
	    });
	  });
	};

	/**
	 * Handle a request
	 * @param {WebSocket} conn
	 * @param {Object} request
	 * @returns {Promise}
	 * @private
	 */
	Host.prototype._onRequest = function (conn, request) {
	  var me = this;
	  var url;

	  switch (request.method) {
	    case 'greeting':
	      url = request.params && request.params.url;
	      var networkId = request.params.networkId || null;
	      if (networkId === null || networkId === me.networkId) {
	        if (url && !(url in this.connections)) {
	          this.connections[url] = conn;
	          return this._broadcastJoin(url)
	              .then(function () {
	                return Promise.resolve({networkId: me.networkId})
	              });
	        }
	        else {
	          return Promise.resolve({networkId: me.networkId});
	        }
	      }
	      else {
	        return Promise.reject(new Error('Network id mismatch (' + networkId + ' !== ' + me.networkId + ')'));
	      }

	    case 'join':
	      url = request.params && request.params.url;
	      return this.join(url)
	          .then(function (host) {
	            return Promise.resolve();
	          });

	    case 'goodbye':
	      url = this._findUrl(conn);
	      this._forgetPeers(url);
	      this._disconnect(url);
	      return Promise.resolve('goodbye');

	    case 'hosts':
	      // connect to all newly retrieved urls
	      if (request.params && request.params.urls) {
	        this.join(request.params.urls);
	      }

	      // return a list with the urls of all known hosts
	      return Promise.resolve(Object.keys(this.connections));

	    case 'find': // find a peer
	      var id = request.params && request.params.id;
	      return Promise.resolve(this.peers[id] ? this.url : null);

	    case 'send':
	      var from    = request.params && request.params.from;
	      var to      = request.params && request.params.to;
	      var message = request.params && request.params.message;

	        // TODO: validate whether all parameters are there
	      var peer = this.peers[to];
	      if (peer) {
	        peer.emit('message', from, message);
	        return Promise.resolve(null);
	      }
	      else {
	        return Promise.reject(_peerNotFoundError(to).toString());
	      }

	    case 'publish':
	      var channel = request.params && request.params.channel;
	      var message = request.params && request.params.message;
	      this._publish(channel, message);
	      return Promise.resolve({
	        result: null,
	        error: null
	      });

	    case 'ping':
	      return Promise.resolve({
	        result: request.params,
	        error: null
	      });

	    default:
	      return Promise.reject('Unknown method "' + request.method + '"');
	  }
	};

	/**
	 * Find an url from a connection
	 * @param {WebSocket} conn
	 * @return {String | null} url
	 * @private
	 */
	Host.prototype._findUrl = function (conn) {
	  // search by instance
	  for (var url in this.connections) {
	    if (this.connections.hasOwnProperty(url) && this.connections[url] === conn) {
	      return url;
	    }
	  }

	  return null;
	};

	/**
	 * Remove all cached peers of given
	 * @param {string} url   Url of a host for which to forget the cached peers
	 * @private
	 */
	Host.prototype._forgetPeers = function (url) {
	  // remove all cached peers
	  for (var id in this.addresses) {
	    if (this.addresses.hasOwnProperty(id) && this.addresses[id] === url) {
	      delete this.addresses[id];
	    }
	  }
	};

	/**
	 * Join an other Host.
	 * A host can only join another host when having the same id, or having no id
	 * defined. In the latter case, the host will orphan the id of the host it
	 * connects to.
	 * @param {string} url              For example 'ws://localhost:3000'
	 * @return {Promise.<Host, Error>}  Returns itself when joined
	 */
	Host.prototype.join = function (url) {
	  var me = this;

	  if (url && !(url in me.connections)) {
	    return me._connect(url)
	        .then(function () {
	          // broadcast the join request to all known hosts
	          return me._broadcastJoin(url);
	        })
	        .then(function (urls) {
	          // return the host itself as last result in the promise chain
	          return me;
	        });
	      // TODO: handle connection error
	  }
	  else {
	    // already known url. ignore this join
	    // FIXME: it is possible that this connection is still being established
	    return Promise.resolve(me);
	  }
	};

	/**
	 * Open a connection to an other host and add the host to the list of connected
	 * hosts.
	 * @param {String} url
	 * @returns {Promise.<WebSocket, Error>} Returns the established connection
	 * @private
	 */
	Host.prototype._connect = function(url) {
	  var me = this;

	  return new Promise(function (resolve, reject) {
	    // open a web socket
	    var conn = new WebSocket(url);
	    requestify(conn);
	    me.connections[url] = conn;

	    conn.onrequest = function (request) {
	      return me._onRequest(conn, request);
	    };

	    conn.onclose = function () {
	      if (me.connections[url]) {
	        // remove the connection from the list
	        delete me.connections[url];

	        // schedule reconnection
	        me._reconnect(url);
	      }
	    };

	    conn.onopen = function () {
	      // send a greeting with the hosts url
	      conn.request({method: 'greeting', params: { url: me.url, networkId: me.networkId } })
	          .then(function (params) {
	            me.networkId = params.networkId;
	            resolve(conn);
	          })
	          .catch(function (err) {
	            // greeting rejected
	            delete me.connections[url];
	            conn.close();
	            reject(err);
	          });
	    };

	    conn.onerror = function (err) {
	      delete me.connections[url];
	      reject(err);
	      conn.close();
	    };
	  });
	};

	/**
	 * Reconnect with a host
	 * @param {String} url    Url of the host to which to reconnect
	 * @private
	 */
	Host.prototype._reconnect = function (url) {
	  var me = this;
	  var start = new Date().valueOf();

	  function scheduleReconnect(delay, trial) {
	    me.timers[url] = setTimeout(function () {
	      delete me.timers[url];

	      var now = new Date().valueOf();
	      if (now - start < me.options.reconnectTimeout) {
	        // reconnect
	        me._connect(url)
	          .catch(function (err) {
	              // schedule next reconnect trial
	              scheduleReconnect(delay / me.options.reconnectDecay, trial + 1);
	          });
	      }
	      else {
	        // give up trying to reconnect
	        me._forgetPeers(url);
	      }
	    }, delay);
	  }

	  // schedule reconnection after a delay
	  scheduleReconnect(me.options.reconnectDelay, 0);
	};

	/**
	 * Forward a join message to all known hosts
	 * @param {string} url              For example 'ws://localhost:3000'
	 * @return {Promise.<String[], Error>} returns the joined urls
	 */
	Host.prototype._broadcastJoin = function (url) {
	  // TODO: implement a more efficient broadcast mechanism

	  var me = this;
	  var urls = Object.keys(me.connections)
	      .filter(function (u) {
	        return u !== url
	      });

	  function join (existingUrl) {
	    var conn = me.connections[existingUrl];
	    return conn.request({method: 'join', params: {'url': url}})
	        .catch(function (err) {
	          // TODO: what to do with failed requests? Right now we ignore them
	        })
	        .then(function () {
	          // return the url where the join is broadcasted to
	          return existingUrl;
	        })
	  }

	  // send a join request to all known hosts
	  return Promise.all(urls.map(join));
	};

	/**
	 * Stop listening on currently a socket
	 * @return {Promise.<Host, Error>} Returns itself
	 */
	Host.prototype.close = function () {
	  var me = this;

	  // TODO: create a flag while closing? and opening?
	  if (this.server) {
	    // close the host, and clean up cache
	    function closeHost() {
	      // close the host itself
	      me.addresses = {};

	      if (me.server) {
	        me.server.close();
	        me.server = null;
	        me.address = null;
	        me.port = null;
	        me.url = null;
	      }

	      return me;
	    }

	    // close all connections
	    var urls = Object.keys(this.connections);
	    return Promise.all(urls.map(function (url) {
	      return me._disconnect(url);
	    })).then(closeHost);
	  }
	  else {
	    // no socket open. resolve immediately
	    Promise.resolve(this);
	  }
	};

	/**
	 * Close the connection with a host. Note: peers are not removed from cache
	 * @param {string} url   Url of a connected host
	 * @return {Promise.<undefined, Error>} Resolves a promise when closed
	 * @private
	 */
	Host.prototype._disconnect = function (url) {
	  var conn = this.connections[url];
	  if (conn) {
	    delete this.connections[url];

	    if (this.timers[url]) {
	      clearTimeout(this.timers[url]);
	      delete this.timers[url];
	    }

	    // send a goodbye message
	    return conn.request({method: 'goodbye'})
	        .catch(function (err) {
	          // ignore failing to send goodbye
	        })

	      // then close the connection
	        .then(function () {
	          conn.close();
	        });
	  }
	  else {
	    Promise.resolve();
	  }
	};

	/**
	 * Publish a message via a channel. All listeners subscribed to this channel
	 * will be triggered, both listeners on this host as well as connected hosts.
	 * @param {string} channel  The name of the channel
	 * @param {*} message       A message, can be any type. Must be serializable JSON.
	 */
	Host.prototype.publish = function (channel, message) {
	  // trigger local subscribers
	  this._publish(channel, message);

	  // send the message to all connected hosts
	  for (var url in this.connections) {
	    if (this.connections.hasOwnProperty(url)) {
	      var connection = this.connections[url];
	      connection.notify({
	        method: 'publish',
	        params: {
	          channel: channel,
	          message: message
	        }
	      });
	    }
	  }
	  // TODO: improve efficiency by having the hosts share the channels for which
	  //       they have subscribers, so we only have to send a message to a
	  //       particular host when it has subscribers to the channel.
	};

	/**
	 * Publish a channel to all subscribers on this host.
	 * @param {string} channel  The name of the channel
	 * @param {*} message       A message, can be any type. Must be serializable JSON.
	 * @private
	 */
	Host.prototype._publish = function (channel, message) {
	  // trigger local subscribers
	  var callbacks = this.channels[channel];
	  if (callbacks) {
	    callbacks.forEach(function (callback) {
	      callback(message);
	    });
	  }
	};

	/**
	 * Subscribe to a channel.
	 * @param {string} channel      The name of the channel
	 * @param {function} callback   Called as callback(message)
	 */
	Host.prototype.subscribe = function (channel, callback) {
	  // TODO: implement support for wildcards, like subscribing to "foo.*" or something like that
	  var callbacks = this.channels[channel];
	  if (!callbacks) {
	    callbacks = [];
	    this.channels[channel] = callbacks;
	  }
	  callbacks.push(callback);
	};

	/**
	 * Unsubscribe from a channel.
	 * @param {string} channel      The name of the channel
	 * @param {function} callback   A callback used before to subscribe
	 */
	Host.prototype.unsubscribe = function (channel, callback) {
	  var callbacks = this.channels[channel];
	  if (callbacks) {
	    var index = callbacks.indexOf(callback);
	    if (index !== -1) {
	      callbacks.splice(index, 1);
	      if (callbacks.length === 0) {
	        delete this.channels[channel];
	      }
	    }
	  }
	};

	/**
	 * Merge object b into object a: copy all properties of b to a
	 * @param {Object} a
	 * @param {Object} b
	 * @return {Object} returns the merged a
	 * @private
	 */
	function _merge (a, b) {
	  for (var prop in b) {
	    if (b.hasOwnProperty(prop)) {
	      a[prop] = b[prop];
	    }
	  }
	  return a;
	}

	/**
	 * Create an Error "Peer not found"
	 * @param {string} id   The id of the peer
	 * @return {Error}
	 * @private
	 */
	function _peerNotFoundError(id) {
	  return new Error('Peer not found (id: ' + id + ')');
	}

	/**
	 * Create an Error "Peer unreachable"
	 * @param {string} id   The id of the peer
	 * @param {string} url  Url of the peers host
	 * @return {Error}
	 * @private
	 */
	function _peerUnreachable(id, url) {
	  return new Error('Peer unreachable (id: ' + id + ', url: ' + url + ')');
	}

	// TODO: implement a function list() which returns the id's of all peers in the system

	module.exports = Host;


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	// Return a promise implementation.
	module.exports = __webpack_require__(77);


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	var Stream = __webpack_require__(64);
	var Response = __webpack_require__(53);
	var Base64 = __webpack_require__(70);
	var inherits = __webpack_require__(71);

	var Request = module.exports = function (xhr, params) {
	    var self = this;
	    self.writable = true;
	    self.xhr = xhr;
	    self.body = [];
	    
	    self.uri = (params.protocol || 'http:') + '//'
	        + params.host
	        + (params.port ? ':' + params.port : '')
	        + (params.path || '/')
	    ;
	    
	    if (typeof params.withCredentials === 'undefined') {
	        params.withCredentials = true;
	    }

	    try { xhr.withCredentials = params.withCredentials }
	    catch (e) {}
	    
	    if (params.responseType) try { xhr.responseType = params.responseType }
	    catch (e) {}
	    
	    xhr.open(
	        params.method || 'GET',
	        self.uri,
	        true
	    );

	    xhr.onerror = function(event) {
	        self.emit('error', new Error('Network error'));
	    };

	    self._headers = {};
	    
	    if (params.headers) {
	        var keys = objectKeys(params.headers);
	        for (var i = 0; i < keys.length; i++) {
	            var key = keys[i];
	            if (!self.isSafeRequestHeader(key)) continue;
	            var value = params.headers[key];
	            self.setHeader(key, value);
	        }
	    }
	    
	    if (params.auth) {
	        //basic auth
	        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
	    }

	    var res = new Response;
	    res.on('close', function () {
	        self.emit('close');
	    });
	    
	    res.on('ready', function () {
	        self.emit('response', res);
	    });

	    res.on('error', function (err) {
	        self.emit('error', err);
	    });
	    
	    xhr.onreadystatechange = function () {
	        // Fix for IE9 bug
	        // SCRIPT575: Could not complete the operation due to error c00c023f
	        // It happens when a request is aborted, calling the success callback anyway with readyState === 4
	        if (xhr.__aborted) return;
	        res.handle(xhr);
	    };
	};

	inherits(Request, Stream);

	Request.prototype.setHeader = function (key, value) {
	    this._headers[key.toLowerCase()] = value
	};

	Request.prototype.getHeader = function (key) {
	    return this._headers[key.toLowerCase()]
	};

	Request.prototype.removeHeader = function (key) {
	    delete this._headers[key.toLowerCase()]
	};

	Request.prototype.write = function (s) {
	    this.body.push(s);
	};

	Request.prototype.destroy = function (s) {
	    this.xhr.__aborted = true;
	    this.xhr.abort();
	    this.emit('close');
	};

	Request.prototype.end = function (s) {
	    if (s !== undefined) this.body.push(s);

	    var keys = objectKeys(this._headers);
	    for (var i = 0; i < keys.length; i++) {
	        var key = keys[i];
	        var value = this._headers[key];
	        if (isArray(value)) {
	            for (var j = 0; j < value.length; j++) {
	                this.xhr.setRequestHeader(key, value[j]);
	            }
	        }
	        else this.xhr.setRequestHeader(key, value)
	    }

	    if (this.body.length === 0) {
	        this.xhr.send('');
	    }
	    else if (typeof this.body[0] === 'string') {
	        this.xhr.send(this.body.join(''));
	    }
	    else if (isArray(this.body[0])) {
	        var body = [];
	        for (var i = 0; i < this.body.length; i++) {
	            body.push.apply(body, this.body[i]);
	        }
	        this.xhr.send(body);
	    }
	    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
	        var len = 0;
	        for (var i = 0; i < this.body.length; i++) {
	            len += this.body[i].length;
	        }
	        var body = new(this.body[0].constructor)(len);
	        var k = 0;
	        
	        for (var i = 0; i < this.body.length; i++) {
	            var b = this.body[i];
	            for (var j = 0; j < b.length; j++) {
	                body[k++] = b[j];
	            }
	        }
	        this.xhr.send(body);
	    }
	    else if (isXHR2Compatible(this.body[0])) {
	        this.xhr.send(this.body[0]);
	    }
	    else {
	        var body = '';
	        for (var i = 0; i < this.body.length; i++) {
	            body += this.body[i].toString();
	        }
	        this.xhr.send(body);
	    }
	};

	// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
	Request.unsafeHeaders = [
	    "accept-charset",
	    "accept-encoding",
	    "access-control-request-headers",
	    "access-control-request-method",
	    "connection",
	    "content-length",
	    "cookie",
	    "cookie2",
	    "content-transfer-encoding",
	    "date",
	    "expect",
	    "host",
	    "keep-alive",
	    "origin",
	    "referer",
	    "te",
	    "trailer",
	    "transfer-encoding",
	    "upgrade",
	    "user-agent",
	    "via"
	];

	Request.prototype.isSafeRequestHeader = function (headerName) {
	    if (!headerName) return false;
	    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
	};

	var objectKeys = Object.keys || function (obj) {
	    var keys = [];
	    for (var key in obj) keys.push(key);
	    return keys;
	};

	var isArray = Array.isArray || function (xs) {
	    return Object.prototype.toString.call(xs) === '[object Array]';
	};

	var indexOf = function (xs, x) {
	    if (xs.indexOf) return xs.indexOf(x);
	    for (var i = 0; i < xs.length; i++) {
	        if (xs[i] === x) return i;
	    }
	    return -1;
	};

	var isXHR2Compatible = function (obj) {
	    if (typeof Blob !== 'undefined' && obj instanceof Blob) return true;
	    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) return true;
	    if (typeof FormData !== 'undefined' && obj instanceof FormData) return true;
	};


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	
	/* istanbul ignore else */
	if (typeof Date.now === 'function') {
	  /**
	   * Helper function to get the current time
	   * @return {number} Current time
	   */
	  exports.systemNow = function () {
	    return Date.now();
	  }
	}
	else {
	  /**
	   * Helper function to get the current time
	   * @return {number} Current time
	   */
	  exports.systemNow = function () {
	    return new Date().valueOf();
	  }
	}

	/**
	 * Shuffle an array
	 *
	 * + Jonas Raoni Soares Silva
	 * @ http://jsfromhell.com/array/shuffle [v1.0]
	 *
	 * @param {Array} o   Array to be shuffled
	 * @returns {Array}   Returns the shuffled array
	 */
	exports.shuffle = function (o){
	  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	  return o;
	};


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.decode = exports.parse = __webpack_require__(62);
	exports.encode = exports.stringify = __webpack_require__(63);


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	var http = __webpack_require__(30);

	var https = module.exports;

	for (var key in http) {
	    if (http.hasOwnProperty(key)) https[key] = http[key];
	};

	https.request = function (params, cb) {
	    if (!params) params = {};
	    params.scheme = 'https';
	    return http.request.call(this, params, cb);
	}


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	var base64 = __webpack_require__(87)
	var ieee754 = __webpack_require__(80)
	var isArray = __webpack_require__(81)

	exports.Buffer = Buffer
	exports.SlowBuffer = Buffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var kMaxLength = 0x3fffffff

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Note:
	 *
	 * - Implementation must support adding new properties to `Uint8Array` instances.
	 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
	 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *    incorrect length in some situations.
	 *
	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
	 * get the Object implementation, which is slower but will work correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = (function () {
	  try {
	    var buf = new ArrayBuffer(0)
	    var arr = new Uint8Array(buf)
	    arr.foo = function () { return 42 }
	    return 42 === arr.foo() && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	})()

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (subject, encoding, noZero) {
	  if (!(this instanceof Buffer))
	    return new Buffer(subject, encoding, noZero)

	  var type = typeof subject

	  // Find the length
	  var length
	  if (type === 'number')
	    length = subject > 0 ? subject >>> 0 : 0
	  else if (type === 'string') {
	    if (encoding === 'base64')
	      subject = base64clean(subject)
	    length = Buffer.byteLength(subject, encoding)
	  } else if (type === 'object' && subject !== null) { // assume object is array-like
	    if (subject.type === 'Buffer' && isArray(subject.data))
	      subject = subject.data
	    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
	  } else
	    throw new TypeError('must start with number, buffer, array or string')

	  if (this.length > kMaxLength)
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	      'size: 0x' + kMaxLength.toString(16) + ' bytes')

	  var buf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Preferred: Return an augmented `Uint8Array` instance for best performance
	    buf = Buffer._augment(new Uint8Array(length))
	  } else {
	    // Fallback: Return THIS instance of Buffer (created by `new`)
	    buf = this
	    buf.length = length
	    buf._isBuffer = true
	  }

	  var i
	  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
	    // Speed optimization -- use set if we're copying from a typed array
	    buf._set(subject)
	  } else if (isArrayish(subject)) {
	    // Treat array-ish objects as a byte array
	    if (Buffer.isBuffer(subject)) {
	      for (i = 0; i < length; i++)
	        buf[i] = subject.readUInt8(i)
	    } else {
	      for (i = 0; i < length; i++)
	        buf[i] = ((subject[i] % 256) + 256) % 256
	    }
	  } else if (type === 'string') {
	    buf.write(subject, 0, encoding)
	  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
	    for (i = 0; i < length; i++) {
	      buf[i] = 0
	    }
	  }

	  return buf
	}

	Buffer.isBuffer = function (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
	    throw new TypeError('Arguments must be Buffers')

	  var x = a.length
	  var y = b.length
	  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }
	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function (list, totalLength) {
	  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

	  if (list.length === 0) {
	    return new Buffer(0)
	  } else if (list.length === 1) {
	    return list[0]
	  }

	  var i
	  if (totalLength === undefined) {
	    totalLength = 0
	    for (i = 0; i < list.length; i++) {
	      totalLength += list[i].length
	    }
	  }

	  var buf = new Buffer(totalLength)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	Buffer.byteLength = function (str, encoding) {
	  var ret
	  str = str + ''
	  switch (encoding || 'utf8') {
	    case 'ascii':
	    case 'binary':
	    case 'raw':
	      ret = str.length
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = str.length * 2
	      break
	    case 'hex':
	      ret = str.length >>> 1
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8ToBytes(str).length
	      break
	    case 'base64':
	      ret = base64ToBytes(str).length
	      break
	    default:
	      ret = str.length
	  }
	  return ret
	}

	// pre-set for values that may exist in the future
	Buffer.prototype.length = undefined
	Buffer.prototype.parent = undefined

	// toString(encoding, start=0, end=buffer.length)
	Buffer.prototype.toString = function (encoding, start, end) {
	  var loweredCase = false

	  start = start >>> 0
	  end = end === undefined || end === Infinity ? this.length : end >>> 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase)
	          throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.equals = function (b) {
	  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max)
	      str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  return Buffer.compare(this, b)
	}

	// `get` will be removed in Node 0.13+
	Buffer.prototype.get = function (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` will be removed in Node 0.13+
	Buffer.prototype.set = function (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var byte = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(byte)) throw new Error('Invalid hex string')
	    buf[offset + i] = byte
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function asciiWrite (buf, string, offset, length) {
	  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
	  return charsWritten
	}

	function utf16leWrite (buf, string, offset, length) {
	  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
	  return charsWritten
	}

	Buffer.prototype.write = function (string, offset, length, encoding) {
	  // Support both (string, offset, length, encoding)
	  // and the legacy (string, encoding, offset, length)
	  if (isFinite(offset)) {
	    if (!isFinite(length)) {
	      encoding = length
	      length = undefined
	    }
	  } else {  // legacy
	    var swap = encoding
	    encoding = offset
	    offset = length
	    length = swap
	  }

	  offset = Number(offset) || 0
	  var remaining = this.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }
	  encoding = String(encoding || 'utf8').toLowerCase()

	  var ret
	  switch (encoding) {
	    case 'hex':
	      ret = hexWrite(this, string, offset, length)
	      break
	    case 'utf8':
	    case 'utf-8':
	      ret = utf8Write(this, string, offset, length)
	      break
	    case 'ascii':
	      ret = asciiWrite(this, string, offset, length)
	      break
	    case 'binary':
	      ret = binaryWrite(this, string, offset, length)
	      break
	    case 'base64':
	      ret = base64Write(this, string, offset, length)
	      break
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      ret = utf16leWrite(this, string, offset, length)
	      break
	    default:
	      throw new TypeError('Unknown encoding: ' + encoding)
	  }
	  return ret
	}

	Buffer.prototype.toJSON = function () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  var res = ''
	  var tmp = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    if (buf[i] <= 0x7F) {
	      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
	      tmp = ''
	    } else {
	      tmp += '%' + buf[i].toString(16)
	    }
	  }

	  return res + decodeUtf8Char(tmp)
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  return asciiSlice(buf, start, end)
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len;
	    if (start < 0)
	      start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0)
	      end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start)
	    end = start

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    return Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    var newBuf = new Buffer(sliceLen, undefined, true)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	    return newBuf
	  }
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0)
	    throw new RangeError('offset is not uint')
	  if (offset + ext > length)
	    throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUInt8 = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	      ((this[offset + 1] << 16) |
	      (this[offset + 2] << 8) |
	      this[offset + 3])
	}

	Buffer.prototype.readInt8 = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80))
	    return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16) |
	      (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	      (this[offset + 1] << 16) |
	      (this[offset + 2] << 8) |
	      (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function (offset, noAssert) {
	  if (!noAssert)
	    checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new TypeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new TypeError('index out of range')
	}

	Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = value
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else objectWriteUInt16(this, value, offset, true)
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else objectWriteUInt16(this, value, offset, false)
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = value
	  } else objectWriteUInt32(this, value, offset, true)
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else objectWriteUInt32(this, value, offset, false)
	  return offset + 4
	}

	Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = value
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else objectWriteUInt16(this, value, offset, true)
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else objectWriteUInt16(this, value, offset, false)
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else objectWriteUInt32(this, value, offset, true)
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
	  value = +value
	  offset = offset >>> 0
	  if (!noAssert)
	    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else objectWriteUInt32(this, value, offset, false)
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new TypeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new TypeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert)
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert)
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function (target, target_start, start, end) {
	  var source = this

	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (!target_start) target_start = 0

	  // Copy 0 bytes; we're done
	  if (end === start) return
	  if (target.length === 0 || source.length === 0) return

	  // Fatal error conditions
	  if (end < start) throw new TypeError('sourceEnd < sourceStart')
	  if (target_start < 0 || target_start >= target.length)
	    throw new TypeError('targetStart out of bounds')
	  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
	  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length)
	    end = this.length
	  if (target.length - target_start < end - start)
	    end = target.length - target_start + start

	  var len = end - start

	  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < len; i++) {
	      target[i + target_start] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), target_start)
	  }
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new TypeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array get/set methods before overwriting
	  arr._get = arr.get
	  arr._set = arr.set

	  // deprecated, will be removed in node 0.13+
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function isArrayish (subject) {
	  return isArray(subject) || Buffer.isBuffer(subject) ||
	      subject && typeof subject === 'object' &&
	      typeof subject.length === 'number'
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    var b = str.charCodeAt(i)
	    if (b <= 0x7F) {
	      byteArray.push(b)
	    } else {
	      var start = i
	      if (b >= 0xD800 && b <= 0xDFFF) i++
	      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
	      for (var j = 0; j < h.length; j++) {
	        byteArray.push(parseInt(h[j], 16))
	      }
	    }
	  }
	  return byteArray
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(str)
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length))
	      break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function decodeUtf8Char (str) {
	  try {
	    return decodeURIComponent(str)
	  } catch (err) {
	    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var rng = __webpack_require__(65)

	function error () {
	  var m = [].slice.call(arguments).join(' ')
	  throw new Error([
	    m,
	    'we accept pull requests',
	    'http://github.com/dominictarr/crypto-browserify'
	    ].join('\n'))
	}

	exports.createHash = __webpack_require__(66)

	exports.createHmac = __webpack_require__(67)

	exports.randomBytes = function(size, callback) {
	  if (callback && callback.call) {
	    try {
	      callback.call(this, undefined, new Buffer(rng(size)))
	    } catch (err) { callback(err) }
	  } else {
	    return new Buffer(rng(size))
	  }
	}

	function each(a, f) {
	  for(var i in a)
	    f(a[i], i)
	}

	exports.getHashes = function () {
	  return ['sha1', 'sha256', 'sha512', 'md5', 'rmd160']
	}

	var p = __webpack_require__(68)(exports)
	exports.pbkdf2 = p.pbkdf2
	exports.pbkdf2Sync = p.pbkdf2Sync
	__webpack_require__(84)(exports, module.exports);

	// the least I can do is make error messages for the rest of the node.js/crypto api.
	each(['createCredentials'
	, 'createSign'
	, 'createVerify'
	, 'createDiffieHellman'
	], function (name) {
	  exports[name] = function () {
	    error('sorry,', name, 'is not implemented yet')
	  }
	})
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(85);
	var Promise = __webpack_require__(90).Promise;

	var messagebus = __webpack_require__(50);
	var Conversation = __webpack_require__(69);
	var Block = __webpack_require__(61);
	var Then = __webpack_require__(58);
	var Tell = __webpack_require__(56);
	var Listen = __webpack_require__(57);

	__webpack_require__(60); // append iif function to Block

	/**
	 * Babbler
	 * @param {String} id
	 * @constructor
	 */
	function Babbler (id) {
	  if (!(this instanceof Babbler)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (!id) {
	    throw new Error('id required');
	  }

	  this.id = id;
	  this.listeners = [];      // Array.<Listen>
	  this.conversations = {};  // Array.<Array.<Conversation>> all open conversations

	  this.connect(); // automatically connect to the local message bus
	}

	/**
	 * Connect to a message bus
	 * @param {{connect: function, disconnect: function, send: function}} [bus]
	 *          A messaging interface. Must have the following functions:
	 *          - connect(params: {id: string,
	 *            message: function, callback: function}) : string
	 *            must return a token to disconnects again.
	 *            parameter callback is optional.
	 *          - disconnect(token: string)
	 *            disconnect from a message bus.
	 *          - send(id: string, message: *)
	 *            send a message
	 *          A number of interfaces is provided under babble.messagebus.
	 *          Default interface is babble.messagebus['default']
	 * @return {Promise.<Babbler>}  Returns a Promise which resolves when the
	 *                              babbler is connected.
	 */
	Babbler.prototype.connect = function (bus) {
	  // disconnect (in case we are already connected)
	  this.disconnect();

	  if (!bus) {
	    bus = messagebus['default']();
	  }

	  // validate the message bus functions
	  if (typeof bus.connect !== 'function') {
	    throw new Error('message bus must contain a function ' +
	        'connect(params: {id: string, callback: function}) : string');
	  }
	  if (typeof bus.disconnect !== 'function') {
	    throw new Error('message bus must contain a function ' +
	        'disconnect(token: string)');
	  }
	  if (typeof bus.send !== 'function') {
	    throw new Error('message bus must contain a function ' +
	        'send(params: {id: string, message: *})');
	  }

	  // we return a promise, but we run the message.connect function immediately
	  // (outside of the Promise), so that synchronous connects are done without
	  // the need to await the promise to resolve on the next tick.
	  var _resolve = null;
	  var connected = new Promise(function (resolve, reject) {
	    _resolve = resolve;
	  });

	  var token = bus.connect({
	    id: this.id,
	    message: this._receive.bind(this),
	    callback: _resolve
	  });

	  // link functions to disconnect and send
	  this.disconnect = function () {
	    bus.disconnect(token);
	  };
	  this.send = bus.send;

	  // return a promise
	  return connected;
	};

	/**
	 * Handle an incoming message
	 * @param {{id: string, from: string, to: string, message: string}} envelope
	 * @private
	 */
	Babbler.prototype._receive = function (envelope) {
	  // ignore when envelope does not contain an id and message
	  if (!envelope || !('id' in envelope) || !('message' in envelope)) {
	    return;
	  }

	  // console.log('_receive', envelope) // TODO: cleanup

	  var me = this;
	  var id = envelope.id;
	  var conversations = this.conversations[id];
	  if (conversations && conversations.length) {
	    // directly deliver to all open conversations with this id
	    conversations.forEach(function (conversation) {
	      conversation.deliver(envelope);
	    })
	  }
	  else {
	    // start new conversations at each of the listeners
	    if (!conversations) {
	      conversations = [];
	    }
	    this.conversations[id] = conversations;

	    this.listeners.forEach(function (block) {
	      // create a new conversation
	      var conversation = new Conversation({
	        id: id,
	        self: me.id,
	        other: envelope.from,
	        context: {
	          from: envelope.from
	        },
	        send: me.send
	      });

	      // append this conversation to the list with conversations
	      conversations.push(conversation);

	      // deliver the first message to the new conversation
	      conversation.deliver(envelope);

	      // process the conversation
	      return me._process(block, conversation)
	          .then(function() {
	            // remove the conversation from the list again
	            var index = conversations.indexOf(conversation);
	            if (index !== -1) {
	              conversations.splice(index, 1);
	            }
	            if (conversations.length === 0) {
	              delete me.conversations[id];
	            }
	          });
	    });
	  }
	};

	/**
	 * Disconnect from the babblebox
	 */
	Babbler.prototype.disconnect = function () {
	  // by default, do nothing. The disconnect function will be overwritten
	  // when the Babbler is connected to a message bus.
	};

	/**
	 * Send a message
	 * @param {String} to  Id of a babbler
	 * @param {*} message  Any message. Message must be a stringifiable JSON object.
	 */
	Babbler.prototype.send = function (to, message) {
	  // send is overridden when running connect
	  throw new Error('Cannot send: not connected');
	};

	/**
	 * Listen for a specific event
	 *
	 * Providing a condition will only start the flow when condition is met,
	 * this is equivalent of doing `listen().iif(condition)`
	 *
	 * Providing a callback function is equivalent of doing either
	 * `listen(message).then(callback)` or `listen().iif(message).then(callback)`.
	 *
	 * @param {function | RegExp | String | *} [condition]
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Start block of a control flow.
	 */
	Babbler.prototype.listen = function (condition, callback) {
	  var listen = new Listen();
	  this.listeners.push(listen);

	  var block = listen;
	  if (condition) {
	    block = block.iif(condition);
	  }
	  if (callback) {
	    block = block.then(callback);
	  }
	  return block;
	};

	/**
	 * Listen for a specific event, and execute the flow once.
	 *
	 * Providing a condition will only start the flow when condition is met,
	 * this is equivalent of doing `listen().iif(condition)`
	 *
	 * Providing a callback function is equivalent of doing either
	 * `listen(message).then(callback)` or `listen().iif(message).then(callback)`.
	 *
	 * @param {function | RegExp | String | *} [condition]
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Start block of a control flow.
	 */
	Babbler.prototype.listenOnce = function (condition, callback) {
	  var listen = new Listen();
	  this.listeners.push(listen);

	  var me = this;
	  var block = listen;

	  if (condition) {
	    block = block.iif(condition);
	  }

	  block = block.then(function (message) {
	    // remove the flow from the listeners after fired once
	    var index = me.listeners.indexOf(listen);
	    if (index !== -1) {
	      me.listeners.splice(index, 1);
	    }
	    return message;
	  });

	  if (callback) {
	    block = block.then(callback);
	  }

	  return block;
	};

	/**
	 * Send a message to the other peer
	 * Creates a block Tell, and runs the block immediately.
	 * @param {String} to       Babbler id
	 * @param {Function | *} message
	 * @return {Block} block    Last block in the created control flow
	 */
	Babbler.prototype.tell = function (to, message) {
	  var me = this;
	  var cid = uuid.v4(); // create an id for this conversation

	  // create a new conversation
	  var conversation = new Conversation({
	    id: cid,
	    self: this.id,
	    other: to,
	    context: {
	      from: to
	    },
	    send: me.send
	  });
	  this.conversations[cid] = [conversation];

	  var block = new Tell(message);

	  // run the Tell block on the next tick, when the conversation flow is created
	  setTimeout(function () {
	    me._process(block, conversation)
	        .then(function () {
	          // cleanup the conversation
	          delete me.conversations[cid];
	    })
	  }, 0);

	  return block;
	};

	/**
	 * Send a question, listen for a response.
	 * Creates two blocks: Tell and Listen, and runs them immediately.
	 * This is equivalent of doing `Babbler.tell(to, message).listen(callback)`
	 * @param {String} to             Babbler id
	 * @param {* | Function} message  A message or a callback returning a message.
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Last block in the created control flow
	 */
	Babbler.prototype.ask = function (to, message, callback) {
	  return this
	      .tell(to, message)
	      .listen(callback);
	};

	/**
	 * Process a flow starting with `block`, given a conversation
	 * @param {Block} block
	 * @param {Conversation} conversation
	 * @return {Promise.<Conversation>} Resolves when the conversation is finished
	 * @private
	 */
	Babbler.prototype._process = function (block, conversation) {
	  return new Promise(function (resolve, reject) {
	    /**
	     * Process a block, given the conversation and a message which is chained
	     * from block to block.
	     * @param {Block} block
	     * @param {*} [message]
	     */
	    function process(block, message) {
	      //console.log('process', conversation.self, conversation.id, block.constructor.name, message) // TODO: cleanup

	      block.execute(conversation, message)
	          .then(function (next) {
	            if (next.block) {
	              // recursively evaluate the next block in the conversation flow
	              process(next.block, next.result);
	            }
	            else {
	              // we are done, this is the end of the conversation
	              resolve(conversation);
	            }
	          });
	    }

	    // process the first block
	    process(block);
	  });
	};

	module.exports = Babbler;


/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(90).Promise;

	// built-in messaging interfaces

	/**
	 * pubsub-js messaging interface
	 * @returns {{connect: function, disconnect: function, send: function}}
	 */
	exports['pubsub-js'] = function () {
	  var PubSub = __webpack_require__(89);

	  return {
	    connect: function (params) {
	      var token = PubSub.subscribe(params.id, function (id, message) {
	        params.message(message);
	      });

	      if (typeof params.callback === 'function') {
	        params.callback();
	      }

	      return token;
	    },

	    disconnect: function(token) {
	      PubSub.unsubscribe(token);
	    },

	    send: function (to, message) {
	      PubSub.publish(to, message);
	    }
	  }
	};

	/**
	 * // pubnub messaging interface
	 * @param {{publish_key: string, subscribe_key: string}} params
	 * @returns {{connect: function, disconnect: function, send: function}}
	 */
	exports['pubnub'] = function (params) {
	  var PUBNUB;
	  if (typeof window !== 'undefined') {
	    // browser
	    if (typeof window['PUBNUB'] === 'undefined') {
	      throw new Error('Please load pubnub first in the browser');
	    }
	    PUBNUB = window['PUBNUB'];
	  }
	  else {
	    // node.js
	    PUBNUB = __webpack_require__(86);
	  }

	  var pubnub = PUBNUB.init(params);

	  return {
	    connect: function (params) {
	      pubnub.subscribe({
	        channel: params.id,
	        message: params.message,
	        connect: params.callback
	      });

	      return params.id;
	    },

	    disconnect: function (id) {
	      pubnub.unsubscribe(id);
	    },

	    send: function (to, message) {
	      return new Promise(function (resolve, reject) {
	        pubnub.publish({
	          channel: to,
	          message: message,
	          callback: resolve
	        });
	      })
	    }
	  }
	};

	// default interface
	exports['default'] = exports['pubsub-js'];


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	var uuid = __webpack_require__(74),
	    Promise = __webpack_require__(41);

	var TIMEOUT = 60000; // ms
	// TODO: make timeout a configuration setting

	/**
	 * Wrap a socket in a request/response handling layer.
	 * Requests are wrapped in an envelope with id and data, and responses
	 * are packed in an envelope with this same id and response data.
	 *
	 * The socket is extended with functions:
	 *     request(data: *) : Promise.<*, Error>
	 *     onrequest(data: *) : Promise.<*, Error>
	 *
	 * @param {WebSocket} socket
	 * @return {WebSocket} requestified socket
	 */
	function requestify (socket) {
	  return (function () {
	    var queue = {};   // queue with requests in progress

	    if ('request' in socket) {
	      throw new Error('Socket already has a request property');
	    }

	    var requestified = socket;

	    /**
	     * Event handler, handles incoming messages
	     * @param {Object} event
	     */
	    socket.onmessage = function (event) {
	      var data = event.data;
	      if (data.charAt(0) == '{') {
	        var envelope = JSON.parse(data);

	        // match the request from the id in the response
	        var request = queue[envelope.id];
	        if (request) {
	          // handle an incoming response
	          clearTimeout(request.timeout);
	          delete queue[envelope.id];

	          // resolve the promise with response data
	          if (envelope.error) {
	            // TODO: implement a smarter way to serialize and deserialize errors
	            request.reject(new Error(envelope.error));
	          }
	          else {
	            request.resolve(envelope.message);
	          }
	        }
	        else {
	          if ('id' in envelope) {
	            try {
	              // handle an incoming request
	              requestified.onrequest(envelope.message)
	                  .then(function (message) {
	                    var response = {
	                      id: envelope.id,
	                      message: message,
	                      error: null
	                    };
	                    socket.send(JSON.stringify(response));
	                  })
	                  .catch(function (error) {
	                    var response = {
	                      id: envelope.id,
	                      message: null,
	                      error: error.message || error.toString()
	                    };
	                    socket.send(JSON.stringify(response));
	                  });
	            }
	            catch (err) {
	              var response = {
	                id: envelope.id,
	                message: null,
	                error: err.message || err.toString()
	              };
	              socket.send(JSON.stringify(response));
	            }
	          }
	          else {
	            // handle incoming notification (we don't do anything with the response)
	            requestified.onrequest(envelope.message);
	          }
	        }
	      }
	    };

	    /**
	     * Send a request
	     * @param {*} message
	     * @returns {Promise.<*, Error>} Returns a promise resolving with the response message
	     */
	    requestified.request = function (message) {
	      return new Promise(function (resolve, reject) {
	        // put the data in an envelope with id
	        var id = uuid.v1();
	        var envelope = {
	          id: id,
	          message: message
	        };

	        // add the request to the list with requests in progress
	        queue[id] = {
	          resolve: resolve,
	          reject: reject,
	          timeout: setTimeout(function () {
	            delete queue[id];
	            reject(new Error('Timeout'));
	          }, TIMEOUT)
	        };

	        socket.send(JSON.stringify(envelope));
	      });
	    };

	    /**
	     * Send a notification. A notification does not receive a response.
	     * @param {*} message
	     * @returns {Promise.<null, Error>} Returns a promise resolving with the null
	     *                                  when the notification has been sent.
	     */
	    requestified.notify = function (message) {
	      return new Promise(function (resolve, reject) {
	        // put the data in an envelope
	        var envelope = {
	          // we don't add an id, so we send this as notification instead of a request
	          message: message
	        };

	        socket.send(JSON.stringify(envelope), function () {
	          resolve(null);
	        });
	      });
	    };

	    /**
	     * Handle an incoming request.
	     * @param {*} message   Request message
	     * @returns {Promise.<*, Error>} Resolves with a response message
	     */
	    requestified.onrequest = function (message) {
	      // this function must be implemented by the socket
	      return Promise.reject('No onrequest handler implemented');
	    };

	    // TODO: disable send and onmessage on the requestified socket

	    return requestified;
	  })();
	}

	module.exports = requestify;


/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	//var Emitter = require('emitter-component');


	/**
	 * Peer
	 * A peer can send and receive messages via a connected message bus
	 * @param {string} id
	 * @param {function(string, string, *)} send   A function to send a message to an other peer
	 */
	function Peer(id, send) {
	  this.id = id;
	  this._send = send;

	  this.listeners = {};
	}

	/**
	 * Send a message to another peer
	 * @param {string} to    Id of the recipient
	 * @param {*} message    Message to be send, can be JSON
	 * @returns {Promise.<null, Error>} Resolves when sent
	 */
	Peer.prototype.send = function (to, message) {
	  return this._send(this.id, to, message);
	};

	// Extend the Peer with event emitter functionality
	//Emitter(Peer.prototype);

	// TODO: complete this custom event emitter, it's about 5 times as fast as Emitter because its not slicing arguments

	/**
	 * Register an event listener
	 * @param {string} event        Available events: 'message'
	 * @param {Function} callback   Callback function, called as callback(from, message)
	 */
	Peer.prototype.on = function (event, callback) {
	  if (!(event in this.listeners)) this.listeners[event] = [];
	  this.listeners[event].push(callback);
	};

	// TODO: implement off

	/**
	 * Emit an event
	 * @param {string} event    For example 'message'
	 * @param {string} from     Id of the sender, for example 'peer1'
	 * @param {*} message       A message, can be any type. Must be serializable JSON.
	 */
	Peer.prototype.emit = function (event, from, message) {
	  var listeners = this.listeners[event];
	  if (listeners) {
	    for (var i = 0, ii = listeners.length; i < ii; i++) {
	      var listener = listeners[i];
	      listener(from, message);
	    }
	  }
	};

	module.exports = Peer;


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	var Stream = __webpack_require__(64);
	var util = __webpack_require__(79);

	var Response = module.exports = function (res) {
	    this.offset = 0;
	    this.readable = true;
	};

	util.inherits(Response, Stream);

	var capable = {
	    streaming : true,
	    status2 : true
	};

	function parseHeaders (res) {
	    var lines = res.getAllResponseHeaders().split(/\r?\n/);
	    var headers = {};
	    for (var i = 0; i < lines.length; i++) {
	        var line = lines[i];
	        if (line === '') continue;
	        
	        var m = line.match(/^([^:]+):\s*(.*)/);
	        if (m) {
	            var key = m[1].toLowerCase(), value = m[2];
	            
	            if (headers[key] !== undefined) {
	            
	                if (isArray(headers[key])) {
	                    headers[key].push(value);
	                }
	                else {
	                    headers[key] = [ headers[key], value ];
	                }
	            }
	            else {
	                headers[key] = value;
	            }
	        }
	        else {
	            headers[line] = true;
	        }
	    }
	    return headers;
	}

	Response.prototype.getResponse = function (xhr) {
	    var respType = String(xhr.responseType).toLowerCase();
	    if (respType === 'blob') return xhr.responseBlob || xhr.response;
	    if (respType === 'arraybuffer') return xhr.response;
	    return xhr.responseText;
	}

	Response.prototype.getHeader = function (key) {
	    return this.headers[key.toLowerCase()];
	};

	Response.prototype.handle = function (res) {
	    if (res.readyState === 2 && capable.status2) {
	        try {
	            this.statusCode = res.status;
	            this.headers = parseHeaders(res);
	        }
	        catch (err) {
	            capable.status2 = false;
	        }
	        
	        if (capable.status2) {
	            this.emit('ready');
	        }
	    }
	    else if (capable.streaming && res.readyState === 3) {
	        try {
	            if (!this.statusCode) {
	                this.statusCode = res.status;
	                this.headers = parseHeaders(res);
	                this.emit('ready');
	            }
	        }
	        catch (err) {}
	        
	        try {
	            this._emitData(res);
	        }
	        catch (err) {
	            capable.streaming = false;
	        }
	    }
	    else if (res.readyState === 4) {
	        if (!this.statusCode) {
	            this.statusCode = res.status;
	            this.emit('ready');
	        }
	        this._emitData(res);
	        
	        if (res.error) {
	            this.emit('error', this.getResponse(res));
	        }
	        else this.emit('end');
	        
	        this.emit('close');
	    }
	};

	Response.prototype._emitData = function (res) {
	    var respBody = this.getResponse(res);
	    if (respBody.toString().match(/ArrayBuffer/)) {
	        this.emit('data', new Uint8Array(respBody, this.offset));
	        this.offset = respBody.byteLength;
	        return;
	    }
	    if (respBody.length > this.offset) {
	        this.emit('data', respBody.slice(this.offset));
	        this.offset = respBody.length;
	    }
	};

	var isArray = Array.isArray || function (xs) {
	    return Object.prototype.toString.call(xs) === '[object Array]';
	};


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! http://mths.be/punycode v1.2.4 by @mathias */
	;(function(root) {

		/** Detect free variables */
		var freeExports = typeof exports == 'object' && exports;
		var freeModule = typeof module == 'object' && module &&
			module.exports == freeExports && module;
		var freeGlobal = typeof global == 'object' && global;
		if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
			root = freeGlobal;
		}

		/**
		 * The `punycode` object.
		 * @name punycode
		 * @type Object
		 */
		var punycode,

		/** Highest positive signed 32-bit float value */
		maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

		/** Bootstring parameters */
		base = 36,
		tMin = 1,
		tMax = 26,
		skew = 38,
		damp = 700,
		initialBias = 72,
		initialN = 128, // 0x80
		delimiter = '-', // '\x2D'

		/** Regular expressions */
		regexPunycode = /^xn--/,
		regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
		regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

		/** Error messages */
		errors = {
			'overflow': 'Overflow: input needs wider integers to process',
			'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
			'invalid-input': 'Invalid input'
		},

		/** Convenience shortcuts */
		baseMinusTMin = base - tMin,
		floor = Math.floor,
		stringFromCharCode = String.fromCharCode,

		/** Temporary variable */
		key;

		/*--------------------------------------------------------------------------*/

		/**
		 * A generic error utility function.
		 * @private
		 * @param {String} type The error type.
		 * @returns {Error} Throws a `RangeError` with the applicable error message.
		 */
		function error(type) {
			throw RangeError(errors[type]);
		}

		/**
		 * A generic `Array#map` utility function.
		 * @private
		 * @param {Array} array The array to iterate over.
		 * @param {Function} callback The function that gets called for every array
		 * item.
		 * @returns {Array} A new array of values returned by the callback function.
		 */
		function map(array, fn) {
			var length = array.length;
			while (length--) {
				array[length] = fn(array[length]);
			}
			return array;
		}

		/**
		 * A simple `Array#map`-like wrapper to work with domain name strings.
		 * @private
		 * @param {String} domain The domain name.
		 * @param {Function} callback The function that gets called for every
		 * character.
		 * @returns {Array} A new string of characters returned by the callback
		 * function.
		 */
		function mapDomain(string, fn) {
			return map(string.split(regexSeparators), fn).join('.');
		}

		/**
		 * Creates an array containing the numeric code points of each Unicode
		 * character in the string. While JavaScript uses UCS-2 internally,
		 * this function will convert a pair of surrogate halves (each of which
		 * UCS-2 exposes as separate characters) into a single code point,
		 * matching UTF-16.
		 * @see `punycode.ucs2.encode`
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode.ucs2
		 * @name decode
		 * @param {String} string The Unicode input string (UCS-2).
		 * @returns {Array} The new array of code points.
		 */
		function ucs2decode(string) {
			var output = [],
			    counter = 0,
			    length = string.length,
			    value,
			    extra;
			while (counter < length) {
				value = string.charCodeAt(counter++);
				if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
					// high surrogate, and there is a next character
					extra = string.charCodeAt(counter++);
					if ((extra & 0xFC00) == 0xDC00) { // low surrogate
						output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
					} else {
						// unmatched surrogate; only append this code unit, in case the next
						// code unit is the high surrogate of a surrogate pair
						output.push(value);
						counter--;
					}
				} else {
					output.push(value);
				}
			}
			return output;
		}

		/**
		 * Creates a string based on an array of numeric code points.
		 * @see `punycode.ucs2.decode`
		 * @memberOf punycode.ucs2
		 * @name encode
		 * @param {Array} codePoints The array of numeric code points.
		 * @returns {String} The new Unicode string (UCS-2).
		 */
		function ucs2encode(array) {
			return map(array, function(value) {
				var output = '';
				if (value > 0xFFFF) {
					value -= 0x10000;
					output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
					value = 0xDC00 | value & 0x3FF;
				}
				output += stringFromCharCode(value);
				return output;
			}).join('');
		}

		/**
		 * Converts a basic code point into a digit/integer.
		 * @see `digitToBasic()`
		 * @private
		 * @param {Number} codePoint The basic numeric code point value.
		 * @returns {Number} The numeric value of a basic code point (for use in
		 * representing integers) in the range `0` to `base - 1`, or `base` if
		 * the code point does not represent a value.
		 */
		function basicToDigit(codePoint) {
			if (codePoint - 48 < 10) {
				return codePoint - 22;
			}
			if (codePoint - 65 < 26) {
				return codePoint - 65;
			}
			if (codePoint - 97 < 26) {
				return codePoint - 97;
			}
			return base;
		}

		/**
		 * Converts a digit/integer into a basic code point.
		 * @see `basicToDigit()`
		 * @private
		 * @param {Number} digit The numeric value of a basic code point.
		 * @returns {Number} The basic code point whose value (when used for
		 * representing integers) is `digit`, which needs to be in the range
		 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
		 * used; else, the lowercase form is used. The behavior is undefined
		 * if `flag` is non-zero and `digit` has no uppercase form.
		 */
		function digitToBasic(digit, flag) {
			//  0..25 map to ASCII a..z or A..Z
			// 26..35 map to ASCII 0..9
			return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
		}

		/**
		 * Bias adaptation function as per section 3.4 of RFC 3492.
		 * http://tools.ietf.org/html/rfc3492#section-3.4
		 * @private
		 */
		function adapt(delta, numPoints, firstTime) {
			var k = 0;
			delta = firstTime ? floor(delta / damp) : delta >> 1;
			delta += floor(delta / numPoints);
			for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
				delta = floor(delta / baseMinusTMin);
			}
			return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
		}

		/**
		 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
		 * symbols.
		 * @memberOf punycode
		 * @param {String} input The Punycode string of ASCII-only symbols.
		 * @returns {String} The resulting string of Unicode symbols.
		 */
		function decode(input) {
			// Don't use UCS-2
			var output = [],
			    inputLength = input.length,
			    out,
			    i = 0,
			    n = initialN,
			    bias = initialBias,
			    basic,
			    j,
			    index,
			    oldi,
			    w,
			    k,
			    digit,
			    t,
			    /** Cached calculation results */
			    baseMinusT;

			// Handle the basic code points: let `basic` be the number of input code
			// points before the last delimiter, or `0` if there is none, then copy
			// the first basic code points to the output.

			basic = input.lastIndexOf(delimiter);
			if (basic < 0) {
				basic = 0;
			}

			for (j = 0; j < basic; ++j) {
				// if it's not a basic code point
				if (input.charCodeAt(j) >= 0x80) {
					error('not-basic');
				}
				output.push(input.charCodeAt(j));
			}

			// Main decoding loop: start just after the last delimiter if any basic code
			// points were copied; start at the beginning otherwise.

			for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

				// `index` is the index of the next character to be consumed.
				// Decode a generalized variable-length integer into `delta`,
				// which gets added to `i`. The overflow checking is easier
				// if we increase `i` as we go, then subtract off its starting
				// value at the end to obtain `delta`.
				for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

					if (index >= inputLength) {
						error('invalid-input');
					}

					digit = basicToDigit(input.charCodeAt(index++));

					if (digit >= base || digit > floor((maxInt - i) / w)) {
						error('overflow');
					}

					i += digit * w;
					t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

					if (digit < t) {
						break;
					}

					baseMinusT = base - t;
					if (w > floor(maxInt / baseMinusT)) {
						error('overflow');
					}

					w *= baseMinusT;

				}

				out = output.length + 1;
				bias = adapt(i - oldi, out, oldi == 0);

				// `i` was supposed to wrap around from `out` to `0`,
				// incrementing `n` each time, so we'll fix that now:
				if (floor(i / out) > maxInt - n) {
					error('overflow');
				}

				n += floor(i / out);
				i %= out;

				// Insert `n` at position `i` of the output
				output.splice(i++, 0, n);

			}

			return ucs2encode(output);
		}

		/**
		 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
		 * symbols.
		 * @memberOf punycode
		 * @param {String} input The string of Unicode symbols.
		 * @returns {String} The resulting Punycode string of ASCII-only symbols.
		 */
		function encode(input) {
			var n,
			    delta,
			    handledCPCount,
			    basicLength,
			    bias,
			    j,
			    m,
			    q,
			    k,
			    t,
			    currentValue,
			    output = [],
			    /** `inputLength` will hold the number of code points in `input`. */
			    inputLength,
			    /** Cached calculation results */
			    handledCPCountPlusOne,
			    baseMinusT,
			    qMinusT;

			// Convert the input in UCS-2 to Unicode
			input = ucs2decode(input);

			// Cache the length
			inputLength = input.length;

			// Initialize the state
			n = initialN;
			delta = 0;
			bias = initialBias;

			// Handle the basic code points
			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue < 0x80) {
					output.push(stringFromCharCode(currentValue));
				}
			}

			handledCPCount = basicLength = output.length;

			// `handledCPCount` is the number of code points that have been handled;
			// `basicLength` is the number of basic code points.

			// Finish the basic string - if it is not empty - with a delimiter
			if (basicLength) {
				output.push(delimiter);
			}

			// Main encoding loop:
			while (handledCPCount < inputLength) {

				// All non-basic code points < n have been handled already. Find the next
				// larger one:
				for (m = maxInt, j = 0; j < inputLength; ++j) {
					currentValue = input[j];
					if (currentValue >= n && currentValue < m) {
						m = currentValue;
					}
				}

				// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
				// but guard against overflow
				handledCPCountPlusOne = handledCPCount + 1;
				if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
					error('overflow');
				}

				delta += (m - n) * handledCPCountPlusOne;
				n = m;

				for (j = 0; j < inputLength; ++j) {
					currentValue = input[j];

					if (currentValue < n && ++delta > maxInt) {
						error('overflow');
					}

					if (currentValue == n) {
						// Represent delta as a generalized variable-length integer
						for (q = delta, k = base; /* no condition */; k += base) {
							t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
							if (q < t) {
								break;
							}
							qMinusT = q - t;
							baseMinusT = base - t;
							output.push(
								stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
							);
							q = floor(qMinusT / baseMinusT);
						}

						output.push(stringFromCharCode(digitToBasic(q, 0)));
						bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
						delta = 0;
						++handledCPCount;
					}
				}

				++delta;
				++n;

			}
			return output.join('');
		}

		/**
		 * Converts a Punycode string representing a domain name to Unicode. Only the
		 * Punycoded parts of the domain name will be converted, i.e. it doesn't
		 * matter if you call it on a string that has already been converted to
		 * Unicode.
		 * @memberOf punycode
		 * @param {String} domain The Punycode domain name to convert to Unicode.
		 * @returns {String} The Unicode representation of the given Punycode
		 * string.
		 */
		function toUnicode(domain) {
			return mapDomain(domain, function(string) {
				return regexPunycode.test(string)
					? decode(string.slice(4).toLowerCase())
					: string;
			});
		}

		/**
		 * Converts a Unicode string representing a domain name to Punycode. Only the
		 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
		 * matter if you call it with a domain that's already in ASCII.
		 * @memberOf punycode
		 * @param {String} domain The domain name to convert, as a Unicode string.
		 * @returns {String} The Punycode representation of the given domain name.
		 */
		function toASCII(domain) {
			return mapDomain(domain, function(string) {
				return regexNonASCII.test(string)
					? 'xn--' + encode(string)
					: string;
			});
		}

		/*--------------------------------------------------------------------------*/

		/** Define the public API */
		punycode = {
			/**
			 * A string representing the current Punycode.js version number.
			 * @memberOf punycode
			 * @type String
			 */
			'version': '1.2.4',
			/**
			 * An object of methods to convert from JavaScript's internal character
			 * representation (UCS-2) to Unicode code points, and back.
			 * @see <http://mathiasbynens.be/notes/javascript-encoding>
			 * @memberOf punycode
			 * @type Object
			 */
			'ucs2': {
				'decode': ucs2decode,
				'encode': ucs2encode
			},
			'decode': decode,
			'encode': encode,
			'toASCII': toASCII,
			'toUnicode': toUnicode
		};

		/** Expose `punycode` */
		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if (
			true
		) {
			!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
				return punycode;
			}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		} else if (freeExports && !freeExports.nodeType) {
			if (freeModule) { // in Node.js or RingoJS v0.8.0+
				freeModule.exports = punycode;
			} else { // in Narwhal or RingoJS v0.7.0-
				for (key in punycode) {
					punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
				}
			}
		} else { // in Rhino or a web browser
			root.punycode = punycode;
		}

	}(this));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(83)(module), (function() { return this; }())))

/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(75);

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(90).Promise;
	var Block = __webpack_require__(61);
	var isPromise = __webpack_require__(73).isPromise;

	__webpack_require__(58);   // extend Block with function then
	__webpack_require__(57); // extend Block with function listen

	/**
	 * Tell
	 * Send a message to the other peer.
	 * @param {* | Function} message  A static message or callback function
	 *                                returning a message dynamically.
	 *                                When `message` is a function, it will be
	 *                                invoked as callback(message, context),
	 *                                where `message` is the output from the
	 *                                previous block in the chain, and `context` is
	 *                                an object where state can be stored during a
	 *                                conversation.
	 * @constructor
	 * @extends {Block}
	 */
	function Tell (message) {
	  if (!(this instanceof Tell)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  this.message = message;
	}

	Tell.prototype = Object.create(Block.prototype);
	Tell.prototype.constructor = Tell;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} [message] A message is ignored by the Tell block
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Tell.prototype.execute = function (conversation, message) {
	  // resolve the message
	  var me = this;
	  var resolve;
	  if (typeof this.message === 'function') {
	    var result = this.message(message, conversation.context);
	    resolve = isPromise(result) ? result : Promise.resolve(result);
	  }
	  else {
	    resolve = Promise.resolve(this.message); // static string or value
	  }

	  return resolve
	      .then(function (result) {
	        var res = conversation.send(result);
	        var done = isPromise(res) ? res : Promise.resolve(res);

	        return done.then(function () {
	            return {
	              result: result,
	              block: me.next
	            };
	          });
	      });
	};

	/**
	 * Create a Tell block and chain it to the current block
	 * @param {* | Function} [message] A static message or callback function
	 *                                 returning a message dynamically.
	 *                                 When `message` is a function, it will be
	 *                                 invoked as callback(message, context),
	 *                                 where `message` is the output from the
	 *                                 previous block in the chain, and `context` is
	 *                                 an object where state can be stored during a
	 *                                 conversation.
	 * @return {Block}                 Returns the appended block
	 */
	Block.prototype.tell = function (message) {
	  var block = new Tell(message);

	  return this.then(block);
	};

	/**
	 * Send a question, listen for a response.
	 * Creates two blocks: Tell and Listen.
	 * This is equivalent of doing `babble.tell(message).listen(callback)`
	 * @param {* | Function} message
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block}              Returns the appended block
	 */
	Block.prototype.ask = function (message, callback) {
	  // FIXME: this doesn't work
	  return this
	      .tell(message)
	      .listen(callback);
	};

	module.exports = Tell;


/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(90).Promise;
	var Block = __webpack_require__(61);
	var Then = __webpack_require__(58);

	/**
	 * Listen
	 * Wait until a message comes in from the connected peer, then continue
	 * with the next block in the control flow.
	 *
	 * @constructor
	 * @extends {Block}
	 */
	function Listen () {
	  if (!(this instanceof Listen)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }
	}

	Listen.prototype = Object.create(Block.prototype);
	Listen.prototype.constructor = Listen;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} [message]   Message is ignored by Listen blocks
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Listen.prototype.execute = function (conversation, message) {
	  var me = this;

	  // wait until a message is received
	  return conversation.receive()
	      .then(function (message) {
	        return {
	          result: message,
	          block: me.next
	        }
	      });
	};

	/**
	 * Create a Listen block and chain it to the current block
	 *
	 * Optionally a callback function can be provided, which is equivalent of
	 * doing `listen().then(callback)`.
	 *
	 * @param {Function} [callback] Executed as callback(message: *, context: Object)
	 *                              Must return a result
	 * @return {Block}              Returns the appended block
	 */
	Block.prototype.listen = function (callback) {
	  var listen = new Listen();
	  var block = this.then(listen);
	  if (callback) {
	    block = block.then(callback);
	  }
	  return block;
	};

	module.exports = Listen;


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(90).Promise;
	var Block = __webpack_require__(61);
	var isPromise = __webpack_require__(73).isPromise;

	/**
	 * Then
	 * Execute a callback function or a next block in the chain.
	 * @param {Function} callback   Invoked as callback(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 * @constructor
	 * @extends {Block}
	 */
	function Then (callback) {
	  if (!(this instanceof Then)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (!(typeof callback === 'function')) {
	    throw new TypeError('Parameter callback must be a Function');
	  }

	  this.callback = callback;
	}

	Then.prototype = Object.create(Block.prototype);
	Then.prototype.constructor = Then;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Then.prototype.execute = function (conversation, message) {
	  var me = this;
	  var result = this.callback(message, conversation.context);

	  var resolve = isPromise(result) ? result : Promise.resolve(result);

	  return resolve.then(function (result) {
	    return {
	      result: result,
	      block: me.next
	    }
	  });
	};

	/**
	 * Chain a block to the current block.
	 *
	 * When a function is provided, a Then block will be generated which
	 * executes the function. The function is invoked as callback(message, context),
	 * where `message` is the output from the previous block in the chain,
	 * and `context` is an object where state can be stored during a conversation.
	 *
	 * @param {Block | function} next   A callback function or Block.
	 * @return {Block} Returns the appended block
	 */
	Block.prototype.then = function (next) {
	  // turn a callback function into a Then block
	  if (typeof next === 'function') {
	    next = new Then(next);
	  }

	  if (!(next instanceof Block)) {
	    throw new TypeError('Parameter next must be a Block or function');
	  }

	  // append after the last block
	  next.previous = this;
	  this.next = next;

	  // return the appended block
	  return next;
	};

	module.exports = Then;


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(90).Promise;
	var Block = __webpack_require__(61);
	var isPromise =__webpack_require__(73).isPromise;

	__webpack_require__(58); // extend Block with function then

	/**
	 * Decision
	 * A decision is made by executing the provided callback function, which returns
	 * a next control flow block.
	 *
	 * Syntax:
	 *
	 *     new Decision(choices)
	 *     new Decision(decision, choices)
	 *
	 * Where:
	 *
	 *     {Function | Object} [decision]
	 *                              When a `decision` function is provided, the
	 *                              function is invoked as decision(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 *                              The function must return the id for the next
	 *                              block in the control flow, which must be
	 *                              available in the provided `choices`.
	 *                              If `decision` is not provided, the next block
	 *                              will be mapped directly from the message.
	 *     {Object.<String, Block>} choices
	 *                              A map with the possible next blocks in the flow
	 *                              The next block is selected by the id returned
	 *                              by the decision function.
	 *
	 * There is one special id for choices: 'default'. This id is called when either
	 * the decision function returns an id which does not match any of the available
	 * choices.
	 *
	 * @param arg1
	 * @param arg2
	 * @constructor
	 * @extends {Block}
	 */
	function Decision (arg1, arg2) {
	  var decision, choices;

	  if (!(this instanceof Decision)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (typeof arg1 === 'function') {
	    decision = arg1;
	    choices = arg2;
	  }
	  else {
	    decision = null;
	    choices = arg1;
	  }

	  if (decision) {
	    if (typeof decision !== 'function') {
	      throw new TypeError('Parameter decision must be a function');
	    }
	  }
	  else {
	    decision = function (message, context) {
	      return message;
	    }
	  }

	  if (choices && (choices instanceof Function)) {
	    throw new TypeError('Parameter choices must be an object');
	  }

	  this.decision = decision;
	  this.choices = {};

	  // append all choices
	  if (choices) {
	    var me = this;
	    Object.keys(choices).forEach(function (id) {
	      me.addChoice(id, choices[id]);
	    });
	  }
	}

	Decision.prototype = Object.create(Block.prototype);
	Decision.prototype.constructor = Decision;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Decision.prototype.execute = function (conversation, message) {
	  var me = this;
	  var id = this.decision(message, conversation.context);

	  var resolve = isPromise(id) ? id : Promise.resolve(id);
	  return resolve.then(function (id) {
	    var next = me.choices[id];

	    if (!next) {
	      // there is no match, fall back on the default choice
	      next = me.choices['default'];
	    }

	    if (!next) {
	      throw new Error('Block with id "' + id + '" not found');
	    }

	    return {
	      result: message,
	      block: next
	    };
	  });
	};

	/**
	 * Add a choice to the decision block.
	 * The choice can be a new chain of blocks. The first block of the chain
	 * will be triggered when the this id comes out of the decision function.
	 * @param {String | 'default'} id
	 * @param {Block} block
	 * @return {Decision} self
	 */
	Decision.prototype.addChoice = function (id, block) {
	  if (typeof id !== 'string') {
	    throw new TypeError('String expected as choice id');
	  }

	  if (!(block instanceof Block)) {
	    throw new TypeError('Block expected as choice');
	  }

	  if (id in this.choices) {
	    throw new Error('Choice with id "' + id + '" already exists');
	  }

	  // find the first block of the chain
	  var first = block;
	  while (first && first.previous) {
	    first = first.previous;
	  }

	  this.choices[id] = first;

	  return this;
	};

	/**
	 * Create a decision block and chain it to the current block.
	 * Returns the first block in the chain.
	 *
	 * Syntax:
	 *
	 *     decide(choices)
	 *     decide(decision, choices)
	 *
	 * Where:
	 *
	 *     {Function | Object} [decision]
	 *                              When a `decision` function is provided, the
	 *                              function is invoked as decision(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 *                              The function must return the id for the next
	 *                              block in the control flow, which must be
	 *                              available in the provided `choices`.
	 *                              If `decision` is not provided, the next block
	 *                              will be mapped directly from the message.
	 *     {Object.<String, Block>} choices
	 *                              A map with the possible next blocks in the flow
	 *                              The next block is selected by the id returned
	 *                              by the decision function.
	 *
	 * There is one special id for choices: 'default'. This id is called when either
	 * the decision function returns an id which does not match any of the available
	 * choices.
	 *
	 * @param {Function | Object} arg1  Can be {function} decision or {Object} choices
	 * @param {Object} [arg2]           choices
	 * @return {Block} first            First block in the chain
	 */
	Block.prototype.decide = function (arg1, arg2) {
	  var decision = new Decision(arg1, arg2);

	  return this.then(decision);
	};

	module.exports = Decision;


/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(90).Promise;
	var Block = __webpack_require__(61);
	var isPromise = __webpack_require__(73).isPromise;

	__webpack_require__(58); // extend Block with function then

	/**
	 * IIf
	 * Create an iif block, which checks a condition and continues either with
	 * the trueBlock or the falseBlock. The input message is passed to the next
	 * block in the flow.
	 *
	 * Can be used as follows:
	 * - When `condition` evaluates true:
	 *   - when `trueBlock` is provided, the flow continues with `trueBlock`
	 *   - else, when there is a block connected to the IIf block, the flow continues
	 *     with that block.
	 * - When `condition` evaluates false:
	 *   - when `falseBlock` is provided, the flow continues with `falseBlock`
	 *
	 * Syntax:
	 *
	 *     new IIf(condition, trueBlock)
	 *     new IIf(condition, trueBlock [, falseBlock])
	 *     new IIf(condition).then(...)
	 *
	 * @param {Function | RegExp | *} condition   A condition returning true or false
	 *                                            In case of a function,
	 *                                            the function is invoked as
	 *                                            `condition(message, context)` and
	 *                                            must return a boolean. In case of
	 *                                            a RegExp, condition will be tested
	 *                                            to return true. In other cases,
	 *                                            non-strict equality is tested on
	 *                                            the input.
	 * @param {Block} [trueBlock]
	 * @param {Block} [falseBlock]
	 * @constructor
	 * @extends {Block}
	 */
	function IIf (condition, trueBlock, falseBlock) {
	  if (!(this instanceof IIf)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (condition instanceof Function) {
	    this.condition = condition;
	  }
	  else if (condition instanceof RegExp) {
	    this.condition = function (message, context) {
	      return condition.test(message);
	    }
	  }
	  else {
	    this.condition = function (message, context) {
	      return message == condition;
	    }
	  }

	  if (trueBlock && !(trueBlock instanceof Block)) {
	    throw new TypeError('Parameter trueBlock must be a Block');
	  }

	  if (falseBlock && !(falseBlock instanceof Block)) {
	    throw new TypeError('Parameter falseBlock must be a Block');
	  }

	  this.trueBlock = trueBlock || null;
	  this.falseBlock = falseBlock || null;
	}

	IIf.prototype = Object.create(Block.prototype);
	IIf.prototype.constructor = IIf;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	IIf.prototype.execute = function (conversation, message) {
	  var me = this;
	  var condition = this.condition(message, conversation.context);

	  var resolve = isPromise(condition) ? condition : Promise.resolve(condition);

	  return resolve.then(function (condition) {
	    var next = condition ? (me.trueBlock || me.next) : me.falseBlock;

	    return {
	      result: message,
	      block: next
	    };
	  });
	};

	/**
	 * IIf
	 * Create an iif block, which checks a condition and continues either with
	 * the trueBlock or the falseBlock. The input message is passed to the next
	 * block in the flow.
	 *
	 * Can be used as follows:
	 * - When `condition` evaluates true:
	 *   - when `trueBlock` is provided, the flow continues with `trueBlock`
	 *   - else, when there is a block connected to the IIf block, the flow continues
	 *     with that block.
	 * - When `condition` evaluates false:
	 *   - when `falseBlock` is provided, the flow continues with `falseBlock`
	 *
	 * Syntax:
	 *
	 *     new IIf(condition, trueBlock)
	 *     new IIf(condition, trueBlock [, falseBlock])
	 *     new IIf(condition).then(...)
	 *
	 * @param {Function | RegExp | *} condition   A condition returning true or false
	 *                                            In case of a function,
	 *                                            the function is invoked as
	 *                                            `condition(message, context)` and
	 *                                            must return a boolean. In case of
	 *                                            a RegExp, condition will be tested
	 *                                            to return true. In other cases,
	 *                                            non-strict equality is tested on
	 *                                            the input.
	 * @param {Block} [trueBlock]
	 * @param {Block} [falseBlock]
	 * @returns {Block} Returns the created IIf block
	 */
	Block.prototype.iif = function (condition, trueBlock, falseBlock) {
	  var iif = new IIf(condition, trueBlock, falseBlock);

	  return this.then(iif);
	};

	module.exports = IIf;


/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Abstract control flow diagram block
	 * @constructor
	 */
	function Block() {
	  this.next = null;
	  this.previous = null;
	}

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Block.prototype.execute = function (conversation, message) {
	  throw new Error('Cannot run an abstract Block');
	};

	module.exports = Block;


/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	// If obj.hasOwnProperty has been overridden, then calling
	// obj.hasOwnProperty(prop) will break.
	// See: https://github.com/joyent/node/issues/1707
	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	module.exports = function(qs, sep, eq, options) {
	  sep = sep || '&';
	  eq = eq || '=';
	  var obj = {};

	  if (typeof qs !== 'string' || qs.length === 0) {
	    return obj;
	  }

	  var regexp = /\+/g;
	  qs = qs.split(sep);

	  var maxKeys = 1000;
	  if (options && typeof options.maxKeys === 'number') {
	    maxKeys = options.maxKeys;
	  }

	  var len = qs.length;
	  // maxKeys <= 0 means that we should not limit keys count
	  if (maxKeys > 0 && len > maxKeys) {
	    len = maxKeys;
	  }

	  for (var i = 0; i < len; ++i) {
	    var x = qs[i].replace(regexp, '%20'),
	        idx = x.indexOf(eq),
	        kstr, vstr, k, v;

	    if (idx >= 0) {
	      kstr = x.substr(0, idx);
	      vstr = x.substr(idx + 1);
	    } else {
	      kstr = x;
	      vstr = '';
	    }

	    k = decodeURIComponent(kstr);
	    v = decodeURIComponent(vstr);

	    if (!hasOwnProperty(obj, k)) {
	      obj[k] = v;
	    } else if (isArray(obj[k])) {
	      obj[k].push(v);
	    } else {
	      obj[k] = [obj[k], v];
	    }
	  }

	  return obj;
	};

	var isArray = Array.isArray || function (xs) {
	  return Object.prototype.toString.call(xs) === '[object Array]';
	};


/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	var stringifyPrimitive = function(v) {
	  switch (typeof v) {
	    case 'string':
	      return v;

	    case 'boolean':
	      return v ? 'true' : 'false';

	    case 'number':
	      return isFinite(v) ? v : '';

	    default:
	      return '';
	  }
	};

	module.exports = function(obj, sep, eq, name) {
	  sep = sep || '&';
	  eq = eq || '=';
	  if (obj === null) {
	    obj = undefined;
	  }

	  if (typeof obj === 'object') {
	    return map(objectKeys(obj), function(k) {
	      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
	      if (isArray(obj[k])) {
	        return map(obj[k], function(v) {
	          return ks + encodeURIComponent(stringifyPrimitive(v));
	        }).join(sep);
	      } else {
	        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
	      }
	    }).join(sep);

	  }

	  if (!name) return '';
	  return encodeURIComponent(stringifyPrimitive(name)) + eq +
	         encodeURIComponent(stringifyPrimitive(obj));
	};

	var isArray = Array.isArray || function (xs) {
	  return Object.prototype.toString.call(xs) === '[object Array]';
	};

	function map (xs, f) {
	  if (xs.map) return xs.map(f);
	  var res = [];
	  for (var i = 0; i < xs.length; i++) {
	    res.push(f(xs[i], i));
	  }
	  return res;
	}

	var objectKeys = Object.keys || function (obj) {
	  var res = [];
	  for (var key in obj) {
	    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
	  }
	  return res;
	};


/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = __webpack_require__(44).EventEmitter;
	var inherits = __webpack_require__(101);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(93);
	Stream.Writable = __webpack_require__(94);
	Stream.Duplex = __webpack_require__(95);
	Stream.Transform = __webpack_require__(96);
	Stream.PassThrough = __webpack_require__(97);

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};


/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, Buffer) {(function() {
	  var g = ('undefined' === typeof window ? global : window) || {}
	  _crypto = (
	    g.crypto || g.msCrypto || __webpack_require__(78)
	  )
	  module.exports = function(size) {
	    // Modern Browsers
	    if(_crypto.getRandomValues) {
	      var bytes = new Buffer(size); //in browserify, this is an extended Uint8Array
	      /* This will not work in older browsers.
	       * See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
	       */
	    
	      _crypto.getRandomValues(bytes);
	      return bytes;
	    }
	    else if (_crypto.randomBytes) {
	      return _crypto.randomBytes(size)
	    }
	    else
	      throw new Error(
	        'secure random number generation not supported by this browser\n'+
	        'use chrome, FireFox or Internet Explorer 11'
	      )
	  }
	}())
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(47).Buffer))

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var createHash = __webpack_require__(92)

	var md5 = toConstructor(__webpack_require__(82))
	var rmd160 = toConstructor(__webpack_require__(102))

	function toConstructor (fn) {
	  return function () {
	    var buffers = []
	    var m= {
	      update: function (data, enc) {
	        if(!Buffer.isBuffer(data)) data = new Buffer(data, enc)
	        buffers.push(data)
	        return this
	      },
	      digest: function (enc) {
	        var buf = Buffer.concat(buffers)
	        var r = fn(buf)
	        buffers = null
	        return enc ? r.toString(enc) : r
	      }
	    }
	    return m
	  }
	}

	module.exports = function (alg) {
	  if('md5' === alg) return new md5()
	  if('rmd160' === alg) return new rmd160()
	  return createHash(alg)
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var createHash = __webpack_require__(66)

	var zeroBuffer = new Buffer(128)
	zeroBuffer.fill(0)

	module.exports = Hmac

	function Hmac (alg, key) {
	  if(!(this instanceof Hmac)) return new Hmac(alg, key)
	  this._opad = opad
	  this._alg = alg

	  var blocksize = (alg === 'sha512') ? 128 : 64

	  key = this._key = !Buffer.isBuffer(key) ? new Buffer(key) : key

	  if(key.length > blocksize) {
	    key = createHash(alg).update(key).digest()
	  } else if(key.length < blocksize) {
	    key = Buffer.concat([key, zeroBuffer], blocksize)
	  }

	  var ipad = this._ipad = new Buffer(blocksize)
	  var opad = this._opad = new Buffer(blocksize)

	  for(var i = 0; i < blocksize; i++) {
	    ipad[i] = key[i] ^ 0x36
	    opad[i] = key[i] ^ 0x5C
	  }

	  this._hash = createHash(alg).update(ipad)
	}

	Hmac.prototype.update = function (data, enc) {
	  this._hash.update(data, enc)
	  return this
	}

	Hmac.prototype.digest = function (enc) {
	  var h = this._hash.digest()
	  return createHash(this._alg).update(this._opad).update(h).digest(enc)
	}

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	var pbkdf2Export = __webpack_require__(100)

	module.exports = function (crypto, exports) {
	  exports = exports || {}

	  var exported = pbkdf2Export(crypto)

	  exports.pbkdf2 = exported.pbkdf2
	  exports.pbkdf2Sync = exported.pbkdf2Sync

	  return exports
	}


/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	var uuid = __webpack_require__(85);
	var Promise = __webpack_require__(90).Promise;

	/**
	 * A conversation
	 * Holds meta data for a conversation between two peers
	 * @param {Object} [config] Configuration options:
	 *                          {string} [id]      A unique id for the conversation. If not provided, a uuid is generated
	 *                          {string} self      Id of the peer on this side of the conversation
	 *                          {string} other     Id of the peer on the other side of the conversation
	 *                          {Object} [context] Context passed with all callbacks of the conversation
	 *                          {function(to: string, message: *): Promise} send   Function to send a message
	 * @constructor
	 */
	function Conversation (config) {
	  if (!(this instanceof Conversation)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  // public properties
	  this.id =       config && config.id       || uuid.v4();
	  this.self =     config && config.self     || null;
	  this.other =    config && config.other    || null;
	  this.context =  config && config.context  || {};

	  // private properties
	  this._send =    config && config.send     || null;
	  this._inbox = [];     // queue with received but not yet picked messages
	  this._receivers = []; // queue with handlers waiting for a new message
	}

	/**
	 * Send a message
	 * @param {*} message
	 * @return {Promise.<null>} Resolves when the message has been sent
	 */
	Conversation.prototype.send = function (message) {
	  return this._send(this.other, {
	    id: this.id,
	    from: this.self,
	    to: this.other,
	    message: message
	  });
	};

	/**
	 * Deliver a message
	 * @param {{id: string, from: string, to: string, message: string}} envelope
	 */
	Conversation.prototype.deliver = function (envelope) {
	  if (this._receivers.length) {
	    var receiver = this._receivers.shift();
	    receiver(envelope.message);
	  }
	  else {
	    this._inbox.push(envelope.message);
	  }
	};

	/**
	 * Receive a message.
	 * @returns {Promise.<*>} Resolves with a message as soon as a message
	 *                        is delivered.
	 */
	Conversation.prototype.receive = function () {
	  var me = this;

	  if (this._inbox.length) {
	    return Promise.resolve(this._inbox.shift());
	  }
	  else {
	    return new Promise(function (resolve) {
	      me._receivers.push(resolve);
	    })
	  }
	};

	module.exports = Conversation;


/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	;(function () {

	  var object = true ? exports : this; // #8: web workers
	  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

	  function InvalidCharacterError(message) {
	    this.message = message;
	  }
	  InvalidCharacterError.prototype = new Error;
	  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

	  // encoder
	  // [https://gist.github.com/999166] by [https://github.com/nignag]
	  object.btoa || (
	  object.btoa = function (input) {
	    for (
	      // initialize result and counter
	      var block, charCode, idx = 0, map = chars, output = '';
	      // if the next input index does not exist:
	      //   change the mapping table to "="
	      //   check if d has no fractional digits
	      input.charAt(idx | 0) || (map = '=', idx % 1);
	      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
	      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
	    ) {
	      charCode = input.charCodeAt(idx += 3/4);
	      if (charCode > 0xFF) {
	        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
	      }
	      block = block << 8 | charCode;
	    }
	    return output;
	  });

	  // decoder
	  // [https://gist.github.com/1020396] by [https://github.com/atk]
	  object.atob || (
	  object.atob = function (input) {
	    input = input.replace(/=+$/, '');
	    if (input.length % 4 == 1) {
	      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
	    }
	    for (
	      // initialize result and counters
	      var bc = 0, bs, buffer, idx = 0, output = '';
	      // get next character
	      buffer = input.charAt(idx++);
	      // character found in table? initialize bit storage and add its ascii value;
	      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
	        // and if not first of each 4 characters,
	        // convert the first 8 bits to one ascii character
	        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
	    ) {
	      // try to find character in table (0-63, not found => -1)
	      buffer = chars.indexOf(buffer);
	    }
	    return output;
	  });

	}());


/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {
	// Use the fastest possible means to execute a task in a future turn
	// of the event loop.

	// linked list of tasks (single, with head node)
	var head = {task: void 0, next: null};
	var tail = head;
	var flushing = false;
	var requestFlush = void 0;
	var isNodeJS = false;

	function flush() {
	    /* jshint loopfunc: true */

	    while (head.next) {
	        head = head.next;
	        var task = head.task;
	        head.task = void 0;
	        var domain = head.domain;

	        if (domain) {
	            head.domain = void 0;
	            domain.enter();
	        }

	        try {
	            task();

	        } catch (e) {
	            if (isNodeJS) {
	                // In node, uncaught exceptions are considered fatal errors.
	                // Re-throw them synchronously to interrupt flushing!

	                // Ensure continuation if the uncaught exception is suppressed
	                // listening "uncaughtException" events (as domains does).
	                // Continue in next event to avoid tick recursion.
	                if (domain) {
	                    domain.exit();
	                }
	                setTimeout(flush, 0);
	                if (domain) {
	                    domain.enter();
	                }

	                throw e;

	            } else {
	                // In browsers, uncaught exceptions are not fatal.
	                // Re-throw them asynchronously to avoid slow-downs.
	                setTimeout(function() {
	                   throw e;
	                }, 0);
	            }
	        }

	        if (domain) {
	            domain.exit();
	        }
	    }

	    flushing = false;
	}

	if (typeof process !== "undefined" && process.nextTick) {
	    // Node.js before 0.9. Note that some fake-Node environments, like the
	    // Mocha test runner, introduce a `process` global without a `nextTick`.
	    isNodeJS = true;

	    requestFlush = function () {
	        process.nextTick(flush);
	    };

	} else if (typeof setImmediate === "function") {
	    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
	    if (typeof window !== "undefined") {
	        requestFlush = setImmediate.bind(window, flush);
	    } else {
	        requestFlush = function () {
	            setImmediate(flush);
	        };
	    }

	} else if (typeof MessageChannel !== "undefined") {
	    // modern browsers
	    // http://www.nonblocking.io/2011/06/windownexttick.html
	    var channel = new MessageChannel();
	    channel.port1.onmessage = flush;
	    requestFlush = function () {
	        channel.port2.postMessage(0);
	    };

	} else {
	    // old browsers
	    requestFlush = function () {
	        setTimeout(flush, 0);
	    };
	}

	function asap(task) {
	    tail = tail.next = {
	        task: task,
	        domain: isNodeJS && process.domain,
	        next: null
	    };

	    if (!flushing) {
	        flushing = true;
	        requestFlush();
	    }
	};

	module.exports = asap;

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Test whether the provided value is a Promise.
	 * A value is marked as a Promise when it is an object containing functions
	 * `then` and `catch`.
	 * @param {*} value
	 * @return {boolean} Returns true when `value` is a Promise
	 */
	exports.isPromise = function (value) {
	  return value &&
	      typeof value['then'] === 'function' &&
	      typeof value['catch'] === 'function'
	};


/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;//     uuid.js
	//
	//     Copyright (c) 2010-2012 Robert Kieffer
	//     MIT License - http://opensource.org/licenses/mit-license.php

	(function() {
	  var _global = this;

	  // Unique ID creation requires a high quality random # generator.  We feature
	  // detect to determine the best RNG source, normalizing to a function that
	  // returns 128-bits of randomness, since that's what's usually required
	  var _rng;

	  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
	  //
	  // Moderately fast, high quality
	  if (typeof(_global.require) == 'function') {
	    try {
	      var _rb = _global.require('crypto').randomBytes;
	      _rng = _rb && function() {return _rb(16);};
	    } catch(e) {}
	  }

	  if (!_rng && _global.crypto && crypto.getRandomValues) {
	    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
	    //
	    // Moderately fast, high quality
	    var _rnds8 = new Uint8Array(16);
	    _rng = function whatwgRNG() {
	      crypto.getRandomValues(_rnds8);
	      return _rnds8;
	    };
	  }

	  if (!_rng) {
	    // Math.random()-based (RNG)
	    //
	    // If all else fails, use Math.random().  It's fast, but is of unspecified
	    // quality.
	    var  _rnds = new Array(16);
	    _rng = function() {
	      for (var i = 0, r; i < 16; i++) {
	        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
	        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
	      }

	      return _rnds;
	    };
	  }

	  // Buffer class to use
	  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

	  // Maps for number <-> hex string conversion
	  var _byteToHex = [];
	  var _hexToByte = {};
	  for (var i = 0; i < 256; i++) {
	    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
	    _hexToByte[_byteToHex[i]] = i;
	  }

	  // **`parse()` - Parse a UUID into it's component bytes**
	  function parse(s, buf, offset) {
	    var i = (buf && offset) || 0, ii = 0;

	    buf = buf || [];
	    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
	      if (ii < 16) { // Don't overflow!
	        buf[i + ii++] = _hexToByte[oct];
	      }
	    });

	    // Zero out remaining bytes if string was short
	    while (ii < 16) {
	      buf[i + ii++] = 0;
	    }

	    return buf;
	  }

	  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
	  function unparse(buf, offset) {
	    var i = offset || 0, bth = _byteToHex;
	    return  bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]];
	  }

	  // **`v1()` - Generate time-based UUID**
	  //
	  // Inspired by https://github.com/LiosK/UUID.js
	  // and http://docs.python.org/library/uuid.html

	  // random #'s we need to init node and clockseq
	  var _seedBytes = _rng();

	  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	  var _nodeId = [
	    _seedBytes[0] | 0x01,
	    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
	  ];

	  // Per 4.2.2, randomize (14 bit) clockseq
	  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

	  // Previous uuid creation time
	  var _lastMSecs = 0, _lastNSecs = 0;

	  // See https://github.com/broofa/node-uuid for API details
	  function v1(options, buf, offset) {
	    var i = buf && offset || 0;
	    var b = buf || [];

	    options = options || {};

	    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

	    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
	    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
	    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
	    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
	    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

	    // Per 4.2.1.2, use count of uuid's generated during the current clock
	    // cycle to simulate higher resolution clock
	    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

	    // Time since last uuid creation (in msecs)
	    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

	    // Per 4.2.1.2, Bump clockseq on clock regression
	    if (dt < 0 && options.clockseq == null) {
	      clockseq = clockseq + 1 & 0x3fff;
	    }

	    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
	    // time interval
	    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
	      nsecs = 0;
	    }

	    // Per 4.2.1.2 Throw error if too many uuids are requested
	    if (nsecs >= 10000) {
	      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
	    }

	    _lastMSecs = msecs;
	    _lastNSecs = nsecs;
	    _clockseq = clockseq;

	    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
	    msecs += 12219292800000;

	    // `time_low`
	    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
	    b[i++] = tl >>> 24 & 0xff;
	    b[i++] = tl >>> 16 & 0xff;
	    b[i++] = tl >>> 8 & 0xff;
	    b[i++] = tl & 0xff;

	    // `time_mid`
	    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
	    b[i++] = tmh >>> 8 & 0xff;
	    b[i++] = tmh & 0xff;

	    // `time_high_and_version`
	    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
	    b[i++] = tmh >>> 16 & 0xff;

	    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
	    b[i++] = clockseq >>> 8 | 0x80;

	    // `clock_seq_low`
	    b[i++] = clockseq & 0xff;

	    // `node`
	    var node = options.node || _nodeId;
	    for (var n = 0; n < 6; n++) {
	      b[i + n] = node[n];
	    }

	    return buf ? buf : unparse(b);
	  }

	  // **`v4()` - Generate random UUID**

	  // See https://github.com/broofa/node-uuid for API details
	  function v4(options, buf, offset) {
	    // Deprecated - 'format' argument, as supported in v1.2
	    var i = buf && offset || 0;

	    if (typeof(options) == 'string') {
	      buf = options == 'binary' ? new BufferClass(16) : null;
	      options = null;
	    }
	    options = options || {};

	    var rnds = options.random || (options.rng || _rng)();

	    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
	    rnds[6] = (rnds[6] & 0x0f) | 0x40;
	    rnds[8] = (rnds[8] & 0x3f) | 0x80;

	    // Copy bytes to buffer, if provided
	    if (buf) {
	      for (var ii = 0; ii < 16; ii++) {
	        buf[i + ii] = rnds[ii];
	      }
	    }

	    return buf || unparse(rnds);
	  }

	  // Export public API
	  var uuid = v4;
	  uuid.v1 = v1;
	  uuid.v4 = v4;
	  uuid.parse = parse;
	  uuid.unparse = unparse;
	  uuid.BufferClass = BufferClass;

	  if (true) {
	    // Publish as AMD module
	    !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {return uuid;}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  } else if (typeof(module) != 'undefined' && module.exports) {
	    // Publish as node.js module
	    module.exports = uuid;
	  } else {
	    // Publish as global (in browsers)
	    var _previousRoot = _global.uuid;

	    // **`noConflict()` - (browser only) to reset global 'uuid' var**
	    uuid.noConflict = function() {
	      _global.uuid = _previousRoot;
	      return uuid;
	    };

	    _global.uuid = uuid;
	  }
	}).call(this);


/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**!
	 * agentkeepalive - lib/agent.js
	 *
	 * refer:
	 *   * @atimb "Real keep-alive HTTP agent": https://gist.github.com/2963672
	 *   * https://github.com/joyent/node/blob/master/lib/http.js
	 *   * https://github.com/joyent/node/blob/master/lib/_http_agent.js
	 *
	 * Copyright(c) 2012 - 2013 fengmk2 <fengmk2@gmail.com>
	 * MIT Licensed
	 */

	"use strict";

	/**
	 * Module dependencies.
	 */

	var http = __webpack_require__(30);
	var https = __webpack_require__(46);
	var util = __webpack_require__(79);

	var debug;
	if (process.env.NODE_DEBUG && /agentkeepalive/.test(process.env.NODE_DEBUG)) {
	  debug = function (x) {
	    console.error.apply(console, arguments);
	  };
	} else {
	  debug = function () { };
	}

	var OriginalAgent = http.Agent;

	if (process.version.indexOf('v0.8.') === 0 || process.version.indexOf('v0.10.') === 0) {
	  OriginalAgent = __webpack_require__(88).Agent;
	  debug('%s use _http_agent', process.version);
	}

	function Agent(options) {
	  options = options || {};
	  options.keepAlive = options.keepAlive !== false;
	  options.keepAliveMsecs = options.keepAliveMsecs || options.maxKeepAliveTime;
	  OriginalAgent.call(this, options);

	  var self = this;
	  // max requests per keepalive socket, default is 0, no limit.
	  self.maxKeepAliveRequests = parseInt(options.maxKeepAliveRequests, 10) || 0;
	  // max keep alive time, default 60 seconds.
	  // if set `keepAliveMsecs = 0`, will disable keepalive feature.
	  self.createSocketCount = 0;
	  self.timeoutSocketCount = 0;
	  self.requestFinishedCount = 0;

	  // override the `free` event listener
	  self.removeAllListeners('free');
	  self.on('free', function (socket, options) {
	    self.requestFinishedCount++;
	    socket._requestCount++;

	    var name = self.getName(options);
	    debug('agent.on(free)', name);

	    if (!self.isDestroyed(socket) &&
	        self.requests[name] && self.requests[name].length) {
	      self.requests[name].shift().onSocket(socket);
	      if (self.requests[name].length === 0) {
	        // don't leak
	        delete self.requests[name];
	      }
	    } else {
	      // If there are no pending requests, then put it in
	      // the freeSockets pool, but only if we're allowed to do so.
	      var req = socket._httpMessage;
	      if (req &&
	          req.shouldKeepAlive &&
	          !self.isDestroyed(socket) &&
	          self.options.keepAlive) {
	        var freeSockets = self.freeSockets[name];
	        var freeLen = freeSockets ? freeSockets.length : 0;
	        var count = freeLen;
	        if (self.sockets[name])
	          count += self.sockets[name].length;

	        if (count >= self.maxSockets || freeLen >= self.maxFreeSockets) {
	          self.removeSocket(socket, options);
	          socket.destroy();
	        } else {
	          freeSockets = freeSockets || [];
	          self.freeSockets[name] = freeSockets;
	          socket.setKeepAlive(true, self.keepAliveMsecs);
	          socket.unref && socket.unref();
	          socket._httpMessage = null;
	          self.removeSocket(socket, options);
	          freeSockets.push(socket);

	          // Avoid duplicitive timeout events by removing timeout listeners set on
	          // socket by previous requests. node does not do this normally because it
	          // assumes sockets are too short-lived for it to matter. It becomes a
	          // problem when sockets are being reused. Steps are being taken to fix
	          // this issue upstream in node v0.10.0.
	          //
	          // See https://github.com/joyent/node/commit/451ff1540ab536237e8d751d241d7fc3391a4087
	          if (self.keepAliveMsecs && socket._events && Array.isArray(socket._events.timeout)) {
	            socket.removeAllListeners('timeout');
	            // Restore the socket's setTimeout() that was remove as collateral
	            // damage.
	            socket.setTimeout(self.keepAliveMsecs, socket._maxKeepAliveTimeout);
	          }
	        }
	      } else {
	        self.removeSocket(socket, options);
	        socket.destroy();
	      }
	    }
	  });
	}

	util.inherits(Agent, OriginalAgent);
	module.exports = Agent;

	Agent.prototype.createSocket = function (req, options) {
	  var self = this;
	  var socket = OriginalAgent.prototype.createSocket.call(this, req, options);
	  socket._requestCount = 0;
	  if (self.keepAliveMsecs) {
	    socket._maxKeepAliveTimeout = function () {
	      debug('maxKeepAliveTimeout, socket destroy()');
	      socket.destroy();
	      self.timeoutSocketCount++;
	    };
	    socket.setTimeout(self.keepAliveMsecs, socket._maxKeepAliveTimeout);
	    // Disable Nagle's algorithm: http://blog.caustik.com/2012/04/08/scaling-node-js-to-100k-concurrent-connections/
	    socket.setNoDelay(true);
	  }
	  this.createSocketCount++;
	  return socket;
	};

	Agent.prototype.removeSocket = function (s, options) {
	  OriginalAgent.prototype.removeSocket.call(this, s, options);
	  var name = this.getName(options);
	  debug('removeSocket', name, 'destroyed:', this.isDestroyed(s));

	  if (this.isDestroyed(s) && this.freeSockets[name]) {
	    var index = this.freeSockets[name].indexOf(s);
	    if (index !== -1) {
	      this.freeSockets[name].splice(index, 1);
	      if (this.freeSockets[name].length === 0) {
	        // don't leak
	        delete this.freeSockets[name];
	      }
	    }
	  }
	};

	function HttpsAgent(options) {
	  Agent.call(this, options);
	  this.defaultPort = 443;
	  this.protocol = 'https:';
	}
	util.inherits(HttpsAgent, Agent);
	HttpsAgent.prototype.createConnection = https.globalAgent.createConnection;

	HttpsAgent.prototype.getName = function(options) {
	  var name = Agent.prototype.getName.call(this, options);

	  name += ':';
	  if (options.ca)
	    name += options.ca;

	  name += ':';
	  if (options.cert)
	    name += options.cert;

	  name += ':';
	  if (options.ciphers)
	    name += options.ciphers;

	  name += ':';
	  if (options.key)
	    name += options.key;

	  name += ':';
	  if (options.pfx)
	    name += options.pfx;

	  name += ':';
	  if (options.rejectUnauthorized !== undefined)
	    name += options.rejectUnauthorized;

	  return name;
	};

	Agent.HttpsAgent = HttpsAgent;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * Module dependencies.
	 */

	var global = (function() { return this; })();

	/**
	 * WebSocket constructor.
	 */

	var WebSocket = global.WebSocket || global.MozWebSocket;

	/**
	 * Module exports.
	 */

	module.exports = WebSocket ? ws : null;

	/**
	 * WebSocket constructor.
	 *
	 * The third `opts` options object gets ignored in web browsers, since it's
	 * non-standard, and throws a TypeError if passed to the constructor.
	 * See: https://github.com/einaros/ws/issues/227
	 *
	 * @param {String} uri
	 * @param {Array} protocols (optional)
	 * @param {Object) opts (optional)
	 * @api public
	 */

	function ws(uri, protocols, opts) {
	  var instance;
	  if (protocols) {
	    instance = new WebSocket(uri, protocols);
	  } else {
	    instance = new WebSocket(uri);
	  }
	  return instance;
	}

	if (WebSocket) ws.prototype = WebSocket.prototype;


/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var Promise = __webpack_require__(91)();
	module.exports = Promise;

/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = __webpack_require__(106);

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = __webpack_require__(146);

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(99)))

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	exports.read = function(buffer, offset, isLE, mLen, nBytes) {
	  var e, m,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      nBits = -7,
	      i = isLE ? (nBytes - 1) : 0,
	      d = isLE ? -1 : 1,
	      s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity);
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	};

	exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c,
	      eLen = nBytes * 8 - mLen - 1,
	      eMax = (1 << eLen) - 1,
	      eBias = eMax >> 1,
	      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
	      i = isLE ? 0 : (nBytes - 1),
	      d = isLE ? 1 : -1,
	      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

	  buffer[offset + i - d] |= s * 128;
	};


/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * isArray
	 */

	var isArray = Array.isArray;

	/**
	 * toString
	 */

	var str = Object.prototype.toString;

	/**
	 * Whether or not the given `val`
	 * is an array.
	 *
	 * example:
	 *
	 *        isArray([]);
	 *        // > true
	 *        isArray(arguments);
	 *        // > false
	 *        isArray('');
	 *        // > false
	 *
	 * @param {mixed} val
	 * @return {bool}
	 */

	module.exports = isArray || function (val) {
	  return !! val && '[object Array]' == str.call(val);
	};


/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
	 * Digest Algorithm, as defined in RFC 1321.
	 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for more info.
	 */

	var helpers = __webpack_require__(98);

	/*
	 * Calculate the MD5 of an array of little-endian words, and a bit length
	 */
	function core_md5(x, len)
	{
	  /* append padding */
	  x[len >> 5] |= 0x80 << ((len) % 32);
	  x[(((len + 64) >>> 9) << 4) + 14] = len;

	  var a =  1732584193;
	  var b = -271733879;
	  var c = -1732584194;
	  var d =  271733878;

	  for(var i = 0; i < x.length; i += 16)
	  {
	    var olda = a;
	    var oldb = b;
	    var oldc = c;
	    var oldd = d;

	    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
	    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
	    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
	    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
	    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
	    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
	    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
	    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
	    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
	    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
	    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
	    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
	    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
	    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
	    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
	    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

	    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
	    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
	    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
	    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
	    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
	    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
	    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
	    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
	    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
	    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
	    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
	    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
	    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
	    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
	    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
	    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

	    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
	    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
	    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
	    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
	    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
	    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
	    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
	    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
	    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
	    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
	    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
	    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
	    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
	    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
	    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
	    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

	    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
	    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
	    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
	    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
	    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
	    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
	    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
	    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
	    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
	    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
	    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
	    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
	    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
	    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
	    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
	    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

	    a = safe_add(a, olda);
	    b = safe_add(b, oldb);
	    c = safe_add(c, oldc);
	    d = safe_add(d, oldd);
	  }
	  return Array(a, b, c, d);

	}

	/*
	 * These functions implement the four basic operations the algorithm uses.
	 */
	function md5_cmn(q, a, b, x, s, t)
	{
	  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
	}
	function md5_ff(a, b, c, d, x, s, t)
	{
	  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
	}
	function md5_gg(a, b, c, d, x, s, t)
	{
	  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
	}
	function md5_hh(a, b, c, d, x, s, t)
	{
	  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
	}
	function md5_ii(a, b, c, d, x, s, t)
	{
	  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
	}

	/*
	 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	 * to work around bugs in some JS interpreters.
	 */
	function safe_add(x, y)
	{
	  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  return (msw << 16) | (lsw & 0xFFFF);
	}

	/*
	 * Bitwise rotate a 32-bit number to the left.
	 */
	function bit_rol(num, cnt)
	{
	  return (num << cnt) | (num >>> (32 - cnt));
	}

	module.exports = function md5(buf) {
	  return helpers.hash(buf, core_md5, 16);
	};


/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function (crypto, exports) {
	  exports = exports || {};
	  var ciphers = __webpack_require__(103)(crypto);
	  exports.createCipher = ciphers.createCipher;
	  exports.createCipheriv = ciphers.createCipheriv;
	  var deciphers = __webpack_require__(104)(crypto);
	  exports.createDecipher = deciphers.createDecipher;
	  exports.createDecipheriv = deciphers.createDecipheriv;
	  var modes = __webpack_require__(105);
	  function listCiphers () {
	    return Object.keys(modes);
	  }
	  exports.listCiphers = listCiphers;
	};



/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;//     uuid.js
	//
	//     Copyright (c) 2010-2012 Robert Kieffer
	//     MIT License - http://opensource.org/licenses/mit-license.php

	(function() {
	  var _global = this;

	  // Unique ID creation requires a high quality random # generator.  We feature
	  // detect to determine the best RNG source, normalizing to a function that
	  // returns 128-bits of randomness, since that's what's usually required
	  var _rng;

	  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
	  //
	  // Moderately fast, high quality
	  if (typeof(_global.require) == 'function') {
	    try {
	      var _rb = _global.require('crypto').randomBytes;
	      _rng = _rb && function() {return _rb(16);};
	    } catch(e) {}
	  }

	  if (!_rng && _global.crypto && crypto.getRandomValues) {
	    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
	    //
	    // Moderately fast, high quality
	    var _rnds8 = new Uint8Array(16);
	    _rng = function whatwgRNG() {
	      crypto.getRandomValues(_rnds8);
	      return _rnds8;
	    };
	  }

	  if (!_rng) {
	    // Math.random()-based (RNG)
	    //
	    // If all else fails, use Math.random().  It's fast, but is of unspecified
	    // quality.
	    var  _rnds = new Array(16);
	    _rng = function() {
	      for (var i = 0, r; i < 16; i++) {
	        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
	        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
	      }

	      return _rnds;
	    };
	  }

	  // Buffer class to use
	  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

	  // Maps for number <-> hex string conversion
	  var _byteToHex = [];
	  var _hexToByte = {};
	  for (var i = 0; i < 256; i++) {
	    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
	    _hexToByte[_byteToHex[i]] = i;
	  }

	  // **`parse()` - Parse a UUID into it's component bytes**
	  function parse(s, buf, offset) {
	    var i = (buf && offset) || 0, ii = 0;

	    buf = buf || [];
	    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
	      if (ii < 16) { // Don't overflow!
	        buf[i + ii++] = _hexToByte[oct];
	      }
	    });

	    // Zero out remaining bytes if string was short
	    while (ii < 16) {
	      buf[i + ii++] = 0;
	    }

	    return buf;
	  }

	  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
	  function unparse(buf, offset) {
	    var i = offset || 0, bth = _byteToHex;
	    return  bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]];
	  }

	  // **`v1()` - Generate time-based UUID**
	  //
	  // Inspired by https://github.com/LiosK/UUID.js
	  // and http://docs.python.org/library/uuid.html

	  // random #'s we need to init node and clockseq
	  var _seedBytes = _rng();

	  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	  var _nodeId = [
	    _seedBytes[0] | 0x01,
	    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
	  ];

	  // Per 4.2.2, randomize (14 bit) clockseq
	  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

	  // Previous uuid creation time
	  var _lastMSecs = 0, _lastNSecs = 0;

	  // See https://github.com/broofa/node-uuid for API details
	  function v1(options, buf, offset) {
	    var i = buf && offset || 0;
	    var b = buf || [];

	    options = options || {};

	    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

	    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
	    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
	    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
	    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
	    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

	    // Per 4.2.1.2, use count of uuid's generated during the current clock
	    // cycle to simulate higher resolution clock
	    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

	    // Time since last uuid creation (in msecs)
	    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

	    // Per 4.2.1.2, Bump clockseq on clock regression
	    if (dt < 0 && options.clockseq == null) {
	      clockseq = clockseq + 1 & 0x3fff;
	    }

	    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
	    // time interval
	    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
	      nsecs = 0;
	    }

	    // Per 4.2.1.2 Throw error if too many uuids are requested
	    if (nsecs >= 10000) {
	      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
	    }

	    _lastMSecs = msecs;
	    _lastNSecs = nsecs;
	    _clockseq = clockseq;

	    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
	    msecs += 12219292800000;

	    // `time_low`
	    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
	    b[i++] = tl >>> 24 & 0xff;
	    b[i++] = tl >>> 16 & 0xff;
	    b[i++] = tl >>> 8 & 0xff;
	    b[i++] = tl & 0xff;

	    // `time_mid`
	    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
	    b[i++] = tmh >>> 8 & 0xff;
	    b[i++] = tmh & 0xff;

	    // `time_high_and_version`
	    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
	    b[i++] = tmh >>> 16 & 0xff;

	    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
	    b[i++] = clockseq >>> 8 | 0x80;

	    // `clock_seq_low`
	    b[i++] = clockseq & 0xff;

	    // `node`
	    var node = options.node || _nodeId;
	    for (var n = 0; n < 6; n++) {
	      b[i + n] = node[n];
	    }

	    return buf ? buf : unparse(b);
	  }

	  // **`v4()` - Generate random UUID**

	  // See https://github.com/broofa/node-uuid for API details
	  function v4(options, buf, offset) {
	    // Deprecated - 'format' argument, as supported in v1.2
	    var i = buf && offset || 0;

	    if (typeof(options) == 'string') {
	      buf = options == 'binary' ? new BufferClass(16) : null;
	      options = null;
	    }
	    options = options || {};

	    var rnds = options.random || (options.rng || _rng)();

	    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
	    rnds[6] = (rnds[6] & 0x0f) | 0x40;
	    rnds[8] = (rnds[8] & 0x3f) | 0x80;

	    // Copy bytes to buffer, if provided
	    if (buf) {
	      for (var ii = 0; ii < 16; ii++) {
	        buf[i + ii] = rnds[ii];
	      }
	    }

	    return buf || unparse(rnds);
	  }

	  // Export public API
	  var uuid = v4;
	  uuid.v1 = v1;
	  uuid.v4 = v4;
	  uuid.parse = parse;
	  uuid.unparse = unparse;
	  uuid.BufferClass = BufferClass;

	  if (true) {
	    // Publish as AMD module
	    !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {return uuid;}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  } else if (typeof(module) != 'undefined' && module.exports) {
	    // Publish as node.js module
	    module.exports = uuid;
	  } else {
	    // Publish as global (in browsers)
	    var _previousRoot = _global.uuid;

	    // **`noConflict()` - (browser only) to reset global 'uuid' var**
	    uuid.noConflict = function() {
	      _global.uuid = _previousRoot;
	      return uuid;
	    };

	    _global.uuid = uuid;
	  }
	}).call(this);


/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Version: 3.6.8
	var NOW             = 1
	,   READY           = false
	,   READY_BUFFER    = []
	,   PRESENCE_SUFFIX = '-pnpres'
	,   DEF_WINDOWING   = 10     // MILLISECONDS.
	,   DEF_TIMEOUT     = 10000  // MILLISECONDS.
	,   DEF_SUB_TIMEOUT = 310    // SECONDS.
	,   DEF_KEEPALIVE   = 60     // SECONDS (FOR TIMESYNC).
	,   SECOND          = 1000   // A THOUSAND MILLISECONDS.
	,   URLBIT          = '/'
	,   PARAMSBIT       = '&'
	,   PRESENCE_HB_THRESHOLD = 5
	,   PRESENCE_HB_DEFAULT  = 30
	,   SDK_VER         = '3.6.8'
	,   REPL            = /{([\w\-]+)}/g;

	/**
	 * UTILITIES
	 */
	function unique() { return'x'+ ++NOW+''+(+new Date) }
	function rnow()   { return+new Date }

	/**
	 * NEXTORIGIN
	 * ==========
	 * var next_origin = nextorigin();
	 */
	var nextorigin = (function() {
	    var max = 20
	    ,   ori = Math.floor(Math.random() * max);
	    return function( origin, failover ) {
	        return origin.indexOf('pubsub.') > 0
	            && origin.replace(
	             'pubsub', 'ps' + (
	                failover ? uuid().split('-')[0] :
	                (++ori < max? ori : ori=1)
	            ) ) || origin;
	    }
	})();


	/**
	 * Build Url
	 * =======
	 *
	 */
	function build_url( url_components, url_params ) {
	    var url    = url_components.join(URLBIT)
	    ,   params = [];

	    if (!url_params) return url;

	    each( url_params, function( key, value ) {
	        var value_str = (typeof value == 'object')?JSON['stringify'](value):value;
	        (typeof value != 'undefined' &&
	            value != null && encode(value_str).length > 0
	        ) && params.push(key + "=" + encode(value_str));
	    } );

	    url += "?" + params.join(PARAMSBIT);
	    return url;
	}

	/**
	 * UPDATER
	 * =======
	 * var timestamp = unique();
	 */
	function updater( fun, rate ) {
	    var timeout
	    ,   last   = 0
	    ,   runnit = function() {
	        if (last + rate > rnow()) {
	            clearTimeout(timeout);
	            timeout = setTimeout( runnit, rate );
	        }
	        else {
	            last = rnow();
	            fun();
	        }
	    };

	    return runnit;
	}

	/**
	 * GREP
	 * ====
	 * var list = grep( [1,2,3], function(item) { return item % 2 } )
	 */
	function grep( list, fun ) {
	    var fin = [];
	    each( list || [], function(l) { fun(l) && fin.push(l) } );
	    return fin
	}

	/**
	 * SUPPLANT
	 * ========
	 * var text = supplant( 'Hello {name}!', { name : 'John' } )
	 */
	function supplant( str, values ) {
	    return str.replace( REPL, function( _, match ) {
	        return values[match] || _
	    } );
	}

	/**
	 * timeout
	 * =======
	 * timeout( function(){}, 100 );
	 */
	function timeout( fun, wait ) {
	    return setTimeout( fun, wait );
	}

	/**
	 * uuid
	 * ====
	 * var my_uuid = uuid();
	 */
	function uuid(callback) {
	    var u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
	    function(c) {
	        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	    if (callback) callback(u);
	    return u;
	}

	function isArray(arg) {
	  return !!arg && (Array.isArray && Array.isArray(arg) || typeof(arg.length) === "number")
	}

	/**
	 * EACH
	 * ====
	 * each( [1,2,3], function(item) { } )
	 */
	function each( o, f) {
	    if ( !o || !f ) return;

	    if ( isArray(o) )
	        for ( var i = 0, l = o.length; i < l; )
	            f.call( o[i], o[i], i++ );
	    else
	        for ( var i in o )
	            o.hasOwnProperty    &&
	            o.hasOwnProperty(i) &&
	            f.call( o[i], i, o[i] );
	}

	/**
	 * MAP
	 * ===
	 * var list = map( [1,2,3], function(item) { return item + 1 } )
	 */
	function map( list, fun ) {
	    var fin = [];
	    each( list || [], function( k, v ) { fin.push(fun( k, v )) } );
	    return fin;
	}

	/**
	 * ENCODE
	 * ======
	 * var encoded_data = encode('path');
	 */
	function encode(path) { return encodeURIComponent(path) }

	/**
	 * Generate Subscription Channel List
	 * ==================================
	 * generate_channel_list(channels_object);
	 */
	function generate_channel_list(channels, nopresence) {
	    var list = [];
	    each( channels, function( channel, status ) {
	        if (nopresence) {
	            if(channel.search('-pnpres') < 0) { 
	                if (status.subscribed) list.push(channel);
	            }    
	        } else {
	            if (status.subscribed) list.push(channel);
	        }  
	    });
	    return list.sort();
	}


	// PUBNUB READY TO CONNECT
	function ready() { timeout( function() {
	    if (READY) return;
	    READY = 1;
	    each( READY_BUFFER, function(connect) { connect() } );
	}, SECOND ); }

	function PNmessage(args) {
	    msg = args || {'apns' : {}},
	    msg['getPubnubMessage'] = function() {
	        var m = {};

	        if (Object.keys(msg['apns']).length) {
	            m['pn_apns'] = {
	                    'aps' : {
	                        'alert' : msg['apns']['alert'] ,
	                        'badge' : msg['apns']['badge']
	                    }
	            }
	            for (var k in msg['apns']) {
	                m['pn_apns'][k] = msg['apns'][k];
	            }
	            var exclude1 = ['badge','alert'];
	            for (var k in exclude1) {
	                //console.log(exclude[k]);
	                delete m['pn_apns'][exclude1[k]];
	            }
	        }



	        if (msg['gcm']) {
	            m['pn_gcm'] = {
	                'data' : msg['gcm']
	            } 
	        }

	        for (var k in msg) {
	            m[k] = msg[k];
	        }
	        var exclude = ['apns','gcm','publish', 'channel','callback','error'];
	        for (var k in exclude) {
	            delete m[exclude[k]];
	        }

	        return m;
	    };
	    msg['publish'] = function() {
	        
	        var m = msg.getPubnubMessage();
	        
	        if (msg['pubnub'] && msg['channel']) {
	            msg['pubnub'].publish({
	                'message' : m,
	                'channel' : msg['channel'],
	                'callback' : msg['callback'],
	                'error' : msg['error']
	            })
	        }
	    };
	    return msg;
	}

	function PN_API(setup) {
	    var SUB_WINDOWING =  +setup['windowing']   || DEF_WINDOWING
	    ,   SUB_TIMEOUT   = (+setup['timeout']     || DEF_SUB_TIMEOUT) * SECOND
	    ,   KEEPALIVE     = (+setup['keepalive']   || DEF_KEEPALIVE)   * SECOND
	    ,   NOLEAVE       = setup['noleave']       || 0
	    ,   PUBLISH_KEY   = setup['publish_key']   || 'demo'
	    ,   SUBSCRIBE_KEY = setup['subscribe_key'] || 'demo'
	    ,   AUTH_KEY      = setup['auth_key']      || ''
	    ,   SECRET_KEY    = setup['secret_key']    || ''
	    ,   hmac_SHA256   = setup['hmac_SHA256']
	    ,   SSL           = setup['ssl']            ? 's' : ''
	    ,   ORIGIN        = 'http'+SSL+'://'+(setup['origin']||'pubsub.pubnub.com')
	    ,   STD_ORIGIN    = nextorigin(ORIGIN)
	    ,   SUB_ORIGIN    = nextorigin(ORIGIN)
	    ,   CONNECT       = function(){}
	    ,   PUB_QUEUE     = []
	    ,   TIME_DRIFT    = 0
	    ,   SUB_CALLBACK  = 0
	    ,   SUB_CHANNEL   = 0
	    ,   SUB_RECEIVER  = 0
	    ,   SUB_RESTORE   = setup['restore'] || 0
	    ,   SUB_BUFF_WAIT = 0
	    ,   TIMETOKEN     = 0
	    ,   RESUMED       = false
	    ,   CHANNELS      = {}
	    ,   STATE         = {}
	    ,   PRESENCE_HB_TIMEOUT  = null
	    ,   PRESENCE_HB          = validate_presence_heartbeat(setup['heartbeat'] || setup['pnexpires'] || 0, setup['error'])
	    ,   PRESENCE_HB_INTERVAL = setup['heartbeat_interval'] || PRESENCE_HB - 3
	    ,   PRESENCE_HB_RUNNING  = false
	    ,   NO_WAIT_FOR_PENDING  = setup['no_wait_for_pending']
	    ,   COMPATIBLE_35 = setup['compatible_3.5']  || false
	    ,   xdr           = setup['xdr']
	    ,   params        = setup['params'] || {}
	    ,   error         = setup['error']      || function() {}
	    ,   _is_online    = setup['_is_online'] || function() { return 1 }
	    ,   jsonp_cb      = setup['jsonp_cb']   || function() { return 0 }
	    ,   db            = setup['db']         || {'get': function(){}, 'set': function(){}}
	    ,   CIPHER_KEY    = setup['cipher_key']
	    ,   UUID          = setup['uuid'] || ( db && db['get'](SUBSCRIBE_KEY+'uuid') || '');

	    var crypto_obj    = setup['crypto_obj'] ||
	        {
	            'encrypt' : function(a,key){ return a},
	            'decrypt' : function(b,key){return b}
	        };

	    function _get_url_params(data) {
	        if (!data) data = {};
	        each( params , function( key, value ) {
	            if (!(key in data)) data[key] = value;
	        });
	        return data;
	    }

	    function _object_to_key_list(o) {
	        var l = []
	        each( o , function( key, value ) {
	            l.push(key);
	        });
	        return l;
	    }    
	    function _object_to_key_list_sorted(o) {
	        return _object_to_key_list(o).sort();
	    }

	    function _get_pam_sign_input_from_params(params) {
	        var si = "";
	        var l = _object_to_key_list_sorted(params);

	        for (var i in l) {
	            var k = l[i]
	            si += k + "=" + encode(params[k]) ;
	            if (i != l.length - 1) si += "&"
	        }
	        return si;
	    }

	    function validate_presence_heartbeat(heartbeat, cur_heartbeat, error) {
	        var err = false;

	        if (typeof heartbeat === 'number') {
	            if (heartbeat > PRESENCE_HB_THRESHOLD || heartbeat == 0)
	                err = false;
	            else
	                err = true;
	        } else if(typeof heartbeat === 'boolean'){
	            if (!heartbeat) {
	                return 0;
	            } else {
	                return PRESENCE_HB_DEFAULT;
	            }
	        } else {
	            err = true;
	        }

	        if (err) {
	            error && error("Presence Heartbeat value invalid. Valid range ( x > " + PRESENCE_HB_THRESHOLD + " or x = 0). Current Value : " + (cur_heartbeat || PRESENCE_HB_THRESHOLD));
	            return cur_heartbeat || PRESENCE_HB_THRESHOLD;
	        } else return heartbeat;
	    }

	    function encrypt(input, key) {
	        return crypto_obj['encrypt'](input, key || CIPHER_KEY) || input;
	    }
	    function decrypt(input, key) {
	        return crypto_obj['decrypt'](input, key || CIPHER_KEY) ||
	               crypto_obj['decrypt'](input, CIPHER_KEY) ||
	               input;
	    }

	    function error_common(message, callback) {
	        callback && callback({ 'error' : message || "error occurred"});
	        error && error(message);
	    }
	    function _presence_heartbeat() {

	        clearTimeout(PRESENCE_HB_TIMEOUT);

	        if (!PRESENCE_HB_INTERVAL || PRESENCE_HB_INTERVAL >= 500 || PRESENCE_HB_INTERVAL < 1 || !generate_channel_list(CHANNELS,true).length){
	            PRESENCE_HB_RUNNING = false;
	            return;
	        }

	        PRESENCE_HB_RUNNING = true;
	        SELF['presence_heartbeat']({
	            'callback' : function(r) {
	                PRESENCE_HB_TIMEOUT = timeout( _presence_heartbeat, (PRESENCE_HB_INTERVAL) * SECOND );
	            },
	            'error' : function(e) {
	                error && error("Presence Heartbeat unable to reach Pubnub servers." + JSON.stringify(e));
	                PRESENCE_HB_TIMEOUT = timeout( _presence_heartbeat, (PRESENCE_HB_INTERVAL) * SECOND );
	            }
	        });
	    }

	    function start_presence_heartbeat() {
	        !PRESENCE_HB_RUNNING && _presence_heartbeat();
	    }

	    function publish(next) {

	        if (NO_WAIT_FOR_PENDING) {
	            if (!PUB_QUEUE.length) return;
	        } else {
	            if (next) PUB_QUEUE.sending = 0;
	            if ( PUB_QUEUE.sending || !PUB_QUEUE.length ) return;
	            PUB_QUEUE.sending = 1;
	        }

	        xdr(PUB_QUEUE.shift());
	    }

	    function each_channel(callback) {
	        var count = 0;

	        each( generate_channel_list(CHANNELS), function(channel) {
	            var chan = CHANNELS[channel];

	            if (!chan) return;

	            count++;
	            (callback||function(){})(chan);
	        } );

	        return count;
	    }
	    function _invoke_callback(response, callback, err) {
	        if (typeof response == 'object') {
	            if (response['error'] && response['message'] && response['payload']) {
	                err({'message' : response['message'], 'payload' : response['payload']});
	                return;
	            }
	            if (response['payload']) {
	                callback(response['payload']);
	                return;
	            }
	        }
	        callback(response);
	    }

	    function _invoke_error(response,err) {
	        if (typeof response == 'object' && response['error'] &&
	            response['message'] && response['payload']) {
	            err({'message' : response['message'], 'payload' : response['payload']});
	        } else err(response);
	    }

	    // Announce Leave Event
	    var SELF = {
	        'LEAVE' : function( channel, blocking, callback, error ) {

	            var data   = { 'uuid' : UUID, 'auth' : AUTH_KEY }
	            ,   origin = nextorigin(ORIGIN)
	            ,   callback = callback || function(){}
	            ,   err      = error    || function(){}
	            ,   jsonp  = jsonp_cb();

	            // Prevent Leaving a Presence Channel
	            if (channel.indexOf(PRESENCE_SUFFIX) > 0) return true;

	            if (COMPATIBLE_35) {
	                if (!SSL)         return false;
	                if (jsonp == '0') return false;
	            }
	            
	            if (NOLEAVE)  return false;

	            if (jsonp != '0') data['callback'] = jsonp;

	            xdr({
	                blocking : blocking || SSL,
	                timeout  : 2000,
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    origin, 'v2', 'presence', 'sub_key',
	                    SUBSCRIBE_KEY, 'channel', encode(channel), 'leave'
	                ]
	            });
	            return true;
	        },
	        'set_resumed' : function(resumed) {
	                RESUMED = resumed;
	        },
	        'get_cipher_key' : function() {
	            return CIPHER_KEY;
	        },
	        'set_cipher_key' : function(key) {
	            CIPHER_KEY = key;
	        },
	        'raw_encrypt' : function(input, key) {
	            return encrypt(input, key);
	        },
	        'raw_decrypt' : function(input, key) {
	            return decrypt(input, key);
	        },
	        'get_heartbeat' : function() {
	            return PRESENCE_HB;
	        },
	        'set_heartbeat' : function(heartbeat) {
	            PRESENCE_HB = validate_presence_heartbeat(heartbeat, PRESENCE_HB_INTERVAL, error);
	            PRESENCE_HB_INTERVAL = (PRESENCE_HB - 3 >= 1)?PRESENCE_HB - 3:1;
	            CONNECT();
	            _presence_heartbeat();
	        },
	        'get_heartbeat_interval' : function() {
	            return PRESENCE_HB_INTERVAL;
	        },
	        'set_heartbeat_interval' : function(heartbeat_interval) {
	            PRESENCE_HB_INTERVAL = heartbeat_interval;
	            _presence_heartbeat();
	        },
	        'get_version' : function() {
	            return SDK_VER;
	        },
	        'getGcmMessageObject' : function(obj) {
	            return {
	                'data' : obj
	            }
	        },
	        'getApnsMessageObject' : function(obj) {
	            var x =  {
	                'aps' : { 'badge' : 1, 'alert' : ''}
	            }
	            for (k in obj) {
	                k[x] = obj[k];
	            }
	            return x;
	        },        
	        'newPnMessage' : function() {
	            var x = {};
	            if (gcm) x['pn_gcm'] = gcm;
	            if (apns) x['pn_apns'] = apns;
	            for ( k in n ) {
	                x[k] = n[k];
	            }
	            return x;
	        },

	        '_add_param' : function(key,val) {
	            params[key] = val;
	        },

	        /*
	            PUBNUB.history({
	                channel  : 'my_chat_channel',
	                limit    : 100,
	                callback : function(history) { }
	            });
	        */
	        'history' : function( args, callback ) {
	            var callback         = args['callback'] || callback
	            ,   count            = args['count']    || args['limit'] || 100
	            ,   reverse          = args['reverse']  || "false"
	            ,   err              = args['error']    || function(){}
	            ,   auth_key         = args['auth_key'] || AUTH_KEY
	            ,   cipher_key       = args['cipher_key']
	            ,   channel          = args['channel']
	            ,   start            = args['start']
	            ,   end              = args['end']
	            ,   include_token    = args['include_token']
	            ,   params           = {}
	            ,   jsonp            = jsonp_cb();

	            // Make sure we have a Channel
	            if (!channel)       return error('Missing Channel');
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            params['stringtoken'] = 'true';
	            params['count']       = count;
	            params['reverse']     = reverse;
	            params['auth']        = auth_key;

	            if (jsonp) params['callback']              = jsonp;
	            if (start) params['start']                 = start;
	            if (end)   params['end']                   = end;
	            if (include_token) params['include_token'] = 'true';

	            // Send Message
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(params),
	                success  : function(response) {
	                    if (typeof response == 'object' && response['error']) {
	                        err({'message' : response['message'], 'payload' : response['payload']});
	                        return;
	                    }
	                    var messages = response[0];
	                    var decrypted_messages = [];
	                    for (var a = 0; a < messages.length; a++) {
	                        var new_message = decrypt(messages[a],cipher_key);
	                        try {
	                            decrypted_messages['push'](JSON['parse'](new_message));
	                        } catch (e) {
	                            decrypted_messages['push']((new_message));
	                        }
	                    }
	                    callback([decrypted_messages, response[1], response[2]]);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v2', 'history', 'sub-key',
	                    SUBSCRIBE_KEY, 'channel', encode(channel)
	                ]
	            });
	        },

	        /*
	            PUBNUB.replay({
	                source      : 'my_channel',
	                destination : 'new_channel'
	            });
	        */
	        'replay' : function(args, callback) {
	            var callback    = callback || args['callback'] || function(){}
	            ,   auth_key    = args['auth_key'] || AUTH_KEY
	            ,   source      = args['source']
	            ,   destination = args['destination']
	            ,   stop        = args['stop']
	            ,   start       = args['start']
	            ,   end         = args['end']
	            ,   reverse     = args['reverse']
	            ,   limit       = args['limit']
	            ,   jsonp       = jsonp_cb()
	            ,   data        = {}
	            ,   url;

	            // Check User Input
	            if (!source)        return error('Missing Source Channel');
	            if (!destination)   return error('Missing Destination Channel');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            // Setup URL Params
	            if (jsonp != '0') data['callback'] = jsonp;
	            if (stop)         data['stop']     = 'all';
	            if (reverse)      data['reverse']  = 'true';
	            if (start)        data['start']    = start;
	            if (end)          data['end']      = end;
	            if (limit)        data['count']    = limit;

	            data['auth'] = auth_key;

	            // Compose URL Parts
	            url = [
	                STD_ORIGIN, 'v1', 'replay',
	                PUBLISH_KEY, SUBSCRIBE_KEY,
	                source, destination
	            ];

	            // Start (or Stop) Replay!
	            xdr({
	                callback : jsonp,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function() { callback([ 0, 'Disconnected' ]) },
	                url      : url,
	                data     : _get_url_params(data)
	            });
	        },

	        /*
	            PUBNUB.auth('AJFLKAJSDKLA');
	        */
	        'auth' : function(auth) {
	            AUTH_KEY = auth;
	            CONNECT();
	        },

	        /*
	            PUBNUB.time(function(time){ });
	        */
	        'time' : function(callback) {
	            var jsonp = jsonp_cb();
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params({ 'uuid' : UUID, 'auth' : AUTH_KEY }),
	                timeout  : SECOND * 5,
	                url      : [STD_ORIGIN, 'time', jsonp],
	                success  : function(response) { callback(response[0]) },
	                fail     : function() { callback(0) }
	            });
	        },

	        /*
	            PUBNUB.publish({
	                channel : 'my_chat_channel',
	                message : 'hello!'
	            });
	        */
	        'publish' : function( args, callback ) {
	            var msg      = args['message'];
	            if (!msg) return error('Missing Message');

	            var callback = callback || args['callback'] || msg['callback'] || function(){}
	            ,   channel  = args['channel'] || msg['channel']
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   cipher_key = args['cipher_key']
	            ,   err      = args['error'] || msg['error'] || function() {}
	            ,   post     = args['post'] || false
	            ,   store    = ('store_in_history' in args) ? args['store_in_history']: true
	            ,   jsonp    = jsonp_cb()
	            ,   add_msg  = 'push'
	            ,   url;

	            if (args['prepend']) add_msg = 'unshift'

	            if (!channel)       return error('Missing Channel');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (msg['getPubnubMessage']) {
	                msg = msg['getPubnubMessage']();
	            } 

	            // If trying to send Object
	            msg = JSON['stringify'](encrypt(msg, cipher_key));

	            // Create URL
	            url = [
	                STD_ORIGIN, 'publish',
	                PUBLISH_KEY, SUBSCRIBE_KEY,
	                0, encode(channel),
	                jsonp, encode(msg)
	            ];

	            params = { 'uuid' : UUID, 'auth' : auth_key }

	            if (!store) params['store'] ="0"

	            // Queue Message Send
	            PUB_QUEUE[add_msg]({
	                callback : jsonp,
	                timeout  : SECOND * 5,
	                url      : url,
	                data     : _get_url_params(params),
	                fail     : function(response){
	                    _invoke_error(response, err);
	                    publish(1);
	                },
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                    publish(1);
	                },
	                mode     : (post)?'POST':'GET'
	            });

	            // Send Message
	            publish();
	        },

	        /*
	            PUBNUB.unsubscribe({ channel : 'my_chat' });
	        */
	        'unsubscribe' : function(args, callback) {
	            var channel = args['channel']
	            ,   callback      = callback            || args['callback'] || function(){}
	            ,   err           = args['error']       || function(){};

	            TIMETOKEN   = 0;
	            //SUB_RESTORE = 1;    REVISIT !!!!

	            // Prepare Channel(s)
	            channel = map( (
	                channel.join ? channel.join(',') : ''+channel
	            ).split(','), function(channel) {
	                if (!CHANNELS[channel]) return;
	                return channel + ',' + channel + PRESENCE_SUFFIX;
	            } ).join(',');

	            // Iterate over Channels
	            each( channel.split(','), function(channel) {
	                var CB_CALLED = true;
	                if (!channel) return;
	                if (READY) {
	                    CB_CALLED = SELF['LEAVE']( channel, 0 , callback, err);
	                }
	                if (!CB_CALLED) callback({action : "leave"});
	                CHANNELS[channel] = 0;
	                if (channel in STATE) delete STATE[channel];
	            } );

	            // Reset Connection if Count Less
	            CONNECT();
	        },

	        /*
	            PUBNUB.subscribe({
	                channel  : 'my_chat'
	                callback : function(message) { }
	            });
	        */
	        'subscribe' : function( args, callback ) {
	            var channel       = args['channel']
	            ,   callback      = callback            || args['callback']
	            ,   callback      = callback            || args['message']
	            ,   auth_key      = args['auth_key']    || AUTH_KEY
	            ,   connect       = args['connect']     || function(){}
	            ,   reconnect     = args['reconnect']   || function(){}
	            ,   disconnect    = args['disconnect']  || function(){}
	            ,   errcb         = args['error']       || function(){}
	            ,   idlecb        = args['idle']        || function(){}
	            ,   presence      = args['presence']    || 0
	            ,   noheresync    = args['noheresync']  || 0
	            ,   backfill      = args['backfill']    || 0
	            ,   timetoken     = args['timetoken']   || 0
	            ,   sub_timeout   = args['timeout']     || SUB_TIMEOUT
	            ,   windowing     = args['windowing']   || SUB_WINDOWING
	            ,   state         = args['state']
	            ,   heartbeat     = args['heartbeat'] || args['pnexpires']
	            ,   restore       = args['restore'] || SUB_RESTORE;

	            // Restore Enabled?
	            SUB_RESTORE = restore;

	            // Always Reset the TT
	            TIMETOKEN = timetoken;

	            // Make sure we have a Channel
	            if (!channel)       return error('Missing Channel');
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (heartbeat || heartbeat === 0) {
	                SELF['set_heartbeat'](heartbeat);
	            }

	            // Setup Channel(s)
	            each( (channel.join ? channel.join(',') : ''+channel).split(','),
	            function(channel) {
	                var settings = CHANNELS[channel] || {};

	                // Store Channel State
	                CHANNELS[SUB_CHANNEL = channel] = {
	                    name         : channel,
	                    connected    : settings.connected,
	                    disconnected : settings.disconnected,
	                    subscribed   : 1,
	                    callback     : SUB_CALLBACK = callback,
	                    'cipher_key' : args['cipher_key'],
	                    connect      : connect,
	                    disconnect   : disconnect,
	                    reconnect    : reconnect
	                };
	                if (state) {
	                    if (channel in state) {
	                        STATE[channel] = state[channel];
	                    } else {
	                        STATE[channel] = state;
	                    }
	                }

	                // Presence Enabled?
	                if (!presence) return;

	                // Subscribe Presence Channel
	                SELF['subscribe']({
	                    'channel'  : channel + PRESENCE_SUFFIX,
	                    'callback' : presence,
	                    'restore'  : restore
	                });

	                // Presence Subscribed?
	                if (settings.subscribed) return;

	                // See Who's Here Now?
	                if (noheresync) return;
	                SELF['here_now']({
	                    'channel'  : channel,
	                    'callback' : function(here) {
	                        each( 'uuids' in here ? here['uuids'] : [],
	                        function(uid) { presence( {
	                            'action'    : 'join',
	                            'uuid'      : uid,
	                            'timestamp' : Math.floor(rnow() / 1000),
	                            'occupancy' : here['occupancy'] || 1
	                        }, here, channel ); } );
	                    }
	                });
	            } );

	            // Test Network Connection
	            function _test_connection(success) {
	                if (success) {
	                    // Begin Next Socket Connection
	                    timeout( CONNECT, SECOND );
	                }
	                else {
	                    // New Origin on Failed Connection
	                    STD_ORIGIN = nextorigin( ORIGIN, 1 );
	                    SUB_ORIGIN = nextorigin( ORIGIN, 1 );

	                    // Re-test Connection
	                    timeout( function() {
	                        SELF['time'](_test_connection);
	                    }, SECOND );
	                }

	                // Disconnect & Reconnect
	                each_channel(function(channel){
	                    // Reconnect
	                    if (success && channel.disconnected) {
	                        channel.disconnected = 0;
	                        return channel.reconnect(channel.name);
	                    }

	                    // Disconnect
	                    if (!success && !channel.disconnected) {
	                        channel.disconnected = 1;
	                        channel.disconnect(channel.name);
	                    }
	                });
	            }

	            // Evented Subscribe
	            function _connect() {
	                var jsonp    = jsonp_cb()
	                ,   channels = generate_channel_list(CHANNELS).join(',');

	                // Stop Connection
	                if (!channels) return;

	                // Connect to PubNub Subscribe Servers
	                _reset_offline();

	                var data = _get_url_params({ 'uuid' : UUID, 'auth' : auth_key });

	                var st = JSON.stringify(STATE);
	                if (st.length > 2) data['state'] = JSON.stringify(STATE);

	                if (PRESENCE_HB) data['heartbeat'] = PRESENCE_HB;

	                start_presence_heartbeat();
	                SUB_RECEIVER = xdr({
	                    timeout  : sub_timeout,
	                    callback : jsonp,
	                    fail     : function(response) {
	                        _invoke_error(response, errcb);
	                        //SUB_RECEIVER = null;
	                        SELF['time'](_test_connection);
	                    },
	                    data     : _get_url_params(data),
	                    url      : [
	                        SUB_ORIGIN, 'subscribe',
	                        SUBSCRIBE_KEY, encode(channels),
	                        jsonp, TIMETOKEN
	                    ],
	                    success : function(messages) {

	                        //SUB_RECEIVER = null;
	                        // Check for Errors
	                        if (!messages || (
	                            typeof messages == 'object' &&
	                            'error' in messages         &&
	                            messages['error']
	                        )) {
	                            errcb(messages['error']);
	                            return timeout( CONNECT, SECOND );
	                        }

	                        // User Idle Callback
	                        idlecb(messages[1]);

	                        // Restore Previous Connection Point if Needed
	                        TIMETOKEN = !TIMETOKEN               &&
	                                    SUB_RESTORE              &&
	                                    db['get'](SUBSCRIBE_KEY) || messages[1];

	                        // Connect
	                        each_channel(function(channel){
	                            if (channel.connected) return;
	                            channel.connected = 1;
	                            channel.connect(channel.name);
	                        });

	                        if (RESUMED && !SUB_RESTORE) {
	                                TIMETOKEN = 0;
	                                RESUMED = false;
	                                // Update Saved Timetoken
	                                db['set']( SUBSCRIBE_KEY, 0 );
	                                timeout( _connect, windowing );
	                                return;
	                        }

	                        // Invoke Memory Catchup and Receive Up to 100
	                        // Previous Messages from the Queue.
	                        if (backfill) {
	                            TIMETOKEN = 10000;
	                            backfill  = 0;
	                        }

	                        // Update Saved Timetoken
	                        db['set']( SUBSCRIBE_KEY, messages[1] );

	                        // Route Channel <---> Callback for Message
	                        var next_callback = (function() {
	                            var channels = (messages.length>2?messages[2]:map(
	                                generate_channel_list(CHANNELS), function(chan) { return map(
	                                    Array(messages[0].length)
	                                    .join(',').split(','),
	                                    function() { return chan; }
	                                ) }).join(','));
	                            var list = channels.split(',');

	                            return function() {
	                                var channel = list.shift()||SUB_CHANNEL;
	                                return [
	                                    (CHANNELS[channel]||{})
	                                    .callback||SUB_CALLBACK,
	                                    channel.split(PRESENCE_SUFFIX)[0]
	                                ];
	                            };
	                        })();

	                        var latency = detect_latency(+messages[1]);
	                        each( messages[0], function(msg) {
	                            var next = next_callback();
	                            var decrypted_msg = decrypt(msg,
	                                (CHANNELS[next[1]])?CHANNELS[next[1]]['cipher_key']:null);
	                            next[0]( decrypted_msg, messages, next[1], latency);
	                        });

	                        timeout( _connect, windowing );
	                    }
	                });
	            }

	            CONNECT = function() {
	                _reset_offline();
	                timeout( _connect, windowing );
	            };

	            // Reduce Status Flicker
	            if (!READY) return READY_BUFFER.push(CONNECT);

	            // Connect Now
	            CONNECT();
	        },

	        /*
	            PUBNUB.here_now({ channel : 'my_chat', callback : fun });
	        */
	        'here_now' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   channel  = args['channel']
	            ,   jsonp    = jsonp_cb()
	            ,   uuids    = ('uuids' in args) ? args['uuids'] : true
	            ,   state    = args['state']
	            ,   data     = { 'uuid' : UUID, 'auth' : auth_key };

	            if (!uuids) data['disable_uuids'] = 1;
	            if (state) data['state'] = 1;

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            var url = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub_key', SUBSCRIBE_KEY
	                ];

	            channel && url.push('channel') && url.push(encode(channel));

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });
	        },

	        /*
	            PUBNUB.current_channels_by_uuid({ channel : 'my_chat', callback : fun });
	        */
	        'where_now' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   jsonp    = jsonp_cb()
	            ,   uuid     = args['uuid']     || UUID
	            ,   data     = { 'auth' : auth_key };

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub_key', SUBSCRIBE_KEY,
	                    'uuid', encode(uuid)
	                ]
	            });
	        },

	        'state' : function(args, callback) {
	            var callback = args['callback'] || callback || function(r) {}
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   jsonp    = jsonp_cb()
	            ,   state    = args['state']
	            ,   uuid     = args['uuid'] || UUID
	            ,   channel  = args['channel']
	            ,   url
	            ,   data     = _get_url_params({ 'auth' : auth_key });

	            // Make sure we have a Channel
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!uuid) return error('Missing UUID');
	            if (!channel) return error('Missing Channel');

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            if (CHANNELS[channel] && CHANNELS[channel].subscribed && state) STATE[channel] = state;

	            data['state'] = JSON.stringify(state);

	            if (state) {
	                url      = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel', encode(channel),
	                    'uuid', uuid, 'data'
	                ]
	            } else {
	                url      = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel', encode(channel),
	                    'uuid', encode(uuid)
	                ]
	            }

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url

	            });

	        },

	        /*
	            PUBNUB.grant({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                ttl      : 24 * 60, // Minutes
	                read     : true,
	                write    : true,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'grant' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   channel  = args['channel']
	            ,   jsonp    = jsonp_cb()
	            ,   ttl      = args['ttl']
	            ,   r        = (args['read'] )?"1":"0"
	            ,   w        = (args['write'])?"1":"0"
	            ,   auth_key = args['auth_key'];

	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SECRET_KEY)    return error('Missing Secret Key');

	            var timestamp  = Math.floor(new Date().getTime() / 1000)
	            ,   sign_input = SUBSCRIBE_KEY + "\n" + PUBLISH_KEY + "\n"
	                    + "grant" + "\n";

	            var data = {
	                'w'         : w,
	                'r'         : r,
	                'timestamp' : timestamp
	            };
	            if (channel != 'undefined' && channel != null && channel.length > 0) data['channel'] = channel;
	            if (jsonp != '0') { data['callback'] = jsonp; }
	            if (ttl || ttl === 0) data['ttl'] = ttl;

	            if (auth_key) data['auth'] = auth_key;

	            data = _get_url_params(data)

	            if (!auth_key) delete data['auth'];

	            sign_input += _get_pam_sign_input_from_params(data);

	            var signature = hmac_SHA256( sign_input, SECRET_KEY );

	            signature = signature.replace( /\+/g, "-" );
	            signature = signature.replace( /\//g, "_" );

	            data['signature'] = signature;

	            xdr({
	                callback : jsonp,
	                data     : data,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v1', 'auth', 'grant' ,
	                    'sub-key', SUBSCRIBE_KEY
	                ]
	            });
	        },

	        /*
	            PUBNUB.audit({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                read     : true,
	                write    : true,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'audit' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   channel  = args['channel']
	            ,   auth_key = args['auth_key']
	            ,   jsonp    = jsonp_cb();

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SECRET_KEY)    return error('Missing Secret Key');

	            var timestamp  = Math.floor(new Date().getTime() / 1000)
	            ,   sign_input = SUBSCRIBE_KEY + "\n"
	                + PUBLISH_KEY + "\n"
	                + "audit" + "\n";

	            var data = {'timestamp' : timestamp };
	            if (jsonp != '0') { data['callback'] = jsonp; }
	            if (channel != 'undefined' && channel != null && channel.length > 0) data['channel'] = channel;
	            if (auth_key) data['auth']    = auth_key;    

	            data = _get_url_params(data)
	            
	            if (!auth_key) delete data['auth'];
	            
	            sign_input += _get_pam_sign_input_from_params(data);

	            var signature = hmac_SHA256( sign_input, SECRET_KEY );

	            signature = signature.replace( /\+/g, "-" );
	            signature = signature.replace( /\//g, "_" );

	            data['signature'] = signature;
	            xdr({
	                callback : jsonp,
	                data     : data,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v1', 'auth', 'audit' ,
	                    'sub-key', SUBSCRIBE_KEY
	                ]
	            });
	        },

	        /*
	            PUBNUB.revoke({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'revoke' : function( args, callback ) {
	            args['read']  = false;
	            args['write'] = false;
	            SELF['grant']( args, callback );
	        },
	        'set_uuid' : function(uuid) {
	            UUID = uuid;
	            CONNECT();
	        },
	        'get_uuid' : function() {
	            return UUID;
	        },
	        'presence_heartbeat' : function(args) {
	            var callback = args['callback'] || function() {}
	            var err      = args['error']    || function() {}
	            var jsonp    = jsonp_cb();
	            var data     = { 'uuid' : UUID, 'auth' : AUTH_KEY };

	            var st = JSON['stringify'](STATE);
	            if (st.length > 2) data['state'] = JSON['stringify'](STATE);

	            if (PRESENCE_HB > 0 && PRESENCE_HB < 320) data['heartbeat'] = PRESENCE_HB;

	            if (jsonp != '0') { data['callback'] = jsonp; }
	            
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                timeout  : SECOND * 5,
	                url      : [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel' , encode(generate_channel_list(CHANNELS, true)['join'](',')),
	                    'heartbeat'
	                ],
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) { _invoke_error(response, err); }
	            });
	        },

	        // Expose PUBNUB Functions
	        'xdr'           : xdr,
	        'ready'         : ready,
	        'db'            : db,
	        'uuid'          : uuid,
	        'map'           : map,
	        'each'          : each,
	        'each-channel'  : each_channel,
	        'grep'          : grep,
	        'offline'       : function(){_reset_offline(1, { "message":"Offline. Please check your network settings." })},
	        'supplant'      : supplant,
	        'now'           : rnow,
	        'unique'        : unique,
	        'updater'       : updater
	    };

	    function _poll_online() {
	        _is_online() || _reset_offline( 1, {
	            "error" : "Offline. Please check your network settings. "
	        });
	        timeout( _poll_online, SECOND );
	    }

	    function _poll_online2() {
	        SELF['time'](function(success){
	            detect_time_detla( function(){}, success );
	            success || _reset_offline( 1, {
	                "error" : "Heartbeat failed to connect to Pubnub Servers." +
	                    "Please check your network settings."
	                });
	            timeout( _poll_online2, KEEPALIVE );
	        });
	    }

	    function _reset_offline(err, msg) {
	        SUB_RECEIVER && SUB_RECEIVER(err, msg);
	        SUB_RECEIVER = null;
	    }

	    if (!UUID) UUID = SELF['uuid']();
	    db['set']( SUBSCRIBE_KEY + 'uuid', UUID );

	    timeout( _poll_online,  SECOND    );
	    timeout( _poll_online2, KEEPALIVE );
	    PRESENCE_HB_TIMEOUT = timeout( start_presence_heartbeat, ( PRESENCE_HB_INTERVAL - 3 ) * SECOND ) ;

	    // Detect Age of Message
	    function detect_latency(tt) {
	        var adjusted_time = rnow() - TIME_DRIFT;
	        return adjusted_time - tt / 10000;
	    }

	    detect_time_detla();
	    function detect_time_detla( cb, time ) {
	        var stime = rnow();

	        time && calculate(time) || SELF['time'](calculate);

	        function calculate(time) {
	            if (!time) return;
	            var ptime   = time / 10000
	            ,   latency = (rnow() - stime) / 2;
	            TIME_DRIFT = rnow() - (ptime + latency);
	            cb && cb(TIME_DRIFT);
	        }
	    }

	    return SELF;
	}
	/* ---------------------------------------------------------------------------
	WAIT! - This file depends on instructions from the PUBNUB Cloud.
	http://www.pubnub.com/account
	--------------------------------------------------------------------------- */

	/* ---------------------------------------------------------------------------
	PubNub Real-time Cloud-Hosted Push API and Push Notification Client Frameworks
	Copyright (c) 2011 TopMambo Inc.
	http://www.pubnub.com/
	http://www.pubnub.com/terms
	--------------------------------------------------------------------------- */

	/* ---------------------------------------------------------------------------
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
	--------------------------------------------------------------------------- */
	/**
	 * UTIL LOCALS
	 */
	var NOW                 = 1
	,   http                = __webpack_require__(30)
	,   https               = __webpack_require__(46)
	,   keepAliveAgent      = new (keepAliveIsEmbedded() ? http.Agent : __webpack_require__(156))({
	                            keepAlive: true,
	                            keepAliveMsecs: 300000,
	                            maxSockets: 5
	                          })
	,   XHRTME              = 310000
	,   DEF_TIMEOUT         = 10000
	,   SECOND              = 1000
	,   PNSDK               = 'PubNub-JS-' + 'Nodejs' + '/' +  '3.6.8'
	,   crypto              = __webpack_require__(48)
	,   proxy               = null
	,   XORIGN              = 1;


	function get_hmac_SHA256(data, key) {
	    return crypto.createHmac('sha256',
	                    new Buffer(key, 'utf8')).update(data).digest('base64');
	}


	/**
	 * ERROR
	 * ===
	 * error('message');
	 */
	function error(message) { console['error'](message) }

	/**
	 * Request
	 * =======
	 *  xdr({
	 *     url     : ['http://www.blah.com/url'],
	 *     success : function(response) {},
	 *     fail    : function() {}
	 *  });
	 */
	function xdr( setup ) {
	    var request
	    ,   response
	    ,   success  = setup.success || function(){}
	    ,   fail     = setup.fail    || function(){}
	    ,   origin   = setup.origin || 'pubsub.pubnub.com'
	    ,   ssl      = setup.ssl
	    ,   failed   = 0
	    ,   complete = 0
	    ,   loaded   = 0
	    ,   mode     = setup['mode'] || 'GET'
	    ,   data     = setup['data'] || {}
	    ,   xhrtme   = setup.timeout || DEF_TIMEOUT
	    ,   body = ''
	    ,   finished = function() {
	            if (loaded) return;
	                loaded = 1;

	            clearTimeout(timer);
	            try       { response = JSON['parse'](body); }
	            catch (r) { return done(1); }
	            success(response);
	        }
	    ,   done    = function(failed, response) {
	            if (complete) return;
	                complete = 1;

	            clearTimeout(timer);

	            if (request) {
	                request.on('error', function(){});
	                request.on('data', function(){});
	                request.on('end', function(){});
	                request.abort && request.abort();
	                request = null;
	            }
	            failed && fail(response);
	        }
	        ,   timer  = timeout( function(){done(1);} , xhrtme );

	    data['pnsdk'] = PNSDK;

	    var options = {};
	    var headers = {};
	    var payload = '';

	    if (mode == 'POST')
	        payload = decodeURIComponent(setup.url.pop());

	    var url = build_url( setup.url, data );
	    if (!ssl) ssl = (url.split('://')[0] == 'https')?true:false;

	    url = '/' + url.split('/').slice(3).join('/');

	    var origin       = setup.url[0].split("//")[1]

	    options.hostname = proxy ? proxy.hostname : setup.url[0].split("//")[1];
	    options.port     = proxy ? proxy.port : ssl ? 443 : 80;
	    options.path     = proxy ? "http://" + origin + url:url;
	    options.headers  = proxy ? { 'Host': origin }:null;
	    options.method   = mode;
	    options.keepAlive= !!keepAliveAgent;
	    options.agent    = keepAliveAgent;
	    options.body     = payload;

	    __webpack_require__(30).globalAgent.maxSockets = Infinity;
	    try {
	        request = (ssl ? https : http)['request'](options, function(response) {
	            response.setEncoding('utf8');
	            response.on( 'error', function(){console.log('error');done(1, body || { "error" : "Network Connection Error"})});
	            response.on( 'abort', function(){console.log('abort');done(1, body || { "error" : "Network Connection Error"})});
	            response.on( 'data', function (chunk) {
	                if (chunk) body += chunk;
	            } );
	            response.on( 'end', function(){
	                var statusCode = response.statusCode;

	                switch(statusCode) {
	                    case 401:
	                    case 402:
	                    case 403:
	                        try {
	                            response = JSON['parse'](body);
	                            done(1,response);
	                        }
	                        catch (r) { return done(1, body); }
	                        return;
	                    default:
	                        break;
	                }
	                finished();
	            });
	        });
	        request.timeout = xhrtme;
	        request.on( 'error', function() {
	            done( 1, {"error":"Network Connection Error"} );
	        } );

	        if (mode == 'POST') request.write(payload);
	        request.end();

	    } catch(e) {
	        done(0);
	        return xdr(setup);
	    }

	    return done;
	}

	/**
	 * LOCAL STORAGE
	 */
	var db = (function(){
	    var store = {};
	    return {
	        'get' : function(key) {
	            return store[key];
	        },
	        'set' : function( key, value ) {
	            store[key] = value;
	        }
	    };
	})();

	function crypto_obj() {
	    var iv = "0123456789012345";
	    function get_padded_key(key) {
	        return crypto.createHash('sha256').update(key).digest("hex").slice(0,32);
	    }

	    return {
	        'encrypt' : function(input, key) {
	            if (!key) return input;
	            var plain_text = JSON['stringify'](input);
	            var cipher = crypto.createCipheriv('aes-256-cbc', get_padded_key(key), iv);
	            var base_64_encrypted = cipher.update(plain_text, 'utf8', 'base64') + cipher.final('base64');
	            return base_64_encrypted || input;
	        },
	        'decrypt' : function(input, key) {
	            if (!key) return input;
	            var decipher = crypto.createDecipheriv('aes-256-cbc', get_padded_key(key), iv);
	            try {
	                var decrypted = decipher.update(input, 'base64', 'utf8') + decipher.final('utf8');
	            } catch (e) {
	                return null;
	            }
	            return JSON.parse(decrypted);
	        }
	    }
	}

	function keepAliveIsEmbedded() {
	  return 'EventEmitter' in http.Agent.super_;
	}


	var CREATE_PUBNUB = function(setup) {
	    proxy = setup['proxy'];
	    setup['xdr'] = xdr;
	    setup['db'] = db;
	    setup['error'] = setup['error'] || error;
	    setup['hmac_SHA256'] = get_hmac_SHA256;
	    setup['crypto_obj'] = crypto_obj();
	    setup['params'] = {'pnsdk' : PNSDK};

	    if (setup['keepAlive'] === false) {
	      keepAliveAgent = undefined;
	    }

	    SELF = function(setup) {
	        return CREATE_PUBNUB(setup);
	    }
	    var PN = PN_API(setup);
	    for (var prop in PN) {
	        if (PN.hasOwnProperty(prop)) {
	            SELF[prop] = PN[prop];
	        }
	    }
	    SELF.init = SELF;
	    SELF.secure = SELF;
	    SELF.ready();
	    return SELF;
	}
	CREATE_PUBNUB.init = CREATE_PUBNUB;

	CREATE_PUBNUB.unique = unique
	CREATE_PUBNUB.secure = CREATE_PUBNUB;
	module.exports = CREATE_PUBNUB
	module.exports.PNmessage = PNmessage;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 87 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS)
				return 62 // '+'
			if (code === SLASH)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}(false ? (this.base64js = {}) : exports))


/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// copy from https://github.com/joyent/node/blob/master/lib/_http_agent.js

	var net = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"net\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	var url = __webpack_require__(31);
	var util = __webpack_require__(79);
	var EventEmitter = __webpack_require__(44).EventEmitter;
	// var ClientRequest = require('_http_client').ClientRequest;
	// var debug = util.debuglog('http');
	var ClientRequest = __webpack_require__(30).ClientRequest;
	var debug;
	if (process.env.NODE_DEBUG && /agentkeepalive/.test(process.env.NODE_DEBUG)) {
	  debug = function (x) {
	    console.error.apply(console, arguments);
	  };
	} else {
	  debug = function () { };
	}

	// New Agent code.

	// The largest departure from the previous implementation is that
	// an Agent instance holds connections for a variable number of host:ports.
	// Surprisingly, this is still API compatible as far as third parties are
	// concerned. The only code that really notices the difference is the
	// request object.

	// Another departure is that all code related to HTTP parsing is in
	// ClientRequest.onSocket(). The Agent is now *strictly*
	// concerned with managing a connection pool.

	function Agent(options) {
	  if (!(this instanceof Agent))
	    return new Agent(options);

	  EventEmitter.call(this);

	  var self = this;

	  self.defaultPort = 80;
	  self.protocol = 'http:';

	  self.options = util._extend({}, options);

	  // don't confuse net and make it think that we're connecting to a pipe
	  self.options.path = null;
	  self.requests = {};
	  self.sockets = {};
	  self.freeSockets = {};
	  self.keepAliveMsecs = self.options.keepAliveMsecs || 1000;
	  self.keepAlive = self.options.keepAlive || false;
	  self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets;
	  self.maxFreeSockets = self.options.maxFreeSockets || 256;

	  self.on('free', function(socket, options) {
	    var name = self.getName(options);
	    debug('agent.on(free)', name);

	    if (!self.isDestroyed(socket) &&
	        self.requests[name] && self.requests[name].length) {
	      self.requests[name].shift().onSocket(socket);
	      if (self.requests[name].length === 0) {
	        // don't leak
	        delete self.requests[name];
	      }
	    } else {
	      // If there are no pending requests, then put it in
	      // the freeSockets pool, but only if we're allowed to do so.
	      var req = socket._httpMessage;
	      if (req &&
	          req.shouldKeepAlive &&
	          !self.isDestroyed(socket) &&
	          self.options.keepAlive) {
	        var freeSockets = self.freeSockets[name];
	        var freeLen = freeSockets ? freeSockets.length : 0;
	        var count = freeLen;
	        if (self.sockets[name])
	          count += self.sockets[name].length;

	        if (count >= self.maxSockets || freeLen >= self.maxFreeSockets) {
	          self.removeSocket(socket, options);
	          socket.destroy();
	        } else {
	          freeSockets = freeSockets || [];
	          self.freeSockets[name] = freeSockets;
	          socket.setKeepAlive(true, self.keepAliveMsecs);
	          socket.unref && socket.unref();
	          socket._httpMessage = null;
	          self.removeSocket(socket, options);
	          freeSockets.push(socket);
	        }
	      } else {
	        self.removeSocket(socket, options);
	        socket.destroy();
	      }
	    }
	  });
	}

	util.inherits(Agent, EventEmitter);
	exports.Agent = Agent;

	Agent.defaultMaxSockets = Infinity;

	Agent.prototype.createConnection = net.createConnection;

	// Get the key for a given set of request options
	Agent.prototype.getName = function(options) {
	  var name = '';

	  if (options.host)
	    name += options.host;
	  else
	    name += 'localhost';

	  name += ':';
	  if (options.port)
	    name += options.port;
	  name += ':';
	  if (options.localAddress)
	    name += options.localAddress;
	  name += ':';
	  return name;
	};

	Agent.prototype.addRequest = function(req, options) {
	  // Legacy API: addRequest(req, host, port, path)
	  if (typeof options === 'string') {
	    options = {
	      host: options,
	      port: arguments[2],
	      path: arguments[3]
	    };
	  }

	  var name = this.getName(options);
	  if (!this.sockets[name]) {
	    this.sockets[name] = [];
	  }

	  var freeLen = this.freeSockets[name] ? this.freeSockets[name].length : 0;
	  var sockLen = freeLen + this.sockets[name].length;

	  if (freeLen) {
	    // we have a free socket, so use that.
	    var socket = this.freeSockets[name].shift();
	    debug('have free socket');

	    // don't leak
	    if (!this.freeSockets[name].length)
	      delete this.freeSockets[name];

	    socket.ref && socket.ref();
	    req.onSocket(socket);
	    this.sockets[name].push(socket);
	  } else if (sockLen < this.maxSockets) {
	    debug('call onSocket', sockLen, freeLen);
	    // If we are under maxSockets create a new one.
	    req.onSocket(this.createSocket(req, options));
	  } else {
	    debug('wait for socket');
	    // We are over limit so we'll add it to the queue.
	    if (!this.requests[name]) {
	      this.requests[name] = [];
	    }
	    this.requests[name].push(req);
	  }
	};

	Agent.prototype.createSocket = function(req, options) {
	  var self = this;
	  options = util._extend({}, options);
	  options = util._extend(options, self.options);

	  options.servername = options.host;
	  if (req) {
	    var hostHeader = req.getHeader('host');
	    if (hostHeader) {
	      options.servername = hostHeader.replace(/:.*$/, '');
	    }
	  }

	  var name = self.getName(options);

	  debug('createConnection', name, options);
	  var s = self.createConnection(options);
	  if (!self.sockets[name]) {
	    self.sockets[name] = [];
	  }
	  this.sockets[name].push(s);
	  debug('sockets', name, this.sockets[name].length);

	  function onFree() {
	    self.emit('free', s, options);
	  }
	  s.on('free', onFree);

	  function onClose(err) {
	    debug('CLIENT socket onClose');
	    // This is the only place where sockets get removed from the Agent.
	    // If you want to remove a socket from the pool, just close it.
	    // All socket errors end in a close event anyway.
	    self.removeSocket(s, options);
	  }
	  s.on('close', onClose);

	  function onRemove() {
	    // We need this function for cases like HTTP 'upgrade'
	    // (defined by WebSockets) where we need to remove a socket from the
	    // pool because it'll be locked up indefinitely
	    debug('CLIENT socket onRemove');
	    self.removeSocket(s, options, 'agentRemove');
	    s.removeListener('close', onClose);
	    s.removeListener('free', onFree);
	    s.removeListener('agentRemove', onRemove);
	  }
	  s.on('agentRemove', onRemove);
	  return s;
	};

	Agent.prototype.removeSocket = function(s, options) {
	  var name = this.getName(options);
	  debug('removeSocket', name, 'destroyed:', this.isDestroyed(s));
	  var sets = [this.sockets];
	  if (this.isDestroyed(s)) {
	    // If the socket was destroyed, we need to remove it from the free buffers.
	    sets.push(this.freeSockets);
	  }
	  sets.forEach(function(sockets) {
	    if (sockets[name]) {
	      var index = sockets[name].indexOf(s);
	      if (index !== -1) {
	        sockets[name].splice(index, 1);
	        if (sockets[name].length === 0) {
	          // don't leak
	          delete sockets[name];
	        }
	      }
	    }
	  });
	  if (this.requests[name] && this.requests[name].length) {
	    debug('removeSocket, have a request, make a socket');
	    var req = this.requests[name][0];
	    // If we have pending requests and a socket gets closed make a new one
	    this.createSocket(req, options).emit('free');
	  }
	};

	Agent.prototype.destroy = function() {
	  var sets = [this.freeSockets, this.sockets];
	  sets.forEach(function(set) {
	    Object.keys(set).forEach(function(name) {
	      set[name].forEach(function(socket) {
	        socket.destroy();
	      });
	    });
	  });
	};

	Agent.prototype.request = function(options, cb) {
	  // if (util.isString(options)) {
	  //   options = url.parse(options);
	  // }
	  if (typeof options === 'string') {
	    options = url.parse(options);
	  }
	  // don't try to do dns lookups of foo.com:8080, just foo.com
	  if (options.hostname) {
	    options.host = options.hostname;
	  }

	  if (options && options.path && / /.test(options.path)) {
	    // The actual regex is more like /[^A-Za-z0-9\-._~!$&'()*+,;=/:@]/
	    // with an additional rule for ignoring percentage-escaped characters
	    // but that's a) hard to capture in a regular expression that performs
	    // well, and b) possibly too restrictive for real-world usage. That's
	    // why it only scans for spaces because those are guaranteed to create
	    // an invalid request.
	    throw new TypeError('Request path contains unescaped characters.');
	  } else if (options.protocol && options.protocol !== this.protocol) {
	    throw new Error('Protocol:' + options.protocol + ' not supported.');
	  }

	  options = util._extend({
	    agent: this,
	    keepAlive: this.keepAlive
	  }, options);

	  // if it's false, then make a new one, just like this one.
	  if (options.agent === false)
	    options.agent = new this.constructor();

	  debug('agent.request', options);
	  return new ClientRequest(options, cb);
	};

	Agent.prototype.get = function(options, cb) {
	  var req = this.request(options, cb);
	  req.end();
	  return req;
	};

	Agent.prototype.isDestroyed = function(socket){
	  return socket.destroyed || socket._destroyed;
	}
	exports.globalAgent = new Agent();
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {/*
	Copyright (c) 2010,2011,2012,2013 Morgan Roderick http://roderick.dk
	License: MIT - http://mrgnrdrck.mit-license.org

	https://github.com/mroderick/PubSubJS
	*/
	/*jslint white:true, plusplus:true, stupid:true*/
	/*global
		setTimeout,
		module,
		exports,
		define,
		require,
		window
	*/
	(function(root, factory){
		'use strict';

		// CommonJS
		if (typeof exports === 'object' && module){
			module.exports = factory();

		// AMD
		} else if (true){
			!(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		// Browser
		} else {
			root.PubSub = factory();
		}
	}( ( typeof window === 'object' && window ) || this, function(){

		'use strict';

		var PubSub = {},
			messages = {},
			lastUid = -1;

		function hasKeys(obj){
			var key;

			for (key in obj){
				if ( obj.hasOwnProperty(key) ){
					return true;
				}
			}
			return false;
		}

		/**
		 *	Returns a function that throws the passed exception, for use as argument for setTimeout
		 *	@param { Object } ex An Error object
		 */
		function throwException( ex ){
			return function reThrowException(){
				throw ex;
			};
		}

		function callSubscriberWithDelayedExceptions( subscriber, message, data ){
			try {
				subscriber( message, data );
			} catch( ex ){
				setTimeout( throwException( ex ), 0);
			}
		}

		function callSubscriberWithImmediateExceptions( subscriber, message, data ){
			subscriber( message, data );
		}

		function deliverMessage( originalMessage, matchedMessage, data, immediateExceptions ){
			var subscribers = messages[matchedMessage],
				callSubscriber = immediateExceptions ? callSubscriberWithImmediateExceptions : callSubscriberWithDelayedExceptions,
				s;

			if ( !messages.hasOwnProperty( matchedMessage ) ) {
				return;
			}

			for (s in subscribers){
				if ( subscribers.hasOwnProperty(s)){
					callSubscriber( subscribers[s], originalMessage, data );
				}
			}
		}

		function createDeliveryFunction( message, data, immediateExceptions ){
			return function deliverNamespaced(){
				var topic = String( message ),
					position = topic.lastIndexOf( '.' );

				// deliver the message as it is now
				deliverMessage(message, message, data, immediateExceptions);

				// trim the hierarchy and deliver message to each level
				while( position !== -1 ){
					topic = topic.substr( 0, position );
					position = topic.lastIndexOf('.');
					deliverMessage( message, topic, data );
				}
			};
		}

		function messageHasSubscribers( message ){
			var topic = String( message ),
				found = Boolean(messages.hasOwnProperty( topic ) && hasKeys(messages[topic])),
				position = topic.lastIndexOf( '.' );

			while ( !found && position !== -1 ){
				topic = topic.substr( 0, position );
				position = topic.lastIndexOf( '.' );
				found = Boolean(messages.hasOwnProperty( topic ) && hasKeys(messages[topic]));
			}

			return found;
		}

		function publish( message, data, sync, immediateExceptions ){
			var deliver = createDeliveryFunction( message, data, immediateExceptions ),
				hasSubscribers = messageHasSubscribers( message );

			if ( !hasSubscribers ){
				return false;
			}

			if ( sync === true ){
				deliver();
			} else {
				setTimeout( deliver, 0 );
			}
			return true;
		}

		/**
		 *	PubSub.publish( message[, data] ) -> Boolean
		 *	- message (String): The message to publish
		 *	- data: The data to pass to subscribers
		 *	Publishes the the message, passing the data to it's subscribers
		**/
		PubSub.publish = function( message, data ){
			return publish( message, data, false, PubSub.immediateExceptions );
		};

		/**
		 *	PubSub.publishSync( message[, data] ) -> Boolean
		 *	- message (String): The message to publish
		 *	- data: The data to pass to subscribers
		 *	Publishes the the message synchronously, passing the data to it's subscribers
		**/
		PubSub.publishSync = function( message, data ){
			return publish( message, data, true, PubSub.immediateExceptions );
		};

		/**
		 *	PubSub.subscribe( message, func ) -> String
		 *	- message (String): The message to subscribe to
		 *	- func (Function): The function to call when a new message is published
		 *	Subscribes the passed function to the passed message. Every returned token is unique and should be stored if
		 *	you need to unsubscribe
		**/
		PubSub.subscribe = function( message, func ){
			if ( typeof func !== 'function'){
				return false;
			}

			// message is not registered yet
			if ( !messages.hasOwnProperty( message ) ){
				messages[message] = {};
			}

			// forcing token as String, to allow for future expansions without breaking usage
			// and allow for easy use as key names for the 'messages' object
			var token = 'uid_' + String(++lastUid);
			messages[message][token] = func;

			// return token for unsubscribing
			return token;
		};

		/**
		 *	PubSub.unsubscribe( tokenOrFunction ) -> String | Boolean
		 *  - tokenOrFunction (String|Function): The token of the function to unsubscribe or func passed in on subscribe
		 *  Unsubscribes a specific subscriber from a specific message using the unique token
		 *  or if using Function as argument, it will remove all subscriptions with that function
		**/
		PubSub.unsubscribe = function( tokenOrFunction ){
			var isToken = typeof tokenOrFunction === 'string',
				result = false,
				m, message, t, token;

			for ( m in messages ){
				if ( messages.hasOwnProperty( m ) ){
					message = messages[m];

					if ( isToken && message[tokenOrFunction] ){
						delete message[tokenOrFunction];
						result = tokenOrFunction;
						// tokens are unique, so we can just stop here
						break;
					} else if (!isToken) {
						for ( t in message ){
							if (message.hasOwnProperty(t) && message[t] === tokenOrFunction){
								delete message[t];
								result = true;
							}
						}
					}
				}
			}

			return result;
		};

		return PubSub;
	}));
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(83)(module)))

/***/ },
/* 90 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var Promise = __webpack_require__(139).Promise;
	var polyfill = __webpack_require__(140).polyfill;
	exports.Promise = Promise;
	exports.polyfill = polyfill;

/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function() {
	var global = __webpack_require__(107);
	var util = __webpack_require__(108);
	var async = __webpack_require__(109);
	var errors = __webpack_require__(110);

	var INTERNAL = function(){};
	var APPLY = {};
	var NEXT_FILTER = {e: null};

	var PromiseArray = __webpack_require__(111)(Promise, INTERNAL);
	var CapturedTrace = __webpack_require__(112)();
	var CatchFilter = __webpack_require__(113)(NEXT_FILTER);
	var PromiseResolver = __webpack_require__(114);

	var isArray = util.isArray;

	var errorObj = util.errorObj;
	var tryCatch1 = util.tryCatch1;
	var tryCatch2 = util.tryCatch2;
	var tryCatchApply = util.tryCatchApply;
	var RangeError = errors.RangeError;
	var TypeError = errors.TypeError;
	var CancellationError = errors.CancellationError;
	var TimeoutError = errors.TimeoutError;
	var RejectionError = errors.RejectionError;
	var originatesFromRejection = errors.originatesFromRejection;
	var markAsOriginatingFromRejection = errors.markAsOriginatingFromRejection;
	var canAttach = errors.canAttach;
	var thrower = util.thrower;
	var apiRejection = __webpack_require__(115)(Promise);


	var makeSelfResolutionError = function Promise$_makeSelfResolutionError() {
	    return new TypeError("circular promise resolution chain");
	};

	function isPromise(obj) {
	    if (obj === void 0) return false;
	    return obj instanceof Promise;
	}

	function isPromiseArrayProxy(receiver, promiseSlotValue) {
	    if (receiver instanceof PromiseArray) {
	        return promiseSlotValue >= 0;
	    }
	    return false;
	}

	function Promise(resolver) {
	    if (typeof resolver !== "function") {
	        throw new TypeError("the promise constructor requires a resolver function");
	    }
	    if (this.constructor !== Promise) {
	        throw new TypeError("the promise constructor cannot be invoked directly");
	    }
	    this._bitField = 0;
	    this._fulfillmentHandler0 = void 0;
	    this._rejectionHandler0 = void 0;
	    this._promise0 = void 0;
	    this._receiver0 = void 0;
	    this._settledValue = void 0;
	    this._boundTo = void 0;
	    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
	}

	Promise.prototype.bind = function Promise$bind(thisArg) {
	    var ret = new Promise(INTERNAL);
	    ret._setTrace(this);
	    ret._follow(this);
	    ret._setBoundTo(thisArg);
	    if (this._cancellable()) {
	        ret._setCancellable();
	        ret._cancellationParent = this;
	    }
	    return ret;
	};

	Promise.prototype.toString = function Promise$toString() {
	    return "[object Promise]";
	};

	Promise.prototype.caught = Promise.prototype["catch"] =
	function Promise$catch(fn) {
	    var len = arguments.length;
	    if (len > 1) {
	        var catchInstances = new Array(len - 1),
	            j = 0, i;
	        for (i = 0; i < len - 1; ++i) {
	            var item = arguments[i];
	            if (typeof item === "function") {
	                catchInstances[j++] = item;
	            }
	            else {
	                var catchFilterTypeError =
	                    new TypeError(
	                        "A catch filter must be an error constructor "
	                        + "or a filter function");

	                this._attachExtraTrace(catchFilterTypeError);
	                async.invoke(this._reject, this, catchFilterTypeError);
	                return;
	            }
	        }
	        catchInstances.length = j;
	        fn = arguments[i];

	        this._resetTrace();
	        var catchFilter = new CatchFilter(catchInstances, fn, this);
	        return this._then(void 0, catchFilter.doFilter, void 0,
	            catchFilter, void 0);
	    }
	    return this._then(void 0, fn, void 0, void 0, void 0);
	};

	Promise.prototype.then =
	function Promise$then(didFulfill, didReject, didProgress) {
	    return this._then(didFulfill, didReject, didProgress,
	        void 0, void 0);
	};


	Promise.prototype.done =
	function Promise$done(didFulfill, didReject, didProgress) {
	    var promise = this._then(didFulfill, didReject, didProgress,
	        void 0, void 0);
	    promise._setIsFinal();
	};

	Promise.prototype.spread = function Promise$spread(didFulfill, didReject) {
	    return this._then(didFulfill, didReject, void 0,
	        APPLY, void 0);
	};

	Promise.prototype.isCancellable = function Promise$isCancellable() {
	    return !this.isResolved() &&
	        this._cancellable();
	};

	Promise.prototype.toJSON = function Promise$toJSON() {
	    var ret = {
	        isFulfilled: false,
	        isRejected: false,
	        fulfillmentValue: void 0,
	        rejectionReason: void 0
	    };
	    if (this.isFulfilled()) {
	        ret.fulfillmentValue = this._settledValue;
	        ret.isFulfilled = true;
	    }
	    else if (this.isRejected()) {
	        ret.rejectionReason = this._settledValue;
	        ret.isRejected = true;
	    }
	    return ret;
	};

	Promise.prototype.all = function Promise$all() {
	    return Promise$_all(this, true);
	};


	Promise.is = isPromise;

	function Promise$_all(promises, useBound) {
	    return Promise$_CreatePromiseArray(
	        promises,
	        PromiseArray,
	        useBound === true && promises._isBound()
	            ? promises._boundTo
	            : void 0
	   ).promise();
	}
	Promise.all = function Promise$All(promises) {
	    return Promise$_all(promises, false);
	};

	Promise.join = function Promise$Join() {
	    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
	    return Promise$_CreatePromiseArray(args, PromiseArray, void 0).promise();
	};

	Promise.resolve = Promise.fulfilled =
	function Promise$Resolve(value) {
	    var ret = new Promise(INTERNAL);
	    ret._setTrace(void 0);
	    if (ret._tryFollow(value)) {
	        return ret;
	    }
	    ret._cleanValues();
	    ret._setFulfilled();
	    ret._settledValue = value;
	    return ret;
	};

	Promise.reject = Promise.rejected = function Promise$Reject(reason) {
	    var ret = new Promise(INTERNAL);
	    ret._setTrace(void 0);
	    markAsOriginatingFromRejection(reason);
	    ret._cleanValues();
	    ret._setRejected();
	    ret._settledValue = reason;
	    if (!canAttach(reason)) {
	        var trace = new Error(reason + "");
	        ret._setCarriedStackTrace(trace);
	    }
	    ret._ensurePossibleRejectionHandled();
	    return ret;
	};

	Promise.prototype.error = function Promise$_error(fn) {
	    return this.caught(originatesFromRejection, fn);
	};

	Promise.prototype._resolveFromSyncValue =
	function Promise$_resolveFromSyncValue(value) {
	    if (value === errorObj) {
	        this._cleanValues();
	        this._setRejected();
	        this._settledValue = value.e;
	        this._ensurePossibleRejectionHandled();
	    }
	    else {
	        var maybePromise = Promise._cast(value, void 0);
	        if (maybePromise instanceof Promise) {
	            this._follow(maybePromise);
	        }
	        else {
	            this._cleanValues();
	            this._setFulfilled();
	            this._settledValue = value;
	        }
	    }
	};

	Promise.method = function Promise$_Method(fn) {
	    if (typeof fn !== "function") {
	        throw new TypeError("fn must be a function");
	    }
	    return function Promise$_method() {
	        var value;
	        switch(arguments.length) {
	        case 0: value = tryCatch1(fn, this, void 0); break;
	        case 1: value = tryCatch1(fn, this, arguments[0]); break;
	        case 2: value = tryCatch2(fn, this, arguments[0], arguments[1]); break;
	        default:
	            var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
	            value = tryCatchApply(fn, args, this); break;
	        }
	        var ret = new Promise(INTERNAL);
	        ret._setTrace(void 0);
	        ret._resolveFromSyncValue(value);
	        return ret;
	    };
	};

	Promise.attempt = Promise["try"] = function Promise$_Try(fn, args, ctx) {
	    if (typeof fn !== "function") {
	        return apiRejection("fn must be a function");
	    }
	    var value = isArray(args)
	        ? tryCatchApply(fn, args, ctx)
	        : tryCatch1(fn, ctx, args);

	    var ret = new Promise(INTERNAL);
	    ret._setTrace(void 0);
	    ret._resolveFromSyncValue(value);
	    return ret;
	};

	Promise.defer = Promise.pending = function Promise$Defer() {
	    var promise = new Promise(INTERNAL);
	    promise._setTrace(void 0);
	    return new PromiseResolver(promise);
	};

	Promise.bind = function Promise$Bind(thisArg) {
	    var ret = new Promise(INTERNAL);
	    ret._setTrace(void 0);
	    ret._setFulfilled();
	    ret._setBoundTo(thisArg);
	    return ret;
	};

	Promise.cast = function Promise$_Cast(obj) {
	    var ret = Promise._cast(obj, void 0);
	    if (!(ret instanceof Promise)) {
	        return Promise.resolve(ret);
	    }
	    return ret;
	};

	Promise.onPossiblyUnhandledRejection =
	function Promise$OnPossiblyUnhandledRejection(fn) {
	        CapturedTrace.possiblyUnhandledRejection = typeof fn === "function"
	                                                    ? fn : void 0;
	};

	var unhandledRejectionHandled;
	Promise.onUnhandledRejectionHandled =
	function Promise$onUnhandledRejectionHandled(fn) {
	    unhandledRejectionHandled = typeof fn === "function" ? fn : void 0;
	};

	var debugging = false || !!(
	    typeof process !== "undefined" &&
	    typeof process.execPath === "string" &&
	    typeof process.env === "object" &&
	    (process.env["BLUEBIRD_DEBUG"] ||
	        process.env["NODE_ENV"] === "development")
	);


	Promise.longStackTraces = function Promise$LongStackTraces() {
	    if (async.haveItemsQueued() &&
	        debugging === false
	   ) {
	        throw new Error("cannot enable long stack traces after promises have been created");
	    }
	    debugging = CapturedTrace.isSupported();
	};

	Promise.hasLongStackTraces = function Promise$HasLongStackTraces() {
	    return debugging && CapturedTrace.isSupported();
	};

	Promise.prototype._setProxyHandlers =
	function Promise$_setProxyHandlers(receiver, promiseSlotValue) {
	    var index = this._length();

	    if (index >= 524287 - 5) {
	        index = 0;
	        this._setLength(0);
	    }
	    if (index === 0) {
	        this._promise0 = promiseSlotValue;
	        this._receiver0 = receiver;
	    }
	    else {
	        var i = index - 5;
	        this[i + 3] = promiseSlotValue;
	        this[i + 4] = receiver;
	        this[i + 0] =
	        this[i + 1] =
	        this[i + 2] = void 0;
	    }
	    this._setLength(index + 5);
	};

	Promise.prototype._proxyPromiseArray =
	function Promise$_proxyPromiseArray(promiseArray, index) {
	    this._setProxyHandlers(promiseArray, index);
	};

	Promise.prototype._proxyPromise = function Promise$_proxyPromise(promise) {
	    promise._setProxied();
	    this._setProxyHandlers(promise, -1);
	};

	Promise.prototype._then =
	function Promise$_then(
	    didFulfill,
	    didReject,
	    didProgress,
	    receiver,
	    internalData
	) {
	    var haveInternalData = internalData !== void 0;
	    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

	    if (debugging && !haveInternalData) {
	        var haveSameContext = this._peekContext() === this._traceParent;
	        ret._traceParent = haveSameContext ? this._traceParent : this;
	        ret._setTrace(this);
	    }

	    if (!haveInternalData && this._isBound()) {
	        ret._setBoundTo(this._boundTo);
	    }

	    var callbackIndex =
	        this._addCallbacks(didFulfill, didReject, didProgress, ret, receiver);

	    if (!haveInternalData && this._cancellable()) {
	        ret._setCancellable();
	        ret._cancellationParent = this;
	    }

	    if (this.isResolved()) {
	        async.invoke(this._queueSettleAt, this, callbackIndex);
	    }

	    return ret;
	};

	Promise.prototype._length = function Promise$_length() {
	    return this._bitField & 524287;
	};

	Promise.prototype._isFollowingOrFulfilledOrRejected =
	function Promise$_isFollowingOrFulfilledOrRejected() {
	    return (this._bitField & 939524096) > 0;
	};

	Promise.prototype._isFollowing = function Promise$_isFollowing() {
	    return (this._bitField & 536870912) === 536870912;
	};

	Promise.prototype._setLength = function Promise$_setLength(len) {
	    this._bitField = (this._bitField & -524288) |
	        (len & 524287);
	};

	Promise.prototype._setFulfilled = function Promise$_setFulfilled() {
	    this._bitField = this._bitField | 268435456;
	};

	Promise.prototype._setRejected = function Promise$_setRejected() {
	    this._bitField = this._bitField | 134217728;
	};

	Promise.prototype._setFollowing = function Promise$_setFollowing() {
	    this._bitField = this._bitField | 536870912;
	};

	Promise.prototype._setIsFinal = function Promise$_setIsFinal() {
	    this._bitField = this._bitField | 33554432;
	};

	Promise.prototype._isFinal = function Promise$_isFinal() {
	    return (this._bitField & 33554432) > 0;
	};

	Promise.prototype._cancellable = function Promise$_cancellable() {
	    return (this._bitField & 67108864) > 0;
	};

	Promise.prototype._setCancellable = function Promise$_setCancellable() {
	    this._bitField = this._bitField | 67108864;
	};

	Promise.prototype._unsetCancellable = function Promise$_unsetCancellable() {
	    this._bitField = this._bitField & (~67108864);
	};

	Promise.prototype._setRejectionIsUnhandled =
	function Promise$_setRejectionIsUnhandled() {
	    this._bitField = this._bitField | 2097152;
	};

	Promise.prototype._unsetRejectionIsUnhandled =
	function Promise$_unsetRejectionIsUnhandled() {
	    this._bitField = this._bitField & (~2097152);
	    if (this._isUnhandledRejectionNotified()) {
	        this._unsetUnhandledRejectionIsNotified();
	        this._notifyUnhandledRejectionIsHandled();
	    }
	};

	Promise.prototype._isRejectionUnhandled =
	function Promise$_isRejectionUnhandled() {
	    return (this._bitField & 2097152) > 0;
	};

	Promise.prototype._setUnhandledRejectionIsNotified =
	function Promise$_setUnhandledRejectionIsNotified() {
	    this._bitField = this._bitField | 524288;
	};

	Promise.prototype._unsetUnhandledRejectionIsNotified =
	function Promise$_unsetUnhandledRejectionIsNotified() {
	    this._bitField = this._bitField & (~524288);
	};

	Promise.prototype._isUnhandledRejectionNotified =
	function Promise$_isUnhandledRejectionNotified() {
	    return (this._bitField & 524288) > 0;
	};

	Promise.prototype._setCarriedStackTrace =
	function Promise$_setCarriedStackTrace(capturedTrace) {
	    this._bitField = this._bitField | 1048576;
	    this._fulfillmentHandler0 = capturedTrace;
	};

	Promise.prototype._unsetCarriedStackTrace =
	function Promise$_unsetCarriedStackTrace() {
	    this._bitField = this._bitField & (~1048576);
	    this._fulfillmentHandler0 = void 0;
	};

	Promise.prototype._isCarryingStackTrace =
	function Promise$_isCarryingStackTrace() {
	    return (this._bitField & 1048576) > 0;
	};

	Promise.prototype._getCarriedStackTrace =
	function Promise$_getCarriedStackTrace() {
	    return this._isCarryingStackTrace()
	        ? this._fulfillmentHandler0
	        : void 0;
	};

	Promise.prototype._receiverAt = function Promise$_receiverAt(index) {
	    var ret;
	    if (index === 0) {
	        ret = this._receiver0;
	    }
	    else {
	        ret = this[index + 4 - 5];
	    }
	    if (this._isBound() && ret === void 0) {
	        return this._boundTo;
	    }
	    return ret;
	};

	Promise.prototype._promiseAt = function Promise$_promiseAt(index) {
	    if (index === 0) return this._promise0;
	    return this[index + 3 - 5];
	};

	Promise.prototype._fulfillmentHandlerAt =
	function Promise$_fulfillmentHandlerAt(index) {
	    if (index === 0) return this._fulfillmentHandler0;
	    return this[index + 0 - 5];
	};

	Promise.prototype._rejectionHandlerAt =
	function Promise$_rejectionHandlerAt(index) {
	    if (index === 0) return this._rejectionHandler0;
	    return this[index + 1 - 5];
	};

	Promise.prototype._unsetAt = function Promise$_unsetAt(index) {
	     if (index === 0) {
	        this._rejectionHandler0 =
	        this._progressHandler0 =
	        this._promise0 =
	        this._receiver0 = void 0;
	        if (!this._isCarryingStackTrace()) {
	            this._fulfillmentHandler0 = void 0;
	        }
	    }
	    else {
	        this[index - 5 + 0] =
	        this[index - 5 + 1] =
	        this[index - 5 + 2] =
	        this[index - 5 + 3] =
	        this[index - 5 + 4] = void 0;
	    }
	};

	Promise.prototype._resolveFromResolver =
	function Promise$_resolveFromResolver(resolver) {
	    var promise = this;
	    this._setTrace(void 0);
	    this._pushContext();

	    function Promise$_resolver(val) {
	        if (promise._tryFollow(val)) {
	            return;
	        }
	        promise._fulfill(val);
	    }
	    function Promise$_rejecter(val) {
	        var trace = canAttach(val) ? val : new Error(val + "");
	        promise._attachExtraTrace(trace);
	        markAsOriginatingFromRejection(val);
	        promise._reject(val, trace === val ? void 0 : trace);
	    }
	    var r = tryCatch2(resolver, void 0, Promise$_resolver, Promise$_rejecter);
	    this._popContext();

	    if (r !== void 0 && r === errorObj) {
	        var e = r.e;
	        var trace = canAttach(e) ? e : new Error(e + "");
	        promise._reject(e, trace);
	    }
	};

	Promise.prototype._addCallbacks = function Promise$_addCallbacks(
	    fulfill,
	    reject,
	    progress,
	    promise,
	    receiver
	) {
	    var index = this._length();

	    if (index >= 524287 - 5) {
	        index = 0;
	        this._setLength(0);
	    }

	    if (index === 0) {
	        this._promise0 = promise;
	        if (receiver !== void 0) this._receiver0 = receiver;
	        if (typeof fulfill === "function" && !this._isCarryingStackTrace())
	            this._fulfillmentHandler0 = fulfill;
	        if (typeof reject === "function") this._rejectionHandler0 = reject;
	        if (typeof progress === "function") this._progressHandler0 = progress;
	    }
	    else {
	        var i = index - 5;
	        this[i + 3] = promise;
	        this[i + 4] = receiver;
	        this[i + 0] = typeof fulfill === "function"
	                                            ? fulfill : void 0;
	        this[i + 1] = typeof reject === "function"
	                                            ? reject : void 0;
	        this[i + 2] = typeof progress === "function"
	                                            ? progress : void 0;
	    }
	    this._setLength(index + 5);
	    return index;
	};



	Promise.prototype._setBoundTo = function Promise$_setBoundTo(obj) {
	    if (obj !== void 0) {
	        this._bitField = this._bitField | 8388608;
	        this._boundTo = obj;
	    }
	    else {
	        this._bitField = this._bitField & (~8388608);
	    }
	};

	Promise.prototype._isBound = function Promise$_isBound() {
	    return (this._bitField & 8388608) === 8388608;
	};

	Promise.prototype._spreadSlowCase =
	function Promise$_spreadSlowCase(targetFn, promise, values, boundTo) {
	    var promiseForAll =
	            Promise$_CreatePromiseArray
	                (values, PromiseArray, boundTo)
	            .promise()
	            ._then(function() {
	                return targetFn.apply(boundTo, arguments);
	            }, void 0, void 0, APPLY, void 0);

	    promise._follow(promiseForAll);
	};

	Promise.prototype._callSpread =
	function Promise$_callSpread(handler, promise, value, localDebugging) {
	    var boundTo = this._isBound() ? this._boundTo : void 0;
	    if (isArray(value)) {
	        for (var i = 0, len = value.length; i < len; ++i) {
	            if (isPromise(Promise._cast(value[i], void 0))) {
	                this._spreadSlowCase(handler, promise, value, boundTo);
	                return;
	            }
	        }
	    }
	    if (localDebugging) promise._pushContext();
	    return tryCatchApply(handler, value, boundTo);
	};

	Promise.prototype._callHandler =
	function Promise$_callHandler(
	    handler, receiver, promise, value, localDebugging) {
	    var x;
	    if (receiver === APPLY && !this.isRejected()) {
	        x = this._callSpread(handler, promise, value, localDebugging);
	    }
	    else {
	        if (localDebugging) promise._pushContext();
	        x = tryCatch1(handler, receiver, value);
	    }
	    if (localDebugging) promise._popContext();
	    return x;
	};

	Promise.prototype._settlePromiseFromHandler =
	function Promise$_settlePromiseFromHandler(
	    handler, receiver, value, promise
	) {
	    if (!isPromise(promise)) {
	        handler.call(receiver, value, promise);
	        return;
	    }

	    var localDebugging = debugging;
	    var x = this._callHandler(handler, receiver,
	                                promise, value, localDebugging);

	    if (promise._isFollowing()) return;

	    if (x === errorObj || x === promise || x === NEXT_FILTER) {
	        var err = x === promise
	                    ? makeSelfResolutionError()
	                    : x.e;
	        var trace = canAttach(err) ? err : new Error(err + "");
	        if (x !== NEXT_FILTER) promise._attachExtraTrace(trace);
	        promise._rejectUnchecked(err, trace);
	    }
	    else {
	        var castValue = Promise._cast(x, promise);
	        if (isPromise(castValue)) {
	            if (castValue.isRejected() &&
	                !castValue._isCarryingStackTrace() &&
	                !canAttach(castValue._settledValue)) {
	                var trace = new Error(castValue._settledValue + "");
	                promise._attachExtraTrace(trace);
	                castValue._setCarriedStackTrace(trace);
	            }
	            promise._follow(castValue);
	            if (castValue._cancellable()) {
	                promise._cancellationParent = castValue;
	                promise._setCancellable();
	            }
	        }
	        else {
	            promise._fulfillUnchecked(x);
	        }
	    }
	};

	Promise.prototype._follow =
	function Promise$_follow(promise) {
	    this._setFollowing();

	    if (promise.isPending()) {
	        if (promise._cancellable() ) {
	            this._cancellationParent = promise;
	            this._setCancellable();
	        }
	        promise._proxyPromise(this);
	    }
	    else if (promise.isFulfilled()) {
	        this._fulfillUnchecked(promise._settledValue);
	    }
	    else {
	        this._rejectUnchecked(promise._settledValue,
	            promise._getCarriedStackTrace());
	    }

	    if (promise._isRejectionUnhandled()) promise._unsetRejectionIsUnhandled();

	    if (debugging &&
	        promise._traceParent == null) {
	        promise._traceParent = this;
	    }
	};

	Promise.prototype._tryFollow =
	function Promise$_tryFollow(value) {
	    if (this._isFollowingOrFulfilledOrRejected() ||
	        value === this) {
	        return false;
	    }
	    var maybePromise = Promise._cast(value, void 0);
	    if (!isPromise(maybePromise)) {
	        return false;
	    }
	    this._follow(maybePromise);
	    return true;
	};

	Promise.prototype._resetTrace = function Promise$_resetTrace() {
	    if (debugging) {
	        this._trace = new CapturedTrace(this._peekContext() === void 0);
	    }
	};

	Promise.prototype._setTrace = function Promise$_setTrace(parent) {
	    if (debugging) {
	        var context = this._peekContext();
	        this._traceParent = context;
	        var isTopLevel = context === void 0;
	        if (parent !== void 0 &&
	            parent._traceParent === context) {
	            this._trace = parent._trace;
	        }
	        else {
	            this._trace = new CapturedTrace(isTopLevel);
	        }
	    }
	    return this;
	};

	Promise.prototype._attachExtraTrace =
	function Promise$_attachExtraTrace(error) {
	    if (debugging) {
	        var promise = this;
	        var stack = error.stack;
	        stack = typeof stack === "string"
	            ? stack.split("\n") : [];
	        var headerLineCount = 1;

	        while(promise != null &&
	            promise._trace != null) {
	            stack = CapturedTrace.combine(
	                stack,
	                promise._trace.stack.split("\n")
	           );
	            promise = promise._traceParent;
	        }

	        var max = Error.stackTraceLimit + headerLineCount;
	        var len = stack.length;
	        if (len  > max) {
	            stack.length = max;
	        }
	        if (stack.length <= headerLineCount) {
	            error.stack = "(No stack trace)";
	        }
	        else {
	            error.stack = stack.join("\n");
	        }
	    }
	};

	Promise.prototype._cleanValues = function Promise$_cleanValues() {
	    if (this._cancellable()) {
	        this._cancellationParent = void 0;
	    }
	};

	Promise.prototype._fulfill = function Promise$_fulfill(value) {
	    if (this._isFollowingOrFulfilledOrRejected()) return;
	    this._fulfillUnchecked(value);
	};

	Promise.prototype._reject =
	function Promise$_reject(reason, carriedStackTrace) {
	    if (this._isFollowingOrFulfilledOrRejected()) return;
	    this._rejectUnchecked(reason, carriedStackTrace);
	};

	Promise.prototype._settlePromiseAt = function Promise$_settlePromiseAt(index) {
	    var handler = this.isFulfilled()
	        ? this._fulfillmentHandlerAt(index)
	        : this._rejectionHandlerAt(index);

	    var value = this._settledValue;
	    var receiver = this._receiverAt(index);
	    var promise = this._promiseAt(index);

	    if (typeof handler === "function") {
	        this._settlePromiseFromHandler(handler, receiver, value, promise);
	    }
	    else {
	        var done = false;
	        var isFulfilled = this.isFulfilled();
	        if (receiver !== void 0) {
	            if (receiver instanceof Promise &&
	                receiver._isProxied()) {
	                receiver._unsetProxied();

	                if (isFulfilled) receiver._fulfillUnchecked(value);
	                else receiver._rejectUnchecked(value,
	                    this._getCarriedStackTrace());
	                done = true;
	            }
	            else if (isPromiseArrayProxy(receiver, promise)) {
	                if (isFulfilled) receiver._promiseFulfilled(value, promise);
	                else receiver._promiseRejected(value, promise);
	                done = true;
	            }
	        }

	        if (!done) {
	            if (isFulfilled) promise._fulfill(value);
	            else promise._reject(value, this._getCarriedStackTrace());
	        }
	    }

	    if (index >= 256) {
	        this._queueGC();
	    }
	};

	Promise.prototype._isProxied = function Promise$_isProxied() {
	    return (this._bitField & 4194304) === 4194304;
	};

	Promise.prototype._setProxied = function Promise$_setProxied() {
	    this._bitField = this._bitField | 4194304;
	};

	Promise.prototype._unsetProxied = function Promise$_unsetProxied() {
	    this._bitField = this._bitField & (~4194304);
	};

	Promise.prototype._isGcQueued = function Promise$_isGcQueued() {
	    return (this._bitField & -1073741824) === -1073741824;
	};

	Promise.prototype._setGcQueued = function Promise$_setGcQueued() {
	    this._bitField = this._bitField | -1073741824;
	};

	Promise.prototype._unsetGcQueued = function Promise$_unsetGcQueued() {
	    this._bitField = this._bitField & (~-1073741824);
	};

	Promise.prototype._queueGC = function Promise$_queueGC() {
	    if (this._isGcQueued()) return;
	    this._setGcQueued();
	    async.invokeLater(this._gc, this, void 0);
	};

	Promise.prototype._gc = function Promise$gc() {
	    var len = this._length();
	    this._unsetAt(0);
	    for (var i = 0; i < len; i++) {
	        delete this[i];
	    }
	    this._setLength(0);
	    this._unsetGcQueued();
	};

	Promise.prototype._queueSettleAt = function Promise$_queueSettleAt(index) {
	    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
	    async.invoke(this._settlePromiseAt, this, index);
	};

	Promise.prototype._fulfillUnchecked =
	function Promise$_fulfillUnchecked(value) {
	    if (!this.isPending()) return;
	    if (value === this) {
	        var err = makeSelfResolutionError();
	        this._attachExtraTrace(err);
	        return this._rejectUnchecked(err, void 0);
	    }
	    this._cleanValues();
	    this._setFulfilled();
	    this._settledValue = value;
	    var len = this._length();

	    if (len > 0) {
	        async.invoke(this._settlePromises, this, len);
	    }
	};

	Promise.prototype._rejectUncheckedCheckError =
	function Promise$_rejectUncheckedCheckError(reason) {
	    var trace = canAttach(reason) ? reason : new Error(reason + "");
	    this._rejectUnchecked(reason, trace === reason ? void 0 : trace);
	};

	Promise.prototype._rejectUnchecked =
	function Promise$_rejectUnchecked(reason, trace) {
	    if (!this.isPending()) return;
	    if (reason === this) {
	        var err = makeSelfResolutionError();
	        this._attachExtraTrace(err);
	        return this._rejectUnchecked(err);
	    }
	    this._cleanValues();
	    this._setRejected();
	    this._settledValue = reason;

	    if (this._isFinal()) {
	        async.invokeLater(thrower, void 0, trace === void 0 ? reason : trace);
	        return;
	    }
	    var len = this._length();

	    if (trace !== void 0) this._setCarriedStackTrace(trace);

	    if (len > 0) {
	        async.invoke(this._rejectPromises, this, null);
	    }
	    else {
	        this._ensurePossibleRejectionHandled();
	    }
	};

	Promise.prototype._rejectPromises = function Promise$_rejectPromises() {
	    this._settlePromises();
	    this._unsetCarriedStackTrace();
	};

	Promise.prototype._settlePromises = function Promise$_settlePromises() {
	    var len = this._length();
	    for (var i = 0; i < len; i+= 5) {
	        this._settlePromiseAt(i);
	    }
	};

	Promise.prototype._ensurePossibleRejectionHandled =
	function Promise$_ensurePossibleRejectionHandled() {
	    this._setRejectionIsUnhandled();
	    if (CapturedTrace.possiblyUnhandledRejection !== void 0) {
	        async.invokeLater(this._notifyUnhandledRejection, this, void 0);
	    }
	};

	Promise.prototype._notifyUnhandledRejectionIsHandled =
	function Promise$_notifyUnhandledRejectionIsHandled() {
	    if (typeof unhandledRejectionHandled === "function") {
	        async.invokeLater(unhandledRejectionHandled, void 0, this);
	    }
	};

	Promise.prototype._notifyUnhandledRejection =
	function Promise$_notifyUnhandledRejection() {
	    if (this._isRejectionUnhandled()) {
	        var reason = this._settledValue;
	        var trace = this._getCarriedStackTrace();

	        this._setUnhandledRejectionIsNotified();

	        if (trace !== void 0) {
	            this._unsetCarriedStackTrace();
	            reason = trace;
	        }
	        if (typeof CapturedTrace.possiblyUnhandledRejection === "function") {
	            CapturedTrace.possiblyUnhandledRejection(reason, this);
	        }
	    }
	};

	var contextStack = [];
	Promise.prototype._peekContext = function Promise$_peekContext() {
	    var lastIndex = contextStack.length - 1;
	    if (lastIndex >= 0) {
	        return contextStack[lastIndex];
	    }
	    return void 0;

	};

	Promise.prototype._pushContext = function Promise$_pushContext() {
	    if (!debugging) return;
	    contextStack.push(this);
	};

	Promise.prototype._popContext = function Promise$_popContext() {
	    if (!debugging) return;
	    contextStack.pop();
	};

	function Promise$_CreatePromiseArray(
	    promises, PromiseArrayConstructor, boundTo) {

	    var list = null;
	    if (isArray(promises)) {
	        list = promises;
	    }
	    else {
	        list = Promise._cast(promises, void 0);
	        if (list !== promises) {
	            list._setBoundTo(boundTo);
	        }
	        else if (!isPromise(list)) {
	            list = null;
	        }
	    }
	    if (list !== null) {
	        return new PromiseArrayConstructor(list, boundTo);
	    }
	    return {
	        promise: function() {return apiRejection("expecting an array, a promise or a thenable");}
	    };
	}

	var old = global.Promise;
	Promise.noConflict = function() {
	    if (global.Promise === Promise) {
	        global.Promise = old;
	    }
	    return Promise;
	};

	if (!CapturedTrace.isSupported()) {
	    Promise.longStackTraces = function(){};
	    debugging = false;
	}

	Promise._makeSelfResolutionError = makeSelfResolutionError;
	__webpack_require__(116)(Promise, NEXT_FILTER);
	__webpack_require__(117)(Promise);
	__webpack_require__(118)(Promise, INTERNAL);
	__webpack_require__(119)(Promise);
	Promise.RangeError = RangeError;
	Promise.CancellationError = CancellationError;
	Promise.TimeoutError = TimeoutError;
	Promise.TypeError = TypeError;
	Promise.RejectionError = RejectionError;

	util.toFastProperties(Promise);
	util.toFastProperties(Promise.prototype);
	__webpack_require__(120)(Promise,INTERNAL);
	__webpack_require__(121)(Promise,Promise$_CreatePromiseArray,PromiseArray);
	__webpack_require__(122)(Promise,INTERNAL);
	__webpack_require__(123)(Promise);
	__webpack_require__(124)(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection);
	__webpack_require__(125)(Promise,apiRejection,INTERNAL);
	__webpack_require__(126)(Promise,PromiseArray,INTERNAL,apiRejection);
	__webpack_require__(127)(Promise);
	__webpack_require__(128)(Promise,INTERNAL);
	__webpack_require__(129)(Promise,PromiseArray);
	__webpack_require__(130)(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection,INTERNAL);
	__webpack_require__(131)(Promise,Promise$_CreatePromiseArray,PromiseArray);
	__webpack_require__(132)(Promise,Promise$_CreatePromiseArray,PromiseArray,apiRejection);
	__webpack_require__(133)(Promise,isPromiseArrayProxy);
	__webpack_require__(134)(Promise,INTERNAL);

	Promise.prototype = Promise.prototype;
	return Promise;

	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 92 */
/***/ function(module, exports, __webpack_require__) {

	var exports = module.exports = function (alg) {
	  var Alg = exports[alg]
	  if(!Alg) throw new Error(alg + ' is not supported (we accept pull requests)')
	  return new Alg()
	}

	var Buffer = __webpack_require__(47).Buffer
	var Hash   = __webpack_require__(135)(Buffer)

	exports.sha1 = __webpack_require__(136)(Buffer, Hash)
	exports.sha256 = __webpack_require__(137)(Buffer, Hash)
	exports.sha512 = __webpack_require__(138)(Buffer, Hash)


/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(143);
	exports.Stream = __webpack_require__(64);
	exports.Readable = exports;
	exports.Writable = __webpack_require__(141);
	exports.Duplex = __webpack_require__(142);
	exports.Transform = __webpack_require__(144);
	exports.PassThrough = __webpack_require__(145);


/***/ },
/* 94 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(141)


/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(142)


/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(144)


/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(145)


/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var intSize = 4;
	var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
	var chrsz = 8;

	function toArray(buf, bigEndian) {
	  if ((buf.length % intSize) !== 0) {
	    var len = buf.length + (intSize - (buf.length % intSize));
	    buf = Buffer.concat([buf, zeroBuffer], len);
	  }

	  var arr = [];
	  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
	  for (var i = 0; i < buf.length; i += intSize) {
	    arr.push(fn.call(buf, i));
	  }
	  return arr;
	}

	function toBuffer(arr, size, bigEndian) {
	  var buf = new Buffer(size);
	  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
	  for (var i = 0; i < arr.length; i++) {
	    fn.call(buf, arr[i], i * 4, true);
	  }
	  return buf;
	}

	function hash(buf, fn, hashSize, bigEndian) {
	  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
	  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
	  return toBuffer(arr, hashSize, bigEndian);
	}

	module.exports = { hash: hash };
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 99 */
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canMutationObserver = typeof window !== 'undefined'
	    && window.MutationObserver;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    var queue = [];

	    if (canMutationObserver) {
	        var hiddenDiv = document.createElement("div");
	        var observer = new MutationObserver(function () {
	            var queueList = queue.slice();
	            queue.length = 0;
	            queueList.forEach(function (fn) {
	                fn();
	            });
	        });

	        observer.observe(hiddenDiv, { attributes: true });

	        return function nextTick(fn) {
	            if (!queue.length) {
	                hiddenDiv.setAttribute('yes', 'no');
	            }
	            queue.push(fn);
	        };
	    }

	    if (canPost) {
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};


/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = function(crypto) {
	  function pbkdf2(password, salt, iterations, keylen, digest, callback) {
	    if ('function' === typeof digest) {
	      callback = digest
	      digest = undefined
	    }

	    if ('function' !== typeof callback)
	      throw new Error('No callback provided to pbkdf2')

	    setTimeout(function() {
	      var result

	      try {
	        result = pbkdf2Sync(password, salt, iterations, keylen, digest)
	      } catch (e) {
	        return callback(e)
	      }

	      callback(undefined, result)
	    })
	  }

	  function pbkdf2Sync(password, salt, iterations, keylen, digest) {
	    if ('number' !== typeof iterations)
	      throw new TypeError('Iterations not a number')

	    if (iterations < 0)
	      throw new TypeError('Bad iterations')

	    if ('number' !== typeof keylen)
	      throw new TypeError('Key length not a number')

	    if (keylen < 0)
	      throw new TypeError('Bad key length')

	    digest = digest || 'sha1'

	    if (!Buffer.isBuffer(password)) password = new Buffer(password)
	    if (!Buffer.isBuffer(salt)) salt = new Buffer(salt)

	    var hLen, l = 1, r, T
	    var DK = new Buffer(keylen)
	    var block1 = new Buffer(salt.length + 4)
	    salt.copy(block1, 0, 0, salt.length)

	    for (var i = 1; i <= l; i++) {
	      block1.writeUInt32BE(i, salt.length)

	      var U = crypto.createHmac(digest, password).update(block1).digest()

	      if (!hLen) {
	        hLen = U.length
	        T = new Buffer(hLen)
	        l = Math.ceil(keylen / hLen)
	        r = keylen - (l - 1) * hLen

	        if (keylen > (Math.pow(2, 32) - 1) * hLen)
	          throw new TypeError('keylen exceeds maximum length')
	      }

	      U.copy(T, 0, 0, hLen)

	      for (var j = 1; j < iterations; j++) {
	        U = crypto.createHmac(digest, password).update(U).digest()

	        for (var k = 0; k < hLen; k++) {
	          T[k] ^= U[k]
	        }
	      }

	      var destPos = (i - 1) * hLen
	      var len = (i == l ? r : hLen)
	      T.copy(DK, destPos, 0, len)
	    }

	    return DK
	  }

	  return {
	    pbkdf2: pbkdf2,
	    pbkdf2Sync: pbkdf2Sync
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 102 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {
	module.exports = ripemd160



	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	// Constants table
	var zl = [
	    0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
	    7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
	    3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
	    1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
	    4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13];
	var zr = [
	    5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
	    6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
	    15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
	    8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
	    12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11];
	var sl = [
	     11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
	    7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
	    11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
	      11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
	    9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
	var sr = [
	    8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
	    9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
	    9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
	    15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
	    8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

	var hl =  [ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
	var hr =  [ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

	var bytesToWords = function (bytes) {
	  var words = [];
	  for (var i = 0, b = 0; i < bytes.length; i++, b += 8) {
	    words[b >>> 5] |= bytes[i] << (24 - b % 32);
	  }
	  return words;
	};

	var wordsToBytes = function (words) {
	  var bytes = [];
	  for (var b = 0; b < words.length * 32; b += 8) {
	    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
	  }
	  return bytes;
	};

	var processBlock = function (H, M, offset) {

	  // Swap endian
	  for (var i = 0; i < 16; i++) {
	    var offset_i = offset + i;
	    var M_offset_i = M[offset_i];

	    // Swap
	    M[offset_i] = (
	        (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	        (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	    );
	  }

	  // Working variables
	  var al, bl, cl, dl, el;
	  var ar, br, cr, dr, er;

	  ar = al = H[0];
	  br = bl = H[1];
	  cr = cl = H[2];
	  dr = dl = H[3];
	  er = el = H[4];
	  // Computation
	  var t;
	  for (var i = 0; i < 80; i += 1) {
	    t = (al +  M[offset+zl[i]])|0;
	    if (i<16){
	        t +=  f1(bl,cl,dl) + hl[0];
	    } else if (i<32) {
	        t +=  f2(bl,cl,dl) + hl[1];
	    } else if (i<48) {
	        t +=  f3(bl,cl,dl) + hl[2];
	    } else if (i<64) {
	        t +=  f4(bl,cl,dl) + hl[3];
	    } else {// if (i<80) {
	        t +=  f5(bl,cl,dl) + hl[4];
	    }
	    t = t|0;
	    t =  rotl(t,sl[i]);
	    t = (t+el)|0;
	    al = el;
	    el = dl;
	    dl = rotl(cl, 10);
	    cl = bl;
	    bl = t;

	    t = (ar + M[offset+zr[i]])|0;
	    if (i<16){
	        t +=  f5(br,cr,dr) + hr[0];
	    } else if (i<32) {
	        t +=  f4(br,cr,dr) + hr[1];
	    } else if (i<48) {
	        t +=  f3(br,cr,dr) + hr[2];
	    } else if (i<64) {
	        t +=  f2(br,cr,dr) + hr[3];
	    } else {// if (i<80) {
	        t +=  f1(br,cr,dr) + hr[4];
	    }
	    t = t|0;
	    t =  rotl(t,sr[i]) ;
	    t = (t+er)|0;
	    ar = er;
	    er = dr;
	    dr = rotl(cr, 10);
	    cr = br;
	    br = t;
	  }
	  // Intermediate hash value
	  t    = (H[1] + cl + dr)|0;
	  H[1] = (H[2] + dl + er)|0;
	  H[2] = (H[3] + el + ar)|0;
	  H[3] = (H[4] + al + br)|0;
	  H[4] = (H[0] + bl + cr)|0;
	  H[0] =  t;
	};

	function f1(x, y, z) {
	  return ((x) ^ (y) ^ (z));
	}

	function f2(x, y, z) {
	  return (((x)&(y)) | ((~x)&(z)));
	}

	function f3(x, y, z) {
	  return (((x) | (~(y))) ^ (z));
	}

	function f4(x, y, z) {
	  return (((x) & (z)) | ((y)&(~(z))));
	}

	function f5(x, y, z) {
	  return ((x) ^ ((y) |(~(z))));
	}

	function rotl(x,n) {
	  return (x<<n) | (x>>>(32-n));
	}

	function ripemd160(message) {
	  var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

	  if (typeof message == 'string')
	    message = new Buffer(message, 'utf8');

	  var m = bytesToWords(message);

	  var nBitsLeft = message.length * 8;
	  var nBitsTotal = message.length * 8;

	  // Add padding
	  m[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	  m[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	      (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
	      (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
	  );

	  for (var i=0 ; i<m.length; i += 16) {
	    processBlock(H, m, i);
	  }

	  // Swap endian
	  for (var i = 0; i < 5; i++) {
	      // Shortcut
	    var H_i = H[i];

	    // Swap
	    H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	          (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	  }

	  var digestbytes = wordsToBytes(H);
	  return new Buffer(digestbytes);
	}


	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var aes = __webpack_require__(147);
	var Transform = __webpack_require__(148);
	var inherits = __webpack_require__(173);
	var modes = __webpack_require__(105);
	var ebtk = __webpack_require__(149);
	var StreamCipher = __webpack_require__(150);
	inherits(Cipher, Transform);
	function Cipher(mode, key, iv) {
	  if (!(this instanceof Cipher)) {
	    return new Cipher(mode, key, iv);
	  }
	  Transform.call(this);
	  this._cache = new Splitter();
	  this._cipher = new aes.AES(key);
	  this._prev = new Buffer(iv.length);
	  iv.copy(this._prev);
	  this._mode = mode;
	}
	Cipher.prototype._transform = function (data, _, next) {
	  this._cache.add(data);
	  var chunk;
	  var thing;
	  while ((chunk = this._cache.get())) {
	    thing = this._mode.encrypt(this, chunk);
	    this.push(thing);
	  }
	  next();
	};
	Cipher.prototype._flush = function (next) {
	  var chunk = this._cache.flush();
	  this.push(this._mode.encrypt(this, chunk));
	  this._cipher.scrub();
	  next();
	};


	function Splitter() {
	   if (!(this instanceof Splitter)) {
	    return new Splitter();
	  }
	  this.cache = new Buffer('');
	}
	Splitter.prototype.add = function (data) {
	  this.cache = Buffer.concat([this.cache, data]);
	};

	Splitter.prototype.get = function () {
	  if (this.cache.length > 15) {
	    var out = this.cache.slice(0, 16);
	    this.cache = this.cache.slice(16);
	    return out;
	  }
	  return null;
	};
	Splitter.prototype.flush = function () {
	  var len = 16 - this.cache.length;
	  var padBuff = new Buffer(len);

	  var i = -1;
	  while (++i < len) {
	    padBuff.writeUInt8(len, i);
	  }
	  var out = Buffer.concat([this.cache, padBuff]);
	  return out;
	};
	var modelist = {
	  ECB: __webpack_require__(151),
	  CBC: __webpack_require__(152),
	  CFB: __webpack_require__(153),
	  OFB: __webpack_require__(154),
	  CTR: __webpack_require__(155)
	};
	module.exports = function (crypto) {
	  function createCipheriv(suite, password, iv) {
	    var config = modes[suite];
	    if (!config) {
	      throw new TypeError('invalid suite type');
	    }
	    if (typeof iv === 'string') {
	      iv = new Buffer(iv);
	    }
	    if (typeof password === 'string') {
	      password = new Buffer(password);
	    }
	    if (password.length !== config.key/8) {
	      throw new TypeError('invalid key length ' + password.length);
	    }
	    if (iv.length !== config.iv) {
	      throw new TypeError('invalid iv length ' + iv.length);
	    }
	    if (config.type === 'stream') {
	      return new StreamCipher(modelist[config.mode], password, iv);
	    }
	    return new Cipher(modelist[config.mode], password, iv);
	  }
	  function createCipher (suite, password) {
	    var config = modes[suite];
	    if (!config) {
	      throw new TypeError('invalid suite type');
	    }
	    var keys = ebtk(crypto, password, config.key, config.iv);
	    return createCipheriv(suite, keys.key, keys.iv);
	  }
	  return {
	    createCipher: createCipher,
	    createCipheriv: createCipheriv
	  };
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 104 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var aes = __webpack_require__(147);
	var Transform = __webpack_require__(148);
	var inherits = __webpack_require__(173);
	var modes = __webpack_require__(105);
	var StreamCipher = __webpack_require__(150);
	var ebtk = __webpack_require__(149);

	inherits(Decipher, Transform);
	function Decipher(mode, key, iv) {
	  if (!(this instanceof Decipher)) {
	    return new Decipher(mode, key, iv);
	  }
	  Transform.call(this);
	  this._cache = new Splitter();
	  this._last = void 0;
	  this._cipher = new aes.AES(key);
	  this._prev = new Buffer(iv.length);
	  iv.copy(this._prev);
	  this._mode = mode;
	}
	Decipher.prototype._transform = function (data, _, next) {
	  this._cache.add(data);
	  var chunk;
	  var thing;
	  while ((chunk = this._cache.get())) {
	    thing = this._mode.decrypt(this, chunk);
	    this.push(thing);
	  }
	  next();
	};
	Decipher.prototype._flush = function (next) {
	  var chunk = this._cache.flush();
	  if (!chunk) {
	    return next;
	  }

	  this.push(unpad(this._mode.decrypt(this, chunk)));

	  next();
	};

	function Splitter() {
	   if (!(this instanceof Splitter)) {
	    return new Splitter();
	  }
	  this.cache = new Buffer('');
	}
	Splitter.prototype.add = function (data) {
	  this.cache = Buffer.concat([this.cache, data]);
	};

	Splitter.prototype.get = function () {
	  if (this.cache.length > 16) {
	    var out = this.cache.slice(0, 16);
	    this.cache = this.cache.slice(16);
	    return out;
	  }
	  return null;
	};
	Splitter.prototype.flush = function () {
	  if (this.cache.length) {
	    return this.cache;
	  }
	};
	function unpad(last) {
	  var padded = last[15];
	  if (padded === 16) {
	    return;
	  }
	  return last.slice(0, 16 - padded);
	}

	var modelist = {
	  ECB: __webpack_require__(151),
	  CBC: __webpack_require__(152),
	  CFB: __webpack_require__(153),
	  OFB: __webpack_require__(154),
	  CTR: __webpack_require__(155)
	};

	module.exports = function (crypto) {
	  function createDecipheriv(suite, password, iv) {
	    var config = modes[suite];
	    if (!config) {
	      throw new TypeError('invalid suite type');
	    }
	    if (typeof iv === 'string') {
	      iv = new Buffer(iv);
	    }
	    if (typeof password === 'string') {
	      password = new Buffer(password);
	    }
	    if (password.length !== config.key/8) {
	      throw new TypeError('invalid key length ' + password.length);
	    }
	    if (iv.length !== config.iv) {
	      throw new TypeError('invalid iv length ' + iv.length);
	    }
	    if (config.type === 'stream') {
	      return new StreamCipher(modelist[config.mode], password, iv, true);
	    }
	    return new Decipher(modelist[config.mode], password, iv);
	  }

	  function createDecipher (suite, password) {
	    var config = modes[suite];
	    if (!config) {
	      throw new TypeError('invalid suite type');
	    }
	    var keys = ebtk(crypto, password, config.key, config.iv);
	    return createDecipheriv(suite, keys.key, keys.iv);
	  }
	  return {
	    createDecipher: createDecipher,
	    createDecipheriv: createDecipheriv
	  };
	};
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {

	exports['aes-128-ecb'] = {
	  cipher: 'AES',
	  key: 128,
	  iv: 0,
	  mode: 'ECB',
	  type: 'block'
	};
	exports['aes-192-ecb'] = {
	  cipher: 'AES',
	  key: 192,
	  iv: 0,
	  mode: 'ECB',
	  type: 'block'
	};
	exports['aes-256-ecb'] = {
	  cipher: 'AES',
	  key: 256,
	  iv: 0,
	  mode: 'ECB',
	  type: 'block'
	};
	exports['aes-128-cbc'] = {
	  cipher: 'AES',
	  key: 128,
	  iv: 16,
	  mode: 'CBC',
	  type: 'block'
	};
	exports['aes-192-cbc'] = {
	  cipher: 'AES',
	  key: 192,
	  iv: 16,
	  mode: 'CBC',
	  type: 'block'
	};
	exports['aes-256-cbc'] = {
	  cipher: 'AES',
	  key: 256,
	  iv: 16,
	  mode: 'CBC',
	  type: 'block'
	};
	exports['aes128'] = exports['aes-128-cbc'];
	exports['aes192'] = exports['aes-192-cbc'];
	exports['aes256'] = exports['aes-256-cbc'];
	exports['aes-128-cfb'] = {
	  cipher: 'AES',
	  key: 128,
	  iv: 16,
	  mode: 'CFB',
	  type: 'stream'
	};
	exports['aes-192-cfb'] = {
	  cipher: 'AES',
	  key: 192,
	  iv: 16,
	  mode: 'CFB',
	  type: 'stream'
	};
	exports['aes-256-cfb'] = {
	  cipher: 'AES',
	  key: 256,
	  iv: 16,
	  mode: 'CFB',
	  type: 'stream'
	};
	exports['aes-128-ofb'] = {
	  cipher: 'AES',
	  key: 128,
	  iv: 16,
	  mode: 'OFB',
	  type: 'stream'
	};
	exports['aes-192-ofb'] = {
	  cipher: 'AES',
	  key: 192,
	  iv: 16,
	  mode: 'OFB',
	  type: 'stream'
	};
	exports['aes-256-ofb'] = {
	  cipher: 'AES',
	  key: 256,
	  iv: 16,
	  mode: 'OFB',
	  type: 'stream'
	};
	exports['aes-128-ctr'] = {
	  cipher: 'AES',
	  key: 128,
	  iv: 16,
	  mode: 'CTR',
	  type: 'stream'
	};
	exports['aes-192-ctr'] = {
	  cipher: 'AES',
	  key: 192,
	  iv: 16,
	  mode: 'CTR',
	  type: 'stream'
	};
	exports['aes-256-ctr'] = {
	  cipher: 'AES',
	  key: 256,
	  iv: 16,
	  mode: 'CTR',
	  type: 'stream'
	};

/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function isBuffer(arg) {
	  return arg && typeof arg === 'object'
	    && typeof arg.copy === 'function'
	    && typeof arg.fill === 'function'
	    && typeof arg.readUInt8 === 'function';
	}

/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	module.exports = (function() {
	    if (this !== void 0) return this;
	    try {return global;}
	    catch(e) {}
	    try {return window;}
	    catch(e) {}
	    try {return self;}
	    catch(e) {}
	})();
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var global = __webpack_require__(107);
	var es5 = __webpack_require__(157);
	var haveGetters = (function(){
	    try {
	        var o = {};
	        es5.defineProperty(o, "f", {
	            get: function () {
	                return 3;
	            }
	        });
	        return o.f === 3;
	    }
	    catch (e) {
	        return false;
	    }

	})();

	var canEvaluate = (function() {
	    if (typeof window !== "undefined" && window !== null &&
	        typeof window.document !== "undefined" &&
	        typeof navigator !== "undefined" && navigator !== null &&
	        typeof navigator.appName === "string" &&
	        window === global) {
	        return false;
	    }
	    return true;
	})();

	function deprecated(msg) {
	    if (typeof console !== "undefined" && console !== null &&
	        typeof console.warn === "function") {
	        console.warn("Bluebird: " + msg);
	    }
	}

	var errorObj = {e: {}};
	function tryCatch1(fn, receiver, arg) {
	    try {
	        return fn.call(receiver, arg);
	    }
	    catch (e) {
	        errorObj.e = e;
	        return errorObj;
	    }
	}

	function tryCatch2(fn, receiver, arg, arg2) {
	    try {
	        return fn.call(receiver, arg, arg2);
	    }
	    catch (e) {
	        errorObj.e = e;
	        return errorObj;
	    }
	}

	function tryCatchApply(fn, args, receiver) {
	    try {
	        return fn.apply(receiver, args);
	    }
	    catch (e) {
	        errorObj.e = e;
	        return errorObj;
	    }
	}

	var inherits = function(Child, Parent) {
	    var hasProp = {}.hasOwnProperty;

	    function T() {
	        this.constructor = Child;
	        this.constructor$ = Parent;
	        for (var propertyName in Parent.prototype) {
	            if (hasProp.call(Parent.prototype, propertyName) &&
	                propertyName.charAt(propertyName.length-1) !== "$"
	           ) {
	                this[propertyName + "$"] = Parent.prototype[propertyName];
	            }
	        }
	    }
	    T.prototype = Parent.prototype;
	    Child.prototype = new T();
	    return Child.prototype;
	};

	function asString(val) {
	    return typeof val === "string" ? val : ("" + val);
	}

	function isPrimitive(val) {
	    return val == null || val === true || val === false ||
	        typeof val === "string" || typeof val === "number";

	}

	function isObject(value) {
	    return !isPrimitive(value);
	}

	function maybeWrapAsError(maybeError) {
	    if (!isPrimitive(maybeError)) return maybeError;

	    return new Error(asString(maybeError));
	}

	function withAppended(target, appendee) {
	    var len = target.length;
	    var ret = new Array(len + 1);
	    var i;
	    for (i = 0; i < len; ++i) {
	        ret[i] = target[i];
	    }
	    ret[i] = appendee;
	    return ret;
	}


	function notEnumerableProp(obj, name, value) {
	    if (isPrimitive(obj)) return obj;
	    var descriptor = {
	        value: value,
	        configurable: true,
	        enumerable: false,
	        writable: true
	    };
	    es5.defineProperty(obj, name, descriptor);
	    return obj;
	}


	var wrapsPrimitiveReceiver = (function() {
	    return this !== "string";
	}).call("string");

	function thrower(r) {
	    throw r;
	}


	function toFastProperties(obj) {
	    /*jshint -W027*/
	    function f() {}
	    f.prototype = obj;
	    return f;
	    eval(obj);
	}

	var ret = {
	    thrower: thrower,
	    isArray: es5.isArray,
	    haveGetters: haveGetters,
	    notEnumerableProp: notEnumerableProp,
	    isPrimitive: isPrimitive,
	    isObject: isObject,
	    canEvaluate: canEvaluate,
	    deprecated: deprecated,
	    errorObj: errorObj,
	    tryCatch1: tryCatch1,
	    tryCatch2: tryCatch2,
	    tryCatchApply: tryCatchApply,
	    inherits: inherits,
	    withAppended: withAppended,
	    asString: asString,
	    maybeWrapAsError: maybeWrapAsError,
	    wrapsPrimitiveReceiver: wrapsPrimitiveReceiver,
	    toFastProperties: toFastProperties
	};

	module.exports = ret;


/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var schedule = __webpack_require__(158);
	var Queue = __webpack_require__(159);
	var errorObj = __webpack_require__(108).errorObj;
	var tryCatch1 = __webpack_require__(108).tryCatch1;
	var process = __webpack_require__(107).process;

	function Async() {
	    this._isTickUsed = false;
	    this._length = 0;
	    this._lateBuffer = new Queue();
	    this._functionBuffer = new Queue(25000 * 3);
	    var self = this;
	    this.consumeFunctionBuffer = function Async$consumeFunctionBuffer() {
	        self._consumeFunctionBuffer();
	    };
	}

	Async.prototype.haveItemsQueued = function Async$haveItemsQueued() {
	    return this._length > 0;
	};

	Async.prototype.invokeLater = function Async$invokeLater(fn, receiver, arg) {
	    if (process !== void 0 &&
	        process.domain != null &&
	        !fn.domain) {
	        fn = process.domain.bind(fn);
	    }
	    this._lateBuffer.push(fn, receiver, arg);
	    this._queueTick();
	};

	Async.prototype.invoke = function Async$invoke(fn, receiver, arg) {
	    if (process !== void 0 &&
	        process.domain != null &&
	        !fn.domain) {
	        fn = process.domain.bind(fn);
	    }
	    var functionBuffer = this._functionBuffer;
	    functionBuffer.push(fn, receiver, arg);
	    this._length = functionBuffer.length();
	    this._queueTick();
	};

	Async.prototype._consumeFunctionBuffer =
	function Async$_consumeFunctionBuffer() {
	    var functionBuffer = this._functionBuffer;
	    while(functionBuffer.length() > 0) {
	        var fn = functionBuffer.shift();
	        var receiver = functionBuffer.shift();
	        var arg = functionBuffer.shift();
	        fn.call(receiver, arg);
	    }
	    this._reset();
	    this._consumeLateBuffer();
	};

	Async.prototype._consumeLateBuffer = function Async$_consumeLateBuffer() {
	    var buffer = this._lateBuffer;
	    while(buffer.length() > 0) {
	        var fn = buffer.shift();
	        var receiver = buffer.shift();
	        var arg = buffer.shift();
	        var res = tryCatch1(fn, receiver, arg);
	        if (res === errorObj) {
	            this._queueTick();
	            if (fn.domain != null) {
	                fn.domain.emit("error", res.e);
	            }
	            else {
	                throw res.e;
	            }
	        }
	    }
	};

	Async.prototype._queueTick = function Async$_queue() {
	    if (!this._isTickUsed) {
	        schedule(this.consumeFunctionBuffer);
	        this._isTickUsed = true;
	    }
	};

	Async.prototype._reset = function Async$_reset() {
	    this._isTickUsed = false;
	    this._length = 0;
	};

	module.exports = new Async();


/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var global = __webpack_require__(107);
	var Objectfreeze = __webpack_require__(157).freeze;
	var util = __webpack_require__(108);
	var inherits = util.inherits;
	var notEnumerableProp = util.notEnumerableProp;
	var Error = global.Error;

	function markAsOriginatingFromRejection(e) {
	    try {
	        notEnumerableProp(e, "isAsync", true);
	    }
	    catch(ignore) {}
	}

	function originatesFromRejection(e) {
	    if (e == null) return false;
	    return ((e instanceof RejectionError) ||
	        e["isAsync"] === true);
	}

	function isError(obj) {
	    return obj instanceof Error;
	}

	function canAttach(obj) {
	    return isError(obj);
	}

	function subError(nameProperty, defaultMessage) {
	    function SubError(message) {
	        if (!(this instanceof SubError)) return new SubError(message);
	        this.message = typeof message === "string" ? message : defaultMessage;
	        this.name = nameProperty;
	        if (Error.captureStackTrace) {
	            Error.captureStackTrace(this, this.constructor);
	        }
	    }
	    inherits(SubError, Error);
	    return SubError;
	}

	var TypeError = global.TypeError;
	if (typeof TypeError !== "function") {
	    TypeError = subError("TypeError", "type error");
	}
	var RangeError = global.RangeError;
	if (typeof RangeError !== "function") {
	    RangeError = subError("RangeError", "range error");
	}
	var CancellationError = subError("CancellationError", "cancellation error");
	var TimeoutError = subError("TimeoutError", "timeout error");

	function RejectionError(message) {
	    this.name = "RejectionError";
	    this.message = message;
	    this.cause = message;
	    this.isAsync = true;

	    if (message instanceof Error) {
	        this.message = message.message;
	        this.stack = message.stack;
	    }
	    else if (Error.captureStackTrace) {
	        Error.captureStackTrace(this, this.constructor);
	    }

	}
	inherits(RejectionError, Error);

	var key = "__BluebirdErrorTypes__";
	var errorTypes = global[key];
	if (!errorTypes) {
	    errorTypes = Objectfreeze({
	        CancellationError: CancellationError,
	        TimeoutError: TimeoutError,
	        RejectionError: RejectionError
	    });
	    notEnumerableProp(global, key, errorTypes);
	}

	module.exports = {
	    Error: Error,
	    TypeError: TypeError,
	    RangeError: RangeError,
	    CancellationError: errorTypes.CancellationError,
	    RejectionError: errorTypes.RejectionError,
	    TimeoutError: errorTypes.TimeoutError,
	    originatesFromRejection: originatesFromRejection,
	    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
	    canAttach: canAttach
	};


/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, INTERNAL) {
	var canAttach = __webpack_require__(110).canAttach;
	var util = __webpack_require__(108);
	var async = __webpack_require__(109);
	var hasOwn = {}.hasOwnProperty;
	var isArray = util.isArray;

	function toResolutionValue(val) {
	    switch(val) {
	    case -1: return void 0;
	    case -2: return [];
	    case -3: return {};
	    }
	}

	function PromiseArray(values, boundTo) {
	    var promise = this._promise = new Promise(INTERNAL);
	    var parent = void 0;
	    if (values instanceof Promise) {
	        parent = values;
	        if (values._cancellable()) {
	            promise._setCancellable();
	            promise._cancellationParent = values;
	        }
	        if (values._isBound()) {
	            promise._setBoundTo(boundTo);
	        }
	    }
	    promise._setTrace(parent);
	    this._values = values;
	    this._length = 0;
	    this._totalResolved = 0;
	    this._init(void 0, -2);
	}
	PromiseArray.PropertiesPromiseArray = function() {};

	PromiseArray.prototype.length = function PromiseArray$length() {
	    return this._length;
	};

	PromiseArray.prototype.promise = function PromiseArray$promise() {
	    return this._promise;
	};

	PromiseArray.prototype._init =
	function PromiseArray$_init(_, resolveValueIfEmpty) {
	    var values = this._values;
	    if (values instanceof Promise) {
	        if (values.isFulfilled()) {
	            values = values._settledValue;
	            if (!isArray(values)) {
	                var err = new Promise.TypeError("expecting an array, a promise or a thenable");
	                this.__hardReject__(err);
	                return;
	            }
	            this._values = values;
	        }
	        else if (values.isPending()) {
	            values._then(
	                this._init,
	                this._reject,
	                void 0,
	                this,
	                resolveValueIfEmpty
	           );
	            return;
	        }
	        else {
	            values._unsetRejectionIsUnhandled();
	            this._reject(values._settledValue);
	            return;
	        }
	    }

	    if (values.length === 0) {
	        this._resolve(toResolutionValue(resolveValueIfEmpty));
	        return;
	    }
	    var len = values.length;
	    var newLen = len;
	    var newValues;
	    if (this instanceof PromiseArray.PropertiesPromiseArray) {
	        newValues = this._values;
	    }
	    else {
	        newValues = new Array(len);
	    }
	    var isDirectScanNeeded = false;
	    for (var i = 0; i < len; ++i) {
	        var promise = values[i];
	        if (promise === void 0 && !hasOwn.call(values, i)) {
	            newLen--;
	            continue;
	        }
	        var maybePromise = Promise._cast(promise, void 0);
	        if (maybePromise instanceof Promise) {
	            if (maybePromise.isPending()) {
	                maybePromise._proxyPromiseArray(this, i);
	            }
	            else {
	                maybePromise._unsetRejectionIsUnhandled();
	                isDirectScanNeeded = true;
	            }
	        }
	        else {
	            isDirectScanNeeded = true;
	        }
	        newValues[i] = maybePromise;
	    }
	    if (newLen === 0) {
	        if (resolveValueIfEmpty === -2) {
	            this._resolve(newValues);
	        }
	        else {
	            this._resolve(toResolutionValue(resolveValueIfEmpty));
	        }
	        return;
	    }
	    this._values = newValues;
	    this._length = newLen;
	    if (isDirectScanNeeded) {
	        var scanMethod = newLen === len
	            ? this._scanDirectValues
	            : this._scanDirectValuesHoled;
	        async.invoke(scanMethod, this, len);
	    }
	};

	PromiseArray.prototype._settlePromiseAt =
	function PromiseArray$_settlePromiseAt(index) {
	    var value = this._values[index];
	    if (!(value instanceof Promise)) {
	        this._promiseFulfilled(value, index);
	    }
	    else if (value.isFulfilled()) {
	        this._promiseFulfilled(value._settledValue, index);
	    }
	    else if (value.isRejected()) {
	        this._promiseRejected(value._settledValue, index);
	    }
	};

	PromiseArray.prototype._scanDirectValuesHoled =
	function PromiseArray$_scanDirectValuesHoled(len) {
	    for (var i = 0; i < len; ++i) {
	        if (this._isResolved()) {
	            break;
	        }
	        if (hasOwn.call(this._values, i)) {
	            this._settlePromiseAt(i);
	        }
	    }
	};

	PromiseArray.prototype._scanDirectValues =
	function PromiseArray$_scanDirectValues(len) {
	    for (var i = 0; i < len; ++i) {
	        if (this._isResolved()) {
	            break;
	        }
	        this._settlePromiseAt(i);
	    }
	};

	PromiseArray.prototype._isResolved = function PromiseArray$_isResolved() {
	    return this._values === null;
	};

	PromiseArray.prototype._resolve = function PromiseArray$_resolve(value) {
	    this._values = null;
	    this._promise._fulfill(value);
	};

	PromiseArray.prototype.__hardReject__ =
	PromiseArray.prototype._reject = function PromiseArray$_reject(reason) {
	    this._values = null;
	    var trace = canAttach(reason) ? reason : new Error(reason + "");
	    this._promise._attachExtraTrace(trace);
	    this._promise._reject(reason, trace);
	};

	PromiseArray.prototype._promiseProgressed =
	function PromiseArray$_promiseProgressed(progressValue, index) {
	    if (this._isResolved()) return;
	    this._promise._progress({
	        index: index,
	        value: progressValue
	    });
	};


	PromiseArray.prototype._promiseFulfilled =
	function PromiseArray$_promiseFulfilled(value, index) {
	    if (this._isResolved()) return;
	    this._values[index] = value;
	    var totalResolved = ++this._totalResolved;
	    if (totalResolved >= this._length) {
	        this._resolve(this._values);
	    }
	};

	PromiseArray.prototype._promiseRejected =
	function PromiseArray$_promiseRejected(reason, index) {
	    if (this._isResolved()) return;
	    this._totalResolved++;
	    this._reject(reason);
	};

	return PromiseArray;
	};


/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function() {
	var inherits = __webpack_require__(108).inherits;
	var defineProperty = __webpack_require__(157).defineProperty;

	var rignore = new RegExp(
	    "\\b(?:[a-zA-Z0-9.]+\\$_\\w+|" +
	    "tryCatch(?:1|2|Apply)|new \\w*PromiseArray|" +
	    "\\w*PromiseArray\\.\\w*PromiseArray|" +
	    "setTimeout|CatchFilter\\$_\\w+|makeNodePromisified|processImmediate|" +
	    "process._tickCallback|nextTick|Async\\$\\w+)\\b"
	);

	var rtraceline = null;
	var formatStack = null;

	function formatNonError(obj) {
	    var str;
	    if (typeof obj === "function") {
	        str = "[function " +
	            (obj.name || "anonymous") +
	            "]";
	    }
	    else {
	        str = obj.toString();
	        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
	        if (ruselessToString.test(str)) {
	            try {
	                var newStr = JSON.stringify(obj);
	                str = newStr;
	            }
	            catch(e) {

	            }
	        }
	        if (str.length === 0) {
	            str = "(empty array)";
	        }
	    }
	    return ("(<" + snip(str) + ">, no stack trace)");
	}

	function snip(str) {
	    var maxChars = 41;
	    if (str.length < maxChars) {
	        return str;
	    }
	    return str.substr(0, maxChars - 3) + "...";
	}

	function CapturedTrace(ignoreUntil, isTopLevel) {
	    this.captureStackTrace(CapturedTrace, isTopLevel);

	}
	inherits(CapturedTrace, Error);

	CapturedTrace.prototype.captureStackTrace =
	function CapturedTrace$captureStackTrace(ignoreUntil, isTopLevel) {
	    captureStackTrace(this, ignoreUntil, isTopLevel);
	};

	CapturedTrace.possiblyUnhandledRejection =
	function CapturedTrace$PossiblyUnhandledRejection(reason) {
	    if (typeof console === "object") {
	        var message;
	        if (typeof reason === "object" || typeof reason === "function") {
	            var stack = reason.stack;
	            message = "Possibly unhandled " + formatStack(stack, reason);
	        }
	        else {
	            message = "Possibly unhandled " + String(reason);
	        }
	        if (typeof console.error === "function" ||
	            typeof console.error === "object") {
	            console.error(message);
	        }
	        else if (typeof console.log === "function" ||
	            typeof console.log === "object") {
	            console.log(message);
	        }
	    }
	};

	CapturedTrace.combine = function CapturedTrace$Combine(current, prev) {
	    var curLast = current.length - 1;
	    for (var i = prev.length - 1; i >= 0; --i) {
	        var line = prev[i];
	        if (current[curLast] === line) {
	            current.pop();
	            curLast--;
	        }
	        else {
	            break;
	        }
	    }

	    current.push("From previous event:");
	    var lines = current.concat(prev);

	    var ret = [];

	    for (var i = 0, len = lines.length; i < len; ++i) {

	        if ((rignore.test(lines[i]) ||
	            (i > 0 && !rtraceline.test(lines[i])) &&
	            lines[i] !== "From previous event:")
	       ) {
	            continue;
	        }
	        ret.push(lines[i]);
	    }
	    return ret;
	};

	CapturedTrace.isSupported = function CapturedTrace$IsSupported() {
	    return typeof captureStackTrace === "function";
	};

	var captureStackTrace = (function stackDetection() {
	    if (typeof Error.stackTraceLimit === "number" &&
	        typeof Error.captureStackTrace === "function") {
	        rtraceline = /^\s*at\s*/;
	        formatStack = function(stack, error) {
	            if (typeof stack === "string") return stack;

	            if (error.name !== void 0 &&
	                error.message !== void 0) {
	                return error.name + ". " + error.message;
	            }
	            return formatNonError(error);


	        };
	        var captureStackTrace = Error.captureStackTrace;
	        return function CapturedTrace$_captureStackTrace(
	            receiver, ignoreUntil) {
	            captureStackTrace(receiver, ignoreUntil);
	        };
	    }
	    var err = new Error();

	    if (typeof err.stack === "string" &&
	        typeof "".startsWith === "function" &&
	        (err.stack.startsWith("stackDetection@")) &&
	        stackDetection.name === "stackDetection") {

	        defineProperty(Error, "stackTraceLimit", {
	            writable: true,
	            enumerable: false,
	            configurable: false,
	            value: 25
	        });
	        rtraceline = /@/;
	        var rline = /[@\n]/;

	        formatStack = function(stack, error) {
	            if (typeof stack === "string") {
	                return (error.name + ". " + error.message + "\n" + stack);
	            }

	            if (error.name !== void 0 &&
	                error.message !== void 0) {
	                return error.name + ". " + error.message;
	            }
	            return formatNonError(error);
	        };

	        return function captureStackTrace(o) {
	            var stack = new Error().stack;
	            var split = stack.split(rline);
	            var len = split.length;
	            var ret = "";
	            for (var i = 0; i < len; i += 2) {
	                ret += split[i];
	                ret += "@";
	                ret += split[i + 1];
	                ret += "\n";
	            }
	            o.stack = ret;
	        };
	    }
	    else {
	        formatStack = function(stack, error) {
	            if (typeof stack === "string") return stack;

	            if ((typeof error === "object" ||
	                typeof error === "function") &&
	                error.name !== void 0 &&
	                error.message !== void 0) {
	                return error.name + ". " + error.message;
	            }
	            return formatNonError(error);
	        };

	        return null;
	    }
	})();

	return CapturedTrace;
	};


/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(NEXT_FILTER) {
	var util = __webpack_require__(108);
	var errors = __webpack_require__(110);
	var tryCatch1 = util.tryCatch1;
	var errorObj = util.errorObj;
	var keys = __webpack_require__(157).keys;
	var TypeError = errors.TypeError;

	function CatchFilter(instances, callback, promise) {
	    this._instances = instances;
	    this._callback = callback;
	    this._promise = promise;
	}

	function CatchFilter$_safePredicate(predicate, e) {
	    var safeObject = {};
	    var retfilter = tryCatch1(predicate, safeObject, e);

	    if (retfilter === errorObj) return retfilter;

	    var safeKeys = keys(safeObject);
	    if (safeKeys.length) {
	        errorObj.e = new TypeError(
	            "Catch filter must inherit from Error "
	          + "or be a simple predicate function");
	        return errorObj;
	    }
	    return retfilter;
	}

	CatchFilter.prototype.doFilter = function CatchFilter$_doFilter(e) {
	    var cb = this._callback;
	    var promise = this._promise;
	    var boundTo = promise._isBound() ? promise._boundTo : void 0;
	    for (var i = 0, len = this._instances.length; i < len; ++i) {
	        var item = this._instances[i];
	        var itemIsErrorType = item === Error ||
	            (item != null && item.prototype instanceof Error);

	        if (itemIsErrorType && e instanceof item) {
	            var ret = tryCatch1(cb, boundTo, e);
	            if (ret === errorObj) {
	                NEXT_FILTER.e = ret.e;
	                return NEXT_FILTER;
	            }
	            return ret;
	        } else if (typeof item === "function" && !itemIsErrorType) {
	            var shouldHandle = CatchFilter$_safePredicate(item, e);
	            if (shouldHandle === errorObj) {
	                var trace = errors.canAttach(errorObj.e)
	                    ? errorObj.e
	                    : new Error(errorObj.e + "");
	                this._promise._attachExtraTrace(trace);
	                e = errorObj.e;
	                break;
	            } else if (shouldHandle) {
	                var ret = tryCatch1(cb, boundTo, e);
	                if (ret === errorObj) {
	                    NEXT_FILTER.e = ret.e;
	                    return NEXT_FILTER;
	                }
	                return ret;
	            }
	        }
	    }
	    NEXT_FILTER.e = e;
	    return NEXT_FILTER;
	};

	return CatchFilter;
	};


/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var util = __webpack_require__(108);
	var maybeWrapAsError = util.maybeWrapAsError;
	var errors = __webpack_require__(110);
	var TimeoutError = errors.TimeoutError;
	var RejectionError = errors.RejectionError;
	var async = __webpack_require__(109);
	var haveGetters = util.haveGetters;
	var es5 = __webpack_require__(157);

	function isUntypedError(obj) {
	    return obj instanceof Error &&
	        es5.getPrototypeOf(obj) === Error.prototype;
	}

	function wrapAsRejectionError(obj) {
	    var ret;
	    if (isUntypedError(obj)) {
	        ret = new RejectionError(obj);
	    }
	    else {
	        ret = obj;
	    }
	    errors.markAsOriginatingFromRejection(ret);
	    return ret;
	}

	function nodebackForPromise(promise) {
	    function PromiseResolver$_callback(err, value) {
	        if (promise === null) return;

	        if (err) {
	            var wrapped = wrapAsRejectionError(maybeWrapAsError(err));
	            promise._attachExtraTrace(wrapped);
	            promise._reject(wrapped);
	        }
	        else {
	            if (arguments.length > 2) {
	                var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
	                promise._fulfill(args);
	            }
	            else {
	                promise._fulfill(value);
	            }
	        }

	        promise = null;
	    }
	    return PromiseResolver$_callback;
	}


	var PromiseResolver;
	if (!haveGetters) {
	    PromiseResolver = function PromiseResolver(promise) {
	        this.promise = promise;
	        this.asCallback = nodebackForPromise(promise);
	        this.callback = this.asCallback;
	    };
	}
	else {
	    PromiseResolver = function PromiseResolver(promise) {
	        this.promise = promise;
	    };
	}
	if (haveGetters) {
	    var prop = {
	        get: function() {
	            return nodebackForPromise(this.promise);
	        }
	    };
	    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
	    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
	}

	PromiseResolver._nodebackForPromise = nodebackForPromise;

	PromiseResolver.prototype.toString = function PromiseResolver$toString() {
	    return "[object PromiseResolver]";
	};

	PromiseResolver.prototype.resolve =
	PromiseResolver.prototype.fulfill = function PromiseResolver$resolve(value) {
	    var promise = this.promise;
	    if ((promise === void 0) || (promise._tryFollow === void 0)) {
	        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
	    }
	    if (promise._tryFollow(value)) {
	        return;
	    }
	    async.invoke(promise._fulfill, promise, value);
	};

	PromiseResolver.prototype.reject = function PromiseResolver$reject(reason) {
	    var promise = this.promise;
	    if ((promise === void 0) || (promise._attachExtraTrace === void 0)) {
	        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
	    }
	    errors.markAsOriginatingFromRejection(reason);
	    var trace = errors.canAttach(reason) ? reason : new Error(reason + "");
	    promise._attachExtraTrace(trace);
	    async.invoke(promise._reject, promise, reason);
	    if (trace !== reason) {
	        async.invoke(this._setCarriedStackTrace, this, trace);
	    }
	};

	PromiseResolver.prototype.progress =
	function PromiseResolver$progress(value) {
	    async.invoke(this.promise._progress, this.promise, value);
	};

	PromiseResolver.prototype.cancel = function PromiseResolver$cancel() {
	    async.invoke(this.promise.cancel, this.promise, void 0);
	};

	PromiseResolver.prototype.timeout = function PromiseResolver$timeout() {
	    this.reject(new TimeoutError("timeout"));
	};

	PromiseResolver.prototype.isResolved = function PromiseResolver$isResolved() {
	    return this.promise.isResolved();
	};

	PromiseResolver.prototype.toJSON = function PromiseResolver$toJSON() {
	    return this.promise.toJSON();
	};

	PromiseResolver.prototype._setCarriedStackTrace =
	function PromiseResolver$_setCarriedStackTrace(trace) {
	    if (this.promise.isRejected()) {
	        this.promise._setCarriedStackTrace(trace);
	    }
	};

	module.exports = PromiseResolver;


/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise) {
	var TypeError = __webpack_require__(110).TypeError;

	function apiRejection(msg) {
	    var error = new TypeError(msg);
	    var ret = Promise.rejected(error);
	    var parent = ret._peekContext();
	    if (parent != null) {
	        parent._attachExtraTrace(error);
	    }
	    return ret;
	}

	return apiRejection;
	};


/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, NEXT_FILTER) {
	var util = __webpack_require__(108);
	var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;
	var isPrimitive = util.isPrimitive;
	var thrower = util.thrower;


	function returnThis() {
	    return this;
	}
	function throwThis() {
	    throw this;
	}
	function return$(r) {
	    return function Promise$_returner() {
	        return r;
	    };
	}
	function throw$(r) {
	    return function Promise$_thrower() {
	        throw r;
	    };
	}
	function promisedFinally(ret, reasonOrValue, isFulfilled) {
	    var then;
	    if (wrapsPrimitiveReceiver && isPrimitive(reasonOrValue)) {
	        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
	    }
	    else {
	        then = isFulfilled ? returnThis : throwThis;
	    }
	    return ret._then(then, thrower, void 0, reasonOrValue, void 0);
	}

	function finallyHandler(reasonOrValue) {
	    var promise = this.promise;
	    var handler = this.handler;

	    var ret = promise._isBound()
	                    ? handler.call(promise._boundTo)
	                    : handler();

	    if (ret !== void 0) {
	        var maybePromise = Promise._cast(ret, void 0);
	        if (maybePromise instanceof Promise) {
	            return promisedFinally(maybePromise, reasonOrValue,
	                                    promise.isFulfilled());
	        }
	    }

	    if (promise.isRejected()) {
	        NEXT_FILTER.e = reasonOrValue;
	        return NEXT_FILTER;
	    }
	    else {
	        return reasonOrValue;
	    }
	}

	function tapHandler(value) {
	    var promise = this.promise;
	    var handler = this.handler;

	    var ret = promise._isBound()
	                    ? handler.call(promise._boundTo, value)
	                    : handler(value);

	    if (ret !== void 0) {
	        var maybePromise = Promise._cast(ret, void 0);
	        if (maybePromise instanceof Promise) {
	            return promisedFinally(maybePromise, value, true);
	        }
	    }
	    return value;
	}

	Promise.prototype._passThroughHandler =
	function Promise$_passThroughHandler(handler, isFinally) {
	    if (typeof handler !== "function") return this.then();

	    var promiseAndHandler = {
	        promise: this,
	        handler: handler
	    };

	    return this._then(
	            isFinally ? finallyHandler : tapHandler,
	            isFinally ? finallyHandler : void 0, void 0,
	            promiseAndHandler, void 0);
	};

	Promise.prototype.lastly =
	Promise.prototype["finally"] = function Promise$finally(handler) {
	    return this._passThroughHandler(handler, true);
	};

	Promise.prototype.tap = function Promise$tap(handler) {
	    return this._passThroughHandler(handler, false);
	};
	};


/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var util = __webpack_require__(108);
	var isPrimitive = util.isPrimitive;
	var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;

	module.exports = function(Promise) {
	var returner = function Promise$_returner() {
	    return this;
	};
	var thrower = function Promise$_thrower() {
	    throw this;
	};

	var wrapper = function Promise$_wrapper(value, action) {
	    if (action === 1) {
	        return function Promise$_thrower() {
	            throw value;
	        };
	    }
	    else if (action === 2) {
	        return function Promise$_returner() {
	            return value;
	        };
	    }
	};


	Promise.prototype["return"] =
	Promise.prototype.thenReturn =
	function Promise$thenReturn(value) {
	    if (wrapsPrimitiveReceiver && isPrimitive(value)) {
	        return this._then(
	            wrapper(value, 2),
	            void 0,
	            void 0,
	            void 0,
	            void 0
	       );
	    }
	    return this._then(returner, void 0, void 0, value, void 0);
	};

	Promise.prototype["throw"] =
	Promise.prototype.thenThrow =
	function Promise$thenThrow(reason) {
	    if (wrapsPrimitiveReceiver && isPrimitive(reason)) {
	        return this._then(
	            wrapper(reason, 1),
	            void 0,
	            void 0,
	            void 0,
	            void 0
	       );
	    }
	    return this._then(thrower, void 0, void 0, reason, void 0);
	};
	};


/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, INTERNAL) {
	var util = __webpack_require__(108);
	var canAttach = __webpack_require__(110).canAttach;
	var errorObj = util.errorObj;
	var isObject = util.isObject;

	function getThen(obj) {
	    try {
	        return obj.then;
	    }
	    catch(e) {
	        errorObj.e = e;
	        return errorObj;
	    }
	}

	function Promise$_Cast(obj, originalPromise) {
	    if (isObject(obj)) {
	        if (obj instanceof Promise) {
	            return obj;
	        }
	        else if (isAnyBluebirdPromise(obj)) {
	            var ret = new Promise(INTERNAL);
	            ret._setTrace(void 0);
	            obj._then(
	                ret._fulfillUnchecked,
	                ret._rejectUncheckedCheckError,
	                ret._progressUnchecked,
	                ret,
	                null
	            );
	            ret._setFollowing();
	            return ret;
	        }
	        var then = getThen(obj);
	        if (then === errorObj) {
	            if (originalPromise !== void 0 && canAttach(then.e)) {
	                originalPromise._attachExtraTrace(then.e);
	            }
	            return Promise.reject(then.e);
	        }
	        else if (typeof then === "function") {
	            return Promise$_doThenable(obj, then, originalPromise);
	        }
	    }
	    return obj;
	}

	var hasProp = {}.hasOwnProperty;
	function isAnyBluebirdPromise(obj) {
	    return hasProp.call(obj, "_promise0");
	}

	function Promise$_doThenable(x, then, originalPromise) {
	    var resolver = Promise.defer();
	    var called = false;
	    try {
	        then.call(
	            x,
	            Promise$_resolveFromThenable,
	            Promise$_rejectFromThenable,
	            Promise$_progressFromThenable
	        );
	    }
	    catch(e) {
	        if (!called) {
	            called = true;
	            var trace = canAttach(e) ? e : new Error(e + "");
	            if (originalPromise !== void 0) {
	                originalPromise._attachExtraTrace(trace);
	            }
	            resolver.promise._reject(e, trace);
	        }
	    }
	    return resolver.promise;

	    function Promise$_resolveFromThenable(y) {
	        if (called) return;
	        called = true;

	        if (x === y) {
	            var e = Promise._makeSelfResolutionError();
	            if (originalPromise !== void 0) {
	                originalPromise._attachExtraTrace(e);
	            }
	            resolver.promise._reject(e, void 0);
	            return;
	        }
	        resolver.resolve(y);
	    }

	    function Promise$_rejectFromThenable(r) {
	        if (called) return;
	        called = true;
	        var trace = canAttach(r) ? r : new Error(r + "");
	        if (originalPromise !== void 0) {
	            originalPromise._attachExtraTrace(trace);
	        }
	        resolver.promise._reject(r, trace);
	    }

	    function Promise$_progressFromThenable(v) {
	        if (called) return;
	        var promise = resolver.promise;
	        if (typeof promise._progress === "function") {
	            promise._progress(v);
	        }
	    }
	}

	Promise._cast = Promise$_Cast;
	};


/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise) {
	function PromiseInspection(promise) {
	    if (promise !== void 0) {
	        this._bitField = promise._bitField;
	        this._settledValue = promise.isResolved()
	            ? promise._settledValue
	            : void 0;
	    }
	    else {
	        this._bitField = 0;
	        this._settledValue = void 0;
	    }
	}

	PromiseInspection.prototype.isFulfilled =
	Promise.prototype.isFulfilled = function Promise$isFulfilled() {
	    return (this._bitField & 268435456) > 0;
	};

	PromiseInspection.prototype.isRejected =
	Promise.prototype.isRejected = function Promise$isRejected() {
	    return (this._bitField & 134217728) > 0;
	};

	PromiseInspection.prototype.isPending =
	Promise.prototype.isPending = function Promise$isPending() {
	    return (this._bitField & 402653184) === 0;
	};

	PromiseInspection.prototype.value =
	Promise.prototype.value = function Promise$value() {
	    if (!this.isFulfilled()) {
	        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise");
	    }
	    return this._settledValue;
	};

	PromiseInspection.prototype.error =
	Promise.prototype.reason = function Promise$reason() {
	    if (!this.isRejected()) {
	        throw new TypeError("cannot get rejection reason of a non-rejected promise");
	    }
	    return this._settledValue;
	};

	PromiseInspection.prototype.isResolved =
	Promise.prototype.isResolved = function Promise$isResolved() {
	    return (this._bitField & 402653184) > 0;
	};

	Promise.prototype.inspect = function Promise$inspect() {
	    return new PromiseInspection(this);
	};

	Promise.PromiseInspection = PromiseInspection;
	};


/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var global = __webpack_require__(107);
	var setTimeout = function(fn, ms) {
	    var $_len = arguments.length;var args = new Array($_len - 2); for(var $_i = 2; $_i < $_len; ++$_i) {args[$_i - 2] = arguments[$_i];}
	    global.setTimeout(function(){
	        fn.apply(void 0, args);
	    }, ms);
	};

	module.exports = function(Promise, INTERNAL) {
	var util = __webpack_require__(108);
	var errors = __webpack_require__(110);
	var apiRejection = __webpack_require__(115)(Promise);
	var TimeoutError = Promise.TimeoutError;

	var afterTimeout = function Promise$_afterTimeout(promise, message, ms) {
	    if (!promise.isPending()) return;
	    if (typeof message !== "string") {
	        message = "operation timed out after" + " " + ms + " ms"
	    }
	    var err = new TimeoutError(message);
	    errors.markAsOriginatingFromRejection(err);
	    promise._attachExtraTrace(err);
	    promise._rejectUnchecked(err);
	};

	var afterDelay = function Promise$_afterDelay(value, promise) {
	    promise._fulfill(value);
	};

	var delay = Promise.delay = function Promise$Delay(value, ms) {
	    if (ms === void 0) {
	        ms = value;
	        value = void 0;
	    }
	    ms = +ms;
	    var maybePromise = Promise._cast(value, void 0);
	    var promise = new Promise(INTERNAL);

	    if (maybePromise instanceof Promise) {
	        if (maybePromise._isBound()) {
	            promise._setBoundTo(maybePromise._boundTo);
	        }
	        if (maybePromise._cancellable()) {
	            promise._setCancellable();
	            promise._cancellationParent = maybePromise;
	        }
	        promise._setTrace(maybePromise);
	        promise._follow(maybePromise);
	        return promise.then(function(value) {
	            return Promise.delay(value, ms);
	        });
	    }
	    else {
	        promise._setTrace(void 0);
	        setTimeout(afterDelay, ms, value, promise);
	    }
	    return promise;
	};

	Promise.prototype.delay = function Promise$delay(ms) {
	    return delay(this, ms);
	};

	Promise.prototype.timeout = function Promise$timeout(ms, message) {
	    ms = +ms;

	    var ret = new Promise(INTERNAL);
	    ret._setTrace(this);

	    if (this._isBound()) ret._setBoundTo(this._boundTo);
	    if (this._cancellable()) {
	        ret._setCancellable();
	        ret._cancellationParent = this;
	    }
	    ret._follow(this);
	    setTimeout(afterTimeout, ms, ret, message, ms);
	    return ret;
	};

	};


/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, Promise$_CreatePromiseArray, PromiseArray) {

	var SomePromiseArray = __webpack_require__(160)(PromiseArray);
	function Promise$_Any(promises, useBound) {
	    var ret = Promise$_CreatePromiseArray(
	        promises,
	        SomePromiseArray,
	        useBound === true && promises._isBound()
	            ? promises._boundTo
	            : void 0
	   );
	    var promise = ret.promise();
	    if (promise.isRejected()) {
	        return promise;
	    }
	    ret.setHowMany(1);
	    ret.setUnwrap();
	    ret.init();
	    return promise;
	}

	Promise.any = function Promise$Any(promises) {
	    return Promise$_Any(promises, false);
	};

	Promise.prototype.any = function Promise$any() {
	    return Promise$_Any(this, true);
	};

	};


/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, INTERNAL) {
	var apiRejection = __webpack_require__(115)(Promise);
	var isArray = __webpack_require__(108).isArray;

	var raceLater = function Promise$_raceLater(promise) {
	    return promise.then(function(array) {
	        return Promise$_Race(array, promise);
	    });
	};

	var hasOwn = {}.hasOwnProperty;
	function Promise$_Race(promises, parent) {
	    var maybePromise = Promise._cast(promises, void 0);

	    if (maybePromise instanceof Promise) {
	        return raceLater(maybePromise);
	    }
	    else if (!isArray(promises)) {
	        return apiRejection("expecting an array, a promise or a thenable");
	    }

	    var ret = new Promise(INTERNAL);
	    ret._setTrace(parent);
	    if (parent !== void 0) {
	        if (parent._isBound()) {
	            ret._setBoundTo(parent._boundTo);
	        }
	        if (parent._cancellable()) {
	            ret._setCancellable();
	            ret._cancellationParent = parent;
	        }
	    }
	    var fulfill = ret._fulfill;
	    var reject = ret._reject;
	    for (var i = 0, len = promises.length; i < len; ++i) {
	        var val = promises[i];

	        if (val === void 0 && !(hasOwn.call(promises, i))) {
	            continue;
	        }

	        Promise.cast(val)._then(
	            fulfill,
	            reject,
	            void 0,
	            ret,
	            null
	       );
	    }
	    return ret;
	}

	Promise.race = function Promise$Race(promises) {
	    return Promise$_Race(promises, void 0);
	};

	Promise.prototype.race = function Promise$race() {
	    return Promise$_Race(this, void 0);
	};

	};


/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise) {
	Promise.prototype.call = function Promise$call(propertyName) {
	    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}

	    return this._then(function(obj) {
	            return obj[propertyName].apply(obj, args);
	        },
	        void 0,
	        void 0,
	        void 0,
	        void 0
	   );
	};

	function Promise$getter(obj) {
	    var prop = typeof this === "string"
	        ? this
	        : ("" + this);
	    return obj[prop];
	}
	Promise.prototype.get = function Promise$get(propertyName) {
	    return this._then(
	        Promise$getter,
	        void 0,
	        void 0,
	        propertyName,
	        void 0
	   );
	};
	};


/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise) {
	var isArray = __webpack_require__(108).isArray;

	function Promise$_filter(booleans) {
	    var values = this instanceof Promise ? this._settledValue : this;
	    var len = values.length;
	    var ret = new Array(len);
	    var j = 0;

	    for (var i = 0; i < len; ++i) {
	        if (booleans[i]) ret[j++] = values[i];

	    }
	    ret.length = j;
	    return ret;
	}

	var ref = {ref: null};
	Promise.filter = function Promise$Filter(promises, fn) {
	    return Promise.map(promises, fn, ref)
	                  ._then(Promise$_filter, void 0, void 0, ref.ref, void 0);
	};

	Promise.prototype.filter = function Promise$filter(fn) {
	    return this.map(fn, ref)
	               ._then(Promise$_filter, void 0, void 0, ref.ref, void 0);
	};
	};


/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, apiRejection, INTERNAL) {
	var PromiseSpawn = __webpack_require__(161)(Promise, INTERNAL);
	var errors = __webpack_require__(110);
	var TypeError = errors.TypeError;
	var deprecated = __webpack_require__(108).deprecated;

	Promise.coroutine = function Promise$Coroutine(generatorFunction) {
	    if (typeof generatorFunction !== "function") {
	        throw new TypeError("generatorFunction must be a function");
	    }
	    var PromiseSpawn$ = PromiseSpawn;
	    return function () {
	        var generator = generatorFunction.apply(this, arguments);
	        var spawn = new PromiseSpawn$(void 0, void 0);
	        spawn._generator = generator;
	        spawn._next(void 0);
	        return spawn.promise();
	    };
	};

	Promise.coroutine.addYieldHandler = PromiseSpawn.addYieldHandler;

	Promise.spawn = function Promise$Spawn(generatorFunction) {
	    deprecated("Promise.spawn is deprecated. Use Promise.coroutine instead.");
	    if (typeof generatorFunction !== "function") {
	        return apiRejection("generatorFunction must be a function");
	    }
	    var spawn = new PromiseSpawn(generatorFunction, this);
	    var ret = spawn.promise();
	    spawn._run(Promise.spawn);
	    return ret;
	};
	};


/***/ },
/* 126 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, PromiseArray, INTERNAL, apiRejection) {

	var all = Promise.all;
	var util = __webpack_require__(108);
	var canAttach = __webpack_require__(110).canAttach;
	var isArray = util.isArray;
	var _cast = Promise._cast;

	function unpack(values) {
	    return Promise$_Map(values, this[0], this[1], this[2]);
	}

	function Promise$_Map(promises, fn, useBound, ref) {
	    if (typeof fn !== "function") {
	        return apiRejection("fn must be a function");
	    }

	    var receiver = void 0;
	    if (useBound === true) {
	        if (promises._isBound()) {
	            receiver = promises._boundTo;
	        }
	    }
	    else if (useBound !== false) {
	        receiver = useBound;
	    }

	    var shouldUnwrapItems = ref !== void 0;
	    if (shouldUnwrapItems) ref.ref = promises;

	    if (promises instanceof Promise) {
	        var pack = [fn, receiver, ref];
	        return promises._then(unpack, void 0, void 0, pack, void 0);
	    }
	    else if (!isArray(promises)) {
	        return apiRejection("expecting an array, a promise or a thenable");
	    }

	    var promise = new Promise(INTERNAL);
	    if (receiver !== void 0) promise._setBoundTo(receiver);
	    promise._setTrace(void 0);

	    var mapping = new Mapping(promise,
	                                fn,
	                                promises,
	                                receiver,
	                                shouldUnwrapItems);
	    mapping.init();
	    return promise;
	}

	var pending = {};
	function Mapping(promise, callback, items, receiver, shouldUnwrapItems) {
	    this.shouldUnwrapItems = shouldUnwrapItems;
	    this.index = 0;
	    this.items = items;
	    this.callback = callback;
	    this.receiver = receiver;
	    this.promise = promise;
	    this.result = new Array(items.length);
	}
	util.inherits(Mapping, PromiseArray);

	Mapping.prototype.init = function Mapping$init() {
	    var items = this.items;
	    var len = items.length;
	    var result = this.result;
	    var isRejected = false;
	    for (var i = 0; i < len; ++i) {
	        var maybePromise = _cast(items[i], void 0);
	        if (maybePromise instanceof Promise) {
	            if (maybePromise.isPending()) {
	                result[i] = pending;
	                maybePromise._proxyPromiseArray(this, i);
	            }
	            else if (maybePromise.isFulfilled()) {
	                result[i] = maybePromise.value();
	            }
	            else {
	                maybePromise._unsetRejectionIsUnhandled();
	                if (!isRejected) {
	                    this.reject(maybePromise.reason());
	                    isRejected = true;
	                }
	            }
	        }
	        else {
	            result[i] = maybePromise;
	        }
	    }
	    if (!isRejected) this.iterate();
	};

	Mapping.prototype.isResolved = function Mapping$isResolved() {
	    return this.promise === null;
	};

	Mapping.prototype._promiseProgressed =
	function Mapping$_promiseProgressed(value) {
	    if (this.isResolved()) return;
	    this.promise._progress(value);
	};

	Mapping.prototype._promiseFulfilled =
	function Mapping$_promiseFulfilled(value, index) {
	    if (this.isResolved()) return;
	    this.result[index] = value;
	    if (this.shouldUnwrapItems) this.items[index] = value;
	    if (this.index === index) this.iterate();
	};

	Mapping.prototype._promiseRejected =
	function Mapping$_promiseRejected(reason) {
	    this.reject(reason);
	};

	Mapping.prototype.reject = function Mapping$reject(reason) {
	    if (this.isResolved()) return;
	    var trace = canAttach(reason) ? reason : new Error(reason + "");
	    this.promise._attachExtraTrace(trace);
	    this.promise._reject(reason, trace);
	};

	Mapping.prototype.iterate = function Mapping$iterate() {
	    var i = this.index;
	    var items = this.items;
	    var result = this.result;
	    var len = items.length;
	    var result = this.result;
	    var receiver = this.receiver;
	    var callback = this.callback;

	    for (; i < len; ++i) {
	        var value = result[i];
	        if (value === pending) {
	            this.index = i;
	            return;
	        }
	        try { result[i] = callback.call(receiver, value, i, len); }
	        catch (e) { return this.reject(e); }
	    }
	    this.promise._follow(all(result));
	    this.items = this.result = this.callback = this.promise = null;
	};

	Promise.prototype.map = function Promise$map(fn, ref) {
	    return Promise$_Map(this, fn, true, ref);
	};

	Promise.map = function Promise$Map(promises, fn, ref) {
	    return Promise$_Map(promises, fn, false, ref);
	};
	};


/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise) {
	var util = __webpack_require__(108);
	var async = __webpack_require__(109);
	var tryCatch2 = util.tryCatch2;
	var tryCatch1 = util.tryCatch1;
	var errorObj = util.errorObj;

	function thrower(r) {
	    throw r;
	}

	function Promise$_successAdapter(val, receiver) {
	    var nodeback = this;
	    var ret = val === void 0
	        ? tryCatch1(nodeback, receiver, null)
	        : tryCatch2(nodeback, receiver, null, val);
	    if (ret === errorObj) {
	        async.invokeLater(thrower, void 0, ret.e);
	    }
	}
	function Promise$_errorAdapter(reason, receiver) {
	    var nodeback = this;
	    var ret = tryCatch1(nodeback, receiver, reason);
	    if (ret === errorObj) {
	        async.invokeLater(thrower, void 0, ret.e);
	    }
	}

	Promise.prototype.nodeify = function Promise$nodeify(nodeback) {
	    if (typeof nodeback == "function") {
	        this._then(
	            Promise$_successAdapter,
	            Promise$_errorAdapter,
	            void 0,
	            nodeback,
	            this._isBound() ? this._boundTo : null
	        );
	    }
	    return this;
	};
	};


/***/ },
/* 128 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, INTERNAL) {
	var THIS = {};
	var util = __webpack_require__(108);
	var es5 = __webpack_require__(157);
	var nodebackForPromise = __webpack_require__(114)
	    ._nodebackForPromise;
	var withAppended = util.withAppended;
	var maybeWrapAsError = util.maybeWrapAsError;
	var canEvaluate = util.canEvaluate;
	var deprecated = util.deprecated;
	var TypeError = __webpack_require__(110).TypeError;


	var rasyncSuffix = new RegExp("Async" + "$");
	function isPromisified(fn) {
	    return fn.__isPromisified__ === true;
	}
	function hasPromisified(obj, key) {
	    var containsKey = ((key + "Async") in obj);
	    return containsKey ? isPromisified(obj[key + "Async"])
	                       : false;
	}
	function checkValid(ret) {
	    for (var i = 0; i < ret.length; i += 2) {
	        var key = ret[i];
	        if (rasyncSuffix.test(key)) {
	            var keyWithoutAsyncSuffix = key.replace(rasyncSuffix, "");
	            for (var j = 0; j < ret.length; j += 2) {
	                if (ret[j] === keyWithoutAsyncSuffix) {
	                    throw new TypeError("Cannot promisify an API " +
	                        "that has normal methods with Async-suffix");
	                }
	            }
	        }
	    }
	}
	var inheritedMethods = (function() {
	    if (es5.isES5) {
	        var create = Object.create;
	        var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	        return function(cur) {
	            var ret = [];
	            var visitedKeys = create(null);
	            var original = cur;
	            while (cur !== null) {
	                var keys = es5.keys(cur);
	                for (var i = 0, len = keys.length; i < len; ++i) {
	                    var key = keys[i];
	                    if (visitedKeys[key]) continue;
	                    visitedKeys[key] = true;
	                    var desc = getOwnPropertyDescriptor(cur, key);

	                    if (desc != null &&
	                        typeof desc.value === "function" &&
	                        !isPromisified(desc.value) &&
	                        !hasPromisified(original, key)) {
	                        ret.push(key, desc.value);
	                    }
	                }
	                cur = es5.getPrototypeOf(cur);
	            }
	            checkValid(ret);
	            return ret;
	        };
	    }
	    else {
	        return function(obj) {
	            var ret = [];
	            /*jshint forin:false */
	            for (var key in obj) {
	                var fn = obj[key];
	                if (typeof fn === "function" &&
	                    !isPromisified(fn) &&
	                    !hasPromisified(obj, key)) {
	                    ret.push(key, fn);
	                }
	            }
	            checkValid(ret);
	            return ret;
	        };
	    }
	})();

	function switchCaseArgumentOrder(likelyArgumentCount) {
	    var ret = [likelyArgumentCount];
	    var min = Math.max(0, likelyArgumentCount - 1 - 5);
	    for(var i = likelyArgumentCount - 1; i >= min; --i) {
	        if (i === likelyArgumentCount) continue;
	        ret.push(i);
	    }
	    for(var i = likelyArgumentCount + 1; i <= 5; ++i) {
	        ret.push(i);
	    }
	    return ret;
	}

	function parameterDeclaration(parameterCount) {
	    var ret = new Array(parameterCount);
	    for(var i = 0; i < ret.length; ++i) {
	        ret[i] = "_arg" + i;
	    }
	    return ret.join(", ");
	}

	function parameterCount(fn) {
	    if (typeof fn.length === "number") {
	        return Math.max(Math.min(fn.length, 1023 + 1), 0);
	    }
	    return 0;
	}

	var rident = /^[a-z$_][a-z$_0-9]*$/i;
	function propertyAccess(id) {
	    if (rident.test(id)) {
	        return "." + id;
	    }
	    else return "['" + id.replace(/(['\\])/g, "\\$1") + "']";
	}

	function makeNodePromisifiedEval(callback, receiver, originalName, fn) {
	    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
	    var argumentOrder = switchCaseArgumentOrder(newParameterCount);

	    var callbackName = (typeof originalName === "string" ?
	        originalName + "Async" :
	        "promisified");

	    function generateCallForArgumentCount(count) {
	        var args = new Array(count);
	        for (var i = 0, len = args.length; i < len; ++i) {
	            args[i] = "arguments[" + i + "]";
	        }
	        var comma = count > 0 ? "," : "";

	        if (typeof callback === "string" &&
	            receiver === THIS) {
	            return "this" + propertyAccess(callback) + "("+args.join(",") +
	                comma +" fn);"+
	                "break;";
	        }
	        return (receiver === void 0
	            ? "callback("+args.join(",")+ comma +" fn);"
	            : "callback.call("+(receiver === THIS
	                ? "this"
	                : "receiver")+", "+args.join(",") + comma + " fn);") +
	        "break;";
	    }

	    if (!rident.test(callbackName)) {
	        callbackName = "promisified";
	    }

	    function generateArgumentSwitchCase() {
	        var ret = "";
	        for(var i = 0; i < argumentOrder.length; ++i) {
	            ret += "case " + argumentOrder[i] +":" +
	                generateCallForArgumentCount(argumentOrder[i]);
	        }
	        ret += "default: var args = new Array(len + 1);" +
	            "var i = 0;" +
	            "for (var i = 0; i < len; ++i) { " +
	            "   args[i] = arguments[i];" +
	            "}" +
	            "args[i] = fn;" +

	            (typeof callback === "string"
	            ? "this" + propertyAccess(callback) + ".apply("
	            : "callback.apply(") +

	            (receiver === THIS ? "this" : "receiver") +
	            ", args); break;";
	        return ret;
	    }

	    return new Function("Promise", "callback", "receiver",
	            "withAppended", "maybeWrapAsError", "nodebackForPromise",
	            "INTERNAL",
	        "var ret = function " + callbackName +
	        "(" + parameterDeclaration(newParameterCount) + ") {\"use strict\";" +
	        "var len = arguments.length;" +
	        "var promise = new Promise(INTERNAL);"+
	        "promise._setTrace(void 0);" +
	        "var fn = nodebackForPromise(promise);"+
	        "try {" +
	        "switch(len) {" +
	        generateArgumentSwitchCase() +
	        "}" +
	        "}" +
	        "catch(e){ " +
	        "var wrapped = maybeWrapAsError(e);" +
	        "promise._attachExtraTrace(wrapped);" +
	        "promise._reject(wrapped);" +
	        "}" +
	        "return promise;" +
	        "" +
	        "}; ret.__isPromisified__ = true; return ret;"
	   )(Promise, callback, receiver, withAppended,
	        maybeWrapAsError, nodebackForPromise, INTERNAL);
	}

	function makeNodePromisifiedClosure(callback, receiver) {
	    function promisified() {
	        var _receiver = receiver;
	        if (receiver === THIS) _receiver = this;
	        if (typeof callback === "string") {
	            callback = _receiver[callback];
	        }
	        var promise = new Promise(INTERNAL);
	        promise._setTrace(void 0);
	        var fn = nodebackForPromise(promise);
	        try {
	            callback.apply(_receiver, withAppended(arguments, fn));
	        }
	        catch(e) {
	            var wrapped = maybeWrapAsError(e);
	            promise._attachExtraTrace(wrapped);
	            promise._reject(wrapped);
	        }
	        return promise;
	    }
	    promisified.__isPromisified__ = true;
	    return promisified;
	}

	var makeNodePromisified = canEvaluate
	    ? makeNodePromisifiedEval
	    : makeNodePromisifiedClosure;

	function _promisify(callback, receiver, isAll) {
	    if (isAll) {
	        var methods = inheritedMethods(callback);
	        for (var i = 0, len = methods.length; i < len; i+= 2) {
	            var key = methods[i];
	            var fn = methods[i+1];
	            var promisifiedKey = key + "Async";
	            callback[promisifiedKey] = makeNodePromisified(key, THIS, key, fn);
	        }
	        util.toFastProperties(callback);
	        return callback;
	    }
	    else {
	        return makeNodePromisified(callback, receiver, void 0, callback);
	    }
	}

	Promise.promisify = function Promise$Promisify(fn, receiver) {
	    if (typeof fn === "object" && fn !== null) {
	        deprecated("Promise.promisify for promisifying entire objects is deprecated. Use Promise.promisifyAll instead.");
	        return _promisify(fn, receiver, true);
	    }
	    if (typeof fn !== "function") {
	        throw new TypeError("fn must be a function");
	    }
	    if (isPromisified(fn)) {
	        return fn;
	    }
	    return _promisify(
	        fn,
	        arguments.length < 2 ? THIS : receiver,
	        false);
	};

	Promise.promisifyAll = function Promise$PromisifyAll(target) {
	    if (typeof target !== "function" && typeof target !== "object") {
	        throw new TypeError("the target of promisifyAll must be an object or a function");
	    }
	    return _promisify(target, void 0, true);
	};
	};



/***/ },
/* 129 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, PromiseArray) {
	var PropertiesPromiseArray = __webpack_require__(162)(
	    Promise, PromiseArray);
	var util = __webpack_require__(108);
	var apiRejection = __webpack_require__(115)(Promise);
	var isObject = util.isObject;

	function Promise$_Props(promises, useBound) {
	    var ret;
	    var castValue = Promise._cast(promises, void 0);

	    if (!isObject(castValue)) {
	        return apiRejection("cannot await properties of a non-object");
	    }
	    else if (castValue instanceof Promise) {
	        ret = castValue._then(Promise.props, void 0, void 0,
	                        void 0, void 0);
	    }
	    else {
	        ret = new PropertiesPromiseArray(
	            castValue,
	            useBound === true && castValue._isBound()
	                        ? castValue._boundTo
	                        : void 0
	       ).promise();
	        useBound = false;
	    }
	    if (useBound === true && castValue._isBound()) {
	        ret._setBoundTo(castValue._boundTo);
	    }
	    return ret;
	}

	Promise.prototype.props = function Promise$props() {
	    return Promise$_Props(this, true);
	};

	Promise.props = function Promise$Props(promises) {
	    return Promise$_Props(promises, false);
	};
	};


/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(
	    Promise, Promise$_CreatePromiseArray,
	    PromiseArray, apiRejection, INTERNAL) {

	function Reduction(callback, index, accum, items, receiver) {
	    this.promise = new Promise(INTERNAL);
	    this.index = index;
	    this.length = items.length;
	    this.items = items;
	    this.callback = callback;
	    this.receiver = receiver;
	    this.accum = accum;
	}

	Reduction.prototype.reject = function Reduction$reject(e) {
	    this.promise._reject(e);
	};

	Reduction.prototype.fulfill = function Reduction$fulfill(value, index) {
	    this.accum = value;
	    this.index = index + 1;
	    this.iterate();
	};

	Reduction.prototype.iterate = function Reduction$iterate() {
	    var i = this.index;
	    var len = this.length;
	    var items = this.items;
	    var result = this.accum;
	    var receiver = this.receiver;
	    var callback = this.callback;

	    for (; i < len; ++i) {
	        result = callback.call(receiver, result, items[i], i, len);
	        result = Promise._cast(result, void 0);

	        if (result instanceof Promise) {
	            result._then(
	                this.fulfill, this.reject, void 0, this, i);
	            return;
	        }
	    }
	    this.promise._fulfill(result);
	};

	function Promise$_reducer(fulfilleds, initialValue) {
	    var fn = this;
	    var receiver = void 0;
	    if (typeof fn !== "function")  {
	        receiver = fn.receiver;
	        fn = fn.fn;
	    }
	    var len = fulfilleds.length;
	    var accum = void 0;
	    var startIndex = 0;

	    if (initialValue !== void 0) {
	        accum = initialValue;
	        startIndex = 0;
	    }
	    else {
	        startIndex = 1;
	        if (len > 0) accum = fulfilleds[0];
	    }
	    var i = startIndex;

	    if (i >= len) {
	        return accum;
	    }

	    var reduction = new Reduction(fn, i, accum, fulfilleds, receiver);
	    reduction.iterate();
	    return reduction.promise;
	}

	function Promise$_unpackReducer(fulfilleds) {
	    var fn = this.fn;
	    var initialValue = this.initialValue;
	    return Promise$_reducer.call(fn, fulfilleds, initialValue);
	}

	function Promise$_slowReduce(
	    promises, fn, initialValue, useBound) {
	    return initialValue._then(function(initialValue) {
	        return Promise$_Reduce(
	            promises, fn, initialValue, useBound);
	    }, void 0, void 0, void 0, void 0);
	}

	function Promise$_Reduce(promises, fn, initialValue, useBound) {
	    if (typeof fn !== "function") {
	        return apiRejection("fn must be a function");
	    }

	    if (useBound === true && promises._isBound()) {
	        fn = {
	            fn: fn,
	            receiver: promises._boundTo
	        };
	    }

	    if (initialValue !== void 0) {
	        if (initialValue instanceof Promise) {
	            if (initialValue.isFulfilled()) {
	                initialValue = initialValue._settledValue;
	            }
	            else {
	                return Promise$_slowReduce(promises,
	                    fn, initialValue, useBound);
	            }
	        }

	        return Promise$_CreatePromiseArray(promises, PromiseArray,
	            useBound === true && promises._isBound()
	                ? promises._boundTo
	                : void 0)
	            .promise()
	            ._then(Promise$_unpackReducer, void 0, void 0, {
	                fn: fn,
	                initialValue: initialValue
	            }, void 0);
	    }
	    return Promise$_CreatePromiseArray(promises, PromiseArray,
	            useBound === true && promises._isBound()
	                ? promises._boundTo
	                : void 0).promise()
	        ._then(Promise$_reducer, void 0, void 0, fn, void 0);
	}


	Promise.reduce = function Promise$Reduce(promises, fn, initialValue) {
	    return Promise$_Reduce(promises, fn, initialValue, false);
	};

	Promise.prototype.reduce = function Promise$reduce(fn, initialValue) {
	    return Promise$_Reduce(this, fn, initialValue, true);
	};
	};


/***/ },
/* 131 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports =
	    function(Promise, Promise$_CreatePromiseArray, PromiseArray) {

	var SettledPromiseArray = __webpack_require__(163)(
	    Promise, PromiseArray);

	function Promise$_Settle(promises, useBound) {
	    return Promise$_CreatePromiseArray(
	        promises,
	        SettledPromiseArray,
	        useBound === true && promises._isBound()
	            ? promises._boundTo
	            : void 0
	   ).promise();
	}

	Promise.settle = function Promise$Settle(promises) {
	    return Promise$_Settle(promises, false);
	};

	Promise.prototype.settle = function Promise$settle() {
	    return Promise$_Settle(this, true);
	};
	};


/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports =
	function(Promise, Promise$_CreatePromiseArray, PromiseArray, apiRejection) {

	var SomePromiseArray = __webpack_require__(160)(PromiseArray);
	function Promise$_Some(promises, howMany, useBound) {
	    if ((howMany | 0) !== howMany || howMany < 0) {
	        return apiRejection("expecting a positive integer");
	    }
	    var ret = Promise$_CreatePromiseArray(
	        promises,
	        SomePromiseArray,
	        useBound === true && promises._isBound()
	            ? promises._boundTo
	            : void 0
	   );
	    var promise = ret.promise();
	    if (promise.isRejected()) {
	        return promise;
	    }
	    ret.setHowMany(howMany);
	    ret.init();
	    return promise;
	}

	Promise.some = function Promise$Some(promises, howMany) {
	    return Promise$_Some(promises, howMany, false);
	};

	Promise.prototype.some = function Promise$some(count) {
	    return Promise$_Some(this, count, true);
	};

	};


/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, isPromiseArrayProxy) {
	var util = __webpack_require__(108);
	var async = __webpack_require__(109);
	var errors = __webpack_require__(110);
	var tryCatch1 = util.tryCatch1;
	var errorObj = util.errorObj;

	Promise.prototype.progressed = function Promise$progressed(handler) {
	    return this._then(void 0, void 0, handler, void 0, void 0);
	};

	Promise.prototype._progress = function Promise$_progress(progressValue) {
	    if (this._isFollowingOrFulfilledOrRejected()) return;
	    this._progressUnchecked(progressValue);

	};

	Promise.prototype._progressHandlerAt =
	function Promise$_progressHandlerAt(index) {
	    if (index === 0) return this._progressHandler0;
	    return this[index + 2 - 5];
	};

	Promise.prototype._doProgressWith =
	function Promise$_doProgressWith(progression) {
	    var progressValue = progression.value;
	    var handler = progression.handler;
	    var promise = progression.promise;
	    var receiver = progression.receiver;

	    this._pushContext();
	    var ret = tryCatch1(handler, receiver, progressValue);
	    this._popContext();

	    if (ret === errorObj) {
	        if (ret.e != null &&
	            ret.e.name !== "StopProgressPropagation") {
	            var trace = errors.canAttach(ret.e)
	                ? ret.e : new Error(ret.e + "");
	            promise._attachExtraTrace(trace);
	            promise._progress(ret.e);
	        }
	    }
	    else if (ret instanceof Promise) {
	        ret._then(promise._progress, null, null, promise, void 0);
	    }
	    else {
	        promise._progress(ret);
	    }
	};


	Promise.prototype._progressUnchecked =
	function Promise$_progressUnchecked(progressValue) {
	    if (!this.isPending()) return;
	    var len = this._length();
	    var progress = this._progress;
	    for (var i = 0; i < len; i += 5) {
	        var handler = this._progressHandlerAt(i);
	        var promise = this._promiseAt(i);
	        if (!(promise instanceof Promise)) {
	            var receiver = this._receiverAt(i);
	            if (typeof handler === "function") {
	                handler.call(receiver, progressValue, promise);
	            }
	            else if (receiver instanceof Promise && receiver._isProxied()) {
	                receiver._progressUnchecked(progressValue);
	            }
	            else if (isPromiseArrayProxy(receiver, promise)) {
	                receiver._promiseProgressed(progressValue, promise);
	            }
	            continue;
	        }

	        if (typeof handler === "function") {
	            async.invoke(this._doProgressWith, this, {
	                handler: handler,
	                promise: promise,
	                receiver: this._receiverAt(i),
	                value: progressValue
	            });
	        }
	        else {
	            async.invoke(progress, promise, progressValue);
	        }
	    }
	};
	};


/***/ },
/* 134 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, INTERNAL) {
	var errors = __webpack_require__(110);
	var async = __webpack_require__(109);
	var CancellationError = errors.CancellationError;

	Promise.prototype._cancel = function Promise$_cancel() {
	    if (!this.isCancellable()) return this;
	    var parent;
	    var promiseToReject = this;
	    while ((parent = promiseToReject._cancellationParent) !== void 0 &&
	        parent.isCancellable()) {
	        promiseToReject = parent;
	    }
	    var err = new CancellationError();
	    promiseToReject._attachExtraTrace(err);
	    promiseToReject._rejectUnchecked(err);
	};

	Promise.prototype.cancel = function Promise$cancel() {
	    if (!this.isCancellable()) return this;
	    async.invokeLater(this._cancel, this, void 0);
	    return this;
	};

	Promise.prototype.cancellable = function Promise$cancellable() {
	    if (this._cancellable()) return this;
	    this._setCancellable();
	    this._cancellationParent = void 0;
	    return this;
	};

	Promise.prototype.uncancellable = function Promise$uncancellable() {
	    var ret = new Promise(INTERNAL);
	    ret._setTrace(this);
	    ret._follow(this);
	    ret._unsetCancellable();
	    if (this._isBound()) ret._setBoundTo(this._boundTo);
	    return ret;
	};

	Promise.prototype.fork =
	function Promise$fork(didFulfill, didReject, didProgress) {
	    var ret = this._then(didFulfill, didReject, didProgress,
	                         void 0, void 0);

	    ret._setCancellable();
	    ret._cancellationParent = void 0;
	    return ret;
	};
	};


/***/ },
/* 135 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function (Buffer) {

	  //prototype class for hash functions
	  function Hash (blockSize, finalSize) {
	    this._block = new Buffer(blockSize) //new Uint32Array(blockSize/4)
	    this._finalSize = finalSize
	    this._blockSize = blockSize
	    this._len = 0
	    this._s = 0
	  }

	  Hash.prototype.init = function () {
	    this._s = 0
	    this._len = 0
	  }

	  Hash.prototype.update = function (data, enc) {
	    if ("string" === typeof data) {
	      enc = enc || "utf8"
	      data = new Buffer(data, enc)
	    }

	    var l = this._len += data.length
	    var s = this._s = (this._s || 0)
	    var f = 0
	    var buffer = this._block

	    while (s < l) {
	      var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
	      var ch = (t - f)

	      for (var i = 0; i < ch; i++) {
	        buffer[(s % this._blockSize) + i] = data[i + f]
	      }

	      s += ch
	      f += ch

	      if ((s % this._blockSize) === 0) {
	        this._update(buffer)
	      }
	    }
	    this._s = s

	    return this
	  }

	  Hash.prototype.digest = function (enc) {
	    // Suppose the length of the message M, in bits, is l
	    var l = this._len * 8

	    // Append the bit 1 to the end of the message
	    this._block[this._len % this._blockSize] = 0x80

	    // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
	    this._block.fill(0, this._len % this._blockSize + 1)

	    if (l % (this._blockSize * 8) >= this._finalSize * 8) {
	      this._update(this._block)
	      this._block.fill(0)
	    }

	    // to this append the block which is equal to the number l written in binary
	    // TODO: handle case where l is > Math.pow(2, 29)
	    this._block.writeInt32BE(l, this._blockSize - 4)

	    var hash = this._update(this._block) || this._hash()

	    return enc ? hash.toString(enc) : hash
	  }

	  Hash.prototype._update = function () {
	    throw new Error('_update must be implemented by subclass')
	  }

	  return Hash
	}


/***/ },
/* 136 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
	 * in FIPS PUB 180-1
	 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for details.
	 */

	var inherits = __webpack_require__(79).inherits

	module.exports = function (Buffer, Hash) {

	  var A = 0|0
	  var B = 4|0
	  var C = 8|0
	  var D = 12|0
	  var E = 16|0

	  var W = new (typeof Int32Array === 'undefined' ? Array : Int32Array)(80)

	  var POOL = []

	  function Sha1 () {
	    if(POOL.length)
	      return POOL.pop().init()

	    if(!(this instanceof Sha1)) return new Sha1()
	    this._w = W
	    Hash.call(this, 16*4, 14*4)

	    this._h = null
	    this.init()
	  }

	  inherits(Sha1, Hash)

	  Sha1.prototype.init = function () {
	    this._a = 0x67452301
	    this._b = 0xefcdab89
	    this._c = 0x98badcfe
	    this._d = 0x10325476
	    this._e = 0xc3d2e1f0

	    Hash.prototype.init.call(this)
	    return this
	  }

	  Sha1.prototype._POOL = POOL
	  Sha1.prototype._update = function (X) {

	    var a, b, c, d, e, _a, _b, _c, _d, _e

	    a = _a = this._a
	    b = _b = this._b
	    c = _c = this._c
	    d = _d = this._d
	    e = _e = this._e

	    var w = this._w

	    for(var j = 0; j < 80; j++) {
	      var W = w[j] = j < 16 ? X.readInt32BE(j*4)
	        : rol(w[j - 3] ^ w[j -  8] ^ w[j - 14] ^ w[j - 16], 1)

	      var t = add(
	        add(rol(a, 5), sha1_ft(j, b, c, d)),
	        add(add(e, W), sha1_kt(j))
	      )

	      e = d
	      d = c
	      c = rol(b, 30)
	      b = a
	      a = t
	    }

	    this._a = add(a, _a)
	    this._b = add(b, _b)
	    this._c = add(c, _c)
	    this._d = add(d, _d)
	    this._e = add(e, _e)
	  }

	  Sha1.prototype._hash = function () {
	    if(POOL.length < 100) POOL.push(this)
	    var H = new Buffer(20)
	    //console.log(this._a|0, this._b|0, this._c|0, this._d|0, this._e|0)
	    H.writeInt32BE(this._a|0, A)
	    H.writeInt32BE(this._b|0, B)
	    H.writeInt32BE(this._c|0, C)
	    H.writeInt32BE(this._d|0, D)
	    H.writeInt32BE(this._e|0, E)
	    return H
	  }

	  /*
	   * Perform the appropriate triplet combination function for the current
	   * iteration
	   */
	  function sha1_ft(t, b, c, d) {
	    if(t < 20) return (b & c) | ((~b) & d);
	    if(t < 40) return b ^ c ^ d;
	    if(t < 60) return (b & c) | (b & d) | (c & d);
	    return b ^ c ^ d;
	  }

	  /*
	   * Determine the appropriate additive constant for the current iteration
	   */
	  function sha1_kt(t) {
	    return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
	           (t < 60) ? -1894007588 : -899497514;
	  }

	  /*
	   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	   * to work around bugs in some JS interpreters.
	   * //dominictarr: this is 10 years old, so maybe this can be dropped?)
	   *
	   */
	  function add(x, y) {
	    return (x + y ) | 0
	  //lets see how this goes on testling.
	  //  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	  //  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  //  return (msw << 16) | (lsw & 0xFFFF);
	  }

	  /*
	   * Bitwise rotate a 32-bit number to the left.
	   */
	  function rol(num, cnt) {
	    return (num << cnt) | (num >>> (32 - cnt));
	  }

	  return Sha1
	}


/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
	 * in FIPS 180-2
	 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 *
	 */

	var inherits = __webpack_require__(79).inherits

	module.exports = function (Buffer, Hash) {

	  var K = [
	      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
	      0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
	      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
	      0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
	      0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
	      0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
	      0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
	      0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
	      0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
	      0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
	      0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
	      0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
	      0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
	      0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
	      0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
	      0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
	    ]

	  var W = new Array(64)

	  function Sha256() {
	    this.init()

	    this._w = W //new Array(64)

	    Hash.call(this, 16*4, 14*4)
	  }

	  inherits(Sha256, Hash)

	  Sha256.prototype.init = function () {

	    this._a = 0x6a09e667|0
	    this._b = 0xbb67ae85|0
	    this._c = 0x3c6ef372|0
	    this._d = 0xa54ff53a|0
	    this._e = 0x510e527f|0
	    this._f = 0x9b05688c|0
	    this._g = 0x1f83d9ab|0
	    this._h = 0x5be0cd19|0

	    this._len = this._s = 0

	    return this
	  }

	  function S (X, n) {
	    return (X >>> n) | (X << (32 - n));
	  }

	  function R (X, n) {
	    return (X >>> n);
	  }

	  function Ch (x, y, z) {
	    return ((x & y) ^ ((~x) & z));
	  }

	  function Maj (x, y, z) {
	    return ((x & y) ^ (x & z) ^ (y & z));
	  }

	  function Sigma0256 (x) {
	    return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
	  }

	  function Sigma1256 (x) {
	    return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
	  }

	  function Gamma0256 (x) {
	    return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
	  }

	  function Gamma1256 (x) {
	    return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
	  }

	  Sha256.prototype._update = function(M) {

	    var W = this._w
	    var a, b, c, d, e, f, g, h
	    var T1, T2

	    a = this._a | 0
	    b = this._b | 0
	    c = this._c | 0
	    d = this._d | 0
	    e = this._e | 0
	    f = this._f | 0
	    g = this._g | 0
	    h = this._h | 0

	    for (var j = 0; j < 64; j++) {
	      var w = W[j] = j < 16
	        ? M.readInt32BE(j * 4)
	        : Gamma1256(W[j - 2]) + W[j - 7] + Gamma0256(W[j - 15]) + W[j - 16]

	      T1 = h + Sigma1256(e) + Ch(e, f, g) + K[j] + w

	      T2 = Sigma0256(a) + Maj(a, b, c);
	      h = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
	    }

	    this._a = (a + this._a) | 0
	    this._b = (b + this._b) | 0
	    this._c = (c + this._c) | 0
	    this._d = (d + this._d) | 0
	    this._e = (e + this._e) | 0
	    this._f = (f + this._f) | 0
	    this._g = (g + this._g) | 0
	    this._h = (h + this._h) | 0

	  };

	  Sha256.prototype._hash = function () {
	    var H = new Buffer(32)

	    H.writeInt32BE(this._a,  0)
	    H.writeInt32BE(this._b,  4)
	    H.writeInt32BE(this._c,  8)
	    H.writeInt32BE(this._d, 12)
	    H.writeInt32BE(this._e, 16)
	    H.writeInt32BE(this._f, 20)
	    H.writeInt32BE(this._g, 24)
	    H.writeInt32BE(this._h, 28)

	    return H
	  }

	  return Sha256

	}


/***/ },
/* 138 */
/***/ function(module, exports, __webpack_require__) {

	var inherits = __webpack_require__(79).inherits

	module.exports = function (Buffer, Hash) {
	  var K = [
	    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
	    0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
	    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
	    0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
	    0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
	    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
	    0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
	    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
	    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
	    0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
	    0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
	    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
	    0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
	    0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
	    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
	    0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
	    0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
	    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
	    0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
	    0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
	    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
	    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
	    0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
	    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
	    0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
	    0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
	    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
	    0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
	    0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
	    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
	    0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
	  ]

	  var W = new Array(160)

	  function Sha512() {
	    this.init()
	    this._w = W

	    Hash.call(this, 128, 112)
	  }

	  inherits(Sha512, Hash)

	  Sha512.prototype.init = function () {

	    this._a = 0x6a09e667|0
	    this._b = 0xbb67ae85|0
	    this._c = 0x3c6ef372|0
	    this._d = 0xa54ff53a|0
	    this._e = 0x510e527f|0
	    this._f = 0x9b05688c|0
	    this._g = 0x1f83d9ab|0
	    this._h = 0x5be0cd19|0

	    this._al = 0xf3bcc908|0
	    this._bl = 0x84caa73b|0
	    this._cl = 0xfe94f82b|0
	    this._dl = 0x5f1d36f1|0
	    this._el = 0xade682d1|0
	    this._fl = 0x2b3e6c1f|0
	    this._gl = 0xfb41bd6b|0
	    this._hl = 0x137e2179|0

	    this._len = this._s = 0

	    return this
	  }

	  function S (X, Xl, n) {
	    return (X >>> n) | (Xl << (32 - n))
	  }

	  function Ch (x, y, z) {
	    return ((x & y) ^ ((~x) & z));
	  }

	  function Maj (x, y, z) {
	    return ((x & y) ^ (x & z) ^ (y & z));
	  }

	  Sha512.prototype._update = function(M) {

	    var W = this._w
	    var a, b, c, d, e, f, g, h
	    var al, bl, cl, dl, el, fl, gl, hl

	    a = this._a | 0
	    b = this._b | 0
	    c = this._c | 0
	    d = this._d | 0
	    e = this._e | 0
	    f = this._f | 0
	    g = this._g | 0
	    h = this._h | 0

	    al = this._al | 0
	    bl = this._bl | 0
	    cl = this._cl | 0
	    dl = this._dl | 0
	    el = this._el | 0
	    fl = this._fl | 0
	    gl = this._gl | 0
	    hl = this._hl | 0

	    for (var i = 0; i < 80; i++) {
	      var j = i * 2

	      var Wi, Wil

	      if (i < 16) {
	        Wi = W[j] = M.readInt32BE(j * 4)
	        Wil = W[j + 1] = M.readInt32BE(j * 4 + 4)

	      } else {
	        var x  = W[j - 15*2]
	        var xl = W[j - 15*2 + 1]
	        var gamma0  = S(x, xl, 1) ^ S(x, xl, 8) ^ (x >>> 7)
	        var gamma0l = S(xl, x, 1) ^ S(xl, x, 8) ^ S(xl, x, 7)

	        x  = W[j - 2*2]
	        xl = W[j - 2*2 + 1]
	        var gamma1  = S(x, xl, 19) ^ S(xl, x, 29) ^ (x >>> 6)
	        var gamma1l = S(xl, x, 19) ^ S(x, xl, 29) ^ S(xl, x, 6)

	        // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
	        var Wi7  = W[j - 7*2]
	        var Wi7l = W[j - 7*2 + 1]

	        var Wi16  = W[j - 16*2]
	        var Wi16l = W[j - 16*2 + 1]

	        Wil = gamma0l + Wi7l
	        Wi  = gamma0  + Wi7 + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0)
	        Wil = Wil + gamma1l
	        Wi  = Wi  + gamma1  + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0)
	        Wil = Wil + Wi16l
	        Wi  = Wi  + Wi16 + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0)

	        W[j] = Wi
	        W[j + 1] = Wil
	      }

	      var maj = Maj(a, b, c)
	      var majl = Maj(al, bl, cl)

	      var sigma0h = S(a, al, 28) ^ S(al, a, 2) ^ S(al, a, 7)
	      var sigma0l = S(al, a, 28) ^ S(a, al, 2) ^ S(a, al, 7)
	      var sigma1h = S(e, el, 14) ^ S(e, el, 18) ^ S(el, e, 9)
	      var sigma1l = S(el, e, 14) ^ S(el, e, 18) ^ S(e, el, 9)

	      // t1 = h + sigma1 + ch + K[i] + W[i]
	      var Ki = K[j]
	      var Kil = K[j + 1]

	      var ch = Ch(e, f, g)
	      var chl = Ch(el, fl, gl)

	      var t1l = hl + sigma1l
	      var t1 = h + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0)
	      t1l = t1l + chl
	      t1 = t1 + ch + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0)
	      t1l = t1l + Kil
	      t1 = t1 + Ki + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0)
	      t1l = t1l + Wil
	      t1 = t1 + Wi + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0)

	      // t2 = sigma0 + maj
	      var t2l = sigma0l + majl
	      var t2 = sigma0h + maj + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0)

	      h  = g
	      hl = gl
	      g  = f
	      gl = fl
	      f  = e
	      fl = el
	      el = (dl + t1l) | 0
	      e  = (d + t1 + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
	      d  = c
	      dl = cl
	      c  = b
	      cl = bl
	      b  = a
	      bl = al
	      al = (t1l + t2l) | 0
	      a  = (t1 + t2 + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0
	    }

	    this._al = (this._al + al) | 0
	    this._bl = (this._bl + bl) | 0
	    this._cl = (this._cl + cl) | 0
	    this._dl = (this._dl + dl) | 0
	    this._el = (this._el + el) | 0
	    this._fl = (this._fl + fl) | 0
	    this._gl = (this._gl + gl) | 0
	    this._hl = (this._hl + hl) | 0

	    this._a = (this._a + a + ((this._al >>> 0) < (al >>> 0) ? 1 : 0)) | 0
	    this._b = (this._b + b + ((this._bl >>> 0) < (bl >>> 0) ? 1 : 0)) | 0
	    this._c = (this._c + c + ((this._cl >>> 0) < (cl >>> 0) ? 1 : 0)) | 0
	    this._d = (this._d + d + ((this._dl >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
	    this._e = (this._e + e + ((this._el >>> 0) < (el >>> 0) ? 1 : 0)) | 0
	    this._f = (this._f + f + ((this._fl >>> 0) < (fl >>> 0) ? 1 : 0)) | 0
	    this._g = (this._g + g + ((this._gl >>> 0) < (gl >>> 0) ? 1 : 0)) | 0
	    this._h = (this._h + h + ((this._hl >>> 0) < (hl >>> 0) ? 1 : 0)) | 0
	  }

	  Sha512.prototype._hash = function () {
	    var H = new Buffer(64)

	    function writeInt64BE(h, l, offset) {
	      H.writeInt32BE(h, offset)
	      H.writeInt32BE(l, offset + 4)
	    }

	    writeInt64BE(this._a, this._al, 0)
	    writeInt64BE(this._b, this._bl, 8)
	    writeInt64BE(this._c, this._cl, 16)
	    writeInt64BE(this._d, this._dl, 24)
	    writeInt64BE(this._e, this._el, 32)
	    writeInt64BE(this._f, this._fl, 40)
	    writeInt64BE(this._g, this._gl, 48)
	    writeInt64BE(this._h, this._hl, 56)

	    return H
	  }

	  return Sha512

	}


/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var config = __webpack_require__(164).config;
	var configure = __webpack_require__(164).configure;
	var objectOrFunction = __webpack_require__(165).objectOrFunction;
	var isFunction = __webpack_require__(165).isFunction;
	var now = __webpack_require__(165).now;
	var all = __webpack_require__(166).all;
	var race = __webpack_require__(167).race;
	var staticResolve = __webpack_require__(168).resolve;
	var staticReject = __webpack_require__(169).reject;
	var asap = __webpack_require__(170).asap;

	var counter = 0;

	config.async = asap; // default async is asap;

	function Promise(resolver) {
	  if (!isFunction(resolver)) {
	    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
	  }

	  if (!(this instanceof Promise)) {
	    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
	  }

	  this._subscribers = [];

	  invokeResolver(resolver, this);
	}

	function invokeResolver(resolver, promise) {
	  function resolvePromise(value) {
	    resolve(promise, value);
	  }

	  function rejectPromise(reason) {
	    reject(promise, reason);
	  }

	  try {
	    resolver(resolvePromise, rejectPromise);
	  } catch(e) {
	    rejectPromise(e);
	  }
	}

	function invokeCallback(settled, promise, callback, detail) {
	  var hasCallback = isFunction(callback),
	      value, error, succeeded, failed;

	  if (hasCallback) {
	    try {
	      value = callback(detail);
	      succeeded = true;
	    } catch(e) {
	      failed = true;
	      error = e;
	    }
	  } else {
	    value = detail;
	    succeeded = true;
	  }

	  if (handleThenable(promise, value)) {
	    return;
	  } else if (hasCallback && succeeded) {
	    resolve(promise, value);
	  } else if (failed) {
	    reject(promise, error);
	  } else if (settled === FULFILLED) {
	    resolve(promise, value);
	  } else if (settled === REJECTED) {
	    reject(promise, value);
	  }
	}

	var PENDING   = void 0;
	var SEALED    = 0;
	var FULFILLED = 1;
	var REJECTED  = 2;

	function subscribe(parent, child, onFulfillment, onRejection) {
	  var subscribers = parent._subscribers;
	  var length = subscribers.length;

	  subscribers[length] = child;
	  subscribers[length + FULFILLED] = onFulfillment;
	  subscribers[length + REJECTED]  = onRejection;
	}

	function publish(promise, settled) {
	  var child, callback, subscribers = promise._subscribers, detail = promise._detail;

	  for (var i = 0; i < subscribers.length; i += 3) {
	    child = subscribers[i];
	    callback = subscribers[i + settled];

	    invokeCallback(settled, child, callback, detail);
	  }

	  promise._subscribers = null;
	}

	Promise.prototype = {
	  constructor: Promise,

	  _state: undefined,
	  _detail: undefined,
	  _subscribers: undefined,

	  then: function(onFulfillment, onRejection) {
	    var promise = this;

	    var thenPromise = new this.constructor(function() {});

	    if (this._state) {
	      var callbacks = arguments;
	      config.async(function invokePromiseCallback() {
	        invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
	      });
	    } else {
	      subscribe(this, thenPromise, onFulfillment, onRejection);
	    }

	    return thenPromise;
	  },

	  'catch': function(onRejection) {
	    return this.then(null, onRejection);
	  }
	};

	Promise.all = all;
	Promise.race = race;
	Promise.resolve = staticResolve;
	Promise.reject = staticReject;

	function handleThenable(promise, value) {
	  var then = null,
	  resolved;

	  try {
	    if (promise === value) {
	      throw new TypeError("A promises callback cannot return that same promise.");
	    }

	    if (objectOrFunction(value)) {
	      then = value.then;

	      if (isFunction(then)) {
	        then.call(value, function(val) {
	          if (resolved) { return true; }
	          resolved = true;

	          if (value !== val) {
	            resolve(promise, val);
	          } else {
	            fulfill(promise, val);
	          }
	        }, function(val) {
	          if (resolved) { return true; }
	          resolved = true;

	          reject(promise, val);
	        });

	        return true;
	      }
	    }
	  } catch (error) {
	    if (resolved) { return true; }
	    reject(promise, error);
	    return true;
	  }

	  return false;
	}

	function resolve(promise, value) {
	  if (promise === value) {
	    fulfill(promise, value);
	  } else if (!handleThenable(promise, value)) {
	    fulfill(promise, value);
	  }
	}

	function fulfill(promise, value) {
	  if (promise._state !== PENDING) { return; }
	  promise._state = SEALED;
	  promise._detail = value;

	  config.async(publishFulfillment, promise);
	}

	function reject(promise, reason) {
	  if (promise._state !== PENDING) { return; }
	  promise._state = SEALED;
	  promise._detail = reason;

	  config.async(publishRejection, promise);
	}

	function publishFulfillment(promise) {
	  publish(promise, promise._state = FULFILLED);
	}

	function publishRejection(promise) {
	  publish(promise, promise._state = REJECTED);
	}

	exports.Promise = Promise;

/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {"use strict";
	/*global self*/
	var RSVPPromise = __webpack_require__(139).Promise;
	var isFunction = __webpack_require__(165).isFunction;

	function polyfill() {
	  var local;

	  if (typeof global !== 'undefined') {
	    local = global;
	  } else if (typeof window !== 'undefined' && window.document) {
	    local = window;
	  } else {
	    local = self;
	  }

	  var es6PromiseSupport = 
	    "Promise" in local &&
	    // Some of these methods are missing from
	    // Firefox/Chrome experimental implementations
	    "resolve" in local.Promise &&
	    "reject" in local.Promise &&
	    "all" in local.Promise &&
	    "race" in local.Promise &&
	    // Older version of the spec had a resolver object
	    // as the arg rather than a function
	    (function() {
	      var resolve;
	      new local.Promise(function(r) { resolve = r; });
	      return isFunction(resolve);
	    }());

	  if (!es6PromiseSupport) {
	    local.Promise = RSVPPromise;
	  }
	}

	exports.polyfill = polyfill;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 141 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;

	/*<replacement>*/
	var Buffer = __webpack_require__(47).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(178);
	util.inherits = __webpack_require__(177);
	/*</replacement>*/

	var Stream = __webpack_require__(64);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  var Duplex = __webpack_require__(142);

	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;
	}

	function Writable(options) {
	  var Duplex = __webpack_require__(142);

	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  process.nextTick(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    process.nextTick(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (!util.isFunction(cb))
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function() {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function() {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing &&
	        !state.corked &&
	        !state.finished &&
	        !state.bufferProcessing &&
	        state.buffer.length)
	      clearBuffer(this, state);
	  }
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      util.isString(chunk)) {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret)
	    state.needDrain = true;

	  if (state.writing || state.corked)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, false, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev)
	    stream._writev(chunk, state.onwrite);
	  else
	    stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    process.nextTick(function() {
	      state.pendingcb--;
	      cb(er);
	    });
	  else {
	    state.pendingcb--;
	    cb(er);
	  }

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished &&
	        !state.corked &&
	        !state.bufferProcessing &&
	        state.buffer.length) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      process.nextTick(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  if (stream._writev && state.buffer.length > 1) {
	    // Fast case, write everything using _writev()
	    var cbs = [];
	    for (var c = 0; c < state.buffer.length; c++)
	      cbs.push(state.buffer[c].callback);

	    // count the one we are adding, as well.
	    // TODO(isaacs) clean this up
	    state.pendingcb++;
	    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
	      for (var i = 0; i < cbs.length; i++) {
	        state.pendingcb--;
	        cbs[i](err);
	      }
	    });

	    // Clear buffer
	    state.buffer = [];
	  } else {
	    // Slow case, write chunks one-by-one
	    for (var c = 0; c < state.buffer.length; c++) {
	      var entry = state.buffer[c];
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);

	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        c++;
	        break;
	      }
	    }

	    if (c < state.buffer.length)
	      state.buffer = state.buffer.slice(c);
	    else
	      state.buffer.length = 0;
	  }

	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));

	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (util.isFunction(chunk)) {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (!util.isNullOrUndefined(chunk))
	    this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else
	      prefinish(stream, state);
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      process.nextTick(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 142 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	/*</replacement>*/


	/*<replacement>*/
	var util = __webpack_require__(178);
	util.inherits = __webpack_require__(177);
	/*</replacement>*/

	var Readable = __webpack_require__(143);
	var Writable = __webpack_require__(141);

	util.inherits(Duplex, Readable);

	forEach(objectKeys(Writable.prototype), function(method) {
	  if (!Duplex.prototype[method])
	    Duplex.prototype[method] = Writable.prototype[method];
	});

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process.nextTick(this.end.bind(this));
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 143 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;

	/*<replacement>*/
	var isArray = __webpack_require__(175);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(47).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(44).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(64);

	/*<replacement>*/
	var util = __webpack_require__(178);
	util.inherits = __webpack_require__(177);
	/*</replacement>*/

	var StringDecoder;


	/*<replacement>*/
	var debug = __webpack_require__(171);
	if (debug && debug.debuglog) {
	  debug = debug.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/


	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  var Duplex = __webpack_require__(142);

	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = __webpack_require__(176).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  var Duplex = __webpack_require__(142);

	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (util.isString(chunk) && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (util.isNullOrUndefined(chunk)) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      if (!addToFront)
	        state.reading = false;

	      // if we want the data now, just emit it.
	      if (state.flowing && state.length === 0 && !state.sync) {
	        stream.emit('data', chunk);
	        stream.read(0);
	      } else {
	        // update the buffer info.
	        state.length += state.objectMode ? 1 : chunk.length;
	        if (addToFront)
	          state.buffer.unshift(chunk);
	        else
	          state.buffer.push(chunk);

	        if (state.needReadable)
	          emitReadable(stream);
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = __webpack_require__(176).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (isNaN(n) || util.isNull(n)) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  debug('read', n);
	  var state = this._readableState;
	  var nOrig = n;

	  if (!util.isNumber(n) || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended)
	      endReadable(this);
	    else
	      emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0)
	      endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  }

	  if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read pushed data synchronously, then `reading` will be false,
	  // and we need to re-evaluate how much data we can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  var ret;
	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (util.isNull(ret)) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we tried to read() past the EOF, then emit end on the next tick.
	  if (nOrig !== n && state.ended && state.length === 0)
	    endReadable(this);

	  if (!util.isNull(ret))
	    this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync)
	      process.nextTick(function() {
	        emitReadable_(stream);
	      });
	    else
	      emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process.nextTick(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    process.nextTick(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain &&
	        (!dest._writableState || dest._writableState.needDrain))
	      ondrain();
	  }

	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    var ret = dest.write(chunk);
	    if (false === ret) {
	      debug('false write response, pause',
	            src._readableState.awaitDrain);
	      src._readableState.awaitDrain++;
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  // This is a brutally ugly hack to make sure that our error handler
	  // is attached before any userland ones.  NEVER DO THIS.
	  if (!dest._events || !dest._events.error)
	    dest.on('error', onerror);
	  else if (isArray(dest._events.error))
	    dest._events.error.unshift(onerror);
	  else
	    dest._events.error = [onerror, dest._events.error];



	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain)
	      state.awaitDrain--;
	    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  // If listening to data, and it has not explicitly been paused,
	  // then call resume to start the flow of data on the next tick.
	  if (ev === 'data' && false !== this._readableState.flowing) {
	    this.resume();
	  }

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        var self = this;
	        process.nextTick(function() {
	          debug('readable nexttick read 0');
	          self.read(0);
	        });
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    if (!state.reading) {
	      debug('resume read 0');
	      this.read(0);
	    }
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    process.nextTick(function() {
	      resume_(stream, state);
	    });
	  }
	}

	function resume_(stream, state) {
	  state.resumeScheduled = false;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading)
	    stream.read(0);
	}

	Readable.prototype.pause = function() {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  if (state.flowing) {
	    do {
	      var chunk = stream.read();
	    } while (null !== chunk && state.flowing);
	  }
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    debug('wrapped data');
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);
	    if (!chunk || !state.objectMode && !chunk.length)
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    process.nextTick(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 144 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.


	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = __webpack_require__(142);

	/*<replacement>*/
	var util = __webpack_require__(178);
	util.inherits = __webpack_require__(177);
	/*</replacement>*/

	util.inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (!util.isNullOrUndefined(data))
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('prefinish', function() {
	    if (util.isFunction(this._flush))
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}


/***/ },
/* 145 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	module.exports = PassThrough;

	var Transform = __webpack_require__(144);

	/*<replacement>*/
	var util = __webpack_require__(178);
	util.inherits = __webpack_require__(177);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough))
	    return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function(chunk, encoding, cb) {
	  cb(null, chunk);
	};


/***/ },
/* 146 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 147 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var uint_max = Math.pow(2, 32);
	function fixup_uint32(x) {
	    var ret, x_pos;
	    ret = x > uint_max || x < 0 ? (x_pos = Math.abs(x) % uint_max, x < 0 ? uint_max - x_pos : x_pos) : x;
	    return ret;
	}
	function scrub_vec(v) {
	  var i, _i, _ref;
	  for (i = _i = 0, _ref = v.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
	    v[i] = 0;
	  }
	  return false;
	}

	function Global() {
	  var i;
	  this.SBOX = [];
	  this.INV_SBOX = [];
	  this.SUB_MIX = (function() {
	    var _i, _results;
	    _results = [];
	    for (i = _i = 0; _i < 4; i = ++_i) {
	      _results.push([]);
	    }
	    return _results;
	  })();
	  this.INV_SUB_MIX = (function() {
	    var _i, _results;
	    _results = [];
	    for (i = _i = 0; _i < 4; i = ++_i) {
	      _results.push([]);
	    }
	    return _results;
	  })();
	  this.init();
	  this.RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
	}

	Global.prototype.init = function() {
	  var d, i, sx, t, x, x2, x4, x8, xi, _i;
	  d = (function() {
	    var _i, _results;
	    _results = [];
	    for (i = _i = 0; _i < 256; i = ++_i) {
	      if (i < 128) {
	        _results.push(i << 1);
	      } else {
	        _results.push((i << 1) ^ 0x11b);
	      }
	    }
	    return _results;
	  })();
	  x = 0;
	  xi = 0;
	  for (i = _i = 0; _i < 256; i = ++_i) {
	    sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
	    sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
	    this.SBOX[x] = sx;
	    this.INV_SBOX[sx] = x;
	    x2 = d[x];
	    x4 = d[x2];
	    x8 = d[x4];
	    t = (d[sx] * 0x101) ^ (sx * 0x1010100);
	    this.SUB_MIX[0][x] = (t << 24) | (t >>> 8);
	    this.SUB_MIX[1][x] = (t << 16) | (t >>> 16);
	    this.SUB_MIX[2][x] = (t << 8) | (t >>> 24);
	    this.SUB_MIX[3][x] = t;
	    t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
	    this.INV_SUB_MIX[0][sx] = (t << 24) | (t >>> 8);
	    this.INV_SUB_MIX[1][sx] = (t << 16) | (t >>> 16);
	    this.INV_SUB_MIX[2][sx] = (t << 8) | (t >>> 24);
	    this.INV_SUB_MIX[3][sx] = t;
	    if (x === 0) {
	      x = xi = 1;
	    } else {
	      x = x2 ^ d[d[d[x8 ^ x2]]];
	      xi ^= d[d[xi]];
	    }
	  }
	  return true;
	};

	var G = new Global();


	AES.blockSize = 4 * 4;

	AES.prototype.blockSize = AES.blockSize;

	AES.keySize = 256 / 8;

	AES.prototype.keySize = AES.keySize;

	AES.ivSize = AES.blockSize;

	AES.prototype.ivSize = AES.ivSize;

	 function bufferToArray(buf) {
	  var len = buf.length/4;
	  var out = new Array(len);
	  var i = -1;
	  while (++i < len) {
	    out[i] = buf.readUInt32BE(i * 4);
	  }
	  return out;
	 }
	function AES(key) {
	  this._key = bufferToArray(key);
	  this._doReset();
	}

	AES.prototype._doReset = function() {
	  var invKsRow, keySize, keyWords, ksRow, ksRows, t, _i, _j;
	  keyWords = this._key;
	  keySize = keyWords.length;
	  this._nRounds = keySize + 6;
	  ksRows = (this._nRounds + 1) * 4;
	  this._keySchedule = [];
	  for (ksRow = _i = 0; 0 <= ksRows ? _i < ksRows : _i > ksRows; ksRow = 0 <= ksRows ? ++_i : --_i) {
	    this._keySchedule[ksRow] = ksRow < keySize ? keyWords[ksRow] : (t = this._keySchedule[ksRow - 1], (ksRow % keySize) === 0 ? (t = (t << 8) | (t >>> 24), t = (G.SBOX[t >>> 24] << 24) | (G.SBOX[(t >>> 16) & 0xff] << 16) | (G.SBOX[(t >>> 8) & 0xff] << 8) | G.SBOX[t & 0xff], t ^= G.RCON[(ksRow / keySize) | 0] << 24) : keySize > 6 && ksRow % keySize === 4 ? t = (G.SBOX[t >>> 24] << 24) | (G.SBOX[(t >>> 16) & 0xff] << 16) | (G.SBOX[(t >>> 8) & 0xff] << 8) | G.SBOX[t & 0xff] : void 0, this._keySchedule[ksRow - keySize] ^ t);
	  }
	  this._invKeySchedule = [];
	  for (invKsRow = _j = 0; 0 <= ksRows ? _j < ksRows : _j > ksRows; invKsRow = 0 <= ksRows ? ++_j : --_j) {
	    ksRow = ksRows - invKsRow;
	    t = this._keySchedule[ksRow - (invKsRow % 4 ? 0 : 4)];
	    this._invKeySchedule[invKsRow] = invKsRow < 4 || ksRow <= 4 ? t : G.INV_SUB_MIX[0][G.SBOX[t >>> 24]] ^ G.INV_SUB_MIX[1][G.SBOX[(t >>> 16) & 0xff]] ^ G.INV_SUB_MIX[2][G.SBOX[(t >>> 8) & 0xff]] ^ G.INV_SUB_MIX[3][G.SBOX[t & 0xff]];
	  }
	  return true;
	};

	AES.prototype.encryptBlock = function(M) {
	  M = bufferToArray(new Buffer(M));
	  var out = this._doCryptBlock(M, this._keySchedule, G.SUB_MIX, G.SBOX);
	  var buf = new Buffer(16);
	  buf.writeUInt32BE(out[0], 0);
	  buf.writeUInt32BE(out[1], 4);
	  buf.writeUInt32BE(out[2], 8);
	  buf.writeUInt32BE(out[3], 12);
	  return buf;
	};

	AES.prototype.decryptBlock = function(M) {
	  M = bufferToArray(new Buffer(M));
	  var temp = [M[3], M[1]];
	  M[1] = temp[0];
	  M[3] = temp[1];
	  var out = this._doCryptBlock(M, this._invKeySchedule, G.INV_SUB_MIX, G.INV_SBOX);
	  var buf = new Buffer(16);
	  buf.writeUInt32BE(out[0], 0);
	  buf.writeUInt32BE(out[3], 4);
	  buf.writeUInt32BE(out[2], 8);
	  buf.writeUInt32BE(out[1], 12);
	  return buf;
	};

	AES.prototype.scrub = function() {
	  scrub_vec(this._keySchedule);
	  scrub_vec(this._invKeySchedule);
	  scrub_vec(this._key);
	};

	AES.prototype._doCryptBlock = function(M, keySchedule, SUB_MIX, SBOX) {
	  var ksRow, round, s0, s1, s2, s3, t0, t1, t2, t3, _i, _ref;

	  s0 = M[0] ^ keySchedule[0];
	  s1 = M[1] ^ keySchedule[1];
	  s2 = M[2] ^ keySchedule[2];
	  s3 = M[3] ^ keySchedule[3];
	  ksRow = 4;
	  for (round = _i = 1, _ref = this._nRounds; 1 <= _ref ? _i < _ref : _i > _ref; round = 1 <= _ref ? ++_i : --_i) {
	    t0 = SUB_MIX[0][s0 >>> 24] ^ SUB_MIX[1][(s1 >>> 16) & 0xff] ^ SUB_MIX[2][(s2 >>> 8) & 0xff] ^ SUB_MIX[3][s3 & 0xff] ^ keySchedule[ksRow++];
	    t1 = SUB_MIX[0][s1 >>> 24] ^ SUB_MIX[1][(s2 >>> 16) & 0xff] ^ SUB_MIX[2][(s3 >>> 8) & 0xff] ^ SUB_MIX[3][s0 & 0xff] ^ keySchedule[ksRow++];
	    t2 = SUB_MIX[0][s2 >>> 24] ^ SUB_MIX[1][(s3 >>> 16) & 0xff] ^ SUB_MIX[2][(s0 >>> 8) & 0xff] ^ SUB_MIX[3][s1 & 0xff] ^ keySchedule[ksRow++];
	    t3 = SUB_MIX[0][s3 >>> 24] ^ SUB_MIX[1][(s0 >>> 16) & 0xff] ^ SUB_MIX[2][(s1 >>> 8) & 0xff] ^ SUB_MIX[3][s2 & 0xff] ^ keySchedule[ksRow++];
	    s0 = t0;
	    s1 = t1;
	    s2 = t2;
	    s3 = t3;
	  }
	  t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
	  t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
	  t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
	  t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];
	  return [
	    fixup_uint32(t0),
	    fixup_uint32(t1),
	    fixup_uint32(t2),
	    fixup_uint32(t3)
	  ];

	};




	  exports.AES = AES;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 148 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var Transform = __webpack_require__(64).Transform;
	var inherits = __webpack_require__(173);

	module.exports = CipherBase;
	inherits(CipherBase, Transform);
	function CipherBase() {
	  Transform.call(this);
	}
	CipherBase.prototype.update = function (data, inputEnd, outputEnc) {
	  this.write(data, inputEnd);
	  var outData = new Buffer('');
	  var chunk;
	  while ((chunk = this.read())) {
	    outData = Buffer.concat([outData, chunk]);
	  }
	  if (outputEnc) {
	    outData = outData.toString(outputEnc);
	  }
	  return outData;
	};
	CipherBase.prototype.final = function (outputEnc) {
	  this.end();
	  var outData = new Buffer('');
	  var chunk;
	  while ((chunk = this.read())) {
	    outData = Buffer.concat([outData, chunk]);
	  }
	  if (outputEnc) {
	    outData = outData.toString(outputEnc);
	  }
	  return outData;
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 149 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {
	module.exports = function (crypto, password, keyLen, ivLen) {
	  keyLen = keyLen/8;
	  ivLen = ivLen || 0;
	  var ki = 0;
	  var ii = 0;
	  var key = new Buffer(keyLen);
	  var iv = new Buffer(ivLen);
	  var addmd = 0;
	  var md, md_buf;
	  var i;
	  while (true) {
	    md = crypto.createHash('md5');
	    if(addmd++ > 0) {
	       md.update(md_buf);
	    }
	    md.update(password);
	    md_buf = md.digest();
	    i = 0;
	    if(keyLen > 0) {
	      while(true) {
	        if(keyLen === 0) {
	          break;
	        }
	        if(i === md_buf.length) {
	          break;
	        }
	        key[ki++] = md_buf[i];
	        keyLen--;
	        i++;
	       }
	    }
	    if(ivLen > 0 && i !== md_buf.length) {
	      while(true) {
	        if(ivLen === 0) {
	          break;
	        }
	        if(i === md_buf.length) {
	          break;
	        }
	       iv[ii++] = md_buf[i];
	       ivLen--;
	       i++;
	     }
	   }
	   if(keyLen === 0 && ivLen === 0) {
	      break;
	    }
	  }
	  for(i=0;i<md_buf.length;i++) {
	    md_buf[i] = 0;
	  }
	  return {
	    key: key,
	    iv: iv
	  };
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 150 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var aes = __webpack_require__(147);
	var Transform = __webpack_require__(148);
	var inherits = __webpack_require__(173);

	inherits(StreamCipher, Transform);
	module.exports = StreamCipher;
	function StreamCipher(mode, key, iv, decrypt) {
	  if (!(this instanceof StreamCipher)) {
	    return new StreamCipher(mode, key, iv);
	  }
	  Transform.call(this);
	  this._cipher = new aes.AES(key);
	  this._prev = new Buffer(iv.length);
	  this._cache = new Buffer('');
	  this._secCache = new Buffer('');
	  this._decrypt = decrypt;
	  iv.copy(this._prev);
	  this._mode = mode;
	}
	StreamCipher.prototype._transform = function (chunk, _, next) {
	  next(null, this._mode.encrypt(this, chunk, this._decrypt));
	};
	StreamCipher.prototype._flush = function (next) {
	  this._cipher.scrub();
	  next();
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 151 */
/***/ function(module, exports, __webpack_require__) {

	exports.encrypt = function (self, block) {
	  return self._cipher.encryptBlock(block);
	};
	exports.decrypt = function (self, block) {
	  return self._cipher.decryptBlock(block);
	};

/***/ },
/* 152 */
/***/ function(module, exports, __webpack_require__) {

	var xor = __webpack_require__(172);
	exports.encrypt = function (self, block) {
	  var data = xor(block, self._prev);
	  self._prev = self._cipher.encryptBlock(data);
	  return self._prev;
	};
	exports.decrypt = function (self, block) {
	  var pad = self._prev;
	  self._prev = block;
	  var out = self._cipher.decryptBlock(block);
	  return xor(out, pad);
	};

/***/ },
/* 153 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var xor = __webpack_require__(172);
	exports.encrypt = function (self, data, decrypt) {
	  var out = new Buffer('');
	  var len;
	  while (data.length) {
	    if (self._cache.length === 0) {
	      self._cache = self._cipher.encryptBlock(self._prev);
	      self._prev = new Buffer('');
	    }
	    if (self._cache.length <= data.length) {
	      len = self._cache.length;
	      out = Buffer.concat([out, encryptStart(self, data.slice(0, len), decrypt)]);
	      data = data.slice(len);
	    } else {
	      out = Buffer.concat([out, encryptStart(self, data, decrypt)]);
	      break;
	    }
	  }
	  return out;
	};
	function encryptStart(self, data, decrypt) {
	  var len = data.length;
	  var out = xor(data, self._cache);
	  self._cache = self._cache.slice(len);
	  self._prev = Buffer.concat([self._prev, decrypt?data:out]);
	  return out;
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 154 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var xor = __webpack_require__(172);
	function getBlock(self) {
	  self._prev = self._cipher.encryptBlock(self._prev);
	  return self._prev;
	}
	exports.encrypt = function (self, chunk) {
	  while (self._cache.length < chunk.length) {
	    self._cache = Buffer.concat([self._cache, getBlock(self)]);
	  }
	  var pad = self._cache.slice(0, chunk.length);
	  self._cache = self._cache.slice(chunk.length);
	  return xor(chunk, pad);
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 155 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var xor = __webpack_require__(172);
	function getBlock(self) {
	  var out = self._cipher.encryptBlock(self._prev);
	  incr32(self._prev);
	  return out;
	}
	exports.encrypt = function (self, chunk) {
	  while (self._cache.length < chunk.length) {
	    self._cache = Buffer.concat([self._cache, getBlock(self)]);
	  }
	  var pad = self._cache.slice(0, chunk.length);
	  self._cache = self._cache.slice(chunk.length);
	  return xor(chunk, pad);
	};
	function incr32(iv) {
	  var len = iv.length;
	  var item;
	  while (len--) {
	    item = iv.readUInt8(len);
	    if (item === 255) {
	      iv.writeUInt8(0, len);
	    } else {
	      item++;
	      iv.writeUInt8(item, len);
	      break;
	    }
	  }
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 156 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(174);

/***/ },
/* 157 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	var isES5 = (function(){
	    "use strict";
	    return this === void 0;
	})();

	if (isES5) {
	    module.exports = {
	        freeze: Object.freeze,
	        defineProperty: Object.defineProperty,
	        keys: Object.keys,
	        getPrototypeOf: Object.getPrototypeOf,
	        isArray: Array.isArray,
	        isES5: isES5
	    };
	}

	else {
	    var has = {}.hasOwnProperty;
	    var str = {}.toString;
	    var proto = {}.constructor.prototype;

	    var ObjectKeys = function ObjectKeys(o) {
	        var ret = [];
	        for (var key in o) {
	            if (has.call(o, key)) {
	                ret.push(key);
	            }
	        }
	        return ret;
	    }

	    var ObjectDefineProperty = function ObjectDefineProperty(o, key, desc) {
	        o[key] = desc.value;
	        return o;
	    }

	    var ObjectFreeze = function ObjectFreeze(obj) {
	        return obj;
	    }

	    var ObjectGetPrototypeOf = function ObjectGetPrototypeOf(obj) {
	        try {
	            return Object(obj).constructor.prototype;
	        }
	        catch (e) {
	            return proto;
	        }
	    }

	    var ArrayIsArray = function ArrayIsArray(obj) {
	        try {
	            return str.call(obj) === "[object Array]";
	        }
	        catch(e) {
	            return false;
	        }
	    }

	    module.exports = {
	        isArray: ArrayIsArray,
	        keys: ObjectKeys,
	        defineProperty: ObjectDefineProperty,
	        freeze: ObjectFreeze,
	        getPrototypeOf: ObjectGetPrototypeOf,
	        isES5: isES5
	    };
	}


/***/ },
/* 158 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	var global = __webpack_require__(107);
	var schedule;
	if (typeof process !== "undefined" && process !== null &&
	    typeof process.cwd === "function" &&
	    typeof process.nextTick === "function" &&
	    typeof process.version === "string") {
	    schedule = function Promise$_Scheduler(fn) {
	        process.nextTick(fn);
	    };
	}
	else if ((typeof global.MutationObserver === "function" ||
	        typeof global.WebkitMutationObserver === "function" ||
	        typeof global.WebKitMutationObserver === "function") &&
	        typeof document !== "undefined" &&
	        typeof document.createElement === "function") {


	    schedule = (function(){
	        var MutationObserver = global.MutationObserver ||
	            global.WebkitMutationObserver ||
	            global.WebKitMutationObserver;
	        var div = document.createElement("div");
	        var queuedFn = void 0;
	        var observer = new MutationObserver(
	            function Promise$_Scheduler() {
	                var fn = queuedFn;
	                queuedFn = void 0;
	                fn();
	            }
	       );
	        observer.observe(div, {
	            attributes: true
	        });
	        return function Promise$_Scheduler(fn) {
	            queuedFn = fn;
	            div.setAttribute("class", "foo");
	        };

	    })();
	}
	else if (typeof global.postMessage === "function" &&
	    typeof global.importScripts !== "function" &&
	    typeof global.addEventListener === "function" &&
	    typeof global.removeEventListener === "function") {

	    var MESSAGE_KEY = "bluebird_message_key_" + Math.random();
	    schedule = (function(){
	        var queuedFn = void 0;

	        function Promise$_Scheduler(e) {
	            if (e.source === global &&
	                e.data === MESSAGE_KEY) {
	                var fn = queuedFn;
	                queuedFn = void 0;
	                fn();
	            }
	        }

	        global.addEventListener("message", Promise$_Scheduler, false);

	        return function Promise$_Scheduler(fn) {
	            queuedFn = fn;
	            global.postMessage(
	                MESSAGE_KEY, "*"
	           );
	        };

	    })();
	}
	else if (typeof global.MessageChannel === "function") {
	    schedule = (function(){
	        var queuedFn = void 0;

	        var channel = new global.MessageChannel();
	        channel.port1.onmessage = function Promise$_Scheduler() {
	                var fn = queuedFn;
	                queuedFn = void 0;
	                fn();
	        };

	        return function Promise$_Scheduler(fn) {
	            queuedFn = fn;
	            channel.port2.postMessage(null);
	        };
	    })();
	}
	else if (global.setTimeout) {
	    schedule = function Promise$_Scheduler(fn) {
	        setTimeout(fn, 4);
	    };
	}
	else {
	    schedule = function Promise$_Scheduler(fn) {
	        fn();
	    };
	}

	module.exports = schedule;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 159 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	function arrayCopy(src, srcIndex, dst, dstIndex, len) {
	    for (var j = 0; j < len; ++j) {
	        dst[j + dstIndex] = src[j + srcIndex];
	    }
	}

	function pow2AtLeast(n) {
	    n = n >>> 0;
	    n = n - 1;
	    n = n | (n >> 1);
	    n = n | (n >> 2);
	    n = n | (n >> 4);
	    n = n | (n >> 8);
	    n = n | (n >> 16);
	    return n + 1;
	}

	function getCapacity(capacity) {
	    if (typeof capacity !== "number") return 16;
	    return pow2AtLeast(
	        Math.min(
	            Math.max(16, capacity), 1073741824)
	   );
	}

	function Queue(capacity) {
	    this._capacity = getCapacity(capacity);
	    this._length = 0;
	    this._front = 0;
	    this._makeCapacity();
	}

	Queue.prototype._willBeOverCapacity =
	function Queue$_willBeOverCapacity(size) {
	    return this._capacity < size;
	};

	Queue.prototype._pushOne = function Queue$_pushOne(arg) {
	    var length = this.length();
	    this._checkCapacity(length + 1);
	    var i = (this._front + length) & (this._capacity - 1);
	    this[i] = arg;
	    this._length = length + 1;
	};

	Queue.prototype.push = function Queue$push(fn, receiver, arg) {
	    var length = this.length() + 3;
	    if (this._willBeOverCapacity(length)) {
	        this._pushOne(fn);
	        this._pushOne(receiver);
	        this._pushOne(arg);
	        return;
	    }
	    var j = this._front + length - 3;
	    this._checkCapacity(length);
	    var wrapMask = this._capacity - 1;
	    this[(j + 0) & wrapMask] = fn;
	    this[(j + 1) & wrapMask] = receiver;
	    this[(j + 2) & wrapMask] = arg;
	    this._length = length;
	};

	Queue.prototype.shift = function Queue$shift() {
	    var front = this._front,
	        ret = this[front];

	    this[front] = void 0;
	    this._front = (front + 1) & (this._capacity - 1);
	    this._length--;
	    return ret;
	};

	Queue.prototype.length = function Queue$length() {
	    return this._length;
	};

	Queue.prototype._makeCapacity = function Queue$_makeCapacity() {
	    var len = this._capacity;
	    for (var i = 0; i < len; ++i) {
	        this[i] = void 0;
	    }
	};

	Queue.prototype._checkCapacity = function Queue$_checkCapacity(size) {
	    if (this._capacity < size) {
	        this._resizeTo(this._capacity << 3);
	    }
	};

	Queue.prototype._resizeTo = function Queue$_resizeTo(capacity) {
	    var oldFront = this._front;
	    var oldCapacity = this._capacity;
	    var oldQueue = new Array(oldCapacity);
	    var length = this.length();

	    arrayCopy(this, 0, oldQueue, 0, oldCapacity);
	    this._capacity = capacity;
	    this._makeCapacity();
	    this._front = 0;
	    if (oldFront + length <= oldCapacity) {
	        arrayCopy(oldQueue, oldFront, this, 0, length);
	    }
	    else {        var lengthBeforeWrapping =
	            length - ((oldFront + length) & (oldCapacity - 1));

	        arrayCopy(oldQueue, oldFront, this, 0, lengthBeforeWrapping);
	        arrayCopy(oldQueue, 0, this, lengthBeforeWrapping,
	                    length - lengthBeforeWrapping);
	    }
	};

	module.exports = Queue;


/***/ },
/* 160 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function (PromiseArray) {
	var util = __webpack_require__(108);
	var RangeError = __webpack_require__(110).RangeError;
	var inherits = util.inherits;
	var isArray = util.isArray;

	function SomePromiseArray(values, boundTo) {
	    this.constructor$(values, boundTo);
	    this._howMany = 0;
	    this._unwrap = false;
	    this._initialized = false;
	}
	inherits(SomePromiseArray, PromiseArray);

	SomePromiseArray.prototype._init = function SomePromiseArray$_init() {
	    if (!this._initialized) {
	        return;
	    }
	    if (this._howMany === 0) {
	        this._resolve([]);
	        return;
	    }
	    this._init$(void 0, -2);
	    var isArrayResolved = isArray(this._values);
	    this._holes = isArrayResolved ? this._values.length - this.length() : 0;

	    if (!this._isResolved() &&
	        isArrayResolved &&
	        this._howMany > this._canPossiblyFulfill()) {
	        var message = "(Promise.some) input array contains less than " +
	                        this._howMany  + " promises";
	        this._reject(new RangeError(message));
	    }
	};

	SomePromiseArray.prototype.init = function SomePromiseArray$init() {
	    this._initialized = true;
	    this._init();
	};

	SomePromiseArray.prototype.setUnwrap = function SomePromiseArray$setUnwrap() {
	    this._unwrap = true;
	};

	SomePromiseArray.prototype.howMany = function SomePromiseArray$howMany() {
	    return this._howMany;
	};

	SomePromiseArray.prototype.setHowMany =
	function SomePromiseArray$setHowMany(count) {
	    if (this._isResolved()) return;
	    this._howMany = count;
	};

	SomePromiseArray.prototype._promiseFulfilled =
	function SomePromiseArray$_promiseFulfilled(value) {
	    if (this._isResolved()) return;
	    this._addFulfilled(value);
	    if (this._fulfilled() === this.howMany()) {
	        this._values.length = this.howMany();
	        if (this.howMany() === 1 && this._unwrap) {
	            this._resolve(this._values[0]);
	        }
	        else {
	            this._resolve(this._values);
	        }
	    }

	};
	SomePromiseArray.prototype._promiseRejected =
	function SomePromiseArray$_promiseRejected(reason) {
	    if (this._isResolved()) return;
	    this._addRejected(reason);
	    if (this.howMany() > this._canPossiblyFulfill()) {
	        if (this._values.length === this.length()) {
	            this._reject([]);
	        }
	        else {
	            this._reject(this._values.slice(this.length() + this._holes));
	        }
	    }
	};

	SomePromiseArray.prototype._fulfilled = function SomePromiseArray$_fulfilled() {
	    return this._totalResolved;
	};

	SomePromiseArray.prototype._rejected = function SomePromiseArray$_rejected() {
	    return this._values.length - this.length() - this._holes;
	};

	SomePromiseArray.prototype._addRejected =
	function SomePromiseArray$_addRejected(reason) {
	    this._values.push(reason);
	};

	SomePromiseArray.prototype._addFulfilled =
	function SomePromiseArray$_addFulfilled(value) {
	    this._values[this._totalResolved++] = value;
	};

	SomePromiseArray.prototype._canPossiblyFulfill =
	function SomePromiseArray$_canPossiblyFulfill() {
	    return this.length() - this._rejected();
	};

	return SomePromiseArray;
	};


/***/ },
/* 161 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, INTERNAL) {
	var errors = __webpack_require__(110);
	var TypeError = errors.TypeError;
	var util = __webpack_require__(108);
	var isArray = util.isArray;
	var errorObj = util.errorObj;
	var tryCatch1 = util.tryCatch1;
	var yieldHandlers = [];

	function promiseFromYieldHandler(value) {
	    var _yieldHandlers = yieldHandlers;
	    var _errorObj = errorObj;
	    var _Promise = Promise;
	    var len = _yieldHandlers.length;
	    for (var i = 0; i < len; ++i) {
	        var result = tryCatch1(_yieldHandlers[i], void 0, value);
	        if (result === _errorObj) {
	            return _Promise.reject(_errorObj.e);
	        }
	        var maybePromise = _Promise._cast(result,
	            promiseFromYieldHandler, void 0);
	        if (maybePromise instanceof _Promise) return maybePromise;
	    }
	    return null;
	}

	function PromiseSpawn(generatorFunction, receiver) {
	    var promise = this._promise = new Promise(INTERNAL);
	    promise._setTrace(void 0);
	    this._generatorFunction = generatorFunction;
	    this._receiver = receiver;
	    this._generator = void 0;
	}

	PromiseSpawn.prototype.promise = function PromiseSpawn$promise() {
	    return this._promise;
	};

	PromiseSpawn.prototype._run = function PromiseSpawn$_run() {
	    this._generator = this._generatorFunction.call(this._receiver);
	    this._receiver =
	        this._generatorFunction = void 0;
	    this._next(void 0);
	};

	PromiseSpawn.prototype._continue = function PromiseSpawn$_continue(result) {
	    if (result === errorObj) {
	        this._generator = void 0;
	        var trace = errors.canAttach(result.e)
	            ? result.e : new Error(result.e + "");
	        this._promise._attachExtraTrace(trace);
	        this._promise._reject(result.e, trace);
	        return;
	    }

	    var value = result.value;
	    if (result.done === true) {
	        this._generator = void 0;
	        if (!this._promise._tryFollow(value)) {
	            this._promise._fulfill(value);
	        }
	    }
	    else {
	        var maybePromise = Promise._cast(value, PromiseSpawn$_continue, void 0);
	        if (!(maybePromise instanceof Promise)) {
	            if (isArray(maybePromise)) {
	                maybePromise = Promise.all(maybePromise);
	            }
	            else {
	                maybePromise = promiseFromYieldHandler(maybePromise);
	            }
	            if (maybePromise === null) {
	                this._throw(new TypeError("A value was yielded that could not be treated as a promise"));
	                return;
	            }
	        }
	        maybePromise._then(
	            this._next,
	            this._throw,
	            void 0,
	            this,
	            null
	       );
	    }
	};

	PromiseSpawn.prototype._throw = function PromiseSpawn$_throw(reason) {
	    if (errors.canAttach(reason))
	        this._promise._attachExtraTrace(reason);
	    this._continue(
	        tryCatch1(this._generator["throw"], this._generator, reason)
	   );
	};

	PromiseSpawn.prototype._next = function PromiseSpawn$_next(value) {
	    this._continue(
	        tryCatch1(this._generator.next, this._generator, value)
	   );
	};

	PromiseSpawn.addYieldHandler = function PromiseSpawn$AddYieldHandler(fn) {
	    if (typeof fn !== "function") throw new TypeError("fn must be a function");
	    yieldHandlers.push(fn);
	};

	return PromiseSpawn;
	};


/***/ },
/* 162 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, PromiseArray) {
	var util = __webpack_require__(108);
	var inherits = util.inherits;
	var es5 = __webpack_require__(157);

	function PropertiesPromiseArray(obj, boundTo) {
	    var keys = es5.keys(obj);
	    var values = new Array(keys.length);
	    for (var i = 0, len = values.length; i < len; ++i) {
	        values[i] = obj[keys[i]];
	    }
	    this.constructor$(values, boundTo);
	    if (!this._isResolved()) {
	        for (var i = 0, len = keys.length; i < len; ++i) {
	            values.push(keys[i]);
	        }
	    }
	}
	inherits(PropertiesPromiseArray, PromiseArray);

	PropertiesPromiseArray.prototype._init =
	function PropertiesPromiseArray$_init() {
	    this._init$(void 0, -3) ;
	};

	PropertiesPromiseArray.prototype._promiseFulfilled =
	function PropertiesPromiseArray$_promiseFulfilled(value, index) {
	    if (this._isResolved()) return;
	    this._values[index] = value;
	    var totalResolved = ++this._totalResolved;
	    if (totalResolved >= this._length) {
	        var val = {};
	        var keyOffset = this.length();
	        for (var i = 0, len = this.length(); i < len; ++i) {
	            val[this._values[i + keyOffset]] = this._values[i];
	        }
	        this._resolve(val);
	    }
	};

	PropertiesPromiseArray.prototype._promiseProgressed =
	function PropertiesPromiseArray$_promiseProgressed(value, index) {
	    if (this._isResolved()) return;

	    this._promise._progress({
	        key: this._values[index + this.length()],
	        value: value
	    });
	};

	PromiseArray.PropertiesPromiseArray = PropertiesPromiseArray;

	return PropertiesPromiseArray;
	};


/***/ },
/* 163 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014 Petka Antonov
	 * 
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:</p>
	 * 
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 * 
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 * 
	 */
	"use strict";
	module.exports = function(Promise, PromiseArray) {
	var PromiseInspection = Promise.PromiseInspection;
	var util = __webpack_require__(108);
	var inherits = util.inherits;
	function SettledPromiseArray(values, boundTo) {
	    this.constructor$(values, boundTo);
	}
	inherits(SettledPromiseArray, PromiseArray);

	SettledPromiseArray.prototype._promiseResolved =
	function SettledPromiseArray$_promiseResolved(index, inspection) {
	    this._values[index] = inspection;
	    var totalResolved = ++this._totalResolved;
	    if (totalResolved >= this._length) {
	        this._resolve(this._values);
	    }
	};

	SettledPromiseArray.prototype._promiseFulfilled =
	function SettledPromiseArray$_promiseFulfilled(value, index) {
	    if (this._isResolved()) return;
	    var ret = new PromiseInspection();
	    ret._bitField = 268435456;
	    ret._settledValue = value;
	    this._promiseResolved(index, ret);
	};
	SettledPromiseArray.prototype._promiseRejected =
	function SettledPromiseArray$_promiseRejected(reason, index) {
	    if (this._isResolved()) return;
	    var ret = new PromiseInspection();
	    ret._bitField = 134217728;
	    ret._settledValue = reason;
	    this._promiseResolved(index, ret);
	};

	return SettledPromiseArray;
	};


/***/ },
/* 164 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var config = {
	  instrument: false
	};

	function configure(name, value) {
	  if (arguments.length === 2) {
	    config[name] = value;
	  } else {
	    return config[name];
	  }
	}

	exports.config = config;
	exports.configure = configure;

/***/ },
/* 165 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	function objectOrFunction(x) {
	  return isFunction(x) || (typeof x === "object" && x !== null);
	}

	function isFunction(x) {
	  return typeof x === "function";
	}

	function isArray(x) {
	  return Object.prototype.toString.call(x) === "[object Array]";
	}

	// Date.now is not available in browsers < IE9
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
	var now = Date.now || function() { return new Date().getTime(); };


	exports.objectOrFunction = objectOrFunction;
	exports.isFunction = isFunction;
	exports.isArray = isArray;
	exports.now = now;

/***/ },
/* 166 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	/* global toString */

	var isArray = __webpack_require__(165).isArray;
	var isFunction = __webpack_require__(165).isFunction;

	/**
	  Returns a promise that is fulfilled when all the given promises have been
	  fulfilled, or rejected if any of them become rejected. The return promise
	  is fulfilled with an array that gives all the values in the order they were
	  passed in the `promises` array argument.

	  Example:

	  ```javascript
	  var promise1 = RSVP.resolve(1);
	  var promise2 = RSVP.resolve(2);
	  var promise3 = RSVP.resolve(3);
	  var promises = [ promise1, promise2, promise3 ];

	  RSVP.all(promises).then(function(array){
	    // The array here would be [ 1, 2, 3 ];
	  });
	  ```

	  If any of the `promises` given to `RSVP.all` are rejected, the first promise
	  that is rejected will be given as an argument to the returned promises's
	  rejection handler. For example:

	  Example:

	  ```javascript
	  var promise1 = RSVP.resolve(1);
	  var promise2 = RSVP.reject(new Error("2"));
	  var promise3 = RSVP.reject(new Error("3"));
	  var promises = [ promise1, promise2, promise3 ];

	  RSVP.all(promises).then(function(array){
	    // Code here never runs because there are rejected promises!
	  }, function(error) {
	    // error.message === "2"
	  });
	  ```

	  @method all
	  @for RSVP
	  @param {Array} promises
	  @param {String} label
	  @return {Promise} promise that is fulfilled when all `promises` have been
	  fulfilled, or rejected if any of them become rejected.
	*/
	function all(promises) {
	  /*jshint validthis:true */
	  var Promise = this;

	  if (!isArray(promises)) {
	    throw new TypeError('You must pass an array to all.');
	  }

	  return new Promise(function(resolve, reject) {
	    var results = [], remaining = promises.length,
	    promise;

	    if (remaining === 0) {
	      resolve([]);
	    }

	    function resolver(index) {
	      return function(value) {
	        resolveAll(index, value);
	      };
	    }

	    function resolveAll(index, value) {
	      results[index] = value;
	      if (--remaining === 0) {
	        resolve(results);
	      }
	    }

	    for (var i = 0; i < promises.length; i++) {
	      promise = promises[i];

	      if (promise && isFunction(promise.then)) {
	        promise.then(resolver(i), reject);
	      } else {
	        resolveAll(i, promise);
	      }
	    }
	  });
	}

	exports.all = all;

/***/ },
/* 167 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	/* global toString */
	var isArray = __webpack_require__(165).isArray;

	/**
	  `RSVP.race` allows you to watch a series of promises and act as soon as the
	  first promise given to the `promises` argument fulfills or rejects.

	  Example:

	  ```javascript
	  var promise1 = new RSVP.Promise(function(resolve, reject){
	    setTimeout(function(){
	      resolve("promise 1");
	    }, 200);
	  });

	  var promise2 = new RSVP.Promise(function(resolve, reject){
	    setTimeout(function(){
	      resolve("promise 2");
	    }, 100);
	  });

	  RSVP.race([promise1, promise2]).then(function(result){
	    // result === "promise 2" because it was resolved before promise1
	    // was resolved.
	  });
	  ```

	  `RSVP.race` is deterministic in that only the state of the first completed
	  promise matters. For example, even if other promises given to the `promises`
	  array argument are resolved, but the first completed promise has become
	  rejected before the other promises became fulfilled, the returned promise
	  will become rejected:

	  ```javascript
	  var promise1 = new RSVP.Promise(function(resolve, reject){
	    setTimeout(function(){
	      resolve("promise 1");
	    }, 200);
	  });

	  var promise2 = new RSVP.Promise(function(resolve, reject){
	    setTimeout(function(){
	      reject(new Error("promise 2"));
	    }, 100);
	  });

	  RSVP.race([promise1, promise2]).then(function(result){
	    // Code here never runs because there are rejected promises!
	  }, function(reason){
	    // reason.message === "promise2" because promise 2 became rejected before
	    // promise 1 became fulfilled
	  });
	  ```

	  @method race
	  @for RSVP
	  @param {Array} promises array of promises to observe
	  @param {String} label optional string for describing the promise returned.
	  Useful for tooling.
	  @return {Promise} a promise that becomes fulfilled with the value the first
	  completed promises is resolved with if the first completed promise was
	  fulfilled, or rejected with the reason that the first completed promise
	  was rejected with.
	*/
	function race(promises) {
	  /*jshint validthis:true */
	  var Promise = this;

	  if (!isArray(promises)) {
	    throw new TypeError('You must pass an array to race.');
	  }
	  return new Promise(function(resolve, reject) {
	    var results = [], promise;

	    for (var i = 0; i < promises.length; i++) {
	      promise = promises[i];

	      if (promise && typeof promise.then === 'function') {
	        promise.then(resolve, reject);
	      } else {
	        resolve(promise);
	      }
	    }
	  });
	}

	exports.race = race;

/***/ },
/* 168 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	function resolve(value) {
	  /*jshint validthis:true */
	  if (value && typeof value === 'object' && value.constructor === this) {
	    return value;
	  }

	  var Promise = this;

	  return new Promise(function(resolve) {
	    resolve(value);
	  });
	}

	exports.resolve = resolve;

/***/ },
/* 169 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	/**
	  `RSVP.reject` returns a promise that will become rejected with the passed
	  `reason`. `RSVP.reject` is essentially shorthand for the following:

	  ```javascript
	  var promise = new RSVP.Promise(function(resolve, reject){
	    reject(new Error('WHOOPS'));
	  });

	  promise.then(function(value){
	    // Code here doesn't run because the promise is rejected!
	  }, function(reason){
	    // reason.message === 'WHOOPS'
	  });
	  ```

	  Instead of writing the above, your code now simply becomes the following:

	  ```javascript
	  var promise = RSVP.reject(new Error('WHOOPS'));

	  promise.then(function(value){
	    // Code here doesn't run because the promise is rejected!
	  }, function(reason){
	    // reason.message === 'WHOOPS'
	  });
	  ```

	  @method reject
	  @for RSVP
	  @param {Any} reason value that the returned promise will be rejected with.
	  @param {String} label optional string for identifying the returned promise.
	  Useful for tooling.
	  @return {Promise} a promise that will become rejected with the given
	  `reason`.
	*/
	function reject(reason) {
	  /*jshint validthis:true */
	  var Promise = this;

	  return new Promise(function (resolve, reject) {
	    reject(reason);
	  });
	}

	exports.reject = reject;

/***/ },
/* 170 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {"use strict";
	var browserGlobal = (typeof window !== 'undefined') ? window : {};
	var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
	var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

	// node
	function useNextTick() {
	  return function() {
	    process.nextTick(flush);
	  };
	}

	function useMutationObserver() {
	  var iterations = 0;
	  var observer = new BrowserMutationObserver(flush);
	  var node = document.createTextNode('');
	  observer.observe(node, { characterData: true });

	  return function() {
	    node.data = (iterations = ++iterations % 2);
	  };
	}

	function useSetTimeout() {
	  return function() {
	    local.setTimeout(flush, 1);
	  };
	}

	var queue = [];
	function flush() {
	  for (var i = 0; i < queue.length; i++) {
	    var tuple = queue[i];
	    var callback = tuple[0], arg = tuple[1];
	    callback(arg);
	  }
	  queue = [];
	}

	var scheduleFlush;

	// Decide what async method to use to triggering processing of queued callbacks:
	if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
	  scheduleFlush = useNextTick();
	} else if (BrowserMutationObserver) {
	  scheduleFlush = useMutationObserver();
	} else {
	  scheduleFlush = useSetTimeout();
	}

	function asap(callback, arg) {
	  var length = queue.push([callback, arg]);
	  if (length === 1) {
	    // If length is 1, that means that we need to schedule an async flush.
	    // If additional callbacks are queued before the queue is flushed, they
	    // will be processed by this flush that we are scheduling.
	    scheduleFlush();
	  }
	}

	exports.asap = asap;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(99)))

/***/ },
/* 171 */
/***/ function(module, exports, __webpack_require__) {

	/* (ignored) */

/***/ },
/* 172 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = xor;
	function xor(a, b) {
	  var len = Math.min(a.length, b.length);
	  var out = new Buffer(len);
	  var i = -1;
	  while (++i < len) {
	    out.writeUInt8(a[i] ^ b[i], i);
	  }
	  return out;
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 173 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 174 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**!
	 * agentkeepalive - lib/agent.js
	 *
	 * refer:
	 *   * @atimb "Real keep-alive HTTP agent": https://gist.github.com/2963672
	 *   * https://github.com/joyent/node/blob/master/lib/http.js
	 *   * https://github.com/joyent/node/blob/master/lib/_http_agent.js
	 *
	 * Copyright(c) 2012 - 2013 fengmk2 <fengmk2@gmail.com>
	 * MIT Licensed
	 */

	"use strict";

	/**
	 * Module dependencies.
	 */

	var http = __webpack_require__(30);
	var https = __webpack_require__(46);
	var util = __webpack_require__(79);

	var debug;
	if (process.env.NODE_DEBUG && /agentkeepalive/.test(process.env.NODE_DEBUG)) {
	  debug = function (x) {
	    console.error.apply(console, arguments);
	  };
	} else {
	  debug = function () { };
	}

	var OriginalAgent = http.Agent;

	if (process.version.indexOf('v0.8.') === 0 || process.version.indexOf('v0.10.') === 0) {
	  OriginalAgent = __webpack_require__(179).Agent;
	  debug('%s use _http_agent', process.version);
	}

	function Agent(options) {
	  options = options || {};
	  options.keepAlive = options.keepAlive !== false;
	  options.keepAliveMsecs = options.keepAliveMsecs || options.maxKeepAliveTime;
	  OriginalAgent.call(this, options);

	  var self = this;
	  // max requests per keepalive socket, default is 0, no limit.
	  self.maxKeepAliveRequests = parseInt(options.maxKeepAliveRequests, 10) || 0;
	  // max keep alive time, default 60 seconds.
	  // if set `keepAliveMsecs = 0`, will disable keepalive feature.
	  self.createSocketCount = 0;
	  self.timeoutSocketCount = 0;
	  self.requestFinishedCount = 0;

	  // override the `free` event listener
	  self.removeAllListeners('free');
	  self.on('free', function (socket, options) {
	    self.requestFinishedCount++;
	    socket._requestCount++;

	    var name = self.getName(options);
	    debug('agent.on(free)', name);

	    if (!self.isDestroyed(socket) &&
	        self.requests[name] && self.requests[name].length) {
	      self.requests[name].shift().onSocket(socket);
	      if (self.requests[name].length === 0) {
	        // don't leak
	        delete self.requests[name];
	      }
	    } else {
	      // If there are no pending requests, then put it in
	      // the freeSockets pool, but only if we're allowed to do so.
	      var req = socket._httpMessage;
	      if (req &&
	          req.shouldKeepAlive &&
	          !self.isDestroyed(socket) &&
	          self.options.keepAlive) {
	        var freeSockets = self.freeSockets[name];
	        var freeLen = freeSockets ? freeSockets.length : 0;
	        var count = freeLen;
	        if (self.sockets[name])
	          count += self.sockets[name].length;

	        if (count >= self.maxSockets || freeLen >= self.maxFreeSockets) {
	          self.removeSocket(socket, options);
	          socket.destroy();
	        } else {
	          freeSockets = freeSockets || [];
	          self.freeSockets[name] = freeSockets;
	          socket.setKeepAlive(true, self.keepAliveMsecs);
	          socket.unref && socket.unref();
	          socket._httpMessage = null;
	          self.removeSocket(socket, options);
	          freeSockets.push(socket);

	          // Avoid duplicitive timeout events by removing timeout listeners set on
	          // socket by previous requests. node does not do this normally because it
	          // assumes sockets are too short-lived for it to matter. It becomes a
	          // problem when sockets are being reused. Steps are being taken to fix
	          // this issue upstream in node v0.10.0.
	          //
	          // See https://github.com/joyent/node/commit/451ff1540ab536237e8d751d241d7fc3391a4087
	          if (self.keepAliveMsecs && socket._events && Array.isArray(socket._events.timeout)) {
	            socket.removeAllListeners('timeout');
	            // Restore the socket's setTimeout() that was remove as collateral
	            // damage.
	            socket.setTimeout(self.keepAliveMsecs, socket._maxKeepAliveTimeout);
	          }
	        }
	      } else {
	        self.removeSocket(socket, options);
	        socket.destroy();
	      }
	    }
	  });
	}

	util.inherits(Agent, OriginalAgent);
	module.exports = Agent;

	Agent.prototype.createSocket = function (req, options) {
	  var self = this;
	  var socket = OriginalAgent.prototype.createSocket.call(this, req, options);
	  socket._requestCount = 0;
	  if (self.keepAliveMsecs) {
	    socket._maxKeepAliveTimeout = function () {
	      debug('maxKeepAliveTimeout, socket destroy()');
	      socket.destroy();
	      self.timeoutSocketCount++;
	    };
	    socket.setTimeout(self.keepAliveMsecs, socket._maxKeepAliveTimeout);
	    // Disable Nagle's algorithm: http://blog.caustik.com/2012/04/08/scaling-node-js-to-100k-concurrent-connections/
	    socket.setNoDelay(true);
	  }
	  this.createSocketCount++;
	  return socket;
	};

	Agent.prototype.removeSocket = function (s, options) {
	  OriginalAgent.prototype.removeSocket.call(this, s, options);
	  var name = this.getName(options);
	  debug('removeSocket', name, 'destroyed:', this.isDestroyed(s));

	  if (this.isDestroyed(s) && this.freeSockets[name]) {
	    var index = this.freeSockets[name].indexOf(s);
	    if (index !== -1) {
	      this.freeSockets[name].splice(index, 1);
	      if (this.freeSockets[name].length === 0) {
	        // don't leak
	        delete this.freeSockets[name];
	      }
	    }
	  }
	};

	function HttpsAgent(options) {
	  Agent.call(this, options);
	  this.defaultPort = 443;
	  this.protocol = 'https:';
	}
	util.inherits(HttpsAgent, Agent);
	HttpsAgent.prototype.createConnection = https.globalAgent.createConnection;

	HttpsAgent.prototype.getName = function(options) {
	  var name = Agent.prototype.getName.call(this, options);

	  name += ':';
	  if (options.ca)
	    name += options.ca;

	  name += ':';
	  if (options.cert)
	    name += options.cert;

	  name += ':';
	  if (options.ciphers)
	    name += options.ciphers;

	  name += ':';
	  if (options.key)
	    name += options.key;

	  name += ':';
	  if (options.pfx)
	    name += options.pfx;

	  name += ':';
	  if (options.rejectUnauthorized !== undefined)
	    name += options.rejectUnauthorized;

	  return name;
	};

	Agent.HttpsAgent = HttpsAgent;
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ },
/* 175 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 176 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(47).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 177 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 178 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	function isBuffer(arg) {
	  return Buffer.isBuffer(arg);
	}
	exports.isBuffer = isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(47).Buffer))

/***/ },
/* 179 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// copy from https://github.com/joyent/node/blob/master/lib/_http_agent.js

	var net = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"net\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	var url = __webpack_require__(31);
	var util = __webpack_require__(79);
	var EventEmitter = __webpack_require__(44).EventEmitter;
	// var ClientRequest = require('_http_client').ClientRequest;
	// var debug = util.debuglog('http');
	var ClientRequest = __webpack_require__(30).ClientRequest;
	var debug;
	if (process.env.NODE_DEBUG && /agentkeepalive/.test(process.env.NODE_DEBUG)) {
	  debug = function (x) {
	    console.error.apply(console, arguments);
	  };
	} else {
	  debug = function () { };
	}

	// New Agent code.

	// The largest departure from the previous implementation is that
	// an Agent instance holds connections for a variable number of host:ports.
	// Surprisingly, this is still API compatible as far as third parties are
	// concerned. The only code that really notices the difference is the
	// request object.

	// Another departure is that all code related to HTTP parsing is in
	// ClientRequest.onSocket(). The Agent is now *strictly*
	// concerned with managing a connection pool.

	function Agent(options) {
	  if (!(this instanceof Agent))
	    return new Agent(options);

	  EventEmitter.call(this);

	  var self = this;

	  self.defaultPort = 80;
	  self.protocol = 'http:';

	  self.options = util._extend({}, options);

	  // don't confuse net and make it think that we're connecting to a pipe
	  self.options.path = null;
	  self.requests = {};
	  self.sockets = {};
	  self.freeSockets = {};
	  self.keepAliveMsecs = self.options.keepAliveMsecs || 1000;
	  self.keepAlive = self.options.keepAlive || false;
	  self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets;
	  self.maxFreeSockets = self.options.maxFreeSockets || 256;

	  self.on('free', function(socket, options) {
	    var name = self.getName(options);
	    debug('agent.on(free)', name);

	    if (!self.isDestroyed(socket) &&
	        self.requests[name] && self.requests[name].length) {
	      self.requests[name].shift().onSocket(socket);
	      if (self.requests[name].length === 0) {
	        // don't leak
	        delete self.requests[name];
	      }
	    } else {
	      // If there are no pending requests, then put it in
	      // the freeSockets pool, but only if we're allowed to do so.
	      var req = socket._httpMessage;
	      if (req &&
	          req.shouldKeepAlive &&
	          !self.isDestroyed(socket) &&
	          self.options.keepAlive) {
	        var freeSockets = self.freeSockets[name];
	        var freeLen = freeSockets ? freeSockets.length : 0;
	        var count = freeLen;
	        if (self.sockets[name])
	          count += self.sockets[name].length;

	        if (count >= self.maxSockets || freeLen >= self.maxFreeSockets) {
	          self.removeSocket(socket, options);
	          socket.destroy();
	        } else {
	          freeSockets = freeSockets || [];
	          self.freeSockets[name] = freeSockets;
	          socket.setKeepAlive(true, self.keepAliveMsecs);
	          socket.unref && socket.unref();
	          socket._httpMessage = null;
	          self.removeSocket(socket, options);
	          freeSockets.push(socket);
	        }
	      } else {
	        self.removeSocket(socket, options);
	        socket.destroy();
	      }
	    }
	  });
	}

	util.inherits(Agent, EventEmitter);
	exports.Agent = Agent;

	Agent.defaultMaxSockets = Infinity;

	Agent.prototype.createConnection = net.createConnection;

	// Get the key for a given set of request options
	Agent.prototype.getName = function(options) {
	  var name = '';

	  if (options.host)
	    name += options.host;
	  else
	    name += 'localhost';

	  name += ':';
	  if (options.port)
	    name += options.port;
	  name += ':';
	  if (options.localAddress)
	    name += options.localAddress;
	  name += ':';
	  return name;
	};

	Agent.prototype.addRequest = function(req, options) {
	  // Legacy API: addRequest(req, host, port, path)
	  if (typeof options === 'string') {
	    options = {
	      host: options,
	      port: arguments[2],
	      path: arguments[3]
	    };
	  }

	  var name = this.getName(options);
	  if (!this.sockets[name]) {
	    this.sockets[name] = [];
	  }

	  var freeLen = this.freeSockets[name] ? this.freeSockets[name].length : 0;
	  var sockLen = freeLen + this.sockets[name].length;

	  if (freeLen) {
	    // we have a free socket, so use that.
	    var socket = this.freeSockets[name].shift();
	    debug('have free socket');

	    // don't leak
	    if (!this.freeSockets[name].length)
	      delete this.freeSockets[name];

	    socket.ref && socket.ref();
	    req.onSocket(socket);
	    this.sockets[name].push(socket);
	  } else if (sockLen < this.maxSockets) {
	    debug('call onSocket', sockLen, freeLen);
	    // If we are under maxSockets create a new one.
	    req.onSocket(this.createSocket(req, options));
	  } else {
	    debug('wait for socket');
	    // We are over limit so we'll add it to the queue.
	    if (!this.requests[name]) {
	      this.requests[name] = [];
	    }
	    this.requests[name].push(req);
	  }
	};

	Agent.prototype.createSocket = function(req, options) {
	  var self = this;
	  options = util._extend({}, options);
	  options = util._extend(options, self.options);

	  options.servername = options.host;
	  if (req) {
	    var hostHeader = req.getHeader('host');
	    if (hostHeader) {
	      options.servername = hostHeader.replace(/:.*$/, '');
	    }
	  }

	  var name = self.getName(options);

	  debug('createConnection', name, options);
	  var s = self.createConnection(options);
	  if (!self.sockets[name]) {
	    self.sockets[name] = [];
	  }
	  this.sockets[name].push(s);
	  debug('sockets', name, this.sockets[name].length);

	  function onFree() {
	    self.emit('free', s, options);
	  }
	  s.on('free', onFree);

	  function onClose(err) {
	    debug('CLIENT socket onClose');
	    // This is the only place where sockets get removed from the Agent.
	    // If you want to remove a socket from the pool, just close it.
	    // All socket errors end in a close event anyway.
	    self.removeSocket(s, options);
	  }
	  s.on('close', onClose);

	  function onRemove() {
	    // We need this function for cases like HTTP 'upgrade'
	    // (defined by WebSockets) where we need to remove a socket from the
	    // pool because it'll be locked up indefinitely
	    debug('CLIENT socket onRemove');
	    self.removeSocket(s, options, 'agentRemove');
	    s.removeListener('close', onClose);
	    s.removeListener('free', onFree);
	    s.removeListener('agentRemove', onRemove);
	  }
	  s.on('agentRemove', onRemove);
	  return s;
	};

	Agent.prototype.removeSocket = function(s, options) {
	  var name = this.getName(options);
	  debug('removeSocket', name, 'destroyed:', this.isDestroyed(s));
	  var sets = [this.sockets];
	  if (this.isDestroyed(s)) {
	    // If the socket was destroyed, we need to remove it from the free buffers.
	    sets.push(this.freeSockets);
	  }
	  sets.forEach(function(sockets) {
	    if (sockets[name]) {
	      var index = sockets[name].indexOf(s);
	      if (index !== -1) {
	        sockets[name].splice(index, 1);
	        if (sockets[name].length === 0) {
	          // don't leak
	          delete sockets[name];
	        }
	      }
	    }
	  });
	  if (this.requests[name] && this.requests[name].length) {
	    debug('removeSocket, have a request, make a socket');
	    var req = this.requests[name][0];
	    // If we have pending requests and a socket gets closed make a new one
	    this.createSocket(req, options).emit('free');
	  }
	};

	Agent.prototype.destroy = function() {
	  var sets = [this.freeSockets, this.sockets];
	  sets.forEach(function(set) {
	    Object.keys(set).forEach(function(name) {
	      set[name].forEach(function(socket) {
	        socket.destroy();
	      });
	    });
	  });
	};

	Agent.prototype.request = function(options, cb) {
	  // if (util.isString(options)) {
	  //   options = url.parse(options);
	  // }
	  if (typeof options === 'string') {
	    options = url.parse(options);
	  }
	  // don't try to do dns lookups of foo.com:8080, just foo.com
	  if (options.hostname) {
	    options.host = options.hostname;
	  }

	  if (options && options.path && / /.test(options.path)) {
	    // The actual regex is more like /[^A-Za-z0-9\-._~!$&'()*+,;=/:@]/
	    // with an additional rule for ignoring percentage-escaped characters
	    // but that's a) hard to capture in a regular expression that performs
	    // well, and b) possibly too restrictive for real-world usage. That's
	    // why it only scans for spaces because those are guaranteed to create
	    // an invalid request.
	    throw new TypeError('Request path contains unescaped characters.');
	  } else if (options.protocol && options.protocol !== this.protocol) {
	    throw new Error('Protocol:' + options.protocol + ' not supported.');
	  }

	  options = util._extend({
	    agent: this,
	    keepAlive: this.keepAlive
	  }, options);

	  // if it's false, then make a new one, just like this one.
	  if (options.agent === false)
	    options.agent = new this.constructor();

	  debug('agent.request', options);
	  return new ClientRequest(options, cb);
	};

	Agent.prototype.get = function(options, cb) {
	  var req = this.request(options, cb);
	  req.end();
	  return req;
	};

	Agent.prototype.isDestroyed = function(socket){
	  return socket.destroyed || socket._destroyed;
	}
	exports.globalAgent = new Agent();
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(99)))

/***/ }
/******/ ])
});
