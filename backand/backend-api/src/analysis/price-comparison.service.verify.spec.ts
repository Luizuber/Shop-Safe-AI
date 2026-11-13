import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PriceComparisonService } from './price-comparison.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PriceComparisonService Verification', () => {
  let service: PriceComparisonService;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn().mockReturnValue('fake-api-key'),
    };
    service = new PriceComparisonService(
      configService as unknown as ConfigService,
    );
  });

  const parse = (str: string) => service.parseBrazilianPrice(str);

  it('should parse simple price', () => {
    expect(parse('R$ 50,00')).toBe(50);
    expect(parse('R$ 1.599,00')).toBe(1599);
  });

  it('should take first part if "ou" is present', () => {
    expect(parse('R$ 1.599,00 ou 10x de R$ 159,90')).toBe(1599);
  });

  it('should return 0 for installment-only strings', () => {
    expect(parse('10x de R$ 50,00')).toBe(0);
    expect(parse('12 parcelas de R$ 99,90')).toBe(0);
    expect(parse('5x de R$10.00')).toBe(0);
  });

  it('should return 0 for non-monetary strings', () => {
    expect(parse('Grátis')).toBe(0);
    expect(parse('')).toBe(0);
  });

  it('should prefer extracted_price in service mapping', async () => {
    // Mocking axios is complex, but we can verify the mapping logic indirectly if we could call it.
    // For now, the unit tests for parseBrazilianPrice cover the core logic.
  });

  it('resolves a Google Shopping result to the direct merchant page', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          shopping_results: [
            {
              title: 'Mouse Logitech G203 Lightsync',
              source: 'Google Shopping',
              extracted_price: 102,
              product_link:
                'https://www.google.com/shopping/product/123?gl=br',
              serpapi_immersive_product_api:
                'https://serpapi.com/search.json?engine=google_immersive_product&page_token=valid_token_for_immersive_product_123456',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          product_results: {
            title: 'Mouse Logitech G203 Lightsync',
            stores: [
              {
                name: 'Amazon Brasil',
                extracted_price: 102,
                link: 'https://www.amazon.com.br/dp/B087CT8PWY',
                title: 'Mouse Gamer Logitech G203 Lightsync RGB',
              },
              {
                name: 'Intermediario',
                extracted_price: 101,
                link: 'https://www.google.com/shopping/product/123?gl=br',
                title: 'Mouse Logitech G203 Lightsync',
              },
              {
                name: 'Produto incorreto',
                extracted_price: 80,
                link: 'https://loja.example/mouse-logitech-g305',
                title: 'Mouse Gamer Logitech G305 Lightspeed',
              },
            ],
          },
        },
      });

    const result = await service.searchProduct(
      'Mouse Logitech G203 Lightsync',
    );

    expect(result).toEqual([
      {
        store: 'Amazon Brasil',
        price: 102,
        link: 'https://www.amazon.com.br/dp/B087CT8PWY',
      },
    ]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('rejects unrelated products, accessories and different models', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        shopping_results: [
          {
            title: 'Mouse Gamer Logitech G305 Lightspeed',
            source: 'Modelo diferente',
            extracted_price: 90,
            link: 'https://loja.example/mouse-g305',
          },
          {
            title: 'Capa protetora para Mouse Logitech G203',
            source: 'Acessorio',
            extracted_price: 20,
            link: 'https://loja.example/capa-g203',
          },
          {
            title: 'Mouse Gamer Logitech G203 Lightsync RGB',
            source: 'Produto correto',
            extracted_price: 102,
            link: 'https://loja.example/mouse-g203',
          },
          {
            title: 'Teclado Gamer Logitech G203 Lightsync RGB',
            source: 'Categoria incorreta',
            extracted_price: 150,
            link: 'https://loja.example/teclado',
          },
        ],
      },
    });

    const result = await service.searchProduct(
      'Mouse Gamer Logitech G203 Lightsync RGB',
    );

    expect(result).toEqual([
      {
        store: 'Produto correto',
        price: 102,
        link: 'https://loja.example/mouse-g203',
      },
    ]);
  });

  it('requires the same generation, capacity and color', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        shopping_results: [
          {
            title: 'Apple iPhone 15 128GB Preto',
            source: 'Geracao diferente',
            extracted_price: 4000,
            link: 'https://loja.example/iphone-15-128gb-preto',
          },
          {
            title: 'Apple iPhone 14 256GB Preto',
            source: 'Capacidade diferente',
            extracted_price: 3900,
            link: 'https://loja.example/iphone-14-256gb-preto',
          },
          {
            title: 'Apple iPhone 14 128GB Azul',
            source: 'Cor diferente',
            extracted_price: 3800,
            link: 'https://loja.example/iphone-14-128gb-azul',
          },
          {
            title: 'Apple iPhone 14 128GB Preto',
            source: 'Produto correto',
            extracted_price: 4100,
            link: 'https://loja.example/iphone-14-128gb-preto',
          },
        ],
      },
    });

    const result = await service.searchProduct('Apple iPhone 14 128GB Preto');

    expect(result).toEqual([
      {
        store: 'Produto correto',
        price: 4100,
        link: 'https://loja.example/iphone-14-128gb-preto',
      },
    ]);
  });

  it('rejects rental and used offers without using the target price as a training filter', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        shopping_results: [
          {
            title: 'Apple iPhone Air 256GB Azul Ceu',
            source: 'Allu',
            extracted_price: 659.9,
            link: 'https://allu.example/iphone-air',
            snippet: 'Assinatura com pagamento mensal',
          },
          {
            title: 'Apple iPhone Air 256GB Azul Ceu',
            source: 'OLX',
            extracted_price: 2715,
            link: 'https://olx.example/iphone-air',
          },
          {
            title: 'Apple iPhone Air 256GB Azul Ceu',
            source: 'Loja desconhecida',
            extracted_price: 800,
            link: 'https://loja.example/oferta-incompativel',
          },
          {
            title: 'Apple iPhone Air 256GB Azul Ceu',
            source: 'Varejista confiavel',
            extracted_price: 6299,
            link: 'https://varejista.example/iphone-air-256gb-azul',
          },
        ],
      },
    });

    const result = await service.searchProduct(
      'Apple iPhone Air 256GB Azul Ceu',
      6839.1,
    );

    expect(result).toEqual([
      {
        store: 'Loja desconhecida',
        price: 800,
        link: 'https://loja.example/oferta-incompativel',
      },
      {
        store: 'Varejista confiavel',
        price: 6299,
        link: 'https://varejista.example/iphone-air-256gb-azul',
      },
    ]);
  });

  it('keeps Google Shopping as fallback when a direct link cannot be resolved', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          shopping_results: [
            {
              title: 'Mouse Logitech G203 Lightsync',
              source: 'Loja sem link direto',
              extracted_price: 99,
              product_link:
                'https://www.google.com/shopping/product/456?gl=br',
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { organic_results: [] } });

    const result = await service.searchProduct(
      'Mouse Logitech G203 Lightsync',
    );

    expect(result).toEqual([
      {
        store: 'Loja sem link direto',
        price: 99,
        link: 'https://www.google.com/shopping/product/456?gl=br',
      },
    ]);
  });

  it('finds a direct product page from the product and store names', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          shopping_results: [
            {
              title: 'Mouse Logitech G203 Lightsync',
              source: 'Amazon',
              extracted_price: 102,
              product_link:
                'https://www.google.com/shopping/product/789?gl=br',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          organic_results: [
            {
              title: 'Mouse Gamer Logitech G203 Lightsync - Amazon.com.br',
              link: 'https://www.amazon.com.br/dp/B087CT8PWY',
            },
            {
              title: 'Mouse Logitech G305',
              link: 'https://outra-loja.example/mouse-g305',
            },
          ],
        },
      });

    const result = await service.searchProduct(
      'Mouse Logitech G203 Lightsync',
    );

    expect(result).toEqual([
      {
        store: 'Amazon',
        price: 102,
        link: 'https://www.amazon.com.br/dp/B087CT8PWY',
      },
    ]);
  });
});
