import * as THREE from '../../vendor/three.module.js';

class Pass {
  constructor() {
    this.isPass = true;
    this.enabled = true;
    this.needsSwap = true;
    this.clear = false;
    this.renderToScreen = false;
  }

  setSize(/* width, height */) {}

  render(/* renderer, writeBuffer, readBuffer, deltaTime, maskActive */) {
    console.error('THREE.Pass: .render() must be implemented in derived pass.');
  }

  dispose() {}
}

const _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
class FullScreenQuad {
  constructor(material) {
    this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  }

  dispose() {
    this._mesh.geometry.dispose();
  }

  render(renderer) {
    renderer.render(this._mesh, _camera);
  }

  get material() {
    return this._mesh.material;
  }

  set material(value) {
    this._mesh.material = value;
  }
}

export { Pass, FullScreenQuad };
