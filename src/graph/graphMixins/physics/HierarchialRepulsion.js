/**
 * Created by Alex on 2/10/14.
 */

var hierarchalRepulsionMixin = {


  /**
   * Calculate the forces the nodes apply on eachother based on a repulsion field.
   * This field is linearly approximated.
   *
   * @private
  */
  _calculateNodeForces : function() {
    var dx, dy, distance, fx, fy, combinedClusterSize,
      repulsingForce, node1, node2, i, j;

    var nodes = this.calculationNodes;
    var nodeIndices = this.calculationNodeIndices;

    // approximation constants
    var b = 5;
    var a_base = 0.5*-b;


    // repulsing forces between nodes
    var nodeDistance = this.constants.physics.repulsion.nodeDistance;
    var minimumDistance = nodeDistance;

    // we loop from i over all but the last entree in the array
    // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
    for (i = 0; i < nodeIndices.length-1; i++) {

      node1 = nodes[nodeIndices[i]];
      for (j = i+1; j < nodeIndices.length; j++) {
        node2 = nodes[nodeIndices[j]];

        dx = node2.x - node1.x;
        dy = node2.y - node1.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        var a = a_base / minimumDistance;
        if (distance < 2*minimumDistance) {
          repulsingForce = a * distance + b; // linear approx of  1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness))

          // normalize force with
          if (distance == 0) {
            distance = 0.01;
          }
          else {
            repulsingForce = repulsingForce/distance;
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