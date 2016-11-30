'use strict';

import CircleImageBase from '../util/CircleImageBase'

class Circle extends CircleImageBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
    this._setMargins(labelModule);
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      this.textSize = this.labelModule.getTextSize(ctx, selected);
      var diameter = Math.max(this.textSize.width + this.margin.right + this.margin.left,
                              this.textSize.height + this.margin.top + this.margin.bottom);
      this.options.size = diameter / 2;

      this.width = diameter;
      this.height = diameter;
      this.radius = this.width / 2;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx, selected);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this._drawRawCircle(ctx, x, y, selected, hover, this.options.size);

    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

    this.updateBoundingBox(x,y);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected);
  }

  updateBoundingBox(x,y) {
    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this.width * 0.5;
  }
}

export default Circle;
