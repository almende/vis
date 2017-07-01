gemini.suite('timline', function(suite) {
	var fs = require('fs');
	var path = require('path');
	var baseDir = '/test/gemini/tests/dynamic/';

	var files = fs.readdirSync('.' + baseDir);
	for (var i in files) {
		var file = files[i];
		if(path.extname(file) === ".test.json") {
			var name = file.split('.test.json')[0];

			suite.setUrl(baseDir + '/' + name)
				.before(function(actions) {
					actions.wait(1000);
				})
				.setCaptureElements('#timeline')
				.capture(name);

		}
	}

	/*
  suite.setUrl('/test/gemini/tests/dynamic/noOptions')
    .before(function(actions) {
      actions.wait(1000);
    })
    .setCaptureElements('#timeline')
    .capture('noOptions');
	*/
});
