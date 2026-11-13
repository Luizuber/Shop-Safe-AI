import { describe, expect, it } from '@jest/globals';
import { ReviewSummaryService } from './review-summary.service';

describe('ReviewSummaryService', () => {
  const service = new ReviewSummaryService();

  it('normalizes rating, deduplicates comments and extracts grounded topics', () => {
    const result = service.summarize({
      productName: 'Produto',
      price: 100,
      seller: 'Loja',
      productUrl: 'https://loja.example/produto',
      reviews: {
        averageRating: 4.74,
        reviewCount: 321,
        comments: [
          ' Produto original, lacrado e com entrega rapida. ',
          'Produto original, lacrado e com entrega rapida.',
          'A embalagem chegou danificada e o produto apresentou defeito.',
          'curto',
        ],
      },
    });

    expect(result.averageRating).toBe(4.7);
    expect(result.reviewCount).toBe(321);
    expect(result.samples).toHaveLength(2);
    expect(result.topPositives).toContain('Produto original');
    expect(result.topNegatives).toEqual(
      expect.arrayContaining(['Embalagem danificada', 'Produto com defeito']),
    );
  });

  it('does not invent review facts when no reviews were captured', () => {
    const result = service.summarize({
      productName: 'Produto',
      price: 0,
      seller: 'Loja',
      productUrl: 'https://loja.example/produto',
    });

    expect(result.reviewCount).toBe(0);
    expect(result.averageRating).toBe(0);
    expect(result.summary).toContain('Nao foram encontrados');
    expect(result.topPositives).toEqual([]);
    expect(result.topNegatives).toEqual([]);
  });
});
