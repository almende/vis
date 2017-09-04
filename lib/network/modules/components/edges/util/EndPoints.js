/**
 * Location of all the endpoint drawing routines.
 *
 * The intention is to make it as simple as possible to add new endpoint types.
 * As long as the endpoint classes are simple and not too numerous, they will be contained within this module.
 *
 * @typedef {x:number, y:number} Point
 * @typedef {type:string, point:Point, angle:number, length:number} ArrowData
 */


/**
 * Drawing methods for the arrow endpoint.
 */
class Arrow {
  /**
   * Draw an arrow at the end of a line.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {ArrowData} arrowData
   * @static
   */
  static draw(ctx, arrowData) {
    var x = arrowData.point.x;
    var y = arrowData.point.y;
    var angle = arrowData.angle
    var length = arrowData.length;

    // tail
    var xt = x - length * Math.cos(angle);
    var yt = y - length * Math.sin(angle);

    // inner tail
    var xi = x - length * 0.9 * Math.cos(angle);
    var yi = y - length * 0.9 * Math.sin(angle);

    // left
    var xl = xt + length / 3 * Math.cos(angle + 0.5 * Math.PI);
    var yl = yt + length / 3 * Math.sin(angle + 0.5 * Math.PI);

    // right
    var xr = xt + length / 3 * Math.cos(angle - 0.5 * Math.PI);
    var yr = yt + length / 3 * Math.sin(angle - 0.5 * Math.PI);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(xl, yl);
    ctx.lineTo(xi, yi);
    ctx.lineTo(xr, yr);
    ctx.closePath();
  }
}


/**
 * Drawing methods for the circle endpoint.
 */
class Circle {
  /**
   * Draw circle at the end of the line
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {ArrowData} arrowData
   * @static
   */
  static draw(ctx, arrowData) {
    var x = arrowData.point.x;
    var y = arrowData.point.y;
    var angle = arrowData.angle
    var length = arrowData.length;

    var radius = length * 0.4;
    var xc = x - radius * Math.cos(angle);
    var yc = y - radius * Math.sin(angle);
    ctx.circle(xc, yc, radius);
  }
}


/**
 * Drawing methods for the endpoints.
 */
class EndPoints {
  /**
   * Draw an endpoint
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {ArrowData} arrowData
   * @static
   */
  static draw(ctx, arrowData) {
    var type;
    if (arrowData.type) {
      type = arrowData.type.toLowerCase();
    }

    switch (type) {
    case 'circle':
      Circle.draw(ctx, arrowData);
      break;
    case 'arrow':  // fall-through
    default:
      Arrow.draw(ctx, arrowData);
    }
  }
}

export default EndPoints;
