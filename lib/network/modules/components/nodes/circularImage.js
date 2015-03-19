/**
 * Created by Alex on 3/18/2015.
 */
'use strict';


import NodeUtil from './nodeUtil'

class CircularImage extends NodeUtil {
  constructor (options, body, labelModule, imageObj) {
    super(options, body, labelModule);
    this.imageObj = imageObj;
  }

  setOptions(options) {
    this.options = options;
  }

  resize(ctx) {
    if (this.imageObj.src !== undefined || this.imageObj.width  !== undefined || this.imageObj.height !== undefined ) {
      if (!this.width) {
        var diameter = this.options.size * 2;
        this.width = diameter;
        this.height = diameter;
        this._swapToImageResizeWhenImageLoaded = true;
      }
    }
    else {
      if (this._swapToImageResizeWhenImageLoaded) {
        this.width = 0;
        this.height = 0;
        delete this._swapToImageResizeWhenImageLoaded;
      }
      this._resizeImage(ctx);
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx);

    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    var centerX = this.left + (this.width / 2);
    var centerY = this.top + (this.height / 2);
    var size = Math.abs(this.height / 2);

    this._drawRawCircle(ctx, x, y, selected, hover, size);

    ctx.save();
    ctx.circle(x, y, size);
    ctx.stroke();
    ctx.clip();

    this._drawImageAtPosition(ctx);

    ctx.restore();

    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

    this._drawImageLabel(ctx);

    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
  }


  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this._distanceToBorder(angle);
  }
}

export default CircularImage;