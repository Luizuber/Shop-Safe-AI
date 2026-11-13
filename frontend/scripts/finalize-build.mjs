import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../public/manifest.json', import.meta.url));
const to = fileURLToPath(new URL('../dist/manifest.json', import.meta.url));
copyFileSync(from, to);
console.log('Production manifest copied to dist/manifest.json.');
