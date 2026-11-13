export type RiskLevel = 'safe' | 'caution' | 'risk';
export type Screen = 'popup' | 'details' | 'prices' | 'settings' | 'history';

export interface Warning {
    id: string;
    type: 'high-risk' | 'suspicious-price' | 'low-reputation' | 'new-store' | 'poor-reviews' | 'counterfeit-risk';
    label: string;
    description: string;
}

export interface AnalysisDetails {
    reviewCount: number;
    averageRating: number;
    storeAge: string;
    securityFeatures: string[];
    returnPolicy: string;
    customerServiceRating: number;
    priceComparison: string;
    topPositives: string[];
    topNegatives: string[];
    reviewSummary?: string;
    reviewSamples?: string[];
}

export interface AlternativeSeller {
    id: string;
    storeName: string;
    storeUrl: string;
    price: number;
    percentageDifference: number;
    trustScore: number;
    isTrusted: boolean;
    productUrl: string;
}

export interface StoreAnalysis {
    storeName: string;
    storeUrl: string;
    trustScore: number;
    securityScore?: number;
    aiConfidence?: number;
    riskLevel: RiskLevel;
    aiSummary: string;
    warnings: Warning[];
    analysisDetails: AnalysisDetails;
    detailedAnalysis?: string;
    publicEvaluation?: string;
    currentPrice: number;
    productName: string;
    productUrl?: string;
    bestPrices?: {
        store: string;
        price: number;
        difference: number;
        link: string;
    }[];
    priceAnalysis?: {
        percentage: number;
        comparison: 'ABOVE' | 'BELOW' | 'FAIR' | 'UNKNOWN';
    };
    decisions?: {
        type: 'positive' | 'negative' | 'neutral';
        label: string;
        description: string;
    }[];
    securitySignals?: {
        id: string;
        label: string;
        value: boolean | number | string;
        weight: number;
    }[];
    machineLearning?: {
        security: {
            status: 'ready' | 'unavailable' | 'insufficient_data';
            version?: string;
            label?: string;
            scope: string;
            assessment?: 'model_signal' | 'conflicting_evidence';
            scoreAdjustment?: number;
        };
        pricing: {
            status: 'ready' | 'insufficient_data';
            referenceCount: number;
            lowerBound?: number;
            upperBound?: number;
            anomalous?: boolean;
            reason?: string;
        };
        reviews: {
            status: 'ready' | 'unavailable' | 'insufficient_data';
            version?: string;
            positive: number;
            negative: number;
            uncertain: number;
            samples: number;
        };
    };
}

export interface AnalysisHistoryItem {
    id: string;
    analyzedAt: string;
    productName: string;
    storeName: string;
    storeUrl: string;
    productUrl?: string;
    currentPrice: number;
    trustScore: number;
    riskLevel: RiskLevel;
    aiSummary: string;
    reviewSummary?: string;
    analysis: StoreAnalysis;
}

// Keeping AnalysisResult for backward compatibility during migration
export interface AnalysisResult extends StoreAnalysis {
    // We can add any extension-specific fields here if needed
}

export interface AnalysisRequest {
    productUrl: string;
    productName: string;
    price: number;
    seller: string;
    maxPriceDiscount?: number;
    reviews?: ProductReviews;
}

export interface ProductReviews {
    averageRating?: number;
    reviewCount?: number;
    comments: string[];
}
