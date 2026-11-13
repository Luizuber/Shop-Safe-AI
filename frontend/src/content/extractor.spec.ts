// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
    getProductData,
    getProductPrice,
    getRatingFromText,
    getReviewData,
    isProductPage,
    parseLocalizedNumber,
    parseReviewCount,
} from './extractor';

describe('product extractor', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        document.title = '';
        window.history.replaceState({}, '', '/produto/teste?token=segredo#checkout');
    });

    it.each([
        ['R$ 1.234,56', 1234.56],
        ['1,234.56', 1234.56],
        ['R$ 199,90', 199.9],
        ['1599', 1599],
    ])('parses localized price %s', (text, expected) => {
        expect(parseLocalizedNumber(text)).toBe(expected);
    });

    it('extracts product, price and reviews from nested JSON-LD', () => {
        document.head.innerHTML = `
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [{
                "@type": "Product",
                "name": "Celular Teste",
                "offers": { "@type": "Offer", "price": "1.999,90" },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4,8",
                  "reviewCount": "1.234"
                },
                "review": [{
                  "@type": "Review",
                  "reviewBody": "Produto original e entrega muito rapida."
                }]
              }]
            }
            </script>`;

        expect(isProductPage()).toBe(true);
        expect(getProductPrice()).toBe(1999.9);
        expect(getReviewData()).toEqual({
            averageRating: 4.8,
            reviewCount: 1234,
            comments: ['Produto original e entrega muito rapida.'],
        });
    });

    it('does not confuse a rating with the review count', () => {
        expect(parseReviewCount('4,8 de 5 estrelas - 12.345 avaliações')).toBe(12345);
        expect(getRatingFromText('4,8 de 5 estrelas - 12.345 avaliações')).toBe(4.8);
        expect(parseReviewCount('2,5 mil reviews')).toBe(2500);
        expect(parseReviewCount('(42.817)')).toBe(42817);
    });

    it('extracts the main Amazon metrics and visible seller', () => {
        document.body.innerHTML = `
            <span id="productTitle">Mouse Gamer Logitech G203</span>
            <div id="corePriceDisplay_desktop_feature_div">
                <span class="a-price"><span class="a-offscreen">R$ 102,00</span></span>
            </div>
            <div id="averageCustomerReviews">
                <span class="a-icon-alt">4,8 de 5 estrelas</span>
            </div>
            <span id="acrCustomerReviewText">42.817 avaliações de clientes</span>
            <a id="sellerProfileTriggerId">Logitech Store</a>`;

        expect(getProductData()).toMatchObject({
            productName: 'Mouse Gamer Logitech G203',
            price: 102,
            seller: 'Logitech Store',
            reviews: { averageRating: 4.8, reviewCount: 42817 },
        });
    });

    it('parses the fallback Brazilian price without truncating thousands', () => {
        document.body.textContent = 'Oferta especial por R$ 12.345,67 à vista';
        expect(getProductPrice()).toBe(12345.67);
    });

    it('removes private URL parts and returns required request fields', () => {
        document.head.innerHTML = `
            <meta property="og:title" content="Notebook Seguro | Loja">
            <meta property="og:site_name" content="Loja Teste">
            <meta property="product:price:amount" content="3499.90">`;
        const result = getProductData();

        expect(result).toMatchObject({
            productName: 'Notebook Seguro',
            price: 3499.9,
            seller: 'Loja Teste',
            productUrl: `${window.location.origin}/produto/teste`,
        });
        expect(result.productUrl).not.toContain('segredo');
    });

    it('preserves color and variant after a hyphen for product comparison', () => {
        document.body.innerHTML = '<span id="productTitle">Apple iPhone Air (256 GB) - Azul céu</span>';
        expect(getProductData().productName).toBe('Apple iPhone Air (256 GB) - Azul céu');
    });
});
