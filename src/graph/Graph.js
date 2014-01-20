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
    clustering: { // TODO: naming of variables
      enableClustering: true,       // global on/off switch for clustering.
      maxNumberOfNodes: 100,        // for automatic (initial) clustering
      snakeThreshold: 0.5,          // maximum percentage of allowed snakenodes (long strings of connected nodes) within all nodes
      clusterEdgeLength: 25,        // threshold edge length for clustering
      relativeOpenFactor: 0.2,      // if the width or height of a cluster takes up this much of the screen, open the cluster
      fontSizeMultiplier: 4,        // how much the cluster font size grows per node in cluster (in px)
      forceAmplification: 0.7,      // factor of increase fo the repulsion force of a cluster (per node in cluster)
      distanceAmplification: 0.3,   // factor how much the repulsion distance of a cluster increases (per node in cluster).
      edgeGrowth: 11,               // amount of clusterSize connected to the edge is multiplied with this and added to edgeLength
      clusterSizeWidthFactor: 10,   // growth of the width  per node in cluster
      clusterSizeHeightFactor: 10,  // growth of the height per node in cluster
      clusterSizeRadiusFactor: 10,  // growth of the radius per node in cluster
      activeAreaBoxSize: 100,       // box area around the curser where clusters are popped open
      massTransferCoefficient: 1    // parent.mass += massTransferCoefficient * child.mass
    },
    minForce: 0.05,
    minVelocity: 0.02,   // px/s
    maxIterations: 1000  // maximum number of iteration to stabilize
  };

  // call the constructor of the cluster object
  Cluster.call(this);

  // call the sector constructor
  this._loadSectorSystem(); // would be fantastic if multiple in heritance just worked!

  var graph = this;
  this.freezeSimulation = false;// freeze the simulation
  this.tapTimer = 0;            // timer to detect doubleclick or double tap
  this.nodeIndices = [];        // array with all the indices of the nodes. Used to speed up forces calculation
  this.nodes = {};              // object with Node objects
  this.edges = {};              // object with Edge objects

  this.canvasTopLeft     = {"x": 0,"y": 0};   // coordinates of the top left of the canvas.     they will be set during calcForces.
  this.canvasBottomRight = {"x": 0,"y": 0};   // coordinates of the bottom right of the canvas. they will be set during calcForces

  this.zoomCenter = {};       // object with x and y elements used for determining the center of the zoom action
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

  // load data (the disable start variable will be the same as the enable clustering)
  this.setData(data,this.constants.clustering.enableClustering); //

  // zoom so all data will fit on the screen
  this.zoomToFit();

  if (this.constants.clustering.enableClustering) {
    // cluster if the data set is big
    this.clusterToFit(this.constants.clustering.maxNumberOfNodes, true);

    // updates the lables after clustering
    this.updateLabels();

    // this is called here because if clusterin is disabled, the start and stabilize are called in
    // the setData function.
    if (this.stabilize) {
      this._doStabilize();
    }
    this.start();
  }
}


/**
 * We add the functionality of the cluster object to the graph object
 * @type {Cluster.prototype}
 */
Graph.prototype = Object.create(Cluster.prototype);

/**
 * This function zooms out to fit all data on screen based on amount of nodes 
 */
Graph.prototype.zoomToFit = function() {
  var numberOfNodes = this.nodeIndices.length;
  var zoomLevel = 105 / (numberOfNodes + 80); // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
  if (zoomLevel > 1.0) {
    zoomLevel = 1.0;
  }

  if (!('mousewheelScale' in this.pinch)) {
    this.pinch.mousewheelScale = zoomLevel;
  }
  this._setScale(zoomLevel);
};


/**
 * Update the this.nodeIndices with the most recent node index list
 * @private
 */
Graph.prototype._updateNodeIndexList = function() {
  this._clearNodeIndexList();
  for (var idx in this.nodes) {
    if (this.nodes.hasOwnProperty(idx)) {
      this.nodeIndices.push(idx);
    }
  }
};


/**
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data              Object containing parameters:
 *                                   {Array | DataSet | DataView} [nodes] Array with nodes
 *                                   {Array | DataSet | DataView} [edges] Array with edges
 *                                   {String} [dot] String containing data in DOT format
 *                                   {Options} [options] Object with options
 * @param {Boolean} [disableStart]   | optional: disable the calling of the start function.
 */
Graph.prototype.setData = function(data, disableStart) {
  if (disableStart === undefined) {
    disableStart = false;
  }

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

  this._putDataInUniverse();

  if (!disableStart) {
    // find a stable position or start animating to a stable position
    if (this.stabilize) {
      this._doStabilize();
    }
    this.start();
  }
};

/**
 * Set options
 * @param {Object} options
 */
Graph.prototype.setOptions = function (options) {
  if (options) {
    // retrieve parameter values
    if (options.width !== undefined)           {this.width = options.width;}
    if (options.height !== undefined)          {this.height = options.height;}
    if (options.stabilize !== undefined)       {this.stabilize = options.stabilize;}
    if (options.selectable !== undefined)      {this.selectable = options.selectable;}

    if (optiones.clustering) {
      for (var prop in optiones.clustering) {
        if (options.clustering.hasOwnProperty(prop)) {
          this.constants.clustering[prop] = options.edges[prop];
        }
      }
    }

    // TODO: work out these options and document them
    if (options.edges) {
      for (var prop in options.edges) {
        if (options.edges.hasOwnProperty(prop)) {
          this.constants.edges[prop] = options.edges[prop];
        }
      }

      if (options.edges.length !== undefined &&
          options.nodes && options.nodes.distance === undefined) {
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
        if (options.edges.dash.length !== undefined) {
          this.constants.edges.dash.length = options.edges.dash.length;
        }
        if (options.edges.dash.gap !== undefined) {
          this.constants.edges.dash.gap = options.edges.dash.gap;
        }
        if (options.edges.dash.altLength !== undefined) {
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

  this.mouseTrap = mouseTrap;
  this.mouseTrap.bind("=",this.decreaseClusterLevel.bind(me));
  this.mouseTrap.bind("-",this.increaseClusterLevel.bind(me));
  this.mouseTrap.bind("s",this.singleStep.bind(me));
  this.mouseTrap.bind("h",this.updateClustersDefault.bind(me));
  this.mouseTrap.bind("c",this._collapseUniverse.bind(me));
  this.mouseTrap.bind("f",this.toggleFreeze.bind(me));

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

  var elapsedTime = new Date().getTime() - this.tapTimer;
  this.tapTimer = new Date().getTime();

  if (node) {
    if (node.isSelected() && elapsedTime < 300) {
      this.openCluster(node);
      this.openCluster(node);
    }
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
  if (scale < 0.001) {
    scale = 0.001;
  }
  if (scale > 10) {
    scale = 10;
  }
// + this.frame.canvas.clientHeight / 2
  var translation = this._getTranslation();

  var scaleFrac = scale / scaleOld;
  var tx = (1 - scaleFrac) * pointer.x + translation.x * scaleFrac;
  var ty = (1 - scaleFrac) * pointer.y + translation.y * scaleFrac;

  this.zoomCenter = {"x" : this._canvasToX(pointer.x),
                     "y" : this._canvasToY(pointer.y)};

 // this.zoomCenter = {"x" : pointer.x,"y" : pointer.y };
  this._setScale(scale);
  this._setTranslation(tx, ty);
  this.updateClustersDefault();
  this._redraw();

//  console.log("current zoomscale:",this.scale);

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
    if (!('mousewheelScale' in this.pinch)) {
      this.pinch.mousewheelScale = 1;
    }

    // calculate the new scale
    var scale = this.pinch.mousewheelScale;
    var zoom = delta / 10;
    if (delta < 0) {
      zoom = zoom / (1 - zoom);
    }
    scale *= (1 + zoom);

    // calculate the pointer location
    var gesture = util.fakeGesture(this, event);
    var pointer = this._getPointer(gesture.center);

    // apply the new scale
    scale = this._zoom(scale, pointer);

    // store the new, applied scale
    this.pinch.mousewheelScale = scale;
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
  var gesture = util.fakeGesture(this, event);
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
      if (this.nodes.hasOwnProperty(id)) {
        this.nodes[id].unselect();
        }
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
      if (this.nodes.hasOwnProperty(id)) {
        this.nodes[id].unselect();
      }
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
  var overlappingNodes = [];
  var nodes;

  // search in all sectors for nodes
  for (var sector in this.sectors["active"]) {
    if (this.sectors["active"].hasOwnProperty(sector)) {
      nodes = this.sectors["active"][sector]["nodes"];
      for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
          if (nodes[id].isOverlappingWith(obj)) {
            overlappingNodes.push(id);
          }
        }
      }
    }
  }

  for (var sector in this.sectors["frozen"]) {
    if (this.sectors["frozen"].hasOwnProperty(sector)) {
      nodes = this.sectors["frozen"][sector]["nodes"];
      for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
          if (nodes[id].isOverlappingWith(obj)) {
            overlappingNodes.push(id);
          }
        }
      }
    }
  }
  this.nodes = this.sectors["active"][this.activeSector[this.activeSector.length-1]]["nodes"];

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

    var data = edgesData.get(id, {"showInternalIds" : true});
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

  this._doInAllUniverses("_drawEdges",ctx);
  this._doInAllUniverses("_drawNodes",ctx);

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
      nodes[id].setScaleAndPos(this.scale,this.canvasTopLeft,this.canvasBottomRight);
      if (nodes[id].isSelected()) {
        selected.push(id);
      }
      else {
        if (nodes[id].inArea()) {
          nodes[id].draw(ctx);
        }
      }
    }
  }

  // draw the selected nodes on top
  for (var s = 0, sMax = selected.length; s < sMax; s++) {
    if (nodes[selected[s]].inArea()) {
      nodes[selected[s]].draw(ctx);
    }
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
      edge.setScale(this.scale);
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
  //var start = new Date();

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

 // var end = new Date();

  // console.log('Stabilized in ' + (end-start) + ' ms, ' + count + ' iterations' ); // TODO: cleanup
};

/**
 * Calculate the external forces acting on the nodes
 * Forces are caused by: edges, repulsing forces between nodes, gravity
 * @private
 */
Graph.prototype._calculateForces = function(nodes,edges) {
  // stop calculation if there is only one node
  if (this.nodeIndices.length == 1) {
    this.nodes[this.nodeIndices[0]]._setForce(0,0);
  }
  // if there are too many nodes on screen, we cluster without repositioning
  else if (this.nodeIndices.length > this.constants.clustering.maxNumberOfNodes * 4 && this.constants.clustering.enableClustering == true) {
    this.clusterToFit(this.constants.clustering.maxNumberOfNodes * 2, false);
    this._calculateForces();
  }
  else {
    this.canvasTopLeft = {"x": (0-this.translation.x)/this.scale,
                          "y": (0-this.translation.y)/this.scale};
    this.canvasBottomRight = {"x": (this.frame.canvas.clientWidth -this.translation.x)/this.scale,
                              "y": (this.frame.canvas.clientHeight-this.translation.y)/this.scale};
    var centerPos = {"x":0.5*(this.canvasTopLeft.x + this.canvasBottomRight.x),
                     "y":0.5*(this.canvasTopLeft.y + this.canvasBottomRight.y)}

    // create a local edge to the nodes and edges, that is faster
    var dx, dy, angle, distance, fx, fy,
      repulsingForce, springForce, length, edgeLength,
      node, node1, node2, edge, edgeID, i, j, nodeID, xCenter, yCenter;
    var clusterSize;
    var nodes = this.nodes;
    var edges = this.edges;


    // Gravity is required to keep separated groups from floating off
    // the forces are reset to zero in this loop by using _setForce instead
    // of _addForce
    var gravity = 0.08;
    for (i = 0; i < this.nodeIndices.length; i++) {
        node = nodes[this.nodeIndices[i]];
        // gravity does not apply when we are in a pocket sector
        if (this._sector() == "default") {
          dx = -node.x + centerPos.x;
          dy = -node.y + centerPos.y;

          angle = Math.atan2(dy, dx);
          fx = Math.cos(angle) * gravity;
          fy = Math.sin(angle) * gravity;
        }
        else {
          fx = 0;
          fy = 0;
        }
        node._setForce(fx, fy);

        node.updateDamping(this.nodeIndices.length);
    }

    this.updateLabels();

    // repulsing forces between nodes
    var minimumDistance = this.constants.nodes.distance,
        steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance


    // we loop from i over all but the last entree in the array
    // j loops from i+1 to the last. This way we do not double count any of the indices, nor i == j
    for (i = 0; i < this.nodeIndices.length-1; i++) {
      node1 = nodes[this.nodeIndices[i]];
      for (j = i+1; j < this.nodeIndices.length; j++) {
        node2 = nodes[this.nodeIndices[j]];
        clusterSize = (node1.clusterSize + node2.clusterSize - 2);
        dx = node2.x - node1.x;
        dy = node2.y - node1.y;
        distance = Math.sqrt(dx * dx + dy * dy);


        // clusters have a larger region of influence
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

/*
    // repulsion of the edges on the nodes and
    for (var nodeID in nodes) {
      if (nodes.hasOwnProperty(nodeID)) {
        node = nodes[nodeID];
        for(var edgeID in edges) {
          if (edges.hasOwnProperty(edgeID)) {
            edge = edges[edgeID];

            // get the center of the edge
            xCenter = edge.from.x+(edge.to.x - edge.from.x)/2;
            yCenter = edge.from.y+(edge.to.y - edge.from.y)/2;

            // calculate normally distributed force
            dx = node.x - xCenter;
            dy = node.y - yCenter;
            distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 2*minimumDistance) { // at 2.0 * the minimum distance, the force is 0.000045
              angle = Math.atan2(dy, dx);

              if (distance < 0.5*minimumDistance) { // at 0.5 * the minimum distance, the force is 0.993307
                repulsingForce = 1.0;
              }
              else {
                // TODO: correct factor for repulsing force
                //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
                //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
                repulsingForce = 1 / (1 + Math.exp((distance / (minimumDistance / 2) - 1) * steepness)); // TODO: customize the repulsing force
              }
              fx = Math.cos(angle) * repulsingForce;
              fy = Math.sin(angle) * repulsingForce;
              node._addForce(fx, fy);
              edge.from._addForce(-fx/2,-fy/2);
              edge.to._addForce(-fx/2,-fy/2);
            }
          }
        }
      }
    }
*/

    // forces caused by the edges, modelled as springs
    for (edgeID in edges) {
      if (edges.hasOwnProperty(edgeID)) {
        edge = edges[edgeID];
        if (edge.connected) {
          // only calculate forces if nodes are in the same sector
          if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
            clusterSize = (edge.to.clusterSize + edge.from.clusterSize - 2);
            dx = (edge.to.x - edge.from.x);
            dy = (edge.to.y - edge.from.y);
            //edgeLength = (edge.from.width + edge.from.height + edge.to.width + edge.to.height)/2 || edge.length; // TODO: dmin
            //edgeLength = (edge.from.width + edge.to.width)/2 || edge.length; // TODO: dmin
            //edgeLength = 20 + ((edge.from.width + edge.to.width) || 0) / 2;
            edgeLength = edge.length;
            // this implies that the edges between big clusters are longer
            edgeLength += clusterSize * this.constants.clustering.edgeGrowth;
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
  }
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

  var vmin = this.constants.minVelocity;
  this.moving = this._isMoving(vmin);
};

/**
 * Start animating nodes and edges
 */
Graph.prototype.start = function() {
  if (!this.freezeSimulation) {
    if (this.moving) {
      this._doInAllActiveUniverses("_calculateForces");
      this._doInAllActiveUniverses("_discreteStepNodes");
    }

    if (this.moving) {
      // start animation. only start timer if it is not already running
      if (!this.timer) {
        var graph = this;
        this.timer = window.setTimeout(function () {
          graph.timer = undefined;

          graph.start();
          graph.start();

          graph._redraw();
//          var start = window.performance.now();
//          graph._redraw();
//          var end = window.performance.now();
//          var time = end - start;
//          console.log('Drawing time: ' + time);
        }, this.refreshRate);
      }
    }
    else {
      this._redraw();
    }
  }
};


Graph.prototype.singleStep = function() {
  if (this.moving) {
    this._calculateForces();
    this._discreteStepNodes();

    var vmin = this.constants.minVelocity;
    this.moving = this._isMoving(vmin);
    this._redraw();
  }
};



/**
 *  Freeze the animation
 */
Graph.prototype.toggleFreeze = function() {
  if (this.freezeSimulation == false) {
    this.freezeSimulation = true;
  }
  else {
    this.freezeSimulation = false;
    this.start();
  }
};


Graph.prototype._loadSectorSystem = function() {
  this.sectors = {};
  this.activeSector = ["default"];
  this.sectors["active"] = {};
  this.sectors["active"][this.activeSector[this.activeSector.length-1]] = {"nodes":{},"edges":{},"nodeIndices":[]};
  this.sectors["frozen"] = {};
  this.sectors["draw"] = {};

  this.nodeIndices = this.sectors["active"][this.activeSector[this.activeSector.length-1]]["nodeIndices"];  // the node indices list is used to speed up the computation of the repulsion fields
  for (var mixinFunction in UniverseMixin) {
    if (UniverseMixin.hasOwnProperty(mixinFunction)) {
      Graph.prototype[mixinFunction] = UniverseMixin[mixinFunction];
    }
  }


};