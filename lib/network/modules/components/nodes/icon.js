/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import NodeUtil from './nodeUtil'

class Icon extends NodeUtil {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  setOptions(options) {
    this.options = options;
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
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx);
    this.options.icon.size = this.options.icon.size || 50;

    this.left = x - this.width  * 0.5;
    this.top  = y - this.height * 0.5;
    this._icon(ctx, x, y, selected);


    this.boundingBox.top    = y - this.options.icon.size * 0.5;
    this.boundingBox.left   = x - this.options.icon.size * 0.5;
    this.boundingBox.right  = x + this.options.icon.size * 0.5;
    this.boundingBox.bottom = y + this.options.icon.size * 0.5;

    if (this.options.label !== undefined) {
      var iconTextSpacing = 5;
      this.labelModule.draw(ctx, x, y + this.height * 0.5 + iconTextSpacing, selected);
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
    }
  }

  _icon(ctx, x, y, selected) {
    let iconSize = Number(this.options.icon.size);
    let relativeIconSize = iconSize * this.body.view.scale;

    if (this.options.icon.code && relativeIconSize > this.options.scaling.label.drawThreshold - 1) {
      ctx.font = (selected ? "bold " : "") + iconSize + "px " + this.options.icon.fontFace;

      // draw icon
      ctx.fillStyle = this.options.icon.color || "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.options.icon.code, x, y);
    }
  }

  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    this._distanceToBorder(angle);
  }
}

export default Icon;