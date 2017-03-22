'use strict';

import ShapeBase from '../util/ShapeBase'

class Square extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize() {
    this._resizeShape();
  }

  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'square', 2, x, y, selected, hover, values);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Square;
