var util = require('../../util');
var Node = require('../Node');
var Edge = require('../Edge');

/**
 * clears the toolbar div element of children
 *
 * @private
 */
exports._clearManipulatorBar = function() {
  while (this.manipulationDiv.hasChildNodes()) {
    this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
  }
};

/**
 * Manipulation UI temporarily overloads certain functions to extend or replace them. To be able to restore
 * these functions to their original functionality, we saved them in this.cachedFunctions.
 * This function restores these functions to their original function.
 *
 * @private
 */
exports._restoreOverloadedFunctions = function() {
  for (var functionName in this.cachedFunctions) {
    if (this.cachedFunctions.hasOwnProperty(functionName)) {
      this[functionName] = this.cachedFunctions[functionName];
    }
  }
};

/**
 * Enable or disable edit-mode.
 *
 * @private
 */
exports._toggleEditMode = function() {
  this.editMode = !this.editMode;
  var toolbar = document.getElementById("network-manipulationDiv");
  var closeDiv = document.getElementById("network-manipulation-closeDiv");
  var editModeDiv = document.getElementById("network-manipulation-editMode");
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
};

/**
 * main function, creates the main toolbar. Removes functions bound to the select event. Binds all the buttons of the toolbar.
 *
 * @private
 */
exports._createManipulatorBar = function() {
  // remove bound functions
  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  if (this.edgeBeingEdited !== undefined) {
    this.edgeBeingEdited._disableControlNodes();
    this.edgeBeingEdited = undefined;
    this.selectedControlNode = null;
    this.controlNodesActive = false;
  }

  // restore overloaded functions
  this._restoreOverloadedFunctions();

  // resume calculation
  this.freezeSimulation = false;

  // reset global variables
  this.blockConnectingEdgeSelection = false;
  this.forceAppendSelection = false;

  if (this.editMode == true) {
    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }
    // add the icons to the manipulator div
    this.manipulationDiv.innerHTML = "" +
      "<span class='network-manipulationUI add' id='network-manipulate-addNode'>" +
        "<span class='network-manipulationLabel'>"+this.constants.labels['add'] +"</span></span>" +
      "<div class='network-seperatorLine'></div>" +
      "<span class='network-manipulationUI connect' id='network-manipulate-connectNode'>" +
        "<span class='network-manipulationLabel'>"+this.constants.labels['link'] +"</span></span>";
    if (this._getSelectedNodeCount() == 1 && this.triggerFunctions.edit) {
      this.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI edit' id='network-manipulate-editNode'>" +
          "<span class='network-manipulationLabel'>"+this.constants.labels['editNode'] +"</span></span>";
    }
    else if (this._getSelectedEdgeCount() == 1 && this._getSelectedNodeCount() == 0) {
      this.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI edit' id='network-manipulate-editEdge'>" +
        "<span class='network-manipulationLabel'>"+this.constants.labels['editEdge'] +"</span></span>";
    }
    if (this._selectionIsEmpty() == false) {
      this.manipulationDiv.innerHTML += "" +
        "<div class='network-seperatorLine'></div>" +
        "<span class='network-manipulationUI delete' id='network-manipulate-delete'>" +
          "<span class='network-manipulationLabel'>"+this.constants.labels['del'] +"</span></span>";
    }


    // bind the icons
    var addNodeButton = document.getElementById("network-manipulate-addNode");
    addNodeButton.onclick = this._createAddNodeToolbar.bind(this);
    var addEdgeButton = document.getElementById("network-manipulate-connectNode");
    addEdgeButton.onclick = this._createAddEdgeToolbar.bind(this);
    if (this._getSelectedNodeCount() == 1 && this.triggerFunctions.edit) {
      var editButton = document.getElementById("network-manipulate-editNode");
      editButton.onclick = this._editNode.bind(this);
    }
    else if (this._getSelectedEdgeCount() == 1 && this._getSelectedNodeCount() == 0) {
      var editButton = document.getElementById("network-manipulate-editEdge");
      editButton.onclick = this._createEditEdgeToolbar.bind(this);
    }
    if (this._selectionIsEmpty() == false) {
      var deleteButton = document.getElementById("network-manipulate-delete");
      deleteButton.onclick = this._deleteSelected.bind(this);
    }
    var closeDiv = document.getElementById("network-manipulation-closeDiv");
    closeDiv.onclick = this._toggleEditMode.bind(this);

    this.boundFunction = this._createManipulatorBar.bind(this);
    this.on('select', this.boundFunction);
  }
  else {
    this.editModeDiv.innerHTML = "" +
      "<span class='network-manipulationUI edit editmode' id='network-manipulate-editModeButton'>" +
      "<span class='network-manipulationLabel'>" + this.constants.labels['edit'] + "</span></span>";
    var editModeButton = document.getElementById("network-manipulate-editModeButton");
    editModeButton.onclick = this._toggleEditMode.bind(this);
  }
};



/**
 * Create the toolbar for adding Nodes
 *
 * @private
 */
exports._createAddNodeToolbar = function() {
  // clear the toolbar
  this._clearManipulatorBar();
  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  // create the toolbar contents
  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back'>" +
    "<span class='network-manipulationLabel'>" + this.constants.labels['back'] + " </span></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + this.constants.labels['addDescription'] + "</span></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._addNode.bind(this);
  this.on('select', this.boundFunction);
};


/**
 * create the toolbar to connect nodes
 *
 * @private
 */
exports._createAddEdgeToolbar = function() {
  // clear the toolbar
  this._clearManipulatorBar();
  this._unselectAll(true);
  this.freezeSimulation = true;

  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  this._unselectAll();
  this.forceAppendSelection = false;
  this.blockConnectingEdgeSelection = true;

  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back'>" +
      "<span class='network-manipulationLabel'>" + this.constants.labels['back'] + " </span></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
      "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + this.constants.labels['linkDescription'] + "</span></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
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
};

/**
 * create the toolbar to edit edges
 *
 * @private
 */
exports._createEditEdgeToolbar = function() {
  // clear the toolbar
  this._clearManipulatorBar();
  this.controlNodesActive = true;

  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  this.edgeBeingEdited = this._getSelectedEdge();
  this.edgeBeingEdited._enableControlNodes();

  this.manipulationDiv.innerHTML = "" +
    "<span class='network-manipulationUI back' id='network-manipulate-back'>" +
    "<span class='network-manipulationLabel'>" + this.constants.labels['back'] + " </span></span>" +
    "<div class='network-seperatorLine'></div>" +
    "<span class='network-manipulationUI none' id='network-manipulate-back'>" +
    "<span id='network-manipulatorLabel' class='network-manipulationLabel'>" + this.constants.labels['editEdgeDescription'] + "</span></span>";

  // bind the icon
  var backButton = document.getElementById("network-manipulate-back");
  backButton.onclick = this._createManipulatorBar.bind(this);

  // temporarily overload functions
  this.cachedFunctions["_handleTouch"]      = this._handleTouch;
  this.cachedFunctions["_handleOnRelease"]  = this._handleOnRelease;
  this.cachedFunctions["_handleTap"]        = this._handleTap;
  this.cachedFunctions["_handleDragStart"]  = this._handleDragStart;
  this.cachedFunctions["_handleOnDrag"]     = this._handleOnDrag;
  this._handleTouch     = this._selectControlNode;
  this._handleTap       = function () {};
  this._handleOnDrag    = this._controlNodeDrag;
  this._handleDragStart = function () {}
  this._handleOnRelease = this._releaseControlNode;

  // redraw to show the unselect
  this._redraw();
};





/**
 * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
 * to walk the user through the process.
 *
 * @private
 */
exports._selectControlNode = function(pointer) {
  this.edgeBeingEdited.controlNodes.from.unselect();
  this.edgeBeingEdited.controlNodes.to.unselect();
  this.selectedControlNode = this.edgeBeingEdited._getSelectedControlNode(this._XconvertDOMtoCanvas(pointer.x),this._YconvertDOMtoCanvas(pointer.y));
  if (this.selectedControlNode !== null) {
    this.selectedControlNode.select();
    this.freezeSimulation = true;
  }
  this._redraw();
};

/**
 * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
 * to walk the user through the process.
 *
 * @private
 */
exports._controlNodeDrag = function(event) {
  var pointer = this._getPointer(event.gesture.center);
  if (this.selectedControlNode !== null && this.selectedControlNode !== undefined) {
    this.selectedControlNode.x = this._XconvertDOMtoCanvas(pointer.x);
    this.selectedControlNode.y = this._YconvertDOMtoCanvas(pointer.y);
  }
  this._redraw();
};

exports._releaseControlNode = function(pointer) {
  var newNode = this._getNodeAt(pointer);
  if (newNode != null) {
    if (this.edgeBeingEdited.controlNodes.from.selected == true) {
      this._editEdge(newNode.id, this.edgeBeingEdited.to.id);
      this.edgeBeingEdited.controlNodes.from.unselect();
    }
    if (this.edgeBeingEdited.controlNodes.to.selected == true) {
      this._editEdge(this.edgeBeingEdited.from.id, newNode.id);
      this.edgeBeingEdited.controlNodes.to.unselect();
    }
  }
  else {
    this.edgeBeingEdited._restoreControlNodes();
  }
  this.freezeSimulation = false;
  this._redraw();
};

/**
 * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
 * to walk the user through the process.
 *
 * @private
 */
exports._handleConnect = function(pointer) {
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
          this.sectors['support']['nodes']['targetNode'].x = this._XconvertDOMtoCanvas(pointer.x);
          this.sectors['support']['nodes']['targetNode'].y = this._YconvertDOMtoCanvas(pointer.y);
          this.sectors['support']['nodes']['targetViaNode'].x = 0.5 * (this._XconvertDOMtoCanvas(pointer.x) + this.edges['connectionEdge'].from.x);
          this.sectors['support']['nodes']['targetViaNode'].y = this._YconvertDOMtoCanvas(pointer.y);
        };

        this.moving = true;
        this.start();
      }
    }
  }
};

exports._finishConnect = function(pointer) {
  if (this._getSelectedNodeCount() == 1) {

    // restore the drag function
    this._handleOnDrag = this.cachedFunctions["_handleOnDrag"];
    delete this.cachedFunctions["_handleOnDrag"];

    // remember the edge id
    var connectFromId = this.edges['connectionEdge'].fromId;

    // remove the temporary nodes and edge
    delete this.edges['connectionEdge'];
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
};


/**
 * Adds a node on the specified location
 */
exports._addNode = function() {
  if (this._selectionIsEmpty() && this.editMode == true) {
    var positionObject = this._pointerToPositionObject(this.pointerPosition);
    var defaultData = {id:util.randomUUID(),x:positionObject.left,y:positionObject.top,label:"new",allowedToMoveX:true,allowedToMoveY:true};
    if (this.triggerFunctions.add) {
      if (this.triggerFunctions.add.length == 2) {
        var me = this;
        this.triggerFunctions.add(defaultData, function(finalizedData) {
          me.nodesData.add(finalizedData);
          me._createManipulatorBar();
          me.moving = true;
          me.start();
        });
      }
      else {
        alert(this.constants.labels['addError']);
        this._createManipulatorBar();
        this.moving = true;
        this.start();
      }
    }
    else {
      this.nodesData.add(defaultData);
      this._createManipulatorBar();
      this.moving = true;
      this.start();
    }
  }
};


/**
 * connect two nodes with a new edge.
 *
 * @private
 */
exports._createEdge = function(sourceNodeId,targetNodeId) {
  if (this.editMode == true) {
    var defaultData = {from:sourceNodeId, to:targetNodeId};
    if (this.triggerFunctions.connect) {
      if (this.triggerFunctions.connect.length == 2) {
        var me = this;
        this.triggerFunctions.connect(defaultData, function(finalizedData) {
          me.edgesData.add(finalizedData);
          me.moving = true;
          me.start();
        });
      }
      else {
        alert(this.constants.labels["linkError"]);
        this.moving = true;
        this.start();
      }
    }
    else {
      this.edgesData.add(defaultData);
      this.moving = true;
      this.start();
    }
  }
};

/**
 * connect two nodes with a new edge.
 *
 * @private
 */
exports._editEdge = function(sourceNodeId,targetNodeId) {
  if (this.editMode == true) {
    var defaultData = {id: this.edgeBeingEdited.id, from:sourceNodeId, to:targetNodeId};
    if (this.triggerFunctions.editEdge) {
      if (this.triggerFunctions.editEdge.length == 2) {
        var me = this;
        this.triggerFunctions.editEdge(defaultData, function(finalizedData) {
          me.edgesData.update(finalizedData);
          me.moving = true;
          me.start();
        });
      }
      else {
        alert(this.constants.labels["linkError"]);
        this.moving = true;
        this.start();
      }
    }
    else {
      this.edgesData.update(defaultData);
      this.moving = true;
      this.start();
    }
  }
};

/**
 * Create the toolbar to edit the selected node. The label and the color can be changed. Other colors are derived from the chosen color.
 *
 * @private
 */
exports._editNode = function() {
  if (this.triggerFunctions.edit && this.editMode == true) {
    var node = this._getSelectedNode();
    var data = {id:node.id,
      label: node.label,
      group: node.options.group,
      shape: node.options.shape,
      color: {
        background:node.options.color.background,
        border:node.options.color.border,
        highlight: {
          background:node.options.color.highlight.background,
          border:node.options.color.highlight.border
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
      alert(this.constants.labels["editError"]);
    }
  }
  else {
    alert(this.constants.labels["editBoundError"]);
  }
};




/**
 * delete everything in the selection
 *
 * @private
 */
exports._deleteSelected = function() {
  if (!this._selectionIsEmpty() && this.editMode == true) {
    if (!this._clusterInSelection()) {
      var selectedNodes = this.getSelectedNodes();
      var selectedEdges = this.getSelectedEdges();
      if (this.triggerFunctions.del) {
        var me = this;
        var data = {nodes: selectedNodes, edges: selectedEdges};
        if (this.triggerFunctions.del.length = 2) {
          this.triggerFunctions.del(data, function (finalizedData) {
            me.edgesData.remove(finalizedData.edges);
            me.nodesData.remove(finalizedData.nodes);
            me._unselectAll();
            me.moving = true;
            me.start();
          });
        }
        else {
          alert(this.constants.labels["deleteError"])
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
      alert(this.constants.labels["deleteClusterError"]);
    }
  }
};
