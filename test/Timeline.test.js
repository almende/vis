var DataSet = require('../lib/DataSet');
var Timeline = require('../lib/timeline/Timeline');

describe('Timeline', function () {
	before(function () {
		this.jsdom = require('jsdom-global')({
			pretendToBeVisual: true
		});
		global['Element'] = window.Element;
		global['requestAnimationFrame'] = function(cb) {
			cb();
		};
	});

	after(function () {
		this.jsdom();
	});

	it('should not throw when updating data in close succession', function (done) {
		var timeline = new Timeline(document.createElement('div'), []);

		var events = [
			{start: new Date(), id: 1},
			{start: new Date(), id: 2}
		];

		timeline
			.setItems(new DataSet(events));

		setTimeout(function() {
			timeline
				.setItems(new DataSet([
					{start: new Date(), id: 3},
					{start: new Date(), id: 4},
					{start: new Date(), id: 5}
				]));

			done();
		}, 5);

		timeline
			.setSelection([events[0].id], {animation: false});
	});
});
