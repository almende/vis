import Node from '../Node'

/**
 * A Cluster is a special Node that allows a group of Nodes positioned closely together
 * to be represented by a single Cluster Node.
 *
 * @class Cluster
 * @extends Node
 */
class Cluster extends Node {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Array<HTMLImageElement>}imagelist
   * @param {Array} grouplist
   * @param {Object} globalOptions
   * @constructor Cluster
   */
  constructor(options, body, imagelist, grouplist, globalOptions) {
    super(options, body, imagelist, grouplist, globalOptions);

    this.isCluster = true;
    this.containedNodes = {};
    this.containedEdges = {};
  }


  /**
   * Transfer child cluster data to current and disconnect the child cluster.
   *
   * Please consult the header comment in 'Clustering.js' for the fields set here.
   *
   * @param {string|number} childClusterId  id of child cluster to open
   */
  _openChildCluster(childClusterId) {
    let childCluster = this.body.nodes[childClusterId];
    if (this.containedNodes[childClusterId] === undefined) {
      throw new Error('node with id: ' + childClusterId + ' not in current cluster');
    }
    if (!childCluster.isCluster) {
      throw new Error('node with id: ' + childClusterId + ' is not a cluster');
    }

    // Disconnect child cluster from current cluster
    delete this.containedNodes[childClusterId];
    for(let n in childCluster.edges) {
      let edgeId = childCluster.edges[n].id;
      delete this.containedEdges[edgeId];
    }

    // Transfer nodes and edges
    for (let nodeId in childCluster.containedNodes) {
      this.containedNodes[nodeId] = childCluster.containedNodes[nodeId];
    }
    childCluster.containedNodes = {};

    for (let edgeId in childCluster.containedEdges) {
      this.containedEdges[edgeId] = childCluster.containedEdges[edgeId];
    }
    childCluster.containedEdges = {};

    // Transfer edges within cluster edges which are clustered
    for (let n in childCluster.edges) {
      let clusterEdge = childCluster.edges[n];

      for (let m in this.edges) {
        let parentClusterEdge = this.edges[m];
        let index = parentClusterEdge.clusteringEdgeReplacingIds.indexOf(clusterEdge.id);
        if (index === -1) continue;

        for (let n in clusterEdge.clusteringEdgeReplacingIds) {
          let srcId = clusterEdge.clusteringEdgeReplacingIds[n];
          parentClusterEdge.clusteringEdgeReplacingIds.push(srcId);

          // Maintain correct bookkeeping for transferred edge
          this.body.edges[srcId].edgeReplacedById = parentClusterEdge.id;
        }

        // Remove cluster edge from parent cluster edge
        parentClusterEdge.clusteringEdgeReplacingIds.splice(index, 1);
        break;  // Assumption: a clustered edge can only be present in a single clustering edge
      }
    }
    childCluster.edges = [];
  }
}


export default Cluster;
