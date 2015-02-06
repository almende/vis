function focusOn(event) {
  var nodeId = event.value;
  network.selectNodes([nodeId]);
  highlightConnections({nodes:[nodeId]})
  network.focusOnNode(nodeId,{animation:false, scale:0.2})
}

function viewAllNeighbours() {
  network.zoomExtent({nodes:connectedNodes, duration:0})
}

function doSteps(amount) {
  network.setOptions({stabilizationIterations:amount})
  network._stabilize()
}

var network;
var nodes;
var edges;
var edgeOpacity = 0.15;

function drawAll(dataJSON, file) {
// create an array with nodes
  nodes = new vis.DataSet(dataJSON.nodes);

  var totalMass = 0;

  for (var i = 0; i < dataJSON.nodes.length; i++) {
    totalMass += dataJSON.nodes[i].mass;
    //console.log(dataJSON.nodes[i].mass)
  }

  var gravityConstant = -20000;
  if (totalMass < 2000) {
    gravityConstant = -2000;
  }

  var edgeNodeRatio = Math.max(1,dataJSON.edges.length) / Math.max(1,dataJSON.nodes.length);
  var nodeEdgeRatio = Math.max(1,dataJSON.nodes.length) / Math.max(1,dataJSON.edges.length);
  var centralGravity = Math.min(5,Math.max(0.1,edgeNodeRatio));
  opacity = Math.min(1.0,Math.max(0.15,nodeEdgeRatio));

// create an array with edges
  edges = new vis.DataSet(dataJSON.edges);

//  console.log(edgesArray.length,edgesArray)

// create a network
  var container = document.getElementById('mynetwork');
  var data = {
    nodes: nodes,
    edges: edges
  };

  var amountOfNodes = dataJSON.nodes.length;
  var options = {
    stabilize: true,
    stabilizationIterations: 15000,
    smoothCurves: {
      enabled: false,
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
  network = new vis.Network(container, {nodes:[],edges:[]}, options);

  network.on("stabilizationIterationsDone", function() {
    this.setFreezeSimulation(true);
  });

  network.on("stabilized", function() {
    console.log('downloading')
    network.storePositions();
    download(file);
    setTimeout(getNewTask(file),3000);
  })

  network.setData(data);

  if (dataJSON.nodes.length < 2) {
    console.log('downloading because few nodes')
    network.storePositions();
    download(file);
    setTimeout(getNewTask(file),3000);
  }

  //network.on("click", highlightConnections);
  //window.onresize = function () {
  //  network.redraw()
  //};
  //network.on("stabilized", function() {
  //  network.setOptions({physics: {barnesHut: {gravitationalConstant: 0, centralGravity: 0, springConstant: 0}}});
  //  console.log('downlaoding')
  //  download();
  //  setTimeout(next,2000);
  //});

  //populateCompanyDropdown();
}
// marked is used so we don't do heavy stuff on each click
var marked = false;
var connectedNodes = [];
function highlightConnections(selectedItems) {
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
    network.setOptions({nodes:{fontSizeMin:14},edges:{opacity:0.15}})
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


function populateDropdown() {
  var nodesAr = nodes.get();
  var nodeIds = [];
  for (var i = 0; i < nodesAr.length;i++) {
    nodeIds.push(nodesAr[i].id);
  }
  nodeIds.sort()
  var dropdown = document.getElementById("companyDropdown");
  var option = document.createElement('option');
  option.text = option.value = 'pick a company to focus on.';
  dropdown.add(option);
  for (i = 0; i < nodeIds.length; i++) {
    option = document.createElement('option');
    option.text = option.value = nodeIds[i];
    dropdown.add(option);
  }
}

function download(path) {
  var file = path.replace("./data/data/","");
  var nodesAr = nodes.get();
  var edgesAr = edges.get();
  var obj =  {nodes: nodesAr, edges: edgesAr};
  var json = JSON.stringify(obj);
  var blob = new Blob([json], {type: "text/plain;charset=utf-8"});
  saveAs(blob, "processed_" + file);
}

function startTask(path, success) {
  // if we find the file already processed, we go to the next one
  loadJSON("./data/processedData/processed_" + path,
    function() {
      getNewTask(path);
    },
    function() {
      loadJSON("./data/data/" + path, success, function() {
        console.log("could not find file ", path);
      })
  });
}

function askAgent(to, message) {
  return new Promise(function (resolve, reject) {
    if (typeof message == 'object') {
      message = JSON.stringify(message);
    }
    // create XMLHttpRequest object to send the POST request
    var http = new XMLHttpRequest();

    // insert the callback function. This is called when the message has been delivered and a response has been received
    http.onreadystatechange = function () {
      if (http.readyState == 4 && http.status == 200) {
        var response = "";
        if (http.responseText.length > 0) {
          response = JSON.parse(http.responseText);
        }
        resolve(response);
      }
      else if (http.readyState == 4) {
        reject(new Error("http.status:" + http.status));
      }
    };

    // open an asynchronous POST connection
    http.open("POST", to, true);
    // include header so the receiving code knows its a JSON object
    http.setRequestHeader("Content-Type", "text/plain");
    // send
    http.send(message);
  });
}


function getNewTask(path) {
  var file = undefined;
  if (path !== undefined) {
    file = path.replace("./data/data/", "");
  }
  askAgent("http://127.0.0.1:3000/agents/proxy", {jsonrpc:"2.0",method:"getAssignment", params:{finishedFile:file}}).then(function(reply) {
    console.log(reply, reply.result);
    if (reply.result != 'none') {
      startTask(reply.result, function(data,path) {document.getElementById("FILENAME").innerHTML = path; setTimeout(function() {drawAll(data,path);},200)});
    }
  })
}

getNewTask()