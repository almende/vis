////////////////////////////////////////////////////////////////////////////////
// Settings
//
// This module contains the handling of the default and custom settings for
// Graph3d.
//
// All the default handling of settings has been moved here; some specific
// handling of certain values has been left in the Graph3d code.
//
////////////////////////////////////////////////////////////////////////////////
var Camera       = require('./Camera');
var support      = require('./stylehandlers/Support');
var StyleHandler = require('./stylehandlers/StyleHandler');

var select = support.select;     // Local alias for given function


/**
 * Field names in the options hash which are of relevance to the user.
 *
 * Specifically, these are the fields which require no special handling,
 * and can be directly copied over.
 */
var OPTIONKEYS = [
  'width',
  'height',
  'xCenter',
  'yCenter',
  'filterLabel',
  'legendLabel',
  'xLabel',
  'yLabel',
  'zLabel',
  'xValueLabel',
  'yValueLabel',
  'zValueLabel',
  'dotSizeRatio',
  'showGrid',
  'showPerspective',
  'showShadow',
  'showAnimationControls',
  'keepAspectRatio',
  'verticalRatio',
  'animationInterval',
  'animationPreload',
  'animationAutoStart',
  'xBarWidth',
  'yBarWidth',
  'xMin',
  'xStep',
  'xMax',
  'yMin',
  'yStep',
  'yMax',
  'zMin',
  'zStep',
  'zMax',
  'valueMin',
  'valueMax',
  'axisColor',
  'gridColor',
  'showLegend'
];


/**
 * Default values for certain option fields.
 *
 * These are the values used when a Graph3d instance is initialized
 * without custom settings.
 *
 * If a field is not in this list, a default value of 'undefined' can
 * be assumed. Of course, it does no harm to set a field explicitly to
 * 'undefined' here.
 *
 * A value of 'undefined' here normally means:
 *
 *     'derive from current data and graph style'
 *
 * In the code, this is indicated by the comment 'auto by default'.
 */
var DEFAULTS = {
  width            : '400px',
  height           : '400px',
  xLabel           : 'x',
  yLabel           : 'y',
  zLabel           : 'z',
  xValueLabel      : function(v) { return v; },
  yValueLabel      : function(v) { return v; },
  zValueLabel      : function(v) { return v; },
  filterLabel      : 'time',
  legendLabel      : 'value',
  showPerspective  : true,
  showGrid         : true,
  keepAspectRatio  : true,
  showShadow       : false,
  verticalRatio    : 0.5,       // 0.1 to 1.0, where 1.0 results in a 'cube'
  animationInterval: 1000,      // milliseconds
  animationPreload : false,
  xMin             : 0,
  xStep            : undefined, // auto by default
  xMax             : 1,
  yMin             : 0,
  yStep            : undefined, // auto by default
  yMax             : 1,
  zMin             : 0,
  zStep            : undefined, // auto by default
  zMax             : 1,
  valueMin         : 0,
  valueMax         : 1,
  xBarWidth        : 1,
  yBarWidth        : 1,
  axisColor        : '#4D4D4D',
  gridColor        : '#D3D3D3',

  // size of the dots as a fraction of the graph width
  dotSizeRatio     : 0.02,

  showLegend       : undefined, // auto by default (based on graph style)
  xBarWidth        : undefined, // auto by default
  yBarWidth        : undefined, // auto by default
  style            : StyleHandler.STYLE.DOT,

  dataColor        : {
    fill       : '#7DC1FF',
    stroke     : '#3267D2',
    strokeWidth: 1              // px
  },

  cameraPosition: {
    horizontal: 1.0,
    vertical  : 0.5,
    distance  : 1.7
  },


  // Following not in defaults (yet) but present in user settings
  //'xCenter',
  //'yCenter',
  //'showAnimationControls',
  //'animationAutoStart',

  //
  // Sleight of hand:
  //
  // Values below intentionally start with a capital; these are NOT copied to
  // the active options as used in the Graph3d instance.
  // The values mentioned are used directly in the code.
  //
  // This hackish approach retains the original working of the code.
  // Chances are, it will disappear with future progress.
  //
  XCenter       : '55%',
  YCenter       : '50%',
  ShowLegend    : false,


  // Other values used explicitly in code.
  // These will be 'undefined', which is OK.
  //
  // XMin, XMax, XStep,
  // YMin, YMax, YStep,
  // ZMin, ZMax, ZStep,
  // ValueMin, ValueMax,
};


function setStyle(style, dst) {
  if (style === undefined) {
    return;   // Nothing to do
  }

  var styleNumber;

  if (typeof style === 'string') {
    styleNumber = StyleHandler.getStyleNumber(style);

   if (styleNumber === -1 ) {
     return;   // string value of style invalid. TODO: generate error here?
   }
  } else {
    // Do a pedantic check on style number value
    var valid = false;
    for (var n in StyleHandler.STYLE) {
      if (StyleHandler.STYLE[n] === style) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      throw 'Value style = ' + style + ' is invalid';
    }

    styleNumber = style;
  }

  dst.style         = styleNumber;
  dst._styleHandler = StyleHandler.init(dst.style);
}


/**
 * Set the background styling for the graph
 * @param {string | {fill: string, stroke: string, strokeWidth: string}} backgroundColor
 */
function setBackgroundColor(backgroundColor, dst) {
  var bgColor     = backgroundColor;
  var fill        = 'white';
  var stroke      = 'gray';
  var strokeWidth = 1;

  if (typeof(bgColor) === 'string') {
    fill        = bgColor;
    stroke      = 'none';
    strokeWidth = 0;
  } else if (typeof(bgColor) === 'object') {
    fill        = select(bgColor.fill       , fill);
    stroke      = select(bgColor.stroke     , stroke);
    strokeWidth = select(bgColor.strokeWidth, strokeWidth);
  } else if  (bgColor === undefined) {
    // use defaults
  } else {
    throw 'Unsupported type of backgroundColor';
  }

  dst.frame.style.backgroundColor = fill;
  dst.frame.style.borderColor     = stroke;
  dst.frame.style.borderWidth     = strokeWidth + 'px';
  dst.frame.style.borderStyle     = 'solid';
}


function setDataColor(dataColor, dst) {
  if (dataColor === undefined) {
    return;    // Nothing to do
  }

  if (dst.dataColor === undefined) {
    dst.dataColor = {};
  }

  if (typeof dataColor === 'string') {
    dst.dataColor.fill   = dataColor;
    dst.dataColor.stroke = dataColor;
  }
  else {
    if (dataColor.fill) {
      dst.dataColor.fill = dataColor.fill;
    }
    if (dataColor.stroke) {
      dst.dataColor.stroke = dataColor.stroke;
    }
    if (dataColor.strokeWidth !== undefined) {
      dst.dataColor.strokeWidth = dataColor.strokeWidth;
    }
  }
}


function setCameraPosition(cameraPosition, dst) {
  var camPos = cameraPosition;
  if (camPos === undefined) {
    return;
  }

  if (dst.camera === undefined) {
    dst.camera = new Camera();
  }

  dst.camera.setArmRotation(camPos.horizontal, camPos.vertical);
  dst.camera.setArmLength(camPos.distance);
}


/**
 * Special handling for certain parameters
 *
 * 'Special' here means: setting requires more than a simple copy
 */
function setSpecialSettings(src, dst) {
  setStyle(src.style, dst);

  if (src.tooltip !== undefined) {
    dst.showTooltip = src.tooltip;
  }

  if (src.backgroundColor !== undefined) {
    setBackgroundColor(src.backgroundColor, dst);
  }

  setCameraPosition(src.cameraPosition, dst);
  setDataColor(src.dataColor, dst);
}


/**
 * Copy the values from DEFAULTS into dst.
 *
 * The values in DEFAULTS will have precedence.
 * Param dst assumed to be the Graph3d instance.
 */
function setDefaults(dst) {
  var src = DEFAULTS;
  support.copy(src, dst, OPTIONKEYS);

  // Other fields which apparently are not part of the user options
  dst.margin         = 10;        // px
  dst.showGrayBottom = false;     // TODO: this does not work correctly
  dst.showTooltip    = false;

  setSpecialSettings(src, dst);
}


/**
 * Merge the values from src into dst
 *
 * src values are considered to be user-defined options.
 *
 * dst values are the currently active values in the Graph3d instance.
 * For now, dst is in fact assumed to be the Graph3d instance.
 */
function merge(src, dst) {
  if (src === undefined) {
    return;   // Nothing to do
  }

  // retrieve simple parameter values
  support.safeCopy(src, dst, OPTIONKEYS);
  setSpecialSettings(src, dst);
}


module.exports.DEFAULTS    = DEFAULTS;
module.exports.setDefaults = setDefaults;
module.exports.merge       = merge;
