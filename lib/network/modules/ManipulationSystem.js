
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
    this.boundFunction   = undefined;
    this.manipulationHammers = [];
    this.cachedFunctions = {};
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
      }
    }
    util.extend(this.options, this.defaultOptions);
  }

  setOptions(options) {
    if (options !== undefined) {
      if (typeof options == 'boolean') {
        this.options.enabled = options;
      }
      else {
        this.options.enabled = true;
        for (let prop in options) {
          if (options.hasOwnProperty(prop)) {
            this.options[prop] = options[prop];
          }
        }
      }
      if (this.options.initiallyVisible === true) {
        this.editMode = true;
      }
      this.init();
    }
  }

  init() {
    if (this.options.enabled === true) {
      // Enable the GUI
      this.guiEnabled = true;

      // remove override
      this.selectionHandler.forceSelectEdges = true;

      this.createWrappers();
      if (this.editMode === false) {
        this.createEditButton();
      }
      else {
        this.createManipulatorBar();
      }
    }
    else {
      this.removeManipulationDOM();

      // disable the gui
      this.guiEnabled = false;
    }
  }

  createWrappers() {
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

    if (this.closeDiv === undefined) {
      this.closeDiv = document.createElement('div');
      this.closeDiv.className = 'network-manipulation-closeDiv';
      this.closeDiv.style.display = this.manipulationDiv.style.display;
      this.canvas.frame.appendChild(this.closeDiv);
    }
  }


  /**
   * Create the edit button
   */
  createEditButton() {
    // restore everything to it's original state (if applicable)
    this._clean();

    // reset the manipulationDOM
    this.manipulationDOM = {};

    // empty the editModeDiv
    util.recursiveDOMDelete(this.editModeDiv);

    // create the contents for the editMode button
    let locale = this.options.locales[this.options.locale];
    let button = this.createButton('editMode', 'network-manipulationUI edit editmode', locale['edit']);
    this.editModeDiv.appendChild(button);

    // bind a hammer listener to the button, calling the function toggleEditMode.
    this.bindHammerToDiv(button, 'toggleEditMode');
  }


  removeManipulationDOM() {
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

  //clearManipulatorBar() {
  //  util._recursiveDOMDelete(this.manipulationDiv);
  //  this.manipulationDOM = {};
  //  this._cleanManipulatorHammers();
  //  this._manipulationReleaseOverload();
  //}


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
   * Manipulation UI temporarily overloads certain functions to extend or replace them. To be able to restore
   * these functions to their original functionality, we saved them in this.cachedFunctions.
   * This function restores these functions to their original function.
   *
   * @private
   */
  _restoreOverloadedFunctions() {
    for (let functionName in this.cachedFunctions) {
      if (this.cachedFunctions.hasOwnProperty(functionName)) {
        this.body.eventListeners[functionName] = this.cachedFunctions[functionName];
        delete this.cachedFunctions[functionName];
      }
    }
    this.cachedFunctions = {};
  }

  /**
   * Enable or disable edit-mode.
   *
   * @private
   */
  toggleEditMode() {
    this.editMode = !this.editMode;
    let toolbar = this.manipulationDiv;
    let closeDiv = this.closeDiv;
    let editModeDiv = this.editModeDiv;
    if (this.editMode === true) {
      toolbar.style.display = "block";
      closeDiv.style.display = "block";
      editModeDiv.style.display = "none";
      this.bindHammerToDiv(closeDiv, 'toggleEditMode');
      this.createManipulatorBar();
    }
    else {
      toolbar.style.display = "none";
      closeDiv.style.display = "none";
      editModeDiv.style.display = "block";
      this.createEditButton();
    }

  }

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
    this._restoreOverloadedFunctions();

    // remove the boundFunction
    if (this.boundFunction !== undefined) {
      this.body.emitter.off(this.boundFunction.event, this.boundFunction.fn);
    }
    this.boundFunction = undefined;
  }

  createSeperator(index = 1) {
    this.manipulationDOM['seperatorLineDiv' + index] = document.createElement('div');
    this.manipulationDOM['seperatorLineDiv' + index].className = 'network-seperatorLine';
    this.manipulationDiv.appendChild(this.manipulationDOM['seperatorLineDiv' + index]);
  }

  createAddNodeButton(locale) {
    let button = this.createButton('addNode', 'network-manipulationUI add', locale['addNode']);
    this.manipulationDiv.appendChild(button);
    this.bindHammerToDiv(button, 'addNodeMode');
  }

  createAddEdgeButton(locale) {
    let button = this.createButton('addEdge', 'network-manipulationUI connect',  locale['addEdge']);
    this.manipulationDiv.appendChild(button);
    this.bindHammerToDiv(button, 'addEdgeMode');
  }

  createEditNodeButton(locale) {
    let button = this.createButton('editNode', 'network-manipulationUI edit', locale['editNode']);
    this.manipulationDiv.appendChild(button);
    this.bindHammerToDiv(button, '_editNode');
  }

  createEditEdgeButton(locale) {
    let button = this.createButton('editEdge', 'network-manipulationUI edit',  locale['editEdge']);
    this.manipulationDiv.appendChild(button);
    this.bindHammerToDiv(button, 'editEdgeMode');
  }

  createDeleteButton(locale) {
    let button = this.createButton('delete', 'network-manipulationUI delete', locale['del']);
    this.manipulationDiv.appendChild(button);
    this.bindHammerToDiv(button, 'deleteSelected');
  }

  createBackButton(locale) {
    let button = this.createButton('back', 'network-manipulationUI back', locale['back']);
    this.manipulationDiv.appendChild(button);
    this.bindHammerToDiv(button, 'createManipulatorBar');
  }

  createDescription(label) {
    this.manipulationDiv.appendChild(
      this.createButton('description', 'network-manipulationUI none', label)
    );
  }

  createButton(id, className, label, labelClassName = 'network-manipulationLabel') {
    this.manipulationDOM[id+"Div"] = document.createElement('div');
    this.manipulationDOM[id+"Div"].className = className;
    this.manipulationDOM[id+"Label"] = document.createElement('div');
    this.manipulationDOM[id+"Label"].className = labelClassName;
    this.manipulationDOM[id+"Label"].innerHTML = label;
    this.manipulationDOM[id+"Div"].appendChild(this.manipulationDOM[id+'Label']);
    return this.manipulationDOM[id+"Div"];
  }

  temporaryBind(fn, event) {
    this.boundFunction = {fn:fn.bind(this), event};
    this.body.emitter.on(event, this.boundFunction.fn);
  }

  /**
   * main function, creates the main toolbar. Removes functions bound to the select event. Binds all the buttons of the toolbar.
   *
   * @private
   */
  createManipulatorBar() {
    this._clean();

    // resume calculation
    this.body.emitter.emit("restorePhysics");

    // reset global letiables
    this.manipulationDOM = {};

    let selectedNodeCount = this.selectionHandler._getSelectedNodeCount();
    let selectedEdgeCount = this.selectionHandler._getSelectedEdgeCount();
    let selectedTotalCount = selectedNodeCount + selectedEdgeCount;
    let locale = this.options.locales[this.options.locale];
    let needSeperator = false;

    if (this.options.functionality.addNode === true) {
      this.createAddNodeButton(locale);
      needSeperator = true;
    }
    if (this.options.functionality.addEdge === true) {
      if (needSeperator === true) {this.createSeperator(1);} else {needSeperator = true;}
      this.createAddEdgeButton(locale);
    }

    if (selectedNodeCount === 1 && typeof this.options.handlerFunctions.editNode === 'function' && this.options.functionality.editNode === true) {
      if (needSeperator === true) {this.createSeperator(2);} else {needSeperator = true;}
      this.createEditNodeButton(locale);
    }
    else if (selectedEdgeCount === 1 && selectedNodeCount === 0 && this.options.functionality.editEdge === true) {
      if (needSeperator === true) {this.createSeperator(3);} else {needSeperator = true;}
      this.createEditEdgeButton(locale);
    }

    // remove buttons
    if (selectedTotalCount !== 0) {
      if (selectedNodeCount === 1 && this.options.functionality.deleteNode === true) {
        if (needSeperator === true) {this.createSeperator(4);}
        this.createDeleteButton(locale);
      }
      else if (selectedNodeCount === 0 && this.options.functionality.deleteEdge === true) {
        if (needSeperator === true) {this.createSeperator(4);}
        this.createDeleteButton(locale);
      }
    }

    // bind the close button
    this.bindHammerToDiv(this.closeDiv, 'toggleEditMode');

    // refresh this bar based on what has been selected
    this.temporaryBind(this.createManipulatorBar,'select');
  }

  /**
   * Bind an hammer instance to a DOM element. TODO: remove the double check.
   * @param domElement
   * @param funct
   */
  bindHammerToDiv(domElement, funct) {
    let hammer = new Hammer(domElement, {});
    hammerUtil.onTouch(hammer, this[funct].bind(this));
    this.manipulationHammers.push(hammer);
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
      this.createBackButton(locale);
      this.createSeperator();
      this.createDescription(locale['addDescription'])

      // bind the close button
      this.bindHammerToDiv(this.closeDiv, 'toggleEditMode');
    }

    this.temporaryBind(this._addNode,'click');
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
      this.createBackButton(locale);
      this.createSeperator();
      this.createDescription(locale['edgeDescription']);

      // bind the close button
      this.bindHammerToDiv(this.closeDiv, 'toggleEditMode');
    }

    // temporarily overload functions
    this.cachedFunctions["onTouch"] = this.body.eventListeners.onTouch;
    this.cachedFunctions["onDragEnd"] = this.body.eventListeners.onDragEnd;
    this.cachedFunctions["onHold"] = this.body.eventListeners.onHold;

    this.body.eventListeners.onTouch = this._handleConnect.bind(this);
    this.body.eventListeners.onDragEnd = this._finishConnect.bind(this);
    this.body.eventListeners.onHold = function () {};
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
      this.createBackButton(locale);
      this.createSeperator();
      this.createDescription(locale['editEdgeDescription']);

      // bind the close button
      this.bindHammerToDiv(this.closeDiv, 'toggleEditMode');
    }

    this.edgeBeingEditedId = this.selectionHandler.getSelectedEdges()[0];
    let edge = this.body.edges[this.edgeBeingEditedId];

    // create control nodes
    let controlNodeFrom = this.body.functions.createNode(this.getTargetNodeProperties(edge.from.x, edge.from.y));
    let controlNodeTo = this.body.functions.createNode(this.getTargetNodeProperties(edge.to.x, edge.to.y));

    this.temporaryIds.nodes.push(controlNodeFrom.id);
    this.temporaryIds.nodes.push(controlNodeTo.id);

    this.body.nodes[controlNodeFrom.id] = controlNodeFrom;
    this.body.nodeIndices.push(controlNodeFrom.id);
    this.body.nodes[controlNodeTo.id] = controlNodeTo;
    this.body.nodeIndices.push(controlNodeTo.id);

    // temporarily overload functions
    this.cachedFunctions['onTouch']     = this.body.eventListeners.onTouch;
    this.cachedFunctions['onTap']       = this.body.eventListeners.onTap;
    this.cachedFunctions['onHold']      = this.body.eventListeners.onHold;
    this.cachedFunctions['onDragStart'] = this.body.eventListeners.onDragStart;
    this.cachedFunctions['onDrag']      = this.body.eventListeners.onDrag;
    this.cachedFunctions['onDragEnd']   = this.body.eventListeners.onDragEnd;
    this.cachedFunctions['onMouseOver'] = this.body.eventListeners.onMouseOver;

    this.body.eventListeners.onTouch    = this._controlNodeTouch.bind(this);
    this.body.eventListeners.onTap      = function() {};
    this.body.eventListeners.onHold     = function() {};
    this.body.eventListeners.onDragStart= this._controlNodeDragStart.bind(this);
    this.body.eventListeners.onDrag     = this._controlNodeDrag.bind(this);
    this.body.eventListeners.onDragEnd  = this._controlNodeDragEnd.bind(this);
    this.body.eventListeners.onMouseOver= function() {}

    // create function to position control nodes correctly on movement
    let positionControlNodes = (ctx) => {
      let positions = edge.edgeType.findBorderPositions(ctx);
      if (controlNodeFrom.selected === false) {
        controlNodeFrom.x = positions.from.x;
        controlNodeFrom.y = positions.from.y;
      }
      if (controlNodeTo.selected === false) {
        controlNodeTo.x = positions.to.x;
        controlNodeTo.y = positions.to.y;
      }
    }
    this.temporaryBind(positionControlNodes, "beforeDrawing");

    this.body.emitter.emit("_redraw");
  }

  _controlNodeTouch(event) {
    this.lastTouch = this.body.functions.getPointer(event.center);
    this.lastTouch.translation = util.extend({},this.body.view.translation); // copy the object
  }


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
          this._editEdge(node.id, edge.to.id);
        }
        else {
          this._editEdge(edge.from.id, node.id);
        }
      }
    }
    else {
      edge.updateEdgeType();
      this.body.emitter.emit("restorePhysics");
    }
    this.body.emitter.emit("_redraw");
  }
  /**
   * the function bound to the selection event. It checks if you want to connect a cluster and changes the description
   * to walk the user through the process.
   *
   * @private
   */
  _selectControlNode(event) {

  }


  /**
   *
   * @param pointer
   * @private
   */
  _releaseControlNode(pointer) {
    if (new Date().valueOf() - this.touchTime > 100) {
      console.log("release")
      // perform the connection
      let node = this.selectionHandler.getNodeAt(pointer);
      if (node !== undefined) {
        if (node.isCluster === true) {
          alert(this.options.locales[this.options.locale]["createEdgeError"])
        }
        else {
          let edge = this.body.edges[this.edgeBeingEditedId];

          let targetNodeId = undefined;
          if (edge.to.selected === true) {
            targetNodeId = edge.toId;
          }
          else if (edge.from.selected === true) {
            targetNodeId = edge.fromId;
          }

          //this.body.eventListeners.onDrag = this.cachedFunctions["onDrag"];
          //this.body.eventListeners.onRelease = this.cachedFunctions["onRelease"];
          //delete this.cachedFunctions["onRelease"];
          //delete this.cachedFunctions["onDrag"];
          ////
          //
          //
          //
          //
          //
          //
          //if (this.body.nodes[connectFromId] !== undefined && this.body.nodes[node.id] !== undefined) {
          //  this._createEdge(connectFromId, node.id);
          //}
        }
      }
      this.body.emitter.emit("_redraw");
      //this.body.emitter.emit("_redraw");
      //let newNode = this.getNodeAt(pointer);
      //if (newNode !== undefined) {
      //  if (this.edgeBeingEditedId.controlNodes.from.selected == true) {
      //    this.edgeBeingEditedId._restoreControlNodes();
      //    this._editEdge(newNode.id, this.edgeBeingEditedId.to.id);
      //    this.edgeBeingEditedId.controlNodes.from.unselect();
      //  }
      //  if (this.edgeBeingEditedId.controlNodes.to.selected == true) {
      //    this.edgeBeingEditedId._restoreControlNodes();
      //    this._editEdge(this.edgeBeingEditedId.from.id, newNode.id);
      //    this.edgeBeingEditedId.controlNodes.to.unselect();
      //  }
      //}
      //else {
      //  this.edgeBeingEditedId._restoreControlNodes();
      //}
      this.touchTime = new Date().valueOf();
    }
  }

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
          let targetNode = this.body.functions.createNode(this.getTargetNodeProperties(node.x,node.y));
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

          this.cachedFunctions["onDrag"] = this.body.eventListeners.onDrag;
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
      this.cachedFunctions["onTouch"](event);
    }
  }

  _finishConnect(event) {
    let pointer = this.body.functions.getPointer(event.center);
    let pointerObj = this.selectionHandler._pointerToPositionObject(pointer);

    // remember the edge id
    let connectFromId = undefined;
    if (this.temporaryIds.edges[0] !== undefined) {
      connectFromId = this.body.edges[this.temporaryIds.edges[0]].fromId;
    }

    //restore the drag function
    if (this.cachedFunctions["onDrag"] !== undefined) {
      this.body.eventListeners.onDrag = this.cachedFunctions["onDrag"];
      delete this.cachedFunctions["onDrag"];
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
        alert(this.options.locales[this.options.locale]["createEdgeError"])
      }
      else {
        if (this.body.nodes[connectFromId] !== undefined && this.body.nodes[node.id] !== undefined) {
          this._createEdge(connectFromId, node.id);
        }
      }
    }
    this.body.emitter.emit("_redraw");
  }

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

  /**
   * Adds a node on the specified location
   */
  _addNode(clickData) {
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
          this.createManipulatorBar();
        });
      }
      else {
        throw new Error('The function for add does not support two arguments (data,callback)');
        this.createManipulatorBar();
      }
    }
    else {
      this.body.data.nodes.add(defaultData);
      this.createManipulatorBar();
    }
  }


  /**
   * connect two nodes with a new edge.
   *
   * @private
   */
  _createEdge(sourceNodeId, targetNodeId) {
    let defaultData = {from: sourceNodeId, to: targetNodeId};
    if (this.options.handlerFunctions.addEdge) {
      if (this.options.handlerFunctions.addEdge.length == 2) {
        this.options.handlerFunctions.addEdge(defaultData, (finalizedData) => {
          this.body.data.edges.add(finalizedData);
          this.selectionHandler.unselectAll();
          this.createManipulatorBar();
        });
      }
      else {
        throw new Error('The function for connect does not support two arguments (data,callback)');
      }
    }
    else {
      this.body.data.edges.add(defaultData);
      this.selectionHandler.unselectAll();
      this.createManipulatorBar();
    }
  }

  /**
   * connect two nodes with a new edge.
   *
   * @private
   */
  _editEdge(sourceNodeId, targetNodeId) {
    let defaultData = {id: this.edgeBeingEditedId, from: sourceNodeId, to: targetNodeId};
    console.log(defaultData)
    if (this.options.handlerFunctions.editEdge) {
      if (this.options.handlerFunctions.editEdge.length == 2) {
        this.options.handlerFunctions.editEdge(defaultData, (finalizedData) => {
          this.body.data.edges.update(finalizedData);
          this.selectionHandler.unselectAll();
          this.createManipulatorBar();
        });
      }
      else {
        throw new Error('The function for edit does not support two arguments (data, callback)');
      }
    }
    else {
      this.body.data.edges.update(defaultData);
      this.selectionHandler.unselectAll();
      this.createManipulatorBar();
    }
  }

  /**
   * Create the toolbar to edit the selected node. The label and the color can be changed. Other colors are derived from the chosen color.
   *
   * @private
   */
  _editNode() {
    if (this.options.handlerFunctions.edit && this.editMode == true) {
      let node = this._getSelectedNode();
      let data = {
        id: node.id,
        label: node.label,
        group: node.options.group,
        shape: node.options.shape,
        color: {
          background: node.options.color.background,
          border: node.options.color.border,
          highlight: {
            background: node.options.color.highlight.background,
            border: node.options.color.highlight.border
          }
        }
      };
      if (this.options.handlerFunctions.edit.length == 2) {
        let me = this;
        this.options.handlerFunctions.edit(data, function (finalizedData) {
          me.body.data.nodes.update(finalizedData);
          me.createManipulatorBar();
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
          alert("You cannot delete a cluster.");
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

  getTargetNodeProperties(x,y) {
    return {
      id: 'targetNode' + util.randomUUID(),
      hidden: false,
      physics: false,
      shape:'dot',
      size:6,
      x:x,
      y:y,
      color: {background: '#ff0000', border: '#3c3c3c', highlight: {background: '#07f968'}},
      borderWidth: 2,
      borderWidthSelected: 2
    }
  }
}

export default ManipulationSystem;
  
