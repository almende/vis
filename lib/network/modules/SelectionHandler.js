import Node from './components/Node';
import Edge from './components/Edge';

let util = require('../../util');

class SelectionHandler {
  constructor(body, canvas) {
    this.body = body;
    this.canvas = canvas;
    this.selectionObj = {nodes: [], edges: []};
    this.hoverObj = {nodes:{},edges:{}};

    this.options = {};
    this.defaultOptions = {
      multiselect: false,
      selectable: true,
      selectConnectedEdges: true,
      hoverConnectedEdges: true
    };
    util.extend(this.options, this.defaultOptions);

    this.body.emitter.on("_dataChanged", () => {
      this.updateSelection()
    });
  }


  setOptions(options) {
    if (options !== undefined) {
      let fields = ['multiselect','hoverConnectedEdges','selectable','selectConnectedEdges'];
      util.selectiveDeepExtend(fields,this.options, options);
    }
  }


  /**
   * handles the selection part of the tap;
   *
   * @param {Object} pointer
   * @private
   */
  selectOnPoint(pointer) {
    let selected = false;
    if (this.options.selectable === true) {
      let obj = this.getNodeAt(pointer) || this.getEdgeAt(pointer);

      // unselect after getting the objects in order to restore width and height.
      this.unselectAll();

      if (obj !== undefined) {
        selected = this.selectObject(obj);
      }
      this.body.emitter.emit("_requestRedraw");
    }
    return selected;
  }

  selectAdditionalOnPoint(pointer) {
    let selectionChanged = false;
    if (this.options.selectable === true) {
      let obj = this.getNodeAt(pointer) || this.getEdgeAt(pointer);

      if (obj !== undefined) {
        selectionChanged = true;
        if (obj.isSelected() === true) {
          this.deselectObject(obj);
        }
        else {
          this.selectObject(obj);
        }

        this.body.emitter.emit("_requestRedraw");
      }
    }
    return selectionChanged;
  }

  _generateClickEvent(eventType, event, pointer, oldSelection, emptySelection = false) {
    let properties;
    if (emptySelection === true) {
      properties = {nodes:[], edges:[]};
    }
    else {
      properties = this.getSelection();
    }
    properties['pointer'] = {
      DOM: {x: pointer.x, y: pointer.y},
      canvas: this.canvas.DOMtoCanvas(pointer)
    };
    properties['event'] = event;

    if (oldSelection !== undefined) {
      properties['previousSelection'] = oldSelection;
    }
    this.body.emitter.emit(eventType, properties);
  }

  selectObject(obj, highlightEdges = this.options.selectConnectedEdges) {
    if (obj !== undefined) {
      if (obj instanceof Node) {
        if (highlightEdges === true) {
          this._selectConnectedEdges(obj);
        }
      }
      obj.select();
      this._addToSelection(obj);
      return true;
    }
    return false;
  }

  deselectObject(obj) {
    if (obj.isSelected() === true) {
      obj.selected = false;
      this._removeFromSelection(obj);
    }
  }



  /**
   * retrieve all nodes overlapping with given object
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getAllNodesOverlappingWith(object) {
    let overlappingNodes = [];
    let nodes = this.body.nodes;
    for (let i = 0; i < this.body.nodeIndices.length; i++) {
      let nodeId = this.body.nodeIndices[i];
      if (nodes[nodeId].isOverlappingWith(object)) {
        overlappingNodes.push(nodeId);
      }
    }
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
    let canvasPos = this.canvas.DOMtoCanvas(pointer);
    return {
      left:   canvasPos.x - 1,
      top:    canvasPos.y + 1,
      right:  canvasPos.x + 1,
      bottom: canvasPos.y - 1
    };
  }


  /**
   * Get the top node at the a specific point (like a click)
   *
   * @param {{x: Number, y: Number}} pointer
   * @return {Node | undefined} node
   */
  getNodeAt(pointer, returnNode = true) {
    // we first check if this is an navigation controls element
    let positionObject = this._pointerToPositionObject(pointer);
    let overlappingNodes = this._getAllNodesOverlappingWith(positionObject);
    // if there are overlapping nodes, select the last one, this is the
    // one which is drawn on top of the others
    if (overlappingNodes.length > 0) {
      if (returnNode === true) {
        return this.body.nodes[overlappingNodes[overlappingNodes.length - 1]];
      }
      else {
        return overlappingNodes[overlappingNodes.length - 1];
      }
    }
    else {
      return undefined;
    }
  }


  /**
   * retrieve all edges overlapping with given object, selector is around center
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getEdgesOverlappingWith(object, overlappingEdges) {
    let edges = this.body.edges;
    for (let i = 0; i < this.body.edgeIndices.length; i++) {
      let edgeId = this.body.edgeIndices[i];
      if (edges[edgeId].isOverlappingWith(object)) {
        overlappingEdges.push(edgeId);
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
    let overlappingEdges = [];
    this._getEdgesOverlappingWith(object,overlappingEdges);
    return overlappingEdges;
  }


  /**
   * Place holder. To implement change the getNodeAt to a _getObjectAt. Have the _getObjectAt call
   * getNodeAt and _getEdgesAt, then priortize the selection to user preferences.
   *
   * @param pointer
   * @returns {undefined}
   */
  getEdgeAt(pointer, returnEdge = true) {
    // Iterate over edges, pick closest within 10
    var canvasPos = this.canvas.DOMtoCanvas(pointer);
    var mindist = 10;
    var overlappingEdge = null;
    var edges = this.body.edges;
    for (var i = 0; i < this.body.edgeIndices.length; i++) {
      var edgeId = this.body.edgeIndices[i];
      var edge = edges[edgeId];
      if (edge.connected) {
        var xFrom = edge.from.x;
        var yFrom = edge.from.y;
        var xTo = edge.to.x;
        var yTo = edge.to.y;
        var dist = edge.edgeType.getDistanceToEdge(xFrom, yFrom, xTo, yTo, canvasPos.x, canvasPos.y);
        if(dist < mindist){
          overlappingEdge = edgeId;
          mindist = dist;
        }
      }
    }
    if (overlappingEdge) {
      if (returnEdge === true) {
        return this.body.edges[overlappingEdge];
      }
      else {
        return overlappingEdge;
      }
    }
    else {
      return undefined;
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
      this._unselectConnectedEdges(obj);
    }
    else {
      delete this.selectionObj.edges[obj.id];
    }
  }

  /**
   * Unselect all. The selectionObj is useful for this.
   */
  unselectAll() {
    for(let nodeId in this.selectionObj.nodes) {
      if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        this.selectionObj.nodes[nodeId].unselect();
      }
    }
    for(let edgeId in this.selectionObj.edges) {
      if(this.selectionObj.edges.hasOwnProperty(edgeId)) {
        this.selectionObj.edges[edgeId].unselect();
      }
    }

    this.selectionObj = {nodes:{},edges:{}};
  }


  /**
   * return the number of selected nodes
   *
   * @returns {number}
   * @private
   */
  _getSelectedNodeCount() {
    let count = 0;
    for (let nodeId in this.selectionObj.nodes) {
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
    for (let nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        return this.selectionObj.nodes[nodeId];
      }
    }
    return undefined;
  }

  /**
   * return the selected edge
   *
   * @returns {number}
   * @private
   */
  _getSelectedEdge() {
    for (let edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        return this.selectionObj.edges[edgeId];
      }
    }
    return undefined;
  }


  /**
   * return the number of selected edges
   *
   * @returns {number}
   * @private
   */
  _getSelectedEdgeCount() {
    let count = 0;
    for (let edgeId in this.selectionObj.edges) {
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
    let count = 0;
    for(let nodeId in this.selectionObj.nodes) {
      if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        count += 1;
      }
    }
    for(let edgeId in this.selectionObj.edges) {
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
    for(let nodeId in this.selectionObj.nodes) {
      if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        return false;
      }
    }
    for(let edgeId in this.selectionObj.edges) {
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
    for(let nodeId in this.selectionObj.nodes) {
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
    for (let i = 0; i < node.edges.length; i++) {
      let edge = node.edges[i];
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
    for (let i = 0; i < node.edges.length; i++) {
      let edge = node.edges[i];
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
    for (let i = 0; i < node.edges.length; i++) {
      let edge = node.edges[i];
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
  blurObject(object) {
    if (object.hover === true) {
      object.hover = false;
      if (object instanceof Node) {
        this.body.emitter.emit("blurNode", {node: object.id});
      }
      else {
        this.body.emitter.emit("blurEdge", {edge: object.id});
      }
    }
  }

  /**
   * This is called when someone clicks on a node. either select or deselect it.
   * If there is an existing selection and we don't want to append to it, clear the existing selection
   *
   * @param {Node || Edge} object
   * @private
   */
  hoverObject(object) {
    let hoverChanged = false;
    // remove all node hover highlights
    for (let nodeId in this.hoverObj.nodes) {
      if (this.hoverObj.nodes.hasOwnProperty(nodeId)) {
        if (object === undefined || (object instanceof Node && object.id != nodeId) || object instanceof Edge) {
          this.blurObject(this.hoverObj.nodes[nodeId]);
          delete this.hoverObj.nodes[nodeId];
          hoverChanged = true;
        }
      }
    }

    // removing all edge hover highlights
    for (let edgeId in this.hoverObj.edges) {
      if (this.hoverObj.edges.hasOwnProperty(edgeId)) {
        // if the hover has been changed here it means that the node has been hovered over or off
        // we then do not use the blurObject method here.
        if (hoverChanged === true) {
          this.hoverObj.edges[edgeId].hover = false;
          delete this.hoverObj.edges[edgeId];
        }
        // if the blur remains the same and the object is undefined (mouse off) or another
        // edge has been hovered, we blur the edge
        else if (object === undefined || object instanceof Edge) {
          this.blurObject(this.hoverObj.edges[edgeId]);
          delete this.hoverObj.edges[edgeId];
          hoverChanged = true;
        }
      }
    }

    if (object !== undefined) {
      if (object.hover === false) {
        object.hover = true;
        this._addToHover(object);
        hoverChanged = true;
        if (object instanceof Node) {
          this.body.emitter.emit("hoverNode", {node: object.id});
        }
        else {
          this.body.emitter.emit("hoverEdge", {edge: object.id});
        }
      }
      if (object instanceof Node && this.options.hoverConnectedEdges === true) {
        this._hoverConnectedEdges(object);
      }
    }

    if (hoverChanged === true) {
      this.body.emitter.emit('_requestRedraw');
    }
  }




  /**
   *
   * retrieve the currently selected objects
   * @return {{nodes: Array.<String>, edges: Array.<String>}} selection
   */
  getSelection() {
    let nodeIds = this.getSelectedNodes();
    let edgeIds = this.getSelectedEdges();
    return {nodes:nodeIds, edges:edgeIds};
  }

  /**
   *
   * retrieve the currently selected nodes
   * @return {String[]} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectedNodes() {
    let idArray = [];
    if (this.options.selectable === true) {
      for (let nodeId in this.selectionObj.nodes) {
        if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
          idArray.push(this.selectionObj.nodes[nodeId].id);
        }
      }
    }
    return idArray;
  }

  /**
   *
   * retrieve the currently selected edges
   * @return {Array} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectedEdges() {
    let idArray = [];
    if (this.options.selectable === true) {
      for (let edgeId in this.selectionObj.edges) {
        if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
          idArray.push(this.selectionObj.edges[edgeId].id);
        }
      }
    }
    return idArray;
  }

  /**
   * Updates the current selection
   * @param {{nodes: Array.<String>, edges: Array.<String>}} Selection
   * @param {Object} options                                 Options
   */
  setSelection(selection, options = {}) {
    let i, id;

    if (!selection || (!selection.nodes && !selection.edges))
      throw 'Selection must be an object with nodes and/or edges properties';
    // first unselect any selected node, if option is true or undefined
    if (options.unselectAll || options.unselectAll === undefined) {
      this.unselectAll();
    }
    if (selection.nodes) {
      for (i = 0; i < selection.nodes.length; i++) {
        id = selection.nodes[i];

        let node = this.body.nodes[id];
        if (!node) {
          throw new RangeError('Node with id "' + id + '" not found');
        }
        // don't select edges with it
        this.selectObject(node, options.highlightEdges);
      }
    }

    if (selection.edges) {
      for (i = 0; i < selection.edges.length; i++) {
        id = selection.edges[i];

        let edge = this.body.edges[id];
        if (!edge) {
          throw new RangeError('Edge with id "' + id + '" not found');
        }
        this.selectObject(edge);
      }
    }
    this.body.emitter.emit('_requestRedraw');
  }


  /**
   * select zero or more nodes with the option to highlight edges
   * @param {Number[] | String[]} selection     An array with the ids of the
   *                                            selected nodes.
   * @param {boolean} [highlightEdges]
   */
  selectNodes(selection, highlightEdges = true) {
    if (!selection || (selection.length === undefined))
      throw 'Selection must be an array with ids';

    this.setSelection({nodes: selection}, {highlightEdges: highlightEdges});
  }


  /**
   * select zero or more edges
   * @param {Number[] | String[]} selection     An array with the ids of the
   *                                            selected nodes.
   */
  selectEdges(selection) {
    if (!selection || (selection.length === undefined))
      throw 'Selection must be an array with ids';

    this.setSelection({edges: selection});
  }

  /**
   * Validate the selection: remove ids of nodes which no longer exist
   * @private
   */
  updateSelection() {
    for (let nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        if (!this.body.nodes.hasOwnProperty(nodeId)) {
          delete this.selectionObj.nodes[nodeId];
        }
      }
    }
    for (let edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        if (!this.body.edges.hasOwnProperty(edgeId)) {
          delete this.selectionObj.edges[edgeId];
        }
      }
    }
  }
}

export default SelectionHandler;