module.exports = {
  rootUrl: "http://yandex.com",

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
        path: 'gemini/reports'
      }
    }
  }
};
