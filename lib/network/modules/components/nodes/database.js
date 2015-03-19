/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

class Database {
  constructor (options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.setOptions(options);
    this.top = undefined;
    this.left = undefined;
    this.height = undefined;
    this.height = undefined;
    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};
  }

  setOptions(options) {
    this.options = options;
  }

  resize(ctx, selected) {
    if (this.width === undefined) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx, selected);
      var size = textSize.width + 2 * margin;
      this.width = size;
      this.height = size;
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
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = this.top;
    this.boundingBox.left = this.left;
    this.boundingBox.right = this.left + this.width;
    this.boundingBox.bottom = this.top + this.height;

    this.labelModule.draw(ctx, x, y, selected);
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