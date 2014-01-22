/**
 * Created by Alex on 1/22/14.
 */

var UIMixin = {

  _relocateUI : function() {
    if (this.sectors !== undefined) {
      var xOffset = this.UIclientWidth - this.frame.canvas.clientWidth;
      var yOffset = this.UIclientHeight - this.frame.canvas.clientHeight;
      this.UIclientWidth = this.frame.canvas.clientWidth;
      this.UIclientHeight = this.frame.canvas.clientHeight;
      var node = null;

      for (var nodeId in this.sectors["UI"]["nodes"]) {
        if (this.sectors["UI"]["nodes"].hasOwnProperty(nodeId)) {
          node = this.sectors["UI"]["nodes"][nodeId];
          if (!node.horizontalAlignLeft) {
            node.x -= xOffset;
          }
          if (!node.verticalAlignTop) {
            node.y -= yOffset;
          }
        }
      }
    }
  },

  _loadUIElements : function() {
    var DIR = 'img/UI/';
    this.UIclientWidth = this.frame.canvas.clientWidth;
    this.UIclientHeight = this.frame.canvas.clientHeight;
    if (this.UIclientWidth === undefined) {
      this.UIclientWidth = 0;
      this.UIclientHeight = 0;
    }
    var UINodes = [
      {id: 'UI_up',    shape: 'image', image: DIR + 'uparrow.png',   triggerFunction: "_moveUp",
        verticalAlignTop: false,  x: 52,  y: this.UIclientHeight - 52},
      {id: 'UI_down',  shape: 'image', image: DIR + 'downarrow.png', triggerFunction: "_moveDown",
        verticalAlignTop: false,  x: 52,  y: this.UIclientHeight - 20},
      {id: 'UI_left',  shape: 'image', image: DIR + 'leftarrow.png', triggerFunction: "_moveLeft",
        verticalAlignTop: false,  x: 20,  y: this.UIclientHeight - 20},
      {id: 'UI_right', shape: 'image', image: DIR + 'rightarrow.png',triggerFunction: "_moveRight",
        verticalAlignTop: false,  x: 84,  y: this.UIclientHeight - 20},
      {id: 'UI_plus',  shape: 'image', image: DIR + 'plus.png',      triggerFunction: "_zoomIn",
        verticalAlignTop: false,  x: 140, y: this.UIclientHeight - 20},
      {id: 'UI_min', shape: 'image', image: DIR + 'minus.png',       triggerFunction: "_zoomOut",
        verticalAlignTop: false,  x: 172, y: this.UIclientHeight - 20}
    ];

    var nodeObj = null;
    for (var i = 0; i < UINodes.length; i++) {
      nodeObj = this.sectors["UI"]['nodes'];
      nodeObj[UINodes[i]['id']] = new Node(UINodes[i], this.images, this.groups, this.constants);
    }
  },

  _highlightUIElement : function(elementId) {
    if (this.sectors["UI"]["nodes"].hasOwnProperty(elementId)) {
      this.sectors["UI"]["nodes"][elementId].clusterSize = 2;
    }
  },

  _unHighlightUIElement : function(elementId) {
    if (this.sectors["UI"]["nodes"].hasOwnProperty(elementId)) {
      this.sectors["UI"]["nodes"][elementId].clusterSize = 1;
    }
  },

  _toggleUI : function() {
    this.UIvisible = !this.UIvisible;
    this._redraw();
  },

  _unHighlightAll : function() {
    for (var nodeId in this.sectors['UI']['nodes']) {
      this._unHighlightUIElement(nodeId);
    }
  },

  _moveUp : function() {
    this._highlightUIElement("UI_up");
    this.yIncrement = this.constants.UI.yMovementSpeed;
    this.start(); // if there is no node movement, the calculation wont be done
  },

  _moveDown : function() {
    this._highlightUIElement("UI_down");
    this.yIncrement = -this.constants.UI.yMovementSpeed;
    this.start(); // if there is no node movement, the calculation wont be done
  },

  _moveLeft : function() {
    this._highlightUIElement("UI_left");
    this.xIncrement = this.constants.UI.xMovementSpeed;
    this.start(); // if there is no node movement, the calculation wont be done
  },

  _moveRight : function() {
    this._highlightUIElement("UI_right");
    this.xIncrement = -this.constants.UI.xMovementSpeed;
    this.start(); // if there is no node movement, the calculation wont be done
  },

  _zoomIn : function() {
    this._highlightUIElement("UI_plus");
    this.zoomIncrement = this.constants.UI.zoomMovementSpeed;
    this.start(); // if there is no node movement, the calculation wont be done
  },

  _zoomOut : function() {
    this._highlightUIElement("UI_min");
    this.zoomIncrement = -this.constants.UI.zoomMovementSpeed;
    this.start(); // if there is no node movement, the calculation wont be done
  },

  _stopZoom : function() {
    if (this.zoomIncrement > 0) {      // plus (zoomin)
      this._unHighlightUIElement("UI_plus");
    }
    else if (this.zoomIncrement < 0) { // min (zoomout)
      this._unHighlightUIElement("UI_min");
    }
    this.zoomIncrement = 0;
  },

  _yStopMoving : function() {
    if (this.yIncrement > 0) {      // up
      this._unHighlightUIElement("UI_up");
    }
    else if (this.yIncrement < 0) { // down
      this._unHighlightUIElement("UI_down");
    }
    this.yIncrement = 0;
  },

  _xStopMoving : function() {
    if (this.xIncrement > 0) {      // left
      this._unHighlightUIElement("UI_left");
    }
    else if (this.xIncrement < 0) { // right
      this._unHighlightUIElement("UI_right");
    }
    this.xIncrement = 0;
  }


};