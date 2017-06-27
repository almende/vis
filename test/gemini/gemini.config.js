var root = './test/gemini/';

module.exports = {
  gemini: {
    baseDir: root,
    reports: root + 'reports/',
    screens: root + 'screens/',
    tests: root + 'tests/'
  },

  webserver: {
    port: 8182
  },

  phantomjs: {
    port: 4444
  }
}
