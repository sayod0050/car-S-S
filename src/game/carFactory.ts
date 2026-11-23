import * as THREE from 'three';
import { CarSpec } from '../types/game';

export interface CarRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontPivots: THREE.Object3D[];
  brakeLightMat: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Mesh[];
  headlightCones: THREE.Mesh[];
  policeRedLight?: THREE.Mesh;
  policeBlueLight?: THREE.Mesh;
}

function makeWheel(
  radius: number,
  width: number,
  tireMat: THREE.Material,
  rimMat: THREE.Material,
  castShadow: boolean
): THREE.Group {
  const wGroup = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = castShadow;

  const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);

  const spokeGeo = new THREE.BoxGeometry(width + 0.03, radius * 1.05, 0.06);
  const s1 = new THREE.Mesh(spokeGeo, rimMat);
  const s2 = new THREE.Mesh(spokeGeo, rimMat);
  s2.rotation.x = Math.PI / 2;

  wGroup.add(tire, rim, s1, s2);
  return wGroup;
}

/**
 * Builds composite 3D vehicle models for all 7 car categories:
 * sports, supercar, muscle, drift, police, suv, race.
 * Forward direction is +Z? Wait — let's align car front toward -Z in local space
 * so standard Three.js forward (-Z) matches heading yaw cleanly.
 */
export function buildRacingCar(
  spec: CarSpec,
  contactShadowMap: THREE.Texture,
  castShadow = true
): CarRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.primaryColor),
    metalness: 0.7,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const accentMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.accentColor),
    metalness: 0.6,
    roughness: 0.25,
    clearcoat: 0.9,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.trimColor),
    metalness: 0.35,
    roughness: 0.72,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.2,
    roughness: 0.06,
    clearcoat: 1.0,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.88,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: spec.bodyStyle === 'race' ? 0xfacc15 : 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.18,
  });

  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 2.0,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.1,
  });

  const style = spec.bodyStyle;
  const isSUV = style === 'suv';
  const isRace = style === 'race';
  const isMuscle = style === 'muscle';
  const isSupercar = style === 'supercar';
  const isPolice = style === 'police';
  const isDrift = style === 'drift';

  const bodyW = isSUV ? 2.02 : isRace || isSupercar ? 1.98 : 1.86;
  const bodyL = isSUV ? 4.45 : isRace ? 4.55 : 4.22;
  const groundClearance = isSUV ? 0.36 : 0.24;

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyW + 0.8, bodyL + 0.9),
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

  // Undertray / Side skirts
  const undertray = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW + 0.1, 0.16, bodyL + 0.12),
    trimMat
  );
  undertray.position.set(0, groundClearance, 0);
  undertray.castShadow = castShadow;
  bodyGroup.add(undertray);

  // Main Hull Silhouette
  if (isSUV) {
    const lowerHull = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW, 0.76, bodyL),
      paintMat
    );
    lowerHull.position.set(0, 0.76, 0);
    lowerHull.castShadow = castShadow;

    const upperCabin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.9, 0.68, bodyL * 0.64),
      glassMat
    );
    upperCabin.position.set(0, 1.44, 0.42);
    upperCabin.castShadow = castShadow;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.88, 0.09, bodyL * 0.62),
      paintMat
    );
    roof.position.set(0, 1.8, 0.42);

    // Offroad roof rack + LED bar
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.76, 0.08, 1.8),
      trimMat
    );
    rack.position.set(0, 1.88, 0.45);
    const ledBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.09, 0.12),
      hlMat
    );
    ledBar.position.set(0, 1.9, -0.45);

    // Front bullbar
    const bullbar = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.78, 0.34, 0.18),
      accentMat
    );
    bullbar.position.set(0, 0.64, -bodyL * 0.52);

    bodyGroup.add(lowerHull, upperCabin, roof, rack, ledBar, bullbar);
  } else {
    // Sculpted extruded sports/race/muscle/police hull
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-bodyL * 0.5, 0);
    hullShape.lineTo(bodyL * 0.5, 0);
    hullShape.lineTo(bodyL * 0.46, isSupercar || isRace ? 0.36 : 0.44);
    hullShape.lineTo(bodyL * 0.15, isSupercar || isRace ? 0.48 : 0.56);
    hullShape.lineTo(-bodyL * 0.25, 0.58);
    hullShape.lineTo(-bodyL * 0.48, 0.44);
    hullShape.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: bodyW - 0.12,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    hullGeo.center();
    hullGeo.rotateY(Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, paintMat);
    hull.position.set(0, 0.6, 0);
    hull.castShadow = castShadow;
    bodyGroup.add(hull);

    // Canopy
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-1.15, 0);
    cabinShape.lineTo(1.02, 0);
    cabinShape.lineTo(0.54, isRace || isSupercar ? 0.38 : 0.44);
    cabinShape.lineTo(-0.56, isRace || isSupercar ? 0.38 : 0.44);
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: bodyW * 0.72,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    cabinGeo.center();
    cabinGeo.rotateY(Math.PI / 2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, isRace || isSupercar ? 0.96 : 1.04, 0.14);
    cabin.castShadow = castShadow;
    bodyGroup.add(cabin);

    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.65, 0.06, 1.05),
      isPolice ? accentMat : paintMat
    );
    roofCap.position.set(0, isRace || isSupercar ? 1.16 : 1.26, 0.16);
    bodyGroup.add(roofCap);
  }

  // Category-specific signature aero & details
  if (isMuscle) {
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 1.05), trimMat);
    blower.position.set(0, 0.94, -1.05);
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.12), accentMat);
    intake.position.set(0, 1.0, -1.56);
    bodyGroup.add(blower, intake);
  } else if (isSupercar) {
    // Mid-engine louvers + twin side intakes
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.9), trimMat);
    louver.position.set(0, 0.92, 1.25);
    const intakeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.85), trimMat);
    intakeL.position.set(-bodyW * 0.5, 0.62, 0.55);
    const intakeR = intakeL.clone();
    intakeR.position.x = bodyW * 0.5;
    bodyGroup.add(louver, intakeL, intakeR);
  } else if (isRace) {
    // Front splitter + shark fin
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.22, 0.08, 0.45), accentMat);
    splitter.position.set(0, 0.24, -bodyL * 0.5 - 0.1);
    const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 1.05), accentMat);
    sharkFin.position.set(0, 1.28, 1.15);
    bodyGroup.add(splitter, sharkFin);
  } else {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.025, bodyL * 0.78),
      accentMat
    );
    stripe.position.set(0, isSUV ? 1.85 : 0.91, 0);
    bodyGroup.add(stripe);
  }

  // Rear Spoiler Wing (all except SUV)
  if (!isSUV) {
    const wingH = isDrift || isRace ? 0.42 : 0.22;
    const wingW = isDrift || isRace ? bodyW + 0.24 : bodyW;
    const pylonGeo = new THREE.BoxGeometry(0.08, wingH, 0.26);
    const pL = new THREE.Mesh(pylonGeo, trimMat);
    pL.position.set(-0.55, 0.88 + wingH * 0.5, bodyL * 0.41);
    const pR = pL.clone();
    pR.position.x = 0.55;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(wingW, 0.07, 0.38), isRace ? accentMat : trimMat);
    blade.position.set(0, 0.88 + wingH, bodyL * 0.43);
    blade.rotation.x = -0.12;
    blade.castShadow = castShadow;
    bodyGroup.add(pL, pR, blade);
  }

  // Police Lightbar & Push Bumper
  let policeRedLight: THREE.Mesh | undefined;
  let policeBlueLight: THREE.Mesh | undefined;
  if (isPolice) {
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 0.32), trimMat);
    barBase.position.set(0, 1.32, 0.16);

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 3.0,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 3.0,
    });

    policeRedLight = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28), redMat);
    policeRedLight.position.set(-0.32, 1.38, 0.16);
    policeBlueLight = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28), blueMat);
    policeBlueLight.position.set(0.32, 1.38, 0.16);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.16), trimMat);
    pushBar.position.set(0, 0.5, -bodyL * 0.52);
    bodyGroup.add(barBase, policeRedLight, policeBlueLight, pushBar);
  }

  // Headlights & Taillights
  const hlGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);
  const hlL = new THREE.Mesh(hlGeo, hlMat);
  hlL.position.set(-bodyW * 0.33, isSUV ? 0.78 : 0.6, -bodyL * 0.49);
  const hlR = hlL.clone();
  hlR.position.x = bodyW * 0.33;
  bodyGroup.add(hlL, hlR);

  // Subtle translucent ground headlight cones (visible especially on Night Highway)
  const coneGeo = new THREE.ConeGeometry(1.1, 8.5, 10, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const coneL = new THREE.Mesh(coneGeo, coneMat);
  coneL.position.set(-bodyW * 0.32, 0.45, -bodyL * 0.5 - 4.2);
  const coneR = new THREE.Mesh(coneGeo, coneMat);
  coneR.position.set(bodyW * 0.32, 0.45, -bodyL * 0.5 - 4.2);
  bodyGroup.add(coneL, coneR);

  const tlGeo = new THREE.BoxGeometry(0.44, 0.14, 0.1);
  const tlL = new THREE.Mesh(tlGeo, brakeLightMat);
  tlL.position.set(-bodyW * 0.32, isSUV ? 0.85 : 0.66, bodyL * 0.49);
  const tlR = tlL.clone();
  tlR.position.x = bodyW * 0.32;
  bodyGroup.add(tlL, tlR);

  // Dual Exhaust + Nitro Flames
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.92,
  });
  const flameGeo = new THREE.ConeGeometry(0.13, 1.1, 10);
  flameGeo.rotateX(Math.PI / 2);
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.42, 0.34, bodyL * 0.5 + 0.55);
  flameL.visible = false;
  const flameR = flameL.clone();
  flameR.position.x = 0.42;
  flameR.visible = false;
  bodyGroup.add(flameL, flameR);

  // 4 Grounded Wheels
  const wheelR = isSUV ? 0.45 : 0.36;
  const wheelW = isSUV ? 0.32 : 0.28;
  const wx = bodyW * 0.48;
  const wzF = -bodyL * 0.31;
  const wzR = bodyL * 0.31;

  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-wx, wheelR, wzF);
  const wFL = makeWheel(wheelR, wheelW, tireMat, rimMat, castShadow);
  frontLeftPivot.add(wFL);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(wx, wheelR, wzF);
  const wFR = makeWheel(wheelR, wheelW, tireMat, rimMat, castShadow);
  frontRightPivot.add(wFR);

  const wRL = makeWheel(wheelR, wheelW, tireMat, rimMat, castShadow);
  wRL.position.set(-wx, wheelR, wzR);
  const wRR = makeWheel(wheelR, wheelW, tireMat, rimMat, castShadow);
  wRR.position.set(wx, wheelR, wzR);

  group.add(frontLeftPivot, frontRightPivot, wRL, wRR);

  return {
    group,
    bodyGroup,
    wheels: [wFL, wFR, wRL, wRR],
    frontPivots: [frontLeftPivot, frontRightPivot],
    brakeLightMat,
    nitroFlames: [flameL, flameR],
    headlightCones: [coneL, coneR],
    policeRedLight,
    policeBlueLight,
  };
}
