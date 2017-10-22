var assert = require('assert');
var util = require('../lib/util');


describe('util', function () {

/**
 * Tests for copy and extend methods.
 *
 * Goal: to cover all possible paths within the tested method(s)
 *
 *
 * **NOTES**
 *
 * - All these methods have the inherent flaw that it's possible to define properties
 *   on an object with value 'undefined'. e.g. in `node`:
 *
 *    > a = { b:undefined }
 *    > a.hasOwnProperty('b')
 *    true
 *
 *   The logic for handling this in the code is minimal and accidental. For the time being,
 *   this flaw is ignored.
 */
describe('extend routines', function () {

  /**
   * Check if values have been copied over from b to a as intended
   */
  function checkExtended(a, b, checkCopyTarget = false) {
    var result = {
      color: 'green',
      sub: {
        enabled: false,
        sub2: {
          font: 'awesome'
        }
      }
    };

    assert(a.color !== undefined && a.color === result.color);
    assert(a.notInSource === true);
    if (checkCopyTarget) {
      assert(a.notInTarget === true);
    } else {
      assert(a.notInTarget === undefined);
    }

    var sub = a.sub;
    assert(sub !== undefined);
    assert(sub.enabled !== undefined && sub.enabled === result.sub.enabled);
    assert(sub.notInSource === true);
    if (checkCopyTarget) {
      assert(sub.notInTarget === true);
    } else {
      assert(sub.notInTarget === undefined);
    }

    sub = a.sub.sub2;
    assert(sub !== undefined);
    assert(sub !== undefined && sub.font !== undefined && sub.font === result.sub.sub2.font);
    assert(sub.notInSource === true);
    assert(a.subNotInSource !== undefined);
    if (checkCopyTarget) {
      assert(a.subNotInTarget.enabled === true);
      assert(sub.notInTarget === true);
    } else {
      assert(a.subNotInTarget === undefined);
      assert(sub.notInTarget === undefined);
    }
  }


  /**
   * Spot check on values of a unchanged as intended
   */
  function testAUnchanged(a) {
    var sub = a.sub;
    assert(sub !== undefined);
    assert(sub.enabled !== undefined && sub.enabled === true);
    assert(sub.notInSource === true);
    assert(sub.notInTarget === undefined);
    assert(sub.deleteThis === true);

    sub = a.sub.sub2;
    assert(sub !== undefined);
    assert(sub !== undefined && sub.font !== undefined && sub.font === 'arial');
    assert(sub.notInSource === true);
    assert(sub.notInTarget === undefined);

    assert(a.subNotInSource !== undefined);
    assert(a.subNotInTarget === undefined);
  }


  function initA() {
    return {
      color: 'red',
      notInSource: true,
      sub: {
        enabled: true,
        notInSource: true,
        sub2: {
          font: 'arial',
          notInSource: true,
        },
        deleteThis: true,
      },
      subNotInSource: {
        enabled: true,
      },
      deleteThis: true,
      subDeleteThis: {
        enabled: true,
      },
    };
  }


  beforeEach(function() {
    this.a = initA();

    this.b = {
      color: 'green',
      notInTarget: true,
      sub: {
        enabled: false,
        notInTarget: true,
        sub2: {
          font: 'awesome',
          notInTarget: true,
        },
        deleteThis: null,
      },
      subNotInTarget: {
        enabled: true,
      },
      deleteThis: null,
      subDeleteThis: null
    };
  });


  it('performs fillIfDefined() as advertized', function () {
    var a = this.a;
    var b = this.b;

    util.fillIfDefined(a, b);
    checkExtended(a, b);

    // NOTE: if allowDeletion === false, null values are copied over!
    //       This is due to existing logic; it might not be the intention and hence a bug
    assert(a.sub.deleteThis === null);
    assert(a.deleteThis === null);
    assert(a.subDeleteThis === null);
  });


  it('performs fillIfDefined() as advertized with deletion', function () {
    var a = this.a;
    var b = this.b;

    util.fillIfDefined(a, b, true);  //  thrid param: allowDeletion
    checkExtended(a, b);

    // Following should be removed now
    assert(a.sub.deleteThis === undefined);
    assert(a.deleteThis === undefined);
    assert(a.subDeleteThis === undefined);
  });


  it('performs selectiveDeepExtend() as advertized', function () {
    var a = this.a;
    var b = this.b;

    // pedantic: copy nothing
    util.selectiveDeepExtend([], a, b);
    assert(a.color !== undefined && a.color === 'red');
    assert(a.notInSource === true);
    assert(a.notInTarget === undefined);

    // pedantic: copy nonexistent property (nothing happens)
    assert(b.iDontExist === undefined);
    util.selectiveDeepExtend(['iDontExist'], a, b, true);
    assert(a.iDontExist === undefined);

    // At this point nothing should have changed yet.
    testAUnchanged(a);

    // Copy one property
    util.selectiveDeepExtend(['color'], a, b);
    assert(a.color !== undefined && a.color === 'green');

    // Copy property Object
    var sub = a.sub;
    assert(sub.deleteThis === true); // pre
    util.selectiveDeepExtend(['sub'], a, b);
    assert(sub !== undefined);
    assert(sub.enabled !== undefined && sub.enabled === false);
    assert(sub.notInSource === true);
    assert(sub.notInTarget === true);
    assert(sub.deleteThis === null);


    // Copy new Objects
    assert(a.notInTarget === undefined);     // pre
    assert(a.subNotInTarget === undefined);  // pre
    util.selectiveDeepExtend(['notInTarget', 'subNotInTarget'], a, b);
    assert(a.notInTarget === true);
    assert(a.subNotInTarget.enabled === true);

    // Copy null objects
    assert(a.deleteThis !== null);    // pre
    assert(a.subDeleteThis !== null); // pre
    util.selectiveDeepExtend(['deleteThis', 'subDeleteThis'], a, b);

    // NOTE: if allowDeletion === false, null values are copied over!
    //       This is due to existing logic; it might not be the intention and hence a bug
    assert(a.deleteThis === null);
    assert(a.subDeleteThis === null);
  });


  it('performs selectiveDeepExtend() as advertized with deletion', function () {
    var a = this.a;
    var b = this.b;

    // Only test expected differences here with test allowDeletion === false

    // Copy object property with properties to be deleted
    var sub = a.sub;
    assert(sub.deleteThis === true);      // pre
    util.selectiveDeepExtend(['sub'], a, b, true);
    assert(sub.deleteThis === undefined); // should be deleted

    // Spot check on rest of properties in `a.sub` - there should have been copied
    sub = a.sub;
    assert(sub !== undefined);
    assert(sub.enabled !== undefined && sub.enabled === false);
    assert(sub.notInSource === true);
    assert(sub.notInTarget === true);

    // Copy null objects
    assert(a.deleteThis === true);            // pre
    assert(a.subDeleteThis !== undefined);    // pre
    assert(a.subDeleteThis.enabled === true); // pre
    util.selectiveDeepExtend(['deleteThis', 'subDeleteThis'], a, b, true);
    assert(a.deleteThis === undefined);       // should be deleted
    assert(a.subDeleteThis === undefined);    // should be deleted
  });


  it('performs selectiveNotDeepExtend() as advertized', function () {
    var a = this.a;
    var b = this.b;

    // Exclude all properties, nothing copied
    util.selectiveNotDeepExtend(Object.keys(b), a, b);
    testAUnchanged(a);

    // Exclude nothing, everything copied
    util.selectiveNotDeepExtend([], a, b);
    checkExtended(a, b, true);

    // Exclude some
    a = initA();
    assert(a.notInTarget === undefined);     // pre
    assert(a.subNotInTarget === undefined);  // pre
    util.selectiveNotDeepExtend(['notInTarget', 'subNotInTarget'], a, b);
    assert(a.notInTarget === undefined);     // not copied
    assert(a.subNotInTarget === undefined);  // not copied
    assert(a.sub.notInTarget === true);      // copied!
  });


  it('performs selectiveNotDeepExtend() as advertized with deletion', function () {
    var a = this.a;
    var b = this.b;

    // Exclude all properties, nothing copied
    util.selectiveNotDeepExtend(Object.keys(b), a, b, true);
    testAUnchanged(a);

    // Exclude nothing, everything copied and some deleted
    util.selectiveNotDeepExtend([], a, b, true);
    checkExtended(a, b, true);

    // Exclude some
    a = initA();
    assert(a.notInTarget === undefined);      // pre
    assert(a.subNotInTarget === undefined);   // pre
    assert(a.deleteThis === true);            // pre
    assert(a.subDeleteThis !== undefined);    // pre
    assert(a.sub.deleteThis === true);        // pre
    assert(a.subDeleteThis.enabled === true); // pre
    util.selectiveNotDeepExtend(['notInTarget', 'subNotInTarget'], a, b, true);
    assert(a.deleteThis === undefined);       // should be deleted
    assert(a.sub.deleteThis !== undefined);   // not deleted! Original logic, could be a bug
    assert(a.subDeleteThis === undefined);    // should be deleted
    // Spot check: following should be same as allowDeletion === false
    assert(a.notInTarget === undefined);      // not copied
    assert(a.subNotInTarget === undefined);   // not copied
    assert(a.sub.notInTarget === true);       // copied!
  });


  /**
   * NOTE: parameter `protoExtend` not tested here!
   */
  it('performs deepExtend() as advertized', function () {
    var a = this.a;
    var b = this.b;

    util.deepExtend(a, b);
    checkExtended(a, b, true);
  });


  /**
   * NOTE: parameter `protoExtend` not tested here!
   */
  it('performs deepExtend() as advertized with delete', function () {
    var a = this.a;
    var b = this.b;

    // Copy null objects
    assert(a.deleteThis === true);            // pre
    assert(a.subDeleteThis !== undefined);    // pre
    assert(a.subDeleteThis.enabled === true); // pre
    util.deepExtend(a, b, false, true);
    checkExtended(a, b, true);                // Normal copy should be good
    assert(a.deleteThis === undefined);       // should be deleted
    assert(a.subDeleteThis === undefined);    // should be deleted
    assert(a.sub.deleteThis !== undefined);   // not deleted!!! Original logic, could be a bug
  });
});  // extend routines


//
// The important thing with mergeOptions() is that 'enabled' is always set in target option.
//
describe('mergeOptions', function () {

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

});  // mergeOptions
});  // util
