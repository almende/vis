var util = require('../../util');

import  ColorPicker from './components/ColorPicker'

/**
 * The way this works is for all properties of this.possible options, you can supply the property name in any form to list the options.
 * Boolean options are recognised as Boolean
 * Number options should be written as array: [default value, min value, max value, stepsize]
 * Colors should be written as array: ['color', '#ffffff']
 * Strings with should be written as array: [option1, option2, option3, ..]
 *
 * The options are matched with their counterparts in each of the modules and the values used in the configuration are
 *
 */
class ConfigurationSystem {
  constructor(network) {
    this.network = network;
    this.changedOptions = [];

    this.possibleOptions = {
      nodes: {
        borderWidth: [1, 0, 10, 1],
        borderWidthSelected: [2, 0, 10, 1],
        color: {
          border: ['color','#2B7CE9'],
          background: ['color','#97C2FC'],
          highlight: {
            border: ['color','#2B7CE9'],
            background: ['color','#D2E5FF']
          },
          hover: {
            border: ['color','#2B7CE9'],
            background: ['color','#D2E5FF']
          }
        },
        fixed: {
          x: false,
          y: false
        },
        font: {
          color: ['color','#343434'],
          size: [14, 0, 100, 1], // px
          face: ['arial', 'verdana', 'tahoma'],
          background: ['color','none'],
          stroke: [0, 0, 50, 1], // px
          strokeColor: ['color','#ffffff']
        },
        //group: 'string',
        hidden: false,
        //icon: {
        //  face: 'string',  //'FontAwesome',
        //  code: 'string',  //'\uf007',
        //  size: [50, 0, 200, 1],  //50,
        //  color: ['color','#2B7CE9']   //'#aa00ff'
        //},
        //image: 'string', // --> URL
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
        shadow:{
          enabled: false,
          size:[10, 0, 20, 1],
          x:[5, -30, 30, 1],
          y:[5, -30, 30, 1]
        },
        shape: ['ellipse', 'box', 'circle', 'database', 'diamond', 'dot', 'square', 'star', 'text', 'triangle', 'triangleDown'],
        size: [25, 0, 200, 1]
      },
      edges: {
        arrows: {
          to: {enabled: false, scaleFactor: [1, 0, 3, 0.05]}, // boolean / {arrowScaleFactor:1} / {enabled: false, arrowScaleFactor:1}
          middle: {enabled: false, scaleFactor: [1, 0, 3, 0.05]},
          from: {enabled: false, scaleFactor: [1, 0, 3, 0.05]}
        },
        color: {
          color: ['color','#848484'],
          highlight: ['color','#848484'],
          hover: ['color','#848484'],
          inherit: ['from','to','both',true, false],
          opacity: [1, 0, 1, 0.05]
        },
        dashes: {
          enabled: false,
          length: [5, 0, 50, 1],
          gap: [5, 0, 50, 1],
          altLength: [5, 0, 50, 1]
        },
        font: {
          color: ['color','#343434'],
          size: [14, 0, 100, 1], // px
          face: ['arial', 'verdana', 'tahoma'],
          background: ['color','none'],
          stroke: [1, 0, 50, 1], // px
          strokeColor: ['color','#ffffff'],
          align: ['horizontal', 'top', 'middle', 'bottom']
        },
        hidden: false,
        hoverWidth: [1.5, 0, 10, 0.1],
        physics: true,
        scaling: {
          min: [1, 0, 100, 1],
          max: [15, 0, 100, 1],
          label: {
            enabled: true,
            min: [14, 0, 200, 1],
            max: [30, 0, 200, 1],
            maxVisible: [30, 0, 200, 1],
            drawThreshold: [3, 0, 20, 1]
          }
        },
        selfReferenceSize: [20, 0, 200, 1],
        shadow:{
          enabled: false,
          size:[10, 0, 20, 1],
          x:[5, -30, 30, 1],
          y:[5, -30, 30, 1]
        },
        smooth: {
          enabled: true,
          dynamic: true,
          type: ['continuous', 'discrete', 'diagonalCross', 'straightCross', 'horizontal', 'vertical', 'curvedCW', 'curvedCCW'],
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
          direction: ['UD', 'DU', 'LR', 'RL'],   // UD, DU, LR, RL
          sortMethod: ['hubsize', 'directed'] // hubsize, directed
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hoverEnabled: false,
        navigationButtons: false,
        tooltipDelay: [300, 0, 1000, 25],
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
          gravitationalConstant: [-2000, -30000, 0, 50],
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
        solver: ['barnesHut', 'repulsion', 'hierarchicalRepulsion'],
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
    };

    this.actualOptions = {
      nodes:{},
      edges:{},
      layout:{},
      interaction:{},
      manipulation:{},
      physics:{},
      selection:{},
      renderer:{},
      configure: false,
      configureContainer: undefined
    };

    this.domElements = [];
    this.colorPicker = new ColorPicker(this.network.canvas.pixelRatio);
  }


  /**
   * refresh all options.
   * Because all modules parse their options by themselves, we just use their options. We copy them here.
   *
   * @param options
   */
  setOptions(options) {
    if (options !== undefined) {
      util.extend(this.actualOptions, options);
    }

    this._clean();

    if (this.actualOptions.configure !== undefined && this.actualOptions.configure !== false) {
      util.deepExtend(this.actualOptions.nodes, this.network.nodesHandler.options, true);
      util.deepExtend(this.actualOptions.edges, this.network.edgesHandler.options, true);
      util.deepExtend(this.actualOptions.layout, this.network.layoutEngine.options, true);
      util.deepExtend(this.actualOptions.interaction, this.network.interactionHandler.options, true);
      util.deepExtend(this.actualOptions.manipulation, this.network.manipulation.options, true);
      util.deepExtend(this.actualOptions.physics, this.network.physics.options, true);
      util.deepExtend(this.actualOptions.selection, this.network.selectionHandler.selection, true);
      util.deepExtend(this.actualOptions.renderer, this.network.renderer.selection, true);


      this.container = this.network.body.container;
      let config = true;
      if (typeof this.actualOptions.configure === 'string') {
        config = this.actualOptions.configure;
      }
      else if (this.actualOptions.configure instanceof Array) {
        config = this.actualOptions.configure.join();
      }
      else if (typeof this.actualOptions.configure === 'object') {
        if (this.actualOptions.configure.container !== undefined) {
          this.container = this.actualOptions.configure.container;
        }
        if (this.actualOptions.configure.filter !== undefined) {
          config = this.actualOptions.configure.filter;
        }
      }
      else if (typeof this.actualOptions.configure === 'boolean') {
        config = this.actualOptions.configure;
      }

      if (config !== false) {
        this._create(config);
      }
    }
  }

  /**
   * Create all DOM elements
   * @param {Boolean | String} config
   * @private
   */
  _create(config) {
    this._clean();
    this.changedOptions = [];

    let counter = 0;
    for (let option in this.possibleOptions) {
      if (this.possibleOptions.hasOwnProperty(option)) {
        if (config === true || config.indexOf(option) !== -1) {
          let optionObj = this.possibleOptions[option];

          // linebreak between categories
          if (counter > 0) {
            this._makeItem([]);
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
    let generateButton = document.createElement('div');
    generateButton.className = 'vis-network-configuration button';
    generateButton.innerHTML = 'generate options';
    generateButton.onclick = () => {this._printOptions();};
    generateButton.onmouseover = () => {generateButton.className = 'vis-network-configuration button hover';};
    generateButton.onmouseout =  () => {generateButton.className = 'vis-network-configuration button';};

    this.optionsContainer = document.createElement('div');
    this.optionsContainer.className = 'vis-network-configuration vis-option-container';

    this.domElements.push(this.optionsContainer);
    this.domElements.push(generateButton);

    this._push();
    this.colorPicker.insertTo(this.container);
  }


  /**
   * draw all DOM elements on the screen
   * @private
   */
  _push() {
    for (var i = 0; i < this.domElements.length; i++) {
      this.container.appendChild(this.domElements[i]);
    }
  }

  /**
   * delete all DOM elements
   * @private
   */
  _clean() {
    for (var i = 0; i < this.domElements.length; i++) {
      this.container.removeChild(this.domElements[i]);
    }
    this.domElements = [];
  }

  /**
   * get the value from the actualOptions if it exists
   * @param {array} path    | where to look for the actual option
   * @returns {*}
   * @private
   */
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


  /**
   * Copy the path and add a step. It needs to copy because the path will keep stacking otherwise.
   * @param path
   * @param newValue
   * @returns {Array}
   * @private
   */
  _addToPath(path, newValue) {
    let newPath = [];
    for (let i = 0; i < path.length; i++) {
      newPath.push(path[i]);
    }
    newPath.push(newValue);
    return newPath;
  }

  /**
   * all option elements are wrapped in an item
   * @param path
   * @param domElements
   * @private
   */
  _makeItem(path,...domElements) {
    let item = document.createElement('div');
    item.className = 'vis-network-configuration item s' + path.length;
    domElements.forEach((element) => {
      item.appendChild(element);
    });
    this.domElements.push(item);
  }

  /**
   * header for major subjects
   * @param name
   * @private
   */
  _makeHeader(name) {
    let div = document.createElement('div');
    div.className = 'vis-network-configuration header';
    div.innerHTML = name;
    this._makeItem([],div);
  }

  /**
   * make a label, if it is an object label, it gets different styling.
   * @param name
   * @param path
   * @param objectLabel
   * @returns {HTMLElement}
   * @private
   */
  _makeLabel(name, path, objectLabel = false) {
    let div = document.createElement('div');
    div.className = 'vis-network-configuration label s' + path.length;
    if (objectLabel === true) {
      div.innerHTML = '<i><b>' + name + ':</b></i>';
    }
    else {
      div.innerHTML = name + ':';
    }
    return div;
  }


  /**
   * make a dropdown list for multiple possible string optoins
   * @param arr
   * @param value
   * @param path
   * @private
   */
  _makeDropdown(arr, value, path) {
    let select = document.createElement('select');
    select.className = 'vis-network-configuration select';
    let selectedValue = 0;
    if (value !== undefined) {
      if (arr.indexOf(value) !== -1) {
        selectedValue = arr.indexOf(value);
      }
    }

    for (let i = 0; i < arr.length; i++) {
      let option = document.createElement('option');
      option.value = arr[i];
      if (i === selectedValue) {
        option.selected = 'selected';
      }
      option.innerHTML = arr[i];
      select.appendChild(option);
    }

    let me = this;
    select.onchange = function () {me._update(this.value, path);};

    let label = this._makeLabel(path[path.length-1], path);
    this._makeItem(path, label, select);
  }


  /**
   * make a range object for numeric options
   * @param arr
   * @param value
   * @param path
   * @private
   */
  _makeRange(arr, value, path) {
    let defaultValue = arr[0];
    let min = arr[1];
    let max = arr[2];
    let step = arr[3];
    let range = document.createElement('input');
    range.type = 'range';
    range.className = 'vis-network-configuration range';
    range.min = min;
    range.max = max;
    range.step = step;

    if (value !== undefined) {
      if (value * 0.1 < min) {
        range.min = value / 10;
      }
      if (value * 2 > max && max !== 1) {
        range.max = value * 2;
      }
      range.value = value;
    }
    else {
      range.value = defaultValue;
    }

    let input = document.createElement('input');
    input.className = 'vis-network-configuration rangeinput';
    input.value = range.value;

    var me = this;
    range.onchange = function () {input.value = this.value; me._update(this.value, path);};
    range.oninput  = function () {input.value = this.value; };

    let label = this._makeLabel(path[path.length-1], path);
    this._makeItem(path, label, range, input);
  }


  /**
   * make a checkbox for boolean options.
   * @param defaultValue
   * @param value
   * @param path
   * @private
   */
  _makeCheckbox(defaultValue, value, path) {
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'vis-network-configuration checkbox';
    checkbox.checked = defaultValue;
    if (value !== undefined) {
      checkbox.checked = value;
      if (value !== defaultValue) {
        if (typeof defaultValue === 'object') {
          if (value !== defaultValue.enabled) {
            this.changedOptions.push({path:path, value:value});
          }
        }
        else {
          this.changedOptions.push({path:path, value:value});
        }
      }
    }

    let me = this;
    checkbox.onchange = function() {me._update(this.checked, path)};

    let label = this._makeLabel(path[path.length-1], path);
    this._makeItem(path, label, checkbox);
  }


  /**
   * make a color field with a color picker for color fields
   * @param arr
   * @param value
   * @param path
   * @private
   */
  _makeColorField(arr, value, path) {
    let defaultColor = arr[1];
    let div = document.createElement('div');
    value = value === undefined ? defaultColor : value;

    if (value !== 'none') {
      div.className = 'vis-network-configuration colorBlock';
      div.style.backgroundColor = value;
    }
    else {
      div.className = 'vis-network-configuration colorBlock none';
    }

    value = value === undefined ? defaultColor : value;
    div.onclick = () => {
      this._showColorPicker(value,div,path);
    }

    let label = this._makeLabel(path[path.length-1], path);
    this._makeItem(path,label, div);
  }


  /**
   * used by the color buttons to call the color picker.
   * @param event
   * @param value
   * @param div
   * @param path
   * @private
   */
  _showColorPicker(value, div, path) {
    let rect = div.getBoundingClientRect();
    let bodyRect = document.body.getBoundingClientRect();
    let pickerX = rect.left + rect.width + 5;
    let pickerY = rect.top - bodyRect.top + rect.height*0.5;
    this.colorPicker.show(pickerX,pickerY);
    this.colorPicker.setColor(value);
    this.colorPicker.setCallback((color) => {
      let colorString = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + color.a + ')';
      div.style.backgroundColor = colorString;
      this._update(colorString,path);
    })
  }


  /**
   * parse an object and draw the correct items
   * @param obj
   * @param path
   * @private
   */
  _handleObject(obj, path = []) {
    for (let subObj in obj) {
      if (obj.hasOwnProperty(subObj)) {
        let item = obj[subObj];
        let newPath = this._addToPath(path, subObj);
        let value = this._getValue(newPath);

        if (item instanceof Array) {
          this._handleArray(item, value, newPath);
        }
        else if (typeof item === 'string') {
          this._handleString(item, value, newPath);
        }
        else if (typeof item === 'boolean') {
          this._makeCheckbox(item, value, newPath);
        }
        else if (item instanceof Object) {
          // collapse the physics options that are not enabled
          let draw = true;
          if (path.indexOf('physics') !== -1) {
            if (this.actualOptions.physics.solver !== subObj) {
              draw = false;
            }
          }

          if (draw === true) {
            // initially collapse options with an disabled enabled option.
            if (item.enabled !== undefined) {
              let enabledPath = this._addToPath(newPath, 'enabled');
              let enabledValue = this._getValue(enabledPath);
              if (enabledValue === true) {
                let label = this._makeLabel(subObj, newPath, true);
                this._makeItem(newPath, label);
                this._handleObject(item, newPath);
              }
              else {
                this._makeCheckbox(item, enabledValue, newPath);
              }
            }
            else {
              let label = this._makeLabel(subObj, newPath, true);
              this._makeItem(newPath, label);
              this._handleObject(item, newPath);
            }
          }
        }
        else {
          console.error('dont know how to handle', item, subObj, newPath);
        }
      }
    }
  }


  /**
   * handle the array type of option
   * @param optionName
   * @param arr
   * @param value
   * @param path
   * @private
   */
  _handleArray(arr, value, path) {
    if (typeof arr[0] === 'string' && arr[0] === 'color') {
      this._makeColorField(arr, value, path);
      if (arr[1] !== value) {this.changedOptions.push({path:path, value:value});}
    }
    else if (typeof arr[0] === 'string') {
      this._makeDropdown(arr, value, path);
      if (arr[0] !== value) {this.changedOptions.push({path:path, value:value});}
    }
    else if (typeof arr[0] === 'number') {
      this._makeRange(arr, value, path);
      if (arr[0] !== value) {this.changedOptions.push({path:path, value:value});}
    }
  }



  /**
   * called to update the network with the new settings.
   * @param value
   * @param path
   * @private
   */
  _update(value, path) {
    let options = this._constructOptions(value,path);
    this.network.setOptions(options);
  }

  _constructOptions(value,path, optionsObj = {}) {
    let pointer = optionsObj;
    value = value === 'true' ? true : value;
    value = value === 'false' ? false : value;
    for (let i = 0; i < path.length; i++) {
      if (pointer[path[i]] === undefined) {
        pointer[path[i]] = {};
      }
      if (i !== path.length -1) {
        pointer = pointer[path[i]];
      }
      else {
        pointer[path[i]] = value;
      }
    }
    return optionsObj;
  }

  _printOptions() {
    let options = {};
    for (var i = 0; i < this.changedOptions.length; i++) {
      this._constructOptions(this.changedOptions[i].value, this.changedOptions[i].path, options)
    }
    this.optionsContainer.innerHTML = '<pre>var options = ' + JSON.stringify(options, null, 2) + '</pre>';
  }
}


export default ConfigurationSystem;