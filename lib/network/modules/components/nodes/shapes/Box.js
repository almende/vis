'use strict';

import NodeBase from '../util/NodeBase'

class Box extends NodeBase {
  constructor (options, body, labelModule) {
    super(options,body,labelModule);
    this._setMargins(labelModule);
  }

  resize(ctx, selected = this.selected, hover = this.hover) {
    if ((this.width === undefined) || this.labelModule.differentState(selected, hover)) {
      this.textSize = this.labelModule.getTextSize(ctx, selected, hover);
      this.width = this.textSize.width + this.margin.right + this.margin.left;
      this.height = this.textSize.height + this.margin.top + this.margin.bottom;
      this.radius = this.width / 2;
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    ctx.strokeStyle = values.borderColor;
    ctx.lineWidth = values.borderWidth;
    ctx.lineWidth /= this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = values.color;

    ctx.roundRect(this.left, this.top, this.width, this.height, values.borderRadius);

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    // draw the background
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx, values);

    //draw dashed border if enabled, save and restore is required for firefox not to crash on unix.
    ctx.save();
    // if borders are zero width, they will be drawn with width 1 by default. This prevents that
    if (values.borderWidth > 0) {
      this.enableBorderDashes(ctx, values);
      //draw the border
      ctx.stroke();
      //disable dashed border for other elements
      this.disableBorderDashes(ctx, values);
    }
    ctx.restore();

    this.updateBoundingBox(x, y, ctx, selected, hover);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected, hover);
  }

  updateBoundingBox(x, y, ctx, selected, hover) {
    this.resize(ctx, selected, hover);
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
