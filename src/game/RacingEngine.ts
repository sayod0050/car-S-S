import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import {
  AIDifficulty,
  CarSpec,
  CarUpgrades,
  DEFAULT_UPGRADES,
  GraphicsQuality,
  MapId,
  RACING_CARS,
  RaceModeId,
  RaceResult,
  RaceTelemetry,
} from '../types/game';
import { buildRacingCar, CarRig } from './carFactory';
import { createRacingTextures, RacingTextureSet } from './textures';
import { RaceTrack, TRACK_HALF_WIDTH } from './trackSystem';

interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  spec: CarSpec;
  rig: CarRig;
  /** Total distance traveled forward from start (meters) */
  progressDist: number;
  /** Lateral track offset u in [-TRACK_HALF_WIDTH, +TRACK_HALF_WIDTH] */
  u: number;
  targetU: number;
  speedMs: number; // meters/sec
  lateralVel: number;
  driftSlip: number; // visual yaw slip angle during drift
  nitroCharge: number;
  isBoosting: boolean;
  isDrifting: boolean;
  finished: boolean;
  finishTimeSec: number;
  aiBaseFactor: number;
  aiLaneTimer: number;
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

export interface RaceLaunchConfig {
  mode: RaceModeId;
  map: MapId;
  difficulty: AIDifficulty;
  playerCar: CarSpec;
  upgrades: CarUpgrades;
  championshipRound?: number;
}

interface EngineCallbacks {
  onTelemetry: (t: RaceTelemetry) => void;
  onFinish: (result: RaceResult) => void;
  onRequestPause: () => void;
}

const AI_NAMES = ['Turbo Max', 'Drift Kai', 'Viper Ace', 'Apex Kira', 'Nitro Leo'];

const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _pDummy = new THREE.Object3D();

export class RacingEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private textures!: RacingTextureSet;

  private track: RaceTrack | null = null;
  private activeMap: MapId = 'city';
  private showroomRig: CarRig | null = null;
  private showroomSpec: CarSpec = RACING_CARS[0];

  private racers: RacerState[] = [];
  private particles: Particle[] = [];
  private particleInst!: THREE.InstancedMesh;

  // Engine mode
  private engineView: 'SHOWROOM' | 'RACING' | 'PAUSED' | 'FINISHED' = 'SHOWROOM';
  private quality: GraphicsQuality = 'high';
  private frameId = 0;
  private lastTime = 0;
  private disposed = false;

  // Current race config & timers
  private raceConfig: RaceLaunchConfig = {
    mode: 'quick',
    map: 'city',
    difficulty: 'medium',
    playerCar: RACING_CARS[0],
    upgrades: DEFAULT_UPGRADES,
  };
  private totalLaps = 1;
  private countdownTimer = 3.2;
  private lastCountdownShown = 4;
  private raceElapsedSec = 0;
  private driftPoints = 0;
  private activeDriftCombo = 0;
  private driftSmokeAccum = 0;
  private nitroFlameAccum = 0;
  private shakeIntensity = 0;
  private wheelSpin = 0;
  private sirenClock = 0;
  private lastTelemetryTime = 0;

  // Showroom camera orbit
  private orbitAngle = 0.6;
  private draggingShowroom = false;
  private dragLastX = 0;

  // Continuous input state (touch buttons + keyboard merged)
  private touchControls = {
    left: false,
    right: false,
    gas: false,
    brake: false,
    nitro: false,
  };
  private keyControls = {
    left: false,
    right: false,
    gas: false,
    brake: false,
    nitro: false,
  };

  constructor(
    container: HTMLElement,
    initialCar: CarSpec,
    initialMap: MapId,
    quality: GraphicsQuality,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.showroomSpec = initialCar;
    this.activeMap = initialMap;
    this.quality = quality;
    this.callbacks = callbacks;

    this.isSoftwareGl = RacingEngine.detectSoftwareWebGL();
    this.initRendererAndScene();
    this.initParticles();
    this.setupShowroom(initialCar, initialMap);
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    this.startLoop();
  }

  private static detectSoftwareWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
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
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.applyPixelRatio();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(56, w / h, 0.2, 420);
    this.camera.position.set(4.5, 2.2, 5.5);

    this.hemiLight = new THREE.HemisphereLight(0x87cefa, 0x475569, 0.95);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e4, 2.3);
    this.sunLight.position.set(30, 50, 25);
    this.sunLight.castShadow = !this.isSoftwareGl && this.quality === 'high';
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.textures = createRacingTextures(this.renderer.capabilities.getMaxAnisotropy());
  }

  private applyPixelRatio(): void {
    if (!this.renderer) return;
    if (this.isSoftwareGl || this.quality === 'low') {
      this.renderer.setPixelRatio(1);
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
  }

  private initParticles(): void {
    const pGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.particleInst = new THREE.InstancedMesh(pGeo, pMat, 140);
    this.particleInst.frustumCulled = false;
    this.particleInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < 140; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -80,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(0xffffff),
      });
      _pDummy.position.set(0, -80, 0);
      _pDummy.scale.set(0, 0, 0);
      _pDummy.updateMatrix();
      this.particleInst.setMatrixAt(i, _pDummy.matrix);
      this.particleInst.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.scene.add(this.particleInst);
  }

  private clearTrackAndCars(): void {
    if (this.track) {
      this.scene.remove(this.track.group);
      this.track.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.track = null;
    }

    if (this.showroomRig) {
      this.scene.remove(this.showroomRig.group);
      this.disposeCarRig(this.showroomRig);
      this.showroomRig = null;
    }

    for (const r of this.racers) {
      this.scene.remove(r.rig.group);
      this.disposeCarRig(r.rig);
    }
    this.racers = [];
  }

  private disposeCarRig(rig: CarRig): void {
    rig.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  private updateLightingForMap(mapId: MapId): void {
    const isNight = mapId === 'night';
    this.hemiLight.intensity = isNight ? 0.52 : 0.95;
    this.hemiLight.color.setHex(isNight ? 0x3b82f6 : 0x87cefa);
    this.sunLight.intensity = isNight ? 0.85 : 2.3;
    this.sunLight.color.setHex(isNight ? 0x93c5fd : mapId === 'desert' ? 0xffedd5 : 0xfff5e4);
  }

  public setupShowroom(carSpec: CarSpec, mapId: MapId = this.activeMap): void {
    this.clearTrackAndCars();
    this.showroomSpec = carSpec;
    this.activeMap = mapId;
    this.engineView = 'SHOWROOM';
    soundEngine.updateEngine(0, false, false, false);

    this.updateLightingForMap(mapId);
    this.track = new RaceTrack(
      this.scene,
      this.textures,
      mapId,
      false,
      !this.isSoftwareGl && this.quality === 'high'
    );

    const rig = buildRacingCar(
      carSpec,
      this.textures.contactShadowMap,
      !this.isSoftwareGl && this.quality === 'high'
    );
    const isNight = mapId === 'night';
    rig.headlightCones.forEach((c) => (c.visible = isNight));

    const smp = this.track.sampleAt(12, 0, _posA);
    rig.group.position.copy(_posA);
    rig.group.rotation.y = smp.yaw;
    this.scene.add(rig.group);
    this.showroomRig = rig;
  }

  public startRace(config: RaceLaunchConfig): void {
    this.clearTrackAndCars();
    this.raceConfig = config;
    this.activeMap = config.map;
    this.engineView = 'RACING';

    const isDrag = config.mode === 'drag';
    this.totalLaps =
      config.mode === 'circuit'
        ? 3
        : config.mode === 'timetrial' || config.mode === 'championship'
        ? 2
        : 1;

    this.countdownTimer = 3.2;
    this.lastCountdownShown = 4;
    this.raceElapsedSec = 0;
    this.driftPoints = 0;
    this.activeDriftCombo = 0;
    this.shakeIntensity = 0;
    this.resetInputs();

    this.updateLightingForMap(config.map);
    const castShadows = !this.isSoftwareGl && this.quality === 'high';
    this.track = new RaceTrack(this.scene, this.textures, config.map, isDrag, castShadows);

    const isNight = config.map === 'night';

    // Spawn Player Car
    const playerRig = buildRacingCar(config.playerCar, this.textures.contactShadowMap, castShadows);
    playerRig.headlightCones.forEach((c) => (c.visible = isNight));
    this.scene.add(playerRig.group);

    const startOffsetS = isDrag ? 8 : 0;
    const playerStartU = isDrag ? -3.2 : 3.2;

    this.racers.push({
      id: 'player',
      name: 'You',
      isPlayer: true,
      spec: config.playerCar,
      rig: playerRig,
      progressDist: startOffsetS,
      u: playerStartU,
      targetU: playerStartU,
      speedMs: 0,
      lateralVel: 0,
      driftSlip: 0,
      nitroCharge: 100,
      isBoosting: false,
      isDrifting: false,
      finished: false,
      finishTimeSec: 0,
      aiBaseFactor: 1,
      aiLaneTimer: 0,
    });

    // Spawn AI Opponents (5 in normal races, 1 in Drag Race, 0 in Time Trial / Drift)
    const aiCount =
      config.mode === 'timetrial' || config.mode === 'drift'
        ? 0
        : isDrag
        ? 1
        : 5;

    const diffMultiplier =
      config.difficulty === 'easy' ? 0.84 : config.difficulty === 'hard' ? 1.04 : 0.94;

    // Pick diverse AI cars near player car tier so races are exciting
    const otherCars = RACING_CARS.filter((c) => c.id !== config.playerCar.id);

    for (let i = 0; i < aiCount; i++) {
      const aiSpec = otherCars[(i * 3 + Math.floor(Math.random() * 2)) % otherCars.length];
      const aiRig = buildRacingCar(aiSpec, this.textures.contactShadowMap, castShadows);
      aiRig.headlightCones.forEach((c) => (c.visible = isNight));
      this.scene.add(aiRig.group);

      const gridRow = Math.floor((i + 1) / 2);
      const laneSide = i % 2 === 0 ? -3.2 : 3.2;
      const startS = isDrag ? 8 : -gridRow * 7.5;
      const startU = isDrag ? 3.2 : laneSide;

      this.racers.push({
        id: `ai_${i}`,
        name: AI_NAMES[i % AI_NAMES.length],
        isPlayer: false,
        spec: aiSpec,
        rig: aiRig,
        progressDist: startS,
        u: startU,
        targetU: startU,
        speedMs: 0,
        lateralVel: 0,
        driftSlip: 0,
        nitroCharge: 100,
        isBoosting: false,
        isDrifting: false,
        finished: false,
        finishTimeSec: 0,
        aiBaseFactor: diffMultiplier * (0.93 + (i / Math.max(1, aiCount)) * 0.14),
        aiLaneTimer: 0.4 + Math.random() * 1.2,
      });
    }

    this.positionAllRacersOnTrack();
    this.emitTelemetry(true);
  }

  public setPaused(paused: boolean): void {
    if (this.engineView === 'FINISHED' || this.engineView === 'SHOWROOM') return;
    this.engineView = paused ? 'PAUSED' : 'RACING';
    if (paused) {
      soundEngine.updateEngine(0, false, false, false);
      this.resetInputs();
    }
  }

  public setQuality(q: GraphicsQuality): void {
    this.quality = q;
    this.applyPixelRatio();
    const en = !this.isSoftwareGl && q === 'high';
    this.renderer.shadowMap.enabled = en;
    this.sunLight.castShadow = en;
  }

  public setTouchInput(control: keyof typeof this.touchControls, active: boolean): void {
    this.touchControls[control] = active;
  }

  private resetInputs(): void {
    this.touchControls = { left: false, right: false, gas: false, brake: false, nitro: false };
    this.keyControls = { left: false, right: false, gas: false, brake: false, nitro: false };
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    const dom = this.renderer.domElement;
    dom.addEventListener('touchstart', this.onTouchStart, { passive: true });
    dom.addEventListener('touchmove', this.onTouchMove, { passive: true });
    dom.addEventListener('touchend', this.onTouchEnd, { passive: true });
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.applyPixelRatio();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    soundEngine.unlock();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keyControls.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keyControls.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keyControls.gas = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keyControls.brake = true;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.keyControls.nitro = true;
    }
    if ((e.code === 'Escape' || e.code === 'KeyP') && this.engineView === 'RACING') {
      this.callbacks.onRequestPause();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keyControls.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keyControls.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.keyControls.gas = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') this.keyControls.brake = false;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.keyControls.nitro = false;
    }
  };

  private onWindowBlur = (): void => {
    this.resetInputs();
    this.draggingShowroom = false;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.onWindowBlur();
      if (this.engineView === 'RACING') {
        this.callbacks.onRequestPause();
      }
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    soundEngine.unlock();
    if (this.engineView === 'SHOWROOM' && e.touches.length > 0) {
      this.draggingShowroom = true;
      this.dragLastX = e.touches[0].clientX;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (this.engineView === 'SHOWROOM' && this.draggingShowroom && e.touches.length > 0) {
      const dx = e.touches[0].clientX - this.dragLastX;
      this.dragLastX = e.touches[0].clientX;
      this.orbitAngle -= dx * 0.009;
    }
  };

  private onTouchEnd = (): void => {
    this.draggingShowroom = false;
  };

  private onMouseDown = (e: MouseEvent): void => {
    soundEngine.unlock();
    if (this.engineView === 'SHOWROOM') {
      this.draggingShowroom = true;
      this.dragLastX = e.clientX;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.engineView === 'SHOWROOM' && this.draggingShowroom) {
      const dx = e.clientX - this.dragLastX;
      this.dragLastX = e.clientX;
      this.orbitAngle -= dx * 0.008;
    }
  };

  private onMouseUp = (): void => {
    this.draggingShowroom = false;
  };

  // ---- Main Render & Physics Loop ----
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
    this.sirenClock += dt;

    if (this.engineView === 'SHOWROOM' && this.track && this.showroomRig) {
      if (!this.draggingShowroom) {
        this.orbitAngle += dt * 0.35;
      }
      this.animatePoliceLights(this.showroomRig);
      const carPos = this.showroomRig.group.position;
      _camPos.set(
        carPos.x + Math.sin(this.orbitAngle) * 6.4,
        2.15,
        carPos.z + Math.cos(this.orbitAngle) * 6.4
      );
      this.camera.position.lerp(_camPos, 1 - Math.exp(-6 * dt));
      _camLook.set(carPos.x, 0.85, carPos.z);
      this.camera.lookAt(_camLook);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 50, 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.engineView === 'PAUSED') {
      return;
    }

    if (this.engineView === 'FINISHED') {
      this.updateParticles(dt);
      const player = this.racers[0];
      if (player) {
        this.orbitAngle += dt * 0.6;
        const cp = player.rig.group.position;
        _camPos.set(cp.x + Math.sin(this.orbitAngle) * 7.5, 2.8, cp.z + Math.cos(this.orbitAngle) * 7.5);
        this.camera.position.lerp(_camPos, 1 - Math.exp(-4 * dt));
        _camLook.set(cp.x, 0.9, cp.z);
        this.camera.lookAt(_camLook);
      }
      return;
    }

    if (!this.track || this.racers.length === 0) return;

    // Countdown Phase (3, 2, 1, GO!)
    if (this.countdownTimer > 0) {
      this.countdownTimer -= dt;
      const phase = Math.ceil(this.countdownTimer);
      if (phase < this.lastCountdownShown && phase >= 1 && phase <= 3) {
        this.lastCountdownShown = phase;
        soundEngine.playCountdown(false);
      } else if (this.countdownTimer <= 0) {
        this.lastCountdownShown = 0;
        soundEngine.playCountdown(true);
      }
    }

    const raceStarted = this.countdownTimer <= 0;
    if (raceStarted) {
      this.raceElapsedSec += dt;
    }

    // Update Player + AI Racers
    const player = this.racers[0];
    this.updatePlayer(player, dt, raceStarted);
    for (let i = 1; i < this.racers.length; i++) {
      this.updateAI(this.racers[i], player, dt, raceStarted);
    }

    if (raceStarted) {
      this.resolveCarCollisions();
    }

    this.positionAllRacersOnTrack();
    this.updateParticles(dt);

    // Move sunlight shadow frustum with player
    this.sunLight.position.set(
      player.rig.group.position.x + 26,
      46,
      player.rig.group.position.z + 22
    );
    this.sunLight.target.position.copy(player.rig.group.position);

    // Chase Camera behind player
    const trackSmp = this.track.sampleAt(player.progressDist, player.u, _posA);
    const camBack = player.isBoosting ? 8.8 : 7.8;
    const camHeight = 3.25;
    this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 8, dt);
    const sx = (Math.random() - 0.5) * this.shakeIntensity;
    const sy = (Math.random() - 0.5) * this.shakeIntensity;

    _camPos.set(
      _posA.x - trackSmp.tx * camBack + sx,
      camHeight + sy,
      _posA.z - trackSmp.tz * camBack
    );
    this.camera.position.lerp(_camPos, 1 - Math.exp(-10 * dt));
    _camLook.set(_posA.x + trackSmp.tx * 14, 1.05, _posA.z + trackSmp.tz * 14);
    this.camera.lookAt(_camLook);

    const targetFov = player.isBoosting ? 74 : 61;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
    this.camera.updateProjectionMatrix();

    // Check Finish Conditions
    this.checkRaceCompletion(player);

    if (nowMs - this.lastTelemetryTime > 45) {
      this.lastTelemetryTime = nowMs;
      this.emitTelemetry(false);
    }
  }

  private updatePlayer(player: RacerState, dt: number, raceStarted: boolean): void {
    const steerIn =
      (this.touchControls.right || this.keyControls.right ? 1 : 0) -
      (this.touchControls.left || this.keyControls.left ? 1 : 0);
    const gasHeld = this.touchControls.gas || this.keyControls.gas;
    const brakeHeld = this.touchControls.brake || this.keyControls.brake;
    const nitroHeld = this.touchControls.nitro || this.keyControls.nitro;

    // Upgrades multipliers
    const u = this.raceConfig.upgrades;
    const baseMaxKmh = player.spec.topSpeedKmh + (u.engine - 1) * 14;
    const maxSpeedMs = baseMaxKmh / 3.6;
    const accelRate = (18 + player.spec.accelStat * 0.24) * (1 + (u.turbo - 1) * 0.12);
    const steerRate = (11.5 + player.spec.handlingStat * 0.08) * (1 + (u.tires - 1) * 0.08);
    const nitroDrain = Math.max(10, 26 - (u.nitro - 1) * 3.2);

    if (!raceStarted) {
      player.speedMs = 0;
      player.rig.brakeLightMat.emissiveIntensity = brakeHeld ? 3.2 : 1.1;
      soundEngine.updateEngine(gasHeld ? 95 : 40, false, false, true);
      return;
    }

    const canBoost = nitroHeld && player.nitroCharge > 1.5;
    player.isBoosting = canBoost;

    if (canBoost) {
      player.nitroCharge = Math.max(0, player.nitroCharge - nitroDrain * dt);
      const boostMax = maxSpeedMs * (1.24 + (u.nitro - 1) * 0.03);
      player.speedMs = Math.min(boostMax, player.speedMs + accelRate * 1.8 * dt);
    } else if (brakeHeld) {
      player.speedMs = Math.max(0, player.speedMs - 38 * dt);
      player.nitroCharge = Math.min(100, player.nitroCharge + 8 * dt);
    } else if (gasHeld) {
      if (player.speedMs > maxSpeedMs) {
        player.speedMs = THREE.MathUtils.damp(player.speedMs, maxSpeedMs, 2.5, dt);
      } else {
        player.speedMs = Math.min(maxSpeedMs, player.speedMs + accelRate * dt);
      }
      player.nitroCharge = Math.min(100, player.nitroCharge + 5 * dt);
    } else {
      // Gentle rolling resistance
      player.speedMs = Math.max(0, player.speedMs - 9 * dt);
      player.nitroCharge = Math.min(100, player.nitroCharge + 6 * dt);
    }

    // Steering (Drag race limits lateral movement lightly so it stays a straight duel)
    const speedFactor = Math.min(1, player.speedMs / 18);
    const effectiveSteer = this.raceConfig.mode === 'drag' ? steerIn * 0.4 : steerIn;
    const targetLatVel = effectiveSteer * steerRate * speedFactor;
    player.lateralVel = THREE.MathUtils.damp(player.lateralVel, targetLatVel, 12, dt);
    player.u += player.lateralVel * dt;

    // Boundary guardrail deflection
    const bound = TRACK_HALF_WIDTH - 1.1;
    if (player.u < -bound) {
      player.u = -bound;
      player.lateralVel = Math.max(0, player.lateralVel * -0.3);
      player.speedMs *= 0.97;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
      this.emitBurst(player.rig.group.position.x, 0.5, player.rig.group.position.z, 3, 0xfacc15, 5);
    } else if (player.u > bound) {
      player.u = bound;
      player.lateralVel = Math.min(0, player.lateralVel * -0.3);
      player.speedMs *= 0.97;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
      this.emitBurst(player.rig.group.position.x, 0.5, player.rig.group.position.z, 3, 0xfacc15, 5);
    }

    // Drifting physics: hard steering at > 78 km/h kicks tail out + tire smoke + drift score
    const speedKmh = player.speedMs * 3.6;
    const isDrifting = Math.abs(steerIn) > 0 && speedKmh > 78 && this.raceConfig.mode !== 'drag';
    player.isDrifting = isDrifting;

    const targetSlip = isDrifting ? -steerIn * 0.24 * player.spec.driftFactor : 0;
    player.driftSlip = THREE.MathUtils.damp(player.driftSlip, targetSlip, 9, dt);

    if (isDrifting) {
      const gained = Math.round(speedKmh * 0.65 * player.spec.driftFactor * dt);
      this.driftPoints += gained;
      this.activeDriftCombo += gained;
      player.nitroCharge = Math.min(100, player.nitroCharge + 10 * dt);

      this.driftSmokeAccum += dt;
      if (this.driftSmokeAccum > 0.035) {
        this.driftSmokeAccum = 0;
        const cp = player.rig.group.position;
        this.emitBurst(cp.x, 0.22, cp.z, 2, 0xe2e8f0, 3.2);
      }
    } else {
      this.activeDriftCombo = 0;
    }

    // Nitro flames
    const flameScale = 0.85 + Math.random() * 0.5;
    player.rig.nitroFlames.forEach((f) => {
      f.visible = canBoost;
      if (canBoost) f.scale.set(1, 1, flameScale);
    });
    if (canBoost) {
      this.nitroFlameAccum += dt;
      if (this.nitroFlameAccum > 0.04) {
        this.nitroFlameAccum = 0;
        const cp = player.rig.group.position;
        this.emitBurst(cp.x, 0.35, cp.z, 1, 0x06b6d4, 4);
      }
    }

    // Visual wheel spin, steering pivots, brake lights, body roll
    this.wheelSpin -= player.speedMs * dt * 2.4;
    player.rig.wheels.forEach((w) => (w.rotation.x = this.wheelSpin));
    player.rig.frontPivots.forEach((p) => (p.rotation.y = -steerIn * 0.32));
    player.rig.brakeLightMat.emissiveIntensity = brakeHeld ? 3.5 : 1.1;
    player.rig.bodyGroup.rotation.z = THREE.MathUtils.clamp(player.lateralVel * 0.018, -0.14, 0.14);
    player.rig.bodyGroup.rotation.y = player.driftSlip;

    player.progressDist += player.speedMs * dt;
    soundEngine.updateEngine(speedKmh, canBoost, isDrifting, true);
  }

  private updateAI(
    ai: RacerState,
    player: RacerState,
    dt: number,
    raceStarted: boolean
  ): void {
    if (!raceStarted) return;

    const maxSpeedMs = (ai.spec.topSpeedKmh / 3.6) * ai.aiBaseFactor;
    // Gentle rubber-banding in circuit/quick races to keep races exciting
    const gap = player.progressDist - ai.progressDist;
    const rubberBand =
      this.raceConfig.mode === 'drag'
        ? 1.0
        : THREE.MathUtils.clamp(1 + gap * 0.0022, 0.9, 1.12);

    const targetSpeed = maxSpeedMs * rubberBand;
    const accel = (16 + ai.spec.accelStat * 0.2) * ai.aiBaseFactor;
    if (ai.speedMs < targetSpeed) {
      ai.speedMs = Math.min(targetSpeed, ai.speedMs + accel * dt);
    } else {
      ai.speedMs = THREE.MathUtils.damp(ai.speedMs, targetSpeed, 2, dt);
    }

    // Overtaking logic (skip in Drag Race where lanes are fixed)
    if (this.raceConfig.mode !== 'drag') {
      ai.aiLaneTimer -= dt;
      if (ai.aiLaneTimer <= 0) {
        ai.aiLaneTimer = 0.5 + Math.random() * 0.9;
        let blocked = false;
        for (const other of this.racers) {
          if (other === ai) continue;
          const ds = other.progressDist - ai.progressDist;
          if (ds > 0 && ds < 22 && Math.abs(other.u - ai.u) < 2.4) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          const lanes = [-5.0, -1.7, 1.7, 5.0];
          const open = lanes.filter((lu) => Math.abs(lu - ai.u) > 2.2);
          ai.targetU = open[Math.floor(Math.random() * open.length)] ?? 0;
        }
      }
    }

    ai.u = THREE.MathUtils.damp(ai.u, ai.targetU, 3.6, dt);
    ai.progressDist += ai.speedMs * dt;

    ai.rig.wheels.forEach((w) => (w.rotation.x -= ai.speedMs * dt * 2.4));
    this.animatePoliceLights(ai.rig);

    // Check if AI crossed finish line
    const targetDist = this.getTargetFinishDist();
    if (!ai.finished && ai.progressDist >= targetDist) {
      ai.finished = true;
      ai.finishTimeSec = this.raceElapsedSec;
    }
  }

  private resolveCarCollisions(): void {
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];
        const ds = Math.abs(a.progressDist - b.progressDist);
        const du = Math.abs(a.u - b.u);
        if (ds < 4.1 && du < 1.85) {
          // Lateral push apart + mild momentum transfer
          const pushSign = a.u <= b.u ? -1 : 1;
          const overlap = 1.9 - du;
          a.u += pushSign * overlap * 0.5;
          b.u -= pushSign * overlap * 0.5;

          const avg = (a.speedMs + b.speedMs) * 0.5;
          a.speedMs = THREE.MathUtils.lerp(a.speedMs, avg * 0.94, 0.35);
          b.speedMs = THREE.MathUtils.lerp(b.speedMs, avg * 0.94, 0.35);

          if (a.isPlayer || b.isPlayer) {
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.25);
            soundEngine.playCrash(false);
            const px = (a.rig.group.position.x + b.rig.group.position.x) * 0.5;
            const pz = (a.rig.group.position.z + b.rig.group.position.z) * 0.5;
            this.emitBurst(px, 0.65, pz, 7, 0xff5500, 7);
          }
        }
      }
    }
  }

  private positionAllRacersOnTrack(): void {
    if (!this.track) return;
    for (const r of this.racers) {
      const smp = this.track.sampleAt(r.progressDist, r.u, _posB);
      r.rig.group.position.copy(_posB);
      r.rig.group.rotation.y = smp.yaw;
      if (r.isPlayer) {
        this.animatePoliceLights(r.rig);
      }
    }
  }

  private animatePoliceLights(rig: CarRig): void {
    if (!rig.policeRedLight || !rig.policeBlueLight) return;
    const flash = Math.floor(this.sirenClock * 10) % 2 === 0;
    (rig.policeRedLight.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 4.0 : 0.4;
    (rig.policeBlueLight.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.4 : 4.0;
  }

  private getTargetFinishDist(): number {
    if (!this.track) return 800;
    if (this.raceConfig.mode === 'drag') return this.track.dragFinishS;
    return this.track.totalLength * this.totalLaps;
  }

  private getPlayerStanding(): number {
    const player = this.racers[0];
    if (!player) return 1;
    let rank = 1;
    for (let i = 1; i < this.racers.length; i++) {
      if (this.racers[i].progressDist > player.progressDist) {
        rank++;
      }
    }
    return rank;
  }

  private checkRaceCompletion(player: RacerState): void {
    const mode = this.raceConfig.mode;

    // Drift Mode finishes after 60s
    if (mode === 'drift') {
      if (this.raceElapsedSec >= 60) {
        this.finishRace(player);
      }
      return;
    }

    const targetDist = this.getTargetFinishDist();
    if (player.progressDist >= targetDist) {
      this.finishRace(player);
    }
  }

  private finishRace(player: RacerState): void {
    this.engineView = 'FINISHED';
    player.finished = true;
    player.finishTimeSec = this.raceElapsedSec;
    soundEngine.updateEngine(0, false, false, false);

    const mode = this.raceConfig.mode;
    const totalCars = this.racers.length;
    const pos = mode === 'drift' || mode === 'timetrial' ? 1 : this.getPlayerStanding();

    // Calculate Rewards
    let baseReward = 40;
    let targetBeat = pos === 1;

    if (mode === 'drift') {
      targetBeat = this.driftPoints >= 1500;
      baseReward = Math.min(260, 45 + Math.floor(this.driftPoints / 22));
    } else if (mode === 'timetrial') {
      const parSec = 78;
      targetBeat = this.raceElapsedSec <= parSec;
      baseReward = targetBeat ? 200 : 75;
    } else {
      const podiumMap: Record<number, number> = {
        1: mode === 'circuit' || mode === 'championship' ? 240 : 150,
        2: mode === 'circuit' || mode === 'championship' ? 150 : 95,
        3: mode === 'circuit' || mode === 'championship' ? 95 : 65,
      };
      baseReward = podiumMap[pos] ?? 35;
    }

    const driftBonus = mode === 'drift' ? 0 : Math.min(60, Math.floor(this.driftPoints / 50));
    const challengeBonus = targetBeat ? 50 : 0;
    const totalCoinsEarned = baseReward + driftBonus + challengeBonus;

    if (targetBeat || pos <= 2) {
      soundEngine.playVictory();
    } else {
      soundEngine.playButton();
    }

    const champPtsTable = [10, 6, 4, 2, 1, 1];
    const championshipPointsAwarded =
      mode === 'championship' ? champPtsTable[pos - 1] ?? 1 : undefined;

    this.emitTelemetry(true);
    this.callbacks.onFinish({
      mode,
      map: this.raceConfig.map,
      position: pos,
      totalCars,
      finishTimeSec: this.raceElapsedSec,
      driftPoints: this.driftPoints,
      targetBeat,
      baseReward,
      driftBonus,
      challengeBonus,
      totalCoinsEarned,
      championshipRound: this.raceConfig.championshipRound,
      championshipPointsAwarded,
    });
  }

  private emitBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    hex: number,
    speed: number
  ): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.6;
        p.y = y + Math.random() * 0.3;
        p.z = z + (Math.random() - 0.5) * 0.6;
        p.vx = (Math.random() - 0.5) * speed;
        p.vy = Math.random() * speed * 0.55 + 1.0;
        p.vz = (Math.random() - 0.5) * speed;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.life = p.maxLife;
        p.size = 0.8 + Math.random() * 0.9;
        p.color.setHex(hex);
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private updateParticles(dt: number): void {
    let changed = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      changed = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _pDummy.position.set(0, -80, 0);
        _pDummy.scale.set(0, 0, 0);
        _pDummy.updateMatrix();
        this.particleInst.setMatrixAt(i, _pDummy.matrix);
        continue;
      }
      p.x += p.vx * dt;
      p.y = Math.max(0.1, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const s = p.size * (p.life / p.maxLife);
      _pDummy.position.set(p.x, p.y, p.z);
      _pDummy.scale.set(s, s, s);
      _pDummy.updateMatrix();
      this.particleInst.setMatrixAt(i, _pDummy.matrix);
      this.particleInst.setColorAt(i, p.color);
    }
    if (changed) {
      this.particleInst.instanceMatrix.needsUpdate = true;
      if (this.particleInst.instanceColor) this.particleInst.instanceColor.needsUpdate = true;
    }
  }

  private emitTelemetry(force: boolean): void {
    if (force) this.lastTelemetryTime = performance.now();
    const player = this.racers[0];
    if (!player || !this.track) return;

    const cPhase = this.countdownTimer > 0 ? Math.ceil(this.countdownTimer) : this.raceElapsedSec < 0.7 ? 0 : -1;
    const cText = cPhase > 0 ? String(cPhase) : cPhase === 0 ? 'GO!' : '';

    const lapLen = this.raceConfig.mode === 'drag' ? this.track.dragFinishS : this.track.totalLength;
    const currentLap = Math.min(
      this.totalLaps,
      Math.max(1, Math.floor(Math.max(0, player.progressDist) / lapLen) + 1)
    );
    const targetDist = this.getTargetFinishDist();
    const progressPct = Math.min(100, Math.max(0, (player.progressDist / targetDist) * 100));

    this.callbacks.onTelemetry({
      countdownText: cText,
      countdownPhase: cPhase,
      speedKmh: Math.round(player.speedMs * 3.6),
      position: this.getPlayerStanding(),
      totalCars: this.racers.length,
      lap: currentLap,
      totalLaps: this.totalLaps,
      elapsedSec: this.raceElapsedSec,
      timeLimitSec: this.raceConfig.mode === 'drift' ? 60 : this.raceConfig.mode === 'timetrial' ? 78 : 0,
      nitroCharge: Math.round(player.nitroCharge),
      isBoosting: player.isBoosting,
      isDrifting: player.isDrifting,
      driftPoints: this.driftPoints,
      activeDriftCombo: this.activeDriftCombo,
      trackProgressPct: progressPct,
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

    soundEngine.updateEngine(0, false, false, false);
    this.clearTrackAndCars();
    this.textures.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
