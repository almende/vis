/**
 * Created by Alex on 2/27/14.
 */
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
 * @param {Graph.Images} imagelist    A list with images. Only needed
 *                                            when the node has an image
 * @param {Graph.Groups} grouplist    A list with groups. Needed for
 *                                            retrieving group properties
 * @param {Object}               constants    An object with default values for
 *                                            example for the color
 *
 */
function Item(properties, constants) {

  this.id = null;
  this.start = null;
  this.end = null;
  this.content = null;
  this.duration = null;

  this.setProperties(properties, constants);

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

  this.originalLabel = undefined;
  // basic properties
  if (properties.id !== undefined)        {this.id = properties.id;}
  if (properties.label !== undefined)     {this.label = properties.label; this.originalLabel = properties.label;}
  if (properties.title !== undefined)     {this.title = properties.title;}
  if (properties.group !== undefined)     {this.group = properties.group;}
  if (properties.x !== undefined)         {this.x = properties.x;}
  if (properties.y !== undefined)         {this.y = properties.y;}
  if (properties.value !== undefined)     {this.value = properties.value;}
  if (properties.level !== undefined)     {this.level = properties.level;}

};