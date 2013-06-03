/**
 * @class Groups
 * This class can store groups and properties specific for groups.
 */
Groups = function () {
    this.clear();
    this.defaultIndex = 0;
};


/**
 * default constants for group colors
 */
Groups.DEFAULT = [
    {"borderColor": "#2B7CE9", "backgroundColor": "#97C2FC", "highlightColor": "#D2E5FF"}, // blue
    {"borderColor": "#FFA500", "backgroundColor": "#FFFF00", "highlightColor": "#FFFFA3"}, // yellow
    {"borderColor": "#FA0A10", "backgroundColor": "#FB7E81", "highlightColor": "#FFAFB1"}, // red
    {"borderColor": "#41A906", "backgroundColor": "#7BE141", "highlightColor": "#A1EC76"}, // green
    {"borderColor": "#E129F0", "backgroundColor": "#EB7DF4", "highlightColor": "#F0B3F5"}, // magenta
    {"borderColor": "#7C29F0", "backgroundColor": "#AD85E4", "highlightColor": "#D3BDF0"}, // purple
    {"borderColor": "#C37F00", "backgroundColor": "#FFA807", "highlightColor": "#FFCA66"}, // orange
    {"borderColor": "#4220FB", "backgroundColor": "#6E6EFD", "highlightColor": "#9B9BFD"}, // darkblue
    {"borderColor": "#FD5A77", "backgroundColor": "#FFC0CB", "highlightColor": "#FFD1D9"}, // pink
    {"borderColor": "#4AD63A", "backgroundColor": "#C2FABC", "highlightColor": "#E6FFE3"}  // mint
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
        group.borderColor     = Groups.DEFAULT[index].borderColor;
        group.backgroundColor = Groups.DEFAULT[index].backgroundColor;
        group.highlightColor  = Groups.DEFAULT[index].highlightColor;
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
