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
    var nodes = this.physicsBody.calculationNodes;
    var calculationNodeIndices = this.physicsBody.calculationNodeIndices;
    var gravity = this.options.centralGravity;
    var gravityForce = 0;

    for (i = 0; i < calculationNodeIndices.length; i++) {
      node = nodes[calculationNodeIndices[i]];
      node.damping = this.options.damping;
      dx = -node.x;
      dy = -node.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      gravityForce = (distance == 0) ? 0 : (gravity / distance);
      node.fx = dx * gravityForce;
      node.fy = dy * gravityForce;
    }
  }
}


export {CentralGravitySolver};