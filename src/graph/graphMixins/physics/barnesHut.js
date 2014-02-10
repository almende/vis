/**
 * Created by Alex on 2/10/14.
 */

var barnesHutMixin = {


  _calculateNodeForces : function() {
    var node;
    var nodes = this.calculationNodes;
    var nodeIndices = this.calculationNodeIndices;
    var nodeCount = nodeIndices.length;

    this._formBarnesHutTree(nodes,nodeIndices);


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
        // BarnesHut condition
        if (distance * parentBranch.calcSize < this.constants.physics.barnesHut.theta) {
          // Did not pass the condition, go into children if available
          if (parentBranch.childrenCount == 4) {
            this._getForceContribution(parentBranch.children.NW,node);
            this._getForceContribution(parentBranch.children.NE,node);
            this._getForceContribution(parentBranch.children.SW,node);
            this._getForceContribution(parentBranch.children.SE,node);
          }
          else { // parentBranch must have only one node, if it was empty we wouldnt be here
            if (parentBranch.children.data.id != node.id) { // if it is not self
              this._getForceOnNode(parentBranch, node, dx ,dy, distance);
            }
          }
        }
        else {
          this._getForceOnNode(parentBranch, node, dx ,dy, distance);
        }
      }
    }
  },

  _getForceOnNode : function(parentBranch, node, dx ,dy, distance) {
    //console.log(Math.max(Math.max(node.height,node.radius),node.width),parentBranch.maxWidth,distance);
    // even if the parentBranch only has one node, its Center of Mass is at the right place (the node in this case).
    var gravityForce = this.constants.physics.barnesHut.gravitationalConstant * parentBranch.mass * node.mass / (distance * distance);
    var angle = Math.atan2(dy, dx);
    var fx = Math.cos(angle) * gravityForce;
    var fy = Math.sin(angle) * gravityForce;
    node._addForce(fx, fy);
  },


  _formBarnesHutTree : function(nodes,nodeIndices) {
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
      calcSize: 1 / Math.abs(maxX - minX),
      children: {data:null},
      maxWidth: 0,
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
    var biggestSize = Math.max(Math.max(node.height,node.radius),node.width);
    parentBranch.maxWidth = (parentBranch.maxWidth < biggestSize) ? biggestSize : parentBranch.maxWidth;

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
      calcSize: 2 * parentBranch.calcSize,
      children: {data:null},
      maxWidth: 0,
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