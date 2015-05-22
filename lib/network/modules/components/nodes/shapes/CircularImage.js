'use strict';


import CircleImageBase from '../util/CircleImageBase'

class CircularImage extends CircleImageBase {
  constructor (options, body, labelModule, imageObj) {
    super(options, body, labelModule);
    this.imageObj = imageObj;
    this._swapToImageResizeWhenImageLoaded = true;
  }

  resize() {
    if (this.imageObj.src === undefined || this.imageObj.width === undefined || this.imageObj.height === undefined ) {
      if (!this.width) {
        var diameter = this.options.size * 2;
        this.width = diameter;
        this.height = diameter;
        this._swapToImageResizeWhenImageLoaded = true;
        this.radius = 0.5*this.width;
      }
    }
    else {
      if (this._swapToImageResizeWhenImageLoaded) {
        this.width = undefined;
        this.height = undefined;
        this._swapToImageResizeWhenImageLoaded = false;
      }
      this._resizeImage();
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize();

    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    let size = Math.min(0.5*this.height, 0.5*this.width);

    this._drawRawCircle(ctx, x, y, selected, hover, size);

    ctx.save();
    ctx.circle(x, y, size);
    ctx.stroke();
    ctx.clip();

    this._drawImageAtPosition(ctx);

    ctx.restore();

    this._drawImageLabel(ctx, x, y, selected);

    this.updateBoundingBox(x,y);
  }

  updateBoundingBox(x,y) {
    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;
    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelOffset);
  }


  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this._distanceToBorder(angle);
  }
}

export default CircularImage;