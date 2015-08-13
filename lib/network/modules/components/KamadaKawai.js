/**
 * Created by Alex on 8/7/2015.
 */

import FloydWarshall from "./FloydWarshall.js"

class KamadaKawai {
  constructor(body, edgeLength, edgeStrength) {
    this.body = body;
    this.springLength = edgeLength;
    this.springConstant = edgeStrength;
    this.distanceSolver = new FloydWarshall();
  }

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

  solve(nodesArray, edgesArray) {
    console.time("FLOYD - getDistances");
    let D_matrix = this.distanceSolver.getDistances(this.body, nodesArray, edgesArray); // distance matrix
    console.timeEnd("FLOYD - getDistances");

    // get the L Matrix
    this._createL_matrix(D_matrix);

    // get the K Matrix
    this._createK_matrix(D_matrix);

    console.time("positioning")
    let threshold = 0.01;
    let counter = 0;
    let maxIterations = Math.min(10*this.body.nodeIndices.length);;
    let maxEnergy = 1e9; // just to pass the first check.
    let highE_nodeId = 0, dE_dx = 0, dE_dy = 0;

    while (maxEnergy > threshold && counter < maxIterations) {
      counter += 1;
      [highE_nodeId, maxEnergy, dE_dx, dE_dy] = this._getHighestEnergyNode();
      this._moveNode(highE_nodeId, dE_dx, dE_dy);
    }
    console.timeEnd("positioning")
  }


  _getHighestEnergyNode() {
    let nodesArray = this.body.nodeIndices;
    let maxEnergy = 0;
    let maxEnergyNode = nodesArray[0];
    let energies = {dE_dx: 0, dE_dy: 0};

    for (let nodeIdx = 0; nodeIdx < nodesArray.length; nodeIdx++) {
      let m = nodesArray[nodeIdx];
      let [delta_m,dE_dx,dE_dy] = this._getEnergy(m);
      if (maxEnergy < delta_m) {
        maxEnergy = delta_m;
        maxEnergyNode = m;
        energies.dE_dx = dE_dx;
        energies.dE_dy = dE_dy;
      }
    }

    return [maxEnergyNode, maxEnergy, energies.dE_dx, energies.dE_dy];
  }

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