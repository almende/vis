/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

import NodeUtil from './nodeUtil'

class Circle extends NodeUtil {
  constructor (options, labelModule) {
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

  resize(ctx) {
    if (this.width === undefined) {
      var margin = 5;
      var textSize = this.labelModule.getTextSize(ctx,this.selected);
      var diameter = Math.max(textSize.width, textSize.height) + 2 * margin;
      this.options.size = diameter / 2;

      this.width = diameter;
      this.height = diameter;
    }
  }

  draw(ctx, x, y, selected, hover) {
    this.resize(ctx);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this._drawRawCircle(ctx, x, y, selected, hover, this.options.size);

    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

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

export default Circle;