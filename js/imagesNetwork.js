// some global vars
var network;
var connectedNodes = [];
var largeNode = undefined;
var NORMAL_SIZE = 60;
var LARGE_SIZE = 60;
var IMAGE_PATH = './images/exampleScreenshots/';

function loadVis(SPACING) {
  // getting the sizes of the containers
  var linksContainer = document.getElementById('contentContainer');
  var networkContainer = document.getElementById('networkContainer');
  var linksContainerRect = linksContainer.getBoundingClientRect();
  var linksContainerHeight = linksContainerRect.bottom - linksContainerRect.top;

  networkContainer.style.height = (linksContainerHeight + LARGE_SIZE) + 'px';
  linksContainer.style.marginTop = '-' + (linksContainerHeight + LARGE_SIZE) + 'px';

  // constructing nodes and edges from links with class exampleLink
  var links = linksContainer.getElementsByTagName('a');
  var nodesArray = [];
  var edgesArray = [];
  var idCounter = 0;
  var firstLink = undefined;
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    if (link.className === 'exampleLink') {
      var exampleName = link.getAttribute('href').replace('.html','').replace('examples/','');

      var linkRect = link.getBoundingClientRect();
      var linkWidth = linkRect.right - linkRect.left;

      if (firstLink === undefined) {
        firstLink = link;
      }
      nodesArray.push({id:idCounter,
        x:link.offsetLeft + linkWidth,
        y:link.offsetTop,
        color:{
          background:'rgba(0,0,0,0.0)',
          border:'rgba(70,158,255,0)'
        },
        shape:'dot',
        size:2,
        fixed:true
      });
      nodesArray.push({id:idCounter + 'image',
        x:link.offsetLeft + 400 + 100 + (idCounter % 3) * SPACING,
        y:link.offsetTop,
        color:{
          border:'rgba(70,158,255,1)'
        },
        shadow:{
          size:2,
          x:0,
          y:0
        },
        shape:'image',
        image:IMAGE_PATH+(exampleName)+'.png',
        size:NORMAL_SIZE
      });
      edgesArray.push({from: idCounter, to: idCounter+'image', arrows:'from'});
      idCounter += 1;
    }
  }

  // making a dataset.
  var nodes = new vis.DataSet(nodesArray);
  var edges = new vis.DataSet(edgesArray);

  // creating a network
  var networkContainer = document.getElementById('networkContainer');
  var data = {
    nodes: nodes,
    edges: edges
  };
  var options = {
    edges:{
      color:{inherit:'both'},
      smooth:false
    },
    physics: false,
    interaction:{
      zoomView:false,
      dragView: false
    }
  };
  network = new vis.Network(networkContainer, data, options);

  // get the offset or the camera
  var firstLinkPos = {x:firstLink.offsetLeft, y:firstLink.offsetTop};
  var firstLinkRect = firstLink.getBoundingClientRect();
  var firstLinkWidth = firstLinkRect.right - firstLinkRect.left;
  var firstLinkHeight = firstLinkRect.bottom - firstLinkRect.top;
  var networkContainerRect = networkContainer.getBoundingClientRect();
  var networkContainerWidth = networkContainerRect.right - networkContainerRect.left;
  var networkContainerHeight = networkContainerRect.bottom - networkContainerRect.top;
  var ydiff = linksContainer.offsetTop - networkContainer.offsetTop;

  // move the camera
  network.moveTo({
    scale: 1,
    position: network.getPositions([0])[0],
    offset: {
      x: -0.5 * networkContainerWidth  + firstLinkPos.x + firstLinkWidth,
      y: -0.5 * networkContainerHeight + firstLinkPos.y + ydiff + 0.5 * firstLinkHeight
    },
    animation: false
  });

  // onclick handler
  linksContainer.onclick = function (event) {
    var nodeUnderCursor = network.getNodeAt({x:event.layerX, y:event.layerY+ydiff});
    if (nodeUnderCursor !== undefined) {
      var url = nodes.get(nodeUnderCursor).image.replace(IMAGE_PATH, './examples/').replace(".png",".html");
      window.location.href = url;
    }
  }

  // throttled mouse move handler
  var t0 = new Date().valueOf();
  linksContainer.onmousemove = function (event) {
    if (new Date().valueOf() - t0 > 60) {
      handleMouse(event);
      t0 = new Date().valueOf();
    }
  }


  // get a node at a position, select the node, update the dataset
  function handleMouse(event) {
    var nodeUnderCursor = network.getNodeAt({x:event.layerX, y:event.layerY+ydiff});
    if (connectedNodes.length > 0) {
      nodes.update([{id: connectedNodes[0], color: {border: 'rgba(70,158,255,0)'}}])
      connectedNodes = []
    }

    if (largeNode !== undefined) {
      nodes.update([{id: largeNode, size: NORMAL_SIZE}]);
      largeNode = undefined;
    }


    if (nodeUnderCursor !== undefined) {
      connectedNodes = network.getConnectedNodes(nodeUnderCursor);
      largeNode = nodeUnderCursor;
      nodes.update([{id: largeNode, size: LARGE_SIZE}, {id: connectedNodes[0],color: {border: 'rgba(70,158,255,1)'}}]);
      network.selectNodes([nodeUnderCursor]);
    }
    else {
      network.unselectAll();
    }
  }
}