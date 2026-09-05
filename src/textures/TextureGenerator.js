import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator for Realistic 3D Psychological Horror
 * Generates ultra-high detail textures, normal maps, and bump patterns on HTML5 Canvas.
 */
export class TextureGenerator {
  /**
   * Vintage Soviet Damask Wallpaper with plaster cracks and wainscoting
   */
  static createRoomWall() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Base aged wall color (aged beige-cream with subtle grunge)
    ctx.fillStyle = '#cfc5b2';
    ctx.fillRect(0, 0, size, size);

    // Grunge noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Damask Wallpaper Pattern (upper 70% of wall)
    const wallH = size * 0.7;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size, wallH);
    ctx.clip();

    ctx.strokeStyle = '#b8ad98';
    ctx.lineWidth = 3;
    const stepX = 64;
    const stepY = 80;

    for (let y = 0; y < wallH + stepY; y += stepY) {
      for (let x = 0; x < size + stepX; x += stepX) {
        const ox = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
        const cx = x + ox;
        const cy = y;

        // Vintage diamond damask ornament
        ctx.beginPath();
        ctx.moveTo(cx, cy - 24);
        ctx.bezierCurveTo(cx + 18, cy - 12, cx + 18, cy + 12, cx, cy + 24);
        ctx.bezierCurveTo(cx - 18, cy + 12, cx - 18, cy - 12, cx, cy - 24);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#a69a84';
        ctx.fill();
      }
    }

    // Cracks and peeling plaster in random patches
    ctx.strokeStyle = 'rgba(90, 80, 70, 0.4)';
    ctx.lineWidth = 1.5;
    for (let c = 0; c < 8; c++) {
      let kx = 100 + Math.random() * (size - 200);
      let ky = 50 + Math.random() * (wallH - 100);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      for (let s = 0; s < 5; s++) {
        kx += (Math.random() - 0.5) * 35;
        ky += Math.random() * 25;
        ctx.lineTo(kx, ky);
      }
      ctx.stroke();
    }

    // Water stains near the top
    const waterGrad = ctx.createLinearGradient(0, 0, 0, 180);
    waterGrad.addColorStop(0, 'rgba(80, 60, 40, 0.25)');
    waterGrad.addColorStop(1, 'rgba(80, 60, 40, 0)');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, size, 180);
    ctx.restore();

    // 3. Middle Carved Wooden Molding Rail
    const midY = wallH;
    const railH = 32;
    const railGrad = ctx.createLinearGradient(0, midY, 0, midY + railH);
    railGrad.addColorStop(0, '#754724');
    railGrad.addColorStop(0.3, '#543015');
    railGrad.addColorStop(0.7, '#3d220d');
    railGrad.addColorStop(1, '#241306');
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, midY, size, railH);

    // Bevel highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, midY, size, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, midY + railH - 3, size, 3);

    // 4. Lower Wooden Wainscoting Panels
    const wainY = midY + railH;
    const wainH = size - wainY;
    const wainGrad = ctx.createLinearGradient(0, wainY, 0, size);
    wainGrad.addColorStop(0, '#543117');
    wainGrad.addColorStop(1, '#3b210e');
    ctx.fillStyle = wainGrad;
    ctx.fillRect(0, wainY, size, wainH);

    // Wood Grain lines in panels
    ctx.strokeStyle = 'rgba(40, 20, 10, 0.35)';
    ctx.lineWidth = 1;
    for (let y = wainY; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Vertical panel borders
    const panelWidth = 128;
    for (let x = 0; x < size; x += panelWidth) {
      // Panel frame
      ctx.fillStyle = '#2b1708';
      ctx.fillRect(x, wainY, 8, wainH);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 8, wainY, 3, wainH);

      // Inner panel inset
      ctx.strokeStyle = '#2b1708';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 18, wainY + 18, panelWidth - 36, wainH - 36);
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  /**
   * Ultra-Detailed Herringbone Parquet Wooden Floor
   */
  static createWoodFloor() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base varnish tone
    ctx.fillStyle = '#6e411b';
    ctx.fillRect(0, 0, size, size);

    const plankW = 128;
    const plankH = 32;

    const woodColors = ['#854f22', '#75441b', '#8f5726', '#693c17', '#995f2b', '#7c481e'];

    // Render herringbone pattern
    for (let y = -plankW; y < size + plankW; y += plankH) {
      const rowIdx = Math.floor(y / plankH);
      const isAlt = rowIdx % 2 === 0;

      for (let x = -plankW; x < size + plankW; x += plankW) {
        const px = isAlt ? x : x - plankW / 2;
        const colorIdx = Math.abs(Math.floor((px * 7 + y * 13) / 100)) % woodColors.length;
        
        // Base plank fill
        ctx.fillStyle = woodColors[colorIdx];
        ctx.fillRect(px, y, plankW, plankH);

        // Wood grain fibers inside each plank
        ctx.strokeStyle = 'rgba(40, 20, 5, 0.25)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 5; g++) {
          const gy = y + 4 + g * 5;
          ctx.beginPath();
          ctx.moveTo(px, gy);
          ctx.bezierCurveTo(
            px + plankW * 0.3, gy + (Math.sin(px + g) * 3),
            px + plankW * 0.7, gy - (Math.cos(py => g) * 2),
            px + plankW, gy
          );
          ctx.stroke();
        }

        // Dark bevel gaps between planks
        ctx.strokeStyle = '#291404';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px, y, plankW, plankH);

        // Subtle specular highlight on top plank edge
        ctx.strokeStyle = 'rgba(255, 230, 180, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 2, y + 1);
        ctx.lineTo(px + plankW - 2, y + 1);
        ctx.stroke();
      }
    }

    // Wear and scuff overlay
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() - 0.5) * 14;
      d[i] += v;
      d[i + 1] += v;
      d[i + 2] += v;
    }
    ctx.putImageData(imgData, 0, 0);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  /**
   * Classical Soviet Wool Rug / Carpet with floral medallions
   */
  static createRug() {
    const w = 768;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Deep burgundy red background
    ctx.fillStyle = '#611219';
    ctx.fillRect(0, 0, w, h);

    // Outer fringe trim (white/cream fringe strings)
    ctx.fillStyle = '#dfd8c8';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 12, w, 12);

    // Outer dark green border
    ctx.fillStyle = '#173322';
    ctx.fillRect(20, 20, w - 40, h - 40);

    // Golden ochre inner border
    ctx.strokeStyle = '#c9932a';
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    // Inner deep wine red field
    ctx.fillStyle = '#7a1922';
    ctx.fillRect(44, 44, w - 88, h - 88);

    // Repeating geometric floral border
    ctx.strokeStyle = '#dfc282';
    ctx.lineWidth = 2;
    for (let x = 50; x < w - 50; x += 30) {
      ctx.strokeRect(x, 24, 18, 8);
      ctx.strokeRect(x, h - 32, 18, 8);
    }

    // Center Large Medallion
    const cx = w / 2;
    const cy = h / 2;

    // Outer star medallion
    ctx.fillStyle = '#173322';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 140, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9932a';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner gold rosette
    ctx.fillStyle = '#c9932a';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 90, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7a1922';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fabric texture noise (fuzzy wool feeling)
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const map = new THREE.CanvasTexture(canvas);
    return map;
  }

  /**
   * Plaster Ceiling Texture with faint discoloration
   */
  static createCeiling() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ede8dd';
    ctx.fillRect(0, 0, size, size);

    // Subtle stucco stippling
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 15;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Soft plaster panel seams
    ctx.strokeStyle = 'rgba(160, 150, 140, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  /**
   * Heavy Cast Iron Radiator texture
   */
  static createRadiator() {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Chipped white-gray industrial paint
    ctx.fillStyle = '#b0b5ba';
    ctx.fillRect(0, 0, w, h);

    // Rib columns
    const ribW = 32;
    for (let x = 0; x < w; x += ribW) {
      const grad = ctx.createLinearGradient(x, 0, x + ribW, 0);
      grad.addColorStop(0, '#3f454a');
      grad.addColorStop(0.3, '#cfd4da');
      grad.addColorStop(0.7, '#cfd4da');
      grad.addColorStop(1, '#2f3438');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, ribW, h);

      // Rust spots at the bottom and joints
      ctx.fillStyle = 'rgba(120, 50, 20, 0.35)';
      ctx.fillRect(x + 4, h - 80, ribW - 8, 80);
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    return map;
  }

  /**
   * Soviet Rotary Telephone "ТА-68" Face Texture
   */
  static createTelephoneTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark bakelite body
    ctx.fillStyle = '#1c1b18';
    ctx.fillRect(0, 0, size, size);

    // Rotary dial white circle
    const cx = size / 2;
    const cy = size / 2 + 20;
    ctx.fillStyle = '#e8e2d3';
    ctx.beginPath();
    ctx.arc(cx, cy, 68, 0, Math.PI * 2);
    ctx.fill();

    // Finger holes around dial
    ctx.fillStyle = '#1c1b18';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px sans-serif';

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 1.6 + 0.6;
      const hx = cx + Math.cos(angle) * 46;
      const hy = cy + Math.sin(angle) * 46;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      const digit = (i + 1) % 10;
      ctx.fillText(digit.toString(), hx, hy);
    }

    // Center metallic nut
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * CRT TV Screen Texture (renders Off or Anomaly Static with creepy face)
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
      // Off: dark curved convex glass with room reflection
      ctx.fillStyle = '#0d1014';
      ctx.fillRect(0, 0, size, size);

      // Diagonal glass glare
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, 'rgba(255,255,255,0.12)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.02)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else {
      // On (Anomaly): high intensity analog noise & horrifying face apparition
      const imgData = ctx.createImageData(size, size);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = Math.random() > 0.35 ? 170 + Math.random() * 85 : 15 + Math.random() * 60;
        d[i] = val * 0.75;      // R
        d[i + 1] = val * 0.9;   // G
        d[i + 2] = val;         // B (cyan/blue CRT phosphor glow)
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      // Horizontal sync tracking glitch lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      const barY = Math.random() * (size - 30);
      ctx.fillRect(0, barY, size, 20);

      // Face silhouette emerging from static
      ctx.fillStyle = 'rgba(10, 5, 10, 0.85)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2 + 5, 52, 75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sunken eye sockets & glowing red pinpricks
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(size / 2 - 20, size / 2 - 8, 14, 0, Math.PI * 2);
      ctx.arc(size / 2 + 20, size / 2 - 8, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff1111';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(size / 2 - 20, size / 2 - 8, 5, 0, Math.PI * 2);
      ctx.arc(size / 2 + 20, size / 2 - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Distorted smiling/screaming mouth
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(size / 2, size / 2 + 38, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glitched OSD Header
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('СИГНАЛ 404', 18, 32);
    }
  }

  /**
   * Window Glass (Outside Night / Window Monster / Dawn)
   */
  static createWindowCanvas() {
    const w = 512;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  static drawWindow(canvas, state) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    if (state === 'dawn') {
      // Golden morning dawn outside the window
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#ff9e00');
      skyGrad.addColorStop(0.35, '#ffbe0b');
      skyGrad.addColorStop(0.7, '#a2d2ff');
      skyGrad.addColorStop(1, '#3a86ff');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Rising Sun
      const sunGrad = ctx.createRadialGradient(w * 0.65, h * 0.45, 10, w * 0.65, h * 0.45, 180);
      sunGrad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
      sunGrad.addColorStop(0.3, 'rgba(255, 210, 100, 0.85)');
      sunGrad.addColorStop(1, 'rgba(255, 150, 40, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      // Morning mist over forest silhouette
      ctx.fillStyle = 'rgba(255, 245, 220, 0.4)';
      ctx.fillRect(0, h * 0.48, w, h * 0.25);

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

    // Default: Dark Misty Night
    ctx.fillStyle = '#070b10';
    ctx.fillRect(0, 0, w, h);

    // Cold Moon glow
    const moonGrad = ctx.createRadialGradient(w * 0.72, h * 0.22, 10, w * 0.72, h * 0.22, 190);
    moonGrad.addColorStop(0, 'rgba(180, 215, 255, 0.45)');
    moonGrad.addColorStop(1, 'rgba(7, 11, 16, 0)');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, w, h);

    // Pine trees silhouettes in night fog
    ctx.fillStyle = '#03060a';
    for (let t = 0; t < 6; t++) {
      const tx = t * 95 + 15;
      ctx.beginPath();
      ctx.moveTo(tx, h);
      ctx.lineTo(tx + 45, h * 0.38);
      ctx.lineTo(tx + 90, h);
      ctx.fill();
    }

    // Rain drips on glass
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.25)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 20; r++) {
      const rx = (r * 37) % w;
      const ry = (r * 53) % (h - 80);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 2, ry + 25);
      ctx.stroke();
    }

    if (state === true) {
      // Menacing Tall Monster peering inside!
      ctx.fillStyle = '#0d1217';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.52, 85, 130, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slender neck and shoulders
      ctx.fillRect(w / 2 - 90, h * 0.7, 180, h * 0.3);

      // Glowing crimson eyes staring through the glass
      ctx.fillStyle = '#ff2222';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(w / 2 - 28, h * 0.46, 14, 0, Math.PI * 2);
      ctx.arc(w / 2 + 28, h * 0.46, 14, 0, Math.PI * 2);
      ctx.fill();

      // White hot pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w / 2 - 28, h * 0.46, 4, 0, Math.PI * 2);
      ctx.arc(w / 2 + 28, h * 0.46, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Deep Claw Scratch Marks on glass pane
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 3;
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 - 50 + c * 32, h * 0.32);
        ctx.lineTo(w / 2 - 30 + c * 32, h * 0.68);
        ctx.stroke();
      }
    }
  }

  /**
   * Heavy Industrial Steel Door Texture with Rivets & Hazard Markings
   */
  static createDoorTexture(isLatched) {
    const w = 512;
    const h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Industrial green-gray paint with edge wear
    ctx.fillStyle = '#2f3b37';
    ctx.fillRect(0, 0, w, h);

    // Diagonal hazard warning stripes at top and bottom
    const drawHazard = (startY, height) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, startY, w, height);
      ctx.clip();
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(0, startY, w, height);
      ctx.fillStyle = '#1c211f';
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

    drawHazard(40, 50);
    drawHazard(h - 100, 50);

    // Heavy steel reinforcement plates
    ctx.fillStyle = '#222a27';
    ctx.fillRect(30, 120, w - 60, 20);
    ctx.fillRect(30, 480, w - 60, 20);
    ctx.fillRect(30, 840, w - 60, 20);

    // Rivet studs along plates and door frame
    ctx.fillStyle = '#616c68';
    for (let y of [130, 490, 850]) {
      for (let x = 50; x < w - 40; x += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#161a18';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#616c68';
      }
    }

    // Heavy Brass Peephole
    ctx.fillStyle = '#c49a45';
    ctx.beginPath();
    ctx.arc(w / 2, 340, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111312';
    ctx.beginPath();
    ctx.arc(w / 2, 340, 18, 0, Math.PI * 2);
    ctx.fill();

    // Steel Deadbolt Housing
    const boltY = 560;
    ctx.fillStyle = '#181d1b';
    ctx.fillRect(80, boltY, w - 160, 90);
    ctx.strokeStyle = '#3e4844';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, boltY, w - 160, 90);

    // Steel sliding bar
    ctx.fillStyle = '#8f9a9c';
    if (isLatched) {
      ctx.fillRect(50, boltY + 22, w - 130, 46);
    } else {
      ctx.fillRect(150, boltY + 22, 180, 46);
    }

    // Cyrillic Metal ID Stencil Plate
    ctx.fillStyle = '#dcd8cf';
    ctx.fillRect(w / 2 - 110, 220, 220, 55);
    ctx.fillStyle = '#1a1c1b';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ОБЪЕКТ-104', w / 2, 256);

    const map = new THREE.CanvasTexture(canvas);
    return map;
  }

  /**
   * Electric Fuse Box Texture with Gauges and Breakers
   */
  static createFuseBox(isSparking) {
    const w = 256;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Metal casing
    ctx.fillStyle = '#3c4349';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22262a';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);

    // Warning Triangle
    ctx.fillStyle = '#e5a50a';
    ctx.beginPath();
    ctx.moveTo(w / 2, 30);
    ctx.lineTo(w / 2 - 45, 100);
    ctx.lineTo(w / 2 + 45, 100);
    ctx.fill();

    // Black lightning bolt
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(w / 2 + 5, 45);
    ctx.lineTo(w / 2 - 15, 75);
    ctx.lineTo(w / 2 + 2, 75);
    ctx.lineTo(w / 2 - 8, 95);
    ctx.lineTo(w / 2 + 15, 65);
    ctx.lineTo(w / 2 - 2, 65);
    ctx.fill();

    // Breakers bay
    ctx.fillStyle = '#191c1f';
    ctx.fillRect(25, 125, w - 50, 220);

    for (let i = 0; i < 4; i++) {
      const by = 145 + i * 48;
      ctx.fillStyle = '#2c3136';
      ctx.fillRect(38, by, w - 76, 36);

      // Breaker switch
      ctx.fillStyle = isSparking ? '#ef4444' : '#22c55e';
      ctx.fillRect(52, by + 4, 38, 28);

      // Label
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ЛИНИЯ ${i + 1}`, 105, by + 22);
    }

    // Status Indicator LED
    ctx.fillStyle = isSparking ? '#ff0000' : '#00ff44';
    ctx.shadowColor = isSparking ? '#ff0000' : '#00ff44';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(w / 2, 395, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isSparking ? 'АВАРИЯ СЕТИ' : 'НАПРЯЖЕНИЕ: 220V', w / 2, 445);

    const map = new THREE.CanvasTexture(canvas);
    return map;
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
    ctx.fillStyle = '#f4efe4';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2c16';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Dial numbers
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

    // Hands
    const center = size / 2;
    const hourAngle = ((hour % 12 + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;

    // Hour hand
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(hourAngle) * 52, center + Math.sin(hourAngle) * 52);
    ctx.stroke();

    // Minute hand
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(minAngle) * 78, center + Math.sin(minAngle) * 78);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }
}
