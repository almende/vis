/**
 * Calculate the forces the nodes apply on each other based on a repulsion field.
 * This field is linearly approximated.
 *
 * @private
 */
exports._calculateNodeForces = function () {
  var dx, dy, angle, distance, fx, fy, combinedClusterSize,
    repulsingForce, node1, node2, i, j;

  var nodes = this.calculationNodes;
  var nodeIndices = this.calculationNodeIndices;

  // approximation constants
  var a_base = -2 / 3;
  var b = 4 / 3;

  // repulsing forces between nodes
  var nodeDistance = this.constants.physics.repulsion.nodeDistance;
  var minimumDistance = nodeDistance;

  // we loop from i over all but the last entree in the array
  // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
  for (i = 0; i < nodeIndices.length - 1; i++) {
    node1 = nodes[nodeIndices[i]];
    for (j = i + 1; j < nodeIndices.length; j++) {
      node2 = nodes[nodeIndices[j]];
      combinedClusterSize = node1.clusterSize + node2.clusterSize - 2;

      dx = node2.x - node1.x;
      dy = node2.y - node1.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      // same condition as BarnesHut, making sure nodes are never 100% overlapping.
      if (distance == 0) {
        distance = 0.1*Math.random();
        dx = distance;
      }

      minimumDistance = (combinedClusterSize == 0) ? nodeDistance : (nodeDistance * (1 + combinedClusterSize * this.constants.clustering.distanceAmplification));
      var a = a_base / minimumDistance;
      if (distance < 2 * minimumDistance) {
        if (distance < 0.5 * minimumDistance) {
          repulsingForce = 1.0;
        }
        else {
          repulsingForce = a * distance + b; // linear approx of  1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness))
        }

        // amplify the repulsion for clusters.
        repulsingForce *= (combinedClusterSize == 0) ? 1 : 1 + combinedClusterSize * this.constants.clustering.forceAmplification;
        repulsingForce = repulsingForce / Math.max(distance,0.01*minimumDistance);

        fx = dx * repulsingForce;
        fy = dy * repulsingForce;
        node1.fx -= fx;
        node1.fy -= fy;
        node2.fx += fx;
        node2.fy += fy;

      }
    }
  }
};
