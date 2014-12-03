var Point3d = require('./Point3d');

/**
 * @class Camera
 * The camera is mounted on a (virtual) camera arm. The camera arm can rotate
 * The camera is always looking in the direction of the origin of the arm.
 * This way, the camera always rotates around one fixed point, the location
 * of the camera arm.
 *
 * Documentation:
 *   http://en.wikipedia.org/wiki/3D_projection
 */
function Camera() {
  this.armLocation = new Point3d();
  this.armRotation = {};
  this.armRotation.horizontal = 0;
  this.armRotation.vertical = 0;
  this.armLength = 1.7;

  this.cameraLocation = new Point3d();
  this.cameraRotation =  new Point3d(0.5*Math.PI, 0, 0);

  this.calculateCameraOrientation();
}

/**
 * Set the location (origin) of the arm
 * @param {Number} x  Normalized value of x
 * @param {Number} y  Normalized value of y
 * @param {Number} z  Normalized value of z
 */
Camera.prototype.setArmLocation = function(x, y, z) {
  this.armLocation.x = x;
  this.armLocation.y = y;
  this.armLocation.z = z;

  this.calculateCameraOrientation();
};

/**
 * Set the rotation of the camera arm
 * @param {Number} horizontal   The horizontal rotation, between 0 and 2*PI.
 *                Optional, can be left undefined.
 * @param {Number} vertical   The vertical rotation, between 0 and 0.5*PI
 *                if vertical=0.5*PI, the graph is shown from the
 *                top. Optional, can be left undefined.
 */
Camera.prototype.setArmRotation = function(horizontal, vertical) {
  if (horizontal !== undefined) {
    this.armRotation.horizontal = horizontal;
  }

  if (vertical !== undefined) {
    this.armRotation.vertical = vertical;
    if (this.armRotation.vertical < 0) this.armRotation.vertical = 0;
    if (this.armRotation.vertical > 0.5*Math.PI) this.armRotation.vertical = 0.5*Math.PI;
  }

  if (horizontal !== undefined || vertical !== undefined) {
    this.calculateCameraOrientation();
  }
};

/**
 * Retrieve the current arm rotation
 * @return {object}   An object with parameters horizontal and vertical
 */
Camera.prototype.getArmRotation = function() {
  var rot = {};
  rot.horizontal = this.armRotation.horizontal;
  rot.vertical = this.armRotation.vertical;

  return rot;
};

/**
 * Set the (normalized) length of the camera arm.
 * @param {Number} length A length between 0.71 and 5.0
 */
Camera.prototype.setArmLength = function(length) {
  if (length === undefined)
    return;

  this.armLength = length;

  // Radius must be larger than the corner of the graph,
  // which has a distance of sqrt(0.5^2+0.5^2) = 0.71 from the center of the
  // graph
  if (this.armLength < 0.71) this.armLength = 0.71;
  if (this.armLength > 5.0) this.armLength = 5.0;

  this.calculateCameraOrientation();
};

/**
 * Retrieve the arm length
 * @return {Number} length
 */
Camera.prototype.getArmLength = function() {
  return this.armLength;
};

/**
 * Retrieve the camera location
 * @return {Point3d} cameraLocation
 */
Camera.prototype.getCameraLocation = function() {
  return this.cameraLocation;
};

/**
 * Retrieve the camera rotation
 * @return {Point3d} cameraRotation
 */
Camera.prototype.getCameraRotation = function() {
  return this.cameraRotation;
};

/**
 * Calculate the location and rotation of the camera based on the
 * position and orientation of the camera arm
 */
Camera.prototype.calculateCameraOrientation = function() {
  // calculate location of the camera
  this.cameraLocation.x = this.armLocation.x - this.armLength * Math.sin(this.armRotation.horizontal) * Math.cos(this.armRotation.vertical);
  this.cameraLocation.y = this.armLocation.y - this.armLength * Math.cos(this.armRotation.horizontal) * Math.cos(this.armRotation.vertical);
  this.cameraLocation.z = this.armLocation.z + this.armLength * Math.sin(this.armRotation.vertical);

  // calculate rotation of the camera
  this.cameraRotation.x = Math.PI/2 - this.armRotation.vertical;
  this.cameraRotation.y = 0;
  this.cameraRotation.z = -this.armRotation.horizontal;
};

module.exports = Camera;