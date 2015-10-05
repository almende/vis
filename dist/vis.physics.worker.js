/**
 * vis.js
 * https://github.com/almende/vis
 *
 * A dynamic, browser-based visualization library.
 *
 * @version 4.9.1-SNAPSHOT
 * @date    2015-10-05
 *
 * @license
 * Copyright (C) 2011-2015 Almende B.V, http://almende.com
 *
 * Vis.js is dual licensed under both
 *
 * * The Apache 2.0 License
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * and
 *
 * * The MIT License
 *   http://opensource.org/licenses/MIT
 *
 * Vis.js may be distributed under either license.
 */

"use strict";

/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var _PhysicsWorkerJs = __webpack_require__(1);

  var _PhysicsWorkerJs2 = _interopRequireDefault(_PhysicsWorkerJs);

  var physicsWorker = new _PhysicsWorkerJs2['default'](function (data) {
    return postMessage(data);
  });
  self.addEventListener('message', function (event) {
    return physicsWorker.handleMessage(event);
  }, false);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  Object.defineProperty(exports, '__esModule', {
  	value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var _componentsPhysicsBarnesHutSolver = __webpack_require__(2);

  var _componentsPhysicsBarnesHutSolver2 = _interopRequireDefault(_componentsPhysicsBarnesHutSolver);

  var _componentsPhysicsRepulsionSolver = __webpack_require__(3);

  var _componentsPhysicsRepulsionSolver2 = _interopRequireDefault(_componentsPhysicsRepulsionSolver);

  var _componentsPhysicsHierarchicalRepulsionSolver = __webpack_require__(4);

  var _componentsPhysicsHierarchicalRepulsionSolver2 = _interopRequireDefault(_componentsPhysicsHierarchicalRepulsionSolver);

  var _componentsPhysicsSpringSolver = __webpack_require__(5);

  var _componentsPhysicsSpringSolver2 = _interopRequireDefault(_componentsPhysicsSpringSolver);

  var _componentsPhysicsHierarchicalSpringSolver = __webpack_require__(6);

  var _componentsPhysicsHierarchicalSpringSolver2 = _interopRequireDefault(_componentsPhysicsHierarchicalSpringSolver);

  var _componentsPhysicsCentralGravitySolver = __webpack_require__(7);

  var _componentsPhysicsCentralGravitySolver2 = _interopRequireDefault(_componentsPhysicsCentralGravitySolver);

  var _componentsPhysicsFA2BasedRepulsionSolver = __webpack_require__(8);

  var _componentsPhysicsFA2BasedRepulsionSolver2 = _interopRequireDefault(_componentsPhysicsFA2BasedRepulsionSolver);

  var _componentsPhysicsFA2BasedCentralGravitySolver = __webpack_require__(9);

  var _componentsPhysicsFA2BasedCentralGravitySolver2 = _interopRequireDefault(_componentsPhysicsFA2BasedCentralGravitySolver);

  var PhysicsWorker = (function () {
  	function PhysicsWorker(postMessage) {
  		_classCallCheck(this, PhysicsWorker);

  		this.body = {};
  		this.physicsBody = { physicsNodeIndices: [], physicsEdgeIndices: [], forces: {}, velocities: {} };
  		this.postMessage = postMessage;
  		this.options = {};
  		this.stabilized = false;
  		this.previousStates = {};
  		this.positions = {};
  		this.timestep = 0.5;
  	}

  	_createClass(PhysicsWorker, [{
  		key: 'handleMessage',
  		value: function handleMessage(event) {
  			var msg = event.data;
  			switch (msg.type) {
  				case 'calculateForces':
  					this.calculateForces();
  					this.moveNodes();
  					this.postMessage({
  						type: 'positions',
  						data: {
  							positions: this.positions,
  							stabilized: this.stabilized
  						}
  					});
  					break;
  				case 'update':
  					var node = this.body.nodes[msg.data.id];
  					node.x = msg.data.x;
  					node.y = msg.data.y;
  					break;
  				case 'options':
  					this.options = msg.data;
  					this.timestep = this.options.timestep;
  					this.init();
  					break;
  				case 'physicsObjects':
  					this.body.nodes = msg.data.nodes;
  					this.body.edges = msg.data.edges;
  					this.updatePhysicsData();
  					break;
  				default:
  					console.warn('unknown message from PhysicsEngine', msg);
  			}
  		}

  		/**
     * configure the engine.
     */
  	}, {
  		key: 'init',
  		value: function init() {
  			var options;
  			if (this.options.solver === 'forceAtlas2Based') {
  				options = this.options.forceAtlas2Based;
  				this.nodesSolver = new _componentsPhysicsFA2BasedRepulsionSolver2['default'](this.body, this.physicsBody, options);
  				this.edgesSolver = new _componentsPhysicsSpringSolver2['default'](this.body, this.physicsBody, options);
  				this.gravitySolver = new _componentsPhysicsFA2BasedCentralGravitySolver2['default'](this.body, this.physicsBody, options);
  			} else if (this.options.solver === 'repulsion') {
  				options = this.options.repulsion;
  				this.nodesSolver = new _componentsPhysicsRepulsionSolver2['default'](this.body, this.physicsBody, options);
  				this.edgesSolver = new _componentsPhysicsSpringSolver2['default'](this.body, this.physicsBody, options);
  				this.gravitySolver = new _componentsPhysicsCentralGravitySolver2['default'](this.body, this.physicsBody, options);
  			} else if (this.options.solver === 'hierarchicalRepulsion') {
  				options = this.options.hierarchicalRepulsion;
  				this.nodesSolver = new _componentsPhysicsHierarchicalRepulsionSolver2['default'](this.body, this.physicsBody, options);
  				this.edgesSolver = new _componentsPhysicsHierarchicalSpringSolver2['default'](this.body, this.physicsBody, options);
  				this.gravitySolver = new _componentsPhysicsCentralGravitySolver2['default'](this.body, this.physicsBody, options);
  			} else {
  				// barnesHut
  				options = this.options.barnesHut;
  				this.nodesSolver = new _componentsPhysicsBarnesHutSolver2['default'](this.body, this.physicsBody, options);
  				this.edgesSolver = new _componentsPhysicsSpringSolver2['default'](this.body, this.physicsBody, options);
  				this.gravitySolver = new _componentsPhysicsCentralGravitySolver2['default'](this.body, this.physicsBody, options);
  			}

  			this.modelOptions = options;
  		}

  		/**
     * Nodes and edges can have the physics toggles on or off. A collection of indices is created here so we can skip the check all the time.
     *
     * @private
     */
  	}, {
  		key: 'updatePhysicsData',
  		value: function updatePhysicsData() {
  			this.physicsBody.forces = {};
  			this.physicsBody.physicsNodeIndices = [];
  			this.physicsBody.physicsEdgeIndices = [];
  			var nodes = this.body.nodes;
  			var edges = this.body.edges;

  			// get node indices for physics
  			for (var nodeId in nodes) {
  				if (nodes.hasOwnProperty(nodeId)) {
  					this.physicsBody.physicsNodeIndices.push(nodeId);
  					this.positions[nodeId] = {
  						x: nodes[nodeId].x,
  						y: nodes[nodeId].y
  					};
  				}
  			}

  			// get edge indices for physics
  			for (var edgeId in edges) {
  				if (edges.hasOwnProperty(edgeId)) {
  					this.physicsBody.physicsEdgeIndices.push(edgeId);
  				}
  			}

  			// get the velocity and the forces vector
  			for (var i = 0; i < this.physicsBody.physicsNodeIndices.length; i++) {
  				var nodeId = this.physicsBody.physicsNodeIndices[i];
  				this.physicsBody.forces[nodeId] = { x: 0, y: 0 };

  				// forces can be reset because they are recalculated. Velocities have to persist.
  				if (this.physicsBody.velocities[nodeId] === undefined) {
  					this.physicsBody.velocities[nodeId] = { x: 0, y: 0 };
  				}
  			}

  			// clean deleted nodes from the velocity vector
  			for (var nodeId in this.physicsBody.velocities) {
  				if (nodes[nodeId] === undefined) {
  					delete this.physicsBody.velocities[nodeId];
  				}
  			}
  			// console.log(this.physicsBody);
  		}

  		/**
     * move the nodes one timestap and check if they are stabilized
     * @returns {boolean}
     */
  	}, {
  		key: 'moveNodes',
  		value: function moveNodes() {
  			var nodeIndices = this.physicsBody.physicsNodeIndices;
  			var maxVelocity = this.options.maxVelocity ? this.options.maxVelocity : 1e9;
  			var maxNodeVelocity = 0;

  			for (var i = 0; i < nodeIndices.length; i++) {
  				var nodeId = nodeIndices[i];
  				var nodeVelocity = this._performStep(nodeId, maxVelocity);
  				// stabilized is true if stabilized is true and velocity is smaller than vmin --> all nodes must be stabilized
  				maxNodeVelocity = Math.max(maxNodeVelocity, nodeVelocity);
  			}

  			// evaluating the stabilized and adaptiveTimestepEnabled conditions
  			this.stabilized = maxNodeVelocity < this.options.minVelocity;
  		}

  		/**
     * Perform the actual step
     *
     * @param nodeId
     * @param maxVelocity
     * @returns {number}
     * @private
     */
  	}, {
  		key: '_performStep',
  		value: function _performStep(nodeId, maxVelocity) {
  			var node = this.body.nodes[nodeId];
  			var timestep = this.timestep;
  			var forces = this.physicsBody.forces;
  			var velocities = this.physicsBody.velocities;

  			// store the state so we can revert
  			this.previousStates[nodeId] = { x: node.x, y: node.y, vx: velocities[nodeId].x, vy: velocities[nodeId].y };

  			if (node.options.fixed.x === false) {
  				var dx = this.modelOptions.damping * velocities[nodeId].x; // damping force
  				var ax = (forces[nodeId].x - dx) / node.options.mass; // acceleration
  				velocities[nodeId].x += ax * timestep; // velocity
  				velocities[nodeId].x = Math.abs(velocities[nodeId].x) > maxVelocity ? velocities[nodeId].x > 0 ? maxVelocity : -maxVelocity : velocities[nodeId].x;
  				node.x += velocities[nodeId].x * timestep; // position
  				this.positions[nodeId].x = node.x;
  			} else {
  				forces[nodeId].x = 0;
  				velocities[nodeId].x = 0;
  			}

  			if (node.options.fixed.y === false) {
  				var dy = this.modelOptions.damping * velocities[nodeId].y; // damping force
  				var ay = (forces[nodeId].y - dy) / node.options.mass; // acceleration
  				velocities[nodeId].y += ay * timestep; // velocity
  				velocities[nodeId].y = Math.abs(velocities[nodeId].y) > maxVelocity ? velocities[nodeId].y > 0 ? maxVelocity : -maxVelocity : velocities[nodeId].y;
  				node.y += velocities[nodeId].y * timestep; // position
  				this.positions[nodeId].y = node.y;
  			} else {
  				forces[nodeId].y = 0;
  				velocities[nodeId].y = 0;
  			}

  			var totalVelocity = Math.sqrt(Math.pow(velocities[nodeId].x, 2) + Math.pow(velocities[nodeId].y, 2));
  			return totalVelocity;
  		}

  		/**
     * calculate the forces for one physics iteration.
     */
  	}, {
  		key: 'calculateForces',
  		value: function calculateForces() {
  			this.gravitySolver.solve();
  			this.nodesSolver.solve();
  			this.edgesSolver.solve();
  		}
  	}]);

  	return PhysicsWorker;
  })();

  exports['default'] = PhysicsWorker;
  module.exports = exports['default'];

/***/ },
/* 2 */
/***/ function(module, exports) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var BarnesHutSolver = (function () {
    function BarnesHutSolver(body, physicsBody, options) {
      _classCallCheck(this, BarnesHutSolver);

      this.body = body;
      this.physicsBody = physicsBody;
      this.barnesHutTree;
      this.setOptions(options);
      this.randomSeed = 5;
    }

    _createClass(BarnesHutSolver, [{
      key: "setOptions",
      value: function setOptions(options) {
        this.options = options;
        this.thetaInversed = 1 / this.options.theta;
        this.overlapAvoidanceFactor = 1 - Math.max(0, Math.min(1, this.options.avoidOverlap)); // if 1 then min distance = 0.5, if 0.5 then min distance = 0.5 + 0.5*node.shape.radius
      }
    }, {
      key: "seededRandom",
      value: function seededRandom() {
        var x = Math.sin(this.randomSeed++) * 10000;
        return x - Math.floor(x);
      }

      /**
       * This function calculates the forces the nodes apply on eachother based on a gravitational model.
       * The Barnes Hut method is used to speed up this N-body simulation.
       *
       * @private
       */
    }, {
      key: "solve",
      value: function solve() {
        if (this.options.gravitationalConstant !== 0 && this.physicsBody.physicsNodeIndices.length > 0) {
          var node = undefined;
          var nodes = this.body.nodes;
          var nodeIndices = this.physicsBody.physicsNodeIndices;
          var nodeCount = nodeIndices.length;

          // create the tree
          var barnesHutTree = this._formBarnesHutTree(nodes, nodeIndices);

          // for debugging
          this.barnesHutTree = barnesHutTree;

          // place the nodes one by one recursively
          for (var i = 0; i < nodeCount; i++) {
            node = nodes[nodeIndices[i]];
            if (node.options.mass > 0) {
              // starting with root is irrelevant, it never passes the BarnesHutSolver condition
              this._getForceContribution(barnesHutTree.root.children.NW, node);
              this._getForceContribution(barnesHutTree.root.children.NE, node);
              this._getForceContribution(barnesHutTree.root.children.SW, node);
              this._getForceContribution(barnesHutTree.root.children.SE, node);
            }
          }
        }
      }

      /**
       * This function traverses the barnesHutTree. It checks when it can approximate distant nodes with their center of mass.
       * If a region contains a single node, we check if it is not itself, then we apply the force.
       *
       * @param parentBranch
       * @param node
       * @private
       */
    }, {
      key: "_getForceContribution",
      value: function _getForceContribution(parentBranch, node) {
        // we get no force contribution from an empty region
        if (parentBranch.childrenCount > 0) {
          var dx = undefined,
              dy = undefined,
              distance = undefined;

          // get the distance from the center of mass to the node.
          dx = parentBranch.centerOfMass.x - node.x;
          dy = parentBranch.centerOfMass.y - node.y;
          distance = Math.sqrt(dx * dx + dy * dy);

          // BarnesHutSolver condition
          // original condition : s/d < theta = passed  ===  d/s > 1/theta = passed
          // calcSize = 1/s --> d * 1/s > 1/theta = passed
          if (distance * parentBranch.calcSize > this.thetaInversed) {
            this._calculateForces(distance, dx, dy, node, parentBranch);
          } else {
            // Did not pass the condition, go into children if available
            if (parentBranch.childrenCount === 4) {
              this._getForceContribution(parentBranch.children.NW, node);
              this._getForceContribution(parentBranch.children.NE, node);
              this._getForceContribution(parentBranch.children.SW, node);
              this._getForceContribution(parentBranch.children.SE, node);
            } else {
              // parentBranch must have only one node, if it was empty we wouldnt be here
              if (parentBranch.children.data.id != node.id) {
                // if it is not self
                this._calculateForces(distance, dx, dy, node, parentBranch);
              }
            }
          }
        }
      }

      /**
       * Calculate the forces based on the distance.
       *
       * @param distance
       * @param dx
       * @param dy
       * @param node
       * @param parentBranch
       * @private
       */
    }, {
      key: "_calculateForces",
      value: function _calculateForces(distance, dx, dy, node, parentBranch) {
        if (distance === 0) {
          distance = 0.1;
          dx = distance;
        }

        if (this.overlapAvoidanceFactor < 1) {
          distance = Math.max(0.1 + this.overlapAvoidanceFactor * node.shape.radius, distance - node.shape.radius);
        }

        // the dividing by the distance cubed instead of squared allows us to get the fx and fy components without sines and cosines
        // it is shorthand for gravityforce with distance squared and fx = dx/distance * gravityForce
        var gravityForce = this.options.gravitationalConstant * parentBranch.mass * node.options.mass / Math.pow(distance, 3);
        var fx = dx * gravityForce;
        var fy = dy * gravityForce;

        this.physicsBody.forces[node.id].x += fx;
        this.physicsBody.forces[node.id].y += fy;
      }

      /**
       * This function constructs the barnesHut tree recursively. It creates the root, splits it and starts placing the nodes.
       *
       * @param nodes
       * @param nodeIndices
       * @private
       */
    }, {
      key: "_formBarnesHutTree",
      value: function _formBarnesHutTree(nodes, nodeIndices) {
        var node = undefined;
        var nodeCount = nodeIndices.length;

        var minX = nodes[nodeIndices[0]].x;
        var minY = nodes[nodeIndices[0]].y;
        var maxX = nodes[nodeIndices[0]].x;
        var maxY = nodes[nodeIndices[0]].y;

        // get the range of the nodes
        for (var i = 1; i < nodeCount; i++) {
          var x = nodes[nodeIndices[i]].x;
          var y = nodes[nodeIndices[i]].y;
          if (nodes[nodeIndices[i]].options.mass > 0) {
            if (x < minX) {
              minX = x;
            }
            if (x > maxX) {
              maxX = x;
            }
            if (y < minY) {
              minY = y;
            }
            if (y > maxY) {
              maxY = y;
            }
          }
        }
        // make the range a square
        var sizeDiff = Math.abs(maxX - minX) - Math.abs(maxY - minY); // difference between X and Y
        if (sizeDiff > 0) {
          minY -= 0.5 * sizeDiff;
          maxY += 0.5 * sizeDiff;
        } // xSize > ySize
        else {
            minX += 0.5 * sizeDiff;
            maxX -= 0.5 * sizeDiff;
          } // xSize < ySize

        var minimumTreeSize = 1e-5;
        var rootSize = Math.max(minimumTreeSize, Math.abs(maxX - minX));
        var halfRootSize = 0.5 * rootSize;
        var centerX = 0.5 * (minX + maxX),
            centerY = 0.5 * (minY + maxY);

        // construct the barnesHutTree
        var barnesHutTree = {
          root: {
            centerOfMass: { x: 0, y: 0 },
            mass: 0,
            range: {
              minX: centerX - halfRootSize, maxX: centerX + halfRootSize,
              minY: centerY - halfRootSize, maxY: centerY + halfRootSize
            },
            size: rootSize,
            calcSize: 1 / rootSize,
            children: { data: null },
            maxWidth: 0,
            level: 0,
            childrenCount: 4
          }
        };
        this._splitBranch(barnesHutTree.root);

        // place the nodes one by one recursively
        for (var i = 0; i < nodeCount; i++) {
          node = nodes[nodeIndices[i]];
          if (node.options.mass > 0) {
            this._placeInTree(barnesHutTree.root, node);
          }
        }

        // make global
        return barnesHutTree;
      }

      /**
       * this updates the mass of a branch. this is increased by adding a node.
       *
       * @param parentBranch
       * @param node
       * @private
       */
    }, {
      key: "_updateBranchMass",
      value: function _updateBranchMass(parentBranch, node) {
        var totalMass = parentBranch.mass + node.options.mass;
        var totalMassInv = 1 / totalMass;

        parentBranch.centerOfMass.x = parentBranch.centerOfMass.x * parentBranch.mass + node.x * node.options.mass;
        parentBranch.centerOfMass.x *= totalMassInv;

        parentBranch.centerOfMass.y = parentBranch.centerOfMass.y * parentBranch.mass + node.y * node.options.mass;
        parentBranch.centerOfMass.y *= totalMassInv;

        parentBranch.mass = totalMass;
        var biggestSize = Math.max(Math.max(node.height, node.radius), node.width);
        parentBranch.maxWidth = parentBranch.maxWidth < biggestSize ? biggestSize : parentBranch.maxWidth;
      }

      /**
       * determine in which branch the node will be placed.
       *
       * @param parentBranch
       * @param node
       * @param skipMassUpdate
       * @private
       */
    }, {
      key: "_placeInTree",
      value: function _placeInTree(parentBranch, node, skipMassUpdate) {
        if (skipMassUpdate != true || skipMassUpdate === undefined) {
          // update the mass of the branch.
          this._updateBranchMass(parentBranch, node);
        }

        if (parentBranch.children.NW.range.maxX > node.x) {
          // in NW or SW
          if (parentBranch.children.NW.range.maxY > node.y) {
            // in NW
            this._placeInRegion(parentBranch, node, "NW");
          } else {
            // in SW
            this._placeInRegion(parentBranch, node, "SW");
          }
        } else {
          // in NE or SE
          if (parentBranch.children.NW.range.maxY > node.y) {
            // in NE
            this._placeInRegion(parentBranch, node, "NE");
          } else {
            // in SE
            this._placeInRegion(parentBranch, node, "SE");
          }
        }
      }

      /**
       * actually place the node in a region (or branch)
       *
       * @param parentBranch
       * @param node
       * @param region
       * @private
       */
    }, {
      key: "_placeInRegion",
      value: function _placeInRegion(parentBranch, node, region) {
        switch (parentBranch.children[region].childrenCount) {
          case 0:
            // place node here
            parentBranch.children[region].children.data = node;
            parentBranch.children[region].childrenCount = 1;
            this._updateBranchMass(parentBranch.children[region], node);
            break;
          case 1:
            // convert into children
            // if there are two nodes exactly overlapping (on init, on opening of cluster etc.)
            // we move one node a pixel and we do not put it in the tree.
            if (parentBranch.children[region].children.data.x === node.x && parentBranch.children[region].children.data.y === node.y) {
              node.x += this.seededRandom();
              node.y += this.seededRandom();
            } else {
              this._splitBranch(parentBranch.children[region]);
              this._placeInTree(parentBranch.children[region], node);
            }
            break;
          case 4:
            // place in branch
            this._placeInTree(parentBranch.children[region], node);
            break;
        }
      }

      /**
       * this function splits a branch into 4 sub branches. If the branch contained a node, we place it in the subbranch
       * after the split is complete.
       *
       * @param parentBranch
       * @private
       */
    }, {
      key: "_splitBranch",
      value: function _splitBranch(parentBranch) {
        // if the branch is shaded with a node, replace the node in the new subset.
        var containedNode = null;
        if (parentBranch.childrenCount === 1) {
          containedNode = parentBranch.children.data;
          parentBranch.mass = 0;
          parentBranch.centerOfMass.x = 0;
          parentBranch.centerOfMass.y = 0;
        }
        parentBranch.childrenCount = 4;
        parentBranch.children.data = null;
        this._insertRegion(parentBranch, "NW");
        this._insertRegion(parentBranch, "NE");
        this._insertRegion(parentBranch, "SW");
        this._insertRegion(parentBranch, "SE");

        if (containedNode != null) {
          this._placeInTree(parentBranch, containedNode);
        }
      }

      /**
       * This function subdivides the region into four new segments.
       * Specifically, this inserts a single new segment.
       * It fills the children section of the parentBranch
       *
       * @param parentBranch
       * @param region
       * @param parentRange
       * @private
       */
    }, {
      key: "_insertRegion",
      value: function _insertRegion(parentBranch, region) {
        var minX = undefined,
            maxX = undefined,
            minY = undefined,
            maxY = undefined;
        var childSize = 0.5 * parentBranch.size;
        switch (region) {
          case "NW":
            minX = parentBranch.range.minX;
            maxX = parentBranch.range.minX + childSize;
            minY = parentBranch.range.minY;
            maxY = parentBranch.range.minY + childSize;
            break;
          case "NE":
            minX = parentBranch.range.minX + childSize;
            maxX = parentBranch.range.maxX;
            minY = parentBranch.range.minY;
            maxY = parentBranch.range.minY + childSize;
            break;
          case "SW":
            minX = parentBranch.range.minX;
            maxX = parentBranch.range.minX + childSize;
            minY = parentBranch.range.minY + childSize;
            maxY = parentBranch.range.maxY;
            break;
          case "SE":
            minX = parentBranch.range.minX + childSize;
            maxX = parentBranch.range.maxX;
            minY = parentBranch.range.minY + childSize;
            maxY = parentBranch.range.maxY;
            break;
        }

        parentBranch.children[region] = {
          centerOfMass: { x: 0, y: 0 },
          mass: 0,
          range: { minX: minX, maxX: maxX, minY: minY, maxY: maxY },
          size: 0.5 * parentBranch.size,
          calcSize: 2 * parentBranch.calcSize,
          children: { data: null },
          maxWidth: 0,
          level: parentBranch.level + 1,
          childrenCount: 0
        };
      }

      //---------------------------  DEBUGGING BELOW  ---------------------------//

      /**
       * This function is for debugging purposed, it draws the tree.
       *
       * @param ctx
       * @param color
       * @private
       */
    }, {
      key: "_debug",
      value: function _debug(ctx, color) {
        if (this.barnesHutTree !== undefined) {

          ctx.lineWidth = 1;

          this._drawBranch(this.barnesHutTree.root, ctx, color);
        }
      }

      /**
       * This function is for debugging purposes. It draws the branches recursively.
       *
       * @param branch
       * @param ctx
       * @param color
       * @private
       */
    }, {
      key: "_drawBranch",
      value: function _drawBranch(branch, ctx, color) {
        if (color === undefined) {
          color = "#FF0000";
        }

        if (branch.childrenCount === 4) {
          this._drawBranch(branch.children.NW, ctx);
          this._drawBranch(branch.children.NE, ctx);
          this._drawBranch(branch.children.SE, ctx);
          this._drawBranch(branch.children.SW, ctx);
        }
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(branch.range.minX, branch.range.minY);
        ctx.lineTo(branch.range.maxX, branch.range.minY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(branch.range.maxX, branch.range.minY);
        ctx.lineTo(branch.range.maxX, branch.range.maxY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(branch.range.maxX, branch.range.maxY);
        ctx.lineTo(branch.range.minX, branch.range.maxY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(branch.range.minX, branch.range.maxY);
        ctx.lineTo(branch.range.minX, branch.range.minY);
        ctx.stroke();

        /*
         if (branch.mass > 0) {
         ctx.circle(branch.centerOfMass.x, branch.centerOfMass.y, 3*branch.mass);
         ctx.stroke();
         }
         */
      }
    }]);

    return BarnesHutSolver;
  })();

  exports["default"] = BarnesHutSolver;
  module.exports = exports["default"];

/***/ },
/* 3 */
/***/ function(module, exports) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var RepulsionSolver = (function () {
    function RepulsionSolver(body, physicsBody, options) {
      _classCallCheck(this, RepulsionSolver);

      this.body = body;
      this.physicsBody = physicsBody;
      this.setOptions(options);
    }

    _createClass(RepulsionSolver, [{
      key: "setOptions",
      value: function setOptions(options) {
        this.options = options;
      }

      /**
       * Calculate the forces the nodes apply on each other based on a repulsion field.
       * This field is linearly approximated.
       *
       * @private
       */
    }, {
      key: "solve",
      value: function solve() {
        var dx, dy, distance, fx, fy, repulsingForce, node1, node2;

        var nodes = this.body.nodes;
        var nodeIndices = this.physicsBody.physicsNodeIndices;
        var forces = this.physicsBody.forces;

        // repulsing forces between nodes
        var nodeDistance = this.options.nodeDistance;

        // approximation constants
        var a = -2 / 3 / nodeDistance;
        var b = 4 / 3;

        // we loop from i over all but the last entree in the array
        // j loops from i+1 to the last. This way we do not double count any of the indices, nor i === j
        for (var i = 0; i < nodeIndices.length - 1; i++) {
          node1 = nodes[nodeIndices[i]];
          for (var j = i + 1; j < nodeIndices.length; j++) {
            node2 = nodes[nodeIndices[j]];

            dx = node2.x - node1.x;
            dy = node2.y - node1.y;
            distance = Math.sqrt(dx * dx + dy * dy);

            // same condition as BarnesHutSolver, making sure nodes are never 100% overlapping.
            if (distance === 0) {
              distance = 0.1 * Math.random();
              dx = distance;
            }

            if (distance < 2 * nodeDistance) {
              if (distance < 0.5 * nodeDistance) {
                repulsingForce = 1.0;
              } else {
                repulsingForce = a * distance + b; // linear approx of  1 / (1 + Math.exp((distance / nodeDistance - 1) * steepness))
              }
              repulsingForce = repulsingForce / distance;

              fx = dx * repulsingForce;
              fy = dy * repulsingForce;

              forces[node1.id].x -= fx;
              forces[node1.id].y -= fy;
              forces[node2.id].x += fx;
              forces[node2.id].y += fy;
            }
          }
        }
      }
    }]);

    return RepulsionSolver;
  })();

  exports["default"] = RepulsionSolver;
  module.exports = exports["default"];

/***/ },
/* 4 */
/***/ function(module, exports) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var HierarchicalRepulsionSolver = (function () {
    function HierarchicalRepulsionSolver(body, physicsBody, options) {
      _classCallCheck(this, HierarchicalRepulsionSolver);

      this.body = body;
      this.physicsBody = physicsBody;
      this.setOptions(options);
    }

    _createClass(HierarchicalRepulsionSolver, [{
      key: "setOptions",
      value: function setOptions(options) {
        this.options = options;
      }

      /**
       * Calculate the forces the nodes apply on each other based on a repulsion field.
       * This field is linearly approximated.
       *
       * @private
       */
    }, {
      key: "solve",
      value: function solve() {
        var dx, dy, distance, fx, fy, repulsingForce, node1, node2, i, j;

        var nodes = this.body.nodes;
        var nodeIndices = this.physicsBody.physicsNodeIndices;
        var forces = this.physicsBody.forces;

        // repulsing forces between nodes
        var nodeDistance = this.options.nodeDistance;

        // we loop from i over all but the last entree in the array
        // j loops from i+1 to the last. This way we do not double count any of the indices, nor i === j
        for (i = 0; i < nodeIndices.length - 1; i++) {
          node1 = nodes[nodeIndices[i]];
          for (j = i + 1; j < nodeIndices.length; j++) {
            node2 = nodes[nodeIndices[j]];

            // nodes only affect nodes on their level
            if (node1.level === node2.level) {
              dx = node2.x - node1.x;
              dy = node2.y - node1.y;
              distance = Math.sqrt(dx * dx + dy * dy);

              var steepness = 0.05;
              if (distance < nodeDistance) {
                repulsingForce = -Math.pow(steepness * distance, 2) + Math.pow(steepness * nodeDistance, 2);
              } else {
                repulsingForce = 0;
              }
              // normalize force with
              if (distance === 0) {
                distance = 0.01;
              } else {
                repulsingForce = repulsingForce / distance;
              }
              fx = dx * repulsingForce;
              fy = dy * repulsingForce;

              forces[node1.id].x -= fx;
              forces[node1.id].y -= fy;
              forces[node2.id].x += fx;
              forces[node2.id].y += fy;
            }
          }
        }
      }
    }]);

    return HierarchicalRepulsionSolver;
  })();

  exports["default"] = HierarchicalRepulsionSolver;
  module.exports = exports["default"];

/***/ },
/* 5 */
/***/ function(module, exports) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var SpringSolver = (function () {
    function SpringSolver(body, physicsBody, options) {
      _classCallCheck(this, SpringSolver);

      this.body = body;
      this.physicsBody = physicsBody;
      this.setOptions(options);
    }

    _createClass(SpringSolver, [{
      key: "setOptions",
      value: function setOptions(options) {
        this.options = options;
      }

      /**
       * This function calculates the springforces on the nodes, accounting for the support nodes.
       *
       * @private
       */
    }, {
      key: "solve",
      value: function solve() {
        var edgeLength = undefined,
            edge = undefined;
        var edgeIndices = this.physicsBody.physicsEdgeIndices;
        var edges = this.body.edges;
        var nodes = this.body.nodes;
        var node1 = undefined,
            node2 = undefined,
            node3 = undefined;

        // forces caused by the edges, modelled as springs
        for (var i = 0; i < edgeIndices.length; i++) {
          edge = edges[edgeIndices[i]];
          if (edge.connected === true && edge.toId !== edge.fromId) {
            // only calculate forces if nodes are in the same sector
            if (this.body.nodes[edge.toId] !== undefined && this.body.nodes[edge.fromId] !== undefined) {
              if (edge.edgeType.via !== undefined) {
                edgeLength = edge.options.length === undefined ? this.options.springLength : edge.options.length;
                node1 = nodes[edge.to.id];
                node2 = nodes[edge.edgeType.via.id];
                node3 = nodes[edge.from.id];

                this._calculateSpringForce(node1, node2, 0.5 * edgeLength);
                this._calculateSpringForce(node2, node3, 0.5 * edgeLength);
              } else {
                // the * 1.5 is here so the edge looks as large as a smooth edge. It does not initially because the smooth edges use
                // the support nodes which exert a repulsive force on the to and from nodes, making the edge appear larger.
                edgeLength = edge.options.length === undefined ? this.options.springLength * 1.5 : edge.options.length;
                this._calculateSpringForce(nodes[edge.from.id], nodes[edge.to.id], edgeLength);
              }
            }
          }
        }
      }

      /**
       * This is the code actually performing the calculation for the function above.
       *
       * @param node1
       * @param node2
       * @param edgeLength
       * @private
       */
    }, {
      key: "_calculateSpringForce",
      value: function _calculateSpringForce(node1, node2, edgeLength) {
        var dx = node1.x - node2.x;
        var dy = node1.y - node2.y;
        var distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);

        // the 1/distance is so the fx and fy can be calculated without sine or cosine.
        var springForce = this.options.springConstant * (edgeLength - distance) / distance;

        var fx = dx * springForce;
        var fy = dy * springForce;

        // handle the case where one node is not part of the physcis
        if (this.physicsBody.forces[node1.id] !== undefined) {
          this.physicsBody.forces[node1.id].x += fx;
          this.physicsBody.forces[node1.id].y += fy;
        }

        if (this.physicsBody.forces[node2.id] !== undefined) {
          this.physicsBody.forces[node2.id].x -= fx;
          this.physicsBody.forces[node2.id].y -= fy;
        }
      }
    }]);

    return SpringSolver;
  })();

  exports["default"] = SpringSolver;
  module.exports = exports["default"];

/***/ },
/* 6 */
/***/ function(module, exports) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var HierarchicalSpringSolver = (function () {
    function HierarchicalSpringSolver(body, physicsBody, options) {
      _classCallCheck(this, HierarchicalSpringSolver);

      this.body = body;
      this.physicsBody = physicsBody;
      this.setOptions(options);
    }

    _createClass(HierarchicalSpringSolver, [{
      key: "setOptions",
      value: function setOptions(options) {
        this.options = options;
      }

      /**
       * This function calculates the springforces on the nodes, accounting for the support nodes.
       *
       * @private
       */
    }, {
      key: "solve",
      value: function solve() {
        var edgeLength, edge;
        var dx, dy, fx, fy, springForce, distance;
        var edges = this.body.edges;
        var factor = 0.5;

        var edgeIndices = this.physicsBody.physicsEdgeIndices;
        var nodeIndices = this.physicsBody.physicsNodeIndices;
        var forces = this.physicsBody.forces;

        // initialize the spring force counters
        for (var i = 0; i < nodeIndices.length; i++) {
          var nodeId = nodeIndices[i];
          forces[nodeId].springFx = 0;
          forces[nodeId].springFy = 0;
        }

        // forces caused by the edges, modelled as springs
        for (var i = 0; i < edgeIndices.length; i++) {
          edge = edges[edgeIndices[i]];
          if (edge.connected === true) {
            edgeLength = edge.options.length === undefined ? this.options.springLength : edge.options.length;

            dx = edge.from.x - edge.to.x;
            dy = edge.from.y - edge.to.y;
            distance = Math.sqrt(dx * dx + dy * dy);
            distance = distance === 0 ? 0.01 : distance;

            // the 1/distance is so the fx and fy can be calculated without sine or cosine.
            springForce = this.options.springConstant * (edgeLength - distance) / distance;

            fx = dx * springForce;
            fy = dy * springForce;

            if (edge.to.level != edge.from.level) {
              if (forces[edge.toId] !== undefined) {
                forces[edge.toId].springFx -= fx;
                forces[edge.toId].springFy -= fy;
              }
              if (forces[edge.fromId] !== undefined) {
                forces[edge.fromId].springFx += fx;
                forces[edge.fromId].springFy += fy;
              }
            } else {
              if (forces[edge.toId] !== undefined) {
                forces[edge.toId].x -= factor * fx;
                forces[edge.toId].y -= factor * fy;
              }
              if (forces[edge.fromId] !== undefined) {
                forces[edge.fromId].x += factor * fx;
                forces[edge.fromId].y += factor * fy;
              }
            }
          }
        }

        // normalize spring forces
        var springForce = 1;
        var springFx, springFy;
        for (var i = 0; i < nodeIndices.length; i++) {
          var nodeId = nodeIndices[i];
          springFx = Math.min(springForce, Math.max(-springForce, forces[nodeId].springFx));
          springFy = Math.min(springForce, Math.max(-springForce, forces[nodeId].springFy));

          forces[nodeId].x += springFx;
          forces[nodeId].y += springFy;
        }

        // retain energy balance
        var totalFx = 0;
        var totalFy = 0;
        for (var i = 0; i < nodeIndices.length; i++) {
          var nodeId = nodeIndices[i];
          totalFx += forces[nodeId].x;
          totalFy += forces[nodeId].y;
        }
        var correctionFx = totalFx / nodeIndices.length;
        var correctionFy = totalFy / nodeIndices.length;

        for (var i = 0; i < nodeIndices.length; i++) {
          var nodeId = nodeIndices[i];
          forces[nodeId].x -= correctionFx;
          forces[nodeId].y -= correctionFy;
        }
      }
    }]);

    return HierarchicalSpringSolver;
  })();

  exports["default"] = HierarchicalSpringSolver;
  module.exports = exports["default"];

/***/ },
/* 7 */
/***/ function(module, exports) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var CentralGravitySolver = (function () {
    function CentralGravitySolver(body, physicsBody, options) {
      _classCallCheck(this, CentralGravitySolver);

      this.body = body;
      this.physicsBody = physicsBody;
      this.setOptions(options);
    }

    _createClass(CentralGravitySolver, [{
      key: "setOptions",
      value: function setOptions(options) {
        this.options = options;
      }
    }, {
      key: "solve",
      value: function solve() {
        var dx = undefined,
            dy = undefined,
            distance = undefined,
            node = undefined;
        var nodes = this.body.nodes;
        var nodeIndices = this.physicsBody.physicsNodeIndices;
        var forces = this.physicsBody.forces;

        for (var i = 0; i < nodeIndices.length; i++) {
          var nodeId = nodeIndices[i];
          node = nodes[nodeId];
          dx = -node.x;
          dy = -node.y;
          distance = Math.sqrt(dx * dx + dy * dy);

          this._calculateForces(distance, dx, dy, forces, node);
        }
      }

      /**
       * Calculate the forces based on the distance.
       * @private
       */
    }, {
      key: "_calculateForces",
      value: function _calculateForces(distance, dx, dy, forces, node) {
        var gravityForce = distance === 0 ? 0 : this.options.centralGravity / distance;
        forces[node.id].x = dx * gravityForce;
        forces[node.id].y = dy * gravityForce;
      }
    }]);

    return CentralGravitySolver;
  })();

  exports["default"] = CentralGravitySolver;
  module.exports = exports["default"];

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  var _BarnesHutSolver2 = __webpack_require__(2);

  var _BarnesHutSolver3 = _interopRequireDefault(_BarnesHutSolver2);

  var ForceAtlas2BasedRepulsionSolver = (function (_BarnesHutSolver) {
    _inherits(ForceAtlas2BasedRepulsionSolver, _BarnesHutSolver);

    function ForceAtlas2BasedRepulsionSolver(body, physicsBody, options) {
      _classCallCheck(this, ForceAtlas2BasedRepulsionSolver);

      _get(Object.getPrototypeOf(ForceAtlas2BasedRepulsionSolver.prototype), "constructor", this).call(this, body, physicsBody, options);
    }

    /**
     * Calculate the forces based on the distance.
     *
     * @param distance
     * @param dx
     * @param dy
     * @param node
     * @param parentBranch
     * @private
     */

    _createClass(ForceAtlas2BasedRepulsionSolver, [{
      key: "_calculateForces",
      value: function _calculateForces(distance, dx, dy, node, parentBranch) {
        if (distance === 0) {
          distance = 0.1 * Math.random();
          dx = distance;
        }

        if (this.overlapAvoidanceFactor < 1) {
          distance = Math.max(0.1 + this.overlapAvoidanceFactor * node.shape.radius, distance - node.shape.radius);
        }

        var degree = node.edges.length + 1;
        // the dividing by the distance cubed instead of squared allows us to get the fx and fy components without sines and cosines
        // it is shorthand for gravityforce with distance squared and fx = dx/distance * gravityForce
        var gravityForce = this.options.gravitationalConstant * parentBranch.mass * node.options.mass * degree / Math.pow(distance, 2);
        var fx = dx * gravityForce;
        var fy = dy * gravityForce;

        this.physicsBody.forces[node.id].x += fx;
        this.physicsBody.forces[node.id].y += fy;
      }
    }]);

    return ForceAtlas2BasedRepulsionSolver;
  })(_BarnesHutSolver3["default"]);

  exports["default"] = ForceAtlas2BasedRepulsionSolver;
  module.exports = exports["default"];

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  var _CentralGravitySolver2 = __webpack_require__(7);

  var _CentralGravitySolver3 = _interopRequireDefault(_CentralGravitySolver2);

  var ForceAtlas2BasedCentralGravitySolver = (function (_CentralGravitySolver) {
    _inherits(ForceAtlas2BasedCentralGravitySolver, _CentralGravitySolver);

    function ForceAtlas2BasedCentralGravitySolver(body, physicsBody, options) {
      _classCallCheck(this, ForceAtlas2BasedCentralGravitySolver);

      _get(Object.getPrototypeOf(ForceAtlas2BasedCentralGravitySolver.prototype), "constructor", this).call(this, body, physicsBody, options);
    }

    /**
     * Calculate the forces based on the distance.
     * @private
     */

    _createClass(ForceAtlas2BasedCentralGravitySolver, [{
      key: "_calculateForces",
      value: function _calculateForces(distance, dx, dy, forces, node) {
        if (distance > 0) {
          var degree = node.edges.length + 1;
          var gravityForce = this.options.centralGravity * degree * node.options.mass;
          forces[node.id].x = dx * gravityForce;
          forces[node.id].y = dy * gravityForce;
        }
      }
    }]);

    return ForceAtlas2BasedCentralGravitySolver;
  })(_CentralGravitySolver3["default"]);

  exports["default"] = ForceAtlas2BasedCentralGravitySolver;
  module.exports = exports["default"];

/***/ }
/******/ ]);