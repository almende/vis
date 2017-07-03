import NodeBase from '../util/NodeBase'

class ShapeBase extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule)
  }

  resize(ctx, selected = this.selected, hover = this.hover, values = { size: this.options.size }) {
    if (this.needsRefresh(selected, hover)) {
      this.labelModule.getTextSize(ctx, selected, hover);
      var size = 2 * values.size;
      this.width = size;
      this.height = size;
      this.radius = 0.5*this.width;
    }
  }

  _drawShape(ctx, shape, sizeMultiplier, x, y, selected, hover, values) {
    this.resize(ctx, selected, hover, values);
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    this.initContextForDraw(ctx, values);
    ctx[shape](x, y, values.size);
    this.performFill(ctx, values);

    if (this.options.label !== undefined) {
      // Need to call following here in order to ensure value for `this.labelModule.size.height`
      this.labelModule.calculateLabelSize(ctx, selected, hover, x, y, 'hanging')
      let yLabel = y + 0.5 * this.height + 0.5 * this.labelModule.size.height;
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
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelModule.size.height);
    }
  }



}

export default ShapeBase;
