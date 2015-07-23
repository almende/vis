/**
 * @class Images
 * This class loads images and keeps them stored.
 */
function Images(callback) {
  this.images = {};
  this.imageBroken = {};
  this.callback = callback;

}

/**
 *
 * @param {string} url          Url of the image
 * @param {string} url          Url of an image to use if the url image is not found
 * @return {Image} img          The image object
 */
Images.prototype.load = function (url, brokenUrl, id) {
    var me = this;
    
    function addImageToCache(imageToCache) {
        // IE11 fix -- thanks dponch!
        if (imageToCache.width === 0) {
            document.body.appendChild(imageToCache);
            imageToCache.width = imageToCache.offsetWidth;
            imageToCache.height = imageToCache.offsetHeight;
            document.body.removeChild(imageToCache);
        }
    
        me.images[url] = imageToCache;
    }
    
    function redrawWithImage(imageToRedrawWith) {
        if (me.callback) {
            me.callback(imageToRedrawWith);
        }
    }
    
    function tryloadBrokenUrl(imageToLoadBrokenUrlOn) {
        if (brokenUrl === undefined) return;
    
        imageToLoadBrokenUrlOn.onerror = function() {
            console.error("Could not load brokenImage:", brokenUrl);
            addImageToCache(new Image());
        };
        imageToLoadBrokenUrlOn.src = brokenUrl;
    }
    
    var cachedImage = this.images[url]; 
    if (cachedImage) return cachedImage;
    
    var img = new Image();
    img.onload = function() {
        addImageToCache(img);
        redrawWithImage(img);
    };
    
    img.onerror = function () {
        console.error("Could not load image:", url);
        tryloadBrokenUrl(img);
    }
    
    img.src = url;
    
    return img;
};

module.exports = Images;
