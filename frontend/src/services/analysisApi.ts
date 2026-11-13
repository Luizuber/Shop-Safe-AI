import { AnalysisDetails, AnalysisRequest, AnalysisResult } from '../types/AnalysisResult';

const DEFAULT_API_BASE_URL = 'https://tcc-shop-safe.onrender.com';
const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');
const API_URL = `${API_BASE_URL}/analysis`;
const REQUEST_TIMEOUT_MS = 30_000;

interface AnalysisWireResponse {
    trustScore: number;
    riskLevel: string;
    warnings: unknown[];
    bestPrices: unknown[];
    analysisDetails?: Partial<AnalysisDetails>;
    analysisSummary?: string;
    aiSummary?: string;
    [key: string]: unknown;
}

function isAnalysisWireResponse(value: unknown): value is AnalysisWireResponse {
    if (!value || typeof value !== 'object') return false;
    const result = value as Partial<AnalysisWireResponse>;
    return Number.isFinite(result.trustScore)
        && Number(result.trustScore) >= 0
        && Number(result.trustScore) <= 100
        && typeof result.riskLevel === 'string'
        && Array.isArray(result.warnings)
        && Array.isArray(result.bestPrices);
}

function describePriceComparison(value: unknown): string {
    if (!value || typeof value !== 'object') return 'Comparação indisponível';
    const priceAnalysis = value as { percentage?: unknown; comparison?: unknown };
    const percentage = typeof priceAnalysis.percentage === 'number'
        && Number.isFinite(priceAnalysis.percentage)
        ? Math.max(0, Math.round(priceAnalysis.percentage))
        : 0;

    if (priceAnalysis.comparison === 'BELOW') return `${percentage}% abaixo da média pesquisada`;
    if (priceAnalysis.comparison === 'ABOVE') return `${percentage}% acima da média pesquisada`;
    if (priceAnalysis.comparison === 'FAIR') return 'Dentro da faixa média pesquisada';
    return 'Comparação indisponível';
}

function normalizeOfferUrl(value: unknown): string {
    if (typeof value !== 'string') return '';

    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';

        const isGoogle = /(^|\.)google\.[a-z.]+$/i.test(url.hostname);
        const isSerpApi = url.hostname === 'serpapi.com' || url.hostname.endsWith('.serpapi.com');
        if (!isGoogle && !isSerpApi) return url.toString();

        if (isGoogle && url.pathname === '/url') {
            const target = url.searchParams.get('q') || url.searchParams.get('url');
            if (!target) return '';
            const targetUrl = new URL(target);
            const targetIsGoogle = /(^|\.)google\.[a-z.]+$/i.test(targetUrl.hostname);
            const targetIsSerpApi = targetUrl.hostname === 'serpapi.com'
                || targetUrl.hostname.endsWith('.serpapi.com');
            return targetUrl.protocol === 'https:' && !targetIsGoogle && !targetIsSerpApi
                ? targetUrl.toString()
                : url.toString();
        }

        if (isGoogle) return url.toString();
    } catch {
        return '';
    }

    return '';
}

function normalizeDirectPrices(
    values: unknown[],
    request: AnalysisRequest,
    hasPricingModel: boolean,
): AnalysisResult['bestPrices'] {
    const expectedText = `${request.productName} ${request.seller}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const acceptsUsed = ['usado', 'seminovo', 'recondicionado', 'refurbished', 'open box']
        .some(term => expectedText.includes(term));

    return values.flatMap(value => {
        if (!value || typeof value !== 'object') return [];
        const offer = value as Record<string, unknown>;
        const link = normalizeOfferUrl(offer.link);
        if (!link || typeof offer.store !== 'string' || !Number.isFinite(offer.price)) return [];

        const store = offer.store
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        if (['allu', 'aluguel', 'assinatura'].some(term => store.includes(term))) return [];
        if (!acceptsUsed && ['olx', 'seminovo', 'usado', 'recondicionado']
            .some(term => store.includes(term))) return [];

        const price = Number(offer.price);
        if (price <= 0) return [];
        if (!hasPricingModel && request.price > 0) {
            const ratio = price / request.price;
            if (ratio < 0.45 || ratio > 2.5) return [];
        }

        return [{
            store: offer.store,
            price,
            difference: Number.isFinite(offer.difference) ? Number(offer.difference) : 0,
            link,
        }];
    });
}

function normalizeAnalysisResult(result: AnalysisWireResponse, request: AnalysisRequest): AnalysisResult {
    const hasCurrentDetails = Boolean(result.analysisDetails && typeof result.analysisDetails === 'object');
    const capturedReviews = request.reviews;
    const fallbackDetails: AnalysisDetails = {
        reviewCount: capturedReviews?.reviewCount ?? capturedReviews?.comments.length ?? 0,
        averageRating: capturedReviews?.averageRating ?? 0,
        storeAge: 'Não identificado',
        securityFeatures: [],
        returnPolicy: 'Verifique a política de devolução diretamente na loja.',
        customerServiceRating: 0,
        priceComparison: describePriceComparison(result.priceAnalysis),
        topPositives: [],
        topNegatives: [],
        reviewSummary: capturedReviews?.reviewCount || capturedReviews?.averageRating
            ? 'Nota e quantidade extraídas diretamente da página; o servidor publicado ainda não resumiu os comentários.'
            : 'Nenhuma avaliação confiável foi devolvida pelo servidor publicado.',
        reviewSamples: capturedReviews?.comments.slice(0, 5) ?? [],
    };
    const analysisDetails: AnalysisDetails = hasCurrentDetails
        ? { ...fallbackDetails, ...result.analysisDetails }
        : fallbackDetails;
    const summary = hasCurrentDetails
        ? result.analysisSummary || result.aiSummary || 'Análise concluída sem resumo textual.'
        : `Resultado em modo de compatibilidade: o servidor publicado atribuiu pontuação heurística de ${result.trustScore}/100, mas ainda usa um contrato antigo. Verifique manualmente vendedor, preço e avaliações.`;

    return {
        ...result,
        bestPrices: normalizeDirectPrices(result.bestPrices, request, Boolean(result.machineLearning)),
        analysisDetails,
        aiSummary: summary,
        analysisSummary: summary,
    } as unknown as AnalysisResult;
}

export async function analyzeProduct(data: AnalysisRequest): Promise<AnalysisResult> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal,
        });

        if (!response.ok) {
            console.error(`Análise falhou: ${response.status} ${response.statusText}`);
            throw new Error(`Análise falhou com status ${response.status}.`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('A API retornou um formato inesperado.');
        }

        const result: unknown = await response.json();
        if (!isAnalysisWireResponse(result)) {
            throw new Error('A API retornou uma resposta incompleta ou incompatível.');
        }
        return normalizeAnalysisResult(result, data);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('O servidor externo não concluiu a análise em 30 segundos. Tente novamente.');
        }

        if (error instanceof TypeError) {
            throw new Error('Não foi possível conectar à API externa. Verifique a internet e tente novamente.');
        }

        console.error('Erro ao analisar produto.');
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}
