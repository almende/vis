/**
 * Created by Alex on 2/10/14.
 */


var graphMixinLoaders = {

  /**
   * Load a mixin into the graph object
   *
   * @param {Object} sourceVariable | this object has to contain functions.
   * @private
   */
  _loadMixin : function(sourceVariable) {
    for (var mixinFunction in sourceVariable) {
      if (sourceVariable.hasOwnProperty(mixinFunction)) {
        Graph.prototype[mixinFunction] = sourceVariable[mixinFunction];
      }
    }
  },


  /**
   * removes a mixin from the graph object.
   *
   * @param {Object} sourceVariable | this object has to contain functions.
   * @private
   */
  _clearMixin : function(sourceVariable) {
    for (var mixinFunction in sourceVariable) {
      if (sourceVariable.hasOwnProperty(mixinFunction)) {
        Graph.prototype[mixinFunction] = undefined;
      }
    }
  },


  /**
   * Mixin the physics system and initialize the parameters required.
   *
   * @private
   */
  _loadPhysicsSystem : function() {
    this._loadMixin(physicsMixin);
    this._loadSelectedForceSolver();
   },


  /**
   * This loads the node force solver based on the barnes hut or repulsion algorithm
   *
   * @private
   */
  _loadSelectedForceSolver : function() {
    // this overloads the this._calculateNodeForces
    if (this.constants.physics.barnesHut.enabled == true) {
      this._clearMixin(repulsionMixin);

      this.constants.physics.centralGravity = this.constants.physics.barnesHut.centralGravity;
      this.constants.physics.springLength   = this.constants.physics.barnesHut.springLength;
      this.constants.physics.springConstant = this.constants.physics.barnesHut.springConstant;
      this.constants.physics.springGrowthPerMass = this.constants.physics.barnesHut.springGrowthPerMass;

      this._loadMixin(barnesHutMixin);
    }
    else {
      this._clearMixin(barnesHutMixin);
      this.barnesHutTree = undefined;

      this.constants.physics.centralGravity = this.constants.physics.repulsion.centralGravity;
      this.constants.physics.springLength   = this.constants.physics.repulsion.springLength;
      this.constants.physics.springConstant = this.constants.physics.repulsion.springConstant;
      this.constants.physics.springGrowthPerMass = this.constants.physics.repulsion.springGrowthPerMass;

      this._loadMixin(repulsionMixin);
    }
  },


  /**
   * Mixin the cluster system and initialize the parameters required.
   *
   * @private
   */
  _loadClusterSystem : function() {
    this.clusterSession = 0;
    this.hubThreshold = 5;
    this._loadMixin(ClusterMixin);
  },


  /**
   * Mixin the sector system and initialize the parameters required
   *
   * @private
   */
  _loadSectorSystem : function() {
    this.sectors = { },
    this.activeSector = ["default"];
    this.sectors["active"] = { },
    this.sectors["active"]["default"] = {"nodes":{},
      "edges":{},
      "nodeIndices":[],
      "formationScale": 1.0,
      "drawingNode": undefined };
    this.sectors["frozen"] = { },
    this.sectors["navigation"] = {"nodes":{},
      "edges":{},
      "nodeIndices":[],
      "formationScale": 1.0,
      "drawingNode": undefined };
    this.sectors["support"] = {"nodes":{},
      "edges":{},
      "nodeIndices":[],
      "formationScale": 1.0,
      "drawingNode": undefined };

    this.nodeIndices = this.sectors["active"]["default"]["nodeIndices"];  // the node indices list is used to speed up the computation of the repulsion fields

    this._loadMixin(SectorMixin);
   },


  /**
   * Mixin the selection system and initialize the parameters required
   *
   * @private
   */
  _loadSelectionSystem : function() {
    this.selectionObj = { };

    this._loadMixin(SelectionMixin);
   },


  /**
   * Mixin the navigationUI (User Interface) system and initialize the parameters required
   *
   * @private
   */
  _loadManipulationSystem : function() {
    // reset global variables -- these are used by the selection of nodes and edges.
    this.blockConnectingEdgeSelection = false;
    this.forceAppendSelection = false


    if (this.constants.dataManipulationToolbar.enabled == true) {
      // load the manipulator HTML elements. All styling done in css.
      if (this.manipulationDiv === undefined) {
        this.manipulationDiv = document.createElement('div');
        this.manipulationDiv.className = 'graph-manipulationDiv';
        this.containerElement.insertBefore(this.manipulationDiv, this.frame);
      }
      // load the manipulation functions
      this._loadMixin(manipulationMixin);

      // create the manipulator toolbar
      this._createManipulatorBar();
    }
   },


  /**
   * Mixin the navigation (User Interface) system and initialize the parameters required
   *
   * @private
   */
  _loadNavigationControls : function() {
    this._loadMixin(NavigationMixin);

    if (this.constants.navigation.enabled == true) {
      this._loadNavigationElements();
    }
   },


  /**
   * this function exists to avoid errors when not loading the navigation system
   */
  _relocateNavigation : function() {
    // empty, is overloaded by navigation system
   },


  /**
   * this function exists to avoid errors when not loading the navigation system
   */
  _unHighlightAll : function() {
    // empty, is overloaded by the navigation system
  }
}
