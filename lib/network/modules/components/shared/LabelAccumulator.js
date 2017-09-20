/**
 * Callback to determine text dimensions, using the parent label settings.
 * @callback MeasureText
 * @param {text} text
 * @param {text} mod
 * @return {Object} { width, values} width in pixels and font attributes
 */


/**
 * Helper class for Label which collects results of splitting labels into lines and blocks.
 *
 * @private
 */
class LabelAccumulator {
  /**
   * @param {MeasureText} measureText
   */
  constructor(measureText) {
    this.measureText = measureText;
    this.current = 0;
    this.width   = 0;
    this.height  = 0;
    this.lines   = [];
  }


  /**
   * Append given text to the given line.
   *
   * @param {number}  l    index of line to add to
   * @param {string}  text string to append to line
   * @param {'bold'|'ital'|'boldital'|'mono'|'normal'} [mod='normal']
   * @private
   */
  _add(l, text, mod = 'normal') { 
    if (text === undefined || text === "") return;
    //if (text === undefined) text = "";

    if (this.lines[l] === undefined) {
      this.lines[l] = {
        width : 0,
        height: 0,
        blocks: []
      };
    }

    // Determine width and get the font properties
    let result = this.measureText(text, mod);
    let block = Object.assign({}, result.values);
    block.text  = text;
    block.width = result.width;
    block.mod   = mod;

    this.lines[l].blocks.push(block);

    // Update the line width. We need this for
    // determining if a string goes over max width
    this.lines[l].width += result.width;
  }


  /**
   * Returns the width in pixels of the current line.
   *
   * @returns {number}
   */
  curWidth() {
    let line = this.lines[this.current];
    if (line === undefined) return 0;

    return line.width;
  }


   /**
    * Add text in block to current line
    *
    * @param {string} text
    * @param {'bold'|'ital'|'boldital'|'mono'|'normal'} [mod='normal']
    */
   append(text, mod = 'normal') { 
     this._add(this.current, text, mod);
   }


  /**
   * Add text in block to current line and start a new line
   *
   * @param {string} text
   * @param {'bold'|'ital'|'boldital'|'mono'|'normal'} [mod='normal']
   */
  newLine(text, mod = 'normal') {
    this._add(this.current, text, mod);
    this.current++;
  }


  /**
   * Set the sizes for all lines and the whole thing.
   *
   * @returns {{width: (number|*), height: (number|*), lines: Array}}
   */
  finalize() {
    // console.log(JSON.stringify(this.lines, null, 2));



    // Determine the heights of the lines
    // Note that width has already been set
    for (let k = 0; k < this.lines.length; k++) {
      let line   = this.lines[k];

      // Looking for max height of blocks in line
      let height = 0;
      for (let l = 0; l < line.blocks.length; l++) {
        let block =  line.blocks[l];

        if (height < block.height) {
          height = block.height;
        }
      }
  
      line.height = height;
    }

    // Determine the full label size
    let width  = 0;
    let height = 0;
    for (let k = 0; k < this.lines.length; k++) {
      let line   = this.lines[k];

      if (line.width > width) {
        width = line.width;
      }
      height += line.height;
    }

    this.width  = width;
    this.height = height;

/*
    // Remove all empty blocks
    // Do this after the width/height determination, so that these are set properly for lines
    for (let k = 0; k < this.lines.length; k++) {
      let line   = this.lines[k];

      let tmpBlocks = []
      for (let l = 0; l < line.blocks.length; l++) {
        let block =  line.blocks[l];
        if (block.width !== 0) {
          tmpBlocks.push(block);
        }
      }

      line.blocks = tmpBlocks;
    }
*/

    // Return a simple hash object for further processing.
    return {
      width : this.width,
      height: this.height,
      lines : this.lines
    }
  }
} 

export default LabelAccumulator;
