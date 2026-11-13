import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PriceComparisonService } from './../src/analysis/price-comparison.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PriceComparisonService)
      .useValue({ searchProduct: () => Promise.resolve([]) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/analysis (POST) returns grounded review data and accepts missing price', async () => {
    const response = await request(app.getHttpServer())
      .post('/analysis')
      .send({
        productName: 'Smartphone Teste',
        price: 0,
        seller: 'Loja Teste',
        productUrl: 'https://loja.example/produto?token=private#checkout',
        reviews: {
          averageRating: 4.6,
          reviewCount: 42,
          comments: [
            'Produto original, chegou rapido e bem embalado.',
            'A segunda unidade apresentou defeito e suporte ruim.',
          ],
        },
      })
      .expect(201);

    expect(response.body).toMatchObject({
      priceAnalysis: { percentage: 0, comparison: 'UNKNOWN' },
      analysisDetails: {
        averageRating: 4.6,
        reviewCount: 42,
        reviewSummary: expect.stringContaining('4.6/5'),
      },
      detailedAnalysis: expect.stringContaining(
        'preco do produto nao pode ser identificado',
      ),
    });
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(response.body.machineLearning.security.status).toBe('ready');
    expect(response.body.machineLearning.pricing.status).toBe(
      'insufficient_data',
    );
    expect(response.body.machineLearning.reviews.status).toBe('ready');
  });

  it('/analysis/models (GET) exposes model versions and measured metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/analysis/models')
      .expect(200);
    expect(response.body.security).toMatchObject({
      status: 'ready',
      algorithm: 'logistic-url',
    });
    expect(response.body.sentiment.testMetrics.samples).toBeGreaterThan(100);
    expect(JSON.stringify(response.body)).not.toContain('coefficients');
  });

  it.each([
    {
      productName: 'Produto',
      price: -1,
      seller: 'Loja',
      productUrl: 'https://loja.example/produto',
    },
    {
      productName: 'Produto',
      price: 100,
      seller: 'Loja',
      productUrl: 'javascript:alert(1)',
    },
  ])('/analysis (POST) rejects unsafe input', (payload) =>
    request(app.getHttpServer()).post('/analysis').send(payload).expect(400),
  );
});
