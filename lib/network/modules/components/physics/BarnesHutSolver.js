
class BarnesHutSolver {
  constructor(body, physicsBody, options) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.barnesHutTree;
    this.setOptions(options);
    this.randomSeed = 5;

    // debug: show grid
    //this.body.emitter.on("afterDrawing", (ctx) => {this._debug(ctx,'#ff0000')})
  }

  setOptions(options) {
    this.options = options;
    this.thetaInversed = 1 / this.options.theta;
    this.overlapAvoidanceFactor = 1 - Math.max(0, Math.min(1,this.options.avoidOverlap)); // if 1 then min distance = 0.5, if 0.5 then min distance = 0.5 + 0.5*node.shape.radius
  }

  seededRandom() {
    var x = Math.sin(this.randomSeed++) * 10000;
    return x - Math.floor(x);
  }


  /**
   * This function calculates the forces the nodes apply on each other based on a gravitational model.
   * The Barnes Hut method is used to speed up this N-body simulation.
   *
   * @private
   */
  solve() {
    if (this.options.gravitationalConstant !== 0 && this.physicsBody.physicsNodeIndices.length > 0) {
      let node;
      let nodes = this.body.nodes;
      let nodeIndices = this.physicsBody.physicsNodeIndices;
      let nodeCount = nodeIndices.length;

      // create the tree
      let barnesHutTree = this._formBarnesHutTree(nodes, nodeIndices);

      // for debugging
      this.barnesHutTree = barnesHutTree;

      // place the nodes one by one recursively
      for (let i = 0; i < nodeCount; i++) {
        node = nodes[nodeIndices[i]];
        if (node.options.mass > 0) {
          // starting with root is irrelevant, it never passes the BarnesHutSolver condition
          this._getForceContribution(barnesHutTree.root.children.NW, node);
          this._getForceContribution(barnesHutTree.root.children.NE, node);
          this._getForceContribution(barnesHutTree.root.children.SW, node);
          this._getForceContribution(barnesHutTree.root.children.SE, node);
        }
      }
    }
  }


  /**
   * This function traverses the barnesHutTree. It checks when it can approximate distant nodes with their center of mass.
   * If a region contains a single node, we check if it is not itself, then we apply the force.
   *
   * @param parentBranch
   * @param node
   * @private
   */
  _getForceContribution(parentBranch, node) {
    // we get no force contribution from an empty region
    if (parentBranch.childrenCount > 0) {
      let dx, dy, distance;

      // get the distance from the center of mass to the node.
      dx = parentBranch.centerOfMass.x - node.x;
      dy = parentBranch.centerOfMass.y - node.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      // BarnesHutSolver condition
      // original condition : s/d < theta = passed  ===  d/s > 1/theta = passed
      // calcSize = 1/s --> d * 1/s > 1/theta = passed
      if (distance * parentBranch.calcSize > this.thetaInversed) {
        this._calculateForces(distance, dx, dy, node, parentBranch);
      }
      else {
        // Did not pass the condition, go into children if available
        if (parentBranch.childrenCount === 4) {
          this._getForceContribution(parentBranch.children.NW, node);
          this._getForceContribution(parentBranch.children.NE, node);
          this._getForceContribution(parentBranch.children.SW, node);
          this._getForceContribution(parentBranch.children.SE, node);
        }
        else { // parentBranch must have only one node, if it was empty we wouldnt be here
          if (parentBranch.children.data.id != node.id) { // if it is not self
            this._calculateForces(distance, dx, dy, node, parentBranch);
          }
        }
      }
    }
  }


  /**
   * Calculate the forces based on the distance.
   *
   * @param distance
   * @param dx
   * @param dy
   * @param node
   * @param parentBranch
   * @private
   */
  _calculateForces(distance, dx, dy, node, parentBranch) {
    if (distance === 0) {
      distance = 0.1;
      dx = distance;
    }

    if (this.overlapAvoidanceFactor < 1 && node.shape.radius) {
      distance = Math.max(0.1 + (this.overlapAvoidanceFactor * node.shape.radius), distance - node.shape.radius);
    }

    // the dividing by the distance cubed instead of squared allows us to get the fx and fy components without sines and cosines
    // it is shorthand for gravityforce with distance squared and fx = dx/distance * gravityForce
    let gravityForce = this.options.gravitationalConstant * parentBranch.mass * node.options.mass / Math.pow(distance,3);
    let fx = dx * gravityForce;
    let fy = dy * gravityForce;

    this.physicsBody.forces[node.id].x += fx;
    this.physicsBody.forces[node.id].y += fy;
  }


  /**
   * This function constructs the barnesHut tree recursively. It creates the root, splits it and starts placing the nodes.
   *
   * @param nodes
   * @param nodeIndices
   * @private
   */
  _formBarnesHutTree(nodes, nodeIndices) {
    let node;
    let nodeCount = nodeIndices.length;

    let minX = nodes[nodeIndices[0]].x;
    let minY = nodes[nodeIndices[0]].y;
    let maxX = nodes[nodeIndices[0]].x;
    let maxY = nodes[nodeIndices[0]].y;

    // get the range of the nodes
    for (let i = 1; i < nodeCount; i++) {
      let x = nodes[nodeIndices[i]].x;
      let y = nodes[nodeIndices[i]].y;
      if (nodes[nodeIndices[i]].options.mass > 0) {
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (y > maxY) {
          maxY = y;
        }
      }
    }
    // make the range a square
    let sizeDiff = Math.abs(maxX - minX) - Math.abs(maxY - minY); // difference between X and Y
    if (sizeDiff > 0) {
      minY -= 0.5 * sizeDiff;
      maxY += 0.5 * sizeDiff;
    } // xSize > ySize
    else {
      minX += 0.5 * sizeDiff;
      maxX -= 0.5 * sizeDiff;
    } // xSize < ySize


    let minimumTreeSize = 1e-5;
    let rootSize = Math.max(minimumTreeSize, Math.abs(maxX - minX));
    let halfRootSize = 0.5 * rootSize;
    let centerX = 0.5 * (minX + maxX), centerY = 0.5 * (minY + maxY);

    // construct the barnesHutTree
    let barnesHutTree = {
      root: {
        centerOfMass: {x: 0, y: 0},
        mass: 0,
        range: {
          minX: centerX - halfRootSize, maxX: centerX + halfRootSize,
          minY: centerY - halfRootSize, maxY: centerY + halfRootSize
        },
        size: rootSize,
        calcSize: 1 / rootSize,
        children: {data: null},
        maxWidth: 0,
        level: 0,
        childrenCount: 4
      }
    };
    this._splitBranch(barnesHutTree.root);

    // place the nodes one by one recursively
    for (let i = 0; i < nodeCount; i++) {
      node = nodes[nodeIndices[i]];
      if (node.options.mass > 0) {
        this._placeInTree(barnesHutTree.root, node);
      }
    }

    // make global
    return barnesHutTree
  }


  /**
   * this updates the mass of a branch. this is increased by adding a node.
   *
   * @param parentBranch
   * @param node
   * @private
   */
  _updateBranchMass(parentBranch, node) {
    let totalMass = parentBranch.mass + node.options.mass;
    let totalMassInv = 1 / totalMass;

    parentBranch.centerOfMass.x = parentBranch.centerOfMass.x * parentBranch.mass + node.x * node.options.mass;
    parentBranch.centerOfMass.x *= totalMassInv;

    parentBranch.centerOfMass.y = parentBranch.centerOfMass.y * parentBranch.mass + node.y * node.options.mass;
    parentBranch.centerOfMass.y *= totalMassInv;

    parentBranch.mass = totalMass;
    let biggestSize = Math.max(Math.max(node.height, node.radius), node.width);
    parentBranch.maxWidth = (parentBranch.maxWidth < biggestSize) ? biggestSize : parentBranch.maxWidth;

  }


  /**
   * determine in which branch the node will be placed.
   *
   * @param parentBranch
   * @param node
   * @param skipMassUpdate
   * @private
   */
  _placeInTree(parentBranch, node, skipMassUpdate) {
    if (skipMassUpdate != true || skipMassUpdate === undefined) {
      // update the mass of the branch.
      this._updateBranchMass(parentBranch, node);
    }

    if (parentBranch.children.NW.range.maxX > node.x) { // in NW or SW
      if (parentBranch.children.NW.range.maxY > node.y) { // in NW
        this._placeInRegion(parentBranch, node, "NW");
      }
      else { // in SW
        this._placeInRegion(parentBranch, node, "SW");
      }
    }
    else { // in NE or SE
      if (parentBranch.children.NW.range.maxY > node.y) { // in NE
        this._placeInRegion(parentBranch, node, "NE");
      }
      else { // in SE
        this._placeInRegion(parentBranch, node, "SE");
      }
    }
  }


  /**
   * actually place the node in a region (or branch)
   *
   * @param parentBranch
   * @param node
   * @param region
   * @private
   */
  _placeInRegion(parentBranch, node, region) {
    switch (parentBranch.children[region].childrenCount) {
      case 0: // place node here
        parentBranch.children[region].children.data = node;
        parentBranch.children[region].childrenCount = 1;
        this._updateBranchMass(parentBranch.children[region], node);
        break;
      case 1: // convert into children
              // if there are two nodes exactly overlapping (on init, on opening of cluster etc.)
              // we move one node a little bit and we do not put it in the tree.
        if (parentBranch.children[region].children.data.x === node.x &&
          parentBranch.children[region].children.data.y === node.y) {
          node.x += this.seededRandom();
          node.y += this.seededRandom();
        }
        else {
          this._splitBranch(parentBranch.children[region]);
          this._placeInTree(parentBranch.children[region], node);
        }
        break;
      case 4: // place in branch
        this._placeInTree(parentBranch.children[region], node);
        break;
    }
  }


  /**
   * this function splits a branch into 4 sub branches. If the branch contained a node, we place it in the subbranch
   * after the split is complete.
   *
   * @param parentBranch
   * @private
   */
  _splitBranch(parentBranch) {
    // if the branch is shaded with a node, replace the node in the new subset.
    let containedNode = null;
    if (parentBranch.childrenCount === 1) {
      containedNode = parentBranch.children.data;
      parentBranch.mass = 0;
      parentBranch.centerOfMass.x = 0;
      parentBranch.centerOfMass.y = 0;
    }
    parentBranch.childrenCount = 4;
    parentBranch.children.data = null;
    this._insertRegion(parentBranch, "NW");
    this._insertRegion(parentBranch, "NE");
    this._insertRegion(parentBranch, "SW");
    this._insertRegion(parentBranch, "SE");

    if (containedNode != null) {
      this._placeInTree(parentBranch, containedNode);
    }
  }


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
  _insertRegion(parentBranch, region) {
    let minX, maxX, minY, maxY;
    let childSize = 0.5 * parentBranch.size;
    switch (region) {
      case "NW":
        minX = parentBranch.range.minX;
        maxX = parentBranch.range.minX + childSize;
        minY = parentBranch.range.minY;
        maxY = parentBranch.range.minY + childSize;
        break;
      case "NE":
        minX = parentBranch.range.minX + childSize;
        maxX = parentBranch.range.maxX;
        minY = parentBranch.range.minY;
        maxY = parentBranch.range.minY + childSize;
        break;
      case "SW":
        minX = parentBranch.range.minX;
        maxX = parentBranch.range.minX + childSize;
        minY = parentBranch.range.minY + childSize;
        maxY = parentBranch.range.maxY;
        break;
      case "SE":
        minX = parentBranch.range.minX + childSize;
        maxX = parentBranch.range.maxX;
        minY = parentBranch.range.minY + childSize;
        maxY = parentBranch.range.maxY;
        break;
    }


    parentBranch.children[region] = {
      centerOfMass: {x: 0, y: 0},
      mass: 0,
      range: {minX: minX, maxX: maxX, minY: minY, maxY: maxY},
      size: 0.5 * parentBranch.size,
      calcSize: 2 * parentBranch.calcSize,
      children: {data: null},
      maxWidth: 0,
      level: parentBranch.level + 1,
      childrenCount: 0
    };
  }




  //---------------------------  DEBUGGING BELOW  ---------------------------//


  /**
   * This function is for debugging purposed, it draws the tree.
   *
   * @param ctx
   * @param color
   * @private
   */
  _debug(ctx, color) {
    if (this.barnesHutTree !== undefined) {

      ctx.lineWidth = 1;

      this._drawBranch(this.barnesHutTree.root, ctx, color);
    }
  }


  /**
   * This function is for debugging purposes. It draws the branches recursively.
   *
   * @param branch
   * @param ctx
   * @param color
   * @private
   */
  _drawBranch(branch, ctx, color) {
    if (color === undefined) {
      color = "#FF0000";
    }

    if (branch.childrenCount === 4) {
      this._drawBranch(branch.children.NW, ctx);
      this._drawBranch(branch.children.NE, ctx);
      this._drawBranch(branch.children.SE, ctx);
      this._drawBranch(branch.children.SW, ctx);
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(branch.range.minX, branch.range.minY);
    ctx.lineTo(branch.range.maxX, branch.range.minY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(branch.range.maxX, branch.range.minY);
    ctx.lineTo(branch.range.maxX, branch.range.maxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(branch.range.maxX, branch.range.maxY);
    ctx.lineTo(branch.range.minX, branch.range.maxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(branch.range.minX, branch.range.maxY);
    ctx.lineTo(branch.range.minX, branch.range.minY);
    ctx.stroke();

    /*
     if (branch.mass > 0) {
     ctx.circle(branch.centerOfMass.x, branch.centerOfMass.y, 3*branch.mass);
     ctx.stroke();
     }
     */
  }
}


export default BarnesHutSolver;
