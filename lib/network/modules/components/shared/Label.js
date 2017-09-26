let util = require('../../../../util');
let ComponentUtil = require('./ComponentUtil').default;
let LabelSplitter = require('./LabelSplitter').default;

/**
 * @typedef {'bold'|'ital'|'boldital'|'mono'|'normal'} MultiName
 *
 * The allowed specifiers of multi-fonts.
 */

/**
 * @typedef {{color:string, size:number, face:string, mod:string, vadjust:number}} ModOptions
 *
 * The full set of options of a given multi-font.
 */


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
    this.fontOptions = {};      // instance variable containing the *instance-local* font options
    this.setOptions(options);
    this.size = {top: 0, left: 0, width: 0, height: 0, yLine: 0}; // could be cached
    this.isEdgeLabel = edgelabel;
  }


  /**
   * @param {Object} options the options of the parent Node-instance
   */
  setOptions(options) {
    this.elementOptions = options;  // Reference to the options of the parent Node-instance 

    this.initFontOptions(options);

    if (options.label !== undefined) {
      this.labelDirty = true;
    }

    if (options.font !== undefined) { // font should always be present! this condition should not be needed
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
   * Init the font Options structure.
   *
   * Member fontOptions serves as an accumulator for the current font options.
   * As such, it needs to be completely separated from the node options.
   *
   * @param {Object} options
   * @private
   */
  initFontOptions(options) {
    var newFont = options.font;  // Only this member used!

    // Get the structure right
    util.forEach(options.font, (prop, n) => {
      if (typeof prop === 'object') {
        this.fontOptions[n] = {};  // multi-fonts filled in propagateFonts(), if required
      }
    });

    if (Label.parseFontString(this.fontOptions, newFont)) {
      this.fontOptions.vadjust = 0;
      return;
    }

    util.forEach(options.font, (prop, n) => {
      if (typeof prop !== 'object') {
        this.fontOptions[n] = prop;
      }
    });
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
    this.propagateFonts(pile);
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
   * the chain of option objects passed (the 'pile').
   *
   * ---------------------------------------------------------------------
   * ## Traversal of pile for multi-fonts
   *
   *  - All search is done in the sequence of the pile
   *  - As soon as a value is found, the searching stops.
   *  - multi-font `bold` is taken here as an example; the same applies to 
   *    the other multi-fonts
   *  - prototypes are totally ignored. The idea is to add option objects used as prototypes
   *    to the pile, in the correct order.
   *
   * ### Order:
   *
   *   - search in option group 'bold' in local properties
   *   - search in main font option group in local properties
   *
   * ---------------------------------------------------------------------
   * @param {Array.<object>} pile  sequence of option objects to consider.
   *                               First item in list assumed to be the newly set options.
   */
  propagateFonts(pile) {
    var fontPile = [];   // sequence of font objects to consider, order important
    let mods = ['bold', 'ital', 'boldital', 'mono'];


    /**
     * Add given font option object to the list of objects (the 'pile') to consider for determining
     * multi-font option values.
     *
     * @param {object}  options instance to add to pile
     * @param {boolean} [isFontOption=false] if true, use option directly instead of accessing member var 'font'
     */
    var addFontToPile = (options, isFontOption = false) => {
      if (options === undefined) return;

      var item;
      if (isFontOption) {
        item = options;
      } else {
        if (options.font === undefined || options.font === null) return;
        item = options.font;
      }

      fontPile.push(item);
    };


   /**
    * Collect all own-property values from the font pile that aren't multi-font option objectss.
    *
    * @returns {object} object with all current own basic font properties
    */
    var getBasicOptions = () => {
      var ret = {};

      // Scans the whole pile to get all options present
      for (let n = 0; n < fontPile.length; ++n) {
        let fontOptions = fontPile[n];

        // console.log('n: ' + n);
        // if (n === 0) {
        //   console.log(fontOptions);
        // }

        // Convert shorthand if necessary
        let tmpShorthand = {};
        if (Label.parseFontString(tmpShorthand, fontOptions)) {
          fontOptions = tmpShorthand;
          // console.log(fontOptions);
        }

        util.forEach(fontOptions, (opt, name) => {
          if (opt === undefined) return;        // multi-font option need not be present 
          if (ret.hasOwnProperty(name)) return; // Keep first value we encounter

          if (mods.indexOf(name) !== -1) {
            // Skip multi-font properties but we do need the structure
            ret[name] = {};
          } else {
            ret[name] = opt;
          }
          // console.log('opt name: ' + opt + ', ' + name);
        });
        // console.log(ret);
      }

      return ret;
    }


   /**
    * Return the value for given option for the given multi-font.
    *
    * All available option objects are trawled in the set order to construct the option values.
    *
    * @param {MultiName} multiName sub path for the multi-font
    * @param {string}    option    the option to search for, for the given multi-font
    * @returns {string|number} the value for the given option
    */
    var getFontOption = (multiName, option) => {
      var multiFont;

      // Search multi font in local properties
      for (let n = 0; n < fontPile.length; ++n) {
        let fontOptions = fontPile[n];

        if (fontOptions.hasOwnProperty(multiName)) {
          multiFont = fontOptions[multiName];
          if (multiFont === undefined) continue;

          // Convert shorthand if necessary
          // TODO: inefficient to do this conversion every time; find a better way.
          let tmpShorthand = {};
          if (Label.parseFontString(tmpShorthand, multiFont)) {
            multiFont = tmpShorthand;
          }

          if (multiFont.hasOwnProperty(option)) {
            return multiFont[option];
          }
        }
      }


      // option not mentioned in the multi font options; take it from the parent font options
      // These have already been converted with getBasicOptions(), so use the converted values
      if (this.fontOptions.hasOwnProperty(option)) {
        return this.fontOptions[option];
      }

/**
      // search font options in local properties
      for (let n = 0; n < fontPile.length; ++n) {
        let fontOptions = fontPile[n];

        // Note: Local shorthands have already been converted in getBasicOptions()
        //       No need to do it here again

        if (fontOptions.hasOwnProperty(option)) {
          return fontOptions[option];
        }
      }
*/

      // A value **must** be found; you should never get here
      throw new Error("Did not find value for multi-font for property: '" + option + "'");
    };


   /**
    * Return all options values for the given multi-font.
    *
    * All available option objects are trawled in the set order to construct the option values.
    *
    * @param {MultiName} multiName sub path for the mod-font
    * @returns {ModOptions}
    */
    var getFontOptions = (multiName) => {
      var result = {};
      var optionNames = ['color', 'size', 'face', 'mod', 'vadjust'];  // List of allowed options per multi-font

      for (let i = 0; i < optionNames.length; ++i) {
        let mod = optionNames[i];
        result[mod] = getFontOption(multiName, mod);
      }

      return result;
    }


    /**
     * Resolve the font options path.
     * If valid, return a reference to the object in question.
     * Otherwise, just return null.
     *
     * @param {Object} options base object to determine path from
     * @param {MultiName} [mod=undefined] if present, sub path for the mod-font
     * @returns {Object|null}
     */
    var pathP = (options, mod) => {
       if (!options || !options.font) return null;

      var opt = options.font;

      if (mod) {
        if (!opt[mod]) return null;
        opt = opt[mod];
      }

      return opt;
    };


    //
    // Main body of the method
    //
    
    // Create a new pile for the font options
    // Note that this.elementOptions is not used here!!!!
    for (let i = 0; i < pile.length; ++i) {
      addFontToPile(pile[i]);
    }

    this.fontOptions = getBasicOptions();
    // console.log(this.fontOptions);

    // We set multifont values even if multi === false, for consistency (things break otherwise)

    for (let i = 0; i < mods.length; ++i) {
      let mod = mods[i];
      let modOptions  = this.fontOptions[mod];
      let tmpModOptions = getFontOptions(mod);

      // Copy over found values
      util.forEach(tmpModOptions, (option, n) => {
        modOptions[n] = option;
      });

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

      if (fontOptions[mod][option] !== undefined) {  // Grumbl leaving out test on undefined equals false for "" 
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

    var fontString = "";
    if (values.mod !== undefined && values.mod !== "") {  // safeguard for undefined - this happened
      fontString += values.mod = " ";
    }
    fontString += values.size + "px " + values.face;

    ctx.font = fontString.replace(/"/g, "");
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
