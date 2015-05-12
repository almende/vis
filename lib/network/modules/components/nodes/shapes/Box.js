'use strict';

import NodeBase from '../util/NodeBase'

class Box extends NodeBase {
  constructor (options, body, labelModule) {
    super(options,body,labelModule);
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      let margin = 5;
      let textSize = this.labelModule.getTextSize(ctx,selected);
      this.width = textSize.width + 2 * margin;
      this.height = textSize.height + 2 * margin;
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

    let borderRadius = 6;
    ctx.roundRect(this.left, this.top, this.width, this.height, borderRadius);

    // draw shadow if enabled
    this.enableShadow(ctx);
    ctx.fill();

    // disable shadows for other elements.
    this.disableShadow(ctx);

    ctx.stroke();

    this.updateBoundingBox(x,y);
    this.labelModule.draw(ctx, x, y, selected);
  }

  updateBoundingBox(x,y) {
    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.boundingBox.left = this.left;
    this.boundingBox.top = this.top;
    this.boundingBox.bottom = this.top + this.height;
    this.boundingBox.right = this.left + this.width;
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    let a = this.width / 2;
    let b = this.height / 2;
    let w = (Math.sin(angle) * a);
    let h = (Math.cos(angle) * b);
    return a * b / Math.sqrt(w * w + h * h);
  }
}

export default Box;