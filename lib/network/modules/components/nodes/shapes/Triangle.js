'use strict';

var ShapeBase = require('../util/ShapeBase').default;

class Triangle extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'triangle', 3, x, y, selected, hover, values);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Triangle;
