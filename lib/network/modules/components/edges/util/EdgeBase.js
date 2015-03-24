/**
 * Created by Alex on 3/20/2015.
 */
var util = require("../../../../../util")

class EdgeBase {
  constructor(options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.setOptions(options);
    this.colorDirty = true;
  }

  setOptions(options) {
    this.options = options;
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
    this.id = this.options.id;
  }

  /**
   * Redraw a edge as a line
   * Draw this edge in the given canvas
   * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
   * @param {CanvasRenderingContext2D}   ctx
   * @private
   */
  drawLine(ctx, selected, hover) {
    // set style
    ctx.strokeStyle = this.getColor(ctx);
    ctx.lineWidth = this.getLineWidth(selected, hover);
    let via = undefined;
    if (this.from != this.to) {
      // draw line
      if (this.options.dashes.enabled == true) {
        via = this._drawDashedLine(ctx);
      }
      else {
        via = this._line(ctx);
      }
    }
    else {
      let x, y;
      let radius = this.options.selfReferenceSize;
      let node = this.from;
      node.resize(ctx);
      if (node.shape.width > node.shape.height) {
        x = node.x + node.shape.width * 0.5;
        y = node.y - radius;
      }
      else {
        x = node.x + radius;
        y = node.y - node.shape.height * 0.5;
      }
      this._circle(ctx, x, y, radius);
    }

    return via;
  }


  _drawDashedLine(ctx) {
    let via = undefined;
    // only firefox and chrome support this method, else we use the legacy one.
    if (ctx.setLineDash !== undefined) {
      ctx.save();
      // configure the dash pattern
      var pattern = [0];
      if (this.options.dashes.length !== undefined && this.options.dashes.gap !== undefined) {
        pattern = [this.options.dashes.length, this.options.dashes.gap];
      }
      else {
        pattern = [5, 5];
      }

      // set dash settings for chrome or firefox
      ctx.setLineDash(pattern);
      ctx.lineDashOffset = 0;

      // draw the line
      via = this._line(ctx);

      // restore the dash settings.
      ctx.setLineDash([0]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
    else { // unsupporting smooth lines
      // draw dashes line
      ctx.beginPath();
      ctx.lineCap = 'round';
      if (this.options.dashes.altLength !== undefined) //If an alt dash value has been set add to the array this value
      {
        ctx.dashesLine(this.from.x, this.from.y, this.to.x, this.to.y,
          [this.options.dashes.length, this.options.dashes.gap, this.options.dashes.altLength, this.options.dashes.gap]);
      }
      else if (this.options.dashes.length !== undefined && this.options.dashes.gap !== undefined) //If a dash and gap value has been set add to the array this value
      {
        ctx.dashesLine(this.from.x, this.from.y, this.to.x, this.to.y,
          [this.options.dashes.length, this.options.dashes.gap]);
      }
      else //If all else fails draw a line
      {
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
      }
      ctx.stroke();
    }
    return via;
  }


  findBorderPosition(nearNode, ctx, options) {
    if (this.from != this.to) {
      return this._findBorderPosition(nearNode, ctx, options);
    }
    else {
      return this._findBorderPositionCircle(nearNode, ctx, options);
    }
  }


  /**
   * This function uses binary search to look for the point where the circle crosses the border of the node.
   * @param x
   * @param y
   * @param radius
   * @param node
   * @param low
   * @param high
   * @param direction
   * @param ctx
   * @returns {*}
   * @private
   */
  _findBorderPositionCircle(node, ctx, options) {
    let x = options.x;
    let y = options.y;
    let low = options.low;
    let high = options.high;
    let direction = options.direction;

    let maxIterations = 10;
    let iteration = 0;
    let radius = this.options.selfReferenceSize;
    let pos, angle, distanceToBorder, distanceToPoint, difference;
    let threshold = 0.05;

    while (low <= high && iteration < maxIterations) {
      let middle = (low + high) * 0.5;

      pos = this._pointOnCircle(x, y, radius, middle);
      angle = Math.atan2((node.y - pos.y), (node.x - pos.x));
      distanceToBorder = node.distanceToBorder(ctx, angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - node.x, 2) + Math.pow(pos.y - node.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }
      else if (difference > 0) { // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
        if (direction > 0) {
          low = middle;
        }
        else {
          high = middle;
        }
      }
      else {
        if (direction > 0) {
          high = middle;
        }
        else {
          low = middle;
        }
      }
      iteration++;
    }
    pos.t = middle;

    return pos;
  }

  /**
   * Get the line width of the edge. Depends on width and whether one of the
   * connected nodes is selected.
   * @return {Number} width
   * @private
   */
  getLineWidth(selected, hover) {
    if (selected == true) {
      return Math.max(Math.min(this.options.widthSelectionMultiplier * this.options.width, this.options.scaling.max), 0.3 / this.body.view.scale);
    }
    else {
      if (hover == true) {
        return Math.max(Math.min(this.options.hoverWidth, this.options.scaling.max), 0.3 / this.body.view.scale);
      }
      else {
        return Math.max(this.options.width, 0.3 / this.body.view.scale);
      }
    }
  }


  getColor(ctx) {
    var colorObj = this.options.color;

    if (colorObj.inherit.enabled === true) {
      if (colorObj.inherit.useGradients == true) {
        var grd = ctx.createLinearGradient(this.from.x, this.from.y, this.to.x, this.to.y);
        var fromColor, toColor;
        fromColor = this.from.options.color.highlight.border;
        toColor = this.to.options.color.highlight.border;

        if (this.from.selected == false && this.to.selected == false) {
          fromColor = util.overrideOpacity(this.from.options.color.border, this.options.color.opacity);
          toColor = util.overrideOpacity(this.to.options.color.border, this.options.color.opacity);
        }
        else if (this.from.selected == true && this.to.selected == false) {
          toColor = this.to.options.color.border;
        }
        else if (this.from.selected == false && this.to.selected == true) {
          fromColor = this.from.options.color.border;
        }
        grd.addColorStop(0, fromColor);
        grd.addColorStop(1, toColor);

        // -------------------- this returns -------------------- //
        return grd;
      }

      if (this.colorDirty === true) {
        if (colorObj.inherit.source == "to") {
          colorObj.highlight = this.to.options.color.highlight.border;
          colorObj.hover = this.to.options.color.hover.border;
          colorObj.color = util.overrideOpacity(this.to.options.color.border, this.options.color.opacity);
        }
        else { // (this.options.color.inherit.source == "from") {
          colorObj.highlight = this.from.options.color.highlight.border;
          colorObj.hover = this.from.options.color.hover.border;
          colorObj.color = util.overrideOpacity(this.from.options.color.border, this.options.color.opacity);
        }
      }
    }

    // if color inherit is on and gradients are used, the function has already returned by now.
    this.colorDirty = false;

    if (this.selected == true) {
      return colorObj.highlight;
    }
    else if (this.hover == true) {
      return colorObj.hover;
    }
    else {
      return colorObj.color;
    }
  }

  /**
   * Draw a line from a node to itself, a circle
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x
   * @param {Number} y
   * @param {Number} radius
   * @private
   */
  _circle(ctx, x, y, radius) {
    // draw a circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();
  }


  /**
   * Calculate the distance between a point (x3,y3) and a line segment from
   * (x1,y1) to (x2,y2).
   * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} x3
   * @param {number} y3
   * @private
   */
  getDistanceToEdge(x1, y1, x2, y2, x3, y3, via) { // x3,y3 is the point
    var returnValue = 0;
    if (this.from != this.to) {
      returnValue = this._getDistanceToEdge(x1, y1, x2, y2, x3, y3, via)
    }
    else {
      var x, y, dx, dy;
      var radius = this.options.selfReferenceSize;
      var node = this.from;
      if (node.width > node.height) {
        x = node.x + 0.5 * node.width;
        y = node.y - radius;
      }
      else {
        x = node.x + radius;
        y = node.y - 0.5 * node.height;
      }
      dx = x - x3;
      dy = y - y3;
      returnValue = Math.abs(Math.sqrt(dx * dx + dy * dy) - radius);
    }

    if (this.labelModule.size.left < x3 &&
      this.labelModule.size.left + this.labelModule.size.width > x3 &&
      this.labelModule.size.top < y3 &&
      this.labelModule.size.top + this.labelModule.size.height > y3) {
      return 0;
    }
    else {
      return returnValue;
    }
  }

  _getDistanceToLine(x1, y1, x2, y2, x3, y3) {
    var px = x2 - x1;
    var py = y2 - y1;
    var something = px * px + py * py;
    var u = ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
      u = 1;
    }
    else if (u < 0) {
      u = 0;
    }

    var x = x1 + u * px;
    var y = y1 + u * py;
    var dx = x - x3;
    var dy = y - y3;

    //# Note: If the actual distance does not matter,
    //# if you only want to compare what this function
    //# returns to other results of this function, you
    //# can just return the squared distance instead
    //# (i.e. remove the sqrt) to gain a little performance

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   *
   * @param ctx
   * @param position
   * @param viaNode
   */
  drawArrowHead(ctx, position, viaNode, selected, hover) {
    // set style
    ctx.strokeStyle = this.getColor(ctx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = this.getLineWidth(selected, hover);

    // set lets
    let angle;
    let length;
    let arrowPos;
    let node1;
    let node2;
    let guideOffset;
    let scaleFactor;

    if (position == 'from') {
      node1 = this.from;
      node2 = this.to;
      guideOffset = 0.1;
      scaleFactor = this.options.arrows.from.scaleFactor;
    }
    else if (position == 'to') {
      node1 = this.to;
      node2 = this.from;
      guideOffset = -0.1;
      scaleFactor = this.options.arrows.to.scaleFactor;
    }
    else {
      node1 = this.to;
      node2 = this.from;
      scaleFactor = this.options.arrows.middle.scaleFactor;
    }

    // if not connected to itself
    if (node1 != node2) {
      if (position !== 'middle') {
        // draw arrow head
        if (this.options.smooth.enabled == true) {
          arrowPos = this.findBorderPosition(node1, ctx, {via: viaNode});
          let guidePos = this.getPoint(Math.max(0.0, Math.min(1.0, arrowPos.t + guideOffset)), viaNode);
          angle = Math.atan2((arrowPos.y - guidePos.y), (arrowPos.x - guidePos.x));
        }
        else {
          angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
          arrowPos = this.findBorderPosition(node1, ctx);
        }
      }
      else {
        angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
        arrowPos = this.getPoint(0.6, viaNode); // this is 0.6 to account for the size of the arrow.
      }
      // draw arrow at the end of the line
      length = (10 + 5 * this.options.width) * scaleFactor;
      ctx.arrow(arrowPos.x, arrowPos.y, angle, length);
      ctx.fill();
      ctx.stroke();
    }
    else {
      // draw circle
      let angle, point;
      let x, y;
      let radius = this.options.selfReferenceSize;
      if (!node1.width) {
        node1.resize(ctx);
      }

      // get circle coordinates
      if (node1.width > node1.height) {
        x = node1.x + node1.width * 0.5;
        y = node1.y - radius;
      }
      else {
        x = node1.x + radius;
        y = node1.y - node1.height * 0.5;
      }


      if (position == 'from') {
        point = this.findBorderPosition(x, y, radius, node1, 0.25, 0.6, -1, ctx);
        angle = point.t * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }
      else if (position == 'to') {
        point = this.findBorderPosition(x, y, radius, node1, 0.6, 0.8, 1, ctx);
        angle = point.t * -2 * Math.PI + 1.5 * Math.PI - 1.1 * Math.PI;
      }
      else {
        point = this.findBorderPosition(x, y, radius, 0.175);
        angle = 3.9269908169872414; // == 0.175 * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }

      // draw the arrowhead
      let length = (10 + 5 * this.options.width) * scaleFactor;
      ctx.arrow(point.x, point.y, angle, length);
      ctx.fill();
      ctx.stroke();
    }
  }

}

export default EdgeBase;