/**
 * Created by Alex on 3/27/2015.
 */

let Hammer = require('../../../module/hammer');
let hammerUtil = require('../../../hammerUtil');
let util = require('../../../util');

class ColorPicker {
  constructor() {
    this.touchTime = 0;
    this.pixelRatio = 1;
    this.generated = false;
    this.color = undefined;

    this.create();
  }

  create() {
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

    this.brightnessDiv = document.createElement('div');
    this.brightnessDiv.className = visPrefix + 'colorPicker-brightness';

    this.saturationDiv = document.createElement('div');
    this.saturationDiv.className = visPrefix + 'colorPicker-saturation';

    this.brightnessRange = document.createElement('input');
    this.brightnessRange.type = 'range';
    this.brightnessRange.min = '0';
    this.brightnessRange.max = '100';
    this.brightnessRange.value = '100';
    this.brightnessRange.className = 'vis-network-configuration range colorPicker';

    this.saturationRange = document.createElement('input');
    this.saturationRange.type = 'range';
    this.saturationRange.min = '0';
    this.saturationRange.max = '100';
    this.saturationRange.value = '100';
    this.saturationRange.className = 'vis-network-configuration range colorPicker';

    this.brightnessDiv.appendChild(this.brightnessRange);
    this.saturationDiv.appendChild(this.saturationRange);

    this.frame.appendChild(this.colorPickerDiv);
    this.frame.appendChild(this.saturationDiv);
    this.frame.appendChild(this.brightnessDiv);
  }

  show(container) {
    this.container = container;
    this.container.appendChild(this.frame);
    this.bindHammer();

    this.setSize();
  }

  setColor(color) {
    //todo make
  }

  setSize() {
    this.colorPickerCanvas.style.width = '100%';
    this.colorPickerCanvas.style.height = '100%';

    this.colorPickerCanvas.width = this.colorPickerDiv.clientWidth * this.pixelRatio;
    this.colorPickerCanvas.height = this.colorPickerDiv.clientHeight * this.pixelRatio;
  }

  generate() {
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

      let x, y, hue, sat;
      let center = {x: w * 0.5, y: h * 0.5};
      let r = 0.49 * w;
      let angleConvert = (2 * Math.PI) / 360;
      let hfac = 1 / 360;
      let sfac = 1 / r;
      let rgb;
      for (hue = 0; hue < 360; hue++) {
        for (sat = 0; sat < r; sat++) {
          x = center.x + sat * Math.sin(angleConvert * hue);
          y = center.y + sat * Math.cos(angleConvert * hue);
          rgb = util.HSVToRGB(hue * hfac, sat * sfac, 1);
          ctx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
          ctx.fillRect(x - 0.5, y - 0.5, 2, 2);
        }
      }
    }
    this.generated = true;
  }

  bindHammer() {
    this.drag = {};
    this.pinch = {};
    this.hammer = new Hammer(this.colorPickerCanvas);
    this.hammer.get('pinch').set({enable: true});

    hammerUtil.onTouch(this.hammer, (event) => {this.moveSelector(event)});
    this.hammer.on('tap',       (event) => {this.moveSelector(event)});
    //this.hammer.on('doubletap', (event) => {this.moveSelector(event)});
    //this.hammer.on('press',     (event) => {this.moveSelector(event)});
    this.hammer.on('panstart',  (event) => {this.moveSelector(event)});
    this.hammer.on('panmove',   (event) => {this.moveSelector(event)});
    this.hammer.on('panend',    (event) => {this.moveSelector(event)});
    //this.hammer.on('pinch',     (event) => {this.moveSelector(event)});
  }


  moveSelector(event) {
    let rect = this.colorPickerDiv.getBoundingClientRect();
    let left = event.center.x - rect.left;
    let top = event.center.y - rect.top;

    let centerY = 0.5 * this.colorPickerDiv.clientHeight;
    let centerX = 0.5 * this.colorPickerDiv.clientWidth;

    let x = left - centerX;
    let y = top - centerY;

    let angle = Math.atan(y / x);
    if (x < 0) {
      angle += Math.PI;
    }
    let radius = 0.98 * Math.min(Math.sqrt(x * x + y * y), centerX);

    let newTop = Math.sin(angle) * radius + centerY;
    let newLeft = Math.cos(angle) * radius + centerX;

    this.colorPickerSelector.style.top = newTop - 0.5 * this.colorPickerSelector.clientHeight + 'px';
    this.colorPickerSelector.style.left = newLeft - 0.5 * this.colorPickerSelector.clientWidth + 'px';


  }


  redraw(roomController) {
    if (this.frame === undefined) {
      this._create();
    }
    let pos = roomController.canvasToDOM({x: 0, y: 0});
    this.frame.style.top = '50px';
    this.frame.style.left = pos.x - 350 + 'px';
  }
}

export default ColorPicker;