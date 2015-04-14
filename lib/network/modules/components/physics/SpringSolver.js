class SpringSolver {
  constructor(body, physicsBody, options) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.setOptions(options);
  }

  setOptions(options) {
    this.options = options;
  }

  /**
   * This function calculates the springforces on the nodes, accounting for the support nodes.
   *
   * @private
   */
  solve() {
    var edgeLength, edge;
    var edgeIndices = this.physicsBody.physicsEdgeIndices;
    var edges = this.body.edges;

    // forces caused by the edges, modelled as springs
    for (let i = 0; i < edgeIndices.length; i++) {
      edge = edges[edgeIndices[i]];
      if (edge.connected === true) {
        // only calculate forces if nodes are in the same sector
        if (this.body.nodes[edge.toId] !== undefined && this.body.nodes[edge.fromId] !== undefined) {
          if (edge.edgeType.via !== undefined) {
            edgeLength = edge.options.length === undefined ? this.options.springLength : edge.options.length;
            var node1 = edge.to;
            var node2 = edge.edgeType.via;
            var node3 = edge.from;


            this._calculateSpringForce(node1, node2, 0.5 * edgeLength);
            this._calculateSpringForce(node2, node3, 0.5 * edgeLength);
          }
          else {
            // the * 1.5 is here so the edge looks as large as a smooth edge. It does not initially because the smooth edges use
            // the support nodes which exert a repulsive force on the to and from nodes, making the edge appear larger.
            edgeLength = edge.options.length === undefined ? this.options.springLength * 1.5: edge.options.length;
            this._calculateSpringForce(edge.from, edge.to, edgeLength);
          }
        }
      }
    }
  }


  /**
   * This is the code actually performing the calculation for the function above.
   *
   * @param node1
   * @param node2
   * @param edgeLength
   * @private
   */
  _calculateSpringForce(node1, node2, edgeLength) {
    var dx, dy, fx, fy, springForce, distance;

    dx = (node1.x - node2.x);
    dy = (node1.y - node2.y);
    distance = Math.sqrt(dx * dx + dy * dy);
    distance = distance === 0 ? 0.01 : distance;

    // the 1/distance is so the fx and fy can be calculated without sine or cosine.
    springForce = this.options.springConstant * (edgeLength - distance) / distance;

    fx = dx * springForce;
    fy = dy * springForce;

    // handle the case where one node is not part of the physcis
    if (this.physicsBody.forces[node1.id] !== undefined) {
      this.physicsBody.forces[node1.id].x += fx;
      this.physicsBody.forces[node1.id].y += fy;
    }

    if (this.physicsBody.forces[node2.id] !== undefined) {
      this.physicsBody.forces[node2.id].x -= fx;
      this.physicsBody.forces[node2.id].y -= fy;
    }
  }
}

export default SpringSolver;