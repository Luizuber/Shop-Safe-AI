import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractUrlFeatures,
  normalizeText,
  sigmoid,
  URL_HASH_BUCKETS,
  URL_NUMERIC_FEATURES,
} from './features';

interface Model {
  schemaVersion: number;
  featureVersion: string;
  version: string;
  kind: string;
  trainedAt: string;
  trainingSamples: number;
  coefficients: number[];
  intercept: number;
  source: { citation: string; license: string; url: string };
  testMetrics: Record<string, unknown>;
}
interface UrlModel extends Model {
  hashBuckets: number;
  numericFeatures: number;
  threshold: number;
}
interface SentimentModel extends Model {
  vocabulary: Record<string, number>;
  idf: number[];
  abstainBelow: number;
}
export interface ModelPrediction {
  status: 'ready' | 'unavailable' | 'insufficient_data';
  version?: string;
  probability?: number;
  label?: string;
  scope: string;
  reason?: string;
  assessment?: 'model_signal' | 'conflicting_evidence';
  scoreAdjustment?: number;
}
export interface SentimentAnalysis {
  status: ModelPrediction['status'];
  version?: string;
  positive: number;
  negative: number;
  uncertain: number;
  samples: number;
}

@Injectable()
export class MachineLearningService {
  private readonly security = this.load<UrlModel>('security', 'logistic-url');
  private readonly sentiment = this.load<SentimentModel>(
    'sentiment',
    'tfidf-logistic',
  );

  private load<T extends Model>(name: string, kind: string): T | null {
    try {
      const value = JSON.parse(
        readFileSync(join(__dirname, 'models', `${name}.json`), 'utf8'),
      ) as T;
      if (
        value.schemaVersion !== 1 ||
        value.kind !== kind ||
        !value.version ||
        !value.coefficients?.length ||
        !value.coefficients.every(Number.isFinite) ||
        !Number.isFinite(value.intercept) ||
        value.trainingSamples < 100
      )
        return null;
      if (kind === 'logistic-url') {
        const urlModel = value as unknown as UrlModel;
        if (
          urlModel.hashBuckets !== URL_HASH_BUCKETS ||
          urlModel.numericFeatures !== URL_NUMERIC_FEATURES ||
          value.coefficients.length !==
            URL_HASH_BUCKETS + URL_NUMERIC_FEATURES ||
          value.featureVersion !== 'security-domain-v2'
        )
          return null;
      } else {
        const textModel = value as unknown as SentimentModel;
        if (
          value.featureVersion !== 'sentiment-v1' ||
          textModel.idf?.length !== value.coefficients.length ||
          !textModel.idf.every((n) => Number.isFinite(n) && n > 0) ||
          !textModel.vocabulary ||
          Object.values(textModel.vocabulary).some(
            (i) =>
              !Number.isInteger(i) || i < 0 || i >= value.coefficients.length,
          )
        )
          return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  status() {
    const describe = (model: Model | null) =>
      model
        ? {
            status: 'ready',
            version: model.version,
            algorithm: model.kind,
            trainedAt: model.trainedAt,
            trainingSamples: model.trainingSamples,
            source: model.source,
            testMetrics: model.testMetrics,
          }
        : { status: 'unavailable' };
    return {
      security: describe(this.security),
      sentiment: describe(this.sentiment),
      pricing: {
        status: 'ready',
        algorithm: 'gaussian-kde-log-price',
        minimumIndependentOffers: 5,
      },
    };
  }

  predictSecurity(url: string): ModelPrediction {
    const scope =
      'Padrões de phishing no domínio; não verifica o caminho da página, produto, vendedor ou entrega.';
    if (!this.security)
      return {
        status: 'unavailable',
        scope,
        reason: 'Modelo treinado não disponível.',
      };
    try {
      const features = extractUrlFeatures(url);
      let score = this.security.intercept;
      features.forEach((value, i) => {
        score += value * this.security!.coefficients[i];
      });
      const probability = sigmoid(score);
      return {
        status: 'ready',
        version: this.security.version,
        scope,
        probability,
        label:
          probability >= this.security.threshold
            ? 'suspicious_url'
            : 'no_high_phishing_signal',
      };
    } catch {
      return {
        status: 'insufficient_data',
        scope,
        reason: 'URL incompatível com as características do modelo.',
      };
    }
  }

  predictSentiment(text: string): ModelPrediction {
    const scope =
      'Sentimento do comentário; não detecta avaliação falsa ou autenticidade.';
    const model = this.sentiment;
    if (!model) return { status: 'unavailable', scope };
    const tokens = normalizeText(text).split(' ').filter(Boolean);
    const terms = [
      ...tokens,
      ...tokens.slice(0, -1).map((token, i) => `${token} ${tokens[i + 1]}`),
    ];
    const counts = new Map<number, number>();
    for (const term of terms) {
      if (!Object.hasOwn(model.vocabulary, term)) continue;
      const index = model.vocabulary[term];
      counts.set(index, (counts.get(index) || 0) + 1);
    }
    if (counts.size < 2)
      return { status: 'insufficient_data', version: model.version, scope };
    const values = [...counts].map(([i, count]) => [
      i,
      (1 + Math.log(count)) * model.idf[i],
    ]);
    const norm = Math.sqrt(values.reduce((sum, [, v]) => sum + v * v, 0));
    const score = values.reduce(
      (sum, [i, value]) => sum + (value / norm) * model.coefficients[i],
      model.intercept,
    );
    const probability = sigmoid(score);
    const confidence = Math.max(probability, 1 - probability);
    return {
      status: 'ready',
      version: model.version,
      probability,
      scope,
      label:
        confidence < model.abstainBelow
          ? 'uncertain'
          : probability >= 0.5
            ? 'positive'
            : 'negative',
    };
  }

  analyzeReviews(comments: string[]): SentimentAnalysis {
    const predictions = comments.map((text) => this.predictSentiment(text));
    return {
      status: !this.sentiment
        ? 'unavailable'
        : predictions.length === 0
          ? 'insufficient_data'
          : 'ready',
      version: this.sentiment?.version,
      samples: comments.length,
      positive: predictions.filter((p) => p.label === 'positive').length,
      negative: predictions.filter((p) => p.label === 'negative').length,
      uncertain: predictions.filter((p) => !p.label || p.label === 'uncertain')
        .length,
    };
  }
}
