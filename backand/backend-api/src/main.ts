import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NextFunction, Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 20;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');

  app.useBodyParser('json', { limit: '32kb' });
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'");
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');

    if (process.env.NODE_ENV === 'production') {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  });

  const configuredOrigins = new Set(
    (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const extensionId = process.env.EXTENSION_ID?.trim();
  const isDevelopment = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: (origin, callback) => {
      const isConfigured = Boolean(origin && configuredOrigins.has(origin));
      const isExpectedExtension = Boolean(
        origin &&
        (extensionId
          ? origin === `chrome-extension://${extensionId}`
          : isDevelopment && /^chrome-extension:\/\/[a-p]{32}$/.test(origin)),
      );
      const isLocalDevelopment = Boolean(
        isDevelopment &&
        origin &&
        /^https?:\/\/localhost(?::\d+)?$/.test(origin),
      );

      if (
        !origin ||
        isConfigured ||
        isExpectedExtension ||
        isLocalDevelopment
      ) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
    maxAge: 86_400,
  });

  const configuredRateLimit = Number.parseInt(
    process.env.ANALYSIS_RATE_LIMIT ?? `${DEFAULT_RATE_LIMIT}`,
    10,
  );
  const rateLimit =
    Number.isFinite(configuredRateLimit) && configuredRateLimit > 0
      ? configuredRateLimit
      : DEFAULT_RATE_LIMIT;
  const analysisRequests = new Map<string, RateLimitEntry>();
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    analysisRequests.forEach((entry, clientId) => {
      if (entry.resetAt <= now) analysisRequests.delete(clientId);
    });
  }, RATE_LIMIT_WINDOW_MS);
  cleanupTimer.unref();

  app.use(
    '/analysis',
    (request: Request, response: Response, next: NextFunction) => {
      if (request.method === 'OPTIONS') {
        next();
        return;
      }

      const now = Date.now();
      const clientId = request.ip || request.socket.remoteAddress || 'unknown';
      const current = analysisRequests.get(clientId);
      const entry =
        !current || current.resetAt <= now
          ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
          : current;

      entry.count += 1;
      analysisRequests.set(clientId, entry);

      if (entry.count > rateLimit) {
        response.setHeader(
          'Retry-After',
          Math.ceil((entry.resetAt - now) / 1000).toString(),
        );
        response.status(429).json({
          statusCode: 429,
          message: 'Muitas solicitações. Tente novamente em instantes.',
        });
        return;
      }

      next();
    },
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Listening on port ${port}`);
}
void bootstrap();
