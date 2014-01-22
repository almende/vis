
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
    this._doInAllSectors("_getNodesOverlappingWith",object,overlappingNodes);
    return overlappingNodes;
  },


  /**
   * retrieve all nodes in the UI overlapping with given object
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
   * Get the top UI node at the a specific point (like a click)
   *
   * @param {{x: Number, y: Number}} pointer
   * @return {Node | null} node
   * @private
   */
  _getUINodeAt : function (pointer) {
    var screenPositionObject = this._pointerToScreenPositionObject(pointer);
    var overlappingNodes = this._getAllUINodesOverlappingWith(screenPositionObject);
    if (this.UIvisible && overlappingNodes.length > 0) {
      return this.sectors["UI"]["nodes"][overlappingNodes[overlappingNodes.length - 1]];
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
    // we first check if this is an UI element
    var positionObject = this._pointerToPositionObject(pointer);
    overlappingNodes = this._getAllNodesOverlappingWith(positionObject);

    // if there are overlapping nodes, select the last one, this is the
    // one which is drawn on top of the others
    if (overlappingNodes.length > 0) {
       return this.nodes[overlappingNodes[overlappingNodes.length - 1]];
    }
    else {
      return null;
    }
  },

  _getEdgeAt : function(pointer) {

  },

  _addToSelection : function(obj) {
    this.selection.push(obj.id);
    this.selectionObj[obj.id] = obj;
  },

  _removeFromSelection : function(obj) {
    for (var i = 0; i < this.selection.length; i++) {
      if (obj.id == this.selection[i]) {
        this.selection.splice(i,1);
        break;
      }
    }
    delete this.selectionObj[obj.id];
  },

  _unselectAll : function() {
    this.selection = [];
    for (var objId in this.selectionObj) {
      if (this.selectionObj.hasOwnProperty(objId)) {
        this.selectionObj[objId].unselect();
      }
    }
    this.selectionObj = {};
  },

  _selectionIsEmpty : function() {
    if (this.selection.length == 0) {
      return true;
    }
    else {
      return false;
    }
  },

  /**
   * This is called when someone clicks on a node. either select or deselect it.
   * If there is an existing selection and we don't want to append to it, clear the existing selection
   *
   * @param {Node} node
   * @param {Boolean} append
   * @private
   */
  _selectNode : function(node, append) {
    // TODO: triggers?
    if (this._selectionIsEmpty() == false && append == false) {
      this._unselectAll();
    }

    if (node.selected == false) {
      node.select();
      this._addToSelection(node);
    }
    else {
      node.unselect();
      this._removeFromSelection(node);
    }
  },

  /**
   * handles the selection part of the touch, only for UI elements;
   *
   * @param {Object} pointer
   * @private
   */
  _handleTouch : function(pointer) {
    var node = this._getUINodeAt(pointer);
    if (node != null) {
      if (this[node.triggerFunction] !== undefined) {
        this[node.triggerFunction]();
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
      this._selectNode(node,false);
    }
    else {
      this._unselectAll();
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

  _handleOnHold : function(pointer) {
    var node = this._getNodeAt(pointer);
    if (node != null) {
      this._selectNode(node,true);
    }
    this._redraw();
  },

  _handleOnRelease : function() {
    this.xIncrement = 0;
    this.yIncrement = 0;
    this.zoomIncrement = 0;
    this._unHighlightAll();
  },

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
 /* _unselectNodes : function(selection, triggerSelect) {
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
  },
*/
/**
 * select all nodes on given location x, y
 * @param {Array} selection   an array with node ids
 * @param {boolean} append    If true, the new selection will be appended to the
 *                            current selection (except for duplicate entries)
 * @return {Boolean} changed  True if the selection is changed
 * @private
 */
/*  _selectNodes : function(selection, append) {
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
  },
  */

  /**
   * retrieve the currently selected nodes
   * @return {Number[] | String[]} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelection : function() {
    return this.selection.concat([]);
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
  },


  /**
   * Validate the selection: remove ids of nodes which no longer exist
   * @private
   */
  _updateSelection : function () {
    var i = 0;
    while (i < this.selection.length) {
      var nodeId = this.selection[i];
      if (!this.nodes.hasOwnProperty(nodeId)) {
        this.selection.splice(i, 1);
        delete this.selectionObj[nodeId];
      }
      else {
        i++;
      }
    }
  }





};



