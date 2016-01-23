'use strict';

import NodeBase from '../util/NodeBase'

class Ellipse extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      var textSize = this.labelModule.getTextSize(ctx, selected);

      this.width = textSize.width * 1.5;
      this.height = textSize.height * 2;
      if (this.width < this.height) {
        this.width = this.height;
      }
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx, selected);
    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    var neutralborderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;
    var borderWidth = (selected ? selectionLineWidth : neutralborderWidth) / this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, borderWidth);

    ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;

    ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;
    ctx.ellipse(this.left, this.top, this.width, this.height);

    // draw shadow if enabled
    this.enableShadow(ctx);
    // draw the background
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx);

    //draw dashed border if enabled, save and restore is required for firefox not to crash on unix.
    ctx.save();

    // if borders are zero width, they will be drawn with width 1 by default. This prevents that
    if (borderWidth > 0) {
      this.enableBorderDashes(ctx);
      //draw the border
      ctx.stroke();
      //disable dashed border for other elements
      this.disableBorderDashes(ctx);
    }

    ctx.restore();

    this.updateBoundingBox(x, y, ctx, selected);
    this.labelModule.draw(ctx, x, y, selected);
  }

  updateBoundingBox(x, y, ctx, selected) {
    this.resize(ctx, selected); // just in case

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