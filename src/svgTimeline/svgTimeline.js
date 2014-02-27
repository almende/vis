/**
 * Created by Alex on 2/27/14.
 */



function SvgAxis (range,mainId, constants) {
  this.svgId = mainId;
  this.range = range;
  this.constants = constants;
  this.duration = this.range.end - this.range.start; // in milliseconds
  this.minColumnWidth = 100;

  this._drawElements();
  this._update();
}

SvgAxis.prototype._drawElements = function() {
  d3.select(this.svgId)
    .append("rect")
    .attr("id","bars")
    .attr("x",0)
    .attr("y",0)
    .attr("width", this.constants.width)
    .attr("height",this.constants.barHeight)
    .style("stroke", "rgb(6,120,155)");

  this.leftText = d3.select(this.svgId)
    .append("text")
    .attr("x", 5)
    .attr("y", 20)
    .attr("font-size", 14)
    .text(moment(this.range.start));

  this.rightText = d3.select(this.svgId)
    .append("text")
    .attr("y", 20)
    .attr("font-size", 14)
    .text(moment(this.range.end))
  this.rightText.attr("x", this.constants.width - 5 - this.rightText.node().getBBox().width);

  this.dateLabels = {};
  this.markerLines = {};
}

SvgAxis.prototype._createMarkerLine = function(index) {
  this.markerLines[index] = {svg:d3.select("svg#main").append("line")
    .attr('y1',0)
    .attr('y2',this.constants.height)
    .style("stroke", "rgb(220,220,220)")
  }
}

SvgAxis.prototype._createDateLabel = function(index) {
  this.dateLabels[index] = {svg:d3.select(this.svgId)
    .append("text")
    .attr("font-size",12)
    , active:false};
}

SvgAxis.prototype._update = function() {
  this.duration = this.range.end - this.range.start; // in milliseconds
  this.leftText.text(moment(this.range.start).format("DD-MM-YYYY HH:mm:ss"))

  this.rightText.text(moment(this.range.end).format("DD-MM-YYYY"))
  this.rightText.attr("x", this.constants.width - 5 - this.rightText.node().getBBox().width);

  this.msPerPixel = this.duration / this.constants.width;
  this.columnDuration = this.minColumnWidth * this.msPerPixel;

  var milliSecondScale = [1,10,50,100,250,500];
  var secondScale = [1,5,15,30];
  var minuteScale = [1,5,15,30];
  var hourScale = [1,3,6,12];
  var dayScale = [1,2,3,5,10,15];
  var monthScale = [1,2,3,4,5,6];
  var yearScale = [1,2,3,4,5,6,7,8,9,10,15,20,25,50,75,100,150,250,500,1000];
  var multipliers = [1,1000,60000,3600000,24*3600000,30*24*3600000,365*24*3600000];
  var scales = [milliSecondScale,secondScale,minuteScale,hourScale,dayScale,monthScale,yearScale]
  var formats = ["SSS","mm:ss","hh:mm:ss","DD HH:mm","MM-DD","MM","YYYY"]
  var indices = this._getAppropriateScale(scales,multipliers);
  var scale = scales[indices[0]][indices[1]] * multipliers[indices[0]];

  var dateCorrection = (this.range.start.valueOf() % scale) +3600000;

  for (var i = 0; i < 30; i++) {
    var date = this.range.start + i*scale - dateCorrection;
    if (((i+1)*scale - dateCorrection)/this.msPerPixel > this.constants.width + 200) {
      if (this.dateLabels.hasOwnProperty(i)) {
        this.dateLabels[i].svg.remove();
        delete this.dateLabels[i]
      }
      if (this.markerLines.hasOwnProperty(i)) {
        this.markerLines[i].svg.remove();
        delete this.markerLines[i]
      }
    }
    else {
      if (!this.dateLabels.hasOwnProperty(i)) {
        this._createDateLabel(i);
      }
      if (!this.markerLines.hasOwnProperty(i)) {
        this._createMarkerLine(i);
      }

      this.dateLabels[i].svg.text(moment(date).format(formats[indices[0]]))
        .attr("x",(i*scale - dateCorrection)/this.msPerPixel)
        .attr("y",50)
      this.markerLines[i].svg.attr("x1",(i*scale - dateCorrection)/this.msPerPixel)
                             .attr("x2",(i*scale - dateCorrection)/this.msPerPixel)
    }
  }
}

SvgAxis.prototype._getAppropriateScale = function(scales,multipliers) {
  for (var i = 0; i < scales.length; i++) {
    for (var j = 0; j < scales[i].length; j++) {
      if (scales[i][j] * multipliers[i] > this.columnDuration) {
          return [i,j]
      }
    }
  }
}


/**
 * @constructor SvgTimeline
 * Create a graph visualization, displaying nodes and edges.
 *
 * @param {Element} container   The DOM element in which the Graph will
 *                                  be created. Normally a div element.
 * @param {Object} items        An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 */
function SvgTimeline (container, items, options) {
  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);

  this.range = {start:now.clone().add('days', -3).valueOf(),
                end:  now.clone().add('days', 4).valueOf()}
  this.constants = {
    width:1400,
    height:400,
    barHeight: 60
  }

  this.container = container;
  this._createSVG();


  this.axis = new SvgAxis(this.range,"svg#main",this.constants);

  var me = this;
  this.hammer = Hammer(document.getElementById("main"), {
    prevent_default: true
  });
  this.hammer.on('tap',       me._onTap.bind(me) );
  this.hammer.on('doubletap', me._onDoubleTap.bind(me) );
  this.hammer.on('hold',      me._onHold.bind(me) );
  this.hammer.on('pinch',     me._onPinch.bind(me) );
  this.hammer.on('touch',     me._onTouch.bind(me) );
  this.hammer.on('dragstart', me._onDragStart.bind(me) );
  this.hammer.on('drag',      me._onDrag.bind(me) );
  this.hammer.on('dragend',   me._onDragEnd.bind(me) );
  this.hammer.on('release',   me._onRelease.bind(me) );
  this.hammer.on('mousewheel',me._onMouseWheel.bind(me) );
  this.hammer.on('DOMMouseScroll',me._onMouseWheel.bind(me) ); // for FF
  this.hammer.on('mousemove', me._onMouseMoveTitle.bind(me) );
  //this._drawLines();

}

SvgTimeline.prototype._createSVG = function() {
  d3.select("div#visualization")
    .append("svg").attr("id","main")
    .attr("width",this.constants.width)
    .attr("height",this.constants.height)
    .attr("style","border:1px solid black")
};



/**
 * Get the pointer location from a touch location
 * @param {{pageX: Number, pageY: Number}} touch
 * @return {{x: Number, y: Number}} pointer
 * @private
 */
SvgTimeline.prototype._getPointer = function (touch) {
  return {
    x: touch.pageX,
    y: touch.pageY
  };
};

SvgTimeline.prototype._onTap = function() {};
SvgTimeline.prototype._onDoubleTap = function() {};
SvgTimeline.prototype._onHold = function() {};
SvgTimeline.prototype._onPinch = function() {};
SvgTimeline.prototype._onTouch = function(event) {};
SvgTimeline.prototype._onDragStart = function(event) {
  this.initialDragPos = this._getPointer(event.gesture.center);
};
SvgTimeline.prototype._onDrag = function(event) {
  var pointer = this._getPointer(event.gesture.center);
  var diffX = pointer.x - this.initialDragPos.x;
//  var diffY = pointer.y - this.initialDragPos.y;

  this.initialDragPos = pointer;

  this.range.start -= diffX * this.axis.msPerPixel;
  this.range.end -= diffX * this.axis.msPerPixel;
  this._update();
};
SvgTimeline.prototype._onDragEnd = function() {};
SvgTimeline.prototype._onRelease = function() {};
SvgTimeline.prototype._onMouseWheel = function(event) {

  var delta = 0;
  if (event.wheelDelta) { /* IE/Opera. */
    delta = event.wheelDelta/120;
  }
  else if (event.detail) { /* Mozilla case. */
    // In Mozilla, sign of delta is different than in IE.
    // Also, delta is multiple of 3.
    delta = -event.detail/3;
  }
  if (delta) {
    var pointer = {x:event.x, y:event.y}
    var center = this.range.start + this.axis.duration * 0.5;
    var zoomSpeed = 0.1;
    var scrollSpeed = 0.1;

    this.range.start = center - 0.5*(this.axis.duration * (1 - delta*zoomSpeed));
    this.range.end = this.range.start + (this.axis.duration * (1 - delta*zoomSpeed));

    var diffX = delta*(pointer.x - 0.5*this.constants.width);
//  var diffY = pointer.y - this.initialDragPos.y;


    this.range.start -= diffX * this.axis.msPerPixel * scrollSpeed;
    this.range.end -= diffX * this.axis.msPerPixel * scrollSpeed;

    this._update();
  }
};
SvgTimeline.prototype._onMouseMoveTitle = function() {};


SvgTimeline.prototype._update = function() {
  this.axis._update();
}