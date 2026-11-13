import { describe, expect, it } from '@jest/globals';
import { SecurityAiService } from './security-ai.service';
import { MachineLearningService } from '../ml/machine-learning.service';

describe('SecurityAiService', () => {
  const service = new SecurityAiService();
  const context = { priceDeviationPercentage: null, maxPriceDiscount: 30 };

  it('trusts the exact official domain and its real subdomains', () => {
    const exact = service.evaluate(
      {
        productName: 'Produto',
        price: 100,
        seller: 'Amazon',
        productUrl: 'https://amazon.com.br/produto',
      },
      context,
    );
    const subdomain = service.evaluate(
      {
        productName: 'Produto',
        price: 100,
        seller: 'Amazon',
        productUrl: 'https://ofertas.amazon.com.br/produto',
      },
      context,
    );

    expect(exact.isTrustedDomain).toBe(true);
    expect(subdomain.isTrustedDomain).toBe(true);
  });

  it.each([
    'https://evilamazon.com/produto',
    'https://amazon.com.br.evil.example/produto',
    'https://mercadolivre.com.br.evil.example/produto',
  ])('does not trust lookalike domain %s', (productUrl) => {
    const result = service.evaluate(
      { productName: 'Produto', price: 100, seller: 'Amazon', productUrl },
      context,
    );

    expect(result.isTrustedDomain).toBe(false);
    expect(result.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Dominio Desconhecido' }),
      ]),
    );
    expect(result.decisions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Nome de Vendedor Reconhecido' }),
      ]),
    );
  });

  it('does not reward unavailable price comparison', () => {
    const result = service.evaluate(
      {
        productName: 'Produto',
        price: 100,
        seller: 'Loja',
        productUrl: 'https://loja.example/produto',
      },
      context,
    );
    const priceSignal = result.securitySignals.find(
      (signal) => signal.id === 'price_deviation',
    );

    expect(priceSignal).toMatchObject({ value: 'indisponivel', weight: 0 });
  });

  it('does not convert an isolated false positive on an official HTTPS domain into zero trust', () => {
    const model = {
      predictSecurity: () => ({
        status: 'ready',
        label: 'suspicious_url',
        probability: 0.99999,
        scope: 'Domain',
      }),
    };
    const guarded = new SecurityAiService(
      model as unknown as MachineLearningService,
    );
    const result = guarded.evaluate(
      {
        productName: 'Smart TV LG',
        price: 1574.1,
        seller: 'Amazon',
        productUrl:
          'https://www.amazon.com.br/Smart-TV-LG-43-4K-UHD-NANO-AI-43UN85CPSA.AWZ/dp/B0TEST1234',
      },
      context,
    );
    expect(result.trustScore).toBeGreaterThan(50);
    expect(result.machineLearning).toMatchObject({
      assessment: 'conflicting_evidence',
      scoreAdjustment: 0,
    });
    expect(result.warnings.some((w) => w.type === 'HIGH_RISK')).toBe(false);
  });

  it('still penalizes a model alert corroborated by brand impersonation, with a bounded adjustment', () => {
    const model = {
      predictSecurity: () => ({
        status: 'ready',
        label: 'suspicious_url',
        probability: 0.99999,
        scope: 'Domain',
      }),
    };
    const guarded = new SecurityAiService(
      model as unknown as MachineLearningService,
    );
    const result = guarded.evaluate(
      {
        productName: 'Produto',
        price: 100,
        seller: 'Amazon',
        productUrl: 'http://amazon.com.br.evil.example/pagamento',
      },
      context,
    );
    expect(result.riskLevel).toBe('HIGH');
    expect(result.machineLearning.scoreAdjustment).toBe(-20);
    expect(result.warnings.some((w) => w.type === 'HIGH_RISK')).toBe(true);
  });
});
