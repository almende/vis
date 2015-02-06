function selectCompany(event) {
  var nodeId = event.value;
  network.selectNodes([nodeId]);
  highlightConnections({nodes:[nodeId]})
  network.focusOnNode(nodeId,{animation:false, scale:0.2})
}
function selectYear(year) {
  selectedYear = year
  console.log(year)
  populateYearDiv();
  recursiveClearDOM(document.getElementById("projectsDropdown"));
  populateProjectsDropdown();
  recursiveClearDOM(document.getElementById("companyDropdown"));
}
function selectProject(event) {
  if (event.value != "none") {
    selectedProject = event.value;
  }
  if (selectedType != "") {
    if (network) {
      network.destroy()
      network = null;
    }
    loadJSON('./data/combined/' + selectedYear + "_" + selectedProject + ".json", drawAll);
    document.getElementById("FILENAME").innerHTML = selectedYear + "_" + selectedProject + ".json";
  }
}
function selectType(type) {
  if (selectedType != type) {
    selectedType = type;
    totalValue = 0;
    populateTypeDiv();
    var allNodes = nodes.get();
    if (allNodes.length > 0) {
      if (selectedType == "connections") {
        for (var i = 0; i < allNodes.length; i++) {
          var node = allNodes[i];
          node.title = node.id + ": " + node.euData[selectedType];
          node.value = Math.max(1,Math.pow(Number(node.euData[selectedType]),1.05));
          totalValue += node.value;
        }
      }
      else {
        for (var i = 0; i < allNodes.length; i++) {
          var node = allNodes[i];
          node.title = node.id + ": " + Math.round(Number(node.euData[selectedType])) + " Euro";
          node.value = Math.max(Math.round(0.0001 * Number(node.euData[selectedType])),1);
          totalValue += node.value;
        }
      }
      nodes.update(allNodes);
    }
  }
}

function recursiveClearDOM(DOMobject) {
  while (DOMobject.hasChildNodes() == true) {
    recursiveClearDOM(DOMobject.firstChild);
    DOMobject.removeChild(DOMobject.firstChild);
  }
}

function viewAllNeighbours() {
  network.zoomExtent({nodes:connectedNodes, duration:0})
}

function doSteps(amount) {
  network.setFreezeSimulation(false);
  network.setOptions({stabilizationIterations:amount})
  network._stabilize()
  network.setFreezeSimulation(true);
}

var network;
var nodes;
var edges;
var edgeOpacity = 0.15;
var totalValue = 0;

function drawAll(dataJSON, file) {
  // create an array with nodes
  nodes = new vis.DataSet(dataJSON.nodes);

  // create an array with edges
  edges = new vis.DataSet(dataJSON.edges);

  var totalMass = 0;
  totalValue = 0;
  for (var i = 0; i < dataJSON.nodes.length; i++) {
    totalMass += dataJSON.nodes[i].mass;
    totalValue += dataJSON.nodes[i].value;
  }

  var gravityConstant = -20000;
  if (totalMass < 2000) {
    gravityConstant = -2000;
  }

  var edgeNodeRatio = Math.max(1,dataJSON.edges.length) / Math.max(1,dataJSON.nodes.length);
  var nodeEdgeRatio = Math.max(1,dataJSON.nodes.length) / Math.max(1,dataJSON.edges.length);

  var centralGravity = Math.min(5,Math.max(0.1,edgeNodeRatio));
  edgeOpacity = Math.min(1.0,Math.max(0.15,nodeEdgeRatio*2));

  var container = document.getElementById('mynetwork');
  var data = {
    nodes: nodes,
    edges: edges
  };

  var amountOfNodes = dataJSON.nodes.length;
  var options = {
    stabilize: false,
    stabilizationIterations: 15000,
    smoothCurves: {
      enabled: true,
      dynamic: false
    },
    configurePhysics: false,
    physics: {barnesHut: {gravitationalConstant: gravityConstant, centralGravity: centralGravity, springLength: 100, springConstant: 0.001}},
    //physics: {barnesHut: {gravitationalConstant: 0, centralGravity: 0.0, springConstant: 0}},
    nodes: {
      shape: 'dot',
      radiusMax: amountOfNodes * 0.5,
      fontColor: '#ffffff',
      fontDrawThreshold: 8,
      scaleFontWithValue: true,
      fontSizeMin: 14,
      fontSizeMax: amountOfNodes * 0.25,
      fontSizeMaxVisible: 20,
      fontStrokeWidth: 1, // px
      fontStrokeColor: '#222222'
    },
    edges: {
      opacity: edgeOpacity
    },
    hideEdgesOnDrag: true,
    maxVelocity: 100,
    tooltip: {
      delay: 200,
      fontSize: 12,
      color: {
        background: "#fff"
      }
    }
  };
  network = new vis.Network(container, data, options);
  network.setFreezeSimulation(true);
  network.on("click",highlightConnections);
  populateCompanyDropdown();
  window.onresize = function () {network.redraw();};
}
// marked is used so we don't do heavy stuff on each click
var marked = false;
var connectedNodes = [];
function highlightConnections(selectedItems) {
  if (selectedItems.nodes[0] == 'none') {
    return;
  }

  var nodeId;
  var requireUpdate = false;

  // we get all data from the dataset once to avoid updating multiple times.
  if (selectedItems.nodes.length == 0 && marked === true) {
    connectedNodes = [];
    requireUpdate = true;
    var allNodes = nodes.get({returnType:"Object"});

    // restore on unselect
    for (nodeId in allNodes) {
      allNodes[nodeId].color = undefined;
      if (allNodes[nodeId].oldLabel !== undefined) {
        allNodes[nodeId].label = allNodes[nodeId].oldLabel;
        allNodes[nodeId].oldLabel = undefined;
      }
    }
    marked = false;
    network.setOptions({nodes:{fontSizeMin:14},edges:{opacity:edgeOpacity}})
  }
  else if (selectedItems.nodes.length > 0) {
    var allNodes = nodes.get({returnType:"Object"});

    marked = true;
    requireUpdate = true;

    var mainNode = selectedItems.nodes[0]; // this is an ID
    connectedNodes = network.getConnectedNodes(mainNode);
    connectedNodes.push(mainNode);

    for (nodeId in allNodes) {
      allNodes[nodeId].color = 'rgba(150,150,150,0.1)';
      if (allNodes[nodeId].oldLabel === undefined) {
        allNodes[nodeId].oldLabel = allNodes[nodeId].label;
        allNodes[nodeId].label = "";
      }
    }

    for (var i = 0; i < connectedNodes.length; i++) {
        allNodes[connectedNodes[i]].color = undefined;
        if (allNodes[connectedNodes[i]].oldLabel !== undefined) {
            allNodes[connectedNodes[i]].label = allNodes[connectedNodes[i]].oldLabel;
            allNodes[connectedNodes[i]].oldLabel = undefined;
        }
    }

    // we want to set the fontSizeMin just so that the node we're looking at has a good fontsize at the zoomLevel


    network.setOptions({nodes:{fontSizeMin:150},edges:{opacity:0.025}})
  }

  if (requireUpdate === true) {
    var updateArray = [];
    for (nodeId in allNodes) {
      updateArray.push(allNodes[nodeId]);
    }
    nodes.update(updateArray);
  }
}

function loadJSON(path, success, error) {
  selectedFile = path;
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        success(JSON.parse(xhr.responseText), path);
      }
      else {
        error();
      }
    }
  };
  xhr.open("GET", path, true);

  xhr.send();
}


function populateCompanyDropdown() {
  var nodesAr = nodes.get();
  var nodeIds = [];
  for (var i = 0; i < nodesAr.length;i++) {
    nodeIds.push(nodesAr[i].id);
  }
  nodeIds.sort()
  var dropdown = document.getElementById("companyDropdown");
  var option = document.createElement('option');
  option.text = '-- pick a company to focus on.';
  option.value = 'none';
    dropdown.add(option);
  for (i = 0; i < nodeIds.length; i++) {
    option = document.createElement('option');
    option.text = option.value = nodeIds[i];
    dropdown.add(option);
  }
}

function populateTypeDiv() {
  var container = document.getElementById("typeContainer");
  recursiveClearDOM(container);
  var types = ['funding', 'connections'];
  var typeLabels = ['size by funding', 'size by connections'];
  for (i = 0; i < types.length; i++) {
    var div = document.createElement('div');
    div.className = 'type';
    if (types[i] == selectedType) {
      div.className += ' selected'
    }
    div.innerHTML = typeLabels[i];
    div.onclick = selectType.bind(this,types[i])
    container.appendChild(div);
  }
}

function populateYearDiv() {
  var container = document.getElementById("yearContainer");
  recursiveClearDOM(container);
  for (i = 0; i < years.length; i++) {
    var div = document.createElement('div');
    div.className = 'year';
    if (years[i] == selectedYear) {
      div.className += ' selected'
    }
    div.innerHTML = years[i];
    div.onclick = selectYear.bind(this,years[i])
    container.appendChild(div);
  }
}

function populateProjectsDropdown() {
  var dropdown = document.getElementById("projectsDropdown");
  var option = document.createElement('option');
  option.text = '-- pick project to see the connections';
  option.value = 'none';
  dropdown.add(option);
  for (i = 0; i < yearlyProjects[selectedYear].length; i++) {
    option = document.createElement('option');
    option.text = option.value = yearlyProjects[selectedYear][i];
    dropdown.add(option);
  }
}

function download() {
  var file = selectedFile.replace("./data/combined/","");
  var nodesAr = nodes.get();
  var edgesAr = edges.get();
  var obj =  {nodes: nodesAr, edges: edgesAr};
  var json = JSON.stringify(obj);
  var blob = new Blob([json], {type: "text/plain;charset=utf-8"});
  saveAs(blob, file);
}

var filesList =  [
  //'2010_FP7-ENERGY.json',
  //'2010_FP7-ENVIRONMENT.json',
  //'2010_FP7-EURATOM-FISSION.json',
  //'2010_FP7-HEALTH.json',
  //'2010_FP7-ICT.json',
  //'2010_FP7-IDEAS-ERC.json',
  //'2010_FP7-INCO.json',
  //'2010_FP7-INFRASTRUCTURES.json',
  //'2010_FP7-JTI.json',
  //'2010_FP7-KBBE.json',
  //'2010_FP7-NMP.json',
  //'2010_FP7-PEOPLE.json',
  //'2010_FP7-REGIONS.json',
  //'2010_FP7-REGPOT.json',
  //'2010_FP7-SIS.json',
  //'2010_FP7-SME.json',
  //'2010_FP7-SPACE.json',
  //'2010_FP7-SSH.json',
  //'2010_FP7-TRANSPORT.json',
  //'2010_Other.json',
  //'2011_FP7-COH.json',
  //'2011_FP7-ENERGY.json',
  //'2011_FP7-ENVIRONMENT.json',
  //'2011_FP7-EURATOM-FISSION.json',
  //'2011_FP7-GA.json',
  //'2011_FP7-HEALTH.json',
  //'2011_FP7-ICT,FP7-JTI.json',
  //'2011_FP7-ICT.json',
  //'2011_FP7-IDEAS-ERC.json',
  //'2011_FP7-INCO.json',
  //'2011_FP7-INFRASTRUCTURES.json',
  //'2011_FP7-JTI.json',
  //'2011_FP7-KBBE.json',
  //'2011_FP7-NMP,FP7-INFRASTRUCTURES.json',
  //'2011_FP7-NMP,FP7-TRANSPORT.json',
  //'2011_FP7-NMP.json',
  //'2011_FP7-PEOPLE.json',
  //'2011_FP7-REGIONS.json',
  //'2011_FP7-REGPOT.json',
  //'2011_FP7-SECURITY.json',
  //'2011_FP7-SIS.json',
  //'2011_FP7-SME.json',
  //'2011_FP7-SPACE.json',
  //'2011_FP7-SSH.json',
  //'2011_FP7-TRANSPORT.json',
  //'2012_CIP.json',
  //'2012_FP7-ENERGY.json',
  //'2012_FP7-ENVIRONMENT.json',
  //'2012_FP7-EURATOM-FISSION.json',
  //'2012_FP7-HEALTH.json',
  //'2012_FP7-ICT.json',
  //'2012_FP7-IDEAS-ERC.json',
  //'2012_FP7-INCO.json',
  //'2012_FP7-INFRASTRUCTURES.json',
  //'2012_FP7-JTI.json',
  //'2012_FP7-KBBE.json',
  //'2012_FP7-NMP.json',
  //'2012_FP7-PEOPLE.json',
  //'2012_FP7-REGIONS.json',
  //'2012_FP7-REGPOT.json',
  //'2012_FP7-SECURITY.json',
  //'2012_FP7-SIS.json',
  //'2012_FP7-SME.json',
  //'2012_FP7-SPACE.json',
  //'2012_FP7-SSH.json',
  //'2012_FP7-TRANSPORT.json',
  //'2012_Other.json',
  //'2013_CIP.json',
  //'2013_FP7-COH.json',
  //'2013_FP7-ENERGY.json',
  //'2013_FP7-ENVIRONMENT.json',
  '2013_FP7-EURATOM-FISSION.json',
  //'2013_FP7-HEALTH.json',
  '2013_FP7-ICT.json',
  //'2013_FP7-IDEAS-ERC.json',
  //'2013_FP7-INCO.json',
  //'2013_FP7-INFRASTRUCTURES,FP7-SME.json',
  //'2013_FP7-INFRASTRUCTURES.json',
  //'2013_FP7-JTI.json',
  //'2013_FP7-KBBE.json',
  //'2013_FP7-NMP.json',
  //'2013_FP7-PEOPLE.json',
  //'2013_FP7-REGIONS.json',
  //'2013_FP7-REGPOT.json',
  //'2013_FP7-SECURITY.json',
  //'2013_FP7-SIS.json',
  //'2013_FP7-SME.json',
  //'2013_FP7-SPACE.json',
  //'2013_FP7-SSH.json',
  //'2013_FP7-TRANSPORT.json',
]
filesList.sort();

var fileIndex = -1;
function next() {
  if (network) {
    network.destroy()
    network = null;
  }
  fileIndex++;
  document.getElementById("FILENAME").innerHTML = filesList[fileIndex];
  loadJSON('./data/combined/' + filesList[fileIndex], drawAll)
}

var years = [];
var yearlyProjects = {};
var selectedFile = "";
for (var i = 0; i < filesList.length; i++) {
  var filename = filesList[i];
  var filenameArray = filename.split("_");
  var year = filenameArray[0];
  var project = filenameArray[1].replace(".json", "");
  if (years.indexOf(year) == -1) {
    years.push(year);
    yearlyProjects[year] = [];
  }
  yearlyProjects[year].push(project);
}
var selectedYear = years[years.length-1];
var selectedType = "connections";
var selectedProject = "";

populateYearDiv();
populateTypeDiv();
populateProjectsDropdown();

//next()