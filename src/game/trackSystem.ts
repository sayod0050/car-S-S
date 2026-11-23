import * as THREE from 'three';
import { MapId } from '../types/game';
import { RacingTextureSet } from './textures';

export const TRACK_HALF_WIDTH = 7.8; // 15.6m wide 4-lane racing track

export interface TrackSample {
  x: number;
  z: number;
  tx: number; // unit forward tangent X
  tz: number; // unit forward tangent Z
  rx: number; // unit right normal X
  rz: number; // unit right normal Z
  yaw: number;
}

export class RaceTrack {
  public readonly group = new THREE.Group();
  public readonly totalLength: number;
  public readonly isDrag: boolean;
  public readonly dragFinishS = 620;

  private samples: TrackSample[] = [];
  private sampleCount = 640;

  constructor(
    scene: THREE.Scene,
    textures: RacingTextureSet,
    mapId: MapId,
    isDrag: boolean,
    receiveShadow: boolean
  ) {
    this.isDrag = isDrag;

    if (isDrag) {
      this.totalLength = 740;
      this.buildStraightSamples();
    } else {
      this.totalLength = this.buildCircuitSamples();
    }

    this.applyMapAtmosphere(scene, textures, mapId);
    this.buildTrackSurface(textures, receiveShadow);
    this.buildFinishGantry(textures);
    this.buildScenery(textures, mapId, receiveShadow);
    scene.add(this.group);
  }

  private buildStraightSamples(): void {
    this.samples = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const t = i / (this.sampleCount - 1);
      const z = 20 - t * this.totalLength;
      this.samples.push({
        x: 0,
        z,
        tx: 0,
        tz: -1,
        rx: 1,
        rz: 0,
        yaw: 0,
      });
    }
  }

  private buildCircuitSamples(): number {
    // Smooth, sweeping closed-loop racing circuit (~760m per lap)
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -110),
      new THREE.Vector3(38, 0, -195),
      new THREE.Vector3(125, 0, -225),
      new THREE.Vector3(205, 0, -175),
      new THREE.Vector3(225, 0, -85),
      new THREE.Vector3(170, 0, -10),
      new THREE.Vector3(195, 0, 75),
      new THREE.Vector3(155, 0, 155),
      new THREE.Vector3(65, 0, 165),
      new THREE.Vector3(5, 0, 105),
    ];

    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.45);
    const totalLen = curve.getLength();

    this.samples = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const u = i / this.sampleCount;
      const p = curve.getPointAt(u);
      const tan = curve.getTangentAt(u).normalize();
      // Right vector in XZ plane: cross(tangent, up(0,1,0)) = (-tz, 0, tx)? Wait:
      // forward = (tx, 0, tz). Up = (0, 1, 0).
      // forward x up = ( -tz, 0, tx )? Check: (0,0,-1) x (0,1,0) = (1, 0, 0) -> yes! (-(-1), 0, 0) = (1,0,0) right!
      const rx = -tan.z;
      const rz = tan.x;
      // Yaw so local -Z faces tangent (tx, tz):
      // Rotating (0,0,-1) by yaw around Y gives (-sin(yaw), 0, -cos(yaw)).
      // So -sin(yaw) = tx, -cos(yaw) = tz => yaw = atan2(-tx, -tz).
      const yaw = Math.atan2(-tan.x, -tan.z);

      this.samples.push({
        x: p.x,
        z: p.z,
        tx: tan.x,
        tz: tan.z,
        rx,
        rz,
        yaw,
      });
    }
    return totalLen;
  }

  public sampleAt(s: number, uLateral: number, outPos: THREE.Vector3): TrackSample {
    let normS = s;
    if (!this.isDrag) {
      normS = ((s % this.totalLength) + this.totalLength) % this.totalLength;
    } else {
      normS = Math.max(0, Math.min(this.totalLength - 1, s));
    }

    const fIdx = (normS / this.totalLength) * (this.isDrag ? this.sampleCount - 1 : this.sampleCount);
    const i0 = Math.floor(fIdx) % this.sampleCount;
    const i1 = this.isDrag ? Math.min(this.sampleCount - 1, i0 + 1) : (i0 + 1) % this.sampleCount;
    const frac = fIdx - Math.floor(fIdx);

    const a = this.samples[i0];
    const b = this.samples[i1];

    const x = a.x + (b.x - a.x) * frac;
    const z = a.z + (b.z - a.z) * frac;
    const rx = a.rx + (b.rx - a.rx) * frac;
    const rz = a.rz + (b.rz - a.rz) * frac;
    const tx = a.tx + (b.tx - a.tx) * frac;
    const tz = a.tz + (b.tz - a.tz) * frac;

    outPos.set(x + rx * uLateral, 0, z + rz * uLateral);

    return {
      x,
      z,
      tx,
      tz,
      rx,
      rz,
      yaw: Math.atan2(-tx, -tz),
    };
  }

  private applyMapAtmosphere(
    scene: THREE.Scene,
    textures: RacingTextureSet,
    mapId: MapId
  ): void {
    scene.background = textures.skyTextures[mapId];
    const fogColors: Record<MapId, number> = {
      city: 0xd4effe,
      desert: 0xfde68a,
      mountain: 0xdbeafe,
      forest: 0xd1fae5,
      night: 0x0f172a,
    };
    scene.fog = new THREE.Fog(fogColors[mapId], 95, 320);
  }

  private buildTrackSurface(textures: RacingTextureSet, receiveShadow: boolean): void {
    const segs = this.isDrag ? this.sampleCount - 1 : this.sampleCount;

    const buildRibbon = (
      innerOffset: number,
      outerOffset: number,
      y: number,
      uScale: number,
      vScale: number
    ): THREE.BufferGeometry => {
      const vertCount = (segs + 1) * 2;
      const positions = new Float32Array(vertCount * 3);
      const normals = new Float32Array(vertCount * 3);
      const uvs = new Float32Array(vertCount * 2);
      const indices: number[] = [];

      for (let i = 0; i <= segs; i++) {
        const idx = this.isDrag ? Math.min(i, this.sampleCount - 1) : i % this.sampleCount;
        const smp = this.samples[idx];
        const v = (i / segs) * vScale;

        const lx = smp.x + smp.rx * innerOffset;
        const lz = smp.z + smp.rz * innerOffset;
        const rx = smp.x + smp.rx * outerOffset;
        const rz = smp.z + smp.rz * outerOffset;

        const base = i * 2;
        positions[base * 3] = lx;
        positions[base * 3 + 1] = y;
        positions[base * 3 + 2] = lz;

        positions[(base + 1) * 3] = rx;
        positions[(base + 1) * 3 + 1] = y;
        positions[(base + 1) * 3 + 2] = rz;

        normals[base * 3 + 1] = 1;
        normals[(base + 1) * 3 + 1] = 1;

        uvs[base * 2] = 0;
        uvs[base * 2 + 1] = v;
        uvs[(base + 1) * 2] = uScale;
        uvs[(base + 1) * 2 + 1] = v;

        if (i < segs) {
          const a = base;
          const b = base + 1;
          const c = base + 2;
          const d = base + 3;
          indices.push(a, b, c, b, d, c);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      return geo;
    };

    // Main asphalt road
    textures.asphaltMap.repeat.set(1, 1);
    const roadGeo = buildRibbon(
      -TRACK_HALF_WIDTH,
      TRACK_HALF_WIDTH,
      0.01,
      1,
      Math.round(this.totalLength / 14)
    );
    const roadMat = new THREE.MeshStandardMaterial({
      map: textures.asphaltMap,
      roughness: 0.85,
      metalness: 0.08,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = receiveShadow;
    this.group.add(roadMesh);

    // Red & white racing kerbs on both edges
    const kerbMat = new THREE.MeshStandardMaterial({
      map: textures.kerbMap,
      roughness: 0.65,
    });
    const kerbL = new THREE.Mesh(
      buildRibbon(-TRACK_HALF_WIDTH - 0.9, -TRACK_HALF_WIDTH, 0.03, 1, Math.round(this.totalLength / 4)),
      kerbMat
    );
    const kerbR = new THREE.Mesh(
      buildRibbon(TRACK_HALF_WIDTH, TRACK_HALF_WIDTH + 0.9, 0.03, 1, Math.round(this.totalLength / 4)),
      kerbMat
    );
    kerbL.receiveShadow = receiveShadow;
    kerbR.receiveShadow = receiveShadow;
    this.group.add(kerbL, kerbR);

    // Guardrail walls outside kerbs
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.72,
      roughness: 0.35,
    });
    const wallPostGeo = new THREE.BoxGeometry(0.28, 0.72, 2.2);
    const barrierCount = 180;
    const barrierInst = new THREE.InstancedMesh(wallPostGeo, railMat, barrierCount * 2);
    barrierInst.frustumCulled = false;
    const dummy = new THREE.Object3D();
    const pos = new THREE.Vector3();
    let idx = 0;

    for (let i = 0; i < barrierCount; i++) {
      const s = (i / barrierCount) * this.totalLength;
      const smp = this.sampleAt(s, -(TRACK_HALF_WIDTH + 1.25), pos);
      dummy.position.set(pos.x, 0.36, pos.z);
      dummy.rotation.set(0, smp.yaw, 0);
      dummy.updateMatrix();
      barrierInst.setMatrixAt(idx++, dummy.matrix);

      this.sampleAt(s, TRACK_HALF_WIDTH + 1.25, pos);
      dummy.position.set(pos.x, 0.36, pos.z);
      dummy.updateMatrix();
      barrierInst.setMatrixAt(idx++, dummy.matrix);
    }
    barrierInst.instanceMatrix.needsUpdate = true;
    this.group.add(barrierInst);
  }

  private buildFinishGantry(textures: RacingTextureSet): void {
    const finishS = this.isDrag ? this.dragFinishS : 0;
    const pos = new THREE.Vector3();
    const smp = this.sampleAt(finishS, 0, pos);

    const gantry = new THREE.Group();
    gantry.position.set(pos.x, 0, pos.z);
    gantry.rotation.y = smp.yaw;

    // Checkered line across asphalt
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(TRACK_HALF_WIDTH * 2, 2.6),
      new THREE.MeshStandardMaterial({
        map: textures.finishMap,
        roughness: 0.6,
      })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = 0.04;

    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const pillarGeo = new THREE.BoxGeometry(0.8, 6.2, 0.8);
    const pL = new THREE.Mesh(pillarGeo, pillarMat);
    pL.position.set(-TRACK_HALF_WIDTH - 0.8, 3.1, 0);
    const pR = pL.clone();
    pR.position.x = TRACK_HALF_WIDTH + 0.8;

    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_HALF_WIDTH * 2 + 2.4, 1.5, 0.7),
      new THREE.MeshStandardMaterial({
        map: textures.finishMap,
        emissive: 0x1e293b,
        emissiveIntensity: 0.25,
      })
    );
    banner.position.set(0, 6.1, 0);

    // Glowing cyan/orange trim bar on gantry
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_HALF_WIDTH * 2 + 2.5, 0.22, 0.76),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.5,
      })
    );
    accent.position.set(0, 5.28, 0);

    gantry.add(strip, pL, pR, banner, accent);
    this.group.add(gantry);
  }

  private isNearTrack(x: number, z: number, minDist = 18): boolean {
    const minSq = minDist * minDist;
    for (let i = 0; i < this.samples.length; i += 3) {
      const s = this.samples[i];
      const dx = s.x - x;
      const dz = s.z - z;
      if (dx * dx + dz * dz < minSq) return true;
    }
    return false;
  }

  private buildScenery(
    textures: RacingTextureSet,
    mapId: MapId,
    receiveShadow: boolean
  ): void {
    // Ground Plane matching map biome
    const groundColors: Record<MapId, number> = {
      city: 0x475569,
      desert: 0xeab308,
      mountain: 0x4d7c0f,
      forest: 0x15803d,
      night: 0x090d16,
    };

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({
        color: groundColors[mapId],
        roughness: 0.94,
        metalness: 0.02,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(80, -0.05, -120);
    ground.receiveShadow = receiveShadow;
    this.group.add(ground);

    const dummy = new THREE.Object3D();

    if (mapId === 'city' || mapId === 'night') {
      // Skyscrapers safely outside track corridor
      const bGeo = new THREE.BoxGeometry(1, 1, 1);
      const bMat = new THREE.MeshStandardMaterial({
        map: mapId === 'night' ? textures.buildingNightMap : textures.buildingDayMap,
        emissive: mapId === 'night' ? 0x1e293b : 0x000000,
        emissiveMap: mapId === 'night' ? textures.buildingNightMap : null,
        emissiveIntensity: mapId === 'night' ? 1.15 : 0,
        roughness: 0.4,
      });
      const bCount = 95;
      const bInst = new THREE.InstancedMesh(bGeo, bMat, bCount);
      bInst.frustumCulled = false;

      let placed = 0;
      let attempts = 0;
      while (placed < bCount && attempts < 1400) {
        attempts++;
        const x = this.isDrag
          ? (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 75)
          : -80 + Math.random() * 380;
        const z = this.isDrag
          ? 20 - Math.random() * 720
          : -300 + Math.random() * 540;
        if (this.isNearTrack(x, z, 20)) continue;

        const w = 10 + Math.random() * 14;
        const h = 18 + Math.random() * 48;
        dummy.position.set(x, h * 0.5 - 0.1, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(w, h, w);
        dummy.updateMatrix();
        bInst.setMatrixAt(placed++, dummy.matrix);
      }
      bInst.count = placed;
      bInst.instanceMatrix.needsUpdate = true;
      this.group.add(bInst);

      // Streetlights along track edges
      const lampCount = 52;
      const poleInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.1, 0.12, 6.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 }),
        lampCount
      );
      const bulbInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1.1, 0.2, 0.35),
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          emissive: mapId === 'night' ? 0x38bdf8 : 0xfef08a,
          emissiveIntensity: mapId === 'night' ? 2.8 : 0.7,
        }),
        lampCount
      );
      poleInst.frustumCulled = false;
      bulbInst.frustumCulled = false;
      const p = new THREE.Vector3();

      for (let i = 0; i < lampCount; i++) {
        const s = (i / lampCount) * this.totalLength;
        const side = i % 2 === 0 ? -1 : 1;
        const smp = this.sampleAt(s, side * (TRACK_HALF_WIDTH + 1.6), p);
        dummy.position.set(p.x, 3.1, p.z);
        dummy.rotation.set(0, smp.yaw + (side > 0 ? Math.PI : 0), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poleInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(p.x, 6.2, p.z);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(i, dummy.matrix);
      }
      poleInst.instanceMatrix.needsUpdate = true;
      bulbInst.instanceMatrix.needsUpdate = true;
      this.group.add(poleInst, bulbInst);
    }

    if (mapId === 'desert') {
      // Red-rock Mesas & Saguaro Cacti
      const mesaGeo = new THREE.CylinderGeometry(7, 13, 18, 7);
      const mesaMat = new THREE.MeshStandardMaterial({
        color: 0xc2410c,
        roughness: 0.92,
        flatShading: true,
      });
      const mesaInst = new THREE.InstancedMesh(mesaGeo, mesaMat, 36);
      mesaInst.frustumCulled = false;

      let placed = 0;
      let attempts = 0;
      while (placed < 36 && attempts < 900) {
        attempts++;
        const x = this.isDrag
          ? (Math.random() > 0.5 ? 1 : -1) * (24 + Math.random() * 95)
          : -100 + Math.random() * 420;
        const z = this.isDrag
          ? 20 - Math.random() * 720
          : -310 + Math.random() * 560;
        if (this.isNearTrack(x, z, 26)) continue;

        const s = 0.7 + Math.random() * 1.4;
        dummy.position.set(x, 8 * s, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesaInst.setMatrixAt(placed++, dummy.matrix);
      }
      mesaInst.count = placed;
      mesaInst.instanceMatrix.needsUpdate = true;
      this.group.add(mesaInst);

      const cactusGeo = new THREE.CylinderGeometry(0.28, 0.34, 4.2, 7);
      const cactusMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const cactusInst = new THREE.InstancedMesh(cactusGeo, cactusMat, 80);
      cactusInst.frustumCulled = false;
      placed = 0;
      attempts = 0;
      while (placed < 80 && attempts < 1000) {
        attempts++;
        const x = this.isDrag
          ? (Math.random() > 0.5 ? 1 : -1) * (13 + Math.random() * 50)
          : -60 + Math.random() * 340;
        const z = this.isDrag
          ? 20 - Math.random() * 720
          : -280 + Math.random() * 500;
        if (this.isNearTrack(x, z, 13)) continue;

        const sc = 0.7 + Math.random() * 0.7;
        dummy.position.set(x, 2 * sc, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        cactusInst.setMatrixAt(placed++, dummy.matrix);
      }
      cactusInst.count = placed;
      cactusInst.instanceMatrix.needsUpdate = true;
      this.group.add(cactusInst);
    }

    if (mapId === 'mountain' || mapId === 'forest') {
      // Mountain Peaks (more prominent on Mountain map)
      const peakCount = mapId === 'mountain' ? 42 : 16;
      const peakGeo = new THREE.ConeGeometry(20, 38, 6);
      const peakMat = new THREE.MeshStandardMaterial({
        color: mapId === 'mountain' ? 0x64748b : 0x334155,
        roughness: 0.9,
        flatShading: true,
      });
      const peakInst = new THREE.InstancedMesh(peakGeo, peakMat, peakCount);
      peakInst.frustumCulled = false;

      let placed = 0;
      let attempts = 0;
      while (placed < peakCount && attempts < 900) {
        attempts++;
        const x = this.isDrag
          ? (Math.random() > 0.5 ? 1 : -1) * (32 + Math.random() * 110)
          : -120 + Math.random() * 460;
        const z = this.isDrag
          ? 20 - Math.random() * 720
          : -330 + Math.random() * 600;
        if (this.isNearTrack(x, z, 34)) continue;

        const s = 0.8 + Math.random() * 1.25;
        dummy.position.set(x, 18 * s, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        peakInst.setMatrixAt(placed++, dummy.matrix);
      }
      peakInst.count = placed;
      peakInst.instanceMatrix.needsUpdate = true;
      this.group.add(peakInst);

      // Pine Trees
      const treeCount = mapId === 'forest' ? 180 : 90;
      const trunkInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.22, 0.34, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }),
        treeCount
      );
      const crownInst = new THREE.InstancedMesh(
        new THREE.ConeGeometry(2.0, 5.4, 7),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 }),
        treeCount
      );
      trunkInst.frustumCulled = false;
      crownInst.frustumCulled = false;
      const greens = [new THREE.Color(0x16a34a), new THREE.Color(0x15803d), new THREE.Color(0x22c55e)];

      placed = 0;
      attempts = 0;
      while (placed < treeCount && attempts < 1800) {
        attempts++;
        const x = this.isDrag
          ? (Math.random() > 0.5 ? 1 : -1) * (13 + Math.random() * 70)
          : -70 + Math.random() * 360;
        const z = this.isDrag
          ? 20 - Math.random() * 720
          : -280 + Math.random() * 520;
        if (this.isNearTrack(x, z, 13.5)) continue;

        const s = 0.8 + Math.random() * 0.55;
        dummy.position.set(x, 1.1 * s, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(placed, dummy.matrix);

        dummy.position.set(x, 4.4 * s, z);
        dummy.updateMatrix();
        crownInst.setMatrixAt(placed, dummy.matrix);
        crownInst.setColorAt(placed, greens[placed % greens.length]);
        placed++;
      }
      trunkInst.count = placed;
      crownInst.count = placed;
      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
      this.group.add(trunkInst, crownInst);
    }
  }
}
