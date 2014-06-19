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
    util.selectiveExtend(fields, this.options, options);
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

GraphGroup.prototype.drawIcon = function(x,y,JSONcontainer, SVGcontainer, lineLength, iconHeight) {
  var fillHeight = iconHeight * 0.5;
  var path, fillPath, outline;
  if (this.options.barGraph.enabled == false) {
    outline = this.linegraph._getSVGElement("rect", JSONcontainer, SVGcontainer);
    outline.setAttributeNS(null, "x", x);
    outline.setAttributeNS(null, "y", y - fillHeight);
    outline.setAttributeNS(null, "width", lineLength);
    outline.setAttributeNS(null, "height", 2*fillHeight);
    outline.setAttributeNS(null, "class", "outline");

    path = this.linegraph._getSVGElement("path", JSONcontainer, SVGcontainer);
    path.setAttributeNS(null, "class", this.className);
    path.setAttributeNS(null, "d", "M" + x + ","+y+" L" + (x + lineLength) + ","+y+"");
    if (this.options.shaded.enabled == true) {
      fillPath = this.linegraph._getSVGElement("path", JSONcontainer, SVGcontainer);
      if (this.options.shaded.orientation == 'top') {
        fillPath.setAttributeNS(null, "d", "M"+x+", " + (y - fillHeight) +
          "L"+x+","+y+" L"+ (x + lineLength) + ","+y+" L"+ (x + lineLength) + "," + (y - fillHeight));
      }
      else {
        fillPath.setAttributeNS(null, "d", "M"+x+","+y+" " +
          "L"+x+"," + (y + fillHeight) + " " +
          "L"+ (x + lineLength) + "," + (y + fillHeight) +
          "L"+ (x + lineLength) + ","+y);
      }
      fillPath.setAttributeNS(null, "class", this.className + " iconFill");
    }

    if (this.options.drawPoints.enabled == true) {
      this.linegraph.drawPoint(x + 0.5 * lineLength,y, this, JSONcontainer, SVGcontainer);
    }
  }
  else {
    //TODO: bars
  }
}
