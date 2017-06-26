gemini.suite('yandex-search', function(suite) {
  suite.setUrl('/')
    .setCaptureElements('.main-table')
    .capture('plain')
    .capture('with text', function(actions, find) {
      actions.sendKeys(find('.input__control'), 'hello gemini');
    });
});
