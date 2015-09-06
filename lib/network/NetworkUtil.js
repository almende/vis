
class NetworkUtil {
  constructor() {}

  /**
   * Find the center position of the network considering the bounding boxes
   * @private
   */
  static _getRange(allNodes, specificNodes = []) {
    var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
    if (specificNodes.length > 0) {
      for (var i = 0; i < specificNodes.length; i++) {
        node = allNodes[specificNodes[i]];
        if (minX > node.shape.boundingBox.left) {
          minX = node.shape.boundingBox.left;
        }
        if (maxX < node.shape.boundingBox.right) {
          maxX = node.shape.boundingBox.right;
        }
        if (minY > node.shape.boundingBox.top) {
          minY = node.shape.boundingBox.top;
        } // top is negative, bottom is positive
        if (maxY < node.shape.boundingBox.bottom) {
          maxY = node.shape.boundingBox.bottom;
        } // top is negative, bottom is positive
      }
    }

    if (minX === 1e9 && maxX === -1e9 && minY === 1e9 && maxY === -1e9) {
      minY = 0, maxY = 0, minX = 0, maxX = 0;
    }
    return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
  }

  /**
   * Find the center position of the network
   * @private
   */
  static _getRangeCore(allNodes, specificNodes = []) {
    var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
    if (specificNodes.length > 0) {
      for (var i = 0; i < specificNodes.length; i++) {
        node = allNodes[specificNodes[i]];
        if (minX > node.x) {
          minX = node.x;
        }
        if (maxX < node.x) {
          maxX = node.x;
        }
        if (minY > node.y) {
          minY = node.y;
        } // top is negative, bottom is positive
        if (maxY < node.y) {
          maxY = node.y;
        } // top is negative, bottom is positive
      }
    }

    if (minX === 1e9 && maxX === -1e9 && minY === 1e9 && maxY === -1e9) {
      minY = 0, maxY = 0, minX = 0, maxX = 0;
    }
    return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
  }


  /**
   * @param {object} range = {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
   * @returns {{x: number, y: number}}
   * @private
   */
  static _findCenter(range) {
    return {x: (0.5 * (range.maxX + range.minX)),
      y: (0.5 * (range.maxY + range.minY))};
  }
}

export default NetworkUtil;