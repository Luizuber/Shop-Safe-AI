import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AnalyzeProductDto } from './analyze-product.dto';

const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_SELLER_LENGTH = 120;
const MAX_URL_LENGTH = 2_048;
const MAX_REVIEW_COUNT = 100_000_000;
const MAX_REVIEW_COMMENTS = 20;
const MAX_REVIEW_LENGTH = 600;
const MAX_PRICE = 100_000_000;

@Injectable()
export class AnalyzeProductPipe implements PipeTransform<
  unknown,
  AnalyzeProductDto
> {
  transform(value: unknown): AnalyzeProductDto {
    const input = this.requireRecord(value, 'Corpo da requisição inválido.');
    const productName = this.requireString(
      input.productName,
      'productName',
      MAX_PRODUCT_NAME_LENGTH,
    );
    const seller = this.requireString(
      input.seller,
      'seller',
      MAX_SELLER_LENGTH,
    );
    // Zero is the explicit sentinel used by the extension when no reliable
    // price is visible. The decision engine already handles this state.
    const price = this.requireNumber(input.price, 'price', 0, MAX_PRICE);
    const productUrl = this.sanitizeProductUrl(input.productUrl);
    const maxPriceDiscount =
      input.maxPriceDiscount === undefined
        ? undefined
        : this.requireNumber(
            input.maxPriceDiscount,
            'maxPriceDiscount',
            0,
            100,
          );

    const reviews =
      input.reviews === undefined
        ? undefined
        : this.sanitizeReviews(input.reviews);

    return {
      productName,
      price,
      productUrl,
      seller,
      ...(maxPriceDiscount === undefined ? {} : { maxPriceDiscount }),
      ...(reviews === undefined ? {} : { reviews }),
    };
  }

  private sanitizeProductUrl(value: unknown): string {
    const rawUrl = this.requireString(value, 'productUrl', MAX_URL_LENGTH);

    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Unsupported protocol');
      }

      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      throw new BadRequestException('Campo productUrl inválido.');
    }
  }

  private sanitizeReviews(value: unknown): AnalyzeProductDto['reviews'] {
    const reviews = this.requireRecord(value, 'Campo reviews inválido.');
    if (
      !Array.isArray(reviews.comments) ||
      reviews.comments.length > MAX_REVIEW_COMMENTS
    ) {
      throw new BadRequestException('Campo reviews.comments inválido.');
    }

    const comments = reviews.comments.map((comment) =>
      this.requireString(comment, 'reviews.comments', MAX_REVIEW_LENGTH, true),
    );
    const averageRating =
      reviews.averageRating === undefined
        ? undefined
        : this.requireNumber(reviews.averageRating, 'averageRating', 0, 5);
    const reviewCount =
      reviews.reviewCount === undefined
        ? undefined
        : this.requireInteger(
            reviews.reviewCount,
            'reviewCount',
            0,
            MAX_REVIEW_COUNT,
          );

    return {
      ...(averageRating === undefined ? {} : { averageRating }),
      ...(reviewCount === undefined ? {} : { reviewCount }),
      comments,
    };
  }

  private requireRecord(
    value: unknown,
    message: string,
  ): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(message);
    }

    return value as Record<string, unknown>;
  }

  private requireString(
    value: unknown,
    field: string,
    maxLength: number,
    allowEmpty = false,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`Campo ${field} inválido.`);
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    if (
      (!allowEmpty && normalized.length === 0) ||
      normalized.length > maxLength
    ) {
      throw new BadRequestException(`Campo ${field} inválido.`);
    }

    return normalized;
  }

  private requireNumber(
    value: unknown,
    field: string,
    minimum: number,
    maximum: number,
  ): number {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new BadRequestException(`Campo ${field} inválido.`);
    }

    return value;
  }

  private requireInteger(
    value: unknown,
    field: string,
    minimum: number,
    maximum: number,
  ): number {
    const number = this.requireNumber(value, field, minimum, maximum);
    if (!Number.isInteger(number)) {
      throw new BadRequestException(`Campo ${field} inválido.`);
    }

    return number;
  }
}
