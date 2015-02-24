/**
 * Created by Alex on 2/23/2015.
 */

import {BarnesHut} from "./components/physics/BarnesHutSolver";
import {SpringSolver} from "./components/physics/SpringSolver";
import {CentralGravitySolver} from "./components/physics/CentralGravitySolver";

class PhysicsEngine {
  constructor(body, options) {
    this.body = body;

    this.nodesSolver = new BarnesHut(body, options);
    this.edgesSolver = new SpringSolver(body, options);
    this.gravitySolver = new CentralGravitySolver(body, options);
  }

  calculateField() {
    this.nodesSolver.solve();
  };

  calculateSprings() {
    this.edgesSolver.solve();
  };

  calculateCentralGravity() {
    this.gravitySolver.solve();
  };

  calculate() {
    this.calculateCentralGravity();
    this.calculateField();
    this.calculateSprings();
  };
}