/**
 * This object contains all possible options. It will check if the types are correct, if required if the option is one
 * of the allowed values.
 *
 * __any__ means that the name of the property does not matter.
 * __type__ is a required field for all objects and contains the allowed types of all objects
 */
let string = 'string';
let boolean = 'boolean';
let number = 'number';
let array = 'array';
let date = 'date';
let object = 'object'; // should only be in a __type__ property
let dom = 'dom';
let moment = 'moment';
let fn = 'function';
let nada = 'null';
let undef = 'undefined';
let any = 'any';


let allOptions = {
  configure: {
    enabled: {boolean},
    filter: {boolean,fn},
    container: {dom},
    __type__: {object,boolean,fn}
  },

  //globals :
  yAxisOrientation: {string:['left','right']},
  defaultGroup: {string},
  sort: {boolean},
  sampling: {boolean},
  stack:{boolean},
  graphHeight: {string, number},
  shaded: {
    enabled: {boolean},
    orientation: {string:['bottom','top']}, // top, bottom
    __type__: {boolean,object}
  },
  style: {string:['line','bar','points']}, // line, bar
  barChart: {
    width: {number},
    sideBySide: {boolean},
    align: {string:['left','center','right']},
    __type__: {object}
  },
  interpolation: {
    enabled: {boolean},
    parametrization: {string:['centripetal', 'chordal','uniform']}, // uniform (alpha = 0.0), chordal (alpha = 1.0), centripetal (alpha = 0.5)
    alpha: {number},
    __type__: {object,boolean}
  },
  drawPoints: {
    enabled: {boolean},
    size: {number},
    style: {string:['square','circle']}, // square, circle
    __type__: {object,boolean}
  },
  dataAxis: {
    showMinorLabels: {boolean},
    showMajorLabels: {boolean},
    icons: {boolean},
    width: {string, number},
    visible: {boolean},
    alignZeros: {boolean},
    left:{
      range: {min:{number},max:{number},__type__: {object}},
      format: {fn},
      title: {text:{string,number},style:{string},__type__: {object}},
      __type__: {object}
    },
    right:{
      range: {min:{number},max:{number},__type__: {object}},
      format: {fn},
      title: {text:{string,number},style:{string},__type__: {object}},
      __type__: {object}
    },
    __type__: {object}
  },
  legend: {
    enabled: {boolean},
    icons: {boolean},
    left: {
      visible: {boolean},
      position: {string:['top-right','bottom-right','top-left','bottom-left']},
      __type__: {object}
    },
    right: {
      visible: {boolean},
      position: {string:['top-right','bottom-right','top-left','bottom-left']},
      __type__: {object}
    },
    __type__: {object,boolean}
  },
  groups: {
    visibility: {any},
    __type__: {object}
  },

  autoResize: {boolean},
  clickToUse: {boolean},
  end: {number, date, string, moment},
  format: {
    minorLabels: {
      millisecond: {string,undef},
      second: {string,undef},
      minute: {string,undef},
      hour: {string,undef},
      weekday: {string,undef},
      day: {string,undef},
      month: {string,undef},
      year: {string,undef},
      __type__: {object}
    },
    majorLabels: {
      millisecond: {string,undef},
      second: {string,undef},
      minute: {string,undef},
      hour: {string,undef},
      weekday: {string,undef},
      day: {string,undef},
      month: {string,undef},
      year: {string,undef},
      __type__: {object}
    },
    __type__: {object}
  },
  height: {string, number},
  hiddenDates: {object, array},
  locale:{string},
  locales:{
    __any__: {object},
    __type__: {object}
  },
  max: {date, number, string, moment},
  maxHeight: {number, string},
  min: {date, number, string, moment},
  minHeight: {number, string},
  moveable: {boolean},
  multiselect: {boolean},
  orientation: {string},
  showCurrentTime: {boolean},
  showMajorLabels: {boolean},
  showMinorLabels: {boolean},
  start: {date, number, string, moment},
  timeAxis: {
    scale: {string,undef},
    step: {number,undef},
    __type__: {object}
  },
  width: {string, number},
  zoomable: {boolean},
  zoomMax: {number},
  zoomMin: {number},
  __type__: {object}
};

let configureOptions = {
  global: {
    //yAxisOrientation: ['left','right'], // TDOO: enable as soon as Grahp2d doesn't crash when changing this on the fly
    sort: true,
    sampling: true,
    stack:false,
    shaded: {
      enabled: false,
      orientation: ['top','bottom'] // top, bottom
    },
    style: ['line','bar','points'], // line, bar
    barChart: {
      width: [50,5,100,5],
      sideBySide: false,
      align: ['left','center','right'] // left, center, right
    },
    interpolation: {
      enabled: true,
      parametrization: ['centripetal','chordal','uniform'] // uniform (alpha = 0.0), chordal (alpha = 1.0), centripetal (alpha = 0.5)
    },
    drawPoints: {
      enabled: true,
      size: [6,2,30,1],
      style: ['square', 'circle'] // square, circle
    },
    dataAxis: {
      showMinorLabels: true,
      showMajorLabels: true,
      icons: false,
      width: [40,0,200,1],
      visible: true,
      alignZeros: true,
      left:{
        //range: {min:undefined,max:undefined},
        //format: function (value) {return value;},
        title: {text:'',style:''}
      },
      right:{
        //range: {min:undefined,max:undefined},
        //format: function (value) {return value;},
        title: {text:'',style:''}
      }
    },
    legend: {
      enabled: false,
      icons: true,
      left: {
        visible: true,
        position: ['top-right','bottom-right','top-left','bottom-left'] // top/bottom - left,right
      },
      right: {
        visible: true,
        position: ['top-right','bottom-right','top-left','bottom-left'] // top/bottom - left,right
      }
    },

    autoResize: true,
    clickToUse: false,
    end: '',
    format: {
      minorLabels: {
        millisecond:'SSS',
        second:     's',
        minute:     'HH:mm',
        hour:       'HH:mm',
        weekday:    'ddd D',
        day:        'D',
        month:      'MMM',
        year:       'YYYY'
      },
      majorLabels: {
        millisecond:'HH:mm:ss',
        second:     'D MMMM HH:mm',
        minute:     'ddd D MMMM',
        hour:       'ddd D MMMM',
        weekday:    'MMMM YYYY',
        day:        'MMMM YYYY',
        month:      'YYYY',
        year:       ''
      }
    },

    height: '',
    locale: '',
    max: '',
    maxHeight: '',
    min: '',
    minHeight: '',
    moveable:true,
    orientation: ['both', 'bottom', 'top'],
    showCurrentTime: false,
    showMajorLabels: true,
    showMinorLabels: true,
    start: '',
    width: '100%',
    zoomable: true,
    zoomMax: [315360000000000, 10, 315360000000000, 1],
    zoomMin: [10, 10, 315360000000000, 1]
  }
};

export {allOptions, configureOptions};