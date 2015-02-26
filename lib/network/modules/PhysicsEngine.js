/**
 * Created by Alex on 2/23/2015.
 */

import {BarnesHutSolver} from "./components/physics/BarnesHutSolver";
import {Repulsion} from "./components/physics/RepulsionSolver";
import {HierarchicalRepulsion} from "./components/physics/HierarchicalRepulsionSolver";

import {SpringSolver} from "./components/physics/SpringSolver";
import {HierarchicalSpringSolver} from "./components/physics/HierarchicalSpringSolver";

import {CentralGravitySolver} from "./components/physics/CentralGravitySolver";

class PhysicsEngine {
  constructor(body, options) {
    this.body = body;
    this.physicsBody = {calculationNodes: {}, calculationNodeIndices:[], forces: {}, velocities: {}};
    this.previousStates = {};
    this.setOptions(options);
  }

  setOptions(options) {
    if (options !== undefined) {
      this.options = options;
      this.init();
    }
  }


  init() {
    var options;
    if (this.options.model == "repulsion") {
      options = this.options.repulsion;
      this.nodesSolver = new Repulsion(this.body, this.physicsBody, options);
      this.edgesSolver = new SpringSolver(this.body, this.physicsBody, options);
    }
    else if (this.options.model == "hierarchicalRepulsion") {
      options = this.options.hierarchicalRepulsion;
      this.nodesSolver = new HierarchicalRepulsion(this.body, this.physicsBody, options);
      this.edgesSolver = new HierarchicalSpringSolver(this.body, this.physicsBody, options);
    }
    else { // barnesHut
      options = this.options.barnesHut;
      this.nodesSolver = new BarnesHutSolver(this.body, this.physicsBody, options);
      this.edgesSolver = new SpringSolver(this.body, this.physicsBody, options);
    }

    this.gravitySolver = new CentralGravitySolver(this.body, this.physicsBody, options);
    this.modelOptions = options;
  }

  /**
   * Smooth curves are created by adding invisible nodes in the center of the edges. These nodes are also
   * handled in the calculateForces function. We then use a quadratic curve with the center node as control.
   * This function joins the datanodes and invisible (called support) nodes into one object.
   * We do this so we do not contaminate this.body.nodes with the support nodes.
   *
   * @private
   */
  _updateCalculationNodes() {
    this.physicsBody.calculationNodes = {};
    this.physicsBody.forces = {};
    this.physicsBody.calculationNodeIndices = [];

    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let nodeId = this.body.nodeIndices[i];
      this.physicsBody.calculationNodes[nodeId] = this.body.nodes[nodeId];
    }

    // if support nodes are used, we have them here
    var supportNodes = this.body.supportNodes;
    for (let i = 0; i < this.body.supportNodeIndices.length; i++) {
      let supportNodeId = this.body.supportNodeIndices[i];
      if (this.body.edges[supportNodes[supportNodeId].parentEdgeId] !== undefined) {
        this.physicsBody.calculationNodes[supportNodeId] = supportNodes[supportNodeId];
      }
      else {
        console.error("Support node detected that does not have an edge!")
      }
    }

    this.physicsBody.calculationNodeIndices = Object.keys(this.physicsBody.calculationNodes);
    for (let i = 0; i < this.physicsBody.calculationNodeIndices.length; i++) {
      let nodeId = this.physicsBody.calculationNodeIndices[i];
      this.physicsBody.forces[nodeId] = {x:0,y:0};

      // forces can be reset because they are recalculated. Velocities have to persist.
      if (this.physicsBody.velocities[nodeId] === undefined) {
        this.physicsBody.velocities[nodeId] = {x:0,y:0};
      }
    }

    // clean deleted nodes from the velocity vector
    for (let nodeId in this.physicsBody.velocities) {
      if (this.physicsBody.calculationNodes[nodeId] === undefined) {
        delete this.physicsBody.velocities[nodeId];
      }
    }
  }


  revert() {
    var nodeIds = Object.keys(this.previousStates);
    var nodes = this.physicsBody.calculationNodes;
    var velocities = this.physicsBody.velocities;

    for (let i = 0; i < nodeIds.length; i++) {
      let nodeId = nodeIds[i];
      if (nodes[nodeId] !== undefined) {
        velocities[nodeId].x = this.previousStates[nodeId].vx;
        velocities[nodeId].y = this.previousStates[nodeId].vy;
        nodes[nodeId].x = this.previousStates[nodeId].x;
        nodes[nodeId].y = this.previousStates[nodeId].y;
      }
      else {
        delete this.previousStates[nodeId];
      }
    }
  }

  moveNodes() {
    var nodesPresent = false;
    var nodeIndices = this.physicsBody.calculationNodeIndices;
    var maxVelocity = this.options.maxVelocity === 0 ? 1e9 : this.options.maxVelocity;
    var moving = false;
    var vminCorrected = this.options.minVelocity / Math.max(this.body.functions.getScale(),0.05);

    for (let i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      let nodeVelocity = this._performStep(nodeId, maxVelocity);
      moving = nodeVelocity > vminCorrected;
      nodesPresent = true;
    }


    if (nodesPresent == true) {
      if (vminCorrected > 0.5*this.options.maxVelocity) {
        return true;
      }
      else {
        return moving;
      }
    }
    return false;
  }

  _performStep(nodeId,maxVelocity) {
    var node = this.physicsBody.calculationNodes[nodeId];
    var timestep = this.options.timestep;
    var forces = this.physicsBody.forces;
    var velocities = this.physicsBody.velocities;

    // store the state so we can revert
    this.previousStates[nodeId] = {x:node.x, y:node.y, vx:velocities[nodeId].x, vy:velocities[nodeId].y};

    if (!node.xFixed) {
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

    if (!node.yFixed) {
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


  calculateForces() {
    this.gravitySolver.solve();
    this.nodesSolver.solve();
    this.edgesSolver.solve();
  }
}

export {PhysicsEngine};