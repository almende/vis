// Define namespace vis
var vis = {
    component: {
        item: {}
    }
};

/**
 * load css from text
 * @param {String} css    Text containing css
 */
var loadCss = function (css) {
    // get the script location, and built the css file name from the js file name
    // http://stackoverflow.com/a/2161748/1262753
    var scripts = document.getElementsByTagName('script');
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

/**
 * Define CommonJS module exports when not available
 */
if (typeof exports !== 'undefined') {
    exports = vis;
}
if (typeof module !== 'undefined') {
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
