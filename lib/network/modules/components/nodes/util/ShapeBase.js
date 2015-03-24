/**
 * Created by Alex on 3/19/2015.
 */
import NodeBase from '../util/NodeBase'

class ShapeBase extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  _resizeShape() {
    if (this.width === undefined) {
      var size = 2 * this.options.size;
      this.width = size;
      this.height = size;
    }
  }

  _drawShape(ctx, shape, sizeMultiplier, x, y, selected, hover) {
    this._resizeShape();

    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth /= this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);
    ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;
    ctx[shape](x, y, this.options.size + sizeMultiplier *  ctx.lineWidth);
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

    if (this.options.label!== undefined) {
      let yLabel = y + 0.5 * this.height + 3 + sizeMultiplier *  ctx.lineWidth; // the + 3 is to offset it a bit below the node.
      this.labelModule.draw(ctx, x, yLabel, selected, 'hanging');
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
    }
  }

}

export default ShapeBase;