let util = require('../../../../util');

class Label {
  constructor(body, options, edgelabel = false) {
    this.body = body;

    this.pointToSelf = false;
    this.baseSize = undefined;
    this.fontOptions = {};
    this.setOptions(options);
    this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
    this.isEdgeLabel = edgelabel;
  }

  setOptions(options, allowDeletion = false) {
    this.elementOptions = options;

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
    }
    parentOptions.size    = Number(parentOptions.size);
    parentOptions.vadjust = Number(parentOptions.vadjust);
  }

  // set the width and height constraints based on 'nearest' value
  constrain(elementOptions, options, defaultOptions) {
    this.fontOptions.constrainWidth = false;
    this.fontOptions.maxWdt = -1;
    this.fontOptions.minWdt = -1;

    let pile = [options, elementOptions, defaultOptions];

    let widthConstraint = util.topMost(pile, 'widthConstraint');
    if (typeof widthConstraint === 'number') {
      this.fontOptions.maxWdt = Number(widthConstraint);
      this.fontOptions.minWdt = Number(widthConstraint);
    } else if (typeof widthConstraint === 'object') {
      let widthConstraintMaximum = util.topMost(pile, ['widthConstraint', 'maximum']);
      if (typeof widthConstraintMaximum === 'number') {
        this.fontOptions.maxWdt = Number(widthConstraintMaximum);
      }
      let widthConstraintMinimum = util.topMost(pile, ['widthConstraint', 'minimum'])
      if (typeof widthConstraintMinimum === 'number') {
        this.fontOptions.minWdt = Number(widthConstraintMinimum);
      }
    }

    this.fontOptions.constrainHeight = false;
    this.fontOptions.minHgt = -1;
    this.fontOptions.valign = 'middle';

    let heightConstraint = util.topMost(pile, 'heightConstraint');
    if (typeof heightConstraint === 'number') {
      this.fontOptions.minHgt = Number(heightConstraint);
    } else if (typeof heightConstraint === 'object') {
      let heightConstraintMinimum = util.topMost(pile, ['heightConstraint', 'minimum']);
      if (typeof heightConstraintMinimum === 'number') {
        this.fontOptions.minHgt = Number(heightConstraintMinimum);
      }
      let heightConstraintValign = util.topMost(pile, ['heightConstraint', 'valign']);
      if (typeof heightConstraintValign === 'string') {
        if ((heightConstraintValign === 'top')||(heightConstraintValign === 'bottom')) {
            this.fontOptions.valign = heightConstraintValign;
        }
      }
    }
  }

  // set the selected functions based on 'nearest' value
  choosify(elementOptions, options, defaultOptions) {
    this.fontOptions.chooser = true;

    let pile = [options, elementOptions, defaultOptions];

    let chosen = util.topMost(pile, 'chosen');
    if (typeof chosen === 'boolean') {
      this.fontOptions.chooser = chosen;
    } else if (typeof chosen === 'object') {
      let chosenLabel = util.topMost(pile, ['chosen', 'label']);
      if ((typeof chosenLabel === 'boolean') || (typeof chosenLabel === 'function')) {
        this.fontOptions.chooser = chosenLabel;
      }
    }
  }

  // When margins are set in an element, adjust sizes is called to remove them
  // from the width/height constraints. This must be done prior to label sizing.
  adjustSizes(margins) {
    let widthBias =  (margins) ? (margins.right + margins.left) : 0;
    if (this.fontOptions.constrainWidth) {
      this.fontOptions.maxWdt -= widthBias;
      this.fontOptions.minWdt -= widthBias;
    }
    let heightBias = (margins) ? (margins.top + margins.bottom)  : 0;
    if (this.fontOptions.constrainHeight) {
      this.fontOptions.minHgt -= heightBias;
    }
  }

  propagateFonts(options, groupOptions, defaultOptions) {
    if (this.fontOptions.multi) {
      let mods = [ 'bold', 'ital', 'boldital', 'mono' ];
      for (const mod of mods) {
        let optionsFontMod;
        if (options.font) {
          optionsFontMod = options.font[mod];
        }
        if (typeof optionsFontMod === 'string') {
          let modOptionsArray = optionsFontMod.split(" ");
          this.fontOptions[mod].size  = modOptionsArray[0].replace("px","");
          this.fontOptions[mod].face  = modOptionsArray[1];
          this.fontOptions[mod].color = modOptionsArray[2];
          this.fontOptions[mod].vadjust = this.fontOptions.vadjust;
          this.fontOptions[mod].mod = defaultOptions.font[mod].mod;
        } else {
          // We need to be crafty about loading the modded fonts. We want as
          // much 'natural' versatility as we can get, so a simple global
          // change propagates in an expected way, even if not stictly logical.

          // face: We want to capture any direct settings and overrides, but
          //       fall back to the base font if there aren't any. We make a
          //       special exception for mono, since we probably don't want to
          //       sync to a the base font face.
          //
          //   if the mod face is in the node's options, use it
          //   else if the mod face is in the global options, use it
          //   else if the face is in the global options, use it
          //   else use the base font's face.
          if (optionsFontMod && optionsFontMod.hasOwnProperty('face')) {
            this.fontOptions[mod].face = optionsFontMod.face;
          } else if (groupOptions.font && groupOptions.font[mod] &&
                     groupOptions.font[mod].hasOwnProperty('face')) {
            this.fontOptions[mod].face = groupOptions.font[mod].face;
          } else if (mod === 'mono') {
            this.fontOptions[mod].face = defaultOptions.font[mod].face;
          } else if (groupOptions.font &&
                     groupOptions.font.hasOwnProperty('face')) {
            this.fontOptions[mod].face = groupOptions.font.face;
          } else {
            this.fontOptions[mod].face = this.fontOptions.face;
          }

          // color: this is handled just like the face.
          if (optionsFontMod && optionsFontMod.hasOwnProperty('color')) {
            this.fontOptions[mod].color = optionsFontMod.color;
          } else if (groupOptions.font && groupOptions.font[mod] &&
                     groupOptions.font[mod].hasOwnProperty('color')) {
            this.fontOptions[mod].color = groupOptions.font[mod].color;
          } else if (groupOptions.font &&
                     groupOptions.font.hasOwnProperty('color')) {
            this.fontOptions[mod].color = groupOptions.font.color;
          } else {
            this.fontOptions[mod].color = this.fontOptions.color;
          }

          // mod: this is handled just like the face, except we never grab the
          // base font's mod. We know they're in the defaultOptions, and unless
          // we've been steered away from them, we use the default.
          if (optionsFontMod && optionsFontMod.hasOwnProperty('mod')) {
            this.fontOptions[mod].mod = optionsFontMod.mod;
          } else if (groupOptions.font && groupOptions.font[mod] &&
                     groupOptions.font[mod].hasOwnProperty('mod')) {
            this.fontOptions[mod].mod = groupOptions.font[mod].mod;
          } else if (groupOptions.font &&
                     groupOptions.font.hasOwnProperty('mod')) {
            this.fontOptions[mod].mod = groupOptions.font.mod;
          } else {
            this.fontOptions[mod].mod = defaultOptions.font[mod].mod;
          }

          // size: It's important that we size up defaults similarly if we're
          //       using default faces unless overriden. We want to preserve the
          //       ratios closely - but if faces have changed, all bets are off.
          //
          //   if the mod size is in the node's options, use it
          //   else if the mod size is in the global options, use it
          //   else if the mod face is the same as the default and the base face
          //     is the same as the default, scale the mod size using the same
          //     ratio
          //   else if the size is in the global options, use it
          //   else use the base font's size.
          if (optionsFontMod && optionsFontMod.hasOwnProperty('size')) {
            this.fontOptions[mod].size = optionsFontMod.size;
          } else if (groupOptions.font && groupOptions.font[mod] &&
                     groupOptions.font[mod].hasOwnProperty('size')) {
            this.fontOptions[mod].size = groupOptions.font[mod].size;
          } else if ((this.fontOptions[mod].face === defaultOptions.font[mod].face) &&
                     (this.fontOptions.face === defaultOptions.font.face)) {
            let ratio = this.fontOptions.size / Number(defaultOptions.font.size);
            this.fontOptions[mod].size = defaultOptions.font[mod].size * ratio;
          } else if (groupOptions.font &&
                     groupOptions.font.hasOwnProperty('size')) {
            this.fontOptions[mod].size = groupOptions.font.size;
          } else {
            this.fontOptions[mod].size = this.fontOptions.size;
          }

          // vadjust: this is handled just like the size.
          if (optionsFontMod && optionsFontMod.hasOwnProperty('vadjust')) {
            this.fontOptions[mod].vadjust = optionsFontMod.vadjust;
          } else if (groupOptions.font &&
                     groupOptions.font[mod] && groupOptions.font[mod].hasOwnProperty('vadjust')) {
            this.fontOptions[mod].vadjust = groupOptions.font[mod].vadjust;
          } else if ((this.fontOptions[mod].face === defaultOptions.font[mod].face) &&
                     (this.fontOptions.face === defaultOptions.font.face)) {
            let ratio = this.fontOptions.size / Number(defaultOptions.font.size);
            this.fontOptions[mod].vadjust = defaultOptions.font[mod].vadjust * Math.round(ratio);
          } else if (groupOptions.font &&
                     groupOptions.font.hasOwnProperty('vadjust')) {
            this.fontOptions[mod].vadjust = groupOptions.font.vadjust;
          } else {
            this.fontOptions[mod].vadjust = this.fontOptions.vadjust;
          }
        }
        this.fontOptions[mod].size    = Number(this.fontOptions[mod].size);
        this.fontOptions[mod].vadjust = Number(this.fontOptions[mod].vadjust);
      }
    }
  }


  /**
   * Main function. This is called from anything that wants to draw a label.
   * @param ctx
   * @param x
   * @param y
   * @param selected
   * @param baseline
   */
  draw(ctx, x, y, selected, hover, baseline = 'middle') {
    // if no label, return
    if (this.elementOptions.label === undefined)
      return;

    // check if we have to render the label
    let viewFontSize = this.fontOptions.size * this.body.view.scale;
    if (this.elementOptions.label && viewFontSize < this.elementOptions.scaling.label.drawThreshold - 1)
      return;

    // update the size cache if required
    this.calculateLabelSize(ctx, selected, hover, x, y, baseline);

    // create the fontfill background
    this._drawBackground(ctx);
    // draw text
    this._drawText(ctx, selected, hover, x, y, baseline);
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
  _drawText(ctx, selected, hover, x, y, baseline = 'middle') {
    let fontSize = this.fontOptions.size;
    let viewFontSize = fontSize * this.body.view.scale;
    // this ensures that there will not be HUGE letters on screen by setting an upper limit on the visible text size (regardless of zoomLevel)
    if (viewFontSize >= this.elementOptions.scaling.label.maxVisible) {
      fontSize = Number(this.elementOptions.scaling.label.maxVisible) / this.body.view.scale;
    }

    let yLine = this.size.yLine;
    [x, yLine] = this._setAlignment(ctx, x, yLine, baseline);

    ctx.textAlign = 'left'
    x = x - this.size.width / 2; // Shift label 1/2-distance to the left
    if ((this.fontOptions.valign) && (this.size.height > this.size.labelHeight)) {
      if (this.fontOptions.valign === 'top') {
        yLine -= (this.size.height - this.size.labelHeight) / 2;
      }
      if (this.fontOptions.valign === 'bottom') {
        yLine += (this.size.height - this.size.labelHeight) / 2;
      }
    }

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
          let [fontColor, strokeColor] = this._getColor(block.color, viewFontSize, block.strokeColor);
          if (block.strokeWidth > 0) {
            ctx.lineWidth = block.strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.lineJoin = 'round';
          }
          ctx.fillStyle = fontColor;

          if (block.strokeWidth > 0) {
            ctx.strokeText(block.text, x + width, yLine + block.vadjust);
          }
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
  _getColor(color, viewFontSize, initialStrokeColor) {
    let fontColor = color || '#000000';
    let strokeColor = initialStrokeColor || '#ffffff';
    if (viewFontSize <= this.elementOptions.scaling.label.drawThreshold) {
      let opacity = Math.max(0, Math.min(1, 1 - (this.elementOptions.scaling.label.drawThreshold - viewFontSize)));
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
  getTextSize(ctx, selected = false, hover = false) {
    this._processLabel(ctx, selected, hover);
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
  calculateLabelSize(ctx, selected, hover, x = 0, y = 0, baseline = 'middle') {
    if (this.labelDirty === true) {
      this._processLabel(ctx, selected, hover);
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
      let ch = text.charAt(s.position);
      if (/[ \t]/.test(ch)) {
        if (!s.mono) {
          s.spacing = true;
        } else {
          s.add(ch);
        }
        s.beginable = true
      } else if (/\\/.test(ch)) {
        if (s.position < text.length+1) {
          s.position++;
          ch = text.charAt(s.position);
          if (/ \t/.test(ch)) {
            s.spacing = true;
          } else {
            s.add(ch);
            s.beginable = false;
          }
        }
      } else if (!s.mono && !s.bold && (s.beginable || s.spacing) && /\*/.test(ch)) {
        s.emitBlock();
        s.bold = true;
        s.modStack.unshift("bold");
      } else if (!s.mono && !s.ital && (s.beginable || s.spacing) && /\_/.test(ch)) {
        s.emitBlock();
        s.ital = true;
        s.modStack.unshift("ital");
      } else if (!s.mono && (s.beginable || s.spacing) && /`/.test(ch)) {
        s.emitBlock();
        s.mono = true;
        s.modStack.unshift("mono");
      } else if (!s.mono && (s.mod() === "bold") && /\*/.test(ch)) {
        if ((s.position === text.length-1) || /[.,_` \t\n]/.test(text.charAt(s.position+1))) {
          s.emitBlock();
          s.bold = false;
          s.modStack.shift();
        } else {
          s.add(ch);
        }
      } else if (!s.mono && (s.mod() === "ital") && /\_/.test(ch)) {
        if ((s.position === text.length-1) || /[.,*` \t\n]/.test(text.charAt(s.position+1))) {
          s.emitBlock();
          s.ital = false;
          s.modStack.shift();
        } else {
          s.add(ch);
        }
      } else if (s.mono && (s.mod() === "mono") && /`/.test(ch)) {
        if ((s.position === text.length-1) || (/[.,*_ \t\n]/.test(text.charAt(s.position+1)))) {
          s.emitBlock();
          s.mono = false;
          s.modStack.shift();
        } else {
          s.add(ch);
        }
      } else {
        s.add(ch);
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
      let ch = text.charAt(s.position);
      if (/[ \t]/.test(ch)) {
        if (!s.mono) {
          s.spacing = true;
        } else {
          s.add(ch);
        }
      } else if (/</.test(ch)) {
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
          s.add(ch);
        }
      } else if (/&/.test(ch)) {
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
        s.add(ch);
      }
      s.position++
    }
    s.emitBlock();
    return blocks;
  }

  getFormattingValues(ctx, selected, hover, mod) {
    let values = {
      color: (mod === "normal") ? this.fontOptions.color : this.fontOptions[mod].color,
      size: (mod === "normal") ? this.fontOptions.size : this.fontOptions[mod].size,
      face: (mod === "normal") ? this.fontOptions.face : this.fontOptions[mod].face,
      mod: (mod === "normal") ? "" : this.fontOptions[mod].mod,
      vadjust: (mod === "normal") ? this.fontOptions.vadjust : this.fontOptions[mod].vadjust,
      strokeWidth: this.fontOptions.strokeWidth,
      strokeColor: this.fontOptions.strokeColor
    };
    if (mod === "normal") {
      if (selected || hover) {
        if ((this.fontOptions.chooser === true) && (this.elementOptions.labelHighlightBold)) {
          values.mod = 'bold';
        } else if (typeof this.fontOptions.chooser === 'function') {
          this.fontOptions.chooser(ctx, values, this.elementOptions.id, selected, hover);
        }
      }
    } else {
      if ((selected || hover) && (typeof this.fontOptions.chooser === 'function')) {
        this.fontOptions.chooser(ctx, values, this.elementOptions.id, selected, hover);
      }
    }
    ctx.font = (values.mod + " " + values.size + "px " + values.face).replace(/"/g, "");
    values.font = ctx.font;
    values.height = values.size;
    return values;
  }

  differentState(selected, hover) {
    return ((selected !== this.fontOptions.selectedState) && (hover !== this.fontOptions.hoverState));
  }

  /**
   * This explodes the label string into lines and sets the width, height and number of lines.
   * @param ctx
   * @param selected
   * @private
   */
  _processLabel(ctx, selected, hover) {
    let width = 0;
    let height = 0;
    let nlLines = [];
    let lines = [];
    let k = 0;
    lines.add = function(l, text, font, color, width, height, vadjust, mod, strokeWidth, strokeColor) {
      if (this.length == l) {
        this[l] = { width: 0, height: 0, blocks: [] };
      }
      this[l].blocks.push({ text, font, color, width, height, vadjust, mod, strokeWidth, strokeColor });
    }
    lines.accumulate = function(l, width, height) {
      this[l].width += width;
      this[l].height = height > this[l].height ? height : this[l].height;
    }
    lines.addAndAccumulate = function(l, text, font, color, width, height, vadjust, mod, strokeWidth, strokeColor) {
      this.add(l, text, font, color, width, height, vadjust, mod, strokeWidth, strokeColor);
      this.accumulate(l, width, height);
    }
    if (this.elementOptions.label !== undefined) {
      let nlLines = String(this.elementOptions.label).split('\n');
      let lineCount = nlLines.length;
      if (this.elementOptions.font.multi) {
        for (let i = 0; i < lineCount; i++) {
          let blocks = this.splitBlocks(nlLines[i], this.elementOptions.font.multi);
          let lineWidth = 0;
          let lineHeight = 0;
          if (blocks) {
            if (blocks.length == 0) {
              let values = this.getFormattingValues(ctx, selected, hover, "normal");
              lines.addAndAccumulate(k, "", values.font, values.color, 0, values.size, values.vadjust, "normal", values.strokeWidth, values.strokeColor);
              height += lines[k].height;
              k++;
              continue;
            }
            for (let j = 0; j < blocks.length; j++) {
              if (this.fontOptions.maxWdt > 0) {
                let values = this.getFormattingValues(ctx, selected, hover, blocks[j].mod);
                let words = blocks[j].text.split(" ");
                let atStart = true
                let text = "";
                let measure;
                let lastMeasure;
                let w = 0;
                while (w < words.length) {
                  let pre = atStart ? "" : " ";
                  lastMeasure = measure;
                  measure = ctx.measureText(text + pre + words[w]);
                  if (lineWidth + measure.width > this.fontOptions.maxWdt) {
                    lineHeight = (values.height > lineHeight) ? values.height : lineHeight;
                    lines.add(k, text, values.font, values.color, lastMeasure.width, values.height, values.vadjust, blocks[j].mod, values.strokeWidth, values.strokeColor);
                    lines.accumulate(k, lastMeasure.width, lineHeight);
                    text = "";
                    atStart = true;
                    lineWidth = 0;
                    width = lines[k].width > width ? lines[k].width : width;
                    height += lines[k].height;
                    k++;
                  } else {
                    text = text + pre + words[w];
                    if (w === words.length-1) {
                      lineHeight = (values.height > lineHeight) ? values.height : lineHeight;
                      lineWidth += measure.width;
                      lines.add(k, text, values.font, values.color, measure.width, values.height, values.vadjust, blocks[j].mod, values.strokeWidth, values.strokeColor);
                      lines.accumulate(k, measure.width, lineHeight);
                      if (j === blocks.length-1) {
                        width = lines[k].width > width ? lines[k].width : width;
                        height += lines[k].height;
                        k++;
                      }
                    }
                    w++;
                    atStart = false;
                  }
                }
              } else {
                let values = this.getFormattingValues(ctx, selected, hover, blocks[j].mod);
                let measure = ctx.measureText(blocks[j].text);
                lines.addAndAccumulate(k, blocks[j].text, values.font, values.color, measure.width, values.height, values.vadjust, blocks[j].mod, values.strokeWidth, values.strokeColor);
                width = lines[k].width > width ? lines[k].width : width;
                if (blocks.length-1 === j) {
                  height += lines[k].height;
                  k++;
                }
              }
            }
          }
        }
      } else {
        for (let i = 0; i < lineCount; i++) {
          let values = this.getFormattingValues(ctx, selected, hover, "normal");
          if (this.fontOptions.maxWdt > 0) {
            let words = nlLines[i].split(" ");
            let text = "";
            let measure;
            let lastMeasure;
            let w = 0;
            while (w < words.length) {
              let pre = (text === "") ? "" : " ";
              lastMeasure = measure;
              measure = ctx.measureText(text + pre + words[w]);
              if (measure.width > this.fontOptions.maxWdt) {
                lines.addAndAccumulate(k, text, values.font, values.color, lastMeasure.width, values.size, values.vadjust, "normal", values.strokeWidth, values.strokeColor)
                width = lines[k].width > width ? lines[k].width : width;
                height += lines[k].height;
                text = "";
                k++;
              } else {
                text = text + pre + words[w];
                if (w === words.length-1) {
                  lines.addAndAccumulate(k, text, values.font, values.color, measure.width, values.size, values.vadjust, "normal", values.strokeWidth, values.strokeColor)
                  width = lines[k].width > width ? lines[k].width : width;
                  height += lines[k].height;
                  k++;
                }
                w++;
              }
            }
          } else {
            let text = nlLines[i];
            let measure = ctx.measureText(text);
            lines.addAndAccumulate(k, text, values.font, values.color, measure.width, values.size, values.vadjust, "normal", values.strokeWidth, values.strokeColor);
            width = lines[k].width > width ? lines[k].width : width;
            height += lines[k].height;
            k++;
          }
        }
      }
    }
    if ((this.fontOptions.minWdt > 0) && (width < this.fontOptions.minWdt)) {
      width = this.fontOptions.minWdt;
    }
    this.size.labelHeight = height;
    if ((this.fontOptions.minHgt > 0) && (height < this.fontOptions.minHgt)) {
      height = this.fontOptions.minHgt;
    }
    this.lines = lines;
    this.lineCount = lines.length;
    this.size.width = width;
    this.size.height = height;
    this.selectedState = selected;
    this.hoverState = hover;
  }
}

export default Label;
