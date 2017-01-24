import NodeBase from '../util/NodeBase'

class ShapeBase extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  _resizeShape(selected = this.selected, hover = this.hover, values = { size: this.options.size }) {
    if ((this.width === undefined) || (this.labelModule.differentState(selected, hover))) {
      var size = 2 * values.size;
      this.width = size;
      this.height = size;
      this.radius = 0.5*this.width;
    }
  }

  _drawShape(ctx, shape, sizeMultiplier, x, y, selected, hover, values) {
    this._resizeShape(selected, hover, values);

    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    var borderWidth = values.borderWidth / this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, borderWidth);

    ctx.strokeStyle = values.borderColor;
    ctx.fillStyle = values.color;
    ctx[shape](x, y, values.size);

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

    if (this.options.label !== undefined) {
      let yLabel = y + 0.5 * this.height + 3; // the + 3 is to offset it a bit below the node.
      this.labelModule.draw(ctx, x, yLabel, selected, hover, 'hanging');
    }

    this.updateBoundingBox(x,y);
  }

  updateBoundingBox(x,y) {
    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

    if (this.options.label !== undefined && this.labelModule.size.width > 0) {
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height + 3);
    }
  }



}

export default ShapeBase;
