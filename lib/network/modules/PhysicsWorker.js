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
    this.body = {
      nodes: {},
      edges: {}
    };
    this.physicsBody = {physicsNodeIndices:[], physicsEdgeIndices:[], forces: {}, velocities: {}};
    this.postMessage = postMessage;
    this.options = {};
    this.stabilized = false;
    this.previousStates = {};
    this.positions = {};
    this.timestep = 0.5;
    this.toRemove = {
      nodes: [],
      edges: []
    };
  }

  handleMessage(event) {
    var msg = event.data;
    switch (msg.type) {
      case 'physicsTick':
        this.physicsTick();
        break;
      case 'updatePositions':
        let updatedNode = this.body.nodes[msg.data.id];
        if (updatedNode) {
          updatedNode.x = msg.data.x;
          updatedNode.y = msg.data.y;
          this.physicsBody.forces[updatedNode.id] = {x: 0, y: 0};
          this.physicsBody.velocities[updatedNode.id] = {x: 0, y: 0};
        }
        break;
      case 'updateProperties':
        this.updateProperties(msg.data);
        break;
      case 'addElements':
        this.addElements(msg.data);
        break;
      case 'removeElements':
        // schedule removal of elements on the next physicsTick
        // avoids having to defensively check every node read in each physics implementation
        this.toRemove.nodes.push.apply(this.toRemove.nodes, msg.data.nodes);
        this.toRemove.edges.push.apply(this.toRemove.edges, msg.data.edges);
        break;
      case 'initPhysicsData':
        this.initPhysicsData(msg.data);
        break;
      case 'options':
        this.options = msg.data;
        this.timestep = this.options.timestep;
        this.init();
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

  physicsTick() {
    this.processRemovals();
    this.calculateForces();
    this.moveNodes();
    for (let i = 0; i < this.toRemove.nodes.length; i++) {
      delete this.positions[this.toRemove.nodes[i]];
    }
    this.postMessage({
      type: 'positions',
      data: {
        positions: this.positions,
        stabilized: this.stabilized
      }
    });
  }

  updateProperties(data) {
    let optionsNode = this.body.nodes[data.id];
    if (optionsNode) {
      let opts = data.options;
      if (opts.fixed) {
        if (opts.fixed.x !== undefined) {
          optionsNode.options.fixed.x = opts.fixed.x;
        }
        if (opts.fixed.y !== undefined) {
          optionsNode.options.fixed.y = opts.fixed.y;
        }
      }
      if (opts.mass !== undefined) {
        optionsNode.options.mass = opts.mass;
      }
    } else {
      console.log('sending property to unknown node');
    }
  }

  addElements(data, replaceElements = true) {
    let nodeIds = Object.keys(data.nodes);
    for (let i = 0; i < nodeIds.length; i++) {
      let nodeId = nodeIds[i];
      let newNode = data.nodes[nodeId];
      if (replaceElements) {
        this.body.nodes[nodeId] = newNode;
      }
      this.positions[nodeId] = {
        x: newNode.x,
        y: newNode.y
      };
      this.physicsBody.forces[nodeId] = {x: 0, y: 0};
      // forces can be reset because they are recalculated. Velocities have to persist.
      if (this.physicsBody.velocities[nodeId] === undefined) {
        this.physicsBody.velocities[nodeId] = {x: 0, y: 0};
      }
      if (this.physicsBody.physicsNodeIndices.indexOf(nodeId) === -1) {
        this.physicsBody.physicsNodeIndices.push(nodeId);
      }
    }
    let edgeIds = Object.keys(data.edges);
    for (let i = 0; i < edgeIds.length; i++) {
      let edgeId = edgeIds[i];
      if (replaceElements) {
        this.body.edges[edgeId] = data.edges[edgeId];
      }
      if (this.physicsBody.physicsEdgeIndices.indexOf(edgeId) === -1) {
        this.physicsBody.physicsEdgeIndices.push(edgeId);
      }
    }
  }

  processRemovals() {
    while (this.toRemove.nodes.length > 0) {
      let nodeId = this.toRemove.nodes.pop();
      let index = this.physicsBody.physicsNodeIndices.indexOf(nodeId);
      if (index > -1) {
        this.physicsBody.physicsNodeIndices.splice(index,1);
      }
      delete this.physicsBody.forces[nodeId];
      delete this.physicsBody.velocities[nodeId];
      delete this.positions[nodeId];
      delete this.body.nodes[nodeId];
    }
    while (this.toRemove.edges.length > 0) {
      let edgeId = this.toRemove.edges.pop();
      let index = this.physicsBody.physicsEdgeIndices.indexOf(edgeId);
      if (index > -1) {
        this.physicsBody.physicsEdgeIndices.splice(index,1);
      }
      delete this.body.edges[edgeId];
    }
  }

  /**
   * Nodes and edges can have the physics toggles on or off. A collection of indices is created here so we can skip the check all the time.
   *
   * @private
   */
  initPhysicsData(data) {
    this.physicsBody.forces = {};
    this.physicsBody.physicsNodeIndices = [];
    this.physicsBody.physicsEdgeIndices = [];
    this.positions = {};

    this.body.nodes = data.nodes;
    this.body.edges = data.edges;
    this.addElements(data, false);

    // clean deleted nodes from the velocity vector
    for (let nodeId in this.physicsBody.velocities) {
      if (this.body.nodes[nodeId] === undefined) {
        delete this.physicsBody.velocities[nodeId];
      }
    }
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
    }
    else {
      forces[nodeId].x = 0;
      velocities[nodeId].x = 0;
    }
    this.positions[nodeId].x = node.x;

    if (node.options.fixed.y === false) {
      let dy   = this.modelOptions.damping * velocities[nodeId].y;    // damping force
      let ay   = (forces[nodeId].y - dy) / node.options.mass;         // acceleration
      velocities[nodeId].y += ay * timestep;                          // velocity
      velocities[nodeId].y = (Math.abs(velocities[nodeId].y) > maxVelocity) ? ((velocities[nodeId].y > 0) ? maxVelocity : -maxVelocity) : velocities[nodeId].y;
      node.y   += velocities[nodeId].y * timestep;                     // position
    }
    else {
      forces[nodeId].y = 0;
      velocities[nodeId].y = 0;
    }
    this.positions[nodeId].y = node.y;

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
