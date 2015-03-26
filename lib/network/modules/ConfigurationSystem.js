/**
 * Created by Alex on 3/26/2015.
 */


var util = require('../../util');


class ConfigurationSystem {
  constructor(network) {
    this.network = network;

    this.possibleOptions = {
      nodes: {
        borderWidth: [1, 0, 10, 1],
        borderWidthSelected: [2, 0, 10, 1],
        color: {
          border: 'color',
          background: 'color',
          highlight: {
            border: 'color',
            background: 'color'
          },
          hover: {
            border: 'color',
            background: 'color'
          }
        },
        fixed: {
          x: false,
          y: false
        },
        font: {
          color: 'color',
          size: [14, 0, 100, 1], // px
          face: ['arial', 'verdana', 'tahoma'],
          background: 'color',
          stroke: [0, 0, 50, 1], // px
          strokeColor: 'color'
        },
        group: 'string',
        hidden: false,
        icon: {
          face: 'string',  //'FontAwesome',
          code: 'string',  //'\uf007',
          size: [50, 0, 200, 1],  //50,
          color: 'color'   //'#aa00ff'
        },
        image: 'string', // --> URL
        physics: true,
        scaling: {
          min: [10, 0, 200, 1],
          max: [30, 0, 200, 1],
          label: {
            enabled: true,
            min: [14, 0, 200, 1],
            max: [30, 0, 200, 1],
            maxVisible: [30, 0, 200, 1],
            drawThreshold: [3, 0, 20, 1]
          }
        },
        shape: ['ellipse', 'box', 'circle', 'circularImage', 'database', 'diamond', 'dot', 'icon', 'image', 'square', 'star', 'text', 'triangle', 'triangleDown'],
        size: [25, 0, 200, 1]
      },
      edges: {
        arrows: {
          to: {enabled: false, scaleFactor: [1, 0, 3, 0.05]}, // boolean / {arrowScaleFactor:1} / {enabled: false, arrowScaleFactor:1}
          middle: {enabled: false, scaleFactor: [1, 0, 3, 0.05]},
          from: {enabled: false, scaleFactor: [1, 0, 3, 0.05]}
        },
        color: {
          color: 'color',
          highlight: 'color',
          hover: 'color',
          inherit: {
            enabled: true,
            source: ['from', 'to'], // from / to
            useGradients: false
          },
          opacity: [1, 0, 1, 0.05]
        },
        dashes: {
          enabled: false,
          length: [5, 0, 50, 1],
          gap: [5, 0, 50, 1],
          altLength: [5, 0, 50, 1]
        },
        font: {
          color: 'color',
          size: [14, 0, 100, 1], // px
          face: ['arial', 'verdana', 'tahoma'],
          background: 'color',
          stroke: [0, 0, 50, 1], // px
          strokeColor: 'color',
          align: ['horizontal', 'top', 'middle', 'bottom']
        },
        hidden: false,
        hoverWidth: [1.5, 0, 10, 0.1],
        physics: true,
        scaling: {
          min: [10, 0, 200, 1],
          max: [30, 0, 200, 1],
          label: {
            enabled: true,
            min: [14, 0, 200, 1],
            max: [30, 0, 200, 1],
            maxVisible: [30, 0, 200, 1],
            drawThreshold: [3, 0, 20, 1]
          }
        },
        selfReferenceSize: [20, 0, 200, 1],
        smooth: {
          enabled: true,
          dynamic: true,
          type: ["continuous", 'discrete', 'diagonalCross', 'straightCross', 'horizontal', 'vertical', 'curvedCW', 'curvedCCW'],
          roundness: [0.5, 0, 1, 0.05]
        },
        width: [1, 0, 30, 1],
        widthSelectionMultiplier: [2, 0, 5, 0.1]
      },
      layout: {
        randomSeed: [0, 0, 500, 1],
        hierarchical: {
          enabled: false,
          levelSeparation: [150, 20, 500, 5],
          direction: ["UD", 'DU', 'LR', 'RL'],   // UD, DU, LR, RL
          sortMethod: ["hubsize", 'directed'] // hubsize, directed
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hoverEnabled: false,
        showNavigationIcons: false,
        tooltip: {
          delay: [300, 0, 1000, 25],
          fontColor: 'color',
          fontSize: [14, 0, 40, 1], // px
          fontFace: ['arial', 'verdana', 'tahoma'],
          color: {
            border: 'color',
            background: 'color'
          }
        },
        keyboard: {
          enabled: false,
          speed: {x: [10, 0, 40, 1], y: [10, 0, 40, 1], zoom: [0.02, 0, 0.1, 0.005]},
          bindToWindow: true
        }
      },
      manipulation: {
        enabled: false,
        initiallyVisible: false,
        locale: ['en', 'nl'],
        functionality: {
          addNode: true,
          addEdge: true,
          editNode: true,
          editEdge: true,
          deleteNode: true,
          deleteEdge: true
        }
      },
      physics: {
        barnesHut: {
          theta: [0.5, 0.1, 1, 0.05],
          gravitationalConstant: [-2000, -300000, 0, 50],
          centralGravity: [0.3, 0, 10, 0.05],
          springLength: [95, 0, 500, 5],
          springConstant: [0.04, 0, 5, 0.005],
          damping: [0.09, 0, 1, 0.01]
        },
        repulsion: {
          centralGravity: [0.2, 0, 10, 0.05],
          springLength: [200, 0, 500, 5],
          springConstant: [0.05, 0, 5, 0.005],
          nodeDistance: [100, 0, 500, 5],
          damping: [0.09, 0, 1, 0.01]
        },
        hierarchicalRepulsion: {
          centralGravity: [0.2, 0, 10, 0.05],
          springLength: [100, 0, 500, 5],
          springConstant: [0.01, 0, 5, 0.005],
          nodeDistance: [120, 0, 500, 5],
          damping: [0.09, 0, 1, 0.01]
        },
        maxVelocity: [50, 0, 150, 1],
        minVelocity: [0.1, 0.01, 0.5, 0.01],
        solver: ['BarnesHut', 'Repulsion', 'HierarchicalRepulsion'],
        timestep: [0.5, 0, 1, 0.05]
      },
      selection: {
        select: true,
        selectConnectedEdges: true
      },
      renderer: {
        hideEdgesOnDrag: false,
        hideNodesOnDrag: false
      }
    }

    this.actualOptions = {};

    this.domElements = [];
  }

  setOptions(options) {
    if (options !== undefined) {
      util.deepExtend(this.actualOptions, options);
      if (options.configurationContainer !== undefined) {
        this.container = options.configurationContainer;
      }
      else {
        this.container = this.network.body.container;
      }

      if (options.configure !== undefined && options.configure !== false) {
        let config;
        if (options.configure instanceof Array) {
          config = options.configure.join();
        }
        else if (typeof options.configure === 'string') {
          config = options.configure;
        }
        else if (typeof options.configure === 'boolean') {
          config = options.configure;
        }
        else {
          this._clean();
          throw new Error("the option for configure has to be either a string, boolean or an array. Supplied:" + options.configure);
          return;
        }
        this._create(config);
      }
      else {
        this._clean();
      }
    }
  }

  /**
   *
   * @param {Boolean | String} config
   * @private
   */
  _create(config) {
    this._clean();
    let counter = 0;
    for (let option in this.possibleOptions) {
      if (this.possibleOptions.hasOwnProperty(option)) {
        if (config === true || config.indexOf(option) !== -1) {
          let optionObj = this.possibleOptions[option];

          if (counter > 0) {
            this._makeBreak();
          }
          // a header for the category
          this._makeHeader(option);

          // get the suboptions
          let path = [option];
          this._handleObject(optionObj, path);
        }
        counter++;
      }
    }

    this._push();
  }

  _push() {
    for (var i = 0; i < this.domElements.length; i++) {
      this.container.appendChild(this.domElements[i]);
    }
  }

  _clean() {

  }

  _getValue(path) {
    let base = this.actualOptions;
    for (let i = 0; i < path.length; i++) {
      if (base[path[i]] !== undefined) {
        base = base[path[i]];
      }
      else {
        base = undefined;
        break;
      }
    }
    return base;
  }

  _addToPath(path, newValue) {
    let newPath = [];
    for (let i = 0; i < path.length; i++) {
      newPath.push(path[i]);
    }
    newPath.push(newValue);
    return newPath;
  }

  _makeHeader(name) {
    let div = document.createElement('div');
    div.className = 'vis-network-configuration header';
    div.innerHTML = name;
    this.domElements.push(div);
    this._makeBreak();
  }

  _makeLabel(name, path) {
    let div = document.createElement('div');
    div.className = 'vis-network-configuration label';
    div.innerHTML = name;
    div.style.left = ((path.length - 1) * 10) + 'px';
    this.domElements.push(div);
  }

  _makeDropdown(arr, value) {
    let select = document.createElement('select');
    select.className = 'vis-network-configuration select';
    let selectedValue = 0;
    if (value !== undefined) {
      if (arr.indexOf(value) !== -1) {
        selectedValue = arr.indexOf(value);
      }
    }

    for (let i = 0; i < arr.length; i++) {
      let option = document.createElement("option");
      option.value = arr[i];
      if (i == selectedValue) {
        option.selected = 'selected';
      }
      option.innerHTML = arr[i];
      select.appendChild(option);
    }

    select.onchange = function () {me._update(this.value, path);}

    this.domElements.push(select);
    this._makeBreak();
  }

  _makeRange(arr, value, path) {
    let defaultValue = arr[0];
    let min = arr[1];
    let max = arr[2];
    let step = arr[3];
    let range = document.createElement('input');
    range.type = 'range';
    range.className = 'vis-network-configuration range'
    range.value = defaultValue;
    range.min = min;
    range.max = max;
    range.step = step;
    if (value !== undefined) {
      range.value = value;
      if (value * 0.1 < min) {
        range.min = value / 10;
      }
      if (value * 10 > max && max !== 1) {
        range.max = value * 10;
      }
    }
    let input = document.createElement("input");
    input.className = 'vis-network-configuration rangeinput'
    input.value = range.value;

    var me = this;
    range.onchange = function () {input.value = this.value; me._update(this.value, path);}
    range.oninput  = function () {input.value = this.value;}
    this.domElements.push(range);
    this.domElements.push(input);
    this._makeBreak();
  }

  _makeCheckbox(defaultValue, value, path) {
    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.checked = defaultValue;
    if (value !== undefined) {
      checkbox.checked = value;
    }

    let me = this;
    checkbox.onchange = function() {me._update(this.value, path)}

    this.domElements.push(checkbox);
  }

  _makeBreak() {
    this.domElements.push(document.createElement("br"));
  }


  _handleObject(obj, path = []) {
    for (let subObj in obj) {
      if (obj.hasOwnProperty(subObj)) {
        let item = obj[subObj];
        let value = this._getValue(path);

        let newPath = this._addToPath(path, subObj);
        if (item instanceof Array) {
          this._handleArray(subObj, item, value, newPath);
        }
        else if (typeof item === 'string') {
          this._handleString(subObj, item, value, newPath);
        }
        else if (typeof item === 'boolean') {
          this._handleBoolean(subObj, item, value, newPath);
        }
        else if (item instanceof Object) {
          this._makeLabel(subObj, newPath);
          this._makeBreak();
          this._handleObject(item, newPath);
        }
        else {
          console.error("dont know how to handle", item, subObj, newPath);
        }
      }
    }
  }

  _handleArray(optionName, arr, value, path) {
    this._makeLabel(optionName, path);

    if (typeof arr[0] === 'string') {
      this._makeDropdown(arr, value, path);
    }
    else if (typeof arr[0] === 'number') {
      this._makeRange(arr, value, path);
    }
  }

  _handleString(optionName, string, value, path) {
    if (string !== 'color') {
      this._makeLabel(optionName, path);
    }
    else {
      this._makeLabel(optionName, path);
      //console.log("string", string, value, path);
    }
    this._makeLabel(string, []);
    this._makeBreak();
  }

  _handleBoolean(optionName, boolean, value, path) {
    this._makeLabel(optionName, path);
    this._makeCheckbox(boolean, value, path);
    this._makeBreak();
  }

  _update(value, path) {
    console.log("updated", value, path)
  }
}


export default ConfigurationSystem;