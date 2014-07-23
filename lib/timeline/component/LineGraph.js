var util = require('../../util');
var DOMutil = require('../../DOMutil');
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');
var Component = require('./Component');
var DataAxis = require('./DataAxis');
var GraphGroup = require('./GraphGroup');
var Legend = require('./Legend');

var UNGROUPED = '__ungrouped__'; // reserved group id for ungrouped items

/**
 * This is the constructor of the LineGraph. It requires a Timeline body and options.
 *
 * @param body
 * @param options
 * @constructor
 */
function LineGraph(body, options) {
  this.id = util.randomUUID();
  this.body = body;

  this.defaultOptions = {
    yAxisOrientation: 'left',
    defaultGroup: 'default',
    sort: true,
    sampling: true,
    graphHeight: '400px',
    shaded: {
      enabled: false,
      orientation: 'bottom' // top, bottom
    },
    style: 'line', // line, bar
    barChart: {
      width: 50,
      align: 'center' // left, center, right
    },
    catmullRom: {
      enabled: true,
      parametrization: 'centripetal', // uniform (alpha = 0.0), chordal (alpha = 1.0), centripetal (alpha = 0.5)
      alpha: 0.5
    },
    drawPoints: {
      enabled: true,
      size: 6,
      style: 'square' // square, circle
    },
    dataAxis: {
      showMinorLabels: true,
      showMajorLabels: true,
      icons: false,
      width: '40px',
      visible: true
    },
    legend: {
      enabled: false,
      icons: true,
      left: {
        visible: true,
        position: 'top-left' // top/bottom - left,right
      },
      right: {
        visible: true,
        position: 'top-right' // top/bottom - left,right
      }
    }
  };

  // options is shared by this ItemSet and all its items
  this.options = util.extend({}, this.defaultOptions);
  this.dom = {};
  this.props = {};
  this.hammer = null;
  this.groups = {};

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

  // listeners for the DataSet of the groups
  this.groupListeners = {
    'add': function (event, params, senderId) {
      me._onAddGroups(params.items);
    },
    'update': function (event, params, senderId) {
      me._onUpdateGroups(params.items);
    },
    'remove': function (event, params, senderId) {
      me._onRemoveGroups(params.items);
    }
  };

  this.items = {};      // object with an Item for every data item
  this.selection = [];  // list with the ids of all selected nodes
  this.lastStart = this.body.range.start;
  this.touchParams = {}; // stores properties while dragging

  this.svgElements = {};
  this.setOptions(options);
  this.groupsUsingDefaultStyles = [0];

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
    me._updateGraph.apply(me);
  });

  // create the HTML DOM
  this._create();
  this.body.emitter.emit("change");
}

LineGraph.prototype = new Component();

/**
 * Create the HTML DOM for the ItemSet
 */
LineGraph.prototype._create = function(){
  var frame = document.createElement('div');
  frame.className = 'LineGraph';
  this.dom.frame = frame;

  // create svg element for graph drawing.
  this.svg = document.createElementNS('http://www.w3.org/2000/svg',"svg");
  this.svg.style.position = "relative";
  this.svg.style.height = ('' + this.options.graphHeight).replace("px",'') + 'px';
  this.svg.style.display = "block";
  frame.appendChild(this.svg);

  // data axis
  this.options.dataAxis.orientation = 'left';
  this.yAxisLeft = new DataAxis(this.body, this.options.dataAxis, this.svg);

  this.options.dataAxis.orientation = 'right';
  this.yAxisRight = new DataAxis(this.body, this.options.dataAxis, this.svg);
  delete this.options.dataAxis.orientation;

  // legends
  this.legendLeft = new Legend(this.body, this.options.legend, 'left');
  this.legendRight = new Legend(this.body, this.options.legend, 'right');

  this.show();
};

/**
 * set the options of the LineGraph. the mergeOptions is used for subObjects that have an enabled element.
 * @param options
 */
LineGraph.prototype.setOptions = function(options) {
  if (options) {
    var fields = ['sampling','defaultGroup','graphHeight','yAxisOrientation','style','barChart','dataAxis','sort'];
    util.selectiveDeepExtend(fields, this.options, options);
    util.mergeOptions(this.options, options,'catmullRom');
    util.mergeOptions(this.options, options,'drawPoints');
    util.mergeOptions(this.options, options,'shaded');
    util.mergeOptions(this.options, options,'legend');

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

    if (this.yAxisLeft) {
      if (options.dataAxis !== undefined) {
        this.yAxisLeft.setOptions(this.options.dataAxis);
        this.yAxisRight.setOptions(this.options.dataAxis);
      }
    }

    if (this.legendLeft) {
      if (options.legend !== undefined) {
        this.legendLeft.setOptions(this.options.legend);
        this.legendRight.setOptions(this.options.legend);
      }
    }

    if (this.groups.hasOwnProperty(UNGROUPED)) {
      this.groups[UNGROUPED].setOptions(options);
    }
  }
  if (this.dom.frame) {
    this._updateGraph();
  }
};

/**
 * Hide the component from the DOM
 */
LineGraph.prototype.hide = function() {
  // remove the frame containing the items
  if (this.dom.frame.parentNode) {
    this.dom.frame.parentNode.removeChild(this.dom.frame);
  }
};

/**
 * Show the component in the DOM (when not already visible).
 * @return {Boolean} changed
 */
LineGraph.prototype.show = function() {
  // show frame containing the items
  if (!this.dom.frame.parentNode) {
    this.body.dom.center.appendChild(this.dom.frame);
  }
};


/**
 * Set items
 * @param {vis.DataSet | null} items
 */
LineGraph.prototype.setItems = function(items) {
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
  this._updateUngrouped();
  this._updateGraph();
  this.redraw();
};

/**
 * Set groups
 * @param {vis.DataSet} groups
 */
LineGraph.prototype.setGroups = function(groups) {
  var me = this,
    ids;

  // unsubscribe from current dataset
  if (this.groupsData) {
    util.forEach(this.groupListeners, function (callback, event) {
      me.groupsData.unsubscribe(event, callback);
    });

    // remove all drawn groups
    ids = this.groupsData.getIds();
    this.groupsData = null;
    this._onRemoveGroups(ids); // note: this will cause a redraw
  }

  // replace the dataset
  if (!groups) {
    this.groupsData = null;
  }
  else if (groups instanceof DataSet || groups instanceof DataView) {
    this.groupsData = groups;
  }
  else {
    throw new TypeError('Data must be an instance of DataSet or DataView');
  }

  if (this.groupsData) {
    // subscribe to new dataset
    var id = this.id;
    util.forEach(this.groupListeners, function (callback, event) {
      me.groupsData.on(event, callback, id);
    });

    // draw all ms
    ids = this.groupsData.getIds();
    this._onAddGroups(ids);
  }
  this._onUpdate();
};



LineGraph.prototype._onUpdate = function(ids) {
  this._updateUngrouped();
  this._updateAllGroupData();
  this._updateGraph();
  this.redraw();
};
LineGraph.prototype._onAdd          = function (ids) {this._onUpdate(ids);};
LineGraph.prototype._onRemove       = function (ids) {this._onUpdate(ids);};
LineGraph.prototype._onUpdateGroups  = function (groupIds) {
  for (var i = 0; i < groupIds.length; i++) {
    var group = this.groupsData.get(groupIds[i]);
    this._updateGroup(group, groupIds[i]);
  }

  this._updateGraph();
  this.redraw();
};
LineGraph.prototype._onAddGroups = function (groupIds) {this._onUpdateGroups(groupIds);};

LineGraph.prototype._onRemoveGroups = function (groupIds) {
  for (var i = 0; i < groupIds.length; i++) {
    if (!this.groups.hasOwnProperty(groupIds[i])) {
      if (this.groups[groupIds[i]].options.yAxisOrientation == 'right') {
        this.yAxisRight.removeGroup(groupIds[i]);
        this.legendRight.removeGroup(groupIds[i]);
        this.legendRight.redraw();
      }
      else {
        this.yAxisLeft.removeGroup(groupIds[i]);
        this.legendLeft.removeGroup(groupIds[i]);
        this.legendLeft.redraw();
      }
      delete this.groups[groupIds[i]];
    }
  }
  this._updateUngrouped();
  this._updateGraph();
  this.redraw();
};

/**
 * update a group object
 *
 * @param group
 * @param groupId
 * @private
 */
LineGraph.prototype._updateGroup = function (group, groupId) {
  if (!this.groups.hasOwnProperty(groupId)) {
    this.groups[groupId] = new GraphGroup(group, groupId, this.options, this.groupsUsingDefaultStyles);
    if (this.groups[groupId].options.yAxisOrientation == 'right') {
      this.yAxisRight.addGroup(groupId, this.groups[groupId]);
      this.legendRight.addGroup(groupId, this.groups[groupId]);
    }
    else {
      this.yAxisLeft.addGroup(groupId, this.groups[groupId]);
      this.legendLeft.addGroup(groupId, this.groups[groupId]);
    }
  }
  else {
    this.groups[groupId].update(group);
    if (this.groups[groupId].options.yAxisOrientation == 'right') {
      this.yAxisRight.updateGroup(groupId, this.groups[groupId]);
      this.legendRight.updateGroup(groupId, this.groups[groupId]);
    }
    else {
      this.yAxisLeft.updateGroup(groupId, this.groups[groupId]);
      this.legendLeft.updateGroup(groupId, this.groups[groupId]);
    }
  }
  this.legendLeft.redraw();
  this.legendRight.redraw();
};

LineGraph.prototype._updateAllGroupData = function () {
  if (this.itemsData != null) {
    var groupsContent = {};
    for (var groupId in this.groups) {
      if (this.groups.hasOwnProperty(groupId)) {
        groupsContent[groupId] = [];
      }
    }
    for (var itemId in this.itemsData._data) {
      if (this.itemsData._data.hasOwnProperty(itemId)) {
        var item = this.itemsData._data[itemId];
        item.x = util.convert(item.x,"Date");
        groupsContent[item.group].push(item);
      }
    }
    for (var groupId in this.groups) {
      if (this.groups.hasOwnProperty(groupId)) {
        this.groups[groupId].setItems(groupsContent[groupId]);
      }
    }
  }
};

/**
 * Create or delete the group holding all ungrouped items. This group is used when
 * there are no groups specified. This anonymous group is called 'graph'.
 * @protected
 */
LineGraph.prototype._updateUngrouped = function() {
  if (this.itemsData != null) {
//    var t0 = new Date();
    var group = {id: UNGROUPED, content: this.options.defaultGroup};
    this._updateGroup(group, UNGROUPED);
    var ungroupedCounter = 0;
    if (this.itemsData) {
      for (var itemId in this.itemsData._data) {
        if (this.itemsData._data.hasOwnProperty(itemId)) {
          var item = this.itemsData._data[itemId];
          if (item != undefined) {
            if (item.hasOwnProperty('group')) {
              if (item.group === undefined) {
                item.group = UNGROUPED;
              }
            }
            else {
              item.group = UNGROUPED;
            }
            ungroupedCounter = item.group == UNGROUPED ? ungroupedCounter + 1 : ungroupedCounter;
          }
        }
      }
    }

    // much much slower
//    var datapoints = this.itemsData.get({
//      filter: function (item) {return item.group === undefined;},
//      showInternalIds:true
//    });
//    if (datapoints.length > 0) {
//      var updateQuery = [];
//      for (var i = 0; i < datapoints.length; i++) {
//        updateQuery.push({id:datapoints[i].id, group: UNGROUPED});
//      }
//      this.itemsData.update(updateQuery, true);
//    }
//    var t1 = new Date();
//    var pointInUNGROUPED = this.itemsData.get({filter: function (item) {return item.group == UNGROUPED;}});
    if (ungroupedCounter == 0) {
      delete this.groups[UNGROUPED];
      this.legendLeft.removeGroup(UNGROUPED);
      this.legendRight.removeGroup(UNGROUPED);
      this.yAxisLeft.removeGroup(UNGROUPED);
      this.yAxisRight.removeGroup(UNGROUPED);
    }
//    console.log("getting amount ungrouped",new Date() - t1);
//    console.log("putting in ungrouped",new Date() - t0);
  }
  else {
    delete this.groups[UNGROUPED];
    this.legendLeft.removeGroup(UNGROUPED);
    this.legendRight.removeGroup(UNGROUPED);
    this.yAxisLeft.removeGroup(UNGROUPED);
    this.yAxisRight.removeGroup(UNGROUPED);
  }

  this.legendLeft.redraw();
  this.legendRight.redraw();
};


/**
 * Redraw the component, mandatory function
 * @return {boolean} Returns true if the component is resized
 */
LineGraph.prototype.redraw = function() {
  var resized = false;

  this.svg.style.height = ('' + this.options.graphHeight).replace('px','') + 'px';
  if (this.lastWidth === undefined && this.width || this.lastWidth != this.width) {
    resized = true;
  }
  // check if this component is resized
  resized = this._isResized() || resized;
  // check whether zoomed (in that case we need to re-stack everything)
  var visibleInterval = this.body.range.end - this.body.range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval) || (this.width != this.lastWidth);
  this.lastVisibleInterval = visibleInterval;
  this.lastWidth = this.width;

  // calculate actual size and position
  this.width = this.dom.frame.offsetWidth;

  // the svg element is three times as big as the width, this allows for fully dragging left and right
  // without reloading the graph. the controls for this are bound to events in the constructor
  if (resized == true) {
    this.svg.style.width = util.option.asSize(3*this.width);
    this.svg.style.left = util.option.asSize(-this.width);
  }
  if (zoomed == true) {
    this._updateGraph();
  }

  this.legendLeft.redraw();
  this.legendRight.redraw();

  return resized;
};

/**
 * Update and redraw the graph.
 *
 */
LineGraph.prototype._updateGraph = function () {
  // reset the svg elements
  DOMutil.prepareElements(this.svgElements);

  if (this.width != 0 && this.itemsData != null) {
    var group, groupData, preprocessedGroup, i;
    var preprocessedGroupData = [];
    var processedGroupData = [];
    var groupRanges = [];
    var changeCalled = false;

    // getting group Ids
    var groupIds = [];
    for (var groupId in this.groups) {
      if (this.groups.hasOwnProperty(groupId)) {
        groupIds.push(groupId);
      }
    }

    // this is the range of the SVG canvas
    var minDate = this.body.util.toGlobalTime(- this.body.domProps.root.width);
    var maxDate = this.body.util.toGlobalTime(2 * this.body.domProps.root.width);

    // first select and preprocess the data from the datasets.
    // the groups have their preselection of data, we now loop over this data to see
    // what data we need to draw. Sorted data is much faster.
    // more optimization is possible by doing the sampling before and using the binary search
    // to find the end date to determine the increment.
    if (groupIds.length > 0) {
      for (i = 0; i < groupIds.length; i++) {
        group = this.groups[groupIds[i]];
        if (group.visible == true) {
          groupData = [];
          // optimization for sorted data
          if (group.options.sort == true) {
            var guess = Math.max(0,util.binarySearchGeneric(group.itemsData, minDate, 'x', 'before'));

            for (var j = guess; j < group.itemsData.length; j++) {
              var item = group.itemsData[j];
              if (item !== undefined) {
                if (item.x > maxDate) {
                 groupData.push(item);
                 break;
                }
                else {
                  groupData.push(item);
                }
              }
            }
          }
          else {
            for (var j = 0; j < group.itemsData.length; j++) {
              var item = group.itemsData[j];
              if (item !== undefined) {
                if (item.x > minDate && item.x < maxDate) {
                  groupData.push(item);
                }
              }
            }
          }
          // preprocess, split into ranges and data
          if (groupData.length > 0) {
            preprocessedGroup = this._preprocessData(groupData, group);
            groupRanges.push({min: preprocessedGroup.min, max: preprocessedGroup.max});
            preprocessedGroupData.push(preprocessedGroup.data);
          }
          else {
            groupRanges.push({});
            preprocessedGroupData.push([]);
          }
        }
        else {
          groupRanges.push({});
          preprocessedGroupData.push([]);
        }
      }

      // update the Y axis first, we use this data to draw at the correct Y points
      // changeCalled is required to clean the SVG on a change emit.
      changeCalled = this._updateYAxis(groupIds, groupRanges);
      if (changeCalled == true) {
        DOMutil.cleanupElements(this.svgElements);
        this.body.emitter.emit("change");
        return;
      }

      // with the yAxis scaled correctly, use this to get the Y values of the points.
      for (i = 0; i < groupIds.length; i++) {
        group = this.groups[groupIds[i]];
        processedGroupData.push(this._convertYvalues(preprocessedGroupData[i],group))
      }

      // draw the groups
      for (i = 0; i < groupIds.length; i++) {
        group = this.groups[groupIds[i]];
        if (group.visible == true) {
          if (group.options.style == 'line') {
            this._drawLineGraph(processedGroupData[i], group);
          }
          else {
            this._drawBarGraph (processedGroupData[i], group);
          }
        }
      }
    }
  }

  // cleanup unused svg elements
  DOMutil.cleanupElements(this.svgElements);
};

/**
 * this sets the Y ranges for the Y axis. It also determines which of the axis should be shown or hidden.
 * @param {array} groupIds
 * @private
 */
LineGraph.prototype._updateYAxis = function (groupIds, groupRanges) {
  var changeCalled = false;
  var yAxisLeftUsed = false;
  var yAxisRightUsed = false;
  var minLeft = 1e9, minRight = 1e9, maxLeft = -1e9, maxRight = -1e9, minVal, maxVal;
  var orientation = 'left';

  // if groups are present
  if (groupIds.length > 0) {
    for (var i = 0; i < groupIds.length; i++) {
      orientation = 'left';
      var group = this.groups[groupIds[i]];
      if (group.visible == true) {
        if (group.options.yAxisOrientation == 'right') {
          orientation = 'right';
        }

        minVal = groupRanges[i].min;
        maxVal = groupRanges[i].max;

        if (orientation == 'left') {
          yAxisLeftUsed = true;
          minLeft = minLeft > minVal ? minVal : minLeft;
          maxLeft = maxLeft < maxVal ? maxVal : maxLeft;
        }
        else {
          yAxisRightUsed = true;
          minRight = minRight > minVal ? minVal : minRight;
          maxRight = maxRight < maxVal ? maxVal : maxRight;
        }
      }
    }
    if (yAxisLeftUsed == true) {
      this.yAxisLeft.setRange(minLeft, maxLeft);
    }
    if (yAxisRightUsed == true) {
      this.yAxisRight.setRange(minRight, maxRight);
    }
  }

  changeCalled = this._toggleAxisVisiblity(yAxisLeftUsed , this.yAxisLeft)  || changeCalled;
  changeCalled = this._toggleAxisVisiblity(yAxisRightUsed, this.yAxisRight) || changeCalled;

  if (yAxisRightUsed == true && yAxisLeftUsed == true) {
    this.yAxisLeft.drawIcons = true;
    this.yAxisRight.drawIcons = true;
  }
  else {
    this.yAxisLeft.drawIcons = false;
    this.yAxisRight.drawIcons = false;
  }

  this.yAxisRight.master = !yAxisLeftUsed;

  if (this.yAxisRight.master == false) {
    if (yAxisRightUsed == true) {this.yAxisLeft.lineOffset = this.yAxisRight.width;}
    else                        {this.yAxisLeft.lineOffset = 0;}

    changeCalled = this.yAxisLeft.redraw() || changeCalled;
    this.yAxisRight.stepPixelsForced = this.yAxisLeft.stepPixels;
    changeCalled = this.yAxisRight.redraw() || changeCalled;
  }
  else {
    changeCalled = this.yAxisRight.redraw() || changeCalled;
  }
  return changeCalled;
};

/**
 * This shows or hides the Y axis if needed. If there is a change, the changed event is emitted by the updateYAxis function
 *
 * @param {boolean} axisUsed
 * @returns {boolean}
 * @private
 * @param axis
 */
LineGraph.prototype._toggleAxisVisiblity = function (axisUsed, axis) {
  var changed = false;
  if (axisUsed == false) {
    if (axis.dom.frame.parentNode) {
      axis.hide();
      changed = true;
    }
  }
  else {
    if (!axis.dom.frame.parentNode) {
      axis.show();
      changed = true;
    }
  }
  return changed;
};


/**
 * draw a bar graph
 * @param datapoints
 * @param group
 */
LineGraph.prototype._drawBarGraph = function (dataset, group) {
  if (dataset != null) {
    if (dataset.length > 0) {
      var coreDistance;
      var minWidth = 0.1 * group.options.barChart.width;
      var offset = 0;
      var width = group.options.barChart.width;

      if (group.options.barChart.align == 'left')       {offset -= 0.5*width;}
      else if (group.options.barChart.align == 'right') {offset += 0.5*width;}

      for (var i = 0; i < dataset.length; i++) {
        // dynammically downscale the width so there is no overlap up to 1/10th the original width
        if (i+1 < dataset.length) {coreDistance = Math.abs(dataset[i+1].x - dataset[i].x);}
        if (i > 0)                {coreDistance = Math.min(coreDistance,Math.abs(dataset[i-1].x - dataset[i].x));}
        if (coreDistance < width) {width = coreDistance < minWidth ? minWidth : coreDistance;}

        DOMutil.drawBar(dataset[i].x + offset, dataset[i].y, width, group.zeroPosition - dataset[i].y, group.className + ' bar', this.svgElements, this.svg);
      }

      // draw points
      if (group.options.drawPoints.enabled == true) {
        this._drawPoints(dataset, group, this.svgElements, this.svg, offset);
      }
    }
  }
};


/**
 * draw a line graph
 *
 * @param datapoints
 * @param group
 */
LineGraph.prototype._drawLineGraph = function (dataset, group) {
  if (dataset != null) {
    if (dataset.length > 0) {
      var path, d;
      var svgHeight = Number(this.svg.style.height.replace("px",""));
      path = DOMutil.getSVGElement('path', this.svgElements, this.svg);
      path.setAttributeNS(null, "class", group.className);

      // construct path from dataset
      if (group.options.catmullRom.enabled == true) {
        d = this._catmullRom(dataset, group);
      }
      else {
        d = this._linear(dataset);
      }

      // append with points for fill and finalize the path
      if (group.options.shaded.enabled == true) {
        var fillPath = DOMutil.getSVGElement('path',this.svgElements, this.svg);
        var dFill;
        if (group.options.shaded.orientation == 'top') {
          dFill = "M" + dataset[0].x + "," + 0 + " " + d + "L" + dataset[dataset.length - 1].x + "," + 0;
        }
        else {
          dFill = "M" + dataset[0].x + "," + svgHeight + " " + d + "L" + dataset[dataset.length - 1].x + "," + svgHeight;
        }
        fillPath.setAttributeNS(null, "class", group.className + " fill");
        fillPath.setAttributeNS(null, "d", dFill);
      }
      // copy properties to path for drawing.
      path.setAttributeNS(null, "d", "M" + d);

      // draw points
      if (group.options.drawPoints.enabled == true) {
        this._drawPoints(dataset, group, this.svgElements, this.svg);
      }
    }
  }
};

/**
 * draw the data points
 *
 * @param dataset
 * @param JSONcontainer
 * @param svg
 * @param group
 */
LineGraph.prototype._drawPoints = function (dataset, group, JSONcontainer, svg, offset) {
  if (offset === undefined) {offset = 0;}
  for (var i = 0; i < dataset.length; i++) {
    DOMutil.drawPoint(dataset[i].x + offset, dataset[i].y, group, JSONcontainer, svg);
  }
};



/**
 * This uses the DataAxis object to generate the correct X coordinate on the SVG window. It uses the
 * util function toScreen to get the x coordinate from the timestamp. It also pre-filters the data and get the minMax ranges for
 * the yAxis.
 *
 * @param datapoints
 * @returns {Array}
 * @private
 */
LineGraph.prototype._preprocessData = function (datapoints, group) {
  var extractedData = [];
  var xValue, yValue;
  var toScreen = this.body.util.toScreen;

  var increment = 1;
  var amountOfPoints = datapoints.length;

  var yMin = datapoints[0].y;
  var yMax = datapoints[0].y;

  // the global screen is used because changing the width of the yAxis may affect the increment, resulting in an endless loop
  // of width changing of the yAxis.
  if (group.options.sampling == true) {
    var xDistance = this.body.util.toGlobalScreen(datapoints[datapoints.length-1].x) - this.body.util.toGlobalScreen(datapoints[0].x);
    var pointsPerPixel = amountOfPoints/xDistance;
    increment = Math.min(Math.ceil(0.2 * amountOfPoints), Math.max(1,Math.round(pointsPerPixel)));
  }

  for (var i = 0; i < amountOfPoints; i += increment) {
    xValue = toScreen(datapoints[i].x) + this.width - 1;
    yValue = datapoints[i].y;
    extractedData.push({x: xValue, y: yValue});
    yMin = yMin > yValue ? yValue : yMin;
    yMax = yMax < yValue ? yValue : yMax;
  }

  // extractedData.sort(function (a,b) {return a.x - b.x;});
  return {min: yMin, max: yMax, data: extractedData};
};

/**
 * This uses the DataAxis object to generate the correct Y coordinate on the SVG window. It uses the
 * util function toScreen to get the x coordinate from the timestamp.
 *
 * @param datapoints
 * @param options
 * @returns {Array}
 * @private
 */
LineGraph.prototype._convertYvalues = function (datapoints, group) {
  var extractedData = [];
  var xValue, yValue;
  var axis = this.yAxisLeft;
  var svgHeight = Number(this.svg.style.height.replace("px",""));

  if (group.options.yAxisOrientation == 'right') {
    axis = this.yAxisRight;
  }

  for (var i = 0; i < datapoints.length; i++) {
    xValue = datapoints[i].x;
    yValue = Math.round(axis.convertValue(datapoints[i].y));
    extractedData.push({x: xValue, y: yValue});
  }

  group.setZeroPosition(Math.min(svgHeight, axis.convertValue(0)));

  // extractedData.sort(function (a,b) {return a.x - b.x;});
  return extractedData;
};


/**
 * This uses an uniform parametrization of the CatmullRom algorithm:
 * "On the Parameterization of Catmull-Rom Curves" by Cem Yuksel et al.
 * @param data
 * @returns {string}
 * @private
 */
LineGraph.prototype._catmullRomUniform = function(data) {
  // catmull rom
  var p0, p1, p2, p3, bp1, bp2;
  var d = Math.round(data[0].x) + "," + Math.round(data[0].y) + " ";
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
      bp1.x + "," +
      bp1.y + " " +
      bp2.x + "," +
      bp2.y + " " +
      p2.x + "," +
      p2.y + " ";
  }

  return d;
};

/**
 * This uses either the chordal or centripetal parameterization of the catmull-rom algorithm.
 * By default, the centripetal parameterization is used because this gives the nicest results.
 * These parameterizations are relatively heavy because the distance between 4 points have to be calculated.
 *
 * One optimization can be used to reuse distances since this is a sliding window approach.
 * @param data
 * @returns {string}
 * @private
 */
LineGraph.prototype._catmullRom = function(data, group) {
  var alpha = group.options.catmullRom.alpha;
  if (alpha == 0 || alpha === undefined) {
    return this._catmullRomUniform(data);
  }
  else {
    var p0, p1, p2, p3, bp1, bp2, d1,d2,d3, A, B, N, M;
    var d3powA, d2powA, d3pow2A, d2pow2A, d1pow2A, d1powA;
    var d = Math.round(data[0].x) + "," + Math.round(data[0].y) + " ";
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
        bp1.x + "," +
        bp1.y + " " +
        bp2.x + "," +
        bp2.y + " " +
        p2.x + "," +
        p2.y + " ";
    }

    return d;
  }
};

/**
 * this generates the SVG path for a linear drawing between datapoints.
 * @param data
 * @returns {string}
 * @private
 */
LineGraph.prototype._linear = function(data) {
  // linear
  var d = "";
  for (var i = 0; i < data.length; i++) {
    if (i == 0) {
      d += data[i].x + "," + data[i].y;
    }
    else {
      d += " " + data[i].x + "," + data[i].y;
    }
  }
  return d;
};

module.exports = LineGraph;
