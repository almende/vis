var DOMutil = require('../../../DOMutil');

function Points(groupId, options) {
  this.groupId = groupId;
  this.options = options;
}


Points.prototype.getYRange = function(groupData) {
  var yMin = groupData[0].y;
  var yMax = groupData[0].y;
  for (var j = 0; j < groupData.length; j++) {
    yMin = yMin > groupData[j].y ? groupData[j].y : yMin;
    yMax = yMax < groupData[j].y ? groupData[j].y : yMax;
  }
  return {min: yMin, max: yMax, yAxisOrientation: this.options.yAxisOrientation};
};

Points.prototype.draw = function(dataset, group, framework, offset) {
  Points.draw(dataset, group, framework, offset);
};

/**
 * draw the data points
 *
 * @param {Array} dataset
 * @param {Object} JSONcontainer
 * @param {Object} svg            | SVG DOM element
 * @param {GraphGroup} group
 * @param {Number} [offset]
 */
Points.draw = function (dataset, group, framework, offset) {
  offset = offset || 0;
  var callback = getCallback();

  for (var i = 0; i < dataset.length; i++) {
    if (!callback) {
      // draw the point the simple way.
      DOMutil.drawPoint(dataset[i].x + offset, dataset[i].y, getGroupTemplate(), framework.svgElements, framework.svg, dataset[i].label);
    }
    else {
      var callbackResult = callback(dataset[i], group, framework); // result might be true, false or an object
      if (callbackResult === true || typeof callbackResult === 'object') {
          DOMutil.drawPoint(dataset[i].x + offset, dataset[i].y, getGroupTemplate(callbackResult), framework.svgElements, framework.svg, dataset[i].label);
      }
    }
  }

  function getGroupTemplate(callbackResult) {
    callbackResult = (typeof callbackResult === 'undefined') ? {} : callbackResult;
    return {
      style: callbackResult.style || group.options.drawPoints.style,
      styles: callbackResult.styles || group.options.drawPoints.styles,
      size: callbackResult.size || group.options.drawPoints.size,
      className: callbackResult.className || group.className
    };
  }

  function getCallback() {
    var callback = undefined;
      // check for the graph2d onRender
      if (framework.options.drawPoints.onRender && typeof framework.options.drawPoints.onRender == 'function') {
        callback = framework.options.drawPoints.onRender;
      }

      // override it with the group onRender if defined
      if (group.group.options && group.group.options.drawPoints && group.group.options.drawPoints.onRender && typeof group.group.options.drawPoints.onRender == 'function') {
        callback = group.group.options.drawPoints.onRender;
      }

      return callback;
  }
};



module.exports = Points;