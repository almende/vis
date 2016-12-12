'use strict';

import NodeBase from '../util/NodeBase'

class Ellipse extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  resize(ctx, selected = this.selected, hover = this.hover) {
    if ((this.width === undefined) || (this.labelModule.differentState(selected, hover))) {
      var textSize = this.labelModule.getTextSize(ctx, selected, hover);

      this.height = textSize.height * 2;
      this.width = textSize.width + this.height;
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    var borderWidth = values.borderWidth / this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, borderWidth);

    ctx.strokeStyle = values.borderColor;

    ctx.fillStyle = values.color;
    ctx.ellipse(this.left, this.top, this.width, this.height);

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    // draw the background
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx, values);

    //draw dashed border if enabled, save and restore is required for firefox not to crash on unix.
    ctx.save();

    // if borders are zero width, they will be drawn with width 1 by default. This prevents that
    if (borderWidth > 0) {
      this.enableBorderDashes(ctx, values);
      //draw the border
      ctx.stroke();
      //disable dashed border for other elements
      this.disableBorderDashes(ctx, values);
    }

    ctx.restore();

    this.updateBoundingBox(x, y, ctx, selected, hover);
    this.labelModule.draw(ctx, x, y, selected, hover);
  }

  updateBoundingBox(x, y, ctx, selected, hover) {
    this.resize(ctx, selected, hover); // just in case

    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.boundingBox.left = this.left;
    this.boundingBox.top = this.top;
    this.boundingBox.bottom = this.top + this.height;
    this.boundingBox.right = this.left + this.width;
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    var a = this.width * 0.5;
    var b = this.height * 0.5;
    var w = (Math.sin(angle) * a);
    var h = (Math.cos(angle) * b);
    return a * b / Math.sqrt(w * w + h * h);
  }
}

export default Ellipse;
