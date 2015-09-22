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
  var fields = ['sampling','style','sort','yAxisOrientation','barChart','drawPoints','shaded','interpolation']
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
    // typecast all items to numbers. Takes around 10ms for 500.000 items
    for (var i = 0; i < this.itemsData.length; i++) {
      this.itemsData[i].y = Number(this.itemsData[i].y);
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
    var fields = ['sampling','style','sort','yAxisOrientation','barChart','excludeFromLegend'];
    util.selectiveDeepExtend(fields, this.options, options);

    // if the group's drawPoints is a function delegate the callback to the onRender property
    if (typeof options.drawPoints == 'function') {
  	  options.drawPoints = {
  			  onRender: options.drawPoints
  	  }
    }

    util.mergeOptions(this.options, options,'interpolation');
    util.mergeOptions(this.options, options,'drawPoints');
    util.mergeOptions(this.options, options,'shaded');

    if (options.interpolation) {
      if (typeof options.interpolation == 'object') {
        if (options.interpolation.parametrization) {
          if (options.interpolation.parametrization == 'uniform') {
            this.options.interpolation.alpha = 0;
          }
          else if (options.interpolation.parametrization == 'chordal') {
            this.options.interpolation.alpha = 1.0;
          }
          else {
            this.options.interpolation.parametrization = 'centripetal';
            this.options.interpolation.alpha = 0.5;
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
  this.className = group.className || this.className || 'vis-graph-group' + this.groupsUsingDefaultStyles[0] % 10;
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
  outline.setAttributeNS(null, "class", "vis-outline");

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
      fillPath.setAttributeNS(null, "class", this.className + " vis-icon-fill");
    }

    if (this.options.drawPoints.enabled == true) {
		var groupTemplate = {
				style: this.options.drawPoints.style,
				styles: this.options.drawPoints.styles,
				size:this.options.drawPoints.size,
				className: this.className
		};
		DOMutil.drawPoint(x + 0.5 * iconWidth, y, groupTemplate, JSONcontainer, SVGcontainer);
    }
  }
  else {
    var barWidth = Math.round(0.3 * iconWidth);
    var bar1Height = Math.round(0.4 * iconHeight);
    var bar2Height = Math.round(0.75 * iconHeight);

    var offset = Math.round((iconWidth - (2 * barWidth))/3);

    DOMutil.drawBar(x + 0.5*barWidth + offset    , y + fillHeight - bar1Height - 1, barWidth, bar1Height, this.className + ' vis-bar', JSONcontainer, SVGcontainer, this.style);
    DOMutil.drawBar(x + 1.5*barWidth + offset + 2, y + fillHeight - bar2Height - 1, barWidth, bar2Height, this.className + ' vis-bar', JSONcontainer, SVGcontainer, this.style);
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
};

GraphGroup.prototype.getYRange = function(groupData) {
  return this.type.getYRange(groupData);
};

GraphGroup.prototype.getData = function(groupData) {
  return this.type.getData(groupData);
};

GraphGroup.prototype.draw = function(dataset, group, framework) {
  this.type.draw(dataset, group, framework);
};


module.exports = GraphGroup;
