import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CAR_MODELS_BASE64 } from './carBase64.js';
import { createProceduralCarMesh } from './car.js';

export const CAR_CATALOG = [
  {
    id: 'race-car',
    key: 'race-car-01',
    name: 'Formula GTR',
    category: 'GT Race Car',
    length: 4.61,
    rearZ: -2.30,
    scale: 1.0,
    defaultColor: 0xdc2626, // Crimson Red
    flameColors: { inner: 0xfff1f2, outer: 0xe11d48, emissive: 0xf43f5e },
    sparkLevel: 2,
    tailpipeOffsets: [
      { x: -0.36, y: 0.28, z: -2.30, radius: 0.10, length: 1.5 },
      { x: 0.36, y: 0.28, z: -2.30, radius: 0.10, length: 1.5 },
    ],
  },
  {
    id: 'sports-car',
    key: 'sports-car-01',
    name: 'Apex Velocity GT',
    category: 'Sports Coupe',
    length: 4.49,
    rearZ: -2.25,
    scale: 1.0,
    defaultColor: 0x2563eb, // Cobalt Blue
    flameColors: { inner: 0xe0f2fe, outer: 0x0284c7, emissive: 0x38bdf8 },
    sparkLevel: 1,
    tailpipeOffsets: [
      { x: -0.38, y: 0.28, z: -2.25, radius: 0.09, length: 1.4 },
      { x: 0.38, y: 0.28, z: -2.25, radius: 0.09, length: 1.4 },
    ],
  },
  {
    id: 'rally-car',
    key: 'rally-car-01',
    name: 'Turbo Rally RS',
    category: 'Rally Hatchback',
    length: 4.18,
    rearZ: -2.10,
    scale: 1.0,
    defaultColor: 0xf59e0b, // Amber Gold
    flameColors: { inner: 0xfffbeb, outer: 0xf59e0b, emissive: 0xd97706 },
    sparkLevel: 2,
    tailpipeOffsets: [
      { x: -0.35, y: 0.30, z: -2.10, radius: 0.09, length: 1.4 },
      { x: 0.35, y: 0.30, z: -2.10, radius: 0.09, length: 1.4 },
    ],
  },
  {
    id: 'police-car',
    key: 'police-car-01',
    name: 'Interceptor Patrol',
    category: 'Police Cruiser',
    length: 4.91,
    rearZ: -2.42,
    scale: 1.0,
    defaultColor: 0x1e293b, // Stealth Midnight
    flameColors: { inner: 0xe0f2fe, outer: 0x0ea5e9, emissive: 0x38bdf8 },
    sparkLevel: 1,
    tailpipeOffsets: [
      { x: -0.40, y: 0.28, z: -2.42, radius: 0.09, length: 1.4 },
      { x: 0.40, y: 0.28, z: -2.42, radius: 0.09, length: 1.4 },
    ],
  },
  {
    id: 'taxi',
    key: 'taxi-01',
    name: 'Metro Yellow Cab',
    category: 'City Taxi',
    length: 4.81,
    rearZ: -2.42,
    scale: 1.0,
    defaultColor: 0xeab308, // Cyber Taxi Yellow
    flameColors: { inner: 0xfffbeb, outer: 0xf59e0b, emissive: 0xd97706 },
    sparkLevel: 2,
    tailpipeOffsets: [
      { x: -0.38, y: 0.28, z: -2.42, radius: 0.09, length: 1.4 },
      { x: 0.38, y: 0.28, z: -2.42, radius: 0.09, length: 1.4 },
    ],
  },
  {
    id: 'sedan',
    key: 'sedan-01',
    name: 'Silver Phantom',
    category: 'Executive Sedan',
    length: 4.81,
    rearZ: -2.42,
    scale: 1.0,
    defaultColor: 0x94a3b8, // Metallic Silver
    flameColors: { inner: 0xe0f2fe, outer: 0x0284c7, emissive: 0x38bdf8 },
    sparkLevel: 1,
    tailpipeOffsets: [
      { x: -0.38, y: 0.28, z: -2.42, radius: 0.08, length: 1.3 },
      { x: 0.38, y: 0.28, z: -2.42, radius: 0.08, length: 1.3 },
    ],
  },
  {
    id: 'hatchback',
    key: 'hatchback-01',
    name: 'Sprint City Hatch',
    category: 'City Hatchback',
    length: 4.13,
    rearZ: -2.07,
    scale: 1.0,
    defaultColor: 0x10b981, // Emerald Green
    flameColors: { inner: 0xecfdf5, outer: 0x059669, emissive: 0x10b981 },
    sparkLevel: 1,
    tailpipeOffsets: [
      { x: -0.34, y: 0.28, z: -2.07, radius: 0.08, length: 1.3 },
      { x: 0.34, y: 0.28, z: -2.07, radius: 0.08, length: 1.3 },
    ],
  },
  {
    id: 'suv',
    key: 'suv-01',
    name: 'Titan Offroad SUV',
    category: 'Performance SUV',
    length: 4.86,
    rearZ: -2.45,
    scale: 1.0,
    defaultColor: 0x8b5cf6, // Royal Violet
    flameColors: { inner: 0xfdf4ff, outer: 0x9333ea, emissive: 0xd946ef },
    sparkLevel: 3,
    tailpipeOffsets: [
      { x: -0.42, y: 0.32, z: -2.45, radius: 0.10, length: 1.5 },
      { x: 0.42, y: 0.32, z: -2.45, radius: 0.10, length: 1.5 },
    ],
  },
  {
    id: 'pickup-truck',
    key: 'pickup-truck-01',
    name: 'Ironclad Pickup',
    category: 'Pickup Truck',
    length: 5.40,
    rearZ: -2.71,
    scale: 0.95,
    defaultColor: 0xc2410c, // Burnt Copper
    flameColors: { inner: 0xffedd5, outer: 0xea580c, emissive: 0xf97316 },
    sparkLevel: 2,
    tailpipeOffsets: [
      { x: -0.42, y: 0.32, z: -2.71, radius: 0.11, length: 1.5 },
      { x: 0.42, y: 0.32, z: -2.71, radius: 0.11, length: 1.5 },
    ],
  },
  {
    id: 'delivery-van',
    key: 'delivery-van-01',
    name: 'Express Speed Van',
    category: 'Delivery Van',
    length: 5.48,
    rearZ: -2.74,
    scale: 0.92,
    defaultColor: 0x0284c7, // Sky Blue
    flameColors: { inner: 0xe0f2fe, outer: 0x0284c7, emissive: 0x38bdf8 },
    sparkLevel: 1,
    tailpipeOffsets: [
      { x: -0.40, y: 0.30, z: -2.74, radius: 0.10, length: 1.4 },
      { x: 0.40, y: 0.30, z: -2.74, radius: 0.10, length: 1.4 },
    ],
  },
  {
    id: 'box-truck',
    key: 'box-truck-01',
    name: 'Freight Hauler 500',
    category: 'Commercial Truck',
    length: 7.05,
    rearZ: -3.53,
    scale: 0.78,
    defaultColor: 0x475569, // Slate Industrial
    flameColors: { inner: 0xffedd5, outer: 0xc2410c, emissive: 0xea580c },
    sparkLevel: 2,
    tailpipeOffsets: [
      { x: -0.44, y: 0.35, z: -3.53, radius: 0.12, length: 1.6 },
      { x: 0.44, y: 0.35, z: -3.53, radius: 0.12, length: 1.6 },
    ],
  },
  {
    id: 'city-bus',
    key: 'city-bus-01',
    name: 'Apex Rapid Bus',
    category: 'Transit Bus',
    length: 11.12,
    rearZ: -5.56,
    scale: 0.65,
    defaultColor: 0x059669, // Transit Teal
    flameColors: { inner: 0xe0f2fe, outer: 0x0284c7, emissive: 0x38bdf8 },
    sparkLevel: 1,
    tailpipeOffsets: [
      { x: -0.46, y: 0.38, z: -5.56, radius: 0.14, length: 1.8 },
      { x: 0.46, y: 0.38, z: -5.56, radius: 0.14, length: 1.8 },
    ],
  },
];

// Color palette choices for fresh randomization
export const PAINT_PALETTE = [
  0xdc2626, // Crimson Red
  0x2563eb, // Cobalt Blue
  0xf59e0b, // Amber Gold
  0x10b981, // Emerald Green
  0x8b5cf6, // Electric Purple
  0xec4899, // Hot Pink
  0x06b6d4, // Cyan Glow
  0xeab308, // Neon Yellow
  0x94a3b8, // Silver Steel
  0x1e293b, // Obsidian Black
  0xe11d48, // Ruby Rose
  0x0284c7, // Sky Blue
];

const _templateCache = new Map();
const _loader = new GLTFLoader();

function decodeBase64ToArrayBuffer(base64Str) {
  let binaryStr;
  if (typeof atob === 'function') {
    binaryStr = atob(base64Str);
  } else if (typeof Buffer !== 'undefined') {
    binaryStr = Buffer.from(base64Str, 'base64').toString('binary');
  } else {
    throw new Error('No base64 decoding method available');
  }

  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Pre-parse a single model key into template cache.
 */
export function preloadModelKey(key) {
  if (_templateCache.has(key)) {
    return Promise.resolve(_templateCache.get(key));
  }
  return new Promise((resolve, reject) => {
    const base64Str = CAR_MODELS_BASE64[key];
    if (!base64Str) {
      return reject(new Error('Model key not found: ' + key));
    }
    try {
      const buffer = decodeBase64ToArrayBuffer(base64Str);
      _loader.parse(
        buffer,
        '',
        (gltf) => {
          _templateCache.set(key, gltf.scene);
          resolve(gltf.scene);
        },
        reject
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Preload and parse all 12 car models in the catalog.
 * Takes only ~15-20 ms total.
 */
export function preloadAllCarModels() {
  const promises = CAR_CATALOG.map((car) => preloadModelKey(car.key));
  return Promise.all(promises);
}

/**
 * Synchronous mesh builder from template cache.
 * Falls back to procedural car mesh if template is not yet cached.
 */
export function getCarMesh(carDef, customPaintHex = null) {
  const template = _templateCache.get(carDef.key);
  if (!template) {
    // If not yet loaded, return procedural fallback styled with this car's colors
    const fallback = createProceduralCarMesh();
    fallback.userData.carDef = carDef;
    fallback.userData.tailpipeOffsets = carDef.tailpipeOffsets;
    fallback.userData.flameColors = carDef.flameColors;
    fallback.userData.sparkLevel = carDef.sparkLevel;
    fallback.userData.wheelRadius = 0.295;
    return fallback;
  }

  const carClone = template.clone(true);
  carClone.scale.setScalar(carDef.scale || 1.0);

  const chosenPaint = customPaintHex !== null ? customPaintHex : carDef.defaultColor;
  const wheels = {};

  carClone.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // Clone material so recoloring one car doesn't affect others
      if (child.material) {
        child.material = child.material.clone();
        if (child.material.name === 'Paint' && chosenPaint !== undefined) {
          child.material.color.setHex(chosenPaint);
          child.material.roughness = 0.3;
          child.material.metalness = 0.45;
        }
      }
    }

    // Capture wheels for physics rotation
    if (child.name && child.name.startsWith('Wheel_')) {
      wheels[child.name] = child;
    }
  });

  carClone.userData.wheels = wheels;
  carClone.userData.wheelRadius = 0.295 * (carDef.scale || 1.0);
  carClone.userData.carDef = carDef;
  carClone.userData.tailpipeOffsets = carDef.tailpipeOffsets;
  carClone.userData.flameColors = carDef.flameColors;
  carClone.userData.sparkLevel = carDef.sparkLevel;

  return carClone;
}

/**
 * Async car mesh loader ensuring the GLB template is parsed.
 */
export async function loadCarMesh(carDef, customPaintHex = null) {
  await preloadModelKey(carDef.key);
  return getCarMesh(carDef, customPaintHex);
}

/**
 * Returns a randomized fleet of `count` distinct cars selected at random from the 12 models.
 * Each car is assigned a distinct model and vibrant paint color.
 */
export function getRandomFleet(count = 4) {
  const shuffled = [...CAR_CATALOG].sort(() => Math.random() - 0.5);
  const shuffledColors = [...PAINT_PALETTE].sort(() => Math.random() - 0.5);

  const selected = [];
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const def = shuffled[i];
    const color = shuffledColors[i % shuffledColors.length];
    selected.push({
      def,
      paintHex: color,
    });
  }

  return selected;
}
