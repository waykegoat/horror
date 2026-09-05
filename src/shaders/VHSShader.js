import * as THREE from 'three';

/**
 * Diegetic CRT / CCTV Monitor Post-Processing Shader
 * Features:
 * - Crystal clear bright picture (zero muddy darkness!)
 * - Subtle CRT barrel curvature & glass glare
 * - Faint phosphor scanlines
 * - Low-intensity film grain
 * - Glitch burst only during critical failure / jumpscare
 */
export const VHSShader = {
  name: 'VHSShader',

  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
    uGlitchIntensity: { value: 0.0 },     // 0.0 normal, 1.0 jumpscare/overload
    uAberration: { value: 0.0015 },       // Very slight edge dispersion
    uScanlinesIntensity: { value: 0.06 }, // Barely visible CRT lines
    uGrainIntensity: { value: 0.025 },    // Gentle analog grain
    uLensCurvature: { value: 0.025 }      // Subtle CRT monitor glass curve
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGlitchIntensity;
    uniform float uAberration;
    uniform float uScanlinesIntensity;
    uniform float uGrainIntensity;
    uniform float uLensCurvature;

    varying vec2 vUv;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // CRT Screen barrel distortion
    vec2 curveUV(vec2 uv) {
      vec2 center = uv - 0.5;
      float dist = dot(center, center);
      return uv + center * (dist * uLensCurvature);
    }

    void main() {
      vec2 uv = curveUV(vUv);

      // CRT monitor black bezel border
      if (uv.x < 0.005 || uv.x > 0.995 || uv.y < 0.005 || uv.y > 0.995) {
        gl_FragColor = vec4(0.04, 0.04, 0.05, 1.0);
        return;
      }

      // Glitch displacement (only when threat is high or jumpscare)
      if (uGlitchIntensity > 0.1) {
        float tracking = sin(uv.y * 12.0 - uTime * 10.0);
        float lineGlitch = smoothstep(0.92, 1.0, tracking) * uGlitchIntensity;
        uv.x += (hash(vec2(uTime * 15.0, uv.y * 25.0)) - 0.5) * 0.04 * lineGlitch;
      }

      // Chromatic dispersion
      vec2 distFromCenter = uv - 0.5;
      float rDist = length(distFromCenter);
      float totalAberration = uAberration + uGlitchIntensity * 0.015;

      vec2 uvR = uv + distFromCenter * totalAberration;
      vec2 uvG = uv;
      vec2 uvB = uv - distFromCenter * totalAberration;

      float colR = texture2D(tDiffuse, uvR).r;
      float colG = texture2D(tDiffuse, uvG).g;
      float colB = texture2D(tDiffuse, uvB).b;
      vec3 color = vec3(colR, colG, colB);

      // Ultra-soft CRT scanlines
      float scanline = sin(uv.y * uResolution.y * 0.65) * 0.5 + 0.5;
      color -= scanline * uScanlinesIntensity * color;

      // Analog grain
      float grain = (hash(uv * uResolution + fract(uTime * 21.3)) - 0.5) * (uGrainIntensity + uGlitchIntensity * 0.05);
      color += grain;

      // CRT phosphor glass glow
      color += vec3(0.015, 0.02, 0.015);

      // Analog phosphor halation on bright highlights (lights, sparks, filaments)
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      if (lum > 0.58) {
        float bloom = (lum - 0.58) * 0.35;
        color += vec3(bloom * 1.15, bloom * 0.95, bloom * 0.65);
      }

      // Soft vignette for CRT glass feel
      float vignette = 1.0 - rDist * 0.25;
      color *= clamp(vignette, 0.75, 1.0);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};
