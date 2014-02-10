/**
 * Created by Alex on 2/6/14.
 */


var physicsMixin = {

  _toggleBarnesHut : function() {
    this.constants.physics.barnesHut.enabled = !this.constants.physics.barnesHut.enabled;
    this._loadSelectedForceSolver();
    this.moving = true;
    this.start();
  },
  /**
   * Before calculating the forces, we check if we need to cluster to keep up performance and we check
   * if there is more than one node. If it is just one node, we dont calculate anything.
   *
   * @private
   */
  _initializeForceCalculation : function() {
    // stop calculation if there is only one node
    if (this.nodeIndices.length == 1) {
      this.nodes[this.nodeIndices[0]]._setForce(0,0);
    }
    else {
      // if there are too many nodes on screen, we cluster without repositioning
      if (this.nodeIndices.length > this.constants.clustering.clusterThreshold && this.constants.clustering.enabled == true) {
        this.clusterToFit(this.constants.clustering.reduceToNodes, false);
      }

      // we now start the force calculation
      this._calculateForces();
    }
  },


  /**
   * Calculate the external forces acting on the nodes
   * Forces are caused by: edges, repulsing forces between nodes, gravity
   * @private
   */
  _calculateForces : function() {
    this.barnesHutTree = undefined;
    // Gravity is required to keep separated groups from floating off
    // the forces are reset to zero in this loop by using _setForce instead
    // of _addForce
    this._calculateGravitationalForces();

    this._calculateNodeForces();

    this._calculateSpringForces();
  },


  _calculateGravitationalForces : function() {
    var dx, dy, angle, fx, fy, node, i;
    var nodes = this.nodes;
    var gravity = this.constants.physics.centralGravity;

    for (i = 0; i < this.nodeIndices.length; i++) {
      node = nodes[this.nodeIndices[i]];
      // gravity does not apply when we are in a pocket sector
      if (this._sector() == "default") {
        dx = -node.x;// + screenCenterPos.x;
        dy = -node.y;// + screenCenterPos.y;

        angle = Math.atan2(dy, dx);
        fx = Math.cos(angle) * gravity;
        fy = Math.sin(angle) * gravity;
      }
      else {
        fx = 0;
        fy = 0;
      }
      node._setForce(fx, fy);
      node.updateDamping(this.nodeIndices.length);
    }
  },

  _calculateSpringForces : function() {
    var dx, dy, angle, fx, fy, springForce, length, edgeLength, edge, edgeId;
    var edges = this.edges;

    // forces caused by the edges, modelled as springs
    for (edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
        if (edge.connected) {
          // only calculate forces if nodes are in the same sector
          if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
            dx = (edge.to.x - edge.from.x);
            dy = (edge.to.y - edge.from.y);

            edgeLength = edge.length;

            // this implies that the edges between big clusters are longer
            edgeLength += (edge.to.growthIndicator + edge.from.growthIndicator) * this.constants.clustering.edgeGrowth;
            length =  Math.sqrt(dx * dx + dy * dy);
            angle = Math.atan2(dy, dx);

            springForce = this.constants.physics.springConstant * (edgeLength - length);

            fx = Math.cos(angle) * springForce;
            fy = Math.sin(angle) * springForce;

            edge.from._addForce(-fx, -fy);
            edge.to._addForce(fx, fy);
          }
        }
      }
    }
  }

}