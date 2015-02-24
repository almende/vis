/**
 * Created by Alex on 2/23/2015.
 */

function SpringSolver(body, options) {
  this.body = body;
  this.options = options;
}



/**
 * this function calculates the effects of the springs in the case of unsmooth curves.
 *
 * @private
 */
SpringSolver.prototype._calculateSpringForces = function () {
  var edgeLength, edge, edgeId;
  var edges = this.edges;

  // forces caused by the edges, modelled as springs
  for (edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      edge = edges[edgeId];
      if (edge.connected === true) {
        // only calculate forces if nodes are in the same sector
        if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
          edgeLength = edge.physics.springLength;

          this._calculateSpringForce(edge.from, edge.to, edgeLength);
        }
      }
    }
  }
};




/**
 * This function calculates the springforces on the nodes, accounting for the support nodes.
 *
 * @private
 */
SpringSolver.prototype._calculateSpringForcesWithSupport = function () {
  var edgeLength, edge, edgeId;
  var edges = this.edges;

  // forces caused by the edges, modelled as springs
  for (edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      edge = edges[edgeId];
      if (edge.connected === true) {
        // only calculate forces if nodes are in the same sector
        if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
          if (edge.via != null) {
            var node1 = edge.to;
            var node2 = edge.via;
            var node3 = edge.from;

            edgeLength = edge.physics.springLength;

            this._calculateSpringForce(node1, node2, 0.5 * edgeLength);
            this._calculateSpringForce(node2, node3, 0.5 * edgeLength);
          }
        }
      }
    }
  }
};


/**
 * This is the code actually performing the calculation for the function above. It is split out to avoid repetition.
 *
 * @param node1
 * @param node2
 * @param edgeLength
 * @private
 */
SpringSolver.prototype._calculateSpringForce = function (node1, node2, edgeLength) {
  var dx, dy, fx, fy, springForce, distance;

  dx = (node1.x - node2.x);
  dy = (node1.y - node2.y);
  distance = Math.sqrt(dx * dx + dy * dy);
  distance = distance == 0 ? 0.01 : distance;

  // the 1/distance is so the fx and fy can be calculated without sine or cosine.
  springForce = this.options.springConstant * (edgeLength - distance) / distance;

  fx = dx * springForce;
  fy = dy * springForce;

  node1.fx += fx;
  node1.fy += fy;
  node2.fx -= fx;
  node2.fy -= fy;
};

module.exports = SpringSolver;