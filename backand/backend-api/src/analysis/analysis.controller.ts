import { Controller, Post, Body, Get } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzeProductDto } from './dto/analyze-product.dto';
import { AnalyzeProductPipe } from './dto/analyze-product.pipe';
import { MachineLearningService } from './ml/machine-learning.service';

@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly ml: MachineLearningService,
  ) {}

  @Get('models')
  models() {
    return this.ml.status();
  }

  @Post()
  analyzeProduct(@Body(AnalyzeProductPipe) data: AnalyzeProductDto) {
    return this.analysisService.analyzeProduct(data);
  }
}
