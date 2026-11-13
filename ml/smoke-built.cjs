// Checks the packaged backend and the integrity of the actual trained models.
// Offer prices below are a controlled integration scenario, not a live search.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'backand/backend-api/dist/analysis');
const { MachineLearningService } = require(path.join(dist, 'ml/machine-learning.service'));
const { PriceModelService } = require(path.join(dist, 'ml/price-model.service'));
const { SecurityAiService } = require(path.join(dist, 'security-ai/security-ai.service'));
const { ReviewSummaryService } = require(path.join(dist, 'review-summary/review-summary.service'));
const { DecisionEngineService } = require(path.join(dist, 'decision-engine/decision-engine.service'));

async function main() {
  for (const name of ['security', 'sentiment']) {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'ml/reports', `${name}.json`), 'utf8'));
    const bytes = fs.readFileSync(path.join(dist, 'ml/models', `${name}.json`));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), report.artifactSha256);
  }
  const ml = new MachineLearningService();
  assert.equal(ml.status().security.status, 'ready');
  assert.equal(ml.status().sentiment.status, 'ready');
  const referenceOffers = [5900, 6000, 6100, 6200, 6300, 6400].map((price, i) => ({
    store: `Referencia ${i}`, price, link: `https://referencia${i}.example/produto`,
  }));
  const engine = new DecisionEngineService(
    { searchProduct: async () => referenceOffers },
    new SecurityAiService(ml), new ReviewSummaryService(ml), new PriceModelService(),
  );
  const result = await engine.calculate({
    productName: 'Smartphone de teste 256 GB - Azul', price: 659.9,
    productUrl: 'https://amazon.com.br/produto', seller: 'Amazon',
    reviews: { averageRating: 4.2, reviewCount: 36, comments: [
      'Produto excelente, chegou antes do prazo, recomendo a compra.',
      'Produto horrível, apresentou defeito e não funciona, péssima compra.',
    ] },
  });
  assert.equal(result.machineLearning.security.status, 'ready');
  assert.equal(result.machineLearning.pricing.status, 'ready');
  assert.equal(result.machineLearning.pricing.anomalous, true);
  assert.equal(result.machineLearning.reviews.samples, 2);
  console.log(JSON.stringify({
    scenario: 'Controlled integration fixture; not a live market search',
    artifactsMatchTrainingReports: true,
    securityVersion: ml.status().security.version,
    sentimentVersion: ml.status().sentiment.version,
    pricing: result.machineLearning.pricing,
    reviews: result.machineLearning.reviews,
    riskLevel: result.riskLevel,
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
