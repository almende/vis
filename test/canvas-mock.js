/**
 * Set up mock 2D context, for usage in unit tests.
 *
 * Adapted from: https://github.com/Cristy94/canvas-mock
 */

var canvasMock;  // Use one canvas instance for all calls to createElement('canvas');


function replaceCanvasContext (el) {
  el.getContext = function() {
    return {
      fillRect: function() {},
      clearRect: function(){},
      getImageData: function(x, y, w, h) {
        return  {
          data: new Array(w*h*4)
        };
      },
      putImageData: function() {},
      createImageData: function(){ return []},
      setTransform: function(){},
      drawImage: function(){},
      save: function(){},
      fillText: function(){},
      restore: function(){},
      beginPath: function(){},
      moveTo: function(){},
      lineTo: function(){},
      closePath: function(){},
      stroke: function(){},
      translate: function(){},
      scale: function(){},
      rotate: function(){},
      arc: function(){},
      fill: function(){},

      //
      // Following added for vis.js unit tests
      //

      measureText: function(text) {
        return {
          width: 12*text.length,
          height: 14
        };
      },
    };
  }
};


/**
 * Overrides document.createElement(), in order to supply a custom canvas element.
 *
 * In the canvas element, getContext() is overridden in order to supply a simple 
 * mock object for the 2D context. For all other elements, the call functions unchanged.
 *
 * The override is only done if there is no 2D context already present.
 * This allows for normal running in a browser, and for node.js the usage of 'canvas'.
 *
 * @param {object} the current global window object. This can possible come from module 'jsdom',
 *                 when running under node.js.
 */
function mockify(window) {
  var d = window.document;
  var f = window.document.createElement;

  // Check if 2D context already present. That happens either when running in a browser,
  // or this is node.js with 'canvas' installed. 
  var ctx = d.createElement('canvas').getContext('2d');
  if (ctx !== null && ctx !== undefined) {
    //console.log('2D context is present, no need to override');
    return;
  }

  window.document.createElement = function(param) {
    if (param === 'canvas') {
      if (canvasMock === undefined) {
        canvasMock = f.call(d, 'canvas');
        replaceCanvasContext(canvasMock);
      }
      return canvasMock;
    } else {
      return f.call(d, param);
    }
  };
}

module.exports = mockify;
