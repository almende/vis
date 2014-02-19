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
   * Manipulation UI temporarily overloads certain functions to extend or replace them. To be able to restore
   * these functions to their original functionality, we saved them in this.cachedFunctions.
   * This function restores these functions to their original function.
   *
   * @private
   */
  _restoreOverloadedFunctions : function() {
    for (var functionName in this.cachedFunctions) {
      if (this.cachedFunctions.hasOwnProperty(functionName)) {
        this[functionName] = this.cachedFunctions[functionName];
      }
    }
  },

  /**
   * Enable or disable edit-mode.
   *
   * @private
   */
  _toggleEditMode : function() {
    this.editMode = !this.editMode;
    var toolbar = document.getElementById("graph-manipulationDiv");
    var closeDiv = document.getElementById("graph-manipulation-closeDiv");
    var editModeDiv = document.getElementById("graph-manipulation-editMode");
    if (this.editMode == true) {
      toolbar.style.display="block";
      closeDiv.style.display="block";
      editModeDiv.style.display="none";
      closeDiv.onclick = this._toggleEditMode.bind(this);
    }
    else {
      toolbar.style.display="none";
      closeDiv.style.display="none";
      editModeDiv.style.display="block";
      closeDiv.onclick = null;
    }
    this._createManipulatorBar()
  },

  /**
   * main function, creates the main toolbar. Removes functions bound to the select event. Binds all the buttons of the toolbar.
   *
   * @private
   */
  _createManipulatorBar : function() {
    // remove bound functions
    this.off('select', this.boundFunction);

    // restore overloaded functions
    this._restoreOverloadedFunctions();

    // resume calculation
    this.freezeSimulation = false;

    // reset global variables
    this.blockConnectingEdgeSelection = false;
    this.forceAppendSelection = false

    if (this.editMode == true) {
      while (this.manipulationDiv.hasChildNodes()) {
        this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
      }
      // add the icons to the manipulator div
      this.manipulationDiv.innerHTML = "" +
        "<span class='graph-manipulationUI add' id='graph-manipulate-addNode'>" +
          "<span class='graph-manipulationLabel'>Add Node</span></span>" +
        "<div class='graph-seperatorLine'></div>" +
        "<span class='graph-manipulationUI connect' id='graph-manipulate-connectNode'>" +
          "<span class='graph-manipulationLabel'>Add Link</span></span>";
      if (this._getSelectedNodeCount() == 1 && this.triggerFunctions.edit) {
        this.manipulationDiv.innerHTML += "" +
          "<div class='graph-seperatorLine'></div>" +
          "<span class='graph-manipulationUI edit' id='graph-manipulate-editNode'>" +
            "<span class='graph-manipulationLabel'>Edit Node</span></span>";
      }
      if (this._selectionIsEmpty() == false) {
        this.manipulationDiv.innerHTML += "" +
          "<div class='graph-seperatorLine'></div>" +
          "<span class='graph-manipulationUI delete' id='graph-manipulate-delete'>" +
            "<span class='graph-manipulationLabel'>Delete selected</span></span>";
      }


      // bind the icons
      var addNodeButton = document.getElementById("graph-manipulate-addNode");
      addNodeButton.onclick = this._createAddNodeToolbar.bind(this);
      var addEdgeButton = document.getElementById("graph-manipulate-connectNode");
      addEdgeButton.onclick = this._createAddEdgeToolbar.bind(this);
      if (this._getSelectedNodeCount() == 1 && this.triggerFunctions.edit) {
        var editButton = document.getElementById("graph-manipulate-editNode");
        editButton.onclick = this._editNode.bind(this);
      }
      if (this._selectionIsEmpty() == false) {
        var deleteButton = document.getElementById("graph-manipulate-delete");
        deleteButton.onclick = this._deleteSelected.bind(this);
      }
      var closeDiv = document.getElementById("graph-manipulation-closeDiv");
      closeDiv.onclick = this._toggleEditMode.bind(this);

      this.boundFunction = this._createManipulatorBar.bind(this);
      this.on('select', this.boundFunction);
    }
    else {
      this.editModeDiv.innerHTML = "" +
        "<span class='graph-manipulationUI edit editmode' id='graph-manipulate-editModeButton'>" +
        "<span class='graph-manipulationLabel'>Edit</span></span>"
      var editModeButton = document.getElementById("graph-manipulate-editModeButton");
      editModeButton.onclick = this._toggleEditMode.bind(this);
    }
  },



  /**
   * Create the toolbar for adding Nodes
   *
   * @private
   */
  _createAddNodeToolbar : function() {
    // clear the toolbar
    this._clearManipulatorBar();
    this.off('select', this.boundFunction);

    // create the toolbar contents
    this.manipulationDiv.innerHTML = "" +
      "<span class='graph-manipulationUI back' id='graph-manipulate-back'>" +
        "<span class='graph-manipulationLabel'>Back</span></span>" +
      "<div class='graph-seperatorLine'></div>" +
      "<span class='graph-manipulationUI none' id='graph-manipulate-back'>" +
        "<span class='graph-manipulationLabel'>Click in an empty space to place a new node</span></span>";

    // bind the icon
    var backButton = document.getElementById("graph-manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);

    // we use the boundFunction so we can reference it when we unbind it from the "select" event.
    this.boundFunction = this._addNode.bind(this);
    this.on('select', this.boundFunction);
  },


  /**
   * create the toolbar to connect nodes
   *
   * @private
   */
  _createAddEdgeToolbar : function() {
    // clear the toolbar
    this._clearManipulatorBar();
    this._unselectAll(true);
    this.freezeSimulation = true;

    this.off('select', this.boundFunction);

    this._unselectAll();
    this.forceAppendSelection = false;
    this.blockConnectingEdgeSelection = true;

    this.manipulationDiv.innerHTML = "" +
      "<span class='graph-manipulationUI back' id='graph-manipulate-back'>" +
        "<span class='graph-manipulationLabel'>Back</span></span>" +
      "<div class='graph-seperatorLine'></div>" +
      "<span class='graph-manipulationUI none' id='graph-manipulate-back'>" +
        "<span id='graph-manipulatorLabel' class='graph-manipulationLabel'>Click on a node and drag the edge to another node to connect them.</span></span>";

    // bind the icon
    var backButton = document.getElementById("graph-manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);

    // we use the boundFunction so we can reference it when we unbind it from the "select" event.
    this.boundFunction = this._handleConnect.bind(this);
    this.on('select', this.boundFunction);

    // temporarily overload functions
    this.cachedFunctions["_handleTouch"] = this._handleTouch;
    this.cachedFunctions["_handleOnRelease"] = this._handleOnRelease;
    this._handleTouch = this._handleConnect;
    this._handleOnRelease = this._finishConnect;

    // redraw to show the unselect
    this._redraw();

  },


  /**
   * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
   * to walk the user through the process.
   *
   * @private
   */
  _handleConnect : function(pointer) {
    if (this._getSelectedNodeCount() == 0) {
      var node = this._getNodeAt(pointer);
      if (node != null) {
        if (node.clusterSize > 1) {
          alert("Cannot create edges to a cluster.")
        }
        else {
          this._selectObject(node,false);
          // create a node the temporary line can look at
          this.sectors['support']['nodes']['targetNode'] = new Node({id:'targetNode'},{},{},this.constants);
          this.sectors['support']['nodes']['targetNode'].x = node.x;
          this.sectors['support']['nodes']['targetNode'].y = node.y;
          this.sectors['support']['nodes']['targetViaNode'] = new Node({id:'targetViaNode'},{},{},this.constants);
          this.sectors['support']['nodes']['targetViaNode'].x = node.x;
          this.sectors['support']['nodes']['targetViaNode'].y = node.y;
          this.sectors['support']['nodes']['targetViaNode'].parentEdgeId = "connectionEdge";

          // create a temporary edge
          this.edges['connectionEdge'] = new Edge({id:"connectionEdge",from:node.id,to:this.sectors['support']['nodes']['targetNode'].id}, this, this.constants);
          this.edges['connectionEdge'].from = node;
          this.edges['connectionEdge'].connected = true;
          this.edges['connectionEdge'].smooth = true;
          this.edges['connectionEdge'].selected = true;
          this.edges['connectionEdge'].to = this.sectors['support']['nodes']['targetNode'];
          this.edges['connectionEdge'].via = this.sectors['support']['nodes']['targetViaNode'];

          this.cachedFunctions["_handleOnDrag"] = this._handleOnDrag;
          this._handleOnDrag = function(event) {
            var pointer = this._getPointer(event.gesture.center);
            this.sectors['support']['nodes']['targetNode'].x = this._canvasToX(pointer.x);
            this.sectors['support']['nodes']['targetNode'].y = this._canvasToY(pointer.y);
            this.sectors['support']['nodes']['targetViaNode'].x = 0.5 * (this._canvasToX(pointer.x) + this.edges['connectionEdge'].from.x);
            this.sectors['support']['nodes']['targetViaNode'].y = this._canvasToY(pointer.y);
          };

          this.moving = true;
          this.start();
        }
      }
    }
  },

  _finishConnect : function(pointer) {
    if (this._getSelectedNodeCount() == 1) {

      // restore the drag function
      this._handleOnDrag = this.cachedFunctions["_handleOnDrag"];
      delete this.cachedFunctions["_handleOnDrag"];

      // remember the edge id
      var connectFromId = this.edges['connectionEdge'].fromId;

      // remove the temporary nodes and edge
      delete this.edges['connectionEdge']
      delete this.sectors['support']['nodes']['targetNode'];
      delete this.sectors['support']['nodes']['targetViaNode'];

      var node = this._getNodeAt(pointer);
      if (node != null) {
        if (node.clusterSize > 1) {
          alert("Cannot create edges to a cluster.")
        }
        else {
          this._createEdge(connectFromId,node.id);
          this._createManipulatorBar();
        }
      }
      this._unselectAll();
    }
  },


  /**
   * Adds a node on the specified location
   *
   * @param {Object} pointer
   */
  _addNode : function() {
    if (this._selectionIsEmpty() && this.editMode == true) {
      var positionObject = this._pointerToPositionObject(this.pointerPosition);
      var defaultData = {id:util.randomUUID(),x:positionObject.left,y:positionObject.top,label:"new",fixed:false};
      if (this.triggerFunctions.add) {
        if (this.triggerFunctions.add.length == 2) {
          var me = this;
          this.triggerFunctions.add(defaultData, function(finalizedData) {
            me.createNodeOnClick = true;
            me.nodesData.add(finalizedData);
            me.createNodeOnClick = false;
            me._createManipulatorBar();
            me.moving = true;
            me.start();
          });
        }
        else {
          alert("The function for add does not support two arguments (data,callback).");
          this._createManipulatorBar();
          this.moving = true;
          this.start();
        }
      }
      else {
        this.createNodeOnClick = true;
        this.nodesData.add(defaultData);
        this.createNodeOnClick = false;
        this._createManipulatorBar();
        this.moving = true;
        this.start();
      }
    }
  },


  /**
   * connect two nodes with a new edge.
   *
   * @private
   */
  _createEdge : function(sourceNodeId,targetNodeId) {
    if (this.editMode == true) {
      var defaultData = {from:sourceNodeId, to:targetNodeId};
      if (this.triggerFunctions.connect) {
        if (this.triggerFunctions.connect.length == 2) {
          var me = this;
          this.triggerFunctions.connect(defaultData, function(finalizedData) {
            me.edgesData.add(finalizedData)
            me.moving = true;
            me.start();
          });
        }
        else {
          alert("The function for connect does not support two arguments (data,callback).");
          this.moving = true;
          this.start();
        }
      }
      else {
        this.edgesData.add(defaultData)
        this.moving = true;
        this.start();
      }
    }
  },


  /**
   * Create the toolbar to edit the selected node. The label and the color can be changed. Other colors are derived from the chosen color.
   *
   * @private
   */
  _editNode : function() {
    if (this.triggerFunctions.edit && this.editMode == true) {
      var node = this._getSelectedNode();
      var data = {id:node.id,
        label: node.label,
        group: node.group,
        shape: node.shape,
        color: {
          background:node.color.background,
          border:node.color.border,
          highlight: {
            background:node.color.highlight.background,
            border:node.color.highlight.border
          }
        }};
      if (this.triggerFunctions.edit.length == 2) {
        var me = this;
        this.triggerFunctions.edit(data, function (finalizedData) {
          me.nodesData.update(finalizedData);
          me._createManipulatorBar();
          me.moving = true;
          me.start();
        });
      }
      else {
        alert("The function for edit does not support two arguments (data, callback).")
      }
    }
    else {
      alert("No edit function has been bound to this button.")
    }
  },


  /**
   * delete everything in the selection
   *
   * @private
   */
  _deleteSelected : function() {
    if (!this._selectionIsEmpty() && this.editMode == true) {
      if (!this._clusterInSelection()) {
        var selectedNodes = this.getSelectedNodes();
        var selectedEdges = this.getSelectedEdges();
        if (this.triggerFunctions.delete) {
          var me = this;
          var data = {nodes: selectedNodes, edges: selectedEdges};
          if (this.triggerFunctions.delete.length = 2) {
            this.triggerFunctions.delete(data, function (finalizedData) {
              me.edgesData.remove(finalizedData.edges);
              me.nodesData.remove(finalizedData.nodes);
              this._unselectAll();
              me.moving = true;
              me.start();
            });
          }
          else {
            alert("The function for edit does not support two arguments (data, callback).")
          }
        }
        else {
          this.edgesData.remove(selectedEdges);
          this.nodesData.remove(selectedNodes);
          this._unselectAll();
          this.moving = true;
          this.start();
        }
      }
      else {
        alert("Clusters cannot be deleted.");
      }
    }
  }
};