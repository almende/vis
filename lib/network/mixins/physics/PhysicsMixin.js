var util = require('../../../util');
var RepulsionMixin = require('./RepulsionMixin');
var HierarchialRepulsionMixin = require('./HierarchialRepulsionMixin');
var BarnesHutMixin = require('./BarnesHutMixin');

/**
 * Toggling barnes Hut calculation on and off.
 *
 * @private
 */
exports._toggleBarnesHut = function () {
  this.constants.physics.barnesHut.enabled = !this.constants.physics.barnesHut.enabled;
  this._loadSelectedForceSolver();
  this.moving = true;
  this.start();
};


/**
 * This loads the node force solver based on the barnes hut or repulsion algorithm
 *
 * @private
 */
exports._loadSelectedForceSolver = function () {
  // this overloads the this._calculateNodeForces
  if (this.constants.physics.barnesHut.enabled == true) {
    this._clearMixin(RepulsionMixin);
    this._clearMixin(HierarchialRepulsionMixin);

    this.constants.physics.centralGravity = this.constants.physics.barnesHut.centralGravity;
    this.constants.physics.springLength = this.constants.physics.barnesHut.springLength;
    this.constants.physics.springConstant = this.constants.physics.barnesHut.springConstant;
    this.constants.physics.damping = this.constants.physics.barnesHut.damping;

    this._loadMixin(BarnesHutMixin);
  }
  else if (this.constants.physics.hierarchicalRepulsion.enabled == true) {
    this._clearMixin(BarnesHutMixin);
    this._clearMixin(RepulsionMixin);

    this.constants.physics.centralGravity = this.constants.physics.hierarchicalRepulsion.centralGravity;
    this.constants.physics.springLength = this.constants.physics.hierarchicalRepulsion.springLength;
    this.constants.physics.springConstant = this.constants.physics.hierarchicalRepulsion.springConstant;
    this.constants.physics.damping = this.constants.physics.hierarchicalRepulsion.damping;

    this._loadMixin(HierarchialRepulsionMixin);
  }
  else {
    this._clearMixin(BarnesHutMixin);
    this._clearMixin(HierarchialRepulsionMixin);
    this.barnesHutTree = undefined;

    this.constants.physics.centralGravity = this.constants.physics.repulsion.centralGravity;
    this.constants.physics.springLength = this.constants.physics.repulsion.springLength;
    this.constants.physics.springConstant = this.constants.physics.repulsion.springConstant;
    this.constants.physics.damping = this.constants.physics.repulsion.damping;

    this._loadMixin(RepulsionMixin);
  }
};

/**
 * Before calculating the forces, we check if we need to cluster to keep up performance and we check
 * if there is more than one node. If it is just one node, we dont calculate anything.
 *
 * @private
 */
exports._initializeForceCalculation = function () {
  // stop calculation if there is only one node
  if (this.nodeIndices.length == 1) {
    this.nodes[this.nodeIndices[0]]._setForce(0, 0);
  }
  else {
    // if there are too many nodes on screen, we cluster without repositioning
    if (this.nodeIndices.length > this.constants.clustering.clusterThreshold && this.constants.clustering.enabled == true) {
      this.clusterToFit(this.constants.clustering.reduceToNodes, false);
    }

    // we now start the force calculation
    this._calculateForces();
  }
};


/**
 * Calculate the external forces acting on the nodes
 * Forces are caused by: edges, repulsing forces between nodes, gravity
 * @private
 */
exports._calculateForces = function () {
  // Gravity is required to keep separated groups from floating off
  // the forces are reset to zero in this loop by using _setForce instead
  // of _addForce

  this._calculateGravitationalForces();
  this._calculateNodeForces();

  if (this.constants.physics.springConstant > 0) {
    if (this.constants.smoothCurves.enabled == true && this.constants.smoothCurves.dynamic == true) {
      this._calculateSpringForcesWithSupport();
    }
    else {
      if (this.constants.physics.hierarchicalRepulsion.enabled == true) {
        this._calculateHierarchicalSpringForces();
      }
      else {
        this._calculateSpringForces();
      }
    }
  }
};


/**
 * Smooth curves are created by adding invisible nodes in the center of the edges. These nodes are also
 * handled in the calculateForces function. We then use a quadratic curve with the center node as control.
 * This function joins the datanodes and invisible (called support) nodes into one object.
 * We do this so we do not contaminate this.nodes with the support nodes.
 *
 * @private
 */
exports._updateCalculationNodes = function () {
  if (this.constants.smoothCurves.enabled == true && this.constants.smoothCurves.dynamic == true) {
    this.calculationNodes = {};
    this.calculationNodeIndices = [];

    for (var nodeId in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeId)) {
        this.calculationNodes[nodeId] = this.nodes[nodeId];
      }
    }
    var supportNodes = this.sectors['support']['nodes'];
    for (var supportNodeId in supportNodes) {
      if (supportNodes.hasOwnProperty(supportNodeId)) {
        if (this.edges.hasOwnProperty(supportNodes[supportNodeId].parentEdgeId)) {
          this.calculationNodes[supportNodeId] = supportNodes[supportNodeId];
        }
        else {
          supportNodes[supportNodeId]._setForce(0, 0);
        }
      }
    }

    for (var idx in this.calculationNodes) {
      if (this.calculationNodes.hasOwnProperty(idx)) {
        this.calculationNodeIndices.push(idx);
      }
    }
  }
  else {
    this.calculationNodes = this.nodes;
    this.calculationNodeIndices = this.nodeIndices;
  }
};


/**
 * this function applies the central gravity effect to keep groups from floating off
 *
 * @private
 */
exports._calculateGravitationalForces = function () {
  var dx, dy, distance, node, i;
  var nodes = this.calculationNodes;
  var gravity = this.constants.physics.centralGravity;
  var gravityForce = 0;

  for (i = 0; i < this.calculationNodeIndices.length; i++) {
    node = nodes[this.calculationNodeIndices[i]];
    node.damping = this.constants.physics.damping; // possibly add function to alter damping properties of clusters.
    // gravity does not apply when we are in a pocket sector
    if (this._sector() == "default" && gravity != 0) {
      dx = -node.x;
      dy = -node.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      gravityForce = (distance == 0) ? 0 : (gravity / distance);
      node.fx = dx * gravityForce;
      node.fy = dy * gravityForce;
    }
    else {
      node.fx = 0;
      node.fy = 0;
    }
  }
};




/**
 * this function calculates the effects of the springs in the case of unsmooth curves.
 *
 * @private
 */
exports._calculateSpringForces = function () {
  var edgeLength, edge, edgeId;
  var dx, dy, fx, fy, springForce, distance;
  var edges = this.edges;

  // forces caused by the edges, modelled as springs
  for (edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      edge = edges[edgeId];
      if (edge.connected) {
        // only calculate forces if nodes are in the same sector
        if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
          edgeLength = edge.physics.springLength;
          // this implies that the edges between big clusters are longer
          edgeLength += (edge.to.clusterSize + edge.from.clusterSize - 2) * this.constants.clustering.edgeGrowth;

          dx = (edge.from.x - edge.to.x);
          dy = (edge.from.y - edge.to.y);
          distance = Math.sqrt(dx * dx + dy * dy);

          if (distance == 0) {
            distance = 0.01;
          }

          // the 1/distance is so the fx and fy can be calculated without sine or cosine.
          springForce = this.constants.physics.springConstant * (edgeLength - distance) / distance;

          fx = dx * springForce;
          fy = dy * springForce;

          edge.from.fx += fx;
          edge.from.fy += fy;
          edge.to.fx -= fx;
          edge.to.fy -= fy;
        }
      }
    }
  }
};




/**
 * This function calculates the springforces on the nodes, accounting for the support nodes.
 *
 * @private
 */
exports._calculateSpringForcesWithSupport = function () {
  var edgeLength, edge, edgeId, combinedClusterSize;
  var edges = this.edges;

  // forces caused by the edges, modelled as springs
  for (edgeId in edges) {
    if (edges.hasOwnProperty(edgeId)) {
      edge = edges[edgeId];
      if (edge.connected) {
        // only calculate forces if nodes are in the same sector
        if (this.nodes.hasOwnProperty(edge.toId) && this.nodes.hasOwnProperty(edge.fromId)) {
          if (edge.via != null) {
            var node1 = edge.to;
            var node2 = edge.via;
            var node3 = edge.from;

            edgeLength = edge.physics.springLength;

            combinedClusterSize = node1.clusterSize + node3.clusterSize - 2;

            // this implies that the edges between big clusters are longer
            edgeLength += combinedClusterSize * this.constants.clustering.edgeGrowth;
            this._calculateSpringForce(node1, node2, 0.5 * edgeLength);
            this._calculateSpringForce(node2, node3, 0.5 * edgeLength);
          }
        }
      }
    }
  }
};


/**
 * This is the code actually performing the calculation for the function above. It is split out to avoid repetition.
 *
 * @param node1
 * @param node2
 * @param edgeLength
 * @private
 */
exports._calculateSpringForce = function (node1, node2, edgeLength) {
  var dx, dy, fx, fy, springForce, distance;

  dx = (node1.x - node2.x);
  dy = (node1.y - node2.y);
  distance = Math.sqrt(dx * dx + dy * dy);

  if (distance == 0) {
    distance = 0.01;
  }

  // the 1/distance is so the fx and fy can be calculated without sine or cosine.
  springForce = this.constants.physics.springConstant * (edgeLength - distance) / distance;

  fx = dx * springForce;
  fy = dy * springForce;

  node1.fx += fx;
  node1.fy += fy;
  node2.fx -= fx;
  node2.fy -= fy;
};


exports._cleanupPhysicsConfiguration = function() {
  if (this.physicsConfiguration !== undefined) {
    while (this.physicsConfiguration.hasChildNodes()) {
      this.physicsConfiguration.removeChild(this.physicsConfiguration.firstChild);
    }

    this.physicsConfiguration.parentNode.removeChild(this.physicsConfiguration);
    this.physicsConfiguration = undefined;
  }
}

/**
 * Load the HTML for the physics config and bind it
 * @private
 */
exports._loadPhysicsConfiguration = function () {
  if (this.physicsConfiguration === undefined) {
    this.backupConstants = {};
    util.deepExtend(this.backupConstants,this.constants);

    var maxGravitational = Math.max(20000, (-1 * this.constants.physics.barnesHut.gravitationalConstant) * 10);
    var maxSpring = Math.min(0.05, this.constants.physics.barnesHut.springConstant * 10)

    var hierarchicalLayoutDirections = ["LR", "RL", "UD", "DU"];
    this.physicsConfiguration = document.createElement('div');
    this.physicsConfiguration.className = "PhysicsConfiguration";
    this.physicsConfiguration.innerHTML = '' +
      '<table><tr><td><b>Simulation Mode:</b></td></tr>' +
      '<tr>' +
      '<td width="120px"><input type="radio" name="graph_physicsMethod" id="graph_physicsMethod1" value="BH" checked="checked">Barnes Hut</td>' +
      '<td width="120px"><input type="radio" name="graph_physicsMethod" id="graph_physicsMethod2" value="R">Repulsion</td>' +
      '<td width="120px"><input type="radio" name="graph_physicsMethod" id="graph_physicsMethod3" value="H">Hierarchical</td>' +
      '</tr>' +
      '</table>' +
      '<table id="graph_BH_table" style="display:none">' +
      '<tr><td><b>Barnes Hut</b></td></tr>' +
      '<tr>' +
      '<td width="150px">gravitationalConstant</td><td>0</td><td><input type="range" min="0" max="'+maxGravitational+'" value="' + (-1 * this.constants.physics.barnesHut.gravitationalConstant) + '" step="25" style="width:300px" id="graph_BH_gc"></td><td  width="50px">-'+maxGravitational+'</td><td><input value="' + (this.constants.physics.barnesHut.gravitationalConstant) + '" id="graph_BH_gc_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">centralGravity</td><td>0</td><td><input type="range" min="0" max="6"  value="' + this.constants.physics.barnesHut.centralGravity + '" step="0.05"  style="width:300px" id="graph_BH_cg"></td><td>3</td><td><input value="' + this.constants.physics.barnesHut.centralGravity + '" id="graph_BH_cg_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">springLength</td><td>0</td><td><input type="range" min="0" max="500" value="' + this.constants.physics.barnesHut.springLength + '" step="1" style="width:300px" id="graph_BH_sl"></td><td>500</td><td><input value="' + this.constants.physics.barnesHut.springLength + '" id="graph_BH_sl_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">springConstant</td><td>0</td><td><input type="range" min="0" max="'+maxSpring+'" value="' + this.constants.physics.barnesHut.springConstant + '" step="0.0001" style="width:300px" id="graph_BH_sc"></td><td>'+maxSpring+'</td><td><input value="' + this.constants.physics.barnesHut.springConstant + '" id="graph_BH_sc_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">damping</td><td>0</td><td><input type="range" min="0" max="0.3" value="' + this.constants.physics.barnesHut.damping + '" step="0.005" style="width:300px" id="graph_BH_damp"></td><td>0.3</td><td><input value="' + this.constants.physics.barnesHut.damping + '" id="graph_BH_damp_value" style="width:60px"></td>' +
      '</tr>' +
      '</table>' +
      '<table id="graph_R_table" style="display:none">' +
      '<tr><td><b>Repulsion</b></td></tr>' +
      '<tr>' +
      '<td width="150px">nodeDistance</td><td>0</td><td><input type="range" min="0" max="300" value="' + this.constants.physics.repulsion.nodeDistance + '" step="1" style="width:300px" id="graph_R_nd"></td><td width="50px">300</td><td><input value="' + this.constants.physics.repulsion.nodeDistance + '" id="graph_R_nd_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">centralGravity</td><td>0</td><td><input type="range" min="0" max="3"  value="' + this.constants.physics.repulsion.centralGravity + '" step="0.05"  style="width:300px" id="graph_R_cg"></td><td>3</td><td><input value="' + this.constants.physics.repulsion.centralGravity + '" id="graph_R_cg_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">springLength</td><td>0</td><td><input type="range" min="0" max="500" value="' + this.constants.physics.repulsion.springLength + '" step="1" style="width:300px" id="graph_R_sl"></td><td>500</td><td><input value="' + this.constants.physics.repulsion.springLength + '" id="graph_R_sl_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">springConstant</td><td>0</td><td><input type="range" min="0" max="0.5" value="' + this.constants.physics.repulsion.springConstant + '" step="0.001" style="width:300px" id="graph_R_sc"></td><td>0.5</td><td><input value="' + this.constants.physics.repulsion.springConstant + '" id="graph_R_sc_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">damping</td><td>0</td><td><input type="range" min="0" max="0.3" value="' + this.constants.physics.repulsion.damping + '" step="0.005" style="width:300px" id="graph_R_damp"></td><td>0.3</td><td><input value="' + this.constants.physics.repulsion.damping + '" id="graph_R_damp_value" style="width:60px"></td>' +
      '</tr>' +
      '</table>' +
      '<table id="graph_H_table" style="display:none">' +
      '<tr><td width="150"><b>Hierarchical</b></td></tr>' +
      '<tr>' +
      '<td width="150px">nodeDistance</td><td>0</td><td><input type="range" min="0" max="300" value="' + this.constants.physics.hierarchicalRepulsion.nodeDistance + '" step="1" style="width:300px" id="graph_H_nd"></td><td width="50px">300</td><td><input value="' + this.constants.physics.hierarchicalRepulsion.nodeDistance + '" id="graph_H_nd_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">centralGravity</td><td>0</td><td><input type="range" min="0" max="3"  value="' + this.constants.physics.hierarchicalRepulsion.centralGravity + '" step="0.05"  style="width:300px" id="graph_H_cg"></td><td>3</td><td><input value="' + this.constants.physics.hierarchicalRepulsion.centralGravity + '" id="graph_H_cg_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">springLength</td><td>0</td><td><input type="range" min="0" max="500" value="' + this.constants.physics.hierarchicalRepulsion.springLength + '" step="1" style="width:300px" id="graph_H_sl"></td><td>500</td><td><input value="' + this.constants.physics.hierarchicalRepulsion.springLength + '" id="graph_H_sl_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">springConstant</td><td>0</td><td><input type="range" min="0" max="0.5" value="' + this.constants.physics.hierarchicalRepulsion.springConstant + '" step="0.001" style="width:300px" id="graph_H_sc"></td><td>0.5</td><td><input value="' + this.constants.physics.hierarchicalRepulsion.springConstant + '" id="graph_H_sc_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">damping</td><td>0</td><td><input type="range" min="0" max="0.3" value="' + this.constants.physics.hierarchicalRepulsion.damping + '" step="0.005" style="width:300px" id="graph_H_damp"></td><td>0.3</td><td><input value="' + this.constants.physics.hierarchicalRepulsion.damping + '" id="graph_H_damp_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">direction</td><td>1</td><td><input type="range" min="0" max="3" value="' + hierarchicalLayoutDirections.indexOf(this.constants.hierarchicalLayout.direction) + '" step="1" style="width:300px" id="graph_H_direction"></td><td>4</td><td><input value="' + this.constants.hierarchicalLayout.direction + '" id="graph_H_direction_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">levelSeparation</td><td>1</td><td><input type="range" min="0" max="500" value="' + this.constants.hierarchicalLayout.levelSeparation + '" step="1" style="width:300px" id="graph_H_levsep"></td><td>500</td><td><input value="' + this.constants.hierarchicalLayout.levelSeparation + '" id="graph_H_levsep_value" style="width:60px"></td>' +
      '</tr>' +
      '<tr>' +
      '<td width="150px">nodeSpacing</td><td>1</td><td><input type="range" min="0" max="500" value="' + this.constants.hierarchicalLayout.nodeSpacing + '" step="1" style="width:300px" id="graph_H_nspac"></td><td>500</td><td><input value="' + this.constants.hierarchicalLayout.nodeSpacing + '" id="graph_H_nspac_value" style="width:60px"></td>' +
      '</tr>' +
      '</table>' +
      '<table><tr><td><b>Options:</b></td></tr>' +
      '<tr>' +
      '<td width="180px"><input type="button" id="graph_toggleSmooth" value="Toggle smoothCurves" style="width:150px"></td>' +
      '<td width="180px"><input type="button" id="graph_repositionNodes" value="Reinitialize" style="width:150px"></td>' +
      '<td width="180px"><input type="button" id="graph_generateOptions" value="Generate Options" style="width:150px"></td>' +
      '</tr>' +
      '</table>'
    this.containerElement.parentElement.insertBefore(this.physicsConfiguration, this.containerElement);
    this.optionsDiv = document.createElement("div");
    this.optionsDiv.style.fontSize = "14px";
    this.optionsDiv.style.fontFamily = "verdana";
    this.containerElement.parentElement.insertBefore(this.optionsDiv, this.containerElement);

    var rangeElement;
    rangeElement = document.getElementById('graph_BH_gc');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_BH_gc', -1, "physics_barnesHut_gravitationalConstant");
    rangeElement = document.getElementById('graph_BH_cg');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_BH_cg', 1, "physics_centralGravity");
    rangeElement = document.getElementById('graph_BH_sc');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_BH_sc', 1, "physics_springConstant");
    rangeElement = document.getElementById('graph_BH_sl');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_BH_sl', 1, "physics_springLength");
    rangeElement = document.getElementById('graph_BH_damp');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_BH_damp', 1, "physics_damping");

    rangeElement = document.getElementById('graph_R_nd');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_R_nd', 1, "physics_repulsion_nodeDistance");
    rangeElement = document.getElementById('graph_R_cg');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_R_cg', 1, "physics_centralGravity");
    rangeElement = document.getElementById('graph_R_sc');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_R_sc', 1, "physics_springConstant");
    rangeElement = document.getElementById('graph_R_sl');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_R_sl', 1, "physics_springLength");
    rangeElement = document.getElementById('graph_R_damp');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_R_damp', 1, "physics_damping");

    rangeElement = document.getElementById('graph_H_nd');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_nd', 1, "physics_hierarchicalRepulsion_nodeDistance");
    rangeElement = document.getElementById('graph_H_cg');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_cg', 1, "physics_centralGravity");
    rangeElement = document.getElementById('graph_H_sc');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_sc', 1, "physics_springConstant");
    rangeElement = document.getElementById('graph_H_sl');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_sl', 1, "physics_springLength");
    rangeElement = document.getElementById('graph_H_damp');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_damp', 1, "physics_damping");
    rangeElement = document.getElementById('graph_H_direction');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_direction', hierarchicalLayoutDirections, "hierarchicalLayout_direction");
    rangeElement = document.getElementById('graph_H_levsep');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_levsep', 1, "hierarchicalLayout_levelSeparation");
    rangeElement = document.getElementById('graph_H_nspac');
    rangeElement.onchange = showValueOfRange.bind(this, 'graph_H_nspac', 1, "hierarchicalLayout_nodeSpacing");

    var radioButton1 = document.getElementById("graph_physicsMethod1");
    var radioButton2 = document.getElementById("graph_physicsMethod2");
    var radioButton3 = document.getElementById("graph_physicsMethod3");
    radioButton2.checked = true;
    if (this.constants.physics.barnesHut.enabled) {
      radioButton1.checked = true;
    }
    if (this.constants.hierarchicalLayout.enabled) {
      radioButton3.checked = true;
    }

    var graph_toggleSmooth = document.getElementById("graph_toggleSmooth");
    var graph_repositionNodes = document.getElementById("graph_repositionNodes");
    var graph_generateOptions = document.getElementById("graph_generateOptions");

    graph_toggleSmooth.onclick = graphToggleSmoothCurves.bind(this);
    graph_repositionNodes.onclick = graphRepositionNodes.bind(this);
    graph_generateOptions.onclick = graphGenerateOptions.bind(this);
    if (this.constants.smoothCurves == true && this.constants.dynamicSmoothCurves == false) {
      graph_toggleSmooth.style.background = "#A4FF56";
    }
    else {
      graph_toggleSmooth.style.background = "#FF8532";
    }


    switchConfigurations.apply(this);

    radioButton1.onchange = switchConfigurations.bind(this);
    radioButton2.onchange = switchConfigurations.bind(this);
    radioButton3.onchange = switchConfigurations.bind(this);
  }
};

/**
 * This overwrites the this.constants.
 *
 * @param constantsVariableName
 * @param value
 * @private
 */
exports._overWriteGraphConstants = function (constantsVariableName, value) {
  var nameArray = constantsVariableName.split("_");
  if (nameArray.length == 1) {
    this.constants[nameArray[0]] = value;
  }
  else if (nameArray.length == 2) {
    this.constants[nameArray[0]][nameArray[1]] = value;
  }
  else if (nameArray.length == 3) {
    this.constants[nameArray[0]][nameArray[1]][nameArray[2]] = value;
  }
};


/**
 * this function is bound to the toggle smooth curves button. That is also why it is not in the prototype.
 */
function graphToggleSmoothCurves () {
  this.constants.smoothCurves.enabled = !this.constants.smoothCurves.enabled;
  var graph_toggleSmooth = document.getElementById("graph_toggleSmooth");
  if (this.constants.smoothCurves.enabled == true) {graph_toggleSmooth.style.background = "#A4FF56";}
  else                                     {graph_toggleSmooth.style.background = "#FF8532";}

  this._configureSmoothCurves(false);
}

/**
 * this function is used to scramble the nodes
 *
 */
function graphRepositionNodes () {
  for (var nodeId in this.calculationNodes) {
    if (this.calculationNodes.hasOwnProperty(nodeId)) {
      this.calculationNodes[nodeId].vx = 0;  this.calculationNodes[nodeId].vy = 0;
      this.calculationNodes[nodeId].fx = 0;  this.calculationNodes[nodeId].fy = 0;
    }
  }
  if (this.constants.hierarchicalLayout.enabled == true) {
    this._setupHierarchicalLayout();
    showValueOfRange.call(this, 'graph_H_nd', 1, "physics_hierarchicalRepulsion_nodeDistance");
    showValueOfRange.call(this, 'graph_H_cg', 1, "physics_centralGravity");
    showValueOfRange.call(this, 'graph_H_sc', 1, "physics_springConstant");
    showValueOfRange.call(this, 'graph_H_sl', 1, "physics_springLength");
    showValueOfRange.call(this, 'graph_H_damp', 1, "physics_damping");
  }
  else {
    this.repositionNodes();
  }
  this.moving = true;
  this.start();
}

/**
 *  this is used to generate an options file from the playing with physics system.
 */
function graphGenerateOptions () {
  var options = "No options are required, default values used.";
  var optionsSpecific = [];
  var radioButton1 = document.getElementById("graph_physicsMethod1");
  var radioButton2 = document.getElementById("graph_physicsMethod2");
  if (radioButton1.checked == true) {
    if (this.constants.physics.barnesHut.gravitationalConstant != this.backupConstants.physics.barnesHut.gravitationalConstant) {optionsSpecific.push("gravitationalConstant: " + this.constants.physics.barnesHut.gravitationalConstant);}
    if (this.constants.physics.centralGravity != this.backupConstants.physics.barnesHut.centralGravity)                         {optionsSpecific.push("centralGravity: " + this.constants.physics.centralGravity);}
    if (this.constants.physics.springLength != this.backupConstants.physics.barnesHut.springLength)                             {optionsSpecific.push("springLength: " + this.constants.physics.springLength);}
    if (this.constants.physics.springConstant != this.backupConstants.physics.barnesHut.springConstant)                         {optionsSpecific.push("springConstant: " + this.constants.physics.springConstant);}
    if (this.constants.physics.damping != this.backupConstants.physics.barnesHut.damping)                                       {optionsSpecific.push("damping: " + this.constants.physics.damping);}
    if (optionsSpecific.length != 0) {
      options = "var options = {";
      options += "physics: {barnesHut: {";
      for (var i = 0; i < optionsSpecific.length; i++) {
        options += optionsSpecific[i];
        if (i < optionsSpecific.length - 1) {
          options += ", "
        }
      }
      options += '}}'
    }
    if (this.constants.smoothCurves.enabled != this.backupConstants.smoothCurves.enabled) {
      if (optionsSpecific.length == 0) {options = "var options = {";}
      else {options += ", "}
      options += "smoothCurves: " + this.constants.smoothCurves.enabled;
    }
    if (options != "No options are required, default values used.") {
      options += '};'
    }
  }
  else if (radioButton2.checked == true) {
    options = "var options = {";
    options += "physics: {barnesHut: {enabled: false}";
    if (this.constants.physics.repulsion.nodeDistance != this.backupConstants.physics.repulsion.nodeDistance)  {optionsSpecific.push("nodeDistance: " + this.constants.physics.repulsion.nodeDistance);}
    if (this.constants.physics.centralGravity != this.backupConstants.physics.repulsion.centralGravity)        {optionsSpecific.push("centralGravity: " + this.constants.physics.centralGravity);}
    if (this.constants.physics.springLength != this.backupConstants.physics.repulsion.springLength)            {optionsSpecific.push("springLength: " + this.constants.physics.springLength);}
    if (this.constants.physics.springConstant != this.backupConstants.physics.repulsion.springConstant)        {optionsSpecific.push("springConstant: " + this.constants.physics.springConstant);}
    if (this.constants.physics.damping != this.backupConstants.physics.repulsion.damping)                      {optionsSpecific.push("damping: " + this.constants.physics.damping);}
    if (optionsSpecific.length != 0) {
      options += ", repulsion: {";
      for (var i = 0; i < optionsSpecific.length; i++) {
        options += optionsSpecific[i];
        if (i < optionsSpecific.length - 1) {
          options += ", "
        }
      }
      options += '}}'
    }
    if (optionsSpecific.length == 0) {options += "}"}
    if (this.constants.smoothCurves != this.backupConstants.smoothCurves) {
      options += ", smoothCurves: " + this.constants.smoothCurves;
    }
    options += '};'
  }
  else {
    options = "var options = {";
    if (this.constants.physics.hierarchicalRepulsion.nodeDistance != this.backupConstants.physics.hierarchicalRepulsion.nodeDistance)  {optionsSpecific.push("nodeDistance: " + this.constants.physics.hierarchicalRepulsion.nodeDistance);}
    if (this.constants.physics.centralGravity != this.backupConstants.physics.hierarchicalRepulsion.centralGravity)        {optionsSpecific.push("centralGravity: " + this.constants.physics.centralGravity);}
    if (this.constants.physics.springLength != this.backupConstants.physics.hierarchicalRepulsion.springLength)            {optionsSpecific.push("springLength: " + this.constants.physics.springLength);}
    if (this.constants.physics.springConstant != this.backupConstants.physics.hierarchicalRepulsion.springConstant)        {optionsSpecific.push("springConstant: " + this.constants.physics.springConstant);}
    if (this.constants.physics.damping != this.backupConstants.physics.hierarchicalRepulsion.damping)                      {optionsSpecific.push("damping: " + this.constants.physics.damping);}
    if (optionsSpecific.length != 0) {
      options += "physics: {hierarchicalRepulsion: {";
      for (var i = 0; i < optionsSpecific.length; i++) {
        options += optionsSpecific[i];
        if (i < optionsSpecific.length - 1) {
          options += ", ";
        }
      }
      options += '}},';
    }
    options += 'hierarchicalLayout: {';
    optionsSpecific = [];
    if (this.constants.hierarchicalLayout.direction != this.backupConstants.hierarchicalLayout.direction)                       {optionsSpecific.push("direction: " + this.constants.hierarchicalLayout.direction);}
    if (Math.abs(this.constants.hierarchicalLayout.levelSeparation) != this.backupConstants.hierarchicalLayout.levelSeparation) {optionsSpecific.push("levelSeparation: " + this.constants.hierarchicalLayout.levelSeparation);}
    if (this.constants.hierarchicalLayout.nodeSpacing != this.backupConstants.hierarchicalLayout.nodeSpacing)                   {optionsSpecific.push("nodeSpacing: " + this.constants.hierarchicalLayout.nodeSpacing);}
    if (optionsSpecific.length != 0) {
      for (var i = 0; i < optionsSpecific.length; i++) {
        options += optionsSpecific[i];
        if (i < optionsSpecific.length - 1) {
          options += ", "
        }
      }
      options += '}'
    }
    else {
      options += "enabled:true}";
    }
    options += '};'
  }


  this.optionsDiv.innerHTML = options;
}

/**
 * this is used to switch between barnesHut, repulsion and hierarchical.
 *
 */
function switchConfigurations () {
  var ids = ["graph_BH_table", "graph_R_table", "graph_H_table"];
  var radioButton = document.querySelector('input[name="graph_physicsMethod"]:checked').value;
  var tableId = "graph_" + radioButton + "_table";
  var table = document.getElementById(tableId);
  table.style.display = "block";
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] != tableId) {
      table = document.getElementById(ids[i]);
      table.style.display = "none";
    }
  }
  this._restoreNodes();
  if (radioButton == "R") {
    this.constants.hierarchicalLayout.enabled = false;
    this.constants.physics.hierarchicalRepulsion.enabled = false;
    this.constants.physics.barnesHut.enabled = false;
  }
  else if (radioButton == "H") {
    if (this.constants.hierarchicalLayout.enabled == false) {
      this.constants.hierarchicalLayout.enabled = true;
      this.constants.physics.hierarchicalRepulsion.enabled = true;
      this.constants.physics.barnesHut.enabled = false;
      this.constants.smoothCurves.enabled = false;
      this._setupHierarchicalLayout();
    }
  }
  else {
    this.constants.hierarchicalLayout.enabled = false;
    this.constants.physics.hierarchicalRepulsion.enabled = false;
    this.constants.physics.barnesHut.enabled = true;
  }
  this._loadSelectedForceSolver();
  var graph_toggleSmooth = document.getElementById("graph_toggleSmooth");
  if (this.constants.smoothCurves.enabled == true) {graph_toggleSmooth.style.background = "#A4FF56";}
  else                                     {graph_toggleSmooth.style.background = "#FF8532";}
  this.moving = true;
  this.start();
}


/**
 * this generates the ranges depending on the iniital values.
 *
 * @param id
 * @param map
 * @param constantsVariableName
 */
function showValueOfRange (id,map,constantsVariableName) {
  var valueId = id + "_value";
  var rangeValue = document.getElementById(id).value;

  if (Array.isArray(map)) {
    document.getElementById(valueId).value = map[parseInt(rangeValue)];
    this._overWriteGraphConstants(constantsVariableName,map[parseInt(rangeValue)]);
  }
  else {
    document.getElementById(valueId).value = parseInt(map) * parseFloat(rangeValue);
    this._overWriteGraphConstants(constantsVariableName, parseInt(map) * parseFloat(rangeValue));
  }

  if (constantsVariableName == "hierarchicalLayout_direction" ||
    constantsVariableName == "hierarchicalLayout_levelSeparation" ||
    constantsVariableName == "hierarchicalLayout_nodeSpacing") {
    this._setupHierarchicalLayout();
  }
  this.moving = true;
  this.start();
}


