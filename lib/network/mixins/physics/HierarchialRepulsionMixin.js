/**
 * Calculate the forces the nodes apply on eachother based on a repulsion field.
 * This field is linearly approximated.
 *
 * @private
 */
exports._calculateNodeForces = function () {
  var dx, dy, distance, fx, fy,
    repulsingForce, node1, node2, i, j;

  var nodes = this.calculationNodes;
  var nodeIndices = this.calculationNodeIndices;

  // repulsing forces between nodes
  var nodeDistance = this.constants.physics.hierarchicalRepulsion.nodeDistance;

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
          repulsingForce = -Math.pow(steepness*distance,2) + Math.pow(steepness*nodeDistance,2);
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

  var nodes = this.calculationNodes;
  var nodeIndices = this.calculationNodeIndices;


  for (var i = 0; i < nodeIndices.length; i++) {
    var node1 = nodes[nodeIndices[i]];
    node1.springFx = 0;
    node1.springFy = 0;
  }


  // forces caused by the edges, modelled as springs
  for (edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      edge = edges[edgeId];
      if (edge.connected) {
        // only calculate forces if nodes are in the same sector
        if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
          edgeLength = edge.physics.springLength;
          // this implies that the edges between big clusters are longer
          edgeLength += (edge.to.clusterSize + edge.from.clusterSize - 2) * this.constants.clustering.edgeGrowth;

          dx = (edge.from.x - edge.to.x);
          dy = (edge.from.y - edge.to.y);
          distance = Math.sqrt(dx * dx + dy * dy);

          if (distance == 0) {
            distance = 0.01;
          }

          // the 1/distance is so the fx and fy can be calculated without sine or cosine.
          springForce = this.constants.physics.springConstant * (edgeLength - distance) / distance;

          fx = dx * springForce;
          fy = dy * springForce;



          if (edge.to.level != edge.from.level) {
            edge.to.springFx -= fx;
            edge.to.springFy -= fy;
            edge.from.springFx += fx;
            edge.from.springFy += fy;
          }
          else {
            var factor = 0.5;
            edge.to.fx -= factor*fx;
            edge.to.fy -= factor*fy;
            edge.from.fx += factor*fx;
            edge.from.fy += factor*fy;
          }
        }
      }
    }
  }

  // normalize spring forces
  var springForce = 1;
  var springFx, springFy;
  for (i = 0; i < nodeIndices.length; i++) {
    var node = nodes[nodeIndices[i]];
    springFx = Math.min(springForce,Math.max(-springForce,node.springFx));
    springFy = Math.min(springForce,Math.max(-springForce,node.springFy));

    node.fx += springFx;
    node.fy += springFy;
  }

  // retain energy balance
  var totalFx = 0;
  var totalFy = 0;
  for (i = 0; i < nodeIndices.length; i++) {
    var node = nodes[nodeIndices[i]];
    totalFx += node.fx;
    totalFy += node.fy;
  }
  var correctionFx = totalFx / nodeIndices.length;
  var correctionFy = totalFy / nodeIndices.length;

  for (i = 0; i < nodeIndices.length; i++) {
    var node = nodes[nodeIndices[i]];
    node.fx -= correctionFx;
    node.fy -= correctionFy;
  }

};