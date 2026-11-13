// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeProduct } from './analysisApi';

const request = {
    productName: 'Produto',
    price: 100,
    seller: 'Loja',
    productUrl: 'https://loja.example/produto',
};

describe('analysis API client', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('accepts a complete JSON response', async () => {
        const payload = {
            trustScore: 60,
            riskLevel: 'MEDIUM',
            warnings: [],
            bestPrices: [],
            analysisDetails: { reviewCount: 0, averageRating: 0 },
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        await expect(analyzeProduct(request)).resolves.toMatchObject(payload);
    });

    it('normalizes the legacy response currently used by the published API', async () => {
        const legacyPayload = {
            trustScore: 100,
            riskLevel: 'LOW',
            warnings: [],
            bestPrices: [],
            analysisSummary: 'Compra garantidamente segura.',
            priceAnalysis: { percentage: 0, comparison: 'FAIR' },
            decisions: [],
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(legacyPayload), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        const result = await analyzeProduct({
            ...request,
            reviews: { averageRating: 4.7, reviewCount: 123, comments: ['Comentário real capturado na página do produto.'] },
        });

        expect(result.analysisDetails).toMatchObject({ averageRating: 4.7, reviewCount: 123 });
        expect(result.analysisDetails.priceComparison).toBe('Dentro da faixa média pesquisada');
        expect(result.aiSummary).toContain('modo de compatibilidade');
        expect(result.aiSummary).not.toContain('garantidamente segura');
    });

    it('rejects a successful but fabricated/incomplete response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ trustScore: 100 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        await expect(analyzeProduct(request)).rejects.toThrow('resposta incompleta');
    });

    it('rejects non-JSON responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>erro</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
        })));

        await expect(analyzeProduct(request)).rejects.toThrow('formato inesperado');
    });

    it('prioritizes direct links while preserving Google Shopping fallbacks', async () => {
        const payload = {
            trustScore: 80,
            riskLevel: 'LOW',
            warnings: [],
            bestPrices: [
                {
                    store: 'Amazon',
                    price: 90,
                    difference: -10,
                    link: 'https://www.google.com/url?q=https%3A%2F%2Fwww.amazon.com.br%2Fdp%2FABC123',
                },
                {
                    store: 'Google Shopping',
                    price: 89,
                    difference: -11,
                    link: 'https://www.google.com/shopping/product/123?gl=br',
                },
            ],
            analysisDetails: { reviewCount: 0, averageRating: 0 },
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        const result = await analyzeProduct(request);

        expect(result.bestPrices).toEqual([
            {
                store: 'Amazon',
                price: 90,
                difference: -10,
                link: 'https://www.amazon.com.br/dp/ABC123',
            },
            {
                store: 'Google Shopping',
                price: 89,
                difference: -11,
                link: 'https://www.google.com/shopping/product/123?gl=br',
            },
        ]);
    });

    it('removes rental, used marketplace and implausible prices from legacy responses', async () => {
        const payload = {
            trustScore: 80,
            riskLevel: 'LOW',
            warnings: [],
            bestPrices: [
                { store: 'Allu', price: 9, difference: -91, link: 'https://www.google.com/shopping/product/1' },
                { store: 'OLX', price: 40, difference: -60, link: 'https://www.google.com/shopping/product/2' },
                { store: 'Loja valida', price: 90, difference: -10, link: 'https://loja.example/produto' },
            ],
            analysisDetails: { reviewCount: 0, averageRating: 0 },
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        })));

        const result = await analyzeProduct(request);

        expect(result.bestPrices).toEqual([
            { store: 'Loja valida', price: 90, difference: -10, link: 'https://loja.example/produto' },
        ]);
    });

    it('preserves the new ML evidence and does not hide independent market prices using the target', async () => {
        const payload = {
            trustScore: 60, riskLevel: 'MEDIUM', warnings: [],
            bestPrices: [{ store: 'Loja valida', price: 1000, difference: 0, link: 'https://loja.example/produto' }],
            analysisDetails: { reviewCount: 0, averageRating: 0, priceComparison: 'Comparação inconclusiva' },
            machineLearning: {
                security: { status: 'ready', version: 'security-v1-test', scope: 'URL' },
                pricing: { status: 'insufficient_data', referenceCount: 1, comparison: 'UNKNOWN' },
                reviews: { status: 'insufficient_data', positive: 0, negative: 0, uncertain: 0, samples: 0 },
            },
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
            status: 200, headers: { 'content-type': 'application/json' },
        })));
        const result = await analyzeProduct(request);
        expect(result.machineLearning).toEqual(payload.machineLearning);
        expect(result.bestPrices).toHaveLength(1);
        expect(result.analysisDetails.priceComparison).toBe('Comparação inconclusiva');
    });

    it('identifies connection errors as errors reaching the external API', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        await expect(analyzeProduct(request)).rejects.toThrow('API externa');
    });
});
