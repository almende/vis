import BezierEdgeBase from './util/BezierEdgeBase'

class BezierEdgeDynamic extends BezierEdgeBase {
  constructor(options, body, labelModule) {
    //this.via = undefined; // Here for completeness but not allowed to defined before super() is invoked.
    super(options, body, labelModule); // --> this calls the setOptions below
  }

  setOptions(options) {
    this.options = options;
    this.id = this.options.id;
    this.setupSupportNode();
    this.connect();
  }

  connect() {
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
    if (this.from === undefined || this.to === undefined || this.options.physics === false) {
      this.via.setOptions({physics:false})
    }
    else {
      // fix weird behaviour where a selfreferencing node has physics enabled
      if (this.from.id === this.to.id) {
        this.via.setOptions({physics: false})
      }
      else {
        this.via.setOptions({physics: true})
      }
    }
  }

  cleanup() {
    if (this.via !== undefined) {
      delete this.body.nodes[this.via.id];
      this.via = undefined;
      return true;
    }
    return false;
  }

  togglePhysics(status) {
    this.via.setOptions({physics:status});
    this.positionBezierNode();
  }

  /**
   * Bezier curves require an anchor point to calculate the smooth flow. These points are nodes. These nodes are invisible but
   * are used for the force calculation.
   *
   * The changed data is not called, if needed, it is returned by the main edge constructor.
   * @private
   */
  setupSupportNode() {
    if (this.via === undefined) {
      var nodeId = "edgeId:" + this.id;
      var node = this.body.functions.createNode({
        id: nodeId,
        shape: 'circle',
        physics:true,
        hidden:true
      });
      this.body.nodes[nodeId] = node;
      this.via = node;
      this.via.parentEdgeId = this.id;
      this.positionBezierNode();
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
    // draw shadow if enabled
    this.enableShadow(ctx);
    ctx.stroke();
    this.disableShadow(ctx);
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
    return this._findBorderPositionBezier(nearNode, ctx, this.via);
  }

  _getDistanceToEdge(x1, y1, x2, y2, x3, y3) { // x3,y3 is the point
    return this._getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, this.via);
  }


}


export default BezierEdgeDynamic;