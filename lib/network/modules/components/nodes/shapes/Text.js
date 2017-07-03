'use strict';

import NodeBase from '../util/NodeBase'

class Text extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
    this._setMargins(labelModule);
  }

  resize(ctx, selected, hover) {
    if (this.needsRefresh(selected, hover)) {
      this.textSize = this.labelModule.getTextSize(ctx, selected, hover);
      this.width = this.textSize.width + this.margin.right + this.margin.left;
      this.height = this.textSize.height + this.margin.top + this.margin.bottom;
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected, hover);

    // disable shadows for other elements.
    this.disableShadow(ctx, values);

    this.updateBoundingBox(x, y, ctx, selected, hover);
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Text;
