import CentralGravitySolver from "./CentralGravitySolver"

class ForceAtlas2BasedCentralGravitySolver extends CentralGravitySolver {
  constructor(body, physicsBody, options) {
    super(body, physicsBody, options);
  }


  /**
   * Calculate the forces based on the distance.
   * @private
   */
  _calculateForces(distance, dx, dy, forces, node) {
    if (distance > 0) {
      let degree = (node.edges.length + 1);
      let gravityForce = this.options.centralGravity * degree * node.options.mass;
      forces[node.id].x = dx * gravityForce;
      forces[node.id].y = dy * gravityForce;
    }
  }
}

export default ForceAtlas2BasedCentralGravitySolver;