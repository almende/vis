/**
 * Created by Alex on 10-Aug-15.
 */


class FloydWarshall {
  constructor(){}

  getDistances(body, nodesArray, edgesArray) {
    let D_matrix = {}
    let edges = body.edges;

    // prepare matrix with large numbers
    for (let i = 0; i < nodesArray.length; i++) {
      D_matrix[nodesArray[i]] = {};
      for (let j = 0; j < nodesArray.length; j++) {
        D_matrix[nodesArray[i]][nodesArray[j]] = 1e9;
      }
    }

    // put the weights for the edges in. This assumes unidirectionality.
    for (let i = 0; i < edgesArray.length; i++) {
      let edge = edges[edgesArray[i]];
      D_matrix[edge.fromId][edge.toId] = 1;
      D_matrix[edge.toId][edge.fromId] = 1;
    }

    // calculate all pair distances
    for (let k = 0; k < nodesArray.length; k++) {
      for (let i = 0; i < nodesArray.length; i++) {
        for (let j = 0; j < nodesArray.length; j++) {
          D_matrix[nodesArray[i]][nodesArray[j]] = Math.min(D_matrix[nodesArray[i]][nodesArray[j]],D_matrix[nodesArray[i]][nodesArray[k]] + D_matrix[nodesArray[k]][nodesArray[j]])
        }
      }
    }

    // remove the self references from the matrix
    for (let i = 0; i < nodesArray.length; i++) {
      delete D_matrix[nodesArray[i]][nodesArray[i]];
    }

    return D_matrix;
  }
}

export default FloydWarshall;