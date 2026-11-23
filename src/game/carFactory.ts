import * as THREE from 'three';
import { CarSpec } from '../types/game';

export interface PlayerCarRig {
  group: THREE.Group;
  bodyTiltGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontPivots: THREE.Object3D[];
  brakeLightMat: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Mesh[];
}

export type TrafficKind = 'sedan' | 'sport' | 'truck' | 'barrier';

export interface TrafficRig {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  kind: TrafficKind;
  halfWidth: number;
  halfLength: number;
}

function createWheel(
  radius: number,
  width: number,
  tireMat: THREE.Material,
  rimMat: THREE.Material,
  castShadow: boolean
): THREE.Group {
  const wheelGroup = new THREE.Group();

  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = castShadow;
  wheelGroup.add(tire);

  const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheelGroup.add(rim);

  // Spokes cross for spinning readability
  const spokeGeo = new THREE.BoxGeometry(width + 0.03, radius * 1.05, 0.06);
  const spoke1 = new THREE.Mesh(spokeGeo, rimMat);
  const spoke2 = new THREE.Mesh(spokeGeo, rimMat);
  spoke2.rotation.x = Math.PI / 2;
  wheelGroup.add(spoke1, spoke2);

  return wheelGroup;
}

/**
 * Builds one of the 5 unlockable composite procedural sports cars (8-12 distinct parts)
 * with grounded bottom-center pivot (y = 0) and studio clearcoat PBR paint.
 */
export function buildPlayerCar(
  spec: CarSpec,
  contactShadowMap: THREE.Texture,
  castShadow = true
): PlayerCarRig {
  const group = new THREE.Group();
  const bodyTiltGroup = new THREE.Group();
  group.add(bodyTiltGroup);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.primaryColor),
    metalness: 0.72,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const accentMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.accentColor),
    metalness: 0.65,
    roughness: 0.25,
    clearcoat: 0.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.trimColor),
    metalness: 0.35,
    roughness: 0.75,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.15,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.05,
    roughness: 0.88,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: spec.bodyStyle === 'hyper' ? 0x38bdf8 : 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.18,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });

  // Ground contact shadow plane (y = 0.02)
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 5.1),
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  const isWide = spec.bodyStyle === 'muscle' || spec.bodyStyle === 'hyper';
  const bodyWidth = isWide ? 1.96 : 1.84;
  const bodyLength = spec.bodyStyle === 'hyper' ? 4.35 : 4.15;

  // 1. Lower Aero Undertray / Splitter
  const undertray = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth + 0.08, 0.16, bodyLength + 0.14),
    trimMat
  );
  undertray.position.set(0, 0.28, 0);
  undertray.castShadow = castShadow;
  bodyTiltGroup.add(undertray);

  // 2. Sculpted Main Chassis Hull (ExtrudeGeometry with beveled profile)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-bodyLength * 0.5, 0);
  hullShape.lineTo(bodyLength * 0.5, 0);
  hullShape.lineTo(bodyLength * 0.46, 0.44);
  hullShape.lineTo(bodyLength * 0.16, 0.56);
  hullShape.lineTo(-bodyLength * 0.24, 0.58);
  hullShape.lineTo(-bodyLength * 0.48, 0.42);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: bodyWidth - 0.12,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  hullGeo.center();
  hullGeo.rotateY(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, paintMat);
  hull.position.set(0, 0.62, 0);
  hull.castShadow = castShadow;
  hull.receiveShadow = true;
  bodyTiltGroup.add(hull);

  // 3. Cockpit Canopy (tapered glasshouse)
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.15, 0);
  cabinShape.lineTo(1.05, 0);
  cabinShape.lineTo(0.55, 0.44);
  cabinShape.lineTo(-0.55, 0.44);
  cabinShape.closePath();

  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: bodyWidth * 0.72,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  cabinGeo.center();
  cabinGeo.rotateY(Math.PI / 2);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 1.04, 0.15);
  cabin.castShadow = castShadow;
  bodyTiltGroup.add(cabin);

  // 4. Roof Panel Cap
  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth * 0.66, 0.06, 1.1),
    spec.bodyStyle === 'exotic' || spec.bodyStyle === 'hyper' ? trimMat : paintMat
  );
  roofCap.position.set(0, 1.27, 0.18);
  bodyTiltGroup.add(roofCap);

  // 5. Center Racing Stripe / Hood Intake Accent
  if (spec.bodyStyle === 'muscle') {
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.95), trimMat);
    blower.position.set(0, 0.95, -1.05);
    bodyTiltGroup.add(blower);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 1.7), accentMat);
    stripe.position.set(0, 0.91, -1.05);
    bodyTiltGroup.add(stripe);
  } else {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, bodyLength * 0.78), accentMat);
    stripe.position.set(0, 0.915, 0.02);
    bodyTiltGroup.add(stripe);
  }

  // 6. Tailored Rear Spoiler Wing
  const wingHeight = spec.bodyStyle === 'hyper' || spec.bodyStyle === 'drift' ? 0.34 : 0.22;
  const wingY = 0.92 + wingHeight;
  const wingWidth = bodyWidth + (spec.bodyStyle === 'drift' ? 0.16 : 0.02);

  const pylonGeo = new THREE.BoxGeometry(0.08, wingHeight, 0.26);
  const pylonL = new THREE.Mesh(pylonGeo, trimMat);
  pylonL.position.set(-0.52, 0.92 + wingHeight * 0.5, bodyLength * 0.41);
  const pylonR = new THREE.Mesh(pylonGeo, trimMat);
  pylonR.position.set(0.52, 0.92 + wingHeight * 0.5, bodyLength * 0.41);

  const wingBlade = new THREE.Mesh(
    new THREE.BoxGeometry(wingWidth, 0.07, 0.34),
    spec.bodyStyle === 'exotic' ? accentMat : trimMat
  );
  wingBlade.position.set(0, wingY, bodyLength * 0.43);
  wingBlade.rotation.x = -0.1;
  wingBlade.castShadow = castShadow;

  const endplateGeo = new THREE.BoxGeometry(0.05, 0.2, 0.4);
  const endL = new THREE.Mesh(endplateGeo, accentMat);
  endL.position.set(-wingWidth * 0.5, wingY - 0.02, bodyLength * 0.43);
  const endR = new THREE.Mesh(endplateGeo, accentMat);
  endR.position.set(wingWidth * 0.5, wingY - 0.02, bodyLength * 0.43);

  bodyTiltGroup.add(pylonL, pylonR, wingBlade, endL, endR);

  // 7. Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.18, 0.09, 0.16);
  const mirrorL = new THREE.Mesh(mirrorGeo, paintMat);
  mirrorL.position.set(-bodyWidth * 0.5 - 0.06, 0.95, -0.35);
  const mirrorR = new THREE.Mesh(mirrorGeo, paintMat);
  mirrorR.position.set(bodyWidth * 0.5 + 0.06, 0.95, -0.35);
  bodyTiltGroup.add(mirrorL, mirrorR);

  // 8. Front Headlights & Rear Taillights
  const hlGeo = new THREE.BoxGeometry(0.36, 0.11, 0.1);
  const hlL = new THREE.Mesh(hlGeo, headlightMat);
  hlL.position.set(-bodyWidth * 0.34, 0.62, -bodyLength * 0.49);
  const hlR = new THREE.Mesh(hlGeo, headlightMat);
  hlR.position.set(bodyWidth * 0.34, 0.62, -bodyLength * 0.49);
  bodyTiltGroup.add(hlL, hlR);

  const tlGeo = new THREE.BoxGeometry(0.42, 0.13, 0.1);
  const tlL = new THREE.Mesh(tlGeo, brakeLightMat);
  tlL.position.set(-bodyWidth * 0.32, 0.68, bodyLength * 0.49);
  const tlR = new THREE.Mesh(tlGeo, brakeLightMat);
  tlR.position.set(bodyWidth * 0.32, 0.68, bodyLength * 0.49);
  bodyTiltGroup.add(tlL, tlR);

  // 9. Dual Exhaust Pipes + Dynamic Nitro Jet Cones
  const pipeGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.22, 10);
  pipeGeo.rotateX(Math.PI / 2);
  const pipeL = new THREE.Mesh(pipeGeo, rimMat);
  pipeL.position.set(-0.42, 0.33, bodyLength * 0.5 + 0.05);
  const pipeR = new THREE.Mesh(pipeGeo, rimMat);
  pipeR.position.set(0.42, 0.33, bodyLength * 0.5 + 0.05);
  bodyTiltGroup.add(pipeL, pipeR);

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.9,
  });
  const flameGeo = new THREE.ConeGeometry(0.11, 0.95, 10);
  flameGeo.rotateX(Math.PI / 2);
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.42, 0.33, bodyLength * 0.5 + 0.52);
  flameL.visible = false;
  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(0.42, 0.33, bodyLength * 0.5 + 0.52);
  flameR.visible = false;
  bodyTiltGroup.add(flameL, flameR);

  // 10. Four Grounded Wheels (y = wheelRadius = 0.36)
  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const wheelX = bodyWidth * 0.48;
  const wheelZFront = -bodyLength * 0.31;
  const wheelZRear = bodyLength * 0.31;

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-wheelX, wheelRadius, wheelZFront);
  const wheelFL = createWheel(wheelRadius, wheelWidth, tireMat, rimMat, castShadow);
  frontLeftPivot.add(wheelFL);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(wheelX, wheelRadius, wheelZFront);
  const wheelFR = createWheel(wheelRadius, wheelWidth, tireMat, rimMat, castShadow);
  frontRightPivot.add(wheelFR);

  const wheelRL = createWheel(wheelRadius, wheelWidth, tireMat, rimMat, castShadow);
  wheelRL.position.set(-wheelX, wheelRadius, wheelZRear);

  const wheelRR = createWheel(wheelRadius, wheelWidth, tireMat, rimMat, castShadow);
  wheelRR.position.set(wheelX, wheelRadius, wheelZRear);

  group.add(frontLeftPivot, frontRightPivot, wheelRL, wheelRR);

  return {
    group,
    bodyTiltGroup,
    wheels: [wheelFL, wheelFR, wheelRL, wheelRR],
    frontPivots: [frontLeftPivot, frontRightPivot],
    brakeLightMat,
    nitroFlames: [flameL, flameR],
  };
}

const TRAFFIC_PALETTES = [0x3b82f6, 0x10b981, 0xf8fafc, 0x8b5cf6, 0xf97316, 0x64748b];

export function buildTrafficVehicle(
  kind: TrafficKind,
  contactShadowMap: THREE.Texture,
  castShadow = true
): TrafficRig {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.3, roughness: 0.1 });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.0,
  });

  if (kind === 'barrier') {
    // Construction striped highway roadblock
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.4),
      new THREE.MeshBasicMaterial({
        map: contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
    });

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.55), baseMat);
    legL.position.set(-0.95, 0.45, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.55), baseMat);
    legR.position.set(0.95, 0.45, 0);

    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.34, 0.16), orangeMat);
    rail1.position.set(0, 0.88, 0);
    rail1.castShadow = castShadow;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.18), whiteMat);
    stripe.position.set(0, 0.88, 0);

    const beaconL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.18, 10), beaconMat);
    beaconL.position.set(-0.85, 1.15, 0);
    const beaconR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.18, 10), beaconMat);
    beaconR.position.set(0.85, 1.15, 0);

    group.add(legL, legR, rail1, stripe, beaconL, beaconR);
    return { group, wheels, kind, halfWidth: 1.02, halfLength: 0.42 };
  }

  if (kind === 'truck') {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 7.6),
      new THREE.MeshBasicMaterial({
        map: contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.72,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    const cabColor = TRAFFIC_PALETTES[Math.floor(Math.random() * TRAFFIC_PALETTES.length)];
    const cabMat = new THREE.MeshPhysicalMaterial({
      color: cabColor,
      metalness: 0.45,
      roughness: 0.35,
      clearcoat: 0.6,
    });
    const cargoMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.65,
      metalness: 0.1,
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });

    // Cargo trailer box
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.28, 2.25, 4.6), cargoMat);
    cargo.position.set(0, 1.65, 0.85);
    cargo.castShadow = castShadow;
    cargo.receiveShadow = true;

    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(2.31, 0.35, 4.4), stripeMat);
    sideStripe.position.set(0, 1.65, 0.85);

    // Cab forward
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.65, 1.65), cabMat);
    cab.position.set(0, 1.25, -2.35);
    cab.castShadow = castShadow;

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.68, 0.1), glassMat);
    windshield.position.set(0, 1.52, -3.16);

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.25, 6.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    chassis.position.set(0, 0.42, 0);

    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), tailMat);
    tailL.position.set(-0.82, 0.62, 3.16);
    const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), tailMat);
    tailR.position.set(0.82, 0.62, 3.16);

    group.add(cargo, sideStripe, cab, windshield, chassis, tailL, tailR);

    const wheelZ = [-2.25, 0.65, 2.3];
    for (const wz of wheelZ) {
      const wL = createWheel(0.44, 0.3, tireMat, rimMat, castShadow);
      wL.position.set(-1.02, 0.44, wz);
      const wR = createWheel(0.44, 0.3, tireMat, rimMat, castShadow);
      wR.position.set(1.02, 0.44, wz);
      wheels.push(wL, wR);
      group.add(wL, wR);
    }

    return { group, wheels, kind, halfWidth: 1.08, halfLength: 3.15 };
  }

  // Sedan or Sport Traffic Car
  const isSport = kind === 'sport';
  const length = isSport ? 4.05 : 4.25;
  const width = isSport ? 1.84 : 1.82;
  const color = TRAFFIC_PALETTES[Math.floor(Math.random() * TRAFFIC_PALETTES.length)];
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 0.85,
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 4.9),
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.68,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const lower = new THREE.Mesh(
    new THREE.BoxGeometry(width, isSport ? 0.48 : 0.56, length),
    bodyMat
  );
  lower.position.set(0, isSport ? 0.54 : 0.6, 0);
  lower.castShadow = castShadow;
  lower.receiveShadow = true;

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.78, isSport ? 0.42 : 0.52, length * 0.52),
    glassMat
  );
  cabin.position.set(0, isSport ? 0.96 : 1.08, 0.12);
  cabin.castShadow = castShadow;

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.72, 0.07, length * 0.36),
    bodyMat
  );
  roof.position.set(0, isSport ? 1.19 : 1.35, 0.14);

  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.08), tailMat);
  tailL.position.set(-width * 0.32, 0.62, length * 0.5);
  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.08), tailMat);
  tailR.position.set(width * 0.32, 0.62, length * 0.5);

  group.add(lower, cabin, roof, tailL, tailR);

  if (isSport) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.92, 0.07, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    wing.position.set(0, 0.96, length * 0.44);
    group.add(wing);
  }

  const wzs = [-length * 0.32, length * 0.32];
  for (const wz of wzs) {
    const wL = createWheel(0.34, 0.26, tireMat, rimMat, castShadow);
    wL.position.set(-width * 0.48, 0.34, wz);
    const wR = createWheel(0.34, 0.26, tireMat, rimMat, castShadow);
    wR.position.set(width * 0.48, 0.34, wz);
    wheels.push(wL, wR);
    group.add(wL, wR);
  }

  return { group, wheels, kind, halfWidth: width * 0.46, halfLength: length * 0.46 };
}

export function buildGoldCoin(contactShadowMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.32,
    metalness: 0.92,
    roughness: 0.16,
    clearcoat: 0.9,
  });

  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.2,
  });

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.14, 18), goldMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.85;

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.18), innerMat);
  core.rotation.z = Math.PI / 4;
  core.position.y = 0.85;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;

  group.add(rim, core, shadow);
  return group;
}
