/**
 * A horizontal time axis
 * @param {Object} [options]        See DataAxis.setOptions for the available
 *                                  options.
 * @constructor DataAxis
 * @extends Component
 */
function DataAxis (options) {
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
    orientation: 'left',  // supported: 'left'
    showMinorLabels: true,
    showMajorLabels: true
  };

  this.range = null;
  this.conversionFactor = 1;

  // create the HTML DOM
  this._create();
}

DataAxis.prototype = new Component();

// TODO: comment options
DataAxis.prototype.setOptions = Component.prototype.setOptions;

/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype._create = function _create() {
  this.frame = document.createElement('div');
};

/**
 * Set a range (start and end)
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
DataAxis.prototype.setRange = function (range) {
  if (!(range instanceof Range) && (!range || range.start === undefined || range.end === undefined)) {
    throw new TypeError('Range must be an instance of Range, ' +
      'or an object containing start and end.');
  }
  this.range = range;
};

/**
 * Get the outer frame of the time axis
 * @return {HTMLElement} frame
 */
DataAxis.prototype.getFrame = function getFrame() {
  return this.frame;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
DataAxis.prototype.repaint = function () {
  var asSize = util.option.asSize;
  var options = this.options;
  var props = this.props;
  var frame = this.frame;

  // update classname
  frame.className = 'dataaxis'; // TODO: add className from options if defined

  // calculate character width and height
  this._calculateCharSize();

  // TODO: recalculate sizes only needed when parent is resized or options is changed
  var orientation = this.getOption('orientation');
  var showMinorLabels = this.getOption('showMinorLabels');
  var showMajorLabels = this.getOption('showMajorLabels');

  // determine the width and height of the elemens for the axis
  props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
  props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;
  this.height = this.options.height;
  this.width = frame.offsetWidth; // TODO: only update the width when the frame is resized?

  props.minorLineWidth = this.options.svg.offsetWidth;
  props.minorLineHeight = 1; // TODO: really calculate width
  props.majorLineWidth = this.options.svg.offsetWidth;
  props.majorLineHeight = 1; // TODO: really calculate width

  //  take frame offline while updating (is almost twice as fast)
  // TODO: top/bottom positioning should be determined by options set in the Timeline, not here
  if (orientation == 'left') {
    frame.style.top = '0';
    frame.style.left = '0';
    frame.style.bottom = '';
    frame.style.width = this.width + 'px';
    frame.style.height = this.height + "px";
  }
  else { // right
    frame.style.top = '';
    frame.style.bottom = '0';
    frame.style.left = '0';
    frame.style.width = this.width + 'px';
    frame.style.height = this.height + "px";
  }

  this._repaintLabels();
};

/**
 * Repaint major and minor text labels and vertical grid lines
 * @private
 */
DataAxis.prototype._repaintLabels = function () {
  var orientation = this.getOption('orientation');

  // calculate range and step (step such that we have space for 7 characters per label)
  var start = this.range.start;
  var end = this.range.end;
  var minimumStep = (this.props.minorCharHeight || 10); //in pixels
  var step = new DataStep(start, end, minimumStep, this.options.svg.offsetHeight);
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
  var stepPixels = this.options.svg.offsetHeight / ((step.marginRange / step.step) + 1);
  var xFirstMajorLabel = undefined;

  this.valueAtZero = step.marginEnd;
  var marginStartPos = 0;
  var max = 0;
  while (step.hasNext() && max < 1000) {
    var y = max * stepPixels;
    y = y.toPrecision(5)
    var isMajor = step.isMajor();

    if (this.getOption('showMinorLabels') && isMajor == false) {
      this._repaintMinorText(y, step.getLabelMinor(), orientation);
    }

    if (isMajor && this.getOption('showMajorLabels')) {
      if (y > 0) {
        if (xFirstMajorLabel == undefined) {
          xFirstMajorLabel = y;
        }
        this._repaintMajorText(y, step.getLabelMajor(), orientation);
      }
      this._repaintMajorLine(y, orientation);
    }
    else {
      this._repaintMinorLine(y, orientation);
    }

    step.next();
    marginStartPos = y;
    max++;
  }

  this.conversionFactor = marginStartPos/step.marginRange;
  console.log(marginStartPos, step.marginRange, this.conversionFactor);



  // create a major label on the left when needed
  if (this.getOption('showMajorLabels')) {
    var leftPoint = this._start;
    var leftText = step.getLabelMajor(leftPoint);
    var widthText = leftText.length * (this.props.majorCharWidth || 10) + 10; // upper bound estimation

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

DataAxis.prototype.convertValues = function(data) {
  for (var i = 0; i < data.length; i++) {
    data[i].y = this._getPos(data[i].y);
  }
  return data;
}

DataAxis.prototype._getPos = function(value) {
  var invertedValue = this.valueAtZero - value;
  var convertedValue = invertedValue * this.conversionFactor;
  return convertedValue
}

/**
 * Create a minor label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._repaintMinorText = function (x, text, orientation) {
  // reuse redundant label
  var label = this.dom.redundant.minorTexts.shift();

  if (!label) {
    // create new label
    var content = document.createTextNode('');
    label = document.createElement('div');
    label.appendChild(content);
    label.className = 'yAxis minor';
    this.frame.appendChild(label);
  }
  this.dom.minorTexts.push(label);

  label.childNodes[0].nodeValue = text;

  if (orientation == 'left') {
    label.style.left = '-2px';
    label.style.textAlign = "right";
  }
  else {
    label.style.left = '2px';
    label.style.textAlign = "left";
  }

  label.style.top = x + 'px';
  //label.title = title;  // TODO: this is a heavy operation
};

/**
 * Create a Major label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._repaintMajorText = function (x, text, orientation) {
  // reuse redundant label
  var label = this.dom.redundant.majorTexts.shift();

  if (!label) {
    // create label
    var content = document.createTextNode(text);
    label = document.createElement('div');
    label.className = 'yAxis major';
    label.appendChild(content);
    this.frame.appendChild(label);
  }
  this.dom.majorTexts.push(label);

  label.childNodes[0].nodeValue = text;
  //label.title = title; // TODO: this is a heavy operation

  if (orientation == 'left') {
    label.style.left = '-2px';
    label.style.textAlign = "right";
  }
  else {
    label.style.left = '2';
    label.style.textAlign = "left";
  }

  label.style.top = x + 'px';
};

/**
 * Create a minor line for the axis at position y
 * @param {Number} y
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._repaintMinorLine = function (y, orientation) {
  // reuse redundant line
  var line = this.dom.redundant.minorLines.shift();

  if (!line) {
    // create vertical line
    line = document.createElement('div');
    line.className = 'grid horizontal minor';
    this.frame.appendChild(line);
  }
  this.dom.minorLines.push(line);

  var props = this.props;
  if (orientation == 'left') {
    line.style.left = (this.width - 15) + 'px';
  }
  else {
    line.style.left = -1*(this.width - 15) + 'px';
  }

  line.style.width = props.minorLineWidth + 'px';
  line.style.top = y + 'px';
};

/**
 * Create a Major line for the axis at position x
 * @param {Number} x
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._repaintMajorLine = function (y, orientation) {
  // reuse redundant line
  var line = this.dom.redundant.majorLines.shift();

  if (!line) {
    // create vertical line
    line = document.createElement('div');
    line.className = 'grid horizontal major';
    this.frame.appendChild(line);
  }
  this.dom.majorLines.push(line);

  var props = this.props;
  if (orientation == 'left') {
    line.style.left = (this.width - 25) + 'px';
  }
  else {
    line.style.left = -1*(this.width - 25) + 'px';
  }
  line.style.top = y + 'px';
  line.style.width = props.majorLineWidth + 'px';
};


/**
 * Determine the size of text on the axis (both major and minor axis).
 * The size is calculated only once and then cached in this.props.
 * @private
 */
DataAxis.prototype._calculateCharSize = function () {
  // determine the char width and height on the minor axis
  if (!('minorCharHeight' in this.props)) {
    var textMinor = document.createTextNode('0');
    var measureCharMinor = document.createElement('DIV');
    measureCharMinor.className = 'text minor measure';
    measureCharMinor.appendChild(textMinor);
    this.frame.appendChild(measureCharMinor);

    this.props.minorCharHeight = measureCharMinor.clientHeight;
    this.props.minorCharWidth = measureCharMinor.clientWidth;

    this.frame.removeChild(measureCharMinor);
  }

  if (!('majorCharHeight' in this.props)) {
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
DataAxis.prototype.snap = function snap (date) {
  return this.step.snap(date);
};
