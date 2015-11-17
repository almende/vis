import PhysicsWorker from './PhysicsWorker.js';

var physicsWorker = new PhysicsWorker((data) => postMessage(data));
self.addEventListener('message', (event) => physicsWorker.handleMessage(event), false);
