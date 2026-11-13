import { Injectable } from '@nestjs/common';
import { AnalyzeProductDto } from '../dto/analyze-product.dto';
import {
  MachineLearningService,
  SentimentAnalysis,
} from '../ml/machine-learning.service';
import { normalizeText } from '../ml/features';

export interface ReviewSummaryResult {
  reviewCount: number;
  averageRating: number;
  summary: string;
  topPositives: string[];
  topNegatives: string[];
  samples: string[];
  machineLearning: SentimentAnalysis;
}

@Injectable()
export class ReviewSummaryService {
  constructor(
    private readonly ml: MachineLearningService = new MachineLearningService(),
  ) {}

  private readonly positiveKeywords = [
    ['Entrega rapida', ['entrega rapida', 'chegou rapido', 'chegou antes']],
    ['Produto original', ['original', 'autentico', 'lacrado']],
    ['Bom custo-beneficio', ['custo beneficio', 'vale a pena', 'preco bom']],
    ['Boa qualidade', ['qualidade', 'excelente', 'otimo', 'perfeito']],
    ['Bem embalado', ['bem embalado', 'embalagem boa', 'veio protegido']],
    ['Bom atendimento', ['atendimento', 'suporte', 'vendedor atencioso']],
  ] as const;

  private readonly negativeKeywords = [
    ['Atraso na entrega', ['atraso', 'demorou', 'nao chegou', 'entrega lenta']],
    ['Embalagem danificada', ['amassada', 'danificada', 'embalagem ruim']],
    ['Produto com defeito', ['defeito', 'defeituoso', 'nao funciona', 'falha']],
    [
      'Produto nao original',
      ['falso', 'falsificado', 'replica', 'nao original'],
    ],
    ['Divergencia do anuncio', ['diferente do anuncio', 'nao corresponde']],
    ['Atendimento ruim', ['atendimento ruim', 'sem resposta', 'suporte ruim']],
  ] as const;

  summarize(data: AnalyzeProductDto): ReviewSummaryResult {
    const comments = this.normalizeComments(data.reviews?.comments ?? []);
    const averageRating = this.normalizeRating(data.reviews?.averageRating);
    const reviewCount = data.reviews?.reviewCount ?? comments.length;
    const topPositives = this.findTopics(comments, this.positiveKeywords);
    const topNegatives = this.findTopics(comments, this.negativeKeywords);
    const machineLearning = this.ml.analyzeReviews(comments);
    const sentimentText =
      machineLearning.status === 'ready'
        ? ` Sentimento estimado por ML em ${machineLearning.samples} comentários: ${machineLearning.positive} positivos, ${machineLearning.negative} negativos e ${machineLearning.uncertain} inconclusivos. Isso não verifica autenticidade.`
        : '';

    return {
      reviewCount,
      averageRating,
      summary:
        this.buildSummary({
          comments,
          averageRating,
          reviewCount,
          topPositives,
          topNegatives,
        }) + sentimentText,
      topPositives,
      topNegatives,
      samples: comments.slice(0, 5),
      machineLearning,
    };
  }

  private normalizeComments(comments: string[]): string[] {
    return Array.from(
      new Set(
        comments
          .map((comment) => comment.replace(/\s+/g, ' ').trim())
          .filter((comment) => comment.length >= 20 && comment.length <= 600),
      ),
    ).slice(0, 20);
  }

  private normalizeRating(rating?: number): number {
    if (!rating || !Number.isFinite(rating)) return 0;

    return Math.max(0, Math.min(5, Number(rating.toFixed(1))));
  }

  private findTopics(
    comments: string[],
    dictionary: readonly (readonly [string, readonly string[]])[],
  ): string[] {
    const text = normalizeText(comments.join(' '));

    return dictionary
      .map(([label, keywords]) => ({
        label,
        score: keywords.filter((keyword) => {
          if (!text.includes(keyword)) return false;
          // A negated positive phrase must not be listed as a strength.
          if (dictionary === this.positiveKeywords) {
            const negated = new RegExp(
              `\\b(?:nao|nunca|sem)\\s+(?:\\w+\\s+){0,2}${keyword}\\b`,
            );
            if (negated.test(text)) return false;
          }
          return true;
        }).length,
      }))
      .filter((topic) => topic.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((topic) => topic.label);
  }

  private buildSummary(input: {
    comments: string[];
    averageRating: number;
    reviewCount: number;
    topPositives: string[];
    topNegatives: string[];
  }): string {
    if (input.comments.length === 0 && input.reviewCount === 0) {
      return 'Nao foram encontrados comentarios visiveis suficientes na pagina do produto.';
    }

    const ratingText =
      input.averageRating > 0
        ? `A nota media capturada foi ${input.averageRating}/5`
        : 'A nota media nao foi identificada';
    const countText =
      input.reviewCount > 0
        ? `com ${input.reviewCount} avaliacao(oes) indicada(s)`
        : 'com poucos comentarios visiveis';
    const positives =
      input.topPositives.length > 0
        ? `Pontos positivos recorrentes: ${input.topPositives.join(', ')}.`
        : 'Nao houve pontos positivos recorrentes claros.';
    const negatives =
      input.topNegatives.length > 0
        ? `Pontos de atencao: ${input.topNegatives.join(', ')}.`
        : 'Nao houve reclamacoes recorrentes claras nos comentarios capturados.';

    return `${ratingText}, ${countText}. ${positives} ${negatives}`;
  }
}
