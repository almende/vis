var PhysicsMixin = require('./physics/PhysicsMixin');
var ClusterMixin = require('./ClusterMixin');
var SectorsMixin = require('./SectorsMixin');
var SelectionMixin = require('./SelectionMixin');
var ManipulationMixin = require('./ManipulationMixin');
var NavigationMixin = require('./NavigationMixin');
var HierarchicalLayoutMixin = require('./HierarchicalLayoutMixin');

/**
 * Load a mixin into the network object
 *
 * @param {Object} sourceVariable | this object has to contain functions.
 * @private
 */
exports._loadMixin = function (sourceVariable) {
  for (var mixinFunction in sourceVariable) {
    if (sourceVariable.hasOwnProperty(mixinFunction)) {
      this[mixinFunction] = sourceVariable[mixinFunction];
    }
  }
};


/**
 * removes a mixin from the network object.
 *
 * @param {Object} sourceVariable | this object has to contain functions.
 * @private
 */
exports._clearMixin = function (sourceVariable) {
  for (var mixinFunction in sourceVariable) {
    if (sourceVariable.hasOwnProperty(mixinFunction)) {
      this[mixinFunction] = undefined;
    }
  }
};


/**
 * Mixin the physics system and initialize the parameters required.
 *
 * @private
 */
exports._loadPhysicsSystem = function () {
  this._loadMixin(PhysicsMixin);
  this._loadSelectedForceSolver();
  if (this.constants.configurePhysics == true) {
    this._loadPhysicsConfiguration();
  }
  else {
    this._cleanupPhysicsConfiguration();
  }
};


/**
 * Mixin the cluster system and initialize the parameters required.
 *
 * @private
 */
exports._loadClusterSystem = function () {
  this.clusterSession = 0;
  this.hubThreshold = 5;
  this._loadMixin(ClusterMixin);
};


/**
 * Mixin the sector system and initialize the parameters required
 *
 * @private
 */
exports._loadSectorSystem = function () {
  this.sectors = {};
  this.activeSector = ["default"];
  this.sectors["active"] = {};
  this.sectors["active"]["default"] = {"nodes": {},
    "edges": {},
    "nodeIndices": [],
    "formationScale": 1.0,
    "drawingNode": undefined };
  this.sectors["frozen"] = {};
  this.sectors["support"] = {"nodes": {},
    "edges": {},
    "nodeIndices": [],
    "formationScale": 1.0,
    "drawingNode": undefined };

  this.nodeIndices = this.sectors["active"]["default"]["nodeIndices"];  // the node indices list is used to speed up the computation of the repulsion fields

  this._loadMixin(SectorsMixin);
};


/**
 * Mixin the selection system and initialize the parameters required
 *
 * @private
 */
exports._loadSelectionSystem = function () {
  this.selectionObj = {nodes: {}, edges: {}};

  this._loadMixin(SelectionMixin);
};


/**
 * Mixin the navigationUI (User Interface) system and initialize the parameters required
 *
 * @private
 */
exports._loadManipulationSystem = function () {
  // reset global variables -- these are used by the selection of nodes and edges.
  this.blockConnectingEdgeSelection = false;
  this.forceAppendSelection = false;

  if (this.constants.dataManipulation.enabled == true) {
    // load the manipulator HTML elements. All styling done in css.
    if (this.manipulationDiv === undefined) {
      this.manipulationDiv = document.createElement('div');
      this.manipulationDiv.className = 'network-manipulationDiv';
      if (this.editMode == true) {
        this.manipulationDiv.style.display = "block";
      }
      else {
        this.manipulationDiv.style.display = "none";
      }
      this.frame.appendChild(this.manipulationDiv);
    }

    if (this.editModeDiv === undefined) {
      this.editModeDiv = document.createElement('div');
      this.editModeDiv.className = 'network-manipulation-editMode';
      if (this.editMode == true) {
        this.editModeDiv.style.display = "none";
      }
      else {
        this.editModeDiv.style.display = "block";
      }
      this.frame.appendChild(this.editModeDiv);
    }

    if (this.closeDiv === undefined) {
      this.closeDiv = document.createElement('div');
      this.closeDiv.className = 'network-manipulation-closeDiv';
      this.closeDiv.style.display = this.manipulationDiv.style.display;
      this.frame.appendChild(this.closeDiv);
    }

    // load the manipulation functions
    this._loadMixin(ManipulationMixin);

    // create the manipulator toolbar
    this._createManipulatorBar();
  }
  else {
    if (this.manipulationDiv !== undefined) {
      // removes all the bindings and overloads
      this._createManipulatorBar();

      // remove the manipulation divs
      this.frame.removeChild(this.manipulationDiv);
      this.frame.removeChild(this.editModeDiv);
      this.frame.removeChild(this.closeDiv);

      this.manipulationDiv = undefined;
      this.editModeDiv = undefined;
      this.closeDiv = undefined;
      // remove the mixin functions
      this._clearMixin(ManipulationMixin);
    }
  }
};


/**
 * Mixin the navigation (User Interface) system and initialize the parameters required
 *
 * @private
 */
exports._loadNavigationControls = function () {
  this._loadMixin(NavigationMixin);
  // the clean function removes the button divs, this is done to remove the bindings.
  this._cleanNavigation();
  if (this.constants.navigation.enabled == true) {
    this._loadNavigationElements();
  }
};


/**
 * Mixin the hierarchical layout system.
 *
 * @private
 */
exports._loadHierarchySystem = function () {
  this._loadMixin(HierarchicalLayoutMixin);
};
