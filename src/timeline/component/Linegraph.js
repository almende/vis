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

//  listeners for the DataSet of the items
//  this.itemListeners = {
//    'add': function(event, params, senderId) {
//      if (senderId != me.id) me._onAdd(params.items);
//    },
//    'update': function(event, params, senderId) {
//      if (senderId != me.id) me._onUpdate(params.items);
//    },
//    'remove': function(event, params, senderId) {
//      if (senderId != me.id) me._onRemove(params.items);
//    }
//  };
//
//  // listeners for the DataSet of the groups
//  this.groupListeners = {
//    'add': function(event, params, senderId) {
//      if (senderId != me.id) me._onAddGroups(params.items);
//    },
//    'update': function(event, params, senderId) {
//      if (senderId != me.id) me._onUpdateGroups(params.items);
//    },
//    'remove': function(event, params, senderId) {
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

//  this.data = new DataView(this.items)
}

Linegraph.prototype = new Panel();


/**
 * Create the HTML DOM for the ItemSet
 */
Linegraph.prototype._create = function(){
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
  this.svg.style.display = "block";

  this.path = document.createElementNS('http://www.w3.org/2000/svg',"path");
  this.path.setAttributeNS(null, "fill","none");
  this.path.setAttributeNS(null, "stroke","blue");
  this.path.setAttributeNS(null, "stroke-width","1");

  this.path2 = document.createElementNS('http://www.w3.org/2000/svg',"path");
  this.path2.setAttributeNS(null, "fill","none");
  this.path2.setAttributeNS(null, "stroke","red");
  this.path2.setAttributeNS(null, "stroke-width","1");

  this.path3 = document.createElementNS('http://www.w3.org/2000/svg',"path");
  this.path3.setAttributeNS(null, "fill","none");
  this.path3.setAttributeNS(null, "stroke","green");
  this.path3.setAttributeNS(null, "stroke-width","1");

  this.dom.foreground.appendChild(this.svg);

  this.svg.appendChild(this.path3);
  this.svg.appendChild(this.path2);
  this.svg.appendChild(this.path);

//  this.yAxisDiv = document.createElement('div');
//  this.yAxisDiv.style.backgroundColor = 'rgb(220,220,220)';
//  this.yAxisDiv.style.width = '100px';
//  this.yAxisDiv.style.height = this.svg.style.height;

  this._createAxis();

//  this.dom.yAxisDiv = this.yAxisDiv;
//  this.sidePanel.frame.appendChild(this.yAxisDiv);
  this.sidePanel.showPanel.apply(this.sidePanel);

  this.sidePanelParent.showPanel();
};

Linegraph.prototype._createAxis = function() {
  // panel with time axis
  var dataAxisOptions = {
    range: this.range,
    left: null,
    top: null,
    width: null,
    height: 300,
    svg: this.svg
  };
  this.yAxis = new DataAxis(dataAxisOptions);
  this.sidePanel.frame.appendChild(this.yAxis.getFrame());

}

Linegraph.prototype.setData = function() {
  if (this.width != 0) {
    var dataview = new DataView(this.timeline.itemsData,
      {filter: function (item) {return (item.value);}})

    var datapoints = dataview.get();
    if (datapoints != null) {
      if (datapoints.length > 0) {
        var dataset = this._extractData(datapoints);
        var data = dataset.data;

        console.log("height",data,datapoints, dataset);

        this.yAxis.setRange({start:dataset.range.low,end:dataset.range.high});
        this.yAxis.repaint();
        data = this.yAxis.convertValues(data);

        var d, d2, d3;
        d = this._catmullRom(data,0.5);
        d3 = this._catmullRom(data,0);
        d2 = this._catmullRom(data,1);


//        var data2 = [];
//        this.startTime = this.range.start;
//        var min = Date.now() - 3600000 * 24 * 30;
//        var max = Date.now() + 3600000 * 24 * 10;
//        var count = 60;
//        var step = (max-min) / count;
//
//        var range = this.range.end - this.range.start;
//        var rangePerPixel = range/this.width;
//        var rangePerPixelInv = this.width/range;
//        var xOffset = -this.range.start + this.width*rangePerPixel;
//
//        for (var i = 0; i < count; i++) {
//          data2.push({x:(min + i*step + xOffset) * rangePerPixelInv, y: 250*(i%2) + 25})
//        }
//
//        var d2 = this._catmullRom(data2);





        this.path.setAttributeNS(null, "d",d);
        this.path2.setAttributeNS(null, "d",d2);
        this.path3.setAttributeNS(null, "d",d3);
      }
    }
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
 *                            {String} orientation
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
Linegraph.prototype.setOptions = function(options) {
  Component.prototype.setOptions.call(this, options);
};


Linegraph.prototype._extractData = function(dataset) {
  var extractedData = [];
  var low = dataset[0].value;
  var high = dataset[0].value;

  var range = this.range.end - this.range.start;
  var rangePerPixel = range/this.width;
  var rangePerPixelInv = this.width/range;
  var xOffset = -this.range.start + this.width*rangePerPixel;

  for (var i = 0; i < dataset.length; i++) {
    var val = new Date(dataset[i].start).getTime();

    val += xOffset;
    val *= rangePerPixelInv;

    extractedData.push({x:val, y:dataset[i].value});

    if (low > dataset[i].value) {
      low = dataset[i].value;
    }
    if (high < dataset[i].value) {
      high = dataset[i].value;
    }
  }

  //extractedData.sort(function (a,b) {return a.x - b.x;})
  return {range:{low:low,high:high},data:extractedData};
}

Linegraph.prototype._catmullRomUniform = function(data) {
  // catmull rom
  var p0, p1, p2, p3, bp1, bp2
  var d = "M" + Math.round(data[0].x) + "," + Math.round(data[0].y) + " ";
  var normalization = 1/6;
  var length = data.length;
  for (var i = 0; i < length - 1; i++) {

    p0 = (i == 0) ? data[0] : data[i-1];
    p1 = data[i];
    p2 = data[i+1];
    p3 = (i + 2 < length) ? data[i+2] : p2;


    // Catmull-Rom to Cubic Bezier conversion matrix
    //    0       1       0       0
    //  -1/6      1      1/6      0
    //    0      1/6      1     -1/6
    //    0       0       1       0

    //    bp0 = { x: p1.x,                               y: p1.y };
    bp1 = { x: ((-p0.x + 6*p1.x + p2.x) *normalization), y: ((-p0.y + 6*p1.y + p2.y) *normalization)};
    bp2 = { x: (( p1.x + 6*p2.x - p3.x) *normalization), y: (( p1.y + 6*p2.y - p3.y) *normalization)};
    //    bp0 = { x: p2.x,                               y: p2.y };

    d += "C" +
      Math.round(bp1.x) + "," +
      Math.round(bp1.y) + " " +
      Math.round(bp2.x) + "," +
      Math.round(bp2.y) + " " +
      Math.round(p2.x) + "," +
      Math.round(p2.y) + " ";
  }

  return d;
};


Linegraph.prototype._catmullRom = function(data, alpha) {
  if (alpha == 0 || alpha === undefined) {
    return this._catmullRomUniform(data);
  }
  else {
    var p0, p1, p2, p3, bp1, bp2, d1,d2,d3, A, B, N, M;
    var d3powA, d2powA, d3pow2A, d2pow2A, d1pow2A, d1powA;
    var d = "M" + Math.round(data[0].x) + "," + Math.round(data[0].y) + " ";
    var length = data.length;
    for (var i = 0; i < length - 1; i++) {

      p0 = (i == 0) ? data[0] : data[i-1];
      p1 = data[i];
      p2 = data[i+1];
      p3 = (i + 2 < length) ? data[i+2] : p2;

      d1 = Math.sqrt(Math.pow(p0.x - p1.x,2) + Math.pow(p0.y - p1.y,2));
      d2 = Math.sqrt(Math.pow(p1.x - p2.x,2) + Math.pow(p1.y - p2.y,2));
      d3 = Math.sqrt(Math.pow(p2.x - p3.x,2) + Math.pow(p2.y - p3.y,2));

      // Catmull-Rom to Cubic Bezier conversion matrix
      //
      // A = 2d1^2a + 3d1^a * d2^a + d3^2a
      // B = 2d3^2a + 3d3^a * d2^a + d2^2a
      //
      // [   0             1            0          0          ]
      // [   -d2^2a/N      A/N          d1^2a/N    0          ]
      // [   0             d3^2a/M      B/M        -d2^2a/M   ]
      // [   0             0            1          0          ]

      // [   0             1            0          0          ]
      // [   -d2pow2a/N    A/N          d1pow2a/N  0          ]
      // [   0             d3pow2a/M    B/M        -d2pow2a/M ]
      // [   0             0            1          0          ]

      d3powA  = Math.pow(d3,  alpha);
      d3pow2A = Math.pow(d3,2*alpha);
      d2powA  = Math.pow(d2,  alpha);
      d2pow2A = Math.pow(d2,2*alpha);
      d1powA  = Math.pow(d1,  alpha);
      d1pow2A = Math.pow(d1,2*alpha);

      A = 2*d1pow2A + 3*d1powA * d2powA + d2pow2A;
      B = 2*d3pow2A + 3*d3powA * d2powA + d2pow2A;
      N = 3*d1powA * (d1powA + d2powA);
      if (N > 0) {N = 1 / N;}
      M = 3*d3powA * (d3powA + d2powA);
      if (M > 0) {M = 1 / M;}

      bp1 = { x: ((-d2pow2A * p0.x + A*p1.x + d1pow2A * p2.x) * N),
              y: ((-d2pow2A * p0.y + A*p1.y + d1pow2A * p2.y) * N)};

      bp2 = { x: (( d3pow2A * p1.x + B*p2.x - d2pow2A * p3.x) * M),
              y: (( d3pow2A * p1.y + B*p2.y - d2pow2A * p3.y) * M)};

      if (bp1.x == 0 && bp1.y == 0) {bp1 = p1;}
      if (bp2.x == 0 && bp2.y == 0) {bp2 = p2;}
      d += "C" +
        Math.round(bp1.x) + "," +
        Math.round(bp1.y) + " " +
        Math.round(bp2.x) + "," +
        Math.round(bp2.y) + " " +
        Math.round(p2.x) + "," +
        Math.round(p2.y) + " ";
    }

    return d;
  }
};


Linegraph.prototype._linear = function(data) {
  // linear
  var d = "";
  for (var i = 0; i < data.length; i++) {
    if (i == 0) {
      d += "M" + data[i].x + "," + data[i].y;
    }
    else {
      d += " " + data[i].x + "," + data[i].y;
    }
  }
  return d;
}

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
Linegraph.prototype.setRange = function(range) {
  if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
    throw new TypeError('Range must be an instance of Range, ' +
      'or an object containing start and end.');
  }
  this.range = range;
};

Linegraph.prototype.repaint = function() {
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
