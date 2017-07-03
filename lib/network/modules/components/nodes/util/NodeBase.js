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
    this.refreshNeeded = true;
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


  /**
   * Determine if the shape of a node needs to be recalculated.
   *
   * @protected
   */
  needsRefresh(selected, hover) {
    if (this.refreshNeeded === true) {
      // This is probably not the best location to reset this member.
      // However, in the current logic, it is the most convenient one.
      this.refreshNeeded = false;
      return true;
    }

    return  (this.width === undefined) || (this.labelModule.differentState(selected, hover));
  }


  initContextForDraw(ctx, values) {
    var borderWidth = values.borderWidth / this.body.view.scale;

    ctx.lineWidth = Math.min(this.width, borderWidth);
    ctx.strokeStyle = values.borderColor;
    ctx.fillStyle = values.color;
  }


  performStroke(ctx, values) {
    var borderWidth = values.borderWidth / this.body.view.scale;

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
  }


  performFill(ctx, values) {
    // draw shadow if enabled
    this.enableShadow(ctx, values);
    // draw the background
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx, values);

    this.performStroke(ctx, values);
  }


  _addBoundingBoxMargin(margin) {
    this.boundingBox.left   -= margin;
    this.boundingBox.top    -= margin;
    this.boundingBox.bottom += margin;
    this.boundingBox.right  += margin;
  }


  /**
   * Actual implementation of this method call.
   *
   * Doing it like this makes it easier to override
   * in the child classes.
   */
  _updateBoundingBox(x, y, ctx, selected, hover) {
    if (ctx !== undefined) {
      this.resize(ctx, selected, hover);
    }

    this.left = x - this.width / 2;
    this.top  = y - this.height/ 2;

    this.boundingBox.left   = this.left;
    this.boundingBox.top    = this.top;
    this.boundingBox.bottom = this.top + this.height;
    this.boundingBox.right  = this.left + this.width;
  }


  /**
   * Default implementation of this method call.
   *
   * This acts as a stub which can be overridden.
   */
  updateBoundingBox(x, y, ctx, selected, hover) {
    this._updateBoundingBox(x, y, ctx, selected, hover);
  }
}

export default NodeBase;
