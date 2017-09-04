/**
 * Location of all the endpoint drawing routines.
 *
 * The intention is to make it as simple as possible to add new endpoint types.
 * As long as the endpoint classes are simple and not too numerous, they will be contained within this module.
 *
 * @typedef {{x:number, y:number}} Point
 * @typedef {{type:string, point:Point, angle:number, length:number}} ArrowData
 */

class EndPoint {

  /**
   * Apply transformation on points for display.
   *
   * The following is done:
   * - multiply the (normalized) coordinates by the passed length
   * - rotate by the specified angle
   * - offset by the target coordinates
   *
   * @param {Array<Point>} points
   * @param {ArrowData} arrowData
   * @static
   */
  static transform(points, arrowData) {
    if (!(points instanceof Array)) {
      points = [points];
    }

    var x = arrowData.point.x;
    var y = arrowData.point.y;
    var angle = arrowData.angle
    var length = arrowData.length;

    for(var i = 0; i < points.length; ++i) {
      var p  = points[i];
      var xt = p.x * Math.cos(angle) - p.y * Math.sin(angle);
      var yt = p.x * Math.sin(angle) + p.y * Math.cos(angle);

      p.x = x + length*xt;
      p.y = y + length*yt;
    }
  }


  /**
   * Draw a closed path using the given real coordinates.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<Point>} points
   * @static
   */
  static drawPath(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for(var i = 1; i < points.length; ++i) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
  }
}




/**
 * Drawing methods for the arrow endpoint.
 */
class Arrow {
  /**
   * Draw this shape at the end of a line.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {ArrowData} arrowData
   * @static
   */
  static draw(ctx, arrowData) {
    // Normalized points of closed path, in the order that they should be drawn.
    // (0, 0) is the attachment point, and the point around which should be rotated
    var points = [
      { x: 0  , y: 0  },
      { x:-1  , y: 0.3},
      { x:-0.9, y: 0  },
      { x:-1  , y:-0.3},
    ];

    EndPoint.transform(points, arrowData);
    EndPoint.drawPath(ctx, points);
  }
}


/**
 * Drawing methods for the circle endpoint.
 */
class Circle {
  /**
   * Draw this shape at the end of a line.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {ArrowData} arrowData
   * @static
   */
  static draw(ctx, arrowData) {
    var point = {x:-0.4, y:0};

    EndPoint.transform(point, arrowData);
    ctx.circle(point.x, point.y, radius);
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
