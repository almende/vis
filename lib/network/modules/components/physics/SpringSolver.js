/**
 * Created by Alex on 2/23/2015.
 */

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
    var edgeLength, edge, edgeId;
    var edges = this.body.edges;

    // forces caused by the edges, modelled as springs
    for (edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
        if (edge.connected === true) {
          // only calculate forces if nodes are in the same sector
          if (this.body.nodes[edge.toId] !== undefined && this.body.nodes[edge.fromId] !== undefined) {
            edgeLength = edge.properties.length === undefined ? this.options.springLength : edge.properties.length;
            if (edge.via != null) {
              var node1 = edge.to;
              var node2 = edge.via;
              var node3 = edge.from;

              this._calculateSpringForce(node1, node2, 0.5 * edgeLength);
              this._calculateSpringForce(node2, node3, 0.5 * edgeLength);
            }
            else {
              this._calculateSpringForce(edge.from, edge.to, edgeLength);
            }
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
    distance = distance == 0 ? 0.01 : distance;

    // the 1/distance is so the fx and fy can be calculated without sine or cosine.
    springForce = this.options.springConstant * (edgeLength - distance) / distance;

    fx = dx * springForce;
    fy = dy * springForce;

    this.physicsBody.forces[node1.id].x += fx;
    this.physicsBody.forces[node1.id].y += fy;
    this.physicsBody.forces[node2.id].x -= fx;
    this.physicsBody.forces[node2.id].y -= fy;
  }
}

export {SpringSolver};