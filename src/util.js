/**
 * utility functions
 */
var util = {};

/**
 * Test whether given object is a number
 * @param {*} object
 * @return {Boolean} isNumber
 */
util.isNumber = function isNumber(object) {
  return (object instanceof Number || typeof object == 'number');
};

/**
 * Test whether given object is a string
 * @param {*} object
 * @return {Boolean} isString
 */
util.isString = function isString(object) {
  return (object instanceof String || typeof object == 'string');
};

/**
 * Test whether given object is a Date, or a String containing a Date
 * @param {Date | String} object
 * @return {Boolean} isDate
 */
util.isDate = function isDate(object) {
  if (object instanceof Date) {
    return true;
  }
  else if (util.isString(object)) {
    // test whether this string contains a date
    var match = ASPDateRegex.exec(object);
    if (match) {
      return true;
    }
    else if (!isNaN(Date.parse(object))) {
      return true;
    }
  }

  return false;
};

/**
 * Test whether given object is an instance of google.visualization.DataTable
 * @param {*} object
 * @return {Boolean} isDataTable
 */
util.isDataTable = function isDataTable(object) {
  return (typeof (google) !== 'undefined') &&
      (google.visualization) &&
      (google.visualization.DataTable) &&
      (object instanceof google.visualization.DataTable);
};

/**
 * Create a semi UUID
 * source: http://stackoverflow.com/a/105074/1262753
 * @return {String} uuid
 */
util.randomUUID = function randomUUID () {
  var S4 = function () {
    return Math.floor(
        Math.random() * 0x10000 /* 65536 */
    ).toString(16);
  };

  return (
      S4() + S4() + '-' +
          S4() + '-' +
          S4() + '-' +
          S4() + '-' +
          S4() + S4() + S4()
      );
};

/**
 * Extend object a with the properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Object} a
 * @param {... Object} b
 * @return {Object} a
 */
util.extend = function (a, b) {
  for (var i = 1, len = arguments.length; i < len; i++) {
    var other = arguments[i];
    for (var prop in other) {
      if (other.hasOwnProperty(prop) && other[prop] !== undefined) {
        a[prop] = other[prop];
      }
    }
  }

  return a;
};

/**
 * Convert an object to another type
 * @param {Boolean | Number | String | Date | Moment | Null | undefined} object
 * @param {String | undefined} type   Name of the type. Available types:
 *                                    'Boolean', 'Number', 'String',
 *                                    'Date', 'Moment', ISODate', 'ASPDate'.
 * @return {*} object
 * @throws Error
 */
util.convert = function convert(object, type) {
  var match;

  if (object === undefined) {
    return undefined;
  }
  if (object === null) {
    return null;
  }

  if (!type) {
    return object;
  }
  if (!(typeof type === 'string') && !(type instanceof String)) {
    throw new Error('Type must be a string');
  }

  //noinspection FallthroughInSwitchStatementJS
  switch (type) {
    case 'boolean':
    case 'Boolean':
      return Boolean(object);

    case 'number':
    case 'Number':
      return Number(object.valueOf());

    case 'string':
    case 'String':
      return String(object);

    case 'Date':
      if (util.isNumber(object)) {
        return new Date(object);
      }
      if (object instanceof Date) {
        return new Date(object.valueOf());
      }
      else if (moment.isMoment(object)) {
        return new Date(object.valueOf());
      }
      if (util.isString(object)) {
        match = ASPDateRegex.exec(object);
        if (match) {
          // object is an ASP date
          return new Date(Number(match[1])); // parse number
        }
        else {
          return moment(object).toDate(); // parse string
        }
      }
      else {
        throw new Error(
            'Cannot convert object of type ' + util.getType(object) +
                ' to type Date');
      }

    case 'Moment':
      if (util.isNumber(object)) {
        return moment(object);
      }
      if (object instanceof Date) {
        return moment(object.valueOf());
      }
      else if (moment.isMoment(object)) {
        return moment(object);
      }
      if (util.isString(object)) {
        match = ASPDateRegex.exec(object);
        if (match) {
          // object is an ASP date
          return moment(Number(match[1])); // parse number
        }
        else {
          return moment(object); // parse string
        }
      }
      else {
        throw new Error(
            'Cannot convert object of type ' + util.getType(object) +
                ' to type Date');
      }

    case 'ISODate':
      if (util.isNumber(object)) {
        return new Date(object);
      }
      else if (object instanceof Date) {
        return object.toISOString();
      }
      else if (moment.isMoment(object)) {
        return object.toDate().toISOString();
      }
      else if (util.isString(object)) {
        match = ASPDateRegex.exec(object);
        if (match) {
          // object is an ASP date
          return new Date(Number(match[1])).toISOString(); // parse number
        }
        else {
          return new Date(object).toISOString(); // parse string
        }
      }
      else {
        throw new Error(
            'Cannot convert object of type ' + util.getType(object) +
                ' to type ISODate');
      }

    case 'ASPDate':
      if (util.isNumber(object)) {
        return '/Date(' + object + ')/';
      }
      else if (object instanceof Date) {
        return '/Date(' + object.valueOf() + ')/';
      }
      else if (util.isString(object)) {
        match = ASPDateRegex.exec(object);
        var value;
        if (match) {
          // object is an ASP date
          value = new Date(Number(match[1])).valueOf(); // parse number
        }
        else {
          value = new Date(object).valueOf(); // parse string
        }
        return '/Date(' + value + ')/';
      }
      else {
        throw new Error(
            'Cannot convert object of type ' + util.getType(object) +
                ' to type ASPDate');
      }

    default:
      throw new Error('Cannot convert object of type ' + util.getType(object) +
          ' to type "' + type + '"');
  }
};

// parse ASP.Net Date pattern,
// for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
// code from http://momentjs.com/
var ASPDateRegex = /^\/?Date\((\-?\d+)/i;

/**
 * Get the type of an object, for example util.getType([]) returns 'Array'
 * @param {*} object
 * @return {String} type
 */
util.getType = function getType(object) {
  var type = typeof object;

  if (type == 'object') {
    if (object == null) {
      return 'null';
    }
    if (object instanceof Boolean) {
      return 'Boolean';
    }
    if (object instanceof Number) {
      return 'Number';
    }
    if (object instanceof String) {
      return 'String';
    }
    if (object instanceof Array) {
      return 'Array';
    }
    if (object instanceof Date) {
      return 'Date';
    }
    return 'Object';
  }
  else if (type == 'number') {
    return 'Number';
  }
  else if (type == 'boolean') {
    return 'Boolean';
  }
  else if (type == 'string') {
    return 'String';
  }

  return type;
};

/**
 * Retrieve the absolute left value of a DOM element
 * @param {Element} elem        A dom element, for example a div
 * @return {number} left        The absolute left position of this element
 *                              in the browser page.
 */
util.getAbsoluteLeft = function getAbsoluteLeft (elem) {
  var doc = document.documentElement;
  var body = document.body;

  var left = elem.offsetLeft;
  var e = elem.offsetParent;
  while (e != null && e != body && e != doc) {
    left += e.offsetLeft;
    left -= e.scrollLeft;
    e = e.offsetParent;
  }
  return left;
};

/**
 * Retrieve the absolute top value of a DOM element
 * @param {Element} elem        A dom element, for example a div
 * @return {number} top        The absolute top position of this element
 *                              in the browser page.
 */
util.getAbsoluteTop = function getAbsoluteTop (elem) {
  var doc = document.documentElement;
  var body = document.body;

  var top = elem.offsetTop;
  var e = elem.offsetParent;
  while (e != null && e != body && e != doc) {
    top += e.offsetTop;
    top -= e.scrollTop;
    e = e.offsetParent;
  }
  return top;
};

/**
 * Get the absolute, vertical mouse position from an event.
 * @param {Event} event
 * @return {Number} pageY
 */
util.getPageY = function getPageY (event) {
  if ('pageY' in event) {
    return event.pageY;
  }
  else {
    var clientY;
    if (('targetTouches' in event) && event.targetTouches.length) {
      clientY = event.targetTouches[0].clientY;
    }
    else {
      clientY = event.clientY;
    }

    var doc = document.documentElement;
    var body = document.body;
    return clientY +
        ( doc && doc.scrollTop || body && body.scrollTop || 0 ) -
        ( doc && doc.clientTop || body && body.clientTop || 0 );
  }
};

/**
 * Get the absolute, horizontal mouse position from an event.
 * @param {Event} event
 * @return {Number} pageX
 */
util.getPageX = function getPageX (event) {
  if ('pageY' in event) {
    return event.pageX;
  }
  else {
    var clientX;
    if (('targetTouches' in event) && event.targetTouches.length) {
      clientX = event.targetTouches[0].clientX;
    }
    else {
      clientX = event.clientX;
    }

    var doc = document.documentElement;
    var body = document.body;
    return clientX +
        ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
        ( doc && doc.clientLeft || body && body.clientLeft || 0 );
  }
};

/**
 * add a className to the given elements style
 * @param {Element} elem
 * @param {String} className
 */
util.addClassName = function addClassName(elem, className) {
  var classes = elem.className.split(' ');
  if (classes.indexOf(className) == -1) {
    classes.push(className); // add the class to the array
    elem.className = classes.join(' ');
  }
};

/**
 * add a className to the given elements style
 * @param {Element} elem
 * @param {String} className
 */
util.removeClassName = function removeClassname(elem, className) {
  var classes = elem.className.split(' ');
  var index = classes.indexOf(className);
  if (index != -1) {
    classes.splice(index, 1); // remove the class from the array
    elem.className = classes.join(' ');
  }
};

/**
 * For each method for both arrays and objects.
 * In case of an array, the built-in Array.forEach() is applied.
 * In case of an Object, the method loops over all properties of the object.
 * @param {Object | Array} object   An Object or Array
 * @param {function} callback       Callback method, called for each item in
 *                                  the object or array with three parameters:
 *                                  callback(value, index, object)
 */
util.forEach = function forEach (object, callback) {
  var i,
      len;
  if (object instanceof Array) {
    // array
    for (i = 0, len = object.length; i < len; i++) {
      callback(object[i], i, object);
    }
  }
  else {
    // object
    for (i in object) {
      if (object.hasOwnProperty(i)) {
        callback(object[i], i, object);
      }
    }
  }
};

/**
 * Update a property in an object
 * @param {Object} object
 * @param {String} key
 * @param {*} value
 * @return {Boolean} changed
 */
util.updateProperty = function updateProp (object, key, value) {
  if (object[key] !== value) {
    object[key] = value;
    return true;
  }
  else {
    return false;
  }
};

/**
 * Add and event listener. Works for all browsers
 * @param {Element}     element    An html element
 * @param {string}      action     The action, for example "click",
 *                                 without the prefix "on"
 * @param {function}    listener   The callback function to be executed
 * @param {boolean}     [useCapture]
 */
util.addEventListener = function addEventListener(element, action, listener, useCapture) {
  if (element.addEventListener) {
    if (useCapture === undefined)
      useCapture = false;

    if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
      action = "DOMMouseScroll";  // For Firefox
    }

    element.addEventListener(action, listener, useCapture);
  } else {
    element.attachEvent("on" + action, listener);  // IE browsers
  }
};

/**
 * Remove an event listener from an element
 * @param {Element}     element         An html dom element
 * @param {string}      action          The name of the event, for example "mousedown"
 * @param {function}    listener        The listener function
 * @param {boolean}     [useCapture]
 */
util.removeEventListener = function removeEventListener(element, action, listener, useCapture) {
  if (element.removeEventListener) {
    // non-IE browsers
    if (useCapture === undefined)
      useCapture = false;

    if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
      action = "DOMMouseScroll";  // For Firefox
    }

    element.removeEventListener(action, listener, useCapture);
  } else {
    // IE browsers
    element.detachEvent("on" + action, listener);
  }
};


/**
 * Get HTML element which is the target of the event
 * @param {Event} event
 * @return {Element} target element
 */
util.getTarget = function getTarget(event) {
  // code from http://www.quirksmode.org/js/events_properties.html
  if (!event) {
    event = window.event;
  }

  var target;

  if (event.target) {
    target = event.target;
  }
  else if (event.srcElement) {
    target = event.srcElement;
  }

  if (target.nodeType != undefined && target.nodeType == 3) {
    // defeat Safari bug
    target = target.parentNode;
  }

  return target;
};

/**
 * Stop event propagation
 */
util.stopPropagation = function stopPropagation(event) {
  if (!event)
    event = window.event;

  if (event.stopPropagation) {
    event.stopPropagation();  // non-IE browsers
  }
  else {
    event.cancelBubble = true;  // IE browsers
  }
};

/**
 * Fake a hammer.js gesture. Event can be a ScrollEvent or MouseMoveEvent
 * @param {Element} element
 * @param {Event} event
 */
util.fakeGesture = function fakeGesture (element, event) {
  var eventType = null;

  // for hammer.js 1.0.5
  return Hammer.event.collectEventData(this, eventType, event);

  // for hammer.js 1.0.6
  //var touches = Hammer.event.getTouchList(event, eventType);
  //return Hammer.event.collectEventData(this, eventType, touches, event);
};

/**
 * Cancels the event if it is cancelable, without stopping further propagation of the event.
 */
util.preventDefault = function preventDefault (event) {
  if (!event)
    event = window.event;

  if (event.preventDefault) {
    event.preventDefault();  // non-IE browsers
  }
  else {
    event.returnValue = false;  // IE browsers
  }
};


util.option = {};

/**
 * Convert a value into a boolean
 * @param {Boolean | function | undefined} value
 * @param {Boolean} [defaultValue]
 * @returns {Boolean} bool
 */
util.option.asBoolean = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (value != null) {
    return (value != false);
  }

  return defaultValue || null;
};

/**
 * Convert a value into a number
 * @param {Boolean | function | undefined} value
 * @param {Number} [defaultValue]
 * @returns {Number} number
 */
util.option.asNumber = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (value != null) {
    return Number(value) || defaultValue || null;
  }

  return defaultValue || null;
};

/**
 * Convert a value into a string
 * @param {String | function | undefined} value
 * @param {String} [defaultValue]
 * @returns {String} str
 */
util.option.asString = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (value != null) {
    return String(value);
  }

  return defaultValue || null;
};

/**
 * Convert a size or location into a string with pixels or a percentage
 * @param {String | Number | function | undefined} value
 * @param {String} [defaultValue]
 * @returns {String} size
 */
util.option.asSize = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  if (util.isString(value)) {
    return value;
  }
  else if (util.isNumber(value)) {
    return value + 'px';
  }
  else {
    return defaultValue || null;
  }
};

/**
 * Convert a value into a DOM element
 * @param {HTMLElement | function | undefined} value
 * @param {HTMLElement} [defaultValue]
 * @returns {HTMLElement | null} dom
 */
util.option.asElement = function (value, defaultValue) {
  if (typeof value == 'function') {
    value = value();
  }

  return value || defaultValue || null;
};



util.GiveDec = function GiveDec(Hex)
{
  if(Hex == "A")
    Value = 10;
  else
  if(Hex == "B")
    Value = 11;
  else
  if(Hex == "C")
    Value = 12;
  else
  if(Hex == "D")
    Value = 13;
  else
  if(Hex == "E")
    Value = 14;
  else
  if(Hex == "F")
    Value = 15;
  else
    Value = eval(Hex)
  return Value;
}

util.GiveHex = function GiveHex(Dec)
{
  if(Dec == 10)
    Value = "A";
  else
  if(Dec == 11)
    Value = "B";
  else
  if(Dec == 12)
    Value = "C";
  else
  if(Dec == 13)
    Value = "D";
  else
  if(Dec == 14)
    Value = "E";
  else
  if(Dec == 15)
    Value = "F";
  else
    Value = "" + Dec;
  return Value;
}

/**
 * http://www.yellowpipe.com/yis/tools/hex-to-rgb/color-converter.php
 *
 * @param {String} hex
 * @returns {{r: *, g: *, b: *}}
 */
util.hexToRGB = function hexToRGB(hex) {
  hex = hex.replace("#","").toUpperCase();

  var a = util.GiveDec(hex.substring(0, 1));
  var b = util.GiveDec(hex.substring(1, 2));
  var c = util.GiveDec(hex.substring(2, 3));
  var d = util.GiveDec(hex.substring(3, 4));
  var e = util.GiveDec(hex.substring(4, 5));
  var f = util.GiveDec(hex.substring(5, 6));

  var r = (a * 16) + b;
  var g = (c * 16) + d;
  var b = (e * 16) + f;

  return {r:r,g:g,b:b};
};

util.RGBToHex = function RGBToHex(red,green,blue) {
  var a = util.GiveHex(Math.floor(red / 16));
  var b = util.GiveHex(red % 16);
  var c = util.GiveHex(Math.floor(green / 16));
  var d = util.GiveHex(green % 16);
  var e = util.GiveHex(Math.floor(blue / 16));
  var f = util.GiveHex(blue % 16);

  var hex = a + b + c + d + e + f;
  return "#" + hex;
};


/**
 * http://www.javascripter.net/faq/rgb2hsv.htm
 *
 * @param red
 * @param green
 * @param blue
 * @returns {*}
 * @constructor
 */
util.RGBToHSV = function  RGBToHSV (red,green,blue) {
  red=red/255; green=green/255; blue=blue/255;
  var minRGB = Math.min(red,Math.min(green,blue));
  var maxRGB = Math.max(red,Math.max(green,blue));

  // Black-gray-white
  if (minRGB == maxRGB) {
    return {h:0,s:0,v:minRGB};
  }

  // Colors other than black-gray-white:
  var d = (red==minRGB) ? green-blue : ((blue==minRGB) ? red-green : blue-red);
  var h = (red==minRGB) ? 3 : ((blue==minRGB) ? 1 : 5);
  var hue = 60*(h - d/(maxRGB - minRGB))/360;
  var saturation = (maxRGB - minRGB)/maxRGB;
  var value = maxRGB;
  return {h:hue,s:saturation,v:value};
};


/**
 * https://gist.github.com/mjijackson/5311256
 * @param hue
 * @param saturation
 * @param value
 * @returns {{r: number, g: number, b: number}}
 * @constructor
 */
util.HSVToRGB = function HSVToRGB(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return {r:Math.floor(r * 255), g:Math.floor(g * 255), b:Math.floor(b * 255) };
};

util.HSVToHex = function HSVToHex(h,s,v) {
  var rgb = util.HSVToRGB(h,s,v);
  return util.RGBToHex(rgb.r,rgb.g,rgb.b);
}

util.hexToHSV = function hexToHSV(hex) {
  var rgb = util.hexToRGB(hex);
  return util.RGBToHSV(rgb.r,rgb.g,rgb.b);
}

util.isValidHex = function isValidHex(hex) {
  var isOk  = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex);
  return isOk;
}
