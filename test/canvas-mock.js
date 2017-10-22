/**
 * Set up mock 2D context, for usage in unit tests.
 *
 * Adapted from: https://github.com/Cristy94/canvas-mock
 */
var jsdom = require('jsdom');
var jsdom_global = require('jsdom-global');

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
 * @param {object} the current global window object. This can possibly come from module 'jsdom',
 *                 when running under node.js.
 * @private
 */
function overrideCreateElement(window) {
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


/**
 * Initialize the mock, jsdom and jsdom_global for unit test usage.
 *
 * In particular, this takes care of a 'helpful' message about support of `getContext()`, which in
 * practice is a complete eyesore. It's not a problem in our case, because right here we're using
 * our own canvas mock to deal with it.
 * The unit test run fine with or without this message, it just gets in the way.
 *
 * @param {string} [html='']  html definitions which should be added to the jsdom definition
 * @returns {function}  function to call in after(), to clean up for `jsdom_global`
 */
function mockify(html = '') {
  // Start of message that we want to override.
  let msg = 'Error: Not implemented: HTMLCanvasElement.prototype.getContext'
    + ' (without installing the canvas npm package)';

  // jsdom uses a virtual console to output its messages. The default virtual console is
  // overridden here so that we can (selectively) suppress output.
  const virtualConsole = new jsdom.VirtualConsole();

  // This defines a simple 'mock' console output.
  // Only 'error' is overridden which for current purposes is fine. The other calls we'll deal
  // with when they crash, in the event that they get used.
  let myConsole = {
    error: (msg) => {
      if (msg.indexOf(msg) === 0) {
        //console.error('all is well');
      } else {
        // All other messages we pass through
        console.error(msg);
      }
    }
  };

  // Couldn't get the [event handlers](https://github.com/tmpvar/jsdom/#virtual-consoles)
  // for `jsdom` to work, so using the global catch instead.
	virtualConsole.sendTo(myConsole);

  let cleanupFunction = jsdom_global(
    html,
    { skipWindowCheck: true, virtualConsole: virtualConsole}
  );

  overrideCreateElement(window);   // The actual initialization of canvas-mock

  return cleanupFunction;
}


module.exports = mockify;
