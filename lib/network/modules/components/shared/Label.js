let util = require('../../../../util');

class Label {
  constructor(body,options) {
    this.body = body;

    this.pointToSelf = false;
    this.baseSize = undefined;
    this.fontOptions = {};
    this.setOptions(options);
    this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
  }

  setOptions(options, allowDeletion = false) {
    this.nodeOptions = options;

    // We want to keep the font options seperated from the node options.
    // The node options have to mirror the globals when they are not overruled.
    this.fontOptions = util.deepExtend({},options.font, true);

    if (options.label !== undefined) {
      this.labelDirty = true;
    }

    if (options.font !== undefined) {
      Label.parseOptions(this.fontOptions, options, allowDeletion);
      if (typeof options.font === 'string') {
        this.baseSize = this.fontOptions.size;
      }
      else if (typeof options.font === 'object') {
        if (options.font.size !== undefined) {
          this.baseSize = options.font.size;
        }
      }
    }
  }

  static parseOptions(parentOptions, newOptions, allowDeletion = false) {
    if (typeof newOptions.font === 'string') {
      let newOptionsArray = newOptions.font.split(" ");
      parentOptions.size  = newOptionsArray[0].replace("px",'');
      parentOptions.face  = newOptionsArray[1];
      parentOptions.color = newOptionsArray[2];
    }
    else if (typeof newOptions.font === 'object') {
      util.fillIfDefined(parentOptions, newOptions.font, allowDeletion);
    }
    parentOptions.size = Number(parentOptions.size);
  }


  /**
   * Main function. This is called from anything that wants to draw a label.
   * @param ctx
   * @param x
   * @param y
   * @param selected
   * @param baseline
   */
  draw(ctx, x, y, selected, baseline = 'middle') {
    // if no label, return
    if (this.nodeOptions.label === undefined)
      return;

    // check if we have to render the label
    let viewFontSize = this.fontOptions.size * this.body.view.scale;
    if (this.nodeOptions.label && viewFontSize < this.nodeOptions.scaling.label.drawThreshold - 1)
      return;

    // update the size cache if required
    this.calculateLabelSize(ctx, selected, x, y, baseline);

    // create the fontfill background
    this._drawBackground(ctx);
    // draw text
    this._drawText(ctx, selected, x, y, baseline);
  }

  /**
   * Draws the label background
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _drawBackground(ctx) {
    if (this.fontOptions.background !== undefined && this.fontOptions.background !== "none") {
      ctx.fillStyle = this.fontOptions.background;

      let lineMargin = 2;

      switch (this.fontOptions.align) {
        case 'middle':
          ctx.fillRect(-this.size.width * 0.5, -this.size.height * 0.5, this.size.width, this.size.height);
          break;
        case 'top':
          ctx.fillRect(-this.size.width * 0.5, -(this.size.height + lineMargin), this.size.width, this.size.height);
          break;
        case 'bottom':
          ctx.fillRect(-this.size.width * 0.5, lineMargin, this.size.width, this.size.height);
          break;
        default:
          ctx.fillRect(this.size.left, this.size.top - 0.5*lineMargin, this.size.width, this.size.height);
          break;
      }
    }
  }


  /**
   *
   * @param ctx
   * @param x
   * @param baseline
   * @private
   */
  _drawText(ctx, selected, x, y, baseline = 'middle') {
    let fontSize = this.fontOptions.size;
    let viewFontSize = fontSize * this.body.view.scale;
    // this ensures that there will not be HUGE letters on screen by setting an upper limit on the visible text size (regardless of zoomLevel)
    if (viewFontSize >= this.nodeOptions.scaling.label.maxVisible) {
      fontSize = Number(this.nodeOptions.scaling.label.maxVisible) / this.body.view.scale;
    }

    let yLine = this.size.yLine;
    let [fontColor, strokeColor] = this._getColor(viewFontSize);
    [x, yLine] = this._setAlignment(ctx, x, yLine, baseline);

    // configure context for drawing the text
    ctx.font = (selected && this.nodeOptions.labelHighlightBold ? 'bold ' : '') + fontSize + "px " + this.fontOptions.face;
    ctx.fillStyle = fontColor;
    ctx.textAlign = 'center';

    // set the strokeWidth
    if (this.fontOptions.strokeWidth > 0) {
      ctx.lineWidth = this.fontOptions.strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineJoin = 'round';
    }

    // draw the text
    for (let i = 0; i < this.lineCount; i++) {
      if (this.fontOptions.strokeWidth > 0) {
        ctx.strokeText(this.lines[i], x, yLine);
      }
      ctx.fillText(this.lines[i], x, yLine);
      yLine += fontSize;
    }
  }

  _setAlignment(ctx, x, yLine, baseline) {
    // check for label alignment (for edges)
    // TODO: make alignment for nodes
    if (this.fontOptions.align !== 'horizontal' && this.pointToSelf === false) {
      x = 0;
      yLine = 0;

      let lineMargin = 2;
      if (this.fontOptions.align === 'top') {
        ctx.textBaseline = 'alphabetic';
        yLine -= 2 * lineMargin; // distance from edge, required because we use alphabetic. Alphabetic has less difference between browsers
      }
      else if (this.fontOptions.align === 'bottom') {
        ctx.textBaseline = 'hanging';
        yLine += 2 * lineMargin;// distance from edge, required because we use hanging. Hanging has less difference between browsers
      }
      else {
        ctx.textBaseline = 'middle';
      }
    }
    else {
      ctx.textBaseline = baseline;
    }

    return [x,yLine];
  }

  /**
   * fade in when relative scale is between threshold and threshold - 1.
   * If the relative scale would be smaller than threshold -1 the draw function would have returned before coming here.
   *
   * @param viewFontSize
   * @returns {*[]}
   * @private
   */
  _getColor(viewFontSize) {
    let fontColor = this.fontOptions.color || '#000000';
    let strokeColor = this.fontOptions.strokeColor || '#ffffff';
    if (viewFontSize <= this.nodeOptions.scaling.label.drawThreshold) {
      let opacity = Math.max(0, Math.min(1, 1 - (this.nodeOptions.scaling.label.drawThreshold - viewFontSize)));
      fontColor = util.overrideOpacity(fontColor, opacity);
      strokeColor = util.overrideOpacity(strokeColor, opacity);
    }
    return [fontColor, strokeColor];
  }


  /**
   *
   * @param ctx
   * @param selected
   * @returns {{width: number, height: number}}
   */
  getTextSize(ctx, selected = false) {
    let size = {
      width: this._processLabel(ctx,selected),
      height: this.fontOptions.size * this.lineCount,
      lineCount: this.lineCount
    };
    return size;
  }


  /**
   *
   * @param ctx
   * @param selected
   * @param x
   * @param y
   * @param baseline
   */
  calculateLabelSize(ctx, selected, x = 0, y = 0, baseline = 'middle') {
    if (this.labelDirty === true) {
      this.size.width = this._processLabel(ctx,selected);
    }
    this.size.height = this.fontOptions.size * this.lineCount;
    this.size.left = x - this.size.width * 0.5;
    this.size.top = y - this.size.height * 0.5;
    this.size.yLine = y + (1 - this.lineCount) * 0.5 * this.fontOptions.size;
    if (baseline === "hanging") {
      this.size.top += 0.5 * this.fontOptions.size;
      this.size.top += 4;   // distance from node, required because we use hanging. Hanging has less difference between browsers
      this.size.yLine += 4; // distance from node
    }

    this.labelDirty = false;
  }


  /**
   * This calculates the width as well as explodes the label string and calculates the amount of lines.
   * @param ctx
   * @param selected
   * @returns {number}
   * @private
   */
  _processLabel(ctx,selected) {
    let width = 0;
    let lines = [''];
    let lineCount = 0;
    if (this.nodeOptions.label !== undefined) {
      lines = String(this.nodeOptions.label).split('\n');
      lineCount = lines.length;
      ctx.font = (selected && this.nodeOptions.labelHighlightBold ? 'bold ' : '') + this.fontOptions.size + "px " + this.fontOptions.face;
      width = ctx.measureText(lines[0]).width;
      for (let i = 1; i < lineCount; i++) {
        let lineWidth = ctx.measureText(lines[i]).width;
        width = lineWidth > width ? lineWidth : width;
      }
    }
    this.lines = lines;
    this.lineCount = lineCount;

    return width;
  }
}

export default Label;