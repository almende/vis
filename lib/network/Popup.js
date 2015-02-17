/**
 * Popup is a class to create a popup window with some text
 * @param {Element}  container     The container object.
 * @param {Number} [x]
 * @param {Number} [y]
 * @param {String} [text]
 * @param {Object} [style]     An object containing borderColor,
 *                             backgroundColor, etc.
 */
function Popup(container, x, y, text, style) {
  if (container) {
    this.container = container;
  }
  else {
    this.container = document.body;
  }

  // x, y and text are optional, see if a style object was passed in their place
  if (style === undefined) {
    if (typeof x === "object") {
      style = x;
      x = undefined;
    } else if (typeof text === "object") {
      style = text;
      text = undefined;
    } else {
      // for backwards compatibility, in case clients other than Network are creating Popup directly
      style = {
        fontColor: 'black',
        fontSize: 14, // px
        fontFace: 'verdana',
        color: {
          border: '#666',
          background: '#FFFFC6'
        }
      }
    }
  }

  this.x = 0;
  this.y = 0;
  this.padding = 5;
  this.hidden = false;

  if (x !== undefined && y !== undefined) {
    this.setPosition(x, y);
  }
  if (text !== undefined) {
    this.setText(text);
  }

  // create the frame
  this.frame = document.createElement('div');
  this.frame.className = 'network-tooltip';
  this.frame.style.color           = style.fontColor;
  this.frame.style.backgroundColor = style.color.background;
  this.frame.style.borderColor     = style.color.border;
  this.frame.style.fontSize        = style.fontSize + 'px';
  this.frame.style.fontFamily      = style.fontFace;
  this.container.appendChild(this.frame);
}

/**
 * @param {number} x   Horizontal position of the popup window
 * @param {number} y   Vertical position of the popup window
 */
Popup.prototype.setPosition = function(x, y) {
  this.x = parseInt(x);
  this.y = parseInt(y);
};

/**
 * Set the content for the popup window. This can be HTML code or text.
 * @param {string | Element} content
 */
Popup.prototype.setText = function(content) {
  if (content instanceof Element) {
    this.frame.innerHTML = '';
    this.frame.appendChild(content);
  }
  else {
    this.frame.innerHTML = content; // string containing text or HTML
  }
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
    this.hidden = false;
  }
  else {
    this.hide();
  }
};

/**
 * Hide the popup window
 */
Popup.prototype.hide = function () {
  this.hidden = true;
  this.frame.style.visibility = "hidden";
};

module.exports = Popup;
