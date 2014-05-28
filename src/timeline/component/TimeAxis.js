/**
 * A horizontal time axis
 * @param {Object} [options]        See TimeAxis.setOptions for the available
 *                                  options.
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (options) {
  this.id = util.randomUUID();

  this.dom = {
    majorLines: [],
    majorTexts: [],
    minorLines: [],
    minorTexts: [],
    redundant: {
      majorLines: [],
      majorTexts: [],
      minorLines: [],
      minorTexts: []
    }
  };
  this.props = {
    range: {
      start: 0,
      end: 0,
      minimumStep: 0
    },
    lineTop: 0
  };
  this.options = options || {};
  this.defaultOptions = {
    orientation: 'bottom',  // supported: 'top', 'bottom'
    // TODO: implement timeaxis orientations 'left' and 'right'
    showMinorLabels: true,
    showMajorLabels: true
  };

  this.range = null;

  // create the HTML DOM
  this._create();
}

TimeAxis.prototype = new Component();

// TODO: comment options
TimeAxis.prototype.setOptions = Component.prototype.setOptions;

/**
 * Create the HTML DOM for the TimeAxis
 */
TimeAxis.prototype._create = function _create() {
  this.frame = document.createElement('div');
};

/**
 * Set a range (start and end)
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
TimeAxis.prototype.setRange = function (range) {
  if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
    throw new TypeError('Range must be an instance of Range, ' +
        'or an object containing start and end.');
  }
  this.range = range;
};

/**
 * Get the outer frame of the time axis
 * @return {HTMLElement} frame
 */
TimeAxis.prototype.getFrame = function getFrame() {
  return this.frame;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
TimeAxis.prototype.repaint = function () {
  var asSize = util.option.asSize,
      options = this.options,
      props = this.props,
      frame = this.frame;

  // update classname
  frame.className = 'timeaxis'; // TODO: add className from options if defined

  var parent = frame.parentNode;
  if (parent) {
    // calculate character width and height
    this._calculateCharSize();

    // TODO: recalculate sizes only needed when parent is resized or options is changed
    var orientation = this.getOption('orientation'),
        showMinorLabels = this.getOption('showMinorLabels'),
        showMajorLabels = this.getOption('showMajorLabels');

    // determine the width and height of the elemens for the axis
    var parentHeight = this.parent.height;
    props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
    props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;
    this.height = props.minorLabelHeight + props.majorLabelHeight;
    this.width = frame.offsetWidth; // TODO: only update the width when the frame is resized?

    props.minorLineHeight = parentHeight + props.minorLabelHeight;
    props.minorLineWidth = 1; // TODO: really calculate width
    props.majorLineHeight = parentHeight + this.height;
    props.majorLineWidth = 1; // TODO: really calculate width

    //  take frame offline while updating (is almost twice as fast)
    var beforeChild = frame.nextSibling;
    parent.removeChild(frame);

    // TODO: top/bottom positioning should be determined by options set in the Timeline, not here
    if (orientation == 'top') {
      frame.style.top = '0';
      frame.style.left = '0';
      frame.style.bottom = '';
      frame.style.width = asSize(options.width, '100%');
      frame.style.height = this.height + 'px';
    }
    else { // bottom
      frame.style.top = '';
      frame.style.bottom = '0';
      frame.style.left = '0';
      frame.style.width = asSize(options.width, '100%');
      frame.style.height = this.height + 'px';
    }

    this._repaintLabels();

    this._repaintLine();

    // put frame online again
    if (beforeChild) {
      parent.insertBefore(frame, beforeChild);
    }
    else {
      parent.appendChild(frame)
    }
  }

  return this._isResized();
};

/**
 * Repaint major and minor text labels and vertical grid lines
 * @private
 */
TimeAxis.prototype._repaintLabels = function () {
  var orientation = this.getOption('orientation');

  // calculate range and step (step such that we have space for 7 characters per label)
  var start = util.convert(this.range.start, 'Number'),
      end = util.convert(this.range.end, 'Number'),
      minimumStep = this.options.toTime((this.props.minorCharWidth || 10) * 7).valueOf()
          -this.options.toTime(0).valueOf();
  var step = new TimeStep(new Date(start), new Date(end), minimumStep);
  this.step = step;

  // Move all DOM elements to a "redundant" list, where they
  // can be picked for re-use, and clear the lists with lines and texts.
  // At the end of the function _repaintLabels, left over elements will be cleaned up
  var dom = this.dom;
  dom.redundant.majorLines = dom.majorLines;
  dom.redundant.majorTexts = dom.majorTexts;
  dom.redundant.minorLines = dom.minorLines;
  dom.redundant.minorTexts = dom.minorTexts;
  dom.majorLines = [];
  dom.majorTexts = [];
  dom.minorLines = [];
  dom.minorTexts = [];

  step.first();
  var xFirstMajorLabel = undefined;
  var max = 0;
  while (step.hasNext() && max < 1000) {
    max++;
    var cur = step.getCurrent(),
        x = this.options.toScreen(cur),
        isMajor = step.isMajor();

    // TODO: lines must have a width, such that we can create css backgrounds

    if (this.getOption('showMinorLabels')) {
      this._repaintMinorText(x, step.getLabelMinor(), orientation);
    }

    if (isMajor && this.getOption('showMajorLabels')) {
      if (x > 0) {
        if (xFirstMajorLabel == undefined) {
          xFirstMajorLabel = x;
        }
        this._repaintMajorText(x, step.getLabelMajor(), orientation);
      }
      this._repaintMajorLine(x, orientation);
    }
    else {
      this._repaintMinorLine(x, orientation);
    }

    step.next();
  }

  // create a major label on the left when needed
  if (this.getOption('showMajorLabels')) {
    var leftTime = this.options.toTime(0),
        leftText = step.getLabelMajor(leftTime),
        widthText = leftText.length * (this.props.majorCharWidth || 10) + 10; // upper bound estimation

    if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
      this._repaintMajorText(0, leftText, orientation);
    }
  }

  // Cleanup leftover DOM elements from the redundant list
  util.forEach(this.dom.redundant, function (arr) {
    while (arr.length) {
      var elem = arr.pop();
      if (elem && elem.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    }
  });
};

/**
 * Create a minor label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
TimeAxis.prototype._repaintMinorText = function (x, text, orientation) {
  // reuse redundant label
  var label = this.dom.redundant.minorTexts.shift();

  if (!label) {
    // create new label
    var content = document.createTextNode('');
    label = document.createElement('div');
    label.appendChild(content);
    label.className = 'text minor';
    this.frame.appendChild(label);
  }
  this.dom.minorTexts.push(label);

  label.childNodes[0].nodeValue = text;

  if (orientation == 'top') {
    label.style.top = this.props.majorLabelHeight + 'px';
    label.style.bottom = '';
  }
  else {
    label.style.top = '';
    label.style.bottom = this.props.majorLabelHeight + 'px';
  }
  label.style.left = x + 'px';
  //label.title = title;  // TODO: this is a heavy operation
};

/**
 * Create a Major label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
TimeAxis.prototype._repaintMajorText = function (x, text, orientation) {
  // reuse redundant label
  var label = this.dom.redundant.majorTexts.shift();

  if (!label) {
    // create label
    var content = document.createTextNode(text);
    label = document.createElement('div');
    label.className = 'text major';
    label.appendChild(content);
    this.frame.appendChild(label);
  }
  this.dom.majorTexts.push(label);

  label.childNodes[0].nodeValue = text;
  //label.title = title; // TODO: this is a heavy operation

  if (orientation == 'top') {
    label.style.top = '0px';
    label.style.bottom = '';
  }
  else {
    label.style.top = '';
    label.style.bottom = '0px';
  }
  label.style.left = x + 'px';
};

/**
 * Create a minor line for the axis at position x
 * @param {Number} x
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
TimeAxis.prototype._repaintMinorLine = function (x, orientation) {
  // reuse redundant line
  var line = this.dom.redundant.minorLines.shift();

  if (!line) {
    // create vertical line
    line = document.createElement('div');
    line.className = 'grid vertical minor';
    this.frame.appendChild(line);
  }
  this.dom.minorLines.push(line);

  var props = this.props;
  if (orientation == 'top') {
    line.style.top = this.props.majorLabelHeight + 'px';
    line.style.bottom = '';
  }
  else {
    line.style.top = '';
    line.style.bottom = this.props.majorLabelHeight + 'px';
  }
  line.style.height = props.minorLineHeight + 'px';
  line.style.left = (x - props.minorLineWidth / 2) + 'px';
};

/**
 * Create a Major line for the axis at position x
 * @param {Number} x
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
TimeAxis.prototype._repaintMajorLine = function (x, orientation) {
  // reuse redundant line
  var line = this.dom.redundant.majorLines.shift();

  if (!line) {
    // create vertical line
    line = document.createElement('DIV');
    line.className = 'grid vertical major';
    this.frame.appendChild(line);
  }
  this.dom.majorLines.push(line);

  var props = this.props;
  if (orientation == 'top') {
    line.style.top = '0px';
    line.style.bottom = '';
  }
  else {
    line.style.top = '';
    line.style.bottom = '0px';
  }
  line.style.left = (x - props.majorLineWidth / 2) + 'px';
  line.style.height = props.majorLineHeight + 'px';
};


/**
 * Repaint the horizontal line for the axis
 * @private
 */
TimeAxis.prototype._repaintLine = function() {
  var line = this.dom.line,
      frame = this.frame,
      orientation = this.getOption('orientation');

  // line before all axis elements
  if (this.getOption('showMinorLabels') || this.getOption('showMajorLabels')) {
    if (line) {
      // put this line at the end of all childs
      frame.removeChild(line);
      frame.appendChild(line);
    }
    else {
      // create the axis line
      line = document.createElement('div');
      line.className = 'grid horizontal major';
      frame.appendChild(line);
      this.dom.line = line;
    }

    if (orientation == 'top') {
      line.style.top = this.height + 'px';
      line.style.bottom = '';
    }
    else {
      line.style.top = '';
      line.style.bottom = this.height + 'px';
    }
  }
  else {
    if (line && line.parentNode) {
      line.parentNode.removeChild(line);
      delete this.dom.line;
    }
  }
};

/**
 * Determine the size of text on the axis (both major and minor axis).
 * The size is calculated only once and then cached in this.props.
 * @private
 */
TimeAxis.prototype._calculateCharSize = function () {
  // Note: We only calculate char size once, but in case it is calculated as zero,
  //       we will recalculate. This is the case if any of the timelines parents
  //       has display:none for example.

  // determine the char width and height on the minor axis
  if (!('minorCharHeight' in this.props) || this.props.minorCharHeight == 0) {
    var textMinor = document.createTextNode('0');
    var measureCharMinor = document.createElement('DIV');
    measureCharMinor.className = 'text minor measure';
    measureCharMinor.appendChild(textMinor);
    this.frame.appendChild(measureCharMinor);

    this.props.minorCharHeight = measureCharMinor.clientHeight;
    this.props.minorCharWidth = measureCharMinor.clientWidth;

    this.frame.removeChild(measureCharMinor);
  }

  // determine the char width and height on the major axis
  if (!('majorCharHeight' in this.props) || this.props.majorCharHeight == 0) {
    var textMajor = document.createTextNode('0');
    var measureCharMajor = document.createElement('DIV');
    measureCharMajor.className = 'text major measure';
    measureCharMajor.appendChild(textMajor);
    this.frame.appendChild(measureCharMajor);

    this.props.majorCharHeight = measureCharMajor.clientHeight;
    this.props.majorCharWidth = measureCharMajor.clientWidth;

    this.frame.removeChild(measureCharMajor);
  }
};

/**
 * Snap a date to a rounded value.
 * The snap intervals are dependent on the current scale and step.
 * @param {Date} date   the date to be snapped.
 * @return {Date} snappedDate
 */
TimeAxis.prototype.snap = function snap (date) {
  return this.step.snap(date);
};
