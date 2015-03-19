/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import NodeUtil from './nodeUtil'

class Dot extends NodeUtil {
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
    this._drawShape(ctx, 'circle', 2, x, y, selected, hover);
  }

  distanceToBorder(ctx, angle) {
    return this.options.size + this.options.borderWidth;
  }
}

export default Dot;