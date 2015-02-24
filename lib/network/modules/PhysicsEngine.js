/**
 * Created by Alex on 2/23/2015.
 */

var BarnesHut = require("./compontents/BarnesHutSolver")
var SpringSolver = require("./compontents/SpringSolver")
var CentralGravitySolver = require("./compontents/CentralGravitySolver")

function PhysicsEngine(body, options) {
  this.body = body;

  this.nodesSolver = new BarnesHut(body, options);
  this.edgesSolver = new SpringSolver(body, options);
  this.gravitySolver = new CentralGravitySolver(body, options);
}

PhysicsEngine.prototype.calculateField = function () {
  this.nodesSolver.solve();
};

PhysicsEngine.prototype.calculateSprings = function () {
  this.edgesSolver.solve();
};

PhysicsEngine.prototype.calculateCentralGravity = function () {
  this.gravitySolver.solve();
};

PhysicsEngine.prototype.calculate = function () {
  this.calculateCentralGravity();
  this.calculateField();
  this.calculateSprings();
};