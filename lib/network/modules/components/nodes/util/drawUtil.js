/**
 * Created by Alex on 3/19/2015.
 */
import BaseNode from '../util/baseNode'

class drawUtil extends BaseNode {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
  }

  _drawRawCircle(ctx, x, y, selected, hover, size) {
    var borderWidth = this.options.borderWidth;
    var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;

    ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;

    ctx.lineWidth = (selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth *= this.networkScaleInv;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);

    ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;
    ctx.circle(x, y, size);
    ctx.fill();
    ctx.stroke();
  }

  _drawImageAtPosition(ctx) {
    if (this.imageObj.width != 0) {
      // draw the image
      ctx.globalAlpha = 1.0;
      ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
    }
  }

  _drawImageLabel(ctx, x, y, selected) {
    var yLabel;
    var offset = 0;

    if (this.height !== undefined) {
      offset = this.height * 0.5;
      var labelDimensions = this.labelModule.getTextSize(ctx);

      if (labelDimensions.lineCount >= 1) {
        offset += labelDimensions.height / 2;
        offset += 3;
      }
    }

    yLabel = y + offset;

    this.labelModule.draw(ctx, x, yLabel, selected, 'hanging');
  }
}

export default drawUtil;