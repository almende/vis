/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

class Empty {
  constructor (options, labelModule) {
    this.labelModule = labelModule;
    this.setOptions(options);
    this.top = undefined;
    this.left = undefined;
    this.height = undefined;
    this.height = undefined;
    this.boundingBox = {top: 0, left: 0, right: 0, bottom: 0};
  }

  setOptions() {}

  resize() {}

  draw() {}

  distanceToBorder() {}
}

export default Empty;