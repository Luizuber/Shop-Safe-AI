import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, VITE_API_BASE_URL: 'http://localhost:3000' };
const run = (file, args) => {
    const result = spawnSync(process.execPath, [resolve(root, file), ...args], {
        cwd: root, env, stdio: 'inherit', windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
};
run('node_modules/typescript/bin/tsc', []);
run('node_modules/vite/bin/vite.js', ['build', '--outDir', 'dist-local']);
run('node_modules/vite/bin/vite.js', ['build', '--config', 'vite.content.config.ts', '--outDir', 'dist-local']);
run('node_modules/vite/bin/vite.js', ['build', '--config', 'vite.background.config.ts', '--outDir', 'dist-local']);

const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.json'), 'utf8'));
manifest.name = 'Shop Safe (Local)';
manifest.action.default_title = 'Shop Safe (Local)';
manifest.host_permissions = ['http://localhost:3000/*'];
writeFileSync(resolve(root, 'dist-local/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Local extension: frontend/dist-local -> http://localhost:3000/analysis');
