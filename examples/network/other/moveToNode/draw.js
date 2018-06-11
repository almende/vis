var nodes = null
var edges = null
var network = null
var offsetx,
  offsety,
  positionx,
  positiony,
  duration,
  easingFunction,
  doButton,
  focusButton,
  showButton
var statusUpdateSpan
var finishMessage = ''
var showInterval = false
var showPhase = 1
var amountOfNodes = 25
const size = 20

function destroy() {
  if (network !== null) {
    network.destroy()
    network = null
  }
}

function draw() {
  destroy()
  statusUpdateSpan = document.getElementById('statusUpdate')
  doButton = document.getElementById('btnDo')
  focusButton = document.getElementById('btnFocus')
  showButton = document.getElementById('btnShow')

  // randomly create some nodes and edges
  var data = getScaleFreeNetwork(amountOfNodes)

  // create a network
  var container = document.getElementById('mynetwork')
  var options = {
    physics: {
      stabilization: {
        iterations: 1200
      }
    },
    nodes: {
      shape: 'circle',
      widthConstraint: {
        minimum: 40,
        maximum: 40
      },
      font: {
        size: 24
      }
    }
  }
  network = new vis.Network(container, data, options)

  // add event listeners
  network.on('select', function(params) {
    document.getElementById('selection').innerHTML =
      'Selection: ' + params.nodes
  })
  network.on('stabilized', function(params) {
    document.getElementById('stabilization').innerHTML =
      'Stabilization took ' + params.iterations + ' iterations.'
  })
  network.on('animationFinished', function() {
    statusUpdateSpan.innerHTML = finishMessage
  })

  // your form
  var form = document.getElementById('nodeIdForm')

  // attach event listener
  form.addEventListener('submit', focusNode, false)
}

function fitAnimated() {
  var options = {
    offset: { x: offsetx, y: offsety },
    duration: duration,
    easingFunction: easingFunction
  }
  statusUpdateSpan.innerHTML = 'Doing fit() Animation.'
  finishMessage = 'Animation finished.'
  network.fit({ animation: options })
}

function doDefaultAnimation() {
  var options = {
    position: { x: positionx, y: positiony },
    offset: { x: offsetx, y: offsety },
    animation: true // default duration is 1000ms and default easingFunction is easeInOutQuad.
  }
  statusUpdateSpan.innerHTML = 'Doing Animation.'
  finishMessage = 'Animation finished.'
  network.moveTo(options)
}

function focusNode(event) {
  event.preventDefault()
  console.log('event', event)

  const nodeId = event.srcElement[0].value

  console.log('easingFunction', easingFunction)
  console.log('offsetx', offsetx)
  console.log('offsety', offsety)
  console.log('duration', duration)

  var options = {
    // position: {x:positionx,y:positiony}, // this is not relevant when focusing on nodes
    offset: { x: offsetx, y: offsety },
    animation: {
      duration: duration,
      easingFunction: easingFunction
    }
  }
  statusUpdateSpan.innerHTML = 'Focusing on node: ' + nodeId
  finishMessage = 'Node: ' + nodeId + ' in focus.'
  network.focus(nodeId, options)
}
