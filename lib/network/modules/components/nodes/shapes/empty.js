/**
 * Created by Alex on 3/18/2015.
 */
'use strict';

class Empty extends BaseNode {
  constructor (options, body, labelModule) {
    super(options, body, labelModule);
  }

  setOptions() {}

  resize() {}

  draw() {}

  distanceToBorder() {}
}

export default Empty;