/**
 * Created by Alex on 2/27/2015.
 *
 */


var util = require('../../util');

import { NavigationHandler } from "./components/NavigationHandler"

class InteractionHandler {
  constructor(body, canvas, selectionHandler) {
    this.body = body;
    this.canvas = canvas;
    this.selectionHandler = selectionHandler;
    this.navigationHandler = new NavigationHandler(body,canvas);

    // bind the events from hammer to functions in this object
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
    this.hoverObj = {nodes:{},edges:{}};


    this.options = {};
    this.defaultOptions = {
      dragNodes:true,
      dragView: true,
      zoomView: true,
      hoverEnabled: false,
      showNavigationIcons: false,
      tooltip: {
        delay: 300,
        fontColor: 'black',
        fontSize: 14, // px
        fontFace: 'verdana',
        color: {
          border: '#666',
          background: '#FFFFC6'
        }
      },
      keyboard: {
        enabled: false,
        speed: {x: 10, y: 10, zoom: 0.02},
        bindToWindow: true
      }
    }
    util.extend(this.options,this.defaultOptions);
  }

  setOptions(options) {
    if (options !== undefined) {
      // extend all but the values in fields
      var fields = ['keyboard'];
      util.selectiveNotDeepExtend(fields,this.options, options);

      // merge the keyboard options in.
      util.mergeOptions(this.options, options,'keyboard');
    }

    this.navigationHandler.setOptions(this.options);
  }


  /**
   * Get the pointer location from a touch location
   * @param {{x: Number, y: Number}} touch
   * @return {{x: Number, y: Number}} pointer
   * @private
   */
  getPointer(touch) {
    return {
      x: touch.x - util.getAbsoluteLeft(this.canvas.frame.canvas),
      y: touch.y - util.getAbsoluteTop(this.canvas.frame.canvas)
    };
  }


  /**
   * On start of a touch gesture, store the pointer
   * @param event
   * @private
   */
  onTouch(event) {
    if (new Date().valueOf() - this.touchTime > 100) {
      this.drag.pointer = this.getPointer(event.center);
      this.drag.pinched = false;
      this.pinch.scale = this.body.view.scale;

      // to avoid double fireing of this event because we have two hammer instances. (on canvas and on frame)
      this.touchTime = new Date().valueOf();
    }
  }

  /**
   * handle tap/click event: select/unselect a node
   * @private
   */
  onTap(event) {
    var pointer = this.getPointer(event.center);

    var previouslySelected = this.selectionHandler._getSelectedObjectCount() > 0;
    var selected = this.selectionHandler.selectOnPoint(pointer);

    if (selected === true || (previouslySelected == true && selected === false)) { // select or unselect
      this.body.emitter.emit('selected', this.selectionHandler.getSelection());
    }

    this.selectionHandler._generateClickEvent("click",pointer);
  }


  /**
   * handle doubletap event
   * @private
   */
  onDoubleTap(event) {
    var pointer = this.getPointer(event.center);
    this.selectionHandler._generateClickEvent("doubleClick",pointer);
  }



  /**
   * handle long tap event: multi select nodes
   * @private
   */
  onHold(event) {
    var pointer = this.getPointer(event.center);

    var selectionChanged = this.selectionHandler.selectAdditionalOnPoint(pointer);

    if (selectionChanged === true) { // select or longpress
      this.body.emitter.emit('selected', this.selectionHandler.getSelection());
    }

    this.selectionHandler._generateClickEvent("click",pointer);
  }


  /**
   * handle the release of the screen
   *
   * @private
   */
  onRelease(event) {
    this.body.emitter.emit("release",event)
  }


  /**
   * This function is called by onDragStart.
   * It is separated out because we can then overload it for the datamanipulation system.
   *
   * @private
   */
  onDragStart(event) {
    //in case the touch event was triggered on an external div, do the initial touch now.
    if (this.drag.pointer === undefined) {
      this.onTouch(event);
    }

    var node = this.selectionHandler.getNodeAt(this.drag.pointer);
    // note: drag.pointer is set in onTouch to get the initial touch location

    this.drag.dragging = true;
    this.drag.selection = [];
    this.drag.translation = util.extend({},this.body.view.translation); // copy the object
    this.drag.nodeId = null;

    this.body.emitter.emit("dragStart", {nodeIds: this.selectionHandler.getSelection().nodes});

    if (node != null && this.options.dragNodes === true) {
      this.drag.nodeId = node.id;
      // select the clicked node if not yet selected
      if (node.isSelected() === false) {
        this.selectionHandler.unselectAll();
        this.selectionHandler.selectObject(node);
      }

      var selection = this.selectionHandler.selectionObj.nodes;
      // create an array with the selected nodes and their original location and status
      for (let nodeId in selection) {
        if (selection.hasOwnProperty(nodeId)) {
          var object = selection[nodeId];
          var s = {
            id: object.id,
            node: object,

            // store original x, y, xFixed and yFixed, make the node temporarily Fixed
            x: object.x,
            y: object.y,
            xFixed: object.xFixed,
            yFixed: object.yFixed
          };

          object.xFixed = true;
          object.yFixed = true;

          this.drag.selection.push(s);
        }
      }
    }
  }


  /**
   * handle drag event
   * @private
   */
  onDrag(event) {
    if (this.drag.pinched === true) {
      return;
    }

    // remove the focus on node if it is focussed on by the focusOnNode
    this.body.emitter.emit("unlockNode");

    var pointer = this.getPointer(event.center);
    var selection = this.drag.selection;
    if (selection && selection.length && this.options.dragNodes === true) {
      // calculate delta's and new location
      var deltaX = pointer.x - this.drag.pointer.x;
      var deltaY = pointer.y - this.drag.pointer.y;

      // update position of all selected nodes
      selection.forEach((selection) => {
        var node = selection.node;

        if (!selection.xFixed) {
          node.x = this.canvas._XconvertDOMtoCanvas(this.canvas._XconvertCanvasToDOM(selection.x) + deltaX);
        }

        if (!selection.yFixed) {
          node.y = this.canvas._YconvertDOMtoCanvas(this.canvas._YconvertCanvasToDOM(selection.y) + deltaY);
        }
      });


      // start the simulation of the physics
      this.body.emitter.emit("startSimulation");
    }
    else {
      // move the network
      if (this.options.dragView === true) {
        // if the drag was not started properly because the click started outside the network div, start it now.
        if (this.drag.pointer === undefined) {
          this._handleDragStart(event);
          return;
        }
        var diffX = pointer.x - this.drag.pointer.x;
        var diffY = pointer.y - this.drag.pointer.y;

        this.body.view.translation = {x:this.drag.translation.x + diffX, y:this.drag.translation.y + diffY};
        this.body.emitter.emit("_redraw");
      }
    }
  }


  /**
   * handle drag start event
   * @private
   */
  onDragEnd(event) {
    this.drag.dragging = false;
    var selection = this.drag.selection;
    if (selection && selection.length) {
      selection.forEach(function (s) {
        // restore original xFixed and yFixed
        s.node.xFixed = s.xFixed;
        s.node.yFixed = s.yFixed;
      });
      this.body.emitter.emit("startSimulation");
    }
    else {
      this.body.emitter.emit("_requestRedraw");
    }

    this.body.emitter.emit("dragEnd", {nodeIds: this.selectionHandler.getSelection().nodes});
  }



  /**
   * Handle pinch event
   * @param event
   * @private
   */
  onPinch(event) {
    var pointer = this.getPointer(event.center);

    this.drag.pinched = true;
    if (this.pinch['scale'] === undefined) {
      this.pinch.scale = 1;
    }

    // TODO: enabled moving while pinching?
    var scale = this.pinch.scale * event.scale;
    this.zoom(scale, pointer)
  }


  /**
   * Zoom the network in or out
   * @param {Number} scale a number around 1, and between 0.01 and 10
   * @param {{x: Number, y: Number}} pointer    Position on screen
   * @return {Number} appliedScale    scale is limited within the boundaries
   * @private
   */
  zoom(scale, pointer) {
    if (this.options.zoomView === true) {
      var scaleOld = this.body.view.scale;
      if (scale < 0.00001) {
        scale = 0.00001;
      }
      if (scale > 10) {
        scale = 10;
      }

      var preScaleDragPointer = null;
      if (this.drag !== undefined) {
        if (this.drag.dragging === true) {
          preScaleDragPointer = this.canvas.DOMtoCanvas(this.drag.pointer);
        }
      }
      // + this.canvas.frame.canvas.clientHeight / 2
      var translation = this.body.view.translation;

      var scaleFrac = scale / scaleOld;
      var tx = (1 - scaleFrac) * pointer.x + translation.x * scaleFrac;
      var ty = (1 - scaleFrac) * pointer.y + translation.y * scaleFrac;

      this.body.view.scale = scale;
      this.body.view.translation = {x:tx, y:ty};

      if (preScaleDragPointer != null) {
        var postScaleDragPointer = this.canvas.canvasToDOM(preScaleDragPointer);
        this.drag.pointer.x = postScaleDragPointer.x;
        this.drag.pointer.y = postScaleDragPointer.y;
      }

      this.body.emitter.emit("_requestRedraw");

      if (scaleOld < scale) {
        this.body.emitter.emit("zoom", {direction: "+"});
      }
      else {
        this.body.emitter.emit("zoom", {direction: "-"});
      }
    }
  }


  /**
   * Event handler for mouse wheel event, used to zoom the timeline
   * See http://adomas.org/javascript-mouse-wheel/
   *     https://github.com/EightMedia/hammer.js/issues/256
   * @param {MouseEvent}  event
   * @private
   */
  onMouseWheel(event) {
    // retrieve delta
    var delta = 0;
    if (event.wheelDelta) { /* IE/Opera. */
      delta = event.wheelDelta / 120;
    } else if (event.detail) { /* Mozilla case. */
      // In Mozilla, sign of delta is different than in IE.
      // Also, delta is multiple of 3.
      delta = -event.detail / 3;
    }

    // If delta is nonzero, handle it.
    // Basically, delta is now positive if wheel was scrolled up,
    // and negative, if wheel was scrolled down.
    if (delta) {

      // calculate the new scale
      var scale = this.body.view.scale;
      var zoom = delta / 10;
      if (delta < 0) {
        zoom = zoom / (1 - zoom);
      }
      scale *= (1 + zoom);

      // calculate the pointer location
      var pointer = {x:event.pageX, y:event.pageY};

      // apply the new scale
      this.zoom(scale, pointer);
    }

    // Prevent default actions caused by mouse wheel.
    event.preventDefault();
  }


  /**
   * Mouse move handler for checking whether the title moves over a node with a title.
   * @param  {Event} event
   * @private
   */
  onMouseMove(event) {
  //  var pointer = {x:event.pageX, y:event.pageY};
  //  var popupVisible = false;
  //
  //  // check if the previously selected node is still selected
  //  if (this.popup !== undefined) {
  //    if (this.popup.hidden === false) {
  //      this._checkHidePopup(pointer);
  //    }
  //
  //    // if the popup was not hidden above
  //    if (this.popup.hidden === false) {
  //      popupVisible = true;
  //      this.popup.setPosition(pointer.x + 3, pointer.y - 5)
  //      this.popup.show();
  //    }
  //  }
  //
  //  // if we bind the keyboard to the div, we have to highlight it to use it. This highlights it on mouse over
  //  if (this.options.keyboard.bindToWindow == false && this.options.keyboard.enabled === true) {
  //    this.canvas.frame.focus();
  //  }
  //
  //  // start a timeout that will check if the mouse is positioned above an element
  //  if (popupVisible === false) {
  //    var me = this;
  //    var checkShow = function() {
  //      me._checkShowPopup(pointer);
  //    };
  //
  //    if (this.popupTimer) {
  //      clearInterval(this.popupTimer); // stop any running calculationTimer
  //    }
  //    if (!this.drag.dragging) {
  //      this.popupTimer = setTimeout(checkShow, this.options.tooltip.delay);
  //    }
  //  }
  //
  //  /**
  //  * Adding hover highlights
  //  */
  //  if (this.options.hoverEnabled === true) {
  //    // removing all hover highlights
  //    for (var edgeId in this.hoverObj.edges) {
  //      if (this.hoverObj.edges.hasOwnProperty(edgeId)) {
  //        this.hoverObj.edges[edgeId].hover = false;
  //        delete this.hoverObj.edges[edgeId];
  //      }
  //    }
  //
  //    // adding hover highlights
  //    var obj = this.selectionHandler.getNodeAt(pointer);
  //    if (obj == null) {
  //      obj = this.selectionHandler.getEdgeAt(pointer);
  //    }
  //    if (obj != null) {
  //      this._hoverObject(obj);
  //    }
  //
  //    // removing all node hover highlights except for the selected one.
  //    for (var nodeId in this.hoverObj.nodes) {
  //      if (this.hoverObj.nodes.hasOwnProperty(nodeId)) {
  //        if (obj instanceof Node && obj.id != nodeId || obj instanceof Edge || obj == null) {
  //          this._blurObject(this.hoverObj.nodes[nodeId]);
  //          delete this.hoverObj.nodes[nodeId];
  //        }
  //      }
  //    }
  //    this.body.emitter.emit("_requestRedraw");
  //  }
  }
}

export default InteractionHandler;
