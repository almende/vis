/**
 * vis.js module imports
 */

// Try to load dependencies from the global window object.
// If not available there, load via require.
var moment = (typeof window !== 'undefined') && window['moment'] || require('moment');
var Hammer = (typeof window !== 'undefined') && window['Hammer'] || require('hammerjs');
