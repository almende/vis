import BarnesHutSolver                      from './components/physics/BarnesHutSolver';
import Repulsion                            from './components/physics/RepulsionSolver';
import HierarchicalRepulsion                from './components/physics/HierarchicalRepulsionSolver';
import SpringSolver                         from './components/physics/SpringSolver';
import HierarchicalSpringSolver             from './components/physics/HierarchicalSpringSolver';
import CentralGravitySolver                 from './components/physics/CentralGravitySolver';
import ForceAtlas2BasedRepulsionSolver      from './components/physics/FA2BasedRepulsionSolver';
import ForceAtlas2BasedCentralGravitySolver from './components/physics/FA2BasedCentralGravitySolver';

class PhysicsBase {
  constructor() {
    this.physicsBody = {physicsNodeIndices:[], physicsEdgeIndices:[], forces: {}, velocities: {}};
    this.options = {};

    this.referenceState = {};
    this.previousStates = {};

    this.startedStabilization = false;
    this.stabilized = false;
    this.stabilizationIterations = 0;
    this.timestep = 0.5;

    // parameters for the adaptive timestep
    this.adaptiveTimestep = false;
    this.adaptiveTimestepEnabled = false;
    this.adaptiveCounter = 0;
    this.adaptiveInterval = 3;
  }

  /**
   * configure the engine.
   */
  initPhysicsSolvers() {
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
   * A single simulation step (or 'tick') in the physics simulation
   *
   * @private
   */
  physicsTick() {
    // this is here to ensure that there is no start event when the network is already stable.
    if (this.startedStabilization === false) {
      this.emit('startStabilizing');
      this.startedStabilization = true;
    }

    if (this.stabilized === false) {
      // adaptivity means the timestep adapts to the situation, only applicable for stabilization
      if (this.adaptiveTimestep === true && this.adaptiveTimestepEnabled === true) {
        // this is the factor for increasing the timestep on success.
        let factor = 1.2;

        // we assume the adaptive interval is
        if (this.adaptiveCounter % this.adaptiveInterval === 0) { // we leave the timestep stable for "interval" iterations.
          // first the big step and revert. Revert saves the reference state.
          this.timestep = 2 * this.timestep;
          this.calculateForces();
          this.moveNodes();
          this.revert();

          // now the normal step. Since this is the last step, it is the more stable one and we will take this.
          this.timestep = 0.5 * this.timestep;

          // since it's half the step, we do it twice.
          this.calculateForces();
          this.moveNodes();
          this.calculateForces();
          this.moveNodes();

          // we compare the two steps. if it is acceptable we double the step.
          if (this._evaluateStepQuality() === true) {
            this.timestep = factor * this.timestep;
          }
          else {
            // if not, we decrease the step to a minimum of the options timestep.
            // if the decreased timestep is smaller than the options step, we do not reset the counter
            // we assume that the options timestep is stable enough.
            if (this.timestep/factor < this.options.timestep) {
              this.timestep = this.options.timestep;
            }
            else {
              // if the timestep was larger than 2 times the option one we check the adaptivity again to ensure
              // that large instabilities do not form.
              this.adaptiveCounter = -1; // check again next iteration
              this.timestep = Math.max(this.options.timestep, this.timestep/factor);
            }
          }
        }
        else {
          // normal step, keeping timestep constant
          this.calculateForces();
          this.moveNodes();
        }

        // increment the counter
        this.adaptiveCounter += 1;
      }
      else {
        // case for the static timestep, we reset it to the one in options and take a normal step.
        this.timestep = this.options.timestep;
        this.calculateForces();
        this.moveNodes();
      }

      // determine if the network has stabilzied
      if (this.stabilized === true) {
        this.revert();
      }

      this.stabilizationIterations++;
    }
  }

  /**
   * Revert the simulation one step. This is done so after stabilization, every new start of the simulation will also say stabilized.
   */
  revert() {
    var nodeIds = Object.keys(this.previousStates);
    var nodes = this.body.nodes;
    var velocities = this.physicsBody.velocities;
    this.referenceState = {};

    for (let i = 0; i < nodeIds.length; i++) {
      let nodeId = nodeIds[i];
      if (nodes[nodeId] !== undefined) {
        if (this.isWorker || nodes[nodeId].options.physics === true) {
          this.referenceState[nodeId] = {
            positions: {x:nodes[nodeId].x, y:nodes[nodeId].y}
          };
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
   * This compares the reference state to the current state
   */
  _evaluateStepQuality() {
    let dx, dy, dpos;
    let nodes = this.body.nodes;
    let reference = this.referenceState;
    let posThreshold = 0.3;

    for (let nodeId in this.referenceState) {
      if (this.referenceState.hasOwnProperty(nodeId) && nodes[nodeId] !== undefined) {
        dx = nodes[nodeId].x - reference[nodeId].positions.x;
        dy = nodes[nodeId].y - reference[nodeId].positions.y;

        dpos = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2))

        if (dpos > posThreshold) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * move the nodes one timestap and check if they are stabilized
   * @returns {boolean}
   */
  moveNodes() {
    var nodeIndices = this.physicsBody.physicsNodeIndices;
    var maxVelocity = this.options.maxVelocity ? this.options.maxVelocity : 1e9;
    var maxNodeVelocity = 0;
    var averageNodeVelocity = 0;

    // the velocity threshold (energy in the system) for the adaptivity toggle
    var velocityAdaptiveThreshold = 5;

    for (let i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      let nodeVelocity = this._performStep(nodeId, maxVelocity);
      // stabilized is true if stabilized is true and velocity is smaller than vmin --> all nodes must be stabilized
      maxNodeVelocity = Math.max(maxNodeVelocity,nodeVelocity);
      averageNodeVelocity += nodeVelocity;
    }

    // evaluating the stabilized and adaptiveTimestepEnabled conditions
    this.adaptiveTimestepEnabled = (averageNodeVelocity/nodeIndices.length) < velocityAdaptiveThreshold;
    this.stabilized = maxNodeVelocity < this.options.minVelocity;
  }

  // TODO consider moving _performStep in here
  // right now Physics nodes don't have setX setY functions
  //   - maybe switch logic of setX and set x?
  //   - add functions to physics nodes - seems not desirable

  /**
   * calculate the forces for one physics iteration.
   */
  calculateForces() {
    this.gravitySolver.solve();
    this.nodesSolver.solve();
    this.edgesSolver.solve();
  }

  /**
   * One batch of stabilization
   * @private
   */
  _stabilizationBatch() {
    // this is here to ensure that there is at least one start event.
    if (this.startedStabilization === false) {
      this.emit('startStabilizing');
      this.startedStabilization = true;
    }

    var count = 0;
    while (this.stabilized === false && count < this.options.stabilization.updateInterval && this.stabilizationIterations < this.targetIterations) {
      this.physicsTick();
      count++;
    }

    if (this.stabilized === false && this.stabilizationIterations < this.targetIterations) {
      this.emit('stabilizationProgress', {iterations: this.stabilizationIterations, total: this.targetIterations});
      setTimeout(this._stabilizationBatch.bind(this),0);
    }
    else {
      this._finalizeStabilization();
    }
  }
}

export default PhysicsBase;