'use strict';

import CircleImageBase from '../util/CircleImageBase'

/**
 * A Circle Node/Cluster shape.
 *
 * @extends CircleImageBase
 */
class Circle extends CircleImageBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
    this._setMargins(labelModule);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} [selected]
   * @param {boolean} [hover]
   */
  resize(ctx, selected = this.selected, hover = this.hover) {
    if (this.needsRefresh(selected, hover)) {
      var dimensions = this.getDimensionsFromLabel(ctx, selected, hover);

      var diameter = Math.max(dimensions.width  + this.margin.right + this.margin.left,
                              dimensions.height + this.margin.top   + this.margin.bottom);

      this.options.size = diameter / 2; // NOTE: this size field only set here, not in Ellipse, Database, Box
      this.width = diameter;
      this.height = diameter;
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
    this.top = y - this.height / 2;

    this._drawRawCircle(ctx, x, y, values);

    this.updateBoundingBox(x,y);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               y, selected, hover);
  }

  /**
   *
   * @param {number} x width
   * @param {number} y height
   */
  updateBoundingBox(x, y) {
    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} angle - Unused
   * @returns {number}
   */
  distanceToBorder(ctx, angle) {  // eslint-disable-line no-unused-vars
    this.resize(ctx);
    return this.width * 0.5;
  }
}

export default Circle;
