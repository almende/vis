class SelectionBox {
    constructor(body, selectionHandler) {
        this.body = body;
        this.selectionHandler = selectionHandler;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
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
        console.log(this.selectionHandler);
        this.x = p.x;
        this.y = p.y;
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
    // complete the selectionBox, the user has let go of their mouse button
    // select the 
    //
    complete() {
        let boundingBox = this.getBoundingBox();
        if (this.selectionHandler.options.selectionBox.edges || this.selectionHandler.options.selectionBox === true) {
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
        if (this.selectionHandler.options.selectionBox.nodes  || this.selectionHandler.options.selectionBox === true) {
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
      updateBoundingBox(p) {
        let xDir = this.x <= p.x ? 1 : -1;
        let yDir = this.y <= p.y ? 1 : -1;

        this.width = Math.abs(p.x - this.x) * xDir;
        this.height = Math.abs(p.y - this.y) * yDir;
        this.body.emitter.emit("_redraw");
      }
}

export default SelectionBox;