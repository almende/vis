/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import CircleImageBase from '../util/CircleImageBase'

class Image extends CircleImageBase {
  constructor (options, body, labelModule, imageObj) {
    super(options, body, labelModule);
    this.imageObj = imageObj;
  }

  resize() {
    if (!this.width || !this.height) {  // undefined or 0
      var width, height;
      if (this.value) {
        var scale = this.imageObj.height / this.imageObj.width;
        if (scale !== undefined) {
          width = this.options.size || this.imageObj.width;
          height = this.options.size * scale || this.imageObj.height;
        }
        else {
          width = 0;
          height = 0;
        }
      }
      else {
        width = this.imageObj.width;
        height = this.imageObj.height;
      }
      this.width = width;
      this.height = height;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this._drawImageAtPosition(ctx);

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    this._drawImageLabel(ctx, x, y, selected || hover);
    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
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