

function Linegraph(body, options) {
  this.id = util.randomUUID();
  this.body = body;

  this.defaultOptions = {
    catmullRom: {
      enabled: true,
      parametrization: 'centripetal', // uniform (0,0), chordal (1.0), centripetal (0.5)
      alpha: 0.5
    }
  };

  // options is shared by this ItemSet and all its items
  this.options = util.extend({}, this.defaultOptions);
  this.dom = {};
  this.props = {};
  this.hammer = null;

  var me = this;
  this.itemsData = null;    // DataSet
  this.groupsData = null;   // DataSet

  // listeners for the DataSet of the items
  this.itemListeners = {
    'add': function (event, params, senderId) {
      me._onAdd(params.items);
    },
    'update': function (event, params, senderId) {
      me._onUpdate(params.items);
    },
    'remove': function (event, params, senderId) {
      me._onRemove(params.items);
    }
  };

  this.items = {};      // object with an Item for every data item
  this.selection = [];  // list with the ids of all selected nodes
  this.lastStart = this.body.range.start;
  this.touchParams = {}; // stores properties while dragging
  this.lines = [];
  this.redundantLines = [];
  // create the HTML DOM

  this._create();
  var me = this;

  this.body.emitter.on("rangechange",function() {
      if (me.lastStart != 0) {
        var offset = me.body.range.start - me.lastStart;
        var range = me.body.range.end - me.body.range.start;
        if (me.width != 0) {
          var rangePerPixelInv = me.width/range;
          var xOffset = offset * rangePerPixelInv;
          me.svg.style.left = (-me.width - xOffset) + "px";
        }
      }
    });
  this.body.emitter.on("rangechanged", function() {
    me.lastStart = me.body.range.start;
    me.svg.style.left = util.option.asSize(-me.width);
    me.updateGraph.apply(me);
  });

  this.setOptions(options);
  this.body.emitter.emit("change");
}

Linegraph.prototype = new Component();

/**
 * Create the HTML DOM for the ItemSet
 */
Linegraph.prototype._create = function(){
  var frame = document.createElement('div');
  frame.className = 'linegraph';
  frame['linegraph'] = this;
  this.dom.frame = frame;

  // create background panel
  var background = document.createElement('div');
  background.className = 'background';
  frame.appendChild(background);
  this.dom.background = background;

  // create foreground panel
  var foreground = document.createElement('div');
  foreground.className = 'foreground';
  frame.appendChild(foreground);
  this.dom.foreground = foreground;

  // create svg element for graph drawing.
  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = "relative"
  this.svg.style.height = "300px";
  this.svg.style.display = "block";

  frame.appendChild(this.svg);
  // panel with time axis
  this.yAxis = new DataAxis(this.body, {
    orientation: 'left',
    showMinorLabels: true,
    showMajorLabels: true,
    width: '90px',
    height: this.svg.style.height
  });

  this.show();
};


Linegraph.prototype.setOptions = function(options) {
  if (options) {
    var fields = ['catmullRom'];
    util.selectiveExtend(fields, this.options, options);
    console.log(this.options);
    if (options.catmullRom) {
      if (typeof options.catmullRom == 'boolean') {
        this.options.catmullRom.enabled = options.catmullRom;
      }
      else {
        if (options.catmullRom.enabled) {
          this.options.catmullRom.enabled = options.catmullRom.enabled;
        }
        else {
          this.options.catmullRom.enabled = true;
        }
        if (options.catmullRom.parametrization) {
          this.options.catmullRom.parametrization = options.catmullRom.parametrization;
          if (options.catmullRom.parametrization == 'uniform') {
            this.options.catmullRom.alpha = 0;
          }
          else if (options.catmullRom.parametrization == 'chordal') {
            this.options.catmullRom.alpha = 1.0;
          }
          else {
            this.options.catmullRom.parametrization = 'centripetal'
            this.options.catmullRom.alpha = 0.5;
          }
        }
        if (options.catmullRom.alpha) {
          this.options.catmullRom.alpha = options.catmullRom.alpha;
        }
      }
    }
  }
};

/**
 * Hide the component from the DOM
 */
Linegraph.prototype.hide = function() {
  // remove the frame containing the items
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * @return {Boolean} changed
 */
Linegraph.prototype.show = function() {
  // show frame containing the items
  if (!this.dom.frame.parentNode) {
    this.body.dom.center.appendChild(this.dom.frame);
  }
};




/**
 * Set items
 * @param {vis.DataSet | null} items
 */
Linegraph.prototype.setItems = function(items) {
  var me = this,
    ids,
    oldItemsData = this.itemsData;

  // replace the dataset
  if (!items) {
    this.itemsData = null;
  }
  else if (items instanceof DataSet || items instanceof DataView) {
    this.itemsData = items;
  }
  else {
    throw new TypeError('Data must be an instance of DataSet or DataView');
  }

  if (oldItemsData) {
    // unsubscribe from old dataset
    util.forEach(this.itemListeners, function (callback, event) {
      oldItemsData.off(event, callback);
    });

    // remove all drawn items
    ids = oldItemsData.getIds();
    this._onRemove(ids);
  }

  if (this.itemsData) {
    // subscribe to new dataset
    var id = this.id;
    util.forEach(this.itemListeners, function (callback, event) {
      me.itemsData.on(event, callback, id);
    });

    // add all new items
    ids = this.itemsData.getIds();
    this._onAdd(ids);
  }
  this.redraw();
};


/**
 * Handle added items
 * @param {Number[]} ids
 * @protected
 */


/**
 * Handle updated items
 * @param {Number[]} ids
 * @protected
 */
Linegraph.prototype._onUpdate = function(ids) {};
Linegraph.prototype._onAdd = Linegraph.prototype._onUpdate;
Linegraph.prototype._onRemove = function(ids) {};



/**
 * Repaint the component
 * @return {boolean} Returns true if the component is resized
 */
Linegraph.prototype.redraw = function() {
  var resized = false;

  if (this.lastWidth === undefined && this.width) {
    resized = true;
  }
  // check whether zoomed (in that case we need to re-stack everything)
  var visibleInterval = this.body.range.end - this.body.range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval) || (this.width != this.lastWidth);
  this.lastVisibleInterval = visibleInterval;
  this.lastWidth = this.width;

  // calculate actual size and position
  this.width = this.dom.frame.offsetWidth;

  // check if this component is resized
  resized = this._isResized() || resized;
  if (resized) {
    this.svg.style.width = util.option.asSize(3*this.width);
    this.svg.style.left = util.option.asSize(-this.width);
  }
  if (zoomed) {
    this.updateGraph();
  }
};


Linegraph.prototype.updateGraph = function() {
  // reset the lines
  this.redundantLines = this.lines;
  this.lines = [];

  if (this.width != 0 && this.itemsData != null) {
    // get the range for the y Axis and draw it
    var yRange = {start:this.itemsData.min('y').y,end:this.itemsData.max('y').y};
    this.yAxis.setRange(yRange);
    this.yAxis.redraw();


    console.log(this.itemsData);
    // look at different lines
    var classes = this.itemsData.distinct('className');
    var datapoints;

    if (classes.length == 0) {
      datapoints = this.itemsData.get();
      this.drawGraph(datapoints, 'default');
    }
    else {
      for (var i = 0; i < classes.length; i++) {
        datapoints = this.itemsData.get({filter: function(item) {return item.className == classes[i];}});
        this.drawGraph(datapoints, classes[i]);
      }
    }
  }

  // cleanup the redundant lines;
  for (var i = 0; i < this.redundantLines.length; i++) {
    this.redundantLines[i].parentNode.removeChild(this.redundantLines[i]);
  }
  this.redundantLines = [];
}

Linegraph.prototype.drawGraph = function(datapoints, className) {
  if (datapoints != null) {
    if (datapoints.length > 0) {
      var dataset = this._prepareData(datapoints);
      var path, d;
      if (this.redundantLines.length != 0) {
        path = this.redundantLines[this.redundantLines.length-1];
        this.redundantLines.pop()
      }
      else {
        path = document.createElementNS('http://www.w3.org/2000/svg',"path");
        this.svg.appendChild(path);
      }
      path.setAttributeNS(null, "class",className);
      this.lines.push(path);

      if (this.options.catmullRom.enabled == true) {
        d = this._catmullRom(dataset,this.options.catmullRom.alpha);
      }
      else {
        d = this._linear(dataset);
      }

      path.setAttributeNS(null, "d",d);
    }
  }
}


Linegraph.prototype._prepareData = function(dataset) {
  var extractedData = [];
  for (var i = 0; i < dataset.length; i++) {
    var xValue = this.body.util.toScreen(new Date(dataset[i].x)) + this.width;
    var yValue = this.yAxis.convertValue(dataset[i].y);
    extractedData.push({x:xValue, y:yValue});
  }
//  extractedData.sort(function (a,b) {return a.x - b.x;});
  return extractedData;
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
