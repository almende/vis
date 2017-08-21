'use strict';

import ShapeBase from '../util/ShapeBase'

/**
 * A Dot Node/Cluster shape.
 *
 * @param {Object} options
 * @param {Object} body
 * @param {Label} labelModule
 * @constructor Dot
 * @extends ShapeBase
 */
class Dot extends ShapeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x width
   * @param {number} y height
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {Object} values
   */
  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'circle', 2, x, y, selected, hover, values);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} angle
   * @returns {Number}
   */
  distanceToBorder(ctx, angle) {  // eslint-disable-line no-unused-vars
    this.resize(ctx);
    return this.options.size;
  }
}

export default Dot;
