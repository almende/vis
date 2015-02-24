/**
 * Created by Alex on 2/23/2015.
 */

function CentralGravitySolver(body, options) {
  this.body = body;
  this.options = options;
}


CentralGravitySolver.prototype.solve = function () {
  var dx, dy, distance, node, i;
  var nodes = this.body.calculationNodes;
  var gravity = this.options.centralGravity;
  var gravityForce = 0;

  for (i = 0; i < this.body.calculationNodeIndices.length; i++) {
    node = nodes[this.body.calculationNodeIndices[i]];
    node.damping = this.options.damping; // possibly add function to alter damping properties of clusters.

    dx = -node.x;
    dy = -node.y;
    distance = Math.sqrt(dx * dx + dy * dy);

    gravityForce = (distance == 0) ? 0 : (gravity / distance);
    node.fx = dx * gravityForce;
    node.fy = dy * gravityForce;
  }
};


module.exports = CentralGravitySolver;