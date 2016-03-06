'use strict';

import NodeBase from '../util/NodeBase'

class Text extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx,selected);
      this.width = textSize.width + 2 * margin;
      this.height = textSize.height + 2 * margin;
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx, selected || hover);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    // draw shadow if enabled
    this.enableShadow(ctx);
    this.labelModule.draw(ctx, x, y, selected || hover);

    // disable shadows for other elements.
    this.disableShadow(ctx);

    this.updateBoundingBox(x, y, ctx, selected);
  }

  updateBoundingBox(x, y, ctx, selected) {
    this.resize(ctx, selected);

    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Text;