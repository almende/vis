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
    filter: {boolean,string,array},
    container: {dom},
    __type__: {object,boolean,string,array}
  },

  //globals :
  align: {string},
  autoResize: {boolean},
  clickToUse: {boolean},
  dataAttributes: {string, Array},
  editable: {boolean, object},
  end: {number, Date, string, moment},
  format: {
    minorLabels: {
      millisecond: {string},
      second: {string},
      minute: {string},
      hour: {string},
      weekday: {string},
      day: {string},
      month: {string},
      year: {string}
    },
    majorLabels: {
      millisecond: {string},
      second: {string},
      minute: {string},
      hour: {string},
      weekday: {string},
      day: {string},
      month: {string},
      year: {string}
    }
  },
  groupOrder: {string, fn},
  height: {string, number},
  hiddenDates: {object, array},
  locale:{string},
  locales:{
    __any__: {object},
    __type__: {object}
  },
  margin: {
    axis: {number},
    item: {
      horizontal: {number},
      vertical: {number},
      __type__: {object,number}
    },
    __type__: {object,number}
  },
  max: {date, number, string, moment},
  maxHeight: {number, string},
  min: {date, number, string, moment},
  minHeight: {number, string},
  moveable: {boolean},
  multiselect: {boolean},
  onAdd: {fn},
  onUpdate: {fn},
  onMove: {fn},
  onMoving: {fn},
  onRename: {fn},
  order: {fn},
  orientation: {
    axis: {string},
    item: {string},
    __type__: {string, object}
  },
  selectable: {boolean},
  showCurrentTime: {boolean},
  showMajorLabels: {boolean},
  showMinorLabels: {boolean},
  stack: {boolean},
  snap: {fn, nada},
  start: {date, number, string, moment},
  template: {fn},
  timeAxis: {
    scale: {string},
    step: {number},
    __type__: {object}
  },
  type: {string},
  width: {string, number},
  zoomable: {boolean},
  zoomMax: {number},
  zoomMin: {number},

  __type__: {object}
};

let configureOptions = {
  global: {
    align:  ['center', 'left', 'right'],
    autoResize: true,
    clickToUse: false,
    // dataAttributes: ['all'], // FIXME: can be 'all' or string[]
    editable: {
      add: false,
      remove: false,
      updateGroup: false,
      updateTime: false
    },
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

    //groupOrder: {string, fn},
    height: '',
    //hiddenDates: {object, array},
    locale: '',
    margin: {
      axis: [20, 0, 100, 1],
      item: {
        horizontal: [10, 0, 100, 1],
        vertical: [10, 0, 100, 1]
      }
    },
    max: '',
    maxHeight: '',
    min: '',
    minHeight: '',
    moveable: false,
    multiselect: false,
    //onAdd: {fn},
    //onUpdate: {fn},
    //onMove: {fn},
    //onMoving: {fn},
    //onRename: {fn},
    //order: {fn},
    orientation: {
      axis: ['both', 'bottom', 'top'],
      item: ['bottom', 'top']
    },
    selectable: true,
    showCurrentTime: false,
    showMajorLabels: true,
    showMinorLabels: true,
    stack: true,
    //snap: {fn, nada},
    start: '',
    //template: {fn},
    //timeAxis: {
    //  scale: ['millisecond', 'second', 'minute', 'hour', 'weekday', 'day', 'month', 'year'],
    //  step: [1, 1, 10, 1]
    //},
    type: ['box', 'point', 'range', 'background'],
    width: '100%',
    zoomable: true,
    zoomMax: [315360000000000, 10, 315360000000000, 1],
    zoomMin: [10, 10, 315360000000000, 1]
  }
};

export {allOptions, configureOptions};