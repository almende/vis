/**
 * Created by Alex on 2/23/2015.
 */

class CentralGravitySolver {
  constructor(body, options) {
    this.body = body;
    this.options = options;
  }

  solve() {
    var dx, dy, distance, node, i;
    var nodes = this.body.calculationNodes;
    var gravity = this.options.centralGravity;
    var gravityForce = 0;
    var calculationNodeIndices = this.body.calculationNodeIndices;

    for (i = 0; i < calculationNodeIndices.length; i++) {
      node = nodes[calculationNodeIndices[i]];
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