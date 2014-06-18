/**
 * @constructor Group
 * @param {Number | String} groupId
 * @param {Object} data
 * @param {ItemSet} itemSet
 */
function GraphGroup (group, options, linegraph) {
  this.options = util.copyObject(options,{});
  this.linegraph = linegraph;
  this.usingDefaultStyle = group.className === undefined;
  this.update(group);
  if (this.usingDefaultStyle == true) {
    this.linegraph.groupsUsingDefaultStyles += 1;
  }
}

GraphGroup.prototype.setClass = function (className) {
  this.className = className;
}

GraphGroup.prototype.setOptions = function(options) {
  if (options !== undefined) {
    var fields = ['yAxisOrientation'];
    util.selectiveExtend(fields, options, this.options);
    this.linegraph._mergeOptions(this.options, options,'catmullRom');
    this.linegraph._mergeOptions(this.options, options,'drawPoints');
    this.linegraph._mergeOptions(this.options, options,'shaded');
  }
};

GraphGroup.prototype.update = function(group) {
  this.group = group;
  this.content = group.content || 'graph';
  this.className = group.className || this.className || "graphGroup" + this.linegraph.groupsUsingDefaultStyles;
  this.setOptions(group.options);
};
