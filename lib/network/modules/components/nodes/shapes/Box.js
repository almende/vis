'use strict';

import NodeBase from '../util/NodeBase'

class Box extends NodeBase {
  constructor (options, body, labelModule) {
    super(options,body,labelModule);
    this._setMargins(labelModule);
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      this.textSize = this.labelModule.getTextSize(ctx,selected);
      this.width = this.textSize.width + this.margin.right + this.margin.left;
      this.height = this.textSize.height + this.margin.top + this.margin.bottom;
      this.radius = this.width / 2;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx, selected);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    let borderWidth = this.options.borderWidth;
    let selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth /= this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;

    let borderRadius = this.options.shapeProperties.borderRadius; // only effective for box
    ctx.roundRect(this.left, this.top, this.width, this.height, borderRadius);

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

    this.updateBoundingBox(x,y,ctx,selected);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected);
  }

  updateBoundingBox(x,y, ctx, selected) {
    this.resize(ctx, selected);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    let borderRadius = this.options.shapeProperties.borderRadius; // only effective for box
    this.boundingBox.left = this.left - borderRadius;
    this.boundingBox.top = this.top - borderRadius;
    this.boundingBox.bottom = this.top + this.height + borderRadius;
    this.boundingBox.right = this.left + this.width + borderRadius;
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    let borderWidth = this.options.borderWidth;

    return Math.min(
        Math.abs((this.width) / 2 / Math.cos(angle)),
        Math.abs((this.height)  / 2 / Math.sin(angle))) + borderWidth;
  }
}

export default Box;
