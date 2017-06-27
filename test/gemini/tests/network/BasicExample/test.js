gemini.suite('network/BasicExample', function(suite) {
  suite.setUrl('/test/gemini/tests/network/BasicExample/')
    .before(function(actions) {
      actions.wait(1000);
    })
    .setCaptureElements('#network')
    .capture('plain');
});
