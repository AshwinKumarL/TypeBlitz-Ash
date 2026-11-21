import fs from 'fs';
import path from 'path';

const dir = 'public/models/low-poly-cars';
const files = [
  'sports-car-01.glb',
  'race-car-01.glb',
  'rally-car-01.glb',
  'police-car-01.glb',
  'sedan-01.glb',
  'taxi-01.glb',
  'hatchback-01.glb',
  'suv-01.glb',
  'pickup-truck-01.glb',
  'delivery-van-01.glb',
  'box-truck-01.glb',
  'city-bus-01.glb'
];

const data = {};
for (const f of files) {
  const p = path.join(dir, f);
  const b64 = fs.readFileSync(p).toString('base64');
  const key = f.replace('.glb', '');
  data[key] = b64;
}

const content = `/** Auto-generated base64 dictionary of all 12 low-poly car models */\nexport const CAR_MODELS_BASE64 = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync('src/carBase64.js', content);
console.log('Successfully wrote src/carBase64.js, size:', (content.length / 1024 / 1024).toFixed(2), 'MB');
