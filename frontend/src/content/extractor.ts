interface JsonLdNode {
    '@type'?: string | string[];
    [key: string]: unknown;
}

export interface ExtractedReviews {
    averageRating?: number;
    reviewCount?: number;
    comments: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasType(node: JsonLdNode, expected: string): boolean {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    return types.some(type => typeof type === 'string' && type.toLowerCase() === expected.toLowerCase());
}

function collectJsonLdNodes(value: unknown, nodes: JsonLdNode[] = []): JsonLdNode[] {
    if (Array.isArray(value)) {
        value.forEach(item => collectJsonLdNodes(item, nodes));
        return nodes;
    }

    if (!isRecord(value)) return nodes;
    nodes.push(value as JsonLdNode);
    Object.values(value).forEach(child => collectJsonLdNodes(child, nodes));
    return nodes;
}

function readJsonLdNodes(): JsonLdNode[] {
    const nodes: JsonLdNode[] = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
            collectJsonLdNodes(JSON.parse(script.textContent || ''), nodes);
        } catch {
            // Invalid third-party structured data must not stop page analysis.
        }
    });
    return nodes;
}

export function parseLocalizedNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string') return undefined;

    const raw = value.replace(/[^\d.,-]/g, '');
    if (!raw) return undefined;
    const lastSeparator = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'));
    let normalized = raw;

    if (lastSeparator >= 0) {
        const decimals = raw.length - lastSeparator - 1;
        normalized = decimals === 2
            ? `${raw.slice(0, lastSeparator).replace(/[.,]/g, '')}.${raw.slice(lastSeparator + 1)}`
            : raw.replace(/[.,]/g, '');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseReviewCount(text: string): number | undefined {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const contextualPatterns = [
        /([\d.,]+)\s*(mil|k)?\s*(?:avalia(?:ç|c)(?:ão|ao|ões|oes)|reviews?|opini(?:õ|o)es)/i,
        /(?:avalia(?:ç|c)(?:ão|ao|ões|oes)|reviews?|opini(?:õ|o)es)\D{0,12}([\d.,]+)\s*(mil|k)?/i,
    ];
    const match = contextualPatterns.map(pattern => normalized.match(pattern)).find(Boolean)
        ?? (/^\(?[\d.,]+\)?\s*(?:mil|k)?$/i.test(normalized)
            ? normalized.match(/([\d.,]+)\s*(mil|k)?/i)
            : null);
    if (!match) return undefined;

    const suffix = match[2]?.toLowerCase();
    const numericText = suffix ? match[1].replace(',', '.') : match[1].replace(/[.,]/g, '');
    const value = Number(numericText);
    if (!Number.isFinite(value)) return undefined;
    return Math.round(value * (suffix ? 1000 : 1));
}

export function getRatingFromText(text: string): number | undefined {
    const normalized = text.replace(',', '.').trim();
    const patterns = [
        /^(\d(?:\.\d)?)$/,
        /(\d(?:\.\d)?)\s*(?:de|\/)\s*5/i,
        /(\d(?:\.\d)?)\s*estrelas?/i,
        /avalia(?:ç|c)(?:ão|ao).*?(\d(?:\.\d)?)/i,
        /rating.*?(\d(?:\.\d)?)/i,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        const rating = match ? Number(match[1]) : NaN;
        if (rating > 0 && rating <= 5) return rating;
    }
    return undefined;
}

export function isProductPage(): boolean {
    const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content');
    if (ogType?.toLowerCase() === 'product') return true;
    if (document.querySelector('[itemprop="price"], [itemprop="offers"]')) return true;
    if (readJsonLdNodes().some(node => hasType(node, 'Product'))) return true;

    const url = window.location.href.toLowerCase();
    const productPatterns = ['/p/', '/produto/', '/product/', '/dp/', '/item/', '/produtos/'];
    return productPatterns.some(pattern => url.includes(pattern))
        || (window.location.hostname.includes('shopee.com.br') && url.includes('-i.'));
}

function getSafeProductUrl(): string {
    const url = new URL(window.location.href);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
}

export function getProductPrice(): number {
    const offerNodes = readJsonLdNodes().filter(node => hasType(node, 'Offer') || hasType(node, 'AggregateOffer'));
    for (const node of offerNodes) {
        for (const candidate of [node.price, node.lowPrice, node.highPrice]) {
            const price = parseLocalizedNumber(candidate);
            if (price && price > 0 && price < 100_000_000) return price;
        }
    }

    const selectors = [
        '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
        '#corePrice_feature_div .a-price .a-offscreen',
        '#apex_desktop .a-price .a-offscreen',
        'meta[itemprop="price"]', 'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]', '.a-price .a-offscreen',
        '#corePrice_feature_div .a-price-whole', '#priceblock_ourprice',
        '#priceblock_dealprice', '[itemprop="price"]', '.andes-money-amount__fraction',
        '[class*="price"]', '[class*="valor"]', '[class*="preco"]',
    ];
    for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement | null;
        const text = element?.getAttribute('content') || element?.innerText || element?.textContent || '';
        const price = parseLocalizedNumber(text);
        if (price && price > 0 && price < 100_000_000) return price;
    }

    const bodyText = document.body?.innerText || document.body?.textContent || '';
    const match = bodyText.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})/);
    const fallbackPrice = match ? parseLocalizedNumber(match[0]) : undefined;
    return fallbackPrice && fallbackPrice > 10 ? fallbackPrice : 0;
}

export function getReviewData(): ExtractedReviews {
    let averageRating: number | undefined;
    let reviewCount: number | undefined;
    const comments = new Set<string>();

    for (const node of readJsonLdNodes()) {
        if (hasType(node, 'AggregateRating')) {
            averageRating ??= getRatingFromText(String(node.ratingValue ?? ''));
            reviewCount ??= parseReviewCount(String(node.reviewCount ?? node.ratingCount ?? ''));
        }
        if (hasType(node, 'Review') && typeof node.reviewBody === 'string') {
            comments.add(node.reviewBody.replace(/\s+/g, ' ').trim());
        }
    }

    const ratingSelectors = [
        '#acrPopover .a-icon-alt', '#averageCustomerReviews .a-icon-alt',
        '[data-hook="rating-out-of-text"]',
        '[itemprop="ratingValue"]', 'meta[itemprop="ratingValue"]', '[data-testid*="rating"]',
        '.a-icon-alt', '.ui-review-capability__rating', '[class*="rating"]',
        '[class*="avaliacao"]', '[aria-label*="estrel"]', '[aria-label*="rating"]',
    ];
    for (const selector of ratingSelectors) {
        if (averageRating) break;
        const element = document.querySelector(selector);
        const text = element?.getAttribute('content') || element?.getAttribute('aria-label') || element?.textContent || '';
        averageRating = getRatingFromText(text);
    }

    const countSelectors = [
        '#acrCustomerReviewText', '[data-hook="total-review-count"]',
        '[itemprop="reviewCount"]', 'meta[itemprop="reviewCount"]',
        '[data-testid*="review"]', '[class*="review-count"]', '[class*="avaliacoes"]',
        '[class*="reviews"]', '[aria-label*="avalia"]',
    ];
    for (const selector of countSelectors) {
        if (reviewCount) break;
        const element = document.querySelector(selector);
        const text = element?.getAttribute('content') || element?.getAttribute('aria-label') || element?.textContent || '';
        reviewCount = parseReviewCount(text);
    }

    const commentSelectors = [
        '[data-hook="review-body"]', '.review-text-content', '.a-expander-content.reviewText',
        '[itemprop="reviewBody"]', '[class*="review"] [class*="comment"]',
        '[class*="review"] [class*="content"]', '[class*="avaliacao"] [class*="coment"]',
        '[class*="comentario"]', '[class*="comment"]',
    ];
    for (const selector of commentSelectors) {
        document.querySelectorAll(selector).forEach(element => {
            const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.length >= 20 && text.length <= 600 && !/pol[ií]tica|cookies|termos|login|entrar|comprar/i.test(text)) {
                comments.add(text);
            }
        });
        if (comments.size >= 20) break;
    }

    const validComments = Array.from(comments).filter(comment => comment.length >= 20 && comment.length <= 600);
    return { averageRating, reviewCount, comments: validComments.slice(0, 20) };
}

export function getProductData() {
    const amazonTitle = document.querySelector('#productTitle')?.textContent?.trim();
    const rawTitle = amazonTitle
        || document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || document.querySelector('h1')?.textContent?.trim()
        || document.title
        || 'Produto sem titulo';
    // Hyphens often introduce color/variant, not the store name.
    const productName = rawTitle.split(' | ')[0].replace(/\s+/g, ' ').trim().slice(0, 200) || 'Produto sem titulo';
    const visibleSeller = document.querySelector(
        '#sellerProfileTriggerId, #merchant-info a, [data-testid="seller-name"], [itemprop="seller"]',
    )?.textContent?.replace(/\s+/g, ' ').trim();
    const seller = visibleSeller
        || document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim()
        || window.location.hostname.replace(/^www\./, '');

    return {
        productName,
        price: getProductPrice(),
        seller,
        productUrl: getSafeProductUrl(),
        reviews: getReviewData(),
    };
}
