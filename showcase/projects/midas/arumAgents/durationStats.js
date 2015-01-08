/**
 * Created by Alex on 9/25/2014.
 */

function DurationStats() {
  this.fields = ['duration','durationWithPause','durationWithStartup','durationWithBoth'];
  for (var i = 0; i < this.fields.length; i++) {
    this[this.fields[i]] = {mean: 0, std: 0};
  }
}

DurationStats.prototype.clearStats = function() {
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i];
    this[field].mean = 0;
    this[field].std  = 0;
  }
};

DurationStats.prototype.sumStats = function(otherData) {
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i];
    this[field].mean += otherData[field].mean;
    this[field].std  += Math.pow(otherData[field].std,2);
  }
};
DurationStats.prototype.averageStats = function(datapoints) {
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i];
    this[field].mean /= datapoints;
    this[field].std = Math.sqrt(this[field].std / datapoints);
  }
};

DurationStats.prototype.getMeanData = function() {
  var dataObj = {};
  for (var i = 0; i < this.fields.length; i++) {
    dataObj[this.fields[i]] = this[this.fields[i]].mean;
  }
  return dataObj;
};

DurationStats.prototype.getData = function() {
  var dataObj = {};
  for (var i = 0; i < this.fields.length; i++) {
    dataObj[this.fields[i]] = {};
    dataObj[this.fields[i]].mean = this[this.fields[i]].mean;
    dataObj[this.fields[i]].std = this[this.fields[i]].std;
  }

  return dataObj;
};

DurationStats.prototype.setData = function(otherData) {
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i];
    this[field].mean = otherData[field].mean;
    this[field].std  = otherData[field].std;
  }
};

DurationStats.prototype.generateData = function(otherData) {
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i];
    this[field].mean = otherData[i] * 3600000;
    this[field].std  = otherData[i] * 0.1;
  }
};


DurationStats.prototype.useHighest = function(otherData) {
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i];
    if (this[field].mean < otherData[field].mean) {
      this[field].mean = otherData[field].mean;
      this[field].std = otherData[field].std;
    }
  }
};

DurationStats.prototype.getFakeStats = function(type) {
  switch (type) {
    case "Assemble Coffeemaker":
      this.generateData([1.3,1.3,1.3,1.3]);
      break;
    case "Discuss potential NC":
      this.generateData([0.5,0.5,0.9,0.9]);
      break;
    case "Drilling rework":
      this.generateData([5,5,8,8]);
      break;
    case "Go to station":
      var a = 0.3;
      this.generateData([a,a,a,a]);
      break;
    case "Inspect finished Coffeemaker":
      var a = 2;
      this.generateData([a,a,a,a]);
      break;
    case "Inspect potential NC":
      var a = 0.5;
      this.generateData([a,a,a,a]);
      break;
    case "Kitting Coffeemaker":
      var a = 1.2;
      this.generateData([a,a,a,a]);
      break;
    case "NC Meeting":
      var a = 15;
      this.generateData([3,3.5,a,a]);
      break;
    case "Go to NC meeting":
      var a = 12;
      this.generateData([a,a,a,a]);
      break;
    case "Organise drilling rework":
      var a = 2;
      this.generateData([a,a,3,3]);
      break;
    case "Produce Coffeemaker":
      var a = 35;
      this.generateData([a,a,a,a]);
      break;
    case  "Transport to delivery":
      var a = 0.4;
      this.generateData([a,a,a,a]);
      break;
    default:
      console.log("CANNOT MATCH", type);
      break;

  }









};