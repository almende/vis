/**
 * Popup is a class to create a popup window with some text
 * @param {Element}  container     The container object.
 * @param {Number} [x]
 * @param {Number} [y]
 * @param {String} [text]
 */
function Popup(container, x, y, text) {
  if (container) {
    this.container = container;
  }
  else {
    this.container = document.body;
  }
  this.x = 0;
  this.y = 0;
  this.padding = 5;

  if (x !== undefined && y !== undefined ) {
    this.setPosition(x, y);
  }
  if (text !== undefined) {
    this.setText(text);
  }

  // create the frame
  this.frame = document.createElement("div");
  var style = this.frame.style;
  style.position = "absolute";
  style.visibility = "hidden";
  style.border = "1px solid #666";
  style.color = "black";
  style.padding = this.padding + "px";
  style.backgroundColor = "#FFFFC6";
  style.borderRadius = "3px";
  style.MozBorderRadius = "3px";
  style.WebkitBorderRadius = "3px";
  style.boxShadow = "3px 3px 10px rgba(128, 128, 128, 0.5)";
  style.whiteSpace = "nowrap";
  this.container.appendChild(this.frame);
};

/**
 * @param {number} x   Horizontal position of the popup window
 * @param {number} y   Vertical position of the popup window
 */
Popup.prototype.setPosition = function(x, y) {
  this.x = parseInt(x);
  this.y = parseInt(y);
};

/**
 * Set the text for the popup window. This can be HTML code
 * @param {string} text
 */
Popup.prototype.setText = function(text) {
  this.frame.innerHTML = text;
};

/**
 * Show the popup window
 * @param {boolean} show    Optional. Show or hide the window
 */
Popup.prototype.show = function (show) {
  if (show === undefined) {
    show = true;
  }

  if (show) {
    var height = this.frame.clientHeight;
    var width =  this.frame.clientWidth;
    var maxHeight = this.frame.parentNode.clientHeight;
    var maxWidth = this.frame.parentNode.clientWidth;

    var top = (this.y - height);
    if (top + height + this.padding > maxHeight) {
      top = maxHeight - height - this.padding;
    }
    if (top < this.padding) {
      top = this.padding;
    }

    var left = this.x;
    if (left + width + this.padding > maxWidth) {
      left = maxWidth - width - this.padding;
    }
    if (left < this.padding) {
      left = this.padding;
    }

    this.frame.style.left = left + "px";
    this.frame.style.top = top + "px";
    this.frame.style.visibility = "visible";
  }
  else {
    this.hide();
  }
};

/**
 * Hide the popup window
 */
Popup.prototype.hide = function () {
  this.frame.style.visibility = "hidden";
};
