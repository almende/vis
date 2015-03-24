/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import ShapeBase from '../util/ShapeBase'

class Square extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize() {
    this._resizeShape();
  }

  draw(ctx, x, y, selected, hover) {
    this._drawShape(ctx, 'square', 2, x, y, selected, hover);
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this._distanceToBorder(angle);
  }
}

export default Square;