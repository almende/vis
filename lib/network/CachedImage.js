
/**
 * Associates a canvas to a given image, containing a number of renderings
 * of the image at various sizes.
 *
 * This technique is known as 'mipmapping'.
 *
 * NOTE: Images can also be of type 'data:svg+xml`. This code also works
 *       for svg, but the mipmapping may not be necessary.
 */
class CachedImage {
  constructor(image) {
    this.NUM_ITERATIONS = 4;  // Number of items in the coordinates array

    this.image  = new Image();
    this.canvas = document.createElement('canvas');
  }


  /**
   * Called when the image has been succesfully loaded.
   */
  init() {
    if (this.initialized()) return;

    this.src = this.image.src;  // For same interface with Image
    var w = this.image.width;
    var h = this.image.height;

    // Ease external access
    this.width  = w;
    this.height = h;

    // Make canvas as small as possible
    this.canvas.width  = 3*w/4;
    this.canvas.height = h/2;

    // Coordinates and sizes of images contained in the canvas
    // Values per row:  [top x, left y, width, height]
    this.coordinates = [
      [ 0    , 0  , w/2 , h/2],
      [ w/2  , 0  , w/4 , h/4],
      [ w/2  , h/4, w/8 , h/8],
      [ 5*w/8, h/4, w/16, h/16]
    ];

    this._fillMipMap();
  }


  /**
   * @return {Boolean} true if init() has been called, false otherwise.
   */
  initialized() {
    return (this.coordinates !== undefined);
  }


  /**
   * Redraw main image in various sizes to the context.
   *
   * The rationale behind this is to reduce artefacts due to interpolation
   * at differing zoom levels.
   *
   * Source: http://stackoverflow.com/q/18761404/1223531
   *
   * This methods takes the resizing out of the drawing loop, in order to
   * reduce performance overhead.
   *
   * TODO: The code assumes that a 2D context can always be gotten. This is
   *       not necessarily true! OTOH, if not true then usage of this class
   *       is senseless.
   *
   * @private
   */
  _fillMipMap() {
    var ctx = this.canvas.getContext('2d');

    // First zoom-level comes from the image
    var to  = this.coordinates[0];
    ctx.drawImage(this.image, to[0], to[1], to[2], to[3]);

    // The rest are copy actions internal to the canvas/context
    for (let iterations = 1; iterations < this.NUM_ITERATIONS; iterations++) {
      let from = this.coordinates[iterations - 1];
      let to   = this.coordinates[iterations];

      ctx.drawImage(this.canvas,
        from[0], from[1], from[2], from[3],
          to[0],   to[1],   to[2],   to[3]
      );
    }
  }


  /**
   * Draw the image, using the mipmap if necessary.
   *
   * MipMap is only used if param factor > 2; otherwise, original bitmap
   * is resized. This is also used to skip mipmap usage, e.g. by setting factor = 1
   *
   * Credits to 'Alex de Mulder' for original implementation.
   *
   * ctx    {Context} context on which to draw zoomed image
   * factor {Float}   scale factor at which to draw
   */
  drawImageAtPosition(ctx, factor, left, top, width, height) {
    if (factor > 2 && this.initialized()) {
      // Determine which zoomed image to use
      factor *= 0.5;
      let iterations = 0;
      while (factor > 2 && iterations < this.NUM_ITERATIONS) {
        factor *= 0.5;
        iterations += 1;
      }

      if (iterations >= this.NUM_ITERATIONS) {
        iterations = this.NUM_ITERATIONS - 1;
      }
      //console.log("iterations: " + iterations);

      let from = this.coordinates[iterations];
      ctx.drawImage(this.canvas,
        from[0], from[1], from[2], from[3],
           left,     top,   width,  height
      );
    } else if (this._isImageOk()) {
      // Draw image directly
      ctx.drawImage(this.image, left, top, width, height);
    }
  }


  /**
   * Check if image is loaded
   *
   * Source: http://stackoverflow.com/a/1977898/1223531
   *
   * @private
   */
  _isImageOk(img) {
    var img = this.image;

    // During the onload event, IE correctly identifies any images that
    // weren’t downloaded as not complete. Others should too. Gecko-based
    // browsers act like NS4 in that they report this incorrectly.
    if (!img.complete) {
        return false;
    }

    // However, they do have two very useful properties: naturalWidth and
    // naturalHeight. These give the true size of the image. If it failed
    // to load, either of these should be zero.

    if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
        return false;
    }

    // No other way of checking: assume it’s ok.
    return true;
  }
}


export default CachedImage;
