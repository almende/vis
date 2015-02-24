/**
 * Created by Alex on 2/23/2015.
 */

import {BarnesHutSolver} from "./components/physics/BarnesHutSolver";
// TODO Create
//import {Repulsion} from "./components/physics/Repulsion";
//import {HierarchicalRepulsion} from "./components/physics/HierarchicalRepulsion";

import {SpringSolver} from "./components/physics/SpringSolver";
// TODO Create
//import {HierarchicalSpringSolver} from "./components/physics/HierarchicalSpringSolver";

import {CentralGravitySolver} from "./components/physics/CentralGravitySolver";

class PhysicsEngine {
  constructor(body, options) {
    this.body = body;
    this.physicsBody = {calculationNodes: {}, calculationNodeIndices:[]};
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
      // TODO uncomment when created
      //this.nodesSolver = new Repulsion(this.body, this.physicsBody, options);
      //this.edgesSolver = new SpringSolver(this.body, options);
    }
    else if (this.options.model == "hierarchicalRepulsion") {
      options = this.options.hierarchicalRepulsion;
      // TODO uncomment when created
      //this.nodesSolver = new HierarchicalRepulsion(this.body, this.physicsBody, options);
      //this.edgesSolver = new HierarchicalSpringSolver(this.body, options);
    }
    else { // barnesHut
      options = this.options.barnesHut;
      this.nodesSolver = new BarnesHutSolver(this.body, this.physicsBody, options);
      this.edgesSolver = new SpringSolver(this.body, options);
    }

    this.gravitySolver = new CentralGravitySolver(this.body, this.physicsBody, options);
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
    console.log('here', this.body)
    this.physicsBody.calculationNodeIndices = Object.keys(this.physicsBody.calculationNodes);
  }


  calculateField() {
    this.nodesSolver.solve();
  }

  calculateSprings() {
    this.edgesSolver.solve();
  }

  calculateCentralGravity() {
    this.gravitySolver.solve();
  }

  step() {
    this.calculateCentralGravity();
    this.calculateField();
    this.calculateSprings();
  }
}

export {PhysicsEngine};