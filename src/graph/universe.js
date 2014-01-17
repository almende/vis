

function Universe() {
  this.universe = {};
  this.activeUniverse = ["default"];
  this.universe["activePockets"] = {};
  this.universe["activePockets"][this.activeUniverse[this.activeUniverse.length-1]] = {"nodes":{},"edges":{},"nodeIndices":[]};
  this.universe["frozenPockets"] = {};
  this.universe["draw"] = {};

  this.nodeIndices = this.universe["activePockets"][this.activeUniverse[this.activeUniverse.length-1]]["nodeIndices"];  // the node indices list is used to speed up the computation of the repulsion fields
}


Universe.prototype._putDataInUniverse = function() {
  this.universe["activePockets"][this._universe()].nodes = this.nodes;
  this.universe["activePockets"][this._universe()].edges = this.edges;
  this.universe["activePockets"][this._universe()].nodeIndices = this.nodeIndices;
};

Universe.prototype._switchToUniverse = function(universeID) {
  this.nodeIndices = this.universe["activePockets"][universeID]["nodeIndices"];
  this.nodes       = this.universe["activePockets"][universeID]["nodes"];
  this.edges       = this.universe["activePockets"][universeID]["edges"];
};

Universe.prototype._loadActiveUniverse = function() {
  this._switchToUniverse(this._universe());
};

Universe.prototype._universe = function() {
  return this.activeUniverse[this.activeUniverse.length-1];
};

Universe.prototype._previousUniverse = function() {
  if (this.activeUniverse.length > 1) {
    return this.activeUniverse[this.activeUniverse.length-2];
  }
  else {
    throw new TypeError('there are not enough universes in the this.activeUniverse array.');
    return "";
  }
};

Universe.prototype._setActiveUniverse = function(newID) {
  this.activeUniverse.push(newID);
};

Universe.prototype._forgetLastUniverse = function() {
  this.activeUniverse.pop();
};

Universe.prototype._createNewUniverse = function(newID) {
  this.universe["activePockets"][newID] = {"nodes":{},"edges":{},"nodeIndices":[]}
};

Universe.prototype._deleteActiveUniverse = function(universeID) {
  delete this.universe["activePockets"][universeID];
};

Universe.prototype._deleteFrozenUniverse = function(universeID) {
  delete this.universe["frozenPockets"][universeID];
};

Universe.prototype._freezeUniverse = function(universeID) {
  this.universe["frozenPockets"][universeID] = this.universe["activePockets"][universeID];
  this._deleteActiveUniverse(universeID);
};

Universe.prototype._activateUniverse = function(universeID) {
  this.universe["activePockets"][universeID] = this.universe["frozenPockets"][universeID];
  this._deleteFrozenUniverse(universeID);
};

Universe.prototype._mergeThisWithFrozen = function(universeID) {
  for (var nodeID in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeID)) {
      this.universe["frozenPockets"][universeID]["nodes"][nodeID] = this.nodes[nodeID];
    }
  }

  for (var edgeID in this.edges) {
    if (this.edges.hasOwnProperty(edgeID)) {
      this.universe["frozenPockets"][universeID]["edges"][edgeID] = this.edges[edgeID];
    }
  }

  for (var i = 0; i < this.nodeIndices.length; i++) {
    this.universe["frozenPockets"][universeID]["edges"][nodeIndices].push(this.nodeIndices[i]);
  }
};

Universe.prototype._collapseThisToSingleCluster = function() {
  this.clusterToFit(1,false);
};


Universe.prototype._addUniverse = function(node) {
  var universe = this._universe();
  if (this.universe['activePockets'][universe]["nodes"].hasOwnProperty(node.id)) {
    console.log("the node is part of the active universe");
  }
  else {
    console.log("I dont konw what the fuck happened!!");
  }

  delete this.nodes[node.id];

  this._freezeUniverse(universe);
  this._createNewUniverse(node.id);

  this._setActiveUniverse(node.id);
  this._switchToUniverse(this._universe());

  this.nodes[node.id] = node;
  //this.universe["draw"][node.id] = new Node(node.nodeProperties,node.imagelist,node.grouplist,this.constants);
};

Universe.prototype._collapseUniverse = function() {
  var universe = this._universe();

  if (universe != "default") {
    var isMovingBeforeClustering = this.moving;

    var previousUniverse = this._previousUniverse();

    this._collapseThisToSingleCluster();

    this._mergeThisWithFrozen(previousUniverse);

    this._deleteActiveUniverse(universe);

    this._activateUniverse(previousUniverse);

    this._switchToUniverse(previousUniverse);

    this._forgetLastUniverse();

    this._updateNodeIndexList();

    // if the simulation was settled, we restart the simulation if a cluster has been formed or expanded
    if (this.moving != isMovingBeforeClustering) {
      this.start();
    }
  }
};

Universe.prototype._doInAllActiveUniverses = function(runFunction,arguments) {

}