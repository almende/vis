/**
 * Created by Alex on 10-Aug-15.
 */


class FloydWarshall {
  constructor(){}

  getDistances(body, nodesArray, edgesArray) {
    let D_matrix = {};
    let edges = body.edges;

    // prepare matrix with large numbers
    for (let i = 0; i < nodesArray.length; i++) {
      D_matrix[nodesArray[i]] = {};
      D_matrix[nodesArray[i]] = {};
      for (let j = 0; j < nodesArray.length; j++) {
        D_matrix[nodesArray[i]][nodesArray[j]] = (i == j ? 0 : 1e9);
        D_matrix[nodesArray[i]][nodesArray[j]] = (i == j ? 0 : 1e9);
      }
    }

    // put the weights for the edges in. This assumes unidirectionality.
    for (let i = 0; i < edgesArray.length; i++) {
      let edge = edges[edgesArray[i]];
      // edge has to be connected if it counts to the distances. If it is connected to inner clusters it will crash so we also check if it is in the D_matrix
      if (edge.connected === true && D_matrix[edge.fromId] !== undefined && D_matrix[edge.toId] !== undefined) {
        D_matrix[edge.fromId][edge.toId] = 1;
        D_matrix[edge.toId][edge.fromId] = 1;
      }
    }

    let nodeCount = nodesArray.length;

    // Adapted FloydWarshall based on unidirectionality to greatly reduce complexity.
    for (let k = 0; k < nodeCount; k++) {
      for (let i = 0; i < nodeCount-1; i++) {
        for (let j = i+1; j < nodeCount; j++) {
          D_matrix[nodesArray[i]][nodesArray[j]] = Math.min(D_matrix[nodesArray[i]][nodesArray[j]],D_matrix[nodesArray[i]][nodesArray[k]] + D_matrix[nodesArray[k]][nodesArray[j]])
          D_matrix[nodesArray[j]][nodesArray[i]] = D_matrix[nodesArray[i]][nodesArray[j]];
        }
      }
    }

    return D_matrix;
  }
}

export default FloydWarshall;