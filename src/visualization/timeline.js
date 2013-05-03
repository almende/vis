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
        autoResize: false
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
        var force = true;
        me.controller.requestReflow(force);
    });
    this.range.on('rangechanged', function () {
        var force = true;
        me.controller.requestReflow(force);
    });

    // TODO: put the listeners in setOptions, be able to dynamically change with options moveable and zoomable

    // time axis
    this.timeaxis = new TimeAxis(this.main, [], {
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
    this.controller.add(this.itemset);

    // set options (must take place before setting the data)
    this.setOptions(options);

    // set data
    if (data) {
        this.setData(data);
    }
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
    var itemsTop,
        itemsHeight,
        mainHeight,
        maxHeight,
        me = this;

    if (this.options.orientation == 'top') {
        itemsTop = function () {
            return me.timeaxis.height;
        }
    }
    else {
        itemsTop = function () {
            return me.main.height - me.timeaxis.height - me.itemset.height;
        }
    }

    if (options.height) {
        // fixed height
        mainHeight = options.height;
        itemsHeight = function () {
            return me.main.height - me.timeaxis.height;
        };
    }
    else {
        // auto height
        mainHeight = function () {
            return me.timeaxis.height + me.itemset.height;
        };
        itemsHeight = null;
    }

    // TODO: maxHeight should be a string in px or %
    if (options.maxHeight) {
        maxHeight = function () {
            return options.maxHeight - me.timeaxis.height;
        }
    }

    this.main.setOptions({
        height: mainHeight
    });

    this.itemset.setOptions({
        orientation: this.options.orientation,
        top: itemsTop,
        height: itemsHeight,
        maxHeight: maxHeight
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

        if (this.options.start == undefined || this.options.end == undefined) {
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
    }
    else {
        // updated data
        this.itemset.setData(data);
    }
};
