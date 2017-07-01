var path = require('path');
var Gemini = require('gemini/api');
var gemini = new Gemini(path.resolve(__dirname, '../../.gemini.js'));

/*
console.log(gemini.config.system.projectRoot);

gemini.readTests(path.resolve(__dirname, 'tests'))
  .done(function(collection) {
      collection.topLevelSuites().forEach(function(suite) {
          console.log(suite.name);
      });
  });
*/

gemini.readTests(path.resolve(__dirname, 'tests'))
	.done(function(collection) {
		return gemini.test(collection);
	});
