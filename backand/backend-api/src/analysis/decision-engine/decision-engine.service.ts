import { Injectable } from '@nestjs/common';
import { AnalyzeProductDto } from '../dto/analyze-product.dto';
import { PriceComparisonService } from '../price-comparison.service';
import { AnalysisResultOutput } from '../interfaces/analysis-result.interface';
import {
  SecurityAiResult,
  SecurityAiService,
} from '../security-ai/security-ai.service';
import { ReviewSummaryService } from '../review-summary/review-summary.service';
import { PriceModelService } from '../ml/price-model.service';

@Injectable()
export class DecisionEngineService {
  constructor(
    private readonly priceService: PriceComparisonService,
    private readonly securityAi: SecurityAiService,
    private readonly reviewSummary: ReviewSummaryService,
    private readonly priceModel: PriceModelService = new PriceModelService(),
  ) {}

  async calculate(data: AnalyzeProductDto): Promise<AnalysisResultOutput> {
    const bestPrices: AnalysisResultOutput['bestPrices'] = [];
    const hasPrice = data.price > 0;
    const marketPrices = await this.priceService.searchProduct(
      data.productName,
      data.price,
    );
    let averagePrice = data.price;
    let priceDeviationPercentage: number | null = null;
    const priceAnalysis: AnalysisResultOutput['priceAnalysis'] = {
      percentage: 0,
      comparison: 'UNKNOWN',
    };

    if (marketPrices.length > 0) {
      const validPrices = marketPrices.filter(
        (price) => !isNaN(price.price) && price.price > 0,
      );

      if (validPrices.length > 0) {
        averagePrice =
          validPrices.reduce((total, current) => total + current.price, 0) /
          validPrices.length;

        validPrices.forEach((price) => {
          bestPrices.push({
            store: price.store,
            price: price.price,
            difference:
              hasPrice && data.price > price.price
                ? Math.round(data.price - price.price)
                : 0,
            link: price.link,
          });
        });
      }
    }

    const pricingMl = this.priceModel.analyze(
      data.price,
      marketPrices,
      data.productUrl,
    );
    if (pricingMl.status === 'ready') {
      averagePrice = pricingMl.referencePrice!;
      priceDeviationPercentage = pricingMl.deviationPercentage!;
      priceAnalysis.comparison = pricingMl.comparison;
      priceAnalysis.percentage = Math.round(Math.abs(priceDeviationPercentage));
    }

    const aiResult = this.securityAi.evaluate(data, {
      priceDeviationPercentage,
      maxPriceDiscount: data.maxPriceDiscount || 30,
    });
    const reviewResult = this.reviewSummary.summarize(data);

    bestPrices.sort((a, b) => a.price - b.price);

    return {
      trustScore: aiResult.trustScore,
      securityScore: aiResult.trustScore,
      aiConfidence: aiResult.confidence,
      riskLevel: aiResult.riskLevel,
      warnings: aiResult.warnings,
      analysisSummary: aiResult.summary,
      bestPrices,
      priceAnalysis,
      detailedAnalysis: this.generateDetailedAnalysis(
        data,
        aiResult.trustScore,
        priceAnalysis,
        averagePrice,
        aiResult.confidence,
      ),
      publicEvaluation: this.generatePublicEvaluation(
        aiResult.trustScore,
        aiResult.isTrustedDomain,
        priceAnalysis,
        hasPrice,
        reviewResult.summary,
      ),
      analysisDetails: {
        reviewCount: reviewResult.reviewCount,
        averageRating: reviewResult.averageRating,
        storeAge: 'Nao identificado',
        securityFeatures: this.buildSecurityFeatures(aiResult),
        returnPolicy: 'Verifique a politica de devolucao diretamente na loja.',
        customerServiceRating: reviewResult.averageRating || 0,
        priceComparison: this.describePriceComparison(priceAnalysis),
        topPositives: reviewResult.topPositives,
        topNegatives: reviewResult.topNegatives,
        reviewSummary: reviewResult.summary,
        reviewSamples: reviewResult.samples,
      },
      decisions: aiResult.decisions,
      securitySignals: aiResult.securitySignals,
      machineLearning: {
        security: aiResult.machineLearning,
        pricing: pricingMl,
        reviews: reviewResult.machineLearning,
      },
    };
  }

  private generateDetailedAnalysis(
    data: AnalyzeProductDto,
    score: number,
    priceAnalysis: AnalysisResultOutput['priceAnalysis'],
    avgPrice: number,
    confidence: number,
  ): string {
    let text = `O motor de analise local atribuiu uma nota heuristica de ${score}/100 para esta oferta, com ${confidence}% de cobertura dos sinais previstos. A pontuacao nao comprova a legitimidade da loja ou do produto. `;

    if (data.price === 0) {
      text +=
        'O preco do produto nao pode ser identificado de forma confiavel na pagina. Por isso, a analise prioriza sinais tecnicos do dominio, reputacao local do vendedor e dados de mercado quando disponiveis. ';
    } else if (priceAnalysis.comparison === 'UNKNOWN') {
      text +=
        'Nao ha ofertas independentes suficientes para estimar uma faixa de preco; a comparacao permanece inconclusiva. ';
    } else {
      const priceStatus =
        priceAnalysis.comparison === 'BELOW'
          ? 'atrativo (abaixo da media)'
          : priceAnalysis.comparison === 'ABOVE'
            ? 'elevado (acima da media)'
            : 'dentro do esperado';

      text += `O valor de R$ ${data.price.toFixed(2)} e considerado ${priceStatus} em relacao a referencia de R$ ${avgPrice.toFixed(2)} estimada nas ofertas comparaveis. `;
    }

    if (score < 60) {
      text +=
        'Os principais fatores de risco envolvem procedencia do dominio, reputacao local e possiveis inconsistencias de preco. Recomendamos validacao manual antes da compra.';
    } else {
      text +=
        'A loja apresenta bons indicadores na analise local. Mesmo assim, verifique politica de devolucao, prazo de entrega e dados do vendedor antes de finalizar o pagamento.';
    }

    return text;
  }

  private generatePublicEvaluation(
    score: number,
    isTrusted: boolean,
    priceAnalysis: AnalysisResultOutput['priceAnalysis'],
    hasPrice: boolean,
    reviewSummary: string,
  ): string {
    if (!hasPrice) {
      return `Sem dados de preco para comparacao direta. A avaliacao considera principalmente sinais tecnicos e reputacionais do dominio pesquisado. ${reviewSummary}`;
    }

    if (isTrusted && score >= 80) {
      return `O dominio consta na base local de varejistas. Isso nao verifica o vendedor nem a entrega. ${priceAnalysis.comparison === 'UNKNOWN' ? 'Nao ha dados suficientes para comparar o preco.' : 'A comparacao de preco considera as ofertas equivalentes encontradas.'} ${reviewSummary}`;
    }

    if (priceAnalysis.comparison === 'BELOW' && score < 70) {
      return `Ofertas muito abaixo da media exigem cautela, especialmente quando combinadas com dominio ou vendedor pouco reconhecido. ${reviewSummary}`;
    }

    return `Percepcao mista. Recomendamos verificar a reputacao especifica do vendedor em canais independentes antes de prosseguir com a transacao. ${reviewSummary}`;
  }

  private buildSecurityFeatures(aiResult: SecurityAiResult): string[] {
    const features = aiResult.securitySignals
      .filter((signal) => signal.weight > 0)
      .slice(0, 4)
      .map((signal) => signal.label);

    return features.length > 0
      ? features
      : ['Analise local de sinais tecnicos'];
  }

  private describePriceComparison(
    priceAnalysis: AnalysisResultOutput['priceAnalysis'],
  ): string {
    if (priceAnalysis.comparison === 'UNKNOWN') {
      return 'Comparação inconclusiva: poucas lojas independentes';
    }
    if (priceAnalysis.comparison === 'BELOW') {
      return `${priceAnalysis.percentage}% abaixo da referência de mercado`;
    }

    if (priceAnalysis.comparison === 'ABOVE') {
      return `${priceAnalysis.percentage}% acima da referência de mercado`;
    }

    return 'Dentro da faixa de referência';
  }
}
