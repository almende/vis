'use strict'

var util = require('../../../../util');

class CentralGravitySolver {
  constructor(body, physicsBody, options, groups) {
    this.body = body;
    this.physicsBody = physicsBody;
    this.groups = groups;
    this.gravityGroups = {};
    this.setOptions(options);
  }

  setOptions(options) {
    this.options = options;

    // Iterates through the groups and looks for the ones defining 'groupCentralGravity'
    if (this.groups != null) {
      self = this;
      util.forEach(this.groups.groups, function(groupDefinition, groupName) {
        let gravityStrength = parseInt(groupDefinition.groupGravityStrength);
        if (gravityStrength > 0) {
          self.gravityGroups[groupName] = {name: groupName, strength: gravityStrength};
        }
      });
    }
    this._positionGroupCentersInitially(this.gravityGroups);
  }

  solve() {
    let dx, dy, distance, node;
    let nodes = this.body.nodes;
    let nodeIndices = this.physicsBody.physicsNodeIndices;
    let forces = this.physicsBody.forces;

    for (let i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      node = nodes[nodeId];
      dx = -node.x;
      dy = -node.y;
      distance = Math.sqrt(dx * dx + dy * dy);

      this._calculateForces(distance, dx, dy, forces, node);
      this._calculateGroupForces(this.gravityGroups[node.options.group], forces, node);
    }
  }

  /**
   * Calculate the forces based on the distance.
   * @private
   */
  _calculateForces(distance, dx, dy, forces, node) {
    let gravityForce = (distance === 0) ? 0 : (this.options.centralGravity / distance);
    forces[node.id].x = dx * gravityForce;
    forces[node.id].y = dy * gravityForce;
  }

  /**
   * Calculate the forces the group center puts on the nodes based on the distance.
   * @private
   */
  _calculateGroupForces(group, forces, node) {
    if (group != null) {
      let dx = group.centerX - node.x;
      let dy = group.centerY - node.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      let gravityForce = (distance === 0) ? 0 : (group.strength / distance);
      forces[node.id].x += dx * gravityForce;
      forces[node.id].y += dy * gravityForce;
    }
  }

  /**
   * Position the gravity groups centers in a circle around the central gravity.
   * @private
   */
  _positionGroupCentersInitially(groups) {
    var noOfGroups = Object.keys(groups).length;
    var radius = 30 * noOfGroups + 150;
    var angleStep = 2 * Math.PI / noOfGroups;
    var i = 0;
    util.forEach(groups, function(group, groupName) {
      let angle = (Math.PI / 2) + angleStep * i;
      if (group.centerX === undefined) {
        group.centerX = radius * Math.cos(angle);
      }
      if (group.centerY === undefined) {
        group.centerY = radius * Math.sin(angle);
      }
      i += 1;
    });
  }

}


export default CentralGravitySolver;
