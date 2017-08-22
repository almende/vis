'use strict';

import ShapeBase from '../util/ShapeBase'

/**
 * A Triangle Node/Cluster shape.
 *
 * @class Triangle
 * @extends ShapeBase
 */
class Triangle extends ShapeBase {
  /**
   * @param {Object} options
   * @param {Object} body
   * @param {Label} labelModule
   * @constructor Triangle
   */
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
   * @param {{toArrow: boolean, toArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), toArrowType: *, middleArrow: boolean, middleArrowScale: (number|allOptions.edges.arrows.middle.scaleFactor|{number}|Array), middleArrowType: (allOptions.edges.arrows.middle.type|{string}|string|*), fromArrow: boolean, fromArrowScale: (allOptions.edges.arrows.to.scaleFactor|{number}|allOptions.edges.arrows.middle.scaleFactor|allOptions.edges.arrows.from.scaleFactor|Array|number), fromArrowType: *, arrowStrikethrough: (*|boolean|allOptions.edges.arrowStrikethrough|{boolean}), color: undefined, inheritsColor: (string|string|string|allOptions.edges.color.inherit|{string, boolean}|Array|*), opacity: *, hidden: *, length: *, shadow: *, shadowColor: *, shadowSize: *, shadowX: *, shadowY: *, dashes: (*|boolean|Array|allOptions.edges.dashes|{boolean, array}), width: *}} values
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
