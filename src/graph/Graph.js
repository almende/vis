/**
 * @constructor Graph
 * Create a graph visualization, displaying nodes and edges.
 *
 * @param {Element} container   The DOM element in which the Graph will
 *                                  be created. Normally a div element.
 * @param {Object} data         An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 */
function Graph (container, data, options) {
  // create variables and set default values
  this.containerElement = container;
  this.width = '100%';
  this.height = '100%';
  this.refreshRate = 50; // milliseconds
  this.stabilize = true; // stabilize before displaying the graph
  this.selectable = true;

  // set constant values
  this.constants = {
    nodes: {
      radiusMin: 5,
      radiusMax: 20,
      radius: 5,
      distance: 100, // px
      shape: 'ellipse',
      image: undefined,
      widthMin: 16, // px
      widthMax: 64, // px
      fontColor: 'black',
      fontSize: 14, // px
      //fontFace: verdana,
      fontFace: 'arial',
      color: {
        border: '#2B7CE9',
        background: '#97C2FC',
        highlight: {
          border: '#2B7CE9',
          background: '#D2E5FF'
        },
        cluster: {
          border: '#256a2d',
          background: '#2cd140',
          highlight: {
            border: '#899539',
            background: '#c5dc29'
          }
        }
      },
      borderColor: '#2B7CE9',
      backgroundColor: '#97C2FC',
      highlightColor: '#D2E5FF',
      group: undefined
    },
    edges: {
      widthMin: 1,
      widthMax: 15,
      width: 1,
      style: 'line',
      color: '#343434',
      fontColor: '#343434',
      fontSize: 14, // px
      fontFace: 'arial',
      //distance: 100, //px
      length: 100,   // px
      dash: {
        length: 10,
        gap: 5,
        altLength: undefined
      }
    },
    clustering: {
      clusterLength: 50,            // threshold edge length for clustering
      fontSizeMultiplier: 2,        // how much the cluster font size grows per node (in px)
      forceAmplification: 0.6,      // amount of clusterSize between two nodes multiply this value (+1) with the repulsion force
      distanceAmplification: 0.1,   // amount of clusterSize between two nodes multiply this value (+1) with the repulsion force
      edgeGrowth: 10,               // amount of clusterSize connected to the edge is multiplied with this and added to edgeLength
      clusterSizeWidthFactor: 10,
      clusterSizeHeightFactor: 10,
      clusterSizeRadiusFactor: 10,
      massTransferCoefficient: 0.1  // parent.mass += massTransferCoefficient * child.mass
    },
    minForce: 0.05,
    minVelocity: 0.02,   // px/s
    maxIterations: 1000  // maximum number of iteration to stabilize
  };

  var graph = this;
  this.nodeIndices = [];     // the node indices list is used to speed up the computation of the repulsion fields
  this.nodes = {};            // object with Node objects
  this.edges = {};            // object with Edge objects
  this.scale = 1;             // defining the global scale variable in the constructor
  this.previousScale = this.scale;    // this is used to check if the zoom operation is zooming in or out
  // TODO: create a counter to keep track on the number of nodes having values
  // TODO: create a counter to keep track on the number of nodes currently moving
  // TODO: create a counter to keep track on the number of edges having values

  this.nodesData = null;      // A DataSet or DataView
  this.edgesData = null;      // A DataSet or DataView

  // create event listeners used to subscribe on the DataSets of the nodes and edges
  var me = this;
  this.nodesListeners = {
    'add': function (event, params) {
      me._addNodes(params.items);
      me.start();
    },
    'update': function (event, params) {
      me._updateNodes(params.items);
      me.start();
    },
    'remove': function (event, params) {
      me._removeNodes(params.items);
      me.start();
    }
  };
  this.edgesListeners = {
    'add': function (event, params) {
      me._addEdges(params.items);
      me.start();
    },
    'update': function (event, params) {
      me._updateEdges(params.items);
      me.start();
    },
    'remove': function (event, params) {
      me._removeEdges(params.items);
      me.start();
    }
  };

  this.groups = new Groups(); // object with groups
  this.images = new Images(); // object with images
  this.images.setOnloadCallback(function () {
    graph._redraw();
  });

  // properties of the data
  this.moving = false;    // True if any of the nodes have an undefined position

  this.selection = [];
  this.timer = undefined;

  // create a frame and canvas
  this._create();

  // apply options
  this.setOptions(options);

  // draw data
  this.setData(data);

  // zoom so all data will fit on the screen
  this.zoomToFit();

  // cluster if the dataset is big
  this.clusterToFit();
}


Graph.prototype.clusterToFit = function() {
  var numberOfNodes = this.nodeIndices.length;
  if (numberOfNodes >= 100) {
    this.increaseClusterLevel();
  }
};

Graph.prototype.zoomToFit = function() {
  var numberOfNodes = this.nodeIndices.length;
  var zoomLevel = 105 / (numberOfNodes + 80); // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
  if (zoomLevel > 1.0) {
    zoomLevel = 1.0;
  }
  this._setScale(zoomLevel);
};

/**
 * This function can be called to increase the cluster level. This means that the nodes with only one edge connection will
 * be clustered with their connected node. This can be repeated as many times as needed.
 * This can be called externally (by a keybind for instance) to reduce the complexity of big datasets.
 */
Graph.prototype.increaseClusterLevel = function() {
  this._formClusters(true);
};

/**
 * This function can be called to decrease the cluster level. This means that the nodes with only one edge connection will
 * be unpacked if they are a cluster. This can be repeated as many times as needed.
 * This can be called externally (by a key-bind for instance) to look into clusters without zooming.
 */
Graph.prototype.decreaseClusterLevel = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    if (node.clusterSize > 1 && node.remainingEdges == 1) {
      this._expandClusterNode(node,false,true);
    }
  }
  this._updateNodeIndexList();
};


/**
 * This function can be called to open up a specific cluster.
 * It will recursively unpack the entire cluster back to individual nodes.
 *
 * @param node    | Node object: cluster to open.
 */
Graph.prototype.fullyOpenCluster = function(node) {
  this._expandClusterNode(node,true,true);
  this._updateNodeIndexList();
};


/**
 * This function can be called to open up a specific cluster.
 * It will unpack the cluster back one level.
 *
 * @param node    | Node object: cluster to open.
 */
Graph.prototype.openCluster = function(node) {
  this._expandClusterNode(node,false,true);
  this._updateNodeIndexList();
};


/**
 * This function checks if the zoom action is in or out.
 * If out, check if we can form clusters, if in, check if we can open clusters.
 * This function is only called from _zoom()
 *
 * @private
 */
Graph.prototype._updateClusters = function() {
  var isMovingBeforeClustering = this.moving;

  if (this.previousScale > this.scale) { // zoom out
    this._formClusters(false);
  }
  else if (this.previousScale < this.scale) { // zoom out
    this._openClusters();
  }

  this._updateClusterLabels();
  this._updateNodeLabels();
  this._updateLabels();
  this.previousScale = this.scale;

  // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
  if (this.moving != isMovingBeforeClustering) {
    this.start();
  }

 // console.log(this.scale);
};

/**
 * This updates the node labels for all nodes (for debugging purposes)
 * @private
 */
Graph.prototype._updateLabels = function() {
  // update node labels
  for (var nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      var node = this.nodes[nodeID];
      node.label = String(node.remainingEdges).concat(":",String(node.clusterSize));
    }
  }
};

/**
 * This updates the node labels for all clusters
 * @private
 */
Graph.prototype._updateClusterLabels = function() {
  // update node labels
  for (var nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      var node = this.nodes[nodeID];
      if (node.clusterSize > 1) {
        node.label = "[".concat(String(node.clusterSize),"]");
      }
    }
  }
};

/**
 * This updates the node labels for all nodes that are NOT clusters
 * @private
 */
Graph.prototype._updateNodeLabels = function() {
  // update node labels
  for (var nodeID in this.nodes) {
    var node = this.nodes[nodeID];
    if (node.clusterSize == 1) {
      node.label = String(node.id);
    }
  }
};


/**
 * This function loops over all nodes in the nodeIndices list. For each node it checks if it is a cluster and if it
 * has to be opened based on the current zoom level.
 *
 * @private
 */
Graph.prototype._openClusters = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    this._expandClusterNode(node,true,false);
  }

  this._updateNodeIndexList();
};


/**
 * This function checks if a node has to be opened. This is done by checking the zoom level.
 * If the node contains child nodes, this function is recursively called on the child nodes as well.
 * This recursive behaviour is optional and can be set by the recursive argument.
 *
 * @param parentNode    | Node object: to check for cluster and expand
 * @param recursive     | Boolean: enable or disable recursive calling
 * @param forceExpand   | Boolean: enable or disable forcing the last node to join the cluster to be expelled
 * @private
 */
Graph.prototype._expandClusterNode = function(parentNode, recursive, forceExpand) {
  // first check if node is a cluster
  if (parentNode.clusterSize > 1) {
    // if the last child has been added on a smaller scale than current scale (@optimization)
    if (parentNode.formationScale < this.scale || forceExpand == true) {
      // we will check if any of the contained child nodes should be removed from the cluster
      var largestClusterSize = 1;
      for (var containedNodeID in parentNode.containedNodes) {
        if (parentNode.containedNodes.hasOwnProperty(containedNodeID)) {
          var child_node = parentNode.containedNodes[containedNodeID];

          // force expand will expand the largest cluster size clusters. Since we cluster from outside in, we assume that
          // the largest cluster is the one that comes from outside
          // TODO: introduce a level system for keeping track of which node was added when.
          if (forceExpand == true) {
            if (largestClusterSize < child_node.clusterSize) {
              largestClusterSize = child_node.clusterSize;
            }
          }
          else {
            this._expelChildFromParent(parentNode,containedNodeID,recursive,forceExpand);
          }
        }
      }

      // we have determined the largest cluster size, we will now expel these
      if (forceExpand == true) {
        for (var containedNodeID in parentNode.containedNodes) {
          if (parentNode.containedNodes.hasOwnProperty(containedNodeID)) {
            var child_node = parentNode.containedNodes[containedNodeID];
            if (child_node.clusterSize == largestClusterSize) {
              this._expelChildFromParent(parentNode,containedNodeID,recursive,forceExpand);
            }
          }
        }
      }
    }
  }
};


/**
 * This function will expel a child_node from a parent_node. This is to de-cluster the node. This function will remove
 * the child node from the parent contained_node object and put it back into the global nodes object.
 * The same holds for the edge that was connected to the child node. It is moved back into the global edges object.
 *
 * @param parentNode        | Node object: the parent node
 * @param containedNodeID   | String: child_node id as it is contained in the containedNodes object of the parent node
 * @param recursive         | Boolean:  This will also check if the child needs to be expanded.
 *                                      With force and recursive both true, the entire cluster is unpacked
 * @param forceExpand      | Boolean: This will disregard the zoom level and will expel this child from the parent
 * @private
 */
Graph.prototype._expelChildFromParent = function(parentNode, containedNodeID, recursive, forceExpand) {
  var childNode = parentNode.containedNodes[containedNodeID];

  // if child node has been added on smaller scale than current, kick out
  if (childNode.formationScale < this.scale || forceExpand == true) {
    // put the child node back in the global nodes object and the corresponding edge in the global edges object
    this.nodes[containedNodeID] = childNode;
    this.edges[parentNode.containedEdges[containedNodeID].id] = parentNode.containedEdges[containedNodeID];

    // undo the changes from the clustering operation on the parent node
    parentNode.mass -= this.constants.clustering.massTransferCoefficient * childNode.mass;
    parentNode.fontSize -= this.constants.clustering.fontSizeMultiplier * childNode.clusterSize;
    parentNode.clusterSize -= childNode.clusterSize;
    parentNode.remainingEdges += 1;

    // place the child node near the parent, not at the exact same location to avoid chaos in the system
    childNode.x = parentNode.x;
    childNode.y = parentNode.y;

    // remove node from the list
    delete parentNode.containedNodes[containedNodeID];
    delete parentNode.containedEdges[containedNodeID];

    // restart the simulation to reorganise all nodes
    this.moving = true;

    // recalculate the size of the node on the next time the node is rendered
    parentNode.clearSizeCache();
  }

  // check if a further expansion step is possible if recursivity is enabled
  if (recursive == true) {
    this._expandClusterNode(childNode,recursive,forceExpand);
  }
};



/**
 * This function checks if any nodes at the end of their trees have edges below a threshold length
 * This function is called only from _updateClusters()
 * forceLevelCollapse ignores the length of the edge and collapses one level
 * This means that a node with only one edge will be clustered with its connected node
 *
 * @private
 * @param force_level_collapse    | Boolean
 */
Graph.prototype._formClusters = function(forceLevelCollapse) {
  var min_length = this.constants.clustering.clusterLength/this.scale;

  var dx,dy,length,
      edges = this.edges;

  // create an array of edge ids
  var edgesIDarray = []
  for (var id in edges) {
    if (edges.hasOwnProperty(id)) {
      edgesIDarray.push(id);
    }
  }

  // check if any edges are shorter than min_length and start the clustering
  // the clustering favours the node with the larger mass
  for (var i = 0; i < edgesIDarray.length; i++) {
    var edgeID = edgesIDarray[i];
    var edge = edges[edgeID];
    edge.id = edgeID;
    if (edge.connected) {
      dx = (edge.to.x - edge.from.x);
      dy = (edge.to.y - edge.from.y);
      length = Math.sqrt(dx * dx + dy * dy);


      if (length < min_length || forceLevelCollapse == true) {
        // checking for clustering possibilities

        // first check which node is larger
        var parentNode = edge.from
        var childNode = edge.to
        if (edge.to.mass > edge.from.mass) {
          parentNode = edge.to
          childNode = edge.from
        }

        // we allow clustering from outside in, ideally the child node in on the outside
        // if we do not cluster from outside in, we would have to reconnect edges or keep a second set of edges for the
        // clusters. This will also have to be altered in the force calculation and rendering.
        // This method is non-destructive and does not require a second set of data.
        if (childNode.remainingEdges == 1) {
          this._addToCluster(parentNode,childNode,edge,forceLevelCollapse);
          delete this.edges[edgesIDarray[i]];
        }
        else if (parentNode.remainingEdges == 1) {
          this._addToCluster(childNode,parentNode,edge,forceLevelCollapse);
          delete this.edges[edgesIDarray[i]];
        }
      }
    }
  }
  this._updateNodeIndexList();

  if (forceLevelCollapse == true)
    this._applyClusterLevel();
};


/**
 * This function adds the child node to the parent node, creating a cluster if it is not already.
 * This function is called only from _updateClusters()
 *
 * @param parent_node           | Node object: this is the node that will house the child node
 * @param child_node            | Node object: this node will be deleted from the global this.nodes and stored in the parent node
 * @param edge                  | Edge object: this edge will be deleted from the global this.edges and stored in the parent node
 * @param force_level_collapse  | Boolean: true will only update the remainingEdges at the very end of the clustering, ensuring single level collapse
 * @private
 */
Graph.prototype._addToCluster = function(parentNode, childNode, edge, forceLevelCollapse) {
  // join child node and edge in parent node
  parentNode.containedNodes[childNode.id] = childNode;
  parentNode.containedEdges[childNode.id] = edge;  // the edge gets the node ID so we can easily recover it when expanding the cluster

  if (this.nodes.hasOwnProperty(childNode.id)) {
    delete this.nodes[childNode.id];
  }

  parentNode.mass += this.constants.clustering.massTransferCoefficient * childNode.mass;
  parentNode.clusterSize += childNode.clusterSize;
  parentNode.fontSize += this.constants.clustering.fontSizeMultiplier * childNode.clusterSize;
  parentNode.formationScale = this.scale; // The latest child has been added on this scale

  // recalculate the size of the node on the next time the node is rendered
  parentNode.clearSizeCache();

  parentNode.containedNodes[childNode.id].formationScale = this.scale; // this child has been added at this scale.
  if (forceLevelCollapse == true)
    parentNode.remainingEdges_unapplied -= 1;
  else
    parentNode.remainingEdges -= 1;

  // restart the simulation to reorganise all nodes
  this.moving = true;
};


/**
 * This function will apply the changes made to the remainingEdges during the formation of the clusters.
 * This is a seperate function to allow for level-wise collapsing of the node tree.
 * It has to be called if a level is collapsed. It is called by _formClusters().
 * @private
 */
Graph.prototype._applyClusterLevel = function() {
  for (var i = 0; i < this.nodeIndices.length; i++) {
    var node = this.nodes[this.nodeIndices[i]];
    node.remainingEdges = node.remainingEdges_unapplied;
  }
};


/**
 * Update the this.nodeIndices with the most recent node index list
 * @private
 */
Graph.prototype._updateNodeIndexList = function() {
  this.nodeIndices = [];

  for (var idx in this.nodes) {
    if (this.nodes.hasOwnProperty(idx)) {
      this.nodeIndices.push(idx);
    }
  }
};


/**
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data    Object containing parameters:
 *                         {Array | DataSet | DataView} [nodes] Array with nodes
 *                         {Array | DataSet | DataView} [edges] Array with edges
 *                         {String} [dot] String containing data in DOT format
 *                         {Options} [options] Object with options
 */
Graph.prototype.setData = function(data) {
  if (data && data.dot && (data.nodes || data.edges)) {
    throw new SyntaxError('Data must contain either parameter "dot" or ' +
        ' parameter pair "nodes" and "edges", but not both.');
  }

  // set options
  this.setOptions(data && data.options);

  // set all data
  if (data && data.dot) {
    // parse DOT file
    if(data && data.dot) {
      var dotData = vis.util.DOTToGraph(data.dot);
      this.setData(dotData);
      return;
    }
  }
  else {
    this._setNodes(data && data.nodes);
    this._setEdges(data && data.edges);
  }
  // updating the list of node indices


  // find a stable position or start animating to a stable position
  if (this.stabilize) {
    this._doStabilize();
  }
  this.start();
};

/**
 * Set options
 * @param {Object} options
 */
Graph.prototype.setOptions = function (options) {
  if (options) {
    // retrieve parameter values
    if (options.width != undefined)           {this.width = options.width;}
    if (options.height != undefined)          {this.height = options.height;}
    if (options.stabilize != undefined)       {this.stabilize = options.stabilize;}
    if (options.selectable != undefined)      {this.selectable = options.selectable;}

    // TODO: work out these options and document them
    if (options.edges) {
      for (var prop in options.edges) {
        if (options.edges.hasOwnProperty(prop)) {
          this.constants.edges[prop] = options.edges[prop];
        }
      }

      if (options.edges.length != undefined &&
          options.nodes && options.nodes.distance == undefined) {
        this.constants.edges.length   = options.edges.length;
        this.constants.nodes.distance = options.edges.length * 1.25;
      }

      if (!options.edges.fontColor) {
        this.constants.edges.fontColor = options.edges.color;
      }

      // Added to support dashed lines
      // David Jordan
      // 2012-08-08
      if (options.edges.dash) {
        if (options.edges.dash.length != undefined) {
          this.constants.edges.dash.length = options.edges.dash.length;
        }
        if (options.edges.dash.gap != undefined) {
          this.constants.edges.dash.gap = options.edges.dash.gap;
        }
        if (options.edges.dash.altLength != undefined) {
          this.constants.edges.dash.altLength = options.edges.dash.altLength;
        }
      }
    }

    if (options.nodes) {
      for (prop in options.nodes) {
        if (options.nodes.hasOwnProperty(prop)) {
          this.constants.nodes[prop] = options.nodes[prop];
        }
      }

      if (options.nodes.color) {
        this.constants.nodes.color = Node.parseColor(options.nodes.color);
      }

      /*
       if (options.nodes.widthMin) this.constants.nodes.radiusMin = options.nodes.widthMin;
       if (options.nodes.widthMax) this.constants.nodes.radiusMax = options.nodes.widthMax;
       */
    }

    if (options.groups) {
      for (var groupname in options.groups) {
        if (options.groups.hasOwnProperty(groupname)) {
          var group = options.groups[groupname];
          this.groups.add(groupname, group);
        }
      }
    }
  }

  this.setSize(this.width, this.height);
  this._setTranslation(this.frame.clientWidth / 2, this.frame.clientHeight / 2);
  this._setScale(1);
};

/**
 * fire an event
 * @param {String} event   The name of an event, for example 'select'
 * @param {Object} params  Optional object with event parameters
 * @private
 */
Graph.prototype._trigger = function (event, params) {
  events.trigger(this, event, params);
};


/**
 * Create the main frame for the Graph.
 * This function is executed once when a Graph object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 * @private
 */
Graph.prototype._create = function () {
  // remove all elements from the container element.
  while (this.containerElement.hasChildNodes()) {
    this.containerElement.removeChild(this.containerElement.firstChild);
  }

  this.frame = document.createElement('div');
  this.frame.className = 'graph-frame';
  this.frame.style.position = 'relative';
  this.frame.style.overflow = 'hidden';

  // create the graph canvas (HTML canvas element)
  this.frame.canvas = document.createElement( 'canvas' );
  this.frame.canvas.style.position = 'relative';
  this.frame.appendChild(this.frame.canvas);
  if (!this.frame.canvas.getContext) {
    var noCanvas = document.createElement( 'DIV' );
    noCanvas.style.color = 'red';
    noCanvas.style.fontWeight =  'bold' ;
    noCanvas.style.padding =  '10px';
    noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
    this.frame.canvas.appendChild(noCanvas);
  }

  var me = this;
  this.drag = {};
  this.pinch = {};
  this.hammer = Hammer(this.frame.canvas, {
    prevent_default: true
  });
  this.hammer.on('tap',       me._onTap.bind(me) );
  this.hammer.on('hold',      me._onHold.bind(me) );
  this.hammer.on('pinch',     me._onPinch.bind(me) );
  this.hammer.on('touch',     me._onTouch.bind(me) );
  this.hammer.on('dragstart', me._onDragStart.bind(me) );
  this.hammer.on('drag',      me._onDrag.bind(me) );
  this.hammer.on('dragend',   me._onDragEnd.bind(me) );
  this.hammer.on('mousewheel',me._onMouseWheel.bind(me) );
  this.hammer.on('DOMMouseScroll',me._onMouseWheel.bind(me) ); // for FF
  this.hammer.on('mousemove', me._onMouseMoveTitle.bind(me) );


  // add the frame to the container element
  this.containerElement.appendChild(this.frame);
};

/**
 *
 * @param {{x: Number, y: Number}} pointer
 * @return {Number | null} node
 * @private
 */
Graph.prototype._getNodeAt = function (pointer) {
  var x = this._canvasToX(pointer.x);
  var y = this._canvasToY(pointer.y);

  var obj = {
    left:   x,
    top:    y,
    right:  x,
    bottom: y
  };

  // if there are overlapping nodes, select the last one, this is the
  // one which is drawn on top of the others
  var overlappingNodes = this._getNodesOverlappingWith(obj);
  return (overlappingNodes.length > 0) ?
      overlappingNodes[overlappingNodes.length - 1] : null;
};

/**
 * Get the pointer location from a touch location
 * @param {{pageX: Number, pageY: Number}} touch
 * @return {{x: Number, y: Number}} pointer
 * @private
 */
Graph.prototype._getPointer = function (touch) {
  return {
    x: touch.pageX - vis.util.getAbsoluteLeft(this.frame.canvas),
    y: touch.pageY - vis.util.getAbsoluteTop(this.frame.canvas)
  };
};

/**
 * On start of a touch gesture, store the pointer
 * @param event
 * @private
 */
Graph.prototype._onTouch = function (event) {
  this.drag.pointer = this._getPointer(event.gesture.touches[0]);
  this.drag.pinched = false;
  this.pinch.scale = this._getScale();
};

/**
 * handle drag start event
 * @private
 */
Graph.prototype._onDragStart = function () {
  var drag = this.drag;

  drag.selection = [];
  drag.translation = this._getTranslation();
  drag.nodeId = this._getNodeAt(drag.pointer);
  // note: drag.pointer is set in _onTouch to get the initial touch location

  var node = this.nodes[drag.nodeId];
  if (node) {
    // select the clicked node if not yet selected
    if (!node.isSelected()) {
      this._selectNodes([drag.nodeId]);
    }

    // create an array with the selected nodes and their original location and status
    var me = this;
    this.selection.forEach(function (id) {
      var node = me.nodes[id];
      if (node) {
        var s = {
          id: id,
          node: node,

          // store original x, y, xFixed and yFixed, make the node temporarily Fixed
          x: node.x,
          y: node.y,
          xFixed: node.xFixed,
          yFixed: node.yFixed
        };

        node.xFixed = true;
        node.yFixed = true;

        drag.selection.push(s);
      }
    });

  }
};

/**
 * handle drag event
 * @private
 */
Graph.prototype._onDrag = function (event) {
  if (this.drag.pinched) {
    return;
  }

  var pointer = this._getPointer(event.gesture.touches[0]);

  var me = this,
      drag = this.drag,
      selection = drag.selection;
  if (selection && selection.length) {
    // calculate delta's and new location
    var deltaX = pointer.x - drag.pointer.x,
        deltaY = pointer.y - drag.pointer.y;

    // update position of all selected nodes
    selection.forEach(function (s) {
      var node = s.node;

      if (!s.xFixed) {
        node.x = me._canvasToX(me._xToCanvas(s.x) + deltaX);
      }

      if (!s.yFixed) {
        node.y = me._canvasToY(me._yToCanvas(s.y) + deltaY);
      }
    });

    // start animation if not yet running
    if (!this.moving) {
      this.moving = true;
      this.start();
    }
  }
  else {
    // move the graph
    var diffX = pointer.x - this.drag.pointer.x;
    var diffY = pointer.y - this.drag.pointer.y;

    this._setTranslation(
        this.drag.translation.x + diffX,
        this.drag.translation.y + diffY);
    this._redraw();

    this.moved = true;
  }
};

/**
 * handle drag start event
 * @private
 */
Graph.prototype._onDragEnd = function () {
  var selection = this.drag.selection;
  if (selection) {
    selection.forEach(function (s) {
      // restore original xFixed and yFixed
      s.node.xFixed = s.xFixed;
      s.node.yFixed = s.yFixed;
    });
  }
};

/**
 * handle tap/click event: select/unselect a node
 * @private
 */
Graph.prototype._onTap = function (event) {
  var pointer = this._getPointer(event.gesture.touches[0]);

  var nodeId = this._getNodeAt(pointer);
  var node = this.nodes[nodeId];
  if (node) {
    // select this node
    this._selectNodes([nodeId]);

    if (!this.moving) {
      this._redraw();
    }
  }
  else {
    // remove selection
    this._unselectNodes();
    this._redraw();
  }
};

/**
 * handle long tap event: multi select nodes
 * @private
 */
Graph.prototype._onHold = function (event) {
  var pointer = this._getPointer(event.gesture.touches[0]);
  var nodeId = this._getNodeAt(pointer);
  var node = this.nodes[nodeId];
  if (node) {
    if (!node.isSelected()) {
      // select this node, keep previous selection
      var append = true;
      this._selectNodes([nodeId], append);
    }
    else {
      this._unselectNodes([nodeId]);
    }

    if (!this.moving) {
      this._redraw();
    }
  }
  else {
    // Do nothing
  }
};

/**
 * Handle pinch event
 * @param event
 * @private
 */
Graph.prototype._onPinch = function (event) {
  var pointer = this._getPointer(event.gesture.center);

  this.drag.pinched = true;
  if (!('scale' in this.pinch)) {
    this.pinch.scale = 1;
  }

  // TODO: enable moving while pinching?
  var scale = this.pinch.scale * event.gesture.scale;
  this._zoom(scale, pointer)
};

/**
 * Zoom the graph in or out
 * @param {Number} scale a number around 1, and between 0.01 and 10
 * @param {{x: Number, y: Number}} pointer
 * @return {Number} appliedScale    scale is limited within the boundaries
 * @private
 */
Graph.prototype._zoom = function(scale, pointer) {
  var scaleOld = this._getScale();
  if (scale < 0.01) {
    scale = 0.01;
  }
  if (scale > 10) {
    scale = 10;
  }

  var translation = this._getTranslation();
  var scaleFrac = scale / scaleOld;
  var tx = (1 - scaleFrac) * pointer.x + translation.x * scaleFrac;
  var ty = (1 - scaleFrac) * pointer.y + translation.y * scaleFrac;

  this._setScale(scale);
  this._setTranslation(tx, ty);
  this._updateClusters();
  this._redraw();

  return scale;
};

/**
 * Event handler for mouse wheel event, used to zoom the timeline
 * See http://adomas.org/javascript-mouse-wheel/
 *     https://github.com/EightMedia/hammer.js/issues/256
 * @param {MouseEvent}  event
 * @private
 */
Graph.prototype._onMouseWheel = function(event) {
  // retrieve delta
  var delta = 0;
  if (event.wheelDelta) { /* IE/Opera. */
    delta = event.wheelDelta/120;
  } else if (event.detail) { /* Mozilla case. */
    // In Mozilla, sign of delta is different than in IE.
    // Also, delta is multiple of 3.
    delta = -event.detail/3;
  }

  // If delta is nonzero, handle it.
  // Basically, delta is now positive if wheel was scrolled up,
  // and negative, if wheel was scrolled down.
  if (delta) {
    if (!('mouswheelScale' in this.pinch)) {
      this.pinch.mouswheelScale = 1;
    }

    // calculate the new scale
    var scale = this.pinch.mouswheelScale;
    var zoom = delta / 10;
    if (delta < 0) {
      zoom = zoom / (1 - zoom);
    }
    scale *= (1 + zoom);

    // calculate the pointer location
    var gesture = Hammer.event.collectEventData(this, 'scroll', event);
    var pointer = this._getPointer(gesture.center);

    // apply the new scale
    scale = this._zoom(scale, pointer);

    // store the new, applied scale
    this.pinch.mouswheelScale = scale;
  }

  // Prevent default actions caused by mouse wheel.
  event.preventDefault();
};


/**
 * Mouse move handler for checking whether the title moves over a node with a title.
 * @param  {Event} event
 * @private
 */
Graph.prototype._onMouseMoveTitle = function (event) {
  var gesture = Hammer.event.collectEventData(this, 'mousemove', event);
  var pointer = this._getPointer(gesture.center);

  // check if the previously selected node is still selected
  if (this.popupNode) {
    this._checkHidePopup(pointer);
  }

  // start a timeout that will check if the mouse is positioned above
  // an element
  var me = this;
  var checkShow = function() {
    me._checkShowPopup(pointer);
  };
  if (this.popupTimer) {
    clearInterval(this.popupTimer); // stop any running timer
  }
  if (!this.leftButtonDown) {
    this.popupTimer = setTimeout(checkShow, 300);
  }
};

/**
 * Check if there is an element on the given position in the graph
 * (a node or edge). If so, and if this element has a title,
 * show a popup window with its title.
 *
 * @param {{x:Number, y:Number}} pointer
 * @private
 */
Graph.prototype._checkShowPopup = function (pointer) {
  var obj = {
    left:   this._canvasToX(pointer.x),
    top:    this._canvasToY(pointer.y),
    right:  this._canvasToX(pointer.x),
    bottom: this._canvasToY(pointer.y)
  };

  var id;
  var lastPopupNode = this.popupNode;

  if (this.popupNode == undefined) {
    // search the nodes for overlap, select the top one in case of multiple nodes
    var nodes = this.nodes;
    for (id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        var node = nodes[id];
        if (node.getTitle() != undefined && node.isOverlappingWith(obj)) {
          this.popupNode = node;
          break;
        }
      }
    }
  }

  if (this.popupNode == undefined) {
    // search the edges for overlap
    var edges = this.edges;
    for (id in edges) {
      if (edges.hasOwnProperty(id)) {
        var edge = edges[id];
        if (edge.connected && (edge.getTitle() != undefined) &&
            edge.isOverlappingWith(obj)) {
          this.popupNode = edge;
          break;
        }
      }
    }
  }

  if (this.popupNode) {
    // show popup message window
    if (this.popupNode != lastPopupNode) {
      var me = this;
      if (!me.popup) {
        me.popup = new Popup(me.frame);
      }

      // adjust a small offset such that the mouse cursor is located in the
      // bottom left location of the popup, and you can easily move over the
      // popup area
      me.popup.setPosition(pointer.x - 3, pointer.y - 3);
      me.popup.setText(me.popupNode.getTitle());
      me.popup.show();
    }
  }
  else {
    if (this.popup) {
      this.popup.hide();
    }
  }
};

/**
 * Check if the popup must be hided, which is the case when the mouse is no
 * longer hovering on the object
 * @param {{x:Number, y:Number}} pointer
 * @private
 */
Graph.prototype._checkHidePopup = function (pointer) {
  if (!this.popupNode || !this._getNodeAt(pointer) ) {
    this.popupNode = undefined;
    if (this.popup) {
      this.popup.hide();
    }
  }
};

/**
 * Unselect selected nodes. If no selection array is provided, all nodes
 * are unselected
 * @param {Object[]} selection     Array with selection objects, each selection
 *                                 object has a parameter row. Optional
 * @param {Boolean} triggerSelect  If true (default), the select event
 *                                 is triggered when nodes are unselected
 * @return {Boolean} changed       True if the selection is changed
 * @private
 */
Graph.prototype._unselectNodes = function(selection, triggerSelect) {
  var changed = false;
  var i, iMax, id;

  if (selection) {
    // remove provided selections
    for (i = 0, iMax = selection.length; i < iMax; i++) {
      id = selection[i];
      this.nodes[id].unselect();

      var j = 0;
      while (j < this.selection.length) {
        if (this.selection[j] == id) {
          this.selection.splice(j, 1);
          changed = true;
        }
        else {
          j++;
        }
      }
    }
  }
  else if (this.selection && this.selection.length) {
    // remove all selections
    for (i = 0, iMax = this.selection.length; i < iMax; i++) {
      id = this.selection[i];
      this.nodes[id].unselect();
      changed = true;
    }
    this.selection = [];
  }

  if (changed && (triggerSelect == true || triggerSelect == undefined)) {
    // fire the select event
    this._trigger('select');
  }

  return changed;
};

/**
 * select all nodes on given location x, y
 * @param {Array} selection   an array with node ids
 * @param {boolean} append    If true, the new selection will be appended to the
 *                            current selection (except for duplicate entries)
 * @return {Boolean} changed  True if the selection is changed
 * @private
 */
Graph.prototype._selectNodes = function(selection, append) {
  var changed = false;
  var i, iMax;

  // TODO: the selectNodes method is a little messy, rework this

  // check if the current selection equals the desired selection
  var selectionAlreadyThere = true;
  if (selection.length != this.selection.length) {
    selectionAlreadyThere = false;
  }
  else {
    for (i = 0, iMax = Math.min(selection.length, this.selection.length); i < iMax; i++) {
      if (selection[i] != this.selection[i]) {
        selectionAlreadyThere = false;
        break;
      }
    }
  }
  if (selectionAlreadyThere) {
    return changed;
  }

  if (append == undefined || append == false) {
    // first deselect any selected node
    var triggerSelect = false;
    changed = this._unselectNodes(undefined, triggerSelect);
  }

  for (i = 0, iMax = selection.length; i < iMax; i++) {
    // add each of the new selections, but only when they are not duplicate
    var id = selection[i];
    var isDuplicate = (this.selection.indexOf(id) != -1);
    if (!isDuplicate) {
      this.nodes[id].select();
      this.selection.push(id);
      changed = true;
    }
  }

  if (changed) {
    // fire the select event
    this._trigger('select');
  }

  return changed;
};

/**
 * retrieve all nodes overlapping with given object
 * @param {Object} obj  An object with parameters left, top, right, bottom
 * @return {Number[]}   An array with id's of the overlapping nodes
 * @private
 */
Graph.prototype._getNodesOverlappingWith = function (obj) {
  var nodes = this.nodes,
      overlappingNodes = [];

  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      if (nodes[id].isOverlappingWith(obj)) {
        overlappingNodes.push(id);
      }
    }
  }

  return overlappingNodes;
};

/**
 * retrieve the currently selected nodes
 * @return {Number[] | String[]} selection    An array with the ids of the
 *                                            selected nodes.
 */
Graph.prototype.getSelection = function() {
  return this.selection.concat([]);
};

/**
 * select zero or more nodes
 * @param {Number[] | String[]} selection     An array with the ids of the
 *                                            selected nodes.
 */
Graph.prototype.setSelection = function(selection) {
  var i, iMax, id;

  if (!selection || (selection.length == undefined))
    throw 'Selection must be an array with ids';

  // first unselect any selected node
  for (i = 0, iMax = this.selection.length; i < iMax; i++) {
    id = this.selection[i];
    this.nodes[id].unselect();
  }

  this.selection = [];

  for (i = 0, iMax = selection.length; i < iMax; i++) {
    id = selection[i];

    var node = this.nodes[id];
    if (!node) {
      throw new RangeError('Node with id "' + id + '" not found');
    }
    node.select();
    this.selection.push(id);
  }

  this.redraw();
};

/**
 * Validate the selection: remove ids of nodes which no longer exist
 * @private
 */
Graph.prototype._updateSelection = function () {
  var i = 0;
  while (i < this.selection.length) {
    var id = this.selection[i];
    if (!this.nodes[id]) {
      this.selection.splice(i, 1);
    }
    else {
      i++;
    }
  }
};

/**
 * Temporary method to test calculating a hub value for the nodes
 * @param {number} level        Maximum number edges between two nodes in order
 *                              to call them connected. Optional, 1 by default
 * @return {Number[]} connectioncount array with the connection count
 *                                    for each node
 * @private
 */
Graph.prototype._getConnectionCount = function(level) {
  if (level == undefined) {
    level = 1;
  }

  // get the nodes connected to given nodes
  function getConnectedNodes(nodes) {
    var connectedNodes = [];

    for (var j = 0, jMax = nodes.length; j < jMax; j++) {
      var node = nodes[j];

      // find all nodes connected to this node
      var edges = node.edges;
      for (var i = 0, iMax = edges.length; i < iMax; i++) {
        var edge = edges[i];
        var other = null;

        // check if connected
        if (edge.from == node)
          other = edge.to;
        else if (edge.to == node)
          other = edge.from;

        // check if the other node is not already in the list with nodes
        var k, kMax;
        if (other) {
          for (k = 0, kMax = nodes.length; k < kMax; k++) {
            if (nodes[k] == other) {
              other = null;
              break;
            }
          }
        }
        if (other) {
          for (k = 0, kMax = connectedNodes.length; k < kMax; k++) {
            if (connectedNodes[k] == other) {
              other = null;
              break;
            }
          }
        }

        if (other)
          connectedNodes.push(other);
      }
    }

    return connectedNodes;
  }

  var connections = [];
  var nodes = this.nodes;
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      var c = [nodes[id]];
      for (var l = 0; l < level; l++) {
        c = c.concat(getConnectedNodes(c));
      }
      connections.push(c);
    }
  }

  var hubs = [];
  for (var i = 0, len = connections.length; i < len; i++) {
    hubs.push(connections[i].length);
  }

  return hubs;
};


/**
 * Set a new size for the graph
 * @param {string} width   Width in pixels or percentage (for example '800px'
 *                         or '50%')
 * @param {string} height  Height in pixels or percentage  (for example '400px'
 *                         or '30%')
 */
Graph.prototype.setSize = function(width, height) {
  this.frame.style.width = width;
  this.frame.style.height = height;

  this.frame.canvas.style.width = '100%';
  this.frame.canvas.style.height = '100%';

  this.frame.canvas.width = this.frame.canvas.clientWidth;
  this.frame.canvas.height = this.frame.canvas.clientHeight;
};

/**
 * Set a data set with nodes for the graph
 * @param {Array | DataSet | DataView} nodes         The data containing the nodes.
 * @private
 */
Graph.prototype._setNodes = function(nodes) {
  var oldNodesData = this.nodesData;

  if (nodes instanceof DataSet || nodes instanceof DataView) {
    this.nodesData = nodes;
  }
  else if (nodes instanceof Array) {
    this.nodesData = new DataSet();
    this.nodesData.add(nodes);
  }
  else if (!nodes) {
    this.nodesData = new DataSet();
  }
  else {
    throw new TypeError('Array or DataSet expected');
  }

  if (oldNodesData) {
    // unsubscribe from old dataset
    util.forEach(this.nodesListeners, function (callback, event) {
      oldNodesData.unsubscribe(event, callback);
    });
  }

  // remove drawn nodes
  this.nodes = {};

  if (this.nodesData) {
    // subscribe to new dataset
    var me = this;
    util.forEach(this.nodesListeners, function (callback, event) {
      me.nodesData.subscribe(event, callback);
    });

    // draw all new nodes
    var ids = this.nodesData.getIds();
    this._addNodes(ids);
  }
  this._updateSelection();
};

/**
 * Add nodes
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._addNodes = function(ids) {
  var id;
  for (var i = 0, len = ids.length; i < len; i++) {
    id = ids[i];
    var data = this.nodesData.get(id);
    var node = new Node(data, this.images, this.groups, this.constants);
    this.nodes[id] = node; // note: this may replace an existing node

    if (!node.isFixed()) {
      // TODO: position new nodes in a smarter way!
      var radius = this.constants.edges.length * 2;
      var count = ids.length;
      var angle = 2 * Math.PI * (i / count);
      node.x = radius * Math.cos(angle);
      node.y = radius * Math.sin(angle);

      // note: no not use node.isMoving() here, as that gives the current
      // velocity of the node, which is zero after creation of the node.
      this.moving = true;
    }
  }
  this._updateNodeIndexList();
  this._reconnectEdges();
  this._updateValueRange(this.nodes);
};

/**
 * Update existing nodes, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._updateNodes = function(ids) {
  var nodes = this.nodes,
      nodesData = this.nodesData;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    var node = nodes[id];
    var data = nodesData.get(id);
    if (node) {
      // update node
      node.setProperties(data, this.constants);
    }
    else {
      // create node
      node = new Node(properties, this.images, this.groups, this.constants);
      nodes[id] = node;

      if (!node.isFixed()) {
        this.moving = true;
      }
    }
  }
  this._updateNodeIndexList();
  this._reconnectEdges();
  this._updateValueRange(nodes);
};

/**
 * Remove existing nodes. If nodes do not exist, the method will just ignore it.
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._removeNodes = function(ids) {
  var nodes = this.nodes;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    delete nodes[id];
  }
  this._updateNodeIndexList();
  this._reconnectEdges();
  this._updateSelection();
  this._updateValueRange(nodes);
};

/**
 * Load edges by reading the data table
 * @param {Array | DataSet | DataView} edges    The data containing the edges.
 * @private
 * @private
 */
Graph.prototype._setEdges = function(edges) {
  var oldEdgesData = this.edgesData;

  if (edges instanceof DataSet || edges instanceof DataView) {
    this.edgesData = edges;
  }
  else if (edges instanceof Array) {
    this.edgesData = new DataSet();
    this.edgesData.add(edges);
  }
  else if (!edges) {
    this.edgesData = new DataSet();
  }
  else {
    throw new TypeError('Array or DataSet expected');
  }

  if (oldEdgesData) {
    // unsubscribe from old dataset
    util.forEach(this.edgesListeners, function (callback, event) {
      oldEdgesData.unsubscribe(event, callback);
    });
  }

  // remove drawn edges
  this.edges = {};

  if (this.edgesData) {
    // subscribe to new dataset
    var me = this;
    util.forEach(this.edgesListeners, function (callback, event) {
      me.edgesData.subscribe(event, callback);
    });

    // draw all new nodes
    var ids = this.edgesData.getIds();
    this._addEdges(ids);
  }

  this._reconnectEdges();
};

/**
 * Add edges
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._addEdges = function (ids) {
  var edges = this.edges,
      edgesData = this.edgesData;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];

    var oldEdge = edges[id];
    if (oldEdge) {
      oldEdge.disconnect();
    }

    var data = edgesData.get(id);
    edges[id] = new Edge(data, this, this.constants);
  }

  this.moving = true;
  this._updateValueRange(edges);
};

/**
 * Update existing edges, or create them when not yet existing
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._updateEdges = function (ids) {
  var edges = this.edges,
      edgesData = this.edgesData;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];

    var data = edgesData.get(id);
    var edge = edges[id];
    if (edge) {
      // update edge
      edge.disconnect();
      edge.setProperties(data, this.constants);
      edge.connect();
    }
    else {
      // create edge
      edge = new Edge(data, this, this.constants);
      this.edges[id] = edge;
    }
  }

  this.moving = true;
  this._updateValueRange(edges);
};

/**
 * Remove existing edges. Non existing ids will be ignored
 * @param {Number[] | String[]} ids
 * @private
 */
Graph.prototype._removeEdges = function (ids) {
  var edges = this.edges;
  for (var i = 0, len = ids.length; i < len; i++) {
    var id = ids[i];
    var edge = edges[id];
    if (edge) {
      edge.disconnect();
      delete edges[id];
    }
  }

  this.moving = true;
  this._updateValueRange(edges);
};

/**
 * Reconnect all edges
 * @private
 */
Graph.prototype._reconnectEdges = function() {
  var id,
      nodes = this.nodes,
      edges = this.edges;
  for (id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      nodes[id].edges = [];
    }
  }

  for (id in edges) {
    if (edges.hasOwnProperty(id)) {
      var edge = edges[id];
      edge.from = null;
      edge.to = null;
      edge.connect();
    }
  }
};

/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Object} obj    An object containing a set of Edges or Nodes
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 * @private
 */
Graph.prototype._updateValueRange = function(obj) {
  var id;

  // determine the range of the objects
  var valueMin = undefined;
  var valueMax = undefined;
  for (id in obj) {
    if (obj.hasOwnProperty(id)) {
      var value = obj[id].getValue();
      if (value !== undefined) {
        valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
        valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
      }
    }
  }

  // adjust the range of all objects
  if (valueMin !== undefined && valueMax !== undefined) {
    for (id in obj) {
      if (obj.hasOwnProperty(id)) {
        obj[id].setValueRange(valueMin, valueMax);
      }
    }
  }
};

/**
 * Redraw the graph with the current data
 * chart will be resized too.
 */
Graph.prototype.redraw = function() {
  this.setSize(this.width, this.height);

  this._redraw();
};

/**
 * Redraw the graph with the current data
 * @private
 */
Graph.prototype._redraw = function() {
  var ctx = this.frame.canvas.getContext('2d');

  // clear the canvas
  var w = this.frame.canvas.width;
  var h = this.frame.canvas.height;
  ctx.clearRect(0, 0, w, h);

  // set scaling and translation
  ctx.save();
  ctx.translate(this.translation.x, this.translation.y);
  ctx.scale(this.scale, this.scale);

  this._drawEdges(ctx);
  this._drawNodes(ctx);

  // restore original scaling and translation
  ctx.restore();
};

/**
 * Set the translation of the graph
 * @param {Number} offsetX    Horizontal offset
 * @param {Number} offsetY    Vertical offset
 * @private
 */
Graph.prototype._setTranslation = function(offsetX, offsetY) {
  if (this.translation === undefined) {
    this.translation = {
      x: 0,
      y: 0
    };
  }

  if (offsetX !== undefined) {
    this.translation.x = offsetX;
  }
  if (offsetY !== undefined) {
    this.translation.y = offsetY;
  }
};

/**
 * Get the translation of the graph
 * @return {Object} translation    An object with parameters x and y, both a number
 * @private
 */
Graph.prototype._getTranslation = function() {
  return {
    x: this.translation.x,
    y: this.translation.y
  };
};

/**
 * Scale the graph
 * @param {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Graph.prototype._setScale = function(scale) {
  this.scale = scale;
};
/**
 * Get the current scale of  the graph
 * @return {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Graph.prototype._getScale = function() {
  return this.scale;
};

/**
 * Convert a horizontal point on the HTML canvas to the x-value of the model
 * @param {number} x
 * @returns {number}
 * @private
 */
Graph.prototype._canvasToX = function(x) {
  return (x - this.translation.x) / this.scale;
};

/**
 * Convert an x-value in the model to a horizontal point on the HTML canvas
 * @param {number} x
 * @returns {number}
 * @private
 */
Graph.prototype._xToCanvas = function(x) {
  return x * this.scale + this.translation.x;
};

/**
 * Convert a vertical point on the HTML canvas to the y-value of the model
 * @param {number} y
 * @returns {number}
 * @private
 */
Graph.prototype._canvasToY = function(y) {
  return (y - this.translation.y) / this.scale;
};

/**
 * Convert an y-value in the model to a vertical point on the HTML canvas
 * @param {number} y
 * @returns {number}
 * @private
 */
Graph.prototype._yToCanvas = function(y) {
  return y * this.scale + this.translation.y ;
};

/**
 * Redraw all nodes
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawNodes = function(ctx) {
  // first draw the unselected nodes
  var nodes = this.nodes;
  var selected = [];
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      if (nodes[id].isSelected()) {
        selected.push(id);
      }
      else {
        nodes[id].draw(ctx);
      }
    }
  }

  // draw the selected nodes on top
  for (var s = 0, sMax = selected.length; s < sMax; s++) {
    nodes[selected[s]].draw(ctx);
  }
};

/**
 * Redraw all edges
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawEdges = function(ctx) {
  var edges = this.edges;
  for (var id in edges) {
    if (edges.hasOwnProperty(id)) {
      var edge = edges[id];
      if (edge.connected) {
        edges[id].draw(ctx);
      }
    }
  }
};

/**
 * Find a stable position for all nodes
 * @private
 */
Graph.prototype._doStabilize = function() {
  var start = new Date();

  // find stable position
  var count = 0;
  var vmin = this.constants.minVelocity;
  var stable = false;
  while (!stable && count < this.constants.maxIterations) {
    this._calculateForces();
    this._discreteStepNodes();
    stable = !this._isMoving(vmin);
    count++;
  }

  var end = new Date();

  // console.log('Stabilized in ' + (end-start) + ' ms, ' + count + ' iterations' ); // TODO: cleanup
};

/**
 * Calculate the external forces acting on the nodes
 * Forces are caused by: edges, repulsing forces between nodes, gravity
 * @private
 */
Graph.prototype._calculateForces = function() {
  // create a local edge to the nodes and edges, that is faster
  var id, dx, dy, angle, distance, fx, fy,
      repulsingForce, springForce, length, edgeLength,
      nodes = this.nodes,
      edges = this.edges;

  // gravity, add a small constant force to pull the nodes towards the center of
  // the graph
  // Also, the forces are reset to zero in this loop by using _setForce instead
  // of _addForce
  var gravity = 0.01,
      gx = this.frame.canvas.clientWidth / 2,
      gy = this.frame.canvas.clientHeight / 2;
  for (id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      var node = nodes[id];
      dx = gx - node.x;
      dy = gy - node.y;
      angle = Math.atan2(dy, dx);
      fx = Math.cos(angle) * gravity;
      fy = Math.sin(angle) * gravity;

      node._setForce(fx, fy);
    }
  }

  // repulsing forces between nodes
  var minimumDistance = this.constants.nodes.distance,
      steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance


  // we loop from i over all but the last entree in the array
  // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
  for (var i = 0; i < this.nodeIndices.length-1; i++) {
    var node1 = nodes[this.nodeIndices[i]];
    for (var j = i+1; j < this.nodeIndices.length; j++) {
      var node2 = nodes[this.nodeIndices[j]];
      var clusterSize = (node1.clusterSize + node2.clusterSize - 2);
      dx = node2.x - node1.x;
      dy = node2.y - node1.y;
      distance = Math.sqrt(dx * dx + dy * dy);


      minimumDistance = (clusterSize == 0) ? this.constants.nodes.distance : (this.constants.nodes.distance * (1 + clusterSize * this.constants.clustering.distanceAmplification));

      if (distance < 2*minimumDistance) { // at 2.0 * the minimum distance, the force is 0.000045
        angle = Math.atan2(dy, dx);

        if (distance < 0.5*minimumDistance) { // at 0.5 * the minimum distance, the force is 0.993307
          repulsingForce = 1.0;
        }
        else {
          // TODO: correct factor for repulsing force
          //repulsingForce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
          //repulsingForce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force

          // clusters have a larger region of influence

          repulsingForce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)); // TODO: customize the repulsing force
        }

        // amplify the repulsion for clusters.
        repulsingForce *= (clusterSize == 0) ? 1 : 1 + clusterSize * this.constants.clustering.forceAmplification;

        fx = Math.cos(angle) * repulsingForce;
        fy = Math.sin(angle) * repulsingForce;

        node1._addForce(-fx, -fy);
        node2._addForce(fx, fy);
      }
    }
  }

  /* TODO: re-implement repulsion of edges
   for (var n = 0; n < nodes.length; n++) {
   for (var l = 0; l < edges.length; l++) {
   var lx = edges[l].from.x+(edges[l].to.x - edges[l].from.x)/2,
   ly = edges[l].from.y+(edges[l].to.y - edges[l].from.y)/2,

   // calculate normally distributed force
   dx = nodes[n].x - lx,
   dy = nodes[n].y - ly,
   distance = Math.sqrt(dx * dx + dy * dy),
   angle = Math.atan2(dy, dx),


   // TODO: correct factor for repulsing force
   //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
   //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
   repulsingforce = 1 / (1 + Math.exp((distance / (minimumDistance / 2) - 1) * steepness)), // TODO: customize the repulsing force
   fx = Math.cos(angle) * repulsingforce,
   fy = Math.sin(angle) * repulsingforce;
   nodes[n]._addForce(fx, fy);
   edges[l].from._addForce(-fx/2,-fy/2);
   edges[l].to._addForce(-fx/2,-fy/2);
   }
   }
   */

  // forces caused by the edges, modelled as springs
  for (id in edges) {
    if (edges.hasOwnProperty(id)) {
      var edge = edges[id];
      if (edge.connected) {
        dx = (edge.to.x - edge.from.x);
        dy = (edge.to.y - edge.from.y);
        //edgeLength = (edge.from.width + edge.from.height + edge.to.width + edge.to.height)/2 || edge.length; // TODO: dmin
        //edgeLength = (edge.from.width + edge.to.width)/2 || edge.length; // TODO: dmin
        //edgeLength = 20 + ((edge.from.width + edge.to.width) || 0) / 2;
        edgeLength = edge.length;
        // this implies that the edges between big clusters are longer
        edgeLength += (edge.to.clusterSize + edge.from.clusterSize - 2) * this.constants.clustering.edgeGrowth;
        length =  Math.sqrt(dx * dx + dy * dy);
        angle = Math.atan2(dy, dx);

        springForce = edge.stiffness * (edgeLength - length);

        fx = Math.cos(angle) * springForce;
        fy = Math.sin(angle) * springForce;

        edge.from._addForce(-fx, -fy);
        edge.to._addForce(fx, fy);
      }
    }
  }
/*
  // TODO: re-implement repulsion of edges

   // repulsing forces between edges
   var minimumDistance = this.constants.edges.distance,
   steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance
   for (var l = 0; l < edges.length; l++) {
   //Keep distance from other edge centers
   for (var l2 = l + 1; l2 < this.edges.length; l2++) {
   //var dmin = (nodes[n].width + nodes[n].height + nodes[n2].width + nodes[n2].height) / 1 || minimumDistance, // TODO: dmin
   //var dmin = (nodes[n].width + nodes[n2].width)/2  || minimumDistance, // TODO: dmin
   //dmin = 40 + ((nodes[n].width/2 + nodes[n2].width/2) || 0),
   var lx = edges[l].from.x+(edges[l].to.x - edges[l].from.x)/2,
   ly = edges[l].from.y+(edges[l].to.y - edges[l].from.y)/2,
   l2x = edges[l2].from.x+(edges[l2].to.x - edges[l2].from.x)/2,
   l2y = edges[l2].from.y+(edges[l2].to.y - edges[l2].from.y)/2,

   // calculate normally distributed force
   dx = l2x - lx,
   dy = l2y - ly,
   distance = Math.sqrt(dx * dx + dy * dy),
   angle = Math.atan2(dy, dx),


   // TODO: correct factor for repulsing force
   //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
   //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
   repulsingforce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)), // TODO: customize the repulsing force
   fx = Math.cos(angle) * repulsingforce,
   fy = Math.sin(angle) * repulsingforce;

   edges[l].from._addForce(-fx, -fy);
   edges[l].to._addForce(-fx, -fy);
   edges[l2].from._addForce(fx, fy);
   edges[l2].to._addForce(fx, fy);
   }
   }
*/
};


/**
 * Check if any of the nodes is still moving
 * @param {number} vmin   the minimum velocity considered as 'moving'
 * @return {boolean}      true if moving, false if non of the nodes is moving
 * @private
 */
Graph.prototype._isMoving = function(vmin) {
  // TODO: ismoving does not work well: should check the kinetic energy, not its velocity
  var nodes = this.nodes;
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id) && nodes[id].isMoving(vmin)) {
      return true;
    }
  }
  return false;
};


/**
 * Perform one discrete step for all nodes
 * @private
 */
Graph.prototype._discreteStepNodes = function() {
  var interval = this.refreshRate / 1000.0; // in seconds
  var nodes = this.nodes;
  for (var id in nodes) {
    if (nodes.hasOwnProperty(id)) {
      nodes[id].discreteStep(interval);
    }
  }
};

/**
 * Start animating nodes and edges
 */
Graph.prototype.start = function() {
  if (this.moving) {
    this._calculateForces();
    this._discreteStepNodes();

    var vmin = this.constants.minVelocity;
    this.moving = this._isMoving(vmin);
  }

  if (this.moving) {
    // start animation. only start timer if it is not already running
    if (!this.timer) {
      var graph = this;
      this.timer = window.setTimeout(function () {
        graph.timer = undefined;

        // benchmark the calculation
//        var start = window.performance.now();
        graph.start();
        // Optionally call this twice for faster convergence
        // graph.start();
//        var end = window.performance.now();
//        var time = end - start;
//        console.log('Simulation time: ' + time);


//        start = window.performance.now();
        graph._redraw();
//        end = window.performance.now();
//        time = end - start;
//        console.log('Drawing time: ' + time);

      }, this.refreshRate);
    }
  }
  else {
    this._redraw();
  }
};

/**
 * Stop animating nodes and edges.
 */
Graph.prototype.stop = function () {
  if (this.timer) {
    window.clearInterval(this.timer);
    this.timer = undefined;
  }
};
