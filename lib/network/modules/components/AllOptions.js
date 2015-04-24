/**
 * __any__
 * __type__
 */
let string = 'string';
let boolean = 'boolean';
let number = 'number';
let array = 'array';
let object = 'object';
let dom = 'dom';
let fn = 'function';
let undef = 'undefined';


let allOptions = {
  canvas: {
    width: {string},
    height: {string},
    __type__: {object}
  },
  rendering: {
    hideEdgesOnDrag: {boolean},
    hideNodesOnDrag: {boolean},
    __type__: {object}
  },
  clustering: {},
  configuration: {
    filter: {boolean,string:['nodes','edges','layout','physics','manipulation','interaction','selection','rendering'],array},
    container: {dom},
    __type__: {object,string,array,boolean}
  },
  edges: {
    arrows: {
      to: {enabled: {boolean}, scaleFactor: {number}, __type__: {object}},
      middle: {enabled: {boolean}, scaleFactor: {number}, __type__: {object}},
      from: {enabled: {boolean}, scaleFactor: {number}, __type__: {object}},
      __type__: {string:['from','to','middle'],object}
    },
    color: {
      color: {string},
      highlight: {string},
      hover: {string},
      inherit: {string:['from','to','both'],boolean},
      opacity: {number},
      __type__: {object}
    },
    dashes: {
      enabled: {boolean},
      pattern: {array},
      __type__: {boolean,object}
    },
    font: {
      color: {string},
      size: {number}, // px
      face: {string},
      background: {string},
      stroke: {number}, // px
      strokeColor: {string},
      align: {string:['horizontal','top','middle','bottom']},
      __type__: {object}
    },
    hidden: {boolean},
    hoverWidth: {fn,number},
    label: {string,undef},
    length: {number,undef},
    physics: {boolean},
    scaling: {
      min: {number},
      max: {number},
      label: {
        enabled: {boolean},
        min: {number},
        max: {number},
        maxVisible: {number},
        drawThreshold: {number},
        __type__: {object,boolean}
      },
      customScalingFunction: {fn},
      __type__: {object}
    },
    selectionWidth: {fn,number},
    selfReferenceSize: {number},
    shadow: {
      enabled: {boolean},
      size: {number},
      x: {number},
      y: {number},
      __type__: {object,boolean}
    },
    smooth: {
      enabled: {boolean},
      dynamic: {boolean},
      type: {string},
      roundness: {number},
      __type__: {object,boolean}
    },
    title: {string, undef},
    width: {number},
    value: {number, undef},
    __type__: {object}
  },
  groups: {
    useDefaultGroups: {boolean},
    __any__: ['__ref__','nodes'],
    __type__: {object}
  },
  interaction: {
    dragNodes: {boolean},
    dragView: {boolean},
    zoomView: {boolean},
    hoverEnabled: {boolean},
    navigationButtons: {boolean},
    tooltipDelay: {number},
    keyboard: {
      enabled: {boolean},
      speed: {x: {number}, y: {number}, zoom: {number}, __type__: {object}},
      bindToWindow: {boolean},
      __type__: {object,boolean}
    },
    __type__: {object}
  },
  layout: {
    randomSeed: undefined,
    hierarchical: {
      enabled: {boolean},
      levelSeparation: {number},
      direction: {string:['UD','DU','LR','RL']},   // UD, DU, LR, RL
      sortMethod: {string:['hubsize','directed']}, // hubsize, directed
      __type__: {object,boolean}
    },
    __type__: {object}
  },
  manipulation: {
    enabled: {boolean},
    initiallyActive: {boolean},
    locale: {string},
    locales: {object},
    functionality: {
      addNode: {boolean},
      addEdge: {boolean},
      editNode: {boolean},
      editEdge: {boolean},
      deleteNode: {boolean},
      deleteEdge: {boolean},
      __type__: {object}
    },
    handlerFunctions: {
      addNode: {fn,undef},
      addEdge: {fn,undef},
      editNode: {fn,undef},
      editEdge: {fn,undef},
      deleteNode: {fn,undef},
      deleteEdge: {fn,undef},
      __type__: {object}
    },
    controlNodeStyle: ['__ref__','nodes'],
    __type__: {object,boolean}
  },
  nodes: {
    borderWidth: {number},
    borderWidthSelected: {number,undef},
    brokenImage: {string,undef},
    color: {
      border: {string},
      background: {string},
      highlight: {
        border: {string},
        background: {string},
        __type__: {object,string}
      },
      hover: {
        border: {string},
        background: {string},
        __type__: {object,string}
      },
      __type__: {object,string}
    },
    fixed: {
      x: {boolean},
      y: {boolean},
      __type__: {object,boolean}
    },
    font: {
      color: {string},
      size: {number}, // px
      face: {string},
      background: {string},
      stroke: {number}, // px
      strokeColor: {string},
      __type__: {object}
    },
    group: {string,number,undef},
    hidden: {boolean},
    icon: {
      face: {string},
      code: {string},  //'\uf007',
      size: {number},  //50,
      color: {string},
      __type__: {object}
    },
    id: {string, number},
    image: {string,undef}, // --> URL
    label: {string,undef},
    level: {number,undef},
    mass: {number},
    physics: {boolean},
    scaling: {
      min: {number},
      max: {number},
      label: {
        enabled: {boolean},
        min: {number},
        max: {number},
        maxVisible: {number},
        drawThreshold: {number},
        __type__: {object, boolean}
      },
      customScalingFunction: {fn},
      __type__: {object}
    },
    shadow: {
      enabled: {boolean},
      size: {number},
      x: {number},
      y: {number},
      __type__: {object,boolean}
    },
    shape: {string:['ellipse', 'circle', 'database', 'box', 'text','image', 'circularImage','diamond', 'dot', 'star', 'triangle','triangleDown', 'square','icon']},
    size: {number},
    title: {string,undef},
    value: {number,undef},
    x: {number},
    y: {number},
    __type__: {object}
  },
  physics: {
    barnesHut: {
      gravitationalConstant: {number},
      centralGravity: {number},
      springLength: {number},
      springConstant: {number},
      damping: {number},
      __type__: {object}
    },
    repulsion: {
      centralGravity: {number},
      springLength: {number},
      springConstant: {number},
      nodeDistance: {number},
      damping: {number},
      __type__: {object}
    },
    hierarchicalRepulsion: {
      centralGravity: {number},
      springLength: {number},
      springConstant: {number},
      nodeDistance: {number},
      damping: {number},
      __type__: {object}
    },
    maxVelocity: {number},
    minVelocity: {number},    // px/s
    solver: {string:['barnesHut','repulsion','hierarchicalRepulsion']},
    stabilization: {
      enabled: {boolean},
      iterations: {number},   // maximum number of iteration to stabilize
      updateInterval: {number},
      onlyDynamicEdges: {boolean},
      fit: {boolean},
      __type__: {object,boolean}
    },
    timestep: {number},
    __type__: {object,boolean}
  },
  selection: {
    select: {boolean},
    selectConnectedEdges: {boolean},
    __type__: {object}
  },
  view: {},
  __type__: {object}
};


allOptions.groups.__any__ = allOptions.nodes;
allOptions.manipulation.controlNodeStyle = allOptions.nodes;

export default allOptions;