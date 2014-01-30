
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


  /**
   * Place holder. To implement change the _getNodeAt to a _getObjectAt. Have the _getObjectAt call
   * _getNodeAt and _getEdgesAt, then priortize the selection to user preferences.
   *
   * @param pointer
   * @returns {null}
   * @private
   */
  _getEdgeAt : function(pointer) {
    return null;
  },


  /**
   * Add object to the selection array. The this.selection id array may not be needed.
   *
   * @param obj
   * @private
   */
  _addToSelection : function(obj) {
    this.selection.push(obj.id);
    this.selectionObj[obj.id] = obj;
  },


  /**
   * Remove a single option from selection.
   *
   * @param obj
   * @private
   */
  _removeFromSelection : function(obj) {
    for (var i = 0; i < this.selection.length; i++) {
      if (obj.id == this.selection[i]) {
        this.selection.splice(i,1);
        break;
      }
    }
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

    this.selection = [];
    for (var objId in this.selectionObj) {
      if (this.selectionObj.hasOwnProperty(objId)) {
        this.selectionObj[objId].unselect();
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
   * @param {Boolean} [doNotTrigger] | ignore trigger
   * @private
   */
  _selectNode : function(node, append, doNotTrigger) {
    if (doNotTrigger === undefined) {
      doNotTrigger = false;
    }

    if (this._selectionIsEmpty() == false && append == false) {
      this._unselectAll(true);
    }


    if (node.selected == false) {
      node.select();
      this._addToSelection(node);
    }
    else {
      node.unselect();
      this._removeFromSelection(node);
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


  /**
   * Handle the onHold selection part
   *
   * @param pointer
   * @private
   */
  _handleOnHold : function(pointer) {
    var node = this._getNodeAt(pointer);
    if (node != null) {
      this._selectNode(node,true);
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
   * retrieve the currently selected nodes
   * @return {Number[] | String[]} selection    An array with the ids of the
   *                                            selected nodes.
   */
  getSelection : function() {
    return this.selection.concat([]);
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
   * // TODO: rework this function, it is from the old system
   *
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
      this._selectNode(node,true,true);
    }

    this.redraw();
  },


  /**
   * TODO: rework this function, it is from the old system
   *
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
};



