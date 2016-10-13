var StepNumber   = require('../StepNumber');


function derive(child, parent) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
}


/**
 *
 * @param fields  array of fields to copy; if not defined, copy all fields present in src.
 */
function safeCopy(src, dst, fields) {

  if (fields === undefined) {
    // If no explicit fields given, copy all known keys from src
    fields = Object.keys(src);
  }

  for (var i in fields) {
    var field = fields[i];

    if (src[field] !== undefined) {
      dst[field] = src[field];
    }
  }
}


/**
 * Calculate the translations and screen positions of all points
 */
function calcTranslations(graph3d, points, sort) {
  //console.log('Called calcTranslations');
  if (sort === undefined) {
    sort = true;
  }

  for (var i = 0; i < points.length; i++) {
    var point    = points[i];
    point.trans  = graph3d._convertPointToTranslation(point.point);
    point.screen = graph3d._convertTranslationToScreen(point.trans);

    // calculate the translation of the point at the bottom (needed for sorting)
    var transBottom = graph3d._convertPointToTranslation(point.bottom);
    point.dist = graph3d.showPerspective ? transBottom.length() : -transBottom.z;
  }

  // sort the points on depth of their (x,y) position (not on z)
  if (!sort) {
    return;
  }

  var sortDepth = function (a, b) {
    return b.dist - a.dist;
  };
  points.sort(sortDepth);
}


//////////////////////////////////////////
// Functions for drawing the legends.
//////////////////////////////////////////


function getLegendDimensions(graph3d) {
  var tempHeight= Math.max(graph3d.frame.clientHeight * 0.25, 100);
  var tempWidth = 20; // px - overwritten by size legend
  var tempRight = graph3d.frame.clientWidth - graph3d.margin;
  var tempTop   = graph3d.margin;

  var ret = {
    height  : tempHeight,
    top     : graph3d.margin,
    width   : tempWidth,
    right   : tempRight,
    widthMin: 0,          // used in printValueText() only

    // Following fields are derived!
    left    : tempRight - tempWidth,
    bottom  : tempTop + tempHeight
  };

  return ret;
}


function drawColorBar(graph3d, ctx, dimensions) {
  var d    = dimensions;
  var ymin = 0;
  var ymax = d.height; // Todo: make height customizable
  var y;

  for (y = ymin; y < ymax; y++) {
    var f     = (y - ymin) / (ymax - ymin);
    var hue   = f * 240;
    var color = graph3d._hsv2rgb(hue, 1, 1);

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(d.left , d.top + y);
    ctx.lineTo(d.right, d.top + y);
    ctx.stroke();
  }
  ctx.strokeStyle =  graph3d.axisColor;
  ctx.strokeRect(d.left, d.top, d.width, d.height);
}



function drawSizeLegendBox(graph3d, ctx, dimensions) {
  var d = dimensions;

  ctx.strokeStyle = graph3d.axisColor;
  ctx.fillStyle   = graph3d.dataColor.fill;
  ctx.beginPath();
  ctx.moveTo(d.left, d.top);
  ctx.lineTo(d.right, d.top);
  ctx.lineTo(d.right - d.width + d.widthMin, d.bottom);
  ctx.lineTo(d.left, d.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}


/**
 * Print value text along the legend edge
 *
 * @param isValueLegend  - If true, use style values; if false, use z values.
 */
function printValueText(graph3d, ctx, dimensions, isValueLegend) {
  var d           = dimensions;
  var gridLineLen = 5; // px
  var legendMin   = isValueLegend ? graph3d.valueMin :  graph3d.zMin;
  var legendMax   = isValueLegend ? graph3d.valueMax :  graph3d.zMax;

  // Following tests to prevent the browser from hanging.
  if (legendMin === undefined) {
    throw('printValueText(): legendMin undefined; can\'t continue');
  }

  if (legendMax === undefined) {
    throw('printValueText(): legendMax undefined; can\'t continue');
  }

  var step= new StepNumber(legendMin, legendMax, (legendMax-legendMin)/5, true);

  step.start();
  if (step.getCurrent() < legendMin) {
    step.next();
  }

  var y;
  while (!step.end()) {
    var tmpY = (step.getCurrent() - legendMin) / (legendMax - legendMin);
    y = d.bottom - tmpY * d.height;

    ctx.beginPath();
    ctx.moveTo(d.left - gridLineLen, y);
    ctx.lineTo(d.left, y);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = graph3d.axisColor;
    ctx.fillText(step.getCurrent(), d.left - 2 * gridLineLen, y);

    step.next();
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  var label = graph3d.legendLabel;
  ctx.fillText(label, d.right, d.bottom + graph3d.margin);
}


//////////////////////////////////////////
// End functions for drawing the legends.
//////////////////////////////////////////


module.exports.derive              = derive;
module.exports.safeCopy            = safeCopy;
module.exports.calcTranslations    = calcTranslations;
module.exports.getLegendDimensions = getLegendDimensions;
module.exports.drawColorBar        = drawColorBar;
module.exports.drawSizeLegendBox   = drawSizeLegendBox;
module.exports.printValueText      = printValueText;
