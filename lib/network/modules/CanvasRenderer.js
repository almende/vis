if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
}

let util = require('../../util');


class CanvasRenderer {
  constructor(body, canvas) {
    this.body = body;
    this.canvas = canvas;

    this.redrawRequested = false;
    this.renderTimer = undefined;
    this.requiresTimeout = true;
    this.renderingActive = false;
    this.renderRequests = 0;
    this.pixelRatio = undefined;
    this.allowRedraw = true;

    this.dragging = false;
    this.options = {};
    this.defaultOptions = {
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false
    };
    util.extend(this.options, this.defaultOptions);

    this._determineBrowserMethod();
    this.bindEventListeners();
  }

  bindEventListeners() {
    this.body.emitter.on("dragStart", () => {
      this.dragging = true;
    });
    this.body.emitter.on("dragEnd", () => this.dragging = false);
    this.body.emitter.on("_resizeNodes", () => this._resizeNodes());
    this.body.emitter.on("_redraw", () => {
      if (this.renderingActive === false) {
        this._redraw();
      }
    });
    this.body.emitter.on("_blockRedraw", () => {this.allowRedraw = false;});
    this.body.emitter.on("_allowRedraw", () => {this.allowRedraw = true; this.redrawRequested = false;});
    this.body.emitter.on("_requestRedraw", this._requestRedraw.bind(this));
    this.body.emitter.on("_startRendering", () => {
      this.renderRequests += 1;
      this.renderingActive = true;
      this._startRendering();
    });
    this.body.emitter.on("_stopRendering", () => {
      this.renderRequests -= 1;
      this.renderingActive = this.renderRequests > 0;
      this.renderTimer = undefined;
    });
    this.body.emitter.on('destroy',  () => {
      this.renderRequests = 0;
      this.allowRedraw = false;
      this.renderingActive = false;
      if (this.requiresTimeout === true) {
        clearTimeout(this.renderTimer);
      }
      else {
        cancelAnimationFrame(this.renderTimer);
      }
      this.body.emitter.off();
    });

  }

  setOptions(options) {
    if (options !== undefined) {
      let fields = ['hideEdgesOnDrag','hideNodesOnDrag'];
      util.selectiveDeepExtend(fields,this.options, options);
    }
  }

  _startRendering() {
    if (this.renderingActive === true) {
      if (this.renderTimer === undefined) {
        if (this.requiresTimeout === true) {
          this.renderTimer = window.setTimeout(this._renderStep.bind(this), this.simulationInterval); // wait this.renderTimeStep milliseconds and perform the animation step function
        }
        else {
          this.renderTimer = window.requestAnimationFrame(this._renderStep.bind(this)); // wait this.renderTimeStep milliseconds and perform the animation step function
        }
      }
    }
  }

  _renderStep() {
    if (this.renderingActive === true) {
      // reset the renderTimer so a new scheduled animation step can be set
      this.renderTimer = undefined;

      if (this.requiresTimeout === true) {
        // this schedules a new simulation step
        this._startRendering();
      }

      this._redraw();

      if (this.requiresTimeout === false) {
        // this schedules a new simulation step
        this._startRendering();
      }
    }
  }

  /**
   * Redraw the network with the current data
   * chart will be resized too.
   */
  redraw() {
    this.body.emitter.emit('setSize');
    this._redraw();
  }

  /**
   * Redraw the network with the current data
   * @param hidden | used to get the first estimate of the node sizes. only the nodes are drawn after which they are quickly drawn over.
   * @private
   */
  _requestRedraw() {
    if (this.redrawRequested !== true && this.renderingActive === false && this.allowRedraw === true) {
      this.redrawRequested = true;
      if (this.requiresTimeout === true) {
        window.setTimeout(() => {this._redraw(false);}, 0);
      }
      else {
        window.requestAnimationFrame(() => {this._redraw(false);});
      }
    }
  }

  _redraw(hidden = false) {
    if (this.allowRedraw === true) {
      this.body.emitter.emit("initRedraw");

      this.redrawRequested = false;
      let ctx = this.canvas.frame.canvas.getContext('2d');

      // when the container div was hidden, this fixes it back up!
      if (this.canvas.frame.canvas.width === 0 || this.canvas.frame.canvas.height === 0) {
        this.canvas.setSize();
      }

      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1);

      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

      // clear the canvas
      let w = this.canvas.frame.canvas.clientWidth;
      let h = this.canvas.frame.canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // if the div is hidden, we stop the redraw here for performance.
      if (this.canvas.frame.clientWidth === 0) {
        return;
      }

      // set scaling and translation
      ctx.save();
      ctx.translate(this.body.view.translation.x, this.body.view.translation.y);
      ctx.scale(this.body.view.scale, this.body.view.scale);

      ctx.beginPath();
      this.body.emitter.emit("beforeDrawing", ctx);
      ctx.closePath();

      if (hidden === false) {
        if (this.dragging === false || (this.dragging === true && this.options.hideEdgesOnDrag === false)) {
          this._drawEdges(ctx);
        }
      }

      if (this.dragging === false || (this.dragging === true && this.options.hideNodesOnDrag === false)) {
        this._drawNodes(ctx, hidden);
      }

      ctx.beginPath();
      this.body.emitter.emit("afterDrawing", ctx);
      ctx.closePath();


      // restore original scaling and translation
      ctx.restore();
      if (hidden === true) {
        ctx.clearRect(0, 0, w, h);
      }
    }
  }


  /**
   * Redraw all nodes
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Boolean} [alwaysShow]
   * @private
   */
  _resizeNodes() {
    let ctx = this.canvas.frame.canvas.getContext('2d');
    if (this.pixelRatio === undefined) {
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1);
    }
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.save();
    ctx.translate(this.body.view.translation.x, this.body.view.translation.y);
    ctx.scale(this.body.view.scale, this.body.view.scale);

    let nodes = this.body.nodes;
    let node;

    // resize all nodes
    for (let nodeId in nodes) {
      if (nodes.hasOwnProperty(nodeId)) {
        node = nodes[nodeId];
        node.resize(ctx);
        node.updateBoundingBox(ctx, node.selected);
      }
    }

    // restore original scaling and translation
    ctx.restore();
  }

  /**
   * Redraw all nodes
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Boolean} [alwaysShow]
   * @private
   */
  _drawNodes(ctx, alwaysShow = false) {
    let nodes = this.body.nodes;
    let nodeIndices = this.body.nodeIndices;
    let node;
    let selected = [];
    let margin = 20;
    let topLeft = this.canvas.DOMtoCanvas({x:-margin,y:-margin});
    let bottomRight = this.canvas.DOMtoCanvas({
      x: this.canvas.frame.canvas.clientWidth+margin,
      y: this.canvas.frame.canvas.clientHeight+margin
    });
    let viewableArea = {top:topLeft.y,left:topLeft.x,bottom:bottomRight.y,right:bottomRight.x};

    // draw unselected nodes;
    for (let i = 0; i < nodeIndices.length; i++) {
      node = nodes[nodeIndices[i]];
      // set selected nodes aside
      if (node.isSelected()) {
        selected.push(nodeIndices[i]);
      }
      else {
        if (alwaysShow === true) {
          node.draw(ctx);
        }
        else if (node.isBoundingBoxOverlappingWith(viewableArea) === true) {
          node.draw(ctx);
        }
        else {
          node.updateBoundingBox(ctx, node.selected);
        }
      }
    }

    // draw the selected nodes on top
    for (let i = 0; i < selected.length; i++) {
      node = nodes[selected[i]];
      node.draw(ctx);
    }
  }


  /**
   * Redraw all edges
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  _drawEdges(ctx) {
    let edges = this.body.edges;
    let edgeIndices = this.body.edgeIndices;
    let edge;

    for (let i = 0; i < edgeIndices.length; i++) {
      edge = edges[edgeIndices[i]];
      if (edge.connected === true) {
        edge.draw(ctx);
      }
    }
  }

  /**
   * Determine if the browser requires a setTimeout or a requestAnimationFrame. This was required because
   * some implementations (safari and IE9) did not support requestAnimationFrame
   * @private
   */
  _determineBrowserMethod() {
    if (typeof window !== 'undefined') {
      let browserType = navigator.userAgent.toLowerCase();
      this.requiresTimeout = false;
      if (browserType.indexOf('msie 9.0') != -1) { // IE 9
        this.requiresTimeout = true;
      }
      else if (browserType.indexOf('safari') != -1) {  // safari
        if (browserType.indexOf('chrome') <= -1) {
          this.requiresTimeout = true;
        }
      }
    }
    else {
      this.requiresTimeout = true;
    }
  }

}

export default CanvasRenderer;