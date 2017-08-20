'use strict';

import ShapeBase from '../util/ShapeBase'

/**
 * A Square Node/Cluster shape.
 *
 * @param {Object} options
 * @param {Object} body
 * @param {Label} labelModule
 * @constructor Square
 * @extends ShapeBase
 */
class Square extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'square', 2, x, y, selected, hover, values);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Square;
