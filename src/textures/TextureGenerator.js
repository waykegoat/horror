import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for Ultra-Realistic 3D Psychological Horror
 * Generates high-detail diffuse maps, tangent-space normal maps, roughness maps,
 * contact shadows, volumetric light beams, and smoke particles directly via HTML5 Canvas.
 */
export class TextureGenerator {
  /**
   * --- 1. SOVIET DAMASK WALLPAPER & WAINSCOTING (PBR) ---
   */
  static createRoomWallCanvas() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base aged cream-beige plaster
    ctx.fillStyle = '#cfc5b2';
    ctx.fillRect(0, 0, size, size);

    // Grunge & plaster texture noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Damask floral wallpaper on top 70% of wall
    const wallH = size * 0.7;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size, wallH);
    ctx.clip();

    ctx.strokeStyle = '#b8ad98';
    ctx.lineWidth = 2.5;
    const stepX = 48;
    const stepY = 60;

    for (let y = 0; y < wallH + stepY; y += stepY) {
      for (let x = 0; x < size + stepX; x += stepX) {
        const ox = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
        const cx = x + ox;
        const cy = y;

        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.bezierCurveTo(cx + 14, cy - 8, cx + 14, cy + 8, cx, cy + 18);
        ctx.bezierCurveTo(cx - 14, cy + 8, cx - 14, cy - 8, cx, cy - 18);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#a69a84';
        ctx.fill();
      }
    }

    // Cracks & plaster peeling
    ctx.strokeStyle = 'rgba(70, 60, 50, 0.5)';
    ctx.lineWidth = 1.2;
    for (let c = 0; c < 6; c++) {
      let kx = 50 + Math.random() * (size - 100);
      let ky = 30 + Math.random() * (wallH - 80);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      for (let s = 0; s < 4; s++) {
        kx += (Math.random() - 0.5) * 28;
        ky += Math.random() * 20;
        ctx.lineTo(kx, ky);
      }
      ctx.stroke();
    }

    // Water stains near ceiling
    const waterGrad = ctx.createLinearGradient(0, 0, 0, 120);
    waterGrad.addColorStop(0, 'rgba(80, 60, 40, 0.3)');
    waterGrad.addColorStop(1, 'rgba(80, 60, 40, 0)');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, size, 120);
    ctx.restore();

    // Carved mahogany chair rail molding
    const midY = wallH;
    const railH = 24;
    const railGrad = ctx.createLinearGradient(0, midY, 0, midY + railH);
    railGrad.addColorStop(0, '#754724');
    railGrad.addColorStop(0.3, '#543015');
    railGrad.addColorStop(0.7, '#3d220d');
    railGrad.addColorStop(1, '#241306');
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, midY, size, railH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, midY, size, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, midY + railH - 2, size, 2);

    // Lower wainscoting wood panels
    const wainY = midY + railH;
    const wainH = size - wainY;
    const wainGrad = ctx.createLinearGradient(0, wainY, 0, size);
    wainGrad.addColorStop(0, '#543117');
    wainGrad.addColorStop(1, '#3b210e');
    ctx.fillStyle = wainGrad;
    ctx.fillRect(0, wainY, size, wainH);

    const panelWidth = 96;
    for (let x = 0; x < size; x += panelWidth) {
      ctx.fillStyle = '#2b1708';
      ctx.fillRect(x, wainY, 6, wainH);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + 6, wainY, 2, wainH);

      ctx.strokeStyle = '#2b1708';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 14, wainY + 12, panelWidth - 28, wainH - 24);
    }

    return canvas;
  }

  static createRoomWall() {
    const canvas = this.createRoomWallCanvas();
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  static createRoomWallPBR() {
    const canvas = this.createRoomWallCanvas();
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = this.createNormalMapFromCanvas(canvas, 2.0);
    const roughnessMap = this.createRoughnessMapFromCanvas(canvas, 0.78, 0.22);
    return { map, normalMap, roughnessMap };
  }

  /**
   * --- 2. OAK HERRINGBONE PARQUET WOOD FLOOR (PBR) ---
   */
  static createWoodFloorCanvas() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#653a15';
    ctx.fillRect(0, 0, size, size);

    const plankW = 96;
    const plankH = 24;
    const woodColors = ['#824c1e', '#734117', '#8a5323', '#683914', '#965a27', '#78441a'];

    for (let y = -plankW; y < size + plankW; y += plankH) {
      const rowIdx = Math.floor(y / plankH);
      const isAlt = rowIdx % 2 === 0;

      for (let x = -plankW; x < size + plankW; x += plankW) {
        const px = isAlt ? x : x - plankW / 2;
        const colorIdx = Math.abs(Math.floor((px * 7 + y * 13) / 100)) % woodColors.length;

        ctx.fillStyle = woodColors[colorIdx];
        ctx.fillRect(px, y, plankW, plankH);

        // Wood grain fibers
        ctx.strokeStyle = 'rgba(30, 15, 5, 0.3)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          const gy = y + 3 + g * 5;
          ctx.beginPath();
          ctx.moveTo(px, gy);
          ctx.bezierCurveTo(px + plankW * 0.3, gy + 2, px + plankW * 0.7, gy - 1, px + plankW, gy);
          ctx.stroke();
        }

        // Dark bevel seams
        ctx.strokeStyle = '#1e0c02';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(px, y, plankW, plankH);

        // Varnish specular highlight on top edge
        ctx.strokeStyle = 'rgba(255, 230, 180, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, y + 1);
        ctx.lineTo(px + plankW - 2, y + 1);
        ctx.stroke();
      }
    }

    // Scuff and wear noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() - 0.5) * 16;
      d[i] += v;
      d[i + 1] += v;
      d[i + 2] += v;
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas;
  }

  static createWoodFloor() {
    const canvas = this.createWoodFloorCanvas();
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  static createWoodFloorPBR() {
    const canvas = this.createWoodFloorCanvas();
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = this.createNormalMapFromCanvas(canvas, 2.4);
    // Roughness: high varnish reflections in center, worn matte at edges
    const roughnessMap = this.createRoughnessMapFromCanvas(canvas, 0.35, 0.35);
    return { map, normalMap, roughnessMap };
  }

  /**
   * --- 3. SOVIET MEDALLION WOOL RUG (PBR) ---
   */
  static createRugCanvas() {
    const w = 512;
    const h = 384;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#5c1016';
    ctx.fillRect(0, 0, w, h);

    // Fringe edges
    ctx.fillStyle = '#dfd8c8';
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);

    // Dark forest green border
    ctx.fillStyle = '#163120';
    ctx.fillRect(16, 16, w - 32, h - 32);

    // Gold decorative inner border
    ctx.strokeStyle = '#c48f27';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    ctx.fillStyle = '#731720';
    ctx.fillRect(34, 34, w - 68, h - 68);

    // Center medallion
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#163120';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 105, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c48f27';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#c48f27';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 65, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#731720';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 38, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wool texture noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 24;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas;
  }

  static createRug() {
    const canvas = this.createRugCanvas();
    return new THREE.CanvasTexture(canvas);
  }

  static createRugPBR() {
    const canvas = this.createRugCanvas();
    const map = new THREE.CanvasTexture(canvas);
    const normalMap = this.createNormalMapFromCanvas(canvas, 1.4);
    const roughnessMap = this.createRoughnessMapFromCanvas(canvas, 0.94, 0.06);
    return { map, normalMap, roughnessMap };
  }

  /**
   * --- 4. CEILING PLASTER (PBR) ---
   */
  static createCeilingCanvas() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ece7db';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(150, 140, 130, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);

    return canvas;
  }

  static createCeiling() {
    const canvas = this.createCeilingCanvas();
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  static createCeilingPBR() {
    const canvas = this.createCeilingCanvas();
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = this.createNormalMapFromCanvas(canvas, 1.2);
    const roughnessMap = this.createRoughnessMapFromCanvas(canvas, 0.92, 0.08);
    return { map, normalMap, roughnessMap };
  }

  /**
   * --- 5. HEAVY INDUSTRIAL STEEL DOOR (PBR) ---
   */
  static createDoorCanvas(isLatched) {
    const w = 512;
    const h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2d3733';
    ctx.fillRect(0, 0, w, h);

    // Hazard stripes
    const drawHazard = (startY, height) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, startY, w, height);
      ctx.clip();
      ctx.fillStyle = '#cf9915';
      ctx.fillRect(0, startY, w, height);
      ctx.fillStyle = '#181e1c';
      for (let x = -height; x < w + height; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, startY + height);
        ctx.lineTo(x + 18, startY + height);
        ctx.lineTo(x + 18 + height, startY);
        ctx.lineTo(x + height, startY);
        ctx.fill();
      }
      ctx.restore();
    };

    drawHazard(40, 48);
    drawHazard(h - 96, 48);

    // Steel reinforcement bands
    ctx.fillStyle = '#1e2422';
    ctx.fillRect(25, 120, w - 50, 24);
    ctx.fillRect(25, 480, w - 50, 24);
    ctx.fillRect(25, 840, w - 50, 24);

    // Rivet studs
    ctx.fillStyle = '#5c6763';
    for (let y of [132, 492, 852]) {
      for (let x = 45; x < w - 35; x += 38) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141816';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c6763';
      }
    }

    // Peephole
    ctx.fillStyle = '#bf9543';
    ctx.beginPath();
    ctx.arc(w / 2, 340, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f1110';
    ctx.beginPath();
    ctx.arc(w / 2, 340, 16, 0, Math.PI * 2);
    ctx.fill();

    // Deadbolt Housing
    const boltY = 560;
    ctx.fillStyle = '#161a18';
    ctx.fillRect(75, boltY, w - 150, 85);
    ctx.strokeStyle = '#39423e';
    ctx.lineWidth = 4;
    ctx.strokeRect(75, boltY, w - 150, 85);

    // Steel bolt bar
    ctx.fillStyle = '#8b9698';
    if (isLatched) {
      ctx.fillRect(45, boltY + 20, w - 120, 45);
    } else {
      ctx.fillRect(145, boltY + 20, 175, 45);
    }

    // Stencil ID Plate
    ctx.fillStyle = '#d5d1c8';
    ctx.fillRect(w / 2 - 105, 220, 210, 52);
    ctx.fillStyle = '#141615';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ПОСТ 104 // ОХРАНА', w / 2, 254);

    return canvas;
  }

  static createDoorTexture(isLatched) {
    const canvas = this.createDoorCanvas(isLatched);
    return new THREE.CanvasTexture(canvas);
  }

  static createDoorPBR(isLatched) {
    const canvas = this.createDoorCanvas(isLatched);
    const map = new THREE.CanvasTexture(canvas);
    const normalMap = this.createNormalMapFromCanvas(canvas, 2.2);
    const roughnessMap = this.createRoughnessMapFromCanvas(canvas, 0.55, 0.35);
    return { map, normalMap, roughnessMap };
  }

  /**
   * --- 6. ELECTRIC FUSE BOX (PBR) ---
   */
  static createFuseBoxCanvas(isSparking) {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#394046';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e2226';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, w, h);

    // Warning triangle
    ctx.fillStyle = '#dfa009';
    ctx.beginPath();
    ctx.moveTo(w / 2, 30);
    ctx.lineTo(w / 2 - 40, 95);
    ctx.lineTo(w / 2 + 40, 95);
    ctx.fill();

    // Black lightning
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(w / 2 + 5, 42);
    ctx.lineTo(w / 2 - 14, 72);
    ctx.lineTo(w / 2 + 2, 72);
    ctx.lineTo(w / 2 - 7, 90);
    ctx.lineTo(w / 2 + 14, 62);
    ctx.lineTo(w / 2 - 2, 62);
    ctx.fill();

    // Breakers bay
    ctx.fillStyle = '#16191c';
    ctx.fillRect(24, 120, w - 48, 215);

    for (let i = 0; i < 4; i++) {
      const by = 138 + i * 46;
      ctx.fillStyle = '#282d32';
      ctx.fillRect(36, by, w - 72, 34);

      ctx.fillStyle = isSparking ? '#ef4444' : '#22c55e';
      ctx.fillRect(50, by + 4, 36, 26);

      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ЛИНИЯ ${i + 1}`, 100, by + 21);
    }

    // Status LED
    ctx.fillStyle = isSparking ? '#ff0000' : '#00ff44';
    ctx.shadowColor = isSparking ? '#ff0000' : '#00ff44';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(w / 2, 385, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isSparking ? 'АВАРИЯ СЕТИ' : '220V // НОРМА', w / 2, 435);

    return canvas;
  }

  static createFuseBox(isSparking) {
    const canvas = this.createFuseBoxCanvas(isSparking);
    return new THREE.CanvasTexture(canvas);
  }

  static createFuseBoxPBR(isSparking) {
    const canvas = this.createFuseBoxCanvas(isSparking);
    const map = new THREE.CanvasTexture(canvas);
    const normalMap = this.createNormalMapFromCanvas(canvas, 2.4);
    const roughnessMap = this.createRoughnessMapFromCanvas(canvas, 0.48, 0.32);
    return { map, normalMap, roughnessMap };
  }

  /**
   * --- 7. CAST-IRON RADIATOR TEXTURE ---
   */
  static createRadiator() {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#abb0b5';
    ctx.fillRect(0, 0, w, h);

    const ribW = 32;
    for (let x = 0; x < w; x += ribW) {
      const grad = ctx.createLinearGradient(x, 0, x + ribW, 0);
      grad.addColorStop(0, '#3a4045');
      grad.addColorStop(0.3, '#c8ced4');
      grad.addColorStop(0.7, '#c8ced4');
      grad.addColorStop(1, '#2a2e32');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, ribW, h);

      ctx.fillStyle = 'rgba(110, 45, 15, 0.35)';
      ctx.fillRect(x + 4, h - 80, ribW - 8, 80);
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    return map;
  }

  /**
   * --- 8. SOVIET ROTARY TELEPHONE ТА-68 ---
   */
  static createTelephoneTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#171613';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2 + 20;
    ctx.fillStyle = '#e4ded0';
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#171613';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px sans-serif';

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 1.6 + 0.6;
      const hx = cx + Math.cos(angle) * 44;
      const hy = cy + Math.sin(angle) * 44;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      const digit = (i + 1) % 10;
      ctx.fillText(digit.toString(), hx, hy);
    }

    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 9. CRT TV SCREEN TEXTURE (Anomaly Face & Static) ---
   */
  static createTVScreenCanvas() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }

  static drawTVScreen(canvas, isTurnedOn) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;

    if (!isTurnedOn) {
      ctx.fillStyle = '#0a0d11';
      ctx.fillRect(0, 0, size, size);

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, 'rgba(255,255,255,0.12)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.02)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else {
      const imgData = ctx.createImageData(size, size);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = Math.random() > 0.35 ? 170 + Math.random() * 85 : 15 + Math.random() * 60;
        d[i] = val * 0.75;
        d[i + 1] = val * 0.9;
        d[i + 2] = val;
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      // Tracking glitches
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      const barY = Math.random() * (size - 30);
      ctx.fillRect(0, barY, size, 20);

      // Distorted skull/demon apparition
      ctx.fillStyle = 'rgba(8, 4, 8, 0.88)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2 + 5, 54, 78, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing red eyes
      ctx.fillStyle = '#ff1111';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(size / 2 - 20, size / 2 - 8, 6, 0, Math.PI * 2);
      ctx.arc(size / 2 + 20, size / 2 - 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Screaming mouth
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2 + 40, 22, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // OSD
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('СИГНАЛ 404', 16, 28);
    }
  }

  /**
   * --- 10. WINDOW VIEW CANVAS ---
   */
  static createWindowCanvas() {
    const w = 512;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  static drawWindow(canvas, state, time = 0, lightningVal = 0) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    if (state === 'dawn') {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#ff9e00');
      skyGrad.addColorStop(0.35, '#ffbe0b');
      skyGrad.addColorStop(0.7, '#a2d2ff');
      skyGrad.addColorStop(1, '#3a86ff');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      const sunGrad = ctx.createRadialGradient(w * 0.65, h * 0.45, 10, w * 0.65, h * 0.45, 180);
      sunGrad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
      sunGrad.addColorStop(0.3, 'rgba(255, 210, 100, 0.85)');
      sunGrad.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#1b3824';
      for (let t = 0; t < 7; t++) {
        const tx = t * 80 + 10;
        ctx.beginPath();
        ctx.moveTo(tx, h);
        ctx.lineTo(tx + 40, h * 0.45);
        ctx.lineTo(tx + 80, h);
        ctx.fill();
      }
      return;
    }

    // 1. Night Sky Background with dynamic storm clouds & lightning
    if (lightningVal > 0.05) {
      // Lightning flash sky
      const flashGrad = ctx.createLinearGradient(0, 0, 0, h);
      const intensity = Math.min(1.0, lightningVal);
      flashGrad.addColorStop(0, `rgba(210, 230, 255, ${0.75 * intensity})`);
      flashGrad.addColorStop(0.4, `rgba(140, 175, 220, ${0.65 * intensity})`);
      flashGrad.addColorStop(1, `rgba(40, 60, 90, ${0.85 * intensity})`);
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant jagged lightning bolt
      if (lightningVal > 0.3) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1.0, lightningVal * 1.2)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let lx = w * 0.35;
        let ly = 10;
        ctx.moveTo(lx, ly);
        while (ly < h * 0.5) {
          lx += (Math.random() - 0.5) * 28;
          ly += 18 + Math.random() * 20;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    } else {
      // Deep stormy midnight sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#03060a');
      skyGrad.addColorStop(0.6, '#060a12');
      skyGrad.addColorStop(1, '#09101c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Faint cold moon glow through dense storm clouds
      const moonGrad = ctx.createRadialGradient(w * 0.72, h * 0.22, 10, w * 0.72, h * 0.22, 190);
      moonGrad.addColorStop(0, 'rgba(160, 205, 250, 0.35)');
      moonGrad.addColorStop(0.5, 'rgba(80, 110, 150, 0.1)');
      moonGrad.addColorStop(1, 'rgba(3, 6, 10, 0)');
      ctx.fillStyle = moonGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Silhouetted Pine Forest
    ctx.fillStyle = lightningVal > 0.1 ? '#010305' : '#04070c';
    for (let t = 0; t < 7; t++) {
      const tx = t * 85 - 15;
      const treeH = h * (0.35 + (t % 3) * 0.08);
      ctx.beginPath();
      ctx.moveTo(tx, h);
      ctx.lineTo(tx + 42, h - treeH);
      ctx.lineTo(tx + 84, h);
      ctx.fill();
    }

    // 3. Paranormal Monster Apparition Outside Window
    if (state === true) {
      // Menacing towering shadow
      ctx.fillStyle = lightningVal > 0.1 ? '#000000' : '#080c10';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.52, 85, 130, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w / 2 - 90, h * 0.7, 180, h * 0.3);

      // Long skeletal shoulders & neck
      ctx.fillRect(w / 2 - 50, h * 0.42, 100, 70);

      // Piercing glowing red eyes with intense inner core
      ctx.fillStyle = '#ff1111';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(w / 2 - 28, h * 0.46, 14, 0, Math.PI * 2);
      ctx.arc(w / 2 + 28, h * 0.46, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w / 2 - 28, h * 0.46, 4.5, 0, Math.PI * 2);
      ctx.arc(w / 2 + 28, h * 0.46, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Razor-sharp claw gouges across the window pane
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.8;
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 - 55 + c * 34, h * 0.28);
        ctx.lineTo(w / 2 - 32 + c * 34, h * 0.65);
        ctx.stroke();
      }
    }

    // 4. Dynamic Animated Rain Rivulets & Condensation Water Beads
    // Sliding streaks
    ctx.strokeStyle = 'rgba(195, 220, 245, 0.32)';
    ctx.lineWidth = 1.6;
    for (let r = 0; r < 36; r++) {
      const speed = 140 + (r % 6) * 45;
      const ry = ((r * 71 + time * speed) % (h + 80)) - 40;
      const rx = (r * 39 + Math.sin(ry * 0.05 + r) * 2.5) % w;
      const len = 24 + (r % 5) * 8;

      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 1, ry + len);
      ctx.stroke();

      // Droplet head bead
      ctx.fillStyle = 'rgba(220, 240, 255, 0.48)';
      ctx.beginPath();
      ctx.arc(rx + 1, ry + len, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Static condensed droplet beads on glass pane
    for (let b = 0; b < 28; b++) {
      const bx = (b * 97) % (w - 20) + 10;
      const by = (b * 67) % (h - 20) + 10;
      const br = 1.2 + (b % 4) * 0.6;
      ctx.fillStyle = 'rgba(210, 235, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();

      // Specular glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(bx - 0.5, by - 0.5, 1, 1);
    }

    // Frosted condensation edge vignette
    const edgeGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, w * 0.52);
    edgeGrad.addColorStop(0, 'rgba(100, 130, 160, 0)');
    edgeGrad.addColorStop(1, 'rgba(40, 60, 85, 0.35)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * --- 11. WALL CLOCK TEXTURE ---
   */
  static createClockTexture(hour, minute) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f4efe4';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2c16';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.fillStyle = '#1c1b18';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px serif';

    for (let h = 1; h <= 12; h++) {
      const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const x = size / 2 + Math.cos(angle) * 88;
      const y = size / 2 + Math.sin(angle) * 88;
      ctx.fillText(h.toString(), x, y);
    }

    const center = size / 2;
    const hourAngle = ((hour % 12 + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(hourAngle) * 52, center + Math.sin(hourAngle) * 52);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(minAngle) * 78, center + Math.sin(minAngle) * 78);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 11b. SOVIET SAFETY POSTER TEXTURE ---
   */
  static createSafetyPosterTexture() {
    const w = 384;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Aged yellowed paper
    ctx.fillStyle = '#e8dec8';
    ctx.fillRect(0, 0, w, h);

    // Weathered paper borders
    ctx.fillStyle = 'rgba(120, 80, 40, 0.18)';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 12, w, 12);
    ctx.fillRect(0, 0, 12, h);
    ctx.fillRect(w - 12, 0, 12, h);

    // Red top header banner
    ctx.fillStyle = '#b31b1b';
    ctx.fillRect(16, 16, w - 32, 60);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('СОВЕРШЕННО СЕКРЕТНО', w / 2, 42);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ОБЪЕКТ 104 // ОХРАННЫЙ ПЕРИМЕТР', w / 2, 64);

    // Warning Triangle
    const cx = w / 2;
    const cy = 180;
    ctx.strokeStyle = '#b31b1b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 65);
    ctx.lineTo(cx + 70, cy + 50);
    ctx.lineTo(cx - 70, cy + 50);
    ctx.closePath();
    ctx.stroke();

    // Eyeball / Exclamation symbol in triangle
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b31b1b';
    ctx.beginPath();
    ctx.arc(cx, cy + 5, 10, 0, Math.PI * 2);
    ctx.fill();

    // Main warning slogan
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('НЕ ПОКИДАТЬ ПОСТ!', w / 2, 275);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('ИНСТРУКЦИЯ ДЕЖУРНОГО ОПЕРАТОРА:', w / 2, 310);

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('1. При шуме кинескопа — обесточить телевизор [E].', 36, 340);
    ctx.fillText('2. При скрипе за стеклом — закрыть бархатные шторы [E].', 36, 365);
    ctx.fillText('3. При ударах в дверь — немедленно запереть засов [E].', 36, 390);
    ctx.fillText('4. При искрении щитка — восстановить автомат [E].', 36, 415);

    // Red stamp
    ctx.strokeStyle = 'rgba(180, 20, 20, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(w - 140, h - 70, 115, 45);
    ctx.fillStyle = 'rgba(180, 20, 20, 0.7)';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ОТДЕЛ № 9', w - 128, h - 48);
    ctx.font = '10px monospace';
    ctx.fillText('ДОПУСК ОГР.', w - 128, h - 34);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 11c. SOVIET 1986 WALL CALENDAR TEXTURE ---
   */
  static createCalendarTexture() {
    const w = 256;
    const h = 320;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // White/ivory paper
    ctx.fillStyle = '#f8f4eb';
    ctx.fillRect(0, 0, w, h);

    // Top red header
    ctx.fillStyle = '#c5221f';
    ctx.fillRect(0, 0, w, 75);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('СЕНТЯБРЬ 1986', w / 2, 34);
    ctx.font = '13px sans-serif';
    ctx.fillText('СУББОТА', w / 2, 58);

    // Big day number
    ctx.fillStyle = '#c5221f';
    ctx.font = 'bold 110px serif';
    ctx.fillText('6', w / 2, 185);

    // Red ballpoint pen handwriting reminder
    ctx.strokeStyle = 'rgba(200, 30, 30, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w / 2, 150, 68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#9b1b1b';
    ctx.font = 'italic bold 11px sans-serif';
    ctx.fillText('СМЕНА 00:00 - 06:00!', w / 2, 235);
    ctx.fillText('ПРОВЕРИТЬ ЗАСОВ И ЩИТОК!', w / 2, 255);

    ctx.fillStyle = '#555555';
    ctx.font = '10px serif';
    ctx.fillText('Восход: 06:00 • Заход: 19:42', w / 2, 290);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 11d. OLD TECHNICAL BOOK SPINES TEXTURE ---
   */
  static createBookSpinesTexture() {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const bookColors = ['#5a181b', '#1a3824', '#1a2b48', '#382818', '#662211', '#283438', '#421a22', '#222d1f'];
    const titles = [
      'ГОСТ 12.1.004',
      'ОХРАНА ТРУДА',
      'РАДИО Р-326',
      'ИНСТРУКЦИЯ',
      'АРХИВ № 104',
      'ТЕХНИКА СВЯЗИ',
      'АТЛАС ЭСССР',
      'ПРАВИЛА ПУЭ'
    ];

    const bookW = w / bookColors.length;

    for (let i = 0; i < bookColors.length; i++) {
      const bx = i * bookW;

      // Leatherette spine gradient
      const grad = ctx.createLinearGradient(bx, 0, bx + bookW, 0);
      grad.addColorStop(0, '#111');
      grad.addColorStop(0.2, bookColors[i]);
      grad.addColorStop(0.8, bookColors[i]);
      grad.addColorStop(1, '#111');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, 0, bookW, h);

      // Gold embossed ribs
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(bx + 2, 25, bookW - 4, 3);
      ctx.fillRect(bx + 2, 32, bookW - 4, 2);
      ctx.fillRect(bx + 2, h - 35, bookW - 4, 3);
      ctx.fillRect(bx + 2, h - 28, bookW - 4, 2);

      // Vertical title
      ctx.save();
      ctx.translate(bx + bookW / 2, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#e5c158';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(titles[i], 0, 4);
      ctx.restore();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 12. PBR HELPER: TANGENT-SPACE NORMAL MAP (Sobel Filter) ---
   */
  static createNormalMapFromCanvas(srcCanvas, strength = 1.8) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const normCanvas = document.createElement('canvas');
    normCanvas.width = w;
    normCanvas.height = h;
    const normCtx = normCanvas.getContext('2d');

    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h).data;
    const normImg = normCtx.createImageData(w, h);
    const dst = normImg.data;

    const getIntensity = (x, y) => {
      const px = (Math.max(0, Math.min(w - 1, x)) + Math.max(0, Math.min(h - 1, y)) * w) * 4;
      return (srcData[px] * 0.299 + srcData[px + 1] * 0.587 + srcData[px + 2] * 0.114) / 255.0;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tl = getIntensity(x - 1, y - 1);
        const t  = getIntensity(x,     y - 1);
        const tr = getIntensity(x + 1, y - 1);
        const l  = getIntensity(x - 1, y);
        const r  = getIntensity(x + 1, y);
        const bl = getIntensity(x - 1, y + 1);
        const b  = getIntensity(x,     y + 1);
        const br = getIntensity(x + 1, y + 1);

        const dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
        const dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

        let nx = -dx * strength;
        let ny = -dy * strength;
        let nz = 1.0;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (x + y * w) * 4;
        dst[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
        dst[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        dst[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        dst[idx + 3] = 255;
      }
    }

    normCtx.putImageData(normImg, 0, 0);
    const tex = new THREE.CanvasTexture(normCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /**
   * --- 13. PBR HELPER: ROUGHNESS MAP ---
   */
  static createRoughnessMapFromCanvas(srcCanvas, baseRoughness = 0.5, variation = 0.35) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = w;
    roughCanvas.height = h;
    const roughCtx = roughCanvas.getContext('2d');

    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h).data;
    const roughImg = roughCtx.createImageData(w, h);
    const dst = roughImg.data;

    for (let i = 0; i < srcData.length; i += 4) {
      const lum = (srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114) / 255.0;
      const val = Math.min(255, Math.max(0, Math.floor((baseRoughness + (lum - 0.5) * variation) * 255)));
      dst[i] = val;
      dst[i + 1] = val;
      dst[i + 2] = val;
      dst[i + 3] = 255;
    }

    roughCtx.putImageData(roughImg, 0, 0);
    const tex = new THREE.CanvasTexture(roughCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /**
   * --- 14. CONTACT SHADOW / AMBIENT OCCLUSION ---
   */
  static createContactShadowTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 15. VOLUMETRIC LIGHT BEAM GRADIENT ---
   */
  static createLightBeamTexture() {
    const w = 128;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, 'rgba(255, 235, 190, 0.35)');
    gradV.addColorStop(0.2, 'rgba(255, 235, 190, 0.18)');
    gradV.addColorStop(0.8, 'rgba(255, 235, 190, 0.05)');
    gradV.addColorStop(1, 'rgba(255, 235, 190, 0)');

    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * --- 16. CIGARETTE SMOKE PARTICLE TEXTURE ---
   */
  static createSmokeParticleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(210, 215, 225, 0.6)');
    grad.addColorStop(0.4, 'rgba(200, 205, 215, 0.25)');
    grad.addColorStop(1, 'rgba(200, 205, 215, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }
}
