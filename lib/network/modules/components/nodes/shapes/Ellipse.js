'use strict';

import NodeBase from '../util/NodeBase'

/**
 * Am Ellipse Node/Cluster shape.
 *
 * @extends NodeBase
 */
class Ellipse extends NodeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
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

      this.height = dimensions.height * 2;
      this.width  = dimensions.width + dimensions.height;
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
    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.initContextForDraw(ctx, values);
    ctx.ellipse_vis(this.left, this.top, this.width, this.height);
    this.performFill(ctx, values);

    this.updateBoundingBox(x, y, ctx, selected, hover);
    this.labelModule.draw(ctx, x, y, selected, hover);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} angle
   * @returns {number}
   */
  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    var a = this.width * 0.5;
    var b = this.height * 0.5;
    var w = (Math.sin(angle) * a);
    var h = (Math.cos(angle) * b);
    return a * b / Math.sqrt(w * w + h * h);
  }
}

export default Ellipse;
