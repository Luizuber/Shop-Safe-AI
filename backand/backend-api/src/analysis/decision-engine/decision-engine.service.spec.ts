import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DecisionEngineService } from './decision-engine.service';
import { AnalyzeProductDto } from '../dto/analyze-product.dto';
import { PriceComparisonService } from '../price-comparison.service';
import { SecurityAiService } from '../security-ai/security-ai.service';
import { ReviewSummaryService } from '../review-summary/review-summary.service';

describe('DecisionEngineService', () => {
  let service: DecisionEngineService;
  let priceService: jest.Mocked<Pick<PriceComparisonService, 'searchProduct'>>;
  let securityAi: SecurityAiService;
  let reviewSummary: ReviewSummaryService;
  type SearchProduct = PriceComparisonService['searchProduct'];

  beforeEach(() => {
    priceService = {
      searchProduct: jest
        .fn<SearchProduct>()
        .mockResolvedValue([] as Awaited<ReturnType<SearchProduct>>),
    };
    securityAi = new SecurityAiService();
    reviewSummary = new ReviewSummaryService();
    service = new DecisionEngineService(
      priceService as unknown as PriceComparisonService,
      securityAi,
      reviewSummary,
    );
  });

  it('can report low risk when a known domain also has sufficient independent price evidence', async () => {
    priceService.searchProduct.mockResolvedValueOnce([
      ...[4900, 4950, 5000, 5050, 5100].map((price, i) => ({
        store: `Concorrente ${i}`,
        price,
        link: `https://loja${i}.example/produto`,
      })),
    ]);
    const data: AnalyzeProductDto = {
      productName: 'Apple iPhone 15',
      price: 5000,
      productUrl: 'https://www.amazon.com.br/iphone15',
      seller: 'Amazon',
    };

    const result = await service.calculate(data);

    expect(result.trustScore).toBeGreaterThanOrEqual(80);
    expect(result.riskLevel).toBe('LOW');
    expect(result.machineLearning?.pricing.status).toBe('ready');
  });

  it('should recommend MEDIUM risk level for products with some cautions', async () => {
    const data: AnalyzeProductDto = {
      productName: 'Generic Product',
      price: 250,
      productUrl: 'https://www.unknown-store.com/product',
      seller: 'Unknown Seller',
    };

    const result = await service.calculate(data);

    expect(result.trustScore).toBeGreaterThanOrEqual(50);
    expect(result.trustScore).toBeLessThan(80);
    expect(result.riskLevel).toBe('MEDIUM');
  });

  it('should recommend HIGH risk level for untrusted sites', async () => {
    const data: AnalyzeProductDto = {
      productName: 'Suspicious Offer',
      price: 10,
      productUrl: 'http://suspicious-site.com/offer',
      seller: 'Dubious Seller',
    };

    const result = await service.calculate(data);

    expect(result.trustScore).toBeLessThan(50);
    expect(result.riskLevel).toBe('HIGH');
  });

  it('should expose local AI confidence and security signals', async () => {
    const data: AnalyzeProductDto = {
      productName: 'Apple iPhone 15',
      price: 5000,
      productUrl: 'https://www.amazon.com.br/iphone15',
      seller: 'Amazon',
    };

    const result = await service.calculate(data);

    expect(result.aiConfidence).toBeGreaterThanOrEqual(50);
    expect(result.securityScore).toBe(result.trustScore);
    expect(result.securitySignals?.length).toBeGreaterThan(0);
    expect(result.analysisSummary).toContain('motor local');
    expect(result.machineLearning?.security.status).toBe('ready');
    expect(result.priceAnalysis.comparison).toBe('UNKNOWN');
  });

  it('should summarize visible product reviews', async () => {
    const data: AnalyzeProductDto = {
      productName: 'Smartphone Teste',
      price: 1500,
      productUrl: 'https://www.amazon.com.br/produto',
      seller: 'Amazon',
      reviews: {
        averageRating: 4.7,
        reviewCount: 120,
        comments: [
          'Produto original, lacrado e com entrega rapida.',
          'Excelente qualidade e bom custo beneficio.',
          'A embalagem veio amassada, mas o produto funciona.',
        ],
      },
    };

    const result = await service.calculate(data);

    expect(result.analysisDetails?.averageRating).toBe(4.7);
    expect(result.analysisDetails?.reviewCount).toBe(120);
    expect(result.analysisDetails?.reviewSummary).toContain('nota media');
    expect(result.analysisDetails?.topPositives).toContain('Produto original');
    expect(result.analysisDetails?.topNegatives).toContain(
      'Embalagem danificada',
    );
  });
});
