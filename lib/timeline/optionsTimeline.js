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
let any = 'any';

let allOptions = {
  configure: {
    enabled: {boolean},
    filter: {boolean,'function': 'function'},
    container: {dom},
    __type__: {object,boolean,'function': 'function'}
  },

  //globals :
  align: {string},
  rtl: {boolean, 'undefined': 'undefined'},
  autoResize: {boolean},
  throttleRedraw: {number},
  clickToUse: {boolean},
  dataAttributes: {string, array},
  editable: {
    add: {boolean, 'undefined': 'undefined'},
    remove: {boolean, 'undefined': 'undefined'},
    updateGroup: {boolean, 'undefined': 'undefined'},
    updateTime: {boolean, 'undefined': 'undefined'},
    __type__: {boolean, object}
  },
  end: {number, date, string, moment},
  format: {
    minorLabels: {
      millisecond: {string,'undefined': 'undefined'},
      second: {string,'undefined': 'undefined'},
      minute: {string,'undefined': 'undefined'},
      hour: {string,'undefined': 'undefined'},
      weekday: {string,'undefined': 'undefined'},
      day: {string,'undefined': 'undefined'},
      month: {string,'undefined': 'undefined'},
      year: {string,'undefined': 'undefined'},
      __type__: {object}
    },
    majorLabels: {
      millisecond: {string,'undefined': 'undefined'},
      second: {string,'undefined': 'undefined'},
      minute: {string,'undefined': 'undefined'},
      hour: {string,'undefined': 'undefined'},
      weekday: {string,'undefined': 'undefined'},
      day: {string,'undefined': 'undefined'},
      month: {string,'undefined': 'undefined'},
      year: {string,'undefined': 'undefined'},
      __type__: {object}
    },
    __type__: {object}
  },
  moment: {'function': 'function'},
  groupOrder: {string, 'function': 'function'},
  groupEditable: {
	 add: {boolean, 'undefined': 'undefined'},
	 remove: {boolean, 'undefined': 'undefined'},
	 order: {boolean, 'undefined': 'undefined'},
	 __type__: {boolean, object}
  },
  groupOrderSwap: {'function': 'function'},
  height: {string, number},
  hiddenDates: {
    start: {date, number, string, moment},
    end: {date, number, string, moment},
    repeat: {string},
    __type__: {object, array}
  },
  itemsAlwaysDraggable: { boolean: boolean },
  locale:{string},
  locales:{
    __any__: {any},
    __type__: {object}
  },
  margin: {
    axis: {number},
    item: {
      horizontal: {number,'undefined': 'undefined'},
      vertical: {number,'undefined': 'undefined'},
      __type__: {object,number}
    },
    __type__: {object,number}
  },
  max: {date, number, string, moment},
  maxHeight: {number, string},
  maxMinorChars: {number},
  min: {date, number, string, moment},
  minHeight: {number, string},
  moveable: {boolean},
  multiselect: {boolean},
  multiselectPerGroup: {boolean},
  onAdd: {'function': 'function'},
  onUpdate: {'function': 'function'},
  onMove: {'function': 'function'},
  onMoving: {'function': 'function'},
  onRemove: {'function': 'function'},
  onAddGroup: {'function': 'function'},
  onMoveGroup: {'function': 'function'},
  onRemoveGroup: {'function': 'function'},
  order: {'function': 'function'},
  orientation: {
    axis: {string,'undefined': 'undefined'},
    item: {string,'undefined': 'undefined'},
    __type__: {string, object}
  },
  selectable: {boolean},
  showCurrentTime: {boolean},
  showMajorLabels: {boolean},
  showMinorLabels: {boolean},
  stack: {boolean},
  snap: {'function': 'function', 'null': 'null'},
  start: {date, number, string, moment},
  template: {'function': 'function'},
  groupTemplate: {'function': 'function'},
  timeAxis: {
    scale: {string,'undefined': 'undefined'},
    step: {number,'undefined': 'undefined'},
    __type__: {object}
  },
  type: {string},
  width: {string, number},
  zoomable: {boolean},
  zoomKey: {string: ['ctrlKey', 'altKey', 'metaKey', '']},
  zoomMax: {number},
  zoomMin: {number},

  __type__: {object}
};

let configureOptions = {
  global: {
    align:  ['center', 'left', 'right'],
    direction:  false,
    autoResize: true,
    throttleRedraw: [10, 0, 1000, 10],
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

    //groupOrder: {string, 'function': 'function'},
    groupsDraggable: false,
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
    maxMinorChars: [7, 0, 20, 1],
    min: '',
    minHeight: '',
    moveable: false,
    multiselect: false,
    multiselectPerGroup: false,
    //onAdd: {'function': 'function'},
    //onUpdate: {'function': 'function'},
    //onMove: {'function': 'function'},
    //onMoving: {'function': 'function'},
    //onRename: {'function': 'function'},
    //order: {'function': 'function'},
    orientation: {
      axis: ['both', 'bottom', 'top'],
      item: ['bottom', 'top']
    },
    selectable: true,
    showCurrentTime: false,
    showMajorLabels: true,
    showMinorLabels: true,
    stack: true,
    //snap: {'function': 'function', nada},
    start: '',
    //template: {'function': 'function'},
    //timeAxis: {
    //  scale: ['millisecond', 'second', 'minute', 'hour', 'weekday', 'day', 'month', 'year'],
    //  step: [1, 1, 10, 1]
    //},
    type: ['box', 'point', 'range', 'background'],
    width: '100%',
    zoomable: true,
    zoomKey: ['ctrlKey', 'altKey', 'metaKey', ''],
    zoomMax: [315360000000000, 10, 315360000000000, 1],
    zoomMin: [10, 10, 315360000000000, 1]
  }
};

export {allOptions, configureOptions};