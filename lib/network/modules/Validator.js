var util = require('../../util');

let errorFound = false;
let printStyle = 'background: #FFeeee; color: #dd0000';
/**
 *  Used to validate options.
 */
class Validator {
  constructor() {
  }

  /**
   * Main function to be called
   * @param options
   * @param subObject
   * @returns {boolean}
   */
  static validate(options, referenceOptions, subObject) {
    errorFound = false;
    let usedOptions = referenceOptions;
    if (subObject !== undefined) {
      usedOptions = referenceOptions[subObject];
    }
    Validator.parse(options, usedOptions, []);
    return errorFound;
  }


  /**
   * Will traverse an object recursively and check every value
   * @param options
   * @param referenceOptions
   * @param path
   */
  static parse(options, referenceOptions, path) {
    for (let option in options) {
      if (options.hasOwnProperty(option)) {
        Validator.check(option, options, referenceOptions, path);
      }
    }
  }


  /**
   * Check every value. If the value is an object, call the parse function on that object.
   * @param option
   * @param options
   * @param referenceOptions
   * @param path
   */
  static check(option, options, referenceOptions, path) {
    if (referenceOptions[option] === undefined && referenceOptions.__any__ === undefined) {
      Validator.getSuggestion(option, referenceOptions, path);
    }
    else if (referenceOptions[option] === undefined && referenceOptions.__any__ !== undefined) {
      // __any__ is a wildcard. Any value is accepted and will be further analysed by reference.
      if (Validator.getType(options[option]) === 'object') {
        util.copyAndExtendArray(path, option);
        Validator.checkFields(option, options, referenceOptions, '__any__', referenceOptions['__any__'].__type__, path, true);
      }
    }
    else {
      // Since all options in the reference are objects, we can check whether they are supposed to be object to look for the __type__ field.
      if (referenceOptions[option].__type__ !== undefined) {
        util.copyAndExtendArray(path, option);
        // if this should be an object, we check if the correct type has been supplied to account for shorthand options.
        Validator.checkFields(option, options, referenceOptions, option, referenceOptions[option].__type__, path, true);
      }
      else {
        Validator.checkFields(option, options, referenceOptions, option, referenceOptions[option], path, false);
      }
    }
  }

  /**
   *
   * @param {String} option     | the option property
   * @param {Object} options    | The supplied options object
   * @param {Object} referenceOptions    | The reference options containing all options and their allowed formats
   * @param {String} referenceOption     | Usually this is the same as option, except when handling an __any__ tag.
   * @param {String} refOptionType       | This is the type object from the reference options
   * @param path
   * @param recursive
   */
  static checkFields(option, options, referenceOptions, referenceOption, refOptionObj, path, recursive) {
    let optionType = Validator.getType(options[option]);
    let refOptionType = refOptionObj[optionType];
    if (refOptionType !== undefined) {
      // if the type is correct, we check if it is supposed to be one of a few select values
      if (Validator.getType(refOptionType) === 'array') {
        if (refOptionType.indexOf(options[option]) === -1) {
          console.log('%cInvalid option detected in "' + option + '".' +
            ' Allowed values are:' + Validator.print(refOptionType) + ' not "' + options[option] + '". ' + Validator.printLocation(path, option), printStyle);
          errorFound = true;
        }
        else if (recursive === true) {
          Validator.parse(options[option], referenceOptions[referenceOption], path);
        }
      }
      else if (recursive === true) {
        Validator.parse(options[option], referenceOptions[referenceOption], path);
      }
    }
    else {
      // type of the field is incorrect
      console.log('%cInvalid type received for "' + option + '". Expected: ' + Validator.print(Object.keys(referenceOptions[referenceOption].__type__)) + '. Received [' + optionType + '] "' + options[option] + '"' + Validator.printLocation(path, option), printStyle);
      errorFound = true;
    }
  }


  static getType(object) {
    var type = typeof object;

    if (type === 'object') {
      if (object === null) {
        return 'null';
      }
      if (object instanceof Boolean) {
        return 'boolean';
      }
      if (object instanceof Number) {
        return 'number';
      }
      if (object instanceof String) {
        return 'string';
      }
      if (Array.isArray(object)) {
        return 'array';
      }
      if (object instanceof Date) {
        return 'date';
      }
      if (object.nodeType !== undefined) {
        return 'dom'
      }
      return 'object';
    }
    else if (type === 'number') {
      return 'number';
    }
    else if (type === 'boolean') {
      return 'boolean';
    }
    else if (type === 'string') {
      return 'string';
    }
    else if (type === undefined) {
      return 'undefined';
    }
    return type;
  }

  static getSuggestion(option, options, path) {
    let closestMatch = '';
    let min = 1e9;
    let threshold = 10;
    for (let op in options) {
      let distance = Validator.levenshteinDistance(option, op);
      if (min > distance && distance < threshold) {
        closestMatch = op;
        min = distance;

      }
    }

    if (min < threshold) {
      console.log('%cUnknown option detected: "' + option + '". Did you mean "' + closestMatch + '"?' + Validator.printLocation(path, option), printStyle);
    }
    else {
      console.log('%cUnknown option detected: "' + option + '". Did you mean one of these: ' + Validator.print(Object.keys(options)) + Validator.printLocation(path, option), printStyle);
    }

    errorFound = true;
    return closestMatch;
  }

  static printLocation(path, option) {
    let str = '\n\nProblem value found at: \noptions = {\n';
    for (let i = 0; i < path.length; i++) {
      for (let j = 0; j < i + 1; j++) {
        str += '  ';
      }
      str += path[i] + ': {\n'
    }
    for (let j = 0; j < path.length + 1; j++) {
      str += '  ';
    }
    str += option + '\n';
    for (let i = 0; i < path.length + 1; i++) {
      for (let j = 0; j < path.length - i; j++) {
        str += '  ';
      }
      str += '}\n'
    }
    return str + '\n\n';
  }

  static print(options) {
    return JSON.stringify(options).replace(/(\")|(\[)|(\])|(,"__type__")/g, "").replace(/(\,)/g, ', ')
  }


  // Compute the edit distance between the two given strings
  // http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#JavaScript
  /*
   Copyright (c) 2011 Andrei Mackenzie

   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
   */
  static levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    var matrix = [];

    // increment along the first column of each row
    var i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // increment each column in the first row
    var j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
            Math.min(matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1)); // deletion
        }
      }
    }

    return matrix[b.length][a.length];
  }

;
}


export default Validator;
export {printStyle}