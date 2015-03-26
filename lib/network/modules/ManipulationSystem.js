
let util = require('../../util');
let Hammer = require('../../module/hammer');
let hammerUtil = require('../../hammerUtil');
let locales = require('../locales');

/**
 * clears the toolbar div element of children
 *
 * @private
 */
class ManipulationSystem {
  constructor(body, canvas, selectionHandler) {
    this.body = body;
    this.canvas = canvas;
    this.selectionHandler = selectionHandler;

    this.editMode = false;
    this.manipulationDiv = undefined;
    this.editModeDiv     = undefined;
    this.closeDiv        = undefined;

    this.manipulationHammers = [];
    this.temporaryUIFunctions = {};
    this.temporaryEventFunctions = [];

    this.touchTime = 0;
    this.temporaryIds = {nodes: [], edges:[]};
    this.guiEnabled = false;
    this.selectedControlNode = undefined;

    this.options = {};
    this.defaultOptions = {
      enabled: false,
      initiallyVisible: false,
      locale: 'en',
      locales: locales,
      functionality:{
        addNode: true,
        addEdge: true,
        editNode: true,
        editEdge: true,
        deleteNode: true,
        deleteEdge: true
      },
      handlerFunctions: {
        addNode: undefined,
        addEdge: undefined,
        editNode: undefined,
        editEdge: undefined,
        deleteNode: undefined,
        deleteEdge: undefined
      },
      controlNodeStyle:{
        shape:'dot',
        size:6,
        color: {background: '#ff0000', border: '#3c3c3c', highlight: {background: '#07f968'}},
        borderWidth: 2,
        borderWidthSelected: 2
      }
    }
    util.extend(this.options, this.defaultOptions);
  }


  /**
   * Set the Options
   * @param options
   */
  setOptions(options) {
    if (options !== undefined) {
      if (typeof options == 'boolean') {
        this.options.enabled = options;
      }
      else {
        this.options.enabled = true;
        util.deepExtend(this.options, options);
      }
      if (this.options.initiallyVisible === true) {
        this.editMode = true;
      }
      this._setup();
    }
  }


  /**
   * Enable or disable edit-mode. Draws the DOM required and cleans up after itself.
   *
   * @private
   */
  toggleEditMode() {
    this.editMode = !this.editMode;
    if (this.guiEnabled === true) {
      let toolbar = this.manipulationDiv;
      let closeDiv = this.closeDiv;
      let editModeDiv = this.editModeDiv;
      if (this.editMode === true) {
        toolbar.style.display = "block";
        closeDiv.style.display = "block";
        editModeDiv.style.display = "none";
        this._bindHammerToDiv(closeDiv, this.toggleEditMode.bind(this));
        this.showManipulatorToolbar();
      }
      else {
        toolbar.style.display = "none";
        closeDiv.style.display = "none";
        editModeDiv.style.display = "block";
        this._createEditButton();
      }
    }
  }


  /**
   * Creates the main toolbar. Removes functions bound to the select event. Binds all the buttons of the toolbar.
   *
   * @private
   */
  showManipulatorToolbar() {
    // restore the state of any bound functions or events, remove control nodes, restore physics
    this._clean();

    // reset global letiables
    this.manipulationDOM = {};

    let selectedNodeCount  = this.selectionHandler._getSelectedNodeCount();
    let selectedEdgeCount  = this.selectionHandler._getSelectedEdgeCount();
    let selectedTotalCount = selectedNodeCount + selectedEdgeCount;
    let locale = this.options.locales[this.options.locale];
    let needSeperator = false;

    if (this.options.functionality.addNode === true) {
      this._createAddNodeButton(locale);
      needSeperator = true;
    }
    if (this.options.functionality.addEdge === true) {
      if (needSeperator === true) {this._createSeperator(1);} else {needSeperator = true;}
      this._createAddEdgeButton(locale);
    }

    if (selectedNodeCount === 1 && typeof this.options.handlerFunctions.editNode === 'function' && this.options.functionality.editNode === true) {
      if (needSeperator === true) {this._createSeperator(2);} else {needSeperator = true;}
      this._createEditNodeButton(locale);
    }
    else if (selectedEdgeCount === 1 && selectedNodeCount === 0 && this.options.functionality.editEdge === true) {
      if (needSeperator === true) {this._createSeperator(3);} else {needSeperator = true;}
      this._createEditEdgeButton(locale);
    }

    // remove buttons
    if (selectedTotalCount !== 0) {
      if (selectedNodeCount === 1 && this.options.functionality.deleteNode === true) {
        if (needSeperator === true) {this._createSeperator(4);}
        this._createDeleteButton(locale);
      }
      else if (selectedNodeCount === 0 && this.options.functionality.deleteEdge === true) {
        if (needSeperator === true) {this._createSeperator(4);}
        this._createDeleteButton(locale);
      }
    }

    // bind the close button
    this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));

    // refresh this bar based on what has been selected
    this._temporaryBindEvent('select', this.showManipulatorToolbar.bind(this));

    // redraw to show any possible changes
    this.body.emitter.emit('_redraw');
  }


  /**
   * Create the toolbar for adding Nodes
   *
   * @private
   */
  addNodeMode() {
    // clear the toolbar
    this._clean();

    if (this.guiEnabled === true) {
      let locale = this.options.locales[this.options.locale];
      this.manipulationDOM = {};
      this._createBackButton(locale);
      this._createSeperator();
      this._createDescription(locale['addDescription'])

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));
    }

    this._temporaryBindEvent('click', this._performAddNode.bind(this));
  }

  /**
   * call the bound function to handle the editing of the node. The node has to be selected.
   *
   * @private
   */
  editNode() {
    if (typeof this.options.handlerFunctions.editNode === 'function') {
      let node = this.selectionHandler._getSelectedNode();
      if (node.isCluster !== true) {
        let data = util.deepExtend({}, node.options, true);
        data.x = node.x;
        data.y = node.y;

        if (this.options.handlerFunctions.editNode.length == 2) {
          this.options.handlerFunctions.editNode(data, (finalizedData) => {
            this.body.data.nodes.update(finalizedData);
            this.showManipulatorToolbar();
          });
        }
        else {
          throw new Error('The function for edit does not support two arguments (data, callback)');
        }
      }
      else {
        alert(this.options.locales[this.options.locale]["editClusterError"]);
      }
    }
    else {
      throw new Error('No function has been configured to handle the editing of nodes.');
    }
  }


  /**
   * create the toolbar to connect nodes
   *
   * @private
   */
  addEdgeMode() {
    // _clean the system
    this._clean();

    if (this.guiEnabled === true) {
      let locale = this.options.locales[this.options.locale];
      this.manipulationDOM = {};
      this._createBackButton(locale);
      this._createSeperator();
      this._createDescription(locale['edgeDescription']);

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));
    }

    // temporarily overload functions
    this._temporaryBindUI('onTouch', this._handleConnect.bind(this));
    this._temporaryBindUI('onDragEnd', this._finishConnect.bind(this));
    this._temporaryBindUI('onHold', () => {});
  }

  /**
   * create the toolbar to edit edges
   *
   * @private
   */
  editEdgeMode() {
    // clear the system
    this._clean();

    if (this.guiEnabled === true) {
      let locale = this.options.locales[this.options.locale];
      this.manipulationDOM = {};
      this._createBackButton(locale);
      this._createSeperator();
      this._createDescription(locale['editEdgeDescription']);

      // bind the close button
      this._bindHammerToDiv(this.closeDiv, this.toggleEditMode.bind(this));
    }

    this.edgeBeingEditedId = this.selectionHandler.getSelectedEdges()[0];
    let edge = this.body.edges[this.edgeBeingEditedId];

    // create control nodes
    let controlNodeFrom = this._getNewTargetNode(edge.from.x, edge.from.y);
    let controlNodeTo   = this._getNewTargetNode(edge.to.x,   edge.to.y);

    this.temporaryIds.nodes.push(controlNodeFrom.id);
    this.temporaryIds.nodes.push(controlNodeTo.id);

    this.body.nodes[controlNodeFrom.id] = controlNodeFrom;
    this.body.nodeIndices.push(controlNodeFrom.id);
    this.body.nodes[controlNodeTo.id] = controlNodeTo;
    this.body.nodeIndices.push(controlNodeTo.id);

    // temporarily overload UI functions, cleaned up automatically because of _temporaryBindUI
    this._temporaryBindUI('onTouch',     this._controlNodeTouch.bind(this));    // used to get the position
    this._temporaryBindUI('onTap',       () => {});                             // disabled
    this._temporaryBindUI('onHold',      () => {});                             // disabled
    this._temporaryBindUI('onDragStart', this._controlNodeDragStart.bind(this));// used to select control node
    this._temporaryBindUI('onDrag',      this._controlNodeDrag.bind(this));     // used to drag control node
    this._temporaryBindUI('onDragEnd',   this._controlNodeDragEnd.bind(this));  // used to connect or revert control nodes
    this._temporaryBindUI('onMouseMove', () => {});                             // disabled

    // create function to position control nodes correctly on movement
    // automatically cleaned up because we use the temporary bind
    this._temporaryBindEvent('beforeDrawing', (ctx) => {
      let positions = edge.edgeType.findBorderPositions(ctx);
      if (controlNodeFrom.selected === false) {
        controlNodeFrom.x = positions.from.x;
        controlNodeFrom.y = positions.from.y;
      }
      if (controlNodeTo.selected === false) {
        controlNodeTo.x = positions.to.x;
        controlNodeTo.y = positions.to.y;
      }
    });

    this.body.emitter.emit('_redraw');
  }

  /**
   * delete everything in the selection
   *
   * @private
   */
  deleteSelected() {
    let selectedNodes = this.selectionHandler.getSelectedNodes();
    let selectedEdges = this.selectionHandler.getSelectedEdges();
    let deleteFunction = undefined;
    if (selectedNodes.length > 0) {
      for (let i = 0; i < selectedNodes.length; i++) {
        if (this.body.nodes[selectedNodes[i]].isCluster === true) {
          alert(this.options.locales[this.options.locale]["deleteClusterError"]);
          return;
        }
      }

      if (typeof this.options.handlerFunctions.deleteNode === 'function') {
        deleteFunction = this.options.handlerFunctions.deleteNode;
      }
    }
    else if (selectedEdges.length > 0) {
      if (typeof this.options.handlerFunctions.deleteEdge === 'function') {
        deleteFunction = this.options.handlerFunctions.deleteEdge;
      }
    }

    if (typeof deleteFunction === 'function') {
      let data = {nodes: selectedNodes, edges: selectedEdges};
      if (deleteFunction.length == 2) {
        deleteFunction(data, (finalizedData) => {
          this.body.data.edges.remove(finalizedData.edges);
          this.body.data.nodes.remove(finalizedData.nodes);
          this.body.emitter.emit("startSimulation");
        });
      }
      else {
        throw new Error('The function for delete does not support two arguments (data, callback)')
      }
    }
    else {
      this.body.data.edges.remove(selectedEdges);
      this.body.data.nodes.remove(selectedNodes);
      this.body.emitter.emit("startSimulation");
    }
  }




  //********************************************** PRIVATE ***************************************//

  /**
   * draw or remove the DOM
   * @private
   */
  _setup() {
    if (this.options.enabled === true) {
      // Enable the GUI
      this.guiEnabled = true;

      // remove override
      this.selectionHandler.forceSelectEdges = true;

      this._createWrappers();
      if (this.editMode === false) {
        this._createEditButton();
      }
      else {
        this.showManipulatorToolbar();
      }
    }
    else {
      this._removeManipulationDOM();

      // disable the gui
      this.guiEnabled = false;
    }
  }


  /**
   * create the div overlays that contain the DOM
   * @private
   */
  _createWrappers() {
    // load the manipulator HTML elements. All styling done in css.
    if (this.manipulationDiv === undefined) {
      this.manipulationDiv = document.createElement('div');
      this.manipulationDiv.className = 'network-manipulationDiv';
      if (this.editMode === true) {
        this.manipulationDiv.style.display = "block";
      }
      else {
        this.manipulationDiv.style.display = "none";
      }
      this.canvas.frame.appendChild(this.manipulationDiv);
    }

    // container for the edit button.
    if (this.editModeDiv === undefined) {
      this.editModeDiv = document.createElement('div');
      this.editModeDiv.className = 'network-manipulation-editMode';
      if (this.editMode === true) {
        this.editModeDiv.style.display = "none";
      }
      else {
        this.editModeDiv.style.display = "block";
      }
      this.canvas.frame.appendChild(this.editModeDiv);
    }


    // container for the close div button
    if (this.closeDiv === undefined) {
      this.closeDiv = document.createElement('div');
      this.closeDiv.className = 'network-manipulation-closeDiv';
      this.closeDiv.style.display = this.manipulationDiv.style.display;
      this.canvas.frame.appendChild(this.closeDiv);
    }
  }


  /**
   * generate a new target node. Used for creating new edges and editing edges
   * @param x
   * @param y
   * @returns {*}
   * @private
   */
  _getNewTargetNode(x,y) {
    let controlNodeStyle = util.deepExtend({}, this.options.controlNodeStyle);

    controlNodeStyle.id = 'targetNode' + util.randomUUID();
    controlNodeStyle.hidden = false;
    controlNodeStyle.physics = false;
    controlNodeStyle.x = x;
    controlNodeStyle.y = y;

    return this.body.functions.createNode(controlNodeStyle);
  }


  /**
   * Create the edit button
   */
  _createEditButton() {
    // restore everything to it's original state (if applicable)
    this._clean();

    // reset the manipulationDOM
    this.manipulationDOM = {};

    // empty the editModeDiv
    util.recursiveDOMDelete(this.editModeDiv);

    // create the contents for the editMode button
    let locale = this.options.locales[this.options.locale];
    let button = this._createButton('editMode', 'network-manipulationUI edit editmode', locale['edit']);
    this.editModeDiv.appendChild(button);

    // bind a hammer listener to the button, calling the function toggleEditMode.
    this._bindHammerToDiv(button, this.toggleEditMode.bind(this));
  }


  /**
   * this function cleans up after everything this module does. Temporary elements, functions and events are removed, physics restored, hammers removed.
   * @private
   */
  _clean() {
    // _clean the divs
    if (this.guiEnabled === true) {
      util.recursiveDOMDelete(this.editModeDiv);
      util.recursiveDOMDelete(this.manipulationDiv);

      // removes all the bindings and overloads
      this._cleanManipulatorHammers();
    }

    // remove temporary nodes and edges
    this._cleanupTemporaryNodesAndEdges();

    // restore overloaded UI functions
    this._unbindTemporaryUIs();

    // remove the temporaryEventFunctions
    this._unbindTemporaryEvents();

    // restore the physics if required
    this.body.emitter.emit("restorePhysics");
  }


  /**
   * Each dom element has it's own hammer. They are stored in this.manipulationHammers. This cleans them up.
   * @private
   */
  _cleanManipulatorHammers() {
    // _clean hammer bindings
    if (this.manipulationHammers.length != 0) {
      for (let i = 0; i < this.manipulationHammers.length; i++) {
        this.manipulationHammers[i].destroy();
      }
      this.manipulationHammers = [];
    }
  }


  /**
   * Remove all DOM elements created by this module.
   * @private
   */
  _removeManipulationDOM() {
    // removes all the bindings and overloads
    this._clean();

    // empty the manipulation divs
    util.recursiveDOMDelete(this.manipulationDiv);
    util.recursiveDOMDelete(this.editModeDiv);
    util.recursiveDOMDelete(this.closeDiv);

    // remove the manipulation divs
    this.canvas.frame.removeChild(this.manipulationDiv);
    this.canvas.frame.removeChild(this.editModeDiv);
    this.canvas.frame.removeChild(this.closeDiv);

    // set the references to undefined
    this.manipulationDiv = undefined;
    this.editModeDiv = undefined;
    this.closeDiv = undefined;

    // remove override
    this.selectionHandler.forceSelectEdges = false;
  }


  /**
   * create a seperator line. the index is to differentiate in the manipulation dom
   * @param index
   * @private
   */
  _createSeperator(index = 1) {
    this.manipulationDOM['seperatorLineDiv' + index] = document.createElement('div');
    this.manipulationDOM['seperatorLineDiv' + index].className = 'network-seperatorLine';
    this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv' + index]);
  }

  // ----------------------    DOM functions for buttons    --------------------------//

  _createAddNodeButton(locale) {
    let button = this._createButton('addNode', 'network-manipulationUI add', locale['addNode']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.addNodeMode.bind(this));
  }

  _createAddEdgeButton(locale) {
    let button = this._createButton('addEdge', 'network-manipulationUI connect',  locale['addEdge']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.addEdgeMode.bind(this));
  }

  _createEditNodeButton(locale) {
    let button = this._createButton('editNode', 'network-manipulationUI edit', locale['editNode']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.editNode.bind(this));
  }

  _createEditEdgeButton(locale) {
    let button = this._createButton('editEdge', 'network-manipulationUI edit',  locale['editEdge']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.editEdgeMode.bind(this));
  }

  _createDeleteButton(locale) {
    let button = this._createButton('delete', 'network-manipulationUI delete', locale['del']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.deleteSelected.bind(this));
  }

  _createBackButton(locale) {
    let button = this._createButton('back', 'network-manipulationUI back', locale['back']);
    this.manipulationDiv.appendChild(button);
    this._bindHammerToDiv(button, this.showManipulatorToolbar.bind(this));
  }

  _createButton(id, className, label, labelClassName = 'network-manipulationLabel') {
    this.manipulationDOM[id+"Div"] = document.createElement('div');
    this.manipulationDOM[id+"Div"].className = className;
    this.manipulationDOM[id+"Label"] = document.createElement('div');
    this.manipulationDOM[id+"Label"].className = labelClassName;
    this.manipulationDOM[id+"Label"].innerHTML = label;
    this.manipulationDOM[id+"Div"].appendChild(this.manipulationDOM[id+'Label']);
    return this.manipulationDOM[id+"Div"];
  }

  _createDescription(label) {
    this.manipulationDiv.appendChild(
      this._createButton('description', 'network-manipulationUI none', label)
    );
  }

  // -------------------------- End of DOM functions for buttons ------------------------------//

  /**
   * this binds an event until cleanup by the clean functions.
   * @param event
   * @param newFunction
   * @private
   */
  _temporaryBindEvent(event, newFunction) {
    this.temporaryEventFunctions.push({event:event, boundFunction:newFunction});
    this.body.emitter.on(event, newFunction);
  }

  /**
   * this overrides an UI function until cleanup by the clean function
   * @param UIfunctionName
   * @param newFunction
   * @private
   */
  _temporaryBindUI(UIfunctionName, newFunction) {
    if (this.body.eventListeners[UIfunctionName] !== undefined) {
      this.temporaryUIFunctions[UIfunctionName] = this.body.eventListeners[UIfunctionName];
      this.body.eventListeners[UIfunctionName] = newFunction;
    }
    else {
      throw new Error('This UI function does not exist. Typo? You tried: "' + UIfunctionName + '" possible are: ' + JSON.stringify(Object.keys(this.body.eventListeners)));
    }
  }

  /**
   * Restore the overridden UI functions to their original state.
   *
   * @private
   */
  _unbindTemporaryUIs() {
    for (let functionName in this.temporaryUIFunctions) {
      if (this.temporaryUIFunctions.hasOwnProperty(functionName)) {
        this.body.eventListeners[functionName] = this.temporaryUIFunctions[functionName];
        delete this.temporaryUIFunctions[functionName];
      }
    }
    this.temporaryUIFunctions = {};
  }

  /**
   * Unbind the events created by _temporaryBindEvent
   * @private
   */
  _unbindTemporaryEvents() {
    for (let i = 0; i < this.temporaryEventFunctions.length; i++) {
      let eventName = this.temporaryEventFunctions[i].event;
      let boundFunction = this.temporaryEventFunctions[i].boundFunction;
      this.body.emitter.off(eventName, boundFunction);
    }
    this.temporaryEventFunctions = [];
  }

  /**
   * Bind an hammer instance to a DOM element.
   * @param domElement
   * @param funct
   */
  _bindHammerToDiv(domElement, boundFunction) {
    let hammer = new Hammer(domElement, {});
    hammerUtil.onTouch(hammer, boundFunction);
    this.manipulationHammers.push(hammer);
  }


  /**
   * Neatly clean up temporary edges and nodes
   * @private
   */
  _cleanupTemporaryNodesAndEdges() {
    // _clean temporary edges
    for (let i = 0; i < this.temporaryIds.edges.length; i++) {
      this.body.edges[this.temporaryIds.edges[i]].disconnect();
      delete this.body.edges[this.temporaryIds.edges[i]];
      let indexTempEdge = this.body.edgeIndices.indexOf(this.temporaryIds.edges[i]);
      if (indexTempEdge !== -1) {this.body.edgeIndices.splice(indexTempEdge,1);}
    }

    // _clean temporary nodes
    for (let i = 0; i < this.temporaryIds.nodes.length; i++) {
      delete this.body.nodes[this.temporaryIds.nodes[i]];
      let indexTempNode = this.body.nodeIndices.indexOf(this.temporaryIds.nodes[i]);
      if (indexTempNode !== -1) {this.body.nodeIndices.splice(indexTempNode,1);}
    }

    this.temporaryIds = {nodes: [], edges: []};
  }

  // ------------------------------------------ EDIT EDGE FUNCTIONS -----------------------------------------//

  /**
   * the touch is used to get the position of the initial click
   * @param event
   * @private
   */
  _controlNodeTouch(event) {
    this.lastTouch = this.body.functions.getPointer(event.center);
    this.lastTouch.translation = util.extend({},this.body.view.translation); // copy the object
  }


  /**
   * the drag start is used to mark one of the control nodes as selected.
   * @param event
   * @private
   */
  _controlNodeDragStart(event) {
    let pointer = this.lastTouch;
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);
    let from = this.body.nodes[this.temporaryIds.nodes[0]];
    let to   = this.body.nodes[this.temporaryIds.nodes[1]];
    let edge = this.body.edges[this.edgeBeingEditedId];
    this.selectedControlNode = undefined;

    let fromSelect = from.isOverlappingWith(pointerObj);
    let toSelect = to.isOverlappingWith(pointerObj);

    if (fromSelect === true) {
      this.selectedControlNode = from;
      edge.edgeType.from = from;
    }
    else if (toSelect === true) {
      this.selectedControlNode = to;
      edge.edgeType.to = to;
    }

    this.body.emitter.emit("_redraw");
  }

  /**
   * dragging the control nodes or the canvas
   * @param event
   * @private
   */
  _controlNodeDrag(event) {
    this.body.emitter.emit("disablePhysics");
    let pointer = this.body.functions.getPointer(event.center);
    let pos = this.canvas.DOMtoCanvas(pointer);

    if (this.selectedControlNode !== undefined) {
      this.selectedControlNode.x = pos.x;
      this.selectedControlNode.y = pos.y;
    }
    else {
      // if the drag was not started properly because the click started outside the network div, start it now.
      let diffX = pointer.x - this.lastTouch.x;
      let diffY = pointer.y - this.lastTouch.y;
      this.body.view.translation = {x:this.lastTouch.translation.x + diffX, y:this.lastTouch.translation.y + diffY};
    }
    this.body.emitter.emit("_redraw");
  }


  /**
   * connecting or restoring the control nodes.
   * @param event
   * @private
   */
  _controlNodeDragEnd(event) {
    let pointer = this.body.functions.getPointer(event.center);
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);
    let edge = this.body.edges[this.edgeBeingEditedId];

    let overlappingNodeIds = this.selectionHandler._getAllNodesOverlappingWith(pointerObj);
    let node = undefined;
    for (let i = overlappingNodeIds.length-1; i >= 0; i--) {
      if (overlappingNodeIds[i] !== this.selectedControlNode.id) {
        node = this.body.nodes[overlappingNodeIds[i]];
        break;
      }
    }

    // perform the connection
    if (node !== undefined && this.selectedControlNode !== undefined) {
      if (node.isCluster === true) {
        alert(this.options.locales[this.options.locale]["createEdgeError"])
      }
      else {
        let from = this.body.nodes[this.temporaryIds.nodes[0]];
        if (this.selectedControlNode.id == from.id) {
          this._performEditEdge(node.id, edge.to.id);
        }
        else {
          this._performEditEdge(edge.from.id, node.id);
        }
      }
    }
    else {
      edge.updateEdgeType();
      this.body.emitter.emit("restorePhysics");
    }
    this.body.emitter.emit("_redraw");
  }

  // ------------------------------------ END OF EDIT EDGE FUNCTIONS -----------------------------------------//



  // ------------------------------------------- ADD EDGE FUNCTIONS -----------------------------------------//
  /**
   * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
   * to walk the user through the process.
   *
   * @private
   */
  _handleConnect(event) {
    // check to avoid double fireing of this function.
    if (new Date().valueOf() - this.touchTime > 100) {
      let pointer = this.body.functions.getPointer(event.center);
      let node = this.selectionHandler.getNodeAt(pointer);

      if (node !== undefined) {
        if (node.isCluster === true) {
          alert(this.options.locales[this.options.locale]['createEdgeError'])
        }
        else {
          // create a node the temporary line can look at
          let targetNode = this._getNewTargetNode(node.x,node.y);
          let targetNodeId = targetNode.id;
          this.body.nodes[targetNode.id] = targetNode;
          this.body.nodeIndices.push(targetNode.id);

          // create a temporary edge
          let connectionEdge = this.body.functions.createEdge({
            id: "connectionEdge" + util.randomUUID(),
            from: node.id,
            to: targetNode.id,
            physics:false,
            smooth: {
              enabled: true,
              dynamic: false,
              type: "continuous",
              roundness: 0.5
            }
          });
          this.body.edges[connectionEdge.id] = connectionEdge;
          this.body.edgeIndices.push(connectionEdge.id);

          this.temporaryIds.nodes.push(targetNode.id);
          this.temporaryIds.edges.push(connectionEdge.id);

          this.temporaryUIFunctions["onDrag"] = this.body.eventListeners.onDrag;
          this.body.eventListeners.onDrag = (event) => {
            let pointer = this.body.functions.getPointer(event.center);
            let targetNode = this.body.nodes[targetNodeId];
            targetNode.x = this.canvas._XconvertDOMtoCanvas(pointer.x);
            targetNode.y = this.canvas._YconvertDOMtoCanvas(pointer.y);
            this.body.emitter.emit("_redraw");
          }
        }
      }
      this.touchTime = new Date().valueOf();

      // do the original touch events
      this.temporaryUIFunctions["onTouch"](event);
    }
  }

  /**
   * Connect the new edge to the target if one exists, otherwise remove temp line
   * @param event
   * @private
   */
  _finishConnect(event) {
    let pointer = this.body.functions.getPointer(event.center);
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);

    // remember the edge id
    let connectFromId = undefined;
    if (this.temporaryIds.edges[0] !== undefined) {
      connectFromId = this.body.edges[this.temporaryIds.edges[0]].fromId;
    }

    //restore the drag function
    if (this.temporaryUIFunctions["onDrag"] !== undefined) {
      this.body.eventListeners.onDrag = this.temporaryUIFunctions["onDrag"];
      delete this.temporaryUIFunctions["onDrag"];
    }

    // get the overlapping node but NOT the temporary node;
    let overlappingNodeIds = this.selectionHandler._getAllNodesOverlappingWith(pointerObj);
    let node = undefined;
    for (let i = overlappingNodeIds.length-1; i >= 0; i--) {
      if (this.temporaryIds.nodes.indexOf(overlappingNodeIds[i]) !== -1) {
        node = this.body.nodes[overlappingNodeIds[i]];
        break;
      }
    }

    // clean temporary nodes and edges.
    this._cleanupTemporaryNodesAndEdges();

    // perform the connection
    if (node !== undefined) {
      if (node.isCluster === true) {
        alert(this.options.locales[this.options.locale]["createEdgeError"]);
      }
      else {
        if (this.body.nodes[connectFromId] !== undefined && this.body.nodes[node.id] !== undefined) {
          this._performCreateEdge(connectFromId, node.id);
        }
      }
    }
    this.body.emitter.emit("_redraw");
  }

  // --------------------------------------- END OF ADD EDGE FUNCTIONS -------------------------------------//


  // ------------------------------ Performing all the actual data manipulation ------------------------//

  /**
   * Adds a node on the specified location
   */
  _performAddNode(clickData) {
    let defaultData = {
      id: util.randomUUID(),
      x: clickData.pointer.canvas.x,
      y: clickData.pointer.canvas.y,
      label: "new"
    };

    if (typeof this.options.handlerFunctions.addNode === 'function') {
      if (this.options.handlerFunctions.addNode.length == 2) {
        this.options.handlerFunctions.addNode(defaultData, (finalizedData) => {
          this.body.data.nodes.add(finalizedData);
          this.showManipulatorToolbar();
        });
      }
      else {
        throw new Error('The function for add does not support two arguments (data,callback)');
        this.showManipulatorToolbar();
      }
    }
    else {
      this.body.data.nodes.add(defaultData);
      this.showManipulatorToolbar();
    }
  }


  /**
   * connect two nodes with a new edge.
   *
   * @private
   */
  _performCreateEdge(sourceNodeId, targetNodeId) {
    let defaultData = {from: sourceNodeId, to: targetNodeId};
    if (this.options.handlerFunctions.addEdge) {
      if (this.options.handlerFunctions.addEdge.length == 2) {
        this.options.handlerFunctions.addEdge(defaultData, (finalizedData) => {
          this.body.data.edges.add(finalizedData);
          this.selectionHandler.unselectAll();
          this.showManipulatorToolbar();
        });
      }
      else {
        throw new Error('The function for connect does not support two arguments (data,callback)');
      }
    }
    else {
      this.body.data.edges.add(defaultData);
      this.selectionHandler.unselectAll();
      this.showManipulatorToolbar();
    }
  }

  /**
   * connect two nodes with a new edge.
   *
   * @private
   */
  _performEditEdge(sourceNodeId, targetNodeId) {
    let defaultData = {id: this.edgeBeingEditedId, from: sourceNodeId, to: targetNodeId};
    if (this.options.handlerFunctions.editEdge) {
      if (this.options.handlerFunctions.editEdge.length == 2) {
        this.options.handlerFunctions.editEdge(defaultData, (finalizedData) => {
          this.body.data.edges.update(finalizedData);
          this.selectionHandler.unselectAll();
          this.showManipulatorToolbar();
        });
      }
      else {
        throw new Error('The function for edit does not support two arguments (data, callback)');
      }
    }
    else {
      this.body.data.edges.update(defaultData);
      this.selectionHandler.unselectAll();
      this.showManipulatorToolbar();
    }
  }


}

export default ManipulationSystem;
  
