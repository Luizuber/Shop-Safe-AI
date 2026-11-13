import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { DecisionEngineService } from './decision-engine/decision-engine.service';
import { PriceComparisonService } from './price-comparison.service';
import { ReviewSummaryService } from './review-summary/review-summary.service';
import { SecurityAiService } from './security-ai/security-ai.service';
import { MachineLearningService } from './ml/machine-learning.service';
import { PriceModelService } from './ml/price-model.service';

@Module({
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    DecisionEngineService,
    PriceComparisonService,
    ReviewSummaryService,
    SecurityAiService,
    MachineLearningService,
    PriceModelService,
  ],
})
export class AnalysisModule {}
