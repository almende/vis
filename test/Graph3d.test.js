var assert = require('assert');
var vis = require('../dist/vis');
var Graph3d = vis.Graph3d;
var Validator = require("./../lib/shared/Validator").default;
var {printStyle} = require('./../lib/shared/Validator');
var {allOptions, configureOptions} = require('./../lib/graph3d/options.js');

var now = new Date();

describe('Graph3d', function () {
  it('should pass validation for the default options', function () {
   assert(Graph3d.DEFAULTS !== undefined);

   let errorFound = Validator.validate(Graph3d.DEFAULTS, allOptions);
   assert(!errorFound);
   if (errorFound === true) {
     console.log('%cErrors have been found in the DEFAULTS options object.', printStyle);
   }
  });

});
