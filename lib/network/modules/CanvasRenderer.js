/**
 * Created by Alex on 26-Feb-15.
 */

if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
}

class CanvasRenderer {
  constructor(body) {
    this.body = body;

    this.redrawRequested = false;
    this.renderTimer = false;
    this.requiresTimeout = true;
    this.continueRendering = true;
    this.renderRequests = 0;

    this.translation = {x: 0, y: 0};
    this.scale = 1.0;
    this.canvasTopLeft     = {x: 0, y: 0};
    this.canvasBottomRight = {x: 0, y: 0};

    this.body.emitter.on("_setScale",       (scale) => this.scale = scale);
    this.body.emitter.on("_setTranslation", (translation) => {this.translation.x = translation.x; this.translation.y = translation.y;});
    this.body.emitter.on("_redraw",         this._redraw.bind(this));
    this.body.emitter.on("_redrawHidden",   this._redraw.bind(this, true));
    this.body.emitter.on("_requestRedraw",  this._requestRedraw.bind(this));
    this.body.emitter.on("_startRendering", () => {this.renderRequests += 1; this.continueRendering = true; this.startRendering();});
    this.body.emitter.on("_stopRendering",  () => {this.renderRequests -= 1; this.continueRendering = this.renderRequests > 0;});

    this._determineBrowserMethod();
  }


  startRendering() {
    if (this.continueRendering === true) {
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

  setCanvas(canvas) {
    this.canvas = canvas;
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
  _requestRedraw(hidden) {
    if (this.redrawRequested !== true) {
      this.redrawRequested = true;
      if (this.requiresTimeout === true) {
        window.setTimeout(this._redraw.bind(this, hidden),0);
      }
      else {
        window.requestAnimationFrame(this._redraw.bind(this, hidden, true));
      }
    }
  }

  _redraw(hidden = false) {
    this.body.emitter.emit("_beforeRender");

    this.redrawRequested = false;
    var ctx = this.canvas.frame.canvas.getContext('2d');

    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    // clear the canvas
    var w = this.canvas.frame.canvas.clientWidth;
    var h = this.canvas.frame.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // set scaling and translation
    ctx.save();
    ctx.translate(this.translation.x, this.translation.y);
    ctx.scale(this.scale, this.scale);

    this.canvasTopLeft = this.canvas.DOMtoCanvas({x:0,y:0});
    this.canvasBottomRight = this.canvas.DOMtoCanvas({x:this.canvas.frame.canvas.clientWidth,y:this.canvas.frame.canvas.clientHeight});

    if (hidden === false) {
      // todo: solve this
      //if (this.drag.dragging == false || this.drag.dragging === undefined || this.constants.hideEdgesOnDrag == false) {
        this._drawEdges(ctx);
      //}
    }

    // todo: solve this
    //if (this.drag.dragging == false || this.drag.dragging === undefined || this.constants.hideNodesOnDrag == false) {
      this._drawNodes(ctx, this.body.nodes, hidden);
    //}

    if (hidden === false) {
      if (this.controlNodesActive == true) {
        this._drawControlNodes(ctx);
      }
    }

    //this._drawNodes(ctx,this.body.supportNodes,true);
  //  this.physics.nodesSolver._debug(ctx,"#F00F0F");

    // restore original scaling and translation
    ctx.restore();

    if (hidden === true) {
      ctx.clearRect(0, 0, w, h);
    }
  }


  /**
   * Redraw all nodes
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext('2d');
   * @param {CanvasRenderingContext2D}   ctx
   * @param {Boolean} [alwaysShow]
   * @private
   */
  _drawNodes(ctx,nodes,alwaysShow = false) {
    // first draw the unselected nodes
    var selected = [];

    for (var id in nodes) {
      if (nodes.hasOwnProperty(id)) {
        nodes[id].setScaleAndPos(this.scale,this.canvasTopLeft,this.canvasBottomRight);
        if (nodes[id].isSelected()) {
          selected.push(id);
        }
        else {
          if (alwaysShow === true) {
            nodes[id].draw(ctx);
          }
          else if (nodes[id].inArea() === true) {
            nodes[id].draw(ctx);
          }
        }
      }
    }

    // draw the selected nodes on top
    for (var s = 0, sMax = selected.length; s < sMax; s++) {
      if (nodes[selected[s]].inArea() || alwaysShow) {
        nodes[selected[s]].draw(ctx);
      }
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
    for (var id in edges) {
      if (edges.hasOwnProperty(id)) {
        var edge = edges[id];
        edge.setScale(this.scale);
        if (edge.connected === true) {
          edges[id].draw(ctx);
        }
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
    for (var id in edges) {
      if (edges.hasOwnProperty(id)) {
        edges[id]._drawControlNodes(ctx);
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

export {CanvasRenderer};