// utils
exports.util = require('./lib/util');
exports.DOMutil = require('./lib/DOMutil');

// data
exports.DataSet = require('./lib/DataSet');
exports.DataView = require('./lib/DataView');
exports.Queue = require('./lib/Queue');

// Graph3d
exports.Graph3d = require('./lib/graph3d/Graph3d');
exports.graph3d = {
  Camera: require('./lib/graph3d/Camera'),
  Filter: require('./lib/graph3d/Filter'),
  Point2d: require('./lib/graph3d/Point2d'),
  Point3d: require('./lib/graph3d/Point3d'),
  Slider: require('./lib/graph3d/Slider'),
  StepNumber: require('./lib/graph3d/StepNumber')
};

// Timeline
exports.Timeline = require('./lib/timeline/Timeline');
exports.Graph2d = require('./lib/timeline/Graph2d');
exports.timeline = {
  DateUtil: require('./lib/timeline/DateUtil'),
  DataStep: require('./lib/timeline/DataStep'),
  Range: require('./lib/timeline/Range'),
  stack: require('./lib/timeline/Stack'),
  TimeStep: require('./lib/timeline/TimeStep'),

  components: {
    items: {
      Item: require('./lib/timeline/component/item/Item'),
      BackgroundItem: require('./lib/timeline/component/item/BackgroundItem'),
      BoxItem: require('./lib/timeline/component/item/BoxItem'),
      PointItem: require('./lib/timeline/component/item/PointItem'),
      RangeItem: require('./lib/timeline/component/item/RangeItem')
    },

    Component: require('./lib/timeline/component/Component'),
    CurrentTime: require('./lib/timeline/component/CurrentTime'),
    CustomTime: require('./lib/timeline/component/CustomTime'),
    DataAxis: require('./lib/timeline/component/DataAxis'),
    GraphGroup: require('./lib/timeline/component/GraphGroup'),
    Group: require('./lib/timeline/component/Group'),
    BackgroundGroup: require('./lib/timeline/component/BackgroundGroup'),
    ItemSet: require('./lib/timeline/component/ItemSet'),
    Legend: require('./lib/timeline/component/Legend'),
    LineGraph: require('./lib/timeline/component/LineGraph'),
    TimeAxis: require('./lib/timeline/component/TimeAxis')
  }
};

// Network
exports.Network = require('./lib/network/Network');
exports.network = {
  Images: require('./lib/network/Images'),
  dotparser: require('./lib/network/dotparser'),
  gephiParser: require('./lib/network/gephiParser'),
  allOptions: require('./lib/network/options')
};
exports.network.convertDot   = function (input) {return exports.network.dotparser.DOTToGraph(input)};
exports.network.convertGephi = function (input,options) {return exports.network.gephiParser.parseGephi(input,options)};

// bundled external libraries
exports.moment = require('./lib/module/moment');
exports.Hammer = require('./lib/module/hammer');
exports.keycharm = require('keycharm');