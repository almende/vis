/**
 * @constructor Group
 * @param {Number | String} groupId
 * @param {Object} data
 * @param {ItemSet} itemSet
 */
function GraphGroup (group, options, groupsUsingDefaultStyles) {
  var fields = ['style','yAxisOrientation','barChart','drawPoints','shaded','catmullRom']
  this.options = util.selectiveDeepExtend(fields,{},options);
  this.usingDefaultStyle = group.className === undefined;
  this.groupsUsingDefaultStyles = groupsUsingDefaultStyles;
  this.update(group);
  if (this.usingDefaultStyle == true) {
    this.groupsUsingDefaultStyles[0] += 1;
  }
}

GraphGroup.prototype.setClass = function (className) {
  this.className = className;
}

GraphGroup.prototype.setOptions = function(options) {
  if (options !== undefined) {
    var fields = ['yAxisOrientation','style','barChart'];
    util.selectiveDeepExtend(fields, this.options, options);

    util._mergeOptions(this.options, options,'catmullRom');
    util._mergeOptions(this.options, options,'drawPoints');
    util._mergeOptions(this.options, options,'shaded');
  }
};

GraphGroup.prototype.update = function(group) {
  this.group = group;
  this.content = group.content || 'graph';
  this.className = group.className || this.className || "graphGroup" + this.groupsUsingDefaultStyles[0];
  this.setOptions(group.options);
};

GraphGroup.prototype.drawIcon = function(x,y,JSONcontainer, SVGcontainer, iconWidth, iconHeight) {
  var fillHeight = iconHeight * 0.5;
  var path, fillPath, outline;
  if (this.options.style == 'line') {
    outline = SVGutil._getSVGElement("rect", JSONcontainer, SVGcontainer);
    outline.setAttributeNS(null, "x", x);
    outline.setAttributeNS(null, "y", y - fillHeight);
    outline.setAttributeNS(null, "width", iconWidth);
    outline.setAttributeNS(null, "height", 2*fillHeight);
    outline.setAttributeNS(null, "class", "outline");

    path = SVGutil._getSVGElement("path", JSONcontainer, SVGcontainer);
    path.setAttributeNS(null, "class", this.className);
    path.setAttributeNS(null, "d", "M" + x + ","+y+" L" + (x + iconWidth) + ","+y+"");
    if (this.options.shaded.enabled == true) {
      fillPath = SVGutil._getSVGElement("path", JSONcontainer, SVGcontainer);
      if (this.options.shaded.orientation == 'top') {
        fillPath.setAttributeNS(null, "d", "M"+x+", " + (y - fillHeight) +
          "L"+x+","+y+" L"+ (x + iconWidth) + ","+y+" L"+ (x + iconWidth) + "," + (y - fillHeight));
      }
      else {
        fillPath.setAttributeNS(null, "d", "M"+x+","+y+" " +
          "L"+x+"," + (y + fillHeight) + " " +
          "L"+ (x + iconWidth) + "," + (y + fillHeight) +
          "L"+ (x + iconWidth) + ","+y);
      }
      fillPath.setAttributeNS(null, "class", this.className + " iconFill");
    }

    if (this.options.drawPoints.enabled == true) {
      SVGutil.drawPoint(x + 0.5 * iconWidth,y, this, JSONcontainer, SVGcontainer);
    }
  }
  else {
    console.log("bar")
    //TODO: bars
  }
}
