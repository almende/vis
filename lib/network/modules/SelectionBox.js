/**
 * SelectionBox
 */
class SelectionBox {
    /**
     *
     * @param {Network.body} body
     * @param {Network.SelectionHandler} selectionHandler
     */
    constructor(body, selectionHandler) {
        this.body = body;
        this.selectionHandler = selectionHandler;

        // corner from initial ctrl+click, canvas model space
        this.x = 0;
        this.y = 0;
        // width and height recalculated on mousemove events, canvas model space
        this.width = 0;
        this.height = 0;

        this.options = this.selectionHandler.options.selectionBox;
        this.active = false;
    }

    /**
     * check to see if user is currently drawing a selection box
     */
    isActive() {
        return this.active;
    }

    /**
     * activate the selectionBox, user has pressed ctrl + mousebutton
     * @param {MouseEvent} ev
     */
    activate(ev) {
        let p = this.selectionHandler.canvas.DOMtoCanvas({
            x: ev.offsetX,
            y: ev.offsetY
        });

        this.x = p.x;
        this.y = p.y;
        this.width = 0;
        this.height = 0;
        this.active = true;
    }

    /**
     * reset the selection box state
     * @private
     */
    _deactivate() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.active = false;
    }


    /**
     * called when user release mouse button, completing their selection box
     * selects the nodes and edges within the selection box
     */
    release() {
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
        this._deactivate();
    }

    /**
     * Calculate new box corner {x,y} based on mouse input
     *   returning values in canvas space
     *   this is easy when the user remains in the canvas
     *   but needs a bit of extra logic to handle a mouse movement that extends outside of the canvas
     *   NOTE: the order of the per-axis predicates is important here!
     *
     * @param {MouseEvent} ev
     * @returns {{x: number, y: number}}
     */
    _consumeMouseEvent(ev) {
        let frameRect = this.selectionHandler.canvas.frame.getBoundingClientRect();
        let x, y;

        //
        // X-Axis
        //

        // mouse to the left of viewport
        if (ev.clientX < 0) {
            // is top of frame also above viewport?
            if (frameRect.left < 0) {
                x = (-frameRect.left) + 1;
            }
            else {
                x = 1;
            }
        }
        // mouse to the left of frame
        else if (ev.clientX < frameRect.left) {
            x = 1;
        }
        // mouse to the right of viewport
        else if (ev.clientX > window.innerWidth) {
            // is right of frame also beyond viewport?
            if (frameRect.right > window.innerWidth) {
                x = window.innerWidth - frameRect.left - 1;
            }
            else {
                x = frameRect.right - frameRect.left - 1;
            }
        }
        // mouse to the right of frame
        else if (ev.clientX > frameRect.right) {
            x = frameRect.right - frameRect.left - 1;
        }
        // mouse horizontally within frame
        else {
            x = ev.clientX - frameRect.x;
        }

        //
        // Y-Axis
        //

        // mouse above viewport
        if (ev.clientY < 0) {
            // is top of frame also above viewport?
            if (frameRect.top < 0) {
                y = (-frameRect.top) + 1;
            }
            else {
                y = 1;
            }
        }
        // mouse above frame
        else if (ev.clientY < frameRect.top) {
            y = 1;
        }
        // mouse below viewport
        else if (ev.clientY > window.innerHeight) {
            // is bottom of frame also below viewport?
            if (frameRect.bottom > window.innerHeight) {
                y = window.innerHeight - frameRect.top - 1;
            }
            else {
                y = frameRect.bottom - frameRect.top - 1;
            }
        }
        // mouse below frame
        else if (ev.clientY > frameRect.bottom) {
            y = frameRect.bottom - frameRect.top - 1;
        }
        // mouse vertically within frame
        else {
            y = ev.clientY - frameRect.y;
        }

        return this.selectionHandler.canvas.DOMtoCanvas({
            x: x,
            y: y
        });
    }

    //
    // get the current bounding box for the user's selection box
    // returns {left, top, right, bottom} in canvas model space
    //
    /**
     * get the current bounding box for the user's selection box
     * @return {{left: number, top: number, right: number, bottom: number}}
     */
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

    /**
     * update the bounding box as per user mouse movement
     * new position of mouse is used as new corner of box
     * (point at which user began the bounding box remains fixed)
     *
     * @param {MouseEvent} ev
     */
    updateBoundingBox(ev) {
        let {x: newX, y: newY} = this._consumeMouseEvent(ev);
        let xDir = this.x <= newX ? 1 : -1;
        let yDir = this.y <= newY ? 1 : -1;

        this.width =  Math.abs(newX - this.x) * xDir;
        this.height = Math.abs(newY - this.y) * yDir;

        this.body.emitter.emit("_redraw");
    }
}

export default SelectionBox;