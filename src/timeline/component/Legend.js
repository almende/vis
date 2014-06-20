/**
 * Created by Alex on 6/17/14.
 */
function Legend(body, options, linegraph) {
  this.body = body;
  this.linegraph = linegraph;
  this.defaultOptions = {
    orientation: 'left', // left, right
    position: 'left',     // left, center, right
    visible: true
  }

  this.options = util.extend({},this.defaultOptions);

  this.svgElements = {};
  this.dom = {};
  this.classes;
  this.groups = {};

  this.setOptions(options);
  this.create();
};

Legend.prototype = new Component();


Legend.prototype.addGroup = function(label, graphOptions) {
  if (!this.groups.hasOwnProperty(label)) {
    this.groups[label] = graphOptions;
  }
};

Legend.prototype.updateGroup = function(label, graphOptions) {
  this.groups[label] = graphOptions;
};

Legend.prototype.deleteGroup = function(label) {
  if (this.groups.hasOwnProperty(label)) {
    delete this.groups[label];
  }
};

Legend.prototype.create = function() {
  var frame = document.createElement('div');
  frame.className = 'legend';
  frame['legend'] = this;
  this.dom.frame = frame;

  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = "absolute";
  this.svg.style.top = "10px";
  this.svg.style.height = "300px";
  this.svg.style.width = "300px";
  this.svg.style.display = "block";

  this.dom.frame.appendChild(this.svg);
}

/**
 * Hide the component from the DOM
 */
Legend.prototype.hide = function() {
  // remove the frame containing the items
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * @return {Boolean} changed
 */
Legend.prototype.show = function() {
  // show frame containing the items
  if (!this.dom.frame.parentNode) {
    this.body.dom.center.appendChild(this.dom.frame);
  }
};

Legend.prototype.setOptions = function(options) {
  var fields = ['orientation'];
  util.selectiveExtend(fields, this.options, options);
}

Legend.prototype.redraw = function() {
  if (this.options.orientation == 'left') {
    this.svg.style.left = '10px';
  }
  else {
    this.svg.style.right = '10px';
  }
  console.log(this.graphs);
//  this.drawLegend();
}

Legend.prototype.drawLegend = function() {
  this.linegraph._prepareSVGElements.call(this,this.svgElements);
  var x = 0;
  var y = 0;
  var lineLength = 30;
  var fillHeight = 10;
  var spacing = 25;
  var path, fillPath, outline;
  var legendWidth = 298;
  var padding = 5;

  var border = this._getSVGElement("rect", this.svgLegendElements, this.svgLegend);
  border.setAttributeNS(null, "x", x);
  border.setAttributeNS(null, "y", y);
  border.setAttributeNS(null, "width", legendWidth);
  border.setAttributeNS(null, "height", y + padding + classes.length * spacing);
  border.setAttributeNS(null, "class", "legendBackground");
  x += 5;
  y += fillHeight + padding;

  if (classes.length > 0) {
    for (var i = 0; i < classes.length; i++) {
      outline = this._getSVGElement("rect", this.svgLegendElements, this.svgLegend);
      outline.setAttributeNS(null, "x", x);
      outline.setAttributeNS(null, "y", y - fillHeight);
      outline.setAttributeNS(null, "width", lineLength);
      outline.setAttributeNS(null, "height", 2*fillHeight);
      outline.setAttributeNS(null, "class", "outline");

      path = this._getSVGElement("path", this.svgLegendElements, this.svgLegend);
      path.setAttributeNS(null, "class", classes[i]);
      path.setAttributeNS(null, "d", "M" + x + ","+y+" L" + (x + lineLength) + ","+y+"");
      if (this.options.shaded.enabled == true) {
        fillPath = this._getSVGElement("path", this.svgLegendElements, this.svgLegend);
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
        fillPath.setAttributeNS(null, "class", classes[i] + " fill");
      }

      if (this.options._drawPoints.enabled == true) {
        this.drawPoint(x + 0.5 * lineLength,y,classes[i], this.svgLegendElements, this.svgLegend);
      }
      y += spacing;
    }
  }
  else {
    //TODO: bars
  }



  this._cleanupSVGElements(this.svgLegendElements);
}