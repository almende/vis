/**
 * vis.js
 * https://github.com/almende/vis
 *
 * A dynamic, browser-based visualization library.
 *
 * @version 0.0.9
 * @date    2013-06-11
 *
 * @license
 * Copyright (C) 2011-2013 Almende B.V, http://almende.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
(function(e){if("function"==typeof bootstrap)bootstrap("vis",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeVis=e}else"undefined"!=typeof window?window.vis=e():global.vis=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
(function(){/**
 * vis.js module imports
 */
var moment = require('moment');

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
 * Cast an object to another type
 * @param {Boolean | Number | String | Date | Moment | Null | undefined} object
 * @param {String | undefined} type   Name of the type. Available types:
 *                                    'Boolean', 'Number', 'String',
 *                                    'Date', 'Moment', ISODate', 'ASPDate'.
 * @return {*} object
 * @throws Error
 */
util.cast = function cast(object, type) {
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
            return Number(object);

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
                // parse ASP.Net Date pattern,
                // for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
                // code from http://momentjs.com/
                match = ASPDateRegex.exec(object);
                if (match) {
                    return new Date(Number(match[1])); // parse number
                }
                else {
                    return moment(object).toDate(); // parse string
                }
            }
            else {
                throw new Error(
                    'Cannot cast object of type ' + util.getType(object) +
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
                return moment.clone();
            }
            if (util.isString(object)) {
                // parse ASP.Net Date pattern,
                // for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
                // code from http://momentjs.com/
                match = ASPDateRegex.exec(object);
                if (match) {
                    return moment(Number(match[1])); // parse number
                }
                else {
                    return moment(object); // parse string
                }
            }
            else {
                throw new Error(
                    'Cannot cast object of type ' + util.getType(object) +
                        ' to type Date');
            }

        case 'ISODate':
            if (object instanceof Date) {
                return object.toISOString();
            }
            else if (moment.isMoment(object)) {
                return object.toDate().toISOString();
            }
            else if (util.isNumber(object) || util.isString(object)) {
                return moment(object).toDate().toISOString();
            }
            else {
                throw new Error(
                    'Cannot cast object of type ' + util.getType(object) +
                        ' to type ISODate');
            }

        case 'ASPDate':
            if (object instanceof Date) {
                return '/Date(' + object.valueOf() + ')/';
            }
            else if (util.isNumber(object) || util.isString(object)) {
                return '/Date(' + moment(object).valueOf() + ')/';
            }
            else {
                throw new Error(
                    'Cannot cast object of type ' + util.getType(object) +
                        ' to type ASPDate');
            }

        default:
            throw new Error('Cannot cast object of type ' + util.getType(object) +
                ' to type "' + type + '"');
    }
};

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
 * Cast a value as boolean
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
 * Cast a value as number
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
 * Cast a value as string
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
 * Cast a size or location in pixels or a percentage
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
 * Cast a value as DOM element
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

/**
 * load css from text
 * @param {String} css    Text containing css
 */
util.loadCss = function (css) {
    if (typeof document === 'undefined') {
        return;
    }

    // get the script location, and built the css file name from the js file name
    // http://stackoverflow.com/a/2161748/1262753
    // var scripts = document.getElementsByTagName('script');
    // var jsFile = scripts[scripts.length-1].src.split('?')[0];
    // var cssFile = jsFile.substring(0, jsFile.length - 2) + 'css';

    // inject css
    // http://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript
    var style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    document.getElementsByTagName('head')[0].appendChild(style);
};


// Internet Explorer 8 and older does not support Array.indexOf, so we define
// it here in that case.
// http://soledadpenades.com/2007/05/17/arrayindexof-in-internet-explorer/
if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj){
        for(var i = 0; i < this.length; i++){
            if(this[i] == obj){
                return i;
            }
        }
        return -1;
    };

    try {
        console.log("Warning: Ancient browser detected. Please update your browser");
    }
    catch (err) {
    }
}

// Internet Explorer 8 and older does not support Array.forEach, so we define
// it here in that case.
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/forEach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fn, scope) {
        for(var i = 0, len = this.length; i < len; ++i) {
            fn.call(scope || this, this[i], i, this);
        }
    }
}

// Internet Explorer 8 and older does not support Array.map, so we define it
// here in that case.
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/map
// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.com/#x15.4.4.19
if (!Array.prototype.map) {
    Array.prototype.map = function(callback, thisArg) {

        var T, A, k;

        if (this == null) {
            throw new TypeError(" this is null or not defined");
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (thisArg) {
            T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len) where Array is
        // the standard built-in constructor with that name and len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while(k < len) {

            var kValue, mappedValue;

            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            if (k in O) {

                // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
                kValue = O[ k ];

                // ii. Let mappedValue be the result of calling the Call internal method of callback
                // with T as the this value and argument list containing kValue, k, and O.
                mappedValue = callback.call(T, kValue, k, O);

                // iii. Call the DefineOwnProperty internal method of A with arguments
                // Pk, Property Descriptor {Value: mappedValue, : true, Enumerable: true, Configurable: true},
                // and false.

                // In browsers that support Object.defineProperty, use the following:
                // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

                // For best browser support, use the following:
                A[ k ] = mappedValue;
            }
            // d. Increase k by 1.
            k++;
        }

        // 9. return A
        return A;
    };
}

// Internet Explorer 8 and older does not support Array.filter, so we define it
// here in that case.
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/filter
if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun /*, thisp */) {
        "use strict";

        if (this == null) {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun != "function") {
            throw new TypeError();
        }

        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i]; // in case fun mutates this
                if (fun.call(thisp, val, i, t))
                    res.push(val);
            }
        }

        return res;
    };
}


// Internet Explorer 8 and older does not support Object.keys, so we define it
// here in that case.
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
    Object.keys = (function () {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
            dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            dontEnumsLength = dontEnums.length;

        return function (obj) {
            if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) {
                throw new TypeError('Object.keys called on non-object');
            }

            var result = [];

            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) result.push(prop);
            }

            if (hasDontEnumBug) {
                for (var i=0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
                }
            }
            return result;
        }
    })()
}

// Internet Explorer 8 and older does not support Array.isArray,
// so we define it here in that case.
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/isArray
if(!Array.isArray) {
    Array.isArray = function (vArg) {
        return Object.prototype.toString.call(vArg) === "[object Array]";
    };
}

// Internet Explorer 8 and older does not support Function.bind,
// so we define it here in that case.
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                    ? this
                    : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create
if (!Object.create) {
    Object.create = function (o) {
        if (arguments.length > 1) {
            throw new Error('Object.create implementation only accepts the first parameter.');
        }
        function F() {}
        F.prototype = o;
        return new F();
    };
}

/**
 * Event listener (singleton)
 */
// TODO: replace usage of the event listener for the EventBus
var events = {
    'listeners': [],

    /**
     * Find a single listener by its object
     * @param {Object} object
     * @return {Number} index  -1 when not found
     */
    'indexOf': function (object) {
        var listeners = this.listeners;
        for (var i = 0, iMax = this.listeners.length; i < iMax; i++) {
            var listener = listeners[i];
            if (listener && listener.object == object) {
                return i;
            }
        }
        return -1;
    },

    /**
     * Add an event listener
     * @param {Object} object
     * @param {String} event       The name of an event, for example 'select'
     * @param {function} callback  The callback method, called when the
     *                             event takes place
     */
    'addListener': function (object, event, callback) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (!listener) {
            listener = {
                'object': object,
                'events': {}
            };
            this.listeners.push(listener);
        }

        var callbacks = listener.events[event];
        if (!callbacks) {
            callbacks = [];
            listener.events[event] = callbacks;
        }

        // add the callback if it does not yet exist
        if (callbacks.indexOf(callback) == -1) {
            callbacks.push(callback);
        }
    },

    /**
     * Remove an event listener
     * @param {Object} object
     * @param {String} event       The name of an event, for example 'select'
     * @param {function} callback  The registered callback method
     */
    'removeListener': function (object, event, callback) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (listener) {
            var callbacks = listener.events[event];
            if (callbacks) {
                index = callbacks.indexOf(callback);
                if (index != -1) {
                    callbacks.splice(index, 1);
                }

                // remove the array when empty
                if (callbacks.length == 0) {
                    delete listener.events[event];
                }
            }

            // count the number of registered events. remove listener when empty
            var count = 0;
            var events = listener.events;
            for (var e in events) {
                if (events.hasOwnProperty(e)) {
                    count++;
                }
            }
            if (count == 0) {
                delete this.listeners[index];
            }
        }
    },

    /**
     * Remove all registered event listeners
     */
    'removeAllListeners': function () {
        this.listeners = [];
    },

    /**
     * Trigger an event. All registered event handlers will be called
     * @param {Object} object
     * @param {String} event
     * @param {Object} properties (optional)
     */
    'trigger': function (object, event, properties) {
        var index = this.indexOf(object);
        var listener = this.listeners[index];
        if (listener) {
            var callbacks = listener.events[event];
            if (callbacks) {
                for (var i = 0, iMax = callbacks.length; i < iMax; i++) {
                    callbacks[i](properties);
                }
            }
        }
    }
};

/**
 * An event bus can be used to emit events, and to subscribe to events
 * @constructor EventBus
 */
function EventBus() {
    this.subscriptions = [];
}

/**
 * Subscribe to an event
 * @param {String | RegExp} event   The event can be a regular expression, or
 *                                  a string with wildcards, like 'server.*'.
 * @param {function} callback.      Callback are called with three parameters:
 *                                  {String} event, {*} [data], {*} [source]
 * @param {*} [target]
 * @returns {String} id    A subscription id
 */
EventBus.prototype.on = function (event, callback, target) {
    var regexp = (event instanceof RegExp) ?
        event :
        new RegExp(event.replace('*', '\\w+'));

    var subscription = {
        id:       util.randomUUID(),
        event:    event,
        regexp:   regexp,
        callback: (typeof callback === 'function') ? callback : null,
        target:   target
    };

    this.subscriptions.push(subscription);

    return subscription.id;
};

/**
 * Unsubscribe from an event
 * @param {String | Object} filter   Filter for subscriptions to be removed
 *                                   Filter can be a string containing a
 *                                   subscription id, or an object containing
 *                                   one or more of the fields id, event,
 *                                   callback, and target.
 */
EventBus.prototype.off = function (filter) {
    var i = 0;
    while (i < this.subscriptions.length) {
        var subscription = this.subscriptions[i];

        var match = true;
        if (filter instanceof Object) {
            // filter is an object. All fields must match
            for (var prop in filter) {
                if (filter.hasOwnProperty(prop)) {
                    if (filter[prop] !== subscription[prop]) {
                        match = false;
                    }
                }
            }
        }
        else {
            // filter is a string, filter on id
            match = (subscription.id == filter);
        }

        if (match) {
            this.subscriptions.splice(i, 1);
        }
        else {
            i++;
        }
    }
};

/**
 * Emit an event
 * @param {String} event
 * @param {*} [data]
 * @param {*} [source]
 */
EventBus.prototype.emit = function (event, data, source) {
    for (var i =0; i < this.subscriptions.length; i++) {
        var subscription = this.subscriptions[i];
        if (subscription.regexp.test(event)) {
            if (subscription.callback) {
                subscription.callback(event, data, source);
            }
        }
    }
};

/**
 * DataSet
 *
 * Usage:
 *     var dataSet = new DataSet({
 *         fieldId: '_id',
 *         fieldTypes: {
 *             // ...
 *         }
 *     });
 *
 *     dataSet.add(item);
 *     dataSet.add(data);
 *     dataSet.update(item);
 *     dataSet.update(data);
 *     dataSet.remove(id);
 *     dataSet.remove(ids);
 *     var data = dataSet.get();
 *     var data = dataSet.get(id);
 *     var data = dataSet.get(ids);
 *     var data = dataSet.get(ids, options, data);
 *     dataSet.clear();
 *
 * A data set can:
 * - add/remove/update data
 * - gives triggers upon changes in the data
 * - can  import/export data in various data formats
 *
 * @param {Object} [options]   Available options:
 *                             {String} fieldId Field name of the id in the
 *                                              items, 'id' by default.
 *                             {Object.<String, String} fieldTypes
 *                                              A map with field names as key,
 *                                              and the field type as value.
 * @constructor DataSet
 */
function DataSet (options) {
    this.id = util.randomUUID();

    this.options = options || {};
    this.data = {};                                 // map with data indexed by id
    this.fieldId = this.options.fieldId || 'id';    // name of the field containing id
    this.fieldTypes = {};                           // field types by field name

    if (this.options.fieldTypes) {
        for (var field in this.options.fieldTypes) {
            if (this.options.fieldTypes.hasOwnProperty(field)) {
                var value = this.options.fieldTypes[field];
                if (value == 'Date' || value == 'ISODate' || value == 'ASPDate') {
                    this.fieldTypes[field] = 'Date';
                }
                else {
                    this.fieldTypes[field] = value;
                }
            }
        }
    }

    // event subscribers
    this.subscribers = {};

    this.internalIds = {};            // internally generated id's
}

/**
 * Subscribe to an event, add an event listener
 * @param {String} event        Event name. Available events: 'put', 'update',
 *                              'remove'
 * @param {function} callback   Callback method. Called with three parameters:
 *                                  {String} event
 *                                  {Object | null} params
 *                                  {String} senderId
 * @param {String} [id]         Optional id for the sender, used to filter
 *                              events triggered by the sender itself.
 */
DataSet.prototype.subscribe = function (event, callback, id) {
    var subscribers = this.subscribers[event];
    if (!subscribers) {
        subscribers = [];
        this.subscribers[event] = subscribers;
    }

    subscribers.push({
        id: id ? String(id) : null,
        callback: callback
    });
};

/**
 * Unsubscribe from an event, remove an event listener
 * @param {String} event
 * @param {function} callback
 */
DataSet.prototype.unsubscribe = function (event, callback) {
    var subscribers = this.subscribers[event];
    if (subscribers) {
        this.subscribers[event] = subscribers.filter(function (listener) {
            return (listener.callback != callback);
        });
    }
};

/**
 * Trigger an event
 * @param {String} event
 * @param {Object | null} params
 * @param {String} [senderId]       Optional id of the sender.
 * @private
 */
DataSet.prototype._trigger = function (event, params, senderId) {
    if (event == '*') {
        throw new Error('Cannot trigger event *');
    }

    var subscribers = [];
    if (event in this.subscribers) {
        subscribers = subscribers.concat(this.subscribers[event]);
    }
    if ('*' in this.subscribers) {
        subscribers = subscribers.concat(this.subscribers['*']);
    }

    for (var i = 0; i < subscribers.length; i++) {
        var subscriber = subscribers[i];
        if (subscriber.callback) {
            subscriber.callback(event, params, senderId || null);
        }
    }
};

/**
 * Add data.
 * Adding an item will fail when there already is an item with the same id.
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.add = function (data, senderId) {
    var addedItems = [],
        id,
        me = this;

    if (data instanceof Array) {
        // Array
        for (var i = 0, len = data.length; i < len; i++) {
            id = me._addItem(data[i]);
            addedItems.push(id);
        }
    }
    else if (util.isDataTable(data)) {
        // Google DataTable
        var columns = this._getColumnNames(data);
        for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
            var item = {};
            for (var col = 0, cols = columns.length; col < cols; col++) {
                var field = columns[col];
                item[field] = data.getValue(row, col);
            }

            id = me._addItem(item);
            addedItems.push(id);
        }
    }
    else if (data instanceof Object) {
        // Single item
        id = me._addItem(data);
        addedItems.push(id);
    }
    else {
        throw new Error('Unknown dataType');
    }

    if (addedItems.length) {
        this._trigger('add', {items: addedItems}, senderId);
    }
};

/**
 * Update existing items. When an item does not exist, it will be created
 * @param {Object | Array | DataTable} data
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.update = function (data, senderId) {
    var addedItems = [],
        updatedItems = [],
        me = this,
        fieldId = me.fieldId;

    var addOrUpdate = function (item) {
        var id = item[fieldId];
        if (me.data[id]) {
            // update item
            id = me._updateItem(item);
            updatedItems.push(id);
        }
        else {
            // add new item
            id = me._addItem(item);
            addedItems.push(id);
        }
    };

    if (data instanceof Array) {
        // Array
        for (var i = 0, len = data.length; i < len; i++) {
            addOrUpdate(data[i]);
        }
    }
    else if (util.isDataTable(data)) {
        // Google DataTable
        var columns = this._getColumnNames(data);
        for (var row = 0, rows = data.getNumberOfRows(); row < rows; row++) {
            var item = {};
            for (var col = 0, cols = columns.length; col < cols; col++) {
                var field = columns[col];
                item[field] = data.getValue(row, col);
            }

            addOrUpdate(item);
        }
    }
    else if (data instanceof Object) {
        // Single item
        addOrUpdate(data);
    }
    else {
        throw new Error('Unknown dataType');
    }

    if (addedItems.length) {
        this._trigger('add', {items: addedItems}, senderId);
    }
    if (updatedItems.length) {
        this._trigger('update', {items: updatedItems}, senderId);
    }
};

/**
 * Get a data item or multiple items.
 *
 * Usage:
 *
 *     get()
 *     get(options: Object)
 *     get(options: Object, data: Array | DataTable)
 *
 *     get(id: Number | String)
 *     get(id: Number | String, options: Object)
 *     get(id: Number | String, options: Object, data: Array | DataTable)
 *
 *     get(ids: Number[] | String[])
 *     get(ids: Number[] | String[], options: Object)
 *     get(ids: Number[] | String[], options: Object, data: Array | DataTable)
 *
 * Where:
 *
 * {Number | String} id         The id of an item
 * {Number[] | String{}} ids    An array with ids of items
 * {Object} options             An Object with options. Available options:
 *                              {String} [type] Type of data to be returned. Can
 *                                              be 'DataTable' or 'Array' (default)
 *                              {Object.<String, String>} [fieldTypes]
 *                              {String[]} [fields] field names to be returned
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * {Array | DataTable} [data]   If provided, items will be appended to this
 *                              array or table. Required in case of Google
 *                              DataTable.
 *
 * @throws Error
 */
DataSet.prototype.get = function (args) {
    var me = this;

    // parse the arguments
    var id, ids, options, data;
    var firstType = util.getType(arguments[0]);
    if (firstType == 'String' || firstType == 'Number') {
        // get(id [, options] [, data])
        id = arguments[0];
        options = arguments[1];
        data = arguments[2];
    }
    else if (firstType == 'Array') {
        // get(ids [, options] [, data])
        ids = arguments[0];
        options = arguments[1];
        data = arguments[2];
    }
    else {
        // get([, options] [, data])
        options = arguments[0];
        data = arguments[1];
    }

    // determine the return type
    var type;
    if (options && options.type) {
        type = (options.type == 'DataTable') ? 'DataTable' : 'Array';

        if (data && (type != util.getType(data))) {
            throw new Error('Type of parameter "data" (' + util.getType(data) + ') ' +
                'does not correspond with specified options.type (' + options.type + ')');
        }
        if (type == 'DataTable' && !util.isDataTable(data)) {
            throw new Error('Parameter "data" must be a DataTable ' +
                'when options.type is "DataTable"');
        }
    }
    else if (data) {
        type = (util.getType(data) == 'DataTable') ? 'DataTable' : 'Array';
    }
    else {
        type = 'Array';
    }

    // build options
    var fieldTypes = options && options.fieldTypes || this.options.fieldTypes;
    var filter = options && options.filter;
    var items = [], item, itemId, i, len;

    // cast items
    if (id != undefined) {
        // return a single item
        item = me._getItem(id, fieldTypes);
        if (filter && !filter(item)) {
            item = null;
        }
    }
    else if (ids != undefined) {
        // return a subset of items
        for (i = 0, len = ids.length; i < len; i++) {
            item = me._getItem(ids[i], fieldTypes);
            if (!filter || filter(item)) {
                items.push(item);
            }
        }
    }
    else {
        // return all items
        for (itemId in this.data) {
            if (this.data.hasOwnProperty(itemId)) {
                item = me._getItem(itemId, fieldTypes);
                if (!filter || filter(item)) {
                    items.push(item);
                }
            }
        }
    }

    // order the results
    if (options && options.order && id == undefined) {
        this._sort(items, options.order);
    }

    // filter fields of the items
    if (options && options.fields) {
        var fields = options.fields;
        if (id != undefined) {
            item = this._filterFields(item, fields);
        }
        else {
            for (i = 0, len = items.length; i < len; i++) {
                items[i] = this._filterFields(items[i], fields);
            }
        }
    }

    // return the results
    if (type == 'DataTable') {
        var columns = this._getColumnNames(data);
        if (id != undefined) {
            // append a single item to the data table
            me._appendRow(data, columns, item);
        }
        else {
            // copy the items to the provided data table
            for (i = 0, len = items.length; i < len; i++) {
                me._appendRow(data, columns, items[i]);
            }
        }
        return data;
    }
    else {
        // return an array
        if (id != undefined) {
            // a single item
            return item;
        }
        else {
            // multiple items
            if (data) {
                // copy the items to the provided array
                for (i = 0, len = items.length; i < len; i++) {
                    data.push(items[i]);
                }
                return data;
            }
            else {
                // just return our array
                return items;
            }
        }
    }
};

/**
 * Get ids of all items or from a filtered set of items.
 * @param {Object} [options]    An Object with options. Available options:
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Array} ids
 */
DataSet.prototype.getIds = function (options) {
    var data = this.data,
        filter = options && options.filter,
        order = options && options.order,
        fieldTypes = options && options.fieldTypes || this.options.fieldTypes,
        i,
        len,
        id,
        item,
        items,
        ids = [];

    if (filter) {
        // get filtered items
        if (order) {
            // create ordered list
            items = [];
            for (id in data) {
                if (data.hasOwnProperty(id)) {
                    item = this._getItem(id, fieldTypes);
                    if (filter(item)) {
                        items.push(item);
                    }
                }
            }

            this._sort(items, order);

            for (i = 0, len = items.length; i < len; i++) {
                ids[i] = items[i][this.fieldId];
            }
        }
        else {
            // create unordered list
            for (id in data) {
                if (data.hasOwnProperty(id)) {
                    item = this._getItem(id, fieldTypes);
                    if (filter(item)) {
                        ids.push(item[this.fieldId]);
                    }
                }
            }
        }
    }
    else {
        // get all items
        if (order) {
            // create an ordered list
            items = [];
            for (id in data) {
                if (data.hasOwnProperty(id)) {
                    items.push(data[id]);
                }
            }

            this._sort(items, order);

            for (i = 0, len = items.length; i < len; i++) {
                ids[i] = items[i][this.fieldId];
            }
        }
        else {
            // create unordered list
            for (id in data) {
                if (data.hasOwnProperty(id)) {
                    item = data[id];
                    ids.push(item[this.fieldId]);
                }
            }
        }
    }

    return ids;
};

/**
 * Execute a callback function for every item in the dataset.
 * The order of the items is not determined.
 * @param {function} callback
 * @param {Object} [options]    Available options:
 *                              {Object.<String, String>} [fieldTypes]
 *                              {String[]} [fields] filter fields
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 */
DataSet.prototype.forEach = function (callback, options) {
    var filter = options && options.filter,
        fieldTypes = options && options.fieldTypes || this.options.fieldTypes,
        data = this.data,
        item,
        id;

    if (options && options.order) {
        // execute forEach on ordered list
        var items = this.get(options);

        for (var i = 0, len = items.length; i < len; i++) {
            item = items[i];
            id = item[this.fieldId];
            callback(item, id);
        }
    }
    else {
        // unordered
        for (id in data) {
            if (data.hasOwnProperty(id)) {
                item = this._getItem(id, fieldTypes);
                if (!filter || filter(item)) {
                    callback(item, id);
                }
            }
        }
    }
};

/**
 * Map every item in the dataset.
 * @param {function} callback
 * @param {Object} [options]    Available options:
 *                              {Object.<String, String>} [fieldTypes]
 *                              {String[]} [fields] filter fields
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Object[]} mappedItems
 */
DataSet.prototype.map = function (callback, options) {
    var filter = options && options.filter,
        fieldTypes = options && options.fieldTypes || this.options.fieldTypes,
        mappedItems = [],
        data = this.data,
        item;

    // cast and filter items
    for (var id in data) {
        if (data.hasOwnProperty(id)) {
            item = this._getItem(id, fieldTypes);
            if (!filter || filter(item)) {
                mappedItems.push(callback(item, id));
            }
        }
    }

    // order items
    if (options && options.order) {
        this._sort(mappedItems, options.order);
    }

    return mappedItems;
};

/**
 * Filter the fields of an item
 * @param {Object} item
 * @param {String[]} fields     Field names
 * @return {Object} filteredItem
 * @private
 */
DataSet.prototype._filterFields = function (item, fields) {
    var filteredItem = {};

    for (var field in item) {
        if (item.hasOwnProperty(field) && (fields.indexOf(field) != -1)) {
            filteredItem[field] = item[field];
        }
    }

    return filteredItem;
};

/**
 * Sort the provided array with items
 * @param {Object[]} items
 * @param {String | function} order      A field name or custom sort function.
 * @private
 */
DataSet.prototype._sort = function (items, order) {
    if (util.isString(order)) {
        // order by provided field name
        var name = order; // field name
        items.sort(function (a, b) {
            var av = a[name];
            var bv = b[name];
            return (av > bv) ? 1 : ((av < bv) ? -1 : 0);
        });
    }
    else if (typeof order === 'function') {
        // order by sort function
        items.sort(order);
    }
    // TODO: extend order by an Object {field:String, direction:String}
    //       where direction can be 'asc' or 'desc'
    else {
        throw new TypeError('Order must be a function or a string');
    }
};

/**
 * Remove an object by pointer or by id
 * @param {String | Number | Object | Array} id   Object or id, or an array with
 *                                                objects or ids to be removed
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.remove = function (id, senderId) {
    var removedItems = [],
        i, len;

    if (util.isNumber(id) || util.isString(id)) {
        delete this.data[id];
        delete this.internalIds[id];
        removedItems.push(id);
    }
    else if (id instanceof Array) {
        for (i = 0, len = id.length; i < len; i++) {
            this.remove(id[i]);
        }
        removedItems = items.concat(id);
    }
    else if (id instanceof Object) {
        // search for the object
        for (i in this.data) {
            if (this.data.hasOwnProperty(i)) {
                if (this.data[i] == id) {
                    delete this.data[i];
                    delete this.internalIds[i];
                    removedItems.push(i);
                }
            }
        }
    }

    if (removedItems.length) {
        this._trigger('remove', {items: removedItems}, senderId);
    }
};

/**
 * Clear the data
 * @param {String} [senderId] Optional sender id
 */
DataSet.prototype.clear = function (senderId) {
    var ids = Object.keys(this.data);

    this.data = {};
    this.internalIds = {};

    this._trigger('remove', {items: ids}, senderId);
};

/**
 * Find the item with maximum value of a specified field
 * @param {String} field
 * @return {Object | null} item  Item containing max value, or null if no items
 */
DataSet.prototype.max = function (field) {
    var data = this.data,
        max = null,
        maxField = null;

    for (var id in data) {
        if (data.hasOwnProperty(id)) {
            var item = data[id];
            var itemField = item[field];
            if (itemField != null && (!max || itemField > maxField)) {
                max = item;
                maxField = itemField;
            }
        }
    }

    return max;
};

/**
 * Find the item with minimum value of a specified field
 * @param {String} field
 * @return {Object | null} item  Item containing max value, or null if no items
 */
DataSet.prototype.min = function (field) {
    var data = this.data,
        min = null,
        minField = null;

    for (var id in data) {
        if (data.hasOwnProperty(id)) {
            var item = data[id];
            var itemField = item[field];
            if (itemField != null && (!min || itemField < minField)) {
                min = item;
                minField = itemField;
            }
        }
    }

    return min;
};

/**
 * Find all distinct values of a specified field
 * @param {String} field
 * @return {Array} values  Array containing all distinct values. If the data
 *                         items do not contain the specified field, an array
 *                         containing a single value undefined is returned.
 *                         The returned array is unordered.
 */
DataSet.prototype.distinct = function (field) {
    var data = this.data,
        values = [],
        fieldType = this.options.fieldTypes[field],
        count = 0;

    for (var prop in data) {
        if (data.hasOwnProperty(prop)) {
            var item = data[prop];
            var value = util.cast(item[field], fieldType);
            var exists = false;
            for (var i = 0; i < count; i++) {
                if (values[i] == value) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                values[count] = value;
                count++;
            }
        }
    }

    return values;
};

/**
 * Add a single item. Will fail when an item with the same id already exists.
 * @param {Object} item
 * @return {String} id
 * @private
 */
DataSet.prototype._addItem = function (item) {
    var id = item[this.fieldId];

    if (id != undefined) {
        // check whether this id is already taken
        if (this.data[id]) {
            // item already exists
            throw new Error('Cannot add item: item with id ' + id + ' already exists');
        }
    }
    else {
        // generate an id
        id = util.randomUUID();
        item[this.fieldId] = id;
        this.internalIds[id] = item;
    }

    var d = {};
    for (var field in item) {
        if (item.hasOwnProperty(field)) {
            var type = this.fieldTypes[field];  // type may be undefined
            d[field] = util.cast(item[field], type);
        }
    }
    this.data[id] = d;

    return id;
};

/**
 * Get an item. Fields can be casted to a specific type
 * @param {String} id
 * @param {Object.<String, String>} [fieldTypes]  Cast field types
 * @return {Object | null} item
 * @private
 */
DataSet.prototype._getItem = function (id, fieldTypes) {
    var field, value;

    // get the item from the dataset
    var raw = this.data[id];
    if (!raw) {
        return null;
    }

    // cast the items field types
    var casted = {},
        fieldId = this.fieldId,
        internalIds = this.internalIds;
    if (fieldTypes) {
        for (field in raw) {
            if (raw.hasOwnProperty(field)) {
                value = raw[field];
                // output all fields, except internal ids
                if ((field != fieldId) || !(value in internalIds)) {
                    casted[field] = util.cast(value, fieldTypes[field]);
                }
            }
        }
    }
    else {
        // no field types specified, no casting needed
        for (field in raw) {
            if (raw.hasOwnProperty(field)) {
                value = raw[field];
                // output all fields, except internal ids
                if ((field != fieldId) || !(value in internalIds)) {
                    casted[field] = value;
                }
            }
        }
    }

    return casted;
};

/**
 * Update a single item: merge with existing item.
 * Will fail when the item has no id, or when there does not exist an item
 * with the same id.
 * @param {Object} item
 * @return {String} id
 * @private
 */
DataSet.prototype._updateItem = function (item) {
    var id = item[this.fieldId];
    if (id == undefined) {
        throw new Error('Cannot update item: item has no id (item: ' + JSON.stringify(item) + ')');
    }
    var d = this.data[id];
    if (!d) {
        // item doesn't exist
        throw new Error('Cannot update item: no item with id ' + id + ' found');
    }

    // merge with current item
    for (var field in item) {
        if (item.hasOwnProperty(field)) {
            var type = this.fieldTypes[field];  // type may be undefined
            d[field] = util.cast(item[field], type);
        }
    }

    return id;
};

/**
 * Get an array with the column names of a Google DataTable
 * @param {DataTable} dataTable
 * @return {String[]} columnNames
 * @private
 */
DataSet.prototype._getColumnNames = function (dataTable) {
    var columns = [];
    for (var col = 0, cols = dataTable.getNumberOfColumns(); col < cols; col++) {
        columns[col] = dataTable.getColumnId(col) || dataTable.getColumnLabel(col);
    }
    return columns;
};

/**
 * Append an item as a row to the dataTable
 * @param dataTable
 * @param columns
 * @param item
 * @private
 */
DataSet.prototype._appendRow = function (dataTable, columns, item) {
    var row = dataTable.addRow();

    for (var col = 0, cols = columns.length; col < cols; col++) {
        var field = columns[col];
        dataTable.setValue(row, col, item[field]);
    }
};

/**
 * DataView
 *
 * a dataview offers a filtered view on a dataset or an other dataview.
 *
 * @param {DataSet | DataView} data
 * @param {Object} [options]   Available options: see method get
 *
 * @constructor DataView
 */
function DataView (data, options) {
    this.id = util.randomUUID();

    this.data = null;
    this.ids = {}; // ids of the items currently in memory (just contains a boolean true)
    this.options = options || {};
    this.fieldId = 'id'; // name of the field containing id
    this.subscribers = {}; // event subscribers

    var me = this;
    this.listener = function () {
        me._onEvent.apply(me, arguments);
    };

    this.setData(data);
}

/**
 * Set a data source for the view
 * @param {DataSet | DataView} data
 */
DataView.prototype.setData = function (data) {
    var ids, dataItems, i, len;

    if (this.data) {
        // unsubscribe from current dataset
        if (this.data.unsubscribe) {
            this.data.unsubscribe('*', this.listener);
        }

        // trigger a remove of all items in memory
        ids = [];
        for (var id in this.ids) {
            if (this.ids.hasOwnProperty(id)) {
                ids.push(id);
            }
        }
        this.ids = {};
        this._trigger('remove', {items: ids});
    }

    this.data = data;

    if (this.data) {
        // update fieldId
        this.fieldId = this.options.fieldId ||
            (this.data && this.data.options && this.data.options.fieldId) ||
            'id';

        // trigger an add of all added items
        ids = this.data.getIds({filter: this.options && this.options.filter});
        for (i = 0, len = ids.length; i < len; i++) {
            id = ids[i];
            this.ids[id] = true;
        }
        this._trigger('add', {items: ids});

        // subscribe to new dataset
        if (this.data.subscribe) {
            this.data.subscribe('*', this.listener);
        }
    }
};

/**
 * Get data from the data view
 *
 * Usage:
 *
 *     get()
 *     get(options: Object)
 *     get(options: Object, data: Array | DataTable)
 *
 *     get(id: Number)
 *     get(id: Number, options: Object)
 *     get(id: Number, options: Object, data: Array | DataTable)
 *
 *     get(ids: Number[])
 *     get(ids: Number[], options: Object)
 *     get(ids: Number[], options: Object, data: Array | DataTable)
 *
 * Where:
 *
 * {Number | String} id         The id of an item
 * {Number[] | String{}} ids    An array with ids of items
 * {Object} options             An Object with options. Available options:
 *                              {String} [type] Type of data to be returned. Can
 *                                              be 'DataTable' or 'Array' (default)
 *                              {Object.<String, String>} [fieldTypes]
 *                              {String[]} [fields] field names to be returned
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * {Array | DataTable} [data]   If provided, items will be appended to this
 *                              array or table. Required in case of Google
 *                              DataTable.
 * @param args
 */
DataView.prototype.get = function (args) {
    var me = this;

    // parse the arguments
    var ids, options, data;
    var firstType = util.getType(arguments[0]);
    if (firstType == 'String' || firstType == 'Number' || firstType == 'Array') {
        // get(id(s) [, options] [, data])
        ids = arguments[0];  // can be a single id or an array with ids
        options = arguments[1];
        data = arguments[2];
    }
    else {
        // get([, options] [, data])
        options = arguments[0];
        data = arguments[1];
    }

    // extend the options with the default options and provided options
    var viewOptions = util.extend({}, this.options, options);

    // create a combined filter method when needed
    if (this.options.filter && options && options.filter) {
        viewOptions.filter = function (item) {
            return me.options.filter(item) && options.filter(item);
        }
    }

    // build up the call to the linked data set
    var getArguments = [];
    if (ids != undefined) {
        getArguments.push(ids);
    }
    getArguments.push(viewOptions);
    getArguments.push(data);

    return this.data && this.data.get.apply(this.data, getArguments);
};

/**
 * Get ids of all items or from a filtered set of items.
 * @param {Object} [options]    An Object with options. Available options:
 *                              {function} [filter] filter items
 *                              {String | function} [order] Order the items by
 *                                  a field name or custom sort function.
 * @return {Array} ids
 */
DataView.prototype.getIds = function (options) {
    var ids;

    if (this.data) {
        var defaultFilter = this.options.filter;
        var filter;

        if (options && options.filter) {
            if (defaultFilter) {
                filter = function (item) {
                    return defaultFilter(item) && options.filter(item);
                }
            }
            else {
                filter = options.filter;
            }
        }
        else {
            filter = defaultFilter;
        }

        ids = this.data.getIds({
            filter: filter,
            order: options && options.order
        });
    }
    else {
        ids = [];
    }

    return ids;
};

/**
 * Event listener. Will propagate all events from the connected data set to
 * the subscribers of the DataView, but will filter the items and only trigger
 * when there are changes in the filtered data set.
 * @param {String} event
 * @param {Object | null} params
 * @param {String} senderId
 * @private
 */
DataView.prototype._onEvent = function (event, params, senderId) {
    var i, len, id, item,
        ids = params && params.items,
        data = this.data,
        added = [],
        updated = [],
        removed = [];

    if (ids && data) {
        switch (event) {
            case 'add':
                // filter the ids of the added items
                for (i = 0, len = ids.length; i < len; i++) {
                    id = ids[i];
                    item = this.get(id);
                    if (item) {
                        this.ids[id] = true;
                        added.push(id);
                    }
                }

                break;

            case 'update':
                // determine the event from the views viewpoint: an updated
                // item can be added, updated, or removed from this view.
                for (i = 0, len = ids.length; i < len; i++) {
                    id = ids[i];
                    item = this.get(id);

                    if (item) {
                        if (this.ids[id]) {
                            updated.push(id);
                        }
                        else {
                            this.ids[id] = true;
                            added.push(id);
                        }
                    }
                    else {
                        if (this.ids[id]) {
                            delete this.ids[id];
                            removed.push(id);
                        }
                        else {
                            // nothing interesting for me :-(
                        }
                    }
                }

                break;

            case 'remove':
                // filter the ids of the removed items
                for (i = 0, len = ids.length; i < len; i++) {
                    id = ids[i];
                    if (this.ids[id]) {
                        delete this.ids[id];
                        removed.push(id);
                    }
                }

                break;
        }

        if (added.length) {
            this._trigger('add', {items: added}, senderId);
        }
        if (updated.length) {
            this._trigger('update', {items: updated}, senderId);
        }
        if (removed.length) {
            this._trigger('remove', {items: removed}, senderId);
        }
    }
};

// copy subscription functionality from DataSet
DataView.prototype.subscribe = DataSet.prototype.subscribe;
DataView.prototype.unsubscribe = DataSet.prototype.unsubscribe;
DataView.prototype._trigger = DataSet.prototype._trigger;

/**
 * @constructor  TimeStep
 * The class TimeStep is an iterator for dates. You provide a start date and an
 * end date. The class itself determines the best scale (step size) based on the
 * provided start Date, end Date, and minimumStep.
 *
 * If minimumStep is provided, the step size is chosen as close as possible
 * to the minimumStep but larger than minimumStep. If minimumStep is not
 * provided, the scale is set to 1 DAY.
 * The minimumStep should correspond with the onscreen size of about 6 characters
 *
 * Alternatively, you can set a scale by hand.
 * After creation, you can initialize the class by executing first(). Then you
 * can iterate from the start date to the end date via next(). You can check if
 * the end date is reached with the function hasNext(). After each step, you can
 * retrieve the current date via getCurrent().
 * The TimeStep has scales ranging from milliseconds, seconds, minutes, hours,
 * days, to years.
 *
 * Version: 1.2
 *
 * @param {Date} [start]         The start date, for example new Date(2010, 9, 21)
 *                               or new Date(2010, 9, 21, 23, 45, 00)
 * @param {Date} [end]           The end date
 * @param {Number} [minimumStep] Optional. Minimum step size in milliseconds
 */
TimeStep = function(start, end, minimumStep) {
    // variables
    this.current = new Date();
    this._start = new Date();
    this._end = new Date();

    this.autoScale  = true;
    this.scale = TimeStep.SCALE.DAY;
    this.step = 1;

    // initialize the range
    this.setRange(start, end, minimumStep);
};

/// enum scale
TimeStep.SCALE = {
    MILLISECOND: 1,
    SECOND: 2,
    MINUTE: 3,
    HOUR: 4,
    DAY: 5,
    WEEKDAY: 6,
    MONTH: 7,
    YEAR: 8
};


/**
 * Set a new range
 * If minimumStep is provided, the step size is chosen as close as possible
 * to the minimumStep but larger than minimumStep. If minimumStep is not
 * provided, the scale is set to 1 DAY.
 * The minimumStep should correspond with the onscreen size of about 6 characters
 * @param {Date} [start]      The start date and time.
 * @param {Date} [end]        The end date and time.
 * @param {int} [minimumStep] Optional. Minimum step size in milliseconds
 */
TimeStep.prototype.setRange = function(start, end, minimumStep) {
    if (!(start instanceof Date) || !(end instanceof Date)) {
        //throw  "No legal start or end date in method setRange";
        return;
    }

    this._start = (start != undefined) ? new Date(start.valueOf()) : new Date();
    this._end = (end != undefined) ? new Date(end.valueOf()) : new Date();

    if (this.autoScale) {
        this.setMinimumStep(minimumStep);
    }
};

/**
 * Set the range iterator to the start date.
 */
TimeStep.prototype.first = function() {
    this.current = new Date(this._start.valueOf());
    this.roundToMinor();
};

/**
 * Round the current date to the first minor date value
 * This must be executed once when the current date is set to start Date
 */
TimeStep.prototype.roundToMinor = function() {
    // round to floor
    // IMPORTANT: we have no breaks in this switch! (this is no bug)
    //noinspection FallthroughInSwitchStatementJS
    switch (this.scale) {
        case TimeStep.SCALE.YEAR:
            this.current.setFullYear(this.step * Math.floor(this.current.getFullYear() / this.step));
            this.current.setMonth(0);
        case TimeStep.SCALE.MONTH:        this.current.setDate(1);
        case TimeStep.SCALE.DAY:          // intentional fall through
        case TimeStep.SCALE.WEEKDAY:      this.current.setHours(0);
        case TimeStep.SCALE.HOUR:         this.current.setMinutes(0);
        case TimeStep.SCALE.MINUTE:       this.current.setSeconds(0);
        case TimeStep.SCALE.SECOND:       this.current.setMilliseconds(0);
        //case TimeStep.SCALE.MILLISECOND: // nothing to do for milliseconds
    }

    if (this.step != 1) {
        // round down to the first minor value that is a multiple of the current step size
        switch (this.scale) {
            case TimeStep.SCALE.MILLISECOND:  this.current.setMilliseconds(this.current.getMilliseconds() - this.current.getMilliseconds() % this.step);  break;
            case TimeStep.SCALE.SECOND:       this.current.setSeconds(this.current.getSeconds() - this.current.getSeconds() % this.step); break;
            case TimeStep.SCALE.MINUTE:       this.current.setMinutes(this.current.getMinutes() - this.current.getMinutes() % this.step); break;
            case TimeStep.SCALE.HOUR:         this.current.setHours(this.current.getHours() - this.current.getHours() % this.step); break;
            case TimeStep.SCALE.WEEKDAY:      // intentional fall through
            case TimeStep.SCALE.DAY:          this.current.setDate((this.current.getDate()-1) - (this.current.getDate()-1) % this.step + 1); break;
            case TimeStep.SCALE.MONTH:        this.current.setMonth(this.current.getMonth() - this.current.getMonth() % this.step);  break;
            case TimeStep.SCALE.YEAR:         this.current.setFullYear(this.current.getFullYear() - this.current.getFullYear() % this.step); break;
            default: break;
        }
    }
};

/**
 * Check if the there is a next step
 * @return {boolean}  true if the current date has not passed the end date
 */
TimeStep.prototype.hasNext = function () {
    return (this.current.valueOf() <= this._end.valueOf());
};

/**
 * Do the next step
 */
TimeStep.prototype.next = function() {
    var prev = this.current.valueOf();

    // Two cases, needed to prevent issues with switching daylight savings
    // (end of March and end of October)
    if (this.current.getMonth() < 6)   {
        switch (this.scale) {
            case TimeStep.SCALE.MILLISECOND:

                this.current = new Date(this.current.valueOf() + this.step); break;
            case TimeStep.SCALE.SECOND:       this.current = new Date(this.current.valueOf() + this.step * 1000); break;
            case TimeStep.SCALE.MINUTE:       this.current = new Date(this.current.valueOf() + this.step * 1000 * 60); break;
            case TimeStep.SCALE.HOUR:
                this.current = new Date(this.current.valueOf() + this.step * 1000 * 60 * 60);
                // in case of skipping an hour for daylight savings, adjust the hour again (else you get: 0h 5h 9h ... instead of 0h 4h 8h ...)
                var h = this.current.getHours();
                this.current.setHours(h - (h % this.step));
                break;
            case TimeStep.SCALE.WEEKDAY:      // intentional fall through
            case TimeStep.SCALE.DAY:          this.current.setDate(this.current.getDate() + this.step); break;
            case TimeStep.SCALE.MONTH:        this.current.setMonth(this.current.getMonth() + this.step); break;
            case TimeStep.SCALE.YEAR:         this.current.setFullYear(this.current.getFullYear() + this.step); break;
            default:                      break;
        }
    }
    else {
        switch (this.scale) {
            case TimeStep.SCALE.MILLISECOND:  this.current = new Date(this.current.valueOf() + this.step); break;
            case TimeStep.SCALE.SECOND:       this.current.setSeconds(this.current.getSeconds() + this.step); break;
            case TimeStep.SCALE.MINUTE:       this.current.setMinutes(this.current.getMinutes() + this.step); break;
            case TimeStep.SCALE.HOUR:         this.current.setHours(this.current.getHours() + this.step); break;
            case TimeStep.SCALE.WEEKDAY:      // intentional fall through
            case TimeStep.SCALE.DAY:          this.current.setDate(this.current.getDate() + this.step); break;
            case TimeStep.SCALE.MONTH:        this.current.setMonth(this.current.getMonth() + this.step); break;
            case TimeStep.SCALE.YEAR:         this.current.setFullYear(this.current.getFullYear() + this.step); break;
            default:                      break;
        }
    }

    if (this.step != 1) {
        // round down to the correct major value
        switch (this.scale) {
            case TimeStep.SCALE.MILLISECOND:  if(this.current.getMilliseconds() < this.step) this.current.setMilliseconds(0);  break;
            case TimeStep.SCALE.SECOND:       if(this.current.getSeconds() < this.step) this.current.setSeconds(0);  break;
            case TimeStep.SCALE.MINUTE:       if(this.current.getMinutes() < this.step) this.current.setMinutes(0);  break;
            case TimeStep.SCALE.HOUR:         if(this.current.getHours() < this.step) this.current.setHours(0);  break;
            case TimeStep.SCALE.WEEKDAY:      // intentional fall through
            case TimeStep.SCALE.DAY:          if(this.current.getDate() < this.step+1) this.current.setDate(1); break;
            case TimeStep.SCALE.MONTH:        if(this.current.getMonth() < this.step) this.current.setMonth(0);  break;
            case TimeStep.SCALE.YEAR:         break; // nothing to do for year
            default:                break;
        }
    }

    // safety mechanism: if current time is still unchanged, move to the end
    if (this.current.valueOf() == prev) {
        this.current = new Date(this._end.valueOf());
    }
};


/**
 * Get the current datetime
 * @return {Date}  current The current date
 */
TimeStep.prototype.getCurrent = function() {
    return this.current;
};

/**
 * Set a custom scale. Autoscaling will be disabled.
 * For example setScale(SCALE.MINUTES, 5) will result
 * in minor steps of 5 minutes, and major steps of an hour.
 *
 * @param {TimeStep.SCALE} newScale
 *                               A scale. Choose from SCALE.MILLISECOND,
 *                               SCALE.SECOND, SCALE.MINUTE, SCALE.HOUR,
 *                               SCALE.WEEKDAY, SCALE.DAY, SCALE.MONTH,
 *                               SCALE.YEAR.
 * @param {Number}     newStep   A step size, by default 1. Choose for
 *                               example 1, 2, 5, or 10.
 */
TimeStep.prototype.setScale = function(newScale, newStep) {
    this.scale = newScale;

    if (newStep > 0) {
        this.step = newStep;
    }

    this.autoScale = false;
};

/**
 * Enable or disable autoscaling
 * @param {boolean} enable  If true, autoascaling is set true
 */
TimeStep.prototype.setAutoScale = function (enable) {
    this.autoScale = enable;
};


/**
 * Automatically determine the scale that bests fits the provided minimum step
 * @param {Number} [minimumStep]  The minimum step size in milliseconds
 */
TimeStep.prototype.setMinimumStep = function(minimumStep) {
    if (minimumStep == undefined) {
        return;
    }

    var stepYear       = (1000 * 60 * 60 * 24 * 30 * 12);
    var stepMonth      = (1000 * 60 * 60 * 24 * 30);
    var stepDay        = (1000 * 60 * 60 * 24);
    var stepHour       = (1000 * 60 * 60);
    var stepMinute     = (1000 * 60);
    var stepSecond     = (1000);
    var stepMillisecond= (1);

    // find the smallest step that is larger than the provided minimumStep
    if (stepYear*1000 > minimumStep)        {this.scale = TimeStep.SCALE.YEAR;        this.step = 1000;}
    if (stepYear*500 > minimumStep)         {this.scale = TimeStep.SCALE.YEAR;        this.step = 500;}
    if (stepYear*100 > minimumStep)         {this.scale = TimeStep.SCALE.YEAR;        this.step = 100;}
    if (stepYear*50 > minimumStep)          {this.scale = TimeStep.SCALE.YEAR;        this.step = 50;}
    if (stepYear*10 > minimumStep)          {this.scale = TimeStep.SCALE.YEAR;        this.step = 10;}
    if (stepYear*5 > minimumStep)           {this.scale = TimeStep.SCALE.YEAR;        this.step = 5;}
    if (stepYear > minimumStep)             {this.scale = TimeStep.SCALE.YEAR;        this.step = 1;}
    if (stepMonth*3 > minimumStep)          {this.scale = TimeStep.SCALE.MONTH;       this.step = 3;}
    if (stepMonth > minimumStep)            {this.scale = TimeStep.SCALE.MONTH;       this.step = 1;}
    if (stepDay*5 > minimumStep)            {this.scale = TimeStep.SCALE.DAY;         this.step = 5;}
    if (stepDay*2 > minimumStep)            {this.scale = TimeStep.SCALE.DAY;         this.step = 2;}
    if (stepDay > minimumStep)              {this.scale = TimeStep.SCALE.DAY;         this.step = 1;}
    if (stepDay/2 > minimumStep)            {this.scale = TimeStep.SCALE.WEEKDAY;     this.step = 1;}
    if (stepHour*4 > minimumStep)           {this.scale = TimeStep.SCALE.HOUR;        this.step = 4;}
    if (stepHour > minimumStep)             {this.scale = TimeStep.SCALE.HOUR;        this.step = 1;}
    if (stepMinute*15 > minimumStep)        {this.scale = TimeStep.SCALE.MINUTE;      this.step = 15;}
    if (stepMinute*10 > minimumStep)        {this.scale = TimeStep.SCALE.MINUTE;      this.step = 10;}
    if (stepMinute*5 > minimumStep)         {this.scale = TimeStep.SCALE.MINUTE;      this.step = 5;}
    if (stepMinute > minimumStep)           {this.scale = TimeStep.SCALE.MINUTE;      this.step = 1;}
    if (stepSecond*15 > minimumStep)        {this.scale = TimeStep.SCALE.SECOND;      this.step = 15;}
    if (stepSecond*10 > minimumStep)        {this.scale = TimeStep.SCALE.SECOND;      this.step = 10;}
    if (stepSecond*5 > minimumStep)         {this.scale = TimeStep.SCALE.SECOND;      this.step = 5;}
    if (stepSecond > minimumStep)           {this.scale = TimeStep.SCALE.SECOND;      this.step = 1;}
    if (stepMillisecond*200 > minimumStep)  {this.scale = TimeStep.SCALE.MILLISECOND; this.step = 200;}
    if (stepMillisecond*100 > minimumStep)  {this.scale = TimeStep.SCALE.MILLISECOND; this.step = 100;}
    if (stepMillisecond*50 > minimumStep)   {this.scale = TimeStep.SCALE.MILLISECOND; this.step = 50;}
    if (stepMillisecond*10 > minimumStep)   {this.scale = TimeStep.SCALE.MILLISECOND; this.step = 10;}
    if (stepMillisecond*5 > minimumStep)    {this.scale = TimeStep.SCALE.MILLISECOND; this.step = 5;}
    if (stepMillisecond > minimumStep)      {this.scale = TimeStep.SCALE.MILLISECOND; this.step = 1;}
};

/**
 * Snap a date to a rounded value. The snap intervals are dependent on the
 * current scale and step.
 * @param {Date} date   the date to be snapped
 */
TimeStep.prototype.snap = function(date) {
    if (this.scale == TimeStep.SCALE.YEAR) {
        var year = date.getFullYear() + Math.round(date.getMonth() / 12);
        date.setFullYear(Math.round(year / this.step) * this.step);
        date.setMonth(0);
        date.setDate(0);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    }
    else if (this.scale == TimeStep.SCALE.MONTH) {
        if (date.getDate() > 15) {
            date.setDate(1);
            date.setMonth(date.getMonth() + 1);
            // important: first set Date to 1, after that change the month.
        }
        else {
            date.setDate(1);
        }

        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    }
    else if (this.scale == TimeStep.SCALE.DAY ||
        this.scale == TimeStep.SCALE.WEEKDAY) {
        //noinspection FallthroughInSwitchStatementJS
        switch (this.step) {
            case 5:
            case 2:
                date.setHours(Math.round(date.getHours() / 24) * 24); break;
            default:
                date.setHours(Math.round(date.getHours() / 12) * 12); break;
        }
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    }
    else if (this.scale == TimeStep.SCALE.HOUR) {
        switch (this.step) {
            case 4:
                date.setMinutes(Math.round(date.getMinutes() / 60) * 60); break;
            default:
                date.setMinutes(Math.round(date.getMinutes() / 30) * 30); break;
        }
        date.setSeconds(0);
        date.setMilliseconds(0);
    } else if (this.scale == TimeStep.SCALE.MINUTE) {
        //noinspection FallthroughInSwitchStatementJS
        switch (this.step) {
            case 15:
            case 10:
                date.setMinutes(Math.round(date.getMinutes() / 5) * 5);
                date.setSeconds(0);
                break;
            case 5:
                date.setSeconds(Math.round(date.getSeconds() / 60) * 60); break;
            default:
                date.setSeconds(Math.round(date.getSeconds() / 30) * 30); break;
        }
        date.setMilliseconds(0);
    }
    else if (this.scale == TimeStep.SCALE.SECOND) {
        //noinspection FallthroughInSwitchStatementJS
        switch (this.step) {
            case 15:
            case 10:
                date.setSeconds(Math.round(date.getSeconds() / 5) * 5);
                date.setMilliseconds(0);
                break;
            case 5:
                date.setMilliseconds(Math.round(date.getMilliseconds() / 1000) * 1000); break;
            default:
                date.setMilliseconds(Math.round(date.getMilliseconds() / 500) * 500); break;
        }
    }
    else if (this.scale == TimeStep.SCALE.MILLISECOND) {
        var step = this.step > 5 ? this.step / 2 : 1;
        date.setMilliseconds(Math.round(date.getMilliseconds() / step) * step);
    }
};

/**
 * Check if the current value is a major value (for example when the step
 * is DAY, a major value is each first day of the MONTH)
 * @return {boolean} true if current date is major, else false.
 */
TimeStep.prototype.isMajor = function() {
    switch (this.scale) {
        case TimeStep.SCALE.MILLISECOND:
            return (this.current.getMilliseconds() == 0);
        case TimeStep.SCALE.SECOND:
            return (this.current.getSeconds() == 0);
        case TimeStep.SCALE.MINUTE:
            return (this.current.getHours() == 0) && (this.current.getMinutes() == 0);
        // Note: this is no bug. Major label is equal for both minute and hour scale
        case TimeStep.SCALE.HOUR:
            return (this.current.getHours() == 0);
        case TimeStep.SCALE.WEEKDAY: // intentional fall through
        case TimeStep.SCALE.DAY:
            return (this.current.getDate() == 1);
        case TimeStep.SCALE.MONTH:
            return (this.current.getMonth() == 0);
        case TimeStep.SCALE.YEAR:
            return false;
        default:
            return false;
    }
};


/**
 * Returns formatted text for the minor axislabel, depending on the current
 * date and the scale. For example when scale is MINUTE, the current time is
 * formatted as "hh:mm".
 * @param {Date} [date] custom date. if not provided, current date is taken
 */
TimeStep.prototype.getLabelMinor = function(date) {
    if (date == undefined) {
        date = this.current;
    }

    switch (this.scale) {
        case TimeStep.SCALE.MILLISECOND:  return moment(date).format('SSS');
        case TimeStep.SCALE.SECOND:       return moment(date).format('s');
        case TimeStep.SCALE.MINUTE:       return moment(date).format('HH:mm');
        case TimeStep.SCALE.HOUR:         return moment(date).format('HH:mm');
        case TimeStep.SCALE.WEEKDAY:      return moment(date).format('ddd D');
        case TimeStep.SCALE.DAY:          return moment(date).format('D');
        case TimeStep.SCALE.MONTH:        return moment(date).format('MMM');
        case TimeStep.SCALE.YEAR:         return moment(date).format('YYYY');
        default:                          return '';
    }
};


/**
 * Returns formatted text for the major axis label, depending on the current
 * date and the scale. For example when scale is MINUTE, the major scale is
 * hours, and the hour will be formatted as "hh".
 * @param {Date} [date] custom date. if not provided, current date is taken
 */
TimeStep.prototype.getLabelMajor = function(date) {
    if (date == undefined) {
        date = this.current;
    }

    //noinspection FallthroughInSwitchStatementJS
    switch (this.scale) {
        case TimeStep.SCALE.MILLISECOND:return moment(date).format('HH:mm:ss');
        case TimeStep.SCALE.SECOND:     return moment(date).format('D MMMM HH:mm');
        case TimeStep.SCALE.MINUTE:
        case TimeStep.SCALE.HOUR:       return moment(date).format('ddd D MMMM');
        case TimeStep.SCALE.WEEKDAY:
        case TimeStep.SCALE.DAY:        return moment(date).format('MMMM YYYY');
        case TimeStep.SCALE.MONTH:      return moment(date).format('YYYY');
        case TimeStep.SCALE.YEAR:       return '';
        default:                        return '';
    }
};

/**
 * @constructor Stack
 * Stacks items on top of each other.
 * @param {ItemSet} parent
 * @param {Object} [options]
 */
function Stack (parent, options) {
    this.parent = parent;

    this.options = options || {};
    this.defaultOptions = {
        order: function (a, b) {
            //return (b.width - a.width) || (a.left - b.left);  // TODO: cleanup
            // Order: ranges over non-ranges, ranged ordered by width, and
            // lastly ordered by start.
            if (a instanceof ItemRange) {
                if (b instanceof ItemRange) {
                    var aInt = (a.data.end - a.data.start);
                    var bInt = (b.data.end - b.data.start);
                    return (aInt - bInt) || (a.data.start - b.data.start);
                }
                else {
                    return -1;
                }
            }
            else {
                if (b instanceof ItemRange) {
                    return 1;
                }
                else {
                    return (a.data.start - b.data.start);
                }
            }
        },
        margin: {
            item: 10
        }
    };

    this.ordered = [];  // ordered items
}

/**
 * Set options for the stack
 * @param {Object} options  Available options:
 *                          {ItemSet} parent
 *                          {Number} margin
 *                          {function} order  Stacking order
 */
Stack.prototype.setOptions = function setOptions (options) {
    util.extend(this.options, options);

    // TODO: register on data changes at the connected parent itemset, and update the changed part only and immediately
};

/**
 * Stack the items such that they don't overlap. The items will have a minimal
 * distance equal to options.margin.item.
 */
Stack.prototype.update = function update() {
    this._order();
    this._stack();
};

/**
 * Order the items. The items are ordered by width first, and by left position
 * second.
 * If a custom order function has been provided via the options, then this will
 * be used.
 * @private
 */
Stack.prototype._order = function _order () {
    var items = this.parent.items;
    if (!items) {
        throw new Error('Cannot stack items: parent does not contain items');
    }

    // TODO: store the sorted items, to have less work later on
    var ordered = [];
    var index = 0;
    // items is a map (no array)
    util.forEach(items, function (item) {
        if (item.visible) {
            ordered[index] = item;
            index++;
        }
    });

    //if a customer stack order function exists, use it.
    var order = this.options.order || this.defaultOptions.order;
    if (!(typeof order === 'function')) {
        throw new Error('Option order must be a function');
    }

    ordered.sort(order);

    this.ordered = ordered;
};

/**
 * Adjust vertical positions of the events such that they don't overlap each
 * other.
 * @private
 */
Stack.prototype._stack = function _stack () {
    var i,
        iMax,
        ordered = this.ordered,
        options = this.options,
        orientation = options.orientation || this.defaultOptions.orientation,
        axisOnTop = (orientation == 'top'),
        margin;

    if (options.margin && options.margin.item !== undefined) {
        margin = options.margin.item;
    }
    else {
        margin = this.defaultOptions.margin.item
    }

    // calculate new, non-overlapping positions
    for (i = 0, iMax = ordered.length; i < iMax; i++) {
        var item = ordered[i];
        var collidingItem = null;
        do {
            // TODO: optimize checking for overlap. when there is a gap without items,
            //  you only need to check for items from the next item on, not from zero
            collidingItem = this.checkOverlap(ordered, i, 0, i - 1, margin);
            if (collidingItem != null) {
                // There is a collision. Reposition the event above the colliding element
                if (axisOnTop) {
                    item.top = collidingItem.top + collidingItem.height + margin;
                }
                else {
                    item.top = collidingItem.top - item.height - margin;
                }
            }
        } while (collidingItem);
    }
};

/**
 * Check if the destiny position of given item overlaps with any
 * of the other items from index itemStart to itemEnd.
 * @param {Array} items     Array with items
 * @param {int}  itemIndex  Number of the item to be checked for overlap
 * @param {int}  itemStart  First item to be checked.
 * @param {int}  itemEnd    Last item to be checked.
 * @return {Object | null}  colliding item, or undefined when no collisions
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 */
Stack.prototype.checkOverlap = function checkOverlap (items, itemIndex,
                                                      itemStart, itemEnd, margin) {
    var collision = this.collision;

    // we loop from end to start, as we suppose that the chance of a
    // collision is larger for items at the end, so check these first.
    var a = items[itemIndex];
    for (var i = itemEnd; i >= itemStart; i--) {
        var b = items[i];
        if (collision(a, b, margin)) {
            if (i != itemIndex) {
                return b;
            }
        }
    }

    return null;
};

/**
 * Test if the two provided items collide
 * The items must have parameters left, width, top, and height.
 * @param {Component} a     The first item
 * @param {Component} b     The second item
 * @param {Number} margin   A minimum required margin.
 *                          If margin is provided, the two items will be
 *                          marked colliding when they overlap or
 *                          when the margin between the two is smaller than
 *                          the requested margin.
 * @return {boolean}        true if a and b collide, else false
 */
Stack.prototype.collision = function collision (a, b, margin) {
    var a_width;
    var b_width;

    if (a.props.content !== undefined && a.width < a.props.content.width)
        a_width = a.props.content.width;
    else
        a_width = a.width;

    if (b.props.content !== undefined && b.width < b.props.content.width)
        b_width = b.props.content.width;
    else
        b_width = b.width
    
    return ((a.left - margin) < (b.left + b_width) &&
        (a.left + a_width + margin) > b.left &&
        (a.top - margin) < (b.top + b.height) &&
        (a.top + a.height + margin) > b.top);
};

/**
 * @constructor Range
 * A Range controls a numeric range with a start and end value.
 * The Range adjusts the range based on mouse events or programmatic changes,
 * and triggers events when the range is changing or has been changed.
 * @param {Object} [options]   See description at Range.setOptions
 * @extends Controller
 */
function Range(options) {
    this.id = util.randomUUID();
    this.start = 0; // Number
    this.end = 0;   // Number

    this.options = {
        min: null,
        max: null,
        zoomMin: null,
        zoomMax: null
    };

    this.listeners = [];

    this.setOptions(options);
}

/**
 * Set options for the range controller
 * @param {Object} options      Available options:
 *                              {Number} start  Set start value of the range
 *                              {Number} end    Set end value of the range
 *                              {Number} min    Minimum value for start
 *                              {Number} max    Maximum value for end
 *                              {Number} zoomMin    Set a minimum value for
 *                                                  (end - start).
 *                              {Number} zoomMax    Set a maximum value for
 *                                                  (end - start).
 */
Range.prototype.setOptions = function (options) {
    util.extend(this.options, options);

    if (options.start != null || options.end != null) {
        this.setRange(options.start, options.end);
    }
};

/**
 * Add listeners for mouse and touch events to the component
 * @param {Component} component
 * @param {String} event        Available events: 'move', 'zoom'
 * @param {String} direction    Available directions: 'horizontal', 'vertical'
 */
Range.prototype.subscribe = function (component, event, direction) {
    var me = this;
    var listener;

    if (direction != 'horizontal' && direction != 'vertical') {
        throw new TypeError('Unknown direction "' + direction + '". ' +
            'Choose "horizontal" or "vertical".');
    }

    //noinspection FallthroughInSwitchStatementJS
    if (event == 'move') {
        listener = {
            component: component,
            event: event,
            direction: direction,
            callback: function (event) {
                me._onMouseDown(event, listener);
            },
            params: {}
        };

        component.on('mousedown', listener.callback);
        me.listeners.push(listener);
    }
    else if (event == 'zoom') {
        listener = {
            component: component,
            event: event,
            direction: direction,
            callback: function (event) {
                me._onMouseWheel(event, listener);
            },
            params: {}
        };

        component.on('mousewheel', listener.callback);
        me.listeners.push(listener);
    }
    else {
        throw new TypeError('Unknown event "' + event + '". ' +
            'Choose "move" or "zoom".');
    }
};

/**
 * Event handler
 * @param {String} event       name of the event, for example 'click', 'mousemove'
 * @param {function} callback  callback handler, invoked with the raw HTML Event
 *                             as parameter.
 */
Range.prototype.on = function (event, callback) {
    events.addListener(this, event, callback);
};

/**
 * Trigger an event
 * @param {String} event    name of the event, available events: 'rangechange',
 *                          'rangechanged'
 * @private
 */
Range.prototype._trigger = function (event) {
    events.trigger(this, event, {
        start: this.start,
        end: this.end
    });
};

/**
 * Set a new start and end range
 * @param {Number} start
 * @param {Number} end
 */
Range.prototype.setRange = function(start, end) {
    var changed = this._applyRange(start, end);
    if (changed) {
        this._trigger('rangechange');
        this._trigger('rangechanged');
    }
};

/**
 * Set a new start and end range. This method is the same as setRange, but
 * does not trigger a range change and range changed event, and it returns
 * true when the range is changed
 * @param {Number} start
 * @param {Number} end
 * @return {Boolean} changed
 * @private
 */
Range.prototype._applyRange = function(start, end) {
    var newStart = (start != null) ? util.cast(start, 'Number') : this.start;
    var newEnd = (end != null) ? util.cast(end, 'Number') : this.end;
    var diff;

    // check for valid number
    if (isNaN(newStart)) {
        throw new Error('Invalid start "' + start + '"');
    }
    if (isNaN(newEnd)) {
        throw new Error('Invalid end "' + end + '"');
    }

    // prevent start < end
    if (newEnd < newStart) {
        newEnd = newStart;
    }

    // prevent start < min
    if (this.options.min != null) {
        var min = this.options.min.valueOf();
        if (newStart < min) {
            diff = (min - newStart);
            newStart += diff;
            newEnd += diff;
        }
    }

    // prevent end > max
    if (this.options.max != null) {
        var max = this.options.max.valueOf();
        if (newEnd > max) {
            diff = (newEnd - max);
            newStart -= diff;
            newEnd -= diff;
        }
    }

    // prevent (end-start) > zoomMin
    if (this.options.zoomMin != null) {
        var zoomMin = this.options.zoomMin.valueOf();
        if (zoomMin < 0) {
            zoomMin = 0;
        }
        if ((newEnd - newStart) < zoomMin) {
            if ((this.end - this.start) > zoomMin) {
                // zoom to the minimum
                diff = (zoomMin - (newEnd - newStart));
                newStart -= diff / 2;
                newEnd += diff / 2;
            }
            else {
                // ingore this action, we are already zoomed to the minimum
                newStart = this.start;
                newEnd = this.end;
            }
        }
    }

    // prevent (end-start) > zoomMin
    if (this.options.zoomMax != null) {
        var zoomMax = this.options.zoomMax.valueOf();
        if (zoomMax < 0) {
            zoomMax = 0;
        }
        if ((newEnd - newStart) > zoomMax) {
            if ((this.end - this.start) < zoomMax) {
                // zoom to the maximum
                diff = ((newEnd - newStart) - zoomMax);
                newStart += diff / 2;
                newEnd -= diff / 2;
            }
            else {
                // ingore this action, we are already zoomed to the maximum
                newStart = this.start;
                newEnd = this.end;
            }
        }
    }

    var changed = (this.start != newStart || this.end != newEnd);

    this.start = newStart;
    this.end = newEnd;

    return changed;
};

/**
 * Retrieve the current range.
 * @return {Object} An object with start and end properties
 */
Range.prototype.getRange = function() {
    return {
        start: this.start,
        end: this.end
    };
};

/**
 * Calculate the conversion offset and factor for current range, based on
 * the provided width
 * @param {Number} width
 * @returns {{offset: number, factor: number}} conversion
 */
Range.prototype.conversion = function (width) {
    var start = this.start;
    var end = this.end;

    return Range.conversion(this.start, this.end, width);
};

/**
 * Static method to calculate the conversion offset and factor for a range,
 * based on the provided start, end, and width
 * @param {Number} start
 * @param {Number} end
 * @param {Number} width
 * @returns {{offset: number, factor: number}} conversion
 */
Range.conversion = function (start, end, width) {
    if (width != 0 && (end - start != 0)) {
        return {
            offset: start,
            factor: width / (end - start)
        }
    }
    else {
        return {
            offset: 0,
            factor: 1
        };
    }
};

/**
 * Start moving horizontally or vertically
 * @param {Event} event
 * @param {Object} listener   Listener containing the component and params
 * @private
 */
Range.prototype._onMouseDown = function(event, listener) {
    event = event || window.event;
    var params = listener.params;

    // only react on left mouse button down
    var leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
    if (!leftButtonDown) {
        return;
    }

    // get mouse position
    params.mouseX = util.getPageX(event);
    params.mouseY = util.getPageY(event);
    params.previousLeft = 0;
    params.previousOffset = 0;

    params.moved = false;
    params.start = this.start;
    params.end = this.end;

    var frame = listener.component.frame;
    if (frame) {
        frame.style.cursor = 'move';
    }

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the timeaxis,
    // so we can remove the eventlisteners lateron in the function onmouseup
    var me = this;
    if (!params.onMouseMove) {
        params.onMouseMove = function (event) {
            me._onMouseMove(event, listener);
        };
        util.addEventListener(document, "mousemove", params.onMouseMove);
    }
    if (!params.onMouseUp) {
        params.onMouseUp = function (event) {
            me._onMouseUp(event, listener);
        };
        util.addEventListener(document, "mouseup", params.onMouseUp);
    }

    util.preventDefault(event);
};

/**
 * Perform moving operating.
 * This function activated from within the funcion TimeAxis._onMouseDown().
 * @param {Event} event
 * @param {Object} listener
 * @private
 */
Range.prototype._onMouseMove = function (event, listener) {
    event = event || window.event;

    var params = listener.params;

    // calculate change in mouse position
    var mouseX = util.getPageX(event);
    var mouseY = util.getPageY(event);

    if (params.mouseX == undefined) {
        params.mouseX = mouseX;
    }
    if (params.mouseY == undefined) {
        params.mouseY = mouseY;
    }

    var diffX = mouseX - params.mouseX;
    var diffY = mouseY - params.mouseY;
    var diff = (listener.direction == 'horizontal') ? diffX : diffY;

    // if mouse movement is big enough, register it as a "moved" event
    if (Math.abs(diff) >= 1) {
        params.moved = true;
    }

    var interval = (params.end - params.start);
    var width = (listener.direction == 'horizontal') ?
        listener.component.width : listener.component.height;
    var diffRange = -diff / width * interval;
    this._applyRange(params.start + diffRange, params.end + diffRange);

    // fire a rangechange event
    this._trigger('rangechange');

    util.preventDefault(event);
};

/**
 * Stop moving operating.
 * This function activated from within the function Range._onMouseDown().
 * @param {event} event
 * @param {Object} listener
 * @private
 */
Range.prototype._onMouseUp = function (event, listener) {
    event = event || window.event;

    var params = listener.params;

    if (listener.component.frame) {
        listener.component.frame.style.cursor = 'auto';
    }

    // remove event listeners here, important for Safari
    if (params.onMouseMove) {
        util.removeEventListener(document, "mousemove", params.onMouseMove);
        params.onMouseMove = null;
    }
    if (params.onMouseUp) {
        util.removeEventListener(document, "mouseup",   params.onMouseUp);
        params.onMouseUp = null;
    }
    //util.preventDefault(event);

    if (params.moved) {
        // fire a rangechanged event
        this._trigger('rangechanged');
    }
};

/**
 * Event handler for mouse wheel event, used to zoom
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {Event} event
 * @param {Object} listener
 * @private
 */
Range.prototype._onMouseWheel = function(event, listener) {
    event = event || window.event;

    // retrieve delta
    var delta = 0;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta / 120;
    } else if (event.detail) { /* Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        // Also, delta is multiple of 3.
        delta = -event.detail / 3;
    }

    // If delta is nonzero, handle it.
    // Basically, delta is now positive if wheel was scrolled up,
    // and negative, if wheel was scrolled down.
    if (delta) {
        var me = this;
        var zoom = function () {
            // perform the zoom action. Delta is normally 1 or -1
            var zoomFactor = delta / 5.0;
            var zoomAround = null;
            var frame = listener.component.frame;
            if (frame) {
                var size, conversion;
                if (listener.direction == 'horizontal') {
                    size = listener.component.width;
                    conversion = me.conversion(size);
                    var frameLeft = util.getAbsoluteLeft(frame);
                    var mouseX = util.getPageX(event);
                    zoomAround = (mouseX - frameLeft) / conversion.factor + conversion.offset;
                }
                else {
                    size = listener.component.height;
                    conversion = me.conversion(size);
                    var frameTop = util.getAbsoluteTop(frame);
                    var mouseY = util.getPageY(event);
                    zoomAround = ((frameTop + size - mouseY) - frameTop) / conversion.factor + conversion.offset;
                }
            }

            me.zoom(zoomFactor, zoomAround);
        };

        zoom();
    }

    // Prevent default actions caused by mouse wheel.
    // That might be ugly, but we handle scrolls somehow
    // anyway, so don't bother here...
    util.preventDefault(event);
};


/**
 * Zoom the range the given zoomfactor in or out. Start and end date will
 * be adjusted, and the timeline will be redrawn. You can optionally give a
 * date around which to zoom.
 * For example, try zoomfactor = 0.1 or -0.1
 * @param {Number} zoomFactor      Zooming amount. Positive value will zoom in,
 *                                 negative value will zoom out
 * @param {Number} zoomAround      Value around which will be zoomed. Optional
 */
Range.prototype.zoom = function(zoomFactor, zoomAround) {
    // if zoomAroundDate is not provided, take it half between start Date and end Date
    if (zoomAround == null) {
        zoomAround = (this.start + this.end) / 2;
    }

    // prevent zoom factor larger than 1 or smaller than -1 (larger than 1 will
    // result in a start>=end )
    if (zoomFactor >= 1) {
        zoomFactor = 0.9;
    }
    if (zoomFactor <= -1) {
        zoomFactor = -0.9;
    }

    // adjust a negative factor such that zooming in with 0.1 equals zooming
    // out with a factor -0.1
    if (zoomFactor < 0) {
        zoomFactor = zoomFactor / (1 + zoomFactor);
    }

    // zoom start and end relative to the zoomAround value
    var startDiff = (this.start - zoomAround);
    var endDiff = (this.end - zoomAround);

    // calculate new start and end
    var newStart = this.start - startDiff * zoomFactor;
    var newEnd = this.end - endDiff * zoomFactor;

    this.setRange(newStart, newEnd);
};

/**
 * Move the range with a given factor to the left or right. Start and end
 * value will be adjusted. For example, try moveFactor = 0.1 or -0.1
 * @param {Number}  moveFactor     Moving amount. Positive value will move right,
 *                                 negative value will move left
 */
Range.prototype.move = function(moveFactor) {
    // zoom start Date and end Date relative to the zoomAroundDate
    var diff = (this.end - this.start);

    // apply new values
    var newStart = this.start + diff * moveFactor;
    var newEnd = this.end + diff * moveFactor;

    // TODO: reckon with min and max range

    this.start = newStart;
    this.end = newEnd;
};

/**
 * @constructor Controller
 *
 * A Controller controls the reflows and repaints of all visual components
 */
function Controller () {
    this.id = util.randomUUID();
    this.components = {};

    this.repaintTimer = undefined;
    this.reflowTimer = undefined;
}

/**
 * Add a component to the controller
 * @param {Component} component
 */
Controller.prototype.add = function add(component) {
    // validate the component
    if (component.id == undefined) {
        throw new Error('Component has no field id');
    }
    if (!(component instanceof Component) && !(component instanceof Controller)) {
        throw new TypeError('Component must be an instance of ' +
            'prototype Component or Controller');
    }

    // add the component
    component.controller = this;
    this.components[component.id] = component;
};

/**
 * Remove a component from the controller
 * @param {Component | String} component
 */
Controller.prototype.remove = function remove(component) {
    var id;
    for (id in this.components) {
        if (this.components.hasOwnProperty(id)) {
            if (id == component || this.components[id] == component) {
                break;
            }
        }
    }

    if (id) {
        delete this.components[id];
    }
};

/**
 * Request a reflow. The controller will schedule a reflow
 * @param {Boolean} [force]     If true, an immediate reflow is forced. Default
 *                              is false.
 */
Controller.prototype.requestReflow = function requestReflow(force) {
    if (force) {
        this.reflow();
    }
    else {
        if (!this.reflowTimer) {
            var me = this;
            this.reflowTimer = setTimeout(function () {
                me.reflowTimer = undefined;
                me.reflow();
            }, 0);
        }
    }
};

/**
 * Request a repaint. The controller will schedule a repaint
 * @param {Boolean} [force]    If true, an immediate repaint is forced. Default
 *                             is false.
 */
Controller.prototype.requestRepaint = function requestRepaint(force) {
    if (force) {
        this.repaint();
    }
    else {
        if (!this.repaintTimer) {
            var me = this;
            this.repaintTimer = setTimeout(function () {
                me.repaintTimer = undefined;
                me.repaint();
            }, 0);
        }
    }
};

/**
 * Repaint all components
 */
Controller.prototype.repaint = function repaint() {
    var changed = false;

    // cancel any running repaint request
    if (this.repaintTimer) {
        clearTimeout(this.repaintTimer);
        this.repaintTimer = undefined;
    }

    var done = {};

    function repaint(component, id) {
        if (!(id in done)) {
            // first repaint the components on which this component is dependent
            if (component.depends) {
                component.depends.forEach(function (dep) {
                    repaint(dep, dep.id);
                });
            }
            if (component.parent) {
                repaint(component.parent, component.parent.id);
            }

            // repaint the component itself and mark as done
            changed = component.repaint() || changed;
            done[id] = true;
        }
    }

    util.forEach(this.components, repaint);

    // immediately reflow when needed
    if (changed) {
        this.reflow();
    }
    // TODO: limit the number of nested reflows/repaints, prevent loop
};

/**
 * Reflow all components
 */
Controller.prototype.reflow = function reflow() {
    var resized = false;

    // cancel any running repaint request
    if (this.reflowTimer) {
        clearTimeout(this.reflowTimer);
        this.reflowTimer = undefined;
    }

    var done = {};

    function reflow(component, id) {
        if (!(id in done)) {
            // first reflow the components on which this component is dependent
            if (component.depends) {
                component.depends.forEach(function (dep) {
                    reflow(dep, dep.id);
                });
            }
            if (component.parent) {
                reflow(component.parent, component.parent.id);
            }

            // reflow the component itself and mark as done
            resized = component.reflow() || resized;
            done[id] = true;
        }
    }

    util.forEach(this.components, reflow);

    // immediately repaint when needed
    if (resized) {
        this.repaint();
    }
    // TODO: limit the number of nested reflows/repaints, prevent loop
};

/**
 * Prototype for visual components
 */
function Component () {
    this.id = null;
    this.parent = null;
    this.depends = null;
    this.controller = null;
    this.options = null;

    this.frame = null; // main DOM element
    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

/**
 * Set parameters for the frame. Parameters will be merged in current parameter
 * set.
 * @param {Object} options  Available parameters:
 *                          {String | function} [className]
 *                          {EventBus} [eventBus]
 *                          {String | Number | function} [left]
 *                          {String | Number | function} [top]
 *                          {String | Number | function} [width]
 *                          {String | Number | function} [height]
 */
Component.prototype.setOptions = function setOptions(options) {
    if (options) {
        util.extend(this.options, options);

        if (this.controller) {
            this.requestRepaint();
            this.requestReflow();
        }
    }
};

/**
 * Get an option value by name
 * The function will first check this.options object, and else will check
 * this.defaultOptions.
 * @param {String} name
 * @return {*} value
 */
Component.prototype.getOption = function getOption(name) {
    var value;
    if (this.options) {
        value = this.options[name];
    }
    if (value === undefined && this.defaultOptions) {
        value = this.defaultOptions[name];
    }
    return value;
};

/**
 * Get the container element of the component, which can be used by a child to
 * add its own widgets. Not all components do have a container for childs, in
 * that case null is returned.
 * @returns {HTMLElement | null} container
 */
Component.prototype.getContainer = function getContainer() {
    // should be implemented by the component
    return null;
};

/**
 * Get the frame element of the component, the outer HTML DOM element.
 * @returns {HTMLElement | null} frame
 */
Component.prototype.getFrame = function getFrame() {
    return this.frame;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
Component.prototype.repaint = function repaint() {
    // should be implemented by the component
    return false;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
Component.prototype.reflow = function reflow() {
    // should be implemented by the component
    return false;
};

/**
 * Hide the component from the DOM
 * @return {Boolean} changed
 */
Component.prototype.hide = function hide() {
    if (this.frame && this.frame.parentNode) {
        this.frame.parentNode.removeChild(this.frame);
        return true;
    }
    else {
        return false;
    }
};

/**
 * Show the component in the DOM (when not already visible).
 * A repaint will be executed when the component is not visible
 * @return {Boolean} changed
 */
Component.prototype.show = function show() {
    if (!this.frame || !this.frame.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Request a repaint. The controller will schedule a repaint
 */
Component.prototype.requestRepaint = function requestRepaint() {
    if (this.controller) {
        this.controller.requestRepaint();
    }
    else {
        throw new Error('Cannot request a repaint: no controller configured');
        // TODO: just do a repaint when no parent is configured?
    }
};

/**
 * Request a reflow. The controller will schedule a reflow
 */
Component.prototype.requestReflow = function requestReflow() {
    if (this.controller) {
        this.controller.requestReflow();
    }
    else {
        throw new Error('Cannot request a reflow: no controller configured');
        // TODO: just do a reflow when no parent is configured?
    }
};

/**
 * A panel can contain components
 * @param {Component} [parent]
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]    Available parameters:
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | function} [className]
 * @constructor Panel
 * @extends Component
 */
function Panel(parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

    this.options = options || {};
}

Panel.prototype = new Component();

/**
 * Set options. Will extend the current options.
 * @param {Object} [options]    Available parameters:
 *                              {String | function} [className]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 */
Panel.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
Panel.prototype.getContainer = function () {
    return this.frame;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
Panel.prototype.repaint = function () {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'panel';

        var className = options.className;
        if (className) {
            if (typeof className == 'function') {
                util.addClassName(frame, String(className()));
            }
            else {
                util.addClassName(frame, String(className));
            }
        }

        this.frame = frame;
        changed += 1;
    }
    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint panel: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint panel: parent has no container element');
        }
        parentContainer.appendChild(frame);
        changed += 1;
    }

    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));
    changed += update(frame.style, 'height', asSize(options.height, '100%'));

    return (changed > 0);
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
Panel.prototype.reflow = function () {
    var changed = 0,
        update = util.updateProperty,
        frame = this.frame;

    if (frame) {
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
        changed += update(this, 'height', frame.offsetHeight);
    }
    else {
        changed += 1;
    }

    return (changed > 0);
};

/**
 * A root panel can hold components. The root panel must be initialized with
 * a DOM element as container.
 * @param {HTMLElement} container
 * @param {Object} [options]    Available parameters: see RootPanel.setOptions.
 * @constructor RootPanel
 * @extends Panel
 */
function RootPanel(container, options) {
    this.id = util.randomUUID();
    this.container = container;

    this.options = options || {};
    this.defaultOptions = {
        autoResize: true
    };

    this.listeners = {}; // event listeners
}

RootPanel.prototype = new Panel();

/**
 * Set options. Will extend the current options.
 * @param {Object} [options]    Available parameters:
 *                              {String | function} [className]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {Boolean | function} [autoResize]
 */
RootPanel.prototype.setOptions = Component.prototype.setOptions;

/**
 * Repaint the component
 * @return {Boolean} changed
 */
RootPanel.prototype.repaint = function () {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'graph panel';

        var className = options.className;
        if (className) {
            util.addClassName(frame, util.option.asString(className));
        }

        this.frame = frame;
        changed += 1;
    }
    if (!frame.parentNode) {
        if (!this.container) {
            throw new Error('Cannot repaint root panel: no container attached');
        }
        this.container.appendChild(frame);
        changed += 1;
    }

    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));
    changed += update(frame.style, 'height', asSize(options.height, '100%'));

    this._updateEventEmitters();
    this._updateWatch();

    return (changed > 0);
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
RootPanel.prototype.reflow = function () {
    var changed = 0,
        update = util.updateProperty,
        frame = this.frame;

    if (frame) {
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
        changed += update(this, 'height', frame.offsetHeight);
    }
    else {
        changed += 1;
    }

    return (changed > 0);
};

/**
 * Update watching for resize, depending on the current option
 * @private
 */
RootPanel.prototype._updateWatch = function () {
    var autoResize = this.getOption('autoResize');
    if (autoResize) {
        this._watch();
    }
    else {
        this._unwatch();
    }
};

/**
 * Watch for changes in the size of the frame. On resize, the Panel will
 * automatically redraw itself.
 * @private
 */
RootPanel.prototype._watch = function () {
    var me = this;

    this._unwatch();

    var checkSize = function () {
        var autoResize = me.getOption('autoResize');
        if (!autoResize) {
            // stop watching when the option autoResize is changed to false
            me._unwatch();
            return;
        }

        if (me.frame) {
            // check whether the frame is resized
            if ((me.frame.clientWidth != me.width) ||
                    (me.frame.clientHeight != me.height)) {
                me.requestReflow();
            }
        }
    };

    // TODO: automatically cleanup the event listener when the frame is deleted
    util.addEventListener(window, 'resize', checkSize);

    this.watchTimer = setInterval(checkSize, 1000);
};

/**
 * Stop watching for a resize of the frame.
 * @private
 */
RootPanel.prototype._unwatch = function () {
    if (this.watchTimer) {
        clearInterval(this.watchTimer);
        this.watchTimer = undefined;
    }

    // TODO: remove event listener on window.resize
};

/**
 * Event handler
 * @param {String} event       name of the event, for example 'click', 'mousemove'
 * @param {function} callback  callback handler, invoked with the raw HTML Event
 *                             as parameter.
 */
RootPanel.prototype.on = function (event, callback) {
    // register the listener at this component
    var arr = this.listeners[event];
    if (!arr) {
        arr = [];
        this.listeners[event] = arr;
    }
    arr.push(callback);

    this._updateEventEmitters();
};

/**
 * Update the event listeners for all event emitters
 * @private
 */
RootPanel.prototype._updateEventEmitters = function () {
    if (this.listeners) {
        var me = this;
        util.forEach(this.listeners, function (listeners, event) {
            if (!me.emitters) {
                me.emitters = {};
            }
            if (!(event in me.emitters)) {
                // create event
                var frame = me.frame;
                if (frame) {
                    //console.log('Created a listener for event ' + event + ' on component ' + me.id); // TODO: cleanup logging
                    var callback = function(event) {
                        listeners.forEach(function (listener) {
                            // TODO: filter on event target!
                            listener(event);
                        });
                    };
                    me.emitters[event] = callback;
                    util.addEventListener(frame, event, callback);
                }
            }
        });

        // TODO: be able to delete event listeners
        // TODO: be able to move event listeners to a parent when available
    }
};

/**
 * A horizontal time axis
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See TimeAxis.setOptions for the available
 *                                  options.
 * @constructor TimeAxis
 * @extends Component
 */
function TimeAxis (parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

    this.dom = {
        majorLines: [],
        majorTexts: [],
        minorLines: [],
        minorTexts: [],
        redundant: {
            majorLines: [],
            majorTexts: [],
            minorLines: [],
            minorTexts: []
        }
    };
    this.props = {
        range: {
            start: 0,
            end: 0,
            minimumStep: 0
        },
        lineTop: 0
    };

    this.options = options || {};
    this.defaultOptions = {
        orientation: 'bottom',  // supported: 'top', 'bottom'
        // TODO: implement timeaxis orientations 'left' and 'right'
        showMinorLabels: true,
        showMajorLabels: true
    };

    this.conversion = null;
    this.range = null;
}

TimeAxis.prototype = new Component();

// TODO: comment options
TimeAxis.prototype.setOptions = Component.prototype.setOptions;

/**
 * Set a range (start and end)
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
TimeAxis.prototype.setRange = function (range) {
    if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
        throw new TypeError('Range must be an instance of Range, ' +
            'or an object containing start and end.');
    }
    this.range = range;
};

/**
 * Convert a position on screen (pixels) to a datetime
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
TimeAxis.prototype.toTime = function(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 * @private
 */
TimeAxis.prototype.toScreen = function(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
TimeAxis.prototype.repaint = function () {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        orientation = this.getOption('orientation'),
        props = this.props,
        step = this.step;

    var frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        this.frame = frame;
        changed += 1;
    }
    frame.className = 'axis ' + orientation;
    // TODO: custom className?

    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint time axis: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint time axis: parent has no container element');
        }
        parentContainer.appendChild(frame);

        changed += 1;
    }

    var parent = frame.parentNode;
    if (parent) {
        var beforeChild = frame.nextSibling;
        parent.removeChild(frame); //  take frame offline while updating (is almost twice as fast)

        var defaultTop = (orientation == 'bottom' && this.props.parentHeight && this.height) ?
            (this.props.parentHeight - this.height) + 'px' :
            '0px';
        changed += update(frame.style, 'top', asSize(options.top, defaultTop));
        changed += update(frame.style, 'left', asSize(options.left, '0px'));
        changed += update(frame.style, 'width', asSize(options.width, '100%'));
        changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));

        // get characters width and height
        this._repaintMeasureChars();

        if (this.step) {
            this._repaintStart();

            step.first();
            var xFirstMajorLabel = undefined;
            var max = 0;
            while (step.hasNext() && max < 1000) {
                max++;
                var cur = step.getCurrent(),
                    x = this.toScreen(cur),
                    isMajor = step.isMajor();

                // TODO: lines must have a width, such that we can create css backgrounds

                if (this.getOption('showMinorLabels')) {
                    this._repaintMinorText(x, step.getLabelMinor());
                }

                if (isMajor && this.getOption('showMajorLabels')) {
                    if (x > 0) {
                        if (xFirstMajorLabel == undefined) {
                            xFirstMajorLabel = x;
                        }
                        this._repaintMajorText(x, step.getLabelMajor());
                    }
                    this._repaintMajorLine(x);
                }
                else {
                    this._repaintMinorLine(x);
                }

                step.next();
            }

            // create a major label on the left when needed
            if (this.getOption('showMajorLabels')) {
                var leftTime = this.toTime(0),
                    leftText = step.getLabelMajor(leftTime),
                    widthText = leftText.length * (props.majorCharWidth || 10) + 10; // upper bound estimation

                if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
                    this._repaintMajorText(0, leftText);
                }
            }

            this._repaintEnd();
        }

        this._repaintLine();

        // put frame online again
        if (beforeChild) {
            parent.insertBefore(frame, beforeChild);
        }
        else {
            parent.appendChild(frame)
        }
    }

    return (changed > 0);
};

/**
 * Start a repaint. Move all DOM elements to a redundant list, where they
 * can be picked for re-use, or can be cleaned up in the end
 * @private
 */
TimeAxis.prototype._repaintStart = function () {
    var dom = this.dom,
        redundant = dom.redundant;

    redundant.majorLines = dom.majorLines;
    redundant.majorTexts = dom.majorTexts;
    redundant.minorLines = dom.minorLines;
    redundant.minorTexts = dom.minorTexts;

    dom.majorLines = [];
    dom.majorTexts = [];
    dom.minorLines = [];
    dom.minorTexts = [];
};

/**
 * End a repaint. Cleanup leftover DOM elements in the redundant list
 * @private
 */
TimeAxis.prototype._repaintEnd = function () {
    util.forEach(this.dom.redundant, function (arr) {
        while (arr.length) {
            var elem = arr.pop();
            if (elem && elem.parentNode) {
                elem.parentNode.removeChild(elem);
            }
        }
    });
};


/**
 * Create a minor label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @private
 */
TimeAxis.prototype._repaintMinorText = function (x, text) {
    // reuse redundant label
    var label = this.dom.redundant.minorTexts.shift();

    if (!label) {
        // create new label
        var content = document.createTextNode('');
        label = document.createElement('div');
        label.appendChild(content);
        label.className = 'text minor';
        this.frame.appendChild(label);
    }
    this.dom.minorTexts.push(label);

    label.childNodes[0].nodeValue = text;
    label.style.left = x + 'px';
    label.style.top  = this.props.minorLabelTop + 'px';
    //label.title = title;  // TODO: this is a heavy operation
};

/**
 * Create a Major label for the axis at position x
 * @param {Number} x
 * @param {String} text
 * @private
 */
TimeAxis.prototype._repaintMajorText = function (x, text) {
    // reuse redundant label
    var label = this.dom.redundant.majorTexts.shift();

    if (!label) {
        // create label
        var content = document.createTextNode(text);
        label = document.createElement('div');
        label.className = 'text major';
        label.appendChild(content);
        this.frame.appendChild(label);
    }
    this.dom.majorTexts.push(label);

    label.childNodes[0].nodeValue = text;
    label.style.top = this.props.majorLabelTop + 'px';
    label.style.left = x + 'px';
    //label.title = title; // TODO: this is a heavy operation
};

/**
 * Create a minor line for the axis at position x
 * @param {Number} x
 * @private
 */
TimeAxis.prototype._repaintMinorLine = function (x) {
    // reuse redundant line
    var line = this.dom.redundant.minorLines.shift();

    if (!line) {
        // create vertical line
        line = document.createElement('div');
        line.className = 'grid vertical minor';
        this.frame.appendChild(line);
    }
    this.dom.minorLines.push(line);

    var props = this.props;
    line.style.top = props.minorLineTop + 'px';
    line.style.height = props.minorLineHeight + 'px';
    line.style.left = (x - props.minorLineWidth / 2) + 'px';
};

/**
 * Create a Major line for the axis at position x
 * @param {Number} x
 * @private
 */
TimeAxis.prototype._repaintMajorLine = function (x) {
    // reuse redundant line
    var line = this.dom.redundant.majorLines.shift();

    if (!line) {
        // create vertical line
        line = document.createElement('DIV');
        line.className = 'grid vertical major';
        this.frame.appendChild(line);
    }
    this.dom.majorLines.push(line);

    var props = this.props;
    line.style.top = props.majorLineTop + 'px';
    line.style.left = (x - props.majorLineWidth / 2) + 'px';
    line.style.height = props.majorLineHeight + 'px';
};


/**
 * Repaint the horizontal line for the axis
 * @private
 */
TimeAxis.prototype._repaintLine = function() {
    var line = this.dom.line,
        frame = this.frame,
        options = this.options;

    // line before all axis elements
    if (this.getOption('showMinorLabels') || this.getOption('showMajorLabels')) {
        if (line) {
            // put this line at the end of all childs
            frame.removeChild(line);
            frame.appendChild(line);
        }
        else {
            // create the axis line
            line = document.createElement('div');
            line.className = 'grid horizontal major';
            frame.appendChild(line);
            this.dom.line = line;
        }

        line.style.top = this.props.lineTop + 'px';
    }
    else {
        if (line && axis.parentElement) {
            frame.removeChild(axis.line);
            delete this.dom.line;
        }
    }
};

/**
 * Create characters used to determine the size of text on the axis
 * @private
 */
TimeAxis.prototype._repaintMeasureChars = function () {
    // calculate the width and height of a single character
    // this is used to calculate the step size, and also the positioning of the
    // axis
    var dom = this.dom,
        text;

    if (!dom.measureCharMinor) {
        text = document.createTextNode('0');
        var measureCharMinor = document.createElement('DIV');
        measureCharMinor.className = 'text minor measure';
        measureCharMinor.appendChild(text);
        this.frame.appendChild(measureCharMinor);

        dom.measureCharMinor = measureCharMinor;
    }

    if (!dom.measureCharMajor) {
        text = document.createTextNode('0');
        var measureCharMajor = document.createElement('DIV');
        measureCharMajor.className = 'text major measure';
        measureCharMajor.appendChild(text);
        this.frame.appendChild(measureCharMajor);

        dom.measureCharMajor = measureCharMajor;
    }
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
TimeAxis.prototype.reflow = function () {
    var changed = 0,
        update = util.updateProperty,
        frame = this.frame,
        range = this.range;

    if (!range) {
        throw new Error('Cannot repaint time axis: no range configured');
    }

    if (frame) {
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);

        // calculate size of a character
        var props = this.props,
            showMinorLabels = this.getOption('showMinorLabels'),
            showMajorLabels = this.getOption('showMajorLabels'),
            measureCharMinor = this.dom.measureCharMinor,
            measureCharMajor = this.dom.measureCharMajor;
        if (measureCharMinor) {
            props.minorCharHeight = measureCharMinor.clientHeight;
            props.minorCharWidth = measureCharMinor.clientWidth;
        }
        if (measureCharMajor) {
            props.majorCharHeight = measureCharMajor.clientHeight;
            props.majorCharWidth = measureCharMajor.clientWidth;
        }

        var parentHeight = frame.parentNode ? frame.parentNode.offsetHeight : 0;
        if (parentHeight != props.parentHeight) {
            props.parentHeight = parentHeight;
            changed += 1;
        }
        switch (this.getOption('orientation')) {
            case 'bottom':
                props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
                props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

                props.minorLabelTop = 0;
                props.majorLabelTop = props.minorLabelTop + props.minorLabelHeight;

                props.minorLineTop = -this.top;
                props.minorLineHeight = Math.max(this.top + props.majorLabelHeight, 0);
                props.minorLineWidth = 1; // TODO: really calculate width

                props.majorLineTop = -this.top;
                props.majorLineHeight = Math.max(this.top + props.minorLabelHeight + props.majorLabelHeight, 0);
                props.majorLineWidth = 1; // TODO: really calculate width

                props.lineTop = 0;

                break;

            case 'top':
                props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
                props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;

                props.majorLabelTop = 0;
                props.minorLabelTop = props.majorLabelTop + props.majorLabelHeight;

                props.minorLineTop = props.minorLabelTop;
                props.minorLineHeight = Math.max(parentHeight - props.majorLabelHeight - this.top);
                props.minorLineWidth = 1; // TODO: really calculate width

                props.majorLineTop = 0;
                props.majorLineHeight = Math.max(parentHeight - this.top);
                props.majorLineWidth = 1; // TODO: really calculate width

                props.lineTop = props.majorLabelHeight +  props.minorLabelHeight;

                break;

            default:
                throw new Error('Unkown orientation "' + this.getOption('orientation') + '"');
        }

        var height = props.minorLabelHeight + props.majorLabelHeight;
        changed += update(this, 'width', frame.offsetWidth);
        changed += update(this, 'height', height);

        // calculate range and step
        this._updateConversion();

        var start = util.cast(range.start, 'Date'),
            end = util.cast(range.end, 'Date'),
            minimumStep = this.toTime((props.minorCharWidth || 10) * 5) - this.toTime(0);
        this.step = new TimeStep(start, end, minimumStep);
        changed += update(props.range, 'start', start.valueOf());
        changed += update(props.range, 'end', end.valueOf());
        changed += update(props.range, 'minimumStep', minimumStep.valueOf());
    }

    return (changed > 0);
};

/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods toTime
 * and toScreen can be used.
 * @private
 */
TimeAxis.prototype._updateConversion = function() {
    var range = this.range;
    if (!range) {
        throw new Error('No range configured');
    }

    if (range.conversion) {
        this.conversion = range.conversion(this.width);
    }
    else {
        this.conversion = Range.conversion(range.start, range.end, this.width);
    }
};

/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See ItemSet.setOptions for the available
 *                                  options.
 * @constructor ItemSet
 * @extends Panel
 */
// TODO: improve performance by replacing all Array.forEach with a for loop
function ItemSet(parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

    // one options object is shared by this itemset and all its items
    this.options = options || {};
    this.defaultOptions = {
        type: 'box',
        align: 'center',
        orientation: 'bottom',
        margin: {
            axis: 20,
            item: 10
        },
        padding: 5
    };

    this.dom = {};

    var me = this;
    this.itemsData = null;  // DataSet
    this.range = null;      // Range or Object {start: number, end: number}

    this.listeners = {
        'add': function (event, params, senderId) {
            if (senderId != me.id) {
                me._onAdd(params.items);
            }
        },
        'update': function (event, params, senderId) {
            if (senderId != me.id) {
                me._onUpdate(params.items);
            }
        },
        'remove': function (event, params, senderId) {
            if (senderId != me.id) {
                me._onRemove(params.items);
            }
        }
    };

    this.items = {};    // object with an Item for every data item
    this.queue = {};       // queue with id/actions: 'add', 'update', 'delete'
    this.stack = new Stack(this, Object.create(this.options));
    this.conversion = null;

    // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis
}

ItemSet.prototype = new Panel();

// available item types will be registered here
ItemSet.types = {
    box: ItemBox,
    range: ItemRange,
    point: ItemPoint
};

/**
 * Set options for the ItemSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} [className]
 *                              class name for the itemset
 *                           {String} [type]
 *                              Default type for the items. Choose from 'box'
 *                              (default), 'point', or 'range'. The default
 *                              Style can be overwritten by individual items.
 *                           {String} align
 *                              Alignment for the items, only applicable for
 *                              ItemBox. Choose 'center' (default), 'left', or
 *                              'right'.
 *                           {String} orientation
 *                              Orientation of the item set. Choose 'top' or
 *                              'bottom' (default).
 *                           {Number} margin.axis
 *                              Margin between the axis and the items in pixels.
 *                              Default is 20.
 *                           {Number} margin.item
 *                              Margin between items in pixels. Default is 10.
 *                           {Number} padding
 *                              Padding of the contents of an item in pixels.
 *                              Must correspond with the items css. Default is 5.
 */
ItemSet.prototype.setOptions = Component.prototype.setOptions;

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
ItemSet.prototype.setRange = function setRange(range) {
    if (!(range instanceof Range) && (!range || !range.start || !range.end)) {
        throw new TypeError('Range must be an instance of Range, ' +
            'or an object containing start and end.');
    }
    this.range = range;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
ItemSet.prototype.repaint = function repaint() {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        orientation = this.getOption('orientation'),
        defaultOptions = this.defaultOptions,
        frame = this.frame;

    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'itemset';

        var className = options.className;
        if (className) {
            util.addClassName(frame, util.option.asString(className));
        }

        // create background panel
        var background = document.createElement('div');
        background.className = 'background';
        frame.appendChild(background);
        this.dom.background = background;

        // create foreground panel
        var foreground = document.createElement('div');
        foreground.className = 'foreground';
        frame.appendChild(foreground);
        this.dom.foreground = foreground;

        // create axis panel
        var axis = document.createElement('div');
        axis.className = 'itemset-axis';
        //frame.appendChild(axis);
        this.dom.axis = axis;

        this.frame = frame;
        changed += 1;
    }

    if (!this.parent) {
        throw new Error('Cannot repaint itemset: no parent attached');
    }
    var parentContainer = this.parent.getContainer();
    if (!parentContainer) {
        throw new Error('Cannot repaint itemset: parent has no container element');
    }
    if (!frame.parentNode) {
        parentContainer.appendChild(frame);
        changed += 1;
    }
    if (!this.dom.axis.parentNode) {
        parentContainer.appendChild(this.dom.axis);
        changed += 1;
    }

    // reposition frame
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));
    changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));

    // reposition axis
    changed += update(this.dom.axis.style, 'left', asSize(options.left, '0px'));
    changed += update(this.dom.axis.style, 'width',  asSize(options.width, '100%'));
    if (orientation == 'bottom') {
        changed += update(this.dom.axis.style, 'top',  (this.height + this.top) + 'px');
    }
    else { // orientation == 'top'
        changed += update(this.dom.axis.style, 'top', this.top + 'px');
    }

    this._updateConversion();

    var me = this,
        queue = this.queue,
        itemsData = this.itemsData,
        items = this.items,
        dataOptions = {
            fields: [(itemsData && itemsData.fieldId || 'id'), 'start', 'end', 'content', 'type']
        };
    // TODO: copy options from the itemset itself?

    // show/hide added/changed/removed items
    Object.keys(queue).forEach(function (id) {
        //var entry = queue[id];
        var action = queue[id];
        var item = items[id];
        //var item = entry.item;
        //noinspection FallthroughInSwitchStatementJS
        switch (action) {
            case 'add':
            case 'update':
                var itemData = itemsData && itemsData.get(id, dataOptions);

                if (itemData) {
                    var type = itemData.type ||
                        (itemData.start && itemData.end && 'range') ||
                        options.type ||
                        'box';
                    var constructor = ItemSet.types[type];

                    // TODO: how to handle items with invalid data? hide them and give a warning? or throw an error?
                    if (item) {
                        // update item
                        if (!constructor || !(item instanceof constructor)) {
                            // item type has changed, hide and delete the item
                            changed += item.hide();
                            item = null;
                        }
                        else {
                            item.data = itemData; // TODO: create a method item.setData ?
                            changed++;
                        }
                    }

                    if (!item) {
                        // create item
                        if (constructor) {
                            item = new constructor(me, itemData, options, defaultOptions);
                            changed++;
                        }
                        else {
                            throw new TypeError('Unknown item type "' + type + '"');
                        }
                    }

                    // force a repaint (not only a reposition)
                    item.repaint();

                    items[id] = item;
                }

                // update queue
                delete queue[id];
                break;

            case 'remove':
                if (item) {
                    // remove DOM of the item
                    changed += item.hide();
                }

                // update lists
                delete items[id];
                delete queue[id];
                break;

            default:
                console.log('Error: unknown action "' + action + '"');
        }
    });

    // reposition all items. Show items only when in the visible area
    util.forEach(this.items, function (item) {
        if (item.visible) {
            changed += item.show();
            item.reposition();
        }
        else {
            changed += item.hide();
        }
    });

    return (changed > 0);
};

/**
 * Get the foreground container element
 * @return {HTMLElement} foreground
 */
ItemSet.prototype.getForeground = function getForeground() {
    return this.dom.foreground;
};

/**
 * Get the background container element
 * @return {HTMLElement} background
 */
ItemSet.prototype.getBackground = function getBackground() {
    return this.dom.background;
};

/**
 * Get the axis container element
 * @return {HTMLElement} axis
 */
ItemSet.prototype.getAxis = function getAxis() {
    return this.dom.axis;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
ItemSet.prototype.reflow = function reflow () {
    var changed = 0,
        options = this.options,
        marginAxis = options.margin && options.margin.axis || this.defaultOptions.margin.axis,
        marginItem = options.margin && options.margin.item || this.defaultOptions.margin.item,
        update = util.updateProperty,
        asNumber = util.option.asNumber,
        asSize = util.option.asSize,
        frame = this.frame;

    if (frame) {
        this._updateConversion();

        util.forEach(this.items, function (item) {
            changed += item.reflow();
        });

        // TODO: stack.update should be triggered via an event, in stack itself
        // TODO: only update the stack when there are changed items
        this.stack.update();

        var maxHeight = asNumber(options.maxHeight);
        var fixedHeight = (asSize(options.height) != null);
        var height;
        if (fixedHeight) {
            height = frame.offsetHeight;
        }
        else {
            // height is not specified, determine the height from the height and positioned items
            var visibleItems = this.stack.ordered; // TODO: not so nice way to get the filtered items
            if (visibleItems.length) {
                var min = visibleItems[0].top;
                var max = visibleItems[0].top + visibleItems[0].height;
                util.forEach(visibleItems, function (item) {
                    min = Math.min(min, item.top);
                    max = Math.max(max, (item.top + item.height));
                });
                height = (max - min) + marginAxis + marginItem;
            }
            else {
                height = marginAxis + marginItem;
            }
        }
        if (maxHeight != null) {
            height = Math.min(height, maxHeight);
        }
        changed += update(this, 'height', height);

        // calculate height from items
        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
    }
    else {
        changed += 1;
    }

    return (changed > 0);
};

/**
 * Hide this component from the DOM
 * @return {Boolean} changed
 */
ItemSet.prototype.hide = function hide() {
    var changed = false;

    // remove the DOM
    if (this.frame && this.frame.parentNode) {
        this.frame.parentNode.removeChild(this.frame);
        changed = true;
    }
    if (this.dom.axis && this.dom.axis.parentNode) {
        this.dom.axis.parentNode.removeChild(this.dom.axis);
        changed = true;
    }

    return changed;
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
ItemSet.prototype.setItems = function setItems(items) {
    var me = this,
        ids;

    // unsubscribe from current dataset
    var current = this.itemsData;
    if (current) {
        util.forEach(this.listeners, function (callback, event) {
            current.unsubscribe(event, callback);
        });

        // remove all drawn items
        ids = current.getIds();
        this._onRemove(ids);
    }

    // replace the dataset
    if (!items) {
        this.itemsData = null;
    }
    else if (items instanceof DataSet || items instanceof DataView) {
        this.itemsData = items;
    }
    else {
        throw new TypeError('Data must be an instance of DataSet');
    }

    if (this.itemsData) {
        // subscribe to new dataset
        var id = this.id;
        util.forEach(this.listeners, function (callback, event) {
            me.itemsData.subscribe(event, callback, id);
        });

        // draw all new items
        ids = this.itemsData.getIds();
        this._onAdd(ids);
    }
};

/**
 * Get the current items items
 * @returns {vis.DataSet | null}
 */
ItemSet.prototype.getItems = function getItems() {
    return this.itemsData;
};

/**
 * Handle updated items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onUpdate = function _onUpdate(ids) {
    this._toQueue('update', ids);
};

/**
 * Handle changed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onAdd = function _onAdd(ids) {
    this._toQueue('add', ids);
};

/**
 * Handle removed items
 * @param {Number[]} ids
 * @private
 */
ItemSet.prototype._onRemove = function _onRemove(ids) {
    this._toQueue('remove', ids);
};

/**
 * Put items in the queue to be added/updated/remove
 * @param {String} action     can be 'add', 'update', 'remove'
 * @param {Number[]} ids
 */
ItemSet.prototype._toQueue = function _toQueue(action, ids) {
    var queue = this.queue;
    ids.forEach(function (id) {
        queue[id] = action;
    });

    if (this.controller) {
        //this.requestReflow();
        this.requestRepaint();
    }
};

/**
 * Calculate the factor and offset to convert a position on screen to the
 * corresponding date and vice versa.
 * After the method _updateConversion is executed once, the methods toTime
 * and toScreen can be used.
 * @private
 */
ItemSet.prototype._updateConversion = function _updateConversion() {
    var range = this.range;
    if (!range) {
        throw new Error('No range configured');
    }

    if (range.conversion) {
        this.conversion = range.conversion(this.width);
    }
    else {
        this.conversion = Range.conversion(range.start, range.end, this.width);
    }
};

/**
 * Convert a position on screen (pixels) to a datetime
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {int}     x    Position on the screen in pixels
 * @return {Date}   time The datetime the corresponds with given position x
 */
ItemSet.prototype.toTime = function toTime(x) {
    var conversion = this.conversion;
    return new Date(x / conversion.factor + conversion.offset);
};

/**
 * Convert a datetime (Date object) into a position on the screen
 * Before this method can be used, the method _updateConversion must be
 * executed once.
 * @param {Date}   time A date
 * @return {int}   x    The position on the screen in pixels which corresponds
 *                      with the given date.
 */
ItemSet.prototype.toScreen = function toScreen(time) {
    var conversion = this.conversion;
    return (time.valueOf() - conversion.offset) * conversion.factor;
};

/**
 * @constructor Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing (optional) parameters type,
 *                                  start, end, content, group, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function Item (parent, data, options, defaultOptions) {
    this.parent = parent;
    this.data = data;
    this.dom = null;
    this.options = options || {};
    this.defaultOptions = defaultOptions || {};

    this.selected = false;
    this.visible = false;
    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

/**
 * Select current item
 */
Item.prototype.select = function select() {
    this.selected = true;
};

/**
 * Unselect current item
 */
Item.prototype.unselect = function unselect() {
    this.selected = false;
};

/**
 * Show the Item in the DOM (when not already visible)
 * @return {Boolean} changed
 */
Item.prototype.show = function show() {
    return false;
};

/**
 * Hide the Item from the DOM (when visible)
 * @return {Boolean} changed
 */
Item.prototype.hide = function hide() {
    return false;
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
Item.prototype.repaint = function repaint() {
    // should be implemented by the item
    return false;
};

/**
 * Reflow the item
 * @return {Boolean} resized
 */
Item.prototype.reflow = function reflow() {
    // should be implemented by the item
    return false;
};

/**
 * @constructor ItemBox
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemBox (parent, data, options, defaultOptions) {
    this.props = {
        dot: {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        },
        line: {
            top: 0,
            left: 0,
            width: 0,
            height: 0
        }
    };

    Item.call(this, parent, data, options, defaultOptions);
}

ItemBox.prototype = new Item (null, null);

/**
 * Select the item
 * @override
 */
ItemBox.prototype.select = function select() {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemBox.prototype.unselect = function unselect() {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemBox.prototype.repaint = function repaint() {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (!dom) {
        this._create();
        dom = this.dom;
        changed = true;
    }

    if (dom) {
        if (!this.parent) {
            throw new Error('Cannot repaint item: no parent attached');
        }
        var foreground = this.parent.getForeground();
        if (!foreground) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no foreground container element');
        }
        var background = this.parent.getBackground();
        if (!background) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no background container element');
        }
        var axis = this.parent.getAxis();
        if (!background) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no axis container element');
        }

        if (!dom.box.parentNode) {
            foreground.appendChild(dom.box);
            changed = true;
        }
        if (!dom.line.parentNode) {
            background.appendChild(dom.line);
            changed = true;
        }
        if (!dom.dot.parentNode) {
            axis.appendChild(dom.dot);
            changed = true;
        }

        // update contents
        if (this.data.content != this.content) {
            this.content = this.data.content;
            if (this.content instanceof Element) {
                dom.content.innerHTML = '';
                dom.content.appendChild(this.content);
            }
            else if (this.data.content != undefined) {
                dom.content.innerHTML = this.content;
            }
            else {
                throw new Error('Property "content" missing in item ' + this.data.id);
            }
            changed = true;
        }

        // update class
        var className = (this.data.className? ' ' + this.data.className : '') +
            (this.selected ? ' selected' : '');
        if (this.className != className) {
            this.className = className;
            dom.box.className = 'item box' + className;
            dom.line.className = 'item line' + className;
            dom.dot.className  = 'item dot' + className;
            changed = true;
        }
    }

    return changed;
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 * @return {Boolean} changed
 */
ItemBox.prototype.show = function show() {
    if (!this.dom || !this.dom.box.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
ItemBox.prototype.hide = function hide() {
    var changed = false,
        dom = this.dom;
    if (dom) {
        if (dom.box.parentNode) {
            dom.box.parentNode.removeChild(dom.box);
            changed = true;
        }
        if (dom.line.parentNode) {
            dom.line.parentNode.removeChild(dom.line);
        }
        if (dom.dot.parentNode) {
            dom.dot.parentNode.removeChild(dom.dot);
        }
    }
    return changed;
};

/**
 * Reflow the item: calculate its actual size and position from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemBox.prototype.reflow = function reflow() {
    var changed = 0,
        update,
        dom,
        props,
        options,
        margin,
        start,
        align,
        orientation,
        top,
        left,
        data,
        range;

    if (this.data.start == undefined) {
        throw new Error('Property "start" missing in item ' + this.data.id);
    }

    data = this.data;
    range = this.parent && this.parent.range;
    if (data && range) {
        // TODO: account for the width of the item. Take some margin
        this.visible = (data.start > range.start) && (data.start < range.end);
    }
    else {
        this.visible = false;
    }

    if (this.visible) {
        dom = this.dom;
        if (dom) {
            update = util.updateProperty;
            props = this.props;
            options = this.options;
            start = this.parent.toScreen(this.data.start);
            align = options.align || this.defaultOptions.align;
            margin = options.margin && options.margin.axis || this.defaultOptions.margin.axis;
            orientation = options.orientation || this.defaultOptions.orientation;

            changed += update(props.dot, 'height', dom.dot.offsetHeight);
            changed += update(props.dot, 'width', dom.dot.offsetWidth);
            changed += update(props.line, 'width', dom.line.offsetWidth);
            changed += update(props.line, 'height', dom.line.offsetHeight);
            changed += update(props.line, 'top', dom.line.offsetTop);
            changed += update(this, 'width', dom.box.offsetWidth);
            changed += update(this, 'height', dom.box.offsetHeight);
            if (align == 'right') {
                left = start - this.width;
            }
            else if (align == 'left') {
                left = start;
            }
            else {
                // default or 'center'
                left = start - this.width / 2;
            }
            changed += update(this, 'left', left);

            changed += update(props.line, 'left', start - props.line.width / 2);
            changed += update(props.dot, 'left', start - props.dot.width / 2);
            changed += update(props.dot, 'top', -props.dot.height / 2);
            if (orientation == 'top') {
                top = margin;

                changed += update(this, 'top', top);
            }
            else {
                // default or 'bottom'
                var parentHeight = this.parent.height;
                top = parentHeight - this.height - margin;

                changed += update(this, 'top', top);
            }
        }
        else {
            changed += 1;
        }
    }

    return (changed > 0);
};

/**
 * Create an items DOM
 * @private
 */
ItemBox.prototype._create = function _create() {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};

        // create the box
        dom.box = document.createElement('DIV');
        // className is updated in repaint()

        // contents box (inside the background box). used for making margins
        dom.content = document.createElement('DIV');
        dom.content.className = 'content';
        dom.box.appendChild(dom.content);

        // line to axis
        dom.line = document.createElement('DIV');
        dom.line.className = 'line';

        // dot on axis
        dom.dot = document.createElement('DIV');
        dom.dot.className = 'dot';
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemBox.prototype.reposition = function reposition() {
    var dom = this.dom,
        props = this.props,
        orientation = this.options.orientation || this.defaultOptions.orientation;

    if (dom) {
        var box = dom.box,
            line = dom.line,
            dot = dom.dot;

        box.style.left = this.left + 'px';
        box.style.top = this.top + 'px';

        line.style.left = props.line.left + 'px';
        if (orientation == 'top') {
            line.style.top = 0 + 'px';
            line.style.height = this.top + 'px';
        }
        else {
            // orientation 'bottom'
            line.style.top = (this.top + this.height) + 'px';
            line.style.height = Math.max(this.parent.height - this.top - this.height +
                this.props.dot.height / 2, 0) + 'px';
        }

        dot.style.left = props.dot.left + 'px';
        dot.style.top = props.dot.top + 'px';
    }
};

/**
 * @constructor ItemPoint
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemPoint (parent, data, options, defaultOptions) {
    this.props = {
        dot: {
            top: 0,
            width: 0,
            height: 0
        },
        content: {
            height: 0,
            marginLeft: 0
        }
    };

    Item.call(this, parent, data, options, defaultOptions);
}

ItemPoint.prototype = new Item (null, null);

/**
 * Select the item
 * @override
 */
ItemPoint.prototype.select = function select() {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemPoint.prototype.unselect = function unselect() {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemPoint.prototype.repaint = function repaint() {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (!dom) {
        this._create();
        dom = this.dom;
        changed = true;
    }

    if (dom) {
        if (!this.parent) {
            throw new Error('Cannot repaint item: no parent attached');
        }
        var foreground = this.parent.getForeground();
        if (!foreground) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no foreground container element');
        }

        if (!dom.point.parentNode) {
            foreground.appendChild(dom.point);
            foreground.appendChild(dom.point);
            changed = true;
        }

        // update contents
        if (this.data.content != this.content) {
            this.content = this.data.content;
            if (this.content instanceof Element) {
                dom.content.innerHTML = '';
                dom.content.appendChild(this.content);
            }
            else if (this.data.content != undefined) {
                dom.content.innerHTML = this.content;
            }
            else {
                throw new Error('Property "content" missing in item ' + this.data.id);
            }
            changed = true;
        }

        // update class
        var className = (this.data.className? ' ' + this.data.className : '') +
            (this.selected ? ' selected' : '');
        if (this.className != className) {
            this.className = className;
            dom.point.className  = 'item point' + className;
            changed = true;
        }
    }

    return changed;
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 * @return {Boolean} changed
 */
ItemPoint.prototype.show = function show() {
    if (!this.dom || !this.dom.point.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
ItemPoint.prototype.hide = function hide() {
    var changed = false,
        dom = this.dom;
    if (dom) {
        if (dom.point.parentNode) {
            dom.point.parentNode.removeChild(dom.point);
            changed = true;
        }
    }
    return changed;
};

/**
 * Reflow the item: calculate its actual size from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemPoint.prototype.reflow = function reflow() {
    var changed = 0,
        update,
        dom,
        props,
        options,
        margin,
        orientation,
        start,
        top,
        data,
        range;

    if (this.data.start == undefined) {
        throw new Error('Property "start" missing in item ' + this.data.id);
    }

    data = this.data;
    range = this.parent && this.parent.range;
    if (data && range) {
        // TODO: account for the width of the item. Take some margin
        this.visible = (data.start > range.start) && (data.start < range.end);
    }
    else {
        this.visible = false;
    }

    if (this.visible) {
        dom = this.dom;
        if (dom) {
            update = util.updateProperty;
            props = this.props;
            options = this.options;
            orientation = options.orientation || this.defaultOptions.orientation;
            margin = options.margin && options.margin.axis || this.defaultOptions.margin.axis;
            start = this.parent.toScreen(this.data.start);

            changed += update(this, 'width', dom.point.offsetWidth);
            changed += update(this, 'height', dom.point.offsetHeight);
            changed += update(props.dot, 'width', dom.dot.offsetWidth);
            changed += update(props.dot, 'height', dom.dot.offsetHeight);
            changed += update(props.content, 'height', dom.content.offsetHeight);

            if (orientation == 'top') {
                top = margin;
            }
            else {
                // default or 'bottom'
                var parentHeight = this.parent.height;
                top = Math.max(parentHeight - this.height - margin, 0);
            }
            changed += update(this, 'top', top);
            changed += update(this, 'left', start - props.dot.width / 2);
            changed += update(props.content, 'marginLeft', 1.5 * props.dot.width);
            //changed += update(props.content, 'marginRight', 0.5 * props.dot.width); // TODO

            changed += update(props.dot, 'top', (this.height - props.dot.height) / 2);
        }
        else {
            changed += 1;
        }
    }

    return (changed > 0);
};

/**
 * Create an items DOM
 * @private
 */
ItemPoint.prototype._create = function _create() {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};

        // background box
        dom.point = document.createElement('div');
        // className is updated in repaint()

        // contents box, right from the dot
        dom.content = document.createElement('div');
        dom.content.className = 'content';
        dom.point.appendChild(dom.content);

        // dot at start
        dom.dot = document.createElement('div');
        dom.dot.className  = 'dot';
        dom.point.appendChild(dom.dot);
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemPoint.prototype.reposition = function reposition() {
    var dom = this.dom,
        props = this.props;

    if (dom) {
        dom.point.style.top = this.top + 'px';
        dom.point.style.left = this.left + 'px';

        dom.content.style.marginLeft = props.content.marginLeft + 'px';
        //dom.content.style.marginRight = props.content.marginRight + 'px'; // TODO

        dom.dot.style.top = props.dot.top + 'px';
    }
};

/**
 * @constructor ItemRange
 * @extends Item
 * @param {ItemSet} parent
 * @param {Object} data             Object containing parameters start, end
 *                                  content, className.
 * @param {Object} [options]        Options to set initial property values
 * @param {Object} [defaultOptions] default options
 *                                  // TODO: describe available options
 */
function ItemRange (parent, data, options, defaultOptions) {
    this.props = {
        content: {
            left: 0,
            width: 0
        }
    };

    Item.call(this, parent, data, options, defaultOptions);
}

ItemRange.prototype = new Item (null, null);

/**
 * Select the item
 * @override
 */
ItemRange.prototype.select = function select() {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemRange.prototype.unselect = function unselect() {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemRange.prototype.repaint = function repaint() {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (!dom) {
        this._create();
        dom = this.dom;
        changed = true;
    }

    if (dom) {
        if (!this.parent) {
            throw new Error('Cannot repaint item: no parent attached');
        }
        var foreground = this.parent.getForeground();
        if (!foreground) {
            throw new Error('Cannot repaint time axis: ' +
                'parent has no foreground container element');
        }

        if (!dom.box.parentNode) {
            foreground.appendChild(dom.box);
            changed = true;
        }

        // update content
        if (this.data.content != this.content) {
            this.content = this.data.content;
            if (this.content instanceof Element) {
                dom.content.innerHTML = '';
                dom.content.appendChild(this.content);
            }
            else if (this.data.content != undefined) {
                dom.content.innerHTML = this.content;
            }
            else {
                throw new Error('Property "content" missing in item ' + this.data.id);
            }
            changed = true;
        }

        // update class
        var className = this.data.className ? ('' + this.data.className) : '';
        if (this.className != className) {
            this.className = className;
            dom.box.className = 'item range' + className;
            changed = true;
        }
    }

    return changed;
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 * @return {Boolean} changed
 */
ItemRange.prototype.show = function show() {
    if (!this.dom || !this.dom.box.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Hide the item from the DOM (when visible)
 * @return {Boolean} changed
 */
ItemRange.prototype.hide = function hide() {
    var changed = false,
        dom = this.dom;
    if (dom) {
        if (dom.box.parentNode) {
            dom.box.parentNode.removeChild(dom.box);
            changed = true;
        }
    }
    return changed;
};

/**
 * Reflow the item: calculate its actual size from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemRange.prototype.reflow = function reflow() {
    var changed = 0,
        dom,
        props,
        options,
        margin,
        padding,
        parent,
        start,
        end,
        data,
        range,
        update,
        box,
        parentWidth,
        contentLeft,
        orientation,
        top;

    if (this.data.start == undefined) {
        throw new Error('Property "start" missing in item ' + this.data.id);
    }
    if (this.data.end == undefined) {
        throw new Error('Property "end" missing in item ' + this.data.id);
    }

    data = this.data;
    range = this.parent && this.parent.range;
    if (data && range) {
        // TODO: account for the width of the item. Take some margin
        this.visible = (data.start < range.end) && (data.end > range.start);
    }
    else {
        this.visible = false;
    }

    if (this.visible) {
        dom = this.dom;
        if (dom) {
            props = this.props;
            options = this.options;
            parent = this.parent;
            start = parent.toScreen(this.data.start);
            end = parent.toScreen(this.data.end);
            update = util.updateProperty;
            box = dom.box;
            parentWidth = parent.width;
            orientation = options.orientation || this.defaultOptions.orientation;
            margin = options.margin && options.margin.axis || this.defaultOptions.margin.axis;
            padding = options.padding || this.defaultOptions.padding;

            changed += update(props.content, 'width', dom.content.offsetWidth);

            changed += update(this, 'height', box.offsetHeight);

            // limit the width of the this, as browsers cannot draw very wide divs
            if (start < -parentWidth) {
                start = -parentWidth;
            }
            if (end > 2 * parentWidth) {
                end = 2 * parentWidth;
            }

            // when range exceeds left of the window, position the contents at the left of the visible area
            if (start < 0) {
                contentLeft = Math.min(-start,
                    (end - start - props.content.width - 2 * padding));
                // TODO: remove the need for options.padding. it's terrible.
            }
            else {
                contentLeft = 0;
            }
            changed += update(props.content, 'left', contentLeft);

            if (orientation == 'top') {
                top = margin;
                changed += update(this, 'top', top);
            }
            else {
                // default or 'bottom'
                top = parent.height - this.height - margin;
                changed += update(this, 'top', top);
            }

            changed += update(this, 'left', start);
            changed += update(this, 'width', Math.max(end - start, 1)); // TODO: reckon with border width;
        }
        else {
            changed += 1;
        }
    }

    return (changed > 0);
};

/**
 * Create an items DOM
 * @private
 */
ItemRange.prototype._create = function _create() {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};
        // background box
        dom.box = document.createElement('div');
        // className is updated in repaint()

        // contents box
        dom.content = document.createElement('div');
        dom.content.className = 'content';
        dom.box.appendChild(dom.content);
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemRange.prototype.reposition = function reposition() {
    var dom = this.dom,
        props = this.props;

    if (dom) {
        dom.box.style.top = this.top + 'px';
        dom.box.style.left = this.left + 'px';
        dom.box.style.width = this.width + 'px';

        dom.content.style.left = props.content.left + 'px';
    }
};

/**
 * @constructor Group
 * @param {GroupSet} parent
 * @param {Number | String} groupId
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 * @extends Component
 */
function Group (parent, groupId, options) {
    this.id = util.randomUUID();
    this.parent = parent;

    this.groupId = groupId;
    this.itemsData = null;  // DataSet
    this.itemset = null;    // ItemSet
    this.options = options || {};
    this.options.top = 0;

    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

Group.prototype = new Component();

// TODO: comment
Group.prototype.setOptions = Component.prototype.setOptions;

/**
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
Group.prototype.getContainer = function () {
    return this.parent.getContainer();
};

/**
 * Set item set for the group. The group will create a view on the itemset,
 * filtered by the groups id.
 * @param {DataSet | DataView} items
 */
Group.prototype.setItems = function setItems(items) {
    if (this.itemset) {
        // remove current item set
        this.itemset.hide();
        this.itemset.setItems();

        this.parent.controller.remove(this.itemset);
        this.itemset = null;
    }

    if (items) {
        var groupId = this.groupId;

        var itemsetOptions = Object.create(this.options);
        this.itemset = new ItemSet(this, null, itemsetOptions);
        this.itemset.setRange(this.parent.range);

        this.view = new DataView(items, {
            filter: function (item) {
                return item.group == groupId;
            }
        });
        this.itemset.setItems(this.view);

        this.parent.controller.add(this.itemset);
    }
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
Group.prototype.repaint = function repaint() {
    return false;
};

/**
 * Reflow the item
 * @return {Boolean} resized
 */
Group.prototype.reflow = function reflow() {
    var changed = 0,
        update = util.updateProperty;

    changed += update(this, 'top',    this.itemset ? this.itemset.top : 0);
    changed += update(this, 'height', this.itemset ? this.itemset.height : 0);

    return (changed > 0);
};

/**
 * An GroupSet holds a set of groups
 * @param {Component} parent
 * @param {Component[]} [depends]   Components on which this components depends
 *                                  (except for the parent)
 * @param {Object} [options]        See GroupSet.setOptions for the available
 *                                  options.
 * @constructor GroupSet
 * @extends Panel
 */
function GroupSet(parent, depends, options) {
    this.id = util.randomUUID();
    this.parent = parent;
    this.depends = depends;

    this.options = options || {};

    this.range = null;      // Range or Object {start: number, end: number}
    this.itemsData = null;  // DataSet with items
    this.groupsData = null; // DataSet with groups

    this.groups = {};       // map with groups

    // changes in groups are queued  key/value map containing id/action
    this.queue = {};

    var me = this;
    this.listeners = {
        'add': function (event, params) {
            me._onAdd(params.items);
        },
        'update': function (event, params) {
            me._onUpdate(params.items);
        },
        'remove': function (event, params) {
            me._onRemove(params.items);
        }
    };
}

GroupSet.prototype = new Panel();

/**
 * Set options for the GroupSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           {String | function} groupsOrder
 *                           TODO: describe options
 */
GroupSet.prototype.setOptions = Component.prototype.setOptions;

GroupSet.prototype.setRange = function (range) {
    // TODO: implement setRange
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
GroupSet.prototype.setItems = function setItems(items) {
    this.itemsData = items;

    for (var id in this.groups) {
        if (this.groups.hasOwnProperty(id)) {
            var group = this.groups[id];
            group.setItems(items);
        }
    }
};

/**
 * Get items
 * @return {vis.DataSet | null} items
 */
GroupSet.prototype.getItems = function getItems() {
    return this.itemsData;
};

/**
 * Set range (start and end).
 * @param {Range | Object} range  A Range or an object containing start and end.
 */
GroupSet.prototype.setRange = function setRange(range) {
    this.range = range;
};

/**
 * Set groups
 * @param {vis.DataSet} groups
 */
GroupSet.prototype.setGroups = function setGroups(groups) {
    var me = this,
        ids;

    // unsubscribe from current dataset
    if (this.groupsData) {
        util.forEach(this.listeners, function (callback, event) {
            me.groupsData.unsubscribe(event, callback);
        });

        // remove all drawn groups
        ids = this.groupsData.getIds();
        this._onRemove(ids);
    }

    // replace the dataset
    if (!groups) {
        this.groupsData = null;
    }
    else if (groups instanceof DataSet) {
        this.groupsData = groups;
    }
    else {
        this.groupsData = new DataSet({
            fieldTypes: {
                start: 'Date',
                end: 'Date'
            }
        });
        this.groupsData.add(groups);
    }

    if (this.groupsData) {
        // subscribe to new dataset
        var id = this.id;
        util.forEach(this.listeners, function (callback, event) {
            me.groupsData.subscribe(event, callback, id);
        });

        // draw all new groups
        ids = this.groupsData.getIds();
        this._onAdd(ids);
    }
};

/**
 * Get groups
 * @return {vis.DataSet | null} groups
 */
GroupSet.prototype.getGroups = function getGroups() {
    return this.groupsData;
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
GroupSet.prototype.repaint = function repaint() {
    var changed = 0,
        update = util.updateProperty,
        asSize = util.option.asSize,
        options = this.options,
        frame = this.frame;

    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'groupset';

        var className = options.className;
        if (className) {
            util.addClassName(frame, util.option.asString(className));
        }

        this.frame = frame;
        changed += 1;
    }

    if (!this.parent) {
        throw new Error('Cannot repaint groupset: no parent attached');
    }
    var parentContainer = this.parent.getContainer();
    if (!parentContainer) {
        throw new Error('Cannot repaint groupset: parent has no container element');
    }
    if (!frame.parentNode) {
        parentContainer.appendChild(frame);
        changed += 1;
    }

    // reposition frame
    changed += update(frame.style, 'height', asSize(options.height, this.height + 'px'));
    changed += update(frame.style, 'top',    asSize(options.top, '0px'));
    changed += update(frame.style, 'left',   asSize(options.left, '0px'));
    changed += update(frame.style, 'width',  asSize(options.width, '100%'));

    var me = this,
        queue = this.queue,
        groups = this.groups,
        groupsData = this.groupsData;

    // show/hide added/changed/removed items
    var ids = Object.keys(queue);
    if (ids.length) {
        ids.forEach(function (id) {
            var action = queue[id];
            var group = groups[id];

            //noinspection FallthroughInSwitchStatementJS
            switch (action) {
                case 'add':
                case 'update':
                    if (!group) {
                        var groupOptions = Object.create(me.options);
                        group = new Group(me, id, groupOptions);
                        group.setItems(me.itemsData); // attach items data
                        groups[id] = group;

                        me.controller.add(group);
                    }

                    // TODO: update group data
                    group.data = groupsData.get(id);

                    delete queue[id];
                    break;

                case 'remove':
                    if (group) {
                        group.setItems(); // detach items data
                        delete groups[id];

                        me.controller.remove(group);
                    }

                    // update lists
                    delete queue[id];
                    break;

                default:
                    console.log('Error: unknown action "' + action + '"');
            }
        });

        // the groupset depends on each of the groups
        //this.depends = this.groups; // TODO: gives a circular reference through the parent

        // TODO: apply dependencies of the groupset

        // update the top positions of the groups in the correct order
        var orderedGroups = this.groupsData.getIds({
            order: this.options.groupsOrder
        });
        for (var i = 0; i < orderedGroups.length; i++) {
            (function (group, prevGroup) {
                var top = 0;
                if (prevGroup) {
                    top = function () {
                        // TODO: top must reckon with options.maxHeight
                        return prevGroup.top + prevGroup.height;
                    }
                }
                group.setOptions({
                    top: top
                });
            })(groups[orderedGroups[i]], groups[orderedGroups[i - 1]]);
        }

        changed++;
    }

    return (changed > 0);
};

/**
 * Get container element
 * @return {HTMLElement} container
 */
GroupSet.prototype.getContainer = function getContainer() {
    // TODO: replace later on with container element for holding itemsets
    return this.frame;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
GroupSet.prototype.reflow = function reflow() {
    var changed = 0,
        options = this.options,
        update = util.updateProperty,
        asNumber = util.option.asNumber,
        asSize = util.option.asSize,
        frame = this.frame;

    if (frame) {
        var maxHeight = asNumber(options.maxHeight);
        var fixedHeight = (asSize(options.height) != null);
        var height;
        if (fixedHeight) {
            height = frame.offsetHeight;
        }
        else {
            // height is not specified, calculate the sum of the height of all groups
            height = 0;

            for (var id in this.groups) {
                if (this.groups.hasOwnProperty(id)) {
                    var group = this.groups[id];
                    height += group.height;
                }
            }
        }
        if (maxHeight != null) {
            height = Math.min(height, maxHeight);
        }
        changed += update(this, 'height', height);

        changed += update(this, 'top', frame.offsetTop);
        changed += update(this, 'left', frame.offsetLeft);
        changed += update(this, 'width', frame.offsetWidth);
    }

    return (changed > 0);
};

/**
 * Hide the component from the DOM
 * @return {Boolean} changed
 */
GroupSet.prototype.hide = function hide() {
    if (this.frame && this.frame.parentNode) {
        this.frame.parentNode.removeChild(this.frame);
        return true;
    }
    else {
        return false;
    }
};

/**
 * Show the component in the DOM (when not already visible).
 * A repaint will be executed when the component is not visible
 * @return {Boolean} changed
 */
GroupSet.prototype.show = function show() {
    if (!this.frame || !this.frame.parentNode) {
        return this.repaint();
    }
    else {
        return false;
    }
};

/**
 * Handle updated groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onUpdate = function _onUpdate(ids) {
    this._toQueue(ids, 'update');
};

/**
 * Handle changed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onAdd = function _onAdd(ids) {
    this._toQueue(ids, 'add');
};

/**
 * Handle removed groups
 * @param {Number[]} ids
 * @private
 */
GroupSet.prototype._onRemove = function _onRemove(ids) {
    this._toQueue(ids, 'remove');
};

/**
 * Put groups in the queue to be added/updated/remove
 * @param {Number[]} ids
 * @param {String} action     can be 'add', 'update', 'remove'
 */
GroupSet.prototype._toQueue = function _toQueue(ids, action) {
    var queue = this.queue;
    ids.forEach(function (id) {
        queue[id] = action;
    });

    if (this.controller) {
        //this.requestReflow();
        this.requestRepaint();
    }
};

/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array | DataTable} [items]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor
 */
function Timeline (container, items, options) {
    var me = this;
    this.options = util.extend({
        orientation: 'bottom',
        min: null,
        max: null,
        zoomMin: 10,     // milliseconds
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000, // milliseconds
        // moveable: true, // TODO: option moveable
        // zoomable: true, // TODO: option zoomable
        showMinorLabels: true,
        showMajorLabels: true,
        autoResize: false
    }, options);

    // controller
    this.controller = new Controller();

    // root panel
    if (!container) {
        throw new Error('No container element provided');
    }
    var mainOptions = Object.create(this.options);
    mainOptions.height = function () {
        if (me.options.height) {
            // fixed height
            return me.options.height;
        }
        else {
            // auto height
            return me.timeaxis.height + me.content.height;
        }
    };
    this.root = new RootPanel(container, mainOptions);
    this.controller.add(this.root);

    // range
    var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
    this.range = new Range({
        start: now.clone().add('days', -3).valueOf(),
        end:   now.clone().add('days', 4).valueOf()
    });
    // TODO: reckon with options moveable and zoomable
    this.range.subscribe(this.root, 'move', 'horizontal');
    this.range.subscribe(this.root, 'zoom', 'horizontal');
    this.range.on('rangechange', function () {
        var force = true;
        me.controller.requestReflow(force);
    });
    this.range.on('rangechanged', function () {
        var force = true;
        me.controller.requestReflow(force);
    });

    // TODO: put the listeners in setOptions, be able to dynamically change with options moveable and zoomable

    // time axis
    var timeaxisOptions = Object.create(mainOptions);
    timeaxisOptions.range = this.range;
    this.timeaxis = new TimeAxis(this.root, [], timeaxisOptions);
    this.timeaxis.setRange(this.range);
    this.controller.add(this.timeaxis);

    // create itemset or groupset
    this.setGroups(null);

    this.itemsData = null;      // DataSet
    this.groupsData = null;     // DataSet

    // set data
    if (items) {
        this.setItems(items);
    }
}

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
    if (options) {
        util.extend(this.options, options);
    }

    this.controller.reflow();
    this.controller.repaint();
};

/**
 * Set items
 * @param {vis.DataSet | Array | DataTable | null} items
 */
Timeline.prototype.setItems = function(items) {
    var initialLoad = (this.itemsData == null);

    // convert to type DataSet when needed
    var newItemSet;
    if (!items) {
        newItemSet = null;
    }
    else if (items instanceof DataSet) {
        newItemSet = items;
    }
    if (!(items instanceof DataSet)) {
        newItemSet = new DataSet({
            fieldTypes: {
                start: 'Date',
                end: 'Date'
            }
        });
        newItemSet.add(items);
    }

    // set items
    this.itemsData = newItemSet;
    this.content.setItems(newItemSet);

    if (initialLoad && (this.options.start == undefined || this.options.end == undefined)) {
        // apply the data range as range
        var dataRange = this.getItemRange();

        // add 5% on both sides
        var min = dataRange.min;
        var max = dataRange.max;
        if (min != null && max != null) {
            var interval = (max.valueOf() - min.valueOf());
            min = new Date(min.valueOf() - interval * 0.05);
            max = new Date(max.valueOf() + interval * 0.05);
        }

        // override specified start and/or end date
        if (this.options.start != undefined) {
            min = new Date(this.options.start.valueOf());
        }
        if (this.options.end != undefined) {
            max = new Date(this.options.end.valueOf());
        }

        // apply range if there is a min or max available
        if (min != null || max != null) {
            this.range.setRange(min, max);
        }
    }
};

/**
 * Set groups
 * @param {vis.DataSet | Array | DataTable} groups
 */
Timeline.prototype.setGroups = function(groups) {
    var me = this;
    this.groupsData = groups;

    // switch content type between ItemSet or GroupSet when needed
    var type = this.groupsData ? GroupSet : ItemSet;
    if (!(this.content instanceof type)) {
        // remove old content set
        if (this.content) {
            this.content.hide();
            if (this.content.setItems) {
                this.content.setItems(); // disconnect from items
            }
            if (this.content.setGroups) {
                this.content.setGroups(); // disconnect from groups
            }
            this.controller.remove(this.content);
        }

        // create new content set
        var options = Object.create(this.options);
        util.extend(options, {
            top: function () {
                if (me.options.orientation == 'top') {
                    return me.timeaxis.height;
                }
                else {
                    return me.root.height - me.timeaxis.height - me.content.height;
                }
            },
            height: function () {
                if (me.options.height) {
                    return me.root.height - me.timeaxis.height;
                }
                else {
                    return null;
                }
            },
            maxHeight: function () {
                if (me.options.maxHeight) {
                    if (!util.isNumber(me.options.maxHeight)) {
                        throw new TypeError('Number expected for property maxHeight');
                    }
                    return me.options.maxHeight - me.timeaxis.height;
                }
                else {
                    return null;
                }
            }
        });
        this.content = new type(this.root, [this.timeaxis], options);
        if (this.content.setRange) {
            this.content.setRange(this.range);
        }
        if (this.content.setItems) {
            this.content.setItems(this.itemsData);
        }
        if (this.content.setGroups) {
            this.content.setGroups(this.groupsData);
        }
        this.controller.add(this.content);
    }
};

/**
 * Get the data range of the item set.
 * @returns {{min: Date, max: Date}} range  A range with a start and end Date.
 *                                          When no minimum is found, min==null
 *                                          When no maximum is found, max==null
 */
Timeline.prototype.getItemRange = function getItemRange() {
    // calculate min from start filed
    var itemsData = this.itemsData,
        min = null,
        max = null;

    if (itemsData) {
        // calculate the minimum value of the field 'start'
        var minItem = itemsData.min('start');
        min = minItem ? minItem.start.valueOf() : null;

        // calculate maximum value of fields 'start' and 'end'
        var maxStartItem = itemsData.max('start');
        if (maxStartItem) {
            max = maxStartItem.start.valueOf();
        }
        var maxEndItem = itemsData.max('end');
        if (maxEndItem) {
            if (max == null) {
                max = maxEndItem.end.valueOf();
            }
            else {
                max = Math.max(max, maxEndItem.end.valueOf());
            }
        }
    }

    return {
        min: (min != null) ? new Date(min) : null,
        max: (max != null) ? new Date(max) : null
    };
};

(function(exports) {
    /**
     * Parse a text source containing data in DOT language into a JSON object.
     * The object contains two lists: one with nodes and one with edges.
     * @param {String} data     Text containing a graph in DOT-notation
     * @return {Object} graph   An object containing two parameters:
     *                          {Object[]} nodes
     *                          {Object[]} edges
     */
    function parseDOT (data) {
        dot = data;
        return parseGraph();
    }

    // token types enumeration
    var TOKENTYPE = {
        NULL : 0,
        DELIMITER : 1,
        IDENTIFIER: 2,
        UNKNOWN : 3
    };

    // map with all delimiters
    var DELIMITERS = {
        '{': true,
        '}': true,
        '[': true,
        ']': true,
        ';': true,
        '=': true,
        ',': true,

        '->': true,
        '--': true
    };

    var dot = '';                   // current dot file
    var index = 0;                  // current index in dot file
    var c = '';                     // current token character in expr
    var token = '';                 // current token
    var tokenType = TOKENTYPE.NULL; // type of the token

    var graph = null;               // object with the graph to be build
    var nodeAttr = null;            // global node attributes
    var edgeAttr = null;            // global edge attributes

    /**
     * Get the first character from the dot file.
     * The character is stored into the char c. If the end of the dot file is
     * reached, the function puts an empty string in c.
     */
    function first() {
        index = 0;
        c = dot.charAt(0);
    }

    /**
     * Get the next character from the dot file.
     * The character is stored into the char c. If the end of the dot file is
     * reached, the function puts an empty string in c.
     */
    function next() {
        index++;
        c = dot.charAt(index);
    }

    /**
     * Preview the next character from the dot file.
     * @return {String} cNext
     */
    function nextPreview() {
        return dot.charAt(index + 1);
    }

    /**
     * Test whether given character is alphabetic or numeric
     * @param {String} c
     * @return {Boolean} isAlphaNumeric
     */
    var regexAlphaNumeric = /[a-zA-Z_0-9.#]/;
    function isAlphaNumeric(c) {
        return regexAlphaNumeric.test(c);
    }

    /**
     * Merge all properties of object b into object b
     * @param {Object} a
     * @param {Object} b
     * @return {Object} a
     */
    function merge (a, b) {
        if (!a) {
            a = {};
        }

        if (b) {
            for (var name in b) {
                if (b.hasOwnProperty(name)) {
                    a[name] = b[name];
                }
            }
        }
        return a;
    }

    /**
     * Add a node to the current graph object. If there is already a node with
     * the same id, their attributes will be merged.
     * @param {Object} node
     */
    function addNode(node) {
        if (!graph.nodes) {
            graph.nodes = {};
        }
        var current = graph.nodes[node.id];
        if (current) {
            // merge attributes
            if (node.attr) {
                current.attr = merge(current.attr, node.attr);
            }
        }
        else {
            // add
            graph.nodes[node.id] = node;
            if (nodeAttr) {
                var attr = merge({}, nodeAttr);     // clone global attributes
                node.attr = merge(attr, node.attr); // merge attributes
            }
        }
    }

    /**
     * Add an edge to the current graph obect
     * @param {Object} edge
     */
    function addEdge(edge) {
        if (!graph.edges) {
            graph.edges = [];
        }
        graph.edges.push(edge);
        if (edgeAttr) {
            var attr = merge({}, edgeAttr);     // clone global attributes
            edge.attr = merge(attr, edge.attr); // merge attributes
        }
    }

    /**
     * Get next token in the current dot file.
     * The token and token type are available as token and tokenType
     */
    function getToken() {
        tokenType = TOKENTYPE.NULL;
        token = '';

        // skip over whitespaces
        while (c == ' ' || c == '\t' || c == '\n' || c == '\r') {  // space, tab, enter
            next();
        }

        do {
            var isComment = false;

            // skip comment
            if (c == '#') {
                // find the previous non-space character
                var i = index - 1;
                while (dot.charAt(i) == ' ' || dot.charAt(i) == '\t') {
                    i--;
                }
                if (dot.charAt(i) == '\n' || dot.charAt(i) == '') {
                    // the # is at the start of a line, this is indeed a line comment
                    while (c != '' && c != '\n') {
                        next();
                    }
                    isComment = true;
                }
            }
            if (c == '/' && nextPreview() == '/') {
                // skip line comment
                while (c != '' && c != '\n') {
                    next();
                }
                isComment = true;
            }
            if (c == '/' && nextPreview() == '*') {
                // skip block comment
                while (c != '') {
                    if (c == '*' && nextPreview() == '/') {
                        // end of block comment found. skip these last two characters
                        next();
                        next();
                        break;
                    }
                    else {
                        next();
                    }
                }
                isComment = true;
            }

            // skip over whitespaces
            while (c == ' ' || c == '\t' || c == '\n' || c == '\r') {  // space, tab, enter
                next();
            }
        }
        while (isComment);

        // check for end of dot file
        if (c == '') {
            // token is still empty
            tokenType = TOKENTYPE.DELIMITER;
            return;
        }

        // check for delimiters consisting of 2 characters
        var c2 = c + nextPreview();
        if (DELIMITERS[c2]) {
            tokenType = TOKENTYPE.DELIMITER;
            token = c2;
            next();
            next();
            return;
        }

        // check for delimiters consisting of 1 character
        if (DELIMITERS[c]) {
            tokenType = TOKENTYPE.DELIMITER;
            token = c;
            next();
            return;
        }

        // check for an identifier (number or string)
        // TODO: more precise parsing of numbers/strings
        if (isAlphaNumeric(c) || c == '-') {
            token += c;
            next();

            while (isAlphaNumeric(c)) {
                token += c;
                next();
            }
            if (token == 'false') {
                token = false;   // cast to boolean
            }
            else if (token == 'true') {
                token = true;   // cast to boolean
            }
            else if (!isNaN(Number(token))) {
                token = Number(token); // cast to number
            }
            tokenType = TOKENTYPE.IDENTIFIER;
            return;
        }

        // check for a string enclosed by double quotes
        if (c == '"') {
            next();
            while (c != '' && (c != '"' || (c == '"' && nextPreview() == '"'))) {
                token += c;
                if (c == '"') { // skip the escape character
                    next();
                }
                next();
            }
            if (c != '"') {
                throw newSyntaxError('End of string " expected');
            }
            next();
            tokenType = TOKENTYPE.IDENTIFIER;
            return;
        }

        // something unknown is found, wrong characters, a syntax error
        tokenType = TOKENTYPE.UNKNOWN;
        while (c != '') {
            token += c;
            next();
        }
        throw new SyntaxError('Syntax error in part "' + chop(token, 30) + '"');
    }

    /**
     * Parse a graph.
     * @returns {Object} graph
     */
    function parseGraph() {
        graph = {};
        nodeAttr = null;
        edgeAttr = null;

        first();
        getToken();

        // optional strict keyword
        if (token == 'strict') {
            graph.strict = true;
            getToken();
        }

        // graph or digraph keyword
        if (token == 'graph' || token == 'digraph') {
            graph.type = token;
            getToken();
        }

        // graph id
        if (tokenType == TOKENTYPE.IDENTIFIER) {
            graph.id = token;
            getToken();
        }

        // open angle bracket
        if (token != '{') {
            throw newSyntaxError('Angle bracket { expected');
        }
        getToken();

        // statements
        parseStatements();

        // close angle bracket
        if (token != '}') {
            throw newSyntaxError('Angle bracket } expected');
        }
        getToken();

        // end of file
        if (token !== '') {
            throw newSyntaxError('End of file expected');
        }
        getToken();

        return graph;
    }

    /**
     * Parse a list with statements.
     */
    function parseStatements () {
        while (token !== '' && token != '}') {
            if (tokenType != TOKENTYPE.IDENTIFIER) {
                throw newSyntaxError('Identifier expected');
            }

            parseStatement();
            if (token == ';') {
                getToken();
            }
        }
    }

    /**
     * Parse a single statement. Can be a an attribute statement, node
     * statement, a series of node statements and edge statements, or a
     * parameter.
     */
    function parseStatement() {
        var attr;
        var id = token; // can be as string or a number
        getToken();

        // attribute statements
        if (id == 'node') {
            // node attributes
            attr = parseAttributes();
            if (attr) {
                nodeAttr = merge(nodeAttr, attr);
            }
        }
        else if (id == 'edge') {
            // edge attributes
            attr = parseAttributes();
            if (attr) {
                edgeAttr = merge(edgeAttr, attr);
            }
        }
        else if (id == 'graph') {
            // graph attributes
            attr = parseAttributes();
            if (attr) {
                graph.attr = merge(graph.attr, attr);
            }
        }
        else {
            if (token == '=') {
                // id statement
                getToken();
                if (!graph.attr) {
                    graph.attr = {};
                }
                graph.attr[id] = token;
                getToken();
            }
            else {
                // node statement
                var node = {
                    id: String(id)
                };
                attr = parseAttributes();
                if (attr) {
                    node.attr = attr;
                }
                addNode(node);

                // edge statements
                var from = id;
                while (token == '->' || token == '--') {
                    var type = token;
                    getToken();

                    var to = token;
                    addNode({
                        id: String(to)
                    });
                    getToken();
                    attr = parseAttributes();

                    // create edge
                    var edge = {
                        from: String(from),
                        to: String(to),
                        type: type
                    };
                    if (attr) {
                        edge.attr = attr;
                    }
                    addEdge(edge);

                    from = to;
                }
            }
        }
    }

    /**
     * Parse a set with attributes,
     * for example [label="1.000", shape=solid]
     * @return {Object | undefined} attr
     */
    function parseAttributes() {
        if (token == '[') {
            getToken();
            var attr = {};
            while (token !== '' && token != ']') {
                if (tokenType != TOKENTYPE.IDENTIFIER) {
                    throw newSyntaxError('Attribute name expected');
                }
                var name = token;

                getToken();
                if (token != '=') {
                    throw newSyntaxError('Equal sign = expected');
                }
                getToken();

                if (tokenType != TOKENTYPE.IDENTIFIER) {
                    throw newSyntaxError('Attribute value expected');
                }
                var value = token;
                attr[name] = value;

                getToken();
                if (token ==',') {
                    getToken();
                }
            }
            getToken();

            return attr;
        }
        else {
            return undefined;
        }
    }

    /**
     * Create a syntax error with extra information on current token and index.
     * @param {String} message
     * @returns {SyntaxError} err
     */
    function newSyntaxError(message) {
        return new SyntaxError(message + ', got "' + chop(token, 30) + '" (char ' + index + ')');
    }

    /**
     * Chop off text after a maximum length
     * @param {String} text
     * @param {Number} maxLength
     * @returns {String}
     */
    function chop (text, maxLength) {
        return (text.length <= maxLength) ? text : (text.substr(0, 27) + '...');
    }

    /**
     * Convert a string containing a graph in DOT language into a map containing
     * with nodes and edges in the format of graph.
     * @param {String} data         Text containing a graph in DOT-notation
     * @return {Object} graphData
     */
    function DOTToGraph (data) {
        // parse the DOT file
        var dotData = parseDOT(data);
        var graphData = {
            nodes: [],
            edges: [],
            options: {}
        };

        // copy the nodes
        if (dotData.nodes) {
            for (var id in dotData.nodes) {
                if (dotData.nodes.hasOwnProperty(id)) {
                    var node = {
                        id: id,
                        label: id
                    };
                    merge(node, dotData.nodes[id].attr);
                    if (node.image) {
                        node.shape = 'image';
                    }
                    graphData.nodes.push(node);
                }
            }
        }

        // copy the edges
        if (dotData.edges) {
            dotData.edges.forEach(function (dotEdge) {
                var graphEdge = {
                    from: dotEdge.from,
                    to: dotEdge.to
                };
                merge(graphEdge, dotEdge.attr);
                graphEdge.style = (dotEdge.type == '->') ? 'arrow' : 'line';
                graphData.edges.push(graphEdge);
            });
        }

        // copy the options
        if (dotData.attr) {
            graphData.options = dotData.attr;
        }

        return graphData;
    }

    // exports
    exports.parseDOT = parseDOT;
    exports.DOTToGraph = DOTToGraph;

})(typeof util !== 'undefined' ? util : exports);

/**
 * Canvas shapes used by the Graph
 */
if (typeof CanvasRenderingContext2D !== 'undefined') {

    /**
     * Draw a circle shape
     */
    CanvasRenderingContext2D.prototype.circle = function(x, y, r) {
        this.beginPath();
        this.arc(x, y, r, 0, 2*Math.PI, false);
    };

    /**
     * Draw a square shape
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r   size, width and height of the square
     */
    CanvasRenderingContext2D.prototype.square = function(x, y, r) {
        this.beginPath();
        this.rect(x - r, y - r, r * 2, r * 2);
    };

    /**
     * Draw a triangle shape
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r   radius, half the length of the sides of the triangle
     */
    CanvasRenderingContext2D.prototype.triangle = function(x, y, r) {
        // http://en.wikipedia.org/wiki/Equilateral_triangle
        this.beginPath();

        var s = r * 2;
        var s2 = s / 2;
        var ir = Math.sqrt(3) / 6 * s;      // radius of inner circle
        var h = Math.sqrt(s * s - s2 * s2); // height

        this.moveTo(x, y - (h - ir));
        this.lineTo(x + s2, y + ir);
        this.lineTo(x - s2, y + ir);
        this.lineTo(x, y - (h - ir));
        this.closePath();
    };

    /**
     * Draw a triangle shape in downward orientation
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r radius
     */
    CanvasRenderingContext2D.prototype.triangleDown = function(x, y, r) {
        // http://en.wikipedia.org/wiki/Equilateral_triangle
        this.beginPath();

        var s = r * 2;
        var s2 = s / 2;
        var ir = Math.sqrt(3) / 6 * s;      // radius of inner circle
        var h = Math.sqrt(s * s - s2 * s2); // height

        this.moveTo(x, y + (h - ir));
        this.lineTo(x + s2, y - ir);
        this.lineTo(x - s2, y - ir);
        this.lineTo(x, y + (h - ir));
        this.closePath();
    };

    /**
     * Draw a star shape, a star with 5 points
     * @param {Number} x horizontal center
     * @param {Number} y vertical center
     * @param {Number} r   radius, half the length of the sides of the triangle
     */
    CanvasRenderingContext2D.prototype.star = function(x, y, r) {
        // http://www.html5canvastutorials.com/labs/html5-canvas-star-spinner/
        this.beginPath();

        for (var n = 0; n < 10; n++) {
            var radius = (n % 2 === 0) ? r * 1.3 : r * 0.5;
            this.lineTo(
                x + radius * Math.sin(n * 2 * Math.PI / 10),
                y - radius * Math.cos(n * 2 * Math.PI / 10)
            );
        }

        this.closePath();
    };

    /**
     * http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
     */
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        var r2d = Math.PI/180;
        if( w - ( 2 * r ) < 0 ) { r = ( w / 2 ); } //ensure that the radius isn't too large for x
        if( h - ( 2 * r ) < 0 ) { r = ( h / 2 ); } //ensure that the radius isn't too large for y
        this.beginPath();
        this.moveTo(x+r,y);
        this.lineTo(x+w-r,y);
        this.arc(x+w-r,y+r,r,r2d*270,r2d*360,false);
        this.lineTo(x+w,y+h-r);
        this.arc(x+w-r,y+h-r,r,0,r2d*90,false);
        this.lineTo(x+r,y+h);
        this.arc(x+r,y+h-r,r,r2d*90,r2d*180,false);
        this.lineTo(x,y+r);
        this.arc(x+r,y+r,r,r2d*180,r2d*270,false);
    };

    /**
     * http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
     */
    CanvasRenderingContext2D.prototype.ellipse = function(x, y, w, h) {
        var kappa = .5522848,
            ox = (w / 2) * kappa, // control point offset horizontal
            oy = (h / 2) * kappa, // control point offset vertical
            xe = x + w,           // x-end
            ye = y + h,           // y-end
            xm = x + w / 2,       // x-middle
            ym = y + h / 2;       // y-middle

        this.beginPath();
        this.moveTo(x, ym);
        this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    };



    /**
     * http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
     */
    CanvasRenderingContext2D.prototype.database = function(x, y, w, h) {
        var f = 1/3;
        var wEllipse = w;
        var hEllipse = h * f;

        var kappa = .5522848,
            ox = (wEllipse / 2) * kappa, // control point offset horizontal
            oy = (hEllipse / 2) * kappa, // control point offset vertical
            xe = x + wEllipse,           // x-end
            ye = y + hEllipse,           // y-end
            xm = x + wEllipse / 2,       // x-middle
            ym = y + hEllipse / 2,       // y-middle
            ymb = y + (h - hEllipse/2),  // y-midlle, bottom ellipse
            yeb = y + h;                 // y-end, bottom ellipse

        this.beginPath();
        this.moveTo(xe, ym);

        this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

        this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);

        this.lineTo(xe, ymb);

        this.bezierCurveTo(xe, ymb + oy, xm + ox, yeb, xm, yeb);
        this.bezierCurveTo(xm - ox, yeb, x, ymb + oy, x, ymb);

        this.lineTo(x, ym);
    };


    /**
     * Draw an arrow point (no line)
     */
    CanvasRenderingContext2D.prototype.arrow = function(x, y, angle, length) {
        // tail
        var xt = x - length * Math.cos(angle);
        var yt = y - length * Math.sin(angle);

        // inner tail
        // TODO: allow to customize different shapes
        var xi = x - length * 0.9 * Math.cos(angle);
        var yi = y - length * 0.9 * Math.sin(angle);

        // left
        var xl = xt + length / 3 * Math.cos(angle + 0.5 * Math.PI);
        var yl = yt + length / 3 * Math.sin(angle + 0.5 * Math.PI);

        // right
        var xr = xt + length / 3 * Math.cos(angle - 0.5 * Math.PI);
        var yr = yt + length / 3 * Math.sin(angle - 0.5 * Math.PI);

        this.beginPath();
        this.moveTo(x, y);
        this.lineTo(xl, yl);
        this.lineTo(xi, yi);
        this.lineTo(xr, yr);
        this.closePath();
    };

    /**
     * Sets up the dashedLine functionality for drawing
     * Original code came from http://stackoverflow.com/questions/4576724/dotted-stroke-in-canvas
     * @author David Jordan
     * @date 2012-08-08
     */
    CanvasRenderingContext2D.prototype.dashedLine = function(x,y,x2,y2,dashArray){
        if (!dashArray) dashArray=[10,5];
        if (dashLength==0) dashLength = 0.001; // Hack for Safari
        var dashCount = dashArray.length;
        this.moveTo(x, y);
        var dx = (x2-x), dy = (y2-y);
        var slope = dy/dx;
        var distRemaining = Math.sqrt( dx*dx + dy*dy );
        var dashIndex=0, draw=true;
        while (distRemaining>=0.1){
            var dashLength = dashArray[dashIndex++%dashCount];
            if (dashLength > distRemaining) dashLength = distRemaining;
            var xStep = Math.sqrt( dashLength*dashLength / (1 + slope*slope) );
            if (dx<0) xStep = -xStep;
            x += xStep;
            y += slope*xStep;
            this[draw ? 'lineTo' : 'moveTo'](x,y);
            distRemaining -= dashLength;
            draw = !draw;
        }
    };

    // TODO: add diamond shape
}

/**
 * @class Node
 * A node. A node can be connected to other nodes via one or multiple edges.
 * @param {object} properties An object containing properties for the node. All
 *                            properties are optional, except for the id.
 *                              {number} id     Id of the node. Required
 *                              {string} label  Text label for the node
 *                              {number} x      Horizontal position of the node
 *                              {number} y      Vertical position of the node
 *                              {string} shape  Node shape, available:
 *                                              "database", "circle", "ellipse",
 *                                              "box", "image", "text", "dot",
 *                                              "star", "triangle", "triangleDown",
 *                                              "square"
 *                              {string} image  An image url
 *                              {string} title  An title text, can be HTML
 *                              {anytype} group A group name or number
 * @param {Graph.Images} imagelist    A list with images. Only needed
 *                                            when the node has an image
 * @param {Graph.Groups} grouplist    A list with groups. Needed for
 *                                            retrieving group properties
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 */
function Node(properties, imagelist, grouplist, constants) {
    this.selected = false;

    this.edges = []; // all edges connected to this node
    this.group = constants.nodes.group;

    this.fontSize = constants.nodes.fontSize;
    this.fontFace = constants.nodes.fontFace;
    this.fontColor = constants.nodes.fontColor;

    this.color = constants.nodes.color;

    // set defaults for the properties
    this.id = undefined;
    this.shape = constants.nodes.shape;
    this.image = constants.nodes.image;
    this.x = 0;
    this.y = 0;
    this.xFixed = false;
    this.yFixed = false;
    this.radius = constants.nodes.radius;
    this.radiusFixed = false;
    this.radiusMin = constants.nodes.radiusMin;
    this.radiusMax = constants.nodes.radiusMax;

    this.imagelist = imagelist;
    this.grouplist = grouplist;

    this.setProperties(properties, constants);

    // mass, force, velocity
    this.mass = 50;  // kg (mass is adjusted for the number of connected edges)
    this.fx = 0.0;  // external force x
    this.fy = 0.0;  // external force y
    this.vx = 0.0;  // velocity x
    this.vy = 0.0;  // velocity y
    this.minForce = constants.minForce;
    this.damping = 0.9; // damping factor
};

/**
 * Attach a edge to the node
 * @param {Edge} edge
 */
Node.prototype.attachEdge = function(edge) {
    this.edges.push(edge);
    this._updateMass();
};

/**
 * Detach a edge from the node
 * @param {Edge} edge
 */
Node.prototype.detachEdge = function(edge) {
    var index = this.edges.indexOf(edge);
    if (index != -1) {
        this.edges.splice(index, 1);
    }
    this._updateMass();
};

/**
 * Update the nodes mass, which is determined by the number of edges connecting
 * to it (more edges -> heavier node).
 * @private
 */
Node.prototype._updateMass = function() {
    this.mass = 50 + 20 * this.edges.length; // kg
};

/**
 * Set or overwrite properties for the node
 * @param {Object} properties an object with properties
 * @param {Object} constants  and object with default, global properties
 */
Node.prototype.setProperties = function(properties, constants) {
    if (!properties) {
        return;
    }

    // basic properties
    if (properties.id != undefined)        {this.id = properties.id;}
    if (properties.label != undefined)     {this.label = properties.label;}
    if (properties.title != undefined)     {this.title = properties.title;}
    if (properties.group != undefined)     {this.group = properties.group;}
    if (properties.x != undefined)         {this.x = properties.x;}
    if (properties.y != undefined)         {this.y = properties.y;}
    if (properties.value != undefined)     {this.value = properties.value;}

    if (this.id === undefined) {
        throw "Node must have an id";
    }

    // copy group properties
    if (this.group) {
        var groupObj = this.grouplist.get(this.group);
        for (var prop in groupObj) {
            if (groupObj.hasOwnProperty(prop)) {
                this[prop] = groupObj[prop];
            }
        }
    }

    // individual shape properties
    if (properties.shape != undefined)          {this.shape = properties.shape;}
    if (properties.image != undefined)          {this.image = properties.image;}
    if (properties.radius != undefined)         {this.radius = properties.radius;}
    if (properties.color != undefined)          {this.color = Node.parseColor(properties.color);}

    if (properties.fontColor != undefined)      {this.fontColor = properties.fontColor;}
    if (properties.fontSize != undefined)       {this.fontSize = properties.fontSize;}
    if (properties.fontFace != undefined)       {this.fontFace = properties.fontFace;}


    if (this.image != undefined) {
        if (this.imagelist) {
            this.imageObj = this.imagelist.load(this.image);
        }
        else {
            throw "No imagelist provided";
        }
    }

    this.xFixed = this.xFixed || (properties.x != undefined);
    this.yFixed = this.yFixed || (properties.y != undefined);
    this.radiusFixed = this.radiusFixed || (properties.radius != undefined);

    if (this.shape == 'image') {
        this.radiusMin = constants.nodes.widthMin;
        this.radiusMax = constants.nodes.widthMax;
    }

    // choose draw method depending on the shape
    switch (this.shape) {
        case 'database':      this.draw = this._drawDatabase; this.resize = this._resizeDatabase; break;
        case 'box':           this.draw = this._drawBox; this.resize = this._resizeBox; break;
        case 'circle':        this.draw = this._drawCircle; this.resize = this._resizeCircle; break;
        case 'ellipse':       this.draw = this._drawEllipse; this.resize = this._resizeEllipse; break;
        // TODO: add diamond shape
        case 'image':         this.draw = this._drawImage; this.resize = this._resizeImage; break;
        case 'text':          this.draw = this._drawText; this.resize = this._resizeText; break;
        case 'dot':           this.draw = this._drawDot; this.resize = this._resizeShape; break;
        case 'square':        this.draw = this._drawSquare; this.resize = this._resizeShape; break;
        case 'triangle':      this.draw = this._drawTriangle; this.resize = this._resizeShape; break;
        case 'triangleDown':  this.draw = this._drawTriangleDown; this.resize = this._resizeShape; break;
        case 'star':          this.draw = this._drawStar; this.resize = this._resizeShape; break;
        default:              this.draw = this._drawEllipse; this.resize = this._resizeEllipse; break;
    }

    // reset the size of the node, this can be changed
    this._reset();
};

/**
 * Parse a color property into an object with border, background, and
 * hightlight colors
 * @param {Object | String} color
 * @return {Object} colorObject
 */
Node.parseColor = function(color) {
    var c;
    if (util.isString(color)) {
        c = {
            border: color,
            background: color,
            highlight: {
                border: color,
                background: color
            }
        };
        // TODO: automatically generate a nice highlight color
    }
    else {
        c = {};
        c.background = color.background || 'white';
        c.border = color.border || c.background;
        if (util.isString(color.highlight)) {
            c.highlight = {
                border: color.highlight,
                background: color.highlight
            }
        }
        else {
            c.highlight = {};
            c.highlight.background = color.highlight && color.highlight.background || c.background;
            c.highlight.border = color.highlight && color.highlight.border || c.border;
        }
    }
    return c;
};

/**
 * select this node
 */
Node.prototype.select = function() {
    this.selected = true;
    this._reset();
};

/**
 * unselect this node
 */
Node.prototype.unselect = function() {
    this.selected = false;
    this._reset();
};

/**
 * Reset the calculated size of the node, forces it to recalculate its size
 * @private
 */
Node.prototype._reset = function() {
    this.width = undefined;
    this.height = undefined;
};

/**
 * get the title of this node.
 * @return {string} title    The title of the node, or undefined when no title
 *                           has been set.
 */
Node.prototype.getTitle = function() {
    return this.title;
};

/**
 * Calculate the distance to the border of the Node
 * @param {CanvasRenderingContext2D}   ctx
 * @param {Number} angle        Angle in radians
 * @returns {number} distance   Distance to the border in pixels
 */
Node.prototype.distanceToBorder = function (ctx, angle) {
    var borderWidth = 1;

    if (!this.width) {
        this.resize(ctx);
    }

    //noinspection FallthroughInSwitchStatementJS
    switch (this.shape) {
        case 'circle':
        case 'dot':
            return this.radius + borderWidth;

        case 'ellipse':
            var a = this.width / 2;
            var b = this.height / 2;
            var w = (Math.sin(angle) * a);
            var h = (Math.cos(angle) * b);
            return a * b / Math.sqrt(w * w + h * h);

        // TODO: implement distanceToBorder for database
        // TODO: implement distanceToBorder for triangle
        // TODO: implement distanceToBorder for triangleDown

        case 'box':
        case 'image':
        case 'text':
        default:
            if (this.width) {
                return Math.min(
                    Math.abs(this.width / 2 / Math.cos(angle)),
                    Math.abs(this.height / 2 / Math.sin(angle))) + borderWidth;
                // TODO: reckon with border radius too in case of box
            }
            else {
                return 0;
            }

    }

    // TODO: implement calculation of distance to border for all shapes
};

/**
 * Set forces acting on the node
 * @param {number} fx   Force in horizontal direction
 * @param {number} fy   Force in vertical direction
 */
Node.prototype._setForce = function(fx, fy) {
    this.fx = fx;
    this.fy = fy;
};

/**
 * Add forces acting on the node
 * @param {number} fx   Force in horizontal direction
 * @param {number} fy   Force in vertical direction
 * @private
 */
Node.prototype._addForce = function(fx, fy) {
    this.fx += fx;
    this.fy += fy;
};

/**
 * Perform one discrete step for the node
 * @param {number} interval    Time interval in seconds
 */
Node.prototype.discreteStep = function(interval) {
    if (!this.xFixed) {
        var dx   = -this.damping * this.vx;     // damping force
        var ax   = (this.fx + dx) / this.mass;  // acceleration
        this.vx += ax / interval;               // velocity
        this.x  += this.vx / interval;          // position
    }

    if (!this.yFixed) {
        var dy   = -this.damping * this.vy;     // damping force
        var ay   = (this.fy + dy) / this.mass;  // acceleration
        this.vy += ay / interval;               // velocity
        this.y  += this.vy / interval;          // position
    }
};


/**
 * Check if this node has a fixed x and y position
 * @return {boolean}      true if fixed, false if not
 */
Node.prototype.isFixed = function() {
    return (this.xFixed && this.yFixed);
};

/**
 * Check if this node is moving
 * @param {number} vmin   the minimum velocity considered as "moving"
 * @return {boolean}      true if moving, false if it has no velocity
 */
// TODO: replace this method with calculating the kinetic energy
Node.prototype.isMoving = function(vmin) {
    return (Math.abs(this.vx) > vmin || Math.abs(this.vy) > vmin ||
        (!this.xFixed && Math.abs(this.fx) > this.minForce) ||
        (!this.yFixed && Math.abs(this.fy) > this.minForce));
};

/**
 * check if this node is selecte
 * @return {boolean} selected   True if node is selected, else false
 */
Node.prototype.isSelected = function() {
    return this.selected;
};

/**
 * Retrieve the value of the node. Can be undefined
 * @return {Number} value
 */
Node.prototype.getValue = function() {
    return this.value;
};

/**
 * Calculate the distance from the nodes location to the given location (x,y)
 * @param {Number} x
 * @param {Number} y
 * @return {Number} value
 */
Node.prototype.getDistance = function(x, y) {
    var dx = this.x - x,
        dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Adjust the value range of the node. The node will adjust it's radius
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Node.prototype.setValueRange = function(min, max) {
    if (!this.radiusFixed && this.value !== undefined) {
        var scale = (this.radiusMax - this.radiusMin) / (max - min);
        this.radius = (this.value - min) * scale + this.radiusMin;
    }
};

/**
 * Draw this node in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Node.prototype.draw = function(ctx) {
    throw "Draw method not initialized for node";
};

/**
 * Recalculate the size of this node in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Node.prototype.resize = function(ctx) {
    throw "Resize method not initialized for node";
};

/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top, right, bottom
 * @return {boolean}     True if location is located on node
 */
Node.prototype.isOverlappingWith = function(obj) {
    return (this.left          < obj.right &&
        this.left + this.width > obj.left &&
        this.top               < obj.bottom &&
        this.top + this.height > obj.top);
};

Node.prototype._resizeImage = function (ctx) {
    // TODO: pre calculate the image size
    if (!this.width) {  // undefined or 0
        var width, height;
        if (this.value) {
            var scale = this.imageObj.height / this.imageObj.width;
            width = this.radius || this.imageObj.width;
            height = this.radius * scale || this.imageObj.height;
        }
        else {
            width = this.imageObj.width;
            height = this.imageObj.height;
        }
        this.width  = width;
        this.height = height;
    }
};

Node.prototype._drawImage = function (ctx) {
    this._resizeImage(ctx);

    this.left   = this.x - this.width / 2;
    this.top    = this.y - this.height / 2;

    var yLabel;
    if (this.imageObj) {
        ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
        yLabel = this.y + this.height / 2;
    }
    else {
        // image still loading... just draw the label for now
        yLabel = this.y;
    }

    this._label(ctx, this.label, this.x, yLabel, undefined, "top");
};


Node.prototype._resizeBox = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        this.width = textSize.width + 2 * margin;
        this.height = textSize.height + 2 * margin;
    }
};

Node.prototype._drawBox = function (ctx) {
    this._resizeBox(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.roundRect(this.left, this.top, this.width, this.height, this.radius);
    ctx.fill();
    ctx.stroke();

    this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._resizeDatabase = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        var size = textSize.width + 2 * margin;
        this.width = size;
        this.height = size;
    }
};

Node.prototype._drawDatabase = function (ctx) {
    this._resizeDatabase(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.database(this.x - this.width/2, this.y - this.height*0.5, this.width, this.height);
    ctx.fill();
    ctx.stroke();

    this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._resizeCircle = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        var diameter = Math.max(textSize.width, textSize.height) + 2 * margin;
        this.radius = diameter / 2;

        this.width = diameter;
        this.height = diameter;
    }
};

Node.prototype._drawCircle = function (ctx) {
    this._resizeCircle(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.circle(this.x, this.y, this.radius);
    ctx.fill();
    ctx.stroke();

    this._label(ctx, this.label, this.x, this.y);
};

Node.prototype._resizeEllipse = function (ctx) {
    if (!this.width) {
        var textSize = this.getTextSize(ctx);

        this.width = textSize.width * 1.5;
        this.height = textSize.height * 2;
        if (this.width < this.height) {
            this.width = this.height;
        }
    }
};

Node.prototype._drawEllipse = function (ctx) {
    this._resizeEllipse(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;
    ctx.ellipse(this.left, this.top, this.width, this.height);
    ctx.fill();
    ctx.stroke();

    this._label(ctx, this.label, this.x, this.y);
};

Node.prototype._drawDot = function (ctx) {
    this._drawShape(ctx, 'circle');
};

Node.prototype._drawTriangle = function (ctx) {
    this._drawShape(ctx, 'triangle');
};

Node.prototype._drawTriangleDown = function (ctx) {
    this._drawShape(ctx, 'triangleDown');
};

Node.prototype._drawSquare = function (ctx) {
    this._drawShape(ctx, 'square');
};

Node.prototype._drawStar = function (ctx) {
    this._drawShape(ctx, 'star');
};

Node.prototype._resizeShape = function (ctx) {
    if (!this.width) {
        var size = 2 * this.radius;
        this.width = size;
        this.height = size;
    }
};

Node.prototype._drawShape = function (ctx, shape) {
    this._resizeShape(ctx);

    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    ctx.strokeStyle = this.selected ? this.color.highlight.border : this.color.border;
    ctx.fillStyle = this.selected ? this.color.highlight.background : this.color.background;
    ctx.lineWidth = this.selected ? 2.0 : 1.0;

    ctx[shape](this.x, this.y, this.radius);
    ctx.fill();
    ctx.stroke();

    if (this.label) {
        this._label(ctx, this.label, this.x, this.y + this.height / 2, undefined, 'top');
    }
};

Node.prototype._resizeText = function (ctx) {
    if (!this.width) {
        var margin = 5;
        var textSize = this.getTextSize(ctx);
        this.width = textSize.width + 2 * margin;
        this.height = textSize.height + 2 * margin;
    }
};

Node.prototype._drawText = function (ctx) {
    this._resizeText(ctx);
    this.left = this.x - this.width / 2;
    this.top = this.y - this.height / 2;

    this._label(ctx, this.label, this.x, this.y);
};


Node.prototype._label = function (ctx, text, x, y, align, baseline) {
    if (text) {
        ctx.font = (this.selected ? "bold " : "") + this.fontSize + "px " + this.fontFace;
        ctx.fillStyle = this.fontColor || "black";
        ctx.textAlign = align || "center";
        ctx.textBaseline = baseline || "middle";

        var lines = text.split('\n'),
            lineCount = lines.length,
            fontSize = (this.fontSize + 4),
            yLine = y + (1 - lineCount) / 2 * fontSize;

        for (var i = 0; i < lineCount; i++) {
            ctx.fillText(lines[i], x, yLine);
            yLine += fontSize;
        }
    }
};


Node.prototype.getTextSize = function(ctx) {
    if (this.label != undefined) {
        ctx.font = (this.selected ? "bold " : "") + this.fontSize + "px " + this.fontFace;

        var lines = this.label.split('\n'),
            height = (this.fontSize + 4) * lines.length,
            width = 0;

        for (var i = 0, iMax = lines.length; i < iMax; i++) {
            width = Math.max(width, ctx.measureText(lines[i]).width);
        }

        return {"width": width, "height": height};
    }
    else {
        return {"width": 0, "height": 0};
    }
};

/**
 * @class Edge
 *
 * A edge connects two nodes
 * @param {Object} properties     Object with properties. Must contain
 *                                At least properties from and to.
 *                                Available properties: from (number),
 *                                to (number), label (string, color (string),
 *                                width (number), style (string),
 *                                length (number), title (string)
 * @param {Graph} graph A graph object, used to find and edge to
 *                                nodes.
 * @param {Object} constants      An object with default values for
 *                                example for the color
 */
function Edge (properties, graph, constants) {
    if (!graph) {
        throw "No graph provided";
    }
    this.graph = graph;

    // initialize constants
    this.widthMin = constants.edges.widthMin;
    this.widthMax = constants.edges.widthMax;

    // initialize variables
    this.id     = undefined;
    this.style  = constants.edges.style;
    this.title  = undefined;
    this.width  = constants.edges.width;
    this.value  = undefined;
    this.length = constants.edges.length;

    // Added to support dashed lines
    // David Jordan
    // 2012-08-08
    this.dash = util.extend({}, constants.edges.dash); // contains properties length, gaph, altLength

    this.stiffness = undefined; // depends on the length of the edge
    this.color  = constants.edges.color;
    this.widthFixed = false;
    this.lengthFixed = false;

    this.setProperties(properties, constants);
};

/**
 * Set or overwrite properties for the edge
 * @param {Object} properties  an object with properties
 * @param {Object} constants   and object with default, global properties
 */
Edge.prototype.setProperties = function(properties, constants) {
    if (!properties) {
        return;
    }

    if (properties.from != undefined) {this.from = this.graph._getNode(properties.from);}
    if (properties.to != undefined) {this.to = this.graph._getNode(properties.to);}

    if (properties.id != undefined)         {this.id = properties.id;}
    if (properties.style != undefined)      {this.style = properties.style;}
    if (properties.label != undefined)       {this.label = properties.label;}
    if (this.label) {
        this.fontSize = constants.edges.fontSize;
        this.fontFace = constants.edges.fontFace;
        this.fontColor = constants.edges.fontColor;
        if (properties.fontColor != undefined)  {this.fontColor = properties.fontColor;}
        if (properties.fontSize != undefined)   {this.fontSize = properties.fontSize;}
        if (properties.fontFace != undefined)   {this.fontFace = properties.fontFace;}
    }
    if (properties.title != undefined)      {this.title = properties.title;}
    if (properties.width != undefined)      {this.width = properties.width;}
    if (properties.value != undefined)      {this.value = properties.value;}
    if (properties.length != undefined)     {this.length = properties.length;}

    // Added to support dashed lines
    // David Jordan
    // 2012-08-08
    if (properties.dash) {
        if (properties.dash.length != undefined) {this.dash.length = properties.dash.length;}
        if (properties.dash.gap != undefined) {this.dash.gap = properties.dash.gap;}
        if (properties.dash.altLength != undefined) {this.dash.altLength = properties.dash.altLength;}
    }
    
    if (properties.color != undefined) {this.color = properties.color;}

    if (!this.from) {
        throw "Node with id " + properties.from + " not found";
    }
    if (!this.to) {
        throw "Node with id " + properties.to + " not found";
    }

    this.widthFixed = this.widthFixed || (properties.width != undefined);
    this.lengthFixed = this.lengthFixed || (properties.length != undefined);

    this.stiffness = 1 / this.length;

    // set draw method based on style
    switch (this.style) {
        case 'line':          this.draw = this._drawLine; break;
        case 'arrow':         this.draw = this._drawArrow; break;
        case 'arrow-center':  this.draw = this._drawArrowCenter; break;
        case 'dash-line':     this.draw = this._drawDashLine; break;
        default:              this.draw = this._drawLine; break;
    }
};

/**
 * get the title of this edge.
 * @return {string} title    The title of the edge, or undefined when no title
 *                           has been set.
 */
Edge.prototype.getTitle = function() {
    return this.title;
};


/**
 * Retrieve the value of the edge. Can be undefined
 * @return {Number} value
 */
Edge.prototype.getValue = function() {
    return this.value;
};

/**
 * Adjust the value range of the edge. The edge will adjust it's width
 * based on its value.
 * @param {Number} min
 * @param {Number} max
 */
Edge.prototype.setValueRange = function(min, max) {
    if (!this.widthFixed && this.value !== undefined) {
        var factor = (this.widthMax - this.widthMin) / (max - min);
        this.width = (this.value - min) * factor + this.widthMin;
    }
};

/**
 * Redraw a edge
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 */
Edge.prototype.draw = function(ctx) {
    throw "Method draw not initialized in edge";
};

/**
 * Check if this object is overlapping with the provided object
 * @param {Object} obj   an object with parameters left, top
 * @return {boolean}     True if location is located on the edge
 */
Edge.prototype.isOverlappingWith = function(obj) {
    var distMax = 10;

    var xFrom = this.from.x;
    var yFrom = this.from.y;
    var xTo = this.to.x;
    var yTo = this.to.y;
    var xObj = obj.left;
    var yObj = obj.top;


    var dist = Edge._dist(xFrom, yFrom, xTo, yTo, xObj, yObj);

    return (dist < distMax);
};


/**
 * Redraw a edge as a line
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawLine = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    var point;
    if (this.from != this.to) {
        // draw line
        this._line(ctx);

        // draw label
        if (this.label) {
            point = this._pointOnLine(0.5);
            this._label(ctx, this.label, point.x, point.y);
        }
    }
    else {
        var x, y;
        var radius = this.length / 4;
        var node = this.from;
        if (!node.width) {
            node.resize(ctx);
        }
        if (node.width > node.height) {
            x = node.x + node.width / 2;
            y = node.y - radius;
        }
        else {
            x = node.x + radius;
            y = node.y - node.height / 2;
        }
        this._circle(ctx, x, y, radius);
        point = this._pointOnCircle(x, y, radius, 0.5);
        this._label(ctx, this.label, point.x, point.y);
    }
};

/**
 * Get the line width of the edge. Depends on width and whether one of the
 * connected nodes is selected.
 * @return {Number} width
 * @private
 */
Edge.prototype._getLineWidth = function() {
    if (this.from.selected || this.to.selected) {
        return Math.min(this.width * 2, this.widthMax);
    }
    else {
        return this.width;
    }
};

/**
 * Draw a line between two nodes
 * @param {CanvasRenderingContext2D} ctx
 * @private
 */
Edge.prototype._line = function (ctx) {
    // draw a straight line
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.stroke();
};

/**
 * Draw a line from a node to itself, a circle
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @private
 */
Edge.prototype._circle = function (ctx, x, y, radius) {
    // draw a circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.stroke();
};

/**
 * Draw label with white background and with the middle at (x, y)
 * @param {CanvasRenderingContext2D} ctx
 * @param {String} text
 * @param {Number} x
 * @param {Number} y
 * @private
 */
Edge.prototype._label = function (ctx, text, x, y) {
    if (text) {
        // TODO: cache the calculated size
        ctx.font = ((this.from.selected || this.to.selected) ? "bold " : "") +
            this.fontSize + "px " + this.fontFace;
        ctx.fillStyle = 'white';
        var width = ctx.measureText(text).width;
        var height = this.fontSize;
        var left = x - width / 2;
        var top = y - height / 2;

        ctx.fillRect(left, top, width, height);

        // draw text
        ctx.fillStyle = this.fontColor || "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(text, left, top);
    }
};

/**
 * Redraw a edge as a dashed line
 * Draw this edge in the given canvas
 * @author David Jordan
 * @date 2012-08-08
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawDashLine = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    // draw dashed line
    ctx.beginPath();
    ctx.lineCap = 'round';
    if (this.dash.altLength != undefined) //If an alt dash value has been set add to the array this value
    {
        ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,
            [this.dash.length,this.dash.gap,this.dash.altLength,this.dash.gap]);
    }
    else if (this.dash.length != undefined && this.dash.gap != undefined) //If a dash and gap value has been set add to the array this value
    {
        ctx.dashedLine(this.from.x,this.from.y,this.to.x,this.to.y,
            [this.dash.length,this.dash.gap]);
    }
    else //If all else fails draw a line
    {
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
    }
    ctx.stroke();

    // draw label
    if (this.label) {
        var point = this._pointOnLine(0.5);
        this._label(ctx, this.label, point.x, point.y);
    }
};

/**
 * Get a point on a line
 * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
 * @return {Object} point
 * @private
 */
Edge.prototype._pointOnLine = function (percentage) {
    return {
        x: (1 - percentage) * this.from.x + percentage * this.to.x,
        y: (1 - percentage) * this.from.y + percentage * this.to.y
    }
};

/**
 * Get a point on a circle
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 * @param {Number} percentage. Value between 0 (line start) and 1 (line end)
 * @return {Object} point
 * @private
 */
Edge.prototype._pointOnCircle = function (x, y, radius, percentage) {
    var angle = (percentage - 3/8) * 2 * Math.PI;
    return {
        x: x + radius * Math.cos(angle),
        y: y - radius * Math.sin(angle)
    }
};

/**
 * Redraw a edge as a line with an arrow halfway the line
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawArrowCenter = function(ctx) {
    var point;
    // set style
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    if (this.from != this.to) {
        // draw line
        this._line(ctx);

        // draw an arrow halfway the line
        var angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
        var length = 10 + 5 * this.width; // TODO: make customizable?
        point = this._pointOnLine(0.5);
        ctx.arrow(point.x, point.y, angle, length);
        ctx.fill();
        ctx.stroke();

        // draw label
        if (this.label) {
            point = this._pointOnLine(0.5);
            this._label(ctx, this.label, point.x, point.y);
        }
    }
    else {
        // draw circle
        var x, y;
        var radius = this.length / 4;
        var node = this.from;
        if (!node.width) {
            node.resize(ctx);
        }
        if (node.width > node.height) {
            x = node.x + node.width / 2;
            y = node.y - radius;
        }
        else {
            x = node.x + radius;
            y = node.y - node.height / 2;
        }
        this._circle(ctx, x, y, radius);

        // draw all arrows
        var angle = 0.2 * Math.PI;
        var length = 10 + 5 * this.width; // TODO: make customizable?
        point = this._pointOnCircle(x, y, radius, 0.5);
        ctx.arrow(point.x, point.y, angle, length);
        ctx.fill();
        ctx.stroke();

        // draw label
        if (this.label) {
            point = this._pointOnCircle(x, y, radius, 0.5);
            this._label(ctx, this.label, point.x, point.y);
        }
    }
};



/**
 * Redraw a edge as a line with an arrow
 * Draw this edge in the given canvas
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Edge.prototype._drawArrow = function(ctx) {
    // set style
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this._getLineWidth();

    // draw line
    var angle, length;
    if (this.from != this.to) {
        // calculate length and angle of the line
        angle = Math.atan2((this.to.y - this.from.y), (this.to.x - this.from.x));
        var dx = (this.to.x - this.from.x);
        var dy = (this.to.y - this.from.y);
        var lEdge = Math.sqrt(dx * dx + dy * dy);

        var lFrom = this.from.distanceToBorder(ctx, angle + Math.PI);
        var pFrom = (lEdge - lFrom) / lEdge;
        var xFrom = (pFrom) * this.from.x + (1 - pFrom) * this.to.x;
        var yFrom = (pFrom) * this.from.y + (1 - pFrom) * this.to.y;

        var lTo = this.to.distanceToBorder(ctx, angle);
        var pTo = (lEdge - lTo) / lEdge;
        var xTo = (1 - pTo) * this.from.x + pTo * this.to.x;
        var yTo = (1 - pTo) * this.from.y + pTo * this.to.y;

        ctx.beginPath();
        ctx.moveTo(xFrom, yFrom);
        ctx.lineTo(xTo, yTo);
        ctx.stroke();

        // draw arrow at the end of the line
        length = 10 + 5 * this.width; // TODO: make customizable?
        ctx.arrow(xTo, yTo, angle, length);
        ctx.fill();
        ctx.stroke();

        // draw label
        if (this.label) {
            var point = this._pointOnLine(0.5);
            this._label(ctx, this.label, point.x, point.y);
        }
    }
    else {
        // draw circle
        var node = this.from;
        var x, y, arrow;
        var radius = this.length / 4;
        if (!node.width) {
            node.resize(ctx);
        }
        if (node.width > node.height) {
            x = node.x + node.width / 2;
            y = node.y - radius;
            arrow = {
                x: x,
                y: node.y,
                angle: 0.9 * Math.PI
            };
        }
        else {
            x = node.x + radius;
            y = node.y - node.height / 2;
            arrow = {
                x: node.x,
                y: y,
                angle: 0.6 * Math.PI
            };
        }
        ctx.beginPath();
        // TODO: do not draw a circle, but an arc
        // TODO: similarly, for a line without arrows, draw to the border of the nodes instead of the center
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.stroke();

        // draw all arrows
        length = 10 + 5 * this.width; // TODO: make customizable?
        ctx.arrow(arrow.x, arrow.y, arrow.angle, length);
        ctx.fill();
        ctx.stroke();

        // draw label
        if (this.label) {
            point = this._pointOnCircle(x, y, radius, 0.5);
            this._label(ctx, this.label, point.x, point.y);
        }
    }
};



/**
 * Calculate the distance between a point (x3,y3) and a line segment from
 * (x1,y1) to (x2,y2).
 * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @private
 */
Edge._dist = function (x1,y1, x2,y2, x3,y3) { // x3,y3 is the point
    var px = x2-x1,
        py = y2-y1,
        something = px*px + py*py,
        u =  ((x3 - x1) * px + (y3 - y1) * py) / something;

    if (u > 1) {
        u = 1;
    }
    else if (u < 0) {
        u = 0;
    }

    var x = x1 + u * px,
        y = y1 + u * py,
        dx = x - x3,
        dy = y - y3;

    //# Note: If the actual distance does not matter,
    //# if you only want to compare what this function
    //# returns to other results of this function, you
    //# can just return the squared distance instead
    //# (i.e. remove the sqrt) to gain a little performance

    return Math.sqrt(dx*dx + dy*dy);
};

/**
 * Popup is a class to create a popup window with some text
 * @param {Element}  container     The container object.
 * @param {Number} [x]
 * @param {Number} [y]
 * @param {String} [text]
 */
function Popup(container, x, y, text) {
    if (container) {
        this.container = container;
    }
    else {
        this.container = document.body;
    }
    this.x = 0;
    this.y = 0;
    this.padding = 5;

    if (x !== undefined && y !== undefined ) {
        this.setPosition(x, y);
    }
    if (text !== undefined) {
        this.setText(text);
    }

    // create the frame
    this.frame = document.createElement("div");
    var style = this.frame.style;
    style.position = "absolute";
    style.visibility = "hidden";
    style.border = "1px solid #666";
    style.color = "black";
    style.padding = this.padding + "px";
    style.backgroundColor = "#FFFFC6";
    style.borderRadius = "3px";
    style.MozBorderRadius = "3px";
    style.WebkitBorderRadius = "3px";
    style.boxShadow = "3px 3px 10px rgba(128, 128, 128, 0.5)";
    style.whiteSpace = "nowrap";
    this.container.appendChild(this.frame);
};

/**
 * @param {number} x   Horizontal position of the popup window
 * @param {number} y   Vertical position of the popup window
 */
Popup.prototype.setPosition = function(x, y) {
    this.x = parseInt(x);
    this.y = parseInt(y);
};

/**
 * Set the text for the popup window. This can be HTML code
 * @param {string} text
 */
Popup.prototype.setText = function(text) {
    this.frame.innerHTML = text;
};

/**
 * Show the popup window
 * @param {boolean} show    Optional. Show or hide the window
 */
Popup.prototype.show = function (show) {
    if (show === undefined) {
        show = true;
    }

    if (show) {
        var height = this.frame.clientHeight;
        var width =  this.frame.clientWidth;
        var maxHeight = this.frame.parentNode.clientHeight;
        var maxWidth = this.frame.parentNode.clientWidth;

        var top = (this.y - height);
        if (top + height + this.padding > maxHeight) {
            top = maxHeight - height - this.padding;
        }
        if (top < this.padding) {
            top = this.padding;
        }

        var left = this.x;
        if (left + width + this.padding > maxWidth) {
            left = maxWidth - width - this.padding;
        }
        if (left < this.padding) {
            left = this.padding;
        }

        this.frame.style.left = left + "px";
        this.frame.style.top = top + "px";
        this.frame.style.visibility = "visible";
    }
    else {
        this.hide();
    }
};

/**
 * Hide the popup window
 */
Popup.prototype.hide = function () {
    this.frame.style.visibility = "hidden";
};

/**
 * @class Groups
 * This class can store groups and properties specific for groups.
 */
Groups = function () {
    this.clear();
    this.defaultIndex = 0;
};


/**
 * default constants for group colors
 */
Groups.DEFAULT = [
    {border: "#2B7CE9", background: "#97C2FC", highlight: {border: "#2B7CE9", background: "#D2E5FF"}}, // blue
    {border: "#FFA500", background: "#FFFF00", highlight: {border: "#FFA500", background: "#FFFFA3"}}, // yellow
    {border: "#FA0A10", background: "#FB7E81", highlight: {border: "#FA0A10", background: "#FFAFB1"}}, // red
    {border: "#41A906", background: "#7BE141", highlight: {border: "#41A906", background: "#A1EC76"}}, // green
    {border: "#E129F0", background: "#EB7DF4", highlight: {border: "#E129F0", background: "#F0B3F5"}}, // magenta
    {border: "#7C29F0", background: "#AD85E4", highlight: {border: "#7C29F0", background: "#D3BDF0"}}, // purple
    {border: "#C37F00", background: "#FFA807", highlight: {border: "#C37F00", background: "#FFCA66"}}, // orange
    {border: "#4220FB", background: "#6E6EFD", highlight: {border: "#4220FB", background: "#9B9BFD"}}, // darkblue
    {border: "#FD5A77", background: "#FFC0CB", highlight: {border: "#FD5A77", background: "#FFD1D9"}}, // pink
    {border: "#4AD63A", background: "#C2FABC", highlight: {border: "#4AD63A", background: "#E6FFE3"}}  // mint
];


/**
 * Clear all groups
 */
Groups.prototype.clear = function () {
    this.groups = {};
    this.groups.length = function()
    {
        var i = 0;
        for ( var p in this ) {
            if (this.hasOwnProperty(p)) {
                i++;
            }
        }
        return i;
    }
};


/**
 * get group properties of a groupname. If groupname is not found, a new group
 * is added.
 * @param {*} groupname        Can be a number, string, Date, etc.
 * @return {Object} group      The created group, containing all group properties
 */
Groups.prototype.get = function (groupname) {
    var group = this.groups[groupname];

    if (group == undefined) {
        // create new group
        var index = this.defaultIndex % Groups.DEFAULT.length;
        this.defaultIndex++;
        group = {};
        group.color = Groups.DEFAULT[index];
        this.groups[groupname] = group;
    }

    return group;
};

/**
 * Add a custom group style
 * @param {String} groupname
 * @param {Object} style       An object containing borderColor,
 *                             backgroundColor, etc.
 * @return {Object} group      The created group object
 */
Groups.prototype.add = function (groupname, style) {
    this.groups[groupname] = style;
    if (style.color) {
        style.color = Node.parseColor(style.color);
    }
    return style;
};

/**
 * @class Images
 * This class loads images and keeps them stored.
 */
Images = function () {
    this.images = {};

    this.callback = undefined;
};

/**
 * Set an onload callback function. This will be called each time an image
 * is loaded
 * @param {function} callback
 */
Images.prototype.setOnloadCallback = function(callback) {
    this.callback = callback;
};

/**
 *
 * @param {string} url          Url of the image
 * @return {Image} img          The image object
 */
Images.prototype.load = function(url) {
    var img = this.images[url];
    if (img == undefined) {
        // create the image
        var images = this;
        img = new Image();
        this.images[url] = img;
        img.onload = function() {
            if (images.callback) {
                images.callback(this);
            }
        };
        img.src = url;
    }

    return img;
};

/**
 * @constructor Graph
 * Create a graph visualization, displaying nodes and edges.
 * 
 * @param {Element} container   The DOM element in which the Graph will
 *                                  be created. Normally a div element.
 * @param {Object} data         An object containing parameters
 *                              {Array} nodes
 *                              {Array} edges
 * @param {Object} options      Options
 */
function Graph (container, data, options) {
    // create variables and set default values
    this.containerElement = container;
    this.width = '100%';
    this.height = '100%';
    this.refreshRate = 50; // milliseconds
    this.stabilize = true; // stabilize before displaying the graph
    this.selectable = true;

    // set constant values
    this.constants = {
        nodes: {
            radiusMin: 5,
            radiusMax: 20,
            radius: 5,
            distance: 100, // px
            shape: 'ellipse',
            image: undefined,
            widthMin: 16, // px
            widthMax: 64, // px
            fontColor: 'black',
            fontSize: 14, // px
            //fontFace: verdana,
            fontFace: 'arial',
            color: {
                border: '#2B7CE9',
                background: '#97C2FC',
                highlight: {
                    border: '#2B7CE9',
                    background: '#D2E5FF'
                }
            },
            borderColor: '#2B7CE9',
            backgroundColor: '#97C2FC',
            highlightColor: '#D2E5FF',
            group: undefined
        },
        edges: {
            widthMin: 1,
            widthMax: 15,
            width: 1,
            style: 'line',
            color: '#343434',
            fontColor: '#343434',
            fontSize: 14, // px
            fontFace: 'arial',
            //distance: 100, //px
            length: 100,   // px
            dash: {
                length: 10,
                gap: 5,
                altLength: undefined
            }
        },
        minForce: 0.05,
        minVelocity: 0.02,   // px/s
        maxIterations: 1000  // maximum number of iteration to stabilize
    };

    var graph = this;
    this.nodes = [];            // array with Node objects
    this.edges = [];            // array with Edge objects

    this.groups = new Groups(); // object with groups
    this.images = new Images(); // object with images
    this.images.setOnloadCallback(function () {
        graph._redraw();
    });

    // properties of the data
    this.moving = false;    // True if any of the nodes have an undefined position

    this.selection = [];
    this.timer = undefined;

    // create a frame and canvas
    this._create();

    // apply options
    this.setOptions(options);

    // draw data
    this.setData(data);
}

/**
 * Set nodes and edges, and optionally options as well.
 *
 * @param {Object} data    Object containing parameters:
 *                         {Array} [nodes]   Array with nodes.
 *                                           Required when format is 'vis'
 *                         {Array} [edges]   Array with edges
 *                                           Required when format is 'vis'
 *                         {String} [dot]    String containing data in DOT
 *                                           format.
 *                         {Options} [options] Object with options
 */
Graph.prototype.setData = function(data) {
    if (data && data.dot && (data.nodes || data.edges)) {
        throw new SyntaxError('Data must contain either parameter "dot" or ' +
            ' parameter pair "nodes" and "edges", but not both.');
    }

    // set options
    this.setOptions(data && data.options);

    // set all data
    if (data && data.dot) {
        // parse DOT file
        if(data && data.dot) {
            var dotData = vis.util.DOTToGraph(data.dot);
            this.setData(dotData);
            return;
        }
    }
    else {
        this._setNodes(data && data.nodes);
        this._setEdges(data && data.edges);
    }


    // find a stable position or start animating to a stable position
    if (this.stabilize) {
        this._doStabilize();
    }
    this.start();
};

/**
 * Set options
 * @param {Object} options
 */
Graph.prototype.setOptions = function (options) {
    if (options) {
        // retrieve parameter values
        if (options.width != undefined)           {this.width = options.width;}
        if (options.height != undefined)          {this.height = options.height;}
        if (options.stabilize != undefined)       {this.stabilize = options.stabilize;}
        if (options.selectable != undefined)      {this.selectable = options.selectable;}

        // TODO: work out these options and document them
        if (options.edges) {
            for (var prop in options.edges) {
                if (options.edges.hasOwnProperty(prop)) {
                    this.constants.edges[prop] = options.edges[prop];
                }
            }

            if (options.edges.length != undefined &&
                options.nodes && options.nodes.distance == undefined) {
                this.constants.edges.length   = options.edges.length;
                this.constants.nodes.distance = options.edges.length * 1.25;
            }

            if (!options.edges.fontColor) {
                this.constants.edges.fontColor = options.edges.color;
            }

            // Added to support dashed lines
            // David Jordan
            // 2012-08-08
            if (options.edges.dash) {
                if (options.edges.dash.length != undefined) {
                    this.constants.edges.dash.length = options.edges.dash.length;
                }
                if (options.edges.dash.gap != undefined) {
                    this.constants.edges.dash.gap = options.edges.dash.gap;
                }
                if (options.edges.dash.altLength != undefined) {
                    this.constants.edges.dash.altLength = options.edges.dash.altLength;
                }
            }
        }

        if (options.nodes) {
            for (prop in options.nodes) {
                if (options.nodes.hasOwnProperty(prop)) {
                    this.constants.nodes[prop] = options.nodes[prop];
                }
            }

            if (options.nodes.color) {
                this.constants.nodes.color = Node.parseColor(options.nodes.color);
            }

            /*
             if (options.nodes.widthMin) this.constants.nodes.radiusMin = options.nodes.widthMin;
             if (options.nodes.widthMax) this.constants.nodes.radiusMax = options.nodes.widthMax;
             */
        }

        if (options.groups) {
            for (var groupname in options.groups) {
                if (options.groups.hasOwnProperty(groupname)) {
                    var group = options.groups[groupname];
                    this.groups.add(groupname, group);
                }
            }
        }
    }

    this.setSize(this.width, this.height);
    this._setTranslation(0, 0);
    this._setScale(1);
};

/**
 * fire an event
 * @param {String} event   The name of an event, for example "select"
 * @param {Object} params  Optional object with event parameters
 * @private
 */
Graph.prototype._trigger = function (event, params) {
    events.trigger(this, event, params);
};


/**
 * Create the main frame for the Graph.
 * This function is executed once when a Graph object is created. The frame
 * contains a canvas, and this canvas contains all objects like the axis and
 * nodes.
 * @private
 */
Graph.prototype._create = function () {
    // remove all elements from the container element.
    while (this.containerElement.hasChildNodes()) {
        this.containerElement.removeChild(this.containerElement.firstChild);
    }

    this.frame = document.createElement("div");
    this.frame.className = "graph-frame";
    this.frame.style.position = "relative";
    this.frame.style.overflow = "hidden";

    // create the graph canvas (HTML canvas element)
    this.frame.canvas = document.createElement( "canvas" );
    this.frame.canvas.style.position = "relative";
    this.frame.appendChild(this.frame.canvas);
    if (!this.frame.canvas.getContext) {
        var noCanvas = document.createElement( "DIV" );
        noCanvas.style.color = "red";
        noCanvas.style.fontWeight =  "bold" ;
        noCanvas.style.padding =  "10px";
        noCanvas.innerHTML =  "Error: your browser does not support HTML canvas";
        this.frame.canvas.appendChild(noCanvas);
    }

    // create event listeners
    var me = this;
    var onmousedown = function (event) {me._onMouseDown(event);};
    var onmousemove = function (event) {me._onMouseMoveTitle(event);};
    var onmousewheel = function (event) {me._onMouseWheel(event);};
    var ontouchstart = function (event) {me._onTouchStart(event);};
    vis.util.addEventListener(this.frame.canvas, "mousedown", onmousedown);
    vis.util.addEventListener(this.frame.canvas, "mousemove", onmousemove);
    vis.util.addEventListener(this.frame.canvas, "mousewheel", onmousewheel);
    vis.util.addEventListener(this.frame.canvas, "touchstart", ontouchstart);

    // add the frame to the container element
    this.containerElement.appendChild(this.frame);
};

/**
 * handle on mouse down event
 * @private
 */
Graph.prototype._onMouseDown = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    // check if mouse is still down (may be up when focus is lost for example
    // in an iframe)
    if (this.leftButtonDown) {
        this._onMouseUp(event);
    }

    // only react on left mouse button down
    this.leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
    if (!this.leftButtonDown && !this.touchDown) {
        return;
    }

    // add event listeners to handle moving the contents
    // we store the function onmousemove and onmouseup in the timeline, so we can
    // remove the eventlisteners lateron in the function mouseUp()
    var me = this;
    if (!this.onmousemove) {
        this.onmousemove = function (event) {me._onMouseMove(event);};
        vis.util.addEventListener(document, "mousemove", me.onmousemove);
    }
    if (!this.onmouseup) {
        this.onmouseup = function (event) {me._onMouseUp(event);};
        vis.util.addEventListener(document, "mouseup", me.onmouseup);
    }
    vis.util.preventDefault(event);

    // store the start x and y position of the mouse
    this.startMouseX = event.clientX || event.targetTouches[0].clientX;
    this.startMouseY = event.clientY || event.targetTouches[0].clientY;
    this.startFrameLeft = vis.util.getAbsoluteLeft(this.frame.canvas);
    this.startFrameTop = vis.util.getAbsoluteTop(this.frame.canvas);
    this.startTranslation = this._getTranslation();

    this.ctrlKeyDown = event.ctrlKey;
    this.shiftKeyDown = event.shiftKey;

    var obj = {
        "left" :   this._xToCanvas(this.startMouseX - this.startFrameLeft),
        "top" :    this._yToCanvas(this.startMouseY - this.startFrameTop),
        "right" :  this._xToCanvas(this.startMouseX - this.startFrameLeft),
        "bottom" : this._yToCanvas(this.startMouseY - this.startFrameTop)
    };
    var overlappingNodes = this._getNodesOverlappingWith(obj);
    // if there are overlapping nodes, select the last one, this is the
    // one which is drawn on top of the others
    this.startClickedObj = (overlappingNodes.length > 0) ?
        overlappingNodes[overlappingNodes.length - 1] : undefined;

    if (this.startClickedObj) {
        // move clicked node with the mouse

        // make the clicked node temporarily fixed, and store their original state
        var node = this.nodes[this.startClickedObj.row];
        this.startClickedObj.xFixed = node.xFixed;
        this.startClickedObj.yFixed = node.yFixed;
        node.xFixed = true;
        node.yFixed = true;

        if (!this.ctrlKeyDown || !node.isSelected()) {
            // select this node
            this._selectNodes([this.startClickedObj], this.ctrlKeyDown);
        }
        else {
            // unselect this node
            this._unselectNodes([this.startClickedObj]);
        }

        if (!this.moving) {
            this._redraw();
        }
    }
    else if (this.shiftKeyDown) {
        // start selection of multiple nodes
    }
    else {
        // start moving the graph
        this.moved = false;
    }
};

/**
 * handle on mouse move event
 * @param {Event}  event
 * @private
 */
Graph.prototype._onMouseMove = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    var mouseX = event.clientX || (event.targetTouches && event.targetTouches[0].clientX) || 0;
    var mouseY = event.clientY || (event.targetTouches && event.targetTouches[0].clientY) || 0;
    this.mouseX = mouseX;
    this.mouseY = mouseY;

    if (this.startClickedObj) {
        var node = this.nodes[this.startClickedObj.row];

        if (!this.startClickedObj.xFixed)
            node.x = this._xToCanvas(mouseX - this.startFrameLeft);

        if (!this.startClickedObj.yFixed)
            node.y = this._yToCanvas(mouseY - this.startFrameTop);

        // start animation if not yet running
        if (!this.moving) {
            this.moving = true;
            this.start();
        }
    }
    else if (this.shiftKeyDown) {
        // draw a rect from start mouse location to current mouse location
        if (this.frame.selRect == undefined) {
            this.frame.selRect = document.createElement("DIV");
            this.frame.appendChild(this.frame.selRect);

            this.frame.selRect.style.position = "absolute";
            this.frame.selRect.style.border = "1px dashed red";
        }

        var left =   Math.min(this.startMouseX, mouseX) - this.startFrameLeft;
        var top =    Math.min(this.startMouseY, mouseY) - this.startFrameTop;
        var right =  Math.max(this.startMouseX, mouseX) - this.startFrameLeft;
        var bottom = Math.max(this.startMouseY, mouseY) - this.startFrameTop;

        this.frame.selRect.style.left = left + "px";
        this.frame.selRect.style.top = top + "px";
        this.frame.selRect.style.width = (right - left) + "px";
        this.frame.selRect.style.height = (bottom - top) + "px";
    }
    else {
        // move the graph
        var diffX = mouseX - this.startMouseX;
        var diffY = mouseY - this.startMouseY;

        this._setTranslation(
            this.startTranslation.x + diffX,
            this.startTranslation.y + diffY);
        this._redraw();

        this.moved = true;
    }

    vis.util.preventDefault(event);
};

/**
 * handle on mouse up event
 * @param {Event}  event
 * @private
 */
Graph.prototype._onMouseUp = function (event) {
    event = event || window.event;

    if (!this.selectable) {
        return;
    }

    // remove event listeners here, important for Safari
    if (this.onmousemove) {
        vis.util.removeEventListener(document, "mousemove", this.onmousemove);
        this.onmousemove = undefined;
    }
    if (this.onmouseup) {
        vis.util.removeEventListener(document, "mouseup",   this.onmouseup);
        this.onmouseup = undefined;
    }
    vis.util.preventDefault(event);

    // check selected nodes
    var endMouseX = event.clientX || this.mouseX || 0;
    var endMouseY = event.clientY || this.mouseY || 0;

    var ctrlKey = event ? event.ctrlKey : window.event.ctrlKey;

    if (this.startClickedObj) {
        // restore the original fixed state
        var node = this.nodes[this.startClickedObj.row];
        node.xFixed = this.startClickedObj.xFixed;
        node.yFixed = this.startClickedObj.yFixed;
    }
    else if (this.shiftKeyDown) {
        // select nodes inside selection area
        var obj = {
            "left":   this._xToCanvas(Math.min(this.startMouseX, endMouseX) - this.startFrameLeft),
            "top":    this._yToCanvas(Math.min(this.startMouseY, endMouseY) - this.startFrameTop),
            "right":  this._xToCanvas(Math.max(this.startMouseX, endMouseX) - this.startFrameLeft),
            "bottom": this._yToCanvas(Math.max(this.startMouseY, endMouseY) - this.startFrameTop)
        };
        var overlappingNodes = this._getNodesOverlappingWith(obj);
        this._selectNodes(overlappingNodes, ctrlKey);
        this.redraw();

        // remove the selection rectangle
        if (this.frame.selRect) {
            this.frame.removeChild(this.frame.selRect);
            this.frame.selRect = undefined;
        }
    }
    else {
        if (!this.ctrlKeyDown && !this.moved) {
            // remove selection
            this._unselectNodes();
            this._redraw();
        }
    }

    this.leftButtonDown = false;
    this.ctrlKeyDown = false;
};


/**
 * Event handler for mouse wheel event, used to zoom the timeline
 * Code from http://adomas.org/javascript-mouse-wheel/
 * @param {Event}  event
 * @private
 */
Graph.prototype._onMouseWheel = function(event) {
    event = event || window.event;
    var mouseX = event.clientX;
    var mouseY = event.clientY;

    // retrieve delta
    var delta = 0;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta/120;
    } else if (event.detail) { /* Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        // Also, delta is multiple of 3.
        delta = -event.detail/3;
    }

    // If delta is nonzero, handle it.
    // Basically, delta is now positive if wheel was scrolled up,
    // and negative, if wheel was scrolled down.
    if (delta) {
        // determine zoom factor, and adjust the zoom factor such that zooming in
        // and zooming out correspond wich each other
        var zoom = delta / 10;
        if (delta < 0) {
            zoom = zoom / (1 - zoom);
        }

        var scaleOld = this._getScale();
        var scaleNew = scaleOld * (1 + zoom);
        if (scaleNew < 0.01) {
            scaleNew = 0.01;
        }
        if (scaleNew > 10) {
            scaleNew = 10;
        }

        var frameLeft = vis.util.getAbsoluteLeft(this.frame.canvas);
        var frameTop = vis.util.getAbsoluteTop(this.frame.canvas);
        var x = mouseX - frameLeft;
        var y = mouseY - frameTop;

        var translation = this._getTranslation();
        var scaleFrac = scaleNew / scaleOld;
        var tx = (1 - scaleFrac) * x + translation.x * scaleFrac;
        var ty = (1 - scaleFrac) * y + translation.y * scaleFrac;

        this._setScale(scaleNew);
        this._setTranslation(tx, ty);
        this._redraw();
    }

    // Prevent default actions caused by mouse wheel.
    // That might be ugly, but we handle scrolls somehow
    // anyway, so don't bother here...
    vis.util.preventDefault(event);
};


/**
 * Mouse move handler for checking whether the title moves over a node with a title.
 * @param  {Event} event
 * @private
 */
Graph.prototype._onMouseMoveTitle = function (event) {
    event = event || window.event;

    var startMouseX = event.clientX;
    var startMouseY = event.clientY;
    this.startFrameLeft = this.startFrameLeft || vis.util.getAbsoluteLeft(this.frame.canvas);
    this.startFrameTop = this.startFrameTop || vis.util.getAbsoluteTop(this.frame.canvas);

    var x = startMouseX - this.startFrameLeft;
    var y = startMouseY - this.startFrameTop;

    // check if the previously selected node is still selected
    if (this.popupNode) {
        this._checkHidePopup(x, y);
    }

    // start a timeout that will check if the mouse is positioned above
    // an element
    var me = this;
    var checkShow = function() {
        me._checkShowPopup(x, y);
    };
    if (this.popupTimer) {
        clearInterval(this.popupTimer); // stop any running timer
    }
    if (!this.leftButtonDown) {
        this.popupTimer = setTimeout(checkShow, 300);
    }
};

/**
 * Check if there is an element on the given position in the graph
 * (a node or edge). If so, and if this element has a title,
 * show a popup window with its title.
 *
 * @param {number} x
 * @param {number} y
 * @private
 */
Graph.prototype._checkShowPopup = function (x, y) {
    var obj = {
        "left" : this._xToCanvas(x),
        "top" : this._yToCanvas(y),
        "right" : this._xToCanvas(x),
        "bottom" : this._yToCanvas(y)
    };

    var i, len;
    var lastPopupNode = this.popupNode;

    if (this.popupNode == undefined) {
        // search the nodes for overlap, select the top one in case of multiple nodes
        var nodes = this.nodes;
        for (i = nodes.length - 1; i >= 0; i--) {
            var node = nodes[i];
            if (node.getTitle() != undefined && node.isOverlappingWith(obj)) {
                this.popupNode = node;
                break;
            }
        }
    }

    if (this.popupNode == undefined) {
        // search the edges for overlap
        var allEdges = this.edges;
        for (i = 0, len = allEdges.length; i < len; i++) {
            var edge = allEdges[i];
            if (edge.getTitle() != undefined && edge.isOverlappingWith(obj)) {
                this.popupNode = edge;
                break;
            }
        }
    }

    if (this.popupNode) {
        // show popup message window
        if (this.popupNode != lastPopupNode) {
            var me = this;
            if (!me.popup) {
                me.popup = new Popup(me.frame);
            }

            // adjust a small offset such that the mouse cursor is located in the
            // bottom left location of the popup, and you can easily move over the
            // popup area
            me.popup.setPosition(x - 3, y - 3);
            me.popup.setText(me.popupNode.getTitle());
            me.popup.show();
        }
    }
    else {
        if (this.popup) {
            this.popup.hide();
        }
    }
};

/**
 * Check if the popup must be hided, which is the case when the mouse is no
 * longer hovering on the object
 * @param {number} x
 * @param {number} y
 * @private
 */
Graph.prototype._checkHidePopup = function (x, y) {
    var obj = {
        "left" : x,
        "top" : y,
        "right" : x,
        "bottom" : y
    };

    if (!this.popupNode || !this.popupNode.isOverlappingWith(obj) ) {
        this.popupNode = undefined;
        if (this.popup) {
            this.popup.hide();
        }
    }
};

/**
 * Event handler for touchstart event on mobile devices
 * @param {Event} event
 * @private
 */
Graph.prototype._onTouchStart = function(event) {
    vis.util.preventDefault(event);

    if (this.touchDown) {
        // if already moving, return
        return;
    }
    this.touchDown = true;

    var me = this;
    if (!this.ontouchmove) {
        this.ontouchmove = function (event) {me._onTouchMove(event);};
        vis.util.addEventListener(document, "touchmove", this.ontouchmove);
    }
    if (!this.ontouchend) {
        this.ontouchend   = function (event) {me._onTouchEnd(event);};
        vis.util.addEventListener(document, "touchend", this.ontouchend);
    }

    this._onMouseDown(event);
};

/**
 * Event handler for touchmove event on mobile devices
 * @param {Event} event
 * @private
 */
Graph.prototype._onTouchMove = function(event) {
    vis.util.preventDefault(event);
    this._onMouseMove(event);
};

/**
 * Event handler for touchend event on mobile devices
 * @param {Event} event
 * @private
 */
Graph.prototype._onTouchEnd = function(event) {
    vis.util.preventDefault(event);

    this.touchDown = false;

    if (this.ontouchmove) {
        vis.util.removeEventListener(document, "touchmove", this.ontouchmove);
        this.ontouchmove = undefined;
    }
    if (this.ontouchend) {
        vis.util.removeEventListener(document, "touchend", this.ontouchend);
        this.ontouchend = undefined;
    }

    this._onMouseUp(event);
};


/**
 * Unselect selected nodes. If no selection array is provided, all nodes
 * are unselected
 * @param {Object[]} selection     Array with selection objects, each selection
 *                                 object has a parameter row. Optional
 * @param {Boolean} triggerSelect  If true (default), the select event
 *                                 is triggered when nodes are unselected
 * @return {Boolean} changed       True if the selection is changed
 * @private
 */
Graph.prototype._unselectNodes = function(selection, triggerSelect) {
    var changed = false;
    var i, iMax, row;

    if (selection) {
        // remove provided selections
        for (i = 0, iMax = selection.length; i < iMax; i++) {
            row = selection[i].row;
            this.nodes[row].unselect();

            var j = 0;
            while (j < this.selection.length) {
                if (this.selection[j].row == row) {
                    this.selection.splice(j, 1);
                    changed = true;
                }
                else {
                    j++;
                }
            }
        }
    }
    else if (this.selection && this.selection.length) {
        // remove all selections
        for (i = 0, iMax = this.selection.length; i < iMax; i++) {
            row = this.selection[i].row;
            this.nodes[row].unselect();
            changed = true;
        }
        this.selection = [];
    }

    if (changed && (triggerSelect == true || triggerSelect == undefined)) {
        // fire the select event
        this._trigger('select');
    }

    return changed;
};

/**
 * select all nodes on given location x, y
 * @param {Array} selection   an array with selection objects. Each selection
 *                            object has a parameter row
 * @param {boolean} append    If true, the new selection will be appended to the
 *                            current selection (except for duplicate entries)
 * @return {Boolean} changed  True if the selection is changed
 * @private
 */
Graph.prototype._selectNodes = function(selection, append) {
    var changed = false;
    var i, iMax;

    // TODO: the selectNodes method is a little messy, rework this

    // check if the current selection equals the desired selection
    var selectionAlreadyDone = true;
    if (selection.length != this.selection.length) {
        selectionAlreadyDone = false;
    }
    else {
        for (i = 0, iMax = Math.min(selection.length, this.selection.length); i < iMax; i++) {
            if (selection[i].row != this.selection[i].row) {
                selectionAlreadyDone = false;
                break;
            }
        }
    }
    if (selectionAlreadyDone) {
        return changed;
    }

    if (append == undefined || append == false) {
        // first deselect any selected node
        var triggerSelect = false;
        changed = this._unselectNodes(undefined, triggerSelect);
    }

    for (i = 0, iMax = selection.length; i < iMax; i++) {
        // add each of the new selections, but only when they are not duplicate
        var row = selection[i].row;
        var isDuplicate = false;
        for (var j = 0, jMax = this.selection.length; j < jMax; j++) {
            if (this.selection[j].row == row) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            this.nodes[row].select();
            this.selection.push(selection[i]);
            changed = true;
        }
    }

    if (changed) {
        // fire the select event
        this._trigger('select');
    }

    return changed;
};

/**
 * retrieve all nodes overlapping with given object
 * @param {Object} obj  An object with parameters left, top, right, bottom
 * @return {Object[]}   An array with selection objects containing
 *                      the parameter row.
 * @private
 */
Graph.prototype._getNodesOverlappingWith = function (obj) {
    var overlappingNodes = [];

    for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].isOverlappingWith(obj)) {
            var sel = {"row": i};
            overlappingNodes.push(sel);
        }
    }

    return overlappingNodes;
};

/**
 * retrieve the currently selected nodes
 * @return {Object[]} an array with zero or more objects. Each object
 *                              contains the parameter row
 */
Graph.prototype.getSelection = function() {
    var selection = [];

    for (var i = 0; i < this.selection.length; i++) {
        var row = this.selection[i].row;
        selection.push({"row": row});
    }

    return selection;
};

/**
 * select zero or more nodes
 * @param {object[]} selection  an array with zero or more objects. Each object
 *                              contains the parameter row
 */
Graph.prototype.setSelection = function(selection) {
    var i, iMax, row;

    if (selection.length == undefined)
        throw "Selection must be an array with objects";

    // first unselect any selected node
    for (i = 0, iMax = this.selection.length; i < iMax; i++) {
        row = this.selection[i].row;
        this.nodes[row].unselect();
    }

    this.selection = [];

    for (i = 0, iMax = selection.length; i < iMax; i++) {
        row = selection[i].row;

        if (row == undefined)
            throw "Parameter row missing in selection object";
        if (row > this.nodes.length-1)
            throw "Parameter row out of range";

        var sel = {"row": row};
        this.selection.push(sel);
        this.nodes[row].select();
    }

    this.redraw();
};


/**
 * Temporary method to test calculating a hub value for the nodes
 * @param {number} level        Maximum number edges between two nodes in order
 *                              to call them connected. Optional, 1 by default
 * @return {Number[]} connectioncount array with the connection count
 *                                    for each node
 * @private
 */
Graph.prototype._getConnectionCount = function(level) {
    var conn = this.edges;
    if (level == undefined) {
        level = 1;
    }

    // get the nodes connected to given nodes
    function getConnectedNodes(nodes) {
        var connectedNodes = [];

        for (var j = 0, jMax = nodes.length; j < jMax; j++) {
            var node = nodes[j];

            // find all nodes connected to this node
            for (var i = 0, iMax = conn.length; i < iMax; i++) {
                var other = null;

                // check if connected
                if (conn[i].from == node)
                    other = conn[i].to;
                else if (conn[i].to == node)
                    other = conn[i].from;

                // check if the other node is not already in the list with nodes
                var k, kMax;
                if (other) {
                    for (k = 0, kMax = nodes.length; k < kMax; k++) {
                        if (nodes[k] == other) {
                            other = null;
                            break;
                        }
                    }
                }
                if (other) {
                    for (k = 0, kMax = connectedNodes.length; k < kMax; k++) {
                        if (connectedNodes[k] == other) {
                            other = null;
                            break;
                        }
                    }
                }

                if (other)
                    connectedNodes.push(other);
            }
        }

        return connectedNodes;
    }

    var connections = [];
    var level0 = [];
    var nodes = this.nodes;
    var i, iMax;
    for (i = 0, iMax = nodes.length; i < iMax; i++) {
        var c = [nodes[i]];
        for (var l = 0; l < level; l++) {
            c = c.concat(getConnectedNodes(c));
        }
        connections.push(c);
    }

    var hubs = [];
    for (i = 0, len = connections.length; i < len; i++) {
        hubs.push(connections[i].length);
    }

    return hubs;
};


/**
 * Set a new size for the graph
 * @param {string} width   Width in pixels or percentage (for example "800px"
 *                         or "50%")
 * @param {string} height  Height in pixels or percentage  (for example "400px"
 *                         or "30%")
 */
Graph.prototype.setSize = function(width, height) {
    this.frame.style.width = width;
    this.frame.style.height = height;

    this.frame.canvas.style.width = "100%";
    this.frame.canvas.style.height = "100%";

    this.frame.canvas.width = this.frame.canvas.clientWidth;
    this.frame.canvas.height = this.frame.canvas.clientHeight;
};

/**
 * Set a data set with nodes for the graph
 * @param {Array} nodes         The data containing the nodes.
 * @private
 */
Graph.prototype._setNodes = function(nodes) {
    this.selection = [];
    this.nodes = [];
    this.moving = false;
    if (!nodes) {
        return;
    }

    var hasValues = false;
    var rowCount = nodes.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = nodes[i];

        if (properties.value != undefined) {
            hasValues = true;
        }
        if (properties.id == undefined) {
            throw "Column 'id' missing in table with nodes (row " + i + ")";
        }
        this._createNode(properties);
    }

    // calculate scaling function when value is provided
    if (hasValues) {
        this._updateValueRange(this.nodes);
    }

    // give the nodes some first (random) position
    this._reposition(); // TODO: bad solution
};

/**
 * Create a node with the given properties
 * If the new node has an id identical to an existing node, the existing
 * node will be overwritten.
 * The properties can contain a property "action", which can have values
 * "create", "update", or "delete"
 * @param {Object} properties  An object with properties
 * @private
 */
Graph.prototype._createNode = function(properties) {
    var action = properties.action ? properties.action : "update";
    var id, index, newNode, oldNode;

    if (action === "create") {
        // create the node
        newNode = new Node(properties, this.images, this.groups, this.constants);
        id = properties.id;
        index = (id !== undefined) ? this._findNode(id) : undefined;

        if (index !== undefined) {
            // replace node
            oldNode = this.nodes[index];
            this.nodes[index] = newNode;

            // remove selection of old node
            if (oldNode.selected) {
                this._unselectNodes([{'row': index}], false);
            }

            /* TODO: implement this? -> will give performance issues, searching all edges and nodes...
             // update edges linking to this node
             var edgesTable = this.edges;
             for (var i = 0, iMax = edgesTable.length; i < iMax; i++) {
             var edge = edgesTable[i];
             if (edge.from == oldNode) {
             edge.from = newNode;
             }
             if (edge.to == oldNode) {
             edge.to = newNode;
             }
             }
             */
        }
        else {
            // add new node
            this.nodes.push(newNode);
        }

        if (!newNode.isFixed()) {
            // note: no not use node.isMoving() here, as that gives the current
            // velocity of the node, which is zero after creation of the node.
            this.moving = true;
        }
    }
    else if (action === "update") {
        // update existing node, or create it when not yet existing
        id = properties.id;
        if (id === undefined) {
            throw "Cannot update a node without id";
        }

        index = this._findNode(id);
        if (index !== undefined) {
            // update node
            this.nodes[index].setProperties(properties, this.constants);
        }
        else {
            // create node
            newNode = new Node(properties, this.images, this.groups, this.constants);
            this.nodes.push(newNode);

            if (!newNode.isFixed()) {
                // note: no not use node.isMoving() here, as that gives the current
                // velocity of the node, which is zero after creation of the node.
                this.moving = true;
            }
        }
    }
    else if (action === "delete") {
        // delete existing node
        id = properties.id;
        if (id === undefined) {
            throw "Cannot delete node without its id";
        }

        index = this._findNode(id);
        if (index !== undefined) {
            oldNode = this.nodes[index];
            // remove selection of old node
            if (oldNode.selected) {
                this._unselectNodes([{'row': index}], false);
            }
            this.nodes.splice(index, 1);
        }
        else {
            throw "Node with id " + id + " not found";
        }
    }
    else {
        throw "Unknown action " + action + ". Choose 'create', 'update', or 'delete'.";
    }
};

/**
 * Find a node by its id
 * @param {Number} id                   Id of the node
 * @return {Number | undefined} index   Index of the node in the array
 *                                      this.nodes, or undefined when not found
 * @private
 */
Graph.prototype._findNode = function (id) {
    var nodes = this.nodes;
    for (var n = 0, len = nodes.length; n < len; n++) {
        if (nodes[n].id === id) {
            return n;
        }
    }

    return undefined;
};

/**
 * Find a node by its rowNumber
 * @param {Number} row                   Row number of the node
 * @return {Node} node     The node with the given row number, or
 *                                       undefined when not found.
 * @private
 */
Graph.prototype._findNodeByRow = function (row) {
    return this.nodes[row];
};

/**
 * Load edges by reading the data table
 * @param {Array}      edges    The data containing the edges.
 * @private
 * @private
 */
Graph.prototype._setEdges = function(edges) {
    this.edges = [];
    if (!edges) {
        return;
    }

    var hasValues = false;
    var rowCount = edges.length;
    for (var i = 0; i < rowCount; i++) {
        var properties = edges[i];

        if (properties.from === undefined) {
            throw "Column 'from' missing in table with edges (row " + i + ")";
        }
        if (properties.to === undefined) {
            throw "Column 'to' missing in table with edges (row " + i + ")";
        }
        if (properties.value != undefined) {
            hasValues = true;
        }

        this._createEdge(properties);
    }

    // calculate scaling function when value is provided
    if (hasValues) {
        this._updateValueRange(this.edges);
    }
};

/**
 * Create a edge with the given properties
 * If the new edge has an id identical to an existing edge, the existing
 * edge will be overwritten or updated.
 * The properties can contain a property "action", which can have values
 * "create", "update", or "delete"
 * @param {Object} properties   An object with properties
 * @private
 */
Graph.prototype._createEdge = function(properties) {
    var action = properties.action ? properties.action : "create";
    var id, index, edge, oldEdge, newEdge;

    if (action === "create") {
        // create the edge, or replace it if already existing
        id = properties.id;
        index = (id !== undefined) ? this._findEdge(id) : undefined;
        edge = new Edge(properties, this, this.constants);

        if (index !== undefined) {
            // replace existing edge
            oldEdge = this.edges[index];
            oldEdge.from.detachEdge(oldEdge);
            oldEdge.to.detachEdge(oldEdge);
            this.edges[index] = edge;
        }
        else {
            // add new edge
            this.edges.push(edge);
        }
        edge.from.attachEdge(edge);
        edge.to.attachEdge(edge);
    }
    else if (action === "update") {
        // update existing edge, or create the edge if not existing
        id = properties.id;
        if (id === undefined) {
            throw "Cannot update a edge without id";
        }

        index = this._findEdge(id);
        if (index !== undefined) {
            // update edge
            edge = this.edges[index];
            edge.from.detachEdge(edge);
            edge.to.detachEdge(edge);

            edge.setProperties(properties, this.constants);
            edge.from.attachEdge(edge);
            edge.to.attachEdge(edge);
        }
        else {
            // add new edge
            edge = new Edge(properties, this, this.constants);
            edge.from.attachEdge(edge);
            edge.to.attachEdge(edge);
            this.edges.push(edge);
        }
    }
    else if (action === "delete") {
        // delete existing edge
        id = properties.id;
        if (id === undefined) {
            throw "Cannot delete edge without its id";
        }

        index = this._findEdge(id);
        if (index !== undefined) {
            oldEdge = this.edges[id];
            edge.from.detachEdge(oldEdge);
            edge.to.detachEdge(oldEdge);
            this.edges.splice(index, 1);
        }
        else {
            throw "Edge with id " + id + " not found";
        }
    }
    else {
        throw "Unknown action " + action + ". Choose 'create', 'update', or 'delete'.";
    }
};

/**
 * Update the references to oldNode in all edges.
 * @param {Node} oldNode
 * @param {Node} newNode
 * @private
 */
// TODO: start utilizing this method _updateNodeReferences
Graph.prototype._updateNodeReferences = function(oldNode, newNode) {
    var edges = this.edges;
    for (var i = 0, iMax = edges.length; i < iMax; i++) {
        var edge = edges[i];
        if (edge.from === oldNode) {
            edge.from = newNode;
        }
        if (edge.to === oldNode) {
            edge.to = newNode;
        }
    }
};

/**
 * Find a edge by its id
 * @param {Number} id                   Id of the edge
 * @return {Number | undefined} index   Index of the edge in the array
 *                                      this.edges, or undefined when not found
 * @private
 */
Graph.prototype._findEdge = function (id) {
    var edges = this.edges;
    for (var n = 0, len = edges.length; n < len; n++) {
        if (edges[n].id === id) {
            return n;
        }
    }

    return undefined;
};

/**
 * Find a edge by its row
 * @param {Number} row          Row of the edge
 * @return {Edge | undefined} the found edge, or undefined when not found
 * @private
 */
Graph.prototype._findEdgeByRow = function (row) {
    return this.edges[row];
};

/**
 * Update the values of all object in the given array according to the current
 * value range of the objects in the array.
 * @param {Array} array.  An array with objects like Edges or Nodes
 *                        The objects must have a method getValue() and
 *                        setValueRange(min, max).
 * @private
 */
Graph.prototype._updateValueRange = function(array) {
    var count = array.length;
    var i;

    // determine the range of the node values
    var valueMin = undefined;
    var valueMax = undefined;
    for (i = 0; i < count; i++) {
        var value = array[i].getValue();
        if (value !== undefined) {
            valueMin = (valueMin === undefined) ? value : Math.min(value, valueMin);
            valueMax = (valueMax === undefined) ? value : Math.max(value, valueMax);
        }
    }

    // adjust the range of all nodes
    if (valueMin !== undefined && valueMax !== undefined) {
        for (i = 0; i < count; i++) {
            array[i].setValueRange(valueMin, valueMax);
        }
    }
};

/**
 * Redraw the graph with the current data
 * chart will be resized too.
 */
Graph.prototype.redraw = function() {
    this.setSize(this.width, this.height);

    this._redraw();
};

/**
 * Redraw the graph with the current data
 * @private
 */
Graph.prototype._redraw = function() {
    var ctx = this.frame.canvas.getContext("2d");

    // clear the canvas
    var w = this.frame.canvas.width;
    var h = this.frame.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // set scaling and translation
    ctx.save();
    ctx.translate(this.translation.x, this.translation.y);
    ctx.scale(this.scale, this.scale);

    this._drawEdges(ctx);
    this._drawNodes(ctx);

    // restore original scaling and translation
    ctx.restore();
};

/**
 * Set the translation of the graph
 * @param {Number} offsetX    Horizontal offset
 * @param {Number} offsetY    Vertical offset
 * @private
 */
Graph.prototype._setTranslation = function(offsetX, offsetY) {
    if (this.translation === undefined) {
        this.translation = {
            "x": 0,
            "y": 0
        };
    }

    if (offsetX !== undefined) {
        this.translation.x = offsetX;
    }
    if (offsetY !== undefined) {
        this.translation.y = offsetY;
    }
};

/**
 * Get the translation of the graph
 * @return {Object} translation    An object with parameters x and y, both a number
 * @private
 */
Graph.prototype._getTranslation = function() {
    return {
        "x": this.translation.x,
        "y": this.translation.y
    };
};

/**
 * Scale the graph
 * @param {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Graph.prototype._setScale = function(scale) {
    this.scale = scale;
};
/**
 * Get the current scale of  the graph
 * @return {Number} scale   Scaling factor 1.0 is unscaled
 * @private
 */
Graph.prototype._getScale = function() {
    return this.scale;
};

Graph.prototype._xToCanvas = function(x) {
    return (x - this.translation.x) / this.scale;
};

Graph.prototype._canvasToX = function(x) {
    return x * this.scale + this.translation.x;
};

Graph.prototype._yToCanvas = function(y) {
    return (y - this.translation.y) / this.scale;
};

Graph.prototype._canvasToY = function(y) {
    return y * this.scale + this.translation.y ;
};



/**
 * Get a node by its id
 * @param {number} id
 * @return {Node}  node, or null if not found
 * @private
 */
Graph.prototype._getNode = function(id) {
    for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].id == id)
            return this.nodes[i];
    }

    return null;
};

/**
 * Redraw all nodes
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawNodes = function(ctx) {
    // first draw the unselected nodes
    var nodes = this.nodes;
    var selected = [];
    for (var i = 0, iMax = nodes.length; i < iMax; i++) {
        if (nodes[i].isSelected()) {
            selected.push(i);
        }
        else {
            nodes[i].draw(ctx);
        }
    }

    // draw the selected nodes on top
    for (var s = 0, sMax = selected.length; s < sMax; s++) {
        nodes[selected[s]].draw(ctx);
    }
};

/**
 * Redraw all edges
 * The 2d context of a HTML canvas can be retrieved by canvas.getContext("2d");
 * @param {CanvasRenderingContext2D}   ctx
 * @private
 */
Graph.prototype._drawEdges = function(ctx) {
    var edges = this.edges;
    for (var i = 0, iMax = edges.length; i < iMax; i++) {
        edges[i].draw(ctx);
    }
};

/**
 * Recalculate the best positions for all nodes
 * @private
 */
Graph.prototype._reposition = function() {
    // TODO: implement function reposition


    /*
     var w = this.frame.canvas.clientWidth;
     var h = this.frame.canvas.clientHeight;
     for (var i = 0; i < this.nodes.length; i++) {
     if (!this.nodes[i].xFixed) this.nodes[i].x = w * Math.random();
     if (!this.nodes[i].yFixed) this.nodes[i].y = h * Math.random();
     }
     //*/

    //*
    // TODO
    var radius = this.constants.edges.length * 2;
    var cx =  this.frame.canvas.clientWidth / 2;
    var cy =  this.frame.canvas.clientHeight / 2;
    for (var i = 0; i < this.nodes.length; i++) {
        var angle = 2*Math.PI * (i / this.nodes.length);

        if (!this.nodes[i].xFixed) this.nodes[i].x = cx + radius * Math.cos(angle);
        if (!this.nodes[i].yFixed) this.nodes[i].y = cy + radius * Math.sin(angle);

    }
    //*/

    /*
     // TODO
     var radius = this.constants.edges.length * 2;
     var w = this.frame.canvas.clientWidth,
     h = this.frame.canvas.clientHeight;
     var cx =  this.frame.canvas.clientWidth / 2;
     var cy =  this.frame.canvas.clientHeight / 2;
     var s = Math.sqrt(this.nodes.length);
     for (var i = 0; i < this.nodes.length; i++) {
     //var angle = 2*Math.PI * (i / this.nodes.length);

     if (!this.nodes[i].xFixed) this.nodes[i].x = w/s * (i % s);
     if (!this.nodes[i].yFixed) this.nodes[i].y = h/s * (i / s);
     }
     //*/


    /*
     var cx =  this.frame.canvas.clientWidth / 2;
     var cy =  this.frame.canvas.clientHeight / 2;
     for (var i = 0; i < this.nodes.length; i++) {
     this.nodes[i].x = cx;
     this.nodes[i].y = cy;
     }

     //*/

};


/**
 * Find a stable position for all nodes
 * @private
 */
Graph.prototype._doStabilize = function() {
    var start = new Date();

    // find stable position
    var count = 0;
    var vmin = this.constants.minVelocity;
    var stable = false;
    while (!stable && count < this.constants.maxIterations) {
        this._calculateForces();
        this._discreteStepNodes();
        stable = !this._isMoving(vmin);
        count++;
    }

    var end = new Date();

    // console.log("Stabilized in " + (end-start) + " ms, " + count + " iterations" ); // TODO: cleanup
};

/**
 * Calculate the external forces acting on the nodes
 * Forces are caused by: edges, repulsing forces between nodes, gravity
 * @private
 */
Graph.prototype._calculateForces = function() {
    // create a local edge to the nodes and edges, that is faster
    var nodes = this.nodes,
        edges = this.edges;

    // gravity, add a small constant force to pull the nodes towards the center of
    // the graph
    // Also, the forces are reset to zero in this loop by using _setForce instead
    // of _addForce
    var gravity = 0.01,
        gx = this.frame.canvas.clientWidth / 2,
        gy = this.frame.canvas.clientHeight / 2;
    for (var n = 0; n < nodes.length; n++) {
        var dx = gx - nodes[n].x,
            dy = gy - nodes[n].y,
            angle = Math.atan2(dy, dx),
            fx = Math.cos(angle) * gravity,
            fy = Math.sin(angle) * gravity;

        this.nodes[n]._setForce(fx, fy);
    }

    // repulsing forces between nodes
    var minimumDistance = this.constants.nodes.distance,
        steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance
    for (var n = 0; n < nodes.length; n++) {
        for (var n2 = n + 1; n2 < this.nodes.length; n2++) {
            //var dmin = (nodes[n].width + nodes[n].height + nodes[n2].width + nodes[n2].height) / 1 || minimumDistance, // TODO: dmin
            //var dmin = (nodes[n].width + nodes[n2].width)/2  || minimumDistance, // TODO: dmin
            //dmin = 40 + ((nodes[n].width/2 + nodes[n2].width/2) || 0),

            // calculate normally distributed force
            var dx = nodes[n2].x - nodes[n].x,
                dy = nodes[n2].y - nodes[n].y,
                distance = Math.sqrt(dx * dx + dy * dy),
                angle = Math.atan2(dy, dx),

            // TODO: correct factor for repulsing force
            //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
            //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
                repulsingforce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)), // TODO: customize the repulsing force
                fx = Math.cos(angle) * repulsingforce,
                fy = Math.sin(angle) * repulsingforce;

            this.nodes[n]._addForce(-fx, -fy);
            this.nodes[n2]._addForce(fx, fy);
        }
        /* TODO: re-implement repulsion of edges
         for (var l = 0; l < edges.length; l++) {
         var lx = edges[l].from.x+(edges[l].to.x - edges[l].from.x)/2,
         ly = edges[l].from.y+(edges[l].to.y - edges[l].from.y)/2,

         // calculate normally distributed force
         dx = nodes[n].x - lx,
         dy = nodes[n].y - ly,
         distance = Math.sqrt(dx * dx + dy * dy),
         angle = Math.atan2(dy, dx),


         // TODO: correct factor for repulsing force
         //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
         //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
         repulsingforce = 1 / (1 + Math.exp((distance / (minimumDistance / 2) - 1) * steepness)), // TODO: customize the repulsing force
         fx = Math.cos(angle) * repulsingforce,
         fy = Math.sin(angle) * repulsingforce;
         nodes[n]._addForce(fx, fy);
         edges[l].from._addForce(-fx/2,-fy/2);
         edges[l].to._addForce(-fx/2,-fy/2);
         }
         */
    }

    // forces caused by the edges, modelled as springs
    for (var l = 0, lMax = edges.length; l < lMax; l++) {
        var edge = edges[l],

            dx = (edge.to.x - edge.from.x),
            dy = (edge.to.y - edge.from.y),
        //edgeLength = (edge.from.width + edge.from.height + edge.to.width + edge.to.height)/2 || edge.length, // TODO: dmin
        //edgeLength = (edge.from.width + edge.to.width)/2 || edge.length, // TODO: dmin
        //edgeLength = 20 + ((edge.from.width + edge.to.width) || 0) / 2,
            edgeLength = edge.length,
            length =  Math.sqrt(dx * dx + dy * dy),
            angle = Math.atan2(dy, dx),

            springforce = edge.stiffness * (edgeLength - length),

            fx = Math.cos(angle) * springforce,
            fy = Math.sin(angle) * springforce;

        edge.from._addForce(-fx, -fy);
        edge.to._addForce(fx, fy);
    }

    /* TODO: re-implement repulsion of edges
     // repulsing forces between edges
     var minimumDistance = this.constants.edges.distance,
     steepness = 10; // higher value gives steeper slope of the force around the given minimumDistance
     for (var l = 0; l < edges.length; l++) {
     //Keep distance from other edge centers
     for (var l2 = l + 1; l2 < this.edges.length; l2++) {
     //var dmin = (nodes[n].width + nodes[n].height + nodes[n2].width + nodes[n2].height) / 1 || minimumDistance, // TODO: dmin
     //var dmin = (nodes[n].width + nodes[n2].width)/2  || minimumDistance, // TODO: dmin
     //dmin = 40 + ((nodes[n].width/2 + nodes[n2].width/2) || 0),
     var lx = edges[l].from.x+(edges[l].to.x - edges[l].from.x)/2,
     ly = edges[l].from.y+(edges[l].to.y - edges[l].from.y)/2,
     l2x = edges[l2].from.x+(edges[l2].to.x - edges[l2].from.x)/2,
     l2y = edges[l2].from.y+(edges[l2].to.y - edges[l2].from.y)/2,

     // calculate normally distributed force
     dx = l2x - lx,
     dy = l2y - ly,
     distance = Math.sqrt(dx * dx + dy * dy),
     angle = Math.atan2(dy, dx),


     // TODO: correct factor for repulsing force
     //var repulsingforce = 2 * Math.exp(-5 * (distance * distance) / (dmin * dmin) ); // TODO: customize the repulsing force
     //repulsingforce = Math.exp(-1 * (distance * distance) / (dmin * dmin) ), // TODO: customize the repulsing force
     repulsingforce = 1 / (1 + Math.exp((distance / minimumDistance - 1) * steepness)), // TODO: customize the repulsing force
     fx = Math.cos(angle) * repulsingforce,
     fy = Math.sin(angle) * repulsingforce;

     edges[l].from._addForce(-fx, -fy);
     edges[l].to._addForce(-fx, -fy);
     edges[l2].from._addForce(fx, fy);
     edges[l2].to._addForce(fx, fy);
     }
     }
     */
};


/**
 * Check if any of the nodes is still moving
 * @param {number} vmin   the minimum velocity considered as "moving"
 * @return {boolean}      true if moving, false if non of the nodes is moving
 * @private
 */
Graph.prototype._isMoving = function(vmin) {
    // TODO: ismoving does not work well: should check the kinetic energy, not its velocity
    var nodes = this.nodes;
    for (var n = 0, nMax = nodes.length; n < nMax; n++) {
        if (nodes[n].isMoving(vmin)) {
            return true;
        }
    }
    return false;
};


/**
 * Perform one discrete step for all nodes
 * @private
 */
Graph.prototype._discreteStepNodes = function() {
    var interval = this.refreshRate / 1000.0; // in seconds
    var nodes = this.nodes;
    for (var n = 0, nMax = nodes.length; n < nMax; n++) {
        nodes[n].discreteStep(interval);
    }
};

/**
 * Start animating nodes and edges
 */
Graph.prototype.start = function() {
    if (this.moving) {
        this._calculateForces();
        this._discreteStepNodes();

        var vmin = this.constants.minVelocity;
        this.moving = this._isMoving(vmin);
    }

    if (this.moving) {
        // start animation. only start timer if it is not already running
        if (!this.timer) {
            var graph = this;
            this.timer = window.setTimeout(function () {
                graph.timer = undefined;
                graph.start();
                graph._redraw();
            }, this.refreshRate);
        }
    }
    else {
        this._redraw();
    }
};

/**
 * Stop animating nodes and edges.
 */
Graph.prototype.stop = function () {
    if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = undefined;
    }
};

/**
 * vis.js module exports
 */
var vis = {
    util: util,
    events: events,

    Controller: Controller,
    DataSet: DataSet,
    DataView: DataView,
    Range: Range,
    Stack: Stack,
    TimeStep: TimeStep,
    EventBus: EventBus,

    components: {
        items: {
            Item: Item,
            ItemBox: ItemBox,
            ItemPoint: ItemPoint,
            ItemRange: ItemRange
        },

        Component: Component,
        Panel: Panel,
        RootPanel: RootPanel,
        ItemSet: ItemSet,
        TimeAxis: TimeAxis
    },

    graph: {
        Node: Node,
        Edge: Edge,
        Popup: Popup,
        Groups: Groups,
        Images: Images
    },

    Timeline: Timeline,
    Graph: Graph
};

/**
 * CommonJS module exports
 */
if (typeof exports !== 'undefined') {
    exports = vis;
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = vis;
}

/**
 * AMD module exports
 */
if (typeof(define) === 'function') {
    define(function () {
        return vis;
    });
}

/**
 * Window exports
 */
if (typeof window !== 'undefined') {
    // attach the module to the window, load as a regular javascript file
    window['vis'] = vis;
}

// inject css
util.loadCss("/* vis.js stylesheet */\n\n.graph {\n    position: relative;\n    border: 1px solid #bfbfbf;\n}\n\n.graph .panel {\n    position: absolute;\n}\n\n.graph .groupset {\n    position: absolute;\n    padding: 0;\n    margin: 0;\n}\n\n\n.graph .itemset {\n    position: absolute;\n    padding: 0;\n    margin: 0;\n    overflow: hidden;\n}\n\n.graph .background {\n}\n\n.graph .foreground {\n}\n\n.graph .itemset-axis {\n    position: absolute;\n}\n\n.graph .groupset .itemset-axis {\n    border-top: 1px solid #bfbfbf;\n}\n\n/* TODO: with orientation=='bottom', this will more or less overlap with timeline axis\n.graph .groupset .itemset-axis:last-child {\n    border-top: none;\n}\n*/\n\n\n.graph .item {\n    position: absolute;\n    color: #1A1A1A;\n    border-color: #97B0F8;\n    background-color: #D5DDF6;\n    display: inline-block;\n}\n\n.graph .item.selected {\n    border-color: #FFC200;\n    background-color: #FFF785;\n    z-index: 999;\n}\n\n.graph .item.cluster {\n    /* TODO: use another color or pattern? */\n    background: #97B0F8 url('img/cluster_bg.png');\n    color: white;\n}\n.graph .item.cluster.point {\n    border-color: #D5DDF6;\n}\n\n.graph .item.box {\n    text-align: center;\n    border-style: solid;\n    border-width: 1px;\n    border-radius: 5px;\n    -moz-border-radius: 5px; /* For Firefox 3.6 and older */\n}\n\n.graph .item.point {\n    background: none;\n}\n\n.graph .dot {\n    border: 5px solid #97B0F8;\n    position: absolute;\n    border-radius: 5px;\n    -moz-border-radius: 5px;  /* For Firefox 3.6 and older */\n}\n\n.graph .item.range {\n    border-style: solid;\n    border-width: 1px;\n    border-radius: 2px;\n    -moz-border-radius: 2px;  /* For Firefox 3.6 and older */\n}\n\n.graph .item.range .drag-left {\n    cursor: w-resize;\n    z-index: 1000;\n}\n\n.graph .item.range .drag-right {\n    cursor: e-resize;\n    z-index: 1000;\n}\n\n.graph .item.range .content {\n    position: relative;\n    display: inline-block;\n}\n\n.graph .item.line {\n    position: absolute;\n    width: 0;\n    border-left-width: 1px;\n    border-left-style: solid;\n}\n\n.graph .item .content {\n    margin: 5px;\n    white-space: nowrap;\n    overflow: hidden;\n}\n\n/* TODO: better css name, 'graph' is way to generic */\n\n.graph {\n    overflow: hidden;\n}\n\n.graph .axis {\n    position: relative;\n}\n\n.graph .axis .text {\n    position: absolute;\n    color: #4d4d4d;\n    padding: 3px;\n    white-space: nowrap;\n}\n\n.graph .axis .text.measure {\n    position: absolute;\n    padding-left: 0;\n    padding-right: 0;\n    margin-left: 0;\n    margin-right: 0;\n    visibility: hidden;\n}\n\n.graph .axis .grid.vertical {\n    position: absolute;\n    width: 0;\n    border-right: 1px solid;\n}\n\n.graph .axis .grid.horizontal {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 0;\n    border-bottom: 1px solid;\n}\n\n.graph .axis .grid.minor {\n    border-color: #e5e5e5;\n}\n\n.graph .axis .grid.major {\n    border-color: #bfbfbf;\n}\n\n");

})()
},{"moment":2}],2:[function(require,module,exports){
(function(){// moment.js
// version : 2.0.0
// author : Tim Wood
// license : MIT
// momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.0.0",
        round = Math.round, i,
        // internal storage for language config files
        languages = {},

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|a|A|hh?|HH?|mm?|ss?|SS?S?|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing tokens
        parseMultipleFormatChunker = /([0-9a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)/gi,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenWord = /[0-9]*[a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF]+\s*?[\u0600-\u06FF]+/i, // any word (or two) characters or numbers including two word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/i, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO seperator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        // preliminary iso regex
        // 0000-00-00 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000
        isoRegex = /^\s*\d{4}-\d\d-\d\d((T| )(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/,
        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.S', /(T| )\d\d:\d\d:\d\d\.\d{1,3}/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Month|Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return ~~(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(~~(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(~~(a / 60), 2) + ":" + leftZeroFill(~~a % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(~~(10 * a / 6), 4);
            },
            X    : function () {
                return this.unix();
            }
        };

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a));
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i]);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var data = this._data = {},
            years = duration.years || duration.year || duration.y || 0,
            months = duration.months || duration.month || duration.M || 0,
            weeks = duration.weeks || duration.week || duration.w || 0,
            days = duration.days || duration.day || duration.d || 0,
            hours = duration.hours || duration.hour || duration.h || 0,
            minutes = duration.minutes || duration.minute || duration.m || 0,
            seconds = duration.seconds || duration.second || duration.s || 0,
            milliseconds = duration.milliseconds || duration.millisecond || duration.ms || 0;

        // representation for dateAddRemove
        this._milliseconds = milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = months +
            years * 12;

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;
        seconds += absRound(milliseconds / 1000);

        data.seconds = seconds % 60;
        minutes += absRound(seconds / 60);

        data.minutes = minutes % 60;
        hours += absRound(minutes / 60);

        data.hours = hours % 24;
        days += absRound(hours / 24);

        days += weeks * 7;
        data.days = days % 30;

        months += absRound(days / 30);

        data.months = months % 12;
        years += absRound(months / 12);

        data.years = years;
    }


    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }
        return a;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength) {
        var output = number + '';
        while (output.length < targetLength) {
            output = '0' + output;
        }
        return output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding) {
        var ms = duration._milliseconds,
            d = duration._days,
            M = duration._months,
            currentDate;

        if (ms) {
            mom._d.setTime(+mom + ms * isAdding);
        }
        if (d) {
            mom.date(mom.date() + d * isAdding);
        }
        if (M) {
            currentDate = mom.date();
            mom.date(1)
                .month(mom.month() + M * isAdding)
                .date(Math.min(currentDate, mom.daysInMonth()));
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if (~~array1[i] !== ~~array2[i]) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }


    /************************************
        Languages
    ************************************/


    Language.prototype = {
        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex, output;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy);
        },
        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        }
    };

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        if (!key) {
            return moment.fn._lang;
        }
        if (!languages[key] && hasModule) {
            require('./lang/' + key);
        }
        return languages[key];
    }


    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[.*\]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += typeof array[i].call === 'function' ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return m.lang().longDateFormat(input) || input;
        }

        while (i-- && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        }

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token) {
        switch (token) {
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
            return parseTokenFourDigits;
        case 'YYYYY':
            return parseTokenSixDigits;
        case 'S':
        case 'SS':
        case 'SSS':
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'a':
        case 'A':
            return parseTokenWord;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
            return parseTokenOneOrTwoDigits;
        default :
            return new RegExp(token.replace('\\', ''));
        }
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, b,
            datePartArray = config._a;

        switch (token) {
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            datePartArray[1] = (input == null) ? 0 : ~~input - 1;
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[1] = a;
            } else {
                config._isValid = false;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DDDD
        case 'DD' : // fall through to DDDD
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                datePartArray[2] = ~~input;
            }
            break;
        // YEAR
        case 'YY' :
            datePartArray[0] = ~~input + (~~input > 68 ? 1900 : 2000);
            break;
        case 'YYYY' :
        case 'YYYYY' :
            datePartArray[0] = ~~input;
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = ((input + '').toLowerCase() === 'pm');
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[3] = ~~input;
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[4] = ~~input;
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[5] = ~~input;
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
            datePartArray[6] = ~~ (('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            a = (input + '').match(parseTimezoneChunker);
            if (a && a[1]) {
                config._tzh = ~~a[1];
            }
            if (a && a[2]) {
                config._tzm = ~~a[2];
            }
            // reverse offsets
            if (a && a[0] === '+') {
                config._tzh = -config._tzh;
                config._tzm = -config._tzm;
            }
            break;
        }

        // if the input is null, the date is not valid
        if (input == null) {
            config._isValid = false;
        }
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromArray(config) {
        var i, date, input = [];

        if (config._d) {
            return;
        }

        for (i = 0; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // add the offsets to the time to be parsed so that we can have a clean array for checking isValid
        input[3] += config._tzh || 0;
        input[4] += config._tzm || 0;

        date = new Date(0);

        if (config._useUTC) {
            date.setUTCFullYear(input[0], input[1], input[2]);
            date.setUTCHours(input[3], input[4], input[5], input[6]);
        } else {
            date.setFullYear(input[0], input[1], input[2]);
            date.setHours(input[3], input[4], input[5], input[6]);
        }

        config._d = date;
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var tokens = config._f.match(formattingTokens),
            string = config._i,
            i, parsedInput;

        config._a = [];

        for (i = 0; i < tokens.length; i++) {
            parsedInput = (getParseRegexForToken(tokens[i]).exec(string) || [])[0];
            if (parsedInput) {
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
            }
            // don't parse if its not a known token
            if (formatTokenFunctions[tokens[i]]) {
                addTimeToArrayFromToken(tokens[i], parsedInput, config);
            }
        }
        // handle am pm
        if (config._isPm && config._a[3] < 12) {
            config._a[3] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[3] === 12) {
            config._a[3] = 0;
        }
        // return
        dateFromArray(config);
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            tempMoment,
            bestMoment,

            scoreToBeat = 99,
            i,
            currentDate,
            currentScore;

        while (config._f.length) {
            tempConfig = extend({}, config);
            tempConfig._f = config._f.pop();
            makeDateFromStringAndFormat(tempConfig);
            tempMoment = new Moment(tempConfig);

            if (tempMoment.isValid()) {
                bestMoment = tempMoment;
                break;
            }

            currentScore = compareArrays(tempConfig._a, tempMoment.toArray());

            if (currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempMoment;
            }
        }

        extend(config, bestMoment);
    }

    // date from iso format
    function makeDateFromString(config) {
        var i,
            string = config._i;
        if (isoRegex.exec(string)) {
            config._f = 'YYYY-MM-DDT';
            for (i = 0; i < 4; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (parseTokenTimezone.exec(string)) {
                config._f += " Z";
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._d = new Date(string);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromArray(config);
        } else {
            config._d = input instanceof Date ? new Date(+input) : new Date(input);
        }
    }


    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day();


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        return Math.ceil(moment(mom).add('d', daysToDayOfWeek).dayOfYear() / 7);
    }


    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || input === '') {
            return null;
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = extend({}, input);
            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang) {
        return makeMoment({
            _i : input,
            _f : format,
            _l : lang,
            _isUTC : false
        });
    };

    // creating with utc
    moment.utc = function (input, format, lang) {
        return makeMoment({
            _useUTC : true,
            _isUTC : true,
            _l : lang,
            _i : input,
            _f : format
        });
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var isDuration = moment.isDuration(input),
            isNumber = (typeof input === 'number'),
            duration = (isDuration ? input._data : (isNumber ? {} : input)),
            ret;

        if (isNumber) {
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        }

        ret = new Duration(duration);

        if (isDuration && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var i;

        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(key, values);
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment;
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };


    /************************************
        Moment Prototype
    ************************************/


    moment.fn = Moment.prototype = {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d;
        },

        unix : function () {
            return Math.floor(+this._d / 1000);
        },

        toString : function () {
            return this.format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._d;
        },

        toJSON : function () {
            return moment.utc(this).format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            if (this._isValid == null) {
                if (this._a) {
                    this._isValid = !compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray());
                } else {
                    this._isValid = !isNaN(this._d.getTime());
                }
            }
            return !!this._isValid;
        },

        utc : function () {
            this._isUTC = true;
            return this;
        },

        local : function () {
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = this._isUTC ? moment(input).utc() : moment(input).local(),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            if (units) {
                // standardize on singular form
                units = units.replace(/s$/, '');
            }

            if (units === 'year' || units === 'month') {
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                output += ((this - moment(this).startOf('month')) - (that - moment(that).startOf('month'))) / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that) - zoneDiff;
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? diff / 864e5 : // 1000 * 60 * 60 * 24
                    units === 'week' ? diff / 6048e5 : // 1000 * 60 * 60 * 24 * 7
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            var diff = this.diff(moment().startOf('day'), 'days', true),
                format = diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            var year = this.year();
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        },

        isDST : function () {
            return (this.zone() < moment([this.year()]).zone() ||
                this.zone() < moment([this.year(), 5]).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            return input == null ? day :
                this.add({ d : input - day });
        },

        startOf: function (units) {
            units = units.replace(/s$/, '');
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.day(0);
            }

            return this;
        },

        endOf: function (units) {
            return this.startOf(units).add(units.replace(/s?$/, 's'), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) === +moment(input).startOf(units);
        },

        zone : function () {
            return this._isUTC ? 0 : this._d.getTimezoneOffset();
        },

        daysInMonth : function () {
            return moment.utc([this.year(), this.month() + 1, 0]).date();
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    };

    // helper for adding shortcuts
    function makeGetterAndSetter(name, key) {
        moment.fn[name] = moment.fn[name + 's'] = function (input) {
            var utc = this._isUTC ? 'UTC' : '';
            if (input != null) {
                this._d['set' + utc + key](input);
                return this;
            } else {
                return this._d['get' + utc + key]();
            }
        };
    }

    // loop through and add shortcuts (Month, Date, Hours, Minutes, Seconds, Milliseconds)
    for (i = 0; i < proxyGettersAndSetters.length; i ++) {
        makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase().replace(/s$/, ''), proxyGettersAndSetters[i]);
    }

    // add shortcut for year (uses different syntax than the getter/setter 'year' == 'FullYear')
    makeGetterAndSetter('year', 'FullYear');

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;

    /************************************
        Duration Prototype
    ************************************/


    moment.duration.fn = Duration.prototype = {
        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              this._months * 2592e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        lang : moment.fn.lang
    };

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (~~ (number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });


    /************************************
        Exposing Moment
    ************************************/


    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    }
    /*global ender:false */
    if (typeof ender === 'undefined') {
        // here, `this` means `window` in the browser, or `global` on the server
        // add `moment` as a global object via a string identifier,
        // for Closure Compiler "advanced" mode
        this['moment'] = moment;
    }
    /*global define:false */
    if (typeof define === "function" && define.amd) {
        define("moment", [], function () {
            return moment;
        });
    }
}).call(this);

})()
},{}]},{},[1])(1)
});
;