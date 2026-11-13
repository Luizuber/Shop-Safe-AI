import { describe, expect, it } from '@jest/globals';
import { PriceModelService } from './price-model.service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('price density model', () => {
  const ml = new PriceModelService();
  const offers = [5900, 6000, 6100, 6200, 6300, 6400].map((price, i) => ({
    store: `Varejista ${i}`,
    price,
    link: `https://loja${i}.example/produto`,
  }));

  it('learns a density from independent reference stores and flags a low target', () => {
    const result = ml.analyze(659.9, offers, 'https://amazon.com.br/iphone');
    expect(result).toMatchObject({
      status: 'ready',
      comparison: 'BELOW',
      anomalous: true,
      referenceCount: 6,
    });
    expect(result.referencePrice).toBeGreaterThan(6000);
    expect(result.lowerBound).toBeLessThan(result.upperBound!);
    expect(
      ml.analyze(6150, offers, 'https://amazon.com.br/iphone').anomalous,
    ).toBe(false);
  });

  it('does not train on duplicate stores, invalid prices or the target store', () => {
    const result = ml.analyze(
      100,
      [
        ...Array.from({ length: 10 }, () => offers[0]),
        { store: 'Amazon', price: 10, link: 'https://amazon.com.br/produto' },
        { store: 'Invalido', price: NaN, link: 'https://invalido.example' },
      ],
      'https://amazon.com.br/produto',
    );
    expect(result.status).toBe('insufficient_data');
    expect(result.referenceCount).toBe(1);
    expect(result.comparison).toBe('UNKNOWN');
  });

  it('matches independently generated sklearn/scipy density quantiles', () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, 'models', 'pricing.parity.json'), 'utf8'),
    );
    for (const item of fixture.cases) {
      const result = ml.analyze(
        item.target,
        offers,
        'https://amazon.com.br/produto',
      );
      expect(result.bandwidth).toBeCloseTo(fixture.bandwidth, 9);
      expect(result.percentile).toBeCloseTo(item.percentile, 6);
      expect(result.lowerBound).toBeCloseTo(fixture.lowerBound, 2);
      expect(result.upperBound).toBeCloseTo(fixture.upperBound, 2);
    }
  });

  it('removes an isolated reference outlier before fitting, independently of the target', () => {
    const result = ml.analyze(
      6150,
      [
        ...offers,
        {
          store: 'Referencia atipica',
          price: 300,
          link: 'https://atipica.example/produto',
        },
      ],
      'https://amazon.com.br/produto',
    );
    expect(result).toMatchObject({
      status: 'ready',
      referenceCount: 6,
      excludedReferenceCount: 1,
      anomalous: false,
    });
  });
});
