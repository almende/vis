/**
 * Create a timeline visualization
 * @param {HTMLElement} container
 * @param {DataSet | Array | DataTable} [data]
 * @param {Object} [options]  See Timeline.setOptions for the available options.
 * @constructor
 */
function Timeline (container, data, options) {
    var me = this;
    this.options = {
        orientation: 'bottom',
        zoomMin: 10,     // milliseconds
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10000, // milliseconds
        moveable: true,
        zoomable: true
    };

    // controller
    this.controller = new Controller();

    // main panel
    if (!container) {
        throw new Error('No container element provided');
    }
    this.main = new RootPanel(container, {
        autoResize: false,
        height: function () {
            return me.timeaxis.height + me.itemset.height;
        }
    });
    this.controller.add(this.main);

    // range
    var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
    this.range = new Range({
        start: now.clone().add('days', -3).valueOf(),
        end:   now.clone().add('days', 4).valueOf()
    });
    // TODO: reckon with options moveable and zoomable
    this.range.subscribe(this.main, 'move', 'horizontal');
    this.range.subscribe(this.main, 'zoom', 'horizontal');
    this.range.on('rangechange', function () {
        // TODO: fix the delay in reflow/repaint, does not feel snappy
        me.controller.requestReflow();
    });
    this.range.on('rangechanged', function () {
        me.controller.requestReflow();
    });

    // TODO: put the listeners in setOptions, be able to dynamically change with options moveable and zoomable

    // time axis
    this.timeaxis = new TimeAxis(this.main, null, {
        orientation: this.options.orientation,
        range: this.range
    });
    this.timeaxis.setRange(this.range);
    this.controller.add(this.timeaxis);

    // items panel
    this.itemset = new ItemSet(this.main, [this.timeaxis], {
        orientation: this.options.orientation
    });
    this.itemset.setRange(this.range);

    // set data
    if (data) {
        this.setData(data);
    }
    this.controller.add(this.itemset);

    this.setOptions(options);
}

/**
 * Set options
 * @param {Object} options  TODO: describe the available options
 */
Timeline.prototype.setOptions = function (options) {
    util.extend(this.options, options);

    // update options the timeaxis
    this.timeaxis.setOptions(this.options);

    // update options for the range
    this.range.setOptions(this.options);

    // update options the itemset
    var top,
        me = this;
    if (this.options.orientation == 'top') {
        top = function () {
            return me.timeaxis.height;
        }
    }
    else {
        top = function () {
            return me.main.height - me.timeaxis.height - me.itemset.height;
        }
    }
    this.itemset.setOptions({
        orientation: this.options.orientation,
        top: top
    });

    this.controller.repaint();
};

/**
 * Set data
 * @param {DataSet | Array | DataTable} data
 */
Timeline.prototype.setData = function(data) {
    var dataset = this.itemset.data;
    if (!dataset) {
        // first load of data
        this.itemset.setData(data);

        // apply the data range as range
        var dataRange = this.itemset.getDataRange();

        // add 5% on both sides
        var min = dataRange.min;
        var max = dataRange.max;
        if (min != null && max != null) {
            var interval = (max.valueOf() - min.valueOf());
            min = new Date(min.valueOf() - interval * 0.05);
            max = new Date(max.valueOf() + interval * 0.05);
        }

        // apply range if there is a min or max available
        if (min != null || max != null) {
            this.range.setRange(min, max);
        }
    }
    else {
        // updated data
        this.itemset.setData(data);
    }
};

// exports
vis.Timeline = Timeline;
