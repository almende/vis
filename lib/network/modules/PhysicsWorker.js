import PhysicsBase                          from './PhysicsBase';

class PhysicsWorker extends PhysicsBase {
  constructor(postMessage) {
    super();
    this.body = {
      nodes: {},
      edges: {}
    };
    this.postMessage = postMessage;
    this.previousStates = {};
    this.toRemove = {
      nodeIds: [],
      edgeIds: []
    };
    this.physicsTimeout = null;
    this.isWorker = true;
    this.emit = (event, data) => {this.postMessage({type: 'emit', data: {event: event, data: data}})};
  }

  handleMessage(event) {
    var msg = event.data;
    switch (msg.type) {
      case 'physicsTick':
        this.processRemovals();
        this.physicsTick();
        this.sendPositions();
        break;
      case 'updatePositions':
        this.receivePositions(msg.data);
        break;
      case 'updateProperties':
        this.updateProperties(msg.data);
        break;
      case 'addElements':
        this.addElements(msg.data);
        break;
      case 'removeElements':
        this.removeElements(msg.data);
        break;
      case 'stabilize':
        this.stabilize(msg.data);
        break;
      case 'setStabilized':
        this.stabilized = msg.data;
        break;
      case 'initPhysicsData':
        console.debug('init physics data');
        this.initPhysicsData(msg.data);
        break;
      case 'options':
        this.options = msg.data;
        this.timestep = this.options.timestep;
        this.initPhysicsSolvers();
        break;
      default:
        console.warn('unknown message from PhysicsEngine', msg);
    }
  }

  sendPositions() {
    let nodeIndices = this.physicsBody.physicsNodeIndices;
    let positions = {};
    for (let i = 0; i < nodeIndices.length; i++) {
      let nodeId = nodeIndices[i];
      let node = this.body.nodes[nodeId];
      positions[nodeId] = {x:node.x, y:node.y};
    }

    this.postMessage({
      type: 'positions',
      data: {
        positions: positions,
        stabilized: this.stabilized
      }
    });
  }

  receivePositions(data) {
    let updatedNode = this.body.nodes[data.id];
    if (updatedNode) {
      updatedNode.x = data.x;
      updatedNode.y = data.y;
      this.physicsBody.forces[updatedNode.id] = {x: 0, y: 0};
      this.physicsBody.velocities[updatedNode.id] = {x: 0, y: 0};
    }
  }

  stabilize(data) {
    this.stabilized = false;
    this.targetIterations = data.targetIterations;
    this.stabilizationIterations = 0;
    setTimeout(() => this._stabilizationBatch(), 0);
  }

  updateProperties(data) {
    if (data.type === 'node') {
      let optionsNode = this.body.nodes[data.id];
      if (optionsNode) {
        let opts = data.options;
        if (opts.fixed) {
          if (opts.fixed.x !== undefined) {
            optionsNode.options.fixed.x = opts.fixed.x;
          }
          if (opts.fixed.y !== undefined) {
            optionsNode.options.fixed.y = opts.fixed.y;
          }
        }
        if (opts.mass !== undefined) {
          optionsNode.options.mass = opts.mass;
        }
        if (opts.edges && opts.edges.length) {
          optionsNode.edges.length = opts.edges.length;
        }
      } else {
        console.warn('sending properties to unknown node', data.id, data.options);
      }
    } else if (data.type === 'edge') {
      let edge = this.body.edges[data.id];
      if (edge) {
        let opts = data.options;
        if (opts.connected) {
          edge.connected = opts.connected;
        }
      } else {
        console.warn('sending properties to unknown edge', data.id, data.options);
      }
    } else {
      console.warn('sending properties to unknown element', data.id, data.options);
    }
  }

  addElements(data, replaceElements = true) {
    let nodeIds = Object.keys(data.nodes);
    for (let i = 0; i < nodeIds.length; i++) {
      let nodeId = nodeIds[i];
      let newNode = data.nodes[nodeId];
      if (replaceElements) {
        this.body.nodes[nodeId] = newNode;
      }
      this.physicsBody.forces[nodeId] = {x: 0, y: 0};
      // forces can be reset because they are recalculated. Velocities have to persist.
      if (this.physicsBody.velocities[nodeId] === undefined) {
        this.physicsBody.velocities[nodeId] = {x: 0, y: 0};
      }
      if (this.physicsBody.physicsNodeIndices.indexOf(nodeId) === -1) {
        this.physicsBody.physicsNodeIndices.push(nodeId);
      }
    }
    let edgeIds = Object.keys(data.edges);
    for (let i = 0; i < edgeIds.length; i++) {
      let edgeId = edgeIds[i];
      if (replaceElements) {
        this.body.edges[edgeId] = data.edges[edgeId];
      }
      if (this.physicsBody.physicsEdgeIndices.indexOf(edgeId) === -1) {
        this.physicsBody.physicsEdgeIndices.push(edgeId);
      }
    }
  }

  removeElements(data) {
    // schedule removal of elements on the next physicsTick
    // avoids having to defensively check every node read in each physics implementation
    this.toRemove.nodeIds.push.apply(this.toRemove.nodeIds, data.nodeIds);
    this.toRemove.edgeIds.push.apply(this.toRemove.edgeIds, data.edgeIds);
    // Handle case where physics is disabled.
    if (!this.options.enabled) {
      this.processRemovals();
    }
  }

  processRemovals() {
    while (this.toRemove.nodeIds.length > 0) {
      let nodeId = this.toRemove.nodeIds.pop();
      let index = this.physicsBody.physicsNodeIndices.indexOf(nodeId);
      if (index > -1) {
        this.physicsBody.physicsNodeIndices.splice(index,1);
      }
      delete this.physicsBody.forces[nodeId];
      delete this.physicsBody.velocities[nodeId];
      delete this.body.nodes[nodeId];
    }
    while (this.toRemove.edgeIds.length > 0) {
      let edgeId = this.toRemove.edgeIds.pop();
      let index = this.physicsBody.physicsEdgeIndices.indexOf(edgeId);
      if (index > -1) {
        this.physicsBody.physicsEdgeIndices.splice(index,1);
      }
      delete this.body.edges[edgeId];
    }
  }

  initPhysicsData(data) {
    this.physicsBody.forces = {};
    this.physicsBody.physicsNodeIndices = [];
    this.physicsBody.physicsEdgeIndices = [];

    this.body.nodes = data.nodes;
    this.body.edges = data.edges;
    this.addElements(data, false);

    // clean deleted nodes from the velocity vector
    for (let nodeId in this.physicsBody.velocities) {
      if (this.body.nodes[nodeId] === undefined) {
        delete this.physicsBody.velocities[nodeId];
      }
    }
  }

  /**
   * Perform the actual step
   *
   * @param nodeId
   * @param maxVelocity
   * @returns {number}
   * @private
   */
  _performStep(nodeId,maxVelocity) {
    let node = this.body.nodes[nodeId];
    let timestep = this.timestep;
    let forces = this.physicsBody.forces;
    let velocities = this.physicsBody.velocities;

    // store the state so we can revert
    this.previousStates[nodeId] = {x:node.x, y:node.y, vx:velocities[nodeId].x, vy:velocities[nodeId].y};

    if (node.options.fixed.x === false) {
      let dx   = this.modelOptions.damping * velocities[nodeId].x;   // damping force
      let ax   = (forces[nodeId].x - dx) / node.options.mass;        // acceleration
      velocities[nodeId].x += ax * timestep;                         // velocity
      velocities[nodeId].x = (Math.abs(velocities[nodeId].x) > maxVelocity) ? ((velocities[nodeId].x > 0) ? maxVelocity : -maxVelocity) : velocities[nodeId].x;
      node.x   += velocities[nodeId].x * timestep;                    // position
    }
    else {
      forces[nodeId].x = 0;
      velocities[nodeId].x = 0;
    }

    if (node.options.fixed.y === false) {
      let dy   = this.modelOptions.damping * velocities[nodeId].y;    // damping force
      let ay   = (forces[nodeId].y - dy) / node.options.mass;         // acceleration
      velocities[nodeId].y += ay * timestep;                          // velocity
      velocities[nodeId].y = (Math.abs(velocities[nodeId].y) > maxVelocity) ? ((velocities[nodeId].y > 0) ? maxVelocity : -maxVelocity) : velocities[nodeId].y;
      node.y   += velocities[nodeId].y * timestep;                     // position
    }
    else {
      forces[nodeId].y = 0;
      velocities[nodeId].y = 0;
    }

    let totalVelocity = Math.sqrt(Math.pow(velocities[nodeId].x,2) + Math.pow(velocities[nodeId].y,2));
    return totalVelocity;
  }

  _finalizeStabilization() {
    this.sendPositions();
    this.postMessage({
      type: 'finalizeStabilization',
      data: {
        stabilizationIterations: this.stabilizationIterations
      }
    });
  }
}

export default PhysicsWorker;
