var util = require('../../util');
var DOMutil = require('../../DOMutil');
var DataSet = require('../../DataSet');
var DataView = require('../../DataView');
var Component = require('./Component');
var DataAxis = require('./DataAxis');
var GraphGroup = require('./GraphGroup');
var Legend = require('./Legend');
var BarGraphFunctions = require('./graph2d_types/bar');

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
      handleOverlap: 'overlap',
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
      visible: true,
      alignZeros: true,
      customRange: {
        left: {min:undefined, max:undefined},
        right: {min:undefined, max:undefined}
      }
      //, these options are not set by default, but this shows the format they will be in
      //format: {
      //  left: {decimals: 2},
      //  right: {decimals: 2}
      //},
      //title: {
      //  left: {
      //    text: 'left',
      //    style: 'color:black;'
      //  },
      //  right: {
      //    text: 'right',
      //    style: 'color:black;'
      //  }
      //}
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
    },
    groups: {
      visibility: {}
    }
  };

  // options is shared by this ItemSet and all its items
  this.options = util.extend({}, this.defaultOptions);
  this.dom = {};
  this.props = {};
  this.hammer = null;
  this.groups = {};
  this.abortedGraphUpdate = false;
  this.updateSVGheight = false;
  this.updateSVGheightOnResize = false;

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
  this.COUNTER = 0;
  this.body.emitter.on('rangechanged', function() {
    me.lastStart = me.body.range.start;
    me.svg.style.left = util.option.asSize(-me.props.width);
    me.redraw.call(me,true);
  });

  // create the HTML DOM
  this._create();
  this.framework = {svg: this.svg, svgElements: this.svgElements, options: this.options, groups: this.groups};
  this.body.emitter.emit('change');

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
  this.svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  this.svg.style.position = 'relative';
  this.svg.style.height = ('' + this.options.graphHeight).replace('px','') + 'px';
  this.svg.style.display = 'block';
  frame.appendChild(this.svg);

  // data axis
  this.options.dataAxis.orientation = 'left';
  this.yAxisLeft = new DataAxis(this.body, this.options.dataAxis, this.svg, this.options.groups);

  this.options.dataAxis.orientation = 'right';
  this.yAxisRight = new DataAxis(this.body, this.options.dataAxis, this.svg, this.options.groups);
  delete this.options.dataAxis.orientation;

  // legends
  this.legendLeft = new Legend(this.body, this.options.legend, 'left', this.options.groups);
  this.legendRight = new Legend(this.body, this.options.legend, 'right', this.options.groups);

  this.show();
};

/**
 * set the options of the LineGraph. the mergeOptions is used for subObjects that have an enabled element.
 * @param {object} options
 */
LineGraph.prototype.setOptions = function(options) {
  if (options) {
    var fields = ['sampling','defaultGroup','height','graphHeight','yAxisOrientation','style','barChart','dataAxis','sort','groups'];
    if (options.graphHeight === undefined && options.height !== undefined && this.body.domProps.centerContainer.height !== undefined) {
      this.updateSVGheight = true;
      this.updateSVGheightOnResize = true;
    }
    else if (this.body.domProps.centerContainer.height !== undefined && options.graphHeight !== undefined) {
      if (parseInt((options.graphHeight + '').replace("px",'')) < this.body.domProps.centerContainer.height) {
        this.updateSVGheight = true;
      }
    }
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

  // this is used to redraw the graph if the visibility of the groups is changed.
  if (this.dom.frame) {
    this.redraw(true);
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
  //this._updateGraph();
  this.redraw(true);
};


/**
 * Set groups
 * @param {vis.DataSet} groups
 */
LineGraph.prototype.setGroups = function(groups) {
  var me = this;
  var ids;

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


/**
 * Update the data
 * @param [ids]
 * @private
 */
LineGraph.prototype._onUpdate = function(ids) {
  this._updateUngrouped();
  this._updateAllGroupData();
  //this._updateGraph();
  this.redraw(true);
};
LineGraph.prototype._onAdd          = function (ids) {this._onUpdate(ids);};
LineGraph.prototype._onRemove       = function (ids) {this._onUpdate(ids);};
LineGraph.prototype._onUpdateGroups  = function (groupIds) {
  for (var i = 0; i < groupIds.length; i++) {
    var group = this.groupsData.get(groupIds[i]);
    this._updateGroup(group, groupIds[i]);
  }

  //this._updateGraph();
  this.redraw(true);
};
LineGraph.prototype._onAddGroups = function (groupIds) {this._onUpdateGroups(groupIds);};


/**
 * this cleans the group out off the legends and the dataaxis, updates the ungrouped and updates the graph
 * @param {Array} groupIds
 * @private
 */
LineGraph.prototype._onRemoveGroups = function (groupIds) {
  for (var i = 0; i < groupIds.length; i++) {
    if (this.groups.hasOwnProperty(groupIds[i])) {
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
  //this._updateGraph();
  this.redraw(true);
};


/**
 * update a group object with the group dataset entree
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


/**
 * this updates all groups, it is used when there is an update the the itemset.
 *
 * @private
 */
LineGraph.prototype._updateAllGroupData = function () {
  if (this.itemsData != null) {
    var groupsContent = {};
    var groupId;
    for (groupId in this.groups) {
      if (this.groups.hasOwnProperty(groupId)) {
        groupsContent[groupId] = [];
      }
    }
    for (var itemId in this.itemsData._data) {
      if (this.itemsData._data.hasOwnProperty(itemId)) {
        var item = this.itemsData._data[itemId];
        if (groupsContent[item.group] === undefined) {
          throw new Error('Cannot find referenced group. Possible reason: items added before groups? Groups need to be added before items, as items refer to groups.')
        }
        item.x = util.convert(item.x,'Date');
        groupsContent[item.group].push(item);
      }
    }
    for (groupId in this.groups) {
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
  if (this.itemsData && this.itemsData != null) {
    var ungroupedCounter = 0;
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

    if (ungroupedCounter == 0) {
      delete this.groups[UNGROUPED];
      this.legendLeft.removeGroup(UNGROUPED);
      this.legendRight.removeGroup(UNGROUPED);
      this.yAxisLeft.removeGroup(UNGROUPED);
      this.yAxisRight.removeGroup(UNGROUPED);
    }
    else {
      var group = {id: UNGROUPED, content: this.options.defaultGroup};
      this._updateGroup(group, UNGROUPED);
    }
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
LineGraph.prototype.redraw = function(forceGraphUpdate) {
  var resized = false;

  // calculate actual size and position
  this.props.width = this.dom.frame.offsetWidth;
  this.props.height = this.body.domProps.centerContainer.height;

  // update the graph if there is no lastWidth or with, used for the initial draw
  if (this.lastWidth === undefined && this.props.width) {
    forceGraphUpdate = true;
  }

  // check if this component is resized
  resized = this._isResized() || resized;

  // check whether zoomed (in that case we need to re-stack everything)
  var visibleInterval = this.body.range.end - this.body.range.start;
  var zoomed = (visibleInterval != this.lastVisibleInterval);
  this.lastVisibleInterval = visibleInterval;


  // the svg element is three times as big as the width, this allows for fully dragging left and right
  // without reloading the graph. the controls for this are bound to events in the constructor
  if (resized == true) {
    this.svg.style.width = util.option.asSize(3*this.props.width);
    this.svg.style.left = util.option.asSize(-this.props.width);

    // if the height of the graph is set as proportional, change the height of the svg
    if ((this.options.height + '').indexOf("%") != -1 || this.updateSVGheightOnResize == true) {
      this.updateSVGheight = true;
    }
  }

  // update the height of the graph on each redraw of the graph.
  if (this.updateSVGheight == true) {
    if (this.options.graphHeight != this.body.domProps.centerContainer.height + 'px') {
      this.options.graphHeight = this.body.domProps.centerContainer.height + 'px';
      this.svg.style.height = this.body.domProps.centerContainer.height + 'px';
    }
    this.updateSVGheight = false;
  }
  else {
    this.svg.style.height = ('' + this.options.graphHeight).replace('px','') + 'px';
  }

  // zoomed is here to ensure that animations are shown correctly.
  if (resized == true || zoomed == true || this.abortedGraphUpdate == true || forceGraphUpdate == true) {
    resized = this._updateGraph() || resized;
  }
  else {
    // move the whole svg while dragging
    if (this.lastStart != 0) {
      var offset = this.body.range.start - this.lastStart;
      var range = this.body.range.end - this.body.range.start;
      if (this.props.width != 0) {
        var rangePerPixelInv = this.props.width/range;
        var xOffset = offset * rangePerPixelInv;
        this.svg.style.left = (-this.props.width - xOffset) + 'px';
      }
    }
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
  if (this.props.width != 0 && this.itemsData != null) {
    var group, i;
    var preprocessedGroupData = {};
    var processedGroupData = {};
    var groupRanges = {};
    var changeCalled = false;

    // getting group Ids
    var groupIds = [];
    for (var groupId in this.groups) {
      if (this.groups.hasOwnProperty(groupId)) {
        group = this.groups[groupId];
        if (group.visible == true && (this.options.groups.visibility[groupId] === undefined || this.options.groups.visibility[groupId] == true)) {
          groupIds.push(groupId);
        }
      }
    }
    if (groupIds.length > 0) {
      // this is the range of the SVG canvas
      var minDate = this.body.util.toGlobalTime(-this.body.domProps.root.width);
      var maxDate = this.body.util.toGlobalTime(2 * this.body.domProps.root.width);
      var groupsData = {};
      // fill groups data, this only loads the data we require based on the timewindow
      this._getRelevantData(groupIds, groupsData, minDate, maxDate);

      // apply sampling, if disabled, it will pass through this function.
      this._applySampling(groupIds, groupsData);

      // we transform the X coordinates to detect collisions
      for (i = 0; i < groupIds.length; i++) {
        preprocessedGroupData[groupIds[i]] = this._convertXcoordinates(groupsData[groupIds[i]]);
      }

      // now all needed data has been collected we start the processing.
      this._getYRanges(groupIds, preprocessedGroupData, groupRanges);

      // update the Y axis first, we use this data to draw at the correct Y points
      // changeCalled is required to clean the SVG on a change emit.
      changeCalled = this._updateYAxis(groupIds, groupRanges);
      var MAX_CYCLES = 5;
      if (changeCalled == true && this.COUNTER < MAX_CYCLES) {
        DOMutil.cleanupElements(this.svgElements);
        this.abortedGraphUpdate = true;
        this.COUNTER++;
        this.body.emitter.emit('change');
        return true;
      }
      else {
        if (this.COUNTER > MAX_CYCLES) {
          console.log("WARNING: there may be an infinite loop in the _updateGraph emitter cycle.")
        }
        this.COUNTER = 0;
        this.abortedGraphUpdate = false;

        // With the yAxis scaled correctly, use this to get the Y values of the points.
        for (i = 0; i < groupIds.length; i++) {
          group = this.groups[groupIds[i]];
          processedGroupData[groupIds[i]] = this._convertYcoordinates(groupsData[groupIds[i]], group);
        }

        // draw the groups
        for (i = 0; i < groupIds.length; i++) {
          group = this.groups[groupIds[i]];
          if (group.options.style != 'bar') { // bar needs to be drawn enmasse
            group.draw(processedGroupData[groupIds[i]], group, this.framework);
          }
        }
        BarGraphFunctions.draw(groupIds, processedGroupData, this.framework);
      }
    }
  }

  // cleanup unused svg elements
  DOMutil.cleanupElements(this.svgElements);
  return false;
};


/**
 * first select and preprocess the data from the datasets.
 * the groups have their preselection of data, we now loop over this data to see
 * what data we need to draw. Sorted data is much faster.
 * more optimization is possible by doing the sampling before and using the binary search
 * to find the end date to determine the increment.
 *
 * @param {array}  groupIds
 * @param {object} groupsData
 * @param {date}   minDate
 * @param {date}   maxDate
 * @private
 */
LineGraph.prototype._getRelevantData = function (groupIds, groupsData, minDate, maxDate) {
  var group, i, j, item;
  if (groupIds.length > 0) {
    for (i = 0; i < groupIds.length; i++) {
      group = this.groups[groupIds[i]];
      groupsData[groupIds[i]] = [];
      var dataContainer = groupsData[groupIds[i]];
      // optimization for sorted data
      if (group.options.sort == true) {
        var guess = Math.max(0, util.binarySearchValue(group.itemsData, minDate, 'x', 'before'));
        for (j = guess; j < group.itemsData.length; j++) {
          item = group.itemsData[j];
          if (item !== undefined) {
            if (item.x > maxDate) {
              dataContainer.push(item);
              break;
            }
            else {
              dataContainer.push(item);
            }
          }
        }
      }
      else {
        for (j = 0; j < group.itemsData.length; j++) {
          item = group.itemsData[j];
          if (item !== undefined) {
            if (item.x > minDate && item.x < maxDate) {
              dataContainer.push(item);
            }
          }
        }
      }
    }
  }
};


/**
 *
 * @param groupIds
 * @param groupsData
 * @private
 */
LineGraph.prototype._applySampling = function (groupIds, groupsData) {
  var group;
  if (groupIds.length > 0) {
    for (var i = 0; i < groupIds.length; i++) {
      group = this.groups[groupIds[i]];
      if (group.options.sampling == true) {
        var dataContainer = groupsData[groupIds[i]];
        if (dataContainer.length > 0) {
          var increment = 1;
          var amountOfPoints = dataContainer.length;

          // the global screen is used because changing the width of the yAxis may affect the increment, resulting in an endless loop
          // of width changing of the yAxis.
          var xDistance = this.body.util.toGlobalScreen(dataContainer[dataContainer.length - 1].x) - this.body.util.toGlobalScreen(dataContainer[0].x);
          var pointsPerPixel = amountOfPoints / xDistance;
          increment = Math.min(Math.ceil(0.2 * amountOfPoints), Math.max(1, Math.round(pointsPerPixel)));

          var sampledData = [];
          for (var j = 0; j < amountOfPoints; j += increment) {
            sampledData.push(dataContainer[j]);

          }
          groupsData[groupIds[i]] = sampledData;
        }
      }
    }
  }
};


/**
 *
 *
 * @param {array}  groupIds
 * @param {object} groupsData
 * @param {object} groupRanges  | this is being filled here
 * @private
 */
LineGraph.prototype._getYRanges = function (groupIds, groupsData, groupRanges) {
  var groupData, group, i;
  var barCombinedDataLeft = [];
  var barCombinedDataRight = [];
  var options;
  if (groupIds.length > 0) {
    for (i = 0; i < groupIds.length; i++) {
      groupData = groupsData[groupIds[i]];
      options = this.groups[groupIds[i]].options;
      if (groupData.length > 0) {
        group = this.groups[groupIds[i]];
        // if bar graphs are stacked, their range need to be handled differently and accumulated over all groups.
        if (options.barChart.handleOverlap == 'stack' && options.style == 'bar') {
          if (options.yAxisOrientation == 'left') {barCombinedDataLeft  = barCombinedDataLeft.concat(group.getYRange(groupData)) ;}
          else                                    {barCombinedDataRight = barCombinedDataRight.concat(group.getYRange(groupData));}
        }
        else {
          groupRanges[groupIds[i]] = group.getYRange(groupData,groupIds[i]);
        }
      }
    }

    // if bar graphs are stacked, their range need to be handled differently and accumulated over all groups.
    BarGraphFunctions.getStackedBarYRange(barCombinedDataLeft , groupRanges, groupIds, '__barchartLeft' , 'left' );
    BarGraphFunctions.getStackedBarYRange(barCombinedDataRight, groupRanges, groupIds, '__barchartRight', 'right');
  }
};


/**
 * this sets the Y ranges for the Y axis. It also determines which of the axis should be shown or hidden.
 * @param {Array} groupIds
 * @param {Object} groupRanges
 * @private
 */
LineGraph.prototype._updateYAxis = function (groupIds, groupRanges) {
  var resized = false;
  var yAxisLeftUsed = false;
  var yAxisRightUsed = false;
  var minLeft = 1e9, minRight = 1e9, maxLeft = -1e9, maxRight = -1e9, minVal, maxVal;
  // if groups are present
  if (groupIds.length > 0) {
    // this is here to make sure that if there are no items in the axis but there are groups, that there is no infinite draw/redraw loop.
    for (var i = 0; i < groupIds.length; i++) {
      var group = this.groups[groupIds[i]];
      if (group && group.options.yAxisOrientation != 'right') {
        yAxisLeftUsed = true;
        minLeft = 0;
        maxLeft = 0;
      }
      else if (group && group.options.yAxisOrientation) {
        yAxisRightUsed = true;
        minRight = 0;
        maxRight = 0;
      }
    }

    // if there are items:
    for (var i = 0; i < groupIds.length; i++) {
      if (groupRanges.hasOwnProperty(groupIds[i])) {
        if (groupRanges[groupIds[i]].ignore !== true) {
          minVal = groupRanges[groupIds[i]].min;
          maxVal = groupRanges[groupIds[i]].max;

          if (groupRanges[groupIds[i]].yAxisOrientation != 'right') {
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
    }

    if (yAxisLeftUsed == true) {
      this.yAxisLeft.setRange(minLeft, maxLeft);
    }
    if (yAxisRightUsed == true) {
      this.yAxisRight.setRange(minRight, maxRight);
    }
  }
  resized = this._toggleAxisVisiblity(yAxisLeftUsed , this.yAxisLeft)  || resized;
  resized = this._toggleAxisVisiblity(yAxisRightUsed, this.yAxisRight) || resized;

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

    resized = this.yAxisLeft.redraw() || resized;
    this.yAxisRight.stepPixelsForced = this.yAxisLeft.stepPixels;
    this.yAxisRight.zeroCrossing = this.yAxisLeft.zeroCrossing;
    resized = this.yAxisRight.redraw() || resized;
  }
  else {
    resized = this.yAxisRight.redraw() || resized;
  }

  // clean the accumulated lists
  if (groupIds.indexOf('__barchartLeft') != -1) {
    groupIds.splice(groupIds.indexOf('__barchartLeft'),1);
  }
  if (groupIds.indexOf('__barchartRight') != -1) {
    groupIds.splice(groupIds.indexOf('__barchartRight'),1);
  }

  return resized;
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
    if (axis.dom.frame.parentNode && axis.hidden == false) {
      axis.hide()
      changed = true;
    }
  }
  else {
    if (!axis.dom.frame.parentNode && axis.hidden == true) {
      axis.show();
      changed = true;
    }
  }
  return changed;
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
LineGraph.prototype._convertXcoordinates = function (datapoints) {
  var extractedData = [];
  var xValue, yValue;
  var toScreen = this.body.util.toScreen;

  for (var i = 0; i < datapoints.length; i++) {
    xValue = toScreen(datapoints[i].x) + this.props.width;
    yValue = datapoints[i].y;
    extractedData.push({x: xValue, y: yValue});
  }

  return extractedData;
};


/**
 * This uses the DataAxis object to generate the correct X coordinate on the SVG window. It uses the
 * util function toScreen to get the x coordinate from the timestamp. It also pre-filters the data and get the minMax ranges for
 * the yAxis.
 *
 * @param datapoints
 * @param group
 * @returns {Array}
 * @private
 */
LineGraph.prototype._convertYcoordinates = function (datapoints, group) {
  var extractedData = [];
  var xValue, yValue;
  var toScreen = this.body.util.toScreen;
  var axis = this.yAxisLeft;
  var svgHeight = Number(this.svg.style.height.replace('px',''));
  if (group.options.yAxisOrientation == 'right') {
    axis = this.yAxisRight;
  }

  for (var i = 0; i < datapoints.length; i++) {
    xValue = toScreen(datapoints[i].x) + this.props.width;
    yValue = Math.round(axis.convertValue(datapoints[i].y));
    extractedData.push({x: xValue, y: yValue});
  }

  group.setZeroPosition(Math.min(svgHeight, axis.convertValue(0)));

  return extractedData;
};


module.exports = LineGraph;
