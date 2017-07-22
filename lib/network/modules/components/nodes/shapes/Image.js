'use strict';

import CircleImageBase from '../util/CircleImageBase'

class Image extends CircleImageBase {
  constructor (options, body, labelModule, imageObj, imageObjAlt) {
    super(options, body, labelModule);

    this.setImages(imageObj, imageObjAlt);
  }

  resize(ctx, selected = this.selected, hover = this.hover) {
    var imageAbsent = (this.imageObj.src === undefined) ||
        (this.imageObj.width === undefined) ||
        (this.imageObj.height === undefined);

    if (imageAbsent) {
      var side = this.options.size * 2;
      this.width = side;
      this.height = side;
      return;
    }

    if (this.needsRefresh(selected, hover)) {
      this._resizeImage();
    }
  }

  draw(ctx, x, y, selected, hover, values) {
    this.switchImages(selected);
    this.resize();
    this.left = x - this.width / 2;
    this.top = y - this.height / 2;

    if (this.options.shapeProperties.useBorderWithImage === true) {
      var neutralborderWidth = this.options.borderWidth;
      var selectionLineWidth = this.options.borderWidthSelected || 2 * this.options.borderWidth;
      var borderWidth = (selected ? selectionLineWidth : neutralborderWidth) / this.body.view.scale;
      ctx.lineWidth = Math.min(this.width, borderWidth);

      ctx.beginPath();

      // setup the line properties.
      ctx.strokeStyle = selected ? this.options.color.highlight.border : hover ? this.options.color.hover.border : this.options.color.border;

      // set a fillstyle
      ctx.fillStyle = selected ? this.options.color.highlight.background : hover ? this.options.color.hover.background : this.options.color.background;

      // draw a rectangle to form the border around. This rectangle is filled so the opacity of a picture (in future vis releases?) can be used to tint the image
      ctx.rect(this.left - 0.5 * ctx.lineWidth,
        this.top - 0.5 * ctx.lineWidth,
        this.width + ctx.lineWidth,
        this.height + ctx.lineWidth);
      ctx.fill();

     this.performStroke(ctx, values);
 
      ctx.closePath();
    }

    this._drawImageAtPosition(ctx, values);

    this._drawImageLabel(ctx, x, y, selected, hover);

    this.updateBoundingBox(x,y);
  }

  updateBoundingBox(x,y) {
    this.resize();
    this._updateBoundingBox(x, y);

    if (this.options.label !== undefined && this.labelModule.size.width > 0) {
      this.boundingBox.left = Math.min(this.boundingBox.left, this.labelModule.size.left);
      this.boundingBox.right = Math.max(this.boundingBox.right, this.labelModule.size.left + this.labelModule.size.width);
      this.boundingBox.bottom = Math.max(this.boundingBox.bottom, this.boundingBox.bottom + this.labelOffset);
    }
  }

  distanceToBorder(ctx, angle) {
     return this._distanceToBorder(ctx,angle);
  }
}

export default Image;
