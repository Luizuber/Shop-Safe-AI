---
tags: [requisitos, tcc]
---

# Visão e requisitos

O Shop Safe apoia a avaliação de uma oferta durante a navegação em lojas virtuais. Apresenta sinais de risco, dados de avaliações e ofertas de outros vendedores. Não certifica uma loja nem garante uma compra.

## Requisitos recuperados

Foram consultados os registros de requisitos do projeto sob o título **Branch · DOCUMENTAÇÂO TCC**. Os trechos disponíveis mencionam frontend React/TypeScript, backend NestJS, modelo próprio treinado para confiabilidade, comparação por serviço externo, testes e PostgreSQL planejado. Identificadores de conversas privadas não são publicados neste cofre.

O arquivo DOCX integral citado nas conversas não ficou disponível no repositório. Portanto, esta documentação rastreia os requisitos recuperados e a implementação, sem alegar conformidade integral com um documento que não foi lido.

| Requisito | Implementação/evidência |
| --- | --- |
| Capturar produto e métricas da página | `extractor.ts`, observador e testes de extração |
| Comparar ofertas equivalentes | `PriceComparisonService` |
| Incorporar modelo próprio treinado | Regressores logísticos ajustados com bases públicas; artefatos JSON |
| Examinar risco e justificar | Modelo de URL + regras, justificativas e escopo da previsão |
| Analisar opiniões | TF-IDF + modelo de sentimento; tópicos por regras |
| Detectar preço atípico | KDE por consulta com lojas independentes |
| Guardar histórico | Armazenamento local no navegador |
| Persistência PostgreSQL | Planejada, ainda não implementada |
| Avaliar resultados | Relatórios em `ml/reports`, testes de paridade e integração |

## Escopo do ML

O rótulo disponível para segurança é **phishing de URL**, não fraude de compra. Avaliação de entrega ou identidade de vendedor exigiria outra base rotulada e novas fontes. A comparação de preço observa o mercado atual, sem prever preços futuros.

As regras antigas continuam como proteção e explicação. O nome `SecurityAiService` sozinho nunca foi prova de ML; os coeficientes treinados, os relatórios e os testes de inferência agora são a evidência.

Relacionadas: [[02 - Arquitetura]], [[14 - Pendências e roteiro]], [[17 - Apresentação do TCC]].
