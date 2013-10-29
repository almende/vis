/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {vis.DataSet | Array | DataTable} [items]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor
 */
function Timeline (container, items, options) {
    var me = this;
    this.options = util.extend({
        orientation: 'bottom',
        min: null,
        max: null,
        zoomMin: 10,     // milliseconds
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000, // milliseconds
        // moveable: true, // TODO: option moveable
        // zoomable: true, // TODO: option zoomable
        showMinorLabels: true,
        showMajorLabels: true,
        showCurrentTime: false,
        autoResize: false
    }, options);

    // controller
    this.controller = new Controller();

    // root panel
    if (!container) {
        throw new Error('No container element provided');
    }
    var rootOptions = Object.create(this.options);
    rootOptions.height = function () {
        if (me.options.height) {
            // fixed height
            return me.options.height;
        }
        else {
            // auto height
            return me.timeaxis.height + me.content.height;
        }
    };
    this.rootPanel = new RootPanel(container, rootOptions);
    this.controller.add(this.rootPanel);

    // item panel
    var itemOptions = Object.create(this.options);
    itemOptions.left = function () {
        return me.labelPanel.width;
    };
    itemOptions.width = function () {
        return me.rootPanel.width - me.labelPanel.width;
    };
    itemOptions.top = null;
    itemOptions.height = null;
    this.itemPanel = new Panel(this.rootPanel, [], itemOptions);
    this.controller.add(this.itemPanel);

    // label panel
    var labelOptions = Object.create(this.options);
    labelOptions.top = null;
    labelOptions.left = null;
    labelOptions.height = null;
    labelOptions.width = function () {
        if (me.content && typeof me.content.getLabelsWidth === 'function') {
            return me.content.getLabelsWidth();
        }
        else {
            return 0;
        }
    };
    this.labelPanel = new Panel(this.rootPanel, [], labelOptions);
    this.controller.add(this.labelPanel);

    // range
    var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
    this.range = new Range({
        start: now.clone().add('days', -3).valueOf(),
        end:   now.clone().add('days', 4).valueOf()
    });
  /* TODO: fix range options
    var rangeOptions = Object.create(this.options);
    this.range = new Range(rangeOptions);
    this.range.setRange(
        now.clone().add('days', -3).valueOf(),
        now.clone().add('days', 4).valueOf()
    );
    */
    // TODO: reckon with options moveable and zoomable
    this.range.subscribe(this.rootPanel, 'move', 'horizontal');
    this.range.subscribe(this.rootPanel, 'zoom', 'horizontal');
    this.range.on('rangechange', function () {
        var force = true;
        me.controller.requestReflow(force);
    });
    this.range.on('rangechanged', function () {
        var force = true;
        me.controller.requestReflow(force);
    });

    // TODO: put the listeners in setOptions, be able to dynamically change with options moveable and zoomable

    // time axis
    var timeaxisOptions = Object.create(rootOptions);
    timeaxisOptions.range = this.range;
    timeaxisOptions.left = null;
    timeaxisOptions.top = null;
    timeaxisOptions.width = '100%';
    timeaxisOptions.height = null;
    this.timeaxis = new TimeAxis(this.itemPanel, [], timeaxisOptions);
    this.timeaxis.setRange(this.range);
    this.controller.add(this.timeaxis);

    // current time bar
    this.currenttime = new CurrentTime(this.timeaxis, [], rootOptions);
    this.controller.add(this.currenttime);

    // create itemset or groupset
    this.setGroups(null);

    this.itemsData = null;      // DataSet
    this.groupsData = null;     // DataSet

    // set data
    if (items) {
        this.setItems(items);
    }
}

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
    if (options) {
        util.extend(this.options, options);
    }

    // TODO: apply range min,max

    this.controller.reflow();
    this.controller.repaint();
};

/**
 * Set items
 * @param {vis.DataSet | Array | DataTable | null} items
 */
Timeline.prototype.setItems = function(items) {
    var initialLoad = (this.itemsData == null);

    // convert to type DataSet when needed
    var newItemSet;
    if (!items) {
        newItemSet = null;
    }
    else if (items instanceof DataSet) {
        newItemSet = items;
    }
    if (!(items instanceof DataSet)) {
        newItemSet = new DataSet({
            convert: {
                start: 'Date',
                end: 'Date'
            }
        });
        newItemSet.add(items);
    }

    // set items
    this.itemsData = newItemSet;
    this.content.setItems(newItemSet);

    if (initialLoad && (this.options.start == undefined || this.options.end == undefined)) {
        // apply the data range as range
        var dataRange = this.getItemRange();

        // add 5% on both sides
        var min = dataRange.min;
        var max = dataRange.max;
        if (min != null && max != null) {
            var interval = (max.valueOf() - min.valueOf());
            if (interval <= 0) {
                // prevent an empty interval
                interval = 24 * 60 * 60 * 1000; // 1 day
            }
            min = new Date(min.valueOf() - interval * 0.05);
            max = new Date(max.valueOf() + interval * 0.05);
        }

        // override specified start and/or end date
        if (this.options.start != undefined) {
            min = new Date(this.options.start.valueOf());
        }
        if (this.options.end != undefined) {
            max = new Date(this.options.end.valueOf());
        }

        // apply range if there is a min or max available
        if (min != null || max != null) {
            this.range.setRange(min, max);
        }
    }
};

/**
 * Set groups
 * @param {vis.DataSet | Array | DataTable} groups
 */
Timeline.prototype.setGroups = function(groups) {
    var me = this;
    this.groupsData = groups;

    // switch content type between ItemSet or GroupSet when needed
    var type = this.groupsData ? GroupSet : ItemSet;
    if (!(this.content instanceof type)) {
        // remove old content set
        if (this.content) {
            this.content.hide();
            if (this.content.setItems) {
                this.content.setItems(); // disconnect from items
            }
            if (this.content.setGroups) {
                this.content.setGroups(); // disconnect from groups
            }
            this.controller.remove(this.content);
        }

        // create new content set
        var options = Object.create(this.options);
        util.extend(options, {
            top: function () {
                if (me.options.orientation == 'top') {
                    return me.timeaxis.height;
                }
                else {
                    return me.itemPanel.height - me.timeaxis.height - me.content.height;
                }
            },
            left: null,
            width: '100%',
            height: function () {
                if (me.options.height) {
                    return me.itemPanel.height - me.timeaxis.height;
                }
                else {
                    return null;
                }
            },
            maxHeight: function () {
                if (me.options.maxHeight) {
                    if (!util.isNumber(me.options.maxHeight)) {
                        throw new TypeError('Number expected for property maxHeight');
                    }
                    return me.options.maxHeight - me.timeaxis.height;
                }
                else {
                    return null;
                }
            },
            labelContainer: function () {
                return me.labelPanel.getContainer();
            }
        });
        this.content = new type(this.itemPanel, [this.timeaxis], options);
        if (this.content.setRange) {
            this.content.setRange(this.range);
        }
        if (this.content.setItems) {
            this.content.setItems(this.itemsData);
        }
        if (this.content.setGroups) {
            this.content.setGroups(this.groupsData);
        }
        this.controller.add(this.content);
    }
};

/**
 * Get the data range of the item set.
 * @returns {{min: Date, max: Date}} range  A range with a start and end Date.
 *                                          When no minimum is found, min==null
 *                                          When no maximum is found, max==null
 */
Timeline.prototype.getItemRange = function getItemRange() {
    // calculate min from start filed
    var itemsData = this.itemsData,
        min = null,
        max = null;

    if (itemsData) {
        // calculate the minimum value of the field 'start'
        var minItem = itemsData.min('start');
        min = minItem ? minItem.start.valueOf() : null;

        // calculate maximum value of fields 'start' and 'end'
        var maxStartItem = itemsData.max('start');
        if (maxStartItem) {
            max = maxStartItem.start.valueOf();
        }
        var maxEndItem = itemsData.max('end');
        if (maxEndItem) {
            if (max == null) {
                max = maxEndItem.end.valueOf();
            }
            else {
                max = Math.max(max, maxEndItem.end.valueOf());
            }
        }
    }

    return {
        min: (min != null) ? new Date(min) : null,
        max: (max != null) ? new Date(max) : null
    };
};
