/**
 * Created by Alex on 2/23/2015.
 */

class HierarchicalRepulsionSolver {
  constructor(body, physicsBody, options) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.options = options;
  }

  /**
   * Calculate the forces the nodes apply on each other based on a repulsion field.
   * This field is linearly approximated.
   *
   * @private
   */
  solve() {
    var dx, dy, distance, fx, fy,
      repulsingForce, node1, node2, i, j;

    var nodes = this.physicsBody.calculationNodes;
    var nodeIndices = this.physicsBody.calculationNodeIndices;

    // repulsing forces between nodes
    var nodeDistance = this.options.nodeDistance;

    // we loop from i over all but the last entree in the array
    // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
    for (i = 0; i < nodeIndices.length - 1; i++) {
      node1 = nodes[nodeIndices[i]];
      for (j = i + 1; j < nodeIndices.length; j++) {
        node2 = nodes[nodeIndices[j]];

        // nodes only affect nodes on their level
        if (node1.level == node2.level) {

          dx = node2.x - node1.x;
          dy = node2.y - node1.y;
          distance = Math.sqrt(dx * dx + dy * dy);


          var steepness = 0.05;
          if (distance < nodeDistance) {
            repulsingForce = -Math.pow(steepness * distance, 2) + Math.pow(steepness * nodeDistance, 2);
          }
          else {
            repulsingForce = 0;
          }
          // normalize force with
          if (distance == 0) {
            distance = 0.01;
          }
          else {
            repulsingForce = repulsingForce / distance;
          }
          fx = dx * repulsingForce;
          fy = dy * repulsingForce;

          node1.fx -= fx;
          node1.fy -= fy;
          node2.fx += fx;
          node2.fy += fy;
        }
      }
    }
  }
}


export {HierarchicalRepulsionSolver};