import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltRoughnessMap: THREE.CanvasTexture;
  buildingTextures: THREE.CanvasTexture[];
  contactShadowMap: THREE.CanvasTexture;
  skyTexture: THREE.CanvasTexture;
  oceanTexture: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const anisotropy = Math.min(maxAnisotropy, 8);

  // 1. 3-Lane Highway Asphalt Texture
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;

  // Base tarmac
  rCtx.fillStyle = '#2d333d';
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle tire wear bands along the 3 lanes (centered at 1/6, 3/6, 5/6)
  const laneCenters = [512 * (1 / 6), 512 * 0.5, 512 * (5 / 6)];
  for (const cx of laneCenters) {
    const grad = rCtx.createLinearGradient(cx - 52, 0, cx + 52, 0);
    grad.addColorStop(0, 'rgba(20, 24, 30, 0)');
    grad.addColorStop(0.28, 'rgba(18, 22, 28, 0.28)');
    grad.addColorStop(0.5, 'rgba(25, 30, 36, 0.05)');
    grad.addColorStop(0.72, 'rgba(18, 22, 28, 0.28)');
    grad.addColorStop(1, 'rgba(20, 24, 30, 0)');
    rCtx.fillStyle = grad;
    rCtx.fillRect(cx - 55, 0, 110, 512);
  }

  // Asphalt aggregate speckle
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 36 + Math.floor(Math.random() * 34);
    rCtx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
    rCtx.fillRect(x, y, 2, 2);
  }

  // Solid outer shoulder lines (amber left, crisp white right)
  rCtx.fillStyle = '#facc15';
  rCtx.fillRect(14, 0, 10, 512);
  rCtx.fillStyle = '#f8fafc';
  rCtx.fillRect(488, 0, 10, 512);

  // Dashed lane dividers at 1/3 and 2/3
  rCtx.fillStyle = '#f8fafc';
  const div1 = Math.round(512 / 3);
  const div2 = Math.round((512 * 2) / 3);
  for (let y = 16; y < 512; y += 128) {
    rCtx.fillRect(div1 - 5, y, 10, 68);
    rCtx.fillRect(div2 - 5, y, 10, 68);
  }

  const asphaltMap = new THREE.CanvasTexture(roadCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(1, 3);
  asphaltMap.anisotropy = anisotropy;

  // Roughness map for subtle road specular shimmer
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rgCtx = roughCanvas.getContext('2d')!;
  rgCtx.fillStyle = '#c8c8c8';
  rgCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const v = 165 + Math.floor(Math.random() * 70);
    rgCtx.fillStyle = `rgb(${v},${v},${v})`;
    rgCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const asphaltRoughnessMap = new THREE.CanvasTexture(roughCanvas);
  asphaltRoughnessMap.wrapS = THREE.RepeatWrapping;
  asphaltRoughnessMap.wrapT = THREE.RepeatWrapping;
  asphaltRoughnessMap.repeat.set(1, 3);

  // 2. Modern Sunlit Coastal City Building Facade Textures
  const palettes = [
    { wall: '#e2e8f0', frame: '#94a3b8', glass: '#38bdf8', glassReflect: '#bae6fd' },
    { wall: '#f1f5f9', frame: '#64748b', glass: '#0284c7', glassReflect: '#7dd3fc' },
    { wall: '#fef3c7', frame: '#d97706', glass: '#0ea5e9', glassReflect: '#e0f2fe' },
  ];

  const buildingTextures = palettes.map((pal) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = pal.wall;
    ctx.fillRect(0, 0, 256, 512);

    const cols = 4;
    const rows = 10;
    const padX = 14;
    const padY = 12;
    const winW = (256 - padX * (cols + 1)) / cols;
    const winH = (512 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = padX + col * (winW + padX);
        const y = padY + r * (winH + padY);
        ctx.fillStyle = pal.frame;
        ctx.fillRect(x - 2, y - 2, winW + 4, winH + 4);

        const grad = ctx.createLinearGradient(x, y, x + winW, y + winH);
        grad.addColorStop(0, pal.glassReflect);
        grad.addColorStop(1, pal.glass);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, winW, winH);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    return tex;
  });

  // 3. Soft Contact Shadow Radial Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  sGrad.addColorStop(0, 'rgba(8, 15, 30, 0.72)');
  sGrad.addColorStop(0.55, 'rgba(8, 15, 30, 0.36)');
  sGrad.addColorStop(1, 'rgba(8, 15, 30, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  // 4. Sunlit Daytime Coastal Sky Dome Gradient
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 32;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d')!;
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, '#0284c7'); // Rich zenith azure
  skyGrad.addColorStop(0.45, '#38bdf8'); // Bright mid sky
  skyGrad.addColorStop(0.82, '#bae6fd'); // Sunlit coastal haze
  skyGrad.addColorStop(1, '#e0f2fe'); // Horizon match
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 32, 256);
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;

  // 5. Shimmering Coastal Ocean Water Texture
  const oceanCanvas = document.createElement('canvas');
  oceanCanvas.width = 256;
  oceanCanvas.height = 256;
  const oCtx = oceanCanvas.getContext('2d')!;
  oCtx.fillStyle = '#0ea5e9';
  oCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 14 + Math.random() * 28;
    oCtx.fillStyle = i % 3 === 0 ? 'rgba(224, 242, 254, 0.45)' : 'rgba(56, 189, 248, 0.5)';
    oCtx.fillRect(x, y, w, 2);
  }
  const oceanTexture = new THREE.CanvasTexture(oceanCanvas);
  oceanTexture.colorSpace = THREE.SRGBColorSpace;
  oceanTexture.wrapS = THREE.RepeatWrapping;
  oceanTexture.wrapT = THREE.RepeatWrapping;
  oceanTexture.repeat.set(8, 24);

  return {
    asphaltMap,
    asphaltRoughnessMap,
    buildingTextures,
    contactShadowMap,
    skyTexture,
    oceanTexture,
    dispose: () => {
      asphaltMap.dispose();
      asphaltRoughnessMap.dispose();
      buildingTextures.forEach((t) => t.dispose());
      contactShadowMap.dispose();
      skyTexture.dispose();
      oceanTexture.dispose();
    },
  };
}
