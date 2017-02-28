'use strict';

import NodeBase from '../util/NodeBase'

class Database extends NodeBase {
  constructor (options, body, labelModule) {
    super(options, body, labelModule);
    this._setMargins(labelModule);
  }

  resize(ctx, selected, hover) {
    if ((this.width === undefined) || (this.labelModule.differentState(selected, hover))) {
      this.textSize = this.labelModule.getTextSize(ctx, selected, hover);
      var size = this.textSize.width + this.margin.right + this.margin.left;
      this.width = size;
      this.height = size;
      this.radius = this.width / 2;
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width / 2;
    this.top  = y - this.height / 2;

    var borderWidth = values.borderWidth / this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, borderWidth);

    ctx.strokeStyle = values.borderColor;

    ctx.fillStyle = values.color;
    ctx.database(x - this.width / 2, y - this.height / 2, this.width, this.height);

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
    this.labelModule.draw(ctx, this.left + this.textSize.width / 2 + this.margin.left,
                               this.top + this.textSize.height / 2 + this.margin.top, selected, hover);
  }

  updateBoundingBox(x, y, ctx, selected, hover) {
    this.resize(ctx, selected, hover);

    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.boundingBox.left = this.left;
    this.boundingBox.top = this.top;
    this.boundingBox.bottom = this.top + this.height;
    this.boundingBox.right = this.left + this.width;
  }

  distanceToBorder(ctx, angle) {
    return this._distanceToBorder(ctx,angle);
  }
}

export default Database;
