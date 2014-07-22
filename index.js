// utils
exports.util = require('./lib/util');
exports.DOMutil = require('./lib/DOMutil');

// data
exports.DataSet = require('./lib/DataSet');
exports.DataView = require('./lib/DataView');

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
  DataStep: require('./lib/timeline/DataStep'),
  Range: require('./lib/timeline/Range'),
  stack: require('./lib/timeline/Stack'),
  TimeStep: require('./lib/timeline/TimeStep'),

  components: {
    items: {
      Item: require('./lib/timeline/component/item/Item'),
      ItemBox: require('./lib/timeline/component/item/ItemBox'),
      ItemPoint: require('./lib/timeline/component/item/ItemPoint'),
      ItemRange: require('./lib/timeline/component/item/ItemRange')
    },

    Component: require('./lib/timeline/component/Component'),
    CurrentTime: require('./lib/timeline/component/CurrentTime'),
    CustomTime: require('./lib/timeline/component/CustomTime'),
    DataAxis: require('./lib/timeline/component/DataAxis'),
    GraphGroup: require('./lib/timeline/component/GraphGroup'),
    Group: require('./lib/timeline/component/Group'),
    ItemSet: require('./lib/timeline/component/ItemSet'),
    Legend: require('./lib/timeline/component/Legend'),
    LineGraph: require('./lib/timeline/component/LineGraph'),
    TimeAxis: require('./lib/timeline/component/TimeAxis')
  }
};

// Network
exports.Network = require('./lib/network/Network');
exports.network = {
  Edge: require('./lib/network/Edge'),
  Groups: require('./lib/network/Groups'),
  Images: require('./lib/network/Images'),
  Node: require('./lib/network/Node'),
  Popup: require('./lib/network/Popup'),
  dotparser: require('./lib/network/dotparser'),
  gephiParser: require('./lib/network/gephiParser')
};

// Deprecated since v3.0.0
exports.Graph = function () {
  throw new Error('Graph is renamed to Network. Please create a graph as new vis.Network(...)');
};

// bundled external libraries
exports.moment = require('./lib/module/moment');
exports.hammer = require('./lib/module/hammer');
