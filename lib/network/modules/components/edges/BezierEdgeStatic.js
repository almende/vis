import BezierEdgeBase from './util/BezierEdgeBase'

class BezierEdgeStatic extends BezierEdgeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  /**
   * Draw a line between two nodes
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _line(ctx, values, viaNode) {
    // draw a straight line
    ctx.beginPath();
    ctx.moveTo(this.fromPoint.x, this.fromPoint.y);

    // fallback to normal straight edges
    if (viaNode.x === undefined) {
      ctx.lineTo(this.toPoint.x, this.toPoint.y);
    }
    else {
      ctx.quadraticCurveTo(viaNode.x, viaNode.y, this.toPoint.x, this.toPoint.y);
    }
    // draw shadow if enabled
    this.enableShadow(ctx, values);
    ctx.stroke();
    this.disableShadow(ctx, values);
  }

  getViaNode() {
    return this._getViaCoordinates();
  }


  /**
   * We do not use the to and fromPoints here to make the via nodes the same as edges without arrows.
   * @returns {{x: undefined, y: undefined}}
   * @private
   */
  _getViaCoordinates() {
    let xVia = undefined;
    let yVia = undefined;
    let factor = this.options.smooth.roundness;
    let type = this.options.smooth.type;
    let dx = Math.abs(this.from.x - this.to.x);
    let dy = Math.abs(this.from.y - this.to.y);
    if (type === 'discrete' || type === 'diagonalCross') {
      if (Math.abs(this.from.x - this.to.x) <= Math.abs(this.from.y - this.to.y)) {
        if (this.from.y >= this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dy;
            yVia = this.from.y - factor * dy;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dy;
            yVia = this.from.y - factor * dy;
          }
        }
        else if (this.from.y < this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dy;
            yVia = this.from.y + factor * dy;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dy;
            yVia = this.from.y + factor * dy;
          }
        }
        if (type === "discrete") {
          xVia = dx < factor * dy ? this.from.x : xVia;
        }
      }
      else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) {
        if (this.from.y >= this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dx;
            yVia = this.from.y - factor * dx;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dx;
            yVia = this.from.y - factor * dx;
          }
        }
        else if (this.from.y < this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dx;
            yVia = this.from.y + factor * dx;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dx;
            yVia = this.from.y + factor * dx;
          }
        }
        if (type === "discrete") {
          yVia = dy < factor * dx ? this.from.y : yVia;
        }
      }
    }
    else if (type === "straightCross") {
      if (Math.abs(this.from.x - this.to.x) <= Math.abs(this.from.y - this.to.y)) {  // up - down
        xVia = this.from.x;
        if (this.from.y < this.to.y) {
          yVia = this.to.y - (1 - factor) * dy;
        }
        else {
          yVia = this.to.y + (1 - factor) * dy;
        }
      }
      else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) { // left - right
        if (this.from.x < this.to.x) {
          xVia = this.to.x - (1 - factor) * dx;
        }
        else {
          xVia = this.to.x + (1 - factor) * dx;
        }
        yVia = this.from.y;
      }
    }
    else if (type === 'horizontal') {
      if (this.from.x < this.to.x) {
        xVia = this.to.x - (1 - factor) * dx;
      }
      else {
        xVia = this.to.x + (1 - factor) * dx;
      }
      yVia = this.from.y;
    }
    else if (type === 'vertical') {
      xVia = this.from.x;
      if (this.from.y < this.to.y) {
        yVia = this.to.y - (1 - factor) * dy;
      }
      else {
        yVia = this.to.y + (1 - factor) * dy;
      }
    }
    else if (type === 'curvedCW') {
      dx = this.to.x - this.from.x;
      dy = this.from.y - this.to.y;
      let radius = Math.sqrt(dx * dx + dy * dy);
      let pi = Math.PI;

      let originalAngle = Math.atan2(dy, dx);
      let myAngle = (originalAngle + ((factor * 0.5) + 0.5) * pi) % (2 * pi);

      xVia = this.from.x + (factor * 0.5 + 0.5) * radius * Math.sin(myAngle);
      yVia = this.from.y + (factor * 0.5 + 0.5) * radius * Math.cos(myAngle);
    }
    else if (type === 'curvedCCW') {
      dx = this.to.x - this.from.x;
      dy = this.from.y - this.to.y;
      let radius = Math.sqrt(dx * dx + dy * dy);
      let pi = Math.PI;

      let originalAngle = Math.atan2(dy, dx);
      let myAngle = (originalAngle + ((-factor * 0.5) + 0.5) * pi) % (2 * pi);

      xVia = this.from.x + (factor * 0.5 + 0.5) * radius * Math.sin(myAngle);
      yVia = this.from.y + (factor * 0.5 + 0.5) * radius * Math.cos(myAngle);
    }
    else { // continuous
      if (Math.abs(this.from.x - this.to.x) <= Math.abs(this.from.y - this.to.y)) {
        if (this.from.y >= this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dy;
            yVia = this.from.y - factor * dy;
            xVia = this.to.x < xVia ? this.to.x : xVia;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dy;
            yVia = this.from.y - factor * dy;
            xVia = this.to.x > xVia ? this.to.x : xVia;
          }
        }
        else if (this.from.y < this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dy;
            yVia = this.from.y + factor * dy;
            xVia = this.to.x < xVia ? this.to.x : xVia;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dy;
            yVia = this.from.y + factor * dy;
            xVia = this.to.x > xVia ? this.to.x : xVia;
          }
        }
      }
      else if (Math.abs(this.from.x - this.to.x) > Math.abs(this.from.y - this.to.y)) {
        if (this.from.y >= this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dx;
            yVia = this.from.y - factor * dx;
            yVia = this.to.y > yVia ? this.to.y : yVia;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dx;
            yVia = this.from.y - factor * dx;
            yVia = this.to.y > yVia ? this.to.y : yVia;
          }
        }
        else if (this.from.y < this.to.y) {
          if (this.from.x <= this.to.x) {
            xVia = this.from.x + factor * dx;
            yVia = this.from.y + factor * dx;
            yVia = this.to.y < yVia ? this.to.y : yVia;
          }
          else if (this.from.x > this.to.x) {
            xVia = this.from.x - factor * dx;
            yVia = this.from.y + factor * dx;
            yVia = this.to.y < yVia ? this.to.y : yVia;
          }
        }
      }
    }
    return {x: xVia, y: yVia};
  }

  _findBorderPosition(nearNode, ctx, options = {}) {
    return this._findBorderPositionBezier(nearNode, ctx, options.via);
  }

  _getDistanceToEdge(x1, y1, x2, y2, x3, y3, viaNode = this._getViaCoordinates()) { // x3,y3 is the point
    return this._getDistanceToBezierEdge(x1, y1, x2, y2, x3, y3, viaNode);
  }

  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a point on the line at a certain percentage of the way
   * @param percentage
   * @param viaNode
   * @returns {{x: number, y: number}}
   * @private
   */
  getPoint(percentage, viaNode = this._getViaCoordinates()) {
    var t = percentage;
    var x = Math.pow(1 - t, 2) * this.fromPoint.x + (2 * t * (1 - t)) * viaNode.x + Math.pow(t, 2) * this.toPoint.x;
    var y = Math.pow(1 - t, 2) * this.fromPoint.y + (2 * t * (1 - t)) * viaNode.y + Math.pow(t, 2) * this.toPoint.y;

    return {x: x, y: y};
  }
}


export default BezierEdgeStatic;