/**
 * A horizontal time axis
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See TimeAxis.setOptions for the available
 *                                  options.
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (parent, depends, options) {
  this.id = util.randomUUID();
  this.parent = parent;
  this.depends = depends;

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

  this.conversion = null;
  this.range = null;
}

TimeAxis.prototype = new Component();

// TODO: comment options
TimeAxis.prototype.setOptions = Component.prototype.setOptions;

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
 * Convert a position on screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
TimeAxis.prototype.toTime = function(x) {
  var conversion = this.conversion;
  return new Date(x / conversion.scale + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 * @private
 */
TimeAxis.prototype.toScreen = function(time) {
  var conversion = this.conversion;
  return (time.valueOf() - conversion.offset) * conversion.scale;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
TimeAxis.prototype.repaint = function () {
  var changed = 0,
      update = util.updateProperty,
      asSize = util.option.asSize,
      options = this.options,
      orientation = this.getOption('orientation'),
      props = this.props,
      step = this.step;

  var frame = this.frame;
  if (!frame) {
    frame = document.createElement('div');
    this.frame = frame;
    changed += 1;
  }
  frame.className = 'axis';
  // TODO: custom className?

  if (!frame.parentNode) {
    if (!this.parent) {
      throw new Error('Cannot repaint time axis: no parent attached');
    }
    var parentContainer = this.parent.getContainer();
    if (!parentContainer) {
      throw new Error('Cannot repaint time axis: parent has no container element');
    }
    parentContainer.appendChild(frame);

    changed += 1;
  }

  var parent = frame.parentNode;
  if (parent) {
    var beforeChild = frame.nextSibling;
    parent.removeChild(frame); //  take frame offline while updating (is almost twice as fast)

    var defaultTop = (orientation == 'bottom' && this.props.parentHeight && this.height) ?
        (this.props.parentHeight - this.height) + 'px' :
        '0px';
    changed += update(frame.style, 'top', asSize(options.top, defaultTop));
    changed += update(frame.style, 'left', asSize(options.left, '0px'));
    changed += update(frame.style, 'width', asSize(options.width, '100%'));
    changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));

    // get characters width and height
    this._repaintMeasureChars();

    if (this.step) {
      this._repaintStart();

      step.first();
      var xFirstMajorLabel = undefined;
      var max = 0;
      while (step.hasNext() && max < 1000) {
        max++;
        var cur = step.getCurrent(),
            x = this.toScreen(cur),
            isMajor = step.isMajor();

        // TODO: lines must have a width, such that we can create css backgrounds

        if (this.getOption('showMinorLabels')) {
          this._repaintMinorText(x, step.getLabelMinor());
        }

        if (isMajor && this.getOption('showMajorLabels')) {
          if (x > 0) {
            if (xFirstMajorLabel == undefined) {
              xFirstMajorLabel = x;
            }
            this._repaintMajorText(x, step.getLabelMajor());
          }
          this._repaintMajorLine(x);
        }
        else {
          this._repaintMinorLine(x);
        }

        step.next();
      }

      // create a major label on the left when needed
      if (this.getOption('showMajorLabels')) {
        var leftTime = this.toTime(0),
            leftText = step.getLabelMajor(leftTime),
            widthText = leftText.length * (props.majorCharWidth || 10) + 10; // upper bound estimation

        if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
          this._repaintMajorText(0, leftText);
        }
      }

      this._repaintEnd();
    }

    this._repaintLine();

    // put frame online again
    if (beforeChild) {
      parent.insertBefore(frame, beforeChild);
    }
    else {
      parent.appendChild(frame)
    }
  }

  return (changed > 0);
};

/**
 * Start a repaint. Move all DOM elements to a redundant list, where they
 * can be picked for re-use, or can be cleaned up in the end
 * @private
 */
TimeAxis.prototype._repaintStart = function () {
  var dom = this.dom,
      redundant = dom.redundant;

  redundant.majorLines = dom.majorLines;
  redundant.majorTexts = dom.majorTexts;
  redundant.minorLines = dom.minorLines;
  redundant.minorTexts = dom.minorTexts;

  dom.majorLines = [];
  dom.majorTexts = [];
  dom.minorLines = [];
  dom.minorTexts = [];
};

/**
 * End a repaint. Cleanup leftover DOM elements in the redundant list
 * @private
 */
TimeAxis.prototype._repaintEnd = function () {
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
 * @private
 */
TimeAxis.prototype._repaintMinorText = function (x, text) {
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
  label.style.left = x + 'px';
  label.style.top  = this.props.minorLabelTop + 'px';
  //label.title = title;  // TODO: this is a heavy operation
};

/**
 * Create a Major label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @private
 */
TimeAxis.prototype._repaintMajorText = function (x, text) {
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
  label.style.top = this.props.majorLabelTop + 'px';
  label.style.left = x + 'px';
  //label.title = title; // TODO: this is a heavy operation
};

/**
 * Create a minor line for the axis at position x
 * @param {Number} x
 * @private
 */
TimeAxis.prototype._repaintMinorLine = function (x) {
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
  line.style.top = props.minorLineTop + 'px';
  line.style.height = props.minorLineHeight + 'px';
  line.style.left = (x - props.minorLineWidth / 2) + 'px';
};

/**
 * Create a Major line for the axis at position x
 * @param {Number} x
 * @private
 */
TimeAxis.prototype._repaintMajorLine = function (x) {
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
  line.style.top = props.majorLineTop + 'px';
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
      options = this.options;

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

    line.style.top = this.props.lineTop + 'px';
  }
  else {
    if (line && line.parentElement) {
      frame.removeChild(line.line);
      delete this.dom.line;
    }
  }
};

/**
 * Create characters used to determine the size of text on the axis
 * @private
 */
TimeAxis.prototype._repaintMeasureChars = function () {
  // calculate the width and height of a single character
  // this is used to calculate the step size, and also the positioning of the
  // axis
  var dom = this.dom,
      text;

  if (!dom.measureCharMinor) {
    text = document.createTextNode('0');
    var measureCharMinor = document.createElement('DIV');
    measureCharMinor.className = 'text minor measure';
    measureCharMinor.appendChild(text);
    this.frame.appendChild(measureCharMinor);

    dom.measureCharMinor = measureCharMinor;
  }

  if (!dom.measureCharMajor) {
    text = document.createTextNode('0');
    var measureCharMajor = document.createElement('DIV');
    measureCharMajor.className = 'text major measure';
    measureCharMajor.appendChild(text);
    this.frame.appendChild(measureCharMajor);

    dom.measureCharMajor = measureCharMajor;
  }
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
TimeAxis.prototype.reflow = function () {
  var changed = 0,
      update = util.updateProperty,
      frame = this.frame,
      range = this.range;

  if (!range) {
    throw new Error('Cannot repaint time axis: no range configured');
  }

  if (frame) {
    changed += update(this, 'top', frame.offsetTop);
    changed += update(this, 'left', frame.offsetLeft);

    // calculate size of a character
    var props = this.props,
        showMinorLabels = this.getOption('showMinorLabels'),
        showMajorLabels = this.getOption('showMajorLabels'),
        measureCharMinor = this.dom.measureCharMinor,
        measureCharMajor = this.dom.measureCharMajor;
    if (measureCharMinor) {
      props.minorCharHeight = measureCharMinor.clientHeight;
      props.minorCharWidth = measureCharMinor.clientWidth;
    }
    if (measureCharMajor) {
      props.majorCharHeight = measureCharMajor.clientHeight;
      props.majorCharWidth = measureCharMajor.clientWidth;
    }

    var parentHeight = frame.parentNode ? frame.parentNode.offsetHeight : 0;
    if (parentHeight != props.parentHeight) {
      props.parentHeight = parentHeight;
      changed += 1;
    }
    switch (this.getOption('orientation')) {
      case 'bottom':
        props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
        props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

        props.minorLabelTop = 0;
        props.majorLabelTop = props.minorLabelTop + props.minorLabelHeight;

        props.minorLineTop = -this.top;
        props.minorLineHeight = Math.max(this.top + props.majorLabelHeight, 0);
        props.minorLineWidth = 1; // TODO: really calculate width

        props.majorLineTop = -this.top;
        props.majorLineHeight = Math.max(this.top + props.minorLabelHeight + props.majorLabelHeight, 0);
        props.majorLineWidth = 1; // TODO: really calculate width

        props.lineTop = 0;

        break;

      case 'top':
        props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
        props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

        props.majorLabelTop = 0;
        props.minorLabelTop = props.majorLabelTop + props.majorLabelHeight;

        props.minorLineTop = props.minorLabelTop;
        props.minorLineHeight = Math.max(parentHeight - props.majorLabelHeight - this.top);
        props.minorLineWidth = 1; // TODO: really calculate width

        props.majorLineTop = 0;
        props.majorLineHeight = Math.max(parentHeight - this.top);
        props.majorLineWidth = 1; // TODO: really calculate width

        props.lineTop = props.majorLabelHeight +  props.minorLabelHeight;

        break;

      default:
        throw new Error('Unkown orientation "' + this.getOption('orientation') + '"');
    }

    var height = props.minorLabelHeight + props.majorLabelHeight;
    changed += update(this, 'width', frame.offsetWidth);
    changed += update(this, 'height', height);

    // calculate range and step
    this._updateConversion();

    var start = util.convert(range.start, 'Number'),
        end = util.convert(range.end, 'Number'),
        minimumStep = this.toTime((props.minorCharWidth || 10) * 5).valueOf()
            -this.toTime(0).valueOf();
    this.step = new TimeStep(new Date(start), new Date(end), minimumStep);
    changed += update(props.range, 'start', start);
    changed += update(props.range, 'end', end);
    changed += update(props.range, 'minimumStep', minimumStep.valueOf());
  }

  return (changed > 0);
};

/**
 * Calculate the scale and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods toTime
 * and toScreen can be used.
 * @private
 */
TimeAxis.prototype._updateConversion = function() {
  var range = this.range;
  if (!range) {
    throw new Error('No range configured');
  }

  if (range.conversion) {
    this.conversion = range.conversion(this.width);
  }
  else {
    this.conversion = Range.conversion(range.start, range.end, this.width);
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
