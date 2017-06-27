gemini.suite('timline/BasicExample', function(suite) {
  suite.setUrl('/test/gemini/tests/timeline/BasicExample/')
    .before(function(actions) {
      actions.waitForElementToShow('.gemini-test-timeline', 5000);
    })
    .setCaptureElements('.gemini-test-timeline')
    .capture('plain');
});
