
function parseGephi(gephiJSON, options) {
  var edges = [];
  var nodes = [];
  this.options = {
    edges: {
      inheritColor: true
    },
    nodes: {
      allowedToMove: false,
      parseColor: false
    }
  };

  if (options !== undefined) {
    this.options.nodes['allowedToMove'] = options.allowedToMove | false;
    this.options.nodes['parseColor']    = options.parseColor    | false;
    this.options.edges['inheritColor']  = options.inheritColor  | true;
  }

  var gEdges = gephiJSON.edges;
  var gNodes = gephiJSON.nodes;
  for (var i = 0; i < gEdges.length; i++) {
    var edge = {};
    var gEdge = gEdges[i];
    edge['id'] = gEdge.id;
    edge['from'] = gEdge.source;
    edge['to'] = gEdge.target;
    edge['attributes'] = gEdge.attributes;
//    edge['value'] = gEdge.attributes !== undefined ? gEdge.attributes.Weight : undefined;
//    edge['width'] = edge['value'] !== undefined ? undefined : edgegEdge.size;
    edge['color'] = gEdge.color;
    edge['inheritColor'] = edge['color'] !== undefined ? false : this.options.inheritColor;
    edges.push(edge);
  }

  for (var i = 0; i < gNodes.length; i++) {
    var node = {};
    var gNode = gNodes[i];
    node['id'] = gNode.id;
    node['attributes'] = gNode.attributes;
    node['x'] = gNode.x;
    node['y'] = gNode.y;
    node['label'] = gNode.label;
    if (this.options.nodes.parseColor == true) {
      node['color'] = gNode.color;
    }
    else {
      node['color'] = gNode.color !== undefined ? {background:gNode.color, border:gNode.color} : undefined;
    }
    node['radius'] = gNode.size;
    node['allowedToMoveX'] = this.options.nodes.allowedToMove;
    node['allowedToMoveY'] = this.options.nodes.allowedToMove;
    nodes.push(node);
  }

  return {nodes:nodes, edges:edges};
}

exports.parseGephi = parseGephi;