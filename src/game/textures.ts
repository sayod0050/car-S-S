import * as THREE from 'three';
import { MapId } from '../types/game';

export interface RacingTextureSet {
  asphaltMap: THREE.CanvasTexture;
  kerbMap: THREE.CanvasTexture;
  finishMap: THREE.CanvasTexture;
  buildingDayMap: THREE.CanvasTexture;
  buildingNightMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  skyTextures: Record<MapId, THREE.CanvasTexture>;
  dispose: () => void;
}

function makeSkyGradient(stops: [number, string][], stars = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = stars ? 256 : 32;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, 256);

  if (stars) {
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 145;
      const r = Math.random() * 1.4 + 0.4;
      ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
      ctx.fillRect(x, y, r, r);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRacingTextures(maxAnisotropy: number): RacingTextureSet {
  const anisotropy = Math.min(maxAnisotropy, 8);

  // 1. 4-Lane Racing Asphalt
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = '#262b34';
  rCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const shade = 30 + Math.floor(Math.random() * 28);
    rCtx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    rCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // Outer white track boundary lines
  rCtx.fillStyle = '#f8fafc';
  rCtx.fillRect(10, 0, 10, 512);
  rCtx.fillRect(492, 0, 10, 512);

  // Dashed lane lines across 4 lanes
  rCtx.fillStyle = 'rgba(248, 250, 252, 0.78)';
  const divs = [128, 256, 384];
  for (const dx of divs) {
    for (let y = 16; y < 512; y += 128) {
      rCtx.fillRect(dx - 3, y, 6, 60);
    }
  }

  const asphaltMap = new THREE.CanvasTexture(roadCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.anisotropy = anisotropy;

  // 2. Red & White FIA Racing Kerbs
  const kerbCanvas = document.createElement('canvas');
  kerbCanvas.width = 64;
  kerbCanvas.height = 256;
  const kCtx = kerbCanvas.getContext('2d')!;
  for (let y = 0; y < 256; y += 64) {
    kCtx.fillStyle = (y / 64) % 2 === 0 ? '#ef4444' : '#f8fafc';
    kCtx.fillRect(0, y, 64, 64);
  }
  const kerbMap = new THREE.CanvasTexture(kerbCanvas);
  kerbMap.colorSpace = THREE.SRGBColorSpace;
  kerbMap.wrapS = THREE.RepeatWrapping;
  kerbMap.wrapT = THREE.RepeatWrapping;
  kerbMap.anisotropy = anisotropy;

  // 3. Checkered Finish Line Texture
  const finCanvas = document.createElement('canvas');
  finCanvas.width = 512;
  finCanvas.height = 128;
  const fCtx = finCanvas.getContext('2d')!;
  const sq = 32;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 16; c++) {
      fCtx.fillStyle = (r + c) % 2 === 0 ? '#0f172a' : '#ffffff';
      fCtx.fillRect(c * sq, r * sq, sq, sq);
    }
  }
  const finishMap = new THREE.CanvasTexture(finCanvas);
  finishMap.colorSpace = THREE.SRGBColorSpace;
  finishMap.anisotropy = anisotropy;

  // 4. Day & Night Building Textures
  const makeBldg = (night: boolean) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = night ? '#0f172a' : '#e2e8f0';
    ctx.fillRect(0, 0, 256, 512);
    for (let r = 0; r < 12; r++) {
      for (let col = 0; col < 5; col++) {
        const x = 12 + col * 47;
        const y = 12 + r * 41;
        if (night) {
          const lit = Math.random() > 0.35;
          ctx.fillStyle = lit
            ? Math.random() > 0.5
              ? '#38bdf8'
              : '#fde047'
            : '#1e293b';
        } else {
          ctx.fillStyle = '#0284c7';
        }
        ctx.fillRect(x, y, 34, 28);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };
  const buildingDayMap = makeBldg(false);
  const buildingNightMap = makeBldg(true);

  // 5. Contact Shadow
  const sCanvas = document.createElement('canvas');
  sCanvas.width = 128;
  sCanvas.height = 128;
  const sCtx = sCanvas.getContext('2d')!;
  const sg = sCtx.createRadialGradient(64, 64, 12, 64, 64, 60);
  sg.addColorStop(0, 'rgba(6, 10, 20, 0.78)');
  sg.addColorStop(0.6, 'rgba(6, 10, 20, 0.35)');
  sg.addColorStop(1, 'rgba(6, 10, 20, 0)');
  sCtx.fillStyle = sg;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(sCanvas);

  // 6. Sky Gradients per Map
  const skyTextures: Record<MapId, THREE.CanvasTexture> = {
    city: makeSkyGradient([
      [0, '#0284c7'],
      [0.5, '#38bdf8'],
      [1, '#e0f2fe'],
    ]),
    desert: makeSkyGradient([
      [0, '#0369a1'],
      [0.45, '#f59e0b'],
      [1, '#fef3c7'],
    ]),
    mountain: makeSkyGradient([
      [0, '#1d4ed8'],
      [0.55, '#60a5fa'],
      [1, '#e2e8f0'],
    ]),
    forest: makeSkyGradient([
      [0, '#0f766e'],
      [0.5, '#5eead4'],
      [1, '#dcfce7'],
    ]),
    night: makeSkyGradient(
      [
        [0, '#020617'],
        [0.55, '#0f172a'],
        [1, '#1e1b4b'],
      ],
      true
    ),
  };

  return {
    asphaltMap,
    kerbMap,
    finishMap,
    buildingDayMap,
    buildingNightMap,
    contactShadowMap,
    skyTextures,
    dispose: () => {
      asphaltMap.dispose();
      kerbMap.dispose();
      finishMap.dispose();
      buildingDayMap.dispose();
      buildingNightMap.dispose();
      contactShadowMap.dispose();
      Object.values(skyTextures).forEach((t) => t.dispose());
    },
  };
}
