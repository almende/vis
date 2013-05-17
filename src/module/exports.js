/**
 * vis.js module exports
 */
var vis = {
    util: util,
    events: events,

    Controller: Controller,
    DataSet: DataSet,
    DataView: DataView,
    Range: Range,
    Stack: Stack,
    TimeStep: TimeStep,
    EventBus: EventBus,

    components: {
        items: {
            Item: Item,
            ItemBox: ItemBox,
            ItemPoint: ItemPoint,
            ItemRange: ItemRange
        },

        Component: Component,
        Panel: Panel,
        RootPanel: RootPanel,
        ItemSet: ItemSet,
        TimeAxis: TimeAxis
    },

    Timeline: Timeline
};

/**
 * CommonJS module exports
 */
if (typeof exports !== 'undefined') {
    exports = vis;
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = vis;
}

/**
 * AMD module exports
 */
if (typeof(define) === 'function') {
    define(function () {
        return vis;
    });
}

/**
 * Window exports
 */
if (typeof window !== 'undefined') {
    // attach the module to the window, load as a regular javascript file
    window['vis'] = vis;
}
