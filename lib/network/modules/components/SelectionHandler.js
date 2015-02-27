/**
 * Created by Alex on 2/27/2015.
 */

var Node = require("../../Node");

class SelectionHandler {
  constructor(body) {
    this.body = body;
    this.selectionObj = {nodes:[], edges:[]};

    this.options = {
      select: true,
      selectConnectedEdges: true
    }
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }


  /**
   * handles the selection part of the tap;
   *
   * @param {Object} pointer
   * @private
   */
  selectOnPoint(pointer) {
    if (this.options.select === true) {
      if (this._getSelectedObjectCount() > 0) {this._unselectAll();}

      this.selectObject(pointer);
      this._generateClickEvent(pointer);

      this.body.emitter.emit("_requestRedraw");
    }
  }

  _generateClickEvent(pointer) {
    var properties = this.getSelection();
    properties['pointer'] = {
      DOM: {x: pointer.x, y: pointer.y},
      canvas: this.canvas.DOMtoCanvas(pointer)
    }
    this.body.emitter.emit("click", properties);
  }

  selectObject(pointer) {
    var obj = this._getNodeAt(pointer);
    if (obj != null) {
      if (this.options.selectConnectedEdges === true) {
        this._selectConnectedEdges(obj);
      }
    }
    else {
      obj = this._getEdgeAt(pointer);
    }

    if (obj !== null) {
      obj.select();
      this._addToSelection(obj);
      this.body.emitter.emit('selected', this.getSelection())
    }
    return obj;
  }


  /**
   *
   * @param object
   * @param overlappingNodes
   * @private
   */
  _getNodesOverlappingWith(object, overlappingNodes) {
    var nodes = this.body.nodes;
    for (var nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        if (nodes[nodeId].isOverlappingWith(object)) {
          overlappingNodes.push(nodeId);
        }
      }
    }
  }

  /**
   * retrieve all nodes overlapping with given object
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getAllNodesOverlappingWith(object) {
    var overlappingNodes = [];
    this._getNodesOverlappingWith(object,overlappingNodes);
    return overlappingNodes;
  }


  /**
   * Return a position object in canvasspace from a single point in screenspace
   *
   * @param pointer
   * @returns {{left: number, top: number, right: number, bottom: number}}
   * @private
   */
  _pointerToPositionObject(pointer) {
    var canvasPos = this.canvas.DOMtoCanvas(pointer);
    return {
      left:   canvasPos.x,
      top:    canvasPos.y,
      right:  canvasPos.x,
      bottom: canvasPos.y
    };
  }


  /**
   * Get the top node at the a specific point (like a click)
   *
   * @param {{x: Number, y: Number}} pointer
   * @return {Node | null} node
   * @private
   */
  _getNodeAt(pointer) {
    // we first check if this is an navigation controls element
    var positionObject = this._pointerToPositionObject(pointer);
    var overlappingNodes = this._getAllNodesOverlappingWith(positionObject);

    // if there are overlapping nodes, select the last one, this is the
    // one which is drawn on top of the others
    if (overlappingNodes.length > 0) {
      return this.body.nodes[overlappingNodes[overlappingNodes.length - 1]];
    }
    else {
      return null;
    }
  }


  /**
   * retrieve all edges overlapping with given object, selector is around center
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getEdgesOverlappingWith(object, overlappingEdges) {
    var edges = this.body.edges;
    for (var edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        if (edges[edgeId].isOverlappingWith(object)) {
          overlappingEdges.push(edgeId);
        }
      }
    }
  }


  /**
   * retrieve all nodes overlapping with given object
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getAllEdgesOverlappingWith(object) {
    var overlappingEdges = [];
    this._getEdgesOverlappingWith(object,overlappingEdges);
    return overlappingEdges;
  }


  /**
   * Place holder. To implement change the _getNodeAt to a _getObjectAt. Have the _getObjectAt call
   * _getNodeAt and _getEdgesAt, then priortize the selection to user preferences.
   *
   * @param pointer
   * @returns {null}
   * @private
   */
  _getEdgeAt(pointer) {
    var positionObject = this._pointerToPositionObject(pointer);
    var overlappingEdges = this._getAllEdgesOverlappingWith(positionObject);

    if (overlappingEdges.length > 0) {
      return this.body.edges[overlappingEdges[overlappingEdges.length - 1]];
    }
    else {
      return null;
    }
  }


  /**
   * Add object to the selection array.
   *
   * @param obj
   * @private
   */
  _addToSelection(obj) {
    if (obj instanceof Node) {
      this.selectionObj.nodes[obj.id] = obj;
    }
    else {
      this.selectionObj.edges[obj.id] = obj;
    }
  }

  /**
   * Add object to the selection array.
   *
   * @param obj
   * @private
   */
  _addToHover(obj) {
    if (obj instanceof Node) {
      this.hoverObj.nodes[obj.id] = obj;
    }
    else {
      this.hoverObj.edges[obj.id] = obj;
    }
  }


  /**
   * Remove a single option from selection.
   *
   * @param {Object} obj
   * @private
   */
  _removeFromSelection(obj) {
    if (obj instanceof Node) {
      delete this.selectionObj.nodes[obj.id];
    }
    else {
      delete this.selectionObj.edges[obj.id];
    }
  }

  /**
   * Unselect all. The selectionObj is useful for this.
   *
   * @param {Boolean} [doNotTrigger] | ignore trigger
   * @private
   */
  _unselectAll(doNotTrigger = false) {
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
      this.body.emitter.emit('select', this.getSelection());
    }
  }


  /**
   * return the number of selected nodes
   *
   * @returns {number}
   * @private
   */
  _getSelectedNodeCount() {
    var count = 0;
    for (var nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * return the selected node
   *
   * @returns {number}
   * @private
   */
  _getSelectedNode() {
    for (var nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        return this.selectionObj.nodes[nodeId];
      }
    }
    return null;
  }

  /**
   * return the selected edge
   *
   * @returns {number}
   * @private
   */
  _getSelectedEdge() {
    for (var edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        return this.selectionObj.edges[edgeId];
      }
    }
    return null;
  }


  /**
   * return the number of selected edges
   *
   * @returns {number}
   * @private
   */
  _getSelectedEdgeCount() {
    var count = 0;
    for (var edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        count += 1;
      }
    }
    return count;
  }


  /**
   * return the number of selected objects.
   *
   * @returns {number}
   * @private
   */
  _getSelectedObjectCount() {
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
  }

  /**
   * Check if anything is selected
   *
   * @returns {boolean}
   * @private
   */
  _selectionIsEmpty() {
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
  }


  /**
   * check if one of the selected nodes is a cluster.
   *
   * @returns {boolean}
   * @private
   */
  _clusterInSelection() {
    for(var nodeId in this.selectionObj.nodes) {
      if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        if (this.selectionObj.nodes[nodeId].clusterSize > 1) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * select the edges connected to the node that is being selected
   *
   * @param {Node} node
   * @private
   */
  _selectConnectedEdges(node) {
    for (var i = 0; i < node.edges.length; i++) {
      var edge = node.edges[i];
      edge.select();
      this._addToSelection(edge);
    }
  }

  /**
   * select the edges connected to the node that is being selected
   *
   * @param {Node} node
   * @private
   */
  _hoverConnectedEdges(node) {
    for (var i = 0; i < node.edges.length; i++) {
      var edge = node.edges[i];
      edge.hover = true;
      this._addToHover(edge);
    }
  }


  /**
   * unselect the edges connected to the node that is being selected
   *
   * @param {Node} node
   * @private
   */
  _unselectConnectedEdges(node) {
    for (var i = 0; i < node.edges.length; i++) {
      var edge = node.edges[i];
      edge.unselect();
      this._removeFromSelection(edge);
    }
  }






  /**
   * This is called when someone clicks on a node. either select or deselect it.
   * If there is an existing selection and we don't want to append to it, clear the existing selection
   *
   * @param {Node || Edge} object
   * @private
   */
  _blurObject(object) {
    if (object.hover == true) {
      object.hover = false;
      this.body.emitter.emit("blurNode",{node:object.id});
    }
  }

  /**
   * This is called when someone clicks on a node. either select or deselect it.
   * If there is an existing selection and we don't want to append to it, clear the existing selection
   *
   * @param {Node || Edge} object
   * @private
   */
  _hoverObject(object) {
    if (object.hover == false) {
      object.hover = true;
      this._addToHover(object);
      if (object instanceof Node) {
        this.body.emitter.emit("hoverNode",{node:object.id});
      }
    }
    if (object instanceof Node) {
      this._hoverConnectedEdges(object);
    }
  }




  /**
   * handles the selection part of the double tap and opens a cluster if needed
   *
   * @param {Object} pointer
   * @private
   */
  _handleDoubleTap(pointer) {
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
    this.body.emitter.emit("doubleClick", properties);
  }


  /**
   * Handle the onHold selection part
   *
   * @param pointer
   * @private
   */
  _handleOnHold(pointer) {
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
    this._requestRedraw();
  }


  /**
   *
   * retrieve the currently selected objects
   * @return {{nodes: Array.<String>, edges: Array.<String>}} selection
   */
  getSelection() {
    var nodeIds = this.getSelectedNodes();
    var edgeIds = this.getSelectedEdges();
    return {nodes:nodeIds, edges:edgeIds};
  }

  /**
   *
   * retrieve the currently selected nodes
   * @return {String[]} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectedNodes() {
    var idArray = [];
    if (this.options.select == true) {
      for (var nodeId in this.selectionObj.nodes) {
        if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
          idArray.push(nodeId);
        }
      }
    }
    return idArray
  }

  /**
   *
   * retrieve the currently selected edges
   * @return {Array} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectedEdges() {
    var idArray = [];
    if (this.options.select == true) {
      for (var edgeId in this.selectionObj.edges) {
        if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
          idArray.push(edgeId);
        }
      }
    }
    return idArray;
  }


  /**
   * select zero or more nodes with the option to highlight edges
   * @param {Number[] | String[]} selection     An array with the ids of the
   *                                            selected nodes.
   * @param {boolean} [highlightEdges]
   */
  selectNodes(selection, highlightEdges) {
    var i, iMax, id;
  
    if (!selection || (selection.length == undefined))
      throw 'Selection must be an array with ids';
  
    // first unselect any selected node
    this._unselectAll(true);
  
    for (i = 0, iMax = selection.length; i < iMax; i++) {
      id = selection[i];
  
      var node = this.body.nodes[id];
      if (!node) {
        throw new RangeError('Node with id "' + id + '" not found');
      }
      this._selectObject(node,true,true,highlightEdges,true);
    }
    this.redraw();
  }


  /**
   * select zero or more edges
   * @param {Number[] | String[]} selection     An array with the ids of the
   *                                            selected nodes.
   */
  selectEdges(selection) {
    var i, iMax, id;
  
    if (!selection || (selection.length == undefined))
      throw 'Selection must be an array with ids';
  
    // first unselect any selected node
    this._unselectAll(true);
  
    for (i = 0, iMax = selection.length; i < iMax; i++) {
      id = selection[i];
  
      var edge = this.body.edges[id];
      if (!edge) {
        throw new RangeError('Edge with id "' + id + '" not found');
      }
      this._selectObject(edge,true,true,false,true);
    }
    this.redraw();
  }

  /**
   * Validate the selection: remove ids of nodes which no longer exist
   * @private
   */
  _updateSelection() {
    for (var nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        if (!this.body.nodes.hasOwnProperty(nodeId)) {
          delete this.selectionObj.nodes[nodeId];
        }
      }
    }
    for (var edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        if (!this.body.edges.hasOwnProperty(edgeId)) {
          delete this.selectionObj.edges[edgeId];
        }
      }
    }
  }
}

export {SelectionHandler};