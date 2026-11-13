import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MachineLearningService } from './machine-learning.service';
import { extractUrlFeatures } from './features';

describe('trained model runtime', () => {
  const ml = new MachineLearningService();

  it('loads the actual trained artifacts, not hand-coded weights', () => {
    expect(ml.status().security).toMatchObject({
      status: 'ready',
      algorithm: 'logistic-url',
    });
    expect(ml.status().sentiment).toMatchObject({
      status: 'ready',
      algorithm: 'tfidf-logistic',
    });
  });

  it.each(['security', 'sentiment'])(
    'matches Python probabilities for held-out %s samples',
    (name) => {
      const samples = JSON.parse(
        readFileSync(join(__dirname, 'models', `${name}.parity.json`), 'utf8'),
      ) as Array<{
        input: string;
        probability: number;
        features?: Record<string, number>;
      }>;
      for (const sample of samples) {
        const actual =
          name === 'security'
            ? ml.predictSecurity(sample.input)
            : ml.predictSentiment(sample.input);
        expect(actual.status).toBe('ready');
        expect(actual.probability).toBeCloseTo(sample.probability, 8);
        if (sample.features) {
          const features = extractUrlFeatures(sample.input);
          for (const [index, value] of Object.entries(sample.features)) {
            expect(features.get(Number(index))).toBeCloseTo(value, 10);
          }
        }
      }
    },
  );

  it('abstains on unknown review vocabulary and invalid URLs', () => {
    expect(ml.predictSentiment('qzxwv zqxwv kxzqw').status).toBe(
      'insufficient_data',
    );
    expect(ml.predictSecurity('javascript:alert(1)').status).toBe(
      'insufficient_data',
    );
  });

  it('keeps classifications bounded and distinguishes positive and negative reviews', () => {
    const good = ml.predictSentiment(
      'Produto excelente, chegou antes do prazo, recomendo a compra.',
    );
    const bad = ml.predictSentiment(
      'Produto horrível, apresentou defeito e não funciona, péssima compra.',
    );
    expect(good.label).toBe('positive');
    expect(bad.label).toBe('negative');
    expect(ml.analyzeReviews([]).status).toBe('insufficient_data');
  });

  it('produces the same domain prediction for root, www alias and long product paths', () => {
    const roots = [
      'https://amazon.com.br/',
      'https://www.amazon.com.br/dp/B087CT8PWY',
      'https://www.amazon.com.br/Smart-TV-LG-43-4K-UHD-NANO-AI-43UN85CPSA.AWZ/dp/B0TEST1234',
    ].map((url) => ml.predictSecurity(url));
    expect(roots.every((result) => result.status === 'ready')).toBe(true);
    expect(roots.every((result) => result.probability! < .8)).toBe(true);
    expect(roots[0].probability).toBe(roots[1].probability);
    expect(roots[0].probability).toBe(roots[2].probability);
  });
});
