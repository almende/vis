'use strict';

import ShapeBase from '../util/ShapeBase'

class Star extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize(ctx, values, selected, hover) {
    this._resizeShape(selected, hover, values);
  }

  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'star', 4, x, y, selected, hover, values);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Star;
