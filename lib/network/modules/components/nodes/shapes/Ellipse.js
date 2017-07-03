'use strict';

import NodeBase from '../util/NodeBase'

class Ellipse extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  resize(ctx, selected = this.selected, hover = this.hover) {
    if (this.needsRefresh(selected, hover)) {
      var textSize = this.labelModule.getTextSize(ctx, selected, hover);

      this.height = textSize.height * 2;
      this.width = textSize.width + this.height;
      this.radius = 0.5*this.width;
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover);
    this.left = x - this.width * 0.5;
    this.top = y - this.height * 0.5;

    this.initContextForDraw(ctx, values);
    ctx.ellipse_vis(this.left, this.top, this.width, this.height);
    this.performFill(ctx, values);

    this.updateBoundingBox(x, y, ctx, selected, hover);
    this.labelModule.draw(ctx, x, y, selected, hover);
  }


  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    var a = this.width * 0.5;
    var b = this.height * 0.5;
    var w = (Math.sin(angle) * a);
    var h = (Math.cos(angle) * b);
    return a * b / Math.sqrt(w * w + h * h);
  }
}

export default Ellipse;
