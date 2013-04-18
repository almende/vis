
/**
 * load css from contents
 * @param {String} css
 */
var loadCss = function (css) {
    // get the script location, and built the css file name from the js file name
    // http://stackoverflow.com/a/2161748/1262753
    var scripts = document.getElementsByTagName('script');
    var jsFile = scripts[scripts.length-1].src.split('?')[0];
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

