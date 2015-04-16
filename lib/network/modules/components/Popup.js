/**
 * Popup is a class to create a popup window with some text
 * @param {Element}  container     The container object.
 * @param {Number} [x]
 * @param {Number} [y]
 * @param {String} [text]
 * @param {Object} [style]     An object containing borderColor,
 *                             backgroundColor, etc.
 */
class Popup {
  constructor(container) {
    this.container = container;

    this.x = 0;
    this.y = 0;
    this.padding = 5;
    this.hidden = false;

    // create the frame
    this.frame = document.createElement('div');
    this.frame.className = 'vis-network-tooltip';
    this.container.appendChild(this.frame);
  }

  /**
   * @param {number} x   Horizontal position of the popup window
   * @param {number} y   Vertical position of the popup window
   */
  setPosition(x, y) {
    this.x = parseInt(x);
    this.y = parseInt(y);
  }

  /**
   * Set the content for the popup window. This can be HTML code or text.
   * @param {string | Element} content
   */
  setText(content) {
    if (content instanceof Element) {
      this.frame.innerHTML = '';
      this.frame.appendChild(content);
    }
    else {
      this.frame.innerHTML = content; // string containing text or HTML
    }
  }

  /**
   * Show the popup window
   * @param {boolean} [doShow]    Show or hide the window
   */
  show(doShow) {
    if (doShow === undefined) {
      doShow = true;
    }

    if (doShow === true) {
      var height = this.frame.clientHeight;
      var width = this.frame.clientWidth;
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
  }

  /**
   * Hide the popup window
   */
  hide() {
    this.hidden = true;
    this.frame.style.visibility = "hidden";
  }
}

export default Popup;
