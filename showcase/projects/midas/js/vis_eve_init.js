/**
 * Created by Alex on 10/27/2014.
 */
'use strict';
var timeline;
var timelineItems = new vis.DataSet();
var timelineGroups = new vis.DataSet();

var graph2d;
var graph2dDataset = [];
var graph2DItems = new vis.DataSet();
var graph2dGroups = new vis.DataSet();
graph2dGroups.add({
  id: 'differencePositive', content: 'differencePositive', className: "differencePositive", options: {
    drawPoints: false,
    style: 'bar',
    barChart: {width: 50, align: 'center'} // align: left, center, right
  }
});
graph2dGroups.add({
  id: 'differenceNegative', content: 'differenceNegative', className: "differenceNegative", options: {
    drawPoints: false,
    style: 'bar',
    barChart: {width: 50, align: 'center'} // align: left, center, right
  }
});
var eventCounter;

var selectedGroup = 'duration';
var showDuration = true;
var showPrediction = false;
var showTimeline = true;
var showGraph = false;
var differenceWithPrediction = false;

function draw() {
  eventCounter = document.getElementById('eventCounter');

  // add items to the DataSet
  var timelineContainer = document.getElementById('timeline');
  var timelineOptions = {
    hiddenDates: [
      {start: '2013-10-26 00:00:00', end: '2013-10-28 00:00:00', repeat: 'weekly'}, // daily weekly monthly yearly
      {start: '2013-03-29 18:30:00', end: '2013-03-30 08:00:00', repeat: 'daily'} // daily weekly monthly yearly
    ],
    start: TIMELINE_START,
    end: TIMELINE_END,
    autoResize: false,
    showCustomTime: true,
    showCurrentTime: false,
    stack: false
  };
  timeline = new vis.Timeline(timelineContainer, timelineItems, timelineGroups, timelineOptions);

  var graph2dContainer = document.getElementById('graph2d');
  var graph2dOptions = {
    style:'bar',
    barChart: {width:50, align:'center', handleOverlap:'sideBySide'},
    start: '2014-08-25',
    end: '2014-09-25',
    autoResize: false,
//                height: '450px',
    showCurrentTime: false,
    catmullRom: false,
    showMajorLabels: false,
    showMinorLabels: false,
    graphHeight:'450px',
    dataAxis: {
      customRange: {
        left: {
          min:-0.5
        }
      }
    },
    drawPoints:false //{style:'circle'}
  };
  graph2d = new vis.Graph2d(graph2dContainer, graph2DItems, graph2dGroups, graph2dOptions);
}

window.onresize = function () {
  timeline.redraw();
  graph2d.redraw();
}

var conn;

if (ONLINE_ONLY == true) {
  eve.system.init({
    transports: [
      {
        type: 'local'
      }
    ]
  });
}
else {
  eve.system.init({
    transports: [
      {
        type: 'ws'
      }
    ]
  });
}

