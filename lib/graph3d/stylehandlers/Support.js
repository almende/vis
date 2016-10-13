

function derive(child, parent) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
  child.prototype.parent = function() { return parent.prototype; }
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


module.exports.derive              = derive;
module.exports.safeCopy            = safeCopy;
module.exports.calcTranslations    = calcTranslations;
