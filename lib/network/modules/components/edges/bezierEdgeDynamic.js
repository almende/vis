/**
 * Created by Alex on 3/20/2015.
 */

import BezierBaseEdge from './util/bezierBaseEdge'

class BezierEdgeDynamic extends BezierBaseEdge {
  constructor(options, body, labelModule) {
    this.initializing = true;
    this.via = undefined;
    super(options, body, labelModule);
    this.initializing = false;
  }

  setOptions(options) {
    this.options = options;
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
    this.id = this.options.id;
    this.setupSupportNode(this.initializing);
  }

  cleanup() {
    if (this.via !== undefined) {
      delete this.body.nodes[this.via.id];
      this.via = undefined;
      this.body.emitter.emit("_dataChanged");
    }
  }

  /**
   * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
   * are used for the force calculation.
   *
   * @private
   */
  setupSupportNode(doNotEmit = false) {
    var changedData = false;
    if (this.via === undefined) {
      changedData = true;
      var nodeId = "edgeId:" + this.id;
      var node = this.body.functions.createNode({
        id: nodeId,
        mass: 1,
        shape: 'circle',
        image: "",
        physics:true,
        hidden:true
      });
      this.body.nodes[nodeId] = node;
      this.via = node;
      this.via.parentEdgeId = this.id;
      this.positionBezierNode();
    }

    // node has been added or deleted
    if (changedData === true && doNotEmit === false) {
      this.body.emitter.emit("_dataChanged");
    }
  }

  positionBezierNode() {
    if (this.via !== undefined && this.from !== undefined && this.to !== undefined) {
      this.via.x = 0.5 * (this.from.x + this.to.x);
      this.via.y = 0.5 * (this.from.y + this.to.y);
    }
    else if (this.via !== undefined) {
      this.via.x = 0;
      this.via.y = 0;
    }
  }

  /**
   * Draw a line between two nodes
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _line(ctx) {
    // draw a straight line
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.quadraticCurveTo(this.via.x, this.via.y, this.to.x, this.to.y);
    ctx.stroke();
    return this.via;
  }


  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   * @param percentage
   * @param via
   * @returns {{x: number, y: number}}
   * @private
   */
  getPoint(percentage) {
    let t = percentage;
    let x = Math.pow(1 - t, 2) * this.from.x + (2 * t * (1 - t)) * this.via.x + Math.pow(t, 2) * this.to.x;
    let y = Math.pow(1 - t, 2) * this.from.y + (2 * t * (1 - t)) * this.via.y + Math.pow(t, 2) * this.to.y;

    return {x: x, y: y};
  }

  _findBorderPosition(nearNode, ctx) {
    console.log(this)
    return this._findBorderPositionBezier(nearNode, ctx, this.via);
  }

  _getDistanceToEdge(x1, y1, x2, y2, x3, y3) { // x3,y3 is the point
    return this._getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, this.via);
  }


}


export default BezierEdgeDynamic;