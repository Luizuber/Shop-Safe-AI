export interface AnalysisResultOutput {
  trustScore: number;
  securityScore?: number;
  riskLevel: string;
  aiConfidence?: number;
  warnings: { type: string; message: string }[];
  analysisSummary: string;
  bestPrices: {
    store: string;
    price: number;
    difference: number;
    link: string;
  }[];
  priceAnalysis: {
    percentage: number;
    comparison: 'ABOVE' | 'BELOW' | 'FAIR' | 'UNKNOWN';
  };
  detailedAnalysis: string;
  publicEvaluation: string;
  analysisDetails?: {
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
  };
  decisions: {
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
    security: import('../ml/machine-learning.service').ModelPrediction;
    pricing: import('../ml/price-model.service').PriceModelResult;
    reviews: import('../ml/machine-learning.service').SentimentAnalysis;
  };
}
