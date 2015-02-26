/**
 * Created by Alex on 26-Feb-15.
 */


var Hammer = require('../../module/hammer');

class Canvas {
  /**
   * Create the main frame for the Network.
   * This function is executed once when a Network object is created. The frame
   * contains a canvas, and this canvas contains all objects like the axis and
   * nodes.
   * @private
   */
  constructor(body, options) {
    this.body = body;
    this.setOptions(options);

    this.translation = {x: 0, y: 0};
    this.scale = 1.0;
    this.body.emitter.on("_setScale",       (scale) => {this.scale = scale});
    this.body.emitter.on("_setTranslation", (translation) => {this.translation.x = translation.x; this.translation.y = translation.y;});
    this.body.emitter.once("resize",        (obj) => {this.translation.x = obj.width * 0.5; this.translation.y = obj.height * 0.5; this.body.emitter.emit("_setTranslation", this.translation)});

    this.pixelRatio = 1;

    // remove all elements from the container element.
    while (this.body.container.hasChildNodes()) {
      this.body.container.removeChild(this.body.container.firstChild);
    }

    this.frame = document.createElement('div');
    this.frame.className = 'vis network-frame';
    this.frame.style.position = 'relative';
    this.frame.style.overflow = 'hidden';
    this.frame.tabIndex = 900;

    //////////////////////////////////////////////////////////////////

    this.frame.canvas = document.createElement("canvas");
    this.frame.canvas.style.position = 'relative';
    this.frame.appendChild(this.frame.canvas);

    if (!this.frame.canvas.getContext) {
      var noCanvas = document.createElement( 'DIV' );
      noCanvas.style.color = 'red';
      noCanvas.style.fontWeight =  'bold' ;
      noCanvas.style.padding =  '10px';
      noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
      this.frame.canvas.appendChild(noCanvas);
    }
    else {
      var ctx = this.frame.canvas.getContext("2d");
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);

      //this.pixelRatio = Math.max(1,this.pixelRatio); // this is to account for browser zooming out. The pixel ratio is ment to switch between 1 and 2 for HD screens.
      this.frame.canvas.getContext("2d").setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    // add the frame to the container element
    this.body.container.appendChild(this.frame);

    this.body.emitter.emit("_setScale", 1);;
    this.body.emitter.emit("_setTranslation", {x: 0.5 * this.frame.canvas.clientWidth,y: 0.5 * this.frame.canvas.clientHeight});;

    this._bindHammer();
  }


  /**
   * This function binds hammer, it can be repeated over and over due to the uniqueness check.
   * @private
   */
  _bindHammer() {
    var me = this;
    if (this.hammer !== undefined) {
      this.hammer.dispose();
    }
    this.drag = {};
    this.pinch = {};
    this.hammer = Hammer(this.frame.canvas, {
      prevent_default: true
    });
    this.hammer.on('tap',       me.body.eventListeners.onTap );
    this.hammer.on('doubletap', me.body.eventListeners.onDoubleTap );
    this.hammer.on('hold',      me.body.eventListeners.onHold );
    this.hammer.on('touch',     me.body.eventListeners.onTouch );
    this.hammer.on('dragstart', me.body.eventListeners.onDragStart );
    this.hammer.on('drag',      me.body.eventListeners.onDrag );
    this.hammer.on('dragend',   me.body.eventListeners.onDragEnd );

    if (this.options.zoomable == true) {
      this.hammer.on('mousewheel',      me.body.eventListeners.onMouseWheel.bind(me));
      this.hammer.on('DOMMouseScroll',  me.body.eventListeners.onMouseWheel.bind(me)); // for FF
      this.hammer.on('pinch',           me.body.eventListeners.onPinch.bind(me) );
    }

    this.hammer.on('mousemove', me.body.eventListeners.onMouseMove.bind(me) );

    this.hammerFrame = Hammer(this.frame, {
      prevent_default: true
    });
    this.hammerFrame.on('release', me.body.eventListeners.onRelease.bind(me) );
  }


  setOptions(options = {}) {
    this.options = options;
  }

  /**
   * Set a new size for the network
   * @param {string} width   Width in pixels or percentage (for example '800px'
   *                         or '50%')
   * @param {string} height  Height in pixels or percentage  (for example '400px'
   *                         or '30%')
   */
  setSize(width, height) {
    var emitEvent = false;
    var oldWidth = this.frame.canvas.width;
    var oldHeight = this.frame.canvas.height;
    if (width != this.options.width || height != this.options.height || this.frame.style.width != width || this.frame.style.height != height) {
      this.frame.style.width = width;
      this.frame.style.height = height;

      this.frame.canvas.style.width = '100%';
      this.frame.canvas.style.height = '100%';

      this.frame.canvas.width = this.frame.canvas.clientWidth * this.pixelRatio;
      this.frame.canvas.height = this.frame.canvas.clientHeight * this.pixelRatio;

      this.options.width = width;
      this.options.height = height;

      emitEvent = true;
    }
    else {
      // this would adapt the width of the canvas to the width from 100% if and only if
      // there is a change.

      if (this.frame.canvas.width != this.frame.canvas.clientWidth * this.pixelRatio) {
        this.frame.canvas.width = this.frame.canvas.clientWidth * this.pixelRatio;
        emitEvent = true;
      }
      if (this.frame.canvas.height != this.frame.canvas.clientHeight * this.pixelRatio) {
        this.frame.canvas.height = this.frame.canvas.clientHeight * this.pixelRatio;
        emitEvent = true;
      }
    }

    if (emitEvent === true) {
      this.body.emitter.emit('resize', {width:this.frame.canvas.width * this.pixelRatio,height:this.frame.canvas.height * this.pixelRatio, oldWidth: oldWidth * this.pixelRatio, oldHeight: oldHeight * this.pixelRatio});
    }
  };


  /**
   * Convert the X coordinate in DOM-space (coordinate point in browser relative to the container div) to
   * the X coordinate in canvas-space (the simulation sandbox, which the camera looks upon)
   * @param {number} x
   * @returns {number}
   * @private
   */
  _XconvertDOMtoCanvas(x) {
    return (x - this.translation.x) / this.scale;
  }

  /**
   * Convert the X coordinate in canvas-space (the simulation sandbox, which the camera looks upon) to
   * the X coordinate in DOM-space (coordinate point in browser relative to the container div)
   * @param {number} x
   * @returns {number}
   * @private
   */
  _XconvertCanvasToDOM(x) {
    return x * this.scale + this.translation.x;
  }

  /**
   * Convert the Y coordinate in DOM-space (coordinate point in browser relative to the container div) to
   * the Y coordinate in canvas-space (the simulation sandbox, which the camera looks upon)
   * @param {number} y
   * @returns {number}
   * @private
   */
  _YconvertDOMtoCanvas(y) {
    return (y - this.translation.y) / this.scale;
  }

  /**
   * Convert the Y coordinate in canvas-space (the simulation sandbox, which the camera looks upon) to
   * the Y coordinate in DOM-space (coordinate point in browser relative to the container div)
   * @param {number} y
   * @returns {number}
   * @private
   */
  _YconvertCanvasToDOM(y) {
    return y * this.scale + this.translation.y ;
  }


  /**
   *
   * @param {object} pos   = {x: number, y: number}
   * @returns {{x: number, y: number}}
   * @constructor
   */
  canvasToDOM (pos) {
    return {x: this._XconvertCanvasToDOM(pos.x), y: this._YconvertCanvasToDOM(pos.y)};
  }

  /**
   *
   * @param {object} pos   = {x: number, y: number}
   * @returns {{x: number, y: number}}
   * @constructor
   */
  DOMtoCanvas (pos) {
    return {x: this._XconvertDOMtoCanvas(pos.x), y: this._YconvertDOMtoCanvas(pos.y)};
  }

}

export {Canvas};