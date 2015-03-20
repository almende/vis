/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import ShapeUtil from '../util/shapeUtil'

class Dot extends ShapeUtil {
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
    return this.options.size + this.options.borderWidth;
  }
}

export default Dot;