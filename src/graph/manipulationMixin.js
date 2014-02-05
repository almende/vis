/**
 * Created by Alex on 2/4/14.
 */

var manipulationMixin = {

  /**
   * clears the toolbar div element of children
   *
   * @private
   */
  _clearManipulatorBar : function() {
    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }
  },


  /**
   * main function, creates the main toolbar. Removes functions bound to the select event. Binds all the buttons of the toolbar.
   *
   * @private
   */
  _createManipulatorBar : function() {
    // remove bound functions
    this.off('select', this.boundFunction);

    // reset global variables
    this.blockConnectingEdgeSelection = false;
    this.forceAppendSelection = false

    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }
    // add the icons to the manipulator div
    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI add' id='manipulate-addNode'><span class='manipulationLabel'>Add Node</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI edit' id='manipulate-editNode'><span class='manipulationLabel'>Edit Selected</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI connect' id='manipulate-connectNode'><span class='manipulationLabel'>Connect Node</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI delete' id='manipulate-delete'><span class='manipulationLabel'>Delete selected</span></span>";

    // bind the icons
    var addButton = document.getElementById("manipulate-addNode");
    addButton.onclick = this._createAddToolbar.bind(this);
    var editButton = document.getElementById("manipulate-editNode");
    editButton.onclick = this._createEditToolbar.bind(this);
    var connectButton = document.getElementById("manipulate-connectNode");
    connectButton.onclick = this._createConnectToolbar.bind(this);
    var deleteButton = document.getElementById("manipulate-delete");
    deleteButton.onclick = this._createDeletionToolbar.bind(this);
  },


  /**
   * Create the toolbar for adding Nodes
   *
   * @private
   */
  _createAddToolbar : function() {
    // clear the toolbar
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);

    // create the toolbar contents
    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none' id='manipulate-back'><span class='manipulationLabel'>Click in an empty space to place a new node</span></span>";

    // bind the icon
    var backButton = document.getElementById("manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);

    // we use the boundFunction so we can reference it when we unbind it from the "select" event.
    this.boundFunction = this._addNode.bind(this);
    this.on('select', this.boundFunction);
  },


  /**
   * Create the toolbar to edit nodes or edges.
   * TODO: edges not implemented yet, unsure what to edit.
   *
   * @private
   */
  _createEditToolbar : function() {
    // clear the toolbar
    this.blockConnectingEdgeSelection = false;
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);


    var message = "";
    if (this._selectionIsEmpty())  {
      message = "Select a node or edge to edit.";
    }
    else {
      if (this._getSelectedObjectCount() > 1) {
        message = "Select a single node or edge to edit."
        this._unselectAll(true);
      }
      else {
        if (this._clusterInSelection()) {
          message = "You cannot edit a cluster."
          this._unselectAll(true);
        }
        else {
          if (this._getSelectedNodeCount() > 0) { // the selected item is a node
            this._createEditNodeToolbar();
          }
          else { // the selected item is an edge
            this._createEditEdgeToolbar();
          }
        }
      }
    }

    if (message != "") {
      this.blockConnectingEdgeSelection = true;
      // create the toolbar contents
      this.manipulationDiv.innerHTML = "" +
        "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
        "<div class='seperatorLine'></div>" +
        "<span class='manipulationUI none' id='manipulate-back'><span class='manipulationLabel'>"+message+"</span></span>";

      // bind the icon
      var backButton = document.getElementById("manipulate-back");
      backButton.onclick = this._createManipulatorBar.bind(this);

      // we use the boundFunction so we can reference it when we unbind it from the "select" event.
      this.boundFunction = this._createEditToolbar.bind(this);
      this.on('select', this.boundFunction);
    }
  },


  /**
   * Create the toolbar to edit the selected node. The label and the color can be changed. Other colors are derived from the chosen color.
   * TODO: change shape or group?
   *
   * @private
   */
  _createEditNodeToolbar : function() {
    // clear the toolbar
    this.blockConnectingEdgeSelection = false;
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);

    var editObject = this._getEditObject();

    // create the toolbar contents
    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Cancel</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none'>label: <input type='text' class='manipulatorInput' value='" + editObject.label + "' id='manipulator-obj-label' /></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none'>color: <input type='text' class='manipulatorInput' value='" + editObject.color.background + "' id='manipulator-obj-color' /></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none'><input type='button' class='manipulatorInput' value='save' id='manipulator-obj-save' /></span>"

    // bind the icon
    var backButton = document.getElementById("manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);
    var saveButton = document.getElementById("manipulator-obj-save");
    saveButton.onclick = this._saveNodeData.bind(this);

    // we use the boundFunction so we can reference it when we unbind it from the "select" event.
    this.boundFunction = this._createManipulatorBar.bind(this);
    this.on('select', this.boundFunction);
  },


  /**
   * save the changes in the node data
   *
   * @private
   */
  _saveNodeData : function() {
    var editObjectId = this._getEditObject().id;
    var label = document.getElementById('manipulator-obj-label').value;

    var definedColor = document.getElementById('manipulator-obj-color').value;
    var hsv = util.hexToHSV(definedColor);

    var lighterColorHSV = {h:hsv.h,s:hsv.s * 0.45,v:Math.min(1,hsv.v * 1.05)};
    var darkerColorHSV  = {h:hsv.h,s:Math.min(1,hsv.v * 1.25),v:hsv.v*0.6};
    var darkerColorHex  = util.HSVToHex(darkerColorHSV.h ,darkerColorHSV.h ,darkerColorHSV.v);
    var lighterColorHex = util.HSVToHex(lighterColorHSV.h,lighterColorHSV.s,lighterColorHSV.v);

    var updatedSettings = {id:editObjectId,
      label: label,
      color: {
        background:definedColor,
        border:darkerColorHex,
        highlight: {
          background:lighterColorHex,
          border:darkerColorHex
        }
      }};
    this.nodesData.update(updatedSettings);
    this._createManipulatorBar();
  },


  /**
   * creating the toolbar to edit edges.
   *
   * @private
   */
  _createEditEdgeToolbar : function() {
    // clear the toolbar
    this.blockConnectingEdgeSelection = false;
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);

    // create the toolbar contents
    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none' id='manipulate-back'><span class='manipulationLabel'>Currently only nodes can be edited.</span></span>";

    // bind the icon
    var backButton = document.getElementById("manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);

    // we use the boundFunction so we can reference it when we unbind it from the "select" event.
    this.boundFunction = this._createManipulatorBar.bind(this);
    this.on('select', this.boundFunction);
  },


  /**
   * create the toolbar to connect nodes
   *
   * @private
   */
  _createConnectToolbar : function() {
    // clear the toolbar
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);

    this._unselectAll();
    this.forceAppendSelection = false;
    this.blockConnectingEdgeSelection = true;

    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none' id='manipulate-back'><span id='manipulatorLabel' class='manipulationLabel'>Select the node you want to connect to other nodes.</span></span>";

    // bind the icon
    var backButton = document.getElementById("manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);

    // we use the boundFunction so we can reference it when we unbind it from the "select" event.
    this.boundFunction = this._handleConnect.bind(this);
    this.on('select', this.boundFunction);
  },


  /**
   * create the toolbar for deleting selected objects. User has to be sure.
   *
   * @private
   */
  _createDeletionToolbar : function() {
    // clear the toolbar
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);

    if (this._selectionIsEmpty()) {
      this.manipulationDiv.innerHTML = "" +
        "<span class='manipulationUI none notification' id='manipulate-back'><span id='manipulatorLabel' class='manipulationLabel'>Cannot delete an empty selection.</span></span>";
      var graph = this;
      window.setTimeout (function() {graph._createManipulatorBar()},1500);
    }
    else {
      this.manipulationDiv.innerHTML = "" +
        "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
        "<div class='seperatorLine'></div>" +
        "<span class='manipulationUI none' id='manipulate-back'><span id='manipulatorLabel' class='manipulationLabel'>Are you sure? This cannot be undone.</span></span>" +
        "<div class='seperatorLine'></div>" +
        "<span class='manipulationUI acceptDelete' id='manipulate-acceptDelete'><span class='manipulationLabel'>Yes.</span></span>";

      // bind the buttons
      var backButton = document.getElementById("manipulate-back");
      backButton.onclick = this._createManipulatorBar.bind(this);
      var acceptDeleteButton = document.getElementById("manipulate-acceptDelete");
      acceptDeleteButton.onclick = this._deleteSelected.bind(this);

      // we use the boundFunction so we can reference it when we unbind it from the "select" event.
      this.boundFunction = this._createManipulatorBar.bind(this);
      this.on('select', this.boundFunction);
    }
  },


  /**
   * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
   * to walk the user through the process.
   *
   * @private
   */
  _handleConnect : function() {
    this.forceAppendSelection = false;
    if (this._clusterInSelection()) {
      this._unselectClusters(true);
      if (!this._selectionIsEmpty()) {
        this._setManipulationMessage("You cannot connect a node to a cluster.");
        this.forceAppendSelection = true;
      }
      else {
        this._setManipulationMessage("You cannot connect anything to a cluster.");
      }
    }
    else if (!this._selectionIsEmpty()) {
      if (this._getSelectedNodeCount() == 2) {
        this._connectNodes();
        this._restoreSourceNode();
        this._setManipulationMessage("Click on another node you want to connect this node to or go back.");
      }
      else {
        this._setManipulationMessage("Click on the node you want to connect this node.");
        this._setSourceNode();
        this.forceAppendSelection = true;
      }
    }
    else {
      this._setManipulationMessage("Select the node you want to connect to other nodes.");
    }
  },


  /**
   * returns the object that is selected
   *
   * @returns {*}
   * @private
   */
  _getEditObject : function() {
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        return this.selectionObj[objectId];
      }
    }
    return null;
  },


  /**
   * stores the first selected node for the connecting process as the source node. This allows us to remember the direction
   *
   * @private
   */
  _setSourceNode : function() {
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        if (this.selectionObj[objectId] instanceof Node) {
          this.manipulationSourceNode = this.selectionObj[objectId];
        }
      }
    }
  },


  /**
   * gets the node the source connects to.
   *
   * @returns {*}
   * @private
   */
  _getTargetNode : function() {
    for(var objectId in this.selectionObj) {
      if(this.selectionObj.hasOwnProperty(objectId)) {
        if (this.selectionObj[objectId] instanceof Node) {
          if (this.manipulationSourceNode.id != this.selectionObj[objectId].id) {
            return this.selectionObj[objectId];
          }
        }
      }
    }
    return null;
  },


  /**
   * restore the selection back to only the sourcenode
   *
   * @private
   */
  _restoreSourceNode : function() {
    this._unselectAll(true);
    this._selectObject(this.manipulationSourceNode);
  },


  /**
   * change the description message on the toolbar
   *
   * @param message
   * @private
   */
  _setManipulationMessage : function(message) {
    var messageSpan = document.getElementById('manipulatorLabel');
      messageSpan.innerHTML = message;
  },


  /**
   * Adds a node on the specified location
   *
   * @param {Object} pointer
   */
  _addNode : function() {
    if (this._selectionIsEmpty()) {
      var positionObject = this._pointerToPositionObject(this.pointerPosition);
      this.createNodeOnClick = true;
      this.nodesData.add({id:util.randomUUID(),x:positionObject.left,y:positionObject.top,label:"new",fixed:false});
      this.createNodeOnClick = false;
      this.moving = true;
      this.start();
    }
  },


  /**
   * connect two nodes with a new edge.
   *
   * @private
   */
  _connectNodes : function() {
    var targetNode = this._getTargetNode();
    var sourceNode = this.manipulationSourceNode;
    this.edgesData.add({from:sourceNode.id, to:targetNode.id})
    this.moving = true;
    this.start();
  },


  /**
   * delete everything in the selection
   *
   * @private
   */
  _deleteSelected : function() {
    if (!this._clusterInSelection()) {
      var selectedNodes = this.getSelectedNodes();
      var selectedEdges = this.getSelectedEdges();
      this._removeEdges(selectedEdges);
      this._removeNodes(selectedNodes);
      this.moving = true;
      this.start();
    }
    else {
      alert("Clusters cannot be deleted.")
    }
  }


}