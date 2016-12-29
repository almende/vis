'use strict';

import ShapeBase from '../util/ShapeBase'

class Diamond extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize(ctx, values, selected = this.selected, hover = this.hover) {
    this._resizeShape(selected, hover, values);
  }

  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'diamond', 4, x, y, selected, hover, values);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Diamond;
