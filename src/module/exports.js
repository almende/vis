/**
 * vis.js module exports
 */
var vis = {
  moment: moment,

  util: util,
  DOMutil: DOMutil,

  DataSet: DataSet,
  DataView: DataView,

  Timeline: Timeline,
  Graph2d: Graph2d,
  timeline: {
    DataStep: DataStep,
    Range: Range,
    stack: stack,
    TimeStep: TimeStep,

    components: {
      items: {
        Item: Item,
        ItemBox: ItemBox,
        ItemPoint: ItemPoint,
        ItemRange: ItemRange
      },

      Component: Component,
      CurrentTime: CurrentTime,
      CustomTime: CustomTime,
      DataAxis: DataAxis,
      GraphGroup: GraphGroup,
      Group: Group,
      ItemSet: ItemSet,
      Legend: Legend,
      LineGraph: LineGraph,
      TimeAxis: TimeAxis
    }
  },

  Network: Network,
  network: {
    Edge: Edge,
    Groups: Groups,
    Images: Images,
    Node: Node,
    Popup: Popup
  },

  // Deprecated since v3.0.0
  Graph: function () {
    throw new Error('Graph is renamed to Network. Please create a graph as new vis.Network(...)');
  },

  Graph3d: Graph3d
};

/**
 * CommonJS module exports
 */
if (typeof exports !== 'undefined') {
  exports = vis;
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = vis;
}

/**
 * AMD module exports
 */
if (typeof(define) === 'function') {
  define(function () {
    return vis;
  });
}

/**
 * Window exports
 */
if (typeof window !== 'undefined') {
  // attach the module to the window, load as a regular javascript file
  window['vis'] = vis;
}
