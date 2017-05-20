'use strict';

import CircleImageBase from '../util/CircleImageBase'

class CircularImage extends CircleImageBase {
  constructor (options, body, labelModule, imageObj, imageObjAlt) {
    super(options, body, labelModule);

    this.setImages(imageObj, imageObjAlt);
  }

  resize(ctx, selected = this.selected, hover = this.hover) {
    var imageAbsent = (this.imageObj.src === undefined) ||
        (this.imageObj.width === undefined) ||
        (this.imageObj.height === undefined);

    if (imageAbsent) {
      var diameter = this.options.size * 2;
      this.width = diameter;
      this.height = diameter;
      this.radius = 0.5*this.width;
			return;
    }

    // At this point, an image is present, i.e. this.imageObj is valid.
    if (this.needsRefresh(selected, hover)) {
      this._resizeImage();
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.switchImages(selected);
    this.resize();
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    // draw the background circle. IMPORTANT: the stroke in this method is used by the clip method below.
    this._drawRawCircle(ctx, x, y, values);

    // now we draw in the circle, we save so we can revert the clip operation after drawing.
    ctx.save();
    // clip is used to use the stroke in drawRawCircle as an area that we can draw in.
    ctx.clip();
    // draw the image
    this._drawImageAtPosition(ctx, values);
    // restore so we can again draw on the full canvas
    ctx.restore();

    this._drawImageLabel(ctx, x, y, selected, hover);

    this.updateBoundingBox(x,y);
  }

  // TODO: compare with Circle.updateBoundingBox(), consolidate? More stuff is happening here
  updateBoundingBox(x,y) {
    this.boundingBox.top = y - this.options.size;
    this.boundingBox.left = x - this.options.size;
    this.boundingBox.right = x + this.options.size;
    this.boundingBox.bottom = y + this.options.size;

    // TODO: compare with Image.updateBoundingBox(), consolidate?
    this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
    this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
    this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelOffset);
  }


  distanceToBorder(ctx, angle) {
    this.resize(ctx);
    return this.width * 0.5;
  }
}

export default CircularImage;
