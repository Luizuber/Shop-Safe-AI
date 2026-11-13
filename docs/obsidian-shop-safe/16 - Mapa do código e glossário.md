---
tags: [codigo, glossario]
---

# Mapa do código e glossário

## Arquivos

| Área | Caminho relativo à raiz do repositório |
| --- | --- |
| Extrator | `frontend/src/content/extractor.ts` |
| Observação e injeção | `frontend/src/content/injectPanel.tsx` |
| Comunicação interna | `frontend/src/content/internalBridge.ts` |
| Cliente da API | `frontend/src/services/analysisApi.ts` |
| Painel e histórico | `frontend/src/panel/Panel.tsx` |
| Detalhes e ML | `frontend/src/panel/components/DetailedAnalysis.tsx` |
| Tipos de resposta | `frontend/src/types/AnalysisResult.ts` |
| Bootstrap e proteções | `backand/backend-api/src/main.ts` |
| Rotas de análise/modelos | `backand/backend-api/src/analysis/analysis.controller.ts` |
| Validação | `backand/backend-api/src/analysis/dto/analyze-product.pipe.ts` |
| Busca e equivalência | `backand/backend-api/src/analysis/price-comparison.service.ts` |
| Composição final | `backand/backend-api/src/analysis/decision-engine/decision-engine.service.ts` |
| Regras e integração de phishing | `backand/backend-api/src/analysis/security-ai/security-ai.service.ts` |
| Resumo e integração de sentimento | `backand/backend-api/src/analysis/review-summary/review-summary.service.ts` |
| Carregamento/inferência | `backand/backend-api/src/analysis/ml/machine-learning.service.ts` |
| Características de URL | `backand/backend-api/src/analysis/ml/features.ts` |
| Modelo de preço | `backand/backend-api/src/analysis/ml/price-model.service.ts` |
| Modelos treinados | `backand/backend-api/src/analysis/ml/models/` |
| Treinamento | `ml/train.py` |
| Evidências estatísticas | `ml/reports/` |
| Referência técnica de ML | `ml/MODEL_CARD.md` |

## Glossário

- **Machine learning:** ajuste de parâmetros a partir de dados; não equivale a qualquer regra chamada de IA.
- **Supervisionado:** aprende com exemplos que possuem rótulos.
- **Não supervisionado:** aprende estrutura/distribuição sem rótulo de saída.
- **Inferência:** uso do modelo ajustado para analisar uma nova entrada.
- **TF-IDF:** representação que pondera frequência de termos e sua raridade no conjunto de treino.
- **Bigramas:** pares consecutivos de palavras, úteis para expressões como “não funciona”.
- **Regressão logística:** classificador que aprende coeficientes para separar duas classes.
- **KDE:** estimativa de densidade por kernels; descreve a distribuição das observações.
- **MAD:** dispersão robusta baseada em desvios em relação à mediana.
- **Leakage:** contaminação do treinamento por informação do conjunto de teste ou do alvo.
- **Phishing:** tentativa de enganar o usuário por uma identidade/endereço fraudulento; não cobre toda fraude de e-commerce.
- **Abstenção:** decisão de não classificar quando a evidência não é suficiente.
- **Acurácia:** fração de acertos no conjunto avaliado; não é o “percentual de segurança” de uma compra.
- **Precisão:** entre os previstos positivos, quantos eram positivos.
- **Recall:** entre os positivos reais, quantos foram detectados.
- **F1:** média harmônica de precisão e recall.
- **Brier score:** erro quadrático das probabilidades de classe; menor é melhor no conjunto avaliado.
- **Drift:** mudança da distribuição dos dados ao longo do tempo.
- **Heurística:** regra definida manualmente para orientar decisão.

Relacionadas: [[02 - Arquitetura]], [[07 - Treinamento e reprodução]].
