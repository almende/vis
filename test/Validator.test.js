/**
 * The goal here is to have a minimum-viable test case here, in order to
 * check changes in Validator.
 *
 * Changes in Validator should ideally be checked to see if they trigger here.
 *
 * test-console reference: https://github.com/jamesshore/test-console
 */
var assert = require('assert');
var stdout = require('test-console').stdout;
var Validator = require("../lib/shared/Validator").default;

// Copied from lib/network/options.js
let string = 'string';
let bool  'boolean';
let number = 'number';
let array = 'array';
let object = 'object'; // should only be in a __type__ property
let dom = 'dom';
let any = 'any';


let allOptions = {
  // simple options
  enabled: { boolean: bool },
  inherit: { string: ['from', 'to', 'both'] },
  size: { number },
  filter: { 'function': 'function' },
  chosen: {
    label: { boolean: bool },
    edge: { 'function': 'function' },
    __type__: { object }
  },


  // TODO: add combined options, e.g.
  //inherit: { string: ['from', 'to', 'both'], boolean: bool },
  //filter: { boolean: bool, string, array, 'function': 'function' },
  __type__: { object }
};


describe('Validator', function() {
  it('handles regular options correctly', function(done) {
    let errorFound;
    let output;

    // Empty options should be accepted as well
    output = stdout.inspectSync(function() {
      errorFound = Validator.validate({}, allOptions);
    });
    assert(!errorFound);
    assert(output.length === 0);

    // test values for all options
    var options = {
      enabled: true,
      inherit: 'from',
      size   : 123,
      filter : function() { return true; },
      chosen : {
        label: false,
        edge: function() { return true; },
      }
    };

    output = stdout.inspectSync(function() {
      errorFound = Validator.validate(options, allOptions);
    });
    assert(!errorFound);
    assert(output.length === 0);

    done();
  });


  it('rejects incorrect options', function(done) {
    var numOptions = 6;
    var options = {
      iDontExist: 'asdf',
      enabled   : 'boolean',
      inherit   : 'abc',
      size      : 'not a number',
      filter    : 42,
      chosen    : 'not an object'
    };

    let errorFound;
    var output = stdout.inspectSync(function() {
      errorFound = Validator.validate(options, allOptions);
    });

    assert(errorFound, 'Validation should have failed');
    assert(output.length === numOptions, 'Expected one error per wrong option');

console.log(output);
    //assert.deepEqual(output, [ 'asdf\n' ]);

    // Errors are in the order as the options are defined in the object
    let expectedErrors = [
      /Unknown option detected: \"iDontExist\"/,
      /Invalid type received for \"enabled\". Expected: boolean. Received \[string\]/,
      /Invalid option detected in \"inherit\". Allowed values are:from, to, both not/,
      /Invalid type received for \"size\". Expected: number. Received \[string\]/,
      /Invalid type received for \"filter\". Expected: function. Received \[number\]/,
      /Invalid type received for "chosen". Expected: object. Received \[string\]/
 
    ];

    // All of the options are wrong, all should generate an error
    assert(output.length === expectedErrors.length, 'expected errors does not match returned errors');

   for (let i = 0; i < expectedErrors.length; ++i) {
     assert(expectedErrors[i].test(output[i]));
   }


    done();
  });
});
