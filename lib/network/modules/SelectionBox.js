class SelectionBox {
    constructor(body, selectionHandler) {
        this.body = body;
        this.selectionHandler = selectionHandler;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;

        // assist in adjusting width / height correctly when mouse moves out of canvas element
        this.domAdjustX = 0;
        this.domAdjustY = 0;
        this.lastCanvasScreenX = 0;
        this.lastCanvasScreenY = 0;
        this._consumeMouseEvent = this._defaultMouseEventConsumer;

        this.active = false;
    }

    //
    // check to see if the user is currently drawing a selection box
    //
    isActive() {
        return this.active;
    }

    //
    // activate the selectionBox
    // pass in the origin point in canvas space
    // p := {x: number, y: number}
    //
    activate(p) {
        this.x = p.x;
        this.y = p.y;
        this.width = 0;
        this.height = 0;
        this.active = true;
    }

    deactivate() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.active = false;
    }

    //
    //
    //

    _defaultMouseEventConsumer(ev) {
        let p = this.selectionHandler.canvas.DOMtoCanvas({
            x: ev.offsetX,
            y: ev.offsetY
        });

        let xDir = this.x <= p.x ? 1 : -1;
        let yDir = this.y <= p.y ? 1 : -1;

        //this.width = Math.abs(ev.x - this.x) * xDir;
        //this.height = Math.abs(ev.y - this.y) * yDir;
        let width = Math.abs(p.x - this.x) * xDir;
        let height = Math.abs(p.y - this.y) * yDir;
        return {
            x: width,
            y: height
        }
    }

    _outsideCanvasMouseEventConsumer(ev) {
        return {
            x: this.width + (ev.movementX * 1 / this.selectionHandler.canvas.body.view.scale), // ev.offsetX + this.domAdjustX,
            y: this.height + (ev.movementY * 1 / this.selectionHandler.canvas.body.view.scale) //ev.offsetY + this.domAdjustY
        }
    }

    mouseLeave(ev) {
        if (this.isActive()) {
            console.log("MOUSELEAVE " + ev.offsetX + ", " + ev.offsetY);
            //this.lastCanvasScreenX = ev.offsetX;
            //this.lastCanvasScreenY = ev.offsetY;
            //this._consumeMouseEvent = this._findDomAdjustment;
            this._consumeMouseEvent = this._outsideCanvasMouseEventConsumer;
        }
    }

    mouseEnter(ev) {
        if (this.isActive()) {
            this.lastCanvasScreenX = 0;
            this.lastCanvasScreenY = 0;
            this.domAdjustX = 0;
            this.domAdjustY = 0;
            this._consumeMouseEvent = this._defaultMouseEventConsumer;
        }
    }

    //
    // complete the selectionBox, the user has let go of their mouse button
    // select the nodes and edges within the bounds of the selection box
    //
    complete() {
        let boundingBox = this.getBoundingBox();
        if (this.selectionHandler.options.selectionBox.edges) {
            // run the edges first, so that if "this.selectionHandler.options.selectConnectedEdges" is set,
            // we don't _unset_ edges that _get_ set by our node selection logic
            let selectedEdgeIds = this.selectionHandler.getAllEdgesWithinBoundingBox(boundingBox);
            for (let edgeId of selectedEdgeIds) {
                let edge = this.body.edges[edgeId];
                if (edge.isSelected()) {
                    this.selectionHandler.deselectObject(edge);
                }
                else {
                    this.selectionHandler.selectObject(edge);
                }
            }
        }
        if (this.selectionHandler.options.selectionBox.nodes) {
            let selectedNodeIds = this.selectionHandler.getAllNodesWithinBoundingBox(boundingBox);
            for (let nodeId of selectedNodeIds) {
                let node = this.body.nodes[nodeId];
                if (node.isSelected()) {
                    this.selectionHandler.deselectObject(node);
                }
                else {
                    this.selectionHandler.selectObject(node);
                }
            }
        }
        this.deactivate();
    }

    //
    // get the current bounding box for the user's selection box
    // returns {left, top, right, bottom} in canvas model space
    //
    getBoundingBox() {
        let result = {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        }

        if (this.width < 0) {
          result.left = this.x + this.width;
          result.right = this.x;
        }
        else {
          result.left = this.x;
          result.right = this.x + this.width;
        }

        if (this.height < 0) {
          result.top = this.y + this.height;
          result.bottom = this.y;
        }
        else {
          result.top = this.y;
          result.bottom = this.y + this.height;
        }

        return result;
      }

      //
      // update the bounding box as per user mouse movement
      // p is an object {x, y} in canvas model space
      // new position of mouse is used as new corner of box
      // (point at which user began the bounding box remains fixed)
      //
      updateBoundingBox(/*p*/ ev) {
        let {x, y} = this._consumeMouseEvent(ev);
        let xDir = this.x <= x ? 1 : -1;
        let yDir = this.y <= y ? 1 : -1;

        this.width = x; // Math.abs(x - this.x) * xDir;
        this.height = y; // Math.abs(y - this.y) * yDir;

        /*
        this.width = Math.abs(p.x - this.x) * xDir;
        this.height = Math.abs(p.y - this.y) * yDir;
        */
        this.body.emitter.emit("_redraw");
      }
}

export default SelectionBox;