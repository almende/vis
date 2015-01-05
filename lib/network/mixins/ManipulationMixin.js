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
  this.manipulationDOM = {};

  this._manipulationReleaseOverload = function () {};
  delete this.sectors['support']['nodes']['targetNode'];
  delete this.sectors['support']['nodes']['targetViaNode'];
  this.controlNodesActive = false;
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
  var toolbar = this.manipulationDiv;
  var closeDiv = this.closeDiv;
  var editModeDiv = this.editModeDiv;
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

  var locale = this.constants.locales[this.constants.locale];

  if (this.edgeBeingEdited !== undefined) {
    this.edgeBeingEdited._disableControlNodes();
    this.edgeBeingEdited = undefined;
    this.selectedControlNode = null;
    this.controlNodesActive = false;
    this._redraw();
  }

  // restore overloaded functions
  this._restoreOverloadedFunctions();

  // resume calculation
  this.freezeSimulation = false;

  // reset global variables
  this.blockConnectingEdgeSelection = false;
  this.forceAppendSelection = false;
  this.manipulationDOM = {};

  if (this.editMode == true) {
    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }

    this.manipulationDOM['addNodeSpan'] = document.createElement('span');
    this.manipulationDOM['addNodeSpan'].className = 'network-manipulationUI add';
    this.manipulationDOM['addNodeLabelSpan'] = document.createElement('span');
    this.manipulationDOM['addNodeLabelSpan'].className = 'network-manipulationLabel';
    this.manipulationDOM['addNodeLabelSpan'].innerHTML = locale['addNode'];
    this.manipulationDOM['addNodeSpan'].appendChild(this.manipulationDOM['addNodeLabelSpan']);

    this.manipulationDOM['seperatorLineDiv1'] = document.createElement('div');
    this.manipulationDOM['seperatorLineDiv1'].className = 'network-seperatorLine';

    this.manipulationDOM['addEdgeSpan'] = document.createElement('span');
    this.manipulationDOM['addEdgeSpan'].className = 'network-manipulationUI connect';
    this.manipulationDOM['addEdgeLabelSpan'] = document.createElement('span');
    this.manipulationDOM['addEdgeLabelSpan'].className = 'network-manipulationLabel';
    this.manipulationDOM['addEdgeLabelSpan'].innerHTML = locale['addEdge'];
    this.manipulationDOM['addEdgeSpan'].appendChild(this.manipulationDOM['addEdgeLabelSpan']);

    this.manipulationDiv.appendChild(this.manipulationDOM['addNodeSpan']);
    this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv1']);
    this.manipulationDiv.appendChild(this.manipulationDOM['addEdgeSpan']);

    if (this._getSelectedNodeCount() == 1 && this.triggerFunctions.edit) {
      this.manipulationDOM['seperatorLineDiv2'] = document.createElement('div');
      this.manipulationDOM['seperatorLineDiv2'].className = 'network-seperatorLine';

      this.manipulationDOM['editNodeSpan'] = document.createElement('span');
      this.manipulationDOM['editNodeSpan'].className = 'network-manipulationUI edit';
      this.manipulationDOM['editNodeLabelSpan'] = document.createElement('span');
      this.manipulationDOM['editNodeLabelSpan'].className = 'network-manipulationLabel';
      this.manipulationDOM['editNodeLabelSpan'].innerHTML = locale['editNode'];
      this.manipulationDOM['editNodeSpan'].appendChild(this.manipulationDOM['editNodeLabelSpan']);

      this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv2']);
      this.manipulationDiv.appendChild(this.manipulationDOM['editNodeSpan']);
    }
    else if (this._getSelectedEdgeCount() == 1 && this._getSelectedNodeCount() == 0) {
      this.manipulationDOM['seperatorLineDiv3'] = document.createElement('div');
      this.manipulationDOM['seperatorLineDiv3'].className = 'network-seperatorLine';

      this.manipulationDOM['editEdgeSpan'] = document.createElement('span');
      this.manipulationDOM['editEdgeSpan'].className = 'network-manipulationUI edit';
      this.manipulationDOM['editEdgeLabelSpan'] = document.createElement('span');
      this.manipulationDOM['editEdgeLabelSpan'].className = 'network-manipulationLabel';
      this.manipulationDOM['editEdgeLabelSpan'].innerHTML = locale['editEdge'];
      this.manipulationDOM['editEdgeSpan'].appendChild(this.manipulationDOM['editEdgeLabelSpan']);

      this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv3']);
      this.manipulationDiv.appendChild(this.manipulationDOM['editEdgeSpan']);
    }
    if (this._selectionIsEmpty() == false) {
      this.manipulationDOM['seperatorLineDiv4'] = document.createElement('div');
      this.manipulationDOM['seperatorLineDiv4'].className = 'network-seperatorLine';

      this.manipulationDOM['deleteSpan'] = document.createElement('span');
      this.manipulationDOM['deleteSpan'].className = 'network-manipulationUI delete';
      this.manipulationDOM['deleteLabelSpan'] = document.createElement('span');
      this.manipulationDOM['deleteLabelSpan'].className = 'network-manipulationLabel';
      this.manipulationDOM['deleteLabelSpan'].innerHTML = locale['del'];
      this.manipulationDOM['deleteSpan'].appendChild(this.manipulationDOM['deleteLabelSpan']);

      this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv4']);
      this.manipulationDiv.appendChild(this.manipulationDOM['deleteSpan']);
    }


    // bind the icons
    this.manipulationDOM['addNodeSpan'].onclick = this._createAddNodeToolbar.bind(this);
    this.manipulationDOM['addEdgeSpan'].onclick = this._createAddEdgeToolbar.bind(this);
    if (this._getSelectedNodeCount() == 1 && this.triggerFunctions.edit) {
      this.manipulationDOM['editNodeSpan'].onclick = this._editNode.bind(this);
    }
    else if (this._getSelectedEdgeCount() == 1 && this._getSelectedNodeCount() == 0) {
      this.manipulationDOM['editEdgeSpan'].onclick = this._createEditEdgeToolbar.bind(this);
    }
    if (this._selectionIsEmpty() == false) {
      this.manipulationDOM['deleteSpan'].onclick = this._deleteSelected.bind(this);
    }
    this.closeDiv.onclick = this._toggleEditMode.bind(this);

    this.boundFunction = this._createManipulatorBar.bind(this);
    this.on('select', this.boundFunction);
  }
  else {
    while (this.editModeDiv.hasChildNodes()) {
      this.editModeDiv.removeChild(this.editModeDiv.firstChild);
    }

    this.manipulationDOM['editModeSpan'] = document.createElement('span');
    this.manipulationDOM['editModeSpan'].className = 'network-manipulationUI edit editmode';
    this.manipulationDOM['editModeLabelSpan'] = document.createElement('span');
    this.manipulationDOM['editModeLabelSpan'].className = 'network-manipulationLabel';
    this.manipulationDOM['editModeLabelSpan'].innerHTML = locale['edit'];
    this.manipulationDOM['editModeSpan'].appendChild(this.manipulationDOM['editModeLabelSpan']);

    this.editModeDiv.appendChild(this.manipulationDOM['editModeSpan']);

    this.manipulationDOM['editModeSpan'].onclick = this._toggleEditMode.bind(this);
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

  var locale = this.constants.locales[this.constants.locale];

  this.manipulationDOM = {};
  this.manipulationDOM['backSpan'] = document.createElement('span');
  this.manipulationDOM['backSpan'].className = 'network-manipulationUI back';
  this.manipulationDOM['backLabelSpan'] = document.createElement('span');
  this.manipulationDOM['backLabelSpan'].className = 'network-manipulationLabel';
  this.manipulationDOM['backLabelSpan'].innerHTML = locale['back'];
  this.manipulationDOM['backSpan'].appendChild(this.manipulationDOM['backLabelSpan']);

  this.manipulationDOM['seperatorLineDiv1'] = document.createElement('div');
  this.manipulationDOM['seperatorLineDiv1'].className = 'network-seperatorLine';

  this.manipulationDOM['descriptionSpan'] = document.createElement('span');
  this.manipulationDOM['descriptionSpan'].className = 'network-manipulationUI none';
  this.manipulationDOM['descriptionLabelSpan'] = document.createElement('span');
  this.manipulationDOM['descriptionLabelSpan'].className = 'network-manipulationLabel';
  this.manipulationDOM['descriptionLabelSpan'].innerHTML = locale['addDescription'];
  this.manipulationDOM['descriptionSpan'].appendChild(this.manipulationDOM['descriptionLabelSpan']);

  this.manipulationDiv.appendChild(this.manipulationDOM['backSpan']);
  this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv1']);
  this.manipulationDiv.appendChild(this.manipulationDOM['descriptionSpan']);

  // bind the icon
  this.manipulationDOM['backSpan'].onclick = this._createManipulatorBar.bind(this);

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

  var locale = this.constants.locales[this.constants.locale];

  if (this.boundFunction) {
    this.off('select', this.boundFunction);
  }

  this._unselectAll();
  this.forceAppendSelection = false;
  this.blockConnectingEdgeSelection = true;

  this.manipulationDOM = {};
  this.manipulationDOM['backSpan'] = document.createElement('span');
  this.manipulationDOM['backSpan'].className = 'network-manipulationUI back';
  this.manipulationDOM['backLabelSpan'] = document.createElement('span');
  this.manipulationDOM['backLabelSpan'].className = 'network-manipulationLabel';
  this.manipulationDOM['backLabelSpan'].innerHTML = locale['back'];
  this.manipulationDOM['backSpan'].appendChild(this.manipulationDOM['backLabelSpan']);

  this.manipulationDOM['seperatorLineDiv1'] = document.createElement('div');
  this.manipulationDOM['seperatorLineDiv1'].className = 'network-seperatorLine';

  this.manipulationDOM['descriptionSpan'] = document.createElement('span');
  this.manipulationDOM['descriptionSpan'].className = 'network-manipulationUI none';
  this.manipulationDOM['descriptionLabelSpan'] = document.createElement('span');
  this.manipulationDOM['descriptionLabelSpan'].className = 'network-manipulationLabel';
  this.manipulationDOM['descriptionLabelSpan'].innerHTML = locale['edgeDescription'];
  this.manipulationDOM['descriptionSpan'].appendChild(this.manipulationDOM['descriptionLabelSpan']);

  this.manipulationDiv.appendChild(this.manipulationDOM['backSpan']);
  this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv1']);
  this.manipulationDiv.appendChild(this.manipulationDOM['descriptionSpan']);

  // bind the icon
  this.manipulationDOM['backSpan'].onclick = this._createManipulatorBar.bind(this);

  // we use the boundFunction so we can reference it when we unbind it from the "select" event.
  this.boundFunction = this._handleConnect.bind(this);
  this.on('select', this.boundFunction);

  // temporarily overload functions
  this.cachedFunctions["_handleTouch"] = this._handleTouch;
  this.cachedFunctions["_manipulationReleaseOverload"] = this._manipulationReleaseOverload;
  this.cachedFunctions["_handleDragStart"] = this._handleDragStart;
  this.cachedFunctions["_handleDragEnd"] = this._handleDragEnd;
  this._handleTouch = this._handleConnect;
  this._manipulationReleaseOverload = function () {};
  this._handleDragStart = function () {};
  this._handleDragEnd = this._finishConnect;

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

  var locale = this.constants.locales[this.constants.locale];

  this.manipulationDOM = {};
  this.manipulationDOM['backSpan'] = document.createElement('span');
  this.manipulationDOM['backSpan'].className = 'network-manipulationUI back';
  this.manipulationDOM['backLabelSpan'] = document.createElement('span');
  this.manipulationDOM['backLabelSpan'].className = 'network-manipulationLabel';
  this.manipulationDOM['backLabelSpan'].innerHTML = locale['back'];
  this.manipulationDOM['backSpan'].appendChild(this.manipulationDOM['backLabelSpan']);

  this.manipulationDOM['seperatorLineDiv1'] = document.createElement('div');
  this.manipulationDOM['seperatorLineDiv1'].className = 'network-seperatorLine';

  this.manipulationDOM['descriptionSpan'] = document.createElement('span');
  this.manipulationDOM['descriptionSpan'].className = 'network-manipulationUI none';
  this.manipulationDOM['descriptionLabelSpan'] = document.createElement('span');
  this.manipulationDOM['descriptionLabelSpan'].className = 'network-manipulationLabel';
  this.manipulationDOM['descriptionLabelSpan'].innerHTML = locale['editEdgeDescription'];
  this.manipulationDOM['descriptionSpan'].appendChild(this.manipulationDOM['descriptionLabelSpan']);

  this.manipulationDiv.appendChild(this.manipulationDOM['backSpan']);
  this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv1']);
  this.manipulationDiv.appendChild(this.manipulationDOM['descriptionSpan']);

  // bind the icon
  this.manipulationDOM['backSpan'].onclick = this._createManipulatorBar.bind(this);

  // temporarily overload functions
  this.cachedFunctions["_handleTouch"]      = this._handleTouch;
  this.cachedFunctions["_manipulationReleaseOverload"]  = this._manipulationReleaseOverload;
  this.cachedFunctions["_handleTap"]        = this._handleTap;
  this.cachedFunctions["_handleDragStart"]  = this._handleDragStart;
  this.cachedFunctions["_handleOnDrag"]     = this._handleOnDrag;
  this._handleTouch     = this._selectControlNode;
  this._handleTap       = function () {};
  this._handleOnDrag    = this._controlNodeDrag;
  this._handleDragStart = function () {}
  this._manipulationReleaseOverload = this._releaseControlNode;

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
  if (newNode !== null) {
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
        alert(this.constants.locales[this.constants.locale]['createEdgeError'])
      }
      else {
        this._selectObject(node,false);
        var supportNodes = this.sectors['support']['nodes'];

        // create a node the temporary line can look at
        supportNodes['targetNode'] = new Node({id:'targetNode'},{},{},this.constants);
        var targetNode = supportNodes['targetNode'];
        targetNode.x = node.x;
        targetNode.y = node.y;

        // create a temporary edge
        this.edges['connectionEdge'] = new Edge({id:"connectionEdge",from:node.id,to:targetNode.id}, this, this.constants);
        var connectionEdge = this.edges['connectionEdge'];
        connectionEdge.from = node;
        connectionEdge.connected = true;
        connectionEdge.options.smoothCurves = {enabled: true,
            dynamic: false,
            type: "continuous",
            roundness: 0.5
        };
        connectionEdge.selected = true;
        connectionEdge.to = targetNode;

        this.cachedFunctions["_handleOnDrag"] = this._handleOnDrag;
        this._handleOnDrag = function(event) {
          var pointer = this._getPointer(event.gesture.center);
          var connectionEdge = this.edges['connectionEdge'];
          connectionEdge.to.x = this._XconvertDOMtoCanvas(pointer.x);
          connectionEdge.to.y = this._YconvertDOMtoCanvas(pointer.y);
        };

        this.moving = true;
        this.start();
      }
    }
  }
};

exports._finishConnect = function(event) {
  if (this._getSelectedNodeCount() == 1) {
    var pointer = this._getPointer(event.gesture.center);
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
        alert(this.constants.locales[this.constants.locale]["createEdgeError"])
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
        throw new Error('The function for add does not support two arguments (data,callback)');
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
        throw new Error('The function for connect does not support two arguments (data,callback)');
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
        throw new Error('The function for edit does not support two arguments (data, callback)');
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
      throw new Error('The function for edit does not support two arguments (data, callback)');
    }
  }
  else {
    throw new Error('No edit function has been bound to this button');
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
        if (this.triggerFunctions.del.length == 2) {
          this.triggerFunctions.del(data, function (finalizedData) {
            me.edgesData.remove(finalizedData.edges);
            me.nodesData.remove(finalizedData.nodes);
            me._unselectAll();
            me.moving = true;
            me.start();
          });
        }
        else {
          throw new Error('The function for delete does not support two arguments (data, callback)')
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
      alert(this.constants.locales[this.constants.locale]["deleteClusterError"]);
    }
  }
};
