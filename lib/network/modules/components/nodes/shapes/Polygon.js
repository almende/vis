'use strict';

import NodeBase from '../util/NodeBase';

/**
 *
 * A Polygon Node/Cluster shape.
 *
 * @class Polygon
 * @extends {NodeBase}
 */
class Polygon extends NodeBase {
  /**
   *Creates an instance of Polygon.
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   * @memberof Polygon
   */
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  /**
   *
   *
   * @param {*} ctx
   * @param {*} [selected=this.selected]
   * @param {*} [hover=this.hover]
   * @memberof Polygon
   */
  resize(ctx, selected = this.selected, hover = this.hover) {
    if (this.needsRefresh(selected, hover)) {
      var dimensions = this.getDimensionsFromLabel(ctx, selected, hover);

      this.height = dimensions.width + dimensions.height * 2;
      this.width = this.height;
      this.radius = 0.5 * this.width;
    }
  }

  /**
   *
   *
   * @param {*} ctx
   * @param {*} x
   * @param {*} y
   * @param {*} selected
   * @param {*} hover
   * @param {*} values
   * @memberof Polygon
   */
  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.initContextForDraw(ctx, values);
    ctx.polygon(x, y, this.width, this.options.sides);
    this.performFill(ctx, values);

    this.updateBoundingBox(x, y, ctx, selected, hover);
    this.labelModule.draw(ctx, x, y, selected, hover);
  }

  /**
   *
   * @param {number} x width
   * @param {number} y height
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   */
  updateBoundingBox(x, y, ctx, selected, hover) {
    if (ctx !== undefined) {
      this.resize(ctx, selected, hover);
    }

    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.boundingBox.left = this.left;
    this.boundingBox.top = this.top;
    this.boundingBox.bottom = this.top + this.height;
    this.boundingBox.right = this.left + this.width;
  }
}
export default Polygon;
