var assert = require('assert');
var uuid = require('../lib/module/uuid');

describe('UUID', function () {

  describe('v1', function () {
    it('generates valid, parseable uuid1', function () {
      assert(/^[0-9A-F]{8}-[0-9A-F]{4}-[1][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid.v1()));
      assert.equal(uuid.parse(uuid.v1()).length, 16)
    });
  });

  describe('v4', function () {
    it('generates valid, parseable uuid4', function () {
      assert(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid.v4()));
      assert.equal(uuid.parse(uuid.v4()).length, 16)
    });
  });
});
