/**
 * Created by Alex on 6/20/14.
 */

var SVGutil = {}
/**
 * this prepares the JSON container for allocating SVG elements
 * @param JSONcontainer
 * @private
 */
SVGutil._prepareSVGElements = function(JSONcontainer) {
  // cleanup the redundant svgElements;
  for (var elementType in JSONcontainer) {
    if (JSONcontainer.hasOwnProperty(elementType)) {
      JSONcontainer[elementType].redundant = JSONcontainer[elementType].used;
      JSONcontainer[elementType].used = [];
    }
  }
};

/**
 * this cleans up all the unused SVG elements. By asking for the parentNode, we only need to supply the JSON container from
 * which to remove the redundant elements.
 *
 * @param JSONcontainer
 * @private
 */
SVGutil._cleanupSVGElements = function(JSONcontainer) {
  // cleanup the redundant svgElements;
  for (var elementType in JSONcontainer) {
    if (JSONcontainer.hasOwnProperty(elementType)) {
      for (var i = 0; i < JSONcontainer[elementType].redundant.length; i++) {
        JSONcontainer[elementType].redundant[i].parentNode.removeChild(JSONcontainer[elementType].redundant[i]);
      }
      JSONcontainer[elementType].redundant = [];
    }
  }
};

/**
 * Allocate or generate an SVG element if needed. Store a reference to it in the JSON container and draw it in the svgContainer
 * the JSON container and the SVG container have to be supplied so other svg containers (like the legend) can use this.
 *
 * @param elementType
 * @param JSONcontainer
 * @param svgContainer
 * @returns {*}
 * @private
 */
SVGutil._getSVGElement = function (elementType, JSONcontainer, svgContainer) {
  var element;
  // allocate SVG element, if it doesnt yet exist, create one.
  if (JSONcontainer.hasOwnProperty(elementType)) { // this element has been created before
    // check if there is an redundant element
    if (JSONcontainer[elementType].redundant.length > 0) {
      element = JSONcontainer[elementType].redundant[0];
      JSONcontainer[elementType].redundant.shift()
    }
    else {
      // create a new element and add it to the SVG
      element = document.createElementNS('http://www.w3.org/2000/svg', elementType);
      svgContainer.appendChild(element);
    }
  }
  else {
    // create a new element and add it to the SVG, also create a new object in the svgElements to keep track of it.
    element = document.createElementNS('http://www.w3.org/2000/svg', elementType);
    JSONcontainer[elementType] = {used: [], redundant: []};
    svgContainer.appendChild(element);
  }
  JSONcontainer[elementType].used.push(element);
  return element;
};



/**
 * draw a point object. this is a seperate function because it can also be called by the legend.
 * The reason the JSONcontainer and the target SVG svgContainer have to be supplied is so the legend can use these functions
 * as well.
 *
 * @param x
 * @param y
 * @param group
 * @param JSONcontainer
 * @param svgContainer
 * @returns {*}
 */
SVGutil.drawPoint = function(x, y, group, JSONcontainer, svgContainer) {
  var point;
  if (group.options.drawPoints.style == 'circle') {
    point = SVGutil._getSVGElement('circle',JSONcontainer,svgContainer);
    point.setAttributeNS(null, "cx", x);
    point.setAttributeNS(null, "cy", y);
    point.setAttributeNS(null, "r", 0.5 * group.options.drawPoints.size);
    point.setAttributeNS(null, "class", group.className + " point");
  }
  else {
    point = SVGutil._getSVGElement('rect',JSONcontainer,svgContainer);
    point.setAttributeNS(null, "x", x - 0.5*group.options.drawPoints.size);
    point.setAttributeNS(null, "y", y - 0.5*group.options.drawPoints.size);
    point.setAttributeNS(null, "width", group.options.drawPoints.size);
    point.setAttributeNS(null, "height", group.options.drawPoints.size);
    point.setAttributeNS(null, "class", group.className + " point");
  }
  return point;
}