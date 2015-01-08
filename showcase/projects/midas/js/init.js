/**
 * Created by Alex on 10/27/2014.
 */

var GETTING_EVENTS = false;
var agentList = {};
var jobList = {};
var eventGen = new EventGenerator("eventGenerator");
var agentGen = new AgentGenerator("agentGenerator");
var jobGen = new JobAgentGenerator("jobAgentGenerator");



// eventGen.start();
function getNewEvent() {
  agentGen.getEvents(1);
}

function getTenNewEvents() {
  agentGen.getEvents(10);
}

function getAllEvents() {
  if (GETTING_EVENTS == false) {
    GETTING_EVENTS = true;
    agentGen.getEvents(agentGen.amountOfEvents);
  }
}

function getAllEventsQuickly() {
  INCREASE_SPEED = false;
  EVENT_DELAY = 0;
  if (GETTING_EVENTS == false) {
    GETTING_EVENTS = true;
    agentGen.getEvents(agentGen.amountOfEvents);
  }
  else {
  }
}

function refreshJobs() {
  var multiSelect = document.getElementById("multiselect");
  while (multiSelect.firstChild) {
    multiSelect.removeChild(multiSelect.firstChild);
  }
  var jobNames = jobGen.getAllJobNames();
  for (var i = 0; i < jobNames.length; i++) {
    var jobOption = new Option(jobNames[i], jobNames[i]);
    multiSelect.appendChild(jobOption);
  }
}

function updateGraph() {
  var multiSelect = document.getElementById("multiselect");
  var selection = [];
  for (var i = 0; i < multiSelect.children.length; i++) {
    if (multiSelect.children[i].selected) {
      selection.push(multiSelect.children[i].value);
    }
  }

  var filteredValues = [];
  var originalPredictionValues = [];
  var durationValues = [];
  var predictionValues = [];
  var diffValues = [];
  var graphGroup = null;
  var stdGroup = null;
  var predictionGroup = null;
  var originalPredictionGroup = null;
  for (var i = 0; i < graph2dDataset.length; i++) {
    if (selection.indexOf(graph2dDataset[i].type) != -1) {
      if (showDuration == true) {
        if (graph2dDataset[i].group == graph2dDataset[i].type + "_" + selectedGroup) {
          filteredValues.push(graph2dDataset[i]);
          durationValues.push(graph2dDataset[i]);
          graphGroup = graph2dDataset[i].group;
        }
      }
      if (showPrediction == true) {
        if (graph2dDataset[i].group == graph2dDataset[i].type + "_pred_" + selectedGroup) {
          filteredValues.push(graph2dDataset[i]);
          predictionValues.push(graph2dDataset[i]);
          predictionGroup = graph2dDataset[i].group;
        }
        if (graph2dDataset[i].group == graph2dDataset[i].type + "_pred_" + selectedGroup + "_std_higher") {
          filteredValues.push(graph2dDataset[i]);
          stdGroup = graph2dDataset[i].group;
        }
        if (graph2dDataset[i].group == graph2dDataset[i].type + "_pred_" + selectedGroup + "_std_lower") {
          filteredValues.push(graph2dDataset[i]);
          stdGroup = graph2dDataset[i].group;
        }
        if (graph2dDataset[i].group == graph2dDataset[i].type + "_pred_" + selectedGroup + "_original") {
          filteredValues.push(graph2dDataset[i]);
          originalPredictionValues.push(graph2dDataset[i]);
          originalPredictionGroup = graph2dDataset[i].group;
        }
      }
    }
  }

  graph2DItems.clear();
  if (differenceWithPrediction == true) {
    for (var i = 0; i < durationValues.length; i++) {
      var item = {};
      item.x = i < 10 ? '2014-09-0' + i : '2014-09-' + i;
      item.y = durationValues[i].y;
      item.type = durationValues[i].type;
      item.y -= originalPredictionValues[i].y;
      var group = 'differenceNegative';
      if (item.y < 0) {
        item.y *= -1;
        group = 'differencePositive'
      }
      item.group = group;
      diffValues.push(item);
    }
    var legendDiv = document.getElementById("Legend");
    legendDiv.innerHTML = "";
    populateExternalLegend('differencePositive', "Faster than predicted (hours)");
    populateExternalLegend('differenceNegative', "Slower than predicted (hours)");
    graph2DItems.add(diffValues);
  }
  else {
    var filteredValues = [];
    for (var i = 0; i < durationValues.length; i++) {
      var durationItem = {};
      durationItem.x = i < 10 ? '2014-09-0' + i : '2014-09-' + i;
      durationItem.y = durationValues[i].y;
      durationItem.type = durationValues[i].type;
      durationItem.group = durationValues[i].group;
      filteredValues.push(durationItem);
      if (showPrediction == true) {
        var predItem = {};
        predItem.x = i < 10 ? '2014-09-0' + i : '2014-09-' + i;
        predItem.y = predictionValues[i].y;
        predItem.type = predictionValues[i].type;
        predItem.group = predictionValues[i].group;
        filteredValues.push(predItem);

        var originalPred = {};
        originalPred.x = i < 10 ? '2014-09-0' + i : '2014-09-' + i;
        originalPred.y = originalPredictionValues[i].y;
        originalPred.type = originalPredictionValues[i].type;
        originalPred.group = originalPredictionValues[i].group;
        filteredValues.push(originalPred);
      }
    }
    var legendDiv = document.getElementById("Legend");
    legendDiv.innerHTML = "";
    if (graphGroup != null) {
      populateExternalLegend(graphGroup, "duration (hours)");
    }
//                if (stdGroup != null)                {populateExternalLegend(stdGroup, "standard deviation");}
    if (predictionGroup != null) {
      populateExternalLegend(predictionGroup, "updated prediction (hours)");
    }
    if (originalPredictionGroup != null) {
      populateExternalLegend(originalPredictionGroup, "initial prediction (hours)");
    }
    graph2DItems.add(filteredValues);
  }
  graph2d.fit();

}

function turnOff(type) {
  var btn = document.getElementById(type);
  btn.className = btn.className.replace(" selected", "");
}

function turnOffAll() {
  var types = ['duration', 'durationWithPause', 'durationWithStartup', 'durationWithBoth'];
  for (var i = 0; i < types.length; i++) {
    turnOff(types[i]);
  }
}

function turnOn(type) {
  turnOffAll();
  var btn = document.getElementById(type);
  selectedGroup = type;
  btn.className += " selected";
  updateGraph();
}

function togglePrediction() {
  if (differenceWithPrediction != true) {
    var btn = document.getElementById('togglePrediction');
    if (showPrediction == true) {
      btn.className = btn.className.replace("selected", "");
      showPrediction = false;
    }
    else {
      showPrediction = true;
      btn.className += " selected";
    }
    updateGraph();
  }
}
function toggleDuration() {
  if (differenceWithPrediction != true) {
    var btn = document.getElementById('toggleDuration');
    if (showDuration == true) {
      btn.className = btn.className.replace("selected", "");
      showDuration = false;
    }
    else {
      showDuration = true;
      btn.className += " selected";
    }
    updateGraph();
  }
}

function toggleDifference() {
  differenceWithPrediction = !differenceWithPrediction;
  var btn = document.getElementById('togglePrediction');
  if (showPrediction == false && differenceWithPrediction == true) {
    showPrediction = true;
    btn.className += " selected";
  }
  btn = document.getElementById('toggleDuration');
  if (showDuration == false && differenceWithPrediction == true) {
    showDuration = true;
    btn.className += " selected";
  }

  var btn2 = document.getElementById('difference');
  if (differenceWithPrediction == false) {
    btn2.className = btn2.className.replace("selected", "");
  }
  else {
    btn2.className += " selected";
  }
  updateGraph();
}
function showTimelineBtn() {
  var timelineBtn = document.getElementById('showTimeline');
  var graphBtn = document.getElementById('showGraph');

  if (showTimeline == false) {
    graphBtn.className = graphBtn.className.replace("selected", "");
    timelineBtn.className += " selected";
    var timelinewrapper = document.getElementById("timelineWrapper");
    var graphwrapper = document.getElementById("graphWrapper");
    graphwrapper.style.display = "none";
    timelinewrapper.style.display = "block";
    showTimeline = true;
    showGraph = false;
  }
}
function showGraphBtn() {
  var timelineBtn = document.getElementById('showTimeline');
  var graphBtn = document.getElementById('showGraph');

  if (showGraph == false) {
    timelineBtn.className = graphBtn.className.replace("selected", "");
    graphBtn.className += " selected";
    var timelinewrapper = document.getElementById("timelineWrapper");
    var graphwrapper = document.getElementById("graphWrapper");
    timelinewrapper.style.display = "none";
    graphwrapper.style.display = "block";
    showTimeline = false;
    showGraph = true;
  }
}

/**
 * this function fills the external legend with content using the getLegend() function.
 */
function populateExternalLegend(groupDataItem, description) {
  var legendDiv = document.getElementById("Legend");
  // create divs
  var containerDiv = document.createElement("div");
  var iconDiv = document.createElement("div");
  var descriptionDiv = document.createElement("div");

  // give divs classes and Ids where necessary
  containerDiv.className = 'legendElementContainer';
  containerDiv.id = groupDataItem + "_legendContainer";
  iconDiv.className = "iconContainer";
  descriptionDiv.className = "descriptionContainer";

  // get the legend for this group.
  var legend = graph2d.getLegend(groupDataItem, 30, 30);

  // append class to icon. All styling classes from the vis.css have been copied over into the head here to be able to style the
  // icons with the same classes if they are using the default ones.
  legend.icon.setAttributeNS(null, "class", "legendIcon");

  // append the legend to the corresponding divs
  iconDiv.appendChild(legend.icon);
  descriptionDiv.innerHTML = description;

  // determine the order for left and right orientation
  if (legend.orientation == 'left') {
    descriptionDiv.style.textAlign = "left";
    containerDiv.appendChild(iconDiv);
    containerDiv.appendChild(descriptionDiv);
  }
  else {
    descriptionDiv.style.textAlign = "right";
    containerDiv.appendChild(descriptionDiv);
    containerDiv.appendChild(iconDiv);
  }

  // append to the legend container div
  legendDiv.appendChild(containerDiv);
}


function printEvents(events) {
  var str = "";
  str += "[";
  for (var i = 0; i < events.length; i++) {
    str += "{";
    var first = true;
    for (var eventField in events[i]) {
      if (events[i].hasOwnProperty(eventField)) {
        if (first == false) {
          str += ","
        }
        first = false;
        if (eventField == "time") {
          str += eventField + ": '" + new Date(events[i][eventField]).valueOf() + "'";
        }
        else if(events[i][eventField] instanceof Array) {
          str += eventField + ": [";
          for (var j = 0; j < events[i][eventField].length; j++) {
            str += "'" + events[i][eventField][j] + "'";
            if (j != events[i][eventField].length - 1) {
              str += ",";
            }
          }
        }
        else {
          str += eventField + ": '" + events[i][eventField] + "'";
        }
      }
    }
    str += "}";
    if (i < events.length -1) {
      str += ",";
    }
  }
  str += "]";
  console.log(str);
}