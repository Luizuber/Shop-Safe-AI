export class AnalyzeProductDto {
  productName: string;
  price: number;
  productUrl: string;
  seller: string;
  maxPriceDiscount?: number;
  reviews?: {
    averageRating?: number;
    reviewCount?: number;
    comments: string[];
  };
}
