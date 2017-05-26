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
let bool = 'boolean';
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
  chosen2: {
    label: { string },
    __type__: { object }
  },


  // Tests with any. These have been tailored to test all paths in:
  //   -  Validator.check()
  //   -  Validator.checkFields()
  __any__: { string },            // Any option name allowed here, but it must be a string
                                  // NOTE: you can have as many new options as you want! IS THIS INTENTIONAL?
  groups: {
    generic: { any },
    __any__: { any },
    __type__: { object }
  },


  // TODO: add combined options, e.g.
  //inherit: { string: ['from', 'to', 'both'], boolean: bool },
  //filter: { boolean: bool, string, array, 'function': 'function' },
  __type__: { object }
};


describe('Validator', function() {

  function run_validator(options, check_correct) {
    let errorFound;
    let output;

    output = stdout.inspectSync(function() {
      errorFound = Validator.validate(options, allOptions);
    });

    if (check_correct) {
      assert(!errorFound);
      assert(output.length === 0, 'No error expected');
    } else {
      //sometimes useful here: console.log(output);
      assert(errorFound, 'Validation should have failed');
      assert(output.length !== 0, 'must return errors');
    }

    return output;
  }


  it('handles regular options correctly', function(done) {
    // Empty options should be accepted as well
    run_validator({}, true);

    // test values for all options
    var options = {
      enabled: true,
      inherit: 'from',
      size   : 123,
      filter : function() { return true; },
      chosen : {
        label: false,
        edge :function() { return true; },
      },
      chosen2: {
        label: "I am a string"
      },

      myNameDoesntMatter: "My type does",
      groups : {
        generic: "any type is good here",
        dontCareAboutName: [0,1,2,3]        // Type can also be anything
      }
    };

    run_validator(options, true);

    done();
  });


  it('rejects incorrect options', function(done) {
    // All of the options are wrong, all should generate an error
    var options = {
      iDontExist: 42,                       // name is 'any' but type must be string
      enabled   : 'boolean',
      inherit   : 'abc',
      size      : 'not a number',
      filter    : 42,
      chosen    : 'not an object',
      chosen2   : {
        label   : 123,

        // Following test the working of Validator.getSuggestion()
        iDontExist: 'asdf',
        generic   : "I'm not defined here",
        labe      : 42,   // Incomplete name
        labell    : 123,
      },

    };

    var output = run_validator(options, false);
    // Sometimes useful: console.log(output);

    // Errors are in the order as the options are defined in the object
    let expectedErrors = [
      /Invalid type received for "iDontExist"\. Expected: string\. Received \[number\]/,
      /Invalid type received for "enabled"\. Expected: boolean\. Received \[string\]/,
      /Invalid option detected in "inherit"\. Allowed values are:from, to, both not/,
      /Invalid type received for "size"\. Expected: number\. Received \[string\]/,
      /Invalid type received for "filter"\. Expected: function\. Received \[number\]/,
      /Invalid type received for "chosen"\. Expected: object\. Received \[string\]/,
      /Invalid type received for "label". Expected: string. Received \[number\]/,

      // Expected results of Validator.getSuggestion()
      /Unknown option detected: "iDontExist"\. Did you mean one of these:/,
      /Unknown option detected: "generic"[\s\S]*Perhaps it was misplaced\? Matching option found at:/gm,
      /Unknown option detected: "labe"[\s\S]*Perhaps it was incomplete\? Did you mean:/gm,
      /Unknown option detected: "labell"\. Did you mean "label"\?/
    ];


   for (let i = 0; i < expectedErrors.length; ++i) {
     assert(expectedErrors[i].test(output[i]), 'Regular expression at index ' + i + ' failed');
   }
   assert(output.length === expectedErrors.length, 'Number of expected errors does not match returned errors');


    done();
  });
});
