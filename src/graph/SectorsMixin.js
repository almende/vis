
var SectorMixin = {

  /**
   * This function is only called by the setData function of the Graph object.
   * This loads the global references into the active sector. This initializes the sector.
   *
   * @private
   */
  _putDataInSector : function() {
    this.sectors["active"][this._sector()].nodes = this.nodes;
    this.sectors["active"][this._sector()].edges = this.edges;
    this.sectors["active"][this._sector()].nodeIndices = this.nodeIndices;
  },


  /**
   * This function sets the global references to nodes, edges and nodeIndices back to
   * those of the supplied (active) sector.
   *
   * @param sectorID
   * @private
   */
  _switchToSector : function(sectorID) {
    this.nodeIndices = this.sectors["active"][sectorID]["nodeIndices"];
    this.nodes       = this.sectors["active"][sectorID]["nodes"];
    this.edges       = this.sectors["active"][sectorID]["edges"];
  },


  /**
   * This function sets the global references to nodes, edges and nodeIndices back to
   * those of the currently active sector.
   *
   * @private
   */
  _loadActiveSector : function() {
    this._switchToSector(this._sector());
  },


  /**
   * This function returns the currently active sector ID
   *
   * @returns {String}
   * @private
   */
  _sector : function() {
    return this.activeSector[this.activeSector.length-1];
  },


  /**
   * This function returns the previously active sector ID
   *
   * @returns {String}
   * @private
   */
  _previousSector : function() {
    if (this.activeSector.length > 1) {
      return this.activeSector[this.activeSector.length-2];
    }
    else {
      throw new TypeError('there are not enough sectors in the this.activeSector array.');
      return "";
    }
  },


  /**
   * We add the active sector at the end of the this.activeSector array
   * This ensures it is the currently active sector returned by _sector() and it reaches the top
   * of the activeSector stack. When we reverse our steps we move from the end to the beginning of this stack.
   *
   * @param newID
   * @private
   */
  _setActiveSector : function(newID) {
    this.activeSector.push(newID);
  },


  /**
   * We remove the currently active sector id from the active sector stack. This happens when
   * we reactivate the previously active sector
   *
   * @private
   */
  _forgetLastSector : function() {
    this.activeSector.pop();
  },


  /**
   * This function creates a new active sector with the supplied newID. This newID
   * is the expanding node id.
   *
   * @param {String} newID   | ID of the new active sector
   * @private
   */
  _createNewSector : function(newID) {
    this.sectors["active"][newID] = {"nodes":{  },"edges":{  },"nodeIndices":[]}
  },


  /**
   * This function removes the currently active sector. This is called when we create a new
   * active sector.
   *
   * @param {String} sectorID   | ID of the active sector that will be removed
   * @private
   */
  _deleteActiveSector : function(sectorID) {
    delete this.sectors["active"][sectorID];
  },


  /**
   * This function removes the currently active sector. This is called when we reactivate
   * the previously active sector.
   *
   * @param {String} sectorID   | ID of the active sector that will be removed
   * @private
   */
  _deleteFrozenSector : function(sectorID) {
    delete this.sectors["frozen"][sectorID];
  },


  /**
   * Freezing an active sector means moving it from the "active" object to the "frozen" object.
   * We copy the references, then delete the active entree.
   *
   * @param sectorID
   * @private
   */
  _freezeSector : function(sectorID) {
    // we move the set references from the active to the frozen stack.
    this.sectors["frozen"][sectorID] = this.sectors["active"][sectorID];

    // we have moved the sector data into the frozen set, we now remove it from the active set
    this._deleteActiveSector(sectorID);
  },


  /**
   * This is the reverse operation of _freezeSector. Activating means moving the sector from the "frozen"
   * object to the "active" object.
   *
   * @param sectorID
   * @private
   */
  _activateSector : function(sectorID) {
    // we move the set references from the frozen to the active stack.
    this.sectors["active"][sectorID] = this.sectors["frozen"][sectorID];

    // we have moved the sector data into the active set, we now remove it from the frozen stack
    this._deleteFrozenSector(sectorID);
  },


  /**
   * This function merges the data from the currently active sector with a frozen sector. This is used
   * in the process of reverting back to the previously active sector.
   * The data that is placed in the frozen (the previously active) sector is the node that has been removed from it
   * upon the creation of a new active sector.
   *
   * @param sectorID
   * @private
   */
  _mergeThisWithFrozen : function(sectorID) {
    // copy all nodes
    for (var nodeID in this.nodes) {
      if (this.nodes.hasOwnProperty(nodeID)) {
        this.sectors["frozen"][sectorID]["nodes"][nodeID] = this.nodes[nodeID];
      }
    }

    // copy all edges (if not fully clustered, else there are no edges)
    for (var edgeID in this.edges) {
      if (this.edges.hasOwnProperty(edgeID)) {
        this.sectors["frozen"][sectorID]["edges"][edgeID] = this.edges[edgeID];
      }
    }

    // merge the nodeIndices
    for (var i = 0; i < this.nodeIndices.length; i++) {
      this.sectors["frozen"][sectorID]["nodeIndices"].push(this.nodeIndices[i]);
    }
  },


  /**
   * This clusters the sector to one cluster. It was a single cluster before this process started so
   * we revert to that state. The clusterToFit function with a maximum size of 1 node does this.
   *
   * @private
   */
  _collapseThisToSingleCluster : function() {
    this.clusterToFit(1,false);
  },


  /**
   * We create a new active sector from the node that we want to open.
   *
   * @param node
   * @private
   */
  _addSector : function(node) {
    // this is the currently active sector
    var sector = this._sector();

    // this should allow me to select nodes from a frozen set.
    // TODO: after rewriting the selection function, have this working
    if (this.sectors['active'][sector]["nodes"].hasOwnProperty(node.id)) {
      console.log("the node is part of the active sector");
    }
    else {
      console.log("I dont know what the fuck happened!!");
    }

    // when we switch to a new sector, we remove the node that will be expanded from the current nodes list.
    delete this.nodes[node.id];

    // we fully freeze the currently active sector
    this._freezeSector(sector);

    // we create a new active sector. This sector has the ID of the node to ensure uniqueness
    this._createNewSector(node.id);

    // we add the active sector to the sectors array to be able to revert these steps later on
    this._setActiveSector(node.id);

    // we redirect the global references to the new sector's references.
    this._switchToSector(this._sector());

    // finally we add the node we removed from our previous active sector to the new active sector
    this.nodes[node.id] = node;
  },


  /**
   * We close the sector that is currently open and revert back to the one before.
   * If the active sector is the "default" sector, nothing happens.
   *
   * @private
   */
  _collapseSector : function() {
    // the currently active sector
    var sector = this._sector();

    // we cannot collapse the default sector
    if (sector != "default") {
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
    }
  },


  /**
   * This runs a function in all active sectors. This is used in _redraw() and the _calculateForces().
   *
   * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
   *                              |   we dont pass the function itself because then the "this" is the window object
   *                              |   instead of the Graph object
   * @param {*} [args]            |   Optional: arguments to pass to the runFunction
   * @private
   */
  _doInAllActiveSectors : function(runFunction,args) {
    if (args === undefined) {
      for (var sector in this.sectors["active"]) {
        if (this.sectors["active"].hasOwnProperty(sector)) {
          // switch the global references to those of this sector
          this._switchToSector(sector);
          this[runFunction]();
        }
      }
    }
    else {
      for (var sector in this.sectors["active"]) {
        if (this.sectors["active"].hasOwnProperty(sector)) {
          // switch the global references to those of this sector
          this._switchToSector(sector);
          this[runFunction](args);
        }
      }
    }

    // we revert the global references back to our active sector
    this._loadActiveSector();
  },


  /**
   * This runs a function in all frozen sectors. This is used in the _redraw().
   *
   * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
   *                              |   we dont pass the function itself because then the "this" is the window object
   *                              |   instead of the Graph object
   * @param {*} [args]            |   Optional: arguments to pass to the runFunction
   * @private
   */
  _doInAllFrozenSectors : function(runFunction,args) {
    if (args === undefined) {
      for (var sector in this.sectors["frozen"]) {
        if (this.sectors["frozen"].hasOwnProperty(sector)) {
          this._switchToSector(sector);
          this[runFunction]();
        }
      }
    }
    else {
      for (var sector in this.sectors["frozen"]) {
        if (this.sectors["frozen"].hasOwnProperty(sector)) {
          this._switchToSector(sector);
          this[runFunction](args);
        }
      }
    }
    this._loadActiveSector();
  },


  /**
   * This runs a function in all sectors. This is used in the _redraw().
   *
   * @param {String} runFunction  |   This is the NAME of a function we want to call in all active sectors
   *                              |   we dont pass the function itself because then the "this" is the window object
   *                              |   instead of the Graph object
   * @param {*} [args]            |   Optional: arguments to pass to the runFunction
   * @private
   */
  _doInAllSectors : function(runFunction,argument) {
    this._doInAllActiveSectors(runFunction,argument);
    this._doInAllFrozenSectors(runFunction,argument);
  },


  /**
   * This clears the nodeIndices list. We cannot use this.nodeIndices = [] because we would break the link with the
   * active sector. Thus we clear the nodeIndices in the active sector, then reconnect the this.nodeIndices to it.
   *
   * @private
   */
  _clearNodeIndexList : function() {
    var sector = this._sector();
    this.sectors["active"][sector]["nodeIndices"] = [];
    this.nodeIndices = this.sectors["active"][sector]["nodeIndices"];
  }
};