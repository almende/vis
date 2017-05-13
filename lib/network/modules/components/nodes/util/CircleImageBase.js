import NodeBase from '../util/NodeBase'

/**
 * NOTE: This is a bad base class
 *
 * Child classes are:
 *
 *   Image       - uses *only* image methods
 *   Circle      - uses *only* _drawRawCircle
 *   CircleImage - uses all
 *
 * TODO: Refactor, move _drawRawCircle to different module, derive Circle from NodeBase
 *       Rename this to ImageBase
 *       Consolidate common code in Image and CircleImage to base class
 */
class CircleImageBase extends NodeBase {
  constructor(options, body, labelModule) {
    super(options, body, labelModule);
    this.labelOffset = 0;
    this.selected = false;
  }

  setOptions(options, imageObj, imageObjAlt) {
    this.options = options;
    this.setImages(imageObj, imageObjAlt);
  }

  setImages(imageObj, imageObjAlt) {
    if (imageObjAlt && this.selected) {
      this.imageObj    = imageObjAlt;
      this.imageObjAlt = imageObj;
    } else {
      this.imageObj    = imageObj;
      this.imageObjAlt = imageObjAlt;
    }
  }

  /**
   * Switch between the base and the selected image.
   */
  switchImages(selected) {
    if ((selected && !this.selected) || (!selected && this.selected)) {
      let imageTmp = this.imageObj;
      this.imageObj = this.imageObjAlt;
      this.imageObjAlt = imageTmp;
    }

    // keep current state in memory
    this.selected = selected;
  }

  /**
   * Adjust the node dimensions for a loaded image.
   *
   * Pre: this.imageObj is valid
   */
  _resizeImage() {
    var width, height;

    if (this.options.shapeProperties.useImageSize === false) {
      // Use the size property
      var ratio_width  = 1;
      var ratio_height = 1;

      // Only calculate the proper ratio if both width and height not zero
      if (this.imageObj.width && this.imageObj.height) {
      	if (this.imageObj.width > this.imageObj.height) {
        	ratio_width = this.imageObj.width / this.imageObj.height;
        }
        else {
        	ratio_height = this.imageObj.height / this.imageObj.width;
        }
      }

      width  = this.options.size * 2 * ratio_width;
      height = this.options.size * 2 * ratio_height;
    }
    else {
      // Use the image size
      width  = this.imageObj.width;
      height = this.imageObj.height;
    }

    this.width = width;
    this.height = height;
    this.radius = 0.5 * this.width;
  }

  _drawRawCircle(ctx, x, y, values) {
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
