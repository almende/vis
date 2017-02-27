
module.exports = {
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
