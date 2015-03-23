/**
 * Created by Alex on 26-Feb-15.
 */

if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
}

var util = require('../../util');


class CanvasRenderer {
  constructor(body, canvas) {
    this.body = body;
    this.canvas = canvas;

    this.redrawRequested = false;
    this.renderTimer = false;
    this.requiresTimeout = true;
    this.renderingActive = false;
    this.renderRequests = 0;
    this.pixelRatio = undefined;

    // redefined in this._redraw
    this.canvasTopLeft     = {x: 0, y: 0};
    this.canvasBottomRight = {x: 0, y: 0};

    this.dragging = false;

    this.body.emitter.on("dragStart",       () => {this.dragging = true;});
    this.body.emitter.on("dragEnd",         () => this.dragging = false);
    this.body.emitter.on("_redraw",         () => {if (this.renderingActive === false) {this._redraw();}});
    this.body.emitter.on("_requestRedraw",  this._requestRedraw.bind(this));
    this.body.emitter.on("_startRendering", () => {this.renderRequests += 1; this.renderingActive = true; this.startRendering();});
    this.body.emitter.on("_stopRendering",  () => {this.renderRequests -= 1; this.renderingActive = this.renderRequests > 0;});

    this.options = {};
    this.defaultOptions = {
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false
    }
    util.extend(this.options,this.defaultOptions);

    this._determineBrowserMethod();
  }

  setOptions(options) {
    if (options !== undefined) {
      util.deepExtend(this.options, options);
    }
  }


  startRendering() {
    if (this.renderingActive === true) {
      if (!this.renderTimer) {
        if (this.requiresTimeout == true) {
          this.renderTimer = window.setTimeout(this.renderStep.bind(this), this.simulationInterval); // wait this.renderTimeStep milliseconds and perform the animation step function
        }
        else {
          this.renderTimer = window.requestAnimationFrame(this.renderStep.bind(this)); // wait this.renderTimeStep milliseconds and perform the animation step function
        }
      }
    }
    else {

    }
  }

  renderStep() {
    // reset the renderTimer so a new scheduled animation step can be set
    this.renderTimer = undefined;

    if (this.requiresTimeout == true) {
      // this schedules a new simulation step
      this.startRendering();
    }

    this._redraw();

    if (this.requiresTimeout == false) {
      // this schedules a new simulation step
      this.startRendering();
    }
  }

  /**
   * Redraw the network with the current data
   * chart will be resized too.
   */
  redraw() {
    this.setSize(this.constants.width, this.constants.height);
    this._redraw();
  }

  /**
   * Redraw the network with the current data
   * @param hidden | used to get the first estimate of the node sizes. only the nodes are drawn after which they are quickly drawn over.
   * @private
   */
  _requestRedraw() {
    if (this.redrawRequested !== true && this.renderingActive === false) {
      this.redrawRequested = true;
      if (this.requiresTimeout === true) {
        window.setTimeout(this._redraw.bind(this, false),0);
      }
      else {
        window.requestAnimationFrame(this._redraw.bind(this, false));
      }
    }
  }

  _redraw(hidden = false) {
    this.body.emitter.emit("initRedraw");

    this.redrawRequested = false;
    var ctx = this.canvas.frame.canvas.getContext('2d');

    if (this.pixelRation === undefined) {
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);
    }

    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    // clear the canvas
    var w = this.canvas.frame.canvas.clientWidth;
    var h = this.canvas.frame.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    this.body.emitter.emit("beforeDrawing", ctx);

    // set scaling and translation
    ctx.save();
    ctx.translate(this.body.view.translation.x, this.body.view.translation.y);
    ctx.scale(this.body.view.scale, this.body.view.scale);

    this.canvasTopLeft     = this.canvas.DOMtoCanvas({x:0,y:0});
    this.canvasBottomRight = this.canvas.DOMtoCanvas({x:this.canvas.frame.canvas.clientWidth,y:this.canvas.frame.canvas.clientHeight});

    if (hidden === false) {
      if (this.dragging === false || (this.dragging === true && this.options.hideEdgesOnDrag === false)) {
        this._drawEdges(ctx);
      }
    }

    if (this.dragging === false || (this.dragging === true && this.options.hideNodesOnDrag === false)) {
      this._drawNodes(ctx, hidden);
    }

    if (this.controlNodesActive === true) {
      this._drawControlNodes(ctx);
    }

    //this.physics.nodesSolver._debug(ctx,"#F00F0F");

    // restore original scaling and translation
    ctx.restore();

    if (hidden === true) {
      ctx.clearRect(0, 0, w, h);
    }

    this.body.emitter.emit("afterDrawing", ctx);
  }


  /**
   * Redraw all nodes
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Boolean} [alwaysShow]
   * @private
   */
  _drawNodes(ctx,alwaysShow = false) {
    var nodes = this.body.nodes;
    var nodeIndices = this.body.nodeIndices;
    var node;
    var selected = [];

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
        // todo: replace check
        //else if (node.inArea() === true) {
          node.draw(ctx);
        //}
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
    var edges = this.body.edges;
    var edgeIndices = this.body.edgeIndices;
    var edge;

    for (let i = 0; i < edgeIndices.length; i++) {
      edge = edges[edgeIndices[i]];
      if (edge.connected === true) {
        edge.draw(ctx);
      }
    }
  }

  /**
   * Redraw all edges
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  _drawControlNodes(ctx) {
    var edges = this.body.edges;
    var edgeIndices = this.body.edgeIndices;
    var edge;

    for (let i = 0; i < edgeIndices.length; i++) {
      edge = edges[edgeIndices[i]];
      edge._drawControlNodes(ctx);
    }
  }

  /**
   * Determine if the browser requires a setTimeout or a requestAnimationFrame. This was required because
   * some implementations (safari and IE9) did not support requestAnimationFrame
   * @private
   */
  _determineBrowserMethod() {
    if (typeof window !== 'undefined') {
      var browserType = navigator.userAgent.toLowerCase();
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