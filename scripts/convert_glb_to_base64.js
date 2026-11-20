import fs from 'fs';
import path from 'path';

const glbPath = path.join(process.cwd(), 'public', 'models', 'ford_anglia.glb');
const outPath = path.join(process.cwd(), 'src', 'fordAngliaModelData.js');

const buffer = fs.readFileSync(glbPath);
const b64 = buffer.toString('base64');
const content = `// Base64-encoded binary glTF model of Ford Anglia
export const FORD_ANGLIA_GLB_BASE64 = "${b64}";
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Successfully generated src/fordAngliaModelData.js with base64 length:', b64.length);
