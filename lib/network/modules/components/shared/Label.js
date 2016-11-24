let util = require('../../../../util');

class Label {
  constructor(body,options,edgelabel = false) {
    this.body = body;

    this.pointToSelf = false;
    this.baseSize = undefined;
    this.fontOptions = {};
    this.setOptions(options);
    this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
    this.isEdgeLabel = edgelabel;
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
      parentOptions.size    = newOptionsArray[0].replace("px",'');
      parentOptions.face    = newOptionsArray[1];
      parentOptions.color   = newOptionsArray[2];
      parentOptions.vadjust = 0;
    }
    else if (typeof newOptions.font === 'object') {
      util.fillIfDefined(parentOptions, newOptions.font, allowDeletion);
      if (typeof newOptions.font.bold === 'string') {
        let newBoldOptionsArray = newOptions.font.bold.split(" ");
        parentOptions.bold.size    = newBoldOptionsArray[0].replace("px",'');
        parentOptions.bold.face    = newBoldOptionsArray[1];
        parentOptions.bold.color   = newBoldOptionsArray[2];
        parentOptions.bold.vadjust = parentOptions.vadjust;
        parentOptions.bold.mod     = parentOptions.mod;
      } else if (typeof newOptions.font.bold === 'object') {
        parentOptions.bold.size    = newOptions.font.bold.size    || parentOptions.size;
        parentOptions.bold.face    = newOptions.font.bold.face    || parentOptions.face;
        parentOptions.bold.color   = newOptions.font.bold.color   || parentOptions.color;
        parentOptions.bold.vadjust = newOptions.font.bold.vadjust || parentOptions.vadjust;
        parentOptions.bold.mod     = newOptions.font.bold.mod     || "";
      }
      if (typeof newOptions.font.ital === 'string') {
        let newItalOptionsArray = newOptions.font.ital.split(" ");
        parentOptions.ital.size    = newItalOptionsArray[0].replace("px",'');
        parentOptions.ital.face    = newItalOptionsArray[1];
        parentOptions.ital.color   = newItalOptionsArray[2];
        parentOptions.ital.vadjust = parentOptions.vadjust;
        parentOptions.ital.mod     = parentOptions.mod;
      } else if (typeof newOptions.font.ital === 'object') {
        parentOptions.ital.size    = newOptions.font.ital.size    || parentOptions.size;
        parentOptions.ital.face    = newOptions.font.ital.face    || parentOptions.face;
        parentOptions.ital.color   = newOptions.font.ital.color   || parentOptions.color;
        parentOptions.ital.vadjust = newOptions.font.ital.vadjust || parentOptions.vadjust;
        parentOptions.ital.mod     = newOptions.font.ital.mod     || "";
      }
      if (typeof newOptions.font.boldital === 'string') {
        let newBoldItalOptionsArray = newOptions.font.boldital.split(" ");
        parentOptions.boldital.size    = newBoldItalOptionsArray[0].replace("px",'');
        parentOptions.boldital.face    = newBoldItalOptionsArray[1];
        parentOptions.boldital.color   = newBoldItalOptionsArray[2];
        parentOptions.boldital.vadjust = parentOptions.vadjust;
        parentOptions.boldital.mod     = parentOptions.mod;
      } else if (typeof newOptions.font.boldital === 'object') {
        parentOptions.boldital.size    = newOptions.font.boldital.size    || parentOptions.size;
        parentOptions.boldital.face    = newOptions.font.boldital.face    || parentOptions.face;
        parentOptions.boldital.color   = newOptions.font.boldital.color   || parentOptions.color;
        parentOptions.boldital.vadjust = newOptions.font.boldital.vadjust || parentOptions.vadjust;
        parentOptions.boldital.mod     = newOptions.font.boldital.mod     || "";
      }
      if (typeof newOptions.font.mono === 'string') {
        let newMonoOptionsArray = newOptions.font.mono.split(" ");
        parentOptions.mono.size    = newMonoOptionsArray[0].replace("px",'');
        parentOptions.mono.face    = newMonoOptionsArray[1];
        parentOptions.mono.color   = newMonoOptionsArray[2];
        parentOptions.mono.vadjust = parentOptions.vadjust;
        parentOptions.mono.mod     = parentOptions.mod;
      } else if (typeof newOptions.font.mono === 'object') {
        parentOptions.mono.size    = newOptions.font.mono.size    || parentOptions.size;
        parentOptions.mono.face    = newOptions.font.mono.face    || parentOptions.face;
        parentOptions.mono.color   = newOptions.font.mono.color   || parentOptions.color;
        parentOptions.mono.vadjust = newOptions.font.mono.vadjust || parentOptions.vadjust;
        parentOptions.mono.mod     = newOptions.font.mono.mod     || "";
      }
    }
    parentOptions.size = Number(parentOptions.size);
    parentOptions.bold.size = Number(parentOptions.bold.size);
    parentOptions.ital.size = Number(parentOptions.ital.size);
    parentOptions.boldital.size = Number(parentOptions.boldital.size);
    parentOptions.mono.size = Number(parentOptions.mono.size);
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

      if (this.isEdgeLabel) {
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
      } else {
        ctx.fillRect(this.size.left, this.size.top - 0.5*lineMargin, this.size.width, this.size.height);
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
    [x, yLine] = this._setAlignment(ctx, x, yLine, baseline);

    ctx.textAlign = 'left'
    x = x - 0.5 * this.size.width; // Shift label 1/2-distance to the left

    // draw the text
    for (let i = 0; i < this.lineCount; i++) {
      if (this.lines[i] && this.lines[i].blocks) {
        let width = 0;
        if (this.isEdgeLabel || this.fontOptions.align === 'center') {
          width += (this.size.width - this.lines[i].width) / 2
        } else if (this.fontOptions.align === 'right') {
          width += (this.size.width - this.lines[i].width)
        }
        for (let j = 0; j < this.lines[i].blocks.length; j++) {
          let block = this.lines[i].blocks[j];
          ctx.font = block.font;
          let [fontColor, strokeColor] = this._getColor(block.color, viewFontSize);
          if (this.fontOptions.strokeWidth > 0) {
            ctx.lineWidth = this.fontOptions.strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.lineJoin = 'round';
            ctx.strokeText(block.text, x + width, yLine + block.vadjust);
          }
          ctx.fillStyle = fontColor;
          ctx.fillText(block.text, x + width, yLine + block.vadjust);
          width += block.width;
        }
        yLine += this.lines[i].height;
      }
    }
  }

  _setAlignment(ctx, x, yLine, baseline) {
    // check for label alignment (for edges)
    // TODO: make alignment for nodes
    if (this.isEdgeLabel && this.fontOptions.align !== 'horizontal' && this.pointToSelf === false) {
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
  _getColor(color, viewFontSize) {
    let fontColor = color || '#000000';
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
    this._processLabel(ctx, selected);
    return {
      width: this.size.width,
      height: this.size.height,
      lineCount: this.lineCount
    };
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
      this._processLabel(ctx,selected);
    }
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
   * normalize the markup system
   */
  decodeMarkupSystem(markupSystem) {
    let system = 'none';
    if (markupSystem === 'markdown' || markupSystem === 'md') {
      system = 'markdown';
    } else if (markupSystem === true || markupSystem === 'html') {
      system = 'html'
    }
    return system;
  }

  /**
   * Explodes a piece of text into single-font blocks using a given markup
   * @param text
   * @param markupSystem
   * @returns [{ text, mod }]
   */
  splitBlocks(text, markupSystem) {
    let system = this.decodeMarkupSystem(markupSystem);
    if (system === 'none') {
      return [{
        text: text,
        mod: 'normal'
      }]
    } else if (system === 'markdown') {
      return this.splitMarkdownBlocks(text);
    } else if (system === 'html') {
      return this.splitHtmlBlocks(text);
    }
  }

  splitMarkdownBlocks(text) {
    let blocks = [];
    let s = {
      bold: false,
      ital: false,
      mono: false,
      beginable: true,
      spacing: false,
      position: 0,
      buffer: "",
      modStack: []
    };
    s.mod = function() {
      return (this.modStack.length === 0) ? 'normal' : this.modStack[0];
    }
    s.modName = function() {
      if (this.modStack.length === 0)
        return 'normal';
      else if (this.modStack[0] === 'mono')
        return 'mono';
      else {
        if (s.bold && s.ital) {
          return 'boldital';
        } else if (s.bold) {
          return 'bold';
        } else if (s.ital) {
          return 'ital';
        }
      }
    }
    s.emitBlock = function(override = false) {
      if (this.spacing) {
        this.add(" ");
        this.spacing = false;
      }
      if (this.buffer.length > 0) {
        blocks.push({ text: this.buffer, mod: this.modName() });
        this.buffer = "";
      }
    }
    s.add = function(text) {
      if (text === " ") {
        s.spacing = true;
      }
      if (s.spacing) {
        this.buffer += " ";
        this.spacing = false;
      }
      if (text != " ") {
        this.buffer += text;
      }
    }
    while (s.position < text.length) {
      let char = text.charAt(s.position);
      if (/[ \t]/.test(char)) {
        if (!s.mono) {
          s.spacing = true;
        } else {
          s.add(char);
        }
        s.beginable = true
      } else if (/\\/.test(char)) {
        if (s.position < text.length+1) {
          s.position++;
          char = text.charAt(s.position);
          if (/ \t/.test(char)) {
            s.spacing = true;
          } else {
            s.add(char);
            s.beginable = false;
          }
        }
      } else if (!s.mono && !s.bold && (s.beginable || s.spacing) && /\*/.test(char)) {
        s.emitBlock();
        s.bold = true;
        s.modStack.unshift("bold");
      } else if (!s.mono && !s.ital && (s.beginable || s.spacing) && /\_/.test(char)) {
        s.emitBlock();
        s.ital = true;
        s.modStack.unshift("ital");
      } else if (!s.mono && (s.beginable || s.spacing) && /`/.test(char)) {
        s.emitBlock();
        s.mono = true;
        s.modStack.unshift("mono");
      } else if (!s.mono && (s.mod() === "bold") && /\*/.test(char)) {
        if ((s.position === text.length-1) || /[.,_` \t\n]/.test(text.charAt(s.position+1))) {
          s.emitBlock();
          s.bold = false;
          s.modStack.shift();
        } else {
          s.add(char);
        }
      } else if (!s.mono && (s.mod() === "ital") && /\_/.test(char)) {
        if ((s.position === text.length-1) || /[.,*` \t\n]/.test(text.charAt(s.position+1))) {
          s.emitBlock();
          s.ital = false;
          s.modStack.shift();
        } else {
          s.add(char);
        }
      } else if (s.mono && (s.mod() === "mono") && /`/.test(char)) {
        if ((s.position === text.length-1) || (/[.,*_ \t\n]/.test(text.charAt(s.position+1)))) {
          s.emitBlock();
          s.mono = false;
          s.modStack.shift();
        } else {
          s.add(char);
        }
      } else {
        s.add(char);
        s.beginable = false;
      }
      s.position++
    }
    s.emitBlock();
    return blocks;
  }

  splitHtmlBlocks(text) {
    let blocks = [];
    let s = {
      bold: false,
      ital: false,
      mono: false,
      spacing: false,
      position: 0,
      buffer: "",
      modStack: []
    };
    s.mod = function() {
      return (this.modStack.length === 0) ? 'normal' : this.modStack[0];
    }
    s.modName = function() {
      if (this.modStack.length === 0)
        return 'normal';
      else if (this.modStack[0] === 'mono')
        return 'mono';
      else {
        if (s.bold && s.ital) {
          return 'boldital';
        } else if (s.bold) {
          return 'bold';
        } else if (s.ital) {
          return 'ital';
        }
      }
    }
    s.emitBlock = function(override = false) {
      if (this.spacing) {
        this.add(" ");
        this.spacing = false;
      }
      if (this.buffer.length > 0) {
        blocks.push({ text: this.buffer, mod: this.modName() });
        this.buffer = "";
      }
    }
    s.add = function(text) {
      if (text === " ") {
        s.spacing = true;
      }
      if (s.spacing) {
        this.buffer += " ";
        this.spacing = false;
      }
      if (text != " ") {
        this.buffer += text;
      }
    }
    while (s.position < text.length) {
      let char = text.charAt(s.position);
      if (/[ \t]/.test(char)) {
        if (!s.mono) {
          s.spacing = true;
        } else {
          s.add(char);
        }
      } else if (/</.test(char)) {
        if (!s.mono && !s.bold && /<b>/.test(text.substr(s.position,3))) {
          s.emitBlock();
          s.bold = true;
          s.modStack.unshift("bold");
          s.position += 2;
        } else if (!s.mono && !s.ital && /<i>/.test(text.substr(s.position,3))) {
          s.emitBlock();
          s.ital = true;
          s.modStack.unshift("ital");
          s.position += 2;
        } else if (!s.mono && /<code>/.test(text.substr(s.position,6))) {
          s.emitBlock();
          s.mono = true;
          s.modStack.unshift("mono");
          s.position += 5;
        } else if (!s.mono && (s.mod() === 'bold') && /<\/b>/.test(text.substr(s.position,4))) {
          s.emitBlock();
          s.bold = false;
          s.modStack.shift();
          s.position += 3;
        } else if (!s.mono && (s.mod() === 'ital') && /<\/i>/.test(text.substr(s.position,4))) {
          s.emitBlock();
          s.ital = false;
          s.modStack.shift();
          s.position += 3;
        } else if ((s.mod() === 'mono') && /<\/code>/.test(text.substr(s.position,7))) {
          s.emitBlock();
          s.mono = false;
          s.modStack.shift();
          s.position += 6;
        } else {
          s.add(char);
        }
      } else if (/&/.test(char)) {
        if (/&lt;/.test(text.substr(s.position,4))) {
          s.add("<");
          s.position += 3;
        } else if (/&amp;/.test(text.substr(s.position,5))) {
          s.add("&");
          s.position += 4;
        } else {
          s.add("&");
        }
      } else {
        s.add(char);
      }
      s.position++
    }
    s.emitBlock();
    return blocks;
  }

  setFont(ctx, selected, mod) {
    let height
    let vadjust
    let color
    if (mod === 'normal') {
      ctx.font = (selected && this.nodeOptions.labelHighlightBold ? 'bold ' : '') +
                 this.fontOptions.size + "px " + this.fontOptions.face;
      color = this.fontOptions.color;
      height = this.fontOptions.size;
      vadjust = this.fontOptions.vadjust;
    } else {
      ctx.font = this.fontOptions[mod].mod + " " +
                 this.fontOptions[mod].size + "px " + this.fontOptions[mod].face;
      color = this.fontOptions[mod].color;
      height = this.fontOptions[mod].size;
      vadjust = this.fontOptions[mod].vadjust || 0;
    }
    return {
      font: ctx.font.replace(/"/g, ""),
      color: color,
      height: height,
      vadjust: vadjust
    }
  }

  /**
   * This explodes the label string into lines and sets the width, height and number of lines.
   * @param ctx
   * @param selected
   * @private
   */
  _processLabel(ctx,selected) {
    let width = 0;
    let height = 0;
    let nlLines = [];
    let lines = [];
    let lineCount = 0;
    if (this.nodeOptions.label !== undefined) {
      let nlLines = String(this.nodeOptions.label).split('\n');
      lineCount = nlLines.length;
      if (this.nodeOptions.font.multi) {
        for (let i = 0; i < lineCount; i++) {
          let blocks = this.splitBlocks(nlLines[i], this.nodeOptions.font.multi);
          if (blocks) {
            lines[i] = { width: 0, height: 0, blocks: [] };
            if (blocks.length === 0) {
              lines[i].height = this.fontOptions.size;
            }
            for (let j = 0; j < blocks.length; j++) {
              let metrics = this.setFont(ctx, selected, blocks[j].mod)
              let measure = ctx.measureText(blocks[j].text);
              lines[i].width += measure.width;
              lines[i].height = metrics.height > lines[i].height ? metrics.height : lines[i].height;
              lines[i].blocks[j] = {
                text: blocks[j].text,
                font: ctx.font,
                color: metrics.color,
                width: measure.width,
                height: metrics.height,
                vadjust: metrics.vadjust
              };
            }
            width = lines[i].width > width ? lines[i].width : width;
            height += lines[i].height;
          }
        }
      } else {
        for (let i = 0; i < lineCount; i++) {
          let blocks = this.splitBlocks(nlLines[i], false);
          lines[i] = { width: 0, height: 0, blocks: [] };
          ctx.font = (selected && this.nodeOptions.labelHighlightBold ? 'bold ' : '') + this.fontOptions.size + "px " + this.fontOptions.face;
          let text = nlLines[i];
          let measure = ctx.measureText(text);
          lines[i].width += measure.width;
          lines[i].height = this.fontOptions.size > lines[i].height ? this.fontOptions.size : lines[i].height;
          lines[i].blocks[0] = {
            text: text,
            font: ctx.font,
            color: this.fontOptions.color,
            width: measure.width,
            height: this.fontOptions.size,
            vadjust: this.fontOptions.vadjust
          };
          width = lines[i].width > width ? lines[i].width : width;
          height += lines[i].height;
        }
      }
    }
    this.lines = lines;
    this.lineCount = lineCount;
    this.size.width = width;
    this.size.height = height;
  }
}

export default Label;
