// Update the version numbers and library sizes in index.html

var fs = require('fs'),
    zlib = require('zlib');

var VIS_ZIP = './dist/vis.js',
    INDEX = 'index.html';

// read version from dist/vis.js
function version(callback) {
  fs.readFile(VIS_ZIP, function (err, data) {
    if (!err) {
      var match = /@version\s*([\w\.-]*)/i.exec(data);
      var version = undefined;
      if (match) {
        version = match[1];
      }
      callback(null, version);
    }
    else {
      callback(err);
    }
  });
}

// update version and library sizes in index.md
function updateVersion(version, callback) {
  fs.readFile(INDEX, function (err, data) {
    if (!err) {
      data = String(data);

      data = data.replace(/<span class="version">([\w\.-]*)<\/span>/g,
          '<span class="version">' + version + '</span>');

      fs.writeFile(INDEX, data, callback);
    }
    else {
      callback(err);
    }
  });
}


version(function (err, version) {
  console.log('version: ' + version);
  if (version) {
    updateVersion(version, function (err, res) {
      if (err) {
        console.log(err);
      }
      else {
        console.log('done');
      }
    });
  }
  else {
  }
});