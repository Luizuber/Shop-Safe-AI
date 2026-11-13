import { Injectable } from '@nestjs/common';
import { AnalyzeProductDto } from '../dto/analyze-product.dto';
import { AnalysisResultOutput } from '../interfaces/analysis-result.interface';
import {
  MachineLearningService,
  ModelPrediction,
} from '../ml/machine-learning.service';

export interface SecurityAiContext {
  priceDeviationPercentage: number | null;
  maxPriceDiscount: number;
}

export interface SecurityAiSignal {
  id: string;
  label: string;
  value: boolean | number | string;
  weight: number;
}

export interface SecurityAiResult {
  trustScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  warnings: AnalysisResultOutput['warnings'];
  decisions: AnalysisResultOutput['decisions'];
  summary: string;
  securitySignals: SecurityAiSignal[];
  isTrustedDomain: boolean;
  machineLearning: ModelPrediction;
}

@Injectable()
export class SecurityAiService {
  constructor(
    private readonly ml: MachineLearningService = new MachineLearningService(),
  ) {}

  private readonly trustedDomains = [
    'amazon.com',
    'amazon.com.br',
    'mercadolivre.com.br',
    'magazineluiza.com.br',
    'americanas.com.br',
    'casasbahia.com.br',
    'kabum.com.br',
    'pichau.com.br',
    'terabyteshop.com.br',
    'fastshop.com.br',
    'shopee.com.br',
    'aliexpress.com',
    'pontofrio.com.br',
    'extra.com.br',
    'submarino.com.br',
    'shoptime.com.br',
  ];

  private readonly knownSellers = [
    'amazon',
    'mercado livre',
    'magalu',
    'magazine luiza',
    'americanas',
    'casas bahia',
    'kabum',
    'pichau',
    'terabyte',
    'fast shop',
    'shopee',
    'aliexpress',
    'ponto frio',
    'extra',
    'submarino',
    'shoptime',
  ];

  private readonly protectedBrands = [
    'amazon',
    'mercadolivre',
    'mercado livre',
    'magalu',
    'americanas',
    'casasbahia',
    'kabum',
    'samsung',
    'apple',
    'motorola',
    'xiaomi',
  ];

  private readonly suspiciousTerms = [
    'promo',
    'promocao',
    'oferta',
    'desconto',
    'brinde',
    'gratis',
    'liquidacao',
    'imperdivel',
    'oficial',
    'secure',
    'checkout',
    'pagamento',
    'pix',
  ];

  evaluate(
    data: AnalyzeProductDto,
    context: SecurityAiContext,
  ): SecurityAiResult {
    const url = this.parseProductUrl(data.productUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const seller = data.seller?.toLowerCase() ?? '';
    const sourceUrl = data.productUrl || url.href;
    const pathAndQuery = `${url.pathname}${url.search}`.toLowerCase();
    const isHttps = url.protocol === 'https:';
    const isTrustedDomain = this.trustedDomains.some((domain) =>
      this.isSameOrSubdomain(hostname, domain),
    );
    // Seller names come from the page and are easy to forge. They only become a
    // positive reputation signal when the domain itself is recognized.
    const isKnownSeller =
      isTrustedDomain &&
      this.knownSellers.some((knownSeller) => seller.includes(knownSeller));
    const suspiciousTermCount = this.suspiciousTerms.filter((term) =>
      `${hostname} ${pathAndQuery}`.includes(term),
    ).length;
    const subdomainCount = this.countSubdomains(hostname);
    const hasDigitsInDomain = /\d/.test(hostname.split('.')[0] ?? '');
    const urlLength = sourceUrl.length;
    const brandImpersonation = this.detectBrandImpersonation(hostname);
    const priceDeviation = context.priceDeviationPercentage;
    const extremeDiscount =
      priceDeviation !== null && priceDeviation <= -context.maxPriceDiscount;
    const suspiciousDiscount = priceDeviation !== null && priceDeviation <= -20;

    const signals: SecurityAiSignal[] = [
      {
        id: 'https',
        label: 'Conexao HTTPS',
        value: isHttps,
        weight: isHttps ? 0.18 : -0.28,
      },
      {
        id: 'trusted_domain',
        label: 'Dominio conhecido',
        value: isTrustedDomain,
        weight: isTrustedDomain ? 0.38 : -0.22,
      },
      {
        id: 'known_seller',
        label: 'Nome de vendedor reconhecido',
        value: isKnownSeller,
        weight: isKnownSeller ? 0.03 : 0,
      },
      {
        id: 'suspicious_terms',
        label: 'Termos suspeitos na URL',
        value: suspiciousTermCount,
        weight: -0.07 * suspiciousTermCount,
      },
      {
        id: 'subdomains',
        label: 'Quantidade de subdominios',
        value: subdomainCount,
        weight: subdomainCount > 2 ? -0.12 : 0.03,
      },
      {
        id: 'domain_digits',
        label: 'Numeros no dominio',
        value: hasDigitsInDomain,
        weight: hasDigitsInDomain ? -0.08 : 0.02,
      },
      {
        id: 'url_length',
        label: 'Comprimento da URL',
        value: urlLength,
        weight: urlLength > 140 ? -0.1 : 0.03,
      },
      {
        id: 'brand_impersonation',
        label: 'Possivel imitacao de marca',
        value: brandImpersonation,
        weight: brandImpersonation ? -0.32 : 0.04,
      },
      {
        id: 'price_deviation',
        label: 'Desvio de preco',
        value: priceDeviation ?? 'indisponivel',
        weight:
          priceDeviation === null
            ? 0
            : extremeDiscount
              ? -0.3
              : suspiciousDiscount
                ? -0.16
                : 0.06,
      },
    ];

    const rawScore = signals.reduce(
      (total, signal) => total + signal.weight,
      0,
    );
    const ruleScore = this.clamp(Math.round(50 + rawScore * 40), 0, 100);
    const machineLearning = this.ml.predictSecurity(data.productUrl);
    // A class probability is not an overall shopping safety score. Require
    // independent evidence and bound its impact; expose conflicting evidence.
    const highModelSignal = machineLearning.label === 'suspicious_url';
    const independentUrlRisk =
      !isHttps ||
      brandImpersonation ||
      (!isTrustedDomain &&
        (subdomainCount > 2 || hasDigitsInDomain || suspiciousTermCount > 0));
    const conflictingEvidence =
      highModelSignal && isTrustedDomain && isHttps && !brandImpersonation;
    const corroboratedModelRisk =
      highModelSignal && independentUrlRisk && !conflictingEvidence;
    const modelPenalty = corroboratedModelRisk
      ? Math.min(20, Math.round(20 * machineLearning.probability!))
      : 0;
    machineLearning.assessment = conflictingEvidence
      ? 'conflicting_evidence'
      : 'model_signal';
    machineLearning.scoreAdjustment = modelPenalty === 0 ? 0 : -modelPenalty;
    const trustScore = this.clamp(ruleScore - modelPenalty, 0, 100);
    const confidence = this.calculateConfidence(signals, priceDeviation);
    const riskLevel = this.classifyRisk(trustScore);
    const warnings = this.buildWarnings({
      isHttps,
      isTrustedDomain,
      brandImpersonation,
      extremeDiscount,
      suspiciousDiscount,
      maxPriceDiscount: context.maxPriceDiscount,
    });
    const decisions = this.buildDecisions({
      isHttps,
      isTrustedDomain,
      isKnownSeller,
      brandImpersonation,
      priceDeviation,
      extremeDiscount,
      suspiciousDiscount,
    });
    if (machineLearning.status === 'ready') {
      decisions.push({
        type: corroboratedModelRisk ? 'negative' : 'neutral',
        label: 'Classificador de phishing (ML)',
        description: conflictingEvidence
          ? 'O modelo divergiu do domínio HTTPS reconhecido. O resultado é inconclusivo e não alterou a pontuação.'
          : corroboratedModelRisk
            ? 'O modelo encontrou sinal alto de phishing, acompanhado por indícios independentes na URL. Seu impacto na nota é limitado.'
            : highModelSignal
              ? 'Sinal isolado de phishing no modelo, sem confirmação independente; não alterou a pontuação.'
              : 'O modelo de domínio não encontrou sinal alto de phishing. Isso não comprova a legitimidade da oferta.',
      });
      if (corroboratedModelRisk) {
        warnings.push({
          type: 'HIGH_RISK',
          message:
            'Sinal de phishing do modelo acompanhado por indícios independentes na URL.',
        });
      }
    } else {
      decisions.push({
        type: 'neutral',
        label: 'Modelo de phishing indisponível',
        description:
          'A análise usou somente regras; não há uma previsão de ML válida para esta URL.',
      });
    }

    return {
      trustScore,
      riskLevel,
      confidence,
      warnings,
      decisions,
      summary:
        this.buildSummary(data.productName, trustScore, confidence) +
        (machineLearning.status === 'ready'
          ? ' A análise combina regras com um classificador de URLs treinado; não garante a segurança da compra.'
          : ' Modelo de ML indisponível nesta análise.'),
      securitySignals: signals,
      isTrustedDomain,
      machineLearning,
    };
  }

  private buildWarnings(input: {
    isHttps: boolean;
    isTrustedDomain: boolean;
    brandImpersonation: boolean;
    extremeDiscount: boolean;
    suspiciousDiscount: boolean;
    maxPriceDiscount: number;
  }): AnalysisResultOutput['warnings'] {
    const warnings: AnalysisResultOutput['warnings'] = [];

    if (!input.isHttps) {
      warnings.push({
        type: 'LOW_REPUTATION',
        message: 'Site nao utiliza conexao segura (HTTPS).',
      });
    }

    if (!input.isTrustedDomain) {
      warnings.push({
        type: 'LOW_REPUTATION',
        message: 'Dominio desconhecido ou nao verificado.',
      });
    }

    if (input.brandImpersonation) {
      warnings.push({
        type: 'LOW_REPUTATION',
        message: 'A URL possui indicios de imitacao de marca conhecida.',
      });
    }

    if (input.extremeDiscount) {
      warnings.push({
        type: 'COUNTERFEIT_RISK',
        message: `Preco excessivamente baixo (mais de ${input.maxPriceDiscount}% de desconto). Cuidado: risco elevado de produto falsificado.`,
      });
    } else if (input.suspiciousDiscount) {
      warnings.push({
        type: 'SUSPICIOUS_PRICE',
        message: 'Preco significativamente abaixo da media de mercado.',
      });
    }

    return warnings;
  }

  private buildDecisions(input: {
    isHttps: boolean;
    isTrustedDomain: boolean;
    isKnownSeller: boolean;
    brandImpersonation: boolean;
    priceDeviation: number | null;
    extremeDiscount: boolean;
    suspiciousDiscount: boolean;
  }): AnalysisResultOutput['decisions'] {
    const decisions: AnalysisResultOutput['decisions'] = [];

    decisions.push(
      input.isHttps
        ? {
            type: 'positive',
            label: 'Conexao Segura',
            description: 'O trafego de dados e criptografado via HTTPS.',
          }
        : {
            type: 'negative',
            label: 'Conexao Insegura',
            description:
              'O site nao utiliza HTTPS. Alto risco de interceptacao de dados.',
          },
    );

    decisions.push(
      input.isTrustedDomain
        ? {
            type: 'positive',
            label: 'Dominio Reconhecido',
            description:
              'Este dominio corresponde a uma entrada da base local de lojas conhecidas; isso nao verifica o vendedor da oferta.',
          }
        : {
            type: 'negative',
            label: 'Dominio Desconhecido',
            description:
              'O dominio nao esta na base local de grandes varejistas verificados.',
          },
    );

    decisions.push(
      input.isKnownSeller
        ? {
            type: 'positive',
            label: 'Nome de Vendedor Reconhecido',
            description:
              'O nome informado na pagina coincide com uma entrada local, mas nao comprova a identidade do vendedor.',
          }
        : {
            type: 'neutral',
            label: 'Vendedor Comum',
            description:
              'O vendedor nao possui selo de alta reputacao na base local.',
          },
    );

    if (input.brandImpersonation) {
      decisions.push({
        type: 'negative',
        label: 'Possivel Imitacao',
        description:
          'O dominio contem marca conhecida, mas nao corresponde ao dominio oficial esperado.',
      });
    }

    if (input.priceDeviation === null) {
      decisions.push({
        type: 'neutral',
        label: 'Preco Sem Comparacao',
        description:
          'Nao houve dados suficientes de mercado para comparar o preco.',
      });
    } else if (input.extremeDiscount) {
      decisions.push({
        type: 'negative',
        label: 'Possivel Produto Falso',
        description: `O valor esta ${Math.round(Math.abs(input.priceDeviation))}% abaixo do mercado.`,
      });
    } else if (input.suspiciousDiscount) {
      decisions.push({
        type: 'negative',
        label: 'Preco Muito Baixo',
        description:
          'O preco esta muito abaixo da media e exige cautela adicional.',
      });
    } else if (input.priceDeviation > 15) {
      decisions.push({
        type: 'neutral',
        label: 'Preco Elevado',
        description: 'O valor esta acima da media encontrada em outras lojas.',
      });
    } else {
      decisions.push({
        type: 'positive',
        label: 'Preco Coerente',
        description: 'O valor esta alinhado com a media do mercado.',
      });
    }

    return decisions;
  }

  private buildSummary(
    productName: string,
    trustScore: number,
    confidence: number,
  ): string {
    if (trustScore >= 80) {
      return `Baixo risco pelos sinais observados. O motor local avaliou dados tecnicos, reputacionais e de preco de "${productName}" com ${confidence}% de cobertura; isso nao garante a legitimidade da oferta.`;
    }

    if (trustScore >= 50) {
      return `Atencao necessaria. O motor local encontrou pontos de cautela para "${productName}" e recomenda verificar loja, vendedor e preco antes da compra.`;
    }

    return `Alto risco pelos sinais observados. O motor local recomenda validacao manual adicional antes da compra de "${productName}".`;
  }

  private detectBrandImpersonation(hostname: string): boolean {
    return this.protectedBrands.some((brand) => {
      const normalizedBrand = brand.replace(/\s/g, '');
      const mentionsBrand = hostname.includes(normalizedBrand);
      const officialDomain = this.trustedDomains.some((domain) =>
        this.isSameOrSubdomain(hostname, domain),
      );

      return mentionsBrand && !officialDomain;
    });
  }

  private isSameOrSubdomain(hostname: string, domain: string): boolean {
    return hostname === domain || hostname.endsWith(`.${domain}`);
  }

  private countSubdomains(hostname: string): number {
    const parts = hostname.split('.');

    if (parts.length <= 2) return 0;

    const secondLevelCountryCode =
      parts.length >= 3 &&
      parts.at(-1)?.length === 2 &&
      parts.at(-2)?.length === 3;

    return secondLevelCountryCode
      ? Math.max(parts.length - 3, 0)
      : parts.length - 2;
  }

  private calculateConfidence(
    signals: SecurityAiSignal[],
    priceDeviation: number | null,
  ): number {
    const availableSignals = signals.filter(
      (signal) => signal.value !== 'indisponivel',
    ).length;
    const priceBoost = priceDeviation === null ? 0 : 10;
    const confidence = 45 + availableSignals * 4 + priceBoost;

    return this.clamp(confidence, 50, 95);
  }

  private parseProductUrl(productUrl?: string): URL {
    try {
      if (!productUrl) {
        return new URL('http://unknown.local/');
      }

      return new URL(productUrl);
    } catch {
      return new URL('http://unknown.local/');
    }
  }

  private classifyRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score < 50) return 'HIGH';
    if (score < 80) return 'MEDIUM';

    return 'LOW';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
