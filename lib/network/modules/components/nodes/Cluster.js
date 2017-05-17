var Node = require('../Node').default;

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
