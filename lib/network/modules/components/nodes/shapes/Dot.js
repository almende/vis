'use strict';

import ShapeBase from '../util/ShapeBase'

class Dot extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize(ctx, values, selected = this.selected, hover = this.hover) {
    this._resizeShape(selected, hover, values);
  }

  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'circle', 2, x, y, selected, hover, values);
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this.options.size;
  }
}

export default Dot;
