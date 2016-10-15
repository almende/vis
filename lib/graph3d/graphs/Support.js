

function derive(child, parent) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.constructor = child;
  child.prototype.parent = function() { return parent.prototype; }
}


/**
 * Helper function to tone down the length of the construct:
 *
 *         target  = (A !== undefined) ? A : B;
 */
function select(valueA, valueB) {
  if (valueA !== undefined) {
    return valueA;
  } else {
    return valueB;
  }
}


/**
 * Copy all fields from src to dst
 *
 * If a value in src is undefined, so be it.
 *
 * @param fields  array of fields to copy; if not passed, copy all fields present in src.
 */
function copy(src, dst, fields) {
  if (fields === undefined) {
    throw 'Support.copy(): parameter fields required';
  }

  for (var i in fields) {
    var field = fields[i];
    dst[field] = src[field];
  }
}


/**
 * Copy fields from src to dst in a controlled manner.
 *
 * @param fields  array of fields to copy; if not passed, copy all fields present in src.
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

  if (!sort) {
    return;
  }

  // sort the points on depth of their (x,y) position (not on z)
  var sortDepth = function (a, b) {
    return b.dist - a.dist;
  };
  points.sort(sortDepth);
}


module.exports.derive              = derive;
module.exports.select              = select;
module.exports.copy                = copy;
module.exports.safeCopy            = safeCopy;
module.exports.calcTranslations    = calcTranslations;
