/**
 * Created by Alex on 11/11/2014.
 */
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
}

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
  if (offset === undefined) {offset = 0;}
  for (var i = 0; i < dataset.length; i++) {
    DOMutil.drawPoint(dataset[i].x + offset, dataset[i].y, group, framework.svgElements, framework.svg, dataset[i].label);
  }
};


module.exports = Points;