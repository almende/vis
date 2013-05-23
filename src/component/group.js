/**
 * @constructor Group
 * @param {GroupSet} parent
 * @param {Number | String} groupId
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 * @extends Component
 */
function Group (parent, groupId, options) {
    this.id = util.randomUUID();
    this.parent = parent;

    this.groupId = groupId;
    this.itemsData = null;  // DataSet
    this.itemset = null;    // ItemSet
    this.options = Object.create(parent && parent.options || null);
    this.options.top = 0;

    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;

    this.setOptions(options);
}

Group.prototype = new Component();

Group.prototype.setOptions = function setOptions(options) {
    if (options) {
        util.extend(this.options, options);
    }
};

/**
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
Group.prototype.getContainer = function () {
    return this.parent.getContainer();
};

/**
 * Set item set for the group. The group will create a view on the itemset,
 * filtered by the groups id.
 * @param {DataSet | DataView} items
 */
Group.prototype.setItems = function setItems(items) {
    if (this.itemset) {
        // remove current item set
        this.itemset.hide();
        this.itemset.setItems();

        this.parent.controller.remove(this.itemset);
        this.itemset = null;
    }

    if (items) {
        var groupId = this.groupId;

        this.itemset = new ItemSet(this);
        this.itemset.setRange(this.parent.range);

        this.view = new DataView(items, {
            filter: function (item) {
                return item.group == groupId;
            }
        });
        this.itemset.setItems(this.view);

        this.parent.controller.add(this.itemset);
    }
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
Group.prototype.repaint = function repaint() {
    return false;
};

/**
 * Reflow the item
 * @return {Boolean} resized
 */
Group.prototype.reflow = function reflow() {
    var changed = 0,
        update = util.updateProperty;

    changed += update(this, 'top',    this.itemset ? this.itemset.top : 0);
    changed += update(this, 'height', this.itemset ? this.itemset.height : 0);

    return (changed > 0);
};
