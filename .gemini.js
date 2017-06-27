var geminiConfig = require('./test/gemini/gemini.config.js');

module.exports = {
  rootUrl: 'http://localhost' + ':' + geminiConfig.webserver.port,

  screenshotsDir: geminiConfig.gemini.screens,

  browsers: {
    PhantomJS: {
      desiredCapabilities: {
        browserName: "phantomjs"
      }
    }
  },

  system: {
    plugins: {
      'html-reporter': {
        enabled: true,
        path: geminiConfig.gemini.reports
      }
    }
  }
};
