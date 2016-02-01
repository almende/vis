'use strict';

import ShapeBase from '../util/ShapeBase'

class Dot extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize(ctx) {
    this._resizeShape();
  }

  draw(ctx, x, y, selected, hover) {
    this._drawShape(ctx, 'circle', 2, x, y, selected, hover);
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this.options.size;
  }
}

export default Dot;