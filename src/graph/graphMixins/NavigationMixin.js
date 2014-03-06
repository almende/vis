/**
 * Created by Alex on 1/22/14.
 */

var NavigationMixin = {

  _cleanNavigation : function() {
    // clean up previosu navigation items
    var wrapper = document.getElementById('graph-navigation_wrapper');
    if (wrapper != null) {
      this.containerElement.removeChild(wrapper);
    }
    document.onmouseup = null;
  },

  /**
   * Creation of the navigation controls nodes. They are drawn over the rest of the nodes and are not affected by scale and translation
   * they have a triggerFunction which is called on click. If the position of the navigation controls is dependent
   * on this.frame.canvas.clientWidth or this.frame.canvas.clientHeight, we flag horizontalAlignLeft and verticalAlignTop false.
   * This means that the location will be corrected by the _relocateNavigation function on a size change of the canvas.
   *
   * @private
   */
  _loadNavigationElements : function() {
    this._cleanNavigation();

    this.navigationDivs = {};
    var navigationDivs = ['up','down','left','right','zoomIn','zoomOut','zoomExtends'];
    var navigationDivActions = ['_moveUp','_moveDown','_moveLeft','_moveRight','_zoomIn','_zoomOut','zoomExtent'];

    this.navigationDivs['wrapper'] = document.createElement('div');
    this.navigationDivs['wrapper'].id = "graph-navigation_wrapper";
    this.containerElement.insertBefore(this.navigationDivs['wrapper'],this.frame);

    for (var i = 0; i < navigationDivs.length; i++) {
      this.navigationDivs[navigationDivs[i]] = document.createElement('div');
      this.navigationDivs[navigationDivs[i]].id = "graph-navigation_" + navigationDivs[i];
      this.navigationDivs[navigationDivs[i]].className = "graph-navigation " + navigationDivs[i];
      this.navigationDivs['wrapper'].appendChild(this.navigationDivs[navigationDivs[i]]);
      this.navigationDivs[navigationDivs[i]].onmousedown = this[navigationDivActions[i]].bind(this);
    }

    document.onmouseup = this._stopMovement.bind(this);
  },

  /**
   * this stops all movement induced by the navigation buttons
   *
   * @private
   */
  _stopMovement : function() {
    this._xStopMoving();
    this._yStopMoving();
    this._stopZoom();
  },


  /**
   * stops the actions performed by page up and down etc.
   *
   * @param event
   * @private
   */
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
    console.log("here")
    this.yIncrement = this.constants.keyboard.speed.y;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * move the screen down
   * @private
   */
  _moveDown : function(event) {
    this.yIncrement = -this.constants.keyboard.speed.y;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * move the screen left
   * @private
   */
  _moveLeft : function(event) {
    this.xIncrement = this.constants.keyboard.speed.x;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * move the screen right
   * @private
   */
  _moveRight : function(event) {
    this.xIncrement = -this.constants.keyboard.speed.y;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * Zoom in, using the same method as the movement.
   * @private
   */
  _zoomIn : function(event) {
    this.zoomIncrement = this.constants.keyboard.speed.zoom;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * Zoom out
   * @private
   */
  _zoomOut : function() {
    this.zoomIncrement = -this.constants.keyboard.speed.zoom;
    this.start(); // if there is no node movement, the calculation wont be done
    this._preventDefault(event);
  },


  /**
   * Stop zooming and unhighlight the zoom controls
   * @private
   */
  _stopZoom : function() {
    this.zoomIncrement = 0;
  },


  /**
   * Stop moving in the Y direction and unHighlight the up and down
   * @private
   */
  _yStopMoving : function() {
    this.yIncrement = 0;
  },


  /**
   * Stop moving in the X direction and unHighlight left and right.
   * @private
   */
  _xStopMoving : function() {
    this.xIncrement = 0;
  }


};
