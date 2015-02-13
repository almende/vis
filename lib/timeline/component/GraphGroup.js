var util = require('../../util');
var DOMutil = require('../../DOMutil');
var Line = require('./graph2d_types/line');
var Bar = require('./graph2d_types/bar');
var Points = require('./graph2d_types/points');

/**
 * /**
 * @param {object} group            | the object of the group from the dataset
 * @param {string} groupId          | ID of the group
 * @param {object} options          | the default options
 * @param {array} groupsUsingDefaultStyles  | this array has one entree.
 *                                            It is passed as an array so it is passed by reference.
 *                                            It enumerates through the default styles
 * @constructor
 */
function GraphGroup (group, groupId, options, groupsUsingDefaultStyles) {
  this.id = groupId;
  var fields = ['sampling','style','sort','yAxisOrientation','barChart','drawPoints','shaded','catmullRom']
  this.options = util.selectiveBridgeObject(fields,options);
  this.usingDefaultStyle = group.className === undefined;
  this.groupsUsingDefaultStyles = groupsUsingDefaultStyles;
  this.zeroPosition = 0;
  this.update(group);
  if (this.usingDefaultStyle == true) {
    this.groupsUsingDefaultStyles[0] += 1;
  }
  this.itemsData = [];
  this.visible = group.visible === undefined ? true : group.visible;
}


/**
 * this loads a reference to all items in this group into this group.
 * @param {array} items
 */
GraphGroup.prototype.setItems = function(items) {
  if (items != null) {
    this.itemsData = items;
    if (this.options.sort == true) {
      this.itemsData.sort(function (a,b) {return a.x - b.x;})
    }
  }
  else {
    this.itemsData = [];
  }
};


/**
 * this is used for plotting barcharts, this way, we only have to calculate it once.
 * @param pos
 */
GraphGroup.prototype.setZeroPosition = function(pos) {
  this.zeroPosition = pos;
};


/**
 * set the options of the graph group over the default options.
 * @param options
 */
GraphGroup.prototype.setOptions = function(options) {
  if (options !== undefined) {
    var fields = ['sampling','style','sort','yAxisOrientation','barChart'];
    util.selectiveDeepExtend(fields, this.options, options);

    util.mergeOptions(this.options, options,'catmullRom');
    util.mergeOptions(this.options, options,'drawPoints');
    util.mergeOptions(this.options, options,'shaded');

    if (options.catmullRom) {
      if (typeof options.catmullRom == 'object') {
        if (options.catmullRom.parametrization) {
          if (options.catmullRom.parametrization == 'uniform') {
            this.options.catmullRom.alpha = 0;
          }
          else if (options.catmullRom.parametrization == 'chordal') {
            this.options.catmullRom.alpha = 1.0;
          }
          else {
            this.options.catmullRom.parametrization = 'centripetal';
            this.options.catmullRom.alpha = 0.5;
          }
        }
      }
    }
  }

  if (this.options.style == 'line') {
    this.type = new Line(this.id, this.options);
  }
  else if (this.options.style == 'bar') {
    this.type = new Bar(this.id, this.options);
  }
  else if (this.options.style == 'points') {
    this.type = new Points(this.id, this.options);
  }
};


/**
 * this updates the current group class with the latest group dataset entree, used in _updateGroup in linegraph
 * @param group
 */
GraphGroup.prototype.update = function(group) {
  this.group = group;
  this.content = group.content || 'graph';
  this.className = group.className || this.className || "graphGroup" + this.groupsUsingDefaultStyles[0] % 10;
  this.visible = group.visible === undefined ? true : group.visible;
  this.style = group.style;
  this.setOptions(group.options);
};


/**
 * draw the icon for the legend.
 *
 * @param x
 * @param y
 * @param JSONcontainer
 * @param SVGcontainer
 * @param iconWidth
 * @param iconHeight
 */
GraphGroup.prototype.drawIcon = function(x, y, JSONcontainer, SVGcontainer, iconWidth, iconHeight) {
  var fillHeight = iconHeight * 0.5;
  var path, fillPath;

  var outline = DOMutil.getSVGElement("rect", JSONcontainer, SVGcontainer);
  outline.setAttributeNS(null, "x", x);
  outline.setAttributeNS(null, "y", y - fillHeight);
  outline.setAttributeNS(null, "width", iconWidth);
  outline.setAttributeNS(null, "height", 2*fillHeight);
  outline.setAttributeNS(null, "class", "outline");

  if (this.options.style == 'line') {
    path = DOMutil.getSVGElement("path", JSONcontainer, SVGcontainer);
    path.setAttributeNS(null, "class", this.className);
    if(this.style !== undefined) {
      path.setAttributeNS(null, "style", this.style);
    }

    path.setAttributeNS(null, "d", "M" + x + ","+y+" L" + (x + iconWidth) + ","+y+"");
    if (this.options.shaded.enabled == true) {
      fillPath = DOMutil.getSVGElement("path", JSONcontainer, SVGcontainer);
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
      DOMutil.drawPoint(x + 0.5 * iconWidth,y, this, JSONcontainer, SVGcontainer);
    }
  }
  else {
    var barWidth = Math.round(0.3 * iconWidth);
    var bar1Height = Math.round(0.4 * iconHeight);
    var bar2Height = Math.round(0.75 * iconHeight);

    var offset = Math.round((iconWidth - (2 * barWidth))/3);

    DOMutil.drawBar(x + 0.5*barWidth + offset    , y + fillHeight - bar1Height - 1, barWidth, bar1Height, this.className + ' bar', JSONcontainer, SVGcontainer);
    DOMutil.drawBar(x + 1.5*barWidth + offset + 2, y + fillHeight - bar2Height - 1, barWidth, bar2Height, this.className + ' bar', JSONcontainer, SVGcontainer);
  }
};


/**
 * return the legend entree for this group.
 *
 * @param iconWidth
 * @param iconHeight
 * @returns {{icon: HTMLElement, label: (group.content|*|string), orientation: (.options.yAxisOrientation|*)}}
 */
GraphGroup.prototype.getLegend = function(iconWidth, iconHeight) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.drawIcon(0,0.5*iconHeight,[],svg,iconWidth,iconHeight);
  return {icon: svg, label: this.content, orientation:this.options.yAxisOrientation};
}

GraphGroup.prototype.getYRange = function(groupData) {
  return this.type.getYRange(groupData);
}

GraphGroup.prototype.draw = function(dataset, group, framework) {
  this.type.draw(dataset, group, framework);
}


module.exports = GraphGroup;
