var Hammer = require('../../module/hammer');
var hammerUtil = require('../../hammerUtil');

var util = require('../../util');

/**
 * Create the main frame for the Network.
 * This function is executed once when a Network object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 * @private
 */
class Canvas {
  constructor(body) {
    this.body = body;

    this.options = {};
    this.defaultOptions = {
      width:'100%',
      height:'100%'
    }
    util.extend(this.options, this.defaultOptions);

    this.body.emitter.once("resize", (obj) => {this.body.view.translation.x = obj.width * 0.5; this.body.view.translation.y = obj.height * 0.5;});

    this.pixelRatio = 1;
  }

  setOptions(options) {
    if (options !== undefined) {
      util.deepExtend(this.options, options);
    }
  }

  create() {
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

      this.frame.canvas.getContext("2d").setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    // add the frame to the container element
    this.body.container.appendChild(this.frame);

    this.body.view.scale = 1;
    this.body.view.translation = {x: 0.5 * this.frame.canvas.clientWidth,y: 0.5 * this.frame.canvas.clientHeight};

    this._bindHammer();
  }


  /**
   * This function binds hammer, it can be repeated over and over due to the uniqueness check.
   * @private
   */
  _bindHammer() {
    if (this.hammer !== undefined) {
      this.hammer.destroy();
    }
    this.drag = {};
    this.pinch = {};

    // init hammer
    this.hammer = new Hammer(this.frame.canvas);
    this.hammer.get('pinch').set({enable: true});

    this.hammer.on('tap',       this.body.eventListeners.onTap );
    this.hammer.on('doubletap', this.body.eventListeners.onDoubleTap );
    this.hammer.on('press',     this.body.eventListeners.onHold );
    hammerUtil.onTouch(this.hammer, this.body.eventListeners.onTouch );
    this.hammer.on('panstart',  this.body.eventListeners.onDragStart );
    this.hammer.on('panmove',   this.body.eventListeners.onDrag );
    this.hammer.on('panend',    this.body.eventListeners.onDragEnd );
    this.hammer.on('pinch',     this.body.eventListeners.onPinch );

    // TODO: neatly cleanup these handlers when re-creating the Canvas, IF these are done with hammer, event.stopPropagation will not work?
    this.frame.canvas.addEventListener('mousewheel',     this.body.eventListeners.onMouseWheel);
    this.frame.canvas.addEventListener('DOMMouseScroll', this.body.eventListeners.onMouseWheel);

    this.frame.canvas.addEventListener('mousemove', this.body.eventListeners.onMouseMove);

    this.hammerFrame = new Hammer(this.frame);
    hammerUtil.onRelease(this.hammerFrame, this.body.eventListeners.onRelease);
  }


  /**
   * Set a new size for the network
   * @param {string} width   Width in pixels or percentage (for example '800px'
   *                         or '50%')
   * @param {string} height  Height in pixels or percentage  (for example '400px'
   *                         or '30%')
   */
  setSize(width = this.options.width, height = this.options.height) {
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
      this.body.emitter.emit('resize', {width:this.frame.canvas.width / this.pixelRatio, height:this.frame.canvas.height / this.pixelRatio, oldWidth: oldWidth / this.pixelRatio, oldHeight: oldHeight / this.pixelRatio});
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
    return (x - this.body.view.translation.x) / this.body.view.scale;
  }

  /**
   * Convert the X coordinate in canvas-space (the simulation sandbox, which the camera looks upon) to
   * the X coordinate in DOM-space (coordinate point in browser relative to the container div)
   * @param {number} x
   * @returns {number}
   * @private
   */
  _XconvertCanvasToDOM(x) {
    return x * this.body.view.scale + this.body.view.translation.x;
  }

  /**
   * Convert the Y coordinate in DOM-space (coordinate point in browser relative to the container div) to
   * the Y coordinate in canvas-space (the simulation sandbox, which the camera looks upon)
   * @param {number} y
   * @returns {number}
   * @private
   */
  _YconvertDOMtoCanvas(y) {
    return (y - this.body.view.translation.y) / this.body.view.scale;
  }

  /**
   * Convert the Y coordinate in canvas-space (the simulation sandbox, which the camera looks upon) to
   * the Y coordinate in DOM-space (coordinate point in browser relative to the container div)
   * @param {number} y
   * @returns {number}
   * @private
   */
  _YconvertCanvasToDOM(y) {
    return y * this.body.view.scale + this.body.view.translation.y;
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