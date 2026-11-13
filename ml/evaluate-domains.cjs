// Regression examples, not an independent labelled benchmark.
const path = require('node:path');
const dist = path.resolve(__dirname, '../backand/backend-api/dist/analysis');
const { MachineLearningService } = require(path.join(dist, 'ml/machine-learning.service'));
const { SecurityAiService } = require(path.join(dist, 'security-ai/security-ai.service'));
const ml = new MachineLearningService();
const service = new SecurityAiService(ml);
const urls = [
  'https://amazon.com.br/',
  'https://www.amazon.com.br/dp/B087CT8PWY',
  'https://www.amazon.com.br/Smart-TV-LG-43-4K-UHD-NANO-AI-43UN85CPSA.AWZ/dp/B0TEST1234',
  'https://www.mercadolivre.com.br/produto',
  'http://amazon.com.br.evil.example/pagamento',
];
console.log(JSON.stringify(urls.map(productUrl => {
  const prediction = service.evaluate({ productName: 'Produto de teste', price: 100,
    seller: 'Amazon', productUrl }, { priceDeviationPercentage: null, maxPriceDiscount: 30 });
  return { url: productUrl, score: prediction.trustScore, risk: prediction.riskLevel,
    model: prediction.machineLearning };
}), null, 2));
