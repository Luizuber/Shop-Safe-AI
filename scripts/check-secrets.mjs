/** Read-only guard. Prints filenames/reasons, never matching secret values. */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.find(arg => arg.startsWith('--repo='));
const root = resolve(rootArg ? rootArg.slice(7) : '.');
const git = (...commands) => execFileSync('git', commands, { cwd: root, maxBuffer: 40 * 1024 * 1024, windowsHide: true });
const envArg = args.find(arg => arg.startsWith('--local-env='));
const knownSecrets = [];
if (envArg) {
  const envPath = resolve(envArg.slice(12));
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || !/(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(match[1])) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
      if (value.length >= 12) knownSecrets.push(value);
    }
  }
}
const failures = [];
const forbiddenPath = name => {
  const file = basename(name).toLowerCase();
  return file === '.env' || file.startsWith('.env.') || file.endsWith('.env') ||
    /\.(?:pem|key|p12|pfx)$/i.test(file) ||
    /(?:^|\/)(?:\.aws|\.venv[^/]*|node_modules|data\/raw)(?:\/|$)/.test(name);
};
const patterns = [
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
function inspect(name, bytes) {
  if (forbiddenPath(name)) failures.push(`${name}: forbidden private/local file`);
  if (bytes.includes(0)) return;
  const text = bytes.toString('utf8');
  if (patterns.some(pattern => pattern.test(text))) failures.push(`${name}: credential pattern`);
  if (knownSecrets.some(secret => text.includes(secret))) failures.push(`${name}: matches a credential from the local environment`);
}
const names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
  .toString('utf8').split('\0').filter(Boolean);
for (const name of names) {
  const file = resolve(root, name);
  if (existsSync(file)) inspect(name, readFileSync(file));
}
let historyBlobs = 0;
if (args.includes('--history')) {
  const seen = new Set();
  for (const item of git('rev-list', '--objects', '--all').toString('utf8').split('\n')) {
    const split = item.indexOf(' ');
    if (split < 0) continue;
    const oid = item.slice(0, split);
    const name = item.slice(split + 1);
    if (seen.has(oid)) continue;
    seen.add(oid);
    if (git('cat-file', '-t', oid).toString().trim() !== 'blob') continue;
    inspect(`history:${name}`, git('cat-file', 'blob', oid));
    historyBlobs++;
  }
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Secret check passed: ${names.length} files, ${historyBlobs} history blobs; no matching values printed.`);
}
