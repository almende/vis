var geminiConfig = require('./test/gemini/gemini.config.js');

module.exports = {
  rootUrl: 'http://localhost' + ':' + geminiConfig.webserver.port,

  screenshotsDir: geminiConfig.gemini.screens,

  browsers: {
    PhantomJS: {
      desiredCapabilities: {
        browserName: "phantomjs"
      }
    },

    /*
    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: ["disable-gpu", "no-sandbox"]
        }
      }
    }
    */

    /*
    firefox: {
      desiredCapabilities: {
        browserName: "firefox"
        version: "47.0"
      }
    }
    */
  },

  system: {
    parallelLimit: 3,
    plugins: {
      'html-reporter': {
        enabled: true,
        path: geminiConfig.gemini.reports
      }
    }
  }
};
