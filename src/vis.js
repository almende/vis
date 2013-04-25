/**
 * vis.js library exports
 */
var vis = {
    Controller: require('./controller'),
    DataSet: require('./dataset'),
    events: require('./events'),
    Range: require('./range'),
    Stack: require('./stack'),
    TimeStep: require('./timestep'),
    util: require('./util'),

    component: {
        item: {
            Item: '../../Item',
            ItemBox: '../../ItemBox',
            ItemPoint: '../../ItemPoint',
            ItemRange: '../../ItemRange'
        },

        Component: require('./component/component'),
        Panel: require('./component/panel'),
        RootPanel: require('./component/rootpanel'),
        ItemSet: require('./component/itemset'),
        TimeAxis: require('./component/timeaxis')
    },

    Timeline: require('./visualization/timeline')
};

module.exports = exports = vis;
