/**
 * Created by Alex on 3/27/2015.
 */

let Hammer = require('../../../module/hammer');
let hammerUtil = require('../../../hammerUtil');
let util = require('../../../util');

class ColorPicker {
  constructor(pixelRatio = 1) {
    this.pixelRatio = pixelRatio;
    this.generated = false;
    this.centerCoordinates = {x:289/2, y:289/2};
    this.r = 289 * 0.49;
    this.color = {r:255,g:255,b:255,a:1.0};
    this.hueCircle = undefined;
    this.initialColor = {r:255,g:255,b:255,a:1.0};
    this.previousColor= undefined;
    this.applied = false;

    // bound by
    this.updateCallback = () => {};

    // create all DOM elements
    this._create();
  }


  /**
   * this inserts the colorPicker into a div from the DOM
   * @param container
   */
  insertTo(container) {
    if (this.hammer !== undefined) {
      this.hammer.destroy();
      this.hammer = undefined;
    }
    this.container = container;
    this.container.appendChild(this.frame);
    this._bindHammer();

    this._setSize();
  }

  /**
   * the callback is executed on apply and save. Bind it to the application
   * @param callback
   */
  setCallback(callback) {
    if (typeof callback === 'function') {
      this.updateCallback = callback;
    }
    else {
      throw new Error("Function attempted to set as colorPicker callback is not a function.");
    }
  }


  /**
   * Set the color of the colorPicker
   * Supported formats:
   * '#ffffff'               --> hex string
   * 'rbg(255,255,255)'      --> rgb string
   * 'rgba(255,255,255,1.0)' --> rgba string
   * {r:255,g:255,b:255}     --> rgb object
   * {r:255,g:255,b:255,a:1.0} --> rgba object
   * @param color
   * @param setInitial
   */
  setColor(color, setInitial = true) {
    if (color === 'none') {
      return;
    }

    let rgba;

    // check format
    if (util.isString(color) === true) {
      if (util.isValidRGB(color) === true) {
        let rgbaArray = color.substr(4).substr(0, color.length - 5).split(',');
        rgba = {r:rgbaArray[0], g:rgbaArray[1], b:rgbaArray[2], a:1.0};
      }
      else if (util.isValidRGBA(color) === true) {
        let rgbaArray = color.substr(5).substr(0, color.length - 6).split(',');
        rgba = {r:rgbaArray[0], g:rgbaArray[1], b:rgbaArray[2], a:rgbaArray[3]};
      }
      else if (util.isValidHex(color) === true) {
        let rgbObj = util.hexToRGB(color);
        rgba = {r:rgbObj.r, g:rgbObj.g, b:rgbObj.b, a:1.0};
      }
    }
    else {
      if (color instanceof Object) {
        if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
          let alpha = color.a !== undefined ? color.a : '1.0';
          rgba = {r:color.r, g:color.g, b:color.b, a:alpha};
        }
      }
    }

    // set color
    if (rgba === undefined) {
      throw new Error("Unknown color passed to the colorPicker. Supported are strings: rgb, hex, rgba. Object: rgb ({r:r,g:g,b:b,[a:a]}). Supplied: " + JSON.stringify(color));
    }
    else {
      this._setColor(rgba, setInitial);
    }
  }


  /**
   * this shows the color picker at a location. The hue circle is constructed once and stored.
   * @param x
   * @param y
   */
  show(x,y) {
    this.applied = false;
    this.frame.style.display = 'block';
    this.frame.style.top = y + 'px';
    this.frame.style.left = x + 'px';
    this._generateHueCircle();
  }


  // ------------------------------------------ PRIVATE ----------------------------- //

  /**
   * Hide the picker. Is called by the cancel button.
   * Optional boolean to store the previous color for easy access later on.
   * @param storePrevious
   * @private
   */
  _hide(storePrevious = true) {
    // store the previous color for next time;
    if (storePrevious === true) {
      this.previousColor = util.extend({}, this.color);
    }

    if (this.applied === true) {
      this.updateCallback(this.initialColor);
    }

    this.frame.style.display = 'none';
  }


  /**
   * bound to the save button. Saves and hides.
   * @private
   */
  _save() {
    this.updateCallback(this.color);
    this.applied = false;
    this._hide();
  }


  /**
   * Bound to apply button. Saves but does not close. Is undone by the cancel button.
   * @private
   */
  _apply() {
    this.applied = true;
    this.updateCallback(this.color);
    this._updatePicker(this.color);
  }


  /**
   * load the color from the previous session.
   * @private
   */
  _loadLast() {
    if (this.previousColor !== undefined) {
      this.setColor(this.previousColor, false);
    }
    else {
      alert("There is no last color to load...");
    }
  }


  /**
   * set the color, place the picker
   * @param rgba
   * @param setInitial
   * @private
   */
  _setColor(rgba, setInitial = true) {
    // store the initial color
    if (setInitial === true) {
      this.initialColor = util.extend({}, rgba);
    }

    this.color = rgba;
    let hsv = util.RGBToHSV(rgba.r, rgba.g, rgba.b);

    let angleConvert = 2 * Math.PI;
    let radius = this.r * hsv.s;
    let x = this.centerCoordinates.x + radius * Math.sin(angleConvert * hsv.h);
    let y = this.centerCoordinates.y + radius * Math.cos(angleConvert * hsv.h);

    this.colorPickerSelector.style.left = x - 0.5 * this.colorPickerSelector.clientWidth + 'px';
    this.colorPickerSelector.style.top = y - 0.5 * this.colorPickerSelector.clientHeight + 'px';

    this._updatePicker(rgba);
  }


  /**
   * bound to opacity control
   * @param value
   * @private
   */
  _setOpacity(value) {
    this.color.a = value / 100;
    this._updatePicker(this.color);
  }


  /**
   * bound to brightness control
   * @param value
   * @private
   */
  _setBrightness(value) {
    let hsv = util.RGBToHSV(this.color.r, this.color.g, this.color.b);
    hsv.v = value / 100;
    let rgba = util.HSVToRGB(hsv.h, hsv.s, hsv.v);
    rgba['a'] = this.color.a;
    this.color = rgba;
    this._updatePicker();
  }


  /**
   * update the colorpicker. A black circle overlays the hue circle to mimic the brightness decreasing.
   * @param rgba
   * @private
   */
  _updatePicker(rgba = this.color) {
    let hsv = util.RGBToHSV(rgba.r, rgba.g, rgba.b);
    let ctx = this.colorPickerCanvas.getContext('2d');
    if (this.pixelRation === undefined) {
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);
    }
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    // clear the canvas
    let w = this.colorPickerCanvas.clientWidth;
    let h = this.colorPickerCanvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.putImageData(this.hueCircle, 0,0);
    ctx.fillStyle = 'rgba(0,0,0,' + (1- hsv.v) + ')';
    ctx.circle(this.centerCoordinates.x, this.centerCoordinates.y, this.r);
    ctx.fill();

    this.brightnessRange.value = 100 * hsv.v;
    this.opacityRange.value    = 100 * rgba.a;

    this.initialColorDiv.style.backgroundColor = 'rgba(' + this.initialColor.r + ',' + this.initialColor.g + ',' + this.initialColor.b + ',' + this.initialColor.a + ')';
    this.newColorDiv.style.backgroundColor = 'rgba(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ',' + this.color.a + ')';
  }


  /**
   * used by create to set the size of the canvas.
   * @private
   */
  _setSize() {
    this.colorPickerCanvas.style.width = '100%';
    this.colorPickerCanvas.style.height = '100%';

    this.colorPickerCanvas.width = 289 * this.pixelRatio;
    this.colorPickerCanvas.height = 289 * this.pixelRatio;
  }


  /**
   * create all dom elements
   * TODO: cleanup, lots of similar dom elements
   * @private
   */
  _create() {
    let visPrefix = 'vis-network-'

    this.frame = document.createElement('div');
    this.frame.className = visPrefix + 'colorPicker-frame';

    this.colorPickerDiv = document.createElement('div');
    this.colorPickerSelector = document.createElement('div');
    this.colorPickerSelector.className = visPrefix + 'colorPicker-selector';
    this.colorPickerDiv.appendChild(this.colorPickerSelector);

    this.colorPickerCanvas = document.createElement('canvas');
    this.colorPickerDiv.appendChild(this.colorPickerCanvas);

    if (!this.colorPickerCanvas.getContext) {
      let noCanvas = document.createElement( 'DIV' );
      noCanvas.style.color = 'red';
      noCanvas.style.fontWeight =  'bold' ;
      noCanvas.style.padding =  '10px';
      noCanvas.innerHTML =  'Error: your browser does not support HTML canvas';
      this.colorPickerCanvas.appendChild(noCanvas);
    }
    else {
      let ctx = this.colorPickerCanvas.getContext("2d");
      this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1);

      this.colorPickerCanvas.getContext("2d").setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    this.colorPickerDiv.className = visPrefix + 'colorPicker-color';

    this.opacityDiv = document.createElement('div');
    this.opacityDiv.className = visPrefix + 'colorPicker-opacity';

    this.brightnessDiv = document.createElement('div');
    this.brightnessDiv.className = visPrefix + 'colorPicker-brightness';

    this.arrowDiv = document.createElement('div');
    this.arrowDiv.className = visPrefix + 'colorPicker-arrowDiv';

    this.opacityRange = document.createElement('input');
    this.opacityRange.type = 'range';
    this.opacityRange.min = '0';
    this.opacityRange.max = '100';
    this.opacityRange.value = '100';
    this.opacityRange.className = visPrefix + 'configuration range colorPicker';

    this.brightnessRange = document.createElement('input');
    this.brightnessRange.type = 'range';
    this.brightnessRange.min = '0';
    this.brightnessRange.max = '100';
    this.brightnessRange.value = '100';
    this.brightnessRange.className = visPrefix + 'configuration range colorPicker';

    this.opacityDiv.appendChild(this.opacityRange);
    this.brightnessDiv.appendChild(this.brightnessRange);

    var me = this;
    this.opacityRange.onchange = function () {me._setOpacity(this.value);}
    this.opacityRange.oninput  = function () {me._setOpacity(this.value);}
    this.brightnessRange.onchange = function () {me._setBrightness(this.value);}
    this.brightnessRange.oninput  = function () {me._setBrightness(this.value);}

    this.brightnessLabel = document.createElement("div");
    this.brightnessLabel.className = visPrefix + "colorPicker-label brightness";
    this.brightnessLabel.innerHTML = 'brightness:';

    this.opacityLabel = document.createElement("div");
    this.opacityLabel.className = visPrefix + "colorPicker-label opacity";
    this.opacityLabel.innerHTML = 'opacity:';

    this.newColorDiv = document.createElement("div");
    this.newColorDiv.className = visPrefix + "colorPicker-newColor";
    this.newColorDiv.innerHTML = 'new';

    this.initialColorDiv = document.createElement("div");
    this.initialColorDiv.className = visPrefix + "colorPicker-initialColor";
    this.initialColorDiv.innerHTML = 'initial';

    this.cancelButton = document.createElement("div");
    this.cancelButton.className = visPrefix + "colorPicker-button cancel";
    this.cancelButton.innerHTML = 'cancel';
    this.cancelButton.onclick = this._hide.bind(this, false);

    this.applyButton = document.createElement("div");
    this.applyButton.className = visPrefix + "colorPicker-button apply";
    this.applyButton.innerHTML = 'apply';
    this.applyButton.onclick = this._apply.bind(this);

    this.saveButton = document.createElement("div");
    this.saveButton.className = visPrefix + "colorPicker-button save";
    this.saveButton.innerHTML = 'save';
    this.saveButton.onclick = this._save.bind(this);

    this.loadButton = document.createElement("div");
    this.loadButton.className = visPrefix + "colorPicker-button load";
    this.loadButton.innerHTML = 'load last';
    this.loadButton.onclick = this._loadLast.bind(this);

    this.frame.appendChild(this.colorPickerDiv);
    this.frame.appendChild(this.arrowDiv);
    this.frame.appendChild(this.brightnessLabel);
    this.frame.appendChild(this.brightnessDiv);
    this.frame.appendChild(this.opacityLabel);
    this.frame.appendChild(this.opacityDiv);
    this.frame.appendChild(this.newColorDiv);
    this.frame.appendChild(this.initialColorDiv);

    this.frame.appendChild(this.cancelButton);
    this.frame.appendChild(this.applyButton);
    this.frame.appendChild(this.saveButton);
    this.frame.appendChild(this.loadButton);
  }


  /**
   * bind hammer to the color picker
   * @private
   */
  _bindHammer() {
    this.drag = {};
    this.pinch = {};
    this.hammer = new Hammer(this.colorPickerCanvas);
    this.hammer.get('pinch').set({enable: true});

    hammerUtil.onTouch(this.hammer, (event) => {this._moveSelector(event)});
    this.hammer.on('tap',       (event) => {this._moveSelector(event)});
    this.hammer.on('panstart',  (event) => {this._moveSelector(event)});
    this.hammer.on('panmove',   (event) => {this._moveSelector(event)});
    this.hammer.on('panend',    (event) => {this._moveSelector(event)});
  }


  /**
   * generate the hue circle. This is relatively heavy (200ms) and is done only once on the first time it is shown.
   * @private
   */
  _generateHueCircle() {
    if (this.generated === false) {
      let ctx = this.colorPickerCanvas.getContext('2d');
      if (this.pixelRation === undefined) {
        this.pixelRatio = (window.devicePixelRatio || 1) / (ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1);
      }
      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

      // clear the canvas
      let w = this.colorPickerCanvas.clientWidth;
      let h = this.colorPickerCanvas.clientHeight;
      ctx.clearRect(0, 0, w, h);


      // draw hue circle
      let x, y, hue, sat;
      this.centerCoordinates = {x: w * 0.5, y: h * 0.5};
      this.r = 0.49 * w;
      let angleConvert = (2 * Math.PI) / 360;
      let hfac = 1 / 360;
      let sfac = 1 / this.r;
      let rgb;
      for (hue = 0; hue < 360; hue++) {
        for (sat = 0; sat < this.r; sat++) {
          x = this.centerCoordinates.x + sat * Math.sin(angleConvert * hue);
          y = this.centerCoordinates.y + sat * Math.cos(angleConvert * hue);
          rgb = util.HSVToRGB(hue * hfac, sat * sfac, 1);
          ctx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
          ctx.fillRect(x - 0.5, y - 0.5, 2, 2);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.circle(this.centerCoordinates.x, this.centerCoordinates.y, this.r);
      ctx.stroke();

      this.hueCircle = ctx.getImageData(0,0,w,h);
    }
    this.generated = true;
  }


  /**
   * move the selector. This is called by hammer functions.
   *
   * @param event
   * @private
   */
  _moveSelector(event) {
    let rect = this.colorPickerDiv.getBoundingClientRect();
    let left = event.center.x - rect.left;
    let top = event.center.y - rect.top;

    let centerY = 0.5 * this.colorPickerDiv.clientHeight;
    let centerX = 0.5 * this.colorPickerDiv.clientWidth;

    let x = left - centerX;
    let y = top - centerY;

    let angle = Math.atan2(x,y);
    let radius = 0.98 * Math.min(Math.sqrt(x * x + y * y), centerX);

    let newTop = Math.cos(angle) * radius + centerY;
    let newLeft = Math.sin(angle) * radius + centerX;

    this.colorPickerSelector.style.top = newTop - 0.5 * this.colorPickerSelector.clientHeight + 'px';
    this.colorPickerSelector.style.left = newLeft - 0.5 * this.colorPickerSelector.clientWidth + 'px';

    // set color
    let h = angle / (2 * Math.PI);
    h = h < 0 ? h + 1 : h;
    let s = radius / this.r;
    let hsv = util.RGBToHSV(this.color.r, this.color.g, this.color.b);
    hsv.h = h;
    hsv.s = s;
    let rgba = util.HSVToRGB(hsv.h, hsv.s, hsv.v);
    rgba['a'] = this.color.a;
    this.color = rgba;

    // update previews
    this.initialColorDiv.style.backgroundColor = 'rgba(' + this.initialColor.r + ',' + this.initialColor.g + ',' + this.initialColor.b + ',' + this.initialColor.a + ')';
    this.newColorDiv.style.backgroundColor = 'rgba(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ',' + this.color.a + ')';
  }
}

export default ColorPicker;