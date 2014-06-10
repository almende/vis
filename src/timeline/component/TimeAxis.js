/**
 * A horizontal time axis
 * @param {{dom: Object, props: Object, emitter: Emitter, range: Range}} timeline
 * @param {Object} [options]        See TimeAxis.setOptions for the available
 *                                  options.
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (timeline, options) {
  this.dom = {
    foreground: null,
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

  this.timeline = timeline;

  // create the HTML DOM
  this._create();
}

TimeAxis.prototype = new Component();

/**
 * Set parameters for the timeaxis.
 * Parameters will be merged in current parameter set.
 * @param {Object} options  Available parameters:
 *                          {string} [orientation]
 *                          {boolean} [showMinorLabels]
 *                          {boolean} [showMajorLabels]
 */
TimeAxis.prototype.setOptions = Component.prototype.setOptions;

/**
 * Create the HTML DOM for the TimeAxis
 */
TimeAxis.prototype._create = function _create() {
  this.dom.foreground = document.createElement('div');
  this.dom.background = document.createElement('div');

  this.dom.foreground.className = 'timeaxis foreground';
  this.dom.background.className = 'timeaxis background';
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
TimeAxis.prototype.redraw = function () {
  var options = this.options,
      props = this.props,
      foreground = this.dom.foreground,
      background = this.dom.background;

  // determine the correct parent DOM element (depending on option orientation)
  var parent = (options.orientation == 'top') ? this.timeline.dom.top : this.timeline.dom.bottom;
  var parentChanged = (foreground.parentNode !== parent);

  // calculate character width and height
  this._calculateCharSize();

  // TODO: recalculate sizes only needed when parent is resized or options is changed
  var orientation = this.getOption('orientation'),
      showMinorLabels = this.getOption('showMinorLabels'),
      showMajorLabels = this.getOption('showMajorLabels');

  // determine the width and height of the elemens for the axis
  props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
  props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;
  props.height = props.minorLabelHeight + props.majorLabelHeight;
  props.width = foreground.offsetWidth;

  props.minorLineHeight = this.timeline.props.root.height - props.majorLabelHeight -
      (options.orientation == 'top' ? this.timeline.props.bottom.height : this.timeline.props.top.height);
  props.minorLineWidth = 1; // TODO: really calculate width
  props.majorLineHeight = props.minorLineHeight + props.majorLabelHeight;
  props.majorLineWidth = 1; // TODO: really calculate width

  //  take foreground and background offline while updating (is almost twice as fast)
  var foregroundNextSibling = foreground.nextSibling;
  var backgroundNextSibling = background.nextSibling;
  foreground.parentNode && foreground.parentNode.removeChild(foreground);
  background.parentNode && background.parentNode.removeChild(background);

  foreground.style.height = this.props.height + 'px';

  this._repaintLabels();

  // put DOM online again (at the same place)
  if (foregroundNextSibling) {
    parent.insertBefore(foreground, foregroundNextSibling);
  }
  else {
    parent.appendChild(foreground)
  }
  if (backgroundNextSibling) {
    this.timeline.dom.backgroundVertical.insertBefore(background, backgroundNextSibling);
  }
  else {
    this.timeline.dom.backgroundVertical.appendChild(background)
  }

  return this._isResized() || parentChanged;
};

/**
 * Repaint major and minor text labels and vertical grid lines
 * @private
 */
TimeAxis.prototype._repaintLabels = function () {
  var orientation = this.getOption('orientation');

  // calculate range and step (step such that we have space for 7 characters per label)
  var start = util.convert(this.timeline.range.start, 'Number'),
      end = util.convert(this.timeline.range.end, 'Number'),
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
    this.dom.foreground.appendChild(label);
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
    this.dom.foreground.appendChild(label);
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
    this.dom.background.appendChild(line);
  }
  this.dom.minorLines.push(line);

  var props = this.props;
  if (orientation == 'top') {
    line.style.top = props.majorLabelHeight + 'px';
  }
  else {
    line.style.top = this.timeline.props.top.height + 'px';
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
    this.dom.background.appendChild(line);
  }
  this.dom.majorLines.push(line);

  var props = this.props;
  if (orientation == 'top') {
    line.style.top = '0';
  }
  else {
    line.style.top = this.timeline.props.top.height + 'px';
  }
  line.style.left = (x - props.majorLineWidth / 2) + 'px';
  line.style.height = props.majorLineHeight + 'px';
};

/**
 * Determine the size of text on the axis (both major and minor axis).
 * The size is calculated only once and then cached in this.props.
 * @private
 */
TimeAxis.prototype._calculateCharSize = function () {
  // Note: We calculate char size with every redraw. Size may change, for
  // example when any of the timelines parents had display:none for example.

  // determine the char width and height on the minor axis
  if (!this.dom.measureCharMinor) {
    this.dom.measureCharMinor = document.createElement('DIV');
    this.dom.measureCharMinor.className = 'text minor measure';
    this.dom.measureCharMinor.style.position = 'absolute';

    this.dom.measureCharMinor.appendChild(document.createTextNode('0'));
    this.dom.foreground.appendChild(this.dom.measureCharMinor);
  }
  this.props.minorCharHeight = this.dom.measureCharMinor.clientHeight;
  this.props.minorCharWidth = this.dom.measureCharMinor.clientWidth;

  // determine the char width and height on the major axis
  if (!this.dom.measureCharMajor) {
    this.dom.measureCharMajor = document.createElement('DIV');
    this.dom.measureCharMajor.className = 'text minor measure';
    this.dom.measureCharMajor.style.position = 'absolute';

    this.dom.measureCharMajor.appendChild(document.createTextNode('0'));
    this.dom.foreground.appendChild(this.dom.measureCharMajor);
  }
  this.props.majorCharHeight = this.dom.measureCharMajor.clientHeight;
  this.props.majorCharWidth = this.dom.measureCharMajor.clientWidth;
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
