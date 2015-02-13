var Node = require('../Node');

/**
 * This function can be called from the _doInAllSectors function
 *
 * @param object
 * @param overlappingNodes
 * @private
 */
exports._getNodesOverlappingWith = function(object, overlappingNodes) {
  var nodes = this.nodes;
  for (var nodeId in nodes) {
    if (nodes.hasOwnProperty(nodeId)) {
      if (nodes[nodeId].isOverlappingWith(object)) {
        overlappingNodes.push(nodeId);
      }
    }
  }
};

/**
 * retrieve all nodes overlapping with given object
 * @param {Object} object  An object with parameters left, top, right, bottom
 * @return {Number[]}   An array with id's of the overlapping nodes
 * @private
 */
exports._getAllNodesOverlappingWith = function (object) {
  var overlappingNodes = [];
  this._doInAllActiveSectors("_getNodesOverlappingWith",object,overlappingNodes);
  return overlappingNodes;
};


/**
 * Return a position object in canvasspace from a single point in screenspace
 *
 * @param pointer
 * @returns {{left: number, top: number, right: number, bottom: number}}
 * @private
 */
exports._pointerToPositionObject = function(pointer) {
  var x = this._XconvertDOMtoCanvas(pointer.x);
  var y = this._YconvertDOMtoCanvas(pointer.y);

  return {
    left:   x,
    top:    y,
    right:  x,
    bottom: y
  };
};


/**
 * Get the top node at the a specific point (like a click)
 *
 * @param {{x: Number, y: Number}} pointer
 * @return {Node | null} node
 * @private
 */
exports._getNodeAt = function (pointer) {
  // we first check if this is an navigation controls element
  var positionObject = this._pointerToPositionObject(pointer);
  var overlappingNodes = this._getAllNodesOverlappingWith(positionObject);

  // if there are overlapping nodes, select the last one, this is the
  // one which is drawn on top of the others
  if (overlappingNodes.length > 0) {
     return this.nodes[overlappingNodes[overlappingNodes.length - 1]];
  }
  else {
    return null;
  }
};


/**
 * retrieve all edges overlapping with given object, selector is around center
 * @param {Object} object  An object with parameters left, top, right, bottom
 * @return {Number[]}   An array with id's of the overlapping nodes
 * @private
 */
exports._getEdgesOverlappingWith = function (object, overlappingEdges) {
  var edges = this.edges;
  for (var edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      if (edges[edgeId].isOverlappingWith(object)) {
        overlappingEdges.push(edgeId);
      }
    }
  }
};


/**
 * retrieve all nodes overlapping with given object
 * @param {Object} object  An object with parameters left, top, right, bottom
 * @return {Number[]}   An array with id's of the overlapping nodes
 * @private
 */
exports._getAllEdgesOverlappingWith = function (object) {
  var overlappingEdges = [];
  this._doInAllActiveSectors("_getEdgesOverlappingWith",object,overlappingEdges);
  return overlappingEdges;
};

/**
 * Place holder. To implement change the _getNodeAt to a _getObjectAt. Have the _getObjectAt call
 * _getNodeAt and _getEdgesAt, then priortize the selection to user preferences.
 *
 * @param pointer
 * @returns {null}
 * @private
 */
exports._getEdgeAt = function(pointer) {
  var positionObject = this._pointerToPositionObject(pointer);
  var overlappingEdges = this._getAllEdgesOverlappingWith(positionObject);

  if (overlappingEdges.length > 0) {
    return this.edges[overlappingEdges[overlappingEdges.length - 1]];
  }
  else {
    return null;
  }
};


/**
 * Add object to the selection array.
 *
 * @param obj
 * @private
 */
exports._addToSelection = function(obj) {
  if (obj instanceof Node) {
    this.selectionObj.nodes[obj.id] = obj;
  }
  else {
    this.selectionObj.edges[obj.id] = obj;
  }
};

/**
 * Add object to the selection array.
 *
 * @param obj
 * @private
 */
exports._addToHover = function(obj) {
  if (obj instanceof Node) {
    this.hoverObj.nodes[obj.id] = obj;
  }
  else {
    this.hoverObj.edges[obj.id] = obj;
  }
};


/**
 * Remove a single option from selection.
 *
 * @param {Object} obj
 * @private
 */
exports._removeFromSelection = function(obj) {
  if (obj instanceof Node) {
    delete this.selectionObj.nodes[obj.id];
  }
  else {
    delete this.selectionObj.edges[obj.id];
  }
};

/**
 * Unselect all. The selectionObj is useful for this.
 *
 * @param {Boolean} [doNotTrigger] | ignore trigger
 * @private
 */
exports._unselectAll = function(doNotTrigger) {
  if (doNotTrigger === undefined) {
    doNotTrigger = false;
  }
  for(var nodeId in this.selectionObj.nodes) {
    if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      this.selectionObj.nodes[nodeId].unselect();
    }
  }
  for(var edgeId in this.selectionObj.edges) {
    if(this.selectionObj.edges.hasOwnProperty(edgeId)) {
      this.selectionObj.edges[edgeId].unselect();
    }
  }

  this.selectionObj = {nodes:{},edges:{}};

  if (doNotTrigger == false) {
    this.emit('select', this.getSelection());
  }
};

/**
 * Unselect all clusters. The selectionObj is useful for this.
 *
 * @param {Boolean} [doNotTrigger] | ignore trigger
 * @private
 */
exports._unselectClusters = function(doNotTrigger) {
  if (doNotTrigger === undefined) {
    doNotTrigger = false;
  }

  for (var nodeId in this.selectionObj.nodes) {
    if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      if (this.selectionObj.nodes[nodeId].clusterSize > 1) {
        this.selectionObj.nodes[nodeId].unselect();
        this._removeFromSelection(this.selectionObj.nodes[nodeId]);
      }
    }
  }

  if (doNotTrigger == false) {
    this.emit('select', this.getSelection());
  }
};


/**
 * return the number of selected nodes
 *
 * @returns {number}
 * @private
 */
exports._getSelectedNodeCount = function() {
  var count = 0;
  for (var nodeId in this.selectionObj.nodes) {
    if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      count += 1;
    }
  }
  return count;
};

/**
 * return the selected node
 *
 * @returns {number}
 * @private
 */
exports._getSelectedNode = function() {
  for (var nodeId in this.selectionObj.nodes) {
    if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      return this.selectionObj.nodes[nodeId];
    }
  }
  return null;
};

/**
 * return the selected edge
 *
 * @returns {number}
 * @private
 */
exports._getSelectedEdge = function() {
  for (var edgeId in this.selectionObj.edges) {
    if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
      return this.selectionObj.edges[edgeId];
    }
  }
  return null;
};


/**
 * return the number of selected edges
 *
 * @returns {number}
 * @private
 */
exports._getSelectedEdgeCount = function() {
  var count = 0;
  for (var edgeId in this.selectionObj.edges) {
    if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
      count += 1;
    }
  }
  return count;
};


/**
 * return the number of selected objects.
 *
 * @returns {number}
 * @private
 */
exports._getSelectedObjectCount = function() {
  var count = 0;
  for(var nodeId in this.selectionObj.nodes) {
    if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      count += 1;
    }
  }
  for(var edgeId in this.selectionObj.edges) {
    if(this.selectionObj.edges.hasOwnProperty(edgeId)) {
      count += 1;
    }
  }
  return count;
};

/**
 * Check if anything is selected
 *
 * @returns {boolean}
 * @private
 */
exports._selectionIsEmpty = function() {
  for(var nodeId in this.selectionObj.nodes) {
    if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      return false;
    }
  }
  for(var edgeId in this.selectionObj.edges) {
    if(this.selectionObj.edges.hasOwnProperty(edgeId)) {
      return false;
    }
  }
  return true;
};


/**
 * check if one of the selected nodes is a cluster.
 *
 * @returns {boolean}
 * @private
 */
exports._clusterInSelection = function() {
  for(var nodeId in this.selectionObj.nodes) {
    if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      if (this.selectionObj.nodes[nodeId].clusterSize > 1) {
        return true;
      }
    }
  }
  return false;
};

/**
 * select the edges connected to the node that is being selected
 *
 * @param {Node} node
 * @private
 */
exports._selectConnectedEdges = function(node) {
  for (var i = 0; i < node.dynamicEdges.length; i++) {
    var edge = node.dynamicEdges[i];
    edge.select();
    this._addToSelection(edge);
  }
};

/**
 * select the edges connected to the node that is being selected
 *
 * @param {Node} node
 * @private
 */
exports._hoverConnectedEdges = function(node) {
  for (var i = 0; i < node.dynamicEdges.length; i++) {
    var edge = node.dynamicEdges[i];
    edge.hover = true;
    this._addToHover(edge);
  }
};


/**
 * unselect the edges connected to the node that is being selected
 *
 * @param {Node} node
 * @private
 */
exports._unselectConnectedEdges = function(node) {
  for (var i = 0; i < node.dynamicEdges.length; i++) {
    var edge = node.dynamicEdges[i];
    edge.unselect();
    this._removeFromSelection(edge);
  }
};




/**
 * This is called when someone clicks on a node. either select or deselect it.
 * If there is an existing selection and we don't want to append to it, clear the existing selection
 *
 * @param {Node || Edge} object
 * @param {Boolean} append
 * @param {Boolean} [doNotTrigger] | ignore trigger
 * @private
 */
exports._selectObject = function(object, append, doNotTrigger, highlightEdges, overrideSelectable) {
  if (doNotTrigger === undefined) {
    doNotTrigger = false;
  }
  if (highlightEdges === undefined) {
    highlightEdges = true;
  }

  if (this._selectionIsEmpty() == false && append == false && this.forceAppendSelection == false) {
    this._unselectAll(true);
  }

  // selectable allows the object to be selected. Override can be used if needed to bypass this.
  if (object.selected == false && (this.constants.selectable == true || overrideSelectable)) {
    object.select();
    this._addToSelection(object);
    if (object instanceof Node && this.blockConnectingEdgeSelection == false && highlightEdges == true) {
      this._selectConnectedEdges(object);
    }
  }
  // do not select the object if selectable is false, only add it to selection to allow drag to work
  else if (object.selected == false) {
    this._addToSelection(object);
    doNotTrigger = true;
  }
  else {
    object.unselect();
    this._removeFromSelection(object);
  }

  if (doNotTrigger == false) {
    this.emit('select', this.getSelection());
  }
};


/**
 * This is called when someone clicks on a node. either select or deselect it.
 * If there is an existing selection and we don't want to append to it, clear the existing selection
 *
 * @param {Node || Edge} object
 * @private
 */
exports._blurObject = function(object) {
  if (object.hover == true) {
    object.hover = false;
    this.emit("blurNode",{node:object.id});
  }
};

/**
 * This is called when someone clicks on a node. either select or deselect it.
 * If there is an existing selection and we don't want to append to it, clear the existing selection
 *
 * @param {Node || Edge} object
 * @private
 */
exports._hoverObject = function(object) {
  if (object.hover == false) {
    object.hover = true;
    this._addToHover(object);
    if (object instanceof Node) {
      this.emit("hoverNode",{node:object.id});
    }
  }
  if (object instanceof Node) {
    this._hoverConnectedEdges(object);
  }
};


/**
 * handles the selection part of the touch, only for navigation controls elements;
 * Touch is triggered before tap, also before hold. Hold triggers after a while.
 * This is the most responsive solution
 *
 * @param {Object} pointer
 * @private
 */
exports._handleTouch = function(pointer) {
};


/**
 * handles the selection part of the tap;
 *
 * @param {Object} pointer
 * @private
 */
exports._handleTap = function(pointer) {
  var node = this._getNodeAt(pointer);
  if (node != null) {
    this._selectObject(node, false);
  }
  else {
    var edge = this._getEdgeAt(pointer);
    if (edge != null) {
      this._selectObject(edge, false);
    }
    else {
      this._unselectAll();
    }
  }
  var properties = this.getSelection();
  properties['pointer'] = {
    DOM: {x: pointer.x, y: pointer.y},
    canvas: {x: this._XconvertDOMtoCanvas(pointer.x), y: this._YconvertDOMtoCanvas(pointer.y)}
  }
  this.emit("click", properties);
  this._redraw();
};


/**
 * handles the selection part of the double tap and opens a cluster if needed
 *
 * @param {Object} pointer
 * @private
 */
exports._handleDoubleTap = function(pointer) {
  var node = this._getNodeAt(pointer);
  if (node != null && node !== undefined) {
    // we reset the areaCenter here so the opening of the node will occur
    this.areaCenter =  {"x" : this._XconvertDOMtoCanvas(pointer.x),
                        "y" : this._YconvertDOMtoCanvas(pointer.y)};
    this.openCluster(node);
  }
  var properties = this.getSelection();
  properties['pointer'] = {
    DOM: {x: pointer.x, y: pointer.y},
    canvas: {x: this._XconvertDOMtoCanvas(pointer.x), y: this._YconvertDOMtoCanvas(pointer.y)}
  }
  this.emit("doubleClick", properties);
};


/**
 * Handle the onHold selection part
 *
 * @param pointer
 * @private
 */
exports._handleOnHold = function(pointer) {
  var node = this._getNodeAt(pointer);
  if (node != null) {
    this._selectObject(node,true);
  }
  else {
    var edge = this._getEdgeAt(pointer);
    if (edge != null) {
      this._selectObject(edge,true);
    }
  }
  this._redraw();
};


/**
 * handle the onRelease event. These functions are here for the navigation controls module
 * and data manipulation module.
 *
  * @private
 */
exports._handleOnRelease = function(pointer) {
  this._manipulationReleaseOverload(pointer);
  this._navigationReleaseOverload(pointer);
};

exports._manipulationReleaseOverload = function (pointer) {};
exports._navigationReleaseOverload = function (pointer) {};

/**
 *
 * retrieve the currently selected objects
 * @return {{nodes: Array.<String>, edges: Array.<String>}} selection
 */
exports.getSelection = function() {
  var nodeIds = this.getSelectedNodes();
  var edgeIds = this.getSelectedEdges();
  return {nodes:nodeIds, edges:edgeIds};
};

/**
 *
 * retrieve the currently selected nodes
 * @return {String[]} selection    An array with the ids of the
 *                                            selected nodes.
 */
exports.getSelectedNodes = function() {
  var idArray = [];
  if (this.constants.selectable == true) {
    for (var nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        idArray.push(nodeId);
      }
    }
  }
  return idArray
};

/**
 *
 * retrieve the currently selected edges
 * @return {Array} selection    An array with the ids of the
 *                                            selected nodes.
 */
exports.getSelectedEdges = function() {
  var idArray = [];
  if (this.constants.selectable == true) {
    for (var edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        idArray.push(edgeId);
      }
    }
  }
  return idArray;
};


/**
 * select zero or more nodes DEPRICATED
 * @param {Number[] | String[]} selection     An array with the ids of the
 *                                            selected nodes.
 */
exports.setSelection = function() {
  console.log("setSelection is deprecated. Please use selectNodes instead.")
};


/**
 * select zero or more nodes with the option to highlight edges
 * @param {Number[] | String[]} selection     An array with the ids of the
 *                                            selected nodes.
 * @param {boolean} [highlightEdges]
 */
exports.selectNodes = function(selection, highlightEdges) {
  var i, iMax, id;

  if (!selection || (selection.length == undefined))
    throw 'Selection must be an array with ids';

  // first unselect any selected node
  this._unselectAll(true);

  for (i = 0, iMax = selection.length; i < iMax; i++) {
    id = selection[i];

    var node = this.nodes[id];
    if (!node) {
      throw new RangeError('Node with id "' + id + '" not found');
    }
    this._selectObject(node,true,true,highlightEdges,true);
  }
  this.redraw();
};


/**
 * select zero or more edges
 * @param {Number[] | String[]} selection     An array with the ids of the
 *                                            selected nodes.
 */
exports.selectEdges = function(selection) {
  var i, iMax, id;

  if (!selection || (selection.length == undefined))
    throw 'Selection must be an array with ids';

  // first unselect any selected node
  this._unselectAll(true);

  for (i = 0, iMax = selection.length; i < iMax; i++) {
    id = selection[i];

    var edge = this.edges[id];
    if (!edge) {
      throw new RangeError('Edge with id "' + id + '" not found');
    }
    this._selectObject(edge,true,true,false,true);
  }
  this.redraw();
};

/**
 * Validate the selection: remove ids of nodes which no longer exist
 * @private
 */
exports._updateSelection = function () {
  for(var nodeId in this.selectionObj.nodes) {
    if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
      if (!this.nodes.hasOwnProperty(nodeId)) {
        delete this.selectionObj.nodes[nodeId];
      }
    }
  }
  for(var edgeId in this.selectionObj.edges) {
    if(this.selectionObj.edges.hasOwnProperty(edgeId)) {
      if (!this.edges.hasOwnProperty(edgeId)) {
        delete this.selectionObj.edges[edgeId];
      }
    }
  }
};
