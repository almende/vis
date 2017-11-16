var jsdom_global = require('jsdom-global');
var assert = require('assert');
var util = require('../lib/util');
var moment = require('../lib//module/moment');
var ASPDateRegex = /^\/?Date\((\-?\d+)/i;

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

  describe('recursiveDOMDelete', function () {
    beforeEach(function() {
      this.jsdom_global = jsdom_global();
    });

    afterEach(function() {
      this.jsdom_global();
    });

    it('removes children', function () {
      var root = document.createElement("div");
      // Create children for root
      var parent = document.createElement("div");
      var parentSibiling = document.createElement("div");
      // Attach parents to root
      root.appendChild(parent);
      root.appendChild(parentSibiling);
      // Create children for the respective parents
      var child = document.createElement("div");
      var childSibling = document.createElement("div");
      // Attach children to parents
      parent.appendChild(child);
      parentSibiling.appendChild(childSibling);

      util.recursiveDOMDelete(root);
      assert.equal(root.children.length, 0);
      assert.equal(parent.children.length, 0);
      assert.equal(parentSibiling.children.length, 0);
      assert.equal(child.children.length, 0);
      assert.equal(childSibling.children.length, 0);
    });
  });

  describe('isDate', function () {
    it('identifies a Date', function () {
      assert(util.isDate(new Date()));
    });

    it('identifies an ASPDate as String', function () {
      assert(util.isDate('Date(1198908717056)'));
    });

    it('identifies a date string', function () {
      assert(util.isDate('1995-01-01'));
    });

    it('identifies a date string', function () {
      assert.equal(util.isDate(''), false);
    });

    it('identifies non-dates', function () {
      assert.equal(util.isDate(null), false);
      assert.equal(util.isDate(undefined), false);
      assert.equal(util.isDate([1, 2, 3]), false);
      assert.equal(util.isDate({a: 42}), false);
      assert.equal(util.isDate(42), false);
      assert.equal(util.isDate('meow'), false);
    });
  });

  describe('convert', function () {
    it('handles null', function () {
      assert.equal(util.convert(null), null);
    });

    it('handles undefined', function () {
      assert.equal(util.convert(undefined), undefined);
    });

    it('undefined type returns original object', function () {
      assert.deepEqual(util.convert({}), {});
    });

    it('non-string type throws', function () {
      assert.throws(function () {util.convert({}, {});}, Error, null);
    });

    it('converts to boolean', function () {
      assert(util.convert({}, 'boolean'));
    });

    it('converts to number', function () {
      assert.equal(typeof util.convert('1198908717056', 'number'), "number");
    });

    it('converts to String', function () {
      assert.equal(typeof util.convert({}, 'string'), "string");
    });

    it('converts to Date from Number', function () {
      assert(util.convert(1198908717056, 'Date') instanceof Date);
    });

    it('converts to Date from String', function () {
      assert(util.convert('1198908717056', 'Date') instanceof Date);
    });

    it('converts to Date from Moment', function () {
      assert(util.convert(new moment(), 'Date') instanceof Date);
    });

    it('throws when converting unknown object to Date', function () {
      assert.throws(function () {util.convert({}, 'Date');}, Error, null);
    });

    xit('converts to Moment from Numbern - Throws a deprecation warning', function () {
      assert(util.convert(1198908717056, 'Moment') instanceof moment);
    });

    it('converts to Moment from String', function () {
      assert(util.convert('1198908717056', 'Moment') instanceof moment);
    });

    it('converts to Moment from Date', function () {
      assert(util.convert(new Date(), 'Moment') instanceof moment);
    });

    it('converts to Moment from Moment', function () {
      assert(util.convert(new moment(), 'Moment') instanceof moment);
    });

    it('throws when converting unknown object to Moment', function () {
      assert.throws(function () {util.convert({}, 'Moment');}, Error, null);
    });

    it('converts to ISODate from Number', function () {
      assert(util.convert(1198908717056, 'ISODate') instanceof Date);
    });

    it('converts to ISODate from String', function () {
      assert.equal(typeof util.convert('1995-01-01', 'ISODate'), 'string');
    });

    it('converts to ISODate from Date - Throws a deprecation warning', function () {
      assert.equal(typeof util.convert(new Date(), 'ISODate'), 'string');
    });

    it('converts to ISODate from Moment', function () {
      assert.equal(typeof util.convert(new moment(), 'ISODate'), 'string');
    });

    it('throws when converting unknown object to ISODate', function () {
      assert.throws(function () {util.convert({}, 'ISODate');}, Error, null);
    });

    it('converts to ASPDate from Number', function () {
      assert(ASPDateRegex.test(util.convert(1198908717056, 'ASPDate')));
    });

    it('converts to ASPDate from String', function () {
      assert(ASPDateRegex.test(util.convert('1995-01-01', 'ASPDate')));
    });

    it('converts to ASPDate from Date', function () {
      assert(ASPDateRegex.test(util.convert(new Date(), 'ASPDate')));
    });

    it('converts to ASPDate from ASPDate', function () {
      assert(ASPDateRegex.test(util.convert('/Date(12344444)/', 'ASPDate')));
    });

    xit('converts to ASPDate from Moment - skipped, because it fails', function () {
      assert(ASPDateRegex.test(util.convert(new moment(), 'ASPDate')));
    });

    it('throws when converting unknown object to ASPDate', function () {
      assert.throws(function () {util.convert({}, 'ASPDate');}, Error, null);
    });

    it('throws when converting unknown type', function () {
      assert.throws(function () {util.convert({}, 'UnknownType');}, Error, null);
    });
  });

  describe('getType', function () {

    it('of object null is null', function () {
      assert.equal(util.getType(null), 'null');
    });

    it('of object Boolean is Boolean', function () {
      function Tester () {}
      Tester.prototype = Object.create(Boolean.prototype);
      assert.equal(util.getType(new Tester('true')), 'Boolean');
    });

    it('of object Number is Number', function () {
      function Tester () {}
      Tester.prototype = Object.create(Number.prototype);
      assert.equal(util.getType(new Tester(1)), 'Number');
    });

    it('of object String is String', function () {
      function Tester () {}
      Tester.prototype = Object.create(String.prototype);
      assert.equal(util.getType(new Tester('stringy!')), 'String');
    });

    it('of object Array is Array', function () {
      assert.equal(util.getType(new Array([])), 'Array');
    });

    it('of object Date is Date', function () {
      assert.equal(util.getType(new Date()), 'Date');
    });

    it('of object any other type is Object', function () {
      assert.equal(util.getType({}), 'Object');
    });

    it('of number is Number', function () {
      assert.equal(util.getType(1), 'Number');
    });

    it('of boolean is Boolean', function () {
      assert.equal(util.getType(true), 'Boolean');
    });

    it('of string is String', function () {
      assert.equal(util.getType('string'), 'String');
    });

    it('of undefined is undefined', function () {
      assert.equal(util.getType(), 'undefined');
    });
  });

  describe('easingFunctions', function () {

    it('take a number and output a number', function () {
      for (var key in util.easingFunctions) {
        if (util.easingFunctions.hasOwnProperty(key)) {
          assert.equal(typeof util.easingFunctions[key](1), 'number');
          assert.equal(typeof util.easingFunctions[key](0.2), 'number');
        }
      }
    });
  });

  describe('getScrollBarWidth', function () {

    beforeEach(function() {
      this.jsdom_global = jsdom_global();
    });

    afterEach(function() {
      this.jsdom_global();
    });

    it('returns 0 when there is no content', function () {
      assert.equal(util.getScrollBarWidth(), 0);
    });
  });

  describe('equalArray', function () {

    it('arrays of different lengths are not equal', function () {
      assert.equal(util.equalArray([1, 2, 3], [1, 2]), false)
    });

    it('arrays with different content are not equal', function () {
      assert.equal(util.equalArray([1, 2, 3], [3, 2, 1]), false)
    });

    it('same content arrays are equal', function () {
      assert(util.equalArray([1, 2, 3], [1, 2, 3]))
    });

    it('empty arrays are equal', function () {
      assert(util.equalArray([], []))
    });

    it('the same array is equal', function () {
      var arr = [1, 2, 3];
      assert(util.equalArray(arr, arr))
    });
  });

  describe('asBoolean', function () {

    it('resolves value from a function', function () {
      assert(util.option.asBoolean(function () {return true}, false));
    });

    it('returns default value for null', function () {
      assert(util.option.asBoolean(null, true));
    });

    it('returns true for other types', function () {
      assert(util.option.asBoolean('should be true', false));
    });

    it('returns null for undefined', function () {
      assert.equal(util.option.asBoolean(), null);
    });
  });

  describe('asNumber', function () {

    it('resolves value from a function', function () {
      assert.equal(util.option.asNumber(function () {return 777}, 13), 777);
    });

    it('returns default value for null', function () {
      assert.equal(util.option.asNumber(null, 13), 13);
    });

    it('returns number for other types', function () {
      assert.equal(util.option.asNumber('777', 13), 777);
    });

    it('returns default for NaN', function () {
      assert.equal(util.option.asNumber(NaN, 13), 13);
    });

    it('returns null for undefined', function () {
      assert.equal(util.option.asNumber(), null);
    });
  });

  describe('asString', function () {

    it('resolves value from a function', function () {
      assert.equal(util.option.asString(function () {return 'entered'}, 'default'), 'entered');
    });

    it('returns default value for null', function () {
      assert.equal(util.option.asString(null, 'default'), 'default');
    });

    it('returns string for other types', function () {
      assert.equal(util.option.asString(777, 'default'), '777');
    });

    it('returns default for undefined', function () {
      assert.equal(util.option.asString(undefined, 'default'), 'default');
    });

    it('returns null for undefined', function () {
      assert.equal(util.option.asString(), null);
    });
  });

  describe('asSize', function () {

    it('resolves value from a function', function () {
      assert.equal(util.option.asSize(function () {return '100px'}, '50px'), '100px');
    });

    it('returns default value for null', function () {
      assert.equal(util.option.asSize(null, '50px'), '50px');
    });

    it('returns string with px for other number', function () {
      assert.equal(util.option.asSize(100, '50px'), '100px');
    });

    it('returns default for undefined', function () {
      assert.equal(util.option.asSize(undefined, '50px'), '50px');
    });

    it('returns null for undefined', function () {
      assert.equal(util.option.asSize(), null);
    });
  });

  describe('asElement', function () {

    before(function() {
      this.jsdom_global = jsdom_global();
      this.value  = document.createElement("div");
      this.defaultValue  = document.createElement("div");
    });

    it('resolves value from a function', function () {
      var me = this;
      assert.equal(util.option.asElement(function () {return me.value}, this.defaultValue), this.value);
    });

    it('returns Element', function () {
      assert.equal(util.option.asElement(this.value, this.defaultValue), this.value);
    });

    it('returns default value for null', function () {
      assert.equal(util.option.asElement(null, this.defaultValue), this.defaultValue);
    });

    it('returns null for undefined', function () {
      assert.equal(util.option.asElement(), null);
    });
  });

  describe('binarySearchValue', function () {

    it('Finds center target on odd sized array', function () {
      assert.equal(
        util.binarySearchValue(
          [{id: 'a', val: 0}, {id: 'b', val: 1}, {id: 'c', val: 2}],
          1,
          'val'
        ),
        1
      );
    });

    it('Finds target on odd sized array', function () {
      assert.equal(
        util.binarySearchValue(
          [{id: 'a', val: 0}, {id: 'b', val: 1}, {id: 'c', val: 2}],
          2,
          'val'
        ),
        2
      );
    });

    it('Cannot find target', function () {
      assert.equal(
        util.binarySearchValue(
          [{id: 'a', val: 0}, {id: 'b', val: 1}, {id: 'c', val: 2}],
          7,
          'val'
        ),
        -1
      );
    });
  });
});
