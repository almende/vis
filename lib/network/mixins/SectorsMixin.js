var util = require('../../util');
var Node = require('../Node');

/**
 * Creation of the SectorMixin var.
 *
 * This contains all the functions the Network object can use to employ the sector system.
 * The sector system is always used by Network, though the benefits only apply to the use of clustering.
 * If clustering is not used, there is no overhead except for a duplicate object with references to nodes and edges.
 */

/**
 * This function is only called by the setData function of the Network object.
 * This loads the global references into the active sector. This initializes the sector.
 *
 * @private
 */
exports._putDataInSector = function() {
  this.sectors["active"][this._sector()].nodes = this.nodes;
  this.sectors["active"][this._sector()].edges = this.edges;
  this.sectors["active"][this._sector()].nodeIndices = this.nodeIndices;
};


/**
 *  /**
 * This function sets the global references to nodes, edges and nodeIndices back to
 * those of the supplied (active) sector. If a type is defined, do the specific type
 *
 * @param {String} sectorId
 * @param {String} [sectorType] | "active" or "frozen"
 * @private
 */
exports._switchToSector = function(sectorId, sectorType) {
  if (sectorType === undefined || sectorType == "active") {
    this._switchToActiveSector(sectorId);
  }
  else {
    this._switchToFrozenSector(sectorId);
  }
};


/**
 * This function sets the global references to nodes, edges and nodeIndices back to
 * those of the supplied active sector.
 *
 * @param sectorId
 * @private
 */
exports._switchToActiveSector = function(sectorId) {
  this.nodeIndices = this.sectors["active"][sectorId]["nodeIndices"];
  this.nodes       = this.sectors["active"][sectorId]["nodes"];
  this.edges       = this.sectors["active"][sectorId]["edges"];
};


/**
 * This function sets the global references to nodes, edges and nodeIndices back to
 * those of the supplied active sector.
 *
 * @private
 */
exports._switchToSupportSector = function() {
  this.nodeIndices = this.sectors["support"]["nodeIndices"];
  this.nodes       = this.sectors["support"]["nodes"];
  this.edges       = this.sectors["support"]["edges"];
};


/**
 * This function sets the global references to nodes, edges and nodeIndices back to
 * those of the supplied frozen sector.
 *
 * @param sectorId
 * @private
 */
exports._switchToFrozenSector = function(sectorId) {
  this.nodeIndices = this.sectors["frozen"][sectorId]["nodeIndices"];
  this.nodes       = this.sectors["frozen"][sectorId]["nodes"];
  this.edges       = this.sectors["frozen"][sectorId]["edges"];
};


/**
 * This function sets the global references to nodes, edges and nodeIndices back to
 * those of the currently active sector.
 *
 * @private
 */
exports._loadLatestSector = function() {
  this._switchToSector(this._sector());
};


/**
 * This function returns the currently active sector Id
 *
 * @returns {String}
 * @private
 */
exports._sector = function() {
  return this.activeSector[this.activeSector.length-1];
};


/**
 * This function returns the previously active sector Id
 *
 * @returns {String}
 * @private
 */
exports._previousSector = function() {
  if (this.activeSector.length > 1) {
    return this.activeSector[this.activeSector.length-2];
  }
  else {
    throw new TypeError('there are not enough sectors in the this.activeSector array.');
  }
};


/**
 * We add the active sector at the end of the this.activeSector array
 * This ensures it is the currently active sector returned by _sector() and it reaches the top
 * of the activeSector stack. When we reverse our steps we move from the end to the beginning of this stack.
 *
 * @param newId
 * @private
 */
exports._setActiveSector = function(newId) {
  this.activeSector.push(newId);
};


/**
 * We remove the currently active sector id from the active sector stack. This happens when
 * we reactivate the previously active sector
 *
 * @private
 */
exports._forgetLastSector = function() {
  this.activeSector.pop();
};


/**
 * This function creates a new active sector with the supplied newId. This newId
 * is the expanding node id.
 *
 * @param {String} newId   | Id of the new active sector
 * @private
 */
exports._createNewSector = function(newId) {
  // create the new sector
  this.sectors["active"][newId] = {"nodes":{},
                                   "edges":{},
                                   "nodeIndices":[],
                                   "formationScale": this.scale,
                                   "drawingNode": undefined};

  // create the new sector render node. This gives visual feedback that you are in a new sector.
  this.sectors["active"][newId]['drawingNode'] = new Node(
      {id:newId,
        color: {
          background: "#eaefef",
          border: "495c5e"
        }
      },{},{},this.constants);
  this.sectors["active"][newId]['drawingNode'].clusterSize = 2;
};


/**
 * This function removes the currently active sector. This is called when we create a new
 * active sector.
 *
 * @param {String} sectorId   | Id of the active sector that will be removed
 * @private
 */
exports._deleteActiveSector = function(sectorId) {
  delete this.sectors["active"][sectorId];
};


/**
 * This function removes the currently active sector. This is called when we reactivate
 * the previously active sector.
 *
 * @param {String} sectorId   | Id of the active sector that will be removed
 * @private
 */
exports._deleteFrozenSector = function(sectorId) {
  delete this.sectors["frozen"][sectorId];
};


/**
 * Freezing an active sector means moving it from the "active" object to the "frozen" object.
 * We copy the references, then delete the active entree.
 *
 * @param sectorId
 * @private
 */
exports._freezeSector = function(sectorId) {
  // we move the set references from the active to the frozen stack.
  this.sectors["frozen"][sectorId] = this.sectors["active"][sectorId];

  // we have moved the sector data into the frozen set, we now remove it from the active set
  this._deleteActiveSector(sectorId);
};


/**
 * This is the reverse operation of _freezeSector. Activating means moving the sector from the "frozen"
 * object to the "active" object.
 *
 * @param sectorId
 * @private
 */
exports._activateSector = function(sectorId) {
  // we move the set references from the frozen to the active stack.
  this.sectors["active"][sectorId] = this.sectors["frozen"][sectorId];

  // we have moved the sector data into the active set, we now remove it from the frozen stack
  this._deleteFrozenSector(sectorId);
};


/**
 * This function merges the data from the currently active sector with a frozen sector. This is used
 * in the process of reverting back to the previously active sector.
 * The data that is placed in the frozen (the previously active) sector is the node that has been removed from it
 * upon the creation of a new active sector.
 *
 * @param sectorId
 * @private
 */
exports._mergeThisWithFrozen = function(sectorId) {
  // copy all nodes
  for (var nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      this.sectors["frozen"][sectorId]["nodes"][nodeId] = this.nodes[nodeId];
    }
  }

  // copy all edges (if not fully clustered, else there are no edges)
  for (var edgeId in this.edges) {
    if (this.edges.hasOwnProperty(edgeId)) {
      this.sectors["frozen"][sectorId]["edges"][edgeId] = this.edges[edgeId];
    }
  }

  // merge the nodeIndices
  for (var i = 0; i < this.nodeIndices.length; i++) {
    this.sectors["frozen"][sectorId]["nodeIndices"].push(this.nodeIndices[i]);
  }
};


/**
 * This clusters the sector to one cluster. It was a single cluster before this process started so
 * we revert to that state. The clusterToFit function with a maximum size of 1 node does this.
 *
 * @private
 */
exports._collapseThisToSingleCluster = function() {
  this.clusterToFit(1,false);
};


/**
 * We create a new active sector from the node that we want to open.
 *
 * @param node
 * @private
 */
exports._addSector = function(node) {
  // this is the currently active sector
  var sector = this._sector();

//    // this should allow me to select nodes from a frozen set.
//    if (this.sectors['active'][sector]["nodes"].hasOwnProperty(node.id)) {
//      console.log("the node is part of the active sector");
//    }
//    else {
//      console.log("I dont know what the fuck happened!!");
//    }

  // when we switch to a new sector, we remove the node that will be expanded from the current nodes list.
  delete this.nodes[node.id];

  var unqiueIdentifier = util.randomUUID();

  // we fully freeze the currently active sector
  this._freezeSector(sector);

  // we create a new active sector. This sector has the Id of the node to ensure uniqueness
  this._createNewSector(unqiueIdentifier);

  // we add the active sector to the sectors array to be able to revert these steps later on
  this._setActiveSector(unqiueIdentifier);

  // we redirect the global references to the new sector's references. this._sector() now returns unqiueIdentifier
  this._switchToSector(this._sector());

  // finally we add the node we removed from our previous active sector to the new active sector
  this.nodes[node.id] = node;
};


/**
 * We close the sector that is currently open and revert back to the one before.
 * If the active sector is the "default" sector, nothing happens.
 *
 * @private
 */
exports._collapseSector = function() {
  // the currently active sector
  var sector = this._sector();

  // we cannot collapse the default sector
  if (sector != "default") {
    if ((this.nodeIndices.length == 1) ||
     (this.sectors["active"][sector]["drawingNode"].width*this.scale < this.constants.clustering.screenSizeThreshold * this.frame.canvas.clientWidth) ||
     (this.sectors["active"][sector]["drawingNode"].height*this.scale < this.constants.clustering.screenSizeThreshold * this.frame.canvas.clientHeight)) {
      var previousSector = this._previousSector();

      // we collapse the sector back to a single cluster
      this._collapseThisToSingleCluster();

      // we move the remaining nodes, edges and nodeIndices to the previous sector.
      // This previous sector is the one we will reactivate
      this._mergeThisWithFrozen(previousSector);

      // the previously active (frozen) sector now has all the data from the currently active sector.
      // we can now delete the active sector.
      this._deleteActiveSector(sector);

      // we activate the previously active (and currently frozen) sector.
      this._activateSector(previousSector);

      // we load the references from the newly active sector into the global references
      this._switchToSector(previousSector);

      // we forget the previously active sector because we reverted to the one before
      this._forgetLastSector();

      // finally, we update the node index list.
      this._updateNodeIndexList();

      // we refresh the list with calulation nodes and calculation node indices.
      this._updateCalculationNodes();
    }
  }
};


/**
 * This runs a function in all active sectors. This is used in _redraw() and the _initializeForceCalculation().
 *
 * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
 *                              |   we dont pass the function itself because then the "this" is the window object
 *                              |   instead of the Network object
 * @param {*} [argument]            |   Optional: arguments to pass to the runFunction
 * @private
 */
exports._doInAllActiveSectors = function(runFunction,argument) {
  var returnValues = [];
  if (argument === undefined) {
    for (var sector in this.sectors["active"]) {
      if (this.sectors["active"].hasOwnProperty(sector)) {
        // switch the global references to those of this sector
        this._switchToActiveSector(sector);
        returnValues.push( this[runFunction]() );
      }
    }
  }
  else {
    for (var sector in this.sectors["active"]) {
      if (this.sectors["active"].hasOwnProperty(sector)) {
        // switch the global references to those of this sector
        this._switchToActiveSector(sector);
        var args = Array.prototype.splice.call(arguments, 1);
        if (args.length > 1) {
          returnValues.push( this[runFunction](args[0],args[1]) );
        }
        else {
          returnValues.push( this[runFunction](argument) );
        }
      }
    }
  }
  // we revert the global references back to our active sector
  this._loadLatestSector();
  return returnValues;
};


/**
 * This runs a function in all active sectors. This is used in _redraw() and the _initializeForceCalculation().
 *
 * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
 *                              |   we dont pass the function itself because then the "this" is the window object
 *                              |   instead of the Network object
 * @param {*} [argument]        |   Optional: arguments to pass to the runFunction
 * @private
 */
exports._doInSupportSector = function(runFunction,argument) {
  var returnValues = false;
  if (argument === undefined) {
    this._switchToSupportSector();
    returnValues = this[runFunction]();
  }
  else {
    this._switchToSupportSector();
    var args = Array.prototype.splice.call(arguments, 1);
    if (args.length > 1) {
      returnValues = this[runFunction](args[0],args[1]);
    }
    else {
      returnValues = this[runFunction](argument);
    }
  }
  // we revert the global references back to our active sector
  this._loadLatestSector();
  return returnValues;
};


/**
 * This runs a function in all frozen sectors. This is used in the _redraw().
 *
 * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
 *                              |   we don't pass the function itself because then the "this" is the window object
 *                              |   instead of the Network object
 * @param {*} [argument]            |   Optional: arguments to pass to the runFunction
 * @private
 */
exports._doInAllFrozenSectors = function(runFunction,argument) {
  if (argument === undefined) {
    for (var sector in this.sectors["frozen"]) {
      if (this.sectors["frozen"].hasOwnProperty(sector)) {
        // switch the global references to those of this sector
        this._switchToFrozenSector(sector);
        this[runFunction]();
      }
    }
  }
  else {
    for (var sector in this.sectors["frozen"]) {
      if (this.sectors["frozen"].hasOwnProperty(sector)) {
        // switch the global references to those of this sector
        this._switchToFrozenSector(sector);
        var args = Array.prototype.splice.call(arguments, 1);
        if (args.length > 1) {
          this[runFunction](args[0],args[1]);
        }
        else {
          this[runFunction](argument);
        }
      }
    }
  }
  this._loadLatestSector();
};


/**
 * This runs a function in all sectors. This is used in the _redraw().
 *
 * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
 *                              |   we don't pass the function itself because then the "this" is the window object
 *                              |   instead of the Network object
 * @param {*} [argument]        |   Optional: arguments to pass to the runFunction
 * @private
 */
exports._doInAllSectors = function(runFunction,argument) {
  var args = Array.prototype.splice.call(arguments, 1);
  if (argument === undefined) {
    this._doInAllActiveSectors(runFunction);
    this._doInAllFrozenSectors(runFunction);
  }
  else {
    if (args.length > 1) {
      this._doInAllActiveSectors(runFunction,args[0],args[1]);
      this._doInAllFrozenSectors(runFunction,args[0],args[1]);
    }
    else {
      this._doInAllActiveSectors(runFunction,argument);
      this._doInAllFrozenSectors(runFunction,argument);
    }
  }
};


/**
 * This clears the nodeIndices list. We cannot use this.nodeIndices = [] because we would break the link with the
 * active sector. Thus we clear the nodeIndices in the active sector, then reconnect the this.nodeIndices to it.
 *
 * @private
 */
exports._clearNodeIndexList = function() {
  var sector = this._sector();
  this.sectors["active"][sector]["nodeIndices"] = [];
  this.nodeIndices = this.sectors["active"][sector]["nodeIndices"];
};


/**
 * Draw the encompassing sector node
 *
 * @param ctx
 * @param sectorType
 * @private
 */
exports._drawSectorNodes = function(ctx,sectorType) {
  var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
  for (var sector in this.sectors[sectorType]) {
    if (this.sectors[sectorType].hasOwnProperty(sector)) {
      if (this.sectors[sectorType][sector]["drawingNode"] !== undefined) {

        this._switchToSector(sector,sectorType);

        minY = 1e9; maxY = -1e9; minX = 1e9; maxX = -1e9;
        for (var nodeId in this.nodes) {
          if (this.nodes.hasOwnProperty(nodeId)) {
            node = this.nodes[nodeId];
            node.resize(ctx);
            if (minX > node.x - 0.5 * node.width) {minX = node.x - 0.5 * node.width;}
            if (maxX < node.x + 0.5 * node.width) {maxX = node.x + 0.5 * node.width;}
            if (minY > node.y - 0.5 * node.height) {minY = node.y - 0.5 * node.height;}
            if (maxY < node.y + 0.5 * node.height) {maxY = node.y + 0.5 * node.height;}
          }
        }
        node = this.sectors[sectorType][sector]["drawingNode"];
        node.x = 0.5 * (maxX + minX);
        node.y = 0.5 * (maxY + minY);
        node.width = 2 * (node.x - minX);
        node.height = 2 * (node.y - minY);
        node.options.radius = Math.sqrt(Math.pow(0.5*node.width,2) + Math.pow(0.5*node.height,2));
        node.setScale(this.scale);
        node._drawCircle(ctx);
      }
    }
  }
};

exports._drawAllSectorNodes = function(ctx) {
  this._drawSectorNodes(ctx,"frozen");
  this._drawSectorNodes(ctx,"active");
  this._loadLatestSector();
};
