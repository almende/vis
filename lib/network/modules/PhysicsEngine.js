import BarnesHutSolver                      from './components/physics/BarnesHutSolver';
import Repulsion                            from './components/physics/RepulsionSolver';
import HierarchicalRepulsion                from './components/physics/HierarchicalRepulsionSolver';
import SpringSolver                         from './components/physics/SpringSolver';
import HierarchicalSpringSolver             from './components/physics/HierarchicalSpringSolver';
import CentralGravitySolver                 from './components/physics/CentralGravitySolver';
import ForceAtlas2BasedRepulsionSolver      from './components/physics/FA2BasedRepulsionSolver';
import ForceAtlas2BasedCentralGravitySolver from './components/physics/FA2BasedCentralGravitySolver';

var util = require('../../util');


class PhysicsEngine {
  constructor(body) {
    this.body = body;
    this.physicsBody = {physicsNodeIndices:[], physicsEdgeIndices:[], forces: {}, velocities: {}};

    this.physicsEnabled = true;
    this.simulationInterval = 1000 / 60;
    this.requiresTimeout = true;
    this.previousStates = {};
    this.freezeCache = {};
    this.renderTimer = undefined;
    this.initialStabilizationEmitted = false;

    this.stabilized = false;
    this.startedStabilization = false;
    this.stabilizationIterations = 0;
    this.ready = false; // will be set to true if the stabilize

    // default options
    this.options = {};
    this.defaultOptions = {
      barnesHut: {
        theta: 0.5,
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0
      },
      forceAtlas2Based: {
        theta: 0.5,
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springConstant: 0.08,
        springLength: 100,
        damping: 0.4,
        avoidOverlap: 0
      },
      repulsion: {
        centralGravity: 0.2,
        springLength: 200,
        springConstant: 0.05,
        nodeDistance: 100,
        damping: 0.09,
        avoidOverlap: 0
      },
      hierarchicalRepulsion: {
        centralGravity: 0.0,
        springLength: 100,
        springConstant: 0.01,
        nodeDistance: 120,
        damping: 0.09
      },
      maxVelocity: 50,
      minVelocity: 0.1,    // px/s
      solver: 'barnesHut',
      stabilization: {
        enabled: true,
        iterations: 1000,   // maximum number of iteration to stabilize
        updateInterval: 50,
        onlyDynamicEdges: false,
        fit: true
      },
      timestep: 0.5
    };
    util.extend(this.options, this.defaultOptions);

    this.bindEventListeners();
  }

  bindEventListeners() {
    this.body.emitter.on('initPhysics',     () => {this.initPhysics();});
    this.body.emitter.on('resetPhysics',    () => {this.stopSimulation(); this.ready = false;});
    this.body.emitter.on('disablePhysics',  () => {this.physicsEnabled = false; this.stopSimulation();});
    this.body.emitter.on('restorePhysics',  () => {
      this.setOptions(this.options);
      if (this.ready === true) {
        this.startSimulation();
      }
    });
    this.body.emitter.on('startSimulation', () => {
      if (this.ready === true) {
        this.startSimulation();
      }
    });
    this.body.emitter.on('stopSimulation',  () => {this.stopSimulation();});
    this.body.emitter.on('destroy',         () => {
      this.stopSimulation(false);
      this.body.emitter.off();
    });
  }

  setOptions(options) {
    if (options !== undefined) {
      if (options === false) {
        this.physicsEnabled = false;
        this.stopSimulation();
      }
      else {
        this.physicsEnabled = true;
        util.selectiveNotDeepExtend(['stabilization'], this.options, options);
        util.mergeOptions(this.options, options, 'stabilization')
      }
    }
    this.init();
  }


  init() {
    var options;
    if (this.options.solver === 'forceAtlas2Based') {
      options = this.options.forceAtlas2Based;
      this.nodesSolver = new ForceAtlas2BasedRepulsionSolver(this.body, this.physicsBody, options);
      this.edgesSolver = new SpringSolver(this.body, this.physicsBody, options);
      this.gravitySolver = new ForceAtlas2BasedCentralGravitySolver(this.body, this.physicsBody, options);
    }
    else if (this.options.solver === 'repulsion') {
      options = this.options.repulsion;
      this.nodesSolver = new Repulsion(this.body, this.physicsBody, options);
      this.edgesSolver = new SpringSolver(this.body, this.physicsBody, options);
      this.gravitySolver = new CentralGravitySolver(this.body, this.physicsBody, options);
    }
    else if (this.options.solver === 'hierarchicalRepulsion') {
      options = this.options.hierarchicalRepulsion;
      this.nodesSolver = new HierarchicalRepulsion(this.body, this.physicsBody, options);
      this.edgesSolver = new HierarchicalSpringSolver(this.body, this.physicsBody, options);
      this.gravitySolver = new CentralGravitySolver(this.body, this.physicsBody, options);
    }
    else { // barnesHut
      options = this.options.barnesHut;
      this.nodesSolver = new BarnesHutSolver(this.body, this.physicsBody, options);
      this.edgesSolver = new SpringSolver(this.body, this.physicsBody, options);
      this.gravitySolver = new CentralGravitySolver(this.body, this.physicsBody, options);
    }

    this.modelOptions = options;
  }

  initPhysics() {
    if (this.physicsEnabled === true) {
      if (this.options.stabilization.enabled === true) {
        this.stabilize();
      }
      else {
        this.stabilized = false;
        this.ready = true;
        this.body.emitter.emit('fit', {}, true);
        this.startSimulation();
      }
    }
    else {
      this.ready = true;
      this.body.emitter.emit('fit');
    }
  }

  /**
   * Start the simulation
   */
  startSimulation() {
    if (this.physicsEnabled === true) {
      this.stabilized = false;

      // this sets the width of all nodes initially which could be required for the avoidOverlap
      this.body.emitter.emit("_resizeNodes");
      if (this.viewFunction === undefined) {
        this.viewFunction = this.simulationStep.bind(this);
        this.body.emitter.on('initRedraw', this.viewFunction);
        this.body.emitter.emit('_startRendering');
      }
    }
    else {
      this.body.emitter.emit('_redraw');
    }
  }


  /**
   * Stop the simulation, force stabilization.
   */
  stopSimulation(emit = true) {
    this.stabilized = true;
    if (emit === true) {
      this._emitStabilized();
    }
    if (this.viewFunction !== undefined) {
      this.body.emitter.off('initRedraw', this.viewFunction);
      this.viewFunction = undefined;
      if (emit === true) {
        this.body.emitter.emit('_stopRendering');
      }
    }
  }


  /**
   * The viewFunction inserts this step into each renderloop. It calls the physics tick and handles the cleanup at stabilized.
   *
   */
  simulationStep() {
    // check if the physics have settled
    var startTime = Date.now();
    this.physicsTick();
    var physicsTime = Date.now() - startTime;

    // run double speed if it is a little graph
    if ((physicsTime < 0.4 * this.simulationInterval || this.runDoubleSpeed === true) && this.stabilized === false) {
      this.physicsTick();

      // this makes sure there is no jitter. The decision is taken once to run it at double speed.
      this.runDoubleSpeed = true;
    }

    if (this.stabilized === true) {
      if (this.stabilizationIterations > 1) {
        // trigger the 'stabilized' event.
        // The event is triggered on the next tick, to prevent the case that
        // it is fired while initializing the Network, in which case you would not
        // be able to catch it
        this.startedStabilization = false;
        //this._emitStabilized();
      }
      this.stopSimulation();
    }
  }

  _emitStabilized() {
    if (this.stabilizationIterations > 1 || this.initialStabilizationEmitted === false) {
      this.initialStabilizationEmitted = true;
      setTimeout(() => {
        this.body.emitter.emit('stabilized', {iterations: this.stabilizationIterations});
        this.stabilizationIterations = 0;
      }, 0);
    }
  }

  /**
   * A single simulation step (or 'tick') in the physics simulation
   *
   * @private
   */
  physicsTick() {
    if (this.stabilized === false) {
      this.calculateForces();
      this.stabilized = this.moveNodes();

      // determine if the network has stabilzied
      if (this.stabilized === true) {
        this.revert();
      }
      else {
        // this is here to ensure that there is no start event when the network is already stable.
        if (this.startedStabilization === false) {
          this.body.emitter.emit('startStabilizing');
          this.startedStabilization = true;
        }
      }

      this.stabilizationIterations++;
    }
  }

  /**
   * Nodes and edges can have the physics toggles on or off. A collection of indices is created here so we can skip the check all the time.
   *
   * @private
   */
  updatePhysicsData() {
    this.physicsBody.forces = {};
    this.physicsBody.physicsNodeIndices = [];
    this.physicsBody.physicsEdgeIndices = [];
    let nodes = this.body.nodes;
    let edges = this.body.edges;

    // get node indices for physics
    for (let nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        if (nodes[nodeId].options.physics === true) {
          this.physicsBody.physicsNodeIndices.push(nodeId);
        }
      }
    }

    // get edge indices for physics
    for (let edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        if (edges[edgeId].options.physics === true) {
          this.physicsBody.physicsEdgeIndices.push(edgeId);
        }
      }
    }

    // get the velocity and the forces vector
    for (let i = 0; i < this.physicsBody.physicsNodeIndices.length; i++) {
      let nodeId = this.physicsBody.physicsNodeIndices[i];
      this.physicsBody.forces[nodeId] = {x:0,y:0};

      // forces can be reset because they are recalculated. Velocities have to persist.
      if (this.physicsBody.velocities[nodeId] === undefined) {
        this.physicsBody.velocities[nodeId] = {x:0,y:0};
      }
    }

    // clean deleted nodes from the velocity vector
    for (let nodeId in this.physicsBody.velocities) {
      if (nodes[nodeId] === undefined) {
        delete this.physicsBody.velocities[nodeId];
      }
    }
  }


  /**
   * Revert the simulation one step. This is done so after stabilization, every new start of the simulation will also say stabilized.
   */
  revert() {
    var nodeIds = Object.keys(this.previousStates);
    var nodes = this.body.nodes;
    var velocities = this.physicsBody.velocities;

    for (let i = 0; i < nodeIds.length; i++) {
      let nodeId = nodeIds[i];
      if (nodes[nodeId] !== undefined) {
        if (nodes[nodeId].options.physics === true) {
          velocities[nodeId].x = this.previousStates[nodeId].vx;
          velocities[nodeId].y = this.previousStates[nodeId].vy;
          nodes[nodeId].x = this.previousStates[nodeId].x;
          nodes[nodeId].y = this.previousStates[nodeId].y;
        }
      }
      else {
        delete this.previousStates[nodeId];
      }
    }
  }

  /**
   * move the nodes one timestap and check if they are stabilized
   * @returns {boolean}
   */
  moveNodes() {
    var nodesPresent = false;
    var nodeIndices = this.physicsBody.physicsNodeIndices;
    var maxVelocity = this.options.maxVelocity ? this.options.maxVelocity : 1e9;
    var stabilized = true;
    var vminCorrected = this.options.minVelocity / Math.max(this.body.view.scale,0.05);

    for (let i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      let nodeVelocity = this._performStep(nodeId, maxVelocity);
      // stabilized is true if stabilized is true and velocity is smaller than vmin --> all nodes must be stabilized
      stabilized = nodeVelocity < vminCorrected && stabilized === true;
      nodesPresent = true;
    }


    if (nodesPresent === true) {
      if (vminCorrected > 0.5*this.options.maxVelocity) {
        return false;
      }
      else {
        return stabilized;
      }
    }
    return true;
  }


  /**
   * Perform the actual step
   *
   * @param nodeId
   * @param maxVelocity
   * @returns {number}
   * @private
   */
  _performStep(nodeId,maxVelocity) {
    var node = this.body.nodes[nodeId];
    var timestep = this.options.timestep;
    var forces = this.physicsBody.forces;
    var velocities = this.physicsBody.velocities;

    // store the state so we can revert
    this.previousStates[nodeId] = {x:node.x, y:node.y, vx:velocities[nodeId].x, vy:velocities[nodeId].y};

    if (node.options.fixed.x === false) {
      let dx   = this.modelOptions.damping * velocities[nodeId].x;   // damping force
      let ax   = (forces[nodeId].x - dx) / node.options.mass;        // acceleration
      velocities[nodeId].x += ax * timestep;                         // velocity
      velocities[nodeId].x = (Math.abs(velocities[nodeId].x) > maxVelocity) ? ((velocities[nodeId].x > 0) ? maxVelocity : -maxVelocity) : velocities[nodeId].x;
      node.x  += velocities[nodeId].x * timestep;                    // position
    }
    else {
      forces[nodeId].x = 0;
      velocities[nodeId].x = 0;
    }

    if (node.options.fixed.y === false) {
      let dy   = this.modelOptions.damping * velocities[nodeId].y;    // damping force
      let ay   = (forces[nodeId].y - dy) / node.options.mass;         // acceleration
      velocities[nodeId].y += ay * timestep;                          // velocity
      velocities[nodeId].y = (Math.abs(velocities[nodeId].y) > maxVelocity) ? ((velocities[nodeId].y > 0) ? maxVelocity : -maxVelocity) : velocities[nodeId].y;
      node.y  += velocities[nodeId].y * timestep;                     // position
    }
    else {
      forces[nodeId].y = 0;
      velocities[nodeId].y = 0;
    }

    var totalVelocity = Math.sqrt(Math.pow(velocities[nodeId].x,2) + Math.pow(velocities[nodeId].y,2));
    return totalVelocity;
  }


  /**
   * calculate the forces for one physics iteration.
   */
  calculateForces() {
    this.gravitySolver.solve();
    this.nodesSolver.solve();
    this.edgesSolver.solve();
  }



  /**
   * When initializing and stabilizing, we can freeze nodes with a predefined position. This greatly speeds up stabilization
   * because only the supportnodes for the smoothCurves have to settle.
   *
   * @private
   */
  _freezeNodes() {
    var nodes = this.body.nodes;
    for (var id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        if (nodes[id].x && nodes[id].y) {
          this.freezeCache[id] = {x:nodes[id].options.fixed.x,y:nodes[id].options.fixed.y};
          nodes[id].options.fixed.x = true;
          nodes[id].options.fixed.y = true;
        }
      }
    }
  }

  /**
   * Unfreezes the nodes that have been frozen by _freezeDefinedNodes.
   *
   * @private
   */
  _restoreFrozenNodes() {
    var nodes = this.body.nodes;
    for (var id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        if (this.freezeCache[id] !== undefined) {
          nodes[id].options.fixed.x = this.freezeCache[id].x;
          nodes[id].options.fixed.y = this.freezeCache[id].y;
        }
      }
    }
    this.freezeCache = {};
  }

  /**
   * Find a stable position for all nodes
   * @private
   */
  stabilize(iterations = this.options.stabilization.iterations) {
    if (typeof iterations !== 'number') {
      console.log('The stabilize method needs a numeric amount of iterations. Switching to default: ', this.options.stabilization.iterations);
      iterations = this.options.stabilization.iterations;
    }

    // this sets the width of all nodes initially which could be required for the avoidOverlap
    this.body.emitter.emit("_resizeNodes");

    // stop the render loop
    this.stopSimulation();

    // set stabilze to false
    this.stabilized = false;

    // block redraw requests
    this.body.emitter.emit('_blockRedrawRequests');
    this.targetIterations = iterations;

    // start the stabilization
    if (this.options.stabilization.onlyDynamicEdges === true) {
      this._freezeNodes();
    }
    this.stabilizationIterations = 0;
  
    setTimeout(() => this._stabilizationBatch(),0);
  }

  _stabilizationBatch() {
    var count = 0;
    while (this.stabilized === false && count < this.options.stabilization.updateInterval && this.stabilizationIterations < this.targetIterations) {
      this.physicsTick();
      this.stabilizationIterations++;
      count++;
    }
  
    if (this.stabilized === false && this.stabilizationIterations < this.targetIterations) {
      this.body.emitter.emit('stabilizationProgress', {iterations: this.stabilizationIterations, total: this.targetIterations});
      setTimeout(this._stabilizationBatch.bind(this),0);
    }
    else {
      this._finalizeStabilization();
    }
  }

  _finalizeStabilization() {
    this.body.emitter.emit('_allowRedrawRequests');
    if (this.options.stabilization.fit === true) {
      this.body.emitter.emit('fit');
    }

    if (this.options.stabilization.onlyDynamicEdges === true) {
      this._restoreFrozenNodes();
    }
    
    this.body.emitter.emit('stabilizationIterationsDone');
    this.body.emitter.emit('_requestRedraw');

    if (this.stabilized === true) {
      this._emitStabilized();
    }
    else {
      this.startSimulation();
    }

    this.ready = true;
  }
  
}

export default PhysicsEngine;