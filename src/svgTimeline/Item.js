/**
 * @class Item
 * A node. A node can be connected to other nodes via one or multiple edges.
 * @param {object} properties An object containing properties for the node. All
 *                            properties are optional, except for the id.
 *                              {number} id     Id of the node. Required
 *                              {string} label  Text label for the node
 *                              {number} x      Horizontal position of the node
 *                              {number} y      Vertical position of the node
 *                              {string} shape  Node shape, available:
 *                                              "database", "circle", "ellipse",
 *                                              "box", "image", "text", "dot",
 *                                              "star", "triangle", "triangleDown",
 *                                              "square"
 *                              {string} image  An image url
 *                              {string} title  An title text, can be HTML
 *                              {anytype} group A group name or number
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 *
 */
function Item(properties, constants) {

  this.id = null;
  this.start = null;
  this.end = 0;
  this.content = "no content";
  this.class = "";
  this.active = false;
  this.setProperties(properties, constants);

  this.convertDatesToUNIX();

  this.duration = 0;
  if (this.end != 0) {
    this.duration = this.end - this.start;
  }

  this.svg = null;
  this.svgLine = null;

}


/**
 * Set or overwrite properties for the node
 * @param {Object} properties an object with properties
 * @param {Object} constants  and object with default, global properties
 */
Item.prototype.setProperties = function(properties, constants) {
  if (!properties) {
    return;
  }

  // basic properties
  if (properties.id      !== undefined)  {this.id = properties.id;}
    else  {throw("An ID is required.")}

  if (properties.start   !== undefined)  {this.start = properties.start;}
    else  {throw("A start property is required. -->" + this.id)}

  if (properties.end     !== undefined)  {this.end = properties.end;}
  if (properties.class   !== undefined)  {this.class = properties.class;}
  if (properties.content !== undefined)  {this.content = properties.content;}

};

Item.prototype.convertDatesToUNIX = function() {
  this.start = moment(this.start,"YYYY-MM-DD").valueOf();
  if (this.end != null) {
    this.end = moment(this.end,"YYYY-MM-DD").valueOf();
  }
}