var util = require('../util');

import ColorPicker from './ColorPicker'

/**
 * The way this works is for all properties of this.possible options, you can supply the property name in any form to list the options.
 * Boolean options are recognised as Boolean
 * Number options should be written as array: [default value, min value, max value, stepsize]
 * Colors should be written as array: ['color', '#ffffff']
 * Strings with should be written as array: [option1, option2, option3, ..]
 *
 * The options are matched with their counterparts in each of the modules and the values used in the configuration are
 *
 * @param parentModule        | the location where parentModule.setOptions() can be called
 * @param defaultContainer    | the default container of the module
 * @param configureOptions    | the fully configured and predefined options set found in allOptions.js
 * @param pixelRatio          | canvas pixel ratio
 */
class Configurator {
  constructor(parentModule, defaultContainer, configureOptions, pixelRatio = 1) {
    this.parent = parentModule;
    this.changedOptions = [];
    this.container = defaultContainer;
    this.allowCreation = false;

    this.options = {};
    this.defaultOptions = {
      enabled: false,
      filter: true,
      container: undefined,
      showButton: true
    };
    util.extend(this.options, this.defaultOptions);

    this.configureOptions = configureOptions;
    this.moduleOptions = {};
    this.domElements = [];
    this.colorPicker = new ColorPicker(pixelRatio);
    this.wrapper = undefined;
  }


  /**
   * refresh all options.
   * Because all modules parse their options by themselves, we just use their options. We copy them here.
   *
   * @param options
   */
  setOptions(options) {
    if (options !== undefined) {
      let enabled = true;
      if (typeof options === 'string') {
        this.options.filter = options;
      }
      else if (options instanceof Array) {
        this.options.filter = options.join();
      }
      else if (typeof options === 'object') {
        if (options.container !== undefined) {
          this.options.container = options.container;
        }
        if (options.filter !== undefined) {
          this.options.filter = options.filter;
        }
        if (options.showButton !== undefined) {
          this.options.showButton = options.showButton;
        }
        if (options.enabled !== undefined) {
          enabled = options.enabled;
        }
      }
      else if (typeof options === 'boolean') {
        this.options.filter = true;
        enabled = options;
      }
      else if (typeof options === 'function') {
        this.options.filter = options;
        enabled = true;
      }
      if (this.options.filter === false) {
        enabled = false;
      }

      this.options.enabled = enabled;
    }
    this._clean();
  }


  setModuleOptions(moduleOptions) {
    this.moduleOptions = moduleOptions;
    if (this.options.enabled === true) {
      this._clean();
      if (this.options.container !== undefined) {
        this.container = this.options.container;
      }
      this._create();
    }
  }

  /**
   * Create all DOM elements
   * @private
   */
  _create() {
    this._clean();
    this.changedOptions = [];

    let filter = this.options.filter;
    let counter = 0;
    let show = false;
    for (let option in this.configureOptions) {
      if (this.configureOptions.hasOwnProperty(option)) {
        this.allowCreation = false;
        show = false;
        if (typeof filter === 'function') {
          show = filter(option,[]);
          show = show || this._handleObject(this.configureOptions[option], [option], true);
        }
        else if (filter === true || filter.indexOf(option) !== -1) {
          show = true;
        }

        if (show !== false) {
          this.allowCreation = true;

          // linebreak between categories
          if (counter > 0) {
            this._makeItem([]);
          }
          // a header for the category
          this._makeHeader(option);

          // get the suboptions
          this._handleObject(this.configureOptions[option], [option]);
        }
        counter++;
      }
    }

    if (this.options.showButton === true) {
      let generateButton = document.createElement('div');
      generateButton.className = 'vis-network-configuration button';
      generateButton.innerHTML = 'generate options';
      generateButton.onclick =     () => {this._printOptions();};
      generateButton.onmouseover = () => {generateButton.className = 'vis-network-configuration button hover';};
      generateButton.onmouseout =  () => {generateButton.className = 'vis-network-configuration button';};

      this.optionsContainer = document.createElement('div');
      this.optionsContainer.className = 'vis-network-configuration vis-option-container';

      this.domElements.push(this.optionsContainer);
      this.domElements.push(generateButton);
    }

    this._push();
    this.colorPicker.insertTo(this.container);
  }


  /**
   * draw all DOM elements on the screen
   * @private
   */
  _push() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'vis-network-configuration-wrapper';
    this.container.appendChild(this.wrapper);
    for (var i = 0; i < this.domElements.length; i++) {
      this.wrapper.appendChild(this.domElements[i]);
    }
  }


  /**
   * delete all DOM elements
   * @private
   */
  _clean() {
    for (var i = 0; i < this.domElements.length; i++) {
      this.wrapper.removeChild(this.domElements[i]);
    }

    if (this.wrapper !== undefined) {
      this.container.removeChild(this.wrapper);
      this.wrapper = undefined;
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
    let base = this.moduleOptions;
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
   * all option elements are wrapped in an item
   * @param path
   * @param domElements
   * @private
   */
  _makeItem(path, ...domElements) {
    if (this.allowCreation === true) {
      let item = document.createElement('div');
      item.className = 'vis-network-configuration item s' + path.length;
      domElements.forEach((element) => {
        item.appendChild(element);
      });
      this.domElements.push(item);
    }
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
    range.className = 'vis-network-configuration range';
    try {
      range.type = 'range'; // not supported on IE9
      range.min = min;
      range.max = max;
    }
    catch (err) {}
    range.step = step;

    if (value !== undefined) {
      if (value < 0 && value * 2 < min) {
        range.min = value*2;
      }
      else if (value * 0.1 < min) {
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
    range.onchange = function () {input.value = this.value; me._update(Number(this.value), path);};
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
   * make a text input field for string options.
   * @param defaultValue
   * @param value
   * @param path
   * @private
   */
  _makeTextInput(defaultValue, value, path) {
    var checkbox = document.createElement('input');
    checkbox.type = 'text';
    checkbox.className = 'vis-network-configuration text';
    checkbox.value = value;
    if (value !== defaultValue) {
      this.changedOptions.push({path:path, value:value});
    }

    let me = this;
    checkbox.onchange = function() {me._update(this.value, path)};

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
    };

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
  _handleObject(obj, path = [], checkOnly = false) {
    let show = false;
    let filter = this.options.filter;
    let visibleInSet = false;
    for (let subObj in obj) {
      if (obj.hasOwnProperty(subObj)) {
        show = true;
        let item = obj[subObj];
        let newPath = util.copyAndExtendArray(path, subObj);
        if (typeof filter === 'function') {
          show = filter(subObj,path);

          // if needed we must go deeper into the object.
          if (show === false) {
            if (!(item instanceof Array) && typeof item !== 'string' && typeof item !== 'boolean' && item instanceof Object) {
              this.allowCreation = false;
              show = this._handleObject(item, newPath, true);
              this.allowCreation = checkOnly === false;
            }
          }
        }

        if (show !== false) {
          visibleInSet = true;
          let value = this._getValue(newPath);

          if (item instanceof Array) {
            this._handleArray(item, value, newPath);
          }
          else if (typeof item === 'string') {
            this._makeTextInput(item, value, newPath);
          }
          else if (typeof item === 'boolean') {
            this._makeCheckbox(item, value, newPath);
          }
          else if (item instanceof Object) {
            // collapse the physics options that are not enabled
            let draw = true;
            if (path.indexOf('physics') !== -1) {
              if (this.moduleOptions.physics.solver !== subObj) {
                draw = false;
              }
            }

            if (draw === true) {
              // initially collapse options with an disabled enabled option.
              if (item.enabled !== undefined) {
                let enabledPath = util.copyAndExtendArray(newPath, 'enabled');
                let enabledValue = this._getValue(enabledPath);
                if (enabledValue === true) {
                  let label = this._makeLabel(subObj, newPath, true);
                  this._makeItem(newPath, label);
                  visibleInSet = this._handleObject(item, newPath) || visibleInSet;
                }
                else {
                  this._makeCheckbox(item, enabledValue, newPath);
                }
              }
              else {
                let label = this._makeLabel(subObj, newPath, true);
                this._makeItem(newPath, label);
                visibleInSet = this._handleObject(item, newPath) || visibleInSet;
              }
            }
          }
          else {
            console.error('dont know how to handle', item, subObj, newPath);
          }
        }
      }
    }
    return visibleInSet;
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
      if (arr[0] !== value) {this.changedOptions.push({path:path, value:Number(value)});}
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
    this.parent.setOptions(options);
  }

  _constructOptions(value, path, optionsObj = {}) {
    let pointer = optionsObj;

    // when dropdown boxes can be string or boolean, we typecast it into correct types
    value = value === 'true'  ? true  : value;
    value = value === 'false' ? false : value;

    for (let i = 0; i < path.length; i++) {
      if (path[i] !== 'global') {
        if (pointer[path[i]] === undefined) {
          pointer[path[i]] = {};
        }
        if (i !== path.length - 1) {
          pointer = pointer[path[i]];
        }
        else {
          pointer[path[i]] = value;
        }
      }
    }
    return optionsObj;
  }

  _printOptions() {
    let options = this.getOptions();
    this.optionsContainer.innerHTML = '<pre>var options = ' + JSON.stringify(options, null, 2) + '</pre>';
  }

  getOptions() {
    let options = {};
    for (var i = 0; i < this.changedOptions.length; i++) {
      this._constructOptions(this.changedOptions[i].value, this.changedOptions[i].path, options)
    }
    return options;
  }
}


export default Configurator;