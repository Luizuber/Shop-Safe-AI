---
tags: [api, backend]
---

# Contrato da API

Base externa configurada: `https://tcc-shop-safe.onrender.com`. Rota atual de análise: **POST `/analysis`**. O texto antigo de instruções que cita `/analysis/analyze-product` não corresponde ao controller atual.

## Entrada

```json
{
  "productName": "Apple iPhone Air (256 GB) - Azul céu",
  "price": 6839.1,
  "seller": "Amazon.com.br",
  "productUrl": "https://www.amazon.com.br/produto",
  "maxPriceDiscount": 30,
  "reviews": {
    "averageRating": 4.6,
    "reviewCount": 36,
    "comments": ["Comentário disponível na página do produto."]
  }
}
```

Exemplo de formato; valores não são uma nova pesquisa de preço.

`AnalyzeProductPipe`: strings e números limitados; nome até 200 caracteres, vendedor até 120, URL até 2.048, até 20 comentários com até 600 caracteres cada; URL HTTP(S), query/fragmento e credenciais removidos. Preço zero é permitido para ausência de preço confiável.

## Saída

Mantém `trustScore`, `riskLevel`, `warnings`, `analysisSummary`, `bestPrices`, `priceAnalysis`, `analysisDetails`, `decisions` e `securitySignals`.

Acrescenta:

```text
machineLearning.security
  status, version, scope, label, probability ou reason
machineLearning.pricing
  status, algorithm, referenceCount, comparison,
  referencePrice, deviationPercentage, lowerBound, upperBound,
  bandwidth, percentile, anomalous, excludedReferenceCount ou reason
machineLearning.reviews
  status, version, samples, positive, negative, uncertain
```

- `ready`: modelo carregado/previsão obtida.
- `unavailable`: artefato ausente/incompatível; não existe previsão.
- `insufficient_data`: faltam informações ou referências.
- `priceAnalysis.comparison` agora aceita `UNKNOWN`. Não transformar esse valor em `FAIR`.
- Escore logístico `probability` não é probabilidade de uma compra segura.

## Metadados

**GET `/analysis/models`** informa algoritmos, versões, amostras de treino, datas, fontes, licenças e métricas. Não retorna pesos ou dados brutos. É a rota para confirmar qual modelo realmente foi publicado.

**GET `/`** apenas responde `Hello World!`. Não comprova saúde da SerpAPI nem presença de modelos.

## Compatibilidade

Frontend antigo pode ignorar o campo adicional, mas precisa reconhecer `UNKNOWN` para exibir preço corretamente. Frontend novo aceita servidor antigo em modo de compatibilidade; isso não significa ML funcionando no servidor.

Relacionadas: [[10 - Instalação e publicação]], [[12 - Testes e diagnóstico]].
