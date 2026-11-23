import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import {
  CAR_WIDTH_SAFE,
} from './constants';
import {
  buildGoldCoin,
  buildPlayerCar,
  buildTrafficVehicle,
  PlayerCarRig,
  TrafficKind,
  TrafficRig,
} from './carFactory';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import { LANE_POSITIONS, WorldEnvironment } from './worldBuilder';
import {
  CarSpec,
  GARAGE_CARS,
  GameMode,
  GameOverSummary,
  GraphicsQuality,
  RunTelemetry,
} from '../types/game';

interface ActiveTraffic {
  rig: TrafficRig;
  active: boolean;
  lane: number;
  x: number;
  z: number;
  forwardSpeed: number; // world units/sec moving forward (-Z)
  nearMissed: boolean;
}

interface ActiveCoin {
  mesh: THREE.Group;
  active: boolean;
  x: number;
  z: number;
  phase: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface EngineCallbacks {
  onTelemetry: (telemetry: RunTelemetry) => void;
  onGameOver: (summary: GameOverSummary) => void;
  onRequestPause: () => void;
}

const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _pDummy = new THREE.Object3D();

export class StreetRushEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private textures!: ProceduralTextureSet;
  private world!: WorldEnvironment;

  // Player car rigs cached by carId so switching in garage is instant
  private carRigs = new Map<string, PlayerCarRig>();
  private activeCarSpec: CarSpec = GARAGE_CARS[0];
  private activeCarRig!: PlayerCarRig;

  // Pooled traffic, coins, particles
  private trafficPool: ActiveTraffic[] = [];
  private coinPool: ActiveCoin[] = [];
  private particles: Particle[] = [];
  private particleInst!: THREE.InstancedMesh;

  // Simulation state
  private mode: GameMode = 'TITLE';
  private quality: GraphicsQuality = 'high';
  private frameId = 0;
  private lastTime = 0;
  private disposed = false;

  // Player physics
  private targetLane = 1;
  private playerX = 0;
  private prevPlayerX = 0;
  private steerAngle = 0;
  private wheelSpin = 0;
  private distanceMeters = 0;
  private score = 0;
  private bestScore = 0;
  private runCoins = 0;
  private coinStreak = 0;
  private nearMissCount = 0;
  private nearMissPopupId = 0;
  private coinPopupId = 0;

  private currentSpeedU = 26; // Three.js units/sec (1 unit/s ~ 3.6 km/h)
  private topSpeedReachedKmh = 0;
  private nitroCharge = 100;
  private nitroSwipeTimer = 0;
  private brakeSwipeTimer = 0;
  private heldBoost = false;
  private heldBrake = false;
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  // Spawner timers
  private spawnDistanceAccumulator = 0;
  private nextWaveGap = 24;
  private coinWaveCounter = 0;

  // Garage & Title orbit
  private orbitAngle = 0.55;
  private draggingGarage = false;
  private dragLastX = 0;

  // Touch swipe tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchActive = false;
  private touchHandledSwipe = false;

  // Keyboard held state
  private heldKeys = new Set<string>();

  // HUD throttle
  private lastTelemetryTime = 0;
  private nitroFlameAccum = 0;

  constructor(
    container: HTMLElement,
    initialCar: CarSpec,
    bestScore: number,
    quality: GraphicsQuality,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.activeCarSpec = initialCar;
    this.bestScore = bestScore;
    this.quality = quality;
    this.callbacks = callbacks;

    this.isSoftwareGl = StreetRushEngine.detectSoftwareWebGL();
    this.initRendererAndScene();
    this.initPools();
    this.selectCar(initialCar.id);
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    this.startLoop();
  }

  private static detectSoftwareWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRendererAndScene(): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.applyQualityPixelRatio();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Studio reflection environment for clearcoat car paint & chrome
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.2, 320);
    this.camera.position.set(4.5, 2.6, 7.5);
    this.camera.lookAt(0, 0.9, 0);

    // Warm/Cool Daytime Lighting Rig
    const hemi = new THREE.HemisphereLight(0x87cefa, 0x475569, 0.95);
    hemi.position.set(0, 60, 0);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff5e4, 2.35);
    this.sunLight.position.set(22, 38, 18);
    this.sunLight.castShadow = !this.isSoftwareGl && this.quality === 'high';
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.65);
    rimLight.position.set(-20, 14, -24);
    this.scene.add(rimLight);

    // Procedural Textures & Endless World
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.world = new WorldEnvironment(this.scene, this.textures, !this.isSoftwareGl);
  }

  private applyQualityPixelRatio(): void {
    if (!this.renderer) return;
    if (this.isSoftwareGl || this.quality === 'low') {
      this.renderer.setPixelRatio(1);
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
  }

  private initPools(): void {
    // Build all 5 player cars once for instant Garage switching
    for (const spec of GARAGE_CARS) {
      const rig = buildPlayerCar(spec, this.textures.contactShadowMap, !this.isSoftwareGl);
      rig.group.visible = false;
      this.scene.add(rig.group);
      this.carRigs.set(spec.id, rig);
    }

    // Traffic vehicle pool (18 vehicles)
    const kinds: TrafficKind[] = [
      'sedan', 'sedan', 'sedan', 'sedan', 'sedan', 'sedan',
      'sport', 'sport', 'sport', 'sport',
      'truck', 'truck', 'truck', 'truck',
      'barrier', 'barrier', 'barrier', 'barrier',
    ];
    for (const kind of kinds) {
      const rig = buildTrafficVehicle(kind, this.textures.contactShadowMap, !this.isSoftwareGl);
      rig.group.visible = false;
      this.scene.add(rig.group);
      this.trafficPool.push({
        rig,
        active: false,
        lane: 1,
        x: 0,
        z: -200,
        forwardSpeed: 12,
        nearMissed: false,
      });
    }

    // Gold Coin pool (36 coins)
    for (let i = 0; i < 36; i++) {
      const mesh = buildGoldCoin(this.textures.contactShadowMap);
      mesh.visible = false;
      this.scene.add(mesh);
      this.coinPool.push({
        mesh,
        active: false,
        x: 0,
        z: -200,
        phase: i * 0.45,
      });
    }

    // Pooled instanced particle system (110 particles)
    const pGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInst = new THREE.InstancedMesh(pGeo, pMat, 110);
    this.particleInst.frustumCulled = false;
    this.particleInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < 110; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(0xffffff),
      });
      _pDummy.position.set(0, -50, 0);
      _pDummy.scale.set(0, 0, 0);
      _pDummy.updateMatrix();
      this.particleInst.setMatrixAt(i, _pDummy.matrix);
      this.particleInst.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.scene.add(this.particleInst);
  }

  public selectCar(carId: string): void {
    const spec = GARAGE_CARS.find((c) => c.id === carId) ?? GARAGE_CARS[0];
    this.activeCarSpec = spec;

    this.carRigs.forEach((rig, id) => {
      rig.group.visible = id === spec.id;
    });
    this.activeCarRig = this.carRigs.get(spec.id)!;
    this.activeCarRig.group.position.set(this.playerX, 0, 0);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.applyQualityPixelRatio();
    const enableShadows = !this.isSoftwareGl && quality === 'high';
    this.renderer.shadowMap.enabled = enableShadows;
    this.sunLight.castShadow = enableShadows;
  }

  public setBestScore(best: number): void {
    this.bestScore = best;
  }

  public setMode(nextMode: GameMode): void {
    this.mode = nextMode;
    if (nextMode === 'TITLE' || nextMode === 'GARAGE') {
      this.clearRunEntities();
      this.playerX = 0;
      this.targetLane = 1;
      this.activeCarRig.group.position.set(0, 0, 0);
      this.activeCarRig.bodyTiltGroup.rotation.set(0, 0, 0);
      this.activeCarRig.nitroFlames.forEach((f) => (f.visible = false));
      soundEngine.updateEngine(0, false, false);
    } else if (nextMode === 'PAUSED' || nextMode === 'GAMEOVER') {
      soundEngine.updateEngine(0, false, false);
    }
  }

  public startNewRun(): void {
    this.clearRunEntities();
    this.targetLane = 1;
    this.playerX = 0;
    this.prevPlayerX = 0;
    this.steerAngle = 0;
    this.distanceMeters = 0;
    this.score = 0;
    this.runCoins = 0;
    this.coinStreak = 0;
    this.nearMissCount = 0;
    this.currentSpeedU = 28 * this.activeCarSpec.speedMultiplier;
    this.topSpeedReachedKmh = Math.round(this.currentSpeedU * 3.6);
    this.nitroCharge = 100;
    this.nitroSwipeTimer = 0;
    this.brakeSwipeTimer = 0;
    this.heldBoost = false;
    this.heldBrake = false;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.spawnDistanceAccumulator = 0;
    this.nextWaveGap = 20;
    this.coinWaveCounter = 0;

    this.activeCarRig.group.position.set(0, 0, 0);
    this.activeCarRig.bodyTiltGroup.rotation.set(0, 0, 0);

    // Pre-populate a coin arc ahead so the first 2 seconds feel rewarding
    this.spawnCoinLine(1, -48, 5);
    this.mode = 'PLAYING';
    this.emitTelemetry(true);
  }

  private clearRunEntities(): void {
    for (const t of this.trafficPool) {
      t.active = false;
      t.rig.group.visible = false;
    }
    for (const c of this.coinPool) {
      c.active = false;
      c.mesh.visible = false;
    }
  }

  // ---- Input Actions ----
  public steerLeft(): void {
    if (this.mode !== 'PLAYING') return;
    if (this.targetLane > 0) {
      this.targetLane--;
      soundEngine.playSwipe();
    }
  }

  public steerRight(): void {
    if (this.mode !== 'PLAYING') return;
    if (this.targetLane < 2) {
      this.targetLane++;
      soundEngine.playSwipe();
    }
  }

  public triggerNitroPulse(): void {
    if (this.mode !== 'PLAYING') return;
    if (this.nitroCharge >= 12) {
      this.nitroSwipeTimer = 1.65;
      this.brakeSwipeTimer = 0;
    }
  }

  public triggerBrakePulse(): void {
    if (this.mode !== 'PLAYING') return;
    this.brakeSwipeTimer = 0.85;
    this.nitroSwipeTimer = 0;
  }

  public setHeldBoost(active: boolean): void {
    this.heldBoost = active;
    if (active) this.brakeSwipeTimer = 0;
  }

  public setHeldBrake(active: boolean): void {
    this.heldBrake = active;
    if (active) this.nitroSwipeTimer = 0;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    const dom = this.renderer.domElement;
    dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    dom.addEventListener('touchmove', this.onTouchMove, { passive: false });
    dom.addEventListener('touchend', this.onTouchEnd, { passive: true });
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.applyQualityPixelRatio();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    soundEngine.unlock();
    if (this.heldKeys.has(e.code)) return;
    this.heldKeys.add(e.code);

    if (this.mode === 'PLAYING') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.steerLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.steerRight();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.heldBoost = true;
        this.brakeSwipeTimer = 0;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.heldBrake = true;
        this.nitroSwipeTimer = 0;
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        this.callbacks.onRequestPause();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.heldBoost = false;
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.heldBrake = false;
    }
  };

  private onWindowBlur = (): void => {
    this.heldKeys.clear();
    this.heldBoost = false;
    this.heldBrake = false;
    this.draggingGarage = false;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.onWindowBlur();
      if (this.mode === 'PLAYING') {
        this.callbacks.onRequestPause();
      }
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    soundEngine.unlock();
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchActive = true;
    this.touchHandledSwipe = false;

    if (this.mode === 'GARAGE') {
      this.draggingGarage = true;
      this.dragLastX = t.clientX;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.touchActive || e.touches.length === 0) return;
    const t = e.touches[0];

    if (this.mode === 'GARAGE' && this.draggingGarage) {
      const dx = t.clientX - this.dragLastX;
      this.dragLastX = t.clientX;
      this.orbitAngle -= dx * 0.009;
      return;
    }

    if (this.mode !== 'PLAYING' || this.touchHandledSwipe) return;
    e.preventDefault();

    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    const threshold = 24;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      this.touchHandledSwipe = true;
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx < 0) this.steerLeft();
        else this.steerRight();
      } else {
        if (dy < 0) this.triggerNitroPulse();
        else this.triggerBrakePulse();
      }
    }
  };

  private onTouchEnd = (): void => {
    this.touchActive = false;
    this.draggingGarage = false;
  };

  private onMouseDown = (e: MouseEvent): void => {
    soundEngine.unlock();
    if (this.mode === 'GARAGE') {
      this.draggingGarage = true;
      this.dragLastX = e.clientX;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.mode === 'GARAGE' && this.draggingGarage) {
      const dx = e.clientX - this.dragLastX;
      this.dragLastX = e.clientX;
      this.orbitAngle -= dx * 0.008;
    }
  };

  private onMouseUp = (): void => {
    this.draggingGarage = false;
  };

  // ---- Main Loop ----
  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt, now);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, nowMs: number): void {
    if (this.mode === 'TITLE') {
      this.orbitAngle += dt * 0.28;
      this.world.update(dt * 12);
      this.wheelSpin -= dt * 16;
      for (const w of this.activeCarRig.wheels) w.rotation.x = this.wheelSpin;

      _camPos.set(Math.sin(this.orbitAngle) * 6.8, 2.45, Math.cos(this.orbitAngle) * 6.8);
      this.camera.position.lerp(_camPos, 1 - Math.exp(-5 * dt));
      _camLook.set(0, 0.95, -0.4);
      this.camera.lookAt(_camLook);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 5, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.mode === 'GARAGE') {
      if (!this.draggingGarage) {
        this.orbitAngle += dt * 0.22;
      }
      this.world.update(0);
      _camPos.set(Math.sin(this.orbitAngle) * 6.2, 2.15, Math.cos(this.orbitAngle) * 6.2);
      this.camera.position.lerp(_camPos, 1 - Math.exp(-6 * dt));
      _camLook.set(0, 0.78, 0);
      this.camera.lookAt(_camLook);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 48, 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.mode === 'PAUSED' || this.mode === 'SETTINGS') {
      return;
    }

    if (this.mode === 'GAMEOVER') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
        return;
      }
      this.updateParticles(dt);
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 5, dt);
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      _camPos.set(this.playerX * 0.6 + 2.4 + sx, 4.3 + sy, 10.2);
      this.camera.position.lerp(_camPos, 1 - Math.exp(-4 * dt));
      _camLook.set(this.playerX, 0.85, -1.5);
      this.camera.lookAt(_camLook);
      return;
    }

    // ---- PLAYING SIMULATION ----
    if (this.nitroSwipeTimer > 0) this.nitroSwipeTimer = Math.max(0, this.nitroSwipeTimer - dt);
    if (this.brakeSwipeTimer > 0) this.brakeSwipeTimer = Math.max(0, this.brakeSwipeTimer - dt);

    const wantsBoost = (this.heldBoost || this.nitroSwipeTimer > 0) && this.nitroCharge > 1;
    const wantsBrake = !wantsBoost && (this.heldBrake || this.brakeSwipeTimer > 0);

    // Progressive base speed curve with distance
    const progressionBonus = Math.min(34, this.distanceMeters * 0.011);
    const baseCruiseU = (29 + progressionBonus) * this.activeCarSpec.speedMultiplier;

    let targetSpeedU = baseCruiseU;
    if (wantsBoost) {
      targetSpeedU = baseCruiseU * 1.44;
      this.nitroCharge = Math.max(0, this.nitroCharge - this.activeCarSpec.nitroDrainRate * dt);
      if (this.nitroCharge <= 0.5) {
        this.nitroSwipeTimer = 0;
      }
    } else if (wantsBrake) {
      targetSpeedU = Math.max(17, baseCruiseU * 0.62);
      this.nitroCharge = Math.min(100, this.nitroCharge + 7 * dt);
    } else {
      this.nitroCharge = Math.min(100, this.nitroCharge + 5.5 * dt);
    }

    this.currentSpeedU = THREE.MathUtils.damp(this.currentSpeedU, targetSpeedU, 4.2, dt);
    const speedKmh = Math.round(this.currentSpeedU * 3.6);
    if (speedKmh > this.topSpeedReachedKmh) {
      this.topSpeedReachedKmh = speedKmh;
    }

    // Engine audio
    soundEngine.updateEngine(speedKmh, wantsBoost, true);

    // Move road & scenery
    const frameDz = this.currentSpeedU * dt;
    this.distanceMeters += frameDz * 0.9;
    this.score += frameDz * (wantsBoost ? 2.4 : 1.2);
    this.world.update(frameDz);

    // Smooth lateral lane transition + chassis roll + wheel turn
    this.prevPlayerX = this.playerX;
    const targetX = LANE_POSITIONS[this.targetLane];
    this.playerX = THREE.MathUtils.damp(
      this.playerX,
      targetX,
      this.activeCarSpec.laneSnapSpeed,
      dt
    );
    const lateralVel = (this.playerX - this.prevPlayerX) / dt;
    this.steerAngle = THREE.MathUtils.damp(
      this.steerAngle,
      THREE.MathUtils.clamp(-lateralVel * 0.032, -0.35, 0.35),
      14,
      dt
    );

    this.activeCarRig.group.position.x = this.playerX;
    this.activeCarRig.bodyTiltGroup.rotation.z = THREE.MathUtils.clamp(lateralVel * 0.022, -0.16, 0.16);
    this.activeCarRig.bodyTiltGroup.rotation.y = this.steerAngle * 0.45;
    this.activeCarRig.bodyTiltGroup.rotation.x = wantsBoost ? -0.028 : wantsBrake ? 0.032 : 0;

    // Spin wheels & steer front pivots
    this.wheelSpin -= frameDz * 2.3;
    for (const w of this.activeCarRig.wheels) w.rotation.x = this.wheelSpin;
    for (const p of this.activeCarRig.frontPivots) p.rotation.y = this.steerAngle;

    // Brake lights & Nitro flames
    this.activeCarRig.brakeLightMat.emissiveIntensity = wantsBrake ? 3.5 : 1.1;
    const flameScale = 0.8 + Math.random() * 0.55;
    for (const flame of this.activeCarRig.nitroFlames) {
      flame.visible = wantsBoost;
      if (wantsBoost) {
        flame.scale.set(1, 1, flameScale);
      }
    }
    if (wantsBoost) {
      this.nitroFlameAccum += dt;
      if (this.nitroFlameAccum > 0.03) {
        this.nitroFlameAccum = 0;
        this.emitBurst(this.playerX - 0.42, 0.33, 2.3, 1, 0x06b6d4, 3.2);
        this.emitBurst(this.playerX + 0.42, 0.33, 2.3, 1, 0x38bdf8, 3.2);
      }
    }

    // Spawn Traffic & Coins
    this.spawnDistanceAccumulator += frameDz;
    if (this.spawnDistanceAccumulator >= this.nextWaveGap) {
      this.spawnDistanceAccumulator = 0;
      this.nextWaveGap = Math.max(15.5, 25 - Math.min(8, this.distanceMeters * 0.004));
      this.spawnTrafficWave();
    }

    // Update Traffic & Check Collisions / Near-Miss
    this.updateTrafficAndCollisions(dt, frameDz);

    // Update Gold Coins
    this.updateCoins(dt, frameDz);

    // Update Particles
    this.updateParticles(dt);

    // Third-person chase camera with dynamic boost FOV & shake
    const targetFov = wantsBoost ? 74 : wantsBrake ? 56 : 62;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
    this.camera.updateProjectionMatrix();

    this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 8, dt);
    const boostJitter = wantsBoost ? 0.025 : 0;
    const sx = (Math.random() - 0.5) * (this.shakeIntensity + boostJitter);
    const sy = (Math.random() - 0.5) * (this.shakeIntensity + boostJitter);

    _camPos.set(this.playerX * 0.7 + sx, 3.45 + sy, 8.15 + (wantsBoost ? 0.45 : 0));
    this.camera.position.lerp(_camPos, 1 - Math.exp(-9 * dt));
    _camLook.set(this.playerX * 0.45, 1.1, -15);
    this.camera.lookAt(_camLook);

    // Emit React HUD telemetry at ~20Hz to keep React lightweight
    if (nowMs - this.lastTelemetryTime > 48) {
      this.lastTelemetryTime = nowMs;
      this.emitTelemetry(false, speedKmh, wantsBoost, wantsBrake);
    }
  }

  private spawnTrafficWave(): void {
    // Choose 1 or 2 occupied lanes while guaranteeing >= 1 open lane
    const lanes = [0, 1, 2];
    const numCars = Math.random() < Math.min(0.62, 0.28 + this.distanceMeters * 0.0002) ? 2 : 1;

    // Shuffle lanes
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }

    const chosen = lanes.slice(0, numCars);
    const freeLane = lanes[numCars];

    for (let i = 0; i < chosen.length; i++) {
      const lane = chosen[i];
      const zOffset = i === 1 ? -11 - Math.random() * 6 : 0;
      const spawnZ = -195 + zOffset;

      // Pick a vehicle kind
      const r = Math.random();
      const desiredKind: TrafficKind =
        r < 0.22 ? 'truck' : r < 0.36 ? 'barrier' : r < 0.65 ? 'sport' : 'sedan';

      const slot = this.trafficPool.find((t) => !t.active && t.rig.kind === desiredKind)
        ?? this.trafficPool.find((t) => !t.active);
      if (!slot) continue;

      slot.active = true;
      slot.lane = lane;
      slot.x = LANE_POSITIONS[lane];
      slot.z = spawnZ;
      slot.nearMissed = false;
      slot.forwardSpeed =
        slot.rig.kind === 'barrier'
          ? 0
          : slot.rig.kind === 'truck'
          ? 11 + Math.random() * 3
          : slot.rig.kind === 'sport'
          ? 17 + Math.random() * 5
          : 13.5 + Math.random() * 4;

      slot.rig.group.position.set(slot.x, 0, slot.z);
      slot.rig.group.visible = true;
    }

    // Spawn coin line in the open lane every 2 waves
    this.coinWaveCounter++;
    if (this.coinWaveCounter % 2 === 0) {
      this.spawnCoinLine(freeLane, -192, 4 + Math.floor(Math.random() * 2));
    }
  }

  private spawnCoinLine(lane: number, startZ: number, count: number): void {
    const x = LANE_POSITIONS[lane];
    let spawned = 0;
    for (const coin of this.coinPool) {
      if (!coin.active) {
        coin.active = true;
        coin.x = x;
        coin.z = startZ - spawned * 3.4;
        coin.mesh.position.set(coin.x, 0, coin.z);
        coin.mesh.visible = true;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private updateTrafficAndCollisions(dt: number, playerDz: number): void {
    const playerHalfW = CAR_WIDTH_SAFE;
    const playerHalfL = 1.85;

    for (const t of this.trafficPool) {
      if (!t.active) continue;

      // Traffic moves forward (-Z), relative to player speed (+Z)
      const relDz = playerDz - t.forwardSpeed * dt;
      t.z += relDz;
      t.rig.group.position.z = t.z;

      // Spin traffic wheels forward
      if (t.forwardSpeed > 0) {
        const wDelta = -t.forwardSpeed * dt * 2.2;
        for (const w of t.rig.wheels) w.rotation.x += wDelta;
      }

      // Collision check near player z = 0
      const dz = Math.abs(t.z);
      const dx = Math.abs(t.x - this.playerX);

      if (dz < playerHalfL + t.rig.halfLength && dx < playerHalfW + t.rig.halfWidth) {
        this.handleCrash();
        return;
      }

      // Near-miss check
      if (
        !t.nearMissed &&
        t.z > 0.5 &&
        t.z < 4.5 &&
        dx < playerHalfW + t.rig.halfWidth + 1.45
      ) {
        t.nearMissed = true;
        this.nearMissCount++;
        this.nearMissPopupId++;
        this.score += 50;
        this.nitroCharge = Math.min(100, this.nitroCharge + 14);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
        soundEngine.playNearMiss();
        this.emitBurst(this.playerX, 0.7, 0.3, 6, 0x38bdf8, 6);
      }

      if (t.z > 24) {
        t.active = false;
        t.rig.group.visible = false;
      }
    }
  }

  private updateCoins(dt: number, playerDz: number): void {
    for (const coin of this.coinPool) {
      if (!coin.active) continue;

      coin.z += playerDz;
      coin.phase += dt * 4.5;
      coin.mesh.position.z = coin.z;
      coin.mesh.rotation.y = coin.phase;
      coin.mesh.position.y = Math.sin(coin.phase * 1.4) * 0.12;

      const dx = Math.abs(coin.x - this.playerX);
      const dz = Math.abs(coin.z);
      if (dx < 1.35 && dz < 2.1) {
        coin.active = false;
        coin.mesh.visible = false;
        this.runCoins++;
        this.coinStreak++;
        this.coinPopupId++;
        this.score += 25;
        this.nitroCharge = Math.min(100, this.nitroCharge + 6);
        soundEngine.playCoin(this.coinStreak);
        this.emitBurst(coin.x, 0.9, coin.z, 8, 0xfacc15, 7);
        continue;
      }

      if (coin.z > 18) {
        coin.active = false;
        coin.mesh.visible = false;
        this.coinStreak = 0;
      }
    }
  }

  private handleCrash(): void {
    this.mode = 'GAMEOVER';
    this.hitstopTimer = 0.06;
    this.shakeIntensity = 0.55;
    this.activeCarRig.nitroFlames.forEach((f) => (f.visible = false));
    soundEngine.updateEngine(0, false, false);
    soundEngine.playCrash();

    this.emitBurst(this.playerX, 0.85, -1.2, 24, 0xff5500, 11);
    this.emitBurst(this.playerX, 1.0, -1.0, 14, 0xfacc15, 9);
    this.emitBurst(this.playerX, 0.7, -0.8, 12, 0x334155, 6);

    const finalScore = Math.floor(this.score);
    const isNewBest = finalScore > this.bestScore;
    if (isNewBest) {
      this.bestScore = finalScore;
    }

    this.emitTelemetry(true);
    this.callbacks.onGameOver({
      finalScore,
      isNewBest,
      coinsEarned: this.runCoins,
      distanceMeters: Math.floor(this.distanceMeters),
      topSpeedKmh: this.topSpeedReachedKmh,
      nearMissCount: this.nearMissCount,
    });
  }

  private emitBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    speed: number
  ): void {
    let emitted = 0;
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.5;
        p.y = y + (Math.random() - 0.5) * 0.4;
        p.z = z + (Math.random() - 0.5) * 0.5;
        p.vx = (Math.random() - 0.5) * speed;
        p.vy = Math.random() * speed * 0.65 + 1.5;
        p.vz = (Math.random() - 0.5) * speed + 2;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.life = p.maxLife;
        p.size = 0.65 + Math.random() * 0.8;
        p.color.setHex(hexColor);
        emitted++;
        if (emitted >= count) break;
      }
    }
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _pDummy.position.set(0, -50, 0);
        _pDummy.scale.set(0, 0, 0);
        _pDummy.updateMatrix();
        this.particleInst.setMatrixAt(i, _pDummy.matrix);
        continue;
      }

      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.08, p.y + p.vy * dt);
      p.z += p.vz * dt;

      const s = p.size * (p.life / p.maxLife);
      _pDummy.position.set(p.x, p.y, p.z);
      _pDummy.rotation.set(p.life * 6, p.life * 4, 0);
      _pDummy.scale.set(s, s, s);
      _pDummy.updateMatrix();
      this.particleInst.setMatrixAt(i, _pDummy.matrix);
      this.particleInst.setColorAt(i, p.color);
    }

    if (anyChanged) {
      this.particleInst.instanceMatrix.needsUpdate = true;
      if (this.particleInst.instanceColor) {
        this.particleInst.instanceColor.needsUpdate = true;
      }
    }
  }

  private emitTelemetry(
    force: boolean,
    speedKmh = Math.round(this.currentSpeedU * 3.6),
    isBoosting = false,
    isBraking = false
  ): void {
    if (force) {
      this.lastTelemetryTime = performance.now();
    }
    this.callbacks.onTelemetry({
      score: Math.floor(this.score),
      distanceMeters: Math.floor(this.distanceMeters),
      runCoins: this.runCoins,
      speedKmh,
      nitroCharge: Math.round(this.nitroCharge),
      isBoosting,
      isBraking,
      nearMissCount: this.nearMissCount,
      nearMissPopupId: this.nearMissPopupId,
      coinPopupId: this.coinPopupId,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    const dom = this.renderer.domElement;
    dom.removeEventListener('touchstart', this.onTouchStart);
    dom.removeEventListener('touchmove', this.onTouchMove);
    dom.removeEventListener('touchend', this.onTouchEnd);
    dom.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    soundEngine.updateEngine(0, false, false);
    this.textures.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
