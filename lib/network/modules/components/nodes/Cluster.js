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
}

export default Cluster;
