import { Injectable } from '@nestjs/common';

export interface PriceObservation {
  store: string;
  price: number;
  link: string;
}
export interface PriceModelResult {
  status: 'ready' | 'insufficient_data';
  algorithm: 'gaussian-kde-log-price';
  referenceCount: number;
  comparison: 'ABOVE' | 'BELOW' | 'FAIR' | 'UNKNOWN';
  referencePrice?: number;
  deviationPercentage?: number;
  lowerBound?: number;
  upperBound?: number;
  bandwidth?: number;
  percentile?: number;
  anomalous?: boolean;
  reason?: string;
  excludedReferenceCount?: number;
}

function quantile(sorted: number[], q: number): number {
  const at = (sorted.length - 1) * q;
  const low = Math.floor(at);
  return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
}

// Abramowitz-Stegun normal CDF, absolute approximation error < 2e-7.
function normalCdf(value: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(value));
  const density = Math.exp((-value * value) / 2) / Math.sqrt(2 * Math.PI);
  const tail =
    density *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return value >= 0 ? 1 - tail : tail;
}

@Injectable()
export class PriceModelService {
  analyze(
    currentPrice: number,
    observations: PriceObservation[],
    currentUrl: string,
  ): PriceModelResult {
    const base: PriceModelResult = {
      status: 'insufficient_data',
      algorithm: 'gaussian-kde-log-price',
      referenceCount: 0,
      comparison: 'UNKNOWN',
    };
    let currentHost: string;
    try {
      currentHost = new URL(currentUrl).hostname.replace(/^www\./, '');
    } catch {
      return { ...base, reason: 'URL do anúncio atual indisponível.' };
    }
    const independent = new Map<string, number>();
    for (const offer of observations) {
      if (!Number.isFinite(offer.price) || offer.price <= 0) continue;
      try {
        const host = new URL(offer.link).hostname.replace(/^www\./, '');
        // Each store contributes once. Current host and current store excluded.
        const store = offer.store.toLowerCase().replace(/[^a-z0-9]/g, '');
        const currentStore = currentHost.split('.')[0];
        if (
          host === currentHost ||
          host.endsWith(`.${currentHost}`) ||
          (currentStore.length >= 4 && store.includes(currentStore))
        )
          continue;
        const key = /(^|\.)google\./.test(host) ? store : host;
        if (!key || independent.has(key)) continue;
        independent.set(key, Math.log(offer.price));
      } catch {
        /* malformed URLs do not form reference observations */
      }
    }
    const rawSample = [...independent.values()].sort((a, b) => a - b);
    // Robust training removes isolated reference outliers, without seeing target.
    const center = rawSample.length ? quantile(rawSample, 0.5) : 0;
    const mad = rawSample.length
      ? quantile(
          rawSample.map((x) => Math.abs(x - center)).sort((a, b) => a - b),
          0.5,
        )
      : 0;
    const sample = rawSample.filter(
      (x) =>
        rawSample.length < 5 || Math.abs(x - center) <= Math.max(0.2, 5 * mad),
    );
    base.excludedReferenceCount = rawSample.length - sample.length;
    base.referenceCount = sample.length;
    if (
      sample.length < 5 ||
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      return {
        ...base,
        reason:
          'São necessárias cinco lojas independentes e um preço atual válido.',
      };
    }
    const n = sample.length;
    const mean = sample.reduce((sum, x) => sum + x, 0) / n;
    const sd = Math.sqrt(
      sample.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1),
    );
    const robustScale =
      (quantile(sample, 0.75) - quantile(sample, 0.25)) / 1.34;
    const scale = robustScale > 0 ? Math.min(sd, robustScale) : sd;
    const bandwidth = Math.max(0.03, 0.9 * scale * n ** -0.2);
    const cdf = (logPrice: number) =>
      sample.reduce(
        (sum, x) => sum + normalCdf((logPrice - x) / bandwidth),
        0,
      ) / n;
    const inverse = (probability: number) => {
      let low = sample[0] - 8 * bandwidth;
      let high = sample[n - 1] + 8 * bandwidth;
      for (let i = 0; i < 70; i++) {
        const mid = (low + high) / 2;
        if (cdf(mid) < probability) low = mid;
        else high = mid;
      }
      return Math.exp((low + high) / 2);
    };
    const referencePrice = Math.exp(quantile(sample, 0.5));
    const deviationPercentage = (currentPrice / referencePrice - 1) * 100;
    const percentile = cdf(Math.log(currentPrice));
    return {
      status: 'ready',
      algorithm: base.algorithm,
      referenceCount: n,
      referencePrice,
      deviationPercentage,
      comparison:
        deviationPercentage < -15
          ? 'BELOW'
          : deviationPercentage > 15
            ? 'ABOVE'
            : 'FAIR',
      lowerBound: inverse(0.025),
      upperBound: inverse(0.975),
      bandwidth,
      percentile,
      anomalous: percentile < 0.025 || percentile > 0.975,
      excludedReferenceCount: base.excludedReferenceCount,
    };
  }
}
