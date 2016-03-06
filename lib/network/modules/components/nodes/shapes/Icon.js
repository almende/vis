'use strict';

import NodeBase from '../util/NodeBase'

class Icon extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  resize(ctx) {
    if (this.width === undefined) {
      var margin = 5;
      var iconSize = {
        width: Number(this.options.icon.size),
        height: Number(this.options.icon.size)
      };
      this.width = iconSize.width + 2 * margin;
      this.height = iconSize.height + 2 * margin;
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx);
    this.options.icon.size = this.options.icon.size || 50;

    this.left = x - this.width  * 0.5;
    this.top  = y - this.height * 0.5;
    this._icon(ctx, x, y, selected);

    if (this.options.label !== undefined) {
      var iconTextSpacing = 5;
      this.labelModule.draw(ctx, x, y + this.height * 0.5 + iconTextSpacing, selected);
    }

    this.updateBoundingBox(x,y)
  }

  updateBoundingBox(x,y) {
    this.boundingBox.top    = y - this.options.icon.size * 0.5;
    this.boundingBox.left   = x - this.options.icon.size * 0.5;
    this.boundingBox.right  = x + this.options.icon.size * 0.5;
    this.boundingBox.bottom = y + this.options.icon.size * 0.5;

    if (this.options.label !== undefined && this.labelModule.size.width > 0) {
      var iconTextSpacing = 5;
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height + iconTextSpacing);
    }
  }

  _icon(ctx, x, y, selected) {
    let iconSize = Number(this.options.icon.size);

    if (this.options.icon.code !== undefined) {
      ctx.font = (selected ? "bold " : "") + iconSize + "px " + this.options.icon.face;

      // draw icon
      ctx.fillStyle = this.options.icon.color || "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // draw shadow if enabled
      this.enableShadow(ctx);
      ctx.fillText(this.options.icon.code, x, y);

      // disable shadows for other elements.
      this.disableShadow(ctx);
    }
    else {
      console.error('When using the icon shape, you need to define the code in the icon options object. This can be done per node or globally.')
    }

  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Icon;