var util = require('./util'),
    Component = require('./component/component');

/**
 * @constructor Controller
 *
 * A Controller controls the reflows and repaints of all visual components
 */
function Controller () {
    this.id = util.randomUUID();
    this.components = {};

    this.repaintTimer = undefined;
    this.reflowTimer = undefined;
}

/**
 * Add a component to the controller
 * @param {Component | Controller} component
 */
Controller.prototype.add = function (component) {
    // validate the component
    if (component.id == undefined) {
        throw new Error('Component has no field id');
    }
    if (!(component instanceof Component) && !(component instanceof Controller)) {
        throw new TypeError('Component must be an instance of ' +
            'prototype Component or Controller');
    }

    // add the component
    component.controller = this;
    this.components[component.id] = component;
};

/**
 * Request a reflow. The controller will schedule a reflow
 */
Controller.prototype.requestReflow = function () {
    if (!this.reflowTimer) {
        var me = this;
        this.reflowTimer = setTimeout(function () {
            me.reflowTimer = undefined;
            me.reflow();
        }, 0);
    }
};

/**
 * Request a repaint. The controller will schedule a repaint
 */
Controller.prototype.requestRepaint = function () {
    if (!this.repaintTimer) {
        var me = this;
        this.repaintTimer = setTimeout(function () {
            me.repaintTimer = undefined;
            me.repaint();
        }, 0);
    }
};

/**
 * Repaint all components
 */
Controller.prototype.repaint = function () {
    var changed = false;

    // cancel any running repaint request
    if (this.repaintTimer) {
        clearTimeout(this.repaintTimer);
        this.repaintTimer = undefined;
    }

    var done = {};

    function repaint(component, id) {
        if (!(id in done)) {
            // first repaint the components on which this component is dependent
            if (component.depends) {
                component.depends.forEach(function (dep) {
                    repaint(dep, dep.id);
                });
            }
            if (component.parent) {
                repaint(component.parent, component.parent.id);
            }

            // repaint the component itself and mark as done
            changed = component.repaint() || changed;
            done[id] = true;
        }
    }

    util.forEach(this.components, repaint);

    // immediately reflow when needed
    if (changed) {
        this.reflow();
    }
    // TODO: limit the number of nested reflows/repaints, prevent loop
};

/**
 * Reflow all components
 */
Controller.prototype.reflow = function () {
    var resized = false;

    // cancel any running repaint request
    if (this.reflowTimer) {
        clearTimeout(this.reflowTimer);
        this.reflowTimer = undefined;
    }

    var done = {};

    function reflow(component, id) {
        if (!(id in done)) {
            // first reflow the components on which this component is dependent
            if (component.depends) {
                component.depends.forEach(function (dep) {
                    reflow(dep, dep.id);
                });
            }
            if (component.parent) {
                reflow(component.parent, component.parent.id);
            }

            // reflow the component itself and mark as done
            resized = component.reflow() || resized;
            done[id] = true;
        }
    }

    util.forEach(this.components, reflow);

    // immediately repaint when needed
    if (resized) {
        this.repaint();
    }
    // TODO: limit the number of nested reflows/repaints, prevent loop
};

// exports
module.exports = exports = Controller;

