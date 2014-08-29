/**
 * @class Images
 * This class loads images and keeps them stored.
 */
function Images() {
  this.images = {};

  this.callback = undefined;
}

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
 * @param {string} url          Url of an image to use if the url image is not found
 * @return {Image} img          The image object
 */
Images.prototype.load = function(url, brokenUrl) {
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
    
    img.onerror = function () {
	  this.src = brokenUrl;
	  if (images.callback) {
		images.callback(this);
	  }
	};
	
    img.src = url;
  }

  return img;
};

module.exports = Images;
