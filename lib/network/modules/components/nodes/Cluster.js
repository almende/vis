import Node from '../Node'

/**
 *
 */
class Cluster extends Node {
  constructor(options, body, imagelist, grouplist, globalOptions) {
    super(options, body, imagelist, grouplist, globalOptions);

    this.isCluster = true;
    this.containedNodes = {};
    this.containedEdges = {};
  }
}

export default Cluster;
