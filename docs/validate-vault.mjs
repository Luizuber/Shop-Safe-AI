import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, basename, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, 'obsidian-shop-safe');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const paths = files(root);
const errors = [];
for (const path of paths) {
  if (extname(path) === '.json' || extname(path) === '.canvas') {
    try { JSON.parse(readFileSync(path, 'utf8')); } catch { errors.push(`Invalid JSON: ${path}`); }
  }
  if (extname(path) !== '.md') continue;
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:[^\]]*)\]\]/g)) {
    const target = match[1];
    if (!paths.some(p => basename(p) === target || basename(p, '.md') === target)) {
      errors.push(`${basename(path)} -> ${target}`);
    }
  }
}
const canvas = JSON.parse(readFileSync(join(root, 'Arquitetura.canvas'), 'utf8'));
const ids = new Set(canvas.nodes.map(n => n.id));
for (const node of canvas.nodes) assert(existsSync(join(root, node.file)), `Missing canvas file ${node.file}`);
for (const edge of canvas.edges) assert(ids.has(edge.fromNode) && ids.has(edge.toNode), `Bad edge ${edge.id}`);
assert.deepEqual(errors, [], errors.join('\n'));
console.log(`Vault validated: ${paths.filter(p => extname(p) === '.md').length} notes, ${canvas.nodes.length} canvas nodes, no broken wiki links.`);
