var DOMutil = require('../../../DOMutil');
var Points = require('./points');

function Line(groupId, options) {
  this.groupId = groupId;
  this.options = options;
}

Line.prototype.getData = function(groupData) {
  var combinedData = [];
  for (var j = 0; j < groupData.length; j++) {
    combinedData.push({
      x: groupData[j].x,
      y: groupData[j].y,
      groupId: this.groupId
    });
  }
  return combinedData;
}

Line.prototype.getYRange = function(groupData) {
  var yMin = groupData[0].y;
  var yMax = groupData[0].y;
  for (var j = 0; j < groupData.length; j++) {
    yMin = yMin > groupData[j].y ? groupData[j].y : yMin;
    yMax = yMax < groupData[j].y ? groupData[j].y : yMax;
  }
  return {min: yMin, max: yMax, yAxisOrientation: this.options.yAxisOrientation};
};

Line.getStackedYRange = function(combinedData, groupRanges, groupIds, groupLabel, orientation) {
  if (combinedData.length > 0) {
    // sort by time and by group
    combinedData.sort(function (a, b) {
      if (a.x === b.x) {
        return a.groupId < b.groupId ? -1 : 1;
      }
      else {
        return a.x - b.x;
      }
    });
    var intersections = {};

    Line._getDataIntersections(intersections, combinedData);
    groupRanges[groupLabel] = Line._getStackedYRange(intersections, combinedData);
    groupRanges[groupLabel].yAxisOrientation = orientation;
    groupIds.push(groupLabel);
  }
}

Line._getStackedYRange = function (intersections, combinedData) {
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
      if (combinedData[i].y < 0) {
        intersections[key].accumulatedNegative += combinedData[i].y;
      }
      else {
        intersections[key].accumulatedPositive += combinedData[i].y;
      }
    }
  }
  for (var xpos in intersections) {
    if (intersections.hasOwnProperty(xpos)) {
      yMin = yMin > intersections[xpos].accumulatedNegative ? intersections[xpos].accumulatedNegative : yMin;
      yMin = yMin > intersections[xpos].accumulatedPositive ? intersections[xpos].accumulatedPositive : yMin;
      yMax = yMax < intersections[xpos].accumulatedNegative ? intersections[xpos].accumulatedNegative : yMax;
      yMax = yMax < intersections[xpos].accumulatedPositive ? intersections[xpos].accumulatedPositive : yMax;
    }
  }

  return {min: yMin, max: yMax};
};

/**
 * Fill the intersections object with counters of how many datapoints share the same x coordinates
 * @param intersections
 * @param combinedData
 * @private
 */
Line._getDataIntersections = function (intersections, combinedData) {
  // get intersections
  var coreDistance;
  for (var i = 0; i < combinedData.length; i++) {
    if (i + 1 < combinedData.length) {
      coreDistance = Math.abs(combinedData[i + 1].x - combinedData[i].x);
    }
    if (i > 0) {
      coreDistance = Math.min(coreDistance, Math.abs(combinedData[i - 1].x - combinedData[i].x));
    }
    if (coreDistance === 0) {
      if (intersections[combinedData[i].x] === undefined) {
        intersections[combinedData[i].x] = {amount: 0, resolved: 0, accumulatedPositive: 0, accumulatedNegative: 0};
      }
      intersections[combinedData[i].x].amount += 1;
    }
  }
};


/**
 * draw a line graph
 *
 * @param dataset
 * @param group
 */
Line.prototype.draw = function (dataset, group, framework) {
  if (dataset != null) {
    if (dataset.length > 0) {
      var path, d;
      var svgHeight = Number(framework.svg.style.height.replace('px',''));
      path = DOMutil.getSVGElement('path', framework.svgElements, framework.svg);
      path.setAttributeNS(null, "class", group.className);
      if(group.style !== undefined) {
        path.setAttributeNS(null, "style", group.style);
      }

      // construct path from dataset
      if (group.options.interpolation.enabled == true) {
        d = Line._catmullRom(dataset, group);
      }
      else {
        d = Line._linear(dataset);
      }

      // append with points for fill and finalize the path
      if (group.options.shaded.enabled == true) {
        var fillPath = DOMutil.getSVGElement('path', framework.svgElements, framework.svg);
        var dFill;
        if (group.options.shaded.orientation == 'top') {
          dFill = 'M' + dataset[0].x + ',' + 0 + ' ' + d + 'L' + dataset[dataset.length - 1].x + ',' + 0;
        }
        else {
          dFill = 'M' + dataset[0].x + ',' + svgHeight + ' ' + d + 'L' + dataset[dataset.length - 1].x + ',' + svgHeight;
        }
        fillPath.setAttributeNS(null, 'class', group.className + ' vis-fill');
        if(group.options.shaded.style !== undefined) {
          fillPath.setAttributeNS(null, 'style', group.options.shaded.style);
        }
        fillPath.setAttributeNS(null, 'd', dFill);
      }
      // copy properties to path for drawing.
      path.setAttributeNS(null, 'd', 'M' + d);

      // draw points
      if (group.options.drawPoints.enabled == true) {
        Points.draw(dataset, group, framework);
      }
    }
  }
};



/**
 * This uses an uniform parametrization of the interpolation algorithm:
 * 'On the Parameterization of Catmull-Rom Curves' by Cem Yuksel et al.
 * @param data
 * @returns {string}
 * @private
 */
Line._catmullRomUniform = function(data) {
  // catmull rom
  var p0, p1, p2, p3, bp1, bp2;
  var d = Math.round(data[0].x) + ',' + Math.round(data[0].y) + ' ';
  var normalization = 1/6;
  var length = data.length;
  for (var i = 0; i < length - 1; i++) {

    p0 = (i == 0) ? data[0] : data[i-1];
    p1 = data[i];
    p2 = data[i+1];
    p3 = (i + 2 < length) ? data[i+2] : p2;


    // Catmull-Rom to Cubic Bezier conversion matrix
    //    0       1       0       0
    //  -1/6      1      1/6      0
    //    0      1/6      1     -1/6
    //    0       0       1       0

    //    bp0 = { x: p1.x,                               y: p1.y };
    bp1 = { x: ((-p0.x + 6*p1.x + p2.x) *normalization), y: ((-p0.y + 6*p1.y + p2.y) *normalization)};
    bp2 = { x: (( p1.x + 6*p2.x - p3.x) *normalization), y: (( p1.y + 6*p2.y - p3.y) *normalization)};
    //    bp0 = { x: p2.x,                               y: p2.y };

    d += 'C' +
    bp1.x + ',' +
    bp1.y + ' ' +
    bp2.x + ',' +
    bp2.y + ' ' +
    p2.x + ',' +
    p2.y + ' ';
  }

  return d;
};

/**
 * This uses either the chordal or centripetal parameterization of the catmull-rom algorithm.
 * By default, the centripetal parameterization is used because this gives the nicest results.
 * These parameterizations are relatively heavy because the distance between 4 points have to be calculated.
 *
 * One optimization can be used to reuse distances since this is a sliding window approach.
 * @param data
 * @param group
 * @returns {string}
 * @private
 */
Line._catmullRom = function(data, group) {
  var alpha = group.options.interpolation.alpha;
  if (alpha == 0 || alpha === undefined) {
    return this._catmullRomUniform(data);
  }
  else {
    var p0, p1, p2, p3, bp1, bp2, d1,d2,d3, A, B, N, M;
    var d3powA, d2powA, d3pow2A, d2pow2A, d1pow2A, d1powA;
    var d = Math.round(data[0].x) + ',' + Math.round(data[0].y) + ' ';
    var length = data.length;
    for (var i = 0; i < length - 1; i++) {

      p0 = (i == 0) ? data[0] : data[i-1];
      p1 = data[i];
      p2 = data[i+1];
      p3 = (i + 2 < length) ? data[i+2] : p2;

      d1 = Math.sqrt(Math.pow(p0.x - p1.x,2) + Math.pow(p0.y - p1.y,2));
      d2 = Math.sqrt(Math.pow(p1.x - p2.x,2) + Math.pow(p1.y - p2.y,2));
      d3 = Math.sqrt(Math.pow(p2.x - p3.x,2) + Math.pow(p2.y - p3.y,2));

      // Catmull-Rom to Cubic Bezier conversion matrix

      // A = 2d1^2a + 3d1^a * d2^a + d3^2a
      // B = 2d3^2a + 3d3^a * d2^a + d2^2a

      // [   0             1            0          0          ]
      // [   -d2^2a /N     A/N          d1^2a /N   0          ]
      // [   0             d3^2a /M     B/M        -d2^2a /M  ]
      // [   0             0            1          0          ]

      d3powA  = Math.pow(d3,  alpha);
      d3pow2A = Math.pow(d3,2*alpha);
      d2powA  = Math.pow(d2,  alpha);
      d2pow2A = Math.pow(d2,2*alpha);
      d1powA  = Math.pow(d1,  alpha);
      d1pow2A = Math.pow(d1,2*alpha);

      A = 2*d1pow2A + 3*d1powA * d2powA + d2pow2A;
      B = 2*d3pow2A + 3*d3powA * d2powA + d2pow2A;
      N = 3*d1powA * (d1powA + d2powA);
      if (N > 0) {N = 1 / N;}
      M = 3*d3powA * (d3powA + d2powA);
      if (M > 0) {M = 1 / M;}

      bp1 = { x: ((-d2pow2A * p0.x + A*p1.x + d1pow2A * p2.x) * N),
        y: ((-d2pow2A * p0.y + A*p1.y + d1pow2A * p2.y) * N)};

      bp2 = { x: (( d3pow2A * p1.x + B*p2.x - d2pow2A * p3.x) * M),
        y: (( d3pow2A * p1.y + B*p2.y - d2pow2A * p3.y) * M)};

      if (bp1.x == 0 && bp1.y == 0) {bp1 = p1;}
      if (bp2.x == 0 && bp2.y == 0) {bp2 = p2;}
      d += 'C' +
      bp1.x + ',' +
      bp1.y + ' ' +
      bp2.x + ',' +
      bp2.y + ' ' +
      p2.x + ',' +
      p2.y + ' ';
    }

    return d;
  }
};

/**
 * this generates the SVG path for a linear drawing between datapoints.
 * @param data
 * @returns {string}
 * @private
 */
Line._linear = function(data) {
  // linear
  var d = '';
  for (var i = 0; i < data.length; i++) {
    if (i == 0) {
      d += data[i].x + ',' + data[i].y;
    }
    else {
      d += ' ' + data[i].x + ',' + data[i].y;
    }
  }
  return d;
};

module.exports = Line;
