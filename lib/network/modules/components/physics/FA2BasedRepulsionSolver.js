import BarnesHutSolver from "./BarnesHutSolver"

class ForceAtlas2BasedRepulsionSolver extends BarnesHutSolver {
  constructor(body, physicsBody, options) {
    super(body, physicsBody, options);
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
  _calculateForces(distance, dx, dy, node, parentBranch) {
    if (distance === 0) {
      distance = 0.1 * Math.random();
      dx = distance;
    }

    if (this.overlapAvoidanceFactor < 1 && node.shape.radius) {
      distance = Math.max(0.1 + (this.overlapAvoidanceFactor * node.shape.radius), distance - node.shape.radius);
    }

    let degree = (node.edges.length + 1);
    // the dividing by the distance cubed instead of squared allows us to get the fx and fy components without sines and cosines
    // it is shorthand for gravityforce with distance squared and fx = dx/distance * gravityForce
    let gravityForce = this.options.gravitationalConstant * parentBranch.mass * node.options.mass * degree / Math.pow(distance,2);
    let fx = dx * gravityForce;
    let fy = dy * gravityForce;

    this.physicsBody.forces[node.id].x += fx;
    this.physicsBody.forces[node.id].y += fy;
  }
}

export default ForceAtlas2BasedRepulsionSolver;
