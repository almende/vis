gemini.suite('timline/BasicExample', function(suite) {
  suite.setUrl('/test/gemini/tests/timeline/BasicExample/')
    .before(function(actions) {
      actions.wait(1000);
    })
    .setCaptureElements('#timeline')
    .capture('plain');
});
