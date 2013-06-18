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
    this.options = options || {};
    this.options.top = 0;

    this.props = {
        label: {
            width: 0,
            height: 0
        }
    };

    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

Group.prototype = new Component();

// TODO: comment
Group.prototype.setOptions = Component.prototype.setOptions;

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

        var itemsetOptions = Object.create(this.options);
        this.itemset = new ItemSet(this, null, itemsetOptions);
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

    // TODO: reckon with the height of the group label

    if (this.label) {
        var inner = this.label.firstChild;
        changed += update(this.props.label, 'width', inner.clientWidth);
        changed += update(this.props.label, 'height', inner.clientHeight);
    }
    else {
        changed += update(this.props.label, 'width', 0);
        changed += update(this.props.label, 'height', 0);
    }

    return (changed > 0);
};
