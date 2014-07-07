/**
 * vis.js module imports
 */

// Try to load dependencies from the global window object.
// If not available there, load via require.

var moment = (typeof window !== 'undefined') && window['moment'] || require('moment');
var Emitter = require('emitter-component');

var Hammer;
if (typeof window !== 'undefined') {
  // load hammer.js only when running in a browser (where window is available)
  Hammer = window['Hammer'] || require('hammerjs');
}
else {
  Hammer = function () {
    throw Error('hammer.js is only available in a browser, not in node.js.');
  }
}

var mousetrap;
if (typeof window !== 'undefined') {
  // load mousetrap.js only when running in a browser (where window is available)
  mousetrap = window['mousetrap'] || require('mousetrap');
}
else {
  mousetrap = function () {
    throw Error('mouseTrap is only available in a browser, not in node.js.');
  }
}
