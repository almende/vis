'use strict';

import ShapeBase from '../util/ShapeBase'

/**
 * A Dot Node/Cluster shape.
 *
 * @extends ShapeBase
 */
class Dot extends ShapeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
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
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
   */
  draw(ctx, x, y, selected, hover, values) {
    this._drawShape(ctx, 'circle', 2, x, y, selected, hover, values);
  }

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} angle
   * @returns {number}
   */
  distanceToBorder(ctx, angle) {  // eslint-disable-line no-unused-vars
    this.resize(ctx);
    return this.options.size;
  }
}

export default Dot;
