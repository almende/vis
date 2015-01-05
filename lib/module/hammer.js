// Only load hammer.js when in a browser environment
// (loading hammer.js in a node.js environment gives errors)
if (typeof window !== 'undefined') {
  var Hammer = window['Hammer'] || require('hammerjs');
  var propagating = require('propagating-hammerjs');
  module.exports = propagating(Hammer);
}
else {
  module.exports = function () {
    throw Error('hammer.js is only available in a browser, not in node.js.');
  }
}
