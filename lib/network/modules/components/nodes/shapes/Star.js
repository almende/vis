'use strict';

import ShapeBase from '../util/ShapeBase'

/**
 * A Star Node/Cluster shape.
 *
 * @class TriangleDown
 * @extends ShapeBase
 */
class Star extends ShapeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   * @constructor TriangleDown
   */
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
    this._drawShape(ctx, 'star', 4, x, y, selected, hover, values);
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

export default Star;
