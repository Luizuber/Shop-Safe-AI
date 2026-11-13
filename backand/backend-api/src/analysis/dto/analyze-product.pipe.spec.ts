import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AnalyzeProductPipe } from './analyze-product.pipe';

describe('AnalyzeProductPipe', () => {
  const pipe = new AnalyzeProductPipe();

  it('keeps only expected fields and removes sensitive URL parts', () => {
    const result = pipe.transform({
      productName: '  Smartphone Teste  ',
      price: 1999.9,
      seller: 'Loja Teste',
      productUrl:
        'https://user:password@loja.example/produto?id=1&token=secret#checkout',
      unexpectedSecret: 'must-not-pass',
      reviews: {
        averageRating: 4.5,
        reviewCount: 10,
        comments: [' Produto entregue corretamente. '],
        internal: 'must-not-pass',
      },
    });

    expect(result).toEqual({
      productName: 'Smartphone Teste',
      price: 1999.9,
      seller: 'Loja Teste',
      productUrl: 'https://loja.example/produto',
      reviews: {
        averageRating: 4.5,
        reviewCount: 10,
        comments: ['Produto entregue corretamente.'],
      },
    });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it.each([
    {},
    {
      productName: 'Produto',
      price: -1,
      seller: 'Loja',
      productUrl: 'https://loja.example/produto',
    },
    {
      productName: 'Produto',
      price: 10,
      seller: 'Loja',
      productUrl: 'file:///etc/passwd',
    },
  ])('rejects invalid input', (input) => {
    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });

  it('accepts zero when the page has no reliable visible price', () => {
    expect(
      pipe.transform({
        productName: 'Produto sem preco',
        price: 0,
        seller: 'Loja',
        productUrl: 'https://loja.example/produto',
      }).price,
    ).toBe(0);
  });
});
