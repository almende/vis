/**
 * Created by Alex on 3/19/2015.
 */

class NodeUtil {
  constructor(options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.setOptions(options);
    this.top = undefined;
    this.left = undefined;
    this.height = undefined;
    this.height = undefined;
    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};
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

  _distanceToBorder(angle) {
    var borderWidth = 1;
    return Math.min(
          Math.abs(this.width / 2 / Math.cos(angle)),
          Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
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

    // choose draw method depending on the shape
    switch (shape) {
      case 'dot':
        sizeMultiplier = 2;
        break;
      case 'square':
        sizeMultiplier = 2;
        break;
      case 'triangle':
        sizeMultiplier = 3;
        break;
      case 'triangleDown':
        sizeMultiplier = 3;
        break;
      case 'star':
        sizeMultiplier = 4;
        break;
    }

    ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;
    ctx.lineWidth = (selected ? selectionLineWidth : borderWidth);
    ctx.lineWidth /= this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, ctx.lineWidth);
    ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;
    ctx[shape](x, y, this.options.size);
    ctx.fill();
    ctx.stroke();

    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

    if (this.options.label!== undefined) {
      this.labelModule.draw(ctx, x, y + 0.5* this.height, selected, 'hanging');
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
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

export default NodeUtil;