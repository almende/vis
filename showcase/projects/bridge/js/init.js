/**
 * Created by Alex on 3/5/2015.
 */

var eventTypes = {};
var buttonHammers = [];
var createType = undefined;
var connected = false;
var selectedColor = 'white';

function initButtons(data) {
  console.log(data)
  eventTypes = data;
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    createButton(keys[i])
  }
}

function selectColor(color,id) {
  selectedColor = color;
  var colors = ['colorRed','colorWhite','colorGreen','colorOrange','colorMagenta'];

  for (var i = 0; i < colors.length; i++) {
    var classname = document.getElementById(colors[i]).className.replace("selected","");
    document.getElementById(colors[i]).className = classname;
  }

  document.getElementById(id).className = document.getElementById(id).className += " selected";
}

function createButton(name) {
  var container = document.getElementById("buttonBunch");
  var button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-primary " + eventTypes[name].class;
  button.innerHTML = name;

  container.appendChild(button);

  var hammer = Hammer(button, {prevent_default: true});
  hammer.on('tap', showOverlay.bind(this,name));
  buttonHammers.push(hammer);
}

function showOverlay(name,event) {
  createType = name;
  document.getElementById("overlay").style.display = 'block';
  var optionsWindow = document.getElementById("newTimelineEvent");
  optionsWindow.style.top = event.pointers[0].pageY -100 + 'px';
  optionsWindow.style.left = event.pointers[0].pageX + 10 + 'px';
}

function newTimelineEvent() {
  var minutesDelay = document.getElementById("delaySelect").value;
  var date = new Date().valueOf() + 60 * minutesDelay * 1000;
  var item = {content: createType, className:eventTypes[createType].class, start:date};
  inputProxy.addTimelineEvent(item);
  hideOverlay();
}

function sessionClosed() {
  if (connected === true) {
    document.getElementById("overlayNC").style.display = 'block';
  }
}

function hideOverlay() {
  document.getElementById("overlay").style.display = 'none';
}

function newEvent() {
  var name = document.getElementById('newEvent').value;
  var range = false;//document.getElementById('range').checked;
  if (name !== "") {
    var data = {name: name, class: selectedColor, range: range};
    eventTypes[name] = data;
    createButton(name);
    inputProxy.addEventType(data);
  }
  else {
    alert("Name is required");
  }

  document.getElementById('newEvent').value = "";
  //document.getElementById('range').checked = false;
}

function resetEvents() {
  var r = confirm("Really delete all event types? (buttons below)");
  if (r == true) {
    inputProxy.resetEventTypes();
    document.getElementById("buttonBunch").innerHTML = "";
  }
  for (var i = 0; i < buttonHammers.length; i++) {
    buttonHammers[i].dispose();
  }
  buttonHammers = [];
}

function resetTimelineData() {
  var r = confirm("Really delete all data on the timeline?");
  if (r == true) {
    inputProxy.resetTimelineEvents();
  }
}