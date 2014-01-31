
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
   * retrieve all nodes in the navigationUI overlapping with given object
   * @param {Object} object  An object with parameters left, top, right, bottom
   * @return {Number[]}   An array with id's of the overlapping nodes
   * @private
   */
  _getAllUINodesOverlappingWith : function (object) {
    var overlappingNodes = [];
    this._doInUISector("_getNodesOverlappingWith",object,overlappingNodes);
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
   * Return a position object in canvasspace from a single point in screenspace
   *
   * @param pointer
   * @returns {{left: number, top: number, right: number, bottom: number}}
   * @private
   */
  _pointerToScreenPositionObject : function(pointer) {
    var x = pointer.x;
    var y = pointer.y;

    return {left:   x,
      top:    y,
      right:  x,
      bottom: y};
  },


  /**
   * Get the top navigationUI node at the a specific point (like a click)
   *
   * @param {{x: Number, y: Number}} pointer
   * @return {Node | null} node
   * @private
   */
  _getUINodeAt : function (pointer) {
    var screenPositionObject = this._pointerToScreenPositionObject(pointer);
    var overlappingNodes = this._getAllUINodesOverlappingWith(screenPositionObject);
    if (overlappingNodes.length > 0) {
      return this.sectors["navigationUI"]["nodes"][overlappingNodes[overlappingNodes.length - 1]];
    }
    else {
      return null;
    }
  },


  /**
   * Get the top node at the a specific point (like a click)
   *
   * @param {{x: Number, y: Number}} pointer
   * @return {Node | null} node
   * @private
   */
  _getNodeAt : function (pointer) {
    // we first check if this is an navigationUI element
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
    this.selectionObj[obj.id] = obj;
  },


  /**
   * Remove a single option from selection.
   *
   * @param obj
   * @private
   */
  _removeFromSelection : function(obj) {
    delete this.selectionObj[obj.id];
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

    for (var objectId in this.selectionObj) {
      if (this.selectionObj.hasOwnProperty(objectId)) {
        this.selectionObj[objectId].unselect();
      }
    }
    this.selectionObj = {};

    if (doNotTrigger == false) {
      this._trigger('select');
    }
  },


  /**
   * Check if anything is selected
   *
   * @returns {boolean}
   * @private
   */
  _selectionIsEmpty : function() {
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        return false;
      }
    }
    return true;
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

    if (this._selectionIsEmpty() == false && append == false) {
      this._unselectAll(true);
    }

    if (object.selected == false) {
      object.select();
      this._addToSelection(object);
      if (object instanceof Node) {
        this._selectConnectedEdges(object);
      }
    }
    else {
      object.unselect();
      this._removeFromSelection(object);
    }
    if (doNotTrigger == false) {
      this._trigger('select');
    }
  },


  /**
   * handles the selection part of the touch, only for navigationUI elements;
   * Touch is triggered before tap, also before hold. Hold triggers after a while.
   * This is the most responsive solution
   *
   * @param {Object} pointer
   * @private
   */
  _handleTouch : function(pointer) {
    if (this.constants.navigationUI.enabled == true) {
      var node = this._getUINodeAt(pointer);
      if (node != null) {
        if (this[node.triggerFunction] !== undefined) {
          this[node.triggerFunction]();
        }
      }
    }
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
   * handle the onRelease event. These functions are here for the navigationUI module.
   *
    * @private
   */
  _handleOnRelease : function() {
    this.xIncrement = 0;
    this.yIncrement = 0;
    this.zoomIncrement = 0;
    this._unHighlightAll();
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
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        if (this.selectionObj[objectId] instanceof Node) {
          idArray.push(objectId);
        }
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
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        if (this.selectionObj[objectId] instanceof Edge) {
          idArray.push(objectId);
        }
      }
    }
    return idArray
  },

  /**
   *
   * retrieve the currently selected nodes as objects
   * @return {Objects} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelectionObjects : function() {
    return this.selectionObj;
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
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        if (this.selectionObj[objectId] instanceof Node) {
          if (!this.nodes.hasOwnProperty(objectId)) {
            delete this.selectionObj[objectId];
          }
        }
        else { // assuming only edges and nodes are selected
          if (!this.edges.hasOwnProperty(objectId)) {
            delete this.selectionObj[objectId];
          }
        }
      }
    }
  }



};



