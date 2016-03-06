// distance finding algorithm
import FloydWarshall from "./components/algorithms/FloydWarshall.js"


/**
 * KamadaKawai positions the nodes initially based on
 *
 * "AN ALGORITHM FOR DRAWING GENERAL UNDIRECTED GRAPHS"
 * -- Tomihisa KAMADA and Satoru KAWAI in 1989
 *
 * Possible optimizations in the distance calculation can be implemented.
 */
class KamadaKawai {
  constructor(body, edgeLength, edgeStrength) {
    this.body = body;
    this.springLength = edgeLength;
    this.springConstant = edgeStrength;
    this.distanceSolver = new FloydWarshall();
  }

  /**
   * Not sure if needed but can be used to update the spring length and spring constant
   * @param options
   */
  setOptions(options) {
    if (options) {
      if (options.springLength) {
        this.springLength = options.springLength;
      }
      if (options.springConstant) {
        this.springConstant = options.springConstant;
      }
    }
  }


  /**
   * Position the system
   * @param nodesArray
   * @param edgesArray
   */
  solve(nodesArray, edgesArray, ignoreClusters = false) {
    // get distance matrix
    let D_matrix = this.distanceSolver.getDistances(this.body, nodesArray, edgesArray); // distance matrix

    // get the L Matrix
    this._createL_matrix(D_matrix);

    // get the K Matrix
    this._createK_matrix(D_matrix);

    // calculate positions
    let threshold = 0.01;
    let innerThreshold = 1;
    let iterations = 0;
    let maxIterations = Math.max(1000,Math.min(10*this.body.nodeIndices.length,6000));
    let maxInnerIterations = 5;

    let maxEnergy = 1e9;
    let highE_nodeId = 0, dE_dx = 0, dE_dy = 0, delta_m = 0, subIterations = 0;

    while (maxEnergy > threshold && iterations < maxIterations) {
      iterations += 1;
      [highE_nodeId, maxEnergy, dE_dx, dE_dy] = this._getHighestEnergyNode(ignoreClusters);
      delta_m = maxEnergy;
      subIterations = 0;
      while(delta_m > innerThreshold && subIterations < maxInnerIterations) {
        subIterations += 1;
        this._moveNode(highE_nodeId, dE_dx, dE_dy);
        [delta_m,dE_dx,dE_dy] = this._getEnergy(highE_nodeId);
      }
    }
  }

  /**
   * get the node with the highest energy
   * @returns {*[]}
   * @private
   */
  _getHighestEnergyNode(ignoreClusters) {
    let nodesArray = this.body.nodeIndices;
    let nodes = this.body.nodes;
    let maxEnergy = 0;
    let maxEnergyNodeId = nodesArray[0];
    let dE_dx_max = 0, dE_dy_max = 0;

    for (let nodeIdx = 0; nodeIdx < nodesArray.length; nodeIdx++) {
      let m = nodesArray[nodeIdx];
      // by not evaluating nodes with predefined positions we should only move nodes that have no positions.
      if ((nodes[m].predefinedPosition === false || nodes[m].isCluster === true && ignoreClusters === true) || nodes[m].options.fixed.x === true ||  nodes[m].options.fixed.y === true) {
        let [delta_m,dE_dx,dE_dy] = this._getEnergy(m);
        if (maxEnergy < delta_m) {
          maxEnergy = delta_m;
          maxEnergyNodeId = m;
          dE_dx_max = dE_dx;
          dE_dy_max = dE_dy;
        }
      }
    }

    return [maxEnergyNodeId, maxEnergy, dE_dx_max, dE_dy_max];
  }

  /**
   * calculate the energy of a single node
   * @param m
   * @returns {*[]}
   * @private
   */
  _getEnergy(m) {
    let nodesArray = this.body.nodeIndices;
    let nodes = this.body.nodes;

    let x_m = nodes[m].x;
    let y_m = nodes[m].y;
    let dE_dx = 0;
    let dE_dy = 0;
    for (let iIdx = 0; iIdx < nodesArray.length; iIdx++) {
      let i = nodesArray[iIdx];
      if (i !== m) {
        let x_i = nodes[i].x;
        let y_i = nodes[i].y;
        let denominator = 1.0 / Math.sqrt(Math.pow(x_m - x_i, 2) + Math.pow(y_m - y_i, 2));
        dE_dx += this.K_matrix[m][i] * ((x_m - x_i) - this.L_matrix[m][i] * (x_m - x_i) * denominator);
        dE_dy += this.K_matrix[m][i] * ((y_m - y_i) - this.L_matrix[m][i] * (y_m - y_i) * denominator);
      }
    }

    let delta_m = Math.sqrt(Math.pow(dE_dx, 2) + Math.pow(dE_dy, 2));
    return [delta_m, dE_dx, dE_dy];
  }

  /**
   * move the node based on it's energy
   * the dx and dy are calculated from the linear system proposed by Kamada and Kawai
   * @param m
   * @param dE_dx
   * @param dE_dy
   * @private
   */
  _moveNode(m, dE_dx, dE_dy) {
    let nodesArray = this.body.nodeIndices;
    let nodes = this.body.nodes;
    let d2E_dx2 = 0;
    let d2E_dxdy = 0;
    let d2E_dy2 = 0;

    let x_m = nodes[m].x;
    let y_m = nodes[m].y;
    for (let iIdx = 0; iIdx < nodesArray.length; iIdx++) {
      let i = nodesArray[iIdx];
      if (i !== m) {
        let x_i = nodes[i].x;
        let y_i = nodes[i].y;
        let denominator = 1.0 / Math.pow(Math.pow(x_m - x_i, 2) + Math.pow(y_m - y_i, 2), 1.5);
        d2E_dx2 += this.K_matrix[m][i] * (1 - this.L_matrix[m][i] * Math.pow(y_m - y_i, 2) * denominator);
        d2E_dxdy += this.K_matrix[m][i] * (this.L_matrix[m][i] * (x_m - x_i) * (y_m - y_i) * denominator);
        d2E_dy2 += this.K_matrix[m][i] * (1 - this.L_matrix[m][i] * Math.pow(x_m - x_i, 2) * denominator);
      }
    }
    // make the variable names easier to make the solving of the linear system easier to read
    let A = d2E_dx2, B = d2E_dxdy, C = dE_dx, D = d2E_dy2, E = dE_dy;

    // solve the linear system for dx and dy
    let dy = (C / A + E / B) / (B / A - D / B);
    let dx = -(B * dy + C) / A;

    // move the node
    nodes[m].x += dx;
    nodes[m].y += dy;
  }


  /**
   * Create the L matrix: edge length times shortest path
   * @param D_matrix
   * @private
   */
  _createL_matrix(D_matrix) {
    let nodesArray = this.body.nodeIndices;
    let edgeLength = this.springLength;

    this.L_matrix = [];
    for (let i = 0; i < nodesArray.length; i++) {
      this.L_matrix[nodesArray[i]] = {};
      for (let j = 0; j < nodesArray.length; j++) {
        this.L_matrix[nodesArray[i]][nodesArray[j]] = edgeLength * D_matrix[nodesArray[i]][nodesArray[j]];
      }
    }
  }


  /**
   * Create the K matrix: spring constants times shortest path
   * @param D_matrix
   * @private
   */
  _createK_matrix(D_matrix) {
    let nodesArray = this.body.nodeIndices;
    let edgeStrength = this.springConstant;

    this.K_matrix = [];
    for (let i = 0; i < nodesArray.length; i++) {
      this.K_matrix[nodesArray[i]] = {};
      for (let j = 0; j < nodesArray.length; j++) {
        this.K_matrix[nodesArray[i]][nodesArray[j]] = edgeStrength * Math.pow(D_matrix[nodesArray[i]][nodesArray[j]], -2);
      }
    }
  }



}

export default KamadaKawai;