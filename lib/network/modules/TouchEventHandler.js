/**
 * Created by Alex on 2/27/2015.
 *
 */

import {SelectionHandler} from "./components/SelectionHandler"
var util = require('../../util');

class TouchEventHandler {
  constructor(body) {
    this.body = body;

    this.body.eventListeners.onTap        = this.onTap.bind(this);
    this.body.eventListeners.onTouch      = this.onTouch.bind(this);
    this.body.eventListeners.onDoubleTap  = this.onDoubleTap.bind(this);
    this.body.eventListeners.onHold       = this.onHold.bind(this);
    this.body.eventListeners.onDragStart  = this.onDragStart.bind(this);
    this.body.eventListeners.onDrag       = this.onDrag.bind(this);
    this.body.eventListeners.onDragEnd    = this.onDragEnd.bind(this);
    this.body.eventListeners.onMouseWheel = this.onMouseWheel.bind(this);
    this.body.eventListeners.onPinch      = this.onPinch.bind(this);
    this.body.eventListeners.onMouseMove  = this.onMouseMove.bind(this);
    this.body.eventListeners.onRelease    = this.onRelease.bind(this);

    this.touchTime = 0;
    this.drag = {};
    this.pinch = {};
    this.pointerPosition = {x:0,y:0};

    this.scale = 1.0;
    this.body.emitter.on("_setScale", (scale) => this.scale = scale);

    this.selectionHandler = new SelectionHandler(body);
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.selectionHandler.setCanvas(canvas);
  }

  /**
   * Get the pointer location from a touch location
   * @param {{pageX: Number, pageY: Number}} touch
   * @return {{x: Number, y: Number}} pointer
   * @private
   */
  getPointer(touch) {
    return {
      x: touch.pageX - util.getAbsoluteLeft(this.canvas.frame.canvas),
      y: touch.pageY - util.getAbsoluteTop(this.canvas.frame.canvas)
    };
  }


  /**
   * On start of a touch gesture, store the pointer
   * @param event
   * @private
   */
  onTouch(event) {
    if (new Date().valueOf() - this.touchTime > 100) {
      this.drag.pointer = this.getPointer(event.gesture.center);
      this.drag.pinched = false;
      this.pinch.scale = this.scale;

      // to avoid double fireing of this event because we have two hammer instances. (on canvas and on frame)
      this.touchTime = new Date().valueOf();
    }
  }

  /**
   * handle tap/click event: select/unselect a node
   * @private
   */
  onTap(event) {
    console.log("tap",event)
    var pointer = this.getPointer(event.gesture.center);
    this.pointerPosition = pointer;
    this.selectionHandler.selectOnPoint(pointer);
  }

  /**
   * handle drag start event
   * @private
   */

  /**
   * This function is called by onDragStart.
   * It is separated out because we can then overload it for the datamanipulation system.
   *
   * @private
   */
  onDragStart(event) {
    // in case the touch event was triggered on an external div, do the initial touch now.
    //if (this.drag.pointer === undefined) {
    //  this.onTouch(event);
    //}
    //
    //var node = this._getNodeAt(this.drag.pointer);
    //// note: drag.pointer is set in onTouch to get the initial touch location
    //
    //this.drag.dragging = true;
    //this.drag.selection = [];
    //this.drag.translation = this._getTranslation();
    //this.drag.nodeId = null;
    //this.draggingNodes = false;
    //
    //if (node != null && this.constants.dragNodes == true) {
    //  this.draggingNodes = true;
    //  this.drag.nodeId = node.id;
    //  // select the clicked node if not yet selected
    //  if (!node.isSelected()) {
    //    this._selectObject(node, false);
    //  }
    //
    //  this.emit("dragStart", {nodeIds: this.getSelection().nodes});
    //
    //  // create an array with the selected nodes and their original location and status
    //  for (var objectId in this.selectionObj.nodes) {
    //    if (this.selectionObj.nodes.hasOwnProperty(objectId)) {
    //      var object = this.selectionObj.nodes[objectId];
    //      var s = {
    //        id: object.id,
    //        node: object,
    //
    //        // store original x, y, xFixed and yFixed, make the node temporarily Fixed
    //        x: object.x,
    //        y: object.y,
    //        xFixed: object.xFixed,
    //        yFixed: object.yFixed
    //      };
    //
    //      object.xFixed = true;
    //      object.yFixed = true;
    //
    //      this.drag.selection.push(s);
    //    }
    //  }
    //}
  }


  /**
   * handle drag event
   * @private
   */
  onDrag(event) {
    //if (this.drag.pinched) {
    //  return;
    //}
    //
    //// remove the focus on node if it is focussed on by the focusOnNode
    //this.releaseNode();
    //
    //var pointer = this.getPointer(event.gesture.center);
    //var me = this;
    //var drag = this.drag;
    //var selection = drag.selection;
    //if (selection && selection.length && this.constants.dragNodes == true) {
    //  // calculate delta's and new location
    //  var deltaX = pointer.x - drag.pointer.x;
    //  var deltaY = pointer.y - drag.pointer.y;
    //
    //  // update position of all selected nodes
    //  selection.forEach(function (s) {
    //    var node = s.node;
    //
    //    if (!s.xFixed) {
    //      node.x = me._XconvertDOMtoCanvas(me._XconvertCanvasToDOM(s.x) + deltaX);
    //    }
    //
    //    if (!s.yFixed) {
    //      node.y = me._YconvertDOMtoCanvas(me._YconvertCanvasToDOM(s.y) + deltaY);
    //    }
    //  });
    //
    //
    //  // start _animationStep if not yet running
    //  if (!this.moving) {
    //    this.moving = true;
    //    this.start();
    //  }
    //}
    //else {
    //  // move the network
    //  if (this.constants.dragNetwork == true) {
    //    // if the drag was not started properly because the click started outside the network div, start it now.
    //    if (this.drag.pointer === undefined) {
    //      this._handleDragStart(event);
    //      return;
    //    }
    //    var diffX = pointer.x - this.drag.pointer.x;
    //    var diffY = pointer.y - this.drag.pointer.y;
    //
    //    this._setTranslation(
    //      this.drag.translation.x + diffX,
    //      this.drag.translation.y + diffY
    //    );
    //    this._redraw();
    //  }
    //}
  }


  /**
   * handle drag start event
   * @private
   */
  onDragEnd(event) {
    //this.drag.dragging = false;
    //var selection = this.drag.selection;
    //if (selection && selection.length) {
    //  selection.forEach(function (s) {
    //    // restore original xFixed and yFixed
    //    s.node.xFixed = s.xFixed;
    //    s.node.yFixed = s.yFixed;
    //  });
    //  this.moving = true;
    //  this.start();
    //}
    //else {
    //  this._redraw();
    //}
    //if (this.draggingNodes == false) {
    //  this.emit("dragEnd", {nodeIds: []});
    //}
    //else {
    //  this.emit("dragEnd", {nodeIds: this.getSelection().nodes});
    //}
  }

  /**
   * handle doubletap event
   * @private
   */
  onDoubleTap(event) {
    //var pointer = this.getPointer(event.gesture.center);
    //this._handleDoubleTap(pointer);
  }



  /**
   * handle long tap event: multi select nodes
   * @private
   */
  onHold(event) {
    //var pointer = this.getPointer(event.gesture.center);
    //this.pointerPosition = pointer;
    //this._handleOnHold(pointer);
  }


  /**
   * handle the release of the screen
   *
   * @private
   */
  onRelease(event) {
    //var pointer = this.getPointer(event.gesture.center);
    //this._handleOnRelease(pointer);
  }


  /**
   * Handle pinch event
   * @param event
   * @private
   */
  onPinch(event) {
    //var pointer = this.getPointer(event.gesture.center);
    //
    //this.drag.pinched = true;
    //if (!('scale' in this.pinch)) {
    //  this.pinch.scale = 1;
    //}
    //
    //// TODO: enabled moving while pinching?
    //var scale = this.pinch.scale * event.gesture.scale;
    //this._zoom(scale, pointer)
  }


  /**
   * Zoom the network in or out
   * @param {Number} scale a number around 1, and between 0.01 and 10
   * @param {{x: Number, y: Number}} pointer    Position on screen
   * @return {Number} appliedScale    scale is limited within the boundaries
   * @private
   */
  _zoom(scale, pointer) {
    //if (this.constants.zoomable == true) {
    //  var scaleOld = this._getScale();
    //  if (scale < 0.00001) {
    //    scale = 0.00001;
    //  }
    //  if (scale > 10) {
    //    scale = 10;
    //  }
    //
    //  var preScaleDragPointer = null;
    //  if (this.drag !== undefined) {
    //    if (this.drag.dragging == true) {
    //      preScaleDragPointer = this.canvas.DOMtoCanvas(this.drag.pointer);
    //    }
    //  }
    //  // + this.canvas.frame.canvas.clientHeight / 2
    //  var translation = this._getTranslation();
    //
    //  var scaleFrac = scale / scaleOld;
    //  var tx = (1 - scaleFrac) * pointer.x + translation.x * scaleFrac;
    //  var ty = (1 - scaleFrac) * pointer.y + translation.y * scaleFrac;
    //
    //    this._setScale(scale);
    //  this._setTranslation(tx, ty);
    //
    //  if (preScaleDragPointer != null) {
    //    var postScaleDragPointer = this.canvas.canvasToDOM(preScaleDragPointer);
    //    this.drag.pointer.x = postScaleDragPointer.x;
    //    this.drag.pointer.y = postScaleDragPointer.y;
    //  }
    //
    //  this._redraw();
    //
    //  if (scaleOld < scale) {
    //    this.emit("zoom", {direction: "+"});
    //  }
    //  else {
    //    this.emit("zoom", {direction: "-"});
    //  }
    //
    //  return scale;
    //}
  }


  /**
   * Event handler for mouse wheel event, used to zoom the timeline
   * See http://adomas.org/javascript-mouse-wheel/
   *     https://github.com/EightMedia/hammer.js/issues/256
   * @param {MouseEvent}  event
   * @private
   */
  onMouseWheel(event) {
    //// retrieve delta
    //var delta = 0;
    //if (event.wheelDelta) { /* IE/Opera. */
    //  delta = event.wheelDelta / 120;
    //} else if (event.detail) { /* Mozilla case. */
    //  // In Mozilla, sign of delta is different than in IE.
    //  // Also, delta is multiple of 3.
    //  delta = -event.detail / 3;
    //}
    //
    //// If delta is nonzero, handle it.
    //// Basically, delta is now positive if wheel was scrolled up,
    //// and negative, if wheel was scrolled down.
    //if (delta) {
    //
    //  // calculate the new scale
    //  var scale = this._getScale();
    //  var zoom = delta / 10;
    //  if (delta < 0) {
    //    zoom = zoom / (1 - zoom);
    //  }
    //  scale *= (1 + zoom);
    //
    //  // calculate the pointer location
    //  var gesture = hammerUtil.fakeGesture(this, event);
    //  var pointer = this.getPointer(gesture.center);
    //
    //  // apply the new scale
    //  this._zoom(scale, pointer);
    //}
    //
    //// Prevent default actions caused by mouse wheel.
    //event.preventDefault();
  }


  /**
   * Mouse move handler for checking whether the title moves over a node with a title.
   * @param  {Event} event
   * @private
   */
  onMouseMove(event) {
    //var gesture = hammerUtil.fakeGesture(this, event);
    //var pointer = this.getPointer(gesture.center);
    //var popupVisible = false;
    //
    //// check if the previously selected node is still selected
    //if (this.popup !== undefined) {
    //  if (this.popup.hidden === false) {
    //    this._checkHidePopup(pointer);
    //  }
    //
    //  // if the popup was not hidden above
    //  if (this.popup.hidden === false) {
    //    popupVisible = true;
    //    this.popup.setPosition(pointer.x + 3, pointer.y - 5)
    //    this.popup.show();
    //  }
    //}
    //
    //// if we bind the keyboard to the div, we have to highlight it to use it. This highlights it on mouse over
    //if (this.constants.keyboard.bindToWindow == false && this.constants.keyboard.enabled == true) {
    //  this.canvas.frame.focus();
    //}
    //
    //// start a timeout that will check if the mouse is positioned above an element
    //if (popupVisible === false) {
    //  var me = this;
    //  var checkShow = function() {
    //    me._checkShowPopup(pointer);
    //  };
    //
    //  if (this.popupTimer) {
    //    clearInterval(this.popupTimer); // stop any running calculationTimer
    //  }
    //  if (!this.drag.dragging) {
    //    this.popupTimer = setTimeout(checkShow, this.constants.tooltip.delay);
    //  }
    //}
    //
    ///**
    // * Adding hover highlights
    // */
    //if (this.constants.hover == true) {
    //  // removing all hover highlights
    //  for (var edgeId in this.hoverObj.edges) {
    //    if (this.hoverObj.edges.hasOwnProperty(edgeId)) {
    //      this.hoverObj.edges[edgeId].hover = false;
    //      delete this.hoverObj.edges[edgeId];
    //    }
    //  }
    //
    //  // adding hover highlights
    //  var obj = this._getNodeAt(pointer);
    //  if (obj == null) {
    //    obj = this._getEdgeAt(pointer);
    //  }
    //  if (obj != null) {
    //    this._hoverObject(obj);
    //  }
    //
    //  // removing all node hover highlights except for the selected one.
    //  for (var nodeId in this.hoverObj.nodes) {
    //    if (this.hoverObj.nodes.hasOwnProperty(nodeId)) {
    //      if (obj instanceof Node && obj.id != nodeId || obj instanceof Edge || obj == null) {
    //        this._blurObject(this.hoverObj.nodes[nodeId]);
    //        delete this.hoverObj.nodes[nodeId];
    //      }
    //    }
    //  }
    //  this.redraw();
    //}
  }
}

export {TouchEventHandler};
