import BarnesHutSolver                      from './components/physics/BarnesHutSolver';
import Repulsion                            from './components/physics/RepulsionSolver';
import HierarchicalRepulsion                from './components/physics/HierarchicalRepulsionSolver';
import SpringSolver                         from './components/physics/SpringSolver';
import HierarchicalSpringSolver             from './components/physics/HierarchicalSpringSolver';
import CentralGravitySolver                 from './components/physics/CentralGravitySolver';
import ForceAtlas2BasedRepulsionSolver      from './components/physics/FA2BasedRepulsionSolver';
import ForceAtlas2BasedCentralGravitySolver from './components/physics/FA2BasedCentralGravitySolver';

class PhysicsWorker {
  constructor(postMessage) {
    this.body = {};
    this.physicsBody = {physicsNodeIndices:[], physicsEdgeIndices:[], forces: {}, velocities: {}};
    this.postMessage = postMessage;
    this.options = {};
    this.stabilized = false;
    this.previousStates = {};
    this.positions = {};
    this.timestep = 0.5;
  }

  handleMessage(event) {
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
        let node = this.body.nodes[msg.data.id];
        node.x = msg.data.x;
        node.y = msg.data.y;
        this.physicsBody.forces[node.id] = {x: 0, y: 0};
        this.physicsBody.velocities[node.id] = {x: 0, y: 0};
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
          this.physicsBody.physicsNodeIndices.push(nodeId);
          this.positions[nodeId] = {
            x: nodes[nodeId].x,
            y: nodes[nodeId].y
          }
      }
    }

    // get edge indices for physics
    for (let edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
          this.physicsBody.physicsEdgeIndices.push(edgeId);
      }
    }

    // get the velocity and the forces vector
    for (let i = 0; i < this.physicsBody.physicsNodeIndices.length; i++) {
      let nodeId = this.physicsBody.physicsNodeIndices[i];
      this.physicsBody.forces[nodeId] = {x: 0, y: 0};

      // forces can be reset because they are recalculated. Velocities have to persist.
      if (this.physicsBody.velocities[nodeId] === undefined) {
        this.physicsBody.velocities[nodeId] = {x: 0, y: 0};
      }
    }

    // clean deleted nodes from the velocity vector
    for (let nodeId in this.physicsBody.velocities) {
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
  moveNodes() {
    var nodeIndices = this.physicsBody.physicsNodeIndices;
    var maxVelocity = this.options.maxVelocity ? this.options.maxVelocity : 1e9;
    var maxNodeVelocity = 0;

    for (let i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      let nodeVelocity = this._performStep(nodeId, maxVelocity);
      // stabilized is true if stabilized is true and velocity is smaller than vmin --> all nodes must be stabilized
      maxNodeVelocity = Math.max(maxNodeVelocity,nodeVelocity);
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
  _performStep(nodeId,maxVelocity) {
    let node = this.body.nodes[nodeId];
    let timestep = this.timestep;
    let forces = this.physicsBody.forces;
    let velocities = this.physicsBody.velocities;

    // store the state so we can revert
    this.previousStates[nodeId] = {x:node.x, y:node.y, vx:velocities[nodeId].x, vy:velocities[nodeId].y};

    if (node.options.fixed.x === false) {
      let dx   = this.modelOptions.damping * velocities[nodeId].x;   // damping force
      let ax   = (forces[nodeId].x - dx) / node.options.mass;        // acceleration
      velocities[nodeId].x += ax * timestep;                         // velocity
      velocities[nodeId].x = (Math.abs(velocities[nodeId].x) > maxVelocity) ? ((velocities[nodeId].x > 0) ? maxVelocity : -maxVelocity) : velocities[nodeId].x;
      node.x   += velocities[nodeId].x * timestep;                    // position
      this.positions[nodeId].x = node.x;
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
      node.y   += velocities[nodeId].y * timestep;                     // position
      this.positions[nodeId].y = node.y;
    }
    else {
      forces[nodeId].y = 0;
      velocities[nodeId].y = 0;
    }

    let totalVelocity = Math.sqrt(Math.pow(velocities[nodeId].x,2) + Math.pow(velocities[nodeId].y,2));
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
}

export default PhysicsWorker;
