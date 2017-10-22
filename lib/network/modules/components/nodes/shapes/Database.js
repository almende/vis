'use strict';

import NodeBase from '../util/NodeBase'

/**
 * A Database Node/Cluster shape.
 *
 * @extends NodeBase
 */
class Database extends NodeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor (options, body, labelModule) {
    super(options, body, labelModule);
    this._setMargins(labelModule);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   */
  resize(ctx, selected, hover) {
    if (this.needsRefresh(selected, hover)) {
      var dimensions = this.getDimensionsFromLabel(ctx, selected, hover);
      var size = dimensions.width + this.margin.right + this.margin.left;

      this.width  = size;
      this.height = size;
      this.radius = this.width / 2;
    }
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x width
   * @param {number} y height
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {ArrowOptions} values
   */
  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width / 2;
    this.top  = y - this.height / 2;

    this.initContextForDraw(ctx, values);
    ctx.database(x - this.width / 2, y - this.height / 2, this.width, this.height);
    this.performFill(ctx, values);

    this.updateBoundingBox(x, y, ctx, selected, hover);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected, hover);
  }
  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} angle
   * @returns {number}
   */
  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx, angle);
  }
}

export default Database;
