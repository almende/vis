
function parseGephi(gephiJSON, options) {
  var edges = [];
  var nodes = [];
  this.options = {
    edges: {
      inheritColor: 'from'
    },
    nodes: {
      allowedToMove: false,
      parseColor: false
    }
  };
  if (options !== undefined) {
    this.options.edges['inheritColor']  = options.inheritColor  | 'from';
    this.options.nodes['allowedToMove'] = options.allowedToMove | false;
    this.options.nodes['parseColor']    = options.parseColor    | false;
  }

  var gEdges = gephiJSON.edges;
  var gNodes = gephiJSON.nodes;

  for (var i = 0; i < gEdges.length; i++) {
    var edge = {};
    edge['id'] = gEdges.id;
    edge['from'] = gEdges.source;
    edge['to'] = gEdges.target;
    edge['attributes'] = gEdges.attributes;
    edge['value'] = gEdges.attributes !== undefined ? gEdges.attributes.Weight : undefined;
    edge['width'] = gEdges.size;
    edge['color'] = gEdges.color;
    edge['inheritColor'] = edge['color'] !== undefined ? false : this.options.inheritColor;
    edges.push(edge);
  }

  for (var i = 0; i < gNodes.length; i++) {
    var node = {};
    node['id'] = gNodes.id;
    node['attributes'] = gNodes.attributes;
    node['x'] = gNodes.x;
    node['y'] = gNodes.y;
    node['label'] = gNodes.label;
    if (this.options.parseColor == true) {
      node['color'] = gNodes.color;
    }
    else {
      node['color'] = gNodes.color !== undefined ? {background:gNodes.color, border:gNodes.color} : undefined;
    }
    node['radius'] = gNodes.size;
    node['allowedToMoveX'] = this.options.allowedToMove;
    node['allowedToMoveY'] = this.options.allowedToMove;
    node['shape'] = 'dot'
    nodes.push(node);
  }

  return {nodes:nodes, edges:edges};
}

exports.parseGephi = parseGephi;