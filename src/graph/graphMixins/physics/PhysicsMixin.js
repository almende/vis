/**
 * Created by Alex on 2/6/14.
 */


var physicsMixin = {

  /**
   * Toggling barnes Hut calculation on and off.
   *
   * @private
   */
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
    // Gravity is required to keep separated groups from floating off
    // the forces are reset to zero in this loop by using _setForce instead
    // of _addForce

    this._calculateGravitationalForces();
    this._calculateNodeForces();


    if (this.constants.smoothCurves == true) {
      this._calculateSpringForcesWithSupport();
    }
    else {
      this._calculateSpringForces();
    }
  },


  /**
   * Smooth curves are created by adding invisible nodes in the center of the edges. These nodes are also
   * handled in the calculateForces function. We then use a quadratic curve with the center node as control.
   * This function joins the datanodes and invisible (called support) nodes into one object.
   * We do this so we do not contaminate this.nodes with the support nodes.
   *
   * @private
   */
  _updateCalculationNodes : function() {
    if (this.constants.smoothCurves == true) {
      this.calculationNodes = {};
      this.calculationNodeIndices = [];

      for (var nodeId in this.nodes) {
        if (this.nodes.hasOwnProperty(nodeId)) {
          this.calculationNodes[nodeId] = this.nodes[nodeId];
        }
      }
      var supportNodes = this.sectors['support']['nodes'];
      for (var supportNodeId in supportNodes) {
        if (supportNodes.hasOwnProperty(supportNodeId)) {
          if (this.edges.hasOwnProperty(supportNodes[supportNodeId].parentEdgeId)) {
            this.calculationNodes[supportNodeId] = supportNodes[supportNodeId];
          }
          else {
            supportNodes[supportNodeId]._setForce(0,0);
          }
        }
      }

      for (var idx in this.calculationNodes) {
        if (this.calculationNodes.hasOwnProperty(idx)) {
          this.calculationNodeIndices.push(idx);
        }
      }
    }
    else {
      this.calculationNodes = this.nodes;
      this.calculationNodeIndices = this.nodeIndices;
    }
  },


  /**
   * this function applies the central gravity effect to keep groups from floating off
   *
   * @private
   */
  _calculateGravitationalForces : function() {
    var dx, dy, distance, node, i;
    var nodes = this.calculationNodes;
    var gravity = this.constants.physics.centralGravity;
    var gravityForce = 0;

    for (i = 0; i < this.calculationNodeIndices.length; i++) {
      node = nodes[this.calculationNodeIndices[i]];
      node.damping = this.constants.physics.damping; // possibly add function to alter damping properties of clusters.
      // gravity does not apply when we are in a pocket sector
      if (this._sector() == "default") {
        dx = -node.x;
        dy = -node.y;
        distance = Math.sqrt(dx*dx + dy*dy);
        gravityForce = gravity / distance;

        node.fx = dx * gravityForce;
        node.fy = dy * gravityForce;
      }
      else {
        node.fx = 0;
        node.fy = 0;
      }
    }
  },


  /**
   * this function calculates the effects of the springs in the case of unsmooth curves.
   *
   * @private
   */
  _calculateSpringForces : function() {
    var edgeLength, edge, edgeId;
    var dx, dy, fx, fy, springForce, length;
    var edges = this.edges;

    // forces caused by the edges, modelled as springs
    for (edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
        if (edge.connected) {
          // only calculate forces if nodes are in the same sector
          if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
            edgeLength = edge.length;
            // this implies that the edges between big clusters are longer
            edgeLength += (edge.to.clusterSize + edge.from.clusterSize - 2) * this.constants.clustering.edgeGrowth;

            dx = (edge.from.x - edge.to.x);
            dy = (edge.from.y - edge.to.y);
            length =  Math.sqrt(dx * dx + dy * dy);

            springForce = this.constants.physics.springConstant * (edgeLength - length) / length;

            fx = dx * springForce;
            fy = dy * springForce;

            edge.from.fx += fx;
            edge.from.fy += fy;
            edge.to.fx -= fx;
            edge.to.fy -= fy;
          }
        }
      }
    }
  },


  /**
   * This function calculates the springforces on the nodes, accounting for the support nodes.
   *
   * @private
   */
  _calculateSpringForcesWithSupport : function() {
    var edgeLength, edge, edgeId, combinedClusterSize;
    var edges = this.edges;

    // forces caused by the edges, modelled as springs
    for (edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
        if (edge.connected) {
          // only calculate forces if nodes are in the same sector
          if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
            if (edge.via != null) {
              var node1 = edge.to;
              var node2 = edge.via;
              var node3 = edge.from;

              edgeLength = edge.length;

              combinedClusterSize = node1.clusterSize + node3.clusterSize - 2;

              // this implies that the edges between big clusters are longer
              edgeLength += combinedClusterSize * this.constants.clustering.edgeGrowth;
              this._calculateSpringForce(node1,node2,0.5*edgeLength);
              this._calculateSpringForce(node2,node3,0.5*edgeLength);
            }
          }
        }
      }
    }
  },


  /**
   * This is the code actually performing the calculation for the function above. It is split out to avoid repetition.
   *
   * @param node1
   * @param node2
   * @param edgeLength
   * @private
   */
  _calculateSpringForce : function(node1,node2,edgeLength) {
    var dx, dy, fx, fy, springForce, length;

    dx = (node1.x - node2.x);
    dy = (node1.y - node2.y);
    length =  Math.sqrt(dx * dx + dy * dy);

    springForce = this.constants.physics.springConstant * (edgeLength - length) / length;

    fx = dx * springForce;
    fy = dy * springForce;

    node1.fx += fx;
    node1.fy += fy;
    node2.fx -= fx;
    node2.fy -= fy;
  }
}