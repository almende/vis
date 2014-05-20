/**
 * Created by Alex on 5/6/14.
 */

var UNGROUPED = '__ungrouped__'; // reserved group id for ungrouped items

/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Panel} backgroundPanel Panel which can be used to display the
 *                                vertical lines of box items.
 * @param {Panel} axisPanel       Panel on the axis where the dots of box-items
 *                                can be displayed.
 * @param {Panel} sidePanel      Left side panel holding labels
 * @param {Object} [options]      See ItemSet.setOptions for the available options.
 * @constructor ItemSet
 * @extends Panel
 */
function Linegraph(backgroundPanel, axisPanel, sidePanel, options, timeline, sidePanelParent) {
  this.id = util.randomUUID();

  this.timeline = timeline;

  // one options object is shared by this itemset and all its items
  this.options = options || {};
  this.backgroundPanel = backgroundPanel;
  this.axisPanel = axisPanel;
  this.sidePanel = sidePanel;
  this.sidePanelParent = sidePanelParent;
  this.itemOptions = Object.create(this.options);
  this.dom = {};
  this.hammer = null;

  this.itemsData = null;    // DataSet
  this.groupsData = null;   // DataSet
  this.range = null;        // Range or Object {start: number, end: number}

  // listeners for the DataSet of the items
//  this.itemListeners = {
//    'add': function (event, params, senderId) {
//      if (senderId != me.id) me._onAdd(params.items);
//    },
//    'update': function (event, params, senderId) {
//      if (senderId != me.id) me._onUpdate(params.items);
//    },
//    'remove': function (event, params, senderId) {
//      if (senderId != me.id) me._onRemove(params.items);
//    }
//  };
//
//  // listeners for the DataSet of the groups
//  this.groupListeners = {
//    'add': function (event, params, senderId) {
//      if (senderId != me.id) me._onAddGroups(params.items);
//    },
//    'update': function (event, params, senderId) {
//      if (senderId != me.id) me._onUpdateGroups(params.items);
//    },
//    'remove': function (event, params, senderId) {
//      if (senderId != me.id) me._onRemoveGroups(params.items);
//    }
//  };

  this.items = {};      // object with an Item for every data item
  this.groups = {};     // Group object for every group
  this.groupIds = [];

  this.selection = [];  // list with the ids of all selected nodes
  this.stackDirty = true; // if true, all items will be restacked on next repaint

  this.touchParams = {}; // stores properties while dragging
  // create the HTML DOM

  this.lastStart = 0;

  this._create();

  var me = this;
  this.timeline.on("rangechange", function() {
    if (me.lastStart != 0) {
      var offset = me.range.start - me.lastStart;
      var range = me.range.end - me.range.start;
      if (me.width != 0) {
        var rangePerPixelInv = me.width/range;
        var xOffset = offset * rangePerPixelInv;
        me.svg.style.left = util.option.asSize(-me.width - xOffset);
      }
    }
  })
  this.timeline.on("rangechanged", function() {
    me.lastStart = me.range.start;
    me.svg.style.left = util.option.asSize(-me.width);
    me.setData.apply(me);
  });
}

Linegraph.prototype = new Panel();


/**
 * Create the HTML DOM for the ItemSet
 */
Linegraph.prototype._create = function _create(){
  var frame = document.createElement('div');
  frame['timeline-linegraph'] = this;
  this.frame = frame;
  this.frame.className = 'itemset';

  // create background panel
  var background = document.createElement('div');
  background.className = 'background';
  this.backgroundPanel.frame.appendChild(background);
  this.dom.background = background;

  // create foreground panel
  var foreground = document.createElement('div');
  foreground.className = 'foreground';
  frame.appendChild(foreground);
  this.dom.foreground = foreground;

//  // create axis panel
//  var axis = document.createElement('div');
//  axis.className = 'axis';
//  this.dom.axis = axis;
//  this.axisPanel.frame.appendChild(axis);
//
//  // create labelset
//  var labelSet = document.createElement('div');
//  labelSet.className = 'labelset';
//  this.dom.labelSet = labelSet;
//  this.sidePanel.frame.appendChild(labelSet);

  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = "relative"
  this.svg.style.height = "300px";

  this.path = document.createElementNS('http://www.w3.org/2000/svg',"path");
  this.path.setAttributeNS(null, "fill","none");
  this.path.setAttributeNS(null, "stroke","blue");
  this.path.setAttributeNS(null, "stroke-width","1");

  this.path2 = document.createElementNS('http://www.w3.org/2000/svg',"path");
  this.path2.setAttributeNS(null, "fill","none");
  this.path2.setAttributeNS(null, "stroke","red");
  this.path2.setAttributeNS(null, "stroke-width","2");

  this.dom.foreground.appendChild(this.svg);

  this.svg.appendChild(this.path2);
  this.svg.appendChild(this.path);

  var yAxis = document.createElement('div');
  yAxis.style.backgroundColor = 'blue';
  yAxis.style.width = '100px';
  yAxis.style.height = this.svg.style.height;

  this.dom.yAxis = yAxis;
  this.sidePanel.frame.appendChild(yAxis);
  this.sidePanel.showPanel.apply(this.sidePanel);

  this.sidePanelParent.showPanel();
};

Linegraph.prototype.setData = function setData() {
  var data = [];


  this.startTime = this.range.start;
  var min = Date.now() - 3600000 * 24 * 30;
  var max = Date.now() + 3600000 * 24 * 10;
  var count = 60;
  var step = (max-min) / count;

  var range = this.range.end - this.range.start;

  if (this.width != 0) {
    var rangePerPixel = range/this.width;
    var rangePerPixelInv = this.width/range;
    var xOffset = -this.range.start + this.width*rangePerPixel;

    for (var i = 0; i < count; i++) {
      data.push({x:(min + i*step + xOffset) * rangePerPixelInv, y: 250*(i%2) + 25})
    }

    // catmull rom
    var p0, p1, p2, p3, bp1, bp2, bp3;
    var d2 = "M" + data[0].x + "," + data[0].y + " ";
    for (var i = 0; i < data.length - 2; i++) {
      if (i == 0) {
        p0 = data[0]
      }
      else {
        p0 = data[i-1];
      }
      p1 = data[i];
      p2 = data[i+1];
      p3 = data[i+2];

      // Catmull-Rom to Cubic Bezier conversion matrix
      //    0       1       0       0
      //  -1/6      1      1/6      0
      //    0      1/6      1     -1/6
      //    0       0       1       0

  //    bp0 = { x: p1.x,                              y: p1.y };
      bp1 = { x: ((-p0.x + 6*p1.x + p2.x) / 6), y: ((-p0.y + 6*p1.y + p2.y) / 6)};
      bp2 = { x: ((p1.x + 6*p2.x - p3.x) / 6),  y: ((p1.y + 6*p2.y - p3.y)  / 6)};
      bp3 = { x: p2.x,                              y: p2.y };

      d2 += "C" + bp1.x + "," + bp1.y + " " + bp2.x + "," + bp2.y + " " + bp3.x + "," + bp3.y + " ";
    }


    // linear
    var d = "";
    for (var i = 0; i < data.length - 1; i++) {
      if (i == 0) {
        d += "M" + data[i].x + "," + data[i].y;
      }
      else {
        d += " " + data[i].x + "," + data[i].y;
      }
    }

    this.path.setAttributeNS(null, "d",d);
    this.path2.setAttributeNS(null, "d",d2);
  }
}

/**
 * Set options for the Linegraph. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} [className]
 *                              class name for the itemset
 *                           {String} [type]
 *                              Default type for the items. Choose from 'box'
 *                              (default), 'point', or 'range'. The default
 *                              Style can be overwritten by individual items.
 *                           {String} align
 *                              Alignment for the items, only applicable for
 *                              ItemBox. Choose 'center' (default), 'left', or
 *                              'right'.
 *                           {String} orientation
 *                              Orientation of the item set. Choose 'top' or
 *                              'bottom' (default).
 *                           {Number} margin.axis
 *                              Margin between the axis and the items in pixels.
 *                              Default is 20.
 *                           {Number} margin.item
 *                              Margin between items in pixels. Default is 10.
 *                           {Number} padding
 *                              Padding of the contents of an item in pixels.
 *                              Must correspond with the items css. Default is 5.
 *                           {Function} snap
 *                              Function to let items snap to nice dates when
 *                              dragging items.
 */
Linegraph.prototype.setOptions = function setOptions(options) {
  Component.prototype.setOptions.call(this, options);
};


/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
Linegraph.prototype.setRange = function setRange(range) {
  if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
    throw new TypeError('Range must be an instance of Range, ' +
      'or an object containing start and end.');
  }
  this.range = range;
};

Linegraph.prototype.repaint = function repaint() {
  var margin = this.options.margin,
    range = this.range,
    asSize = util.option.asSize,
    asString = util.option.asString,
    options = this.options,
    orientation = this.getOption('orientation'),
    resized = false,
    frame = this.frame;

  // TODO: document this feature to specify one margin for both item and axis distance
  if (typeof margin === 'number') {
    margin = {
      item: margin,
      axis: margin
    };
  }


  // update className
  this.frame.className = 'itemset' + (options.className ? (' ' + asString(options.className)) : '');

  // check whether zoomed (in that case we need to re-stack everything)
  // TODO: would be nicer to get this as a trigger from Range
  var visibleInterval = this.range.end - this.range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval) || (this.width != this.lastWidth);
  if (zoomed) this.stackDirty = true;
  this.lastVisibleInterval = visibleInterval;
  this.lastWidth = this.width;

  // reposition frame
  this.frame.style.left    = asSize(options.left, '');
  this.frame.style.right   = asSize(options.right, '');
  this.frame.style.top     = asSize((orientation == 'top') ? '0' : '');
  this.frame.style.bottom  = asSize((orientation == 'top') ? '' : '0');
  this.frame.style.width   = asSize(options.width, '100%');
//  frame.style.height  = asSize(height);
  //frame.style.height  = asSize('height' in options ? options.height : height); // TODO: reckon with height

  // calculate actual size and position
  this.top   = this.frame.offsetTop;
  this.left  = this.frame.offsetLeft;
  this.width = this.frame.offsetWidth;
//  this.height = height;

  // check if this component is resized
  resized = this._isResized() || resized;

  if (resized) {
    this.svg.style.width = asSize(3*this.width);
    this.svg.style.left = asSize(-this.width);
  }
  if (zoomed) {
    this.setData();
  }




}
