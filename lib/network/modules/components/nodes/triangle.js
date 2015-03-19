/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import NodeUtil from './nodeUtil'

class Triangle extends NodeUtil {
  constructor (options, body, labelModule) {
    super(options, body, labelModule)
  }

  setOptions(options) {
    this.options = options;
  }

  resize(ctx) {
    this._resizeShape();
  }

  draw(ctx, x, y, selected, hover) {
    this._drawShape(ctx, 'triangle', 3, x, y, selected, hover);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(angle);
  }
}

export default Triangle;