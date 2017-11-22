let LabelAccumulator = require('./LabelAccumulator').default;
let ComponentUtil = require('./ComponentUtil').default;

// Hash of prepared regexp's for tags
var tagPattern = {
  // HTML
  '<b>': /<b>/,
  '<i>': /<i>/,
  '<code>': /<code>/,
  '</b>': /<\/b>/,
  '</i>': /<\/i>/,
  '</code>': /<\/code>/,
  // Markdown
  '*': /\*/,  // bold
  '_': /\_/,   // ital
  '`': /`/,   // mono
  'afterBold': /[^\*]/,
  'afterItal': /[^_]/,
  'afterMono': /[^`]/,
};


/**
 * Internal helper class for parsing the markup tags for HTML and Markdown.
 *
 * NOTE: Sequences of tabs and spaces are reduced to single space.
 *       Scan usage of `this.spacing` within method
 */
class MarkupAccumulator {

  /**
   * Create an instance
   *
   * @param {string} text  text to parse for markup
   */
  constructor(text) {
    this.text = text;
    this.bold = false;
    this.ital = false;
    this.mono = false;
    this.spacing = false;
    this.position = 0;
    this.buffer = "";
    this.modStack = [];

    this.blocks = [];
  }


  /**
   * Return the mod label currently on the top of the stack
   *
   * @returns {string}  label of topmost mod 
   * @private
   */
  mod() {
    return (this.modStack.length === 0) ? 'normal' : this.modStack[0];
  }


  /**
   * Return the mod label currently active
   * 
   * @returns {string}  label of active mod 
   * @private
   */
  modName() {
    if (this.modStack.length === 0)
      return 'normal';
    else if (this.modStack[0] === 'mono')
      return 'mono';
    else {
      if (this.bold && this.ital) {
        return 'boldital';
      } else if (this.bold) {
        return 'bold';
      } else if (this.ital) {
        return 'ital';
      }
    }
  }


  /**
   * @private
   */
  emitBlock() {
    if (this.spacing) {
      this.add(" ");
      this.spacing = false;
    }
    if (this.buffer.length > 0) {
      this.blocks.push({ text: this.buffer, mod: this.modName() });
      this.buffer = "";
    }
  }


  /**
   * Output text to buffer
   *
   * @param {string} text  text to add
   * @private
   */
  add(text) {
    if (text === " ") {
      this.spacing = true;
    }
    if (this.spacing) {
      this.buffer += " ";
      this.spacing = false;
    }
    if (text != " ") {
      this.buffer += text;
    }
  }


  /**
   * Handle parsing of whitespace
   *
   * @param {string} ch  the character to check
   * @returns {boolean} true if the character was processed as whitespace, false otherwise
   */
  parseWS(ch) {
    if (/[ \t]/.test(ch)) {
      if (!this.mono) {
        this.spacing = true;
      } else {
        this.add(ch);
      }
      return true;
    }

    return false;
  }


  /**
   * @param {string} tagName  label for block type to set
   * @private
   */
  setTag(tagName) {
    this.emitBlock();
    this[tagName] = true;
    this.modStack.unshift(tagName);
  }


  /**
   * @param {string} tagName  label for block type to unset
   * @private
   */
  unsetTag(tagName) {
    this.emitBlock();
    this[tagName] = false;
    this.modStack.shift();
  }


  /**
   * @param {string} tagName label for block type we are currently processing
   * @param {string|RegExp} tag string to match in text
   * @returns {boolean} true if the tag was processed, false otherwise
   */
  parseStartTag(tagName, tag) {
    // Note: if 'mono' passed as tagName, there is a double check here. This is OK
    if (!this.mono && !this[tagName] && this.match(tag)) {
      this.setTag(tagName);
      return true;
    }

    return false;
  }


  /**
   * @param {string|RegExp} tag
   * @param {number} [advance=true] if set, advance current position in text
   * @returns {boolean} true if match at given position, false otherwise
   * @private
   */
  match(tag, advance = true) {
    let [regExp, length] = this.prepareRegExp(tag);
    let matched = regExp.test(this.text.substr(this.position, length));

    if (matched && advance) {
      this.position += length - 1;
    }

    return matched;
  }


  /**
   * @param {string} tagName label for block type we are currently processing
   * @param {string|RegExp} tag string to match in text
   * @param {RegExp} [nextTag] regular expression to match for characters *following* the current tag 
   * @returns {boolean} true if the tag was processed, false otherwise
   */
  parseEndTag(tagName, tag, nextTag) {
    let checkTag = (this.mod() === tagName);
    if (tagName === 'mono') {  // special handling for 'mono'
     checkTag = checkTag && this.mono;
    } else {
     checkTag = checkTag && !this.mono;
    }

    if (checkTag && this.match(tag)) {
      if (nextTag !== undefined) {
        // Purpose of the following match is to prevent a direct unset/set of a given tag
        // E.g. '*bold **still bold*' => '*bold still bold*'
        if ((this.position === this.text.length-1) || this.match(nextTag, false)) {
          this.unsetTag(tagName);
        }
      } else {
        this.unsetTag(tagName);
      }

      return true;
    }

    return false;
  }


  /**
   * @param {string|RegExp} tag  string to match in text
   * @param {value} value  string to replace tag with, if found at current position
   * @returns {boolean} true if the tag was processed, false otherwise
   */
  replace(tag, value) {
    if (this.match(tag)) {
      this.add(value);
      this.position += length - 1;
      return true;
    }

    return false;
  }


  /**
   * Create a regular expression for the tag if it isn't already one.
   *
   * The return value is an array `[RegExp, number]`, with exactly two value, where:
   *  - RegExp is the regular expression to use
   *  - number is the lenth of the input string to match
   *
   * @param {string|RegExp} tag  string to match in text
   * @returns {Array}  regular expression to use and length of input string to match
   * @private
   */
  prepareRegExp(tag) {
    let length;
    let regExp;
    if (tag instanceof RegExp) {
      regExp = tag;
      length = 1;   // ASSUMPTION: regexp only tests one character
    } else {
      // use prepared regexp if present
      var prepared = tagPattern[tag];
      if (prepared !== undefined) {
        regExp = prepared;
      } else {
        regExp = new RegExp(tag);
      }

      length = tag.length;
    }

    return [regExp, length];
  }
}


/**
 * Helper class for Label which explodes the label text into lines and blocks within lines
 *
 * @private
 */
class LabelSplitter {

  /**
   * @param {CanvasRenderingContext2D} ctx Canvas rendering context
   * @param {Label} parent reference to the Label instance using current instance
   * @param {boolean} selected 
   * @param {boolean} hover
   */
  constructor(ctx, parent, selected, hover) {
    this.ctx = ctx;
    this.parent = parent;


    /**
     * Callback to determine text width; passed to LabelAccumulator instance
     *
     * @param  {String} text string to determine width of
     * @param  {String} mod  font type to use for this text
     * @return {Object} { width, values} width in pixels and font attributes
     */
    let textWidth = (text, mod) => {
      if (text === undefined) return 0;

      // TODO: This can be done more efficiently with caching
      let values = this.parent.getFormattingValues(ctx, selected, hover, mod);

      let width = 0;
      if (text !== '') {
        // NOTE: The following may actually be *incorrect* for the mod fonts!
        //       This returns the size with a regular font, bold etc. may
        //       have different sizes.
        let measure = this.ctx.measureText(text);
        width = measure.width;
      }

      return {width, values: values};
    };


    this.lines = new LabelAccumulator(textWidth);
  }


  /**
   * Split passed text of a label into lines and blocks.
   *
   * # NOTE
   *
   * The handling of spacing is option dependent:
   *
   * - if `font.multi : false`, all spaces are retained
   * - if `font.multi : true`, every sequence of spaces is compressed to a single space
   *
   * This might not be the best way to do it, but this is as it has been working till now.
   * In order not to break existing functionality, for the time being this behaviour will
   * be retained in any code changes. 
   *
   * @param {string} text  text to split
   * @returns {Array<line>}
   */
  process(text) {
    if (!ComponentUtil.isValidLabel(text)) {
      return this.lines.finalize();
    }

    var font = this.parent.fontOptions;

    // Normalize the end-of-line's to a single representation - order important
    text = text.replace(/\r\n/g, '\n');  // Dos EOL's
    text = text.replace(/\r/g, '\n');        // Mac EOL's

    // Note that at this point, there can be no \r's in the text.
    // This is used later on splitStringIntoLines() to split multifont texts.

    let nlLines = String(text).split('\n');
    let lineCount = nlLines.length;

    if (font.multi) {
      // Multi-font case: styling tags active
      for (let i = 0; i < lineCount; i++) {
        let blocks = this.splitBlocks(nlLines[i], font.multi);
        // Post: Sequences of tabs and spaces are reduced to single space

        if (blocks === undefined) continue;

        if (blocks.length === 0) {
          this.lines.newLine("");
          continue;
        }

        if (font.maxWdt > 0) {
          // widthConstraint.maximum defined
          //console.log('Running widthConstraint multi, max: ' + this.fontOptions.maxWdt);
          for (let j = 0; j < blocks.length; j++) {
            let mod  = blocks[j].mod;
            let text = blocks[j].text;
            this.splitStringIntoLines(text, mod, true);
          }
        } else {
          // widthConstraint.maximum NOT defined
          for (let j = 0; j < blocks.length; j++) {
            let mod  = blocks[j].mod;
            let text = blocks[j].text;
            this.lines.append(text, mod); 
          }
        }

        this.lines.newLine();
      }
    } else {
      // Single-font case
      if (font.maxWdt > 0) {
        // widthConstraint.maximum defined
        // console.log('Running widthConstraint normal, max: ' + this.fontOptions.maxWdt);
        for (let i = 0; i < lineCount; i++) {
          this.splitStringIntoLines(nlLines[i]);
        }
      } else {
        // widthConstraint.maximum NOT defined
        for (let i = 0; i < lineCount; i++) {
          this.lines.newLine(nlLines[i]); 
        }
      }
    }
   
    return this.lines.finalize();
  }


  /**
   * normalize the markup system
   *
   * @param {boolean|'md'|'markdown'|'html'} markupSystem
   * @returns {string}
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
   *
   * @param {string} text
   * @returns {Array}
   */
  splitHtmlBlocks(text) {
    let s = new MarkupAccumulator(text);

    let parseEntities = (ch) => {
      if (/&/.test(ch)) {
        let parsed = s.replace(s.text, '&lt;', '<')
          || s.replace(s.text, '&amp;', '&');

        if (!parsed) {
          s.add("&");
        }

        return true;
      }

      return false;
    };

    while (s.position < s.text.length) {
      let ch = s.text.charAt(s.position);

      let parsed = s.parseWS(ch)
        || (/</.test(ch) && ( 
             s.parseStartTag('bold', '<b>')
          || s.parseStartTag('ital', '<i>')
          || s.parseStartTag('mono', '<code>')
          || s.parseEndTag('bold', '</b>')
          || s.parseEndTag('ital', '</i>')
          || s.parseEndTag('mono', '</code>')))
        || parseEntities(ch);

      if (!parsed) {
        s.add(ch);
      }
      s.position++
    }
    s.emitBlock();
    return s.blocks;
  }


  /**
   *
   * @param {string} text
   * @returns {Array}
   */
  splitMarkdownBlocks(text) {
    let s = new MarkupAccumulator(text); 
    let beginable = true;

    let parseOverride = (ch) => {
      if (/\\/.test(ch)) {
        if (s.position < this.text.length + 1) {
          s.position++;
          ch = this.text.charAt(s.position);
          if (/ \t/.test(ch)) {
            s.spacing = true;
          } else {
            s.add(ch);
            beginable = false;
          }
        }

        return true
      }

      return false;
    }

    while (s.position < s.text.length) {
      let ch = s.text.charAt(s.position);

      let parsed = s.parseWS(ch)
        || parseOverride(ch)
        || ((beginable || s.spacing) && (
             s.parseStartTag('bold', '*')
          || s.parseStartTag('ital', '_')
          || s.parseStartTag('mono', '`')))
        || s.parseEndTag('bold', '*', 'afterBold')
        || s.parseEndTag('ital', '_', 'afterItal')
        || s.parseEndTag('mono', '`', 'afterMono');

      if (!parsed) {
        s.add(ch);
        beginable = false;
      }
      s.position++
    }
    s.emitBlock();
    return s.blocks;
  }


  /**
   * Explodes a piece of text into single-font blocks using a given markup
   *
   * @param {string} text
   * @param {boolean|'md'|'markdown'|'html'} markupSystem
   * @returns {Array.<{text: string, mod: string}>}
   * @private
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


  /**
   * @param {string} text
   * @returns {boolean} true if text length over the current max with
   * @private
   */
  overMaxWidth(text) {
    let width = this.ctx.measureText(text).width;
    return (this.lines.curWidth() + width > this.parent.fontOptions.maxWdt);
  }


  /**
   * Determine the longest part of the sentence which still fits in the 
   * current max width.
   * 
   * @param {Array} words  Array of strings signifying a text lines
   * @return {number}      index of first item in string making string go over max
   * @private
   */
  getLongestFit(words) {
    let text = '';
    let w = 0;

    while (w < words.length) {
      let pre = (text === '') ? '' : ' ';
      let newText = text + pre + words[w];

      if (this.overMaxWidth(newText)) break;
      text = newText;
      w++;
    }

    return w;
  }


  /**
   * Determine the longest part of the string which still fits in the
   * current max width.
   * 
   * @param {Array} words Array of strings signifying a text lines
   * @return {number} index of first item in string making string go over max
   */
   getLongestFitWord(words) {
     let w = 0;

     while (w < words.length) {
       if (this.overMaxWidth(words.slice(0,w))) break;
       w++;
     }

     return w;
  }


  /**
   * Split the passed text into lines, according to width constraint (if any).
   * 
   * The method assumes that the input string is a single line, i.e. without lines break.
   *
   * This method retains spaces, if still present (case `font.multi: false`).
   * A space which falls on an internal line break, will be replaced by a newline.
   * There is no special handling of tabs; these go along with the flow.
   * 
   * @param {string} str
   * @param {string} [mod='normal']
   * @param {boolean} [appendLast=false]
   * @private
   */
  splitStringIntoLines(str, mod = 'normal', appendLast = false) {
    // Still-present spaces are relevant, retain them
    str = str.replace(/^( +)/g, '$1\r');
    str = str.replace(/([^\r][^ ]*)( +)/g, '$1\r$2\r');
    let words = str.split('\r');

    while (words.length > 0) {
      let w = this.getLongestFit(words);

      if (w === 0) {
        // Special case: the first word is already larger than the max width.
        let word = words[0];

        // Break the word to the largest part that fits the line
        let x = this.getLongestFitWord(word);
        this.lines.newLine(word.slice(0, x), mod);

        // Adjust the word, so that the rest will be done next iteration
        words[0] = word.slice(x);
      } else {
        // skip any space that is replaced by a newline
        let newW = w;
        if (words[w - 1] === ' ') {
          w--;
        } else if (words[newW] === ' ') {
          newW++;
        }

        let text = words.slice(0, w).join("");

        if (w == words.length && appendLast) {
          this.lines.append(text, mod); 
        } else {
          this.lines.newLine(text, mod); 
        }

        // Adjust the word, so that the rest will be done next iteration
        words = words.slice(newW);
      }
    }
  }
} 

export default LabelSplitter;
