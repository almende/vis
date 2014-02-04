/**
 * Created by Alex on 2/4/14.
 */

var manipulationMixin = {

  _createManipulatorBar : function() {
    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }
    // add the icons to the manipulator div
    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI add' id='manipulate-addNode'><span class='manipulationLabel'>Add Node</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI connect' id='manipulate-connectNode'><span class='manipulationLabel'>Connect Node</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI delete' id='manipulate-delete'><span class='manipulationLabel'>Delete selected</span></span>";

    // bind the icons
    var addButton = document.getElementById("manipulate-addNode");
    addButton.onclick = this._createAddToolbar.bind(this);
    var connectButton = document.getElementById("manipulate-connectNode");
    connectButton.onclick = this._createConnectToolbar.bind(this);
    var deleteButton = document.getElementById("manipulate-delete");
    deleteButton.onclick = this._deleteSelected.bind(this);
  },

  _createAddToolbar : function() {
    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }

    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none' id='manipulate-back'><span class='manipulationLabel'>Click in an empty space to place a new node</span></span>";

    // bind the icon
    var backButton = document.getElementById("manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);


    var me = this;
    events.addListener(me, 'select', me._addNode.bind(me));
  },


  _createConnectToolbar : function() {
    while (this.manipulationDiv.hasChildNodes()) {
      this.manipulationDiv.removeChild(this.manipulationDiv.firstChild);
    }
    var message = "hello";
    if (!this._selectionIsEmpty()) {
      message = "Select the node you want to connect to other nodes";
    }

    this.manipulationDiv.innerHTML = "" +
      "<span class='manipulationUI back' id='manipulate-back'><span class='manipulationLabel'>Back</span></span>" +
      "<div class='seperatorLine'></div>" +
      "<span class='manipulationUI none' id='manipulate-back'><span id='manipulatorLabel' class='manipulationLabel'>"+message+"</span></span>";

    // bind the icon
    var backButton = document.getElementById("manipulate-back");
    backButton.onclick = this._createManipulatorBar.bind(this);

    var self = this;
    events.addListener(self, 'select', function(params) {alert(self.selectForConnect)});
  },

  _continueConnect : function() {
    if (this._clusterInSelection()) {
      this._unselectAll();
      this._createConnectToolbar("Select the node you want to connect (Clusters are not allowed).");
      return true;
    }
    else if (!this._selectionIsEmpty()) {
      this._connectNodes();
      return true;
    }
    else {
      var manipulatorLabel = document.getElementById['manipolatorLabel'];
      manipulatorLabel
      return false;
    }
  },


  /**
   * Adds a node on the specified location
   *
   * @param {Object} pointer
   */
  _addNode : function(pointer) {
    console.log("HERE",this)
    if (this._selectionIsEmpty()) {
      var positionObject = this._pointerToPositionObject(pointer);
      this.nodesData.add({id:util.randomUUID(),x:positionObject.left,y:positionObject.top,label:"new",fixed:false});
      this.moving = true;
      this.start();
    }
  },

  _connectNodes : function() {
    console.log(this.selectionObj)
  },


  /**
   * delete everything in the selection
   *
   * @private
   */
  _deleteSelected : function() {
    if (!this._clusterInSelection()) {
      var selectedNodes = this.getSelectedNodes();
      var selectedEdges = this.getSelectedEdges();
      this._removeEdges(selectedEdges);
      this._removeNodes(selectedNodes);
      this._redraw();
    }
    else {
      alert("Clusters cannot be deleted.")
    }
  }



}