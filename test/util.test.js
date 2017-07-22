var assert = require('assert');
var util = require('../lib/util');


//
// The important thing with mergeOptions() is that 'enabled' is always set in target option.
//
describe('util.mergeOptions', function () {

  it('handles good input without global options', function () {
    var options = {
      someValue: "silly value",
      aBoolOption: false,
      anObject: {
        answer:42
      },
      anotherObject: {
        enabled: false,
      },
      merge: null
    };

    // Case with empty target
    var mergeTarget  = {};

    util.mergeOptions(mergeTarget, options, 'someValue');
    assert(mergeTarget.someValue === undefined, 'Non-object option should not be copied');
    assert(mergeTarget.anObject === undefined);

    util.mergeOptions(mergeTarget, options, 'aBoolOption');
    assert(mergeTarget.aBoolOption !== undefined, 'option aBoolOption should now be an object');
    assert(mergeTarget.aBoolOption.enabled === false, 'enabled value option aBoolOption should have been copied into object');

    util.mergeOptions(mergeTarget, options, 'anObject');
    assert(mergeTarget.anObject !== undefined, 'Option object is not copied');
    assert(mergeTarget.anObject.answer === 42);
    assert(mergeTarget.anObject.enabled === true);

    util.mergeOptions(mergeTarget, options, 'anotherObject');
    assert(mergeTarget.anotherObject.enabled === false, 'enabled value from options must have priority');

    util.mergeOptions(mergeTarget, options, 'merge');
    assert(mergeTarget.merge === undefined, 'Explicit null option should not be copied, there is no global option for it');

    // Case with non-empty target
    mergeTarget  = {
      someValue: false,
      aBoolOption: true,
      anObject: {
        answer: 49
      },
      anotherObject: {
        enabled: true,
      },
      merge: 'hello'
    };

    util.mergeOptions(mergeTarget, options, 'someValue');
    assert(mergeTarget.someValue === false, 'Non-object option should not be copied');
    assert(mergeTarget.anObject.answer === 49, 'Sibling option should not be changed');

    util.mergeOptions(mergeTarget, options, 'aBoolOption');
    assert(mergeTarget.aBoolOption !== true, 'option enabled should have been overwritten');
    assert(mergeTarget.aBoolOption.enabled === false, 'enabled value option aBoolOption should have been copied into object');

    util.mergeOptions(mergeTarget, options, 'anObject');
    assert(mergeTarget.anObject.answer === 42);
    assert(mergeTarget.anObject.enabled === true);

    util.mergeOptions(mergeTarget, options, 'anotherObject');
    assert(mergeTarget.anotherObject !== undefined, 'Option object is not copied');
    assert(mergeTarget.anotherObject.enabled === false, 'enabled value from options must have priority');

    util.mergeOptions(mergeTarget, options, 'merge');
    assert(mergeTarget.merge === 'hello', 'Explicit null-option should not be copied, already present in target');
  });


  it('gracefully handles bad input', function () {
    var mergeTarget  = {};
    var options = {
      merge: null
    };

    var errMsg  = 'Non-object parameters should not be accepted';
    assert.throws(() => util.mergeOptions(null, options, 'anything'), Error, errMsg);
    assert.throws(() => util.mergeOptions(undefined, options, 'anything'), Error, errMsg);
    assert.throws(() => util.mergeOptions(42, options, 'anything'), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, null, 'anything'), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, undefined, 'anything'), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, 42, 'anything'), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, options, null), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, options, undefined), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, options, 'anything', null), Error, errMsg);
    assert.throws(() => util.mergeOptions(mergeTarget, options, 'anything', 'not an object'), Error, errMsg);


    util.mergeOptions(mergeTarget, options, 'iDontExist');
    assert(mergeTarget.iDontExist === undefined);
  });


  it('handles good input with global options', function () {
    var mergeTarget  = {
    };
    var options = {
      merge: null,
      missingEnabled: {
        answer: 42
      },
      alsoMissingEnabled: {  // has no enabled in globals
        answer: 42
      }
    };

    var globalOptions = {
      merge: {
        enabled: false
      },
      missingEnabled: {
        enabled: false
      }
    };

    util.mergeOptions(mergeTarget, options, 'merge', globalOptions);
    assert(mergeTarget.merge.enabled === false, "null-option should create an empty target object");

    util.mergeOptions(mergeTarget, options, 'missingEnabled', globalOptions);
    assert(mergeTarget.missingEnabled.enabled === false);

    util.mergeOptions(mergeTarget, options, 'alsoMissingEnabled', globalOptions);
    assert(mergeTarget.alsoMissingEnabled.enabled === true);
  });
});
