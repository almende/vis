let util = require('../../../../util');

/**
 * Created by Alex on 3/17/2015.
 */

class Label {
  constructor(body,options) {
    this.body = body;
    this.setOptions(options);

    this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
  }

  setOptions(options) {
    this.options = options;
    if (options.label !== undefined) {
      this.labelDirty = true;
    }
  }

  draw(ctx, x, y, selected, baseline = 'middle') {
    if (this.options.label !== undefined) {
      // check if we have to render the label
      let relativeFontSize = Number(this.options.font.size) * this.body.view.scale;
      if (this.options.label && relativeFontSize >= this.options.scaling.label.drawThreshold - 1) {

        // this ensures that there will not be HUGE letters on screen by setting an upper limit on the visible text size (regardless of zoomLevel)
        let fontSize = Number(this.options.font.size);
        if (relativeFontSize >= this.options.scaling.label.maxVisible) {
          fontSize = Number(this.options.scaling.label.maxVisible) / this.body.view.scale;
        }

        // notify the canvas of the fontsize and thickness
        ctx.font = (selected ? "bold " : "") + fontSize + "px " + this.options.font.face;

        // update the size cache if required
        if (this.labelDirty == true) {
          this.calculateLabelSize(ctx, selected, x, y, baseline);
        }

        // create some of the local variables
        let yLine = this.size.yLine;
        let lines = String(this.options.label).split('\n');
        let lineCount = lines.length;

        // create the fontfill background
        this._drawLabelRect(ctx);
        // draw text
        this._drawLabelText(ctx, x, yLine, lines, lineCount, fontSize, baseline, relativeFontSize);
      }
    }
  }


  getTextSize(ctx, selected) {
    if (this.options.label !== undefined) {
      this._calculateLabelSize(ctx,selected);
    }
    else {
      this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0};
    }
    return this.size;
  }

  _calculateLabelSize(ctx,selected,x,y,baseline) {
    ctx.font = (selected ? "bold " : "") + this.options.font.size + "px " + this.options.font.face;
    let lines = String(this.options.label).split('\n');
    let lineCount = lines.length;
    let yLine = y + (1 - lineCount) * 0.5 * this.options.font.size;

    let width = ctx.measureText(lines[0]).width;
    for (let i = 1; i < lineCount; i++) {
      let lineWidth = ctx.measureText(lines[i]).width;
      width = lineWidth > width ? lineWidth : width;
    }
    let height = this.options.font.size * lineCount;
    let left = x - width * 0.5;
    let top = y - height * 0.5;
    if (baseline == "hanging") {
      top += 0.5 * this.options.font.size;
      top += 4;   // distance from node, required because we use hanging. Hanging has less difference between browsers
      yLine += 4; // distance from node
    }

    // cache
    this.size = {top: top, left: left, width: width, height: height, yLine: yLine};
  }

  calculateLabelSize(ctx,selected,x=0,y=0,baseline='middle') {
    if (this.labelDirty == true) {
      this._calculateLabelSize(ctx, selected, x, y, baseline);
    }
  }
  /**
   * Draws the label rectangle
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _drawLabelRect(ctx) {
    if (this.options.font.background !== undefined && this.options.font.background !== "none") {
      ctx.fillStyle = this.options.font.background;

      let lineMargin = 2;

      switch (this.options.font.align) {
        case 'middle':
          ctx.fillRect(-this.size.width * 0.5, -this.size.height * 0.5, this.size.width, this.size.height);
          break;
        case 'top':
          ctx.fillRect(-this.size.width * 0.5, -(this.size.height + lineMargin), this.size.width, this.size.height);
          break;
        case 'bottom':
          ctx.fillRect(-this.size.width * 0.5, lineMargin, this.size.width, this.size.height);
          break
        default:
          ctx.fillRect(this.size.left, this.size.top, this.size.width, this.size.height);
          break;
      }
    }
  }


  /**
   * Draws the label text
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x
   * @param {Number} yLine
   * @param {Array} lines
   * @param {Number} lineCount
   * @param {Number} fontSize
   * @private
   */
  _drawLabelText(ctx, x, yLine, lines, lineCount, fontSize, baseline = 'middle', relativeFontSize = this.options.font.size) {
    // fade in when relative scale is between threshold and threshold - 1
    let fontColor = this.options.font.color || "#000000";
    let strokeColor = this.options.font.strokeColor;
    if (relativeFontSize <= this.options.scaling.label.drawThreshold) {
      let opacity = Math.max(0, Math.min(1, 1 - (this.options.scaling.label.drawThreshold - relativeFontSize)));
      fontColor = util.overrideOpacity(fontColor, opacity);
      strokeColor = util.overrideOpacity(strokeColor, opacity);
    }

    // draw text
    ctx.fillStyle = fontColor;
    ctx.textAlign = 'center';

    // check for label alignment (for edges)
    // TODO: make alignment for nodes
    if (this.options.font.align !== 'horizontal') {
      x = 0;
      yLine = 0;

      let lineMargin = 2;
      if (this.options.font.align === 'top') {
        ctx.textBaseline = 'alphabetic';
        yLine -= 2 * lineMargin; // distance from edge, required because we use alphabetic. Alphabetic has less difference between browsers
      }
      else if (this.options.font.align === 'bottom') {
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

    // check for strokeWidth
    if (this.options.font.stroke > 0) {
      ctx.lineWidth = this.options.font.stroke;
      ctx.strokeStyle = strokeColor;
      ctx.lineJoin = 'round';
    }
    for (let i = 0; i < lineCount; i++) {
      if (this.options.font.stroke > 0) {
        ctx.strokeText(lines[i], x, yLine);
      }
      ctx.fillText(lines[i], x, yLine);
      yLine += fontSize;
    }
  }
}

export default Label;