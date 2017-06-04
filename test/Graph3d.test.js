var assert = require('assert');
var vis = require('../dist/vis');
var Graph3d = vis.Graph3d;
var stdout = require('test-console').stdout;
var Validator = require("./../lib/shared/Validator").default;
//var {printStyle} = require('./../lib/shared/Validator');
var {allOptions, configureOptions} = require('./../lib/graph3d/options.js');

var now = new Date();

describe('Graph3d', function () {
  it('should pass validation for the default options', function () {
    assert(Graph3d.DEFAULTS !== undefined);

    let errorFound;
    let output;
    output = stdout.inspectSync(function() {
      errorFound = Validator.validate(Graph3d.DEFAULTS, allOptions);
    });

    // Useful during debugging:
    //if (errorFound === true) {
    //  console.log(JSON.stringify(output, null, 2));
    //}
    assert(!errorFound, 'DEFAULTS options object does not pass validation');
  });

});
