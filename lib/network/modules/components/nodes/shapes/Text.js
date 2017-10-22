'use strict';

import NodeBase from '../util/NodeBase'

/**
 * A text-based replacement for the default Node shape.
 *
 * @extends NodeBase
 */
class Text extends NodeBase {
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
   * @param {boolean} selected
   * @param {boolean} hover
   */
  resize(ctx, selected, hover) {
    if (this.needsRefresh(selected, hover)) {
      this.textSize = this.labelModule.getTextSize(ctx, selected, hover);
      this.width = this.textSize.width + this.margin.right + this.margin.left;
      this.height = this.textSize.height + this.margin.top + this.margin.bottom;
      this.radius = 0.5*this.width;
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

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected, hover);

    // disable shadows for other elements.
    this.disableShadow(ctx, values);

    this.updateBoundingBox(x, y, ctx, selected, hover);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} angle
   * @returns {number}
   */
  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Text;
