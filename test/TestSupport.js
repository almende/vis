var vis = require('../dist/vis');
var DataSet = vis.DataSet;

module.exports = {
  buildMockItemSet: function() {
    var itemset = {
      dom: {
        foreground: document.createElement('div'),
        content: document.createElement('div')
      },
      itemSet: {
        itemsData: new DataSet()
      }
    };
    return itemset;
  },

  buildSimpleTimelineRangeBody: function () {
    var body = {
      dom: {
        center: {
          clientWidth: 1000
        }
      },
      domProps: {
        centerContainer: {
          width: 900,
          height: 600
        }
      },
      emitter: {
        on: function () {},
        off: function () {},
        emit: function () {}
      },
      hiddenDates: [],
      util: {}
    }
    body.dom.rollingModeBtn = document.createElement('div')
    return body
  }
}
