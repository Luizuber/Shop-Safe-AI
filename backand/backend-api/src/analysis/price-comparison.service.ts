import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ShoppingResult {
  title: string;
  source: string;
  price?: string;
  extracted_price?: number;
  link?: string;
  product_link?: string;
  immersive_product_page_token?: string;
  serpapi_immersive_product_api?: string;
  snippet?: string;
  extensions?: string[];
  second_hand_condition?: string;
  tag?: string;
}

interface SerpApiResponse {
  shopping_results?: ShoppingResult[];
}

interface ProductPrice {
  store: string;
  price: number;
  link: string;
}

interface ImmersiveStore {
  name: string;
  link?: string;
  title?: string;
  price?: string;
  extracted_price?: number;
  details_and_offers?: string[];
}

interface ImmersiveProductResponse {
  product_results?: {
    title?: string;
    stores?: ImmersiveStore[];
  };
}

interface OrganicResult {
  title?: string;
  link?: string;
}

interface OrganicSearchResponse {
  organic_results?: OrganicResult[];
}

interface PriceCandidate extends ProductPrice {
  token?: string;
  fallbackLink?: string;
}

@Injectable()
export class PriceComparisonService {
  constructor(private configService: ConfigService) {}

  async searchProduct(
    productName: string,
    currentPrice?: number,
  ): Promise<ProductPrice[]> {
    const apiKey = this.configService.get<string>('SERP_API_KEY');

    if (!apiKey) {
      console.warn(
        'SERP_API_KEY not found in ConfigService. Returning empty price list.',
      );
      return [];
    }

    // 1. Refinar Query - Preservar atributos críticos (GB, TB, Modelo)
    const attributes =
      productName.match(/\d+\s?(gb|tb|ram|mah|plus|pro|max|ultra|edge)/gi) ||
      [];
    const cleanName = productName
      .replace(/[^\w\s]/gi, ' ')
      .split(/\s+/)
      .slice(0, 6)
      .join(' ');

    const normalizedCleanName = cleanName.toLowerCase().replace(/\s/g, '');
    const missingAttributes = Array.from(new Set(attributes)).filter(
      (attribute) =>
        !normalizedCleanName.includes(
          attribute.toLowerCase().replace(/\s/g, ''),
        ),
    );
    const finalizedQuery = `${cleanName} ${missingAttributes.join(' ')}`.trim();
    try {
      const response = await axios.get<SerpApiResponse>(
        'https://serpapi.com/search.json',
        {
          timeout: 10_000,
          params: {
            engine: 'google_shopping',
            q: finalizedQuery,
            hl: 'pt',
            gl: 'br',
            api_key: apiKey,
          },
        },
      );

      if (!response.data.shopping_results) {
        return [];
      }

      const rawResults = response.data.shopping_results;

      // 2. Filtragem Determinística Inteligente
      const originalTerms = productName.toLowerCase().split(/\s+/);
      const excludeKeywords = [
        'case',
        'capinha',
        'cover',
        'película',
        'pelicula',
        'charger',
        'cabo',
        'carregador',
        'fone',
        'headset',
        'strap',
        'pulseira',
        'kit',
        'adesivo',
        'suporte',
        'protetor',
        'vidro temperado',
        'replacement',
        'repetidor',
        'extensor',
        'adapter',
        'adaptador',
      ].filter(
        (keyword) =>
          !originalTerms.some(
            (term) => term.includes(keyword) || keyword.includes(term),
          ),
      );

      const conditionKeywords = [
        'usado',
        'seminovo',
        'recondicionado',
        'refurbished',
        'open box',
      ];
      const acceptsUsedProducts = conditionKeywords.some((keyword) =>
        productName.toLowerCase().includes(keyword),
      );

      // Re-implementing filter with raw titles but working on normalized structure
      const finalFiltered = rawResults
        .map((rawItem) => {
          const price =
            rawItem.extracted_price ?? this.parseBrazilianPrice(rawItem.price);
          return {
            ...rawItem,
            normalizedPrice: price,
          };
        })
        .filter((item) => {
          const title = item.title.toLowerCase();

          if (
            !acceptsUsedProducts &&
            conditionKeywords.some((keyword) => title.includes(keyword))
          ) {
            return false;
          }

          // 1. Exclude strictly forbidden terms (case, charger, etc.)
          const hasForbiddenAccessory = excludeKeywords.some((keyword) =>
            title.includes(keyword),
          );
          if (hasForbiddenAccessory) return false;

          if (!this.isRelevantProductTitle(productName, item.title)) {
            return false;
          }
          if (!this.isCompatiblePurchaseOffer(productName, item.source, [
            item.title,
            item.price,
            item.snippet,
            item.second_hand_condition,
            item.tag,
            ...(item.extensions || []),
          ])) {
            return false;
          }
          if (!this.isPlausiblePrice(item.normalizedPrice)) {
            return false;
          }
          return (
            item.normalizedPrice > 0 &&
            Boolean(
              this.getSafeOfferUrl(item.link, item.product_link) ||
                this.getImmersiveToken(item),
            )
          );
        })
        .map((item) => ({
          store: item.source,
          price: item.normalizedPrice,
          link:
            this.getDirectMerchantUrl(item.link) ||
            this.getDirectMerchantUrl(item.product_link),
          token: this.getImmersiveToken(item),
          fallbackLink: this.getSafeOfferUrl(item.link, item.product_link),
        }));

      const directResults = finalFiltered.filter((item) => item.link);
      const unresolvedResults = finalFiltered.filter((item) => !item.link);
      const resolutionLimit = this.getDirectLinkResolutionLimit();
      const organicResolutionLimit = this.getOrganicLinkResolutionLimit();
      const resolvedOrFallbackResults = (
        await Promise.all(
          unresolvedResults.map(async (item, index) => {
            let resolved =
              index < resolutionLimit
                ? await this.resolveDirectMerchantOffers(
                    item,
                    productName,
                    currentPrice,
                    apiKey,
                  )
                : [];
            if (resolved.length === 0 && index < organicResolutionLimit) {
              const organicLink = await this.searchDirectMerchantLink(
                productName,
                item.store,
                apiKey,
              );
              if (organicLink) {
                resolved = [
                  { store: item.store, price: item.price, link: organicLink },
                ];
              }
            }
            return resolved.length > 0
              ? resolved
              : [
                  {
                    store: item.store,
                    price: item.price,
                    link: item.fallbackLink || '',
                  },
                ];
          }),
        )
      ).flat();

      const allResults: ProductPrice[] = [
        ...directResults,
        ...resolvedOrFallbackResults,
      ]
        .filter((item) => Boolean(item.link))
        .map(({ store, price, link }) => ({ store, price, link }));

      const uniqueResults = allResults.filter(
        (result, index, results) =>
          results.findIndex(
            (candidate) =>
              candidate.link === result.link &&
              candidate.price === result.price,
          ) === index,
      );

      console.log('[FILTERED RESULTS COUNT]', uniqueResults.length);
      return uniqueResults.slice(0, 20);
    } catch (error) {
      console.error(
        'Failed to fetch prices from SerpAPI:',
        this.sanitizeErrorMessage(error, apiKey),
      );
      return [];
    }
  }

  parseBrazilianPrice(priceStr?: string): number {
    if (!priceStr) return 0;

    // STEP 1: split and take only first part if contains "ou" or "6x" etc
    let clean = priceStr.split(/\bou\b|\bx\s+de/i)[0].trim();

    // STEP 2: Handle installment-only formats
    const installmentRegex = /^(\d+\s*x\s*de|\d+\s*parcelas?)/i;
    if (installmentRegex.test(clean)) {
      return 0;
    }

    // STEP 3: Extract numeric parts.
    // We look for patterns like 1.234,56 or 1234.56 or 1234,56
    // Remove currency symbols first
    clean = clean.replace(/R\$/g, '').trim();

    const match = clean.match(/[\d.,]+/);
    if (!match) return 0;

    let valueStr = match[0];

    // Determine if comma or dot is the decimal separator
    // If there's a comma followed by 2 digits at the end, it's likely the decimal separator
    if (
      valueStr.includes(',') &&
      valueStr.indexOf(',') === valueStr.length - 3
    ) {
      valueStr = valueStr.replace(/\./g, '').replace(',', '.');
    } else if (
      valueStr.includes('.') &&
      valueStr.indexOf('.') === valueStr.length - 3
    ) {
      // Already in dot format probably, just remove other dots if any
      const parts = valueStr.split('.');
      if (parts.length > 2) {
        valueStr = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      }
    } else {
      // No clear decimal or different format, try to just keep numbers and first dot/comma
      valueStr = valueStr.replace(/[^\d.,]/g, '');
    }

    const finalValue = parseFloat(valueStr) || 0;
    return finalValue;
  }

  private sanitizeUrl(url?: string): string {
    if (!url) return '';

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return '';
      }
      const sensitiveParams = ['api_key', 'key', 'token', 'access_token'];

      sensitiveParams.forEach((param) => parsedUrl.searchParams.delete(param));

      return parsedUrl.toString();
    } catch {
      return '';
    }
  }

  private getDirectMerchantUrl(url?: string): string {
    const sanitizedUrl = this.sanitizeUrl(url);
    if (!sanitizedUrl) return '';

    const parsedUrl = new URL(sanitizedUrl);
    if (!this.isIntermediaryHost(parsedUrl.hostname)) return sanitizedUrl;

    if (this.isGoogleHost(parsedUrl.hostname) && parsedUrl.pathname === '/url') {
      const redirectTarget =
        parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('url');
      const sanitizedTarget = this.sanitizeUrl(redirectTarget || undefined);
      if (!sanitizedTarget) return '';

      const targetUrl = new URL(sanitizedTarget);
      return this.isIntermediaryHost(targetUrl.hostname) ? '' : sanitizedTarget;
    }

    return '';
  }

  private getSafeOfferUrl(...urls: Array<string | undefined>): string {
    for (const url of urls) {
      const directUrl = this.getDirectMerchantUrl(url);
      if (directUrl) return directUrl;
    }

    for (const url of urls) {
      const sanitizedUrl = this.sanitizeUrl(url);
      if (!sanitizedUrl) continue;
      if (this.isGoogleHost(new URL(sanitizedUrl).hostname)) return sanitizedUrl;
    }

    return '';
  }

  private isIntermediaryHost(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase();
    return (
      this.isGoogleHost(normalizedHostname) ||
      normalizedHostname === 'serpapi.com' ||
      normalizedHostname.endsWith('.serpapi.com')
    );
  }

  private isGoogleHost(hostname: string): boolean {
    return /(^|\.)google\.[a-z.]+$/i.test(hostname);
  }

  private isValidImmersiveToken(token?: string): token is string {
    return Boolean(
      token &&
        token.length >= 20 &&
        token.length <= 4096 &&
        /^[A-Za-z0-9_=/+-]+$/.test(token),
    );
  }

  private getImmersiveToken(item: ShoppingResult): string | undefined {
    if (this.isValidImmersiveToken(item.immersive_product_page_token)) {
      return item.immersive_product_page_token;
    }

    const apiUrl = this.sanitizeUrl(item.serpapi_immersive_product_api);
    if (!apiUrl) return undefined;

    const parsedUrl = new URL(apiUrl);
    const isSerpApi =
      parsedUrl.hostname === 'serpapi.com' ||
      parsedUrl.hostname.endsWith('.serpapi.com');
    if (!isSerpApi) return undefined;
    if (parsedUrl.searchParams.get('engine') !== 'google_immersive_product') {
      return undefined;
    }

    const token = parsedUrl.searchParams.get('page_token') || undefined;
    return this.isValidImmersiveToken(token) ? token : undefined;
  }

  private getDirectLinkResolutionLimit(): number {
    const configuredLimit = Number(
      this.configService.get<string>('SERP_DIRECT_LINK_LIMIT'),
    );
    if (!Number.isInteger(configuredLimit) || configuredLimit < 1) return 5;
    return Math.min(configuredLimit, 10);
  }

  private getOrganicLinkResolutionLimit(): number {
    const configuredLimit = Number(
      this.configService.get<string>('SERP_ORGANIC_LINK_LIMIT'),
    );
    if (!Number.isInteger(configuredLimit) || configuredLimit < 0) return 5;
    return Math.min(configuredLimit, 10);
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private isRelevantProductTitle(
    expectedProduct: string,
    candidateTitle: string,
  ): boolean {
    const ignoredTerms = new Set([
      'para',
      'com',
      'sem',
      'por',
      'dos',
      'das',
      'uma',
      'the',
      'and',
      'cor',
      'cores',
      'efeito',
      'ate',
    ]);
    const expectedTokens = Array.from(
      new Set(
        this.normalizeSearchText(expectedProduct)
          .split(' ')
          .filter(
            (token) =>
              (token.length >= 3 || /^\d{2,4}$/.test(token)) &&
              !ignoredTerms.has(token),
          ),
      ),
    ).slice(0, 10);
    if (expectedTokens.length === 0) return false;

    const candidateText = this.normalizeSearchText(candidateTitle);
    const candidateTokens = new Set(candidateText.split(' '));
    if (!candidateTokens.has(expectedTokens[0])) return false;

    const matchedTokens = expectedTokens.filter((token) =>
      candidateTokens.has(token),
    );
    const modelTokens = expectedTokens.filter(
      (token, index) => {
        if (/[a-z]/.test(token) && /\d/.test(token)) return true;
        if (!/^\d{2,4}$/.test(token) || index >= 5) return false;
        const nextToken = expectedTokens[index + 1];
        return ![
          'dpi',
          'mah',
          'hz',
          'gb',
          'tb',
          'cm',
          'mm',
          'polegadas',
          'botoes',
        ].includes(nextToken);
      },
    );
    if (!modelTokens.every((token) => candidateTokens.has(token))) {
      return false;
    }

    const expectedCapacities =
      this.normalizeSearchText(expectedProduct).match(/\d+\s*(?:gb|tb)/g) ||
      [];
    if (expectedCapacities.length > 0) {
      const compactCandidate = candidateText.replace(/\s/g, '');
      const hasExpectedCapacity = expectedCapacities.some((capacity) =>
        compactCandidate.includes(capacity.replace(/\s/g, '')),
      );
      if (!hasExpectedCapacity) return false;
    }

    const colorTerms = new Set([
      'preto',
      'preta',
      'branco',
      'branca',
      'azul',
      'vermelho',
      'vermelha',
      'cinza',
      'prata',
      'dourado',
      'dourada',
      'rosa',
      'verde',
      'roxo',
      'roxa',
    ]);
    const expectedColors = this.normalizeSearchText(expectedProduct)
      .split(' ')
      .filter((token) => colorTerms.has(token));
    if (
      expectedColors.length > 0 &&
      !expectedColors.some((color) => candidateTokens.has(color))
    ) {
      return false;
    }

    const minimumMatches = Math.min(3, expectedTokens.length);
    return (
      matchedTokens.length >= minimumMatches &&
      matchedTokens.length / expectedTokens.length >= 0.6
    );
  }

  private isCompatiblePurchaseOffer(
    productName: string,
    source: string,
    details: Array<string | undefined>,
  ): boolean {
    if (details.some(detail => detail && /\/\s*m[eê]s|\bmensais\b|^\s*\d+\s*x\b/i.test(detail))) {
      return false;
    }
    const expectedText = this.normalizeSearchText(productName);
    const offerText = this.normalizeSearchText(
      `${source} ${details.filter(Boolean).join(' ')}`,
    );
    const acceptsAlternativeCondition = [
      'usado',
      'seminovo',
      'recondicionado',
      'refurbished',
      'open box',
    ].some((term) => expectedText.includes(term));

    const rentalTerms = [
      'aluguel',
      'alugue',
      'assinatura',
      'mensalidade',
      'locacao',
      'plano mensal',
      'por mes',
      'allu',
    ];
    if (rentalTerms.some((term) => offerText.includes(term))) return false;

    if (!acceptsAlternativeCondition) {
      const nonNewTerms = [
        'usado',
        'seminovo',
        'recondicionado',
        'refurbished',
        'open box',
        'olx',
      ];
      if (nonNewTerms.some((term) => offerText.includes(term))) return false;
    }

    return true;
  }

  private isPlausiblePrice(price: number): boolean {
    // Never select market observations using the target price: that would
    // hide the very anomaly that the learned price model must detect.
    return Number.isFinite(price) && price > 0;
  }

  private isStrongProductMatch(
    expectedProduct: string,
    expectedStore: string,
    result: OrganicResult,
  ): boolean {
    if (!result.title || !result.link) return false;
    const directLink = this.getDirectMerchantUrl(result.link);
    if (!directLink) return false;

    const expectedTokens = this.normalizeSearchText(expectedProduct)
      .split(' ')
      .filter((token) => token.length >= 3);
    const resultText = this.normalizeSearchText(
      `${result.title} ${new URL(directLink).hostname}`,
    );
    const matchedTokens = expectedTokens.filter((token) =>
      resultText.includes(token),
    );
    const modelTokens = expectedTokens.filter((token) => /\d/.test(token));
    const modelsMatch = modelTokens.every((token) => resultText.includes(token));

    const storeTokens = this.normalizeSearchText(expectedStore)
      .split(' ')
      .filter((token) => token.length >= 4 && token !== 'loja');
    const storeMatches =
      storeTokens.length === 0 ||
      storeTokens.some((token) => resultText.includes(token));

    return (
      modelsMatch &&
      storeMatches &&
      expectedTokens.length > 0 &&
      matchedTokens.length / expectedTokens.length >= 0.65
    );
  }

  private async searchDirectMerchantLink(
    productName: string,
    storeName: string,
    apiKey: string,
  ): Promise<string> {
    try {
      const response = await axios.get<OrganicSearchResponse>(
        'https://serpapi.com/search.json',
        {
          params: {
            engine: 'google',
            q: `"${productName}" "${storeName}" comprar`,
            hl: 'pt',
            gl: 'br',
            num: 5,
            api_key: apiKey,
          },
          timeout: 5_000,
        },
      );

      const match = (response.data.organic_results || []).find((result) =>
        this.isStrongProductMatch(productName, storeName, result),
      );
      return this.getDirectMerchantUrl(match?.link);
    } catch (error) {
      console.warn(
        'Failed to search a direct merchant link:',
        this.sanitizeErrorMessage(error, apiKey),
      );
      return '';
    }
  }

  private async resolveDirectMerchantOffers(
    candidate: PriceCandidate,
    productName: string,
    currentPrice: number | undefined,
    apiKey: string,
  ): Promise<ProductPrice[]> {
    if (!this.isValidImmersiveToken(candidate.token)) return [];

    try {
      const response = await axios.get<ImmersiveProductResponse>(
        'https://serpapi.com/search.json',
        {
          params: {
            engine: 'google_immersive_product',
            page_token: candidate.token,
            more_stores: true,
            api_key: apiKey,
          },
          timeout: 5_000,
        },
      );

      const productResults = response.data.product_results;
      return (productResults?.stores || [])
        .filter((store) => {
          const title = store.title || productResults?.title || '';
          const price =
            store.extracted_price ?? this.parseBrazilianPrice(store.price);
          return (
            this.isRelevantProductTitle(productName, title) &&
            this.isCompatiblePurchaseOffer(productName, store.name, [
              title,
              store.price,
              ...(store.details_and_offers || []),
            ]) &&
            this.isPlausiblePrice(price)
          );
        })
        .map((store) => ({
          store: store.name,
          price:
            store.extracted_price ?? this.parseBrazilianPrice(store.price),
          link: this.getDirectMerchantUrl(store.link),
        }))
        .filter((store) => store.price > 0 && Boolean(store.link));
    } catch (error) {
      console.warn(
        'Failed to resolve a direct merchant link:',
        this.sanitizeErrorMessage(error, apiKey),
      );
      return [];
    }
  }

  private sanitizeErrorMessage(error: unknown, apiKey: string): string {
    const message = error instanceof Error ? error.message : String(error);

    return message.replaceAll(apiKey, '[REDACTED]');
  }
}
