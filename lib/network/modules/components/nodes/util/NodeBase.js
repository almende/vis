class NodeBase {
  constructor(options, body, labelModule) {
    this.body = body;
    this.labelModule = labelModule;
    this.setOptions(options);
    this.top = undefined;
    this.left = undefined;
    this.height = undefined;
    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};
  }

  setOptions(options) {
    this.options = options;
  }

  _distanceToBorder(angle) {
    var borderWidth = 1;
    return Math.min(
        Math.abs(this.width / 2 / Math.cos(angle)),
        Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
  }
}

export default NodeBase;