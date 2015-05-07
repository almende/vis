
function parseGephi(gephiJSON, optionsObj) {
  var edges = [];
  var nodes = [];
  var options = {
    edges: {
      inheritColor: true
    },
    nodes: {
      fixed: false,
      parseColor: false
    }
  };

  if (options !== undefined) {
    options.nodes['fixed'] = optionsObj.fixed !== undefined ? options.fixed : false;
    options.nodes['parseColor']    = optionsObj.parseColor !== undefined ? options.parseColor : false;
    options.edges['inheritColor']  = optionsObj.inheritColor !== undefined ? options.inheritColor : true;
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
    edge['inheritColor'] = edge['color'] !== undefined ? false : options.inheritColor;
    edges.push(edge);
  }

  for (var i = 0; i < gNodes.length; i++) {
    var node = {};
    var gNode = gNodes[i];
    node['id'] = gNode.id;
    node['attributes'] = gNode.attributes;
    node['title'] = gNode.title;
    node['x'] = gNode.x;
    node['y'] = gNode.y;
    node['label'] = gNode.label;
    if (options.nodes.parseColor === true) {
      node['color'] = gNode.color;
    }
    else {
      node['color'] = gNode.color !== undefined ? {background:gNode.color, border:gNode.color} : undefined;
    }
    node['size'] = gNode.size;
    node['fixed'] = options.nodes.fixed && gNode.x !== undefined && gNode.y !== undefined;
    nodes.push(node);
  }

  return {nodes:nodes, edges:edges};
}

exports.parseGephi = parseGephi;