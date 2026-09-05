import * as THREE from '../../vendor/three.module.js';
import { Pass, FullScreenQuad } from './Pass.js';

class ShaderPass extends Pass {
  constructor(shader, textureID = 'tDiffuse') {
    super();

    this.textureID = textureID;

    if (shader instanceof THREE.ShaderMaterial) {
      this.uniforms = shader.uniforms;
      this.material = shader;
    } else if (shader) {
      this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
      this.material = new THREE.ShaderMaterial({
        name: (shader.name !== undefined) ? shader.name : 'unnamed',
        defines: Object.assign({}, shader.defines),
        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
      });
    }

    this.fsQuad = new FullScreenQuad(this.material);
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = readBuffer.texture;
    }

    this.fsQuad.material = this.material;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
      this.fsQuad.render(renderer);
    }
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

export { ShaderPass };
