/**
 * Created by Alex on 26-Feb-15.
 */

var util = require('../../util');

class View {
  constructor(body, options) {
    this.body = body;
    this.setOptions(options);

    this.animationSpeed = 1/this.renderRefreshRate;
    this.animationEasingFunction = "easeInOutQuint";
    this.easingTime = 0;
    this.sourceScale = 0;
    this.targetScale = 0;
    this.sourceTranslation = 0;
    this.targetTranslation = 0;
    this.lockedOnNodeId = null;
    this.lockedOnNodeOffset = null;
    this.touchTime = 0;

    this.translation = {x: 0, y: 0};
    this.scale = 1.0;

    this.viewFunction = undefined;

    this.body.emitter.on("zoomExtent",          this.zoomExtent.bind(this));
    this.body.emitter.on("_setScale",           (scale) => this.scale = scale);
    this.body.emitter.on("_setTranslation",     (translation) => {this.translation.x = translation.x; this.translation.y = translation.y;});
    this.body.emitter.on("animationFinished",   () => {this.body.emitter.emit("_stopRendering");});
    this.body.emitter.on("unlockNode",          this.releaseNode.bind(this));
  }


  setOptions(options = {}) {
    this.options = options;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  // zoomExtent
  /**
   * Find the center position of the network
   * @private
   */
  _getRange(specificNodes = []) {
    var minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, node;
    if (specificNodes.length > 0) {
      for (var i = 0; i < specificNodes.length; i++) {
        node = this.body.nodes[specificNodes[i]];
        if (minX > (node.boundingBox.left)) {
          minX = node.boundingBox.left;
        }
        if (maxX < (node.boundingBox.right)) {
          maxX = node.boundingBox.right;
        }
        if (minY > (node.boundingBox.bottom)) {
          minY = node.boundingBox.top;
        } // top is negative, bottom is positive
        if (maxY < (node.boundingBox.top)) {
          maxY = node.boundingBox.bottom;
        } // top is negative, bottom is positive
      }
    }
    else {
      for (var nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          node = this.body.nodes[nodeId];
          if (minX > (node.boundingBox.left)) {
            minX = node.boundingBox.left;
          }
          if (maxX < (node.boundingBox.right)) {
            maxX = node.boundingBox.right;
          }
          if (minY > (node.boundingBox.bottom)) {
            minY = node.boundingBox.top;
          } // top is negative, bottom is positive
          if (maxY < (node.boundingBox.top)) {
            maxY = node.boundingBox.bottom;
          } // top is negative, bottom is positive
        }
      }
    }

    if (minX == 1e9 && maxX == -1e9 && minY == 1e9 && maxY == -1e9) {
      minY = 0, maxY = 0, minX = 0, maxX = 0;
    }
    return {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
  }


  /**
   * @param {object} range = {minX: minX, maxX: maxX, minY: minY, maxY: maxY};
   * @returns {{x: number, y: number}}
   * @private
   */
  _findCenter(range) {
    return {x: (0.5 * (range.maxX + range.minX)),
      y: (0.5 * (range.maxY + range.minY))};
  }


  /**
   * This function zooms out to fit all data on screen based on amount of nodes
   * @param {Object}
   * @param {Boolean} [initialZoom]  | zoom based on fitted formula or range, true = fitted, default = false;
   * @param {Boolean} [disableStart] | If true, start is not called.
   */
  zoomExtent(options = {nodes:[]}, initialZoom = false) {
    var range;
    var zoomLevel;

    if (initialZoom == true) {
      // check if more than half of the nodes have a predefined position. If so, we use the range, not the approximation.
      var positionDefined = 0;
      for (var nodeId in this.body.nodes) {
        if (this.body.nodes.hasOwnProperty(nodeId)) {
          var node = this.body.nodes[nodeId];
          if (node.predefinedPosition == true) {
            positionDefined += 1;
          }
        }
      }
      if (positionDefined > 0.5 * this.body.nodeIndices.length) {
        this.zoomExtent(options,false);
        return;
      }

      range = this._getRange(options.nodes);

      var numberOfNodes = this.body.nodeIndices.length;
      if (this.options.smoothCurves == true) {
        zoomLevel = 12.662 / (numberOfNodes + 7.4147) + 0.0964822; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
      }
      else {
        zoomLevel = 30.5062972 / (numberOfNodes + 19.93597763) + 0.08413486; // this is obtained from fitting a dataset from 5 points with scale levels that looked good.
      }

      // correct for larger canvasses.
      var factor = Math.min(this.canvas.frame.canvas.clientWidth / 600, this.canvas.frame.canvas.clientHeight / 600);
      zoomLevel *= factor;
    }
    else {
      this.body.emitter.emit("_redrawHidden");
      range = this._getRange(options.nodes);
      var xDistance = Math.abs(range.maxX - range.minX) * 1.1;
      var yDistance = Math.abs(range.maxY - range.minY) * 1.1;

      var xZoomLevel = this.canvas.frame.canvas.clientWidth  / xDistance;
      var yZoomLevel = this.canvas.frame.canvas.clientHeight / yDistance;
      zoomLevel = (xZoomLevel <= yZoomLevel) ? xZoomLevel : yZoomLevel;
    }

    if (zoomLevel > 1.0) {
      zoomLevel = 1.0;
    }


    var center = this._findCenter(range);
    var animationOptions = {position: center, scale: zoomLevel, animation: options};
    this.moveTo(animationOptions);
  }
  
  // animation

  /**
   * Center a node in view.
   *
   * @param {Number} nodeId
   * @param {Number} [options]
   */
  focusOnNode(nodeId, options = {}) {
    if (this.body.nodes[nodeId] !== undefined) {
      var nodePosition = {x: this.body.nodes[nodeId].x, y: this.body.nodes[nodeId].y};
      options.position = nodePosition;
      options.lockedOnNode = nodeId;

      this.moveTo(options)
    }
    else {
      console.log("Node: " + nodeId + " cannot be found.");
    }
  }

  /**
   *
   * @param {Object} options  |  options.offset   = {x:Number, y:Number}   // offset from the center in DOM pixels
   *                          |  options.scale    = Number                 // scale to move to
   *                          |  options.position = {x:Number, y:Number}   // position to move to
   *                          |  options.animation = {duration:Number, easingFunction:String} || Boolean   // position to move to
   */
  moveTo(options) {
    if (options === undefined) {
      options = {};
      return;
    }
    if (options.offset    === undefined)           {options.offset    = {x: 0, y: 0};    }
    if (options.offset.x  === undefined)           {options.offset.x  = 0;               }
    if (options.offset.y  === undefined)           {options.offset.y  = 0;               }
    if (options.scale     === undefined)           {options.scale     = this.scale;      }
    if (options.position  === undefined)           {options.position  = this.translation;}
    if (options.animation === undefined)           {options.animation = {duration:0};    }
    if (options.animation === false    )           {options.animation = {duration:0};    }
    if (options.animation === true     )           {options.animation = {};              }
    if (options.animation.duration === undefined)  {options.animation.duration = 1000;   }  // default duration
    if (options.animation.easingFunction === undefined)  {options.animation.easingFunction = "easeInOutQuad";  } // default easing function

    this.animateView(options);
  }

  /**
   *
   * @param {Object} options  |  options.offset   = {x:Number, y:Number}   // offset from the center in DOM pixels
   *                          |  options.time     = Number                 // animation time in milliseconds
   *                          |  options.scale    = Number                 // scale to animate to
   *                          |  options.position = {x:Number, y:Number}   // position to animate to
   *                          |  options.easingFunction = String           // linear, easeInQuad, easeOutQuad, easeInOutQuad,
   *                                                                       // easeInCubic, easeOutCubic, easeInOutCubic,
   *                                                                       // easeInQuart, easeOutQuart, easeInOutQuart,
   *                                                                       // easeInQuint, easeOutQuint, easeInOutQuint
   */
  animateView(options) {
    if (options === undefined) {
      return;
    }
    this.animationEasingFunction = options.animation.easingFunction;
    // release if something focussed on the node
    this.releaseNode();
    if (options.locked == true) {
      this.lockedOnNodeId = options.lockedOnNode;
      this.lockedOnNodeOffset = options.offset;
    }

    // forcefully complete the old animation if it was still running
    if (this.easingTime != 0) {
      this._transitionRedraw(true); // by setting easingtime to 1, we finish the animation.
    }

    this.sourceScale = this.scale;
    this.sourceTranslation = this.translation;
    this.targetScale = options.scale;

    // set the scale so the viewCenter is based on the correct zoom level. This is overridden in the transitionRedraw
    // but at least then we'll have the target transition
    this.body.emitter.emit("_setScale",this.targetScale);
    var viewCenter = this.canvas.DOMtoCanvas({x: 0.5 * this.canvas.frame.canvas.clientWidth, y: 0.5 * this.canvas.frame.canvas.clientHeight});
    var distanceFromCenter = { // offset from view, distance view has to change by these x and y to center the node
      x: viewCenter.x - options.position.x,
      y: viewCenter.y - options.position.y
    };
    this.targetTranslation = {
      x: this.sourceTranslation.x + distanceFromCenter.x * this.targetScale + options.offset.x,
      y: this.sourceTranslation.y + distanceFromCenter.y * this.targetScale + options.offset.y
    };

    // if the time is set to 0, don't do an animation
    if (options.animation.duration == 0) {
      if (this.lockedOnNodeId != null) {
        this.viewFunction = this._lockedRedraw.bind(this);
        this.body.emitter.on("_beforeRender", this.viewFunction);
      }
      else {
        this.body.emitter.emit("_setScale", this.targetScale);;
        this.body.emitter.emit("_setTranslation", this.targetTranslation);
        this.body.emitter.emit("_requestRedraw");
      }
    }
    else {
      this.animationSpeed = 1 / (60 * options.animation.duration * 0.001) || 1 / 60; // 60 for 60 seconds, 0.001 for milli's
      this.animationEasingFunction = options.animation.easingFunction;


      this.viewFunction = this._transitionRedraw.bind(this);
      this.body.emitter.on("_beforeRender", this.viewFunction);
      this.body.emitter.emit("_startRendering");
    }
  }

  /**
   * used to animate smoothly by hijacking the redraw function.
   * @private
   */
  _lockedRedraw() {
    var nodePosition = {x: this.body.nodes[this.lockedOnNodeId].x, y: this.body.nodes[this.lockedOnNodeId].y};
    var viewCenter = this.DOMtoCanvas({x: 0.5 * this.frame.canvas.clientWidth, y: 0.5 * this.frame.canvas.clientHeight});
    var distanceFromCenter = { // offset from view, distance view has to change by these x and y to center the node
      x: viewCenter.x - nodePosition.x,
      y: viewCenter.y - nodePosition.y
    };
    var sourceTranslation = this.translation;
    var targetTranslation = {
      x: sourceTranslation.x + distanceFromCenter.x * this.scale + this.lockedOnNodeOffset.x,
      y: sourceTranslation.y + distanceFromCenter.y * this.scale + this.lockedOnNodeOffset.y
    };

    this.body.emitter.emit("_setTranslation", targetTranslation);
  }

  releaseNode() {
    if (this.lockedOnNodeId !== undefined) {
      this.body.emitter.off("_beforeRender", this.viewFunction);
      this.lockedOnNodeId = undefined;
      this.lockedOnNodeOffset = undefined;
    }
  }

  /**
   *
   * @param easingTime
   * @private
   */
  _transitionRedraw(finished = false) {
    this.easingTime += this.animationSpeed;
    this.easingTime = finished === true ? 1.0 : this.easingTime;

    var progress = util.easingFunctions[this.animationEasingFunction](this.easingTime);

    this.body.emitter.emit("_setScale", this.sourceScale + (this.targetScale - this.sourceScale) * progress);
    this.body.emitter.emit("_setTranslation", {
      x: this.sourceTranslation.x + (this.targetTranslation.x - this.sourceTranslation.x) * progress,
      y: this.sourceTranslation.y + (this.targetTranslation.y - this.sourceTranslation.y) * progress
    });

    // cleanup
    if (this.easingTime >= 1.0) {
      this.body.emitter.off("_beforeRender", this.viewFunction);
      this.easingTime = 0;
      if (this.lockedOnNodeId != null) {
        this.viewFunction = this._lockedRedraw.bind(this);
        this.body.emitter.on("_beforeRender", this.viewFunction);
      }
      this.body.emitter.emit("animationFinished");
    }
  };


}

export {View};