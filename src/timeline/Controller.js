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

// Extend controller with Emitter mixin
Emitter(Controller.prototype);

/**
 * Add a component to the controller
 * @param {Component} component
 */
Controller.prototype.add = function add(component) {
  // validate the component
  if (component.id == undefined) {
    throw new Error('Component has no field id');
  }
  if (!(component instanceof Component) && !(component instanceof Controller)) {
    throw new TypeError('Component must be an instance of ' +
        'prototype Component or Controller');
  }

  // add the component
  component.setController(this);
  this.components[component.id] = component;
};

/**
 * Remove a component from the controller
 * @param {Component | String} component
 */
Controller.prototype.remove = function remove(component) {
  var id;
  for (id in this.components) {
    if (this.components.hasOwnProperty(id)) {
      if (id == component || this.components[id] === component) {
        break;
      }
    }
  }

  if (id) {
    // unregister the controller (gives the component the ability to unregister
    // event listeners and clean up other stuff)
    this.components[id].setController(null);

    delete this.components[id];
  }
};

/**
 * Request a reflow. The controller will schedule a reflow
 * @param {Boolean} [force]     If true, an immediate reflow is forced. Default
 *                              is false.
 */
// TODO: change requestReflow into an event
Controller.prototype.requestReflow = function requestReflow(force) {
  if (force) {
    this.reflow();
  }
  else {
    if (!this.reflowTimer) {
      var me = this;
      this.reflowTimer = setTimeout(function () {
        me.reflowTimer = undefined;
        me.reflow();
      }, 0);
    }
  }
};

/**
 * Request a repaint. The controller will schedule a repaint
 * @param {Boolean} [force]    If true, an immediate repaint is forced. Default
 *                             is false.
 */
// TODO: change requestReflow into an event
Controller.prototype.requestRepaint = function requestRepaint(force) {
  if (force) {
    this.repaint();
  }
  else {
    if (!this.repaintTimer) {
      var me = this;
      this.repaintTimer = setTimeout(function () {
        me.repaintTimer = undefined;
        me.repaint();
      }, 0);
    }
  }
};

/**
 * Repaint all components
 */
Controller.prototype.repaint = function repaint() {
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
Controller.prototype.reflow = function reflow() {
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
