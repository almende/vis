var util = require('../../util');
var DOMutil = require('../../DOMutil');
var Component = require('./Component');
var DataStep = require('../DataStep');

/**
 * A horizontal time axis
 * @param {Object} [options]        See DataAxis.setOptions for the available
 *                                  options.
 * @constructor DataAxis
 * @extends Component
 * @param body
 */
function DataAxis (body, options, svg, linegraphOptions) {
  this.id = util.randomUUID();
  this.body = body;

  this.defaultOptions = {
    orientation: 'left',  // supported: 'left', 'right'
    showMinorLabels: true,
    showMajorLabels: true,
    icons: true,
    majorLinesOffset: 7,
    minorLinesOffset: 4,
    labelOffsetX: 10,
    labelOffsetY: 2,
    iconWidth: 20,
    width: '40px',
    visible: true,
    customRange: {
      left: {min:undefined, max:undefined},
      right: {min:undefined, max:undefined}
    }
  };

  this.linegraphOptions = linegraphOptions;
  this.linegraphSVG = svg;
  this.props = {};
  this.DOMelements = { // dynamic elements
    lines: {},
    labels: {}
  };

  this.dom = {};

  this.range = {start:0, end:0};

  this.options = util.extend({}, this.defaultOptions);
  this.conversionFactor = 1;

  this.setOptions(options);
  this.width = Number(('' + this.options.width).replace("px",""));
  this.minWidth = this.width;
  this.height = this.linegraphSVG.offsetHeight;

  this.stepPixels = 25;
  this.stepPixelsForced = 25;
  this.lineOffset = 0;
  this.master = true;
  this.svgElements = {};


  this.groups = {};
  this.amountOfGroups = 0;

  // create the HTML DOM
  this._create();
}

DataAxis.prototype = new Component();



DataAxis.prototype.addGroup = function(label, graphOptions) {
  if (!this.groups.hasOwnProperty(label)) {
    this.groups[label] = graphOptions;
  }
  this.amountOfGroups += 1;
};

DataAxis.prototype.updateGroup = function(label, graphOptions) {
  this.groups[label] = graphOptions;
};

DataAxis.prototype.removeGroup = function(label) {
  if (this.groups.hasOwnProperty(label)) {
    delete this.groups[label];
    this.amountOfGroups -= 1;
  }
};


DataAxis.prototype.setOptions = function (options) {
  if (options) {
    var redraw = false;
    if (this.options.orientation != options.orientation && options.orientation !== undefined) {
      redraw = true;
    }
    var fields = [
      'orientation',
      'showMinorLabels',
      'showMajorLabels',
      'icons',
      'majorLinesOffset',
      'minorLinesOffset',
      'labelOffsetX',
      'labelOffsetY',
      'iconWidth',
      'width',
      'visible',
      'customRange'
    ];
    util.selectiveExtend(fields, this.options, options);

    this.minWidth = Number(('' + this.options.width).replace("px",""));

    if (redraw == true && this.dom.frame) {
      this.hide();
      this.show();
    }
  }
};


/**
 * Create the HTML DOM for the DataAxis
 */
DataAxis.prototype._create = function() {
  this.dom.frame = document.createElement('div');
  this.dom.frame.style.width = this.options.width;
  this.dom.frame.style.height = this.height;

  this.dom.lineContainer = document.createElement('div');
  this.dom.lineContainer.style.width = '100%';
  this.dom.lineContainer.style.height = this.height;

  // create svg element for graph drawing.
  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = "absolute";
  this.svg.style.top = '0px';
  this.svg.style.height = '100%';
  this.svg.style.width = '100%';
  this.svg.style.display = "block";
  this.dom.frame.appendChild(this.svg);
};

DataAxis.prototype._redrawGroupIcons = function () {
  DOMutil.prepareElements(this.svgElements);

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
      if (this.groups[groupId].visible == true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] == true)) {
        this.groups[groupId].drawIcon(x, y, this.svgElements, this.svg, iconWidth, iconHeight);
        y += iconHeight + iconOffset;
      }
    }
  }

  DOMutil.cleanupElements(this.svgElements);
};

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
    this.dom.lineContainer.parentNode.removeChild(this.dom.lineContainer);
  }
};

/**
 * Set a range (start and end)
 * @param end
 * @param start
 * @param end
 */
DataAxis.prototype.setRange = function (start, end) {
  this.range.start = start;
  this.range.end = end;
};

/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
DataAxis.prototype.redraw = function () {
  var changeCalled = false;
  var activeGroups = 0;
  for (var groupId in this.groups) {
    if (this.groups.hasOwnProperty(groupId)) {
      if (this.groups[groupId].visible == true && (this.linegraphOptions.visibility[groupId] === undefined || this.linegraphOptions.visibility[groupId] == true)) {
        activeGroups++;
      }
    }
  }
  if (this.amountOfGroups == 0 || activeGroups == 0) {
    this.hide();
  }
  else {
    this.show();
    this.height = Number(this.linegraphSVG.style.height.replace("px",""));
    // svg offsetheight did not work in firefox and explorer...

    this.dom.lineContainer.style.height = this.height + 'px';
    this.width = this.options.visible == true ? Number(('' + this.options.width).replace("px","")) : 0;

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

    props.minorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth - this.lineOffset - this.width + 2 * this.options.minorLinesOffset;
    props.minorLineHeight = 1;
    props.majorLineWidth = this.body.dom.backgroundHorizontal.offsetWidth - this.lineOffset - this.width + 2 * this.options.majorLinesOffset;
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
    changeCalled = this._redrawLabels();
    if (this.options.icons == true) {
      this._redrawGroupIcons();
    }
  }
  return changeCalled;
};

/**
 * Repaint major and minor text labels and vertical grid lines
 * @private
 */
DataAxis.prototype._redrawLabels = function () {
  DOMutil.prepareElements(this.DOMelements.lines);
  DOMutil.prepareElements(this.DOMelements.labels);

  var orientation = this.options['orientation'];

  // calculate range and step (step such that we have space for 7 characters per label)
  var minimumStep = this.master ? this.props.majorCharHeight || 10 : this.stepPixelsForced;

  var step = new DataStep(this.range.start, this.range.end, minimumStep, this.dom.frame.offsetHeight, this.options.customRange[this.options.orientation]);
  this.step = step;
  // get the distance in pixels for a step
  // dead space is space that is "left over" after a step
  var stepPixels = (this.dom.frame.offsetHeight - (step.deadSpace * (this.dom.frame.offsetHeight / step.marginRange))) / (((step.marginRange - step.deadSpace) / step.step));
  this.stepPixels = stepPixels;

  var amountOfSteps = this.height / stepPixels;
  var stepDifference = 0;

  if (this.master == false) {
    stepPixels = this.stepPixelsForced;
    stepDifference = Math.round((this.dom.frame.offsetHeight / stepPixels) - amountOfSteps);
    for (var i = 0; i < 0.5 * stepDifference; i++) {
      step.previous();
    }
    amountOfSteps = this.height / stepPixels;
  }
  else {
    amountOfSteps += 0.25;
  }


  this.valueAtZero = step.marginEnd;
  var marginStartPos = 0;

  // do not draw the first label
  var max = 1;

  this.maxLabelSize = 0;
  var y = 0;
  while (max < Math.round(amountOfSteps)) {
    step.next();
    y = Math.round(max * stepPixels);
    marginStartPos = max * stepPixels;
    var isMajor = step.isMajor();

    if (this.options['showMinorLabels'] && isMajor == false || this.master == false && this.options['showMinorLabels'] == true) {
      this._redrawLabel(y - 2, step.getCurrent(), orientation, 'yAxis minor', this.props.minorCharHeight);
    }

    if (isMajor && this.options['showMajorLabels'] && this.master == true ||
        this.options['showMinorLabels'] == false && this.master == false && isMajor == true) {
      if (y >= 0) {
        this._redrawLabel(y - 2, step.getCurrent(), orientation, 'yAxis major', this.props.majorCharHeight);
      }
      this._redrawLine(y, orientation, 'grid horizontal major', this.options.majorLinesOffset, this.props.majorLineWidth);
    }
    else {
      this._redrawLine(y, orientation, 'grid horizontal minor', this.options.minorLinesOffset, this.props.minorLineWidth);
    }

    max++;
  }

  if (this.master == false) {
    this.conversionFactor = y / (this.valueAtZero - step.current);
  }
  else {
    this.conversionFactor = this.dom.frame.offsetHeight / step.marginRange;
  }

  var offset = this.options.icons == true ? this.options.iconWidth + this.options.labelOffsetX + 15 : this.options.labelOffsetX + 15;
  // this will resize the yAxis to accomodate the labels.
  if (this.maxLabelSize > (this.width - offset) && this.options.visible == true) {
    this.width = this.maxLabelSize + offset;
    this.options.width = this.width + "px";
    DOMutil.cleanupElements(this.DOMelements.lines);
    DOMutil.cleanupElements(this.DOMelements.labels);
    this.redraw();
    return true;
  }
  // this will resize the yAxis if it is too big for the labels.
  else if (this.maxLabelSize < (this.width - offset) && this.options.visible == true && this.width > this.minWidth) {
    this.width = Math.max(this.minWidth,this.maxLabelSize + offset);
    this.options.width = this.width + "px";
    DOMutil.cleanupElements(this.DOMelements.lines);
    DOMutil.cleanupElements(this.DOMelements.labels);
    this.redraw();
    return true;
  }
  else {
    DOMutil.cleanupElements(this.DOMelements.lines);
    DOMutil.cleanupElements(this.DOMelements.labels);
    return false;
  }
};

DataAxis.prototype.convertValue = function (value) {
  var invertedValue = this.valueAtZero - value;
  var convertedValue = invertedValue * this.conversionFactor;
  return convertedValue;
};

/**
 * Create a label for the axis at position x
 * @private
 * @param y
 * @param text
 * @param orientation
 * @param className
 * @param characterHeight
 */
DataAxis.prototype._redrawLabel = function (y, text, orientation, className, characterHeight) {
  // reuse redundant label
  var label = DOMutil.getDOMElement('div',this.DOMelements.labels, this.dom.frame); //this.dom.redundant.labels.shift();
  label.className = className;
  label.innerHTML = text;
  if (orientation == 'left') {
    label.style.left = '-' + this.options.labelOffsetX + 'px';
    label.style.textAlign = "right";
  }
  else {
    label.style.right = '-' + this.options.labelOffsetX + 'px';
    label.style.textAlign = "left";
  }

  label.style.top = y - 0.5 * characterHeight + this.options.labelOffsetY + 'px';

  text += '';

  var largestWidth = Math.max(this.props.majorCharWidth,this.props.minorCharWidth);
  if (this.maxLabelSize < text.length * largestWidth) {
    this.maxLabelSize = text.length * largestWidth;
  }
};

/**
 * Create a minor line for the axis at position y
 * @param y
 * @param orientation
 * @param className
 * @param offset
 * @param width
 */
DataAxis.prototype._redrawLine = function (y, orientation, className, offset, width) {
  if (this.master == true) {
    var line = DOMutil.getDOMElement('div',this.DOMelements.lines, this.dom.lineContainer);//this.dom.redundant.lines.shift();
    line.className = className;
    line.innerHTML = '';

    if (orientation == 'left') {
      line.style.left = (this.width - offset) + 'px';
    }
    else {
      line.style.right = (this.width - offset) + 'px';
    }

    line.style.width = width + 'px';
    line.style.top = y + 'px';
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

module.exports = DataAxis;
