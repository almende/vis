'use strict';

import CircleImageBase from '../util/CircleImageBase'

class CircularImage extends CircleImageBase {
  constructor (options, body, labelModule, imageObj, imageObjAlt) {
    super(options, body, labelModule);

    this.setImages(imageObj, imageObjAlt);

    this._swapToImageResizeWhenImageLoaded = true;
  }

  resize(ctx, selected = this.selected, hover = this.hover) {
    if ((this.imageObj.src === undefined) ||
        (this.imageObj.width === undefined) ||
        (this.imageObj.height === undefined) ||
        (this.labelModule.differentState(selected, hover))) {
      var diameter = this.options.size * 2;
      this.width = diameter;
      this.height = diameter;
      this._swapToImageResizeWhenImageLoaded = true;
      this.radius = 0.5*this.width;
    } else {
      if (this._swapToImageResizeWhenImageLoaded) {
        this.width = undefined;
        this.height = undefined;
        this._swapToImageResizeWhenImageLoaded = false;
      }
      this._resizeImage();
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    // switch images depending on 'selected' if imageObjAlt exists
    if (this.imageObjAlt) {
      this.switchImages(selected);
    }

    this.resize();

    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    let size = Math.min(0.5*this.height, 0.5*this.width);

    // draw the background circle. IMPORTANT: the stroke in this method is used by the clip method below.
    this._drawRawCircle(ctx, x, y, selected, hover, values);

    // now we draw in the circle, we save so we can revert the clip operation after drawing.
    ctx.save();
    // clip is used to use the stroke in drawRawCircle as an area that we can draw in.
    ctx.clip();
    // draw the image
    this._drawImageAtPosition(ctx, values);
    // restore so we can again draw on the full canvas
    ctx.restore();

    this._drawImageLabel(ctx, x, y, selected, hover);

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
    return this.width * 0.5;
  }
}

export default CircularImage;
