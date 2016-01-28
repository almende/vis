let util = require("../../../../../util");

class EdgeBase {
  constructor(options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.options = {};
    this.setOptions(options);
    this.colorDirty = true;
    this.color = {};
    this.selectionWidth = 2;
    this.hoverWidth = 1.5;
    this.fromPoint = this.from;
    this.toPoint = this.to;
  }

  connect() {
    this.from = this.body.nodes[this.options.from];
    this.to = this.body.nodes[this.options.to];
  }
  cleanup() {return false}

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
  drawLine(ctx, selected, hover, viaNode) {
    // set style
    ctx.strokeStyle = this.getColor(ctx, selected, hover);
    ctx.lineWidth = this.getLineWidth(selected, hover);

    if (this.options.dashes !== false) {
      this._drawDashedLine(ctx, viaNode);
    }
    else {
      this._drawLine(ctx, viaNode);
    }
  }


  _drawLine(ctx, viaNode, fromPoint, toPoint) {
    if (this.from != this.to) {
      // draw line
      this._line(ctx, viaNode, fromPoint, toPoint);
    }
    else {
      let [x,y,radius] = this._getCircleData(ctx);
      this._circle(ctx, x, y, radius);
    }
  }

  _drawDashedLine(ctx, viaNode, fromPoint, toPoint) {
    ctx.lineCap = 'round';
    let pattern = [5,5];
    if (Array.isArray(this.options.dashes) === true) {
      pattern = this.options.dashes;
    }

    // only firefox and chrome support this method, else we use the legacy one.
    if (ctx.setLineDash !== undefined) {
      ctx.save();

      // set dash settings for chrome or firefox
      ctx.setLineDash(pattern);
      ctx.lineDashOffset = 0;

      // draw the line
      if (this.from != this.to) {
        // draw line
        this._line(ctx, viaNode);
      }
      else {
        let [x,y,radius] = this._getCircleData(ctx);
        this._circle(ctx, x, y, radius);
      }

      // restore the dash settings.
      ctx.setLineDash([0]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
    else { // unsupporting smooth lines
      if (this.from != this.to) {
        // draw line
        ctx.dashedLine(this.from.x, this.from.y, this.to.x, this.to.y, pattern);
      }
      else {
        let [x,y,radius] = this._getCircleData(ctx);
        this._circle(ctx, x, y, radius);
      }
      // draw shadow if enabled
      this.enableShadow(ctx);

      ctx.stroke();

      // disable shadows for other elements.
      this.disableShadow(ctx);
    }
  }


  findBorderPosition(nearNode, ctx, options) {
    if (this.from != this.to) {
      return this._findBorderPosition(nearNode, ctx, options);
    }
    else {
      return this._findBorderPositionCircle(nearNode, ctx, options);
    }
  }

  findBorderPositions(ctx) {
    let from = {};
    let to = {};
    if (this.from != this.to) {
      from = this._findBorderPosition(this.from, ctx);
      to = this._findBorderPosition(this.to, ctx);
    }
    else {
      let [x,y,radius] = this._getCircleData(ctx);

      from = this._findBorderPositionCircle(this.from, ctx, {x, y, low:0.25, high:0.6, direction:-1});
      to = this._findBorderPositionCircle(this.from, ctx, {x, y, low:0.6, high:0.8, direction:1});
    }
    return {from, to};
  }

  _getCircleData(ctx) {
    let x, y;
    let node = this.from;
    let radius = this.options.selfReferenceSize;

    if (ctx !== undefined) {
      if (node.shape.width === undefined) {
        node.shape.resize(ctx);
      }
    }

    // get circle coordinates
    if (node.shape.width > node.shape.height) {
      x = node.x + node.shape.width * 0.5;
      y = node.y - radius;
    }
    else {
      x = node.x + radius;
      y = node.y - node.shape.height * 0.5;
    }
    return [x,y,radius];
  }

  /**
   * Get a point on a circle
   * @param {Number} x
   * @param {Number} y
   * @param {Number} radius
   * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
   * @return {Object} point
   * @private
   */
  _pointOnCircle(x, y, radius, percentage) {
    let angle = percentage * 2 * Math.PI;
    return {
      x: x + radius * Math.cos(angle),
      y: y - radius * Math.sin(angle)
    }
  }

  /**
   * This function uses binary search to look for the point where the circle crosses the border of the node.
   * @param node
   * @param ctx
   * @param options
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
    let middle = (low + high) * 0.5;

    while (low <= high && iteration < maxIterations) {
      middle = (low + high) * 0.5;

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
    if (selected === true) {
      return Math.max(this.selectionWidth, 0.3 / this.body.view.scale);
    }
    else {
      if (hover === true) {
        return Math.max(this.hoverWidth, 0.3 / this.body.view.scale);
      }
      else {
        return Math.max(this.options.width, 0.3 / this.body.view.scale);
      }
    }
  }


  getColor(ctx, selected, hover) {
    let colorOptions = this.options.color;
    if (colorOptions.inherit !== false) {
      // when this is a loop edge, just use the 'from' method
      if (colorOptions.inherit === 'both' && this.from.id !== this.to.id) {
        let grd = ctx.createLinearGradient(this.from.x, this.from.y, this.to.x, this.to.y);
        let fromColor, toColor;
        fromColor = this.from.options.color.highlight.border;
        toColor = this.to.options.color.highlight.border;

        if (this.from.selected === false && this.to.selected === false) {
          fromColor = util.overrideOpacity(this.from.options.color.border, this.options.color.opacity);
          toColor = util.overrideOpacity(this.to.options.color.border, this.options.color.opacity);
        }
        else if (this.from.selected === true && this.to.selected === false) {
          toColor = this.to.options.color.border;
        }
        else if (this.from.selected === false && this.to.selected === true) {
          fromColor = this.from.options.color.border;
        }
        grd.addColorStop(0, fromColor);
        grd.addColorStop(1, toColor);

        // -------------------- this returns -------------------- //
        return grd;
      }

      if (this.colorDirty === true) {
        if (colorOptions.inherit === "to") {
          this.color.highlight = this.to.options.color.highlight.border;
          this.color.hover = this.to.options.color.hover.border;
          this.color.color = util.overrideOpacity(this.to.options.color.border, colorOptions.opacity);
        }
        else { // (this.options.color.inherit.source === "from") {
          this.color.highlight = this.from.options.color.highlight.border;
          this.color.hover = this.from.options.color.hover.border;
          this.color.color = util.overrideOpacity(this.from.options.color.border, colorOptions.opacity);
        }
      }
    }
    else if (this.colorDirty === true) {
      this.color.highlight = colorOptions.highlight;
      this.color.hover = colorOptions.hover;
      this.color.color = util.overrideOpacity(colorOptions.color, colorOptions.opacity);
    }

    // if color inherit is on and gradients are used, the function has already returned by now.
    this.colorDirty = false;


    if (selected === true) {
      return this.color.highlight;
    }
    else if (hover === true) {
      return this.color.hover;
    }
    else {
      return this.color.color;
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
    // draw shadow if enabled
    this.enableShadow(ctx);

    // draw a circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();

    // disable shadows for other elements.
    this.disableShadow(ctx);
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
    let returnValue = 0;
    if (this.from != this.to) {
      returnValue = this._getDistanceToEdge(x1, y1, x2, y2, x3, y3, via)
    }
    else {
      let [x,y,radius] = this._getCircleData();
      let dx = x - x3;
      let dy = y - y3;
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
    let px = x2 - x1;
    let py = y2 - y1;
    let something = px * px + py * py;
    let u = ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
      u = 1;
    }
    else if (u < 0) {
      u = 0;
    }

    let x = x1 + u * px;
    let y = y1 + u * py;
    let dx = x - x3;
    let dy = y - y3;

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
  getArrowData(ctx, position, viaNode, selected, hover) {
    // set lets
    let angle;
    let arrowPoint;
    let node1;
    let node2;
    let guideOffset;
    let scaleFactor;
    let lineWidth = this.getLineWidth(selected, hover);

    if (position === 'from') {
      node1 = this.from;
      node2 = this.to;
      guideOffset = 0.1;
      scaleFactor = this.options.arrows.from.scaleFactor;
    }
    else if (position === 'to') {
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
        if (this.options.smooth.enabled === true) {
          arrowPoint = this.findBorderPosition(node1, ctx, {via: viaNode});
          let guidePos = this.getPoint(Math.max(0.0, Math.min(1.0, arrowPoint.t + guideOffset)), viaNode);
          angle = Math.atan2((arrowPoint.y - guidePos.y), (arrowPoint.x - guidePos.x));
        }
        else {
          angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
          arrowPoint = this.findBorderPosition(node1, ctx);
        }
      }
      else {
        angle = Math.atan2((node1.y - node2.y), (node1.x - node2.x));
        arrowPoint = this.getPoint(0.5, viaNode); // this is 0.6 to account for the size of the arrow.
      }
    }
    else {
      // draw circle
      let [x,y,radius] = this._getCircleData(ctx);

      if (position === 'from') {
        arrowPoint = this.findBorderPosition(this.from, ctx, {x, y, low:0.25, high:0.6, direction:-1});
        angle = arrowPoint.t * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }
      else if (position === 'to') {
        arrowPoint = this.findBorderPosition(this.from, ctx, {x, y, low:0.6, high:1.0, direction:1});
        angle = arrowPoint.t * -2 * Math.PI + 1.5 * Math.PI - 1.1 * Math.PI;
      }
      else {
        arrowPoint = this._pointOnCircle(x, y, radius, 0.175);
        angle = 3.9269908169872414; // === 0.175 * -2 * Math.PI + 1.5 * Math.PI + 0.1 * Math.PI;
      }
    }

    let length = 15 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    var xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    var yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    let arrowCore = {x: xi, y: yi};

    return {point: arrowPoint, core: arrowCore, angle: angle, length: length};
  }

  /**
   *
   * @param ctx
   * @param selected
   * @param hover
   * @param arrowData
   */
  drawArrowHead(ctx, selected, hover, arrowData) {
    // set style
    ctx.strokeStyle = this.getColor(ctx, selected, hover);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = this.getLineWidth(selected, hover);

    // draw arrow at the end of the line
    ctx.arrow(arrowData.point.x, arrowData.point.y, arrowData.angle, arrowData.length);

    // draw shadow if enabled
    this.enableShadow(ctx);
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx);
  }


  enableShadow(ctx) {
    if (this.options.shadow.enabled === true) {
      ctx.shadowColor = this.options.shadow.color;
      ctx.shadowBlur = this.options.shadow.size;
      ctx.shadowOffsetX = this.options.shadow.x;
      ctx.shadowOffsetY = this.options.shadow.y;
    }
  }

  disableShadow(ctx) {
    if (this.options.shadow.enabled === true) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }
}

export default EdgeBase;