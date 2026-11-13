import { isIP } from 'node:net';

export const URL_NUMERIC_FEATURES = 11;
export const URL_HASH_BUCKETS = 2048;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function fnv(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return hash;
}

/** Same transform as ml/train.py. Query, fragment, credentials never used. */
export function extractUrlFeatures(raw: string): Map<number, number> {
  const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('URL inválida');
  if (url.hostname.includes(':'))
    throw new Error('IPv6 não representado no treino');
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const frequencies = new Map<string, number>();
  for (const char of host)
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  const entropy = -[...frequencies.values()].reduce((sum, n) => {
    const p = n / host.length;
    return sum + p * Math.log2(p);
  }, 0);
  const count = (text: string, term: string) => text.split(term).length - 1;
  const numeric = [
    Number(url.protocol === 'https:'),
    host.length / 100,
    0,
    (host.match(/[0-9]/g)?.length || 0) / host.length,
    count(host, '-') / 10,
    count(host, '.') / 10,
    Number(isIP(host) > 0 || /^[0-9.]+$/.test(host)),
    Number(host.includes('xn--')),
    entropy / 5,
    0,
    0,
  ];
  const features = new Map(numeric.map((value, index) => [index, value]));
  const text = host;
  const hashed = new Map<number, number>();
  for (const n of [3, 4]) {
    for (let i = 0; i <= text.length - n; i++) {
      const bucket = fnv(text.slice(i, i + n)) % URL_HASH_BUCKETS;
      hashed.set(bucket, (hashed.get(bucket) || 0) + 1);
    }
  }
  const norm =
    Math.sqrt([...hashed.values()].reduce((sum, v) => sum + v * v, 0)) || 1;
  hashed.forEach((count, key) =>
    features.set(URL_NUMERIC_FEATURES + key, count / norm),
  );
  return features;
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-Math.max(-700, Math.min(700, value))));
}
