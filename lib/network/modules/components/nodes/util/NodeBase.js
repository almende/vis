class NodeBase {
  constructor(options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.setOptions(options);
    this.top = undefined;
    this.left = undefined;
    this.height = undefined;
    this.width = undefined;
    this.radius = undefined;
    this.margin = undefined;
    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};
  }

  setOptions(options) {
    this.options = options;
  }

  _setMargins(labelModule) {
    this.margin = {};
    if (this.options.margin) {
      if (typeof this.options.margin == 'object') {
        this.margin.top = this.options.margin.top;
        this.margin.right = this.options.margin.right;
        this.margin.bottom = this.options.margin.bottom;
        this.margin.left = this.options.margin.left;
      } else {
        this.margin.top = this.options.margin;
        this.margin.right = this.options.margin;
        this.margin.bottom = this.options.margin;
        this.margin.left = this.options.margin;
      }
    }
    labelModule.adjustSizes(this.margin)
  }

  _distanceToBorder(ctx,angle) {
    var borderWidth = this.options.borderWidth;
    this.resize(ctx);
    return Math.min(
        Math.abs(this.width / 2 / Math.cos(angle)),
        Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
  }

  enableShadow(ctx, values) {
    if (values.shadow) {
      ctx.shadowColor = values.shadowColor;
      ctx.shadowBlur = values.shadowSize;
      ctx.shadowOffsetX = values.shadowX;
      ctx.shadowOffsetY = values.shadowY;
    }
  }

  disableShadow(ctx, values) {
    if (values.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  enableBorderDashes(ctx, values) {
    if (values.borderDashes !== false) {
      if (ctx.setLineDash !== undefined) {
        let dashes = values.borderDashes;
        if (dashes === true) {
          dashes = [5,15]
        }
        ctx.setLineDash(dashes);
      }
      else {
        console.warn("setLineDash is not supported in this browser. The dashed borders cannot be used.");
        this.options.shapeProperties.borderDashes = false;
        values.borderDashes = false;
      }
    }
  }

  disableBorderDashes(ctx, values) {
    if (values.borderDashes !== false) {
      if (ctx.setLineDash !== undefined) {
        ctx.setLineDash([0]);
      }
      else {
        console.warn("setLineDash is not supported in this browser. The dashed borders cannot be used.");
        this.options.shapeProperties.borderDashes = false;
        values.borderDashes = false;
      }
    }
  }
}

export default NodeBase;
