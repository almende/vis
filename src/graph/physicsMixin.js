/**
 * Created by Alex on 2/6/14.
 */


var physicsMixin = {

  /**
   * Before calculating the forces, we check if we need to cluster to keep up performance and we check
   * if there is more than one node. If it is just one node, we dont calculate anything.
   *
   * @private
   */
  _initializeForceCalculation : function(useBarnesHut) {
    // stop calculation if there is only one node
    if (this.nodeIndices.length == 1) {
      this.nodes[this.nodeIndices[0]]._setForce(0,0);
    }
    else {
      // if there are too many nodes on screen, we cluster without repositioning
      if (this.nodeIndices.length > this.constants.clustering.clusterThreshold && this.constants.clustering.enabled == true) {
        this.clusterToFit(this.constants.clustering.reduceToNodes, false);
      }

      this._calculateForcesRepulsion();

//      // we now start the force calculation
//      if (useBarnesHut == true) {
//        this._calculateForcesBarnesHut();
//      }
//      else {
//        this._calculateForcesRepulsion();
//      }
    }
  },


  /**
   * Calculate the external forces acting on the nodes
   * Forces are caused by: edges, repulsing forces between nodes, gravity
   * @private
   */
  _calculateForcesRepulsion : function() {
    // Gravity is required to keep separated groups from floating off
    // the forces are reset to zero in this loop by using _setForce instead
    // of _addForce

//    var startTimeAll = Date.now();

    this._applyCentralGravity();

//    var startTimeRepulsion = Date.now();
    // All nodes repel eachother.
    this._applyNodeRepulsion();

//    var endTimeRepulsion = Date.now();

    // the edges are strings
    this._applySpringForces();

//    var endTimeAll = Date.now();

//    echo("Time repulsion part:", endTimeRepulsion - startTimeRepulsion);
//    echo("Time total force calc:", endTimeAll - startTimeAll);
  },

  /**
   * Calculate the external forces acting on the nodes
   * Forces are caused by: edges, repulsing forces between nodes, gravity
   * @private
   */
  _calculateForcesBarnesHut : function() {
    // Gravity is required to keep separated groups from floating off
    // the forces are reset to zero in this loop by using _setForce instead
    // of _addForce

//    var startTimeAll = Date.now();

    this._applyCentralGravity();

//    var startTimeRepulsion = Date.now();
    // All nodes repel eachother.
    this._calculateBarnesHutForces();

//    var endTimeRepulsion = Date.now();

    // the edges are strings
    this._applySpringForces();

//    var endTimeAll = Date.now();

//    echo("Time repulsion part:", endTimeRepulsion - startTimeRepulsion);
//    echo("Time total force calc:",  endTimeAll - startTimeAll);
  },


  _clearForces : function() {
    var node;
    var nodes = this.nodes;

    for (var i = 0; i < this.nodeIndices.length; i++) {
      node = nodes[this.nodeIndices[i]];
      node._setForce(0, 0);
      node.updateDamping(this.nodeIndices.length);
    }
  },

  _applyCentralGravity : function() {
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

  _applyNodeRepulsion : function() {
    var dx, dy, angle, distance, fx, fy, clusterSize,
        repulsingForce, node1, node2, i, j;
    var nodes = this.nodes;

    // approximation constants
    var a_base = -2/3;
    var b = 4/3;

    // repulsing forces between nodes
    var minimumDistance = this.constants.nodes.distance;
    //var steepness = 10;

    // we loop from i over all but the last entree in the array
    // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
    for (i = 0; i < this.nodeIndices.length-1; i++) {
      node1 = nodes[this.nodeIndices[i]];
      for (j = i+1; j < this.nodeIndices.length; j++) {
        node2 = nodes[this.nodeIndices[j]];
        clusterSize = (node1.clusterSize + node2.clusterSize - 2);
        dx = node2.x - node1.x;
        dy = node2.y - node1.y;
        distance = Math.sqrt(dx * dx + dy * dy);


        // clusters have a larger region of influence
        minimumDistance = (clusterSize == 0) ? this.constants.nodes.distance : (this.constants.nodes.distance * (1 + clusterSize * this.constants.clustering.distanceAmplification));
        var a = a_base / minimumDistance;
        if (distance < 2*minimumDistance) { // at 2.0 * the minimum distance, the force is 0.000045
          angle = Math.atan2(dy, dx);

          if (distance < 0.5*minimumDistance) { // at 0.5 * the minimum distance, the force is 0.993307
            repulsingForce = 1.0;
          }
          else {
            repulsingForce = a * distance + b; // linear approx of  1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness))
          }
          // amplify the repulsion for clusters.
          repulsingForce *= (clusterSize == 0) ? 1 : 1 + clusterSize * this.constants.clustering.forceAmplification;

          fx = Math.cos(angle) * repulsingForce;
          fy = Math.sin(angle) * repulsingForce ;

          node1._addForce(-fx, -fy);
          node2._addForce(fx, fy);
        }
      }
    }
  },

  _applySpringForces : function() {
    var dx, dy, angle, fx, fy, springForce, length, edgeLength, edge, edgeId, clusterSize;
    var edges = this.edges;

    // forces caused by the edges, modelled as springs
    for (edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        edge = edges[edgeId];
        if (edge.connected) {
          // only calculate forces if nodes are in the same sector
          if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
            clusterSize = (edge.to.clusterSize + edge.from.clusterSize - 2);
            dx = (edge.to.x - edge.from.x);
            dy = (edge.to.y - edge.from.y);

            edgeLength = edge.length;

            // this implies that the edges between big clusters are longer
            edgeLength += clusterSize * this.constants.clustering.edgeGrowth;
            length =  Math.sqrt(dx * dx + dy * dy);
            angle = Math.atan2(dy, dx);

            springForce = edge.springConstant * (edgeLength - length);

            fx = Math.cos(angle) * springForce;
            fy = Math.sin(angle) * springForce;
            //console.log(edge.length,dx,dy,edge.springConstant,angle)
            edge.from._addForce(-fx, -fy);
            edge.to._addForce(fx, fy);
          }
        }
      }
    }
  },

  _calculateBarnesHutForces : function() {
    this._formBarnesHutTree();

    var nodes = this.nodes;
    var nodeIndices = this.nodeIndices;
    var node;
    var nodeCount = nodeIndices.length;

    var barnesHutTree = this.barnesHutTree;

    // place the nodes one by one recursively
    for (var i = 0; i < nodeCount; i++) {
      node = nodes[nodeIndices[i]];
      // starting with root is irrelevant, it never passes the BarnesHut condition
      this._getForceContribution(barnesHutTree.root.children.NW,node);
      this._getForceContribution(barnesHutTree.root.children.NE,node);
      this._getForceContribution(barnesHutTree.root.children.SW,node);
      this._getForceContribution(barnesHutTree.root.children.SE,node);
    }
  },

  _getForceContribution : function(parentBranch,node) {
    // we get no force contribution from an empty region
    if (parentBranch.childrenCount > 0) {
      var dx,dy,distance;

      // get the distance from the center of mass to the node.
      dx = parentBranch.CenterOfMass.x - node.x;
      dy = parentBranch.CenterOfMass.y - node.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) { // distance is 0 if it looks to apply a force on itself.
        // we invert it here because we need the inverted distance for the force calculation too.
        var distanceInv = 1/distance;

        // BarnesHut condition
        if (parentBranch.size * distanceInv > this.constants.physics.barnesHutTheta) {
          // Did not pass the condition, go into children if available
          if (parentBranch.childrenCount == 4) {
            this._getForceContribution(parentBranch.children.NW,node);
            this._getForceContribution(parentBranch.children.NE,node);
            this._getForceContribution(parentBranch.children.SW,node);
            this._getForceContribution(parentBranch.children.SE,node);
          }
          else { // parentBranch must have only one node, if it was empty we wouldnt be here
            if (parentBranch.children.data.id != node.id) { // if it is not self
              this._getForceOnNode(parentBranch, node, dx ,dy, distanceInv);
            }
          }
        }
        else {
          this._getForceOnNode(parentBranch, node, dx ,dy, distanceInv);
        }
      }
    }
  },

  _getForceOnNode : function(parentBranch, node, dx ,dy, distanceInv) {
    // even if the parentBranch only has one node, its Center of Mass is at the right place (the node in this case).
    var gravityForce = this.constants.physics.nodeGravityConstant * parentBranch.mass * node.mass * distanceInv * distanceInv;
    var angle = Math.atan2(dy, dx);
    var fx = Math.cos(angle) * gravityForce;
    var fy = Math.sin(angle) * gravityForce;
    node._addForce(fx, fy);
  },


  _formBarnesHutTree : function() {
    var nodes = this.nodes;
    var nodeIndices = this.nodeIndices;
    var node;
    var nodeCount = nodeIndices.length;

    var minX = Number.MAX_VALUE,
        minY = Number.MAX_VALUE,
        maxX =-Number.MAX_VALUE,
        maxY =-Number.MAX_VALUE;

    // get the range of the nodes
    for (var i = 0; i < nodeCount; i++) {
      var x = nodes[nodeIndices[i]].x;
      var y = nodes[nodeIndices[i]].y;
      if (x < minX) { minX = x; }
      if (x > maxX) { maxX = x; }
      if (y < minY) { minY = y; }
      if (y > maxY) { maxY = y; }
    }
    // make the range a square
    var sizeDiff = Math.abs(maxX - minX) - Math.abs(maxY - minY); // difference between X and Y
    if (sizeDiff > 0) {minY -= 0.5 * sizeDiff; maxY += 0.5 * sizeDiff;} // xSize > ySize
    else              {minX += 0.5 * sizeDiff; maxX -= 0.5 * sizeDiff;} // xSize < ySize


    // construct the barnesHutTree
    var barnesHutTree = {root:{
                CenterOfMass:{x:0,y:0}, // Center of Mass
                mass:0,
                range:{minX:minX,maxX:maxX,minY:minY,maxY:maxY},
                size: Math.abs(maxX - minX),
                children: {data:null},
                level: 0,
                childrenCount: 4
              }};
    this._splitBranch(barnesHutTree.root);

    // place the nodes one by one recursively
    for (i = 0; i < nodeCount; i++) {
      node = nodes[nodeIndices[i]];
      this._placeInTree(barnesHutTree.root,node);
    }

    // make global
    this.barnesHutTree = barnesHutTree
  },

  _updateBranchMass : function(parentBranch, node) {
    var totalMass = parentBranch.mass + node.mass;
    var totalMassInv = 1/totalMass;

    parentBranch.CenterOfMass.x = parentBranch.CenterOfMass.x * parentBranch.mass + node.x * node.mass;
    parentBranch.CenterOfMass.x *= totalMassInv;

    parentBranch.CenterOfMass.y = parentBranch.CenterOfMass.y * parentBranch.mass + node.y * node.mass;
    parentBranch.CenterOfMass.y *= totalMassInv;

    parentBranch.mass = totalMass;
  },

  _placeInTree : function(parentBranch,node) {
    // update the mass of the branch.
    this._updateBranchMass(parentBranch,node);

    if (parentBranch.children.NW.range.maxX > node.x) { // in NW or SW
      if (parentBranch.children.NW.range.maxY > node.y) { // in NW
        this._placeInRegion(parentBranch,node,"NW");
      }
      else { // in SW
        this._placeInRegion(parentBranch,node,"SW");
      }
    }
    else { // in NE or SE
      if (parentBranch.children.NE.range.maxY > node.y) { // in NE
        this._placeInRegion(parentBranch,node,"NE");
      }
      else { // in SE
        this._placeInRegion(parentBranch,node,"SE");
      }
    }
  },

  _placeInRegion : function(parentBranch,node,region) {
    switch (parentBranch.children[region].childrenCount) {
      case 0: // place node here
        parentBranch.children[region].children.data = node;
        parentBranch.children[region].childrenCount = 1;
        this._updateBranchMass(parentBranch.children[region],node);
        break;
      case 1: // convert into children
        this._splitBranch(parentBranch.children[region]);
        this._placeInTree(parentBranch.children[region],node);
        break;
      case 4: // place in branch
        this._placeInTree(parentBranch.children[region],node);
        break;
    }
  },

  _splitBranch : function(parentBranch) {
    // if the branch is filled with a node, replace the node in the new subset.
    var containedNode = null;
    if (parentBranch.childrenCount == 1) {
      containedNode = parentBranch.children.data;
      parentBranch.mass = 0; parentBranch.CenterOfMass.x = 0; parentBranch.CenterOfMass.y = 0;
    }
    parentBranch.childrenCount = 4;
    parentBranch.children.data = null;
    this._insertRegion(parentBranch,"NW");
    this._insertRegion(parentBranch,"NE");
    this._insertRegion(parentBranch,"SW");
    this._insertRegion(parentBranch,"SE");

    if (containedNode != null) {
      this._placeInTree(parentBranch,containedNode);
    }
  },


  /**
   * This function subdivides the region into four new segments.
   * Specifically, this inserts a single new segment.
   * It fills the children section of the parentBranch
   *
   * @param parentBranch
   * @param region
   * @param parentRange
   * @private
   */
  _insertRegion : function(parentBranch, region) {
    var minX,maxX,minY,maxY;
    switch (region) {
      case "NW":
        minX = parentBranch.range.minX;
        maxX = parentBranch.range.minX + parentBranch.size;
        minY = parentBranch.range.minY;
        maxY = parentBranch.range.minY + parentBranch.size;
        break;
      case "NE":
        minX = parentBranch.range.minX + parentBranch.size;
        maxX = parentBranch.range.maxX;
        minY = parentBranch.range.minY;
        maxY = parentBranch.range.minY + parentBranch.size;
        break;
      case "SW":
        minX = parentBranch.range.minX;
        maxX = parentBranch.range.minX + parentBranch.size;
        minY = parentBranch.range.minY + parentBranch.size;
        maxY = parentBranch.range.maxY;
        break;
      case "SE":
        minX = parentBranch.range.minX + parentBranch.size;
        maxX = parentBranch.range.maxX;
        minY = parentBranch.range.minY + parentBranch.size;
        maxY = parentBranch.range.maxY;
        break;
    }


    parentBranch.children[region] = {
      CenterOfMass:{x:0,y:0},
      mass:0,
      range:{minX:minX,maxX:maxX,minY:minY,maxY:maxY},
      size: 0.5 * parentBranch.size,
      children: {data:null},
      level: parentBranch.level +1,
      childrenCount: 0
    };
  },

  _drawTree : function(ctx,color) {
    if (this.barnesHutTree !== undefined) {

      ctx.lineWidth = 1;

      this._drawBranch(this.barnesHutTree.root,ctx,color);
    }
  },

  _drawBranch : function(branch,ctx,color) {
    if (color === undefined) {
      color = "#FF0000";
    }

    if (branch.childrenCount == 4) {
      this._drawBranch(branch.children.NW,ctx);
      this._drawBranch(branch.children.NE,ctx);
      this._drawBranch(branch.children.SE,ctx);
      this._drawBranch(branch.children.SW,ctx);
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(branch.range.minX,branch.range.minY);
    ctx.lineTo(branch.range.maxX,branch.range.minY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(branch.range.maxX,branch.range.minY);
    ctx.lineTo(branch.range.maxX,branch.range.maxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(branch.range.maxX,branch.range.maxY);
    ctx.lineTo(branch.range.minX,branch.range.maxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(branch.range.minX,branch.range.maxY);
    ctx.lineTo(branch.range.minX,branch.range.minY);
    ctx.stroke();

    /*
    if (branch.mass > 0) {
      ctx.circle(branch.CenterOfMass.x, branch.CenterOfMass.y, 3*branch.mass);
      ctx.stroke();
    }
    */
  }
};