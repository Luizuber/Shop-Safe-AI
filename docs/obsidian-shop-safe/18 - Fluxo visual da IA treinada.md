---
tags: [diagrama, ml, tcc]
atualizado: 2026-11-11
---

# Fluxo visual da IA treinada

Esta imagem ilustra a arquitetura local 1.2.1 com o classificador de domínio v2, o modelo de sentimento e o estimador de preços. Substitui, como referência atual, o diagrama anterior à implementação do treinamento. Não é uma captura da aplicação nem certifica a publicação no Render.

![[fluxo-ia-treinada-v2.png]]

## Como ler

- A faixa superior mostra o treinamento offline com bases públicas, deduplicação, separação por grupos e avaliação.
- A captura identifica os dados disponíveis na página; a extensão normaliza e envia esses dados para a API.
- O modelo de domínio detecta padrões de phishing, enquanto regras avaliam sinais independentes. Um alerta isolado não zera a pontuação.
- A pesquisa de preços filtra equivalência e modalidade por regras. O KDE ajusta a distribuição usando pelo menos cinco lojas independentes, excluindo a loja atual das referências.
- O modelo de sentimento classifica os comentários capturados. As contagens e tópicos alimentam o resumo, não diretamente a nota de segurança.
- Os resultados incompletos ou conflitantes são identificados como inconclusivos. A pontuação composta não é uma probabilidade de segurança da compra.

## Métricas representadas

As métricas no rodapé são medidas nos conjuntos separados das respectivas bases. O domínio v2 é mostrado no limiar operacional de 0,8; o sentimento é mostrado no corte binário de 0,5. Não são métricas de todos os golpes de e-commerce ou de autenticação de comentários.

A figura foi criada com a ferramenta integrada de geração de imagens e conferida contra o código e os relatórios atuais. Especificação: [[fluxo-ia-treinada-v2-prompt]].

Relacionadas: [[02 - Arquitetura]], [[04 - Segurança e phishing]], [[05 - Preços e ofertas]], [[06 - Avaliações e sentimento]], [[08 - Métricas e evidências]].
