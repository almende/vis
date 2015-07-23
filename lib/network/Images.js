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
 * @param {string} url                      The Url to cache the image as 
  * @return {Image} imageToLoadBrokenUrlOn  The image object
 */
Images.prototype._addImageToCache = function (url, imageToCache) {
    // IE11 fix -- thanks dponch!
    if (imageToCache.width === 0) {
        document.body.appendChild(imageToCache);
        imageToCache.width = imageToCache.offsetWidth;
        imageToCache.height = imageToCache.offsetHeight;
        document.body.removeChild(imageToCache);
    }

    this.images[url] = imageToCache;
}

/**
 * @param {string} url                      The original Url that failed to load, if the broken image is successfully loaded it will be added to the cache using this Url as the key so that subsequent requests for this Url will return the broken image
 * @param {string} brokenUrl                Url the broken image to try and load
 * @return {Image} imageToLoadBrokenUrlOn   The image object
 */
Images.prototype._tryloadBrokenUrl = function (url, brokenUrl, imageToLoadBrokenUrlOn) {
    //Store the instance of the Images object so that we can reference it in events
    var self = this;
    
    //If any of the parameters aren't specified then exit the function because nothing constructive can be done
    if (url === undefined || brokenUrl === undefined || imageToLoadBrokenUrlOn === undefined)  return;

    //Clear the old subscription to the error event and put a new in place that only handle errors in loading the brokenImageUrl
    imageToLoadBrokenUrlOn.onerror = function() {
        console.error("Could not load brokenImage:", brokenUrl);
        //Add an empty image to the cache so that when subsequent load calls are made for the url we don't try load the image and broken image again
        self._addImageToCache(url, new Image());
    };
    
    //Set the source of the image to the brokenUrl, this is actually what kicks off the loading of the broken image
    imageToLoadBrokenUrlOn.src = brokenUrl;
}

/**
 * @return {Image} imageToRedrawWith The images that will be passed to the callback when it is invoked
 */    
Images.prototype._redrawWithImage = function (imageToRedrawWith) {
    if (this.callback) {
        this.callback(imageToRedrawWith);
    }
}    

/**
 * @param {string} url          Url of the image
 * @param {string} brokenUrl    Url of an image to use if the url image is not found
 * @return {Image} img          The image object
 */
Images.prototype.load = function (url, brokenUrl, id) {
    //Store the instance of the Images object so that we can reference it in events
    var self = this;
    
    //Try and get the image from the cache, if successful then return the cached image   
    var cachedImage = this.images[url]; 
    if (cachedImage) return cachedImage;
    
    //Create a new image
    var img = new Image();
    
    //Subscribe to the event that is raised if the image loads successfully 
    img.onload = function() {
        //Add the image to the cache and then request a redraw
        self._addImageToCache(url, img);
        self._redrawWithImage(img);
    };
    
    //Subscribe to the event that is raised if the image fails to load
    img.onerror = function () {
        console.error("Could not load image:", url);
        //Try and load the image specified by the brokenUrl using
        self._tryloadBrokenUrl(url, brokenUrl, img);
    }
    
    //Set the source of the image to the url, this is actuall what kicks off the loading of the image
    img.src = url;
    
    //Return the new image
    return img;
};

module.exports = Images;
