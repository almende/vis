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
    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};
  }

  setOptions(options) {
    this.options = options;
  }

  _distanceToBorder(ctx,angle) {
    var borderWidth = this.options.borderWidth;
    this.resize(ctx);
    return Math.min(
        Math.abs(this.width / 2 / Math.cos(angle)),
        Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
  }

  enableShadow(ctx) {
    if (this.options.shadow.enabled === true) {
      ctx.shadowColor = this.options.shadow.color;
      ctx.shadowBlur = this.options.shadow.size;
      ctx.shadowOffsetX = this.options.shadow.x;
      ctx.shadowOffsetY = this.options.shadow.y;
    }
  }

  disableShadow(ctx) {
    if (this.options.shadow.enabled === true) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  enableBorderDashes(ctx) {
    if (this.options.shapeProperties.borderDashes !== false) {
      if (ctx.setLineDash !== undefined) {
        let dashes = this.options.shapeProperties.borderDashes;
        if (dashes === true) {
          dashes = [5,15]
        }
        ctx.setLineDash(dashes);
      }
      else {
        console.warn("setLineDash is not supported in this browser. The dashed borders cannot be used.");
        this.options.shapeProperties.borderDashes = false;
      }
    }
  }

  disableBorderDashes(ctx) {
    if (this.options.shapeProperties.borderDashes !== false) {
      if (ctx.setLineDash !== undefined) {
        ctx.setLineDash([0]);
      }
      else {
        console.warn("setLineDash is not supported in this browser. The dashed borders cannot be used.");
        this.options.shapeProperties.borderDashes = false;
      }
    }
  }
}

export default NodeBase;