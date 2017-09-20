let util = require('../../../../util');
let ComponentUtil = require('./ComponentUtil').default;
let LabelSplitter = require('./LabelSplitter').default;


/**
 * A Label to be used for Nodes or Edges.
 */
class Label {
  /**
   * @param {Object} body
   * @param {Object} options
   * @param {boolean} [edgelabel=false]
   */
  constructor(body, options, edgelabel = false) {
    this.body = body;
    this.pointToSelf = false;
    this.baseSize = undefined;
    this.fontOptions = {};
    this.setOptions(options);
    this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
    this.isEdgeLabel = edgelabel;
  }


  /**
   *
   * @param {Object} options
   * @param {boolean} [allowDeletion=false]
   */
  setOptions(options, allowDeletion = false) {
    this.elementOptions = options;

    // We want to keep the font options separated from the node options.
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


  /**
   *
   * @param {Object} parentOptions
   * @param {Object} newOptions
   * @param {boolean} [allowDeletion=false]
   * @static
   */
  static parseOptions(parentOptions, newOptions, allowDeletion = false) {
    if (Label.parseFontString(parentOptions, newOptions.font)) {
      parentOptions.vadjust = 0;
    }
    else if (typeof newOptions.font === 'object') {
      util.fillIfDefined(parentOptions, newOptions.font, allowDeletion);
    }
    parentOptions.size    = Number(parentOptions.size);
    parentOptions.vadjust = Number(parentOptions.vadjust);
  }


  /**
   * If in-variable is a string, parse it as a font specifier.
   *
   * Note that following is not done here and have to be done after the call:
   * - No number conversion (size)
   * - Not all font options are set (vadjust, mod)
   *
   * @param {Object} outOptions  out-parameter, object in which to store the parse results (if any)
   * @param {Object} inOptions  font options to parse
   * @return {boolean} true if font parsed as string, false otherwise
   * @static
   */
  static parseFontString(outOptions, inOptions) {
    if (!inOptions || typeof inOptions !== 'string') return false;

    let newOptionsArray = inOptions.split(" ");

    outOptions.size  = newOptionsArray[0].replace("px",'');
    outOptions.face  = newOptionsArray[1];
    outOptions.color = newOptionsArray[2];

    return true;
  }


  /**
   * Set the width and height constraints based on 'nearest' value
   * @param {Array} pile array of option objects to consider
   * @private
   */
  constrain(pile) {
    this.fontOptions.constrainWidth = false;
    this.fontOptions.maxWdt = -1;
    this.fontOptions.minWdt = -1;

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


  /**
   * Set options and update internal state
   *
   * @param {Object} options  options to set
   * @param {Array}  pile     array of option objects to consider for option 'chosen'
   */
  update(options, pile) {
    this.setOptions(options, true);
    this.constrain(pile);
    this.fontOptions.chooser = ComponentUtil.choosify('label', pile);
  }


  /**
   * When margins are set in an element, adjust sizes is called to remove them
   * from the width/height constraints. This must be done prior to label sizing.
   *
   * @param {{top: number, right: number, bottom: number, left: number}} margins
   */
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


  /**
   * Collapse the font options for the multi-font to single objects, from
   * the chain of option objects passed.
   *
   * If an option for a specific multi-font is not present, the parent
   * option is checked for the given option.
   *
   * NOTE: naming of 'groupOptions' is a misnomer; the actual value passed
   *       is the new values to set from setOptions().
   *
   * @param {Object} options
   * @param {Object} groupOptions
   * @param {Object} defaultOptions
   */
  propagateFonts(options, groupOptions, defaultOptions) {
    if (!this.fontOptions.multi) return;

    /**
     * Resolve the font options path.
     * If valid, return a reference to the object in question.
     * Otherwise, just return null.
     *
     * @param {Object} options base object to determine path from
     * @param {'bold'|'ital'|'boldital'|'mono'|'normal'} [mod=undefined] if present, sub path for the mod-font
     * @returns {Object|null}
     */
    var pathP = function(options, mod) {
       if (!options || !options.font) return null;

      var opt = options.font;

      if (mod) {
        if (!opt[mod]) return null;
        opt = opt[mod];
      }

      return opt;
    };


    /**
     * Get property value from options.font[mod][property] if present.
     * If mod not passed, use property value from options.font[property].
     *
     * @param {Label.options} options
     * @param {'bold'|'ital'|'boldital'|'mono'|'normal'} mod
     * @param {string} property
     * @return {*|null} value if found, null otherwise.
     */
    var getP = function(options, mod, property) {
      let opt = pathP(options, mod);

      if (opt && opt.hasOwnProperty(property)) {
         return opt[property];
      }

      return null;
    };


    let mods = [ 'bold', 'ital', 'boldital', 'mono' ];
    for (const mod of mods) {
      let modOptions  = this.fontOptions[mod];
      let modDefaults = defaultOptions.font[mod];

      if (Label.parseFontString(modOptions, pathP(options, mod))) {
        modOptions.vadjust = this.fontOptions.vadjust;
        modOptions.mod = modDefaults.mod;
      } else {

        // We need to be crafty about loading the modded fonts. We want as
        // much 'natural' versatility as we can get, so a simple global
        // change propagates in an expected way, even if not stictly logical.

        // 'face' has a special exception for mono, since we probably
        // don't want to sync to the base font face.
         modOptions.face =
          getP(options     ,  mod, 'face')          || 
          getP(groupOptions,  mod, 'face')          ||
           (mod === 'mono'? modDefaults.face:null ) ||
          getP(groupOptions, null, 'face')          ||
          this.fontOptions.face
        ;

        // 'color' follows the standard flow
         modOptions.color =
          getP(options     ,  mod, 'color') ||
          getP(groupOptions,  mod, 'color') ||
          getP(groupOptions, null, 'color') ||
          this.fontOptions.color
        ;

        // 'mode' follows the standard flow
        modOptions.mod =
          getP(options     ,  mod, 'mod') ||
          getP(groupOptions,  mod, 'mod') ||
          getP(groupOptions, null, 'mod') ||
          modDefaults.mod
        ;


        // It's important that we size up defaults similarly if we're
        // using default faces unless overriden. We want to preserve the
        // ratios closely - but if faces have changed, all bets are off.
        let ratio;

        // NOTE: Following condition always fails, because modDefaults
        //       has no explicit font property. This is deliberate, see
        //       var's 'NodesHandler.defaultOptions.font[mod]'.
        //       However, I want to keep the original logic while refactoring;
        //       it appears to be working fine even if ratio is never set.
        // TODO: examine if this is a bug, fix if necessary.
        //
        if ((modOptions.face === modDefaults.face) &&
            (this.fontOptions.face === defaultOptions.font.face)) {

          ratio = this.fontOptions.size / Number(defaultOptions.font.size);
        }


        modOptions.size =
          getP(options     ,  mod, 'size')        ||
          getP(groupOptions,  mod, 'size')        ||
          (ratio? modDefaults.size * ratio: null) || //   Scale the mod size using the same ratio
          getP(groupOptions, null, 'size')        ||
          this.fontOptions.size
        ;

        modOptions.vadjust =
          getP(options     , mod, 'vadjust')                     ||
          getP(groupOptions, mod, 'vadjust')                     ||
          (ratio? modDefaults.vadjust * Math.round(ratio): null) || // Scale it using the same ratio
          this.fontOptions.vadjust
        ;

      }

      modOptions.size    = Number(modOptions.size);
      modOptions.vadjust = Number(modOptions.vadjust);
    }
  }


  /**
   * Main function. This is called from anything that wants to draw a label.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {string} [baseline='middle']
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

    this._drawBackground(ctx);  // create the fontfill background
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
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {number} x
   * @param {number} y
   * @param {string} [baseline='middle']
   * @private
   */
  _drawText(ctx, selected, hover, x, y, baseline = 'middle') {
    let fontSize = this.fontOptions.size;
    let viewFontSize = fontSize * this.body.view.scale;

    // This ensures that there will not be HUGE letters on screen
    // by setting an upper limit on the visible text size (regardless of zoomLevel)
    if (viewFontSize >= this.elementOptions.scaling.label.maxVisible) {
      // TODO: Does this actually do anything?
      fontSize = Number(this.elementOptions.scaling.label.maxVisible) / this.body.view.scale;
    }

    let yLine = this.size.yLine;
    [x, yLine] = this._setAlignment(ctx, x, yLine, baseline);

    ctx.textAlign = 'left';
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

  /**
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} yLine
   * @param {string} baseline
   * @returns {Array.<number>}
   * @private
   */
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
   * @param {string} color  The font color to use
   * @param {number} viewFontSize
   * @param {string} initialStrokeColor
   * @returns {Array.<string>} An array containing the font color and stroke color
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
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
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
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {'middle'|'hanging'} [baseline='middle']
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
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {string} mod
   * @returns {{color, size, face, mod, vadjust, strokeWidth: *, strokeColor: (*|string|allOptions.edges.font.strokeColor|{string}|allOptions.nodes.font.strokeColor|Array)}}
   */
  getFormattingValues(ctx, selected, hover, mod) {
    var getValue = function(fontOptions, mod, option) {
      if (mod === "normal") {
        if (option === 'mod' ) return "";
        return fontOptions[option];
      }

      if (fontOptions[mod][option]) {
        return fontOptions[mod][option];
      } else {
        // Take from parent font option
        return fontOptions[option];
      }
    };

    let values = {
      color  : getValue(this.fontOptions, mod, 'color'  ),
      size   : getValue(this.fontOptions, mod, 'size'   ),
      face   : getValue(this.fontOptions, mod, 'face'   ),
      mod    : getValue(this.fontOptions, mod, 'mod'    ),
      vadjust: getValue(this.fontOptions, mod, 'vadjust'),
      strokeWidth: this.fontOptions.strokeWidth,
      strokeColor: this.fontOptions.strokeColor
    };
    if (selected || hover) {
      if (mod === "normal" && (this.fontOptions.chooser === true) && (this.elementOptions.labelHighlightBold)) {
          values.mod = 'bold';
      } else {
        if (typeof this.fontOptions.chooser === 'function') {
          this.fontOptions.chooser(values, this.elementOptions.id, selected, hover);
        }
      }
    }
    ctx.font = (values.mod + " " + values.size + "px " + values.face).replace(/"/g, "");
    values.font = ctx.font;
    values.height = values.size;
    return values;
  }


  /**
   *
   * @param {boolean} selected
   * @param {boolean} hover
   * @returns {boolean}
   */
  differentState(selected, hover) {
    return ((selected !== this.fontOptions.selectedState) && (hover !== this.fontOptions.hoverState));
  }
   

  /**
   * This explodes the passed text into lines and determines the width, height and number of lines.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   * @param {string} inText  the text to explode
   * @returns {{width, height, lines}|*}
   * @private
   */
  _processLabelText(ctx, selected, hover, inText) {
    let splitter = new LabelSplitter(ctx, this, selected, hover);
    return splitter.process(inText);
  }


  /**
   * This explodes the label string into lines and sets the width, height and number of lines.
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} selected
   * @param {boolean} hover
   * @private
   */
  _processLabel(ctx, selected, hover) {
    let state = this._processLabelText(ctx, selected, hover, this.elementOptions.label);

    if ((this.fontOptions.minWdt > 0) && (state.width < this.fontOptions.minWdt)) {
      state.width = this.fontOptions.minWdt;
    }

    this.size.labelHeight =state.height;
    if ((this.fontOptions.minHgt > 0) && (state.height < this.fontOptions.minHgt)) {
      state.height = this.fontOptions.minHgt;
    }

    this.lines = state.lines;
    this.lineCount = state.lines.length;
    this.size.width = state.width;
    this.size.height = state.height;
    this.selectedState = selected;
    this.hoverState = hover;
  }
}

export default Label;
