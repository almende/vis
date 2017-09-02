/**
 * Definitions for param's in jsdoc.
 * These are more or less global within Network. Putting them here until I can figure out
 * where to really put them
 * 
 * @typedef {{x: number, y: number}} point
 * @typedef {{left: number, top: number, right: number, bottom: number}} rect
 * @typedef {{x: number, y:number, angle: number}} rotationPoint
 *   - point to rotate around and the angle in radians to rotate. angle == 0 means no rotation
 */

let util = require("../../../../util");

/**
 * Helper functions for components
 * @class
 */
class ComponentUtil {
  /**
   * Determine values to use for (sub)options of 'chosen'.
   *
   * This option is either a boolean or an object whose values should be examined further.
   * The relevant structures are:
   *
   * - chosen: <boolean value>
   * - chosen: { subOption: <boolean or function> }
   *
   * Where subOption is 'node', 'edge' or 'label'.
   *
   * The intention of this method appears to be to set a specific priority to the options;
   * Since most properties are either bridged or merged into the local options objects, there
   * is not much point in handling them separately.
   * TODO: examine if 'most' in previous sentence can be replaced with 'all'. In that case, we
   *       should be able to get rid of this method.
   *
   * @param {String}  subOption  option within object 'chosen' to consider; either 'node', 'edge' or 'label'
   * @param {Object}  pile       array of options objects to consider
   * 
   * @return {boolean|function}  value for passed subOption of 'chosen' to use
   */
  static choosify(subOption, pile) {
    // allowed values for subOption
    let allowed = [ 'node', 'edge', 'label'];
    let value = true;

    let chosen = util.topMost(pile, 'chosen');
    if (typeof chosen === 'boolean') {
      value = chosen;
    } else if (typeof chosen === 'object') {
      if (allowed.indexOf(subOption) === -1 ) {
        throw new Error('choosify: subOption \'' + subOption + '\' should be one of '
          + "'" + allowed.join("', '") +  "'");
      }

      let chosenEdge = util.topMost(pile, ['chosen', subOption]);
      if ((typeof chosenEdge === 'boolean') || (typeof chosenEdge === 'function')) {
        value = chosenEdge;
      }
    }

    return value;
  }


  /**
   * Check if the two given rectangles overlap.
   *
   * The second parameter can also be a point.
   *
   * @param {rect} rect1
   * @param {rect|point} rect2
   * @returns {boolean}  true if point within rectangle, false otherwise
   */
  overlaps(rect1, rect2) {
    if (rect2.x !== undefined && rect2.y !== undefined) {
      // Assume point
      return (
        rect1.left   < rect2.x &&
        rect1.right  > rect2.x &&
        rect1.top    < rect2.y &&
        rect1.bottom > rect2.y
      );
    } else {
      // assume rect
      return (
        rect1.left   < rect2.right &&
        rect1.right  > rect2.left &&
        rect1.top    < rect2.bottom &&
        rect1.bottom > rect2.top
      );
    }
  }
}

export default ComponentUtil;
