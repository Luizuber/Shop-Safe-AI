# Copilot Instructions for TCC Project

## Project Overview
This TCC project combines a Chrome extension, a NestJS API, and trained machine-learning models. Domain phishing detection, Portuguese review sentiment and per-query price density have separate scopes. A score is decision support, not proof of legitimacy.

## Architecture
- **Backend**: NestJS application with modular structure
- **Key Module**: `analysis/` handles product analysis logic
- **Data Flow**: Client sends `AnalyzeProductDto` to `POST /analysis`; `GET /analysis/models` exposes model versions and measured metrics.
- **Contracts**: Preserve `LOW`/`MEDIUM`/`HIGH` risk values and `ABOVE`/`BELOW`/`FAIR`/`UNKNOWN` comparisons. User-facing messages are in Portuguese.
- **ML**: Training lives in root `ml/train.py`. JSON inference lives in `backand/backend-api/src/analysis/ml/`; Python is not required per request.

## Developer Workflows
- **Development**: `npm run start:dev` (watches for changes)
- **Building**: `npm run build` (outputs to `dist/`)
- **Testing**: `npm run test` (Jest unit tests), `npm run test:e2e` (end-to-end)
- **Linting**: `npm run lint` (ESLint with auto-fix)
- **Formatting**: `npm run format` (Prettier on `src/**/*.ts` and `test/**/*.ts`)
- **Debugging**: `npm run start:debug` for debug mode, `npm run test:debug` for test debugging

## Code Patterns
- **DTOs**: Define input structures in `dto/` folders (e.g., `analyze-product.dto.ts`)
- **Services**: Contain business logic, return objects with score and justifications
- **Controllers**: Thin layer, delegate to services, use `@Post` for analysis endpoints
- **Scoring Logic**: Compose rules and trained-model evidence without treating model probability as overall shopping safety. Preserve abstention and bounded/corroborated model penalties.
- **Modules**: Group related controllers/services in feature modules (e.g., `AnalysisModule`)

## Conventions
- User-facing strings in Portuguese (e.g., 'Produto bem avaliado')
- Never fabricate consumer reports, verified reputation or model accuracy.
- Sentiment does not authenticate reviews or directly determine the security score.
- Pricing requires at least five independent stores; otherwise preserve `UNKNOWN`.
- A domain-model alert alone must not zero the score. Test legitimate long product URLs and impersonation boundaries.
- Never commit `.env`, credentials, raw datasets, virtual environments or personal Obsidian workspace state.

## Key Files
- `backand/backend-api/src/analysis/decision-engine/decision-engine.service.ts`: Analysis orchestration
- `ml/MODEL_CARD.md`: Scientific scope, sources, reproduction and limitations
- `backand/backend-api/src/analysis/dto/analyze-product.dto.ts`: Input validation structure
- `backand/backend-api/src/main.ts`: Server bootstrap with PORT env support

## Integration Points
- Backend runs on port 3000 (or PORT env), logs listening port for debugging
- Chrome extension is in `frontend/`; production and local builds are separate. The historical `extension/` directory is not the implementation.
- The Obsidian vault is in `docs/obsidian-shop-safe`; keep references and metrics aligned with actual reports.
