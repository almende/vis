/**
 * Created by Alex on 1/22/14.
 */

var NavigationMixin = {

  /**
   * This function moves the navigation controls if the canvas size has been changed. If the arugments
   * verticaAlignTop and horizontalAlignLeft are false, the correction will be made
   *
   * @private
   */
  _relocateUI : function() {
    if (this.sectors !== undefined) {
      var xOffset = this.UIclientWidth - this.frame.canvas.clientWidth;
      var yOffset = this.UIclientHeight - this.frame.canvas.clientHeight;
      this.UIclientWidth = this.frame.canvas.clientWidth;
      this.UIclientHeight = this.frame.canvas.clientHeight;
      var node = null;

      for (var nodeId in this.sectors["navigation"]["nodes"]) {
        if (this.sectors["navigation"]["nodes"].hasOwnProperty(nodeId)) {
          node = this.sectors["navigation"]["nodes"][nodeId];
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


  /**
   * Creation of the navigation controls nodes. They are drawn over the rest of the nodes and are not affected by scale and translation
   * they have a triggerFunction which is called on click. If the position of the navigation controls is dependent
   * on this.frame.canvas.clientWidth or this.frame.canvas.clientHeight, we flag horizontalAlignLeft and verticalAlignTop false.
   * This means that the location will be corrected by the _relocateUI function on a size change of the canvas.
   *
   * @private
   */
  _loadUIElements : function() {
    var DIR = this.constants.navigation.iconPath;
    this.UIclientWidth = this.frame.canvas.clientWidth;
    this.UIclientHeight = this.frame.canvas.clientHeight;
    if (this.UIclientWidth === undefined) {
      this.UIclientWidth = 0;
      this.UIclientHeight = 0;
    }
    var offset = 15;
    var intermediateOffset = 7;
    var UINodes = [
      {id: 'UI_up',    shape: 'image', image: DIR + 'uparrow.png',   triggerFunction: "_moveUp",
        verticalAlignTop: false,  x: 45 + offset + intermediateOffset,  y: this.UIclientHeight - 45 - offset - intermediateOffset},
      {id: 'UI_down',  shape: 'image', image: DIR + 'downarrow.png', triggerFunction: "_moveDown",
        verticalAlignTop: false,  x: 45 + offset + intermediateOffset,  y: this.UIclientHeight - 15 - offset},
      {id: 'UI_left',  shape: 'image', image: DIR + 'leftarrow.png', triggerFunction: "_moveLeft",
        verticalAlignTop: false,  x: 15 + offset,  y: this.UIclientHeight - 15 - offset},
      {id: 'UI_right', shape: 'image', image: DIR + 'rightarrow.png',triggerFunction: "_moveRight",
        verticalAlignTop: false,  x: 75 + offset + 2 * intermediateOffset,  y: this.UIclientHeight - 15 - offset},

      {id: 'UI_plus',  shape: 'image', image: DIR + 'plus.png',      triggerFunction: "_zoomIn",
        verticalAlignTop: false, horizontalAlignLeft: false,
        x: this.UIclientWidth - 45 - offset - intermediateOffset, y: this.UIclientHeight - 15 - offset},
      {id: 'UI_min', shape: 'image', image: DIR + 'minus.png',       triggerFunction: "_zoomOut",
        verticalAlignTop: false, horizontalAlignLeft: false,
        x: this.UIclientWidth - 15 - offset, y: this.UIclientHeight - 15 - offset},
      {id: 'UI_zoomExtends', shape: 'image', image: DIR + 'zoomExtends.png', triggerFunction: "zoomToFit",
        verticalAlignTop: false, horizontalAlignLeft: false,
        x: this.UIclientWidth - 15 - offset, y: this.UIclientHeight - 45 - offset - intermediateOffset}
    ];

    var nodeObj = null;
    for (var i = 0; i < UINodes.length; i++) {
      nodeObj = this.sectors["navigation"]['nodes'];
      nodeObj[UINodes[i]['id']] = new Node(UINodes[i], this.images, this.groups, this.constants);
    }
  },


  /**
   * By setting the clustersize to be larger than 1, we use the clustering drawing method
   * to illustrate the buttons are presed. We call this highlighting.
   *
   * @param {String} elementId
   * @private
   */
  _highlightUIElement : function(elementId) {
    if (this.sectors["navigation"]["nodes"].hasOwnProperty(elementId)) {
      this.sectors["navigation"]["nodes"][elementId].clusterSize = 2;
    }
  },


  /**
   * Reverting back to a normal button
   *
   * @param {String} elementId
   * @private
   */
  _unHighlightUIElement : function(elementId) {
    if (this.sectors["navigation"]["nodes"].hasOwnProperty(elementId)) {
      this.sectors["navigation"]["nodes"][elementId].clusterSize = 1;
    }
  },

  /**
   * un-highlight (for lack of a better term) all navigation controls elements
   * @private
   */
  _unHighlightAll : function() {
    for (var nodeId in this.sectors['navigation']['nodes']) {
      if (this.sectors['navigation']['nodes'].hasOwnProperty(nodeId)) {
        this._unHighlightUIElement(nodeId);
      }
    }
  },


  _preventDefault : function(event) {
    if (event !== undefined) {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = false;
      }
    }
  },


  /**
   * move the screen up
   * By using the increments, instead of adding a fixed number to the translation, we keep fluent and
   * instant movement. The onKeypress event triggers immediately, then pauses, then triggers frequently
   * To avoid this behaviour, we do the translation in the start loop.
   *
   * @private
   */
  _moveUp : function(event) {
    this._highlightUIElement("UI_up");
    this.yIncrement = this.constants.keyboard.speed.y;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * move the screen down
   * @private
   */
  _moveDown : function(event) {
    this._highlightUIElement("UI_down");
    this.yIncrement = -this.constants.keyboard.speed.y;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * move the screen left
   * @private
   */
  _moveLeft : function(event) {
    this._highlightUIElement("UI_left");
    this.xIncrement = this.constants.keyboard.speed.x;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * move the screen right
   * @private
   */
  _moveRight : function(event) {
    this._highlightUIElement("UI_right");
    this.xIncrement = -this.constants.keyboard.speed.y;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * Zoom in, using the same method as the movement.
   * @private
   */
  _zoomIn : function(event) {
    this._highlightUIElement("UI_plus");
    this.zoomIncrement = this.constants.keyboard.speed.zoom;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * Zoom out
   * @private
   */
  _zoomOut : function() {
    this._highlightUIElement("UI_min");
    this.zoomIncrement = -this.constants.keyboard.speed.zoom;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * Stop zooming and unhighlight the zoom controls
   * @private
   */
  _stopZoom : function() {
    this._unHighlightUIElement("UI_plus");
    this._unHighlightUIElement("UI_min");

    this.zoomIncrement = 0;
  },


  /**
   * Stop moving in the Y direction and unHighlight the up and down
   * @private
   */
  _yStopMoving : function() {
    this._unHighlightUIElement("UI_up");
    this._unHighlightUIElement("UI_down");

    this.yIncrement = 0;
  },


  /**
   * Stop moving in the X direction and unHighlight left and right.
   * @private
   */
  _xStopMoving : function() {
    this._unHighlightUIElement("UI_left");
    this._unHighlightUIElement("UI_right");

    this.xIncrement = 0;
  }


};
