'use strict';

import CircleImageBase from '../util/CircleImageBase'

class Image extends CircleImageBase {
  constructor (options, body, labelModule, imageObj) {
    super(options, body, labelModule);
    this.imageObj = imageObj;
  }

  resize() {
    this._resizeImage();
  }

  draw(ctx, x, y, selected, hover) {
    this.resize();
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this._drawImageAtPosition(ctx);

    this._drawImageLabel(ctx, x, y, selected || hover);

    this.updateBoundingBox(x,y);
  }

  updateBoundingBox(x,y) {
    this.resize();
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    if (this.options.label !== undefined && this.labelModule.size.width > 0) {
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelOffset);
    }
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    var a = this.width / 2;
    var b = this.height / 2;
    var w = (Math.sin(angle) * a);
    var h = (Math.cos(angle) * b);
    return a * b / Math.sqrt(w * w + h * h);
  }
}

export default Image;