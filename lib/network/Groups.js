var util = require('../util');

/**
 * @class Groups
 * This class can store groups and properties specific for groups.
 */
function Groups() {
  this.clear();
  this.defaultIndex = 0;
}


/**
 * default constants for group colors
 */
Groups.DEFAULT = [
  {border: "#2B7CE9", background: "#97C2FC", highlight: {border: "#2B7CE9", background: "#D2E5FF"}, hover: {border: "#2B7CE9", background: "#D2E5FF"}}, // blue
  {border: "#FFA500", background: "#FFFF00", highlight: {border: "#FFA500", background: "#FFFFA3"}, hover: {border: "#FFA500", background: "#FFFFA3"}}, // yellow
  {border: "#FA0A10", background: "#FB7E81", highlight: {border: "#FA0A10", background: "#FFAFB1"}, hover: {border: "#FA0A10", background: "#FFAFB1"}}, // red
  {border: "#41A906", background: "#7BE141", highlight: {border: "#41A906", background: "#A1EC76"}, hover: {border: "#41A906", background: "#A1EC76"}}, // green
  {border: "#E129F0", background: "#EB7DF4", highlight: {border: "#E129F0", background: "#F0B3F5"}, hover: {border: "#E129F0", background: "#F0B3F5"}}, // magenta
  {border: "#7C29F0", background: "#AD85E4", highlight: {border: "#7C29F0", background: "#D3BDF0"}, hover: {border: "#7C29F0", background: "#D3BDF0"}}, // purple
  {border: "#C37F00", background: "#FFA807", highlight: {border: "#C37F00", background: "#FFCA66"}, hover: {border: "#C37F00", background: "#FFCA66"}}, // orange
  {border: "#4220FB", background: "#6E6EFD", highlight: {border: "#4220FB", background: "#9B9BFD"}, hover: {border: "#4220FB", background: "#9B9BFD"}}, // darkblue
  {border: "#FD5A77", background: "#FFC0CB", highlight: {border: "#FD5A77", background: "#FFD1D9"}, hover: {border: "#FD5A77", background: "#FFD1D9"}}, // pink
  {border: "#4AD63A", background: "#C2FABC", highlight: {border: "#4AD63A", background: "#E6FFE3"}, hover: {border: "#4AD63A", background: "#E6FFE3"}}  // mint
];


/**
 * Clear all groups
 */
Groups.prototype.clear = function () {
  this.groups = {};
  this.groups.length = function()
  {
    var i = 0;
    for ( var p in this ) {
      if (this.hasOwnProperty(p)) {
        i++;
      }
    }
    return i;
  }
};


/**
 * get group properties of a groupname. If groupname is not found, a new group
 * is added.
 * @param {*} groupname        Can be a number, string, Date, etc.
 * @return {Object} group      The created group, containing all group properties
 */
Groups.prototype.get = function (groupname) {
  var group = this.groups[groupname];
  if (group == undefined) {
    // create new group
    var index = this.defaultIndex % Groups.DEFAULT.length;
    this.defaultIndex++;
    group = {};
    group.color = Groups.DEFAULT[index];
    this.groups[groupname] = group;
  }

  return group;
};

/**
 * Add a custom group style
 * @param {String} groupname
 * @param {Object} style       An object containing borderColor,
 *                             backgroundColor, etc.
 * @return {Object} group      The created group object
 */
Groups.prototype.add = function (groupname, style) {
  this.groups[groupname] = style;
  return style;
};

module.exports = Groups;
