/**
 * Created by Alex on 2/2/2015.
 */

fs = require('fs')

function writeToFile(data, outputFilename, callback) {
  fs.writeFile(outputFilename, JSON.stringify(data), function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("JSON saved to " + outputFilename);
      callback();
      //getNewAssignment();
    }
  });
}

function parse(data, callback) {
  var objects = Object.keys(data.things);
  var timelineData = [];

  var groups = [];
  var groupsObj = {};
  for (var i = 0; i < objects.length; i++) {
    var thing = data.things[objects[i]];
    if (thing.properties.description && thing.properties.date) {
      timelineData.push({
        id:i,
        content: thing.type,
        start: new Date(thing.properties.date.value).valueOf(),
        group: thing.type
      });
      if (groupsObj[thing.type] === undefined) {
        groupsObj[thing.type] = true;
        groups.push({id:thing.type, content:thing.type});
      }
    }
  }
  console.log("amont of data", timelineData.length, "amount of groups:", groups.length)
  var dataToWrite = {data: timelineData, groups:groups};

  writeToFile(dataToWrite, "timeline.json", function(){});
}


fs.readFile('./data.json', 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  parse(JSON.parse(data));
});

