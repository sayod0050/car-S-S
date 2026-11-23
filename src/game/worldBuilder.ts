import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';

export const LANE_POSITIONS = [-3.25, 0, 3.25] as const;
export const ROAD_WIDTH = 10.6;
export const CHUNK_LENGTH = 40;
export const NUM_CHUNKS = 8;

interface RoadChunk {
  group: THREE.Group;
  z: number;
}

interface SceneryProp {
  z: number;
  x: number;
  scaleY: number;
  scaleXZ: number;
  rotY: number;
  variant: number;
}

export class WorldEnvironment {
  private scene: THREE.Scene;
  private textures: ProceduralTextureSet;

  private roadChunks: RoadChunk[] = [];
  private oceanMesh!: THREE.Mesh;

  // Instanced scenery pools for 60fps Android performance
  private buildingMeshes: THREE.InstancedMesh[] = [];
  private buildingProps: SceneryProp[][] = [[], [], []];

  private palmTrunkInst!: THREE.InstancedMesh;
  private palmCrownInst!: THREE.InstancedMesh;
  private palmProps: SceneryProp[] = [];

  private mountainInst!: THREE.InstancedMesh;
  private mountainProps: SceneryProp[] = [];

  private lightPoleInst!: THREE.InstancedMesh;
  private lightLampInst!: THREE.InstancedMesh;
  private lightProps: SceneryProp[] = [];

  private readonly dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, textures: ProceduralTextureSet, receiveShadow: boolean) {
    this.scene = scene;
    this.textures = textures;
    this.buildSkyAndGround(receiveShadow);
    this.buildRoadChunks(receiveShadow);
    this.buildInstancedCity(receiveShadow);
    this.buildInstancedPalms();
    this.buildInstancedMountains();
    this.buildInstancedStreetlights();
    this.syncInstances();
  }

  private buildSkyAndGround(receiveShadow: boolean): void {
    // Vibrant sunlit coastal sky background
    this.scene.background = this.textures.skyTexture;
    this.scene.fog = new THREE.Fog(0xd4effe, 85, 255);

    // Coastal grass / park shoulder on the left side
    const leftGround = new THREE.Mesh(
      new THREE.PlaneGeometry(180, NUM_CHUNKS * CHUNK_LENGTH + 120),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        roughness: 0.92,
        metalness: 0.0,
      })
    );
    leftGround.rotation.x = -Math.PI / 2;
    leftGround.position.set(-95.3, -0.06, -110);
    leftGround.receiveShadow = receiveShadow;
    this.scene.add(leftGround);

    // Warm sandy beach boardwalk strip on the right flank
    const beachSand = new THREE.Mesh(
      new THREE.PlaneGeometry(22, NUM_CHUNKS * CHUNK_LENGTH + 120),
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        roughness: 0.9,
      })
    );
    beachSand.rotation.x = -Math.PI / 2;
    beachSand.position.set(16.3, -0.05, -110);
    beachSand.receiveShadow = receiveShadow;
    this.scene.add(beachSand);

    // Shimmering turquoise coastal ocean on the right
    this.oceanMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(240, NUM_CHUNKS * CHUNK_LENGTH + 140),
      new THREE.MeshStandardMaterial({
        map: this.textures.oceanTexture,
        color: 0x0ea5e9,
        roughness: 0.22,
        metalness: 0.35,
      })
    );
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(147, -0.25, -110);
    this.scene.add(this.oceanMesh);
  }

  private buildRoadChunks(receiveShadow: boolean): void {
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.asphaltMap,
      roughnessMap: this.textures.asphaltRoughnessMap,
      roughness: 0.85,
      metalness: 0.08,
    });

    const curbGeo = new THREE.BoxGeometry(0.65, 0.28, CHUNK_LENGTH);
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.7,
    });

    const railBeamGeo = new THREE.BoxGeometry(0.14, 0.24, CHUNK_LENGTH);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.72,
      roughness: 0.35,
    });

    const postGeo = new THREE.BoxGeometry(0.16, 0.72, 0.16);

    for (let i = 0; i < NUM_CHUNKS; i++) {
      const group = new THREE.Group();
      const z = 40 - i * CHUNK_LENGTH;

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = receiveShadow;
      group.add(road);

      const curbL = new THREE.Mesh(curbGeo, curbMat);
      curbL.position.set(-ROAD_WIDTH * 0.5 - 0.32, 0.12, 0);
      curbL.receiveShadow = receiveShadow;

      const curbR = new THREE.Mesh(curbGeo, curbMat);
      curbR.position.set(ROAD_WIDTH * 0.5 + 0.32, 0.12, 0);
      curbR.receiveShadow = receiveShadow;

      const railL = new THREE.Mesh(railBeamGeo, railMat);
      railL.position.set(-ROAD_WIDTH * 0.5 - 0.52, 0.58, 0);

      const railR = new THREE.Mesh(railBeamGeo, railMat);
      railR.position.set(ROAD_WIDTH * 0.5 + 0.52, 0.58, 0);

      group.add(curbL, curbR, railL, railR);

      // Guardrail posts
      for (let p = -15; p <= 15; p += 10) {
        const postL = new THREE.Mesh(postGeo, railMat);
        postL.position.set(-ROAD_WIDTH * 0.5 - 0.56, 0.36, p);
        const postR = new THREE.Mesh(postGeo, railMat);
        postR.position.set(ROAD_WIDTH * 0.5 + 0.56, 0.36, p);
        group.add(postL, postR);
      }

      group.position.z = z;
      this.scene.add(group);
      this.roadChunks.push({ group, z });
    }
  }

  private buildInstancedCity(receiveShadow: boolean): void {
    const counts = [14, 14, 14];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    this.textures.buildingTextures.forEach((tex, idx) => {
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.25,
      });
      const inst = new THREE.InstancedMesh(boxGeo, mat, counts[idx]);
      inst.frustumCulled = false;
      inst.castShadow = false;
      inst.receiveShadow = receiveShadow;
      this.scene.add(inst);
      this.buildingMeshes.push(inst);
    });

    const totalLen = NUM_CHUNKS * CHUNK_LENGTH;
    for (let i = 0; i < 42; i++) {
      const bucket = i % 3;
      const z = 40 - (i / 42) * totalLen;
      const sideX = -15 - Math.random() * 24;
      const height = 14 + Math.random() * 28;
      const width = 5.5 + Math.random() * 5.5;
      this.buildingProps[bucket].push({
        z,
        x: sideX,
        scaleY: height,
        scaleXZ: width,
        rotY: 0,
        variant: bucket,
      });
    }
  }

  private buildInstancedPalms(): void {
    const count = 36;
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 4.4, 7);
    trunkGeo.translate(0, 2.2, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });

    const crownGeo = new THREE.ConeGeometry(2.1, 1.5, 7);
    crownGeo.translate(0, 4.7, 0);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });

    this.palmTrunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    this.palmTrunkInst.frustumCulled = false;

    this.palmCrownInst = new THREE.InstancedMesh(crownGeo, crownMat, count);
    this.palmCrownInst.frustumCulled = false;

    const palette = [
      new THREE.Color(0x22c55e),
      new THREE.Color(0x16a34a),
      new THREE.Color(0x4ade80),
    ];

    const totalLen = NUM_CHUNKS * CHUNK_LENGTH;
    for (let i = 0; i < count; i++) {
      const onRight = i % 2 === 0;
      const x = onRight ? 7.8 + Math.random() * 4.5 : -7.6 - Math.random() * 2.5;
      const z = 40 - (i / count) * totalLen;
      const s = 0.85 + Math.random() * 0.3;
      this.palmProps.push({
        z,
        x,
        scaleY: s,
        scaleXZ: s,
        rotY: Math.random() * Math.PI * 2,
        variant: i % 3,
      });
      this.palmCrownInst.setColorAt(i, palette[i % palette.length]);
    }
    if (this.palmCrownInst.instanceColor) {
      this.palmCrownInst.instanceColor.needsUpdate = true;
    }

    this.scene.add(this.palmTrunkInst, this.palmCrownInst);
  }

  private buildInstancedMountains(): void {
    const count = 16;
    const geo = new THREE.ConeGeometry(24, 34, 6);
    geo.translate(0, 17, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.92,
      flatShading: true,
    });
    this.mountainInst = new THREE.InstancedMesh(geo, mat, count);
    this.mountainInst.frustumCulled = false;

    const tints = [
      new THREE.Color(0x475569),
      new THREE.Color(0x4d7c0f),
      new THREE.Color(0x3f6212),
      new THREE.Color(0x64748b),
    ];

    const totalLen = NUM_CHUNKS * CHUNK_LENGTH;
    for (let i = 0; i < count; i++) {
      const z = 40 - (i / count) * totalLen;
      this.mountainProps.push({
        z,
        x: -58 - Math.random() * 32,
        scaleY: 0.85 + Math.random() * 0.9,
        scaleXZ: 0.9 + Math.random() * 0.7,
        rotY: Math.random() * Math.PI,
        variant: i,
      });
      this.mountainInst.setColorAt(i, tints[i % tints.length]);
    }
    if (this.mountainInst.instanceColor) {
      this.mountainInst.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.mountainInst);
  }

  private buildInstancedStreetlights(): void {
    const count = 16;
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 6.2, 6);
    poleGeo.translate(0, 3.1, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });

    const lampGeo = new THREE.BoxGeometry(1.4, 0.16, 0.34);
    lampGeo.translate(0.6, 6.2, 0);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 0.65,
    });

    this.lightPoleInst = new THREE.InstancedMesh(poleGeo, poleMat, count);
    this.lightPoleInst.frustumCulled = false;

    this.lightLampInst = new THREE.InstancedMesh(lampGeo, lampMat, count);
    this.lightLampInst.frustumCulled = false;

    const totalLen = NUM_CHUNKS * CHUNK_LENGTH;
    for (let i = 0; i < count; i++) {
      const onRight = i % 2 === 1;
      this.lightProps.push({
        z: 40 - (i / count) * totalLen,
        x: onRight ? ROAD_WIDTH * 0.5 + 0.85 : -ROAD_WIDTH * 0.5 - 0.85,
        scaleY: 1,
        scaleXZ: 1,
        rotY: onRight ? Math.PI : 0,
        variant: 0,
      });
    }

    this.scene.add(this.lightPoleInst, this.lightLampInst);
  }

  private syncInstances(): void {
    // Buildings
    this.buildingProps.forEach((props, bucket) => {
      const inst = this.buildingMeshes[bucket];
      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        this.dummy.position.set(p.x, p.scaleY * 0.5 - 0.1, p.z);
        this.dummy.rotation.set(0, p.rotY, 0);
        this.dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);
        this.dummy.updateMatrix();
        inst.setMatrixAt(i, this.dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });

    // Palms
    for (let i = 0; i < this.palmProps.length; i++) {
      const p = this.palmProps[i];
      this.dummy.position.set(p.x, -0.05, p.z);
      this.dummy.rotation.set(0, p.rotY, 0);
      this.dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);
      this.dummy.updateMatrix();
      this.palmTrunkInst.setMatrixAt(i, this.dummy.matrix);
      this.palmCrownInst.setMatrixAt(i, this.dummy.matrix);
    }
    this.palmTrunkInst.instanceMatrix.needsUpdate = true;
    this.palmCrownInst.instanceMatrix.needsUpdate = true;

    // Mountains
    for (let i = 0; i < this.mountainProps.length; i++) {
      const p = this.mountainProps[i];
      this.dummy.position.set(p.x, -0.1, p.z);
      this.dummy.rotation.set(0, p.rotY, 0);
      this.dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);
      this.dummy.updateMatrix();
      this.mountainInst.setMatrixAt(i, this.dummy.matrix);
    }
    this.mountainInst.instanceMatrix.needsUpdate = true;

    // Streetlights
    for (let i = 0; i < this.lightProps.length; i++) {
      const p = this.lightProps[i];
      this.dummy.position.set(p.x, 0, p.z);
      this.dummy.rotation.set(0, p.rotY, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.lightPoleInst.setMatrixAt(i, this.dummy.matrix);
      this.lightLampInst.setMatrixAt(i, this.dummy.matrix);
    }
    this.lightPoleInst.instanceMatrix.needsUpdate = true;
    this.lightLampInst.instanceMatrix.needsUpdate = true;
  }

  public update(scrollDz: number): void {
    const totalLen = NUM_CHUNKS * CHUNK_LENGTH;
    const recycleZ = 45;

    for (const chunk of this.roadChunks) {
      chunk.z += scrollDz;
      if (chunk.z > recycleZ) {
        chunk.z -= totalLen;
      }
      chunk.group.position.z = chunk.z;
    }

    // Scroll ocean texture gently
    this.textures.oceanTexture.offset.y = (this.textures.oceanTexture.offset.y - scrollDz * 0.015) % 1;

    for (const groupProps of this.buildingProps) {
      for (const p of groupProps) {
        p.z += scrollDz;
        if (p.z > recycleZ + 12) p.z -= totalLen;
      }
    }
    for (const p of this.palmProps) {
      p.z += scrollDz;
      if (p.z > recycleZ) p.z -= totalLen;
    }
    for (const p of this.mountainProps) {
      p.z += scrollDz;
      if (p.z > recycleZ + 30) p.z -= totalLen;
    }
    for (const p of this.lightProps) {
      p.z += scrollDz;
      if (p.z > recycleZ) p.z -= totalLen;
    }

    this.syncInstances();
  }
}
