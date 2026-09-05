import * as THREE from 'three';

/**
 * Procedural Texture Generator for Single-Room Night Shift Survival
 * Generates clear, high-detail textures on HTML5 Canvas.
 */
export class TextureGenerator {
  /**
   * Warm Soviet Wallpaper with wooden baseboard
   */
  static createRoomWall() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Upper wallpaper: Warm cream/pale-amber vintage wallpaper
    ctx.fillStyle = '#d9d0c1';
    ctx.fillRect(0, 0, size, size);

    // Wallpaper subtle floral/geometric stripe pattern
    ctx.strokeStyle = '#c4bba9';
    ctx.lineWidth = 3;
    for (let x = 0; x < size; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size * 0.7);
      ctx.stroke();
    }

    // 2. Middle decorative wooden molding stripe
    const midY = size * 0.7;
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, midY, size, 24);

    // 3. Lower wood wainscoting panels
    ctx.fillStyle = '#7a4e2d';
    ctx.fillRect(0, midY + 24, size, size - (midY + 24));

    // Panel vertical seams
    ctx.fillStyle = '#4a2c16';
    for (let x = 0; x < size; x += 80) {
      ctx.fillRect(x, midY + 24, 4, size - (midY + 24));
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  /**
   * Polished Parquet Wooden Floor
   */
  static createWoodFloor() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, size, size);

    // Parquet herringbone blocks
    const plankW = 64;
    const plankH = 16;
    ctx.strokeStyle = '#4a2e12';
    ctx.lineWidth = 2;

    for (let y = 0; y < size; y += plankH) {
      const isAlt = (y / plankH) % 2 === 0;
      for (let x = 0; x < size; x += plankW) {
        ctx.fillStyle = (x + y) % 32 === 0 ? '#9c6633' : '#7f5227';
        const px = isAlt ? x : x - plankW / 2;
        ctx.fillRect(px, y, plankW, plankH);
        ctx.strokeRect(px, y, plankW, plankH);
      }
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  /**
   * Ceiling Plaster Texture
   */
  static createCeiling() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ece8df';
    ctx.fillRect(0, 0, size, size);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  /**
   * CRT TV Screen Texture (can render TV Off or Anomaly Static)
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
      // Off: dark reflective glass with faint room reflection
      ctx.fillStyle = '#111418';
      ctx.fillRect(0, 0, size, size);
      // Glare highlight
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else {
      // On (Anomaly): bright flickering static noise & eerie distorted face!
      const imgData = ctx.createImageData(size, size);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = Math.random() > 0.4 ? 180 + Math.random() * 75 : 20 + Math.random() * 50;
        d[i] = val * 0.8;       // R
        d[i + 1] = val * 0.9;   // G
        d[i + 2] = val;         // B (bluish CRT static)
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      // Creepy shadowy face silhouette in center
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 50, 0, Math.PI * 2);
      ctx.fill();

      // Glowing red eyes
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(size / 2 - 18, size / 2 - 10, 8, 0, Math.PI * 2);
      ctx.arc(size / 2 + 18, size / 2 - 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // OSD Text
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('КАНАЛ 404', 20, 35);
    }
  }

  /**
   * Window Glass (Outside Night / Window Monster)
   */
  static createWindowCanvas() {
    const w = 512;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  static drawWindow(canvas, hasMonster) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Dark night outside with misty trees
    ctx.fillStyle = '#0a1016';
    ctx.fillRect(0, 0, w, h);

    // Moon glow
    const grad = ctx.createRadialGradient(w * 0.7, h * 0.25, 10, w * 0.7, h * 0.25, 180);
    grad.addColorStop(0, 'rgba(200, 220, 255, 0.4)');
    grad.addColorStop(1, 'rgba(10, 16, 22, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Pine trees silhouettes
    ctx.fillStyle = '#05070a';
    for (let t = 0; t < 6; t++) {
      const tx = t * 90 + 20;
      ctx.beginPath();
      ctx.moveTo(tx, h);
      ctx.lineTo(tx + 40, h * 0.4);
      ctx.lineTo(tx + 80, h);
      ctx.fill();
    }

    if (hasMonster === 'dawn' || hasMonster === true && false) {
      // Warm golden morning sunrise outside the window!
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#fca311');
      skyGrad.addColorStop(0.3, '#ffb703');
      skyGrad.addColorStop(0.7, '#8ecae6');
      skyGrad.addColorStop(1, '#219ebc');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Bright rising sun
      const sunGrad = ctx.createRadialGradient(w * 0.6, h * 0.45, 10, w * 0.6, h * 0.45, 140);
      sunGrad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
      sunGrad.addColorStop(0.3, 'rgba(255, 220, 120, 0.8)');
      sunGrad.addColorStop(1, 'rgba(255, 160, 50, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      // Morning mist over green pine forest
      ctx.fillStyle = 'rgba(255, 240, 210, 0.35)';
      ctx.fillRect(0, h * 0.5, w, h * 0.3);

      // Forest silhouette in morning light
      ctx.fillStyle = '#1e382b';
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

    if (hasMonster === true) {
      // Monster face right outside the window!
      ctx.fillStyle = '#1c2228';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.55, 70, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing white/red eyes staring through glass
      ctx.fillStyle = '#ff3333';
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(w / 2 - 25, h * 0.5, 12, 0, Math.PI * 2);
      ctx.arc(w / 2 + 25, h * 0.5, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Claw scratch marks on glass
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 - 40 + c * 35, h * 0.35);
        ctx.lineTo(w / 2 - 20 + c * 35, h * 0.65);
        ctx.stroke();
      }
    }
  }

  /**
   * Electric Fuse Box Texture
   */
  static createFuseBox(isSparking) {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Gray metal casing
    ctx.fillStyle = '#4a525a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2d3339';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, w, h);

    // Yellow warning triangle
    ctx.fillStyle = '#e5a50a';
    ctx.beginPath();
    ctx.moveTo(w / 2, 40);
    ctx.lineTo(w / 2 - 45, 110);
    ctx.lineTo(w / 2 + 45, 110);
    ctx.fill();

    // Black lightning bolt
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(w / 2 + 5, 55);
    ctx.lineTo(w / 2 - 15, 85);
    ctx.lineTo(w / 2 + 2, 85);
    ctx.lineTo(w / 2 - 8, 105);
    ctx.lineTo(w / 2 + 15, 75);
    ctx.lineTo(w / 2 - 2, 75);
    ctx.fill();

    // Circuit breakers panel
    ctx.fillStyle = '#1c1f22';
    ctx.fillRect(30, 140, w - 60, 200);

    for (let i = 0; i < 4; i++) {
      const by = 160 + i * 45;
      ctx.fillStyle = '#333';
      ctx.fillRect(45, by, w - 90, 30);

      // Switch knob
      ctx.fillStyle = isSparking ? '#e53e3e' : '#38a169';
      ctx.fillRect(60, by + 4, 35, 22);
    }

    // Status Indicator LED
    ctx.fillStyle = isSparking ? '#ff1111' : '#22ff44';
    ctx.beginPath();
    ctx.arc(w / 2, 380, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isSparking ? 'ПЕРЕГРУЗКА!' : 'СЕТЬ В НОРМЕ', w / 2, 430);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Heavy Security Door Texture with Peephole & Mechanical Deadbolt
   */
  static createDoorTexture(isLatched) {
    const w = 512;
    const h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Heavy painted wood/iron door
    ctx.fillStyle = '#35433e';
    ctx.fillRect(0, 0, w, h);

    // Metal reinforcement bands
    ctx.fillStyle = '#222b28';
    ctx.fillRect(0, 150, w, 40);
    ctx.fillRect(0, h - 200, w, 40);

    // Large brass peephole
    ctx.fillStyle = '#c49a45';
    ctx.beginPath();
    ctx.arc(w / 2, 360, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1812';
    ctx.beginPath();
    ctx.arc(w / 2, 360, 18, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Sliding Deadbolt Mechanism
    const boltY = 560;
    ctx.fillStyle = '#202422';
    ctx.fillRect(100, boltY, w - 200, 80);

    // Steel bolt bar
    ctx.fillStyle = '#8c969a';
    if (isLatched) {
      // Bolt extended into door frame
      ctx.fillRect(60, boltY + 20, w - 160, 40);
    } else {
      // Bolt retracted
      ctx.fillRect(160, boltY + 20, 180, 40);
    }

    // Door Plate
    ctx.fillStyle = '#eee';
    ctx.fillRect(w / 2 - 100, 240, 200, 60);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ПОСТ 104', w / 2, 278);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Wall Clock "Янтарь"
   */
  static createClockTexture(hour, minute) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dial background
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Dial ticks
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px serif';

    for (let h = 1; h <= 12; h++) {
      const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const x = size / 2 + Math.cos(angle) * 88;
      const y = size / 2 + Math.sin(angle) * 88;
      ctx.fillText(h.toString(), x, y);
    }

    // Hands
    const center = size / 2;
    const hourAngle = ((hour % 12 + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;

    // Hour hand
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(hourAngle) * 50, center + Math.sin(hourAngle) * 50);
    ctx.stroke();

    // Minute hand
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(minAngle) * 75, center + Math.sin(minAngle) * 75);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }
}
