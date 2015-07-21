'use strict';

import NodeBase from '../util/NodeBase'

class Database extends NodeBase {
  constructor (options, body, labelModule) {
    super(options, body, labelModule);
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx, selected);
      var size = textSize.width + 2 * margin;
      this.width = size;
      this.height = size;
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx, selected);
    this.left = x - this.width / 2;
    this.top  = y - this.height / 2;

    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (this.selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;
    ctx.database(x - this.width / 2, y - this.height * 0.5, this.width, this.height);

    // draw shadow if enabled
    this.enableShadow(ctx);
    // draw the background
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx);

    //draw dashed border if enabled, save and restore is required for firefox not to crash on unix.
    ctx.save();
    this.enableBorderDashes(ctx);
    //draw the border
    ctx.stroke();
    //disable dashed border for other elements
    this.disableBorderDashes(ctx);
    ctx.restore();

    this.updateBoundingBox(x,y,ctx,selected);
    this.labelModule.draw(ctx, x, y, selected);
  }

  updateBoundingBox(x,y,ctx, selected) {
    this.resize(ctx, selected);

    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.boundingBox.left = this.left;
    this.boundingBox.top = this.top;
    this.boundingBox.bottom = this.top + this.height;
    this.boundingBox.right = this.left + this.width;
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    var a = this.width / 2;
    var b = this.height / 2;
    var w = (Math.sin(angle) * a);
    var h = (Math.cos(angle) * b);
    return a * b / Math.sqrt(w * w + h * h);
  }
}

export default Database;