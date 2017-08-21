'use strict';

import ShapeBase from '../util/ShapeBase'

/**
 * A Triangle Node/Cluster shape.
 *
 * @param {Object} options
 * @param {Object} body
 * @param {Label} labelModule
 * @constructor Triangle
 * @extends ShapeBase
 */
class Triangle extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x
   * @param {Number} y
   * @param {Boolean} selected
   * @param {Boolean} hover
   * @param {Object} values
   */
  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'triangle', 3, x, y, selected, hover, values);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} angle
   * @returns {Number}
   */
  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Triangle;
