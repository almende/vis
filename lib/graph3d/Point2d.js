/**
 * @prototype Point2d
 * @param {Number} [x]
 * @param {Number} [y]
 */
Point2d = function (x, y) {
  this.x = x !== undefined ? x : 0;
  this.y = y !== undefined ? y : 0;
};

module.exports = Point2d;
