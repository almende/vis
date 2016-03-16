import Node from '../Node'

/**
 *
 */
class Cluster extends Node {
  constructor(id, options, body, imagelist, grouplist, globalOptions) {
    super(id, options, body, imagelist, grouplist, globalOptions);

    this.isCluster = true;
    this.containedNodes = {};
    this.containedEdges = {};
  }
}

export default Cluster;
