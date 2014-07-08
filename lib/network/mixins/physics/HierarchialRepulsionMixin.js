/**
 * Calculate the forces the nodes apply on eachother based on a repulsion field.
 * This field is linearly approximated.
 *
 * @private
 */
exports._calculateNodeForces = function () {
  var dx, dy, distance, fx, fy, combinedClusterSize,
    repulsingForce, node1, node2, i, j;

  var nodes = this.calculationNodes;
  var nodeIndices = this.calculationNodeIndices;

  // approximation constants
  var b = 5;
  var a_base = 0.5 * -b;


  // repulsing forces between nodes
  var nodeDistance = this.constants.physics.hierarchicalRepulsion.nodeDistance;
  var minimumDistance = nodeDistance;
  var a = a_base / minimumDistance;

  // we loop from i over all but the last entree in the array
  // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
  for (i = 0; i < nodeIndices.length - 1; i++) {

    node1 = nodes[nodeIndices[i]];
    for (j = i + 1; j < nodeIndices.length; j++) {
      node2 = nodes[nodeIndices[j]];
      if (node1.level == node2.level) {

        dx = node2.x - node1.x;
        dy = node2.y - node1.y;
        distance = Math.sqrt(dx * dx + dy * dy);


        if (distance < 2 * minimumDistance) {
          repulsingForce = a * distance + b;
          var c = 0.05;
          var d = 2 * minimumDistance * 2 * c;
          repulsingForce = c * Math.pow(distance,2) - d * distance + d*d/(4*c);

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
};


/**
 * this function calculates the effects of the springs in the case of unsmooth curves.
 *
 * @private
 */
exports._calculateHierarchicalSpringForces = function () {
  var edgeLength, edge, edgeId;
  var dx, dy, fx, fy, springForce, distance;
  var edges = this.edges;

  // forces caused by the edges, modelled as springs
  for (edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      edge = edges[edgeId];
      if (edge.connected) {
        // only calculate forces if nodes are in the same sector
        if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
          edgeLength = edge.customLength ? edge.length : this.constants.physics.springLength;
          // this implies that the edges between big clusters are longer
          edgeLength += (edge.to.clusterSize + edge.from.clusterSize - 2) * this.constants.clustering.edgeGrowth;

          dx = (edge.from.x - edge.to.x);
          dy = (edge.from.y - edge.to.y);
          distance = Math.sqrt(dx * dx + dy * dy);

          if (distance == 0) {
            distance = 0.01;
          }

          distance = Math.max(0.8*edgeLength,Math.min(5*edgeLength, distance));

          // the 1/distance is so the fx and fy can be calculated without sine or cosine.
          springForce = this.constants.physics.springConstant * (edgeLength - distance) / distance;

          fx = dx * springForce;
          fy = dy * springForce;

          edge.to.fx -= fx;
          edge.to.fy -= fy;
          edge.from.fx += fx;
          edge.from.fy += fy;


          var factor = 5;
          if (distance > edgeLength) {
            factor = 25;
          }

          if (edge.from.level > edge.to.level) {
            edge.to.fx -= factor*fx;
            edge.to.fy -= factor*fy;
          }
          else if (edge.from.level < edge.to.level) {
            edge.from.fx += factor*fx;
            edge.from.fy += factor*fy;
          }
        }
      }
    }
  }
};