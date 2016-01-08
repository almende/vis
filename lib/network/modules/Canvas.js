let Hammer = require('../../module/hammer');
let hammerUtil = require('../../hammerUtil');

let util = require('../../util');

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
    this.pixelRatio = 1;
    this.resizeTimer = undefined;
    this.resizeFunction = this._onResize.bind(this);
    this.cameraState = {};

    this.options = {};
    this.defaultOptions = {
      autoResize: true,
      height: '100%',
      width: '100%'
    };
    util.extend(this.options, this.defaultOptions);

    this.bindEventListeners();
  }

  bindEventListeners() {
    // bind the events
    this.body.emitter.once("resize", (obj) => {
      if (obj.width !== 0) {
        this.body.view.translation.x = obj.width * 0.5;
      }
      if (obj.height !== 0) {
        this.body.view.translation.y = obj.height * 0.5;
      }
    });
    this.body.emitter.on("setSize", this.setSize.bind(this));
    this.body.emitter.on("destroy", () => {
      this.hammerFrame.destroy();
      this.hammer.destroy();
      this._cleanUp();
    });


  }

  setOptions(options) {
    if (options !== undefined) {
      let fields = ['width','height','autoResize'];
      util.selectiveDeepExtend(fields,this.options, options);
    }

    if (this.options.autoResize === true) {
      // automatically adapt to a changing size of the browser.
      this._cleanUp();
      this.resizeTimer = setInterval(() => {
        let changed = this.setSize();
        if (changed === true) {
          this.body.emitter.emit("_requestRedraw");
        }
      }, 1000);
      this.resizeFunction = this._onResize.bind(this);
      util.addEventListener(window,'resize',this.resizeFunction);
    }
  }

  _cleanUp() {
    // automatically adapt to a changing size of the browser.
    if (this.resizeTimer !== undefined) {
      clearInterval(this.resizeTimer);
    }
    util.removeEventListener(window,'resize',this.resizeFunction);
    this.resizeFunction = undefined;
  }

  _onResize() {
    this.setSize();
    this.body.emitter.emit("_redraw");
  }

  /**
   * Get and store the cameraState
   * @private
   */
  _getCameraState(pixelRatio = this.pixelRatio) {
    this.cameraState.previousWidth = this.frame.canvas.width / pixelRatio;
    this.cameraState.previousHeight = this.frame.canvas.height / pixelRatio;
    this.cameraState.scale = this.body.view.scale;
    this.cameraState.position = this.DOMtoCanvas({x: 0.5 * this.frame.canvas.width / pixelRatio, y: 0.5 * this.frame.canvas.height / pixelRatio});
  }

  /**
   * Set the cameraState
   * @private
   */
  _setCameraState() {
    if (this.cameraState.scale !== undefined &&
      this.frame.canvas.clientWidth !== 0 &&
      this.frame.canvas.clientHeight !== 0 &&
      this.pixelRatio !== 0 &&
      this.cameraState.previousWidth > 0) {

      let widthRatio = (this.frame.canvas.width / this.pixelRatio) / this.cameraState.previousWidth;
      let heightRatio = (this.frame.canvas.height / this.pixelRatio) / this.cameraState.previousHeight;
      let newScale = this.cameraState.scale;

      if (widthRatio != 1 && heightRatio != 1) {
        newScale = this.cameraState.scale * 0.5 * (widthRatio + heightRatio);
      }
      else if (widthRatio != 1) {
        newScale = this.cameraState.scale * widthRatio;
      }
      else if (heightRatio != 1) {
        newScale = this.cameraState.scale * heightRatio;
      }

      this.body.view.scale = newScale;
      // this comes from the view module.
      var currentViewCenter = this.DOMtoCanvas({
        x: 0.5 * this.frame.canvas.clientWidth,
        y: 0.5 * this.frame.canvas.clientHeight
      });

      var distanceFromCenter = { // offset from view, distance view has to change by these x and y to center the node
        x: currentViewCenter.x - this.cameraState.position.x,
        y: currentViewCenter.y - this.cameraState.position.y
      };
      this.body.view.translation.x += distanceFromCenter.x * this.body.view.scale;
      this.body.view.translation.y += distanceFromCenter.y * this.body.view.scale;
    }
  }

  _prepareValue(value) {
    if (typeof value === 'number') {
      return value + 'px';
    }
    else if (typeof value === 'string') {
      if (value.indexOf('%') !== -1 || value.indexOf('px') !== -1) {
        return value;
      }
      else if (value.indexOf('%') === -1) {
        return value + 'px';
      }
    }
    throw new Error('Could not use the value supplied for width or height:' + value);
  }


  /**
   * Create the HTML
   */
  _create() {
    // remove all elements from the container element.
    while (this.body.container.hasChildNodes()) {
      this.body.container.removeChild(this.body.container.firstChild);
    }

    this.frame = document.createElement('div');
    this.frame.className = 'vis-network';
    this.frame.style.position = 'relative';
    this.frame.style.overflow = 'hidden';
    this.frame.tabIndex = 900; // tab index is required for keycharm to bind keystrokes to the div instead of the window

    //////////////////////////////////////////////////////////////////

    this.frame.canvas = document.createElement("canvas");
    this.frame.canvas.style.position = 'relative';
    this.frame.appendChild(this.frame.canvas);

    if (!this.frame.canvas.getContext) {
      let noCanvas = document.createElement( 'DIV' );
      noCanvas.style.color = 'red';
      noCanvas.style.fontWeight =  'bold' ;
      noCanvas.style.padding =  '10px';
      noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
      this.frame.canvas.appendChild(noCanvas);
    }
    else {
      let ctx = this.frame.canvas.getContext("2d");
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
    // enable to get better response, todo: test on mobile.
    this.hammer.get('pan').set({threshold:5, direction:30}); // 30 is ALL_DIRECTIONS in hammer.

    hammerUtil.onTouch(this.hammer, (event) => {this.body.eventListeners.onTouch(event)});
    this.hammer.on('tap',       (event) => {this.body.eventListeners.onTap(event)});
    this.hammer.on('doubletap', (event) => {this.body.eventListeners.onDoubleTap(event)});
    this.hammer.on('press',     (event) => {this.body.eventListeners.onHold(event)});
    this.hammer.on('panstart',  (event) => {this.body.eventListeners.onDragStart(event)});
    this.hammer.on('panmove',   (event) => {this.body.eventListeners.onDrag(event)});
    this.hammer.on('panend',    (event) => {this.body.eventListeners.onDragEnd(event)});
    this.hammer.on('pinch',     (event) => {this.body.eventListeners.onPinch(event)});

    // TODO: neatly cleanup these handlers when re-creating the Canvas, IF these are done with hammer, event.stopPropagation will not work?
    this.frame.canvas.addEventListener('mousewheel',     (event) => {this.body.eventListeners.onMouseWheel(event)});
    this.frame.canvas.addEventListener('DOMMouseScroll', (event) => {this.body.eventListeners.onMouseWheel(event)});

    this.frame.canvas.addEventListener('mousemove', (event) => {this.body.eventListeners.onMouseMove(event)});
    this.frame.canvas.addEventListener('contextmenu', (event) => {this.body.eventListeners.onContext(event)});

    this.hammerFrame = new Hammer(this.frame);
    hammerUtil.onRelease(this.hammerFrame, (event) => {this.body.eventListeners.onRelease(event)});
  }


  /**
   * Set a new size for the network
   * @param {string} width   Width in pixels or percentage (for example '800px'
   *                         or '50%')
   * @param {string} height  Height in pixels or percentage  (for example '400px'
   *                         or '30%')
   */
  setSize(width = this.options.width, height = this.options.height) {
    width = this._prepareValue(width);
    height= this._prepareValue(height);

    let emitEvent = false;
    let oldWidth = this.frame.canvas.width;
    let oldHeight = this.frame.canvas.height;

    // update the pixel ratio
    let ctx = this.frame.canvas.getContext("2d");
    let previousRatio = this.pixelRatio; // we cache this because the camera state storage needs the old value
    this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);

    if (width != this.options.width || height != this.options.height || this.frame.style.width != width || this.frame.style.height != height) {
      this._getCameraState(previousRatio);

      this.frame.style.width = width;
      this.frame.style.height = height;

      this.frame.canvas.style.width = '100%';
      this.frame.canvas.style.height = '100%';

      this.frame.canvas.width = Math.round(this.frame.canvas.clientWidth * this.pixelRatio);
      this.frame.canvas.height = Math.round(this.frame.canvas.clientHeight * this.pixelRatio);

      this.options.width = width;
      this.options.height = height;

      emitEvent = true;
    }
    else {
      // this would adapt the width of the canvas to the width from 100% if and only if
      // there is a change.

      // store the camera if there is a change in size.
      if (this.frame.canvas.width != Math.round(this.frame.canvas.clientWidth * this.pixelRatio) || this.frame.canvas.height != Math.round(this.frame.canvas.clientHeight * this.pixelRatio)) {
        this._getCameraState(previousRatio);
      }

      if (this.frame.canvas.width != Math.round(this.frame.canvas.clientWidth * this.pixelRatio)) {
        this.frame.canvas.width = Math.round(this.frame.canvas.clientWidth * this.pixelRatio);
        emitEvent = true;
      }
      if (this.frame.canvas.height != Math.round(this.frame.canvas.clientHeight * this.pixelRatio)) {
        this.frame.canvas.height = Math.round(this.frame.canvas.clientHeight * this.pixelRatio);
        emitEvent = true;
      }
    }

    if (emitEvent === true) {
      this.body.emitter.emit('resize', {
        width:Math.round(this.frame.canvas.width / this.pixelRatio),
        height:Math.round(this.frame.canvas.height / this.pixelRatio),
        oldWidth: Math.round(oldWidth / this.pixelRatio),
        oldHeight: Math.round(oldHeight / this.pixelRatio)
      });

      // restore the camera on change.
      this._setCameraState();
    }

    return emitEvent;
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

export default Canvas;