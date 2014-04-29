
var SelectionMixin = {

  /**
   * This function can be called from the _doInAllSectors function
   *
   * @param object
   * @param overlappingNodes
   * @private
   */
  _getNodesOverlappingWith : function(object, overlappingNodes) {
    var nodes = this.nodes;
    for (var nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        if (nodes[nodeId].isOverlappingWith(object)) {
          overlappingNodes.push(nodeId);
        }
      }
    }
  },

  /**
   * retrieve all nodes overlapping with given object
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getAllNodesOverlappingWith : function (object) {
    var overlappingNodes = [];
    this._doInAllActiveSectors("_getNodesOverlappingWith",object,overlappingNodes);
    return overlappingNodes;
  },


  /**
   * Return a position object in canvasspace from a single point in screenspace
   *
   * @param pointer
   * @returns {{left: number, top: number, right: number, bottom: number}}
   * @private
   */
  _pointerToPositionObject : function(pointer) {
    var x = this._canvasToX(pointer.x);
    var y = this._canvasToY(pointer.y);

    return {left:   x,
            top:    y,
            right:  x,
            bottom: y};
  },


  /**
   * Get the top node at the a specific point (like a click)
   *
   * @param {{x: Number, y: Number}} pointer
   * @return {Node | null} node
   * @private
   */
  _getNodeAt : function (pointer) {
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
  },


  /**
   * retrieve all edges overlapping with given object, selector is around center
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getEdgesOverlappingWith : function (object, overlappingEdges) {
    var edges = this.edges;
    for (var edgeId in edges) {
      if (edges.hasOwnProperty(edgeId)) {
        if (edges[edgeId].isOverlappingWith(object)) {
          overlappingEdges.push(edgeId);
        }
      }
    }
  },


  /**
   * retrieve all nodes overlapping with given object
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getAllEdgesOverlappingWith : function (object) {
    var overlappingEdges = [];
    this._doInAllActiveSectors("_getEdgesOverlappingWith",object,overlappingEdges);
    return overlappingEdges;
  },

  /**
   * Place holder. To implement change the _getNodeAt to a _getObjectAt. Have the _getObjectAt call
   * _getNodeAt and _getEdgesAt, then priortize the selection to user preferences.
   *
   * @param pointer
   * @returns {null}
   * @private
   */
  _getEdgeAt : function(pointer) {
    var positionObject = this._pointerToPositionObject(pointer);
    var overlappingEdges = this._getAllEdgesOverlappingWith(positionObject);

    if (overlappingEdges.length > 0) {
      return this.edges[overlappingEdges[overlappingEdges.length - 1]];
    }
    else {
      return null;
    }
  },


  /**
   * Add object to the selection array.
   *
   * @param obj
   * @private
   */
  _addToSelection : function(obj) {
    if (obj instanceof Node) {
      this.selectionObj.nodes[obj.id] = obj;
    }
    else {
      this.selectionObj.edges[obj.id] = obj;
    }

  },


  /**
   * Remove a single option from selection.
   *
   * @param {Object} obj
   * @private
   */
  _removeFromSelection : function(obj) {
    if (obj instanceof Node) {
      delete this.selectionObj.nodes[obj.id];
    }
    else {
      delete this.selectionObj.edges[obj.id];
    }
  },


  /**
   * Unselect all. The selectionObj is useful for this.
   *
   * @param {Boolean} [doNotTrigger] | ignore trigger
   * @private
   */
  _unselectAll : function(doNotTrigger) {
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
  },

  /**
   * Unselect all clusters. The selectionObj is useful for this.
   *
   * @param {Boolean} [doNotTrigger] | ignore trigger
   * @private
   */
  _unselectClusters : function(doNotTrigger) {
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
  },


  /**
   * return the number of selected nodes
   *
   * @returns {number}
   * @private
   */
  _getSelectedNodeCount : function() {
    var count = 0;
    for (var nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        count += 1;
      }
    }
    return count;
  },

  /**
   * return the number of selected nodes
   *
   * @returns {number}
   * @private
   */
  _getSelectedNode : function() {
    for (var nodeId in this.selectionObj.nodes) {
      if (this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        return this.selectionObj.nodes[nodeId];
      }
    }
    return null;
  },


  /**
   * return the number of selected edges
   *
   * @returns {number}
   * @private
   */
  _getSelectedEdgeCount : function() {
    var count = 0;
    for (var edgeId in this.selectionObj.edges) {
      if (this.selectionObj.edges.hasOwnProperty(edgeId)) {
        count += 1;
      }
    }
    return count;
  },


  /**
   * return the number of selected objects.
   *
   * @returns {number}
   * @private
   */
  _getSelectedObjectCount : function() {
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
  },

  /**
   * Check if anything is selected
   *
   * @returns {boolean}
   * @private
   */
  _selectionIsEmpty : function() {
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
  },


  /**
   * check if one of the selected nodes is a cluster.
   *
   * @returns {boolean}
   * @private
   */
  _clusterInSelection : function() {
    for(var nodeId in this.selectionObj.nodes) {
      if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        if (this.selectionObj.nodes[nodeId].clusterSize > 1) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * select the edges connected to the node that is being selected
   *
   * @param {Node} node
   * @private
   */
  _selectConnectedEdges : function(node) {
    for (var i = 0; i < node.dynamicEdges.length; i++) {
      var edge = node.dynamicEdges[i];
      edge.select();
      this._addToSelection(edge);
    }
  },


  /**
   * unselect the edges connected to the node that is being selected
   *
   * @param {Node} node
   * @private
   */
  _unselectConnectedEdges : function(node) {
    for (var i = 0; i < node.dynamicEdges.length; i++) {
      var edge = node.dynamicEdges[i];
      edge.unselect();
      this._removeFromSelection(edge);
    }
  },



  /**
   * This is called when someone clicks on a node. either select or deselect it.
   * If there is an existing selection and we don't want to append to it, clear the existing selection
   *
   * @param {Node || Edge} object
   * @param {Boolean} append
   * @param {Boolean} [doNotTrigger] | ignore trigger
   * @private
   */
  _selectObject : function(object, append, doNotTrigger) {
    if (doNotTrigger === undefined) {
      doNotTrigger = false;
    }

    if (this._selectionIsEmpty() == false && append == false && this.forceAppendSelection == false) {
      this._unselectAll(true);
    }

    if (object.selected == false) {
      object.select();
      this._addToSelection(object);
      if (object instanceof Node && this.blockConnectingEdgeSelection == false) {
        this._selectConnectedEdges(object);
      }
    }
    else {
      object.unselect();
      this._removeFromSelection(object);
    }
    if (doNotTrigger == false) {
      this.emit('select', this.getSelection());
    }
  },


  /**
   * handles the selection part of the touch, only for navigation controls elements;
   * Touch is triggered before tap, also before hold. Hold triggers after a while.
   * This is the most responsive solution
   *
   * @param {Object} pointer
   * @private
   */
  _handleTouch : function(pointer) {

  },


  /**
   * handles the selection part of the tap;
   *
   * @param {Object} pointer
   * @private
   */
  _handleTap : function(pointer) {
    var node = this._getNodeAt(pointer);
    if (node != null) {
      this._selectObject(node,false);
    }
    else {
      var edge = this._getEdgeAt(pointer);
      if (edge != null) {
        this._selectObject(edge,false);
      }
      else {
        this._unselectAll();
      }
    }
    this.emit("click", this.getSelection());
    this._redraw();
  },


  /**
   * handles the selection part of the double tap and opens a cluster if needed
   *
   * @param {Object} pointer
   * @private
   */
  _handleDoubleTap : function(pointer) {
    var node = this._getNodeAt(pointer);
    if (node != null && node !== undefined) {
      // we reset the areaCenter here so the opening of the node will occur
      this.areaCenter =  {"x" : this._canvasToX(pointer.x),
                          "y" : this._canvasToY(pointer.y)};
      this.openCluster(node);
    }
    this.emit("doubleClick", this.getSelection());
  },


  /**
   * Handle the onHold selection part
   *
   * @param pointer
   * @private
   */
  _handleOnHold : function(pointer) {
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
  },


  /**
   * handle the onRelease event. These functions are here for the navigation controls module.
   *
    * @private
   */
  _handleOnRelease : function(pointer) {

  },



  /**
   *
   * retrieve the currently selected objects
   * @return {Number[] | String[]} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelection : function() {
    var nodeIds = this.getSelectedNodes();
    var edgeIds = this.getSelectedEdges();
    return {nodes:nodeIds, edges:edgeIds};
  },

  /**
   *
   * retrieve the currently selected nodes
   * @return {String} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectedNodes : function() {
    var idArray = [];
    for(var nodeId in this.selectionObj.nodes) {
      if(this.selectionObj.nodes.hasOwnProperty(nodeId)) {
        idArray.push(nodeId);
      }
    }
    return idArray
  },

  /**
   *
   * retrieve the currently selected edges
   * @return {Array} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectedEdges : function() {
    var idArray = [];
    for(var edgeId in this.selectionObj.edges) {
      if(this.selectionObj.edges.hasOwnProperty(edgeId)) {
        idArray.push(edgeId);
      }
    }
    return idArray;
  },


  /**
   * select zero or more nodes
   * @param {Number[] | String[]} selection     An array with the ids of the
   *                                            selected nodes.
   */
  setSelection : function(selection) {
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
      this._selectObject(node,true,true);
    }
    this.redraw();
  },


  /**
   * Validate the selection: remove ids of nodes which no longer exist
   * @private
   */
  _updateSelection : function () {
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
  }
};


