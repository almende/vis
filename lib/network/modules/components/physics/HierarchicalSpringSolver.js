/**
 * Created by Alex on 2/25/2015.
 */

class HierarchicalSpringSolver {
  constructor(body, physicsBody, options) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.options = options;
  }

  /**
   * This function calculates the springforces on the nodes, accounting for the support nodes.
   *
   * @private
   */
  solve() {
    var edgeLength, edge, edgeId;
    var dx, dy, fx, fy, springForce, distance;
    var edges = this.body.edges;

    var nodes = this.physicsBody.calculationNodes;
    var nodeIndices = this.physicsBody.calculationNodeIndices;

    // initialize the spring force counters
    for (let i = 0; i < nodeIndices.length; i++) {
      let node1 = nodes[nodeIndices[i]];
      node1.springFx = 0;
      node1.springFy = 0;
    }


    // forces caused by the edges, modelled as springs
    for (edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
        if (edge.connected === true) {
          // only calculate forces if nodes are in the same sector
          if (this.body.nodes[edge.toId] !== undefined && this.body.nodes[edge.fromId] !== undefined) {
            edgeLength = edge.properties.length === undefined ? this.options.springLength : edge.properties.length;

            dx = (edge.from.x - edge.to.x);
            dy = (edge.from.y - edge.to.y);
            distance = Math.sqrt(dx * dx + dy * dy);
            distance = distance == 0 ? 0.01 : distance;

            // the 1/distance is so the fx and fy can be calculated without sine or cosine.
            springForce = this.options.springConstant * (edgeLength - distance) / distance;

            fx = dx * springForce;
            fy = dy * springForce;

            if (edge.to.level != edge.from.level) {
              edge.to.springFx -= fx;
              edge.to.springFy -= fy;
              edge.from.springFx += fx;
              edge.from.springFy += fy;
            }
            else {
              let factor = 0.5;
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
    for (let i = 0; i < nodeIndices.length; i++) {
      var node = nodes[nodeIndices[i]];
      springFx = Math.min(springForce,Math.max(-springForce,node.springFx));
      springFy = Math.min(springForce,Math.max(-springForce,node.springFy));

      node.fx += springFx;
      node.fy += springFy;
    }

    // retain energy balance
    var totalFx = 0;
    var totalFy = 0;
    for (let i = 0; i < nodeIndices.length; i++) {
      var node = nodes[nodeIndices[i]];
      totalFx += node.fx;
      totalFy += node.fy;
    }
    var correctionFx = totalFx / nodeIndices.length;
    var correctionFy = totalFy / nodeIndices.length;

    for (let i = 0; i < nodeIndices.length; i++) {
      var node = nodes[nodeIndices[i]];
      node.fx -= correctionFx;
      node.fy -= correctionFy;
    }
  }

}

export {HierarchicalSpringSolver};