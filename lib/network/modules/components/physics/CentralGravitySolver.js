/**
 * Created by Alex on 2/23/2015.
 */

class CentralGravitySolver {
  constructor(body, physicsBody, options) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.setOptions(options);
  }

  setOptions(options) {
    this.options = options;
  }

  solve() {
    var dx, dy, distance, node, i;
    var nodes = this.body.nodes;
    var nodeIndices = this.physicsBody.physicsNodeIndices;
    var forces = this.physicsBody.forces;


    var gravity = this.options.centralGravity;
    var gravityForce = 0;

    for (i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      node = nodes[nodeId];
      dx = -node.x;
      dy = -node.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      gravityForce = (distance == 0) ? 0 : (gravity / distance);
      forces[nodeId].x = dx * gravityForce;
      forces[nodeId].y = dy * gravityForce;
    }
  }
}


export default CentralGravitySolver;