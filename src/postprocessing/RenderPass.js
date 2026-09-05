import * as THREE from '../../vendor/three.module.js';
import { Pass } from './Pass.js';

class RenderPass extends Pass {
  constructor(scene, camera, overrideMaterial = null, clearColor = null, clearAlpha = null) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.overrideMaterial = overrideMaterial;
    this.clearColor = clearColor;
    this.clearAlpha = (clearAlpha !== null) ? clearAlpha : 0;
    this.clear = true;
    this.clearDepth = false;
    this.needsSwap = false;
    this._oldClearColor = new THREE.Color();
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    let oldClearAlpha;
    if (this.clearColor) {
      renderer.getClearColor(this._oldClearColor);
      oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    if (this.clearDepth) {
      renderer.clearDepth();
    }

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);

    if (this.clear) {
      renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    }

    if (this.overrideMaterial !== null) {
      this.scene.overrideMaterial = this.overrideMaterial;
    }

    renderer.render(this.scene, this.camera);

    if (this.overrideMaterial !== null) {
      this.scene.overrideMaterial = null;
    }

    if (this.clearColor) {
      renderer.setClearColor(this._oldClearColor, oldClearAlpha);
    }

    renderer.autoClear = oldAutoClear;
  }
}

export { RenderPass };
