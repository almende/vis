import NodeBase from '../util/NodeBase'

class CircleImageBase extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
    this.labelOffset = 0;
    this.imageLoaded = false;
  }

  setOptions(options, imageObj) {
    this.options = options;
    if (imageObj) {
      this.imageObj = imageObj;
    }
  }

  /**
   * This function resizes the image by the options size when the image has not yet loaded. If the image has loaded, we
   * force the update of the size again.
   *
   * @private
   */
  _resizeImage() {
    let force = false;
    if (!this.imageObj.width || !this.imageObj.height) { // undefined or 0
      this.imageLoaded = false;
    }
    else if (this.imageLoaded === false) {
      this.imageLoaded = true;
      force = true;
    }

    if (!this.width || !this.height || force === true) {  // undefined or 0
      var width, height, ratio;
      if (this.imageObj.width && this.imageObj.height) { // not undefined or 0
        width = 0;
        height = 0;
      }
      if (this.options.shapeProperties.useImageSize === false) {
        if (this.imageObj.width > this.imageObj.height) {
          ratio = this.imageObj.width / this.imageObj.height;
          width = this.options.size * 2 * ratio || this.imageObj.width;
          height = this.options.size * 2 || this.imageObj.height;
        }
        else {
          if (this.imageObj.width && this.imageObj.height) { // not undefined or 0
            ratio = this.imageObj.height / this.imageObj.width;
          }
          else {
            ratio = 1;
          }
          width = this.options.size * 2;
          height = this.options.size * 2 * ratio;
        }
      }
      else {
        // when not using the size property, we use the image size
        width = this.imageObj.width;
        height = this.imageObj.height;
      }
      this.width = width;
      this.height = height;
      this.radius = 0.5 * this.width;
    }

  }

  _drawRawCircle(ctx, x, y, selected, hover, values) {
    var borderWidth = values.borderWidth / this.body.view.scale;
    ctx.lineWidth = Math.min(this.width, borderWidth);

    ctx.strokeStyle = values.borderColor;
    ctx.fillStyle = values.color;
    ctx.circle(x, y, values.size);

    // draw shadow if enabled
    this.enableShadow(ctx, values);
    // draw the background
    ctx.fill();
    // disable shadows for other elements.
    this.disableShadow(ctx, values);

    //draw dashed border if enabled, save and restore is required for firefox not to crash on unix.
    ctx.save();
    // if borders are zero width, they will be drawn with width 1 by default. This prevents that
    if (borderWidth > 0) {
      this.enableBorderDashes(ctx, values);
      //draw the border
      ctx.stroke();
      //disable dashed border for other elements
      this.disableBorderDashes(ctx, values);
    }
    ctx.restore();
  }

  _drawImageAtPosition(ctx, values) {
    if (this.imageObj.width != 0) {
      // draw the image
      ctx.globalAlpha = 1.0;

      // draw shadow if enabled
      this.enableShadow(ctx, values);

      let factor = (this.imageObj.width / this.width) / this.body.view.scale;
      if (factor > 2 && this.options.shapeProperties.interpolation === true) {
        let w = this.imageObj.width;
        let h = this.imageObj.height;
        var can2 = document.createElement('canvas');
        can2.width = w;
        can2.height = w;
        var ctx2 = can2.getContext('2d');

        factor *= 0.5;
        w *= 0.5;
        h *= 0.5;
        ctx2.drawImage(this.imageObj, 0, 0, w, h);

        let distance = 0;
        let iterations = 1;
        while (factor > 2 && iterations < 4) {
          ctx2.drawImage(can2, distance, 0, w, h, distance+w, 0, w/2, h/2);
          distance += w;
          factor *= 0.5;
          w *= 0.5;
          h *= 0.5;
          iterations += 1;
        }
        ctx.drawImage(can2, distance, 0, w, h, this.left, this.top, this.width, this.height);
      }
      else {
        // draw image
        ctx.drawImage(this.imageObj, this.left, this.top, this.width, this.height);
      }


      // disable shadows for other elements.
      this.disableShadow(ctx, values);
    }
  }

  _drawImageLabel(ctx, x, y, selected, hover) {
    var yLabel;
    var offset = 0;

    if (this.height !== undefined) {
      offset = this.height * 0.5;
      var labelDimensions = this.labelModule.getTextSize(ctx, selected, hover);
      if (labelDimensions.lineCount >= 1) {
        offset += labelDimensions.height / 2;
      }
    }

    yLabel = y + offset;

    if (this.options.label) {
      this.labelOffset = offset;
    }
    this.labelModule.draw(ctx, x, yLabel, selected, hover, 'hanging');
  }
}

export default CircleImageBase;
