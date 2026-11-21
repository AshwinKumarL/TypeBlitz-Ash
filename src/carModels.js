import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// COMMON WHEEL FACTORY & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function createCarWheel(rimType = 'sport', rimColor = 0xcccccc, caliperColor = 0xff0000) {
  const wg = new THREE.Group();

  // Tyre: cylinder along X axis (rotateZ(PI/2)), diameter ~0.59m (radius 0.295)
  const tyreGeo = new THREE.CylinderGeometry(0.295, 0.295, 0.22, 16);
  tyreGeo.rotateZ(Math.PI / 2);
  const matTyre = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
  });
  const tyre = new THREE.Mesh(tyreGeo, matTyre);
  tyre.castShadow = true;
  wg.add(tyre);

  // Main Rim base
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.225, 14);
  rimGeo.rotateZ(Math.PI / 2);
  const matRim = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.25,
    metalness: 0.85,
    flatShading: true,
  });
  const rim = new THREE.Mesh(rimGeo, matRim);
  wg.add(rim);

  // Rim Spokes / Hubcap details according to car type
  if (rimType === 'lambo') {
    // 5-spoke sharp star
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.15, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2, flatShading: true })
      );
      spoke.position.set(0, Math.sin(angle) * 0.08, Math.cos(angle) * 0.08);
      spoke.rotation.x = angle;
      wg.add(spoke);
    }
  } else if (rimType === 'amg') {
    // Multi-spoke AMG turbine
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.16, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.15, flatShading: true })
      );
      spoke.position.set(0, Math.sin(angle) * 0.08, Math.cos(angle) * 0.08);
      spoke.rotation.x = angle;
      wg.add(spoke);
    }
  } else if (rimType === 'porsche') {
    // Classic 5-spoke sport rim
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.15, 0.035),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3, flatShading: true })
      );
      spoke.position.set(0, Math.sin(angle) * 0.08, Math.cos(angle) * 0.08);
      spoke.rotation.x = angle;
      wg.add(spoke);
    }
  } else if (rimType === 'ferrari') {
    // Star rim with center cap
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.16, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.9, roughness: 0.2, flatShading: true })
      );
      spoke.position.set(0, Math.sin(angle) * 0.08, Math.cos(angle) * 0.08);
      spoke.rotation.x = angle;
      wg.add(spoke);
    }
    // Yellow center cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.235, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.5, flatShading: true })
    );
    cap.rotateZ(Math.PI / 2);
    wg.add(cap);
  }

  // Brake Caliper
  const caliperGeo = new THREE.BoxGeometry(0.05, 0.09, 0.07);
  const matCaliper = new THREE.MeshStandardMaterial({ color: caliperColor, roughness: 0.3, metalness: 0.5, flatShading: true });
  const caliper = new THREE.Mesh(caliperGeo, matCaliper);
  caliper.position.set(0, 0.09, 0.08);
  wg.add(caliper);

  return wg;
}

function attachWheels(car, rimType, rimColor, caliperColor) {
  const wheelPositions = {
    Wheel_FL: [-0.76, 0.295, 1.15],
    Wheel_FR: [ 0.76, 0.295, 1.15],
    Wheel_RL: [-0.76, 0.295, -1.15],
    Wheel_RR: [ 0.76, 0.295, -1.15],
  };

  // Support both object indexing (wheels['Wheel_FL']) and array iteration (wheels.forEach)
  const wheelArray = [];
  const wheels = {};

  for (const [name, pos] of Object.entries(wheelPositions)) {
    const wg = createCarWheel(rimType, rimColor, caliperColor);
    wg.position.set(pos[0], pos[1], pos[2]);
    car.add(wg);
    wheels[name] = wg;
    wheelArray.push(wg);
  }

  // Assign properties onto wheelArray so both wheels.Wheel_FL and wheels.forEach work
  Object.assign(wheelArray, wheels);

  car.userData.wheels = wheelArray;
  car.userData.frontWheels = [wheels.Wheel_FL, wheels.Wheel_FR];
  car.userData.rearWheels = [wheels.Wheel_RL, wheels.Wheel_RR];
  return wheels;
}

function applyShadows(group) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LAMBORGHINI (Angular Supercar Wedge)
// ─────────────────────────────────────────────────────────────────────────────
export function createLamborghiniMesh(color = 0xffb800, accentColor = 0x111111) {
  const car = new THREE.Group();

  const matMain = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.2,
    metalness: 0.5,
    flatShading: true,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.4,
    metalness: 0.6,
    flatShading: true,
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85,
    flatShading: true,
  });
  const matHeadlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 3.5,
    flatShading: true,
  });
  const matTaillight = new THREE.MeshStandardMaterial({
    color: 0xff0033,
    emissive: 0xff0022,
    emissiveIntensity: 3.0,
    flatShading: true,
  });
  const matExhaust = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.95,
    roughness: 0.2,
    flatShading: true,
  });

  // Lower chassis / undertray
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 3.9), matAccent);
  chassis.position.set(0, 0.22, 0);
  car.add(chassis);

  // Front wedge hood / nose
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.26, 1.3), matMain);
  nose.position.set(0, 0.42, 1.25);
  nose.rotation.x = 0.12;
  car.add(nose);

  // Front sharp splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 0.5), matAccent);
  splitter.position.set(0, 0.18, 1.88);
  car.add(splitter);

  // Front dual air intakes
  [-0.42, 0.42].forEach(x => {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.2), matAccent);
    intake.position.set(x, 0.32, 1.82);
    intake.rotation.y = x > 0 ? -0.15 : 0.15;
    car.add(intake);
  });

  // Main mid-body
  const midBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 1.5), matMain);
  midBody.position.set(0, 0.48, 0.0);
  car.add(midBody);

  // Angular Cockpit / Greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.36, 1.4), matGlass);
  cabin.position.set(0, 0.78, -0.05);
  car.add(cabin);

  // Sloping low windshield
  const wind = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.44, 0.06), matGlass);
  wind.position.set(0, 0.73, 0.62);
  wind.rotation.x = 0.65;
  car.add(wind);

  // Rear sloping engine glass with louvers
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.48, 0.06), matGlass);
  rearGlass.position.set(0, 0.72, -0.72);
  rearGlass.rotation.x = -0.55;
  car.add(rearGlass);

  // Rear engine bay deck & louvers
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.32, 1.2), matMain);
  deck.position.set(0, 0.54, -1.18);
  deck.rotation.x = -0.06;
  car.add(deck);

  // Engine slats (carbon accent)
  for (let z = -0.75; z >= -1.25; z -= 0.18) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.1), matAccent);
    slat.position.set(0, 0.66, z);
    slat.rotation.x = -0.2;
    car.add(slat);
  }

  // Side scoops / air intakes (aggressive side body sculpting)
  [-0.73, 0.73].forEach(x => {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.7), matAccent);
    scoop.position.set(x, 0.48, -0.35);
    car.add(scoop);
  });

  // Rear high wing / spoiler
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 0.32), matAccent);
  wingBlade.position.set(0, 0.95, -1.82);
  wingBlade.rotation.x = -0.08;
  car.add(wingBlade);

  [-0.5, 0.5].forEach(x => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.18), matAccent);
    strut.position.set(x, 0.82, -1.78);
    strut.rotation.x = 0.2;
    car.add(strut);
  });

  // Rear diffuser & central exhaust
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.2, 0.35), matAccent);
  diffuser.position.set(0, 0.26, -1.88);
  diffuser.rotation.x = 0.25;
  car.add(diffuser);

  const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.15), matExhaust);
  exhaust.position.set(0, 0.38, -1.95);
  car.add(exhaust);

  // Y-shaped / sharp LED Headlights (+Z front)
  [-0.46, 0.46].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.14), matHeadlight);
    hl.position.set(x, 0.49, 1.82);
    hl.rotation.y = x > 0 ? -0.25 : 0.25;
    car.add(hl);
  });

  // Sharp horizontal Taillights (-Z rear)
  [-0.46, 0.46].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), matTaillight);
    tl.position.set(x, 0.54, -1.94);
    tl.rotation.y = x > 0 ? 0.15 : -0.15;
    car.add(tl);
  });

  // Angular side mirrors
  [-0.72, 0.72].forEach(x => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), matAccent);
    mirror.position.set(x, 0.72, 0.45);
    car.add(mirror);
  });

  // Wheels
  attachWheels(car, 'lambo', 0x222222, 0xffaa00);
  applyShadows(car);

  return car;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MERCEDES-AMG GT (Sleek Grand Tourer / Sports Coupe)
// ─────────────────────────────────────────────────────────────────────────────
export function createMercedesMesh(color = 0xd1d5db, accentColor = 0x1a1a1a) {
  const car = new THREE.Group();

  const matMain = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.18,
    metalness: 0.75, // metallic silver
    flatShading: true,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.35,
    metalness: 0.4,
    flatShading: true,
  });
  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.95,
    roughness: 0.1,
    flatShading: true,
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.1,
    metalness: 0.5,
    transparent: true,
    opacity: 0.8,
    flatShading: true,
  });
  const matHeadlight = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xffffff,
    emissiveIntensity: 3.0,
    flatShading: true,
  });
  const matTaillight = new THREE.MeshStandardMaterial({
    color: 0xff1e27,
    emissive: 0xff0f17,
    emissiveIntensity: 2.8,
    flatShading: true,
  });

  // Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.15, 3.9), matAccent);
  chassis.position.set(0, 0.22, 0);
  car.add(chassis);

  // Long sculpted hood (signature AMG GT feature)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.34, 1.8), matMain);
  hood.position.set(0, 0.48, 0.85);
  car.add(hood);

  // Dual power bulges on hood
  [-0.24, 0.24].forEach(x => {
    const bulge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 1.2), matMain);
    bulge.position.set(x, 0.66, 0.85);
    car.add(bulge);
  });

  // Panamericana front grille with emblem star
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.12), matAccent);
  grille.position.set(0, 0.42, 1.88);
  car.add(grille);

  // Chrome vertical slats
  for (let x = -0.35; x <= 0.35; x += 0.1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.04), matChrome);
    slat.position.set(x, 0.42, 1.94);
    car.add(slat);
  }

  // Mercedes Star Emblem in center
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), matChrome);
  emblem.rotateX(Math.PI / 2);
  emblem.position.set(0, 0.44, 1.96);
  car.add(emblem);

  // Teardrop rounded cabin / greenhouse set back towards rear
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 1.4), matGlass);
  cabin.position.set(0, 0.82, -0.32);
  car.add(cabin);

  // Sweeping rounded windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.46, 0.06), matGlass);
  windshield.position.set(0, 0.78, 0.36);
  windshield.rotation.x = 0.52;
  car.add(windshield);

  // Fastback curved rear window
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.52, 0.06), matGlass);
  rearWindow.position.set(0, 0.76, -0.98);
  rearWindow.rotation.x = -0.58;
  car.add(rearWindow);

  // Compact muscular rear end
  const rearBody = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.4, 1.1), matMain);
  rearBody.position.set(0, 0.5, -1.35);
  car.add(rearBody);

  // Subtle integrated ducktail / lip spoiler
  const lipSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.18), matAccent);
  lipSpoiler.position.set(0, 0.7, -1.82);
  lipSpoiler.rotation.x = 0.15;
  car.add(lipSpoiler);

  // Quad Exhaust Tips (2 left, 2 right)
  [-0.52, -0.42, 0.42, 0.52].forEach(x => {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 8), matChrome);
    exhaust.rotateX(Math.PI / 2);
    exhaust.position.set(x, 0.28, -1.94);
    car.add(exhaust);
  });

  // Sleek multi-lens LED headlights (+Z)
  [-0.52, 0.52].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.12), matHeadlight);
    hl.position.set(x, 0.48, 1.84);
    hl.rotation.y = x > 0 ? -0.2 : 0.2;
    car.add(hl);
  });

  // Slim horizontal LED taillights (-Z)
  [-0.5, 0.5].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), matTaillight);
    tl.position.set(x, 0.54, -1.92);
    tl.rotation.y = x > 0 ? 0.25 : -0.25;
    car.add(tl);
  });

  // Side air vents behind front wheels
  [-0.75, 0.75].forEach(x => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.35), matAccent);
    vent.position.set(x, 0.48, 0.42);
    car.add(vent);

    // Chrome fin on vent
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.25), matChrome);
    fin.position.set(x, 0.48, 0.42);
    car.add(fin);
  });

  // Mirrors
  [-0.72, 0.72].forEach(x => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.1), matMain);
    mirror.position.set(x, 0.72, 0.25);
    car.add(mirror);
  });

  // Wheels (AMG silver multi-spoke)
  attachWheels(car, 'amg', 0xdddddd, 0xcc0000);
  applyShadows(car);

  return car;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PORSCHE 911 (Iconic Silhouette & Round Fenders)
// ─────────────────────────────────────────────────────────────────────────────
export function createPorscheMesh(color = 0xdc2626, accentColor = 0x1f2937) {
  const car = new THREE.Group();

  const matMain = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.25,
    metalness: 0.45,
    flatShading: true,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.4,
    metalness: 0.3,
    flatShading: true,
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x223344,
    roughness: 0.1,
    metalness: 0.6,
    transparent: true,
    opacity: 0.8,
    flatShading: true,
  });
  const matHeadlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 3.2,
    flatShading: true,
  });
  const matTaillight = new THREE.MeshStandardMaterial({
    color: 0xff002b,
    emissive: 0xff002b,
    emissiveIntensity: 3.0,
    flatShading: true,
  });
  const matExhaust = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.9,
    roughness: 0.2,
    flatShading: true,
  });

  // Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 3.85), matAccent);
  chassis.position.set(0, 0.22, 0);
  car.add(chassis);

  // Sloping low front hood / frunk
  const frontHood = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.28, 1.3), matMain);
  frontHood.position.set(0, 0.44, 1.25);
  frontHood.rotation.x = 0.08;
  car.add(frontHood);

  // Distinctive raised round front fender headlights (Iconic 911 feature)
  [-0.6, 0.6].forEach(x => {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 1.4), matMain);
    fender.position.set(x, 0.5, 1.22);
    car.add(fender);

    // Round Headlight cylinder pod
    const hlPod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 12), matMain);
    hlPod.rotateX(Math.PI / 2 + 0.1);
    hlPod.position.set(x, 0.58, 1.78);
    car.add(hlPod);

    // Glowing round headlight lens
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12), matHeadlight);
    lens.rotateX(Math.PI / 2 + 0.1);
    lens.position.set(x, 0.58, 1.84);
    car.add(lens);
  });

  // Front lower intake
  const frontIntake = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.2), matAccent);
  frontIntake.position.set(0, 0.28, 1.82);
  car.add(frontIntake);

  // Teardrop Greenhouse / Sloping 911 Flyline
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.42, 1.5), matGlass);
  cabin.position.set(0, 0.8, -0.05);
  car.add(cabin);

  // Windshield
  const wind = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.46, 0.06), matGlass);
  wind.position.set(0, 0.77, 0.56);
  wind.rotation.x = 0.55;
  car.add(wind);

  // Rear fastback continuous slope down to rear engine deck
  const fastback = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.55, 0.06), matGlass);
  fastback.position.set(0, 0.72, -0.72);
  fastback.rotation.x = -0.58;
  car.add(fastback);

  // Muscular wide rear wheel haunches (widebody turbo hips)
  [-0.64, 0.64].forEach(x => {
    const haunch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1.35), matMain);
    haunch.position.set(x, 0.52, -1.05);
    car.add(haunch);
  });

  // Rear engine deck with vertical grill slats
  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.3, 1.1), matMain);
  rearDeck.position.set(0, 0.52, -1.25);
  car.add(rearDeck);

  // Engine deck cooling grill
  for (let z = -0.9; z >= -1.35; z -= 0.12) {
    const grillSlat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.05), matAccent);
    grillSlat.position.set(0, 0.67, z);
    car.add(grillSlat);
  }

  // Classic Ducktail / Sport Spoiler
  const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 0.24), matMain);
  ducktail.position.set(0, 0.72, -1.72);
  ducktail.rotation.x = 0.28;
  car.add(ducktail);

  // Continuous Full-Width Rear LED Light Strip (Modern 911 hallmark)
  const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.07, 0.08), matTaillight);
  lightBar.position.set(0, 0.55, -1.91);
  car.add(lightBar);

  // Dual oval sports exhausts
  [-0.32, 0.32].forEach(x => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8), matExhaust);
    tip.rotateX(Math.PI / 2);
    tip.position.set(x, 0.28, -1.94);
    car.add(tip);
  });

  // Oval side mirrors
  [-0.72, 0.72].forEach(x => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.1), matMain);
    mirror.position.set(x, 0.74, 0.35);
    car.add(mirror);
  });

  // Wheels (Porsche Fuchs / 5-spoke)
  attachWheels(car, 'porsche', 0x111111, 0xef4444);
  applyShadows(car);

  return car;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FERRARI (Exotic Italian Supercar with S-Duct & Glass Engine Bay)
// ─────────────────────────────────────────────────────────────────────────────
export function createFerrariMesh(color = 0xe11d48, accentColor = 0x0f172a) {
  const car = new THREE.Group();

  const matMain = new THREE.MeshStandardMaterial({
    color: color, // Rosso Corsa
    roughness: 0.18,
    metalness: 0.45,
    flatShading: true,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor, // Carbon fiber / gloss dark
    roughness: 0.3,
    metalness: 0.7,
    flatShading: true,
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x182230,
    roughness: 0.1,
    metalness: 0.7,
    transparent: true,
    opacity: 0.8,
    flatShading: true,
  });
  const matEngineGlass = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.05,
    metalness: 0.9,
    transparent: true,
    opacity: 0.65,
    flatShading: true,
  });
  const matEngineBlock = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Red cylinder heads
    metalness: 0.6,
    roughness: 0.4,
    flatShading: true,
  });
  const matHeadlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 3.5,
    flatShading: true,
  });
  const matTaillight = new THREE.MeshStandardMaterial({
    color: 0xff0020,
    emissive: 0xff0020,
    emissiveIntensity: 3.2,
    flatShading: true,
  });
  const matExhaust = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.95,
    roughness: 0.15,
    flatShading: true,
  });

  // Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 3.9), matAccent);
  chassis.position.set(0, 0.22, 0);
  car.add(chassis);

  // Aerodynamic Pointed Nose with F1-inspired front splitter
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.28, 1.2), matMain);
  nose.position.set(0, 0.44, 1.28);
  nose.rotation.x = 0.14;
  car.add(nose);

  // Front S-Duct channel in center of hood
  const sDuct = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.7), matAccent);
  sDuct.position.set(0, 0.54, 1.25);
  sDuct.rotation.x = -0.2;
  car.add(sDuct);

  // Front splitter with carbon winglets
  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 0.45), matAccent);
  frontSplitter.position.set(0, 0.18, 1.86);
  car.add(frontSplitter);

  // Mid-cockpit greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.38, 1.35), matGlass);
  cabin.position.set(0, 0.78, 0.02);
  car.add(cabin);

  // Swept aerodynamic windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.46, 0.06), matGlass);
  windshield.position.set(0, 0.74, 0.62);
  windshield.rotation.x = 0.62;
  car.add(windshield);

  // Side intake scallops (sculpted side flanks)
  [-0.72, 0.72].forEach(x => {
    const scallop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.8), matAccent);
    scallop.position.set(x, 0.46, -0.28);
    car.add(scallop);
  });

  // Transparent Rear Engine Glass Cover
  const engineCover = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.95), matEngineGlass);
  engineCover.position.set(0, 0.68, -0.92);
  engineCover.rotation.x = -0.15;
  car.add(engineCover);

  // Visible V8 / V12 Engine underneath glass cover
  const v8Block = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.65), matEngineBlock);
  v8Block.position.set(0, 0.48, -0.92);
  car.add(v8Block);

  // Silver intake plenum on engine
  const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.5), matExhaust);
  plenum.position.set(0, 0.59, -0.92);
  car.add(plenum);

  // Rear side body haunches flanking engine bay
  [-0.58, 0.58].forEach(x => {
    const haunch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 1.3), matMain);
    haunch.position.set(x, 0.5, -1.15);
    car.add(haunch);
  });

  // Integrated aerodynamic rear wing / spoiler
  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.35), matMain);
  rearWing.position.set(0, 0.72, -1.8);
  rearWing.rotation.x = -0.05;
  car.add(rearWing);

  // Carbon Rear Diffuser
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.22, 0.3), matAccent);
  diffuser.position.set(0, 0.24, -1.86);
  diffuser.rotation.x = 0.22;
  car.add(diffuser);

  // Dual high-exit or central exhausts
  [-0.26, 0.26].forEach(x => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), matExhaust);
    tip.rotateX(Math.PI / 2);
    tip.position.set(x, 0.44, -1.94);
    car.add(tip);
  });

  // Swept-back aerodynamic headlights (+Z)
  [-0.5, 0.5].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.35), matHeadlight);
    hl.position.set(x, 0.52, 1.62);
    hl.rotation.x = 0.18;
    hl.rotation.y = x > 0 ? -0.15 : 0.15;
    car.add(hl);
  });

  // Iconic Dual Circular / Round Taillights (-Z)
  [-0.55, -0.38, 0.38, 0.55].forEach(x => {
    const tlRing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), matTaillight);
    tlRing.rotateX(Math.PI / 2);
    tlRing.position.set(x, 0.56, -1.92);
    car.add(tlRing);
  });

  // Aerodynamic side mirrors
  [-0.72, 0.72].forEach(x => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), matMain);
    mirror.position.set(x, 0.72, 0.4);
    car.add(mirror);
  });

  // Wheels (Ferrari star rim with yellow center cap)
  attachWheels(car, 'ferrari', 0xd5d5d5, 0xef4444);
  applyShadows(car);

  return car;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. APEX GT SUPERCAR (REDESIGNED PLAYER SPORTS CAR)
// ─────────────────────────────────────────────────────────────────────────────
export function createPlayerSupercarMesh(bodyColor = 0xe11d48, accentColor = 0x0f172a) {
  const car = new THREE.Group();

  const matBody = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.28,
    metalness: 0.55,
    flatShading: true,
  });

  const matCarbon = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.65,
    flatShading: true,
  });

  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.85,
    transparent: true,
    opacity: 0.82,
  });

  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.12,
    flatShading: true,
  });

  const matHeadlight = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xecfeff,
    emissiveIntensity: 4.5,
  });

  const matTaillight = new THREE.MeshStandardMaterial({
    color: 0xff0033,
    emissive: 0xff0033,
    emissiveIntensity: 3.5,
  });

  // 1. Lower Chassis & Aerodynamic Underfloor
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.14, 4.0), matCarbon);
  chassis.position.set(0, 0.22, 0);
  chassis.castShadow = true;
  car.add(chassis);

  // Front Splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.06, 0.4), matCarbon);
  splitter.position.set(0, 0.16, 1.95);
  car.add(splitter);

  // 2. Muscular Low-Poly Main Body
  const bodyGeo = new THREE.BoxGeometry(1.54, 0.38, 3.82);
  const body = new THREE.Mesh(bodyGeo, matBody);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  car.add(body);

  // Sculpted Sloping Front Hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.35), matBody);
  hood.position.set(0, 0.61, 1.15);
  hood.rotation.x = -0.16;
  car.add(hood);

  // Carbon Hood Air Heat Extractors
  const hoodVent = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.42), matCarbon);
  hoodVent.position.set(0, 0.65, 1.05);
  hoodVent.rotation.x = -0.16;
  car.add(hoodVent);

  // 3. Cockpit & Fastback Roofline
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.44, 1.78), matBody);
  cabin.position.set(0, 0.84, -0.12);
  cabin.castShadow = true;
  car.add(cabin);

  // Windshield (Front)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.44, 0.06), matGlass);
  windshield.position.set(0, 0.88, 0.72);
  windshield.rotation.x = 0.58;
  car.add(windshield);

  // Rear Sloping Glass
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.46, 0.06), matGlass);
  rearGlass.position.set(0, 0.86, -0.98);
  rearGlass.rotation.x = -0.52;
  car.add(rearGlass);

  // Side Windows
  [-0.62, 0.62].forEach(x => {
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 1.2), matGlass);
    sideWin.position.set(x, 0.84, -0.12);
    car.add(sideWin);
  });

  // 4. Rear GT Wing / Spoiler
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.06, 0.38), matCarbon);
  wing.position.set(0, 0.98, -1.82);
  wing.castShadow = true;
  car.add(wing);

  // Wing Struts
  [-0.42, 0.42].forEach(x => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.18), matCarbon);
    strut.position.set(x, 0.78, -1.8);
    strut.rotation.x = -0.22;
    car.add(strut);
  });

  // 5. Dual Polished Chrome Exhaust Tips (Calibrated mount points for smoke & nitro flames)
  [-0.35, 0.35].forEach(x => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.22, 12), matChrome);
    pipe.rotateX(Math.PI / 2);
    pipe.position.set(x, 0.32, -1.95);
    car.add(pipe);
  });

  // 6. High-Intensity LED Headlights (+Z front)
  [-0.52, 0.52].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.12), matHeadlight);
    hl.position.set(x, 0.48, 1.86);
    car.add(hl);
  });

  // 7. Full-Width Cyber Taillight Strip (-Z rear)
  const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.06), matTaillight);
  taillight.position.set(0, 0.52, -1.92);
  car.add(taillight);

  // 8. Wheels & Calipers
  const wheels = {};
  const wheelPositions = {
    Wheel_FL: [-0.78, 0.295,  1.22],
    Wheel_FR: [ 0.78, 0.295,  1.22],
    Wheel_RL: [-0.78, 0.295, -1.18],
    Wheel_RR: [ 0.78, 0.295, -1.18],
  };

  for (const [name, pos] of Object.entries(wheelPositions)) {
    const wg = createCarWheel('sport', 0xd4d4d8, 0xef4444);
    wg.position.set(pos[0], pos[1], pos[2]);
    car.add(wg);
    wheels[name] = wg;
  }

  car.userData.wheels = wheels;
  applyShadows(car);
  return car;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY OF ALL CAR MODELS
// ─────────────────────────────────────────────────────────────────────────────
export const CAR_MODELS = {
  supercar: {
    id: 'supercar',
    name: 'Apex GT Supercar',
    createMesh: createPlayerSupercarMesh,
    defaultColor: 0xe11d48,
    accentColor: 0x0f172a,
  },
  lamborghini: {
    id: 'lamborghini',
    name: 'Lamborghini Huracan',
    createMesh: createLamborghiniMesh,
    defaultColor: 0xffb800,
    accentColor: 0x111111,
  },
  mercedes: {
    id: 'mercedes',
    name: 'Mercedes-AMG GT',
    createMesh: createMercedesMesh,
    defaultColor: 0xd1d5db,
    accentColor: 0x1a1a1a,
  },
  porsche: {
    id: 'porsche',
    name: 'Porsche 911 GT3',
    createMesh: createPorscheMesh,
    defaultColor: 0xdc2626,
    accentColor: 0x1f2937,
  },
  ferrari: {
    id: 'ferrari',
    name: 'Ferrari F8 Tributo',
    createMesh: createFerrariMesh,
    defaultColor: 0xe11d48,
    accentColor: 0x0f172a,
  },
};

export function getCarMeshById(id, color, accentColor) {
  const modelDef = CAR_MODELS[id] || CAR_MODELS.supercar;
  return modelDef.createMesh(color || modelDef.defaultColor, accentColor || modelDef.accentColor);
}
