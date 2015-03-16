/**
 * Created by Alex on 11/11/2014.
 */
var DOMutil = require('../../../DOMutil');
var Points = require('./points');

function Bargraph(groupId, options) {
  this.groupId = groupId;
  this.options = options;
}

Bargraph.prototype.getYRange = function(groupData) {
  if (this.options.barChart.handleOverlap != 'stack') {
    var yMin = groupData[0].y;
    var yMax = groupData[0].y;
    for (var j = 0; j < groupData.length; j++) {
      yMin = yMin > groupData[j].y ? groupData[j].y : yMin;
      yMax = yMax < groupData[j].y ? groupData[j].y : yMax;
    }
    return {min: yMin, max: yMax, yAxisOrientation: this.options.yAxisOrientation};
  }
  else {
    var barCombinedData = [];
    for (var j = 0; j < groupData.length; j++) {
      barCombinedData.push({
        x: groupData[j].x,
        y: groupData[j].y,
        groupId: this.groupId
      });
    }
    return barCombinedData;
  }
};



/**
 * draw a bar graph
 *
 * @param groupIds
 * @param processedGroupData
 */
Bargraph.draw = function (groupIds, processedGroupData, framework) {
  var combinedData = [];
  var intersections = {};
  var coreDistance;
  var key, drawData;
  var group;
  var i,j;
  var barPoints = 0;

  // combine all barchart data
  for (i = 0; i < groupIds.length; i++) {
    group = framework.groups[groupIds[i]];
    if (group.options.style == 'bar') {
      if (group.visible == true && (framework.options.groups.visibility[groupIds[i]] === undefined || framework.options.groups.visibility[groupIds[i]] == true)) {
        for (j = 0; j < processedGroupData[groupIds[i]].length; j++) {
          combinedData.push({
            x: processedGroupData[groupIds[i]][j].x,
            y: processedGroupData[groupIds[i]][j].y,
            groupId: groupIds[i],
            label: processedGroupData[groupIds[i]][j].label,
          });
          barPoints += 1;
        }
      }
    }
  }

  if (barPoints == 0) {return;}

  // sort by time and by group
  combinedData.sort(function (a, b) {
    if (a.x == b.x) {
      return a.groupId - b.groupId;
    } else {
      return a.x - b.x;
    }
  });

  // get intersections
  Bargraph._getDataIntersections(intersections, combinedData);

  // plot barchart
  for (i = 0; i < combinedData.length; i++) {
    group = framework.groups[combinedData[i].groupId];
    var minWidth = 0.1 * group.options.barChart.width;

    key = combinedData[i].x;
    var heightOffset = 0;
    if (intersections[key] === undefined) {
      if (i+1 < combinedData.length) {coreDistance = Math.abs(combinedData[i+1].x - key);}
      if (i > 0)                     {coreDistance = Math.min(coreDistance,Math.abs(combinedData[i-1].x - key));}
      drawData = Bargraph._getSafeDrawData(coreDistance, group, minWidth);
    }
    else {
      var nextKey = i + (intersections[key].amount - intersections[key].resolved);
      var prevKey = i - (intersections[key].resolved + 1);
      if (nextKey < combinedData.length) {coreDistance = Math.abs(combinedData[nextKey].x - key);}
      if (prevKey > 0)                   {coreDistance = Math.min(coreDistance,Math.abs(combinedData[prevKey].x - key));}
      drawData = Bargraph._getSafeDrawData(coreDistance, group, minWidth);
      intersections[key].resolved += 1;

      if (group.options.barChart.handleOverlap == 'stack') {
        heightOffset = intersections[key].accumulated;
        intersections[key].accumulated += group.zeroPosition - combinedData[i].y;
      }
      else if (group.options.barChart.handleOverlap == 'sideBySide') {
        drawData.width = drawData.width / intersections[key].amount;
        drawData.offset += (intersections[key].resolved) * drawData.width - (0.5*drawData.width * (intersections[key].amount+1));
        if (group.options.barChart.align == 'left')       {drawData.offset -= 0.5*drawData.width;}
        else if (group.options.barChart.align == 'right') {drawData.offset += 0.5*drawData.width;}
      }
    }
    DOMutil.drawBar(combinedData[i].x + drawData.offset, combinedData[i].y - heightOffset, drawData.width, group.zeroPosition - combinedData[i].y, group.className + ' bar', framework.svgElements, framework.svg);
    // draw points
    if (group.options.drawPoints.enabled == true) {
      DOMutil.drawPoint(combinedData[i].x + drawData.offset, combinedData[i].y, group, framework.svgElements, framework.svg, combinedData[i].label);
    }
  }
};


/**
 * Fill the intersections object with counters of how many datapoints share the same x coordinates
 * @param intersections
 * @param combinedData
 * @private
 */
Bargraph._getDataIntersections = function (intersections, combinedData) {
  // get intersections
  var coreDistance;
  for (var i = 0; i < combinedData.length; i++) {
    if (i + 1 < combinedData.length) {
      coreDistance = Math.abs(combinedData[i + 1].x - combinedData[i].x);
    }
    if (i > 0) {
      coreDistance = Math.min(coreDistance, Math.abs(combinedData[i - 1].x - combinedData[i].x));
    }
    if (coreDistance == 0) {
      if (intersections[combinedData[i].x] === undefined) {
        intersections[combinedData[i].x] = {amount: 0, resolved: 0, accumulated: 0};
      }
      intersections[combinedData[i].x].amount += 1;
    }
  }
};


/**
 * Get the width and offset for bargraphs based on the coredistance between datapoints
 *
 * @param coreDistance
 * @param group
 * @param minWidth
 * @returns {{width: Number, offset: Number}}
 * @private
 */
Bargraph._getSafeDrawData = function (coreDistance, group, minWidth) {
  var width, offset;
  if (coreDistance < group.options.barChart.width && coreDistance > 0) {
    width = coreDistance < minWidth ? minWidth : coreDistance;

    offset = 0; // recalculate offset with the new width;
    if (group.options.barChart.align == 'left') {
      offset -= 0.5 * coreDistance;
    }
    else if (group.options.barChart.align == 'right') {
      offset += 0.5 * coreDistance;
    }
  }
  else {
    // default settings
    width = group.options.barChart.width;
    offset = 0;
    if (group.options.barChart.align == 'left') {
      offset -= 0.5 * group.options.barChart.width;
    }
    else if (group.options.barChart.align == 'right') {
      offset += 0.5 * group.options.barChart.width;
    }
  }

  return {width: width, offset: offset};
};

Bargraph.getStackedBarYRange = function(barCombinedData, groupRanges, groupIds, groupLabel, orientation) {
  if (barCombinedData.length > 0) {
    // sort by time and by group
    barCombinedData.sort(function (a, b) {
      if (a.x == b.x) {
        return a.groupId - b.groupId;
      } else {
        return a.x - b.x;
      }
    });
    var intersections = {};

    Bargraph._getDataIntersections(intersections, barCombinedData);
    groupRanges[groupLabel] = Bargraph._getStackedBarYRange(intersections, barCombinedData);
    groupRanges[groupLabel].yAxisOrientation = orientation;
    groupIds.push(groupLabel);
  }
}

Bargraph._getStackedBarYRange = function (intersections, combinedData) {
  var key;
  var yMin = combinedData[0].y;
  var yMax = combinedData[0].y;
  for (var i = 0; i < combinedData.length; i++) {
    key = combinedData[i].x;
    if (intersections[key] === undefined) {
      yMin = yMin > combinedData[i].y ? combinedData[i].y : yMin;
      yMax = yMax < combinedData[i].y ? combinedData[i].y : yMax;
    }
    else {
      intersections[key].accumulated += combinedData[i].y;
    }
  }
  for (var xpos in intersections) {
    if (intersections.hasOwnProperty(xpos)) {
      yMin = yMin > intersections[xpos].accumulated ? intersections[xpos].accumulated : yMin;
      yMax = yMax < intersections[xpos].accumulated ? intersections[xpos].accumulated : yMax;
    }
  }

  return {min: yMin, max: yMax};
};

module.exports = Bargraph;
