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
    orientation: 'left',  // supported: 'left', 'right'
    showMinorLabels: true,
    showMajorLabels: true,
    majorLinesOffset: 7,
    minorLinesOffset: 4,
    labelOffsetX: 10,
    labelOffsetY: 2,
    iconWidth: 20,
    width: '40px',
    height: '300px',
    visible: true
  };

  this.props = {};
  this.dom = {
    lines: [],
    labels: [],
    redundant: {
      lines: [],
      labels: []
    }
  };

  this.yRange = {start:0, end:0};

  this.options = util.extend({}, this.defaultOptions);
  this.conversionFactor = 1;

  this.setOptions(options);
  this.width = Number(this.options.width.replace("px",""));
  this.height = Number(this.options.height.replace("px",""));

  this.stepPixels = 25;
  this.stepPixelsForced = 25;
  this.lineOffset = 0;
  this.master = true;
  this.svgElements = {};
  this.drawIcons = false;

  this.groups = {};

  // create the HTML DOM
  this._create();
}

DataAxis.prototype = new Component();



DataAxis.prototype.addGroup = function(label, graphOptions) {
  if (!this.groups.hasOwnProperty(label)) {
    this.groups[label] = graphOptions;
  }
};

DataAxis.prototype.updateGroup = function(label, graphOptions) {
  this.groups[label] = graphOptions;
};

DataAxis.prototype.deleteGroup = function(label) {
  if (this.groups.hasOwnProperty(label)) {
    delete this.groups[label];
  }
};


DataAxis.prototype.setOptions = function(options) {
  if (options) {
    var redraw = false;
    if (this.options.orientation != options.orientation && options.orientation !== undefined) {
      redraw = true;
    }
    var fields = [
      'orientation',
      'showMinorLabels',
      'showMajorLabels',
      'majorLinesOffset',
      'minorLinesOffset',
      'labelOffsetX',
      'labelOffsetY',
      'iconWidth',
      'width',
      'height'];
    util.selectiveExtend(fields, this.options, options);

    if (redraw == true && this.dom.frame) {
      this.hide();
      this.show();
    }
  }
}


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

  // create svg element for graph drawing.
  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = "absolute";
  this.svg.style.top = '0px';
  this.svg.style.height = '100%';
  this.svg.style.width = '100%';
  this.svg.style.display = "block";
  this.dom.frame.appendChild(this.svg);
};

DataAxis.prototype._redrawGroupIcons = function() {
  var x;
  var iconWidth = this.options.iconWidth;
  var iconHeight = 15;
  var iconOffset = 4;
  var y = iconOffset + 0.5 * iconHeight;
  if (this.options.orientation == 'left') {
    x = iconOffset;
  }
  else {
    x = this.width - iconWidth - iconOffset;
  }

  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      this.groups[groupId].drawIcon(x, y, this.svgElements, this.svg, iconWidth, iconHeight);
      y += iconHeight + iconOffset;
    }
  }
}

/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype.show = function() {
  if (!this.dom.frame.parentNode) {
    if (this.options.orientation == 'left') {
      this.body.dom.left.appendChild(this.dom.frame);
    }
    else {
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

  props.minorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth - this.lineOffset - this.width + 2*this.options.minorLinesOffset;
  props.minorLineHeight = 1;
  props.majorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth - this.lineOffset - this.width + 2*this.options.majorLinesOffset;;
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
  if (this.drawIcons == true) {
    this._redrawGroupIcons();
  }
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
  step.first();


  // Move all DOM elements to a "redundant" list, where they
  // can be picked for re-use, and clear the lists with lines and texts.
  // At the end of the function _redrawLabels, left over elements will be cleaned up
  var dom = this.dom;
  dom.redundant.lines = dom.lines;
  dom.redundant.labels = dom.labels;
  dom.lines = [];
  dom.labels = [];

  var stepPixels = this.dom.frame.offsetHeight / ((step.marginRange / step.step) + 1);
  this.stepPixels = stepPixels;

  var amountOfSteps = this.height / stepPixels;
  var stepDifference = 0;

  if (this.master == false) {
    stepPixels = this.stepPixelsForced;
    stepDifference = Math.round((this.height / stepPixels) - amountOfSteps);
    for (var i = 0; i < 0.5 * stepDifference; i++) {
      step.previous();
    }
    amountOfSteps = this.height / stepPixels;
  }

  var xFirstMajorLabel = undefined;
  this.valueAtZero = step.marginEnd;
  var marginStartPos = 0;

  // do not draw the first label
  var max = 1;
  step.next();

  this.maxLabelSize = 0;
  var y = 0;
  while (max < Math.round(amountOfSteps)) {
    y = Math.round(max * stepPixels);
    marginStartPos = max * stepPixels;
    var isMajor = step.isMajor();

    if (this.options['showMinorLabels'] && isMajor == false) {
      this._redrawLabel(y - 2, step.current, orientation, 'yAxis minor', this.props.minorCharHeight);
    }

    if (isMajor && this.options['showMajorLabels']) {
      if (y >= 0) {
        if (xFirstMajorLabel == undefined) {
          xFirstMajorLabel = y;
        }
        this._redrawLabel(y - 2, step.current, orientation, 'yAxis major', this.props.majorCharHeight);
      }
      this._redrawMajorLine(y, orientation);
    }
    else {
      this._redrawMinorLine(y, orientation);
    }

    step.next();
    max++;
  }

  var offset = this.drawIcons == true ? this.options.iconWidth + this.options.labelOffsetX + 15 : this.options.labelOffsetX + 15;
  if (this.maxLabelSize > (this.width - offset)) {
    this.width = this.maxLabelSize + offset;
    this.options.width = this.width + "px";
    this.body.emitter.emit("changed");
    this.redraw();
    return;
  }


  this.conversionFactor = marginStartPos/((amountOfSteps-1) * step.step);

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
  return convertedValue; // the -2 is to compensate for the borders
}



/**
 * Create a label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._redrawLabel = function (y, text, orientation, className, characterHeight) {
  // reuse redundant label
  var label = this.dom.redundant.labels.shift();

  if (!label) {
    // create label
    var content = document.createTextNode(text);
    label = document.createElement('div');
    label.className = className;
    label.appendChild(content);
    this.dom.frame.appendChild(label);
  }
  this.dom.labels.push(label);

  label.childNodes[0].nodeValue = text;
  //label.title = title; // TODO: this is a heavy operation

  if (orientation == 'left') {
    label.style.left = '-' + this.options.labelOffsetX + 'px';
    label.style.textAlign = "right";
  }
  else {
    label.style.left = this.options.labelOffsetX + 'px';
    label.style.textAlign = "left";
  }

  label.style.top = y - 0.5 * characterHeight + this.options.labelOffsetY + 'px';

  text += '';

  var largestWidth = this.props.majorCharWidth > this.props.minorCharWidth ? this.props.majorCharWidth : this.props.minorCharWidth;
  if (this.maxLabelSize < text.length * largestWidth) {
    this.maxLabelSize = text.length * largestWidth;
  }


};

/**
 * Create a minor line for the axis at position y
 * @param {Number} y
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._redrawMinorLine = function (y, orientation) {
  if (this.master == true) {
    // reuse redundant line
    var line = this.dom.redundant.lines.shift();

    if (!line) {
      // create vertical line
      line = document.createElement('div');
      line.className = 'grid horizontal minor';
      this.dom.lineContainer.appendChild(line);
    }
    this.dom.lines.push(line);

    var props = this.props;
    if (orientation == 'left') {
      line.style.left = (this.width - this.options.minorLinesOffset) + 'px';
    }
    else {
      line.style.left = -1*(this.width - this.options.minorLinesOffset) + 'px';
    }

    line.style.width = props.minorLineWidth + 'px';
    line.style.top = y + 'px';
  }
};

/**
 * Create a Major line for the axis at position x
 * @param {Number} x
 * @param {String} orientation   "top" or "bottom" (default)
 * @private
 */
DataAxis.prototype._redrawMajorLine = function (y, orientation) {
  if (this.master == true) {
    // reuse redundant line
    var line = this.dom.redundant.lines.shift();

    if (!line) {
      // create vertical line
      line = document.createElement('div');
      line.className = 'grid horizontal major';
      this.dom.lineContainer.appendChild(line);
    }
    this.dom.lines.push(line);

    if (orientation == 'left') {
      line.style.left = (this.width - this.options.majorLinesOffset) + 'px';
    }
    else {
      line.style.left = -1*(this.width - this.options.majorLinesOffset) + 'px';
    }
    line.style.top = y + 'px';
    line.style.width = this.props.majorLineWidth + 'px';
  }
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
    measureCharMinor.className = 'yAxis minor measure';
    measureCharMinor.appendChild(textMinor);
    this.dom.frame.appendChild(measureCharMinor);

    this.props.minorCharHeight = measureCharMinor.clientHeight;
    this.props.minorCharWidth = measureCharMinor.clientWidth;

    this.dom.frame.removeChild(measureCharMinor);
  }

  if (!('majorCharHeight' in this.props)) {
    var textMajor = document.createTextNode('0');
    var measureCharMajor = document.createElement('DIV');
    measureCharMajor.className = 'yAxis major measure';
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


