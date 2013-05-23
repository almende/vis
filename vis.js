/**
 * vis.js
 * https://github.com/almende/vis
 *
 * A dynamic, browser-based visualization library.
 *
 * @version 0.0.8
 * @date    2013-05-23
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
/**
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
 *                             TODO: implement an option for a  default order
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
 *                              TODO: implement an option order
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
    var itemOptions = this._composeItemOptions(options);

    var item, itemId, i, len;
    if (type == 'DataTable') {
        // return a Google DataTable
        var columns = this._getColumnNames(data);
        if (id != undefined) {
            // return a single item
            item = me._getItem(id, itemOptions);
            if (item) {
                this._appendRow(data, columns, item);
            }
        }
        else if (ids != undefined) {
            // return a subset of items
            for (i = 0, len = ids.length; i < len; i++) {
                item = me._getItem(ids[i], itemOptions);
                if (item) {
                    me._appendRow(data, columns, item);
                }
            }
        }
        else {
            // return all items
            for (itemId in this.data) {
                if (this.data.hasOwnProperty(itemId)) {
                    item = me._getItem(itemId, itemOptions);
                    if (item) {
                        me._appendRow(data, columns, item);
                    }
                }
            }
        }
    }
    else {
        // return an array
        if (!data) {
            data = [];
        }

        if (id != undefined) {
            // return a single item
            return me._getItem(id, itemOptions);
        }
        else if (ids != undefined) {
            // return a subset of items
            for (i = 0, len = ids.length; i < len; i++) {
                item = me._getItem(ids[i], itemOptions);
                if (item) {
                    data.push(item);
                }
            }
        }
        else {
            // return all items
            for (itemId in this.data) {
                if (this.data.hasOwnProperty(itemId)) {
                    item = me._getItem(itemId, itemOptions);
                    if (item) {
                        data.push(item);
                    }
                }
            }
        }
    }

    return data;
};

/**
 * Get ids of all items or from a filtered set of items.
 * @param {Object} [options]    An Object with options. Available options:
 *                              {function} [filter] filter items
 *                              TODO: implement an option order
 * @return {Array} ids
 */
DataSet.prototype.getIds = function (options) {
    var data = this.data,
        id,
        item,
        ids = [];

    if (options && options.filter) {
        // get filtered items
        var itemOptions = this._composeItemOptions({
            filter: options && options.filter
        });
        for (id in data) {
            if (data.hasOwnProperty(id)) {
                item = this._getItem(id, itemOptions);
                if (item) {
                    ids.push(item[this.fieldId]);
                }
            }
        }
    }
    else {
        // get all items
        for (id in data) {
            if (data.hasOwnProperty(id)) {
                item = data[id];
                ids.push(item[this.fieldId]);
            }
        }
    }

    return ids;
};

/**
 * Execute a callback function for every item in the dataset.
 * The order of the items is not determined.
 * @param {function} callback
 * @param {Object} [options]            Available options:
 *                                      {Object.<String, String>} [fieldTypes]
 *                                      {String[]} [fields] filter fields
 *                                      {function} [filter] filter items
 *                                      TODO: implement an option order
 */
DataSet.prototype.forEach = function (callback, options) {
    var itemOptions = this._composeItemOptions(options),
        data = this.data,
        item;

    for (var id in data) {
        if (data.hasOwnProperty(id)) {
            item = this._getItem(id, itemOptions);
            if (item) {
                callback(item, id);
            }
        }
    }
};

/**
 * Map every item in the dataset.
 * @param {function} callback
 * @param {Object} [options]            Available options:
 *                                      {Object.<String, String>} [fieldTypes]
 *                                      {String[]} [fields] filter fields
 *                                      {function} [filter] filter items
 *                                      TODO: implement an option order
 * @return {Object[]} mappedItems
 */
DataSet.prototype.map = function (callback, options) {
    var itemOptions = this._composeItemOptions(options),
        mappedItems = [],
        data = this.data,
        item;

    for (var id in data) {
        if (data.hasOwnProperty(id)) {
            item = this._getItem(id, itemOptions);
            if (item) {
                mappedItems.push(callback(item, id));
            }
        }
    }

    return mappedItems;
};

/**
 * Build an option set for getting an item. Options will be merged by the
 * default options of the dataset.
 * @param {Object} options
 * @returns {Object} itemOptions
 * @private
 */
DataSet.prototype._composeItemOptions = function (options) {
    var itemOptions = {},
        field;

    if (options) {
        // get the default field types
        itemOptions.fieldTypes = {};
        if (this.options && this.options.fieldTypes) {
            util.extend(itemOptions.fieldTypes, this.options.fieldTypes);
        }

        // extend field types with provided types
        if (options.fieldTypes) {
            util.extend(itemOptions.fieldTypes, options.fieldTypes);
        }

        if (options.fields) {
            itemOptions.fields = options.fields;
        }
        if (options.filter) {
            itemOptions.filter = options.filter;
        }
    }

    return itemOptions;
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
 * Get, cast and filter an item
 * @param {String} id
 * @param {Object} options  Available options:
 *                          {Object.<String, String>} fieldTypes  Cast field types
 *                          {String[]} fields   Filter fields
 *                          {function} filter   Filter item, returns null if
 *                                              item does not match the filter
 * @return {Object | null} item
 * @private
 */
DataSet.prototype._getItem = function (id, options) {
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
    if (options.fieldTypes) {
        var fieldTypes = options.fieldTypes;
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

    // apply item filter
    if (options.filter && !options.filter(casted)) {
        return null;
    }

    // apply fields filter
    if (options.fields) {
        var filtered = {},
            fields = options.fields;
        for (field in casted) {
            if (casted.hasOwnProperty(field) && (fields.indexOf(field) != -1)) {
                filtered[field] = casted[field];
            }
        }
        return filtered;
    }
    else {
        return casted;
    }
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
 *                              TODO: implement an option order
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
 *                              TODO: implement an option order
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
            filter: filter
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
 * @constructor Stack
 * Stacks items on top of each other.
 * @param {ItemSet} parent
 * @param {Object} [options]
 */
function Stack (parent, options) {
    this.parent = parent;

    this.options = Object.create(parent && parent.options || 0);
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

    this.setOptions(options);
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
    return ((a.left - margin) < (b.left + b.width) &&
        (a.left + a.width + margin) > b.left &&
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

    this.setOptions(options);

    this.listeners = [];
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

    this.options = Object.create(parent && parent.options || null);

    this.setOptions(options);
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
Panel.prototype.setOptions = function (options) {
    if (options) {
        util.extend(this.options, options);
    }
};

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

    this.options = Object.create(options || null);
    this.defaultOptions = {
        autoResize: true
    };

    this.listeners = {}; // event listeners

    this.setOptions(options);
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
RootPanel.prototype.setOptions = function (options) {
    if (options) {
        util.extend(this.options, options);
    }

    var autoResize = this.getOption('autoResize');
    if (autoResize) {
        this._watch();
    }
    else {
        this._unwatch();
    }
};

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

    this.options = Object.create(parent && parent.options || null);
    this.defaultOptions = {
        orientation: 'bottom',  // supported: 'top', 'bottom'
        // TODO: implement timeaxis orientations 'left' and 'right'
        showMinorLabels: true,
        showMajorLabels: true
    };

    this.conversion = null;
    this.range = null;

    this.setOptions(options);
}

TimeAxis.prototype = new Component();

// TODO: comment options
TimeAxis.prototype.setOptions = function (options) {
    if (options) {
        util.extend(this.options, options);
    }
};

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
    this.options = Object.create(parent && parent.options || null);
    this.defaultOptions = {
        style: 'box',
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
    this.stack = new Stack(this);
    this.conversion = null;

    this.setOptions(options);
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
 *                           {String} [style]
 *                              Default style for the items. Choose from 'box'
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
ItemSet.prototype.setOptions = function setOptions(options) {
    if (options) {
        util.extend(this.options, options);
    }

    // TODO: ItemSet should also attach event listeners for rangechange and rangechanged, like timeaxis
};

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
            update(this, 'left', left);

            update(props.line, 'left', start - props.line.width / 2);
            update(props.dot, 'left', start - props.dot.width / 2);
            update(props.dot, 'top', -props.dot.height / 2);
            if (orientation == 'top') {
                top = margin;

                update(this, 'top', top);
            }
            else {
                // default or 'bottom'
                var parentHeight = this.parent.height;
                top = parentHeight - this.height - margin;

                update(this, 'top', top);
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
    this.options = Object.create(parent && parent.options || null);
    this.options.top = 0;

    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;

    this.setOptions(options);
}

Group.prototype = new Component();

Group.prototype.setOptions = function setOptions(options) {
    if (options) {
        util.extend(this.options, options);
    }
};

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

        this.itemset = new ItemSet(this);
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

    this.options = Object.create(parent && parent.options || null);

    this.range = null;      // Range or Object {start: number, end: number}
    this.itemsData = null;  // DataSet with items
    this.groupsData = null; // DataSet with groups

    this.groups = [];  // array with groups

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

    this.setOptions(options);
}

GroupSet.prototype = new Panel();

/**
 * Set options for the GroupSet. Existing options will be extended/overwritten.
 * @param {Object} [options] The following options are available:
 *                           TODO: describe options
 */
GroupSet.prototype.setOptions = function setOptions(options) {
    if (options) {
        util.extend(this.options, options);
    }
};

GroupSet.prototype.setRange = function (range) {
    // TODO: implement setRange
};

/**
 * Set items
 * @param {vis.DataSet | null} items
 */
GroupSet.prototype.setItems = function setItems(items) {
    this.itemsData = items;

    this.groups.forEach(function (group) {
        group.setItems(items);
    });
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

            // find group
            var group = null;
            var groupIndex = -1;
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].groupId == id) {
                    group = groups[i];
                    groupIndex = i;
                    break;
                }
            }

            //noinspection FallthroughInSwitchStatementJS
            switch (action) {
                case 'add':
                case 'update':
                    if (!group) {
                        group = new Group(me, id);
                        group.setItems(me.itemsData); // attach items data
                        groups.push(group);

                        me.controller.add(group);
                    }

                    // TODO: update group data

                    delete queue[id];
                    break;

                case 'remove':
                    if (group) {
                        group.setItems(); // detach items data
                        groups.splice(groupIndex, 1);

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
        this.groups.forEach(function (group, index) {
            var prevGroup = me.groups[index - 1],
                top = 0;
            if (prevGroup) {
                top = function () {
                    // TODO: top must reckon with options.maxHeight
                    return prevGroup.top + prevGroup.height;
                }
            }
            group.setOptions({
                top: top
            });
        });

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
            this.groups.forEach(function (group) {
                height += group.height;
            });
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
    this.options = {
        orientation: 'bottom',
        min: null,
        max: null,
        zoomMin: 10,     // milliseconds
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000, // milliseconds
        moveable: true,
        zoomable: true,
        showMinorLabels: true,
        showMajorLabels: true,
        autoResize: false
    };

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
    var timeaxisOptions = Object.create(this.options);
    timeaxisOptions.range = this.range;
    this.timeaxis = new TimeAxis(this.root, [], timeaxisOptions);
    this.timeaxis.setRange(this.range);
    this.controller.add(this.timeaxis);

    // create itemset or groupset
    this.setGroups(null);

    this.itemsData = null;      // DataSet
    this.groupsData = null;     // DataSet

    // set options (must take place before setting the data)
    this.setOptions(options);

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
        var options = {
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
        };
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

    Timeline: Timeline
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
util.loadCss("/* vis.js stylesheet */\n\n.graph {\n    position: relative;\n    border: 1px solid #bfbfbf;\n}\n\n.graph .panel {\n    position: absolute;\n}\n\n.graph .groupset {\n    position: absolute;\n    padding: 0;\n    margin: 0;\n}\n\n\n.graph .itemset {\n    position: absolute;\n    padding: 0;\n    margin: 0;\n    overflow: hidden;\n}\n\n.graph .background {\n}\n\n.graph .foreground {\n}\n\n.graph .itemset-axis {\n    position: absolute;\n}\n\n.graph .groupset .itemset-axis {\n    border-top: 1px solid #bfbfbf;\n}\n\n/* TODO: with orientation=='bottom', this will more or less overlap with timeline axis\n.graph .groupset .itemset-axis:last-child {\n    border-top: none;\n}\n*/\n\n\n.graph .item {\n    position: absolute;\n    color: #1A1A1A;\n    border-color: #97B0F8;\n    background-color: #D5DDF6;\n    display: inline-block;\n}\n\n.graph .item.selected {\n    border-color: #FFC200;\n    background-color: #FFF785;\n    z-index: 999;\n}\n\n.graph .item.cluster {\n    /* TODO: use another color or pattern? */\n    background: #97B0F8 url('img/cluster_bg.png');\n    color: white;\n}\n.graph .item.cluster.point {\n    border-color: #D5DDF6;\n}\n\n.graph .item.box {\n    text-align: center;\n    border-style: solid;\n    border-width: 1px;\n    border-radius: 5px;\n    -moz-border-radius: 5px; /* For Firefox 3.6 and older */\n}\n\n.graph .item.point {\n    background: none;\n}\n\n.graph .dot {\n    border: 5px solid #97B0F8;\n    position: absolute;\n    border-radius: 5px;\n    -moz-border-radius: 5px;  /* For Firefox 3.6 and older */\n}\n\n.graph .item.range {\n    overflow: hidden;\n    border-style: solid;\n    border-width: 1px;\n    border-radius: 2px;\n    -moz-border-radius: 2px;  /* For Firefox 3.6 and older */\n}\n\n.graph .item.range .drag-left {\n    cursor: w-resize;\n    z-index: 1000;\n}\n\n.graph .item.range .drag-right {\n    cursor: e-resize;\n    z-index: 1000;\n}\n\n.graph .item.range .content {\n    position: relative;\n    display: inline-block;\n}\n\n.graph .item.line {\n    position: absolute;\n    width: 0;\n    border-left-width: 1px;\n    border-left-style: solid;\n}\n\n.graph .item .content {\n    margin: 5px;\n    white-space: nowrap;\n    overflow: hidden;\n}\n\n/* TODO: better css name, 'graph' is way to generic */\n\n.graph {\n    overflow: hidden;\n}\n\n.graph .axis {\n    position: relative;\n}\n\n.graph .axis .text {\n    position: absolute;\n    color: #4d4d4d;\n    padding: 3px;\n    white-space: nowrap;\n}\n\n.graph .axis .text.measure {\n    position: absolute;\n    padding-left: 0;\n    padding-right: 0;\n    margin-left: 0;\n    margin-right: 0;\n    visibility: hidden;\n}\n\n.graph .axis .grid.vertical {\n    position: absolute;\n    width: 0;\n    border-right: 1px solid;\n}\n\n.graph .axis .grid.horizontal {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 0;\n    border-bottom: 1px solid;\n}\n\n.graph .axis .grid.minor {\n    border-color: #e5e5e5;\n}\n\n.graph .axis .grid.major {\n    border-color: #bfbfbf;\n}\n\n");

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