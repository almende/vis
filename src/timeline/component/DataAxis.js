/**
 * A horizontal time axis
 * @param {Object} [options]        See DataAxis.setOptions for the available
 *                                  options.
 * @constructor DataAxis
 * @extends Component
 */
function DataAxis (body, options) {
  this.id = util.randomUUID();
  this.body = body;

  this.defaultOptions = {
    orientation: 'left',  // supported: 'left'
    showMinorLabels: true,
    showMajorLabels: true,
    width: '50px',
    height: '300px'
  };

  this.props = {};
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

//  this.yRange = new Range(body,{
//                                direction: 'vertical',
//                                min: null,
//                                max: null,
//                                zoomMin: 1e-5,
//                                zoomMax: 1e9
//                               });
  this.yRange = {start:0, end:0};

  this.options = util.extend({}, this.defaultOptions);
  this.conversionFactor = 1;

  this.width = Number(this.options.width.replace("px",""));
  // create the HTML DOM
  this._create();
}

DataAxis.prototype = new Component();
DataAxis.prototype.setOptions = Component.prototype.setOptions;


/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype._create = function() {
  this.dom.frame = document.createElement('div');
  this.dom.frame.style.width = this.options.width;
  this.dom.frame.style.height = this.options.height;

  this.dom.lineContainer = document.createElement('div');
  this.dom.lineContainer.style.width = '100%';
  this.dom.lineContainer.style.height = this.options.height;

  this.show();
};


/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype.show = function() {
  if (!this.dom.frame.parentNode) {
    if (this.options.orientation == 'left') {
      this.body.dom.left.appendChild(this.dom.frame);
    }
    if (this.options.orientation == 'right') {
      this.body.dom.right.appendChild(this.dom.frame);
    }
  }

  if (!this.dom.lineContainer.parentNode) {
    this.body.dom.backgroundHorizontal.appendChild(this.dom.lineContainer);
  }
};

/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype.hide = function() {
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }

  if (this.dom.lineContainer.parentNode) {
    this.body.dom.backgroundHorizontal.removeChild(this.dom.lineContainer);
  }
};

/**
 * Set a range (start and end)
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
DataAxis.prototype.setRange = function (range) {
  if (!(range instanceof Range) && (!range || range.start === undefined || range.end === undefined)) {
    throw new TypeError('Range must be an instance of Range, ' + 'or an object containing start and end.');
  }
  this.yRange.start = range.start;
  this.yRange.end = range.end;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
DataAxis.prototype.redraw = function () {
  var props = this.props;
  var frame = this.dom.frame;

  // update classname
  frame.className = 'dataaxis';

  // calculate character width and height
  this._calculateCharSize();

  var orientation = this.options.orientation;
  var showMinorLabels = this.options.showMinorLabels;
  var showMajorLabels = this.options.showMajorLabels;

  // determine the width and height of the elemens for the axis
  props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
  props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

  props.minorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth;
  props.minorLineHeight = 1;
  props.majorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth;
  props.majorLineHeight = 1;

  //  take frame offline while updating (is almost twice as fast)
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

  this._redrawLabels();
};

/**
 * Repaint major and minor text labels and vertical grid lines
 * @private
 */
DataAxis.prototype._redrawLabels = function () {
  var orientation = this.options['orientation'];

  // calculate range and step (step such that we have space for 7 characters per label)
  var start = this.yRange.start;
  var end = this.yRange.end;
  var minimumStep = (this.props.minorCharHeight || 10); //in pixels
  var step = new DataStep(start, end, minimumStep, this.dom.frame.offsetHeight);
  this.step = step;

  // Move all DOM elements to a "redundant" list, where they
  // can be picked for re-use, and clear the lists with lines and texts.
  // At the end of the function _redrawLabels, left over elements will be cleaned up
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
  var stepPixels = this.dom.frame.offsetHeight / ((step.marginRange / step.step) + 1);
  var xFirstMajorLabel = undefined;

  this.valueAtZero = step.marginEnd;
  var marginStartPos = 0;
  var max = 0;
  while (step.hasNext() && max < 1000) {
    var y = Math.round(max * stepPixels);
    marginStartPos = max * stepPixels;
    var isMajor = step.isMajor();

    if (this.options['showMinorLabels'] && isMajor == false) {
      this._redrawMinorText(y - 2, step.getLabelMinor(), orientation);
    }

    if (isMajor && this.options['showMajorLabels']) {
      if (y > 0) {
        if (xFirstMajorLabel == undefined) {
          xFirstMajorLabel = y;
        }
        this._redrawMajorText(y - 2, step.getLabelMajor(), orientation);
      }
      this._redrawMajorLine(y, orientation);
    }
    else {
      this._redrawMinorLine(y, orientation);
    }

    step.next();
    max++;
  }

  this.conversionFactor = marginStartPos/step.marginRange;

  // create a major label on the left when needed
  if (this.options['showMajorLabels']) {
    var leftPoint = this._start;
    var leftText = step.getLabelMajor(leftPoint);
    var widthText = leftText.length * (this.props.majorCharWidth || 10) + 10; // upper bound estimation

    if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
      this._redrawMajorText(0, leftText, orientation);
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
    data[i].y = this.convertValue(data[i].y);
  }
  return data;
}

DataAxis.prototype.convertValue = function(value) {
  var invertedValue = this.valueAtZero - value;
  var convertedValue = invertedValue * this.conversionFactor;
  return convertedValue - 2; // the -2 is to compensate for the borders
}

/**
 * Create a minor label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._redrawMinorText = function (y, text, orientation) {
  // reuse redundant label
  var label = this.dom.redundant.minorTexts.shift();

  if (!label) {
    // create new label
    var content = document.createTextNode('');
    label = document.createElement('div');
    label.appendChild(content);
    label.className = 'yAxis minor';
    this.dom.frame.appendChild(label);
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

  label.style.top = y + 'px';
  //label.title = title;  // TODO: this is a heavy operation
};

/**
 * Create a Major label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._redrawMajorText = function (y, text, orientation) {
  // reuse redundant label
  var label = this.dom.redundant.majorTexts.shift();

  if (!label) {
    // create label
    var content = document.createTextNode(text);
    label = document.createElement('div');
    label.className = 'yAxis major';
    label.appendChild(content);
    this.dom.frame.appendChild(label);
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

  label.style.top = y + 'px';
};

/**
 * Create a minor line for the axis at position y
 * @param {Number} y
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._redrawMinorLine = function (y, orientation) {
  // reuse redundant line
  var line = this.dom.redundant.minorLines.shift();

  if (!line) {
    // create vertical line
    line = document.createElement('div');
    line.className = 'grid horizontal minor';
    this.dom.lineContainer.appendChild(line);
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
DataAxis.prototype._redrawMajorLine = function (y, orientation) {
  // reuse redundant line
  var line = this.dom.redundant.majorLines.shift();

  if (!line) {
    // create vertical line
    line = document.createElement('div');
    line.className = 'grid horizontal major';
    this.dom.lineContainer.appendChild(line);
  }
  this.dom.majorLines.push(line);

  if (orientation == 'left') {
    line.style.left = (this.width - 25) + 'px';
  }
  else {
    line.style.left = -1*(this.width - 25) + 'px';
  }
  line.style.top = y + 'px';
  line.style.width = this.props.majorLineWidth + 'px';
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
    this.dom.frame.appendChild(measureCharMinor);

    this.props.minorCharHeight = measureCharMinor.clientHeight;
    this.props.minorCharWidth = measureCharMinor.clientWidth;

    this.dom.frame.removeChild(measureCharMinor);
  }

  if (!('majorCharHeight' in this.props)) {
    var textMajor = document.createTextNode('0');
    var measureCharMajor = document.createElement('DIV');
    measureCharMajor.className = 'text major measure';
    measureCharMajor.appendChild(textMajor);
    this.dom.frame.appendChild(measureCharMajor);

    this.props.majorCharHeight = measureCharMajor.clientHeight;
    this.props.majorCharWidth = measureCharMajor.clientWidth;

    this.dom.frame.removeChild(measureCharMajor);
  }
};

/**
 * Snap a date to a rounded value.
 * The snap intervals are dependent on the current scale and step.
 * @param {Date} date   the date to be snapped.
 * @return {Date} snappedDate
 */
DataAxis.prototype.snap = function(date) {
  return this.step.snap(date);
};
